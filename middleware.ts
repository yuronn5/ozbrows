// middleware.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const COOKIE_NAME = 'admin_session';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 діб

export const config = {
  matcher: ['/admin/:path*'], // захищаємо /admin
};

export async function middleware(req: NextRequest) {
  // 1) якщо є валідна сесія — пускаємо
  const token = req.cookies.get(COOKIE_NAME)?.value || '';
  if (token) {
    const ok = await verifySession(token).catch(() => false);
    if (ok) return NextResponse.next();
  }

  // 2) пробуємо Basic Auth
  const auth = req.headers.get('authorization') || '';
  const user = process.env.ADMIN_BASIC_USER || 'admin';
  const pass = process.env.ADMIN_BASIC_PASS || '';
  if (!pass) {
    return new NextResponse('Admin locked. Configure ADMIN_BASIC_PASS.', { status: 503 });
  }

  if (!auth.startsWith('Basic ')) {
    return new NextResponse('Authentication required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin"' },
    });
  }

  const [u, p] = Buffer.from(auth.slice(6), 'base64').toString('utf8').split(':');
  const ok = u === user && p === pass;
  if (!ok) {
    return new NextResponse('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin"' },
    });
  }

  // 3) логін успішний → ставимо cookie-сесію
  const res = NextResponse.next();
  const cookie = await buildSessionCookie(u);
  res.headers.append('Set-Cookie', cookie);
  return res;
}

// ---------- helpers ----------
function b64url(input: string) {
  return Buffer.from(input, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function b64urlDecode(input: string) {
  input = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = input.length % 4 ? 4 - (input.length % 4) : 0;
  return Buffer.from(input + '='.repeat(pad), 'base64').toString('utf8');
}
async function sign(data: string) {
  const secret = process.env.ADMIN_SESSION_SECRET || '';
  if (!secret || secret.length < 16) throw new Error('ADMIN_SESSION_SECRET is missing/short');
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return b64url(Buffer.from(sigBuf).toString('binary'));
}
function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
async function buildSessionCookie(username: string) {
  const exp = Date.now() + MAX_AGE * 1000;
  const payload = `${username}|${exp}`;
  const sig = await sign(payload);
  const value = `${b64url(payload)}.${sig}`;
  // примітка: шлях тільки до /admin
  return `${COOKIE_NAME}=${value}; Path=/admin; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;
}
async function verifySession(token: string) {
  const [payloadB64, sig] = token.split('.');
  if (!payloadB64 || !sig) return false;
  const payload = b64urlDecode(payloadB64);
  const [username, expStr] = payload.split('|');
  const exp = Number(expStr);
  if (!username || !Number.isFinite(exp) || Date.now() > exp) return false;
  const expected = await sign(payload);
  return timingSafeEqual(sig, expected);
}
