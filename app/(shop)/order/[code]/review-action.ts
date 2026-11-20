'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { one } from '@/lib/db/pg';
import { canView } from '@/lib/orderAccess';
import { notifyReview } from '@/lib/notify';

/** Customers can review products from their own delivered order (once per product). */
export async function submitReview(_: unknown, fd: FormData): Promise<{ ok?: boolean; error?: string }> {
  const code = String(fd.get('code') || '');
  const productId = Number(fd.get('product_id'));
  const rating = Math.round(Number(fd.get('rating')));
  const comment = String(fd.get('comment') || '').trim().slice(0, 600);
  if (!(await canView(code))) return { error: 'Please open your order from the Track page first.' };
  if (!(rating >= 1 && rating <= 5)) return { error: 'Choose 1 to 5 stars' };
  const order = await db.getOrderByCode(code);
  if (!order || order.status !== 'delivered') return { error: 'You can review after your order is delivered.' };
  const item = order.order_items?.find((i) => i.product_id === productId);
  if (!item) return { error: 'This product is not in your order.' };
  const r = await one<{ id: number }>(
    `insert into reviews (product_id, order_id, customer_name, rating, comment) values ($1,$2,$3,$4,$5)
     on conflict (order_id, product_id) do nothing returning id`,
    [productId, order.id, order.customer_name.split(' ')[0], rating, comment || null]);
  if (!r) return { error: 'You already reviewed this product.' };
  await notifyReview(item.product_name, rating, order.customer_name);
  revalidatePath(`/order/${code}`);
  return { ok: true };
}
