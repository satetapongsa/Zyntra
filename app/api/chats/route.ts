import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { jsonError } from '@/lib/http';

export async function GET(req: NextRequest) {
  const u = await currentUser();
  if (!u || u.banned) return jsonError('Please sign in', 401);

  const q = req.nextUrl.searchParams.get('q') || '';
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [chats, todayQuestions] = await Promise.all([
    db.chat.findMany({
      where: {
        userId: u.id,
        ...(q ? { title: { contains: q, mode: 'insensitive' as const } } : {}),
      },
      orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
      take: 100,
      select: { id: true, title: true, pinned: true, favorite: true, updatedAt: true },
    }),
    db.message.count({
      where: {
        session: { userId: u.id },
        role: 'USER',
        createdAt: { gte: startOfDay },
      },
    }),
  ]);

  // 1 question = 8 tokens
  const todayTokens = todayQuestions * 8;

  return NextResponse.json({ chats, usage: { used: todayTokens, limit: 100 } });
}

export async function POST() {
  const u = await currentUser();
  if (!u || u.banned) return jsonError('Please sign in', 401);
  const chat = await db.chat.create({ data: { userId: u.id } });
  return NextResponse.json({ chat });
}
