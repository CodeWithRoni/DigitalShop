import Link from 'next/link';
import { requireOwner } from '@/lib/admin';
import { listStock, stockSummary } from '@/lib/stock';
import { getSettings } from '@/lib/settings';
import { addStockAction, deleteStockAction } from '../../feature-actions';
import { EmptyState, Flash, PageHeader, Panel } from '@/components/admin/ui';
import Icon from '@/components/admin/Icon';
import ConfirmButton from '@/components/ConfirmButton';

const when = (d: string | null) => (d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dhaka' }) : '');

export default async function Stock(props: { searchParams: Promise<{ package?: string; status?: string; added?: string; skipped?: string }> }) {
  await requireOwner();
  const sp = await props.searchParams;
  const [summary, settings] = await Promise.all([stockSummary(), getSettings()]);
  const sel = summary.find((s) => String(s.package_id) === sp.package) || null;
  const status = sp.status === 'delivered' ? 'delivered' : 'available';
  const items = sel ? await listStock(sel.package_id, status) : [];
  const byProduct = new Map<string, typeof summary>();
  for (const s of summary) byProduct.set(s.product, [...(byProduct.get(s.product) || []), s]);

  return (
    <div>
      <PageHeader title="Stock & auto-delivery" subtitle="Store gift cards, license keys or account logins. After payment the customer gets one automatically." />
      <Flash ok={sp.added ? `${sp.added} item(s) added${Number(sp.skipped) ? ` · ${sp.skipped} duplicate(s) skipped` : ''}` : null} />

      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <Panel title="Packages" className="h-fit">
          <div className="max-h-[70vh] overflow-y-auto">
            {[...byProduct.entries()].map(([product, rows]) => (
              <div key={product} className="border-b border-white/[0.05] last:border-0">
                <div className="px-5 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">{product}</div>
                {rows.map((r) => {
                  const on = sel?.package_id === r.package_id;
                  const managed = r.available + r.delivered > 0;
                  const low = managed && r.available <= settings.low_stock_threshold;
                  return (
                    <Link key={r.package_id} href={`/admin/stock?package=${r.package_id}`}
                      className={`flex items-center justify-between gap-3 px-5 py-2.5 text-sm transition ${on ? 'bg-brand/15 text-white' : 'text-zinc-300 hover:bg-white/[0.04]'}`}>
                      <span className="truncate">{r.package}</span>
                      {managed
                        ? <span className={`badge ${r.available === 0 ? 'border-red-500/30 bg-red-500/10 text-red-300' : low ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300' : 'border-green-500/30 bg-green-500/10 text-green-300'}`}>{r.available} left</span>
                        : <span className="text-xs text-zinc-600">manual</span>}
                    </Link>
                  );
                })}
              </div>
            ))}
            {!summary.length && <p className="p-5 text-sm text-zinc-500">Add products first.</p>}
          </div>
        </Panel>

        {sel ? (
          <div className="space-y-6">
            <Panel title={<span>{sel.product} — {sel.package}</span>} action={<span className="text-xs text-zinc-500">{sel.available} available · {sel.delivered} delivered</span>}>
              <form action={addStockAction} className="space-y-3 p-5">
                <input type="hidden" name="package_id" value={sel.package_id} />
                <label className="label">Paste items</label>
                <textarea name="items" required rows={6} className="input font-mono text-xs" placeholder={'ABCD-EFGH-IJKL-MNOP\nQRST-UVWX-YZ12-3456\n…'} />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex gap-4 text-sm text-zinc-300">
                    <label className="flex items-center gap-2"><input type="radio" name="mode" value="line" defaultChecked className="accent-[#7B2FF7]" />One per line (codes, keys)</label>
                    <label className="flex items-center gap-2"><input type="radio" name="mode" value="block" className="accent-[#7B2FF7]" />Blank line between (multi-line logins)</label>
                  </div>
                  <button className="btn-primary"><Icon name="plus" size={16} />Add to stock</button>
                </div>
                <p className="text-xs text-zinc-500">Once a package has stock, paid orders for it are delivered instantly. When it runs out, orders wait for you (and you get a Telegram alert).</p>
              </form>
            </Panel>

            <Panel title={
              <div className="flex gap-1">
                {(['available', 'delivered'] as const).map((s) => (
                  <Link key={s} href={`/admin/stock?package=${sel.package_id}&status=${s}`} className={`rounded-lg px-3 py-1 text-xs font-semibold capitalize ${status === s ? 'bg-white text-zinc-900' : 'text-zinc-400 hover:text-white'}`}>{s}</Link>
                ))}
              </div>}>
              {items.length ? (
                <div className="divide-y divide-white/[0.05]">
                  {items.map((it) => (
                    <div key={it.id} className="flex items-start gap-3 px-5 py-3 text-sm">
                      <pre className="min-w-0 flex-1 whitespace-pre-wrap break-all font-mono text-xs text-zinc-300">{status === 'delivered' ? it.content : it.content.replace(/(?<=.{4}).(?=.{3})/gs, '•')}</pre>
                      {status === 'delivered'
                        ? <span className="shrink-0 text-xs text-zinc-500">{it.order_id ? <Link className="text-brand-light hover:underline" href={`/admin/orders/${it.order_id}`}>{it.order_code}</Link> : '—'} · {when(it.delivered_at)}</span>
                        : <form action={deleteStockAction}><input type="hidden" name="id" value={it.id} /><ConfirmButton message="Delete this item?" className="grid h-7 w-7 place-items-center rounded-lg text-zinc-500 hover:bg-red-500/10 hover:text-red-400"><Icon name="trash" size={14} /></ConfirmButton></form>}
                    </div>
                  ))}
                </div>
              ) : <EmptyState icon="key" title={status === 'available' ? 'No stock left' : 'Nothing delivered yet'} />}
            </Panel>
          </div>
        ) : (
          <Panel><EmptyState icon="key" title="Pick a package" text="Choose a package on the left to add or view its stock. Packages without stock are delivered by you manually." /></Panel>
        )}
      </div>
    </div>
  );
}
