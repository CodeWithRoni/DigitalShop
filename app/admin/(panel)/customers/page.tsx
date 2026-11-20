import Link from 'next/link';
import { db } from '@/lib/db';
import { EmptyState, PageHeader } from '@/components/admin/ui';
import Icon from '@/components/admin/Icon';
import { taka } from '@/lib/utils';
import { requireAdmin } from '@/lib/admin';

const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Dhaka' });

export default async function Customers(props: { searchParams: Promise<{ q?: string }> }) {
  const me = await requireAdmin();
  const owner = me.role === 'owner';
  const { q = '' } = await props.searchParams;
  const list = await db.listCustomers(q);
  const spent = list.reduce((a, c) => a + c.spent, 0);
  const repeat = list.filter((c) => c.paidOrders > 1).length;
  const paying = list.filter((c) => c.paidOrders > 0).length;

  return (
    <div>
      <PageHeader title="Customers" subtitle="Everyone who placed an order, grouped by phone number" />
      <div className="mb-5 grid grid-cols-3 gap-3">
        {[['Customers', String(list.length)], ['Repeat buyers', `${repeat}${paying ? ` · ${Math.round((repeat / paying) * 100)}%` : ''}`], ['Lifetime revenue', owner ? taka(spent) : '—']].map(([l, v]) => (
          <div key={l} className="card p-4"><div className="text-[11px] uppercase tracking-wide text-zinc-500">{l}</div><div className="mt-1 font-display text-lg font-extrabold sm:text-xl">{v}</div></div>
        ))}
      </div>
      <form className="relative mb-4 sm:w-80">
        <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input name="q" defaultValue={q} placeholder="Search name, phone or email" className="input !pl-9" />
      </form>
      <div className="card overflow-x-auto">
        {list.length ? (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-white/[0.02] text-[11px] uppercase tracking-wide text-zinc-500">
              <tr><th className="px-4 py-3 font-medium">Customer</th><th className="px-4 py-3 font-medium">Orders</th><th className="px-4 py-3 text-right font-medium">Spent</th><th className="px-4 py-3 font-medium">First order</th><th className="px-4 py-3 font-medium">Last order</th><th className="px-4 py-3" /></tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {list.map((c) => (
                <tr key={c.phone} className="hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand/40 to-accent-dark/40 text-xs font-bold uppercase">{c.name.slice(0, 2)}</span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 font-medium">{c.name}{c.paidOrders > 1 && <span className="rounded bg-accent/15 px-1.5 text-[10px] font-semibold uppercase text-accent">Repeat</span>}</span>
                        <span className="block text-xs text-zinc-500">{c.phone}{c.email ? ` · ${c.email}` : ''}</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className="font-semibold">{c.paidOrders}</span><span className="text-zinc-500"> paid / {c.orders}</span></td>
                  <td className="px-4 py-3 text-right font-semibold">{owner ? taka(c.spent) : "—"}</td>
                  <td className="px-4 py-3 text-xs text-zinc-400">{fmt(c.firstOrder)}</td>
                  <td className="px-4 py-3 text-xs text-zinc-400">{fmt(c.lastOrder)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <a href={`https://wa.me/88${c.phone}`} target="_blank" rel="noreferrer" className="grid h-8 w-8 place-items-center rounded-lg text-zinc-400 hover:bg-white/5 hover:text-green-400" title="WhatsApp"><Icon name="whatsapp" size={16} /></a>
                      <Link href={`/admin/orders?phone=${c.phone}`} className="grid h-8 w-8 place-items-center rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white" title="View orders"><Icon name="arrowRight" size={16} /></Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <EmptyState icon="customers" title={q ? 'No matching customers' : 'No customers yet'} text={q ? undefined : 'Customers appear here after their first order.'} />}
      </div>
    </div>
  );
}
