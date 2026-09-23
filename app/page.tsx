import { currentUser, isPreviewAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import ChatApp from '@/components/chat-app';

export default async function Home() {
  const user = await currentUser();
  if (!user || user.banned) redirect('/login');

  if (isPreviewAdmin(user)) {
    return (
      <ChatApp
        user={user}
        initialChats={[]}
        settings={{
          model: 'Zyntra v5',
          temperature: 0.7,
          maxTokens: 2048,
          topP: 1,
          systemPrompt: 'You are a helpful assistant.',
        }}
        initialUsage={{ used: 0, limit: 100 }}
      />
    );
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [chats, settings, todayQuestions, latestOpCommand] = await Promise.all([
    db.chat.findMany({
      where: { userId: user.id },
      orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
      take: 100,
      select: { id: true, title: true, pinned: true, favorite: true, updatedAt: true },
    }),
    db.setting.findUnique({ where: { userId: user.id } }),
    db.message.count({
      where: {
        session: { userId: user.id },
        role: 'USER',
        content: { notIn: ['/op', '/op on', '/op off'] },
        createdAt: { gte: startOfDay },
      },
    }),
    db.message.findFirst({
      where: {
        session: { userId: user.id },
        role: 'USER',
        content: { in: ['/op', '/op on', '/op off'] },
        createdAt: { gte: startOfDay },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const isOp = latestOpCommand
    ? latestOpCommand.content === '/op on' || latestOpCommand.content === '/op'
    : user.role === 'ADMIN';
  const todayTokens = todayQuestions * 8;

  return (
    <ChatApp
      user={user}
      initialChats={chats}
      settings={settings}
      initialUsage={{ used: todayTokens, limit: isOp ? 1000 : 100 }}
    />
  );
}
