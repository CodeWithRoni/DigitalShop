import { requireOwner } from '@/lib/admin';
import Link from 'next/link';
import { db } from '@/lib/db';
import RevenueChart from '@/components/admin/RevenueChart';
import { EmptyState, KpiCard, PageHeader, Panel, Segmented } from '@/components/admin/ui';
import Icon from '@/components/admin/Icon';
import StatusBadge from '@/components/StatusBadge';
import { STATUS_LABEL, taka } from '@/lib/utils';

const RANGES = { '7': 7, '30': 30, '90': 90 } as const;
const STATUS_ORDER = ['pending', 'processing', 'delivered', 'cancelled', 'refunded'];
const STATUS_BAR: Record<string, string> = {
  pending: 'bg-yellow-400', processing: 'bg-blue-400', delivered: 'bg-green-400', cancelled: 'bg-zinc-500', refunded: 'bg-purple-400',
};

function greeting() {
  const h = Number(new Date().toLocaleString('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Dhaka' }));
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
};

export default async function Dashboard(props: { searchParams: Promise<{ range?: string }> }) {
  await requireOwner();
  const { range = '30' } = await props.searchParams;
  const days = RANGES[range as keyof typeof RANGES] || 30;
  const [a, queue, recent] = await Promise.all([
    db.analytics(days),
    db.listOrdersPage({ status: 'processing', payment: 'paid', limit: 6 }),
    db.listOrders({ limit: 6 }),
  ]);
  const statusTotal = Object.values(a.statusCounts).reduce((x, y) => x + y, 0);
  const conv = (t: typeof a.current) => (t.orders ? (t.paidOrders / t.orders) * 100 : 0);
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Dhaka' });

  return (
    <div className="space-y-6">
      <PageHeader title={`${greeting()} 👋`} subtitle={`${today} · here’s how your store is doing`}>
        <Segmented active={String(days)} items={Object.keys(RANGES).map((k) => ({ key: k, label: `${k}D`, href: `/admin?range=${k}` }))} />
        <Link href="/admin/products/new" className="btn-primary !py-2"><Icon name="plus" size={16} />Product</Link>
      </PageHeader>

      {queue.total > 0 && (
        <Link href="/admin/orders?status=processing&payment=paid"
          className="group flex items-center gap-4 rounded-2xl border border-accent/30 bg-gradient-to-r from-accent/15 via-accent-dark/10 to-transparent p-4 transition hover:border-accent/60">
          <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/20 text-accent">
            <span className="absolute inset-0 animate-ring rounded-xl bg-accent/30" /><Icon name="bolt" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{queue.total} paid order{queue.total > 1 ? 's' : ''} waiting for delivery</div>
            <div className="text-sm text-zinc-400">Customers are waiting — deliver to keep them happy.</div>
          </div>
          <span className="hidden items-center gap-1 text-sm font-semibold text-accent sm:flex">Deliver now <Icon name="arrowRight" size={16} className="transition group-hover:translate-x-1" /></span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiCard icon="revenue" label="Revenue" value={taka(a.current.revenue)} cur={a.current.revenue} prev={a.previous.revenue}
          spark={a.daily.map((d) => d.revenue)} color="#7B2FF7" />
        <KpiCard icon="cart" label="Paid orders" value={String(a.current.paidOrders)} cur={a.current.paidOrders} prev={a.previous.paidOrders}
          spark={a.daily.map((d) => d.paidOrders)} color="#3677FF" />
        <KpiCard icon="avg" label="Avg. order value" value={taka(Math.round(a.current.aov))} cur={a.current.aov} prev={a.previous.aov}
          spark={a.daily.map((d) => (d.paidOrders ? d.revenue / d.paidOrders : 0))} color="#10D7EF" />
        <KpiCard icon="users" label="Paying customers" value={String(a.current.customers)} cur={a.current.customers} prev={a.previous.customers}
          spark={a.daily.map((d) => d.paidOrders)} color="#22c55e" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Panel title="Revenue" action={<span className="text-xs text-zinc-500">Hover the chart for daily details</span>}>
          <RevenueChart data={a.daily} />
        </Panel>

        <Panel title="Order status" action={<span className="text-xs text-zinc-500">{statusTotal} orders</span>}>
          <div className="space-y-4 p-5">
            <div className="flex h-3 overflow-hidden rounded-full bg-white/5">
              {STATUS_ORDER.map((s) => a.statusCounts[s] ? (
                <div key={s} className={`${STATUS_BAR[s]} transition-all`} style={{ width: `${(a.statusCounts[s] / statusTotal) * 100}%` }} title={STATUS_LABEL[s]} />
              ) : null)}
            </div>
            <ul className="space-y-2.5 text-sm">
              {STATUS_ORDER.map((s) => (
                <li key={s}>
                  <Link href={`/admin/orders?status=${s}`} className="flex items-center gap-3 rounded-lg px-1 py-0.5 hover:bg-white/[0.03]">
                    <span className={`h-2.5 w-2.5 rounded-full ${STATUS_BAR[s]}`} />
                    <span className="flex-1 text-zinc-300">{STATUS_LABEL[s]}</span>
                    <span className="font-semibold">{a.statusCounts[s] || 0}</span>
                    <span className="w-10 text-right text-xs text-zinc-500">{statusTotal ? Math.round(((a.statusCounts[s] || 0) / statusTotal) * 100) : 0}%</span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-white/[0.06] pt-4 text-sm">
              <span className="text-zinc-400">Payment success rate</span>
              <span className="font-semibold">{conv(a.current).toFixed(0)}%</span>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Top products" action={<span className="text-xs text-zinc-500">by revenue · {days}D</span>}>
          {a.topProducts.length ? (
            <ul className="divide-y divide-white/[0.06]">
              {a.topProducts.map((p, i) => {
                const pct = (p.revenue / a.topProducts[0].revenue) * 100;
                return (
                  <li key={p.name} className="px-5 py-3.5">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="grid h-6 w-6 place-items-center rounded-md bg-white/5 text-xs font-bold text-zinc-400">{i + 1}</span>
                      <span className="flex-1 truncate font-medium">{p.name}</span>
                      <span className="text-xs text-zinc-500">{p.units} sold</span>
                      <span className="w-20 text-right font-semibold">{taka(p.revenue)}</span>
                    </div>
                    <div className="ml-9 mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full rounded-full bg-gradient-to-r from-brand to-accent" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : <EmptyState icon="products" title="No sales yet" text="Your best sellers will show up here." />}
        </Panel>

        <Panel title="Recent orders" action={<Link href="/admin/orders" className="flex items-center gap-1 text-xs font-semibold text-brand-light hover:underline">View all <Icon name="arrowRight" size={13} /></Link>}>
          {recent.length ? (
            <ul className="divide-y divide-white/[0.06]">
              {recent.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex items-center gap-3 px-5 py-3 transition hover:bg-white/[0.03]">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/5 text-xs font-bold uppercase text-zinc-300">{o.customer_name.slice(0, 2)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{o.customer_name} <span className="font-mono text-xs text-zinc-500">· {o.code}</span></span>
                      <span className="block truncate text-xs text-zinc-500">{o.order_items?.map((i) => i.product_name).join(', ')} · {ago(o.created_at)}</span>
                    </span>
                    <span className="text-right">
                      <span className="block text-sm font-semibold">{taka(o.total)}</span>
                      <StatusBadge s={o.payment_status === 'paid' ? o.status : o.payment_status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <EmptyState icon="orders" title="No orders yet" text="Share your store link to get the first order." />}
        </Panel>
      </div>
    </div>
  );
}
