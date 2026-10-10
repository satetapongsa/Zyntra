'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { highlightCode } from '@/lib/code-highlighter';
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
  ArrowDown,
  Pencil,
} from 'lucide-react';

type User = { id: string; name: string; email: string; role: string };
type Chat = {
  id: string;
  title: string;
  pinned: boolean;
  favorite: boolean;
  updatedAt: Date;
  messages?: Message[];
};
type Message = {
  id: string;
  role: string;
  content: string;
  createdAt: string | Date;
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
    const highlightedHtml = highlightCode(codeContent, lang);
    const lines = codeContent.split('\n');

    return (
      <div className="vscode-code-block my-4 overflow-hidden rounded-xl border border-[#262833] bg-[#111217] text-[13px] shadow-2xl">
        {/* VS Code Window Header */}
        <div className="flex items-center justify-between border-b border-[#20222a] bg-[#16171e] px-4 py-2 text-xs">
          <div className="flex items-center gap-2.5">
            {/* macOS / VS Code window control dots */}
            <div className="flex items-center gap-1.5 opacity-80">
              <span className="h-2.5 w-2.5 rounded-full bg-[#e05c53]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#f2be3f]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#52c444]" />
            </div>
            <span className="ml-2 font-mono text-[11px] font-semibold text-[#8e92a2]">
              {lang || 'code'}
            </span>
          </div>

          <button
            onClick={handleCopy}
            type="button"
            className="flex items-center gap-1.5 rounded-md border border-[#2b2d39] bg-[#1c1e27] px-2.5 py-1 text-[11px] font-medium text-[#b5b8c7] transition hover:border-[#3c3f4e] hover:bg-[#232631] hover:text-white"
          >
            {copied ? (
              <>
                <Check size={12} className="text-[#d2f36b]" />
                <span className="text-[#d2f36b]">Copied</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>Copy code</span>
              </>
            )}
          </button>
        </div>

        {/* Code Content with Line Numbers & Syntax Highlighting */}
        <div className="flex overflow-x-auto p-3.5 leading-6">
          {/* Line Numbers */}
          <div className="vscode-line-numbers select-none text-right pr-3.5 border-r border-[#20222b] text-[12px] text-[#555866]">
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>

          {/* Highlighted Code */}
          <pre className="!bg-transparent !p-0 !m-0 !border-none !shadow-none !outline-none pl-3.5 overflow-visible font-mono text-[13px] text-[#e0e2e8]">
            <code
              className={`${className || ''} !bg-transparent !p-0 !border-none`}
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />
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
  const [chatLoading, setChatLoading] = useState(false);
  const cacheRef = useRef<Record<string, Message[]>>((() => {
    const initialMap: Record<string, Message[]> = {};
    if (initialChats) {
      for (const c of initialChats) {
        if (c.messages) {
          initialMap[c.id] = c.messages as any;
        }
      }
    }
    return initialMap;
  })());
  const activeRef = useRef<string | null>(null);
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
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState('');
  const [showPresets, setShowPresets] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; size: string; content: string }[]>([]);
  const [openThinking, setOpenThinking] = useState<Record<string, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);
  const router = useRouter();

  // Scroll position tracking for "Scroll to bottom" button
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    // Show arrow if user has scrolled up more than 120px from bottom
    setShowScrollBottom(distanceToBottom > 120);
  };

  const scrollToBottom = (smooth = true) => {
    bottom.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  // Load OP mode from localStorage if previously unlocked
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isOp = localStorage.getItem('zyntra_op_mode') === '1';
      if (isOp) {
        setUsage((prev) => ({ ...prev, limit: 1000 }));
      }
    }
  }, []);

  // When active chat switches, scroll to bottom once
  useEffect(() => {
    if (active) {
      setTimeout(() => scrollToBottom(false), 50);
    }
  }, [active]);

  // Toast timer
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const visible = chats.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()));

  // Sync activeRef
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  // Pre-fetch a chat into memory cache
  const prefetchChat = (id: string) => {
    if (!id || cacheRef.current[id]) return;
    fetch(`/api/chat/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.chat?.messages) {
          cacheRef.current[id] = d.chat.messages;
        }
      })
      .catch(() => {});
  };

  // Switch chat with instant transition & background fetch
  async function selectChat(id: string) {
    if (active === id) return;
    if (loading) abort.current?.abort();

    // 1. Instant switch
    setActive(id);

    // 2. If cached, display instantly
    if (cacheRef.current[id]) {
      setMessages(cacheRef.current[id]);
      setChatLoading(false);
      setTimeout(() => scrollToBottom(false), 20);
      return;
    }

    // 3. If not cached, clear current view and show sleek skeleton/loading instantly
    setMessages([]);
    setChatLoading(true);

    try {
      const r = await fetch(`/api/chat/${id}`);
      if (r.ok) {
        const d = await r.json();
        const msgs = d.chat?.messages || [];
        cacheRef.current[id] = msgs;
        // Only update if still on this active chat
        if (activeRef.current === id) {
          setMessages(msgs);
          setTimeout(() => scrollToBottom(false), 20);
        }
      } else {
        throw new Error('Failed to load chat');
      }
    } catch {
      if (activeRef.current === id) {
        setToast('Failed to load chat');
      }
    } finally {
      if (activeRef.current === id) {
        setChatLoading(false);
      }
    }
  }

  // Create new chat - 100% instant
  function newChat() {
    if (loading) abort.current?.abort();
    setActive(null);
    setMessages([]);
    setChatLoading(false);
    setInput('');
    setAttachments([]);
  }

  // Delete chat
  async function remove(id: string) {
    delete cacheRef.current[id];
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

  // Send or edit message
  async function send(text = input, editMessageId?: string) {
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
      // Daily limit check for non-admin (requires at least 1% quota)
      if (user.role !== 'ADMIN' && usage.used + 1 > usage.limit) {
        setToast('โควต้าของคุณหมดแล้ว (เหลือ 0%) กรุณารอ 5 ชม. เพื่อรีเซ็ต');
        return;
      }
    }

    // Build final content combining attached documents if present
    let finalContent = trimmed;
    if (attachments.length > 0 && !editMessageId) {
      const docsSummary = attachments
        .map((a) => `[File Attachment: ${a.name}]\n\`\`\`\n${a.content}\n\`\`\``)
        .join('\n\n');
      finalContent = `${trimmed}\n\n${docsSummary}`;
      setAttachments([]);
    }

    if (!editMessageId) {
      setInput('');
    }
    const userMsgId = editMessageId || crypto.randomUUID();
    const assistantMsgId = crypto.randomUUID();

    const assistantMsg: Message = {
      id: assistantMsgId,
      role: 'ASSISTANT',
      content: '',
      createdAt: new Date().toISOString(),
      tokens: isOpCommand ? 0 : 1,
    };

    if (editMessageId) {
      // Find the index of the message being edited and replace messages from that point onward
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === editMessageId);
        if (idx !== -1) {
          const updatedUserMsg: Message = {
            ...prev[idx],
            content: finalContent,
          };
          return [...prev.slice(0, idx), updatedUserMsg, assistantMsg];
        }
        return prev;
      });
    } else {
      const userMsg: Message = {
        id: userMsgId,
        role: 'USER',
        content: finalContent,
        createdAt: new Date().toISOString(),
        tokens: 0,
      };
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
    }

    setLoading(true);
    abort.current = new AbortController();

    // Smoothly scroll down
    setTimeout(() => scrollToBottom(true), 50);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: active || undefined,
          message: finalContent,
          editMessageId: editMessageId || undefined,
        }),
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
                          tokens: data.tokens ?? (isOpCommand ? 0 : 1),
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
      // Update cache for active chat
      if (activeRef.current) {
        setMessages((currentMsgs) => {
          cacheRef.current[activeRef.current!] = currentMsgs;
          return currentMsgs;
        });
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

      // Handle PDF files via server parser
      if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
        if (file.size > 5 * 1024 * 1024) {
          setToast(`ไฟล์ PDF "${file.name}" มีขนาดเกิน 5MB`);
          continue;
        }

        setToast(`กำลังอ่านข้อความจาก "${file.name}"…`);
        try {
          const fd = new FormData();
          fd.append('file', file);
          const res = await fetch('/api/parse-pdf', { method: 'POST', body: fd });
          const json = await res.json();
          if (!res.ok || json.error) {
            setToast(`ไม่สามารถแยกข้อความจาก PDF: ${json.error || 'Unknown error'}`);
            continue;
          }

          const sizeFormatted = file.size > 1024 ? `${(file.size / 1024).toFixed(1)} KB` : `${file.size} B`;
          setAttachments((prev) => [
            ...prev,
            { name: file.name, size: sizeFormatted, content: json.text },
          ]);
          setToast(`แนบ PDF "${file.name}" เรียบร้อย (${json.pages || 1} หน้า)`);
        } catch {
          setToast(`เกิดข้อผิดพลาดในการประมวลผล PDF "${file.name}"`);
        }
        continue;
      }

      // Handle text / code files (up to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setToast(`ไฟล์ "${file.name}" มีขนาดเกิน 5MB`);
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
  const remainingPercent = Math.max(0, 100 - quotaPercent);
  const isQuotaExceeded = user.role !== 'ADMIN' && usage.used + 1 > usage.limit;

  // Progressive color based on Remaining quota: Green (>50%) -> Yellow (25-50%) -> Orange (10-25%) -> Red (<10%)
  const getRingColor = () => {
    if (isQuotaExceeded || remainingPercent <= 10) return 'text-rose-500';
    if (remainingPercent <= 25) return 'text-orange-400';
    if (remainingPercent <= 50) return 'text-yellow-400';
    return 'text-[#46a758]';
  };

  const getNumberColor = () => {
    if (isQuotaExceeded || remainingPercent <= 10) return 'text-rose-400';
    if (remainingPercent <= 25) return 'text-orange-300';
    if (remainingPercent <= 50) return 'text-yellow-300';
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
            className="mx-3 mb-4 flex items-center gap-2 rounded-xl border border-[#2d3037] px-3.5 py-2.5 text-sm font-medium transition hover:border-[#494d3b] hover:bg-[#181a1f]"
          >
            <Plus size={16} className="text-[#d2f36b]" /> New chat
            <span className="ml-auto text-xs text-[#777983]">⌘ K</span>
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
                  onMouseEnter={() => prefetchChat(c.id)}
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

          {/* Five Hour Limit Remaining Card (matching screenshot style) */}
          <div className="mx-3 mb-2 rounded-xl border border-[#23252b] bg-[#14151a] p-3 transition hover:border-[#2f323a]">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-[#e2e4e9] truncate">Five Hour Limit Remaining</span>
                  {usage.limit >= 1000 && (
                    <span className="rounded bg-[#d2f36b]/15 px-1 py-0.2 text-[9px] font-semibold text-[#d2f36b]">
                      OP
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-[10px] text-[#71747e]">
                  {remainingPercent > 0
                    ? `${remainingPercent}% quota available · resets in 5h`
                    : 'Limit reached (0%) · resets in 5h'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-semibold ${getNumberColor()} transition-colors duration-300`}>
                  {remainingPercent}%
                </span>
                <div className="relative flex h-6 w-6 items-center justify-center">
                  <svg className="h-6 w-6 -rotate-90 transform" viewBox="0 0 36 36">
                    <path
                      className="text-[#25272e]"
                      strokeWidth="4"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className={`${getRingColor()} transition-all duration-500`}
                      strokeDasharray={`${remainingPercent}, 100`}
                      strokeWidth="4"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                </div>
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
        <section
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="chat-scroll relative flex-1 overflow-y-auto"
        >
          <div className="mx-auto max-w-[760px] px-5 pb-8 pt-8">
            {chatLoading ? (
              <div className="fade-in space-y-6 animate-pulse">
                <div className="flex gap-3.5">
                  <div className="h-8 w-8 rounded-xl bg-[#1c1e25]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 rounded bg-[#1c1e25]" />
                    <div className="h-16 w-3/4 rounded-xl bg-[#181a20]" />
                  </div>
                </div>
                <div className="flex flex-row-reverse gap-3.5">
                  <div className="h-8 w-8 rounded-xl bg-[#252830]" />
                  <div className="h-12 w-1/2 rounded-xl bg-[#20222a]" />
                </div>
                <div className="flex gap-3.5">
                  <div className="h-8 w-8 rounded-xl bg-[#1c1e25]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-28 rounded bg-[#1c1e25]" />
                    <div className="h-24 w-5/6 rounded-xl bg-[#181a20]" />
                  </div>
                </div>
              </div>
            ) : messages.length === 0 ? (
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
                {(() => {
                  // Find the ID of the latest USER message
                  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'USER');
                  const lastUserMsgId = lastUserMsg?.id;

                  return messages.map((m) => {
                    const isLatestUserMessage = m.role === 'USER' && m.id === lastUserMsgId;
                    const isEditingThis = editingMessageId === m.id;

                    return (
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
                          <div className="mb-1.5 flex items-center justify-between gap-2 text-xs font-medium text-[#838692]">
                            <div className="flex items-center gap-2">
                              <span>{m.role === 'USER' ? user.name : 'Zyntra v5'}</span>
                              {m.role === 'ASSISTANT' && (
                                <span className="rounded bg-[#1a1c22] px-1.5 py-0.5 text-[9px] font-semibold text-[#9da1ad] border border-[#272932]">
                                  ENTERPRISE AI
                                </span>
                              )}
                            </div>

                            {/* Edit Pencil Button for Latest User Question */}
                            {isLatestUserMessage && !isEditingThis && !loading && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMessageId(m.id);
                                  setEditInput(m.content);
                                }}
                                title="แก้ไขข้อความ"
                                className="group relative flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-[#8e929f] transition hover:bg-[#282a35] hover:text-[#d2f36b]"
                              >
                                <Pencil size={12} className="transition group-hover:scale-110" />
                                <span className="hidden sm:inline">แก้ไขข้อความ</span>
                              </button>
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

                            // User message - In-place editing mode
                            if (isEditingThis) {
                              return (
                                <div className="mt-2 space-y-2.5">
                                  <textarea
                                    value={editInput}
                                    onChange={(e) => setEditInput(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        if (editInput.trim() && !loading) {
                                          const newText = editInput.trim();
                                          setEditingMessageId(null);
                                          send(newText, m.id);
                                        }
                                      } else if (e.key === 'Escape') {
                                        setEditingMessageId(null);
                                      }
                                    }}
                                    rows={Math.min(6, Math.max(2, editInput.split('\n').length))}
                                    className="w-full rounded-xl border border-[#3b3e4f] bg-[#14151b] p-3 text-[14px] text-white outline-none focus:border-[#d2f36b] transition"
                                    placeholder="แก้ไขคำถาม..."
                                    autoFocus
                                  />
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setEditingMessageId(null)}
                                      className="rounded-lg border border-[#303340] bg-[#1a1c24] px-3 py-1.5 text-xs font-medium text-[#a0a4b3] hover:bg-[#222530] hover:text-white transition"
                                    >
                                      ยกเลิก
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (editInput.trim() && !loading) {
                                          const newText = editInput.trim();
                                          setEditingMessageId(null);
                                          send(newText, m.id);
                                        }
                                      }}
                                      disabled={loading || !editInput.trim()}
                                      className="rounded-lg bg-[#d2f36b] px-3.5 py-1.5 text-xs font-semibold text-black hover:bg-[#bce055] transition disabled:opacity-50"
                                    >
                                      บันทึกและส่ง
                                    </button>
                                  </div>
                                </div>
                              );
                            }

                            // User message - Normal display
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

                          {/* Assistant Telemetry & Clean Action Bar (Copy only, no Retry or Like/Dislike) */}
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
                                {typeof m.tokens === 'number'
                                  ? `${Math.max(1, Math.round((m.tokens / usage.limit) * 100))}%`
                                  : '2%'}
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
                              </div>
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  });
                })()}
              </div>
            )}
            <div ref={bottom} />
          </div>

          {/* Floating Scroll to Bottom Arrow Button */}
          {showScrollBottom && (
            <button
              type="button"
              onClick={() => scrollToBottom(true)}
              title="Scroll to bottom"
              className="sticky bottom-4 ml-auto mr-6 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-[#2d303a] bg-[#16171d]/95 text-[#d0d3de] shadow-xl backdrop-blur hover:border-[#424653] hover:bg-[#1f2129] hover:text-white transition active:scale-95"
            >
              <ArrowDown size={16} />
            </button>
          )}
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
                accept=".pdf,application/pdf,.txt,.md,.json,.csv,.js,.ts,.tsx,.jsx,.html,.css,.py,.sql"
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
                    ? 'โควต้าหมดแล้ว (เหลือ 0%) รอ 5 ชม. เพื่อรีเซ็ต'
                    : 'Message Zentra V5'
                }
                className="max-h-40 min-h-12 w-full resize-y bg-transparent text-sm leading-6 outline-none placeholder:text-[#71747e] disabled:cursor-not-allowed"
              />
              <div className="flex items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading || attachments.length >= 2}
                    title="Attach file (.pdf, .txt, .md, .csv, max 5MB)"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[#9da1b0] hover:bg-[#20222a] hover:text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus size={18} />
                  </button>
                  <span className="text-[11px] text-[#70727b] hidden sm:inline">
                    {input.length > 0 ? (
                      <span className={input.length >= 1800 ? 'text-amber-400 font-medium' : 'text-[#70727b]'}>
                        {input.length}/2,000
                      </span>
                    ) : isQuotaExceeded ? (
                      <span className="text-rose-400">โควต้าหมด (เหลือ 0%) · รอรีเซ็ต 5 ชม.</span>
                    ) : null}
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
