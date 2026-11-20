import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { initPayment } from '@/lib/sslcommerz';
import { demoPaymentEnabled, gatewayConfigured } from '@/lib/payment';
import { grantCookie } from '@/lib/orderAccess';
import { clientIp, rateLimit } from '@/lib/rateLimit';
import { SITE_URL, normalizePhone, orderCode } from '@/lib/utils';
import { getSettings } from '@/lib/settings';
import { checkCoupon } from '@/lib/coupons';
import { stockAvailability } from '@/lib/stock';
import { notifyNewOrder } from '@/lib/notify';

type Body = {
  customer?: { name?: string; phone?: string; email?: string; note?: string };
  items?: { packageId?: number; quantity?: number; deliveryInfo?: string }[];
  coupon?: string;
};

export async function POST(req: Request) {
  if (!rateLimit('checkout:' + clientIp(req), 10, 10 * 60_000))
    return NextResponse.json({ error: 'Too many attempts. Please wait a few minutes.' }, { status: 429 });

  const settings = await getSettings();
  if (!settings.shop_open) return NextResponse.json({ error: settings.closed_message || 'The shop is closed right now.' }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as Body;
  const name = (body.customer?.name || '').trim().slice(0, 80);
  const phone = normalizePhone(body.customer?.phone || '');
  const email = (body.customer?.email || '').trim().slice(0, 120);
  const note = (body.customer?.note || '').trim().slice(0, 500);
  const items = Array.isArray(body.items) ? body.items.slice(0, 30) : [];

  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  if (!/^01[3-9]\d{8}$/.test(phone)) return NextResponse.json({ error: 'Enter a valid Bangladeshi phone number' }, { status: 400 });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  if (!items.length) return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
  if (!gatewayConfigured && !demoPaymentEnabled)
    return NextResponse.json({ error: 'Online payment is not available right now. Please contact us on WhatsApp.' }, { status: 503 });

  // Prices always come from the database — never from the browser.
  const pkgs = await db.getPackagesByIds(items.map((i) => Number(i.packageId)).filter(Number.isFinite));
  const orderItems = [];
  for (const it of items) {
    const pkg = pkgs.find((p) => p.id === Number(it.packageId));
    if (!pkg || !pkg.is_active || !pkg.product.is_active)
      return NextResponse.json({ error: 'A package in your cart is no longer available. Please remove it.' }, { status: 400 });
    const quantity = Math.min(50, Math.max(1, Math.floor(Number(it.quantity) || 1)));
    const deliveryInfo = (it.deliveryInfo || '').trim().slice(0, 200);
    if (!deliveryInfo) return NextResponse.json({ error: `${pkg.product.delivery_label} is required for ${pkg.product.name}` }, { status: 400 });
    orderItems.push({
      product_id: pkg.product.id, package_id: pkg.id, product_name: pkg.product.name, package_name: pkg.name,
      unit_price: Number(pkg.price), quantity, delivery_info: deliveryInfo,
    });
  }
  const stock = await stockAvailability(orderItems.map((i) => i.package_id));
  const need = new Map<number, number>();
  for (const i of orderItems) need.set(i.package_id, (need.get(i.package_id) || 0) + i.quantity);
  for (const [pid, n] of need) {
    if (!stock.has(pid)) continue;
    const left = stock.get(pid)!;
    if (left < n) {
      const it = orderItems.find((i) => i.package_id === pid)!;
      return NextResponse.json({ error: left ? `Only ${left} left for ${it.product_name} — ${it.package_name}. Please lower the quantity.` : `${it.product_name} — ${it.package_name} is out of stock right now.` }, { status: 400 });
    }
  }
  const subtotal = Math.round(orderItems.reduce((s, i) => s + i.unit_price * i.quantity, 0) * 100) / 100;
  let discount = 0;
  let coupon_code: string | null = null;
  if (body.coupon?.trim()) {
    const c = await checkCoupon(body.coupon, subtotal);
    if ('error' in c) return NextResponse.json({ error: c.error }, { status: 400 });
    discount = c.discount; coupon_code = c.coupon.code;
  }
  const total = Math.round((subtotal - discount) * 100) / 100;
  if (total < 10) return NextResponse.json({ error: 'Minimum order is ৳10' }, { status: 400 });

  const code = orderCode();
  const tran_id = `${code}-${Date.now().toString(36)}`;
  const order = await db.createOrder(
    { code, tran_id, customer_name: name, customer_phone: phone, customer_email: email || null, note: note || null,
      total, status: 'pending', payment_status: 'unpaid', subtotal, discount, coupon_code },
    orderItems,
  );
  await notifyNewOrder(order.id, 'placed');

  let redirect: string;
  if (gatewayConfigured) {
    const r = await initPayment({
      tran_id, total_amount: total,
      success_url: `${SITE_URL}/api/payment/success`,
      fail_url: `${SITE_URL}/api/payment/fail`,
      cancel_url: `${SITE_URL}/api/payment/cancel`,
      ipn_url: `${SITE_URL}/api/payment/ipn`,
      cus_name: name, cus_email: email || 'customer@example.com', cus_phone: phone,
      product_name: orderItems.map((i) => `${i.product_name} ${i.package_name}`).join(', '),
      value_a: order.code,
    });
    if ('error' in r) {
      await db.updateOrder(order.id, { payment_status: 'failed', admin_note: `Gateway init failed: ${r.error}` });
      return NextResponse.json({ error: `Payment could not be started: ${r.error}` }, { status: 502 });
    }
    redirect = r.url;
  } else {
    redirect = `/pay/demo/${order.code}`;
  }

  const res = NextResponse.json({ redirect, code: order.code });
  const c = await grantCookie(order.code);
  res.cookies.set(c.name, c.value, c.options);
  return res;
}
