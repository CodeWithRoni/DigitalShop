// PostgreSQL storage driver — works with Neon (https://neon.tech) or any Postgres.
// Set DATABASE_URL to your Neon connection string (use the "Pooled connection" one).
import { Pool, types } from 'pg';
import type { Category, Order, OrderItem, Package, Product } from '@/lib/types';
import type { DB, OrderFilter } from './types';

// Return NUMERIC as JS number (prices fit easily) and BIGINT ids as numbers.
types.setTypeParser(1700, (v) => Number(v));
types.setTypeParser(20, (v) => Number(v));

const g = globalThis as unknown as { __pgPool?: Pool };
function pool() {
  if (!g.__pgPool) {
    g.__pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return g.__pgPool;
}
async function q<T>(text: string, params: unknown[] = []): Promise<T[]> {
  const r = await pool().query(text, params);
  return r.rows as T[];
}
async function one<T>(text: string, params: unknown[] = []): Promise<T | null> {
  return (await q<T>(text, params))[0] ?? null;
}

const PRODUCT_SELECT = (pkgFilter: string) => `
  select p.*,
    coalesce((select json_agg(k order by k.sort_order, k.id) from packages k where k.product_id = p.id ${pkgFilter}), '[]') as packages,
    (select row_to_json(c) from categories c where c.id = p.category_id) as categories
  from products p`;
const ORDER_SELECT = `
  select o.*, coalesce((select json_agg(i order by i.id) from order_items i where i.order_id = o.id), '[]') as order_items
  from orders o`;

// json_agg returns numerics as JSON numbers already; normalise just in case.
const fixPkgs = (p: Product): Product => ({ ...p, packages: (p.packages || []).map((k) => ({ ...k, price: Number(k.price) })) });
const fixOrder = (o: Order): Order => ({
  ...o,
  created_at: new Date(o.created_at).toISOString(),
  updated_at: new Date(o.updated_at).toISOString(),
  paid_at: o.paid_at ? new Date(o.paid_at).toISOString() : null,
  order_items: (o.order_items || []).map((i: OrderItem) => ({ ...i, unit_price: Number(i.unit_price) })),
});

/** Build "col = $n" pairs from an object, only for allowed columns. */
function setClause(obj: Record<string, unknown>, allowed: string[], start = 1) {
  const keys = Object.keys(obj).filter((k) => allowed.includes(k) && obj[k] !== undefined);
  return { sql: keys.map((k, i) => `${k} = $${i + start}`).join(', '), values: keys.map((k) => obj[k]), keys };
}

const ORDER_COLS = ['customer_name', 'customer_phone', 'customer_email', 'note', 'total', 'status', 'payment_status', 'payment_method', 'tran_id', 'val_id', 'bank_tran_id', 'paid_at', 'delivery_message', 'admin_note'];
const PRODUCT_COLS = ['category_id', 'slug', 'name', 'short_description', 'description', 'image_url', 'delivery_label', 'delivery_hint', 'is_active', 'is_featured', 'sort_order'];
const PACKAGE_COLS = ['product_id', 'name', 'price', 'is_active', 'sort_order'];
const CATEGORY_COLS = ['slug', 'name', 'description', 'sort_order'];

async function upsert<T>(table: string, cols: string[], data: Record<string, unknown>): Promise<T> {
  const { id, ...rest } = data;
  try {
    if (id) {
      const s = setClause(rest, cols, 2);
      if (!s.keys.length) return (await one<T>(`select * from ${table} where id = $1`, [id]))!;
      const row = await one<T>(`update ${table} set ${s.sql} where id = $1 returning *`, [id, ...s.values]);
      if (!row) throw new Error('Not found');
      return row;
    }
    const keys = Object.keys(rest).filter((k) => cols.includes(k) && rest[k] !== undefined);
    const row = await one<T>(
      `insert into ${table} (${keys.join(', ')}) values (${keys.map((_, i) => `$${i + 1}`).join(', ')}) returning *`,
      keys.map((k) => rest[k]),
    );
    return row!;
  } catch (e) {
    if ((e as { code?: string }).code === '23505') throw new Error('Slug already used');
    throw e;
  }
}

export const postgresDb: DB = {
  async listCategories() {
    return q<Category>('select * from categories order by sort_order, id');
  },
  async listProducts(opts) {
    const all = !!opts?.includeInactive;
    const rows = await q<Product>(
      `${PRODUCT_SELECT(all ? '' : 'and k.is_active')} ${all ? '' : 'where p.is_active'} order by p.sort_order, p.id`,
    );
    return rows.map(fixPkgs);
  },
  async getProductBySlug(slug) {
    const p = await one<Product>(`${PRODUCT_SELECT('and k.is_active')} where p.slug = $1 and p.is_active`, [slug]);
    return p ? fixPkgs(p) : null;
  },
  async getProductById(id) {
    const p = await one<Product>(`${PRODUCT_SELECT('')} where p.id = $1`, [id]);
    return p ? fixPkgs(p) : null;
  },
  async getPackagesByIds(ids) {
    if (!ids.length) return [];
    return q<Package & { product: Product }>(
      `select k.*, row_to_json(p) as product from packages k join products p on p.id = k.product_id where k.id = any($1::bigint[])`,
      [ids],
    );
  },

  async createOrder(order, items) {
    // One statement = atomic: order and its items are saved together or not at all.
    const row = await one<Order>(
      `with o as (
         insert into orders (code, tran_id, customer_name, customer_phone, customer_email, note, total, status, payment_status)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *
       ), i as (
         insert into order_items (order_id, product_id, package_id, product_name, package_name, unit_price, quantity, delivery_info)
         select o.id, x.product_id, x.package_id, x.product_name, x.package_name, x.unit_price, x.quantity, x.delivery_info
         from o, jsonb_to_recordset($10::jsonb) as x(product_id bigint, package_id bigint, product_name text, package_name text, unit_price numeric, quantity int, delivery_info text)
         returning *
       )
       select o.*, (select json_agg(i order by i.id) from i) as order_items from o`,
      [order.code, order.tran_id, order.customer_name, order.customer_phone, order.customer_email, order.note,
        order.total, order.status, order.payment_status, JSON.stringify(items)],
    );
    return fixOrder(row!);
  },
  async getOrderByCode(code) {
    const o = await one<Order>(`${ORDER_SELECT} where o.code = $1`, [code]);
    return o ? fixOrder(o) : null;
  },
  async getOrderByTranId(t) {
    const o = await one<Order>(`${ORDER_SELECT} where o.tran_id = $1`, [t]);
    return o ? fixOrder(o) : null;
  },
  async getOrderById(id) {
    const o = await one<Order>(`${ORDER_SELECT} where o.id = $1`, [id]);
    return o ? fixOrder(o) : null;
  },
  async listOrders(f: OrderFilter = {}) {
    const where: string[] = [];
    const params: unknown[] = [];
    if (f.status) { params.push(f.status); where.push(`o.status = $${params.length}`); }
    if (f.payment) { params.push(f.payment); where.push(`o.payment_status = $${params.length}`); }
    const term = f.q?.trim();
    if (term) {
      params.push(`%${term.replace(/[\\%_]/g, (m) => '\\' + m)}%`);
      const n = params.length;
      where.push(`(o.code ilike $${n} or o.customer_name ilike $${n} or o.customer_phone ilike $${n} or o.customer_email ilike $${n} or o.tran_id ilike $${n})`);
    }
    params.push(Math.min(f.limit || 200, 500));
    const rows = await q<Order>(
      `${ORDER_SELECT} ${where.length ? 'where ' + where.join(' and ') : ''} order by o.id desc limit $${params.length}`,
      params,
    );
    return rows.map(fixOrder);
  },
  async updateOrder(id, patch) {
    const s = setClause(patch as Record<string, unknown>, ORDER_COLS, 2);
    if (!s.keys.length) return;
    await q(`update orders set ${s.sql} where id = $1`, [id, ...s.values]);
  },
  async stats() {
    const r = await one<Record<string, number>>(`
      select
        count(*)::int as "totalOrders",
        count(*) filter (where payment_status = 'paid')::int as "paidOrders",
        coalesce(sum(total) filter (where payment_status = 'paid'), 0) as revenue,
        count(*) filter (where status = 'pending')::int as pending,
        count(*) filter (where status = 'processing')::int as processing,
        count(*) filter (where created_at >= date_trunc('day', now() at time zone 'Asia/Dhaka') at time zone 'Asia/Dhaka')::int as "todayOrders",
        coalesce(sum(total) filter (where payment_status = 'paid' and paid_at >= date_trunc('day', now() at time zone 'Asia/Dhaka') at time zone 'Asia/Dhaka'), 0) as "todayRevenue"
      from orders`);
    return {
      totalOrders: r!.totalOrders, paidOrders: r!.paidOrders, revenue: Number(r!.revenue),
      pending: r!.pending, processing: r!.processing, todayOrders: r!.todayOrders, todayRevenue: Number(r!.todayRevenue),
    };
  },

  async saveCategory(c) {
    return upsert<Category>('categories', CATEGORY_COLS, c as Record<string, unknown>);
  },
  async deleteCategory(id) {
    await q('delete from categories where id = $1', [id]);
  },
  async saveProduct(p) {
    const { packages: _a, categories: _b, ...rest } = p;
    return upsert<Product>('products', PRODUCT_COLS, rest as Record<string, unknown>);
  },
  async deleteProduct(id) {
    await q('delete from products where id = $1', [id]);
  },
  async savePackage(k) {
    const row = await upsert<Package>('packages', PACKAGE_COLS, k as Record<string, unknown>);
    return { ...row, price: Number(row.price) };
  },
  async deletePackage(id) {
    await q('delete from packages where id = $1', [id]);
  },
};
