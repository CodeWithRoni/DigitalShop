import { requireOwner } from '@/lib/admin';
import { availableMonths, monthReport } from '@/lib/reports';
import { getSettings } from '@/lib/settings';
import { EmptyState, PageHeader, Panel } from '@/components/admin/ui';
import Icon from '@/components/admin/Icon';
import PrintButton from '@/components/admin/PrintButton';
import { taka } from '@/lib/utils';

const thisMonth = () => new Date(Date.now() + 6 * 3600e3).toISOString().slice(0, 7);
const label = (m: string) => new Date(m + '-01T00:00:00Z').toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export default async function Reports(props: { searchParams: Promise<{ month?: string }> }) {
  await requireOwner();
  const sp = await props.searchParams;
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month || '') ? sp.month! : thisMonth();
  const [r, months, s] = await Promise.all([monthReport(month), availableMonths(), getSettings()]);
  const opts = [...new Set([thisMonth(), ...months, month])].sort().reverse();
  const max = Math.max(...r.daily.map((d) => d.revenue), 1);
  const cards: [string, string][] = [
    ['Revenue', taka(r.gross)], ['Net after refunds', taka(r.net)], ['Paid orders', `${r.paidOrders} / ${r.orders}`], ['Average order', taka(Math.round(r.aov))],
    ['Discounts given', taka(r.discounts)], ['Refunds', taka(r.refunds)], ['Paying customers', String(r.customers)], ['New customers', String(r.newCustomers)],
  ];

  return (
    <div className="print-area">
      <PageHeader title={`Report · ${label(month)}`} subtitle={`${s.shop_name} · ${r.from} to ${r.to} (Dhaka time)`}>
        <form className="no-print flex gap-2">
          <select name="month" defaultValue={month} className="input !w-48">{opts.map((m) => <option key={m} value={m}>{label(m)}</option>)}</select>
          <button className="btn-ghost">Show</button>
        </form>
        <a href={`/admin/reports/export?month=${month}`} className="btn-ghost no-print"><Icon name="download" size={16} />Excel (CSV)</a>
        <span className="no-print"><PrintButton /></span>
      </PageHeader>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(([l, v]) => (
          <div key={l} className="card p-4"><div className="text-[11px] uppercase tracking-wide text-zinc-500">{l}</div><div className="mt-1 font-display text-xl font-extrabold">{v}</div></div>
        ))}
      </div>

      <Panel title="Revenue by day" className="mb-6">
        <div className="flex h-44 items-end gap-[3px] px-5 pb-2 pt-5">
          {r.daily.map((d) => (
            <div key={d.date} className="group relative flex h-full flex-1 flex-col justify-end">
              <div className="rounded-t bg-gradient-to-t from-brand to-accent-dark transition group-hover:from-accent group-hover:to-accent" style={{ height: `${(d.revenue / max) * 100}%`, minHeight: d.revenue ? 3 : 1, opacity: d.revenue ? 1 : 0.15 }} />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-[#0c1328] px-2 py-1 text-xs group-hover:block">{d.date.slice(5)} · {taka(d.revenue)} · {d.orders} orders</div>
            </div>
          ))}
        </div>
        <div className="flex justify-between px-5 pb-4 text-[11px] text-zinc-500"><span>{r.from.slice(8)}</span><span>{r.to.slice(8)}</span></div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Products">
          {r.products.length ? <Table head={['Product', 'Units', 'Revenue']} rows={r.products.map((p) => [p.name, p.units, taka(p.revenue)])} /> : <EmptyState icon="products" title="No sales this month" />}
        </Panel>
        <Panel title="Payment methods">
          {r.methods.length ? <Table head={['Method', 'Orders', 'Revenue']} rows={r.methods.map((m) => [m.method, m.orders, taka(m.revenue)])} /> : <EmptyState icon="revenue" title="No payments" />}
        </Panel>
        <Panel title="Coupons used">
          {r.coupons.length ? <Table head={['Code', 'Uses', 'Discount']} rows={r.coupons.map((c) => [c.code, c.uses, taka(c.discount)])} /> : <p className="p-5 text-sm text-zinc-500">No coupons used.</p>}
        </Panel>
        <Panel title="Refunds">
          {r.refundRows.length ? <Table head={['Order', 'Amount', 'Reason']} rows={r.refundRows.map((x) => [x.code, taka(x.amount), x.reason || '—'])} /> : <p className="p-5 text-sm text-zinc-500">No refunds. 🎉</p>}
        </Panel>
      </div>
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="text-[11px] uppercase tracking-wide text-zinc-500"><tr>{head.map((h, i) => <th key={h} className={`px-5 py-2.5 font-medium ${i ? 'text-right' : ''}`}>{h}</th>)}</tr></thead>
      <tbody className="divide-y divide-white/[0.05]">
        {rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={`px-5 py-2.5 ${j ? 'text-right tabular-nums' : ''}`}>{c}</td>)}</tr>)}
      </tbody>
    </table>
  );
}
