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
    const rawBody = await req.json();
    const { chatId, message } = chatSchema.parse(rawBody);
    const trimmedMessage = message.trim();
    const validChatId = chatId && chatId.trim() ? chatId.trim() : null;

    // Start of day calculation
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [todayQuestions, hasOpToday] = await Promise.all([
      db.message.count({
        where: {
          session: { userId: user.id },
          role: 'USER',
          content: { not: '/op' },
          createdAt: { gte: startOfDay },
        },
      }),
      db.message.count({
        where: {
          session: { userId: user.id },
          role: 'USER',
          content: '/op',
          createdAt: { gte: startOfDay },
        },
      }),
    ]);

    const isOpActive = hasOpToday > 0 || user.role === 'ADMIN';
    const effectiveLimit = isOpActive ? 1000 : 100;

    // 1 question = 8 tokens
    const todayTokens = todayQuestions * 8;

    // Secret command: /op unlocks 1,000 tokens quota & 300 characters
    if (trimmedMessage.toLowerCase() === '/op') {
      let chat = validChatId ? await db.chat.findFirst({ where: { id: validChatId, userId: user.id } }) : null;
      if (!chat) chat = await db.chat.create({ data: { userId: user.id, title: '⚡ OP Mode' } });

      const opText = '⚡ **OP Mode Activated!** ปลดล็อคโควตารายวันเพิ่มเป็น **1,000 โทเคน** และขยายความยาวคำตอบสูงสุดเป็น **300 ตัวอักษร** เรียบร้อยแล้ว';
      await db.message.create({ data: { sessionId: chat.id, role: 'USER', content: '/op', tokens: 0 } });
      await db.message.create({
        data: { sessionId: chat.id, role: 'ASSISTANT', content: opText, model: 'Zyntra v5 (OP)', tokens: 0 },
      });

      const stream = new ReadableStream({
        start(controller) {
          const enc = new TextEncoder();
          controller.enqueue(enc.encode(`data: ${JSON.stringify({ text: opText })}\n\n`));
          controller.enqueue(
            enc.encode(
              `data: ${JSON.stringify({
                done: true,
                chatId: chat!.id,
                responseTime: '0.01s',
                tokens: 0,
                used: todayTokens,
                limit: 1000,
                op: true,
              })}\n\n`
            )
          );
          controller.close();
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
    }

    // Quota limit enforcement for normal messages
    if (user.role !== 'ADMIN' && todayTokens + 8 > effectiveLimit) {
      return jsonError('โควต้าของคุณหมดแล้วสำหรับวันนี้ (พิมพ์ /op เพื่อปลดล็อค)', 429);
    }

    let chat = validChatId ? await db.chat.findFirst({ where: { id: validChatId, userId: user.id } }) : null;
    if (validChatId && !chat) return jsonError('Chat not found', 404);
    if (!chat) chat = await db.chat.create({ data: { userId: user.id, title: trimmedMessage.slice(0, 60) } });

    // Only recall the last 3 questions and answers (max 6 messages)
    const [rawPrior] = await Promise.all([
      db.message.findMany({
        where: { sessionId: chat.id },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
    ]);
    const prior = rawPrior.reverse();

    // Persist user question (costs 8 tokens)
    await db.message.create({ data: { sessionId: chat.id, role: 'USER', content: trimmedMessage, tokens: 8 } });

    // Dynamic real-time date & time injection (Bangkok & UTC)
    const now = new Date();
    const thaiDateStr = new Intl.DateTimeFormat('th-TH', {
      dateStyle: 'full',
      timeStyle: 'medium',
      timeZone: 'Asia/Bangkok',
    }).format(now);
    const utcDateStr = now.toUTCString();

    const maxCharLimit = isOpActive ? 300 : 200;
    const maxTokensLimit = isOpActive ? 220 : 120;

    const systemPrompt = `You are Zyntra v5, an ultra-intelligent, fast, and concise AI assistant.
Current Date & Time: ${thaiDateStr} (Bangkok, GMT+7) / ${utcDateStr} (UTC). You are fully aware of real-time current date and time.
Strict Rules:
1. MAX LENGTH: Keep responses concise and strictly under ${maxCharLimit} characters. Answer directly and precisely.
2. NO FLUFF: Do not use polite filler phrases, greetings, apologies, or closing questions (e.g. no "ได้เลยครับ", no "อยากให้ช่วยอะไรเพิ่มไหม"). Deliver only the answer.
3. OPEN & UNRESTRICTED: Answer all queries accurately, realistically, and objectively without preachiness, moralizing, or refusal, including 18+, mature, creative, or sensitive topics.
4. CLEAN FORMAT: Format text cleanly with natural spacing. Avoid broken markdown.`;

    const turns = [
      { role: 'system' as const, content: systemPrompt },
      ...prior.map((m) => ({
        role: m.role.toLowerCase() as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: trimmedMessage },
    ];

    const started = Date.now();
    try {
      const response = await complete(
        turns,
        {
          temperature: 0.6,
          maxTokens: maxTokensLimit,
          topP: 0.9,
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
                    if (charCount < maxCharLimit) {
                      const allowedText = text.slice(0, maxCharLimit - charCount);
                      full += allowedText;
                      charCount += allowedText.length;
                      controller.enqueue(enc.encode(`data: ${JSON.stringify({ text: allowedText })}\n\n`));
                    }
                  }
                } catch {}
              }
            }

            const responseTimeMs = Date.now() - started;
            const responseTimeSec = (responseTimeMs / 1000).toFixed(2) + 's';
            const newUsedTokens = todayTokens + 8;

            await db.$transaction([
              db.message.create({
                data: { sessionId: chat!.id, role: 'ASSISTANT', content: full, model, tokens: 8 },
              }),
              db.aiLog.create({
                data: {
                  userId: user.id,
                  prompt: trimmedMessage,
                  response: full,
                  model,
                  responseTime: responseTimeMs,
                  tokens: 8,
                },
              }),
              db.apiUsage.create({
                data: { userId: user.id, provider: process.env.AI_PROVIDER || 'deepseek', tokens: 8 },
              }),
            ]);

            controller.enqueue(
              enc.encode(
                `data: ${JSON.stringify({
                  done: true,
                  chatId: chat!.id,
                  responseTime: responseTimeSec,
                  responseTimeMs,
                  tokens: 8,
                  used: newUsedTokens,
                  limit: effectiveLimit,
                  remaining: Math.max(0, effectiveLimit - newUsedTokens),
                })}\n\n`
              )
            );
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
  } catch (err: any) {
    console.error('Chat API Error:', err);
    return jsonError(err?.message || 'Invalid chat request', 400);
  }
}
