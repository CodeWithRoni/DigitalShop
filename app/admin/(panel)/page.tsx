import Link from 'next/link';
import { db } from '@/lib/db';
import OrdersTable from '@/components/OrdersTable';
import { taka } from '@/lib/utils';

export default async function Dashboard() {
  const [s, recent, toDeliver] = await Promise.all([
    db.stats(), db.listOrders({ limit: 8 }), db.listOrders({ status: 'processing', payment: 'paid', limit: 50 }),
  ]);
  const cards = [
    ['Needs delivery', String(toDeliver.length), 'Paid & processing', '/admin/orders?status=processing'],
    ['Today', `${s.todayOrders} order${s.todayOrders === 1 ? '' : 's'}`, `${taka(s.todayRevenue)} paid`, '/admin/orders'],
    ['Total revenue', taka(s.revenue), `${s.paidOrders} paid orders`, '/admin/orders?payment=paid'],
    ['Pending payment', String(s.pending), 'Not paid yet', '/admin/orders?status=pending'],
  ];
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([t, v, sub, href], i) => (
          <Link key={t} href={href} className={`card p-5 transition hover:border-brand/50 ${i === 0 && toDeliver.length ? 'border-brand/50 bg-brand/5' : ''}`}>
            <div className="text-xs uppercase tracking-wide text-zinc-500">{t}</div>
            <div className="mt-2 text-2xl font-extrabold">{v}</div>
            <div className="mt-1 text-xs text-zinc-400">{sub}</div>
          </Link>
        ))}
      </div>
      {toDeliver.length > 0 && (
        <>
          <h2 className="mb-3 mt-10 text-lg font-semibold">⚡ Waiting for delivery</h2>
          <OrdersTable orders={toDeliver.slice(0, 10)} />
        </>
      )}
      <div className="mb-3 mt-10 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent orders</h2>
        <Link href="/admin/orders" className="text-sm text-brand hover:underline">View all →</Link>
      </div>
      <OrdersTable orders={recent} />
    </div>
  );
}
