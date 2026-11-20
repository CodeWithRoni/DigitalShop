import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkCoupon } from '@/lib/coupons';
import { clientIp, rateLimit } from '@/lib/rateLimit';

/** Preview a coupon on the cart. Prices come from the DB, never the browser. */
export async function POST(req: Request) {
  if (!rateLimit('coupon:' + clientIp(req), 20, 10 * 60_000))
    return NextResponse.json({ error: 'Too many attempts. Please wait a few minutes.' }, { status: 429 });
  const body = (await req.json().catch(() => ({}))) as { code?: string; items?: { packageId?: number; quantity?: number }[] };
  const items = Array.isArray(body.items) ? body.items.slice(0, 30) : [];
  const pkgs = await db.getPackagesByIds(items.map((i) => Number(i.packageId)).filter(Number.isFinite));
  const subtotal = items.reduce((s, i) => {
    const p = pkgs.find((k) => k.id === Number(i.packageId));
    return s + (p ? Number(p.price) * Math.min(50, Math.max(1, Math.floor(Number(i.quantity) || 1))) : 0);
  }, 0);
  const r = await checkCoupon(body.code || '', subtotal);
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ code: r.coupon.code, discount: r.discount, subtotal, total: subtotal - r.discount,
    label: r.coupon.type === 'percent' ? `${Number(r.coupon.value)}% off` : `৳${Number(r.coupon.value)} off` });
}
