import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { setOrderStatus, updateOrder } from '../../../actions';
import StatusBadge from '@/components/StatusBadge';
import CopyButton from '@/components/admin/CopyButton';
import Icon from '@/components/admin/Icon';
import { Panel } from '@/components/admin/ui';
import { SITE_URL, taka } from '@/lib/utils';
import { requireAdmin } from '@/lib/admin';
import { listActivity } from '@/lib/activity';
import { listRefunds } from '@/lib/refunds';
import { fillTemplate, listTemplates } from '@/lib/templates';
import { getSettings } from '@/lib/settings';
import { addRefund } from '../../../feature-actions';
import DeliveryMessageField from '@/components/admin/DeliveryMessageField';
import { Flash } from '@/components/admin/ui';

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

export default async function OrderDetail(props: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; refunded?: string; refundError?: string }> }) {
  const me = await requireAdmin();
  const [params, searchParams] = await Promise.all([props.params, props.searchParams]);
  const o = await db.getOrderById(Number(params.id));
  if (!o) notFound();
  const [history, refunds, activity, templates, settings] = await Promise.all([
    db.listOrdersPage({ phone: o.customer_phone, limit: 1 }),
    listRefunds(o.id),
    listActivity({ entity: 'order', entityId: String(o.id), limit: 30 }),
    listTemplates(),
    getSettings(),
  ]);
  const productIds = new Set((o.order_items || []).map((i) => i.product_id));
  const tpl = [...templates].sort((a, b) => Number(productIds.has(b.product_id)) - Number(productIds.has(a.product_id)))
    .filter((t) => !t.product_id || productIds.has(t.product_id))
    .map((t) => ({ name: t.product_name ? `${t.name} (${t.product_name})` : t.name, text: fillTemplate(t.body, o, settings.shop_name) }));
  const refunded = refunds.reduce((a, r) => a + Number(r.amount), 0);
  const refundable = Math.max(0, Math.round((Number(o.total) - refunded) * 100) / 100);
  const paid = o.payment_status === 'paid';

  const waBase = `https://wa.me/88${o.customer_phone}?text=`;
  const deliveryText = [
    `Hi ${o.customer_name}, your order ${o.code} is delivered ✅`,
    ...(o.order_items || []).map((i) => `• ${i.product_name} — ${i.package_name}`),
    o.delivery_message ? `\n${o.delivery_message}` : '',
    `\nOrder details: ${SITE_URL}/order/${o.code}`,
    'Thank you for shopping with us!',
  ].join('\n');

  const timeline = [
    { label: 'Order placed', at: o.created_at, done: true },
    { label: paid ? `Payment received${o.payment_method ? ` · ${o.payment_method}` : ''}` : o.payment_status === 'failed' ? 'Payment failed' : 'Awaiting payment', at: o.paid_at, done: paid, bad: o.payment_status === 'failed' },
    { label: o.status === 'delivered' ? 'Delivered' : o.status === 'cancelled' ? 'Cancelled' : o.status === 'refunded' ? 'Refunded' : 'Delivery', at: ['delivered', 'cancelled', 'refunded'].includes(o.status) ? o.updated_at : null, done: o.status === 'delivered', bad: ['cancelled', 'refunded'].includes(o.status) },
  ];

  return (
    <div>
      <Link href="/admin/orders" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white">← Orders</Link>
      <div className="mb-6 mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl font-bold">{o.code}</h1><CopyButton text={o.code} />
          <StatusBadge s={o.payment_status} /><StatusBadge s={o.status} />
          {o.auto_delivered && <span className="badge border-accent/30 bg-accent/10 text-accent">⚡ Auto-delivered</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          {paid && o.status === 'pending' && <QuickStatus id={o.id} status="processing" label="Start processing" />}
          {paid && ['pending', 'processing'].includes(o.status) && <QuickStatus id={o.id} status="delivered" label="Mark delivered" primary />}
          <a href={waBase + encodeURIComponent(o.status === 'delivered' ? deliveryText : `Hi ${o.customer_name}, about your order ${o.code}: `)} target="_blank" rel="noreferrer" className="btn-ghost !py-2"><Icon name="whatsapp" size={16} className="text-green-400" />WhatsApp</a>
        </div>
      </div>
      <Flash ok={searchParams.saved ? 'Saved' : searchParams.refunded ? 'Refund recorded' : null} error={searchParams.refundError} />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Panel title={`Items (${o.order_items?.length || 0})`}>
            <ul className="divide-y divide-white/[0.06]">
              {o.order_items?.map((i) => (
                <li key={i.id} className="flex justify-between gap-4 px-5 py-4 text-sm">
                  <div className="min-w-0">
                    <div className="font-semibold">{i.product_name} <span className="font-normal text-zinc-400">— {i.package_name} × {i.quantity}</span></div>
                    <div className="mt-2 flex items-center gap-1 rounded-lg border border-white/[0.06] bg-black/30 py-1 pl-2.5 pr-1 font-mono text-xs text-zinc-200">
                      <span className="flex-1 break-all">{i.delivery_info}</span><CopyButton text={i.delivery_info || ''} />
                    </div>
                  </div>
                  <div className="shrink-0 font-semibold">{taka(i.unit_price * i.quantity)}</div>
                </li>
              ))}
            </ul>
            <div className="space-y-1.5 border-t border-white/[0.06] bg-white/[0.02] px-5 py-4 text-sm">
              {Number(o.discount) > 0 && <>
                <div className="flex justify-between text-zinc-400"><span>Subtotal</span><span>{taka(o.subtotal ?? Number(o.total) + Number(o.discount))}</span></div>
                <div className="flex justify-between text-green-300"><span>Coupon <span className="font-mono">{o.coupon_code}</span></span><span>− {taka(o.discount)}</span></div>
              </>}
              <div className="flex justify-between text-base font-bold"><span>Total</span><span className="text-gradient">{taka(o.total)}</span></div>
              {refunded > 0 && <div className="flex justify-between text-purple-300"><span>Refunded</span><span>− {taka(refunded)}</span></div>}
            </div>
          </Panel>

          <Panel title="Deliver & update">
            <form action={updateOrder} className="space-y-4 p-5">
              <input type="hidden" name="id" value={o.id} />
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
              <DeliveryMessageField defaultValue={o.delivery_message || ''} templates={tpl} />
              <div><label className="label">Internal note — only admins see this</label>
                <textarea name="admin_note" defaultValue={o.admin_note || ''} rows={2} className="input" /></div>
              <div className="flex flex-wrap items-center gap-3">
                <button className="btn-primary">Save changes</button>
                <span className="text-xs text-zinc-500">Tip: add the delivery message, set status to <b className="text-zinc-300">delivered</b>, save, then press WhatsApp to send it.</span>
              </div>
            </form>
          </Panel>

          {me.role === 'owner' && (paid || refunds.length > 0 || o.payment_status === 'refunded') && (
            <Panel title="Refunds" action={<span className="text-xs text-zinc-500">{refunds.length ? `${taka(refunded)} refunded` : 'None yet'}</span>}>
              {refunds.length > 0 && (
                <ul className="divide-y divide-white/[0.05]">
                  {refunds.map((r) => (
                    <li key={r.id} className="flex justify-between gap-4 px-5 py-3 text-sm">
                      <span><span className="font-semibold text-purple-300">{taka(r.amount)}</span> <span className="text-zinc-400">via {r.method || '—'}</span>
                        <span className="block text-xs text-zinc-500">{r.reason || 'No reason'} · by {r.created_by} · {fmt(r.created_at)}</span></span>
                    </li>
                  ))}
                </ul>
              )}
              {refundable > 0 && (
                <form action={addRefund} className="grid gap-3 border-t border-white/[0.06] p-5 sm:grid-cols-[120px_150px_1fr_auto] sm:items-end">
                  <input type="hidden" name="order_id" value={o.id} />
                  <div><label className="label">Amount ৳</label><input name="amount" type="number" step="0.01" min="0.01" max={refundable} defaultValue={refundable} required className="input" /></div>
                  <div><label className="label">Sent via</label><select name="method" className="input">{['bKash', 'Nagad', 'Rocket', 'Bank', 'SSLCommerz', 'Other'].map((m) => <option key={m}>{m}</option>)}</select></div>
                  <div><label className="label">Reason</label><input name="reason" className="input" placeholder="e.g. account not working" maxLength={300} /></div>
                  <button className="btn-ghost"><Icon name="refund" size={15} />Record</button>
                  <p className="text-xs text-zinc-500 sm:col-span-4">This only records the refund — send the money yourself first. A full refund marks the order “refunded”.</p>
                </form>
              )}
            </Panel>
          )}
        </div>

        <div className="space-y-6">
          <Panel title="Timeline">
            <ol className="relative space-y-5 p-5">
              <span className="absolute bottom-8 left-[29px] top-8 w-px bg-white/10" />
              {timeline.map((t) => (
                <li key={t.label} className="relative flex gap-3">
                  <span className={`relative z-10 grid h-5 w-5 shrink-0 place-items-center rounded-full ${t.bad ? 'bg-red-500/80' : t.done ? 'bg-gradient-to-br from-brand to-accent-dark' : 'border border-white/15 bg-bg'}`}>
                    {t.done && <Icon name="check" size={11} />}
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-sm ${t.done || t.bad ? 'font-medium' : 'text-zinc-500'}`}>{t.label}</span>
                    <span className="block text-xs text-zinc-500">{t.at ? fmt(t.at) : 'Waiting'}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="Customer" action={history.total > 1 ? <Link href={`/admin/orders?phone=${o.customer_phone}`} className="text-xs font-semibold text-brand-light hover:underline">{history.total} orders →</Link> : <span className="text-xs text-zinc-500">First order</span>}>
            <div className="space-y-2.5 p-5 text-sm">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand/40 to-accent-dark/40 text-sm font-bold uppercase">{o.customer_name.slice(0, 2)}</span>
                <span className="font-semibold">{o.customer_name}</span>
              </div>
              <Row k="Phone" v={o.customer_phone} copy />
              <Row k="Email" v={o.customer_email || '—'} copy={!!o.customer_email} />
              {o.note && <div className="rounded-lg bg-black/30 p-2.5 text-xs text-zinc-300"><span className="text-zinc-500">Customer note:</span> {o.note}</div>}
            </div>
          </Panel>

          <Panel title="Payment">
            <div className="space-y-2.5 p-5 text-sm">
              <Row k="Method" v={o.payment_method || '—'} />
              <Row k="Tran ID" v={o.tran_id || '—'} mono copy={!!o.tran_id} />
              <Row k="Bank Tran" v={o.bank_tran_id || '—'} mono copy={!!o.bank_tran_id} />
              <Row k="Val ID" v={o.val_id || '—'} mono />
              <Row k="Paid at" v={fmt(o.paid_at)} />
              <Row k="Updated" v={fmt(o.updated_at)} />
            </div>
          </Panel>
          {activity.length > 0 && (
            <Panel title="History">
              <ol className="max-h-72 space-y-3 overflow-y-auto p-5 text-xs">
                {activity.map((a) => (
                  <li key={a.id}><span className="text-zinc-300">{a.details?.replace(`${o.code}: `, '') || a.action}</span>
                    <span className="block text-zinc-500">{a.actor} · {fmt(a.created_at)}</span></li>
                ))}
              </ol>
            </Panel>
          )}
          {o.admin_note && <div className="whitespace-pre-line rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-sm text-yellow-100"><div className="mb-1 text-xs font-semibold uppercase text-yellow-400">Internal note</div>{o.admin_note}</div>}
        </div>
      </div>
    </div>
  );
}

function QuickStatus({ id, status, label, primary }: { id: number; status: string; label: string; primary?: boolean }) {
  return (
    <form action={setOrderStatus}>
      <input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={status} />
      <button className={primary ? 'btn-primary !py-2' : 'btn-ghost !py-2'}>{primary && <Icon name="check" size={16} />}{label}</button>
    </form>
  );
}
function Row({ k, v, mono, copy }: { k: string; v: string; mono?: boolean; copy?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-zinc-500">{k}</span>
      <span className={`flex min-w-0 items-center gap-1 ${mono ? 'font-mono text-xs' : ''}`}><span className="truncate">{v}</span>{copy && <CopyButton text={v} />}</span>
    </div>
  );
}
