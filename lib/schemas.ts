import { z } from 'zod';
export const registerSchema = z.object({ name: z.string().trim().min(1).max(80), email: z.string().email().max(254), password: z.string().min(10).max(128) });
export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1).max(128) });
export const chatSchema = z.object({ chatId: z.string().nullish(), message: z.string().trim().min(1).max(16000) });
export const profileSchema = z.object({ name: z.string().trim().min(1).max(80).optional(), theme: z.enum(['dark','light']).optional(), model: z.string().max(100).optional(), temperature: z.number().min(0).max(2).optional(), language: z.string().max(20).optional(), maxTokens: z.number().int().min(1).max(8192).optional(), topP: z.number().min(0).max(1).optional(), systemPrompt: z.string().max(4000).optional() });
