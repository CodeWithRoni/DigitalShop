import 'server-only';
import { cookies } from 'next/headers';
import { hmac } from './auth';

// Lets a browser view full order details (incl. delivery message) only if it
// created the order or verified it with code + phone on the Track page.
const COOKIE = 'ds_view';
const MAX = 20;

async function read(): Promise<string[]> {
  const raw = cookies().get(COOKIE)?.value;
  if (!raw) return [];
  const [list, sig] = raw.split('.');
  if (!list || !sig || sig !== (await hmac('view:' + list))) return [];
  return list.split('-').filter(Boolean).map((c) => 'DS-' + c);
}

/** Returns a cookie value that includes `code`. Set it on a Response. */
export async function grantCookie(code: string) {
  const codes = [code, ...(await read()).filter((c) => c !== code)].slice(0, MAX).map((c) => c.replace(/^DS-/, ''));
  const list = codes.join('-');
  return {
    name: COOKIE,
    value: `${list}.${await hmac('view:' + list)}`,
    options: { httpOnly: true, sameSite: 'lax' as const, path: '/', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 90 },
  };
}
export async function canView(code: string) {
  return (await read()).includes(code);
}
