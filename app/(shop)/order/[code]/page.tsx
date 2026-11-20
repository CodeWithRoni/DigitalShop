import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { canView } from '@/lib/orderAccess';
import StatusBadge from '@/components/StatusBadge';
import ClearCart from '@/components/ClearCart';
import { taka } from '@/lib/utils';
import { getSettings } from '@/lib/settings';
import { reviewableItems } from '@/lib/reviews';
import ReviewForm from '@/components/ReviewForm';
import Stars from '@/components/Stars';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Order status', robots: { index: false } };

const STEPS = ['pending', 'processing', 'delivered'] as const;

export default async function OrderPage(props: { params: Promise<{ code: string }>; searchParams: Promise<{ payment?: string }> }) {
  const [params, searchParams] = await Promise.all([props.params, props.searchParams]);
  const code = decodeURIComponent(params.code).toUpperCase();
  if (!(await canView(code))) redirect(`/track?code=${encodeURIComponent(code)}`);
  const order = await db.getOrderByCode(code);
  if (!order) notFound();

  const [settings, reviewables] = await Promise.all([getSettings(), reviewableItems(order.id)]);
  const WHATSAPP = settings.whatsapp;
  const pay = searchParams.payment;
  const paid = order.payment_status === 'paid';
  const stepIdx = STEPS.indexOf(order.status as (typeof STEPS)[number]);

  return (
    <div className="container-x max-w-3xl py-10">
      {paid && <ClearCart />}
      {pay === 'success' && paid && (order.status === 'delivered'
        ? <Banner tone="ok">✅ Payment successful — your order is delivered! Your details are below.</Banner>
        : <Banner tone="ok">✅ Payment successful! We&apos;re processing your order — usually within 15 minutes.</Banner>)}
      {pay === 'failed' && !paid && <Banner tone="err">Payment failed. You can try again below or contact support.</Banner>}
      {pay === 'cancelled' && !paid && <Banner tone="warn">Payment was cancelled. Your order is saved — you can pay again.</Banner>}

      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs text-zinc-500">Order code</div>
            <h1 className="font-mono text-2xl font-bold">{order.code}</h1>
            <div className="mt-1 text-xs text-zinc-500">{new Date(order.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })}</div>
          </div>
          <div className="flex gap-2"><StatusBadge s={order.payment_status} /><StatusBadge s={order.status} /></div>
        </div>

        {stepIdx >= 0 && (
          <ol className="mt-6 grid grid-cols-3 gap-2 text-center text-xs">
            {['Order placed', 'Processing', 'Delivered'].map((t, i) => (
              <li key={t} className={`rounded-lg border px-2 py-2 ${i <= stepIdx ? 'border-brand/40 bg-brand/10 text-brand' : 'border-line text-zinc-500'}`}>{t}</li>
            ))}
          </ol>
        )}

        {order.delivery_message && (
          <div className="mt-6 rounded-xl border border-brand/30 bg-brand/5 p-4">
            <div className="mb-2 text-sm font-semibold text-brand">Delivery details</div>
            <pre className="whitespace-pre-wrap break-words font-mono text-sm text-zinc-200">{order.delivery_message}</pre>
          </div>
        )}

        <div className="mt-6 divide-y divide-line rounded-xl border border-line">
          {order.order_items?.map((i) => (
            <div key={i.id} className="flex justify-between gap-4 p-4 text-sm">
              <div>
                <div className="font-semibold">{i.product_name} — {i.package_name} × {i.quantity}</div>
                <div className="text-xs text-zinc-500">{i.delivery_info}</div>
              </div>
              <div className="font-semibold">{taka(i.unit_price * i.quantity)}</div>
            </div>
          ))}
          {Number(order.discount) > 0 && (
            <div className="flex justify-between p-4 text-sm text-green-300"><span>Coupon <span className="font-mono">{order.coupon_code}</span></span><span>− {taka(order.discount)}</span></div>
          )}
          <div className="flex justify-between p-4 font-bold"><span>Total</span><span className="text-brand">{taka(order.total)}</span></div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {!paid && ['unpaid', 'failed'].includes(order.payment_status) && order.status === 'pending' && (
            <form action={`/api/repay`} method="post"><input type="hidden" name="code" value={order.code} />
              <button className="btn-primary">Pay {taka(order.total)} now</button></form>
          )}
          {WHATSAPP && <a className="btn-ghost" href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Order ' + order.code)}`} target="_blank" rel="noreferrer">Contact support</a>}
          <Link href="/" className="btn-ghost">Continue shopping</Link>
        </div>
      </div>

      {reviewables.length > 0 && (
        <div className="card mt-6 p-6">
          <h2 className="font-display text-lg font-bold">Rate your purchase</h2>
          <p className="mb-4 text-sm text-zinc-400">Your review helps other customers. It appears after a quick check.</p>
          <div className="space-y-4">
            {reviewables.map((r) => r.rating
              ? <div key={r.product_id} className="flex items-center justify-between rounded-xl border border-white/10 p-4 text-sm"><span className="font-medium">{r.product_name}</span><span className="flex items-center gap-2"><Stars value={r.rating} size={14} /><span className="text-xs text-zinc-500">Thanks!</span></span></div>
              : <ReviewForm key={r.product_id} code={order.code} productId={r.product_id} productName={r.product_name} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function Banner({ tone, children }: { tone: 'ok' | 'err' | 'warn'; children: React.ReactNode }) {
  const c = { ok: 'border-green-500/30 bg-green-500/10 text-green-200', err: 'border-red-500/30 bg-red-500/10 text-red-200', warn: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-200' }[tone];
  return <div className={`mb-5 rounded-xl border p-4 text-sm ${c}`}>{children}</div>;
}
