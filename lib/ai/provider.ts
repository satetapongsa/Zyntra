type Turn = { role: 'user' | 'assistant' | 'system'; content: string };
const config: Record<string, { url: string; key: string; model: string }> = {
  deepseek: { url: process.env.AI_BASE_URL || 'https://api.deepseek.com/chat/completions', key: process.env.DEEPSEEK_API_KEY || '', model: process.env.AI_MODEL || 'deepseek-chat' },
  openai: { url: process.env.AI_BASE_URL || 'https://api.openai.com/v1/chat/completions', key: process.env.OPENAI_API_KEY || '', model: process.env.AI_MODEL || 'gpt-4o-mini' },
  gemini: { url: process.env.AI_BASE_URL || `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`, key: process.env.GEMINI_API_KEY || '', model: process.env.AI_MODEL || 'gemini-2.0-flash' },
  claude: { url: process.env.AI_BASE_URL || 'https://api.anthropic.com/v1/messages', key: process.env.CLAUDE_API_KEY || '', model: process.env.AI_MODEL || 'claude-3-5-sonnet-latest' }
};
export async function complete(turns: Turn[], opts: { temperature: number; maxTokens: number; topP: number; stream?: boolean }, retry = true): Promise<Response> {
 const provider = (process.env.AI_PROVIDER || 'deepseek').toLowerCase(); const c = config[provider];
 if (!c) throw new Error('AI provider is not supported'); if (!c.key) throw new Error(`The ${provider} API key is not configured`);
 const isClaude = provider === 'claude';
 const body = isClaude ? { model: c.model, max_tokens: opts.maxTokens, temperature: opts.temperature, top_p: opts.topP, stream: !!opts.stream, system: turns.find(x=>x.role==='system')?.content, messages: turns.filter(x=>x.role!=='system') } : { model: c.model, messages: turns, temperature: opts.temperature, max_tokens: opts.maxTokens, top_p: opts.topP, stream: !!opts.stream };
 try { const response = await fetch(c.url, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${c.key}`, ...(isClaude ? { 'anthropic-version':'2023-06-01','x-api-key':c.key } : {}) }, body: JSON.stringify(body), signal: AbortSignal.timeout(90000) });
   if ((response.status===429 || response.status>=500) && retry) { await new Promise(r=>setTimeout(r,600)); return complete(turns,opts,false); }
   if (!response.ok) { const details = await response.text(); console.error('AI provider error', response.status, details.slice(0,500)); throw new Error(response.status===401?'AI provider authentication failed':response.status===429?'AI provider is rate limited':'AI provider request failed'); }
   return response;
 } catch(e) { if (e instanceof Error && e.name === 'TimeoutError') throw new Error('AI provider timed out'); throw e; }
}
export function activeModel() { const p=(process.env.AI_PROVIDER||'deepseek').toLowerCase(); return config[p]?.model || 'unknown'; }
