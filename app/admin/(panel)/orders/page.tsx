import Link from 'next/link';
import { db } from '@/lib/db';
import OrdersTable from '@/components/OrdersTable';
import { PageHeader } from '@/components/admin/ui';
import Icon from '@/components/admin/Icon';

const TABS = [['', 'All'], ['pending', 'Pending'], ['processing', 'Processing'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled'], ['refunded', 'Refunded']] as const;
const PER_PAGE = 25;
type SP = { status?: string; payment?: string; q?: string; from?: string; to?: string; phone?: string; page?: string };

export default async function Orders(props: { searchParams: Promise<SP> }) {
  const sp = await props.searchParams;
  const { status = '', payment = '', q = '', from = '', to = '', phone = '' } = sp;
  const page = Math.max(1, Number(sp.page) || 1);
  const valid = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : undefined;
  const filter = { status: status || undefined, payment: payment || undefined, q: q || undefined, phone: phone || undefined, from: valid(from), to: valid(to) };
  const [{ orders, total }, counts] = await Promise.all([
    db.listOrdersPage({ ...filter, limit: PER_PAGE, offset: (page - 1) * PER_PAGE }),
    db.countByStatus(),
  ]);
  const all = Object.values(counts).reduce((a, b) => a + b, 0);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const qs = (over: Partial<SP>) => {
    const m = { status, payment, q, from, to, phone, page: '', ...over };
    const p = new URLSearchParams(Object.entries(m).filter(([, v]) => v) as [string, string][]);
    return p.toString() ? `?${p}` : '';
  };
  const exportQs = new URLSearchParams(Object.entries({ status, payment, q, from, to, phone }).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <div>
      <PageHeader title="Orders" subtitle={`${total} order${total === 1 ? '' : 's'}${phone ? ` for ${phone}` : ''}`}>
        <a href={`/admin/orders/export${exportQs ? '?' + exportQs : ''}`} className="btn-ghost !py-2"><Icon name="download" size={16} />Export CSV</a>
      </PageHeader>

      <div className="no-scrollbar -mx-4 mb-4 flex gap-1 overflow-x-auto border-b border-white/[0.06] px-4 sm:mx-0 sm:px-0">
        {TABS.map(([v, l]) => {
          const n = v ? counts[v] || 0 : all;
          const on = status === v;
          return (
            <Link key={v} href={`/admin/orders${qs({ status: v })}`}
              className={`relative flex shrink-0 items-center gap-2 px-3 pb-3 pt-1 text-sm transition ${on ? 'font-semibold text-white' : 'text-zinc-400 hover:text-white'}`}>
              {l}<span className={`rounded-full px-1.5 text-[11px] ${on ? 'bg-brand text-white' : 'bg-white/5 text-zinc-400'}`}>{n}</span>
              {on && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-brand to-accent" />}
            </Link>
          );
        })}
      </div>

      <form className="mb-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end">
        {status && <input type="hidden" name="status" value={status} />}
        {phone && <input type="hidden" name="phone" value={phone} />}
        <div className="relative col-span-2 sm:w-64">
          <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input name="q" defaultValue={q} placeholder="Code, name, phone, TrxID…" className="input !pl-9" />
        </div>
        <select name="payment" defaultValue={payment} className="input sm:!w-36">
          <option value="">Any payment</option><option value="paid">Paid</option><option value="unpaid">Unpaid</option><option value="failed">Failed</option><option value="refunded">Refunded</option>
        </select>
        <label className="flex items-center gap-2 text-xs text-zinc-500 sm:w-auto"><span className="hidden sm:inline">From</span>
          <input type="date" name="from" defaultValue={from} className="input [color-scheme:dark] sm:!w-40" /></label>
        <label className="flex items-center gap-2 text-xs text-zinc-500"><span className="hidden sm:inline">To</span>
          <input type="date" name="to" defaultValue={to} className="input [color-scheme:dark] sm:!w-40" /></label>
        <button className="btn-primary !py-2.5">Apply</button>
        {(q || payment || from || to || phone) && <Link href={`/admin/orders${status ? '?status=' + status : ''}`} className="btn-ghost !py-2.5">Clear</Link>}
      </form>

      <OrdersTable orders={orders} />

      {pages > 1 && (
        <div className="mt-5 flex items-center justify-between gap-3 text-sm">
          <span className="text-zinc-500">Page {page} of {pages}</span>
          <div className="flex gap-2">
            {page > 1 ? <Link href={`/admin/orders${qs({ page: String(page - 1) })}`} className="btn-ghost !py-2">← Prev</Link> : <span className="btn-ghost pointer-events-none !py-2 opacity-40">← Prev</span>}
            {page < pages ? <Link href={`/admin/orders${qs({ page: String(page + 1) })}`} className="btn-ghost !py-2">Next →</Link> : <span className="btn-ghost pointer-events-none !py-2 opacity-40">Next →</span>}
          </div>
        </div>
      )}
    </div>
  );
}
