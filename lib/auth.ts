// Simple admin session: HMAC-signed cookie. Works on Edge (middleware) and Node.
export const ADMIN_COOKIE = 'ds_admin';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    if (process.env.NODE_ENV === 'production') throw new Error('AUTH_SECRET must be set (16+ chars)');
    return 'dev-only-insecure-secret-change-me';
  }
  return s;
}
const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export async function hmac(data: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function createSessionToken(email: string) {
  const payload = `${email}|${Math.floor(Date.now() / 1000) + MAX_AGE}`;
  return `${btoa(payload)}.${await hmac(payload)}`;
}
export async function verifySessionToken(token?: string | null): Promise<string | null> {
  if (!token) return null;
  const [p, sig] = token.split('.');
  if (!p || !sig) return null;
  let payload: string;
  try { payload = atob(p); } catch { return null; }
  if (!safeEqual(sig, await hmac(payload))) return null;
  const [email, exp] = payload.split('|');
  if (!exp || Number(exp) < Date.now() / 1000) return null;
  return email;
}
/** The owner account from env (ADMIN_EMAIL / ADMIN_PASSWORD). Dev falls back to admin@demo.com / admin123. */
export function envOwnerEmail() {
  return (process.env.ADMIN_EMAIL || (process.env.NODE_ENV !== 'production' ? 'admin@demo.com' : '')).trim().toLowerCase();
}
export async function checkEnvOwner(email: string, password: string) {
  const E = envOwnerEmail();
  const P = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV !== 'production' ? 'admin123' : '');
  if (!E || !P) return false;
  const a = await hmac(email.trim().toLowerCase() + '\0' + password);
  const b = await hmac(E + '\0' + P);
  return safeEqual(a, b);
}
export const cookieOptions = {
  httpOnly: true, sameSite: 'lax' as const, path: '/',
  secure: process.env.NODE_ENV === 'production', maxAge: MAX_AGE,
};
