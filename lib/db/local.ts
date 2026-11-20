// Local JSON-file storage — for development / demo without a database.
// NOTE: does not work on serverless hosts with read-only disks (e.g. Vercel). Use Neon (DATABASE_URL) there.
import { promises as fs } from 'fs';
import path from 'path';
import seed from '@/data/seed.json';
import type { Category, Order, OrderItem, Package, Product } from '@/lib/types';
import type { DB, NewOrder, NewOrderItem, OrderFilter } from './types';

type Store = {
  categories: Category[]; products: Product[]; packages: Package[];
  orders: Order[]; order_items: OrderItem[]; seq: Record<string, number>;
};

const FILE = path.join(process.cwd(), 'data', 'local-db.json');
let cache: Store | null = null;
let chain: Promise<unknown> = Promise.resolve();

async function load(): Promise<Store> {
  if (cache) return cache;
  try {
    cache = JSON.parse(await fs.readFile(FILE, 'utf8')) as Store;
  } catch {
    const s = seed as unknown as Pick<Store, 'categories' | 'products' | 'packages'>;
    cache = {
      categories: s.categories, products: s.products, packages: s.packages,
      orders: [], order_items: [],
      seq: { categories: s.categories.length, products: s.products.length, packages: s.packages.length, orders: 0, order_items: 0 },
    };
    await save(cache);
  }
  return cache;
}
async function save(s: Store) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(s, null, 1));
}
/** Serialize writes so concurrent requests don't clobber each other. */
function mutate<T>(fn: (s: Store) => T): Promise<T> {
  const run = chain.then(async () => {
    const s = await load();
    const r = fn(s);
    await save(s);
    return r;
  });
  chain = run.catch(() => {});
  return run;
}
const next = (s: Store, k: string) => (s.seq[k] = (s.seq[k] || 0) + 1);
const now = () => new Date().toISOString();
const bySort = <T extends { sort_order: number; id: number }>(a: T, b: T) => a.sort_order - b.sort_order || a.id - b.id;
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

function withPackages(s: Store, p: Product, includeInactive: boolean): Product {
  return {
    ...p,
    packages: s.packages.filter((k) => k.product_id === p.id && (includeInactive || k.is_active)).sort(bySort),
    categories: s.categories.find((c) => c.id === p.category_id) || null,
  };
}
function withItems(s: Store, o: Order): Order {
  return { ...o, order_items: s.order_items.filter((i) => i.order_id === o.id) };
}

