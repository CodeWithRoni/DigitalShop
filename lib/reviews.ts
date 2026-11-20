import 'server-only';
import { q } from './db/pg';

export type Review = { id: number; product_id: number; order_id: number | null; customer_name: string; rating: number; comment: string | null; status: 'pending' | 'approved' | 'hidden'; created_at: string; product_name?: string; order_code?: string };

export async function productRating(productId: number) {
  const [r] = await q<{ avg: number | null; n: number }>("select avg(rating)::float as avg, count(*)::int as n from reviews where product_id = $1 and status = 'approved'", [productId]);
  return { avg: r?.avg ? Math.round(r.avg * 10) / 10 : 0, count: r?.n || 0 };
}
export async function approvedReviews(productId: number, limit = 20) {
  const rows = await q<Review>("select * from reviews where product_id = $1 and status = 'approved' order by id desc limit $2", [productId, limit]);
  return rows.map((r) => ({ ...r, created_at: new Date(r.created_at).toISOString() }));
}
export async function ratingsByProduct() {
  const rows = await q<{ product_id: number; avg: number; n: number }>("select product_id, avg(rating)::float as avg, count(*)::int as n from reviews where status = 'approved' group by product_id");
  return new Map(rows.map((r) => [r.product_id, { avg: Math.round(r.avg * 10) / 10, count: r.n }]));
}
export async function listReviews(status = '') {
  const rows = await q<Review>(
    `select r.*, p.name as product_name, o.code as order_code from reviews r join products p on p.id = r.product_id left join orders o on o.id = r.order_id
     where ($1 = '' or r.status = $1) order by case r.status when 'pending' then 0 else 1 end, r.id desc limit 300`, [status]);
  return rows.map((r) => ({ ...r, created_at: new Date(r.created_at).toISOString() }));
}
/** Products in a delivered order that the customer has not reviewed yet. */
export async function reviewableItems(orderId: number) {
  return q<{ product_id: number; product_name: string; rating: number | null; status: string | null }>(
    `select distinct on (i.product_id) i.product_id, i.product_name, r.rating, r.status
     from order_items i join orders o on o.id = i.order_id
     left join reviews r on r.order_id = o.id and r.product_id = i.product_id
     where o.id = $1 and o.status = 'delivered' and i.product_id is not null order by i.product_id`, [orderId]);
}
