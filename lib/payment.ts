import 'server-only';
import { db } from '@/lib/db';
import { validatePayment } from '@/lib/sslcommerz';
import { one } from '@/lib/db/pg';
import { markCouponUsed } from '@/lib/coupons';
import { autoDeliver } from '@/lib/stock';
import { notifyDelivered, notifyLowStock, notifyNewOrder } from '@/lib/notify';

export const gatewayConfigured = !!(process.env.SSLCZ_STORE_ID && process.env.SSLCZ_STORE_PASSWORD);
/** Demo payment page is allowed only when the gateway is NOT configured and not in production (unless forced). */
export const demoPaymentEnabled =
  !gatewayConfigured && (process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEMO_PAYMENT === 'true');

async function markPaid(tran_id: string, info: { val_id: string; bank_tran_id?: string | null; method: string }) {
  const order = await db.getOrderByTranId(tran_id);
  if (!order) return null;
  // Only the first caller (success redirect OR IPN) flips the order to paid and runs the side effects.
  const won = await one<{ id: number }>(
    `update orders set payment_status = 'paid', status = case when status = 'pending' then 'processing' else status end,
       val_id = $2, bank_tran_id = $3, payment_method = $4, paid_at = now()
     where id = $1 and payment_status <> 'paid' returning id`,
    [order.id, info.val_id, info.bank_tran_id || null, info.method]);
  if (won) {
    await markCouponUsed(order.coupon_code).catch((e) => console.error('coupon count failed', e));
    let packages: number[] = [];
    try { packages = (await autoDeliver(order.id)).packages; } catch (e) { console.error('auto-delivery failed', e); }
    await notifyNewOrder(order.id, 'paid');
    for (const p of packages) await notifyLowStock(p);
    const fresh = await db.getOrderById(order.id);
    if (fresh?.status === 'delivered') await notifyDelivered(order.id);
  }
  return order.code;
}

/** Verify with SSLCommerz server and mark paid. Idempotent (success redirect + IPN). */
export async function confirmPayment(val_id: string, tran_id: string) {
  const v = await validatePayment(val_id);
  if (!v || !['VALID', 'VALIDATED'].includes(v.status) || v.tran_id !== tran_id) {
    return { ok: false as const, code: (await db.getOrderByTranId(tran_id))?.code || null };
  }
  const order = await db.getOrderByTranId(tran_id);
  if (!order) return { ok: false as const, code: null };
  if (v.currency !== 'BDT' || Math.abs(Number(v.amount) - Number(order.total)) > 0.01) {
    await db.updateOrder(order.id, {
      payment_status: 'failed',
      admin_note: `Amount mismatch: paid ${v.amount} ${v.currency}, expected ${order.total}`,
    });
    return { ok: false as const, code: order.code };
  }
  const code = await markPaid(tran_id, { val_id: v.val_id, bank_tran_id: v.bank_tran_id, method: v.card_type || 'SSLCommerz' });
  return { ok: true as const, code };
}

export async function confirmDemoPayment(tran_id: string) {
  if (!demoPaymentEnabled) return null;
  return markPaid(tran_id, { val_id: 'DEMO', method: 'Demo (test)' });
}

export async function markFailed(tran_id: string) {
  const order = await db.getOrderByTranId(tran_id);
  if (!order) return null;
  if (order.payment_status !== 'paid') await db.updateOrder(order.id, { payment_status: 'failed' });
  return order.code;
}
