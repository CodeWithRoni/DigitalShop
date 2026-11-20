import Link from 'next/link';
import { db } from '@/lib/db';
import OrdersTable from '@/components/OrdersTable';

const TABS = [['', 'All'], ['pending', 'Pending'], ['processing', 'Processing'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled'], ['refunded', 'Refunded']];

export default async function Orders({ searchParams }: { searchParams: { status?: string; payment?: string; q?: string } }) {
  const { status = '', payment = '', q = '' } = searchParams;
  const orders = await db.listOrders({ status: status || undefined, payment: payment || undefined, q: q || undefined });
  const qs = (s: string) => '?' + new URLSearchParams({ ...(s && { status: s }), ...(payment && { payment }), ...(q && { q }) }).toString();
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Orders</h1>
      <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {TABS.map(([v, l]) => (
            <Link key={v} href={`/admin/orders${qs(v)}`}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm ${status === v ? 'border-brand bg-brand text-white' : 'border-line text-zinc-300 hover:bg-white/5'}`}>{l}</Link>
          ))}
        </div>
        <form className="flex flex-wrap gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <select name="payment" defaultValue={payment} className="input flex-1 sm:!w-36 sm:flex-none">
            <option value="">Any payment</option><option value="paid">Paid</option><option value="unpaid">Unpaid</option><option value="failed">Failed</option><option value="refunded">Refunded</option>
          </select>
          <input name="q" defaultValue={q} placeholder="Code, name, phone…" className="input order-first basis-full sm:order-none sm:!w-56 sm:basis-auto" />
          <button className="btn-ghost">Filter</button>
        </form>
      </div>
      <OrdersTable orders={orders} />
    </div>
  );
}
