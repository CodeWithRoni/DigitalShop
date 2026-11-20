import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { grantCookie } from '@/lib/orderAccess';
import { clientIp, rateLimit } from '@/lib/rateLimit';
import { normalizePhone } from '@/lib/utils';

export async function POST(req: Request) {
  if (!rateLimit('track:' + clientIp(req), 15, 10 * 60_000))
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
  const { code, phone } = (await req.json().catch(() => ({}))) as { code?: string; phone?: string };
  const c = (code || '').trim().toUpperCase().replace(/^(DS-)?/, 'DS-');
  const order = await db.getOrderByCode(c);
  if (!order || order.customer_phone !== normalizePhone(phone || ''))
    return NextResponse.json({ error: 'No order found with this code and phone number.' }, { status: 404 });
  const res = NextResponse.json({ code: order.code });
  const ck = await grantCookie(order.code);
  res.cookies.set(ck.name, ck.value, ck.options);
  return res;
}
