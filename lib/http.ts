import { NextResponse } from 'next/server';
export const jsonError = (message: string, status = 400) => NextResponse.json({ error: message }, { status });
export const setSession = (response: NextResponse, token: string) => { response.cookies.set('session', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 }); return response; };
