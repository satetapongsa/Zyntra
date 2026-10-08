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
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Download,
  Share2,
  Sparkles,
  BookOpen,
  FileText,
  CheckCircle2,
  ChevronRight,
  X,
  AlertCircle,
  Paperclip,
  Brain,
  ChevronUp,
  FileCode,
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

type PromptPreset = {
  title: string;
  category: string;
  prompt: string;
};

const enterprisePresets: PromptPreset[] = [
  {
    category: 'Business & Strategy',
    title: 'Executive Summary Brief',
    prompt: 'ช่วยเขียน Executive Summary สรุปประเด็นสำคัญของโปรเจกต์ ปัญหา แนวทางแก้ไข และผลลัพธ์ทางธุรกิจที่คาดหวัง ในรูปแบบกระชับ ชัดเจนสำหรับผู้บริหารระดับสูง',
  },
  {
    category: 'Engineering & Code',
    title: 'Code Review & Architecture',
    prompt: 'ช่วยวิเคราะห์และรีวิว Architecture ของโค้ดต่อไปนี้ พร้อมแนะนำข้อปรับปรุงเรื่อง Security, Performance, Error Handling และ Best Practices:',
  },
  {
    category: 'Operations & Comms',
    title: 'Formal Customer Response',
    prompt: 'ช่วยร่างอีเมลตอบกลับลูกค้าองค์กรอย่างเป็นทางการ โดยคงท่าทีสุภาพ เป็นมืออาชีพ ชี้แจงแนวทางแก้ไขปัญหาและ Timeline อย่างชัดเจน:',
  },
  {
    category: 'Data & Analytics',
    title: 'Meeting Action Items',
    prompt: 'ช่วยสกัดประเด็นสำคัญ (Key Takeaways), มติที่ประชุม (Decisions Made), และรายการงานที่ต้องทำต่อ (Action Items พร้อมระบุผู้รับผิดชอบและกำหนดเสร็จ) จากบันทึกต่อไปนี้:',
  },
];

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

// Helper to extract <think>...</think> tag for reasoning models (DeepSeek-R1 / o1)
function parseThinkingContent(raw: string) {
  if (!raw) return { thinking: '', response: '' };
  
  // Case 1: Complete <think>...</think> block
  const completeMatch = /<think>([\s\S]*?)<\/think>([\s\S]*)/i.exec(raw);
  if (completeMatch) {
    return {
      thinking: completeMatch[1].trim(),
      response: completeMatch[2].trim(),
      isThinkingFinished: true,
    };
  }

  // Case 2: In-progress <think> tag currently streaming
  const inProgressMatch = /<think>([\s\S]*)/i.exec(raw);
  if (inProgressMatch) {
    return {
      thinking: inProgressMatch[1].trim(),
      response: '',
      isThinkingFinished: false,
    };
  }

  // Case 3: Standard response without thinking block
  return {
    thinking: '',
    response: raw,
    isThinkingFinished: true,
  };
}

