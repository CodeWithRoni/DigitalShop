import 'server-only';
import { q, tx } from './db/pg';

export type Refund = { id: number; order_id: number; amount: number; reason: string | null; method: string | null; created_by: string | null; created_at: string; order_code?: string; customer_name?: string };

export async function listRefunds(orderId?: number) {
  const rows = await q<Refund>(
    `select r.*, o.code as order_code, o.customer_name from refunds r join orders o on o.id = r.order_id
     ${orderId ? 'where r.order_id = $1' : ''} order by r.id desc limit 500`, orderId ? [orderId] : []);
  return rows.map((r) => ({ ...r, created_at: new Date(r.created_at).toISOString() }));
}

/** Records a refund. A full refund also marks the order refunded. */
export async function recordRefund(orderId: number, amount: number, reason: string, method: string, by: string) {
  return tx(async (c) => {
    const [o] = await c.q<{ total: number; refunded: number; code: string }>(
      `select o.total, coalesce((select sum(amount) from refunds where order_id = o.id), 0)::float as refunded, o.code
       from orders o where o.id = $1 for update`, [orderId]);
    if (!o) throw new Error('Order not found');
    const left = Math.round((Number(o.total) - Number(o.refunded)) * 100) / 100;
    if (amount <= 0) throw new Error('Enter an amount above 0');
    if (amount > left + 0.001) throw new Error(`You can refund at most ৳${left.toLocaleString('en-IN')} on this order`);
    await c.q('insert into refunds (order_id, amount, reason, method, created_by) values ($1,$2,$3,$4,$5)', [orderId, amount, reason || null, method || null, by]);
    const full = amount >= left - 0.001;
    if (full) await c.q("update orders set status = 'refunded', payment_status = 'refunded' where id = $1", [orderId]);
    return { code: o.code, full };
  });
}