export const localDb: DB = {
  async listCategories() { const s = await load(); return clone([...s.categories].sort(bySort)); },
  async listProducts(opts) {
    const s = await load(); const all = !!opts?.includeInactive;
    return clone(s.products.filter((p) => all || p.is_active).sort(bySort).map((p) => withPackages(s, p, all)));
  },
  async getProductBySlug(slug) {
    const s = await load(); const p = s.products.find((x) => x.slug === slug && x.is_active);
    return p ? clone(withPackages(s, p, false)) : null;
  },
  async getProductById(id) {
    const s = await load(); const p = s.products.find((x) => x.id === id);
    return p ? clone(withPackages(s, p, true)) : null;
  },
  async getPackagesByIds(ids) {
    const s = await load();
    return clone(s.packages.filter((k) => ids.includes(k.id)).map((k) => ({ ...k, product: s.products.find((p) => p.id === k.product_id)! })).filter((k) => k.product));
  },

  async createOrder(order: NewOrder, items: NewOrderItem[]) {
    return mutate((s) => {
      const o: Order = {
        ...order, id: next(s, 'orders'), created_at: now(), updated_at: now(),
        val_id: null, bank_tran_id: null, paid_at: null, delivery_message: null, admin_note: null, payment_method: null,
      };
      s.orders.push(o);
      for (const it of items) s.order_items.push({ ...it, id: next(s, 'order_items'), order_id: o.id });
      return clone(withItems(s, o));
    });
  },
  async getOrderByCode(code) { const s = await load(); const o = s.orders.find((x) => x.code === code); return o ? clone(withItems(s, o)) : null; },
  async getOrderByTranId(t) { const s = await load(); const o = s.orders.find((x) => x.tran_id === t); return o ? clone(withItems(s, o)) : null; },
  async getOrderById(id) { const s = await load(); const o = s.orders.find((x) => x.id === id); return o ? clone(withItems(s, o)) : null; },
  async listOrders(f: OrderFilter = {}) {
    const s = await load(); const q = f.q?.trim().toLowerCase();
    return clone(s.orders
      .filter((o) => !f.status || o.status === f.status)
      .filter((o) => !f.payment || o.payment_status === f.payment)
      .filter((o) => !q || [o.code, o.customer_name, o.customer_phone, o.customer_email || '', o.tran_id || ''].some((v) => v.toLowerCase().includes(q)))
      .sort((a, b) => b.id - a.id)
      .slice(0, f.limit || 200)
      .map((o) => withItems(s, o)));
  },
  async updateOrder(id, patch) {
    await mutate((s) => { const o = s.orders.find((x) => x.id === id); if (o) Object.assign(o, patch, { id, updated_at: now() }); });
  },
  async stats() {
    const s = await load();
    const today = new Date().toISOString().slice(0, 10);
    const paid = s.orders.filter((o) => o.payment_status === 'paid');
    return {
      totalOrders: s.orders.length,
      paidOrders: paid.length,
      revenue: paid.reduce((a, o) => a + Number(o.total), 0),
      pending: s.orders.filter((o) => o.status === 'pending').length,
      processing: s.orders.filter((o) => o.status === 'processing').length,
      todayOrders: s.orders.filter((o) => o.created_at.startsWith(today)).length,
      todayRevenue: paid.filter((o) => (o.paid_at || '').startsWith(today)).reduce((a, o) => a + Number(o.total), 0),
    };
  },

  async saveCategory(c) {
    return mutate((s) => {
      if (s.categories.some((x) => x.slug === c.slug && x.id !== c.id)) throw new Error('Slug already used');
      const ex = c.id ? s.categories.find((x) => x.id === c.id) : null;
      if (ex) { Object.assign(ex, c); return clone(ex); }
      const n: Category = { id: next(s, 'categories'), slug: c.slug, name: c.name, description: c.description ?? null, sort_order: c.sort_order ?? 0 };
      s.categories.push(n); return clone(n);
    });
  },
  async deleteCategory(id) {
    await mutate((s) => { s.categories = s.categories.filter((x) => x.id !== id); s.products.forEach((p) => { if (p.category_id === id) p.category_id = null; }); });
  },
  async saveProduct(p) {
    return mutate((s) => {
      if (s.products.some((x) => x.slug === p.slug && x.id !== p.id)) throw new Error('Slug already used');
      const { packages: _a, categories: _b, ...rest } = p;
      const ex = p.id ? s.products.find((x) => x.id === p.id) : null;
      if (ex) { Object.assign(ex, rest); return clone(ex); }
      const n: Product = {
        id: next(s, 'products'), category_id: null, short_description: null, description: null, image_url: null,
        delivery_label: 'Email / Account info', delivery_hint: null, is_active: true, is_featured: false, sort_order: 0, ...rest,
      } as Product;
      s.products.push(n); return clone(n);
    });
  },
  async deleteProduct(id) {
    await mutate((s) => { s.products = s.products.filter((x) => x.id !== id); s.packages = s.packages.filter((k) => k.product_id !== id); });
  },
  async savePackage(k) {
    return mutate((s) => {
      const ex = k.id ? s.packages.find((x) => x.id === k.id) : null;
      if (ex) { Object.assign(ex, k); return clone(ex); }
      const n: Package = { id: next(s, 'packages'), is_active: true, sort_order: 0, ...k } as Package;
      s.packages.push(n); return clone(n);
    });
  },
  async deletePackage(id) { await mutate((s) => { s.packages = s.packages.filter((x) => x.id !== id); }); },
};
