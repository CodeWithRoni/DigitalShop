import Link from 'next/link';
import type { Order } from '@/lib/types';
import StatusBadge from './StatusBadge';
import { taka } from '@/lib/utils';

export default function OrdersTable({ orders }: { orders: Order[] }) {
  if (!orders.length) return <div className="card p-10 text-center text-sm text-zinc-500">No orders found.</div>;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-line text-xs uppercase text-zinc-500">
          <tr><th className="p-3">Order</th><th className="p-3">Customer</th><th className="p-3">Items</th><th className="p-3">Total</th><th className="p-3">Payment</th><th className="p-3">Status</th><th className="p-3">Date</th></tr>
        </thead>
        <tbody className="divide-y divide-line">
          {orders.map((o) => (
            <tr key={o.id} className="hover:bg-white/[0.03]">
              <td className="p-3"><Link href={`/admin/orders/${o.id}`} className="font-mono font-semibold text-brand hover:underline">{o.code}</Link></td>
              <td className="p-3"><div>{o.customer_name}</div><div className="text-xs text-zinc-500">{o.customer_phone}</div></td>
              <td className="max-w-[220px] truncate p-3 text-zinc-300">{o.order_items?.map((i) => `${i.product_name} (${i.package_name})${i.quantity > 1 ? ' ×' + i.quantity : ''}`).join(', ')}</td>
              <td className="p-3 font-semibold">{taka(o.total)}</td>
              <td className="p-3"><StatusBadge s={o.payment_status} /></td>
              <td className="p-3"><StatusBadge s={o.status} /></td>
              <td className="whitespace-nowrap p-3 text-xs text-zinc-500">{new Date(o.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', dateStyle: 'short', timeStyle: 'short' })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
