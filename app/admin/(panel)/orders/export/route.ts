import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { ADMIN_COOKIE, verifySessionToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Excel-safe CSV cell: quote, escape quotes, and neutralise formula injection.
function cell(v: unknown) {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(req: Request) {
  if (!(await verifySessionToken((await cookies()).get(ADMIN_COOKIE)?.value))) return new Response('Unauthorized', { status: 401 });
  const u = new URL(req.url).searchParams;
  const date = (k: string) => (/^\d{4}-\d{2}-\d{2}$/.test(u.get(k) || '') ? u.get(k)! : undefined);
  const { orders } = await db.listOrdersPage({
    status: u.get('status') || undefined, payment: u.get('payment') || undefined, q: u.get('q') || undefined,
    phone: u.get('phone') || undefined, from: date('from'), to: date('to'), limit: 500,
  });
  const head = ['Order code', 'Date (Dhaka)', 'Customer', 'Phone', 'Email', 'Items', 'Delivery info', 'Total (BDT)', 'Payment', 'Status', 'Method', 'Tran ID', 'Paid at'];
  const rows = orders.map((o) => [
    o.code,
    new Date(o.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' }),
    o.customer_name, o.customer_phone, o.customer_email,
    o.order_items?.map((i) => `${i.product_name} - ${i.package_name} x${i.quantity}`).join('; '),
    o.order_items?.map((i) => i.delivery_info).join('; '),
    o.total, o.payment_status, o.status, o.payment_method, o.tran_id,
    o.paid_at ? new Date(o.paid_at).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' }) : '',
  ]);
  const csv = '﻿' + [head, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
  const name = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(csv, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'no-store' },
  });
}
