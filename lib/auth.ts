import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
const previewAdmin = { id: 'preview-admin', name: 'Preview Admin', email: 'admin@converse.local', role: 'ADMIN' as const, banned: false, avatar: null };
const key = () => { const v = process.env.JWT_SECRET; if (!v || v.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters'); return new TextEncoder().encode(v); };
export async function issueToken(userId: string, preview = false) { return new SignJWT({ sub: userId, preview }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('7d').sign(key()); }
export async function currentUser() {
  try { const token = (await cookies()).get('session')?.value; if (!token) return null; const { payload } = await jwtVerify(token, key()); if (!payload.sub) return null;
    if (process.env.DEMO_MODE === 'true' && payload.preview === true && payload.sub === previewAdmin.id) return previewAdmin;
    return await db.user.findUnique({ where: { id: payload.sub }, select: { id: true, name: true, email: true, role: true, banned: true, avatar: true } });
  } catch { return null; }
}
export const isPreviewAdmin = (user: { id: string } | null) => user?.id === previewAdmin.id && process.env.DEMO_MODE === 'true';
export { previewAdmin };
