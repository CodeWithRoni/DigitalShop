import { getAdmin } from '@/lib/admin';
import { monthReport } from '@/lib/reports';
import { q } from '@/lib/db/pg';
import { logActivity } from '@/lib/activity';

const cell = (v: unknown) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // stop spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
};
const row = (a: unknown[]) => a.map(cell).join(',');

/** Monthly report as a CSV that opens in Excel / Google Sheets. */
export async function GET(req: Request) {
  const me = await getAdmin();
  if (!me || me.role !== 'owner') return new Response('Forbidden', { status: 403 });
  const month = new URL(req.url).searchParams.get('month') || '';
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return new Response('Bad month', { status: 400 });
  const r = await monthReport(month);
  const orders = await q<Record<string, unknown>>(
    `select o.code, to_char(o.created_at at time zone 'Asia/Dhaka', 'YYYY-MM-DD HH24:MI') as date, o.customer_name, o.customer_phone,
       (select string_agg(i.product_name || ' - ' || i.package_name || ' x' || i.quantity, '; ') from order_items i where i.order_id = o.id) as items,
       coalesce(o.subtotal, o.total) as subtotal, o.discount, o.coupon_code, o.total, o.payment_status, o.status, o.payment_method
     from orders o where (o.created_at at time zone 'Asia/Dhaka')::date between $1::date and $2::date order by o.id`, [r.from, r.to]);
  const lines = [
    row([`Sales report ${month}`]), '',
    row(['Metric', 'Value']),
    ...[['Orders placed', r.orders], ['Paid orders', r.paidOrders], ['Revenue (BDT)', r.gross], ['Discounts given', r.discounts],
      ['Refunds', r.refunds], ['Net revenue', r.net], ['Average order', r.aov.toFixed(2)], ['Paying customers', r.customers], ['New customers', r.newCustomers]].map(row),
    '', row(['Product', 'Units', 'Revenue']), ...r.products.map((p) => row([p.name, p.units, p.revenue])),
    '', row(['Payment method', 'Orders', 'Revenue']), ...r.methods.map((m) => row([m.method, m.orders, m.revenue])),
    '', row(['Day', 'Paid orders', 'Revenue']), ...r.daily.map((d) => row([d.date, d.orders, d.revenue])),
    '', row(['Order', 'Date', 'Customer', 'Phone', 'Items', 'Subtotal', 'Discount', 'Coupon', 'Total', 'Payment', 'Status', 'Method']),
    ...orders.map((o) => row(Object.values(o))),
  ];
  await logActivity(me.email, 'Exported report', 'report', month);
  return new Response('﻿' + lines.join('\r\n'), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="sales-report-${month}.csv"`, 'Cache-Control': 'no-store' },
  });
}
