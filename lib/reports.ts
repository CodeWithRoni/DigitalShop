import 'server-only';
import { one, q } from './db/pg';

export type MonthReport = {
  month: string; from: string; to: string;
  orders: number; paidOrders: number; gross: number; discounts: number; refunds: number; net: number; aov: number; customers: number; newCustomers: number;
  daily: { date: string; orders: number; revenue: number }[];
  products: { name: string; units: number; revenue: number }[];
  methods: { method: string; orders: number; revenue: number }[];
  coupons: { code: string; uses: number; discount: number }[];
  refundRows: { code: string; amount: number; reason: string | null; created_at: string }[];
};

/** month = 'YYYY-MM' (Asia/Dhaka). Revenue = paid orders (after discount). Net = revenue − refunds. */
export async function monthReport(month: string): Promise<MonthReport> {
  const [y, m] = month.split('-').map(Number);
  const from = `${month}-01`;
  const to = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  const D = `(o.created_at at time zone 'Asia/Dhaka')::date`;
  const range = `${D} between $1::date and $2::date`;
  const P = [from, to];
  const [t, daily, products, methods, coupons, refundRows, ref, newC] = await Promise.all([
    one<{ orders: number; paid: number; gross: number; discounts: number; customers: number }>(
      `select count(*)::int as orders, count(*) filter (where o.payment_status in ('paid','refunded'))::int as paid,
         coalesce(sum(o.total) filter (where o.payment_status in ('paid','refunded')),0)::float as gross,
         coalesce(sum(o.discount) filter (where o.payment_status in ('paid','refunded')),0)::float as discounts,
         count(distinct o.customer_phone) filter (where o.payment_status in ('paid','refunded'))::int as customers
       from orders o where ${range}`, P),
    q<{ date: string; orders: number; revenue: number }>(
      `select to_char(${D}, 'YYYY-MM-DD') as date, count(*) filter (where o.payment_status in ('paid','refunded'))::int as orders,
         coalesce(sum(o.total) filter (where o.payment_status in ('paid','refunded')),0)::float as revenue
       from orders o where ${range} group by 1 order by 1`, P),
    q<{ name: string; units: number; revenue: number }>(
      `select i.product_name as name, sum(i.quantity)::int as units, sum(i.unit_price * i.quantity)::float as revenue
       from order_items i join orders o on o.id = i.order_id where ${range} and o.payment_status in ('paid','refunded')
       group by 1 order by revenue desc`, P),
    q<{ method: string; orders: number; revenue: number }>(
      `select coalesce(o.payment_method, 'Other') as method, count(*)::int as orders, sum(o.total)::float as revenue
       from orders o where ${range} and o.payment_status in ('paid','refunded') group by 1 order by revenue desc`, P),
    q<{ code: string; uses: number; discount: number }>(
      `select o.coupon_code as code, count(*)::int as uses, sum(o.discount)::float as discount
       from orders o where ${range} and o.coupon_code is not null and o.payment_status in ('paid','refunded') group by 1 order by uses desc`, P),
    q<{ code: string; amount: number; reason: string | null; created_at: string }>(
      `select o.code, r.amount, r.reason, r.created_at from refunds r join orders o on o.id = r.order_id
       where (r.created_at at time zone 'Asia/Dhaka')::date between $1::date and $2::date order by r.id`, P),
    one<{ total: number }>(`select coalesce(sum(amount),0)::float as total from refunds r where (r.created_at at time zone 'Asia/Dhaka')::date between $1::date and $2::date`, P),
    one<{ n: number }>(
      `select count(*)::int as n from (select customer_phone, min(created_at) as first from orders where payment_status in ('paid','refunded') group by 1) f
       where (f.first at time zone 'Asia/Dhaka')::date between $1::date and $2::date`, P),
  ]);
  const byDay = new Map(daily.map((d) => [d.date, d]));
  const days: MonthReport['daily'] = [];
  for (let d = new Date(from + 'T00:00:00Z'); d.toISOString().slice(0, 10) <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    const k = d.toISOString().slice(0, 10);
    days.push(byDay.get(k) || { date: k, orders: 0, revenue: 0 });
  }
  const gross = t?.gross || 0; const refunds = ref?.total || 0;
  return {
    month, from, to, orders: t?.orders || 0, paidOrders: t?.paid || 0, gross, discounts: t?.discounts || 0, refunds,
    net: gross - refunds, aov: t?.paid ? gross / t.paid : 0, customers: t?.customers || 0, newCustomers: newC?.n || 0,
    daily: days, products, methods, coupons,
    refundRows: refundRows.map((r) => ({ ...r, created_at: new Date(r.created_at).toISOString() })),
  };
}

export async function availableMonths() {
  const rows = await q<{ m: string }>(`select distinct to_char((created_at at time zone 'Asia/Dhaka'), 'YYYY-MM') as m from orders order by 1 desc limit 36`);
  return rows.map((r) => r.m);
}
