import Link from 'next/link';
import type { Order } from '@/lib/types';
import StatusBadge from './StatusBadge';
import { taka } from '@/lib/utils';

const fmt = (d: string) => new Date(d).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', dateStyle: 'short', timeStyle: 'short' });
const items = (o: Order) => o.order_items?.map((i) => `${i.product_name} (${i.package_name})${i.quantity > 1 ? ' ×' + i.quantity : ''}`).join(', ');

export default function OrdersTable({ orders }: { orders: Order[] }) {
  if (!orders.length) return <div className="card p-10 text-center text-sm text-zinc-500">No orders found.</div>;
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
          <thead className="border-b border-white/[0.06] text-xs uppercase text-zinc-500">
            <tr><th className="p-3">Order</th><th className="p-3">Customer</th><th className="p-3">Items</th><th className="p-3">Total</th><th className="p-3">Payment</th><th className="p-3">Status</th><th className="p-3">Date</th></tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-white/[0.03]">
                <td className="p-3"><Link href={`/admin/orders/${o.id}`} className="font-mono font-semibold text-brand-light hover:underline">{o.code}</Link></td>
                <td className="p-3"><div>{o.customer_name}</div><div className="text-xs text-zinc-500">{o.customer_phone}</div></td>
                <td className="max-w-[240px] truncate p-3 text-zinc-300">{items(o)}</td>
                <td className="p-3 font-semibold">{taka(o.total)}</td>
                <td className="p-3"><StatusBadge s={o.payment_status} /></td>
                <td className="p-3"><StatusBadge s={o.status} /></td>
                <td className="whitespace-nowrap p-3 text-xs text-zinc-500">{fmt(o.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
