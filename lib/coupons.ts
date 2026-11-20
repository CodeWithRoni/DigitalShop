import 'server-only';
import { one, q } from './db/pg';

export type Coupon = {
  id: number; code: string; type: 'percent' | 'fixed'; value: number; min_order: number; max_discount: number | null;
  max_uses: number | null; used_count: number; starts_at: string | null; expires_at: string | null; is_active: boolean; created_at: string;
};

export const normalizeCode = (c: string) => c.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 30);
const round2 = (n: number) => Math.round(n * 100) / 100;

export function discountFor(c: Coupon, subtotal: number) {
  let d = c.type === 'percent' ? (subtotal * Number(c.value)) / 100 : Number(c.value);
  if (c.max_discount != null) d = Math.min(d, Number(c.max_discount));
  return round2(Math.max(0, Math.min(d, subtotal)));
}

/** Checks a code against the cart subtotal. Returns the discount or a customer-friendly error. */
export async function checkCoupon(code: string, subtotal: number): Promise<{ coupon: Coupon; discount: number } | { error: string }> {
  const c = await one<Coupon>('select * from coupons where code = $1', [normalizeCode(code)]);
  const now = Date.now();
  if (!c || !c.is_active) return { error: 'This coupon code is not valid.' };
  if (c.starts_at && new Date(c.starts_at).getTime() > now) return { error: 'This coupon is not active yet.' };
  if (c.expires_at && new Date(c.expires_at).getTime() < now) return { error: 'This coupon has expired.' };
  if (c.max_uses != null && c.used_count >= c.max_uses) return { error: 'This coupon has reached its usage limit.' };
  if (subtotal < Number(c.min_order)) return { error: `Add ৳${Number(c.min_order).toLocaleString('en-IN')} or more to use this coupon.` };
  const discount = discountFor(c, subtotal);
  if (discount <= 0) return { error: 'This coupon gives no discount on this order.' };
  return { coupon: c, discount };
}

/** Counted when the order is paid, not when it is placed. */
export async function markCouponUsed(code: string | null) {
  if (code) await q('update coupons set used_count = used_count + 1 where code = $1', [code]);
}

export async function listCoupons() {
  return q<Coupon>(`select c.*, (select coalesce(sum(o.discount),0)::float from orders o where o.coupon_code = c.code and o.payment_status = 'paid') as total_discount
                    from coupons c order by c.is_active desc, c.id desc`) as Promise<(Coupon & { total_discount: number })[]>;
}
