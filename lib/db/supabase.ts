// Supabase storage driver. Server-only: uses the service-role key.
import { createClient } from '@supabase/supabase-js';
import type { Order, Package, Product } from '@/lib/types';
import type { DB, OrderFilter } from './types';

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function check(r: { data: unknown; error: { message: string } | null }): any {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}
const num = <T extends { price?: unknown; total?: unknown; unit_price?: unknown }>(o: T): T => ({
  ...o,
  ...(o.price !== undefined ? { price: Number(o.price) } : {}),
  ...(o.total !== undefined ? { total: Number(o.total) } : {}),
  ...(o.unit_price !== undefined ? { unit_price: Number(o.unit_price) } : {}),
});
function normProduct(p: Product, includeInactive = false): Product {
  return {
    ...p,
    packages: (p.packages || []).filter((k) => includeInactive || k.is_active).map(num)
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
  };
}
function normOrder(o: Order): Order {
  return { ...num(o), order_items: (o.order_items || []).map(num) };
}
const PRODUCT_SEL = '*, packages(*), categories(*)';
const ORDER_SEL = '*, order_items(*)';

export const supabaseDb: DB = {
  async listCategories() {
    return check(await sb().from('categories').select('*').order('sort_order').order('id'));
  },
  async listProducts(opts) {
    let q = sb().from('products').select(PRODUCT_SEL).order('sort_order').order('id');
    if (!opts?.includeInactive) q = q.eq('is_active', true);
    return (check(await q) as Product[]).map((p) => normProduct(p, !!opts?.includeInactive));
  },
  async getProductBySlug(slug) {
    const p = check(await sb().from('products').select(PRODUCT_SEL).eq('slug', slug).eq('is_active', true).maybeSingle()) as Product | null;
    return p ? normProduct(p) : null;
  },
  async getProductById(id) {
    const p = check(await sb().from('products').select(PRODUCT_SEL).eq('id', id).maybeSingle()) as Product | null;
    return p ? normProduct(p, true) : null;
  },
  async getPackagesByIds(ids) {
    if (!ids.length) return [];
    const rows = check(await sb().from('packages').select('*, product:products(*)').in('id', ids)) as (Package & { product: Product })[];
    return rows.map(num);
  },

  async createOrder(order, items) {
    const db = sb();
    const o = check(await db.from('orders').insert(order).select('*').single()) as Order;
    const its = check(await db.from('order_items').insert(items.map((i) => ({ ...i, order_id: o.id }))).select('*'));
    return normOrder({ ...o, order_items: its as Order['order_items'] });
  },
  async getOrderByCode(code) {
    const o = check(await sb().from('orders').select(ORDER_SEL).eq('code', code).maybeSingle()) as Order | null;
    return o ? normOrder(o) : null;
  },
  async getOrderByTranId(t) {
    const o = check(await sb().from('orders').select(ORDER_SEL).eq('tran_id', t).maybeSingle()) as Order | null;
    return o ? normOrder(o) : null;
  },
  async getOrderById(id) {
    const o = check(await sb().from('orders').select(ORDER_SEL).eq('id', id).maybeSingle()) as Order | null;
    return o ? normOrder(o) : null;
  },
  async listOrders(f: OrderFilter = {}) {
    let q = sb().from('orders').select(ORDER_SEL).order('id', { ascending: false }).limit(f.limit || 200);
    if (f.status) q = q.eq('status', f.status);
    if (f.payment) q = q.eq('payment_status', f.payment);
    const term = f.q?.trim().replace(/[%,()]/g, '');
    if (term) q = q.or(['code', 'customer_name', 'customer_phone', 'customer_email', 'tran_id'].map((c) => `${c}.ilike.%${term}%`).join(','));
    return (check(await q) as Order[]).map(normOrder);
  },
  async updateOrder(id, patch) {
    const { order_items: _i, id: _id, ...rest } = patch;
    check(await sb().from('orders').update(rest).eq('id', id));
  },
  async stats() {
    const rows = check(await sb().from('orders').select('status, payment_status, total, created_at, paid_at')) as Order[];
    const today = new Date().toISOString().slice(0, 10);
    const paid = rows.filter((o) => o.payment_status === 'paid');
    return {
      totalOrders: rows.length,
      paidOrders: paid.length,
      revenue: paid.reduce((a, o) => a + Number(o.total), 0),
      pending: rows.filter((o) => o.status === 'pending').length,
      processing: rows.filter((o) => o.status === 'processing').length,
      todayOrders: rows.filter((o) => o.created_at.startsWith(today)).length,
      todayRevenue: paid.filter((o) => (o.paid_at || '').startsWith(today)).reduce((a, o) => a + Number(o.total), 0),
    };
  },

  async saveCategory(c) {
    const { id, ...rest } = c;
    const q = id ? sb().from('categories').update(rest).eq('id', id) : sb().from('categories').insert(rest);
    return check(await q.select('*').single());
  },
  async deleteCategory(id) { check(await sb().from('categories').delete().eq('id', id)); },
  async saveProduct(p) {
    const { id, packages: _a, categories: _b, ...rest } = p;
    const q = id ? sb().from('products').update(rest).eq('id', id) : sb().from('products').insert(rest);
    return check(await q.select('*').single());
  },
  async deleteProduct(id) { check(await sb().from('products').delete().eq('id', id)); },
  async savePackage(k) {
    const { id, ...rest } = k;
    const q = id ? sb().from('packages').update(rest).eq('id', id) : sb().from('packages').insert(rest);
    return num(check(await q.select('*').single()) as Package);
  },
  async deletePackage(id) { check(await sb().from('packages').delete().eq('id', id)); },
};
