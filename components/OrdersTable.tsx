import Link from 'next/link';
import type { Order } from '@/lib/types';
import StatusBadge from './StatusBadge';
import { taka } from '@/lib/utils';
import { EmptyState } from './admin/ui';

const fmt = (d: string) => new Date(d).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const items = (o: Order) => o.order_items?.map((i) => `${i.product_name} · ${i.package_name}${i.quantity > 1 ? ' ×' + i.quantity : ''}`).join(', ');

export default function OrdersTable({ orders }: { orders: Order[] }) {
  if (!orders.length) return <div className="card"><EmptyState icon="orders" title="No orders found" text="Try a different filter or date range." /></div>;
  return (
    <>
      {/* Mobile: cards */}
      <div className="space-y-2.5 md:hidden">
        {orders.map((o) => (
          <Link key={o.id} href={`/admin/orders/${o.id}`} className="card block p-4 active:bg-white/[0.06]">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-sm font-semibold text-brand-light">{o.code}</span>
              <span className="font-bold">{taka(o.total)}</span>
            </div>
            <div className="mt-1 truncate text-sm text-zinc-300">{items(o)}</div>
            <div className="mt-1 text-xs text-zinc-500">{o.customer_name} · {o.customer_phone} · {fmt(o.created_at)}</div>
            <div className="mt-2.5 flex gap-2"><StatusBadge s={o.payment_status} /><StatusBadge s={o.status} /></div>
          </Link>
        ))}
      </div>
      {/* Desktop: table */}
      <div className="card hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.02] text-[11px] uppercase tracking-wide text-zinc-500">
            <tr><th className="px-4 py-3 font-medium">Order</th><th className="px-4 py-3 font-medium">Customer</th><th className="px-4 py-3 font-medium">Items</th><th className="px-4 py-3 text-right font-medium">Total</th><th className="px-4 py-3 font-medium">Payment</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Date</th></tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {orders.map((o) => (
              <tr key={o.id} className="group transition hover:bg-white/[0.03]">
                <td className="px-4 py-3"><Link href={`/admin/orders/${o.id}`} className="font-mono font-semibold text-brand-light group-hover:underline">{o.code}</Link></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5 text-[11px] font-bold uppercase text-zinc-300">{o.customer_name.slice(0, 2)}</span>
                    <span><span className="block">{o.customer_name}</span><span className="block text-xs text-zinc-500">{o.customer_phone}</span></span>
                  </div>
                </td>
                <td className="max-w-[260px] truncate px-4 py-3 text-zinc-300">{items(o)}</td>
                <td className="px-4 py-3 text-right font-semibold">{taka(o.total)}</td>
                <td className="px-4 py-3"><StatusBadge s={o.payment_status} /></td>
                <td className="px-4 py-3"><StatusBadge s={o.status} /></td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500">{fmt(o.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
