'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Plus,
  Search,
  PanelLeftClose,
  PanelLeft,
  Send,
  Square,
  Copy,
  Check,
  Trash2,
  Pin,
  Star,
  Settings,
  LogOut,
  MessageSquare,
  ChevronDown,
  Shield,
  MoreHorizontal,
  Clock,
  Zap,
} from 'lucide-react';

type User = { id: string; name: string; email: string; role: string };
type Chat = { id: string; title: string; pinned: boolean; favorite: boolean; updatedAt: Date };
type Message = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
  responseTime?: string;
  tokens?: number;
};
type Usage = { used: number; limit: number };
type Props = { user: User; initialChats: Chat[]; settings: any; initialUsage?: Usage };

const starters = [
  'Help me write a project brief',
  'Explain a complex topic simply',
  'Brainstorm names for a new product',
  'Review and improve my writing',
];

const formatModelDisplay = (m?: string) => {
  if (!m || m.toLowerCase().includes('deepseek') || m.toLowerCase() === 'converse') return 'Zyntra v5';
  return m;
};

export default function ChatApp({ user, initialChats, settings, initialUsage }: Props) {
  const [chats, setChats] = useState<Chat[]>(initialChats);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebar, setSidebar] = useState(true);
  const [search, setSearch] = useState('');
  const [menu, setMenu] = useState(false);
  const [prefs, setPrefs] = useState(false);
  const [toast, setToast] = useState('');
  const [usage, setUsage] = useState<Usage>(initialUsage || { used: 0, limit: 100 });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Local simulated settings for UI
  const [simTemp, setSimTemp] = useState<number>(settings?.temperature ?? 0.7);
  const [simMaxTokens, setSimMaxTokens] = useState<number>(settings?.maxTokens ?? 2048);
  const [simSystemPrompt, setSimSystemPrompt] = useState<string>(
    settings?.systemPrompt || 'You are a helpful, thoughtful AI assistant.'
  );

  const bottom = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);
  const router = useRouter();

  // Load OP mode from localStorage if previously unlocked
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isOp = localStorage.getItem('zyntra_op_mode') === '1';
      if (isOp) {
        setUsage((prev) => ({ ...prev, limit: 1000 }));
      }
    }
  }, []);

  // Scroll to bottom smoothly
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Toast timer
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const visible = chats.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()));

  // Switch chat
  async function selectChat(id: string) {
    if (active === id) return;
    setActive(id);
    try {
      const r = await fetch(`/api/chat/${id}`);
      if (r.ok) {
        const d = await r.json();
        setMessages(d.chat?.messages || []);
      }
    } catch {
      setToast('Failed to load chat');
    }
  }

  // Create new chat
  function newChat() {
    if (loading) abort.current?.abort();
    setActive(null);
    setMessages([]);
  }

  // Delete chat
  async function remove(id: string) {
    await fetch(`/api/chat/${id}`, { method: 'DELETE' });
    setChats((prev) => prev.filter((c) => c.id !== id));
    if (active === id) newChat();
  }

  // Update chat pin/fav
  async function updateChat(id: string, data: object) {
    await fetch(`/api/chat/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const res = await fetch('/api/chats').then((r) => r.json());
    if (res.chats) setChats(res.chats);
  }

  // Send message
  async function send(text = input) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    // Check secret /op commands
    const lower = trimmed.toLowerCase();
    const isOpOn = lower === '/op on' || lower === '/op';
    const isOpOff = lower === '/op off';
    const isOpCommand = isOpOn || isOpOff;

    if (isOpOn) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('zyntra_op_mode', '1');
      }
      setUsage((prev) => ({ ...prev, limit: 1000 }));
      setToast('⚡ OP Mode: ON');
    } else if (isOpOff) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('zyntra_op_mode');
      }
      setUsage((prev) => ({ ...prev, limit: 100 }));
      setToast('🔒 OP Mode: OFF');
    } else {
      // Daily limit check for non-admin
      if (user.role !== 'ADMIN' && usage.used + 8 > usage.limit) {
        setToast('โควต้าของคุณหมดแล้วสำหรับวันนี้');
        return;
      }
    }

    setInput('');
    const userMsgId = crypto.randomUUID();
    const assistantMsgId = crypto.randomUUID();

    const userMsg: Message = {
      id: userMsgId,
      role: 'USER',
      content: trimmed,
      createdAt: new Date().toISOString(),
      tokens: isOpCommand ? 0 : 8,
    };

    const assistantMsg: Message = {
      id: assistantMsgId,
      role: 'ASSISTANT',
      content: '',
      createdAt: new Date().toISOString(),
      tokens: isOpCommand ? 0 : 8,
    };

    // Immediate UI update
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setLoading(true);
    abort.current = new AbortController();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: active || undefined, message: trimmed }),
        signal: abort.current.signal,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Could not get response from AI');
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const raw = line.split('\n').find((x) => x.startsWith('data:'));
          if (!raw) continue;
          try {
            const data = JSON.parse(raw.slice(5));
            if (data.text) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, content: m.content + data.text } : m
                )
              );
            }
            if (data.done) {
              if (data.chatId && data.chatId !== active) {
                setActive(data.chatId);
              }
              if (data.responseTime) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? {
                          ...m,
                          responseTime: data.responseTime,
                          tokens: data.tokens ?? (isOpCommand ? 0 : 8),
                        }
                      : m
                  )
                );
              }
              if (data.op === true || isOpOn) {
                if (typeof window !== 'undefined') localStorage.setItem('zyntra_op_mode', '1');
                setUsage((prev) => ({ ...prev, limit: 1000 }));
              } else if (data.op === false || isOpOff) {
                if (typeof window !== 'undefined') localStorage.removeItem('zyntra_op_mode');
                setUsage((prev) => ({ ...prev, limit: 100 }));
              } else if (typeof data.limit === 'number') {
                setUsage((prev) => ({ ...prev, limit: data.limit }));
              }
              if (typeof data.used === 'number') {
                setUsage((prev) => ({ ...prev, used: data.used }));
              }
            }
            if (data.error) throw new Error(data.error);
          } catch (err: any) {
            if (err.message && !err.message.includes('JSON')) throw err;
          }
        }
      }

      // Refresh sidebar chats asynchronously
      const chatRes = await fetch('/api/chats').then((r) => r.json());
      if (chatRes.chats) setChats(chatRes.chats);
      if (chatRes.usage) {
        const isOp = typeof window !== 'undefined' && localStorage.getItem('zyntra_op_mode') === '1';
        setUsage({ used: chatRes.usage.used, limit: isOp ? 1000 : chatRes.usage.limit });
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        setToast('Generation stopped');
      } else {
        setToast(e.message || 'Connection failed');
        setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId || m.content.length > 0));
      }
    } finally {
      setLoading(false);
      abort.current = null;
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  // Simulated preferences save (dummy UI)
  function savePrefs(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPrefs(false);
    setToast('Settings saved successfully');
  }

  function copyText(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setToast('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  }

  // Quota calculation & dynamic progressive colors
  const quotaPercent = Math.min(100, Math.round((usage.used / usage.limit) * 100));
  const isQuotaExceeded = user.role !== 'ADMIN' && usage.used + 8 > usage.limit;

  // Progressive color: Green -> Yellow -> Orange -> Red
  const getRingColor = () => {
    if (isQuotaExceeded || quotaPercent >= 90) return 'text-rose-500';
    if (quotaPercent >= 75) return 'text-orange-400';
    if (quotaPercent >= 50) return 'text-yellow-400';
    return 'text-[#d2f36b]';
  };

  const getNumberColor = () => {
    if (isQuotaExceeded || quotaPercent >= 90) return 'text-rose-400';
    if (quotaPercent >= 75) return 'text-orange-300';
    if (quotaPercent >= 50) return 'text-yellow-300';
    return 'text-white';
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-[#0b0c0f]">
      {/* Sidebar */}
      {sidebar && (
        <aside className="flex w-[278px] shrink-0 flex-col border-r border-[#23252b] bg-[#101115] max-md:absolute max-md:z-20 max-md:h-full">
          {/* Header */}
          <div className="flex h-[68px] items-center justify-between px-5">
            <div className="flex items-center gap-2">
              <span className="text-xl text-[#d2f36b]">✳</span>
              <span className="font-semibold tracking-wide text-white">Zyntra</span>
            </div>
            <button
              onClick={() => setSidebar(false)}
              className="rounded p-2 text-[#9699a3] hover:bg-[#202127]"
            >
              <PanelLeftClose size={18} />
            </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={newChat}
            className="mx-3 mb-4 flex items-center justify-center gap-2 rounded-xl border border-[#2d3037] py-2.5 text-sm font-medium transition hover:border-[#494d3b] hover:bg-[#181a1f]"
          >
            <Plus size={16} className="text-[#d2f36b]" /> New chat
            <span className="ml-auto pr-2 text-xs text-[#777983]">⌘ K</span>
          </button>

          {/* Search */}
          <div className="mx-3 mb-3 flex items-center rounded-lg bg-[#191a1f] px-3 border border-[#23252c]">
            <Search size={15} className="text-[#777983]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats"
              className="w-full bg-transparent px-2 py-2 text-sm outline-none placeholder:text-[#777983]"
            />
          </div>

          {/* Recent Chats */}
          <div className="chat-scroll flex-1 overflow-y-auto px-3">
            <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wider text-[#71747e]">
              Recent
            </p>
            {visible.map((c) => (
              <div
                key={c.id}
                className={`group mb-1 flex items-center rounded-lg transition ${
                  active === c.id ? 'bg-[#22242a]' : 'hover:bg-[#191a1f]'
                }`}
              >
                <button
                  onClick={() => selectChat(c.id)}
                  className="min-w-0 flex-1 truncate px-3 py-2.5 text-left text-[13px] text-[#d3d4d8]"
                >
                  <span className="mr-2 inline-block align-middle text-[#858791]">
                    <MessageSquare size={14} />
                  </span>
                  {c.pinned && <Pin size={12} className="mr-1 inline text-[#d2f36b]" />}
                  {c.title || 'New chat'}
                </button>
                <div className="hidden pr-2 group-hover:flex">
                  <button
                    title="Pin"
                    onClick={() => updateChat(c.id, { pinned: !c.pinned })}
                    className="p-1 text-[#8a8d96] hover:text-white"
                  >
                    <Pin size={13} />
                  </button>
                  <button
                    title="Favorite"
                    onClick={() => updateChat(c.id, { favorite: !c.favorite })}
                    className="p-1 text-[#8a8d96] hover:text-[#d2f36b]"
                  >
                    <Star size={13} fill={c.favorite ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    title="Delete"
                    onClick={() => remove(c.id)}
                    className="p-1 text-[#8a8d96] hover:text-rose-400"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Daily Quota Donut Ring with Progressive Color Shift */}
          <div className="mx-3 mb-2 rounded-xl border border-[#23252b] bg-[#14151a] p-3">
            <div className="flex items-center gap-3">
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
                <svg className="h-9 w-9 -rotate-90 transform" viewBox="0 0 36 36">
                  <path
                    className="text-[#25272e]"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={`${getRingColor()} transition-all duration-500`}
                    strokeDasharray={`${quotaPercent}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className={`absolute text-[9px] font-bold ${getNumberColor()} transition-colors duration-300`}>
                  {Math.max(0, usage.limit - usage.used)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#e2e4e9]">Daily Tokens</span>
                  <span className="text-[11px] font-semibold text-[#a0a4b0]">
                    {usage.used}/{usage.limit}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[10px] text-[#71747e]">
                  {usage.limit >= 1000 ? '⚡ OP Unlocked (1,000 max)' : '1 question = 8 tokens'}
                </p>
              </div>
            </div>
          </div>

          {/* Footer User Menu */}
          <div className="border-t border-[#23252b] p-3">
            <button
              onClick={() => setPrefs(true)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[#b7b8bf] hover:bg-[#1c1e23]"
            >
              <Settings size={17} /> Settings
            </button>
            {user.role === 'ADMIN' && (
              <a
                href="/admin"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[#b7b8bf] hover:bg-[#1c1e23]"
              >
                <Shield size={16} /> Admin
              </a>
            )}
            <button
              onClick={() => setMenu(!menu)}
              className="mt-1 flex w-full items-center gap-3 rounded-lg p-2 hover:bg-[#1c1e23]"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#34372a] text-sm font-semibold text-[#d2f36b]">
                {user.name[0]?.toUpperCase()}
              </div>
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-medium text-white">{user.name}</span>
                <span className="block truncate text-xs text-[#777983]">{user.email}</span>
              </span>
              <MoreHorizontal size={17} className="text-[#8a8d96]" />
            </button>
            {menu && (
              <button
                onClick={logout}
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#c5c6cc] hover:bg-[#202127]"
              >
                <LogOut size={15} /> Sign out
              </button>
            )}
          </div>
        </aside>
      )}

      {/* Main Chat Area */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Top Header */}
        <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-[#1e2025] px-5 bg-[#0b0c0f]">
          <div className="flex items-center gap-3">
            {!sidebar && (
              <button
                onClick={() => setSidebar(true)}
                className="rounded p-1.5 text-[#9699a3] hover:bg-[#181a1f]"
              >
                <PanelLeft size={19} />
              </button>
            )}
            <span className="text-sm font-medium text-[#f0f1f4]">
              {active ? chats.find((c) => c.id === active)?.title || 'Conversation' : 'New conversation'}
            </span>
            <button className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[#9b9da6] hover:bg-[#1d1f24] border border-[#23252c]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d2f36b]" />
              {formatModelDisplay(settings?.model)}
              <ChevronDown size={12} />
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#797c85]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#a4cb54]" /> Workspace
          </div>
        </header>

        {/* Message Feed */}
        <section className="chat-scroll flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[760px] px-5 pb-8 pt-8">
            {messages.length === 0 ? (
              <div className="fade-in flex min-h-[55vh] flex-col items-center justify-center text-center">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#34372a] bg-[#1b1e14] text-3xl text-[#d2f36b] shadow-[0_0_24px_rgba(210,243,107,0.12)]">
                  ✳
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-white">What can I help with?</h1>
                <p className="mt-2 text-sm text-[#858791]">
                  A clear mind makes room for better questions.
                </p>
                <div className="mt-8 grid w-full max-w-[590px] grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {starters.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-xl border border-[#25272d] bg-[#101115] p-4 text-left text-sm text-[#c6c7ce] transition hover:border-[#494d3b] hover:bg-[#141610]"
                    >
                      {s}
                      <span className="mt-2 block text-xs text-[#777983]">Explore with Zyntra ↗</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((m) => (
                  <article key={m.id} className="fade-in flex gap-4">
                    {/* Avatar */}
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                        m.role === 'USER'
                          ? 'bg-[#292b33] text-white border border-[#383a44]'
                          : 'bg-[#1b1e14] text-[#d2f36b] border border-[#34372a]'
                      }`}
                    >
                      {m.role === 'USER' ? user.name[0]?.toUpperCase() : '✳'}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-[#8b8e99]">
                        <span>{m.role === 'USER' ? user.name : 'Zyntra v5'}</span>
                        {m.role === 'ASSISTANT' && (
                          <span className="rounded bg-[#1e2027] px-1.5 py-0.2 text-[10px] text-[#a0a4b0]">
                            AI
                          </span>
                        )}
                      </div>

                      {m.content ? (
                        <div className="prose text-[14px] text-[#e2e3e7]">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 py-2">
                          <span className="text-xs text-[#9699a3]">Thinking</span>
                          <span className="flex gap-1">
                            <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#d2f36b]" />
                            <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#d2f36b] [animation-delay:100ms]" />
                            <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#d2f36b] [animation-delay:200ms]" />
                          </span>
                        </div>
                      )}

                      {/* Assistant Telemetry Badges */}
                      {m.role === 'ASSISTANT' && m.content && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {m.responseTime && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-[#262833] bg-[#14151a] px-2 py-0.5 text-[11px] text-[#9ca3af]">
                              <Clock size={11} className="text-[#d2f36b]" />
                              {m.responseTime}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 rounded-md border border-[#262833] bg-[#14151a] px-2 py-0.5 text-[11px] text-[#9ca3af]">
                            <Zap size={11} className="text-[#d2f36b]" />
                            {m.tokens ?? 8} tokens
                          </span>
                          <button
                            onClick={() => copyText(m.id, m.content)}
                            title="Copy response"
                            className="inline-flex items-center gap-1 rounded-md border border-transparent p-1 text-[11px] text-[#777983] hover:border-[#262833] hover:bg-[#1a1b22] hover:text-[#d3d4d8]"
                          >
                            {copiedId === m.id ? (
                              <Check size={12} className="text-[#d2f36b]" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
            <div ref={bottom} />
          </div>
        </section>

        {/* Input Footer */}
        <footer className="shrink-0 px-4 pb-5">
          <div className="mx-auto max-w-[760px]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className={`rounded-2xl border bg-[#141519] px-4 pt-3 shadow-lg transition ${
                isQuotaExceeded
                  ? 'border-rose-900/60 opacity-80'
                  : 'border-[#30323a] focus-within:border-[#505342]'
              }`}
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                disabled={loading}
                rows={2}
                placeholder={
                  isQuotaExceeded
                    ? 'Daily token limit reached. Resets at 00:00.'
                    : 'Message Zyntra v5…'
                }
                className="max-h-40 min-h-12 w-full resize-y bg-transparent text-sm leading-6 outline-none placeholder:text-[#71747e] disabled:cursor-not-allowed"
              />
              <div className="flex items-center justify-between pb-2">
                <span className="text-[11px] text-[#70727b]">
                  {isQuotaExceeded ? (
                    <span className="text-rose-400">Daily limit reached ({usage.used}/{usage.limit} tokens today)</span>
                  ) : (
                    <span>AI can make mistakes. Check important information.</span>
                  )}
                </span>
                {loading ? (
                  <button
                    type="button"
                    onClick={() => abort.current?.abort()}
                    className="flex items-center gap-1.5 rounded-lg bg-[#292b31] px-3 py-1.5 text-xs text-white hover:bg-[#34373e]"
                  >
                    <Square size={11} fill="currentColor" /> Stop
                  </button>
                ) : (
                  <button
                    disabled={!input.trim() || loading}
                    className="flex items-center justify-center rounded-lg bg-[#d2f36b] p-2 text-[#12140c] transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Send size={15} />
                  </button>
                )}
              </div>
            </form>
            <p className="mt-2 text-center text-[10px] text-[#666871]">
              Zyntra v5 · Thoughtful by design
            </p>
          </div>
        </footer>
      </main>

      {/* Preferences Modal (Simulated UI with interactive sliders) */}
      {prefs && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPrefs(false)}
        >
          <form
            onSubmit={savePrefs}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-[#2b2d34] bg-[#141519] p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Preferences</h2>
              <button
                type="button"
                onClick={() => setPrefs(false)}
                className="text-[#9699a3] hover:text-white"
              >
                ×
              </button>
            </div>
            <label className="mb-4 block text-sm text-[#d4d5da]">
              Model
              <input
                name="model"
                defaultValue={formatModelDisplay(settings?.model)}
                className="mt-2 w-full rounded-lg border border-[#2b2d34] bg-[#0b0c0f] p-2.5 text-sm text-white outline-none"
              />
            </label>
            <label className="mb-4 block text-sm text-[#d4d5da]">
              <div className="flex items-center justify-between">
                <span>Temperature</span>
                <span className="text-xs text-[#d2f36b]">{simTemp}</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={simTemp}
                onChange={(e) => setSimTemp(parseFloat(e.target.value))}
                className="mt-2 w-full accent-[#d2f36b]"
              />
            </label>
            <label className="mb-4 block text-sm text-[#d4d5da]">
              <div className="flex items-center justify-between">
                <span>Maximum tokens</span>
                <span className="text-xs text-[#d2f36b]">{simMaxTokens}</span>
              </div>
              <input
                type="range"
                min="256"
                max="8192"
                step="256"
                value={simMaxTokens}
                onChange={(e) => setSimMaxTokens(parseInt(e.target.value))}
                className="mt-2 w-full accent-[#d2f36b]"
              />
            </label>
            <label className="mb-5 block text-sm text-[#d4d5da]">
              System prompt
              <textarea
                value={simSystemPrompt}
                onChange={(e) => setSimSystemPrompt(e.target.value)}
                rows={3}
                className="mt-2 w-full rounded-lg border border-[#2b2d34] bg-[#0b0c0f] p-2.5 text-sm text-white outline-none"
              />
            </label>
            <button className="w-full rounded-lg bg-[#d2f36b] py-2.5 font-semibold text-[#12140c] transition hover:bg-[#bce055]">
              Save preferences
            </button>
          </form>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-[#363840] bg-[#202127] px-4 py-2.5 text-sm text-white shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}
