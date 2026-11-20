// PostgreSQL storage driver — works with Neon (https://neon.tech) or any Postgres.
// Set DATABASE_URL to your Neon connection string (use the "Pooled connection" one).
import { q, one } from './pg';
import type { Category, Order, OrderItem, Package, Product } from '@/lib/types';
import type { Analytics, Customer, DB, OrderFilter, PeriodTotals } from './types';
import { lastDays } from './analytics';

const PRODUCT_SELECT = (pkgFilter: string) => `
  select p.*,
    coalesce((select json_agg(k order by k.sort_order, k.id) from (
      select k.*,
        exists(select 1 from stock_items s where s.package_id = k.id) as stock_managed,
        (select count(*)::int from stock_items s where s.package_id = k.id and s.status = 'available') as stock_available
      from packages k where k.product_id = p.id ${pkgFilter}) k), '[]') as packages,
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

const ORDER_COLS = ['customer_name', 'customer_phone', 'customer_email', 'note', 'total', 'status', 'payment_status', 'payment_method', 'tran_id', 'val_id', 'bank_tran_id', 'paid_at', 'delivery_message', 'admin_note', 'auto_delivered'];
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
         insert into orders (code, tran_id, customer_name, customer_phone, customer_email, note, total, status, payment_status, subtotal, discount, coupon_code)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$11,$12,$13) returning *
       ), i as (
         insert into order_items (order_id, product_id, package_id, product_name, package_name, unit_price, quantity, delivery_info)
         select o.id, x.product_id, x.package_id, x.product_name, x.package_name, x.unit_price, x.quantity, x.delivery_info
         from o, jsonb_to_recordset($10::jsonb) as x(product_id bigint, package_id bigint, product_name text, package_name text, unit_price numeric, quantity int, delivery_info text)
         returning *
       )
       select o.*, (select json_agg(i order by i.id) from i) as order_items from o`,
      [order.code, order.tran_id, order.customer_name, order.customer_phone, order.customer_email, order.note,
        order.total, order.status, order.payment_status, JSON.stringify(items), order.subtotal, order.discount || 0, order.coupon_code],
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
    return (await postgresDb.listOrdersPage(f)).orders;
  },
  async listOrdersPage(f: OrderFilter = {}) {
    const where: string[] = [];
    const params: unknown[] = [];
    const add = (v: unknown) => { params.push(v); return `$${params.length}`; };
    if (f.status) where.push(`o.status = ${add(f.status)}`);
    if (f.payment) where.push(`o.payment_status = ${add(f.payment)}`);
    if (f.phone) where.push(`o.customer_phone = ${add(f.phone)}`);
    if (f.from) where.push(`(o.created_at at time zone 'Asia/Dhaka')::date >= ${add(f.from)}::date`);
    if (f.to) where.push(`(o.created_at at time zone 'Asia/Dhaka')::date <= ${add(f.to)}::date`);
    const term = f.q?.trim();
    if (term) {
      const n = add(`%${term.replace(/[\\%_]/g, (m) => '\\' + m)}%`);
      where.push(`(o.code ilike ${n} or o.customer_name ilike ${n} or o.customer_phone ilike ${n} or o.customer_email ilike ${n} or o.tran_id ilike ${n})`);
    }
    const w = where.length ? 'where ' + where.join(' and ') : '';
    const countParams = [...params];
    const limit = add(Math.min(f.limit || 200, 500));
    const offset = add(Math.max(f.offset || 0, 0));
    const [rows, cnt] = await Promise.all([
      q<Order>(`${ORDER_SELECT} ${w} order by o.id desc limit ${limit} offset ${offset}`, params),
      one<{ n: number }>(`select count(*)::int as n from orders o ${w}`, countParams),
    ]);
    return { orders: rows.map(fixOrder), total: cnt?.n || 0 };
  },
  async countByStatus() {
    const rows = await q<{ status: string; n: number }>('select status, count(*)::int as n from orders group by status');
    return Object.fromEntries(rows.map((r) => [r.status, r.n]));
  },
  async analytics(days) {
    const cur = lastDays(days);
    const prev = lastDays(days, days);
    const D = `(created_at at time zone 'Asia/Dhaka')::date`;
    const totalsSql = `select count(*)::int as orders,
        count(*) filter (where payment_status = 'paid')::int as "paidOrders",
        coalesce(sum(total) filter (where payment_status = 'paid'), 0)::float as revenue,
        count(distinct customer_phone) filter (where payment_status = 'paid')::int as customers
      from orders where ${D} between $1::date and $2::date`;
    const fix = (t: Omit<PeriodTotals, 'aov'> | null): PeriodTotals => {
      const v = t || { orders: 0, paidOrders: 0, revenue: 0, customers: 0 };
      return { ...v, revenue: Number(v.revenue), aov: v.paidOrders ? Number(v.revenue) / v.paidOrders : 0 };
    };
    const [daily, c, p, st, top] = await Promise.all([
      q<{ date: string; orders: number; paidOrders: number; revenue: number }>(
        `select to_char(${D}, 'YYYY-MM-DD') as date, count(*)::int as orders,
           count(*) filter (where payment_status = 'paid')::int as "paidOrders",
           coalesce(sum(total) filter (where payment_status = 'paid'), 0)::float as revenue
         from orders where ${D} between $1::date and $2::date group by 1`, [cur[0], cur[cur.length - 1]]),
      one<Omit<PeriodTotals, 'aov'>>(totalsSql, [cur[0], cur[cur.length - 1]]),
      one<Omit<PeriodTotals, 'aov'>>(totalsSql, [prev[0], prev[prev.length - 1]]),
      q<{ status: string; n: number }>(`select status, count(*)::int as n from orders where ${D} between $1::date and $2::date group by status`, [cur[0], cur[cur.length - 1]]),
      q<{ name: string; units: number; revenue: number }>(
        `select i.product_name as name, sum(i.quantity)::int as units, sum(i.unit_price * i.quantity)::float as revenue
         from order_items i join orders o on o.id = i.order_id
         where o.payment_status = 'paid' and (o.created_at at time zone 'Asia/Dhaka')::date between $1::date and $2::date
         group by i.product_name order by revenue desc limit 5`, [cur[0], cur[cur.length - 1]]),
    ]);
    const byDate = new Map(daily.map((d) => [d.date, d]));
    const result: Analytics = {
      days,
      daily: cur.map((d) => {
        const r = byDate.get(d);
        return { date: d, orders: r?.orders || 0, paidOrders: r?.paidOrders || 0, revenue: Number(r?.revenue || 0) };
      }),
      current: fix(c), previous: fix(p),
      statusCounts: Object.fromEntries(st.map((r) => [r.status, r.n])),
      topProducts: top.map((t) => ({ ...t, revenue: Number(t.revenue) })),
    };
    return result;
  },
  async listCustomers(term) {
    const params: unknown[] = [];
    let having = '';
    if (term?.trim()) {
      params.push(`%${term.trim().replace(/[\\%_]/g, (m) => '\\' + m)}%`);
      having = `having customer_phone ilike $1 or max(customer_name) ilike $1 or max(customer_email) ilike $1`;
    }
    const rows = await q<Customer>(
      `select customer_phone as phone,
         (array_agg(customer_name order by id desc))[1] as name,
         (array_agg(customer_email order by id desc) filter (where customer_email is not null))[1] as email,
         count(*)::int as orders,
         count(*) filter (where payment_status = 'paid')::int as "paidOrders",
         coalesce(sum(total) filter (where payment_status = 'paid'), 0)::float as spent,
         min(created_at) as "firstOrder", max(created_at) as "lastOrder"
       from orders group by customer_phone ${having}
       order by spent desc, "lastOrder" desc limit 500`, params);
    return rows.map((r) => ({
      ...r, spent: Number(r.spent),
      firstOrder: new Date(r.firstOrder).toISOString(), lastOrder: new Date(r.lastOrder).toISOString(),
    }));
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