function CodeBlock({ node, inline, className, children, ...props }: any) {
  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1] : '';
  const codeContent = String(children).replace(/\n$/, '');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isMultiLine = codeContent.includes('\n');

  if (!inline && (match || isMultiLine)) {
    return (
      <div className="my-3 overflow-hidden rounded-xl border border-[#272932] bg-[#0c0d11] text-sm shadow-lg">
        <div className="flex items-center justify-between border-b border-[#21232b] bg-[#15161c] px-3.5 py-1.5 text-xs text-[#8f929d]">
          <span className="font-mono text-[11px] font-medium lowercase tracking-wider text-[#a5a8b5]">
            {lang || 'code'}
          </span>
          <button
            onClick={handleCopy}
            type="button"
            className="flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium text-[#8e929f] transition hover:bg-[#23252e] hover:text-white"
          >
            {copied ? (
              <>
                <Check size={12} className="text-[#d2f36b]" />
                <span className="text-[#d2f36b]">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>Copy code</span>
              </>
            )}
          </button>
        </div>
        <div className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-[#e6e8ee]">
          <pre className="!bg-transparent !p-0 !m-0">
            <code className={className} {...props}>
              {children}
            </code>
          </pre>
        </div>
      </div>
    );
  }

  return (
    <code className="rounded bg-[#1a1c23] px-1.5 py-0.5 font-mono text-[13px] text-[#e0e2e8] border border-[#282a35]" {...props}>
      {children}
    </code>
  );
}

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

  const [feedback, setFeedback] = useState<Record<string, 'like' | 'dislike'>>({});
  const [showPresets, setShowPresets] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; size: string; content: string }[]>([]);
  const [openThinking, setOpenThinking] = useState<Record<string, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
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
      setToast('OP Mode: ON');
    } else if (isOpOff) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('zyntra_op_mode');
      }
      setUsage((prev) => ({ ...prev, limit: 100 }));
      setToast('OP Mode: OFF');
    } else {
      // Daily limit check for non-admin
      if (user.role !== 'ADMIN' && usage.used + 8 > usage.limit) {
        setToast('โควต้าของคุณหมดแล้วสำหรับวันนี้');
        return;
      }
    }

    // Build final content combining attached documents if present
    let finalContent = trimmed;
    if (attachments.length > 0) {
      const docsSummary = attachments
        .map((a) => `[File Attachment: ${a.name}]\n\`\`\`\n${a.content}\n\`\`\``)
        .join('\n\n');
      finalContent = `${trimmed}\n\n${docsSummary}`;
      setAttachments([]);
    }

    setInput('');
    const userMsgId = crypto.randomUUID();
    const assistantMsgId = crypto.randomUUID();

    const userMsg: Message = {
      id: userMsgId,
      role: 'USER',
      content: finalContent,
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
        body: JSON.stringify({ chatId: active || undefined, message: finalContent }),
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

  // Handle local file reading for attachments with strict token guards
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (attachments.length >= 2) {
      setToast('แนบไฟล์ได้สูงสุด 2 ไฟล์ต่อครั้ง เพื่อประหยัดโทเคน');
      return;
    }

    const maxAllowed = Math.min(files.length, 2 - attachments.length);
    for (let i = 0; i < maxAllowed; i++) {
      const file = files[i];
      if (file.size > 500 * 1024) {
        setToast(`ไฟล์ "${file.name}" มีขนาดเกิน 500KB`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const textContent = (event.target?.result as string) || '';
        const sizeFormatted = file.size > 1024 ? `${(file.size / 1024).toFixed(1)} KB` : `${file.size} B`;
        // Strictly truncate text content to 2,500 chars to avoid token explosion
        const safeContent = textContent.slice(0, 2500);
        setAttachments((prev) => [
          ...prev,
          { name: file.name, size: sizeFormatted, content: safeContent },
        ]);
        setToast(`แนบ "${file.name}" เรียบร้อย (จำกัดขนาดประหยัดโทเคน)`);
      };
      reader.readAsText(file);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleThinking(msgId: string) {
    setOpenThinking((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  }

  function toggleFeedback(msgId: string, type: 'like' | 'dislike') {
    setFeedback((prev) => {
      const current = prev[msgId];
      if (current === type) {
        const next = { ...prev };
        delete next[msgId];
        return next;
      }
      return { ...prev, [msgId]: type };
    });
    setToast(type === 'like' ? 'Feedback recorded: Helpful 👍' : 'Feedback recorded: Needs improvement 👎');
  }

  function regenerateLast() {
    if (loading) return;
    // Find last user message
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'USER');
    if (lastUserMsg) {
      send(lastUserMsg.content);
    }
  }

  function exportChatMarkdown() {
    if (messages.length === 0) {
      setToast('No messages to export');
      return;
    }
    const title = (active ? chats.find((c) => c.id === active)?.title : 'Conversation') || 'Conversation';
    let md = `# ${title}\n*Exported from Zyntra AI Workspace on ${new Date().toLocaleString()}*\n\n---\n\n`;
    messages.forEach((m) => {
      md += `### ${m.role === 'USER' ? user.name : 'Zyntra v5'}\n\n${m.content}\n\n---\n\n`;
    });
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setToast('Conversation exported as Markdown');
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
                  {usage.limit >= 1000 ? 'OP Mode (1,000 max)' : '1 question = 8 tokens'}
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
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPresets(true)}
              className="flex items-center gap-1.5 rounded-lg border border-[#262831] bg-[#14151b] px-2.5 py-1.5 text-xs text-[#c4c6cf] hover:border-[#383a46] hover:bg-[#1a1c24] hover:text-white transition"
              title="Enterprise Prompt Library"
            >
              <Sparkles size={13} className="text-[#d2f36b]" />
              <span className="hidden sm:inline">Prompt Library</span>
            </button>
            {messages.length > 0 && (
              <button
                onClick={exportChatMarkdown}
                className="flex items-center gap-1.5 rounded-lg border border-[#262831] bg-[#14151b] px-2.5 py-1.5 text-xs text-[#c4c6cf] hover:border-[#383a46] hover:bg-[#1a1c24] hover:text-white transition"
                title="Export conversation as Markdown"
              >
                <Download size={13} />
                <span className="hidden sm:inline">Export</span>
              </button>
            )}
            <div className="ml-1 flex items-center gap-2 text-xs text-[#797c85]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#a4cb54]" /> Workspace
            </div>
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
                  <article
                    key={m.id}
                    className={`fade-in flex gap-3.5 ${
                      m.role === 'USER' ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-semibold shadow-sm ${
                        m.role === 'USER'
                          ? 'bg-gradient-to-tr from-[#252830] to-[#343844] text-[#e8eaef] border border-[#3e4250]'
                          : 'bg-[#151811] text-[#d2f36b] border border-[#2e3322]'
                      }`}
                    >
                      {m.role === 'USER' ? user.name[0]?.toUpperCase() : <Sparkles size={14} className="text-[#d2f36b]" />}
                    </div>

                    {/* Message Bubble Body */}
                    <div
                      className={`min-w-0 max-w-[85%] sm:max-w-[80%] ${
                        m.role === 'USER'
                          ? 'rounded-2xl rounded-tr-sm bg-[#1c1e25] border border-[#2a2c36] px-4 py-3 shadow-md'
                          : 'flex-1'
                      }`}
                    >
                      <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-[#838692]">
                        <span>{m.role === 'USER' ? user.name : 'Zyntra v5'}</span>
                        {m.role === 'ASSISTANT' && (
                          <span className="rounded bg-[#1a1c22] px-1.5 py-0.5 text-[9px] font-semibold text-[#9da1ad] border border-[#272932]">
                            ENTERPRISE AI
                          </span>
                        )}
                      </div>

                      {(() => {
                        if (!m.content) {
                          return (
                            <div className="flex items-center gap-2.5 py-2.5">
                              <span className="text-xs text-[#9699a3]">Synthesizing response</span>
                              <span className="flex gap-1.5">
                                <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#d2f36b]" />
                                <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#d2f36b] [animation-delay:150ms]" />
                                <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#d2f36b] [animation-delay:300ms]" />
                              </span>
                            </div>
                          );
                        }

                        if (m.role === 'ASSISTANT') {
                          const { thinking, response, isThinkingFinished } = parseThinkingContent(m.content);
                          const isExpanded = openThinking[m.id] ?? !isThinkingFinished;

                          return (
                            <div className="space-y-3">
                              {/* Thinking Process Accordion Drawer */}
                              {thinking && (
                                <div className="overflow-hidden rounded-xl border border-[#2b2f21] bg-[#10130d] text-xs transition">
                                  <button
                                    type="button"
                                    onClick={() => toggleThinking(m.id)}
                                    className="flex w-full items-center justify-between px-3.5 py-2 font-medium text-[#c4de79] hover:bg-[#161a12] transition"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Brain size={14} className="text-[#d2f36b]" />
                                      <span>
                                        Thinking Process {!isThinkingFinished && '(Analyzing...)'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[#8f9a6e]">
                                      <span>{isExpanded ? 'Hide' : 'Show steps'}</span>
                                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                    </div>
                                  </button>
                                  {isExpanded && (
                                    <div className="border-t border-[#23271b] px-3.5 py-2.5 font-mono text-[11px] leading-relaxed text-[#a4af8a] whitespace-pre-wrap bg-[#0c0e09]/70">
                                      {thinking}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Main Response Markdown */}
                              {response ? (
                                <div className="prose text-[14px] leading-relaxed text-[#e1e2e7]">
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                      code: CodeBlock,
                                    }}
                                  >
                                    {response}
                                  </ReactMarkdown>
                                </div>
                              ) : !isThinkingFinished ? (
                                <div className="flex items-center gap-2 py-1 text-xs text-[#9699a3]">
                                  <Brain size={13} className="text-[#d2f36b] animate-pulse" />
                                  <span>Reasoning in progress...</span>
                                </div>
                              ) : null}
                            </div>
                          );
                        }

                        // User message
                        return (
                          <div className="prose text-[14px] leading-relaxed text-[#f0f1f4]">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                code: CodeBlock,
                              }}
                            >
                              {m.content}
                            </ReactMarkdown>
                          </div>
                        );
                      })()}

                      {/* Assistant Telemetry & Enterprise Action Bar */}
                      {m.role === 'ASSISTANT' && m.content && (
                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#1d1f27] pt-2.5">
                          {m.responseTime && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-[#232530] bg-[#121318] px-2 py-0.5 text-[11px] text-[#8e929f]">
                              <Clock size={11} className="text-[#d2f36b]" />
                              {m.responseTime}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 rounded-md border border-[#232530] bg-[#121318] px-2 py-0.5 text-[11px] text-[#8e929f]">
                            <Zap size={11} className="text-[#d2f36b]" />
                            {m.tokens ?? 8} tokens
                          </span>

                          <div className="flex items-center gap-1 ml-auto">
                            {/* Copy button */}
                            <button
                              onClick={() => copyText(m.id, m.content)}
                              title="Copy response"
                              className="inline-flex items-center gap-1 rounded-md border border-transparent px-2 py-1 text-[11px] text-[#838692] hover:border-[#272933] hover:bg-[#181a21] hover:text-[#d3d4d8] transition"
                            >
                              {copiedId === m.id ? (
                                <>
                                  <Check size={12} className="text-[#d2f36b]" />
                                  <span className="text-[#d2f36b]">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={12} />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>

                            {/* Regenerate button */}
                            <button
                              onClick={regenerateLast}
                              disabled={loading}
                              title="Regenerate response"
                              className="inline-flex items-center gap-1 rounded-md border border-transparent px-2 py-1 text-[11px] text-[#838692] hover:border-[#272933] hover:bg-[#181a21] hover:text-[#d3d4d8] disabled:opacity-40 transition"
                            >
                              <RotateCcw size={12} />
                              <span className="hidden sm:inline">Retry</span>
                            </button>

                            {/* Thumbs up */}
                            <button
                              onClick={() => toggleFeedback(m.id, 'like')}
                              title="Helpful response"
                              className={`rounded-md p-1.5 text-xs transition ${
                                feedback[m.id] === 'like'
                                  ? 'bg-[#1b2210] text-[#d2f36b] border border-[#343e1d]'
                                  : 'text-[#777983] hover:bg-[#181a21] hover:text-white'
                              }`}
                            >
                              <ThumbsUp size={12} fill={feedback[m.id] === 'like' ? 'currentColor' : 'none'} />
                            </button>

                            {/* Thumbs down */}
                            <button
                              onClick={() => toggleFeedback(m.id, 'dislike')}
                              title="Needs improvement"
                              className={`rounded-md p-1.5 text-xs transition ${
                                feedback[m.id] === 'dislike'
                                  ? 'bg-[#2b1619] text-rose-400 border border-[#482025]'
                                  : 'text-[#777983] hover:bg-[#181a21] hover:text-white'
                              }`}
                            >
                              <ThumbsDown size={12} fill={feedback[m.id] === 'dislike' ? 'currentColor' : 'none'} />
                            </button>
                          </div>
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
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                multiple
                accept=".txt,.md,.json,.csv,.js,.ts,.tsx,.jsx,.html,.css,.py,.sql"
                className="hidden"
              />

              {/* Attachment Preview Chips */}
              {attachments.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2 pt-1 border-b border-[#23252d] pb-2">
                  {attachments.map((att, idx) => (
                    <div
                      key={att.name + idx}
                      className="flex items-center gap-1.5 rounded-lg border border-[#303426] bg-[#1a1f13] px-2.5 py-1 text-xs text-[#d2f36b]"
                    >
                      <FileText size={12} />
                      <span className="font-medium max-w-[160px] truncate">{att.name}</span>
                      <span className="text-[10px] text-[#9baa6e]">({att.size})</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        className="ml-1 text-[#9baa6e] hover:text-white"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <textarea
                value={input}
                maxLength={2000}
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
                    : attachments.length > 0
                    ? 'Ask questions or summarize attached document(s)…'
                    : 'Message Zyntra v5… (Max 2,000 chars per message to save tokens)'
                }
                className="max-h-40 min-h-12 w-full resize-y bg-transparent text-sm leading-6 outline-none placeholder:text-[#71747e] disabled:cursor-not-allowed"
              />
              <div className="flex items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading || attachments.length >= 2}
                    title="Attach documents (.txt, .md, .csv, .json, max 2 files)"
                    className="flex items-center gap-1.5 rounded-lg border border-[#272931] bg-[#131418] px-2.5 py-1 text-xs text-[#b0b3bf] hover:border-[#383a45] hover:bg-[#1a1c22] hover:text-white transition disabled:opacity-40"
                  >
                    <Paperclip size={13} className="text-[#d2f36b]" />
                    <span className="text-[11px]">Attach File ({attachments.length}/2)</span>
                  </button>
                  <span className="text-[11px] text-[#70727b] hidden sm:inline">
                    {input.length > 0 ? (
                      <span className={input.length >= 1800 ? 'text-amber-400 font-medium' : 'text-[#70727b]'}>
                        {input.length}/2,000 ตัวอักษร
                      </span>
                    ) : isQuotaExceeded ? (
                      <span className="text-rose-400">Daily limit reached ({usage.used}/{usage.limit} tokens today)</span>
                    ) : (
                      <span>Token Saver Active · Max 2k chars</span>
                    )}
                  </span>
                </div>
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
                    disabled={(!input.trim() && attachments.length === 0) || loading}
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
            <div className="mb-4 rounded-lg border border-[#2b2d34] bg-[#1a1b20] p-3 text-xs text-[#8e909a]">
              Settings are locked and managed by the system administrator.
            </div>
            <label className="mb-4 block text-sm text-[#8a8c95] opacity-75">
              Model
              <input
                name="model"
                defaultValue={formatModelDisplay(settings?.model)}
                disabled
                className="mt-2 w-full cursor-not-allowed rounded-lg border border-[#23252c] bg-[#101115] p-2.5 text-sm text-[#8a8c95] outline-none"
              />
            </label>
            <label className="mb-4 block text-sm text-[#8a8c95] opacity-75">
              <div className="flex items-center justify-between">
                <span>Temperature</span>
                <span className="text-xs text-[#71747e]">{simTemp}</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={simTemp}
                disabled
                className="mt-2 w-full cursor-not-allowed opacity-50 grayscale"
              />
            </label>
            <label className="mb-4 block text-sm text-[#8a8c95] opacity-75">
              <div className="flex items-center justify-between">
                <span>Maximum tokens</span>
                <span className="text-xs text-[#71747e]">{simMaxTokens}</span>
              </div>
              <input
                type="range"
                min="256"
                max="8192"
                step="256"
                value={simMaxTokens}
                disabled
                className="mt-2 w-full cursor-not-allowed opacity-50 grayscale"
              />
            </label>
            <label className="mb-5 block text-sm text-[#8a8c95] opacity-75">
              System prompt
              <textarea
                value={simSystemPrompt}
                disabled
                rows={3}
                className="mt-2 w-full cursor-not-allowed rounded-lg border border-[#23252c] bg-[#101115] p-2.5 text-sm text-[#8a8c95] outline-none"
              />
            </label>
            <button
              type="button"
              disabled
              className="w-full cursor-not-allowed rounded-lg bg-[#272930] py-2.5 font-medium text-[#737682]"
            >
              Preferences Locked
            </button>
          </form>
        </div>
      )}

      {/* Enterprise Prompt Library Modal */}
      {showPresets && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowPresets(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-2xl border border-[#2b2d34] bg-[#141519] p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between border-b border-[#23252c] pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1c2211] text-[#d2f36b] border border-[#2c3417]">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Enterprise Prompt Library</h2>
                  <p className="text-xs text-[#818491]">คลังเทมเพลตมาตรฐานสำหรับงานธุรกิจและการพัฒนา</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPresets(false)}
                className="text-[#9699a3] hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {enterprisePresets.map((preset) => (
                <div
                  key={preset.title}
                  className="rounded-xl border border-[#24262f] bg-[#0d0e12] p-4 transition hover:border-[#3d4230] hover:bg-[#111317]"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#d2f36b]">
                      {preset.category}
                    </span>
                    <button
                      onClick={() => {
                        setInput(preset.prompt);
                        setShowPresets(false);
                      }}
                      className="inline-flex items-center gap-1 rounded-md bg-[#1f2216] px-2.5 py-1 text-xs font-medium text-[#d2f36b] hover:bg-[#283015] border border-[#343e1d] transition"
                    >
                      Use Template ↗
                    </button>
                  </div>
                  <h3 className="text-sm font-medium text-white mb-1.5">{preset.title}</h3>
                  <p className="text-xs text-[#9598a4] leading-relaxed line-clamp-2">{preset.prompt}</p>
                </div>
              ))}
            </div>
          </div>
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
