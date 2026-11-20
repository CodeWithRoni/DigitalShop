import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { updateOrder } from '../../../actions';
import StatusBadge from '@/components/StatusBadge';
import { taka } from '@/lib/utils';

export default async function OrderDetail({ params, searchParams }: { params: { id: string }; searchParams: { saved?: string } }) {
  const o = await db.getOrderById(Number(params.id));
  if (!o) notFound();
  const fmt = (d: string | null) => (d ? new Date(d).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' }) : '—');
  const wa = `https://wa.me/88${o.customer_phone}?text=${encodeURIComponent(`Hi ${o.customer_name}, your order ${o.code} `)}`;

  return (
    <div className="max-w-5xl">
      <Link href="/admin/orders" className="text-sm text-zinc-400 hover:text-white">← Orders</Link>
      <div className="mb-6 mt-2 flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-bold">{o.code}</h1>
        <StatusBadge s={o.payment_status} /><StatusBadge s={o.status} />
      </div>
      {searchParams.saved && <div className="mb-5 rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-200">Saved ✓</div>}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <div className="card divide-y divide-line">
            {o.order_items?.map((i) => (
              <div key={i.id} className="flex justify-between gap-4 p-4 text-sm">
                <div>
                  <div className="font-semibold">{i.product_name} — {i.package_name} × {i.quantity}</div>
                  <div className="mt-1 rounded bg-black/30 px-2 py-1 font-mono text-xs text-zinc-300">{i.delivery_info}</div>
                </div>
                <div className="font-semibold">{taka(i.unit_price * i.quantity)}</div>
              </div>
            ))}
            <div className="flex justify-between p-4 font-bold"><span>Total</span><span className="text-brand">{taka(o.total)}</span></div>
          </div>

          <form action={updateOrder} className="card space-y-4 p-5">
            <input type="hidden" name="id" value={o.id} />
            <h2 className="font-semibold">Update order</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label">Order status</label>
                <select name="status" defaultValue={o.status} className="input">
                  {['pending', 'processing', 'delivered', 'cancelled', 'refunded'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select></div>
              <div><label className="label">Payment status</label>
                <select name="payment_status" defaultValue={o.payment_status} className="input">
                  {['unpaid', 'paid', 'failed', 'refunded'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select></div>
            </div>
            <div><label className="label">Delivery message (customer sees this on the order page)</label>
              <textarea name="delivery_message" defaultValue={o.delivery_message || ''} rows={4} className="input font-mono" placeholder={'e.g.\nEmail: xxx@gmail.com\nPassword: ****\nProfile: 2'} /></div>
            <div><label className="label">Internal note (only admins)</label>
              <textarea name="admin_note" defaultValue={o.admin_note || ''} rows={2} className="input" /></div>
            <div className="flex gap-3"><button className="btn-primary">Save changes</button></div>
          </form>
        </div>

        <div className="space-y-6">
          <div className="card space-y-2 p-5 text-sm">
            <h2 className="mb-2 font-semibold">Customer</h2>
            <Row k="Name" v={o.customer_name} />
            <Row k="Phone" v={o.customer_phone} />
            <Row k="Email" v={o.customer_email || '—'} />
            {o.note && <div className="rounded-lg bg-black/30 p-2 text-xs text-zinc-300">Note: {o.note}</div>}
            <a href={wa} target="_blank" rel="noreferrer" className="btn-ghost mt-2 w-full !py-2">Message on WhatsApp</a>
          </div>
          <div className="card space-y-2 p-5 text-sm">
            <h2 className="mb-2 font-semibold">Payment</h2>
            <Row k="Method" v={o.payment_method || '—'} />
            <Row k="Tran ID" v={o.tran_id || '—'} mono />
            <Row k="Val ID" v={o.val_id || '—'} mono />
            <Row k="Bank Tran" v={o.bank_tran_id || '—'} mono />
            <Row k="Paid at" v={fmt(o.paid_at)} />
            <Row k="Created" v={fmt(o.created_at)} />
            <Row k="Updated" v={fmt(o.updated_at)} />
          </div>
        </div>
      </div>
    </div>
  );
}
function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return <div className="flex justify-between gap-3"><span className="text-zinc-500">{k}</span><span className={`truncate text-right ${mono ? 'font-mono text-xs' : ''}`}>{v}</span></div>;
}
