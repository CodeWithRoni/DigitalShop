import 'server-only';
import { one, q, tx } from './db/pg';

export type StockSummary = { package_id: number; product_id: number; product: string; package: string; available: number; delivered: number };
export type StockItem = { id: number; package_id: number; content: string; status: 'available' | 'delivered'; order_id: number | null; order_code: string | null; delivered_at: string | null; created_at: string };

/**
 * After payment: hand out stored keys/accounts for every item whose package has stock.
 * Atomic per order; FOR UPDATE SKIP LOCKED keeps two orders from ever getting the same key.
 */
export async function autoDeliver(orderId: number): Promise<{ delivered: boolean; packages: number[] }> {
  return tx(async (c) => {
    const items = await c.q<{ package_id: number | null; product_name: string; package_name: string; quantity: number }>(
      'select package_id, product_name, package_name, quantity from order_items where order_id = $1 order by id', [orderId]);
    const managed = new Set((await c.q<{ package_id: number }>(
      'select distinct package_id from stock_items where package_id = any($1::bigint[])',
      [items.map((i) => i.package_id).filter(Boolean)])).map((r) => r.package_id));
    if (!managed.size) return { delivered: false, packages: [] };

    const parts: string[] = [];
    let complete = true;
    const missing: string[] = [];
    for (const it of items) {
      if (!it.package_id || !managed.has(it.package_id)) { complete = false; continue; }
      const got = await c.q<{ content: string }>(
        `update stock_items set status = 'delivered', order_id = $1, delivered_at = now()
         where id in (select id from stock_items where package_id = $2 and status = 'available' order by id limit $3 for update skip locked)
         returning content`, [orderId, it.package_id, it.quantity]);
      if (got.length) parts.push(`${it.product_name} — ${it.package_name}:\n${got.map((g) => g.content).join('\n')}`);
      if (got.length < it.quantity) { complete = false; missing.push(`${it.product_name} ${it.package_name}: ${it.quantity - got.length} more needed`); }
    }
    if (!parts.length) {
      await c.q(`update orders set admin_note = concat_ws(E'\\n', admin_note, $2::text) where id = $1`, [orderId, `⚠ Out of stock — deliver manually (${missing.join('; ')})`]);
      return { delivered: false, packages: [...managed] };
    }
    await c.q(
      `update orders set delivery_message = concat_ws(E'\\n\\n', delivery_message, $2::text),
         auto_delivered = $3, status = case when $3 then 'delivered' else status end,
         admin_note = case when $4::text <> '' then concat_ws(E'\\n', admin_note, $4::text) else admin_note end
       where id = $1`,
      [orderId, parts.join('\n\n'), complete, missing.length ? `⚠ Partly auto-delivered — ${missing.join('; ')}` : '']);
    return { delivered: complete, packages: [...managed] };
  });
}

export async function stockSummary(): Promise<StockSummary[]> {
  return q<StockSummary>(`
    select k.id as package_id, p.id as product_id, p.name as product, k.name as package,
      count(s.*) filter (where s.status = 'available')::int as available,
      count(s.*) filter (where s.status = 'delivered')::int as delivered
    from packages k join products p on p.id = k.product_id left join stock_items s on s.package_id = k.id
    group by k.id, p.id order by p.sort_order, p.name, k.sort_order, k.id`);
}

export async function listStock(packageId: number, status: string, limit = 200) {
  const rows = await q<StockItem>(
    `select s.*, o.code as order_code from stock_items s left join orders o on o.id = s.order_id
     where s.package_id = $1 and ($2 = '' or s.status = $2) order by s.status, s.id desc limit $3`, [packageId, status, limit]);
  return rows.map((r) => ({ ...r, created_at: new Date(r.created_at).toISOString(), delivered_at: r.delivered_at ? new Date(r.delivered_at).toISOString() : null }));
}

/** Adds one stock item per non-empty line (or per block separated by a blank line). Skips exact duplicates. */
export async function addStock(packageId: number, raw: string, mode: 'line' | 'block') {
  const entries = (mode === 'block' ? raw.split(/\n\s*\n/) : raw.split('\n')).map((s) => s.trim()).filter(Boolean).slice(0, 2000);
  const unique = [...new Set(entries)];
  if (!unique.length) return { added: 0, skipped: 0 };
  const existing = new Set((await q<{ content: string }>('select content from stock_items where package_id = $1 and content = any($2::text[])', [packageId, unique])).map((r) => r.content));
  const toAdd = unique.filter((e) => !existing.has(e));
  if (toAdd.length) await q('insert into stock_items (package_id, content) select $1, unnest($2::text[])', [packageId, toAdd]);
  return { added: toAdd.length, skipped: entries.length - toAdd.length };
}

export async function deleteStockItem(id: number) {
  return one<{ package_id: number }>("delete from stock_items where id = $1 and status = 'available' returning package_id", [id]);
}

/** Map of package id -> available count, only for packages that use stock. */
export async function stockAvailability(packageIds: number[]) {
  if (!packageIds.length) return new Map<number, number>();
  const rows = await q<{ package_id: number; available: number }>(
    `select package_id, count(*) filter (where status = 'available')::int as available from stock_items
     where package_id = any($1::bigint[]) group by package_id`, [packageIds]);
  return new Map(rows.map((r) => [r.package_id, r.available]));
}
