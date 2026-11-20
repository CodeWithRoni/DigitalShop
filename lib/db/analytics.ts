// Shared date helpers + in-memory analytics (used by the local JSON driver).
import type { Order } from '@/lib/types';
import type { Analytics, Customer, DailyPoint, PeriodTotals } from './types';

const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000; // Asia/Dhaka is UTC+6, no DST

/** YYYY-MM-DD in Asia/Dhaka for a timestamp. */
export function dhakaDate(ts: string | number | Date) {
  return new Date(new Date(ts).getTime() + DHAKA_OFFSET_MS).toISOString().slice(0, 10);
}
/** Last `n` Dhaka dates ending today (oldest first), optionally shifted back by `shift` days. */
export function lastDays(n: number, shift = 0) {
  const today = new Date(dhakaDate(Date.now()) + 'T00:00:00Z').getTime();
  return Array.from({ length: n }, (_, i) => new Date(today - (n - 1 - i + shift) * 86400000).toISOString().slice(0, 10));
}

function totals(orders: Order[]): PeriodTotals {
  const paid = orders.filter((o) => o.payment_status === 'paid');
  const revenue = paid.reduce((a, o) => a + Number(o.total), 0);
  return {
    orders: orders.length,
    paidOrders: paid.length,
    revenue,
    aov: paid.length ? revenue / paid.length : 0,
    customers: new Set(paid.map((o) => o.customer_phone)).size,
  };
}

export function computeAnalytics(all: Order[], days: number): Analytics {
  const cur = lastDays(days);
  const prev = lastDays(days, days);
  const inRange = (o: Order, r: string[]) => { const d = dhakaDate(o.created_at); return d >= r[0] && d <= r[r.length - 1]; };
  const curOrders = all.filter((o) => inRange(o, cur));
  const prevOrders = all.filter((o) => inRange(o, prev));

  const map = new Map<string, DailyPoint>(cur.map((d) => [d, { date: d, orders: 0, paidOrders: 0, revenue: 0 }]));
  for (const o of curOrders) {
    const p = map.get(dhakaDate(o.created_at))!;
    p.orders++;
    if (o.payment_status === 'paid') { p.paidOrders++; p.revenue += Number(o.total); }
  }
  const statusCounts: Record<string, number> = {};
  for (const o of curOrders) statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;

  const prod = new Map<string, { name: string; units: number; revenue: number }>();
  for (const o of curOrders.filter((o) => o.payment_status === 'paid'))
    for (const i of o.order_items || []) {
      const e = prod.get(i.product_name) || { name: i.product_name, units: 0, revenue: 0 };
      e.units += i.quantity; e.revenue += Number(i.unit_price) * i.quantity;
      prod.set(i.product_name, e);
    }
  return {
    days,
    daily: [...map.values()],
    current: totals(curOrders),
    previous: totals(prevOrders),
    statusCounts,
    topProducts: [...prod.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
  };
}

export function computeCustomers(all: Order[], q?: string): Customer[] {
  const m = new Map<string, Customer>();
  for (const o of [...all].sort((a, b) => a.id - b.id)) {
    const c = m.get(o.customer_phone) || {
      phone: o.customer_phone, name: o.customer_name, email: o.customer_email,
      orders: 0, paidOrders: 0, spent: 0, firstOrder: o.created_at, lastOrder: o.created_at,
    };
    c.name = o.customer_name; c.email = o.customer_email || c.email; c.lastOrder = o.created_at;
    c.orders++;
    if (o.payment_status === 'paid') { c.paidOrders++; c.spent += Number(o.total); }
    m.set(o.customer_phone, c);
  }
  const t = q?.trim().toLowerCase();
  return [...m.values()]
    .filter((c) => !t || [c.phone, c.name, c.email || ''].some((v) => v.toLowerCase().includes(t)))
    .sort((a, b) => b.spent - a.spent || b.lastOrder.localeCompare(a.lastOrder));
}
