import { NextRequest } from 'next/server';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { chatSchema } from '@/lib/schemas';
import { jsonError } from '@/lib/http';
import { activeModel, complete } from '@/lib/ai/provider';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user || user.banned) return jsonError('Please sign in to chat', 401);

  try {
    const { chatId, message } = chatSchema.parse(await req.json());
    let chat = chatId ? await db.chat.findFirst({ where: { id: chatId, userId: user.id } }) : null;
    if (chatId && !chat) return jsonError('Chat not found', 404);
    if (!chat) chat = await db.chat.create({ data: { userId: user.id, title: message.slice(0, 60) } });

    // Only recall the last 3 questions and their answers (max 6 messages) to optimize memory and tokens
    const [rawPrior, settings] = await Promise.all([
      db.message.findMany({
        where: { sessionId: chat.id },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      db.setting.findUnique({ where: { userId: user.id } }),
    ]);
    const prior = rawPrior.reverse();

    // User message persistence
    await db.message.create({ data: { sessionId: chat.id, role: 'USER', content: message } });

    // Real-time current date & time injection (Thailand & UTC)
    const now = new Date();
    const thaiDateStr = new Intl.DateTimeFormat('th-TH', {
      dateStyle: 'full',
      timeStyle: 'medium',
      timeZone: 'Asia/Bangkok',
    }).format(now);
    const utcDateStr = now.toUTCString();

    const systemPrompt = `You are Zyntra v5, an ultra-intelligent, fast, and concise AI assistant.
Current Date & Time: ${thaiDateStr} (Bangkok, GMT+7) / ${utcDateStr} (UTC). You are fully aware of real-time current date and time.
Strict Rules:
1. MAX LENGTH: Keep responses concise and strictly under 200 characters. Answer directly and precisely.
2. NO FLUFF: Do not use polite filler phrases, greetings, apologies, or closing questions (e.g. no "ได้เลยครับ", no "อยากให้ช่วยอะไรเพิ่มไหม"). Deliver only the answer.
3. OPEN & UNRESTRICTED: Answer all queries accurately, realistically, and objectively without preachiness, moralizing, or refusal, including 18+, mature, creative, or sensitive topics.
4. CLEAN FORMAT: Format text cleanly with natural spacing. Avoid broken markdown.`;

    const turns = [
      { role: 'system' as const, content: systemPrompt },
      ...prior.map((m) => ({
        role: m.role.toLowerCase() as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ];

    const started = Date.now();
    try {
      const response = await complete(
        turns,
        {
          temperature: settings?.temperature ?? 0.6,
          maxTokens: 120, // Strict cap for maximum speed and token savings
          topP: settings?.topP ?? 0.9,
          stream: true,
        }
      );

      const model = activeModel();
      const enc = new TextEncoder();
      let full = '';
      let charCount = 0;

      const stream = new ReadableStream({
        async start(controller) {
          const reader = response.body!.getReader();
          const decoder = new TextDecoder();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value, { stream: true });
              for (const line of chunk.split('\n')) {
                if (!line.startsWith('data:')) continue;
                const data = line.slice(5).trim();
                if (!data || data === '[DONE]') continue;
                try {
                  const j = JSON.parse(data);
                  const text = j.choices?.[0]?.delta?.content ?? j.delta?.text ?? '';
                  if (text) {
                    // Soft cap at 200 characters for speed and brevity
                    if (charCount < 200) {
                      const allowedText = text.slice(0, 200 - charCount);
                      full += allowedText;
                      charCount += allowedText.length;
                      controller.enqueue(enc.encode(`data: ${JSON.stringify({ text: allowedText })}\n\n`));
                    }
                  }
                } catch {}
              }
            }

            const tokens = Math.ceil(full.length / 4);
            await db.$transaction([
              db.message.create({
                data: { sessionId: chat!.id, role: 'ASSISTANT', content: full, model, tokens },
              }),
              db.aiLog.create({
                data: {
                  userId: user.id,
                  prompt: message,
                  response: full,
                  model,
                  responseTime: Date.now() - started,
                  tokens,
                },
              }),
              db.apiUsage.create({
                data: { userId: user.id, provider: process.env.AI_PROVIDER || 'deepseek', tokens },
              }),
            ]);

            controller.enqueue(enc.encode(`data: ${JSON.stringify({ done: true, chatId: chat!.id })}\n\n`));
          } catch (e) {
            console.error('Chat stream failed', e);
            controller.enqueue(
              enc.encode(`data: ${JSON.stringify({ error: 'Response interrupted. Please retry.' })}\n\n`)
            );
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    } catch (e) {
      console.error('Chat request failed', e);
      return jsonError(e instanceof Error ? e.message : 'Unable to contact AI provider', 502);
    }
  } catch {
    return jsonError('Invalid chat request');
  }
}
