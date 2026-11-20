'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCart } from '@/components/CartProvider';
import ProductIcon from '@/components/ProductIcon';
import { taka } from '@/lib/utils';

export default function CartPage() {
  const { items, update, remove, total, ready } = useCart();
  const [form, setForm] = useState({ name: '', phone: '', email: '', note: '' });
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<{ code: string; discount: number; label: string } | null>(null);
  const [couponMsg, setCouponMsg] = useState('');
  const [couponBusy, setCouponBusy] = useState(false);
  const discount = coupon ? Math.min(coupon.discount, total) : 0;
  const payable = Math.max(0, Math.round((total - discount) * 100) / 100);

  async function applyCoupon(code = couponInput) {
    if (!code.trim()) return;
    setCouponBusy(true); setCouponMsg('');
    try {
      const res = await fetch('/api/coupon', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, items: items.map((i) => ({ packageId: i.packageId, quantity: i.quantity })) }) });
      const j = await res.json();
      if (!res.ok) { setCoupon(null); setCouponMsg(j.error || 'Invalid coupon'); }
      else { setCoupon({ code: j.code, discount: j.discount, label: j.label }); setCouponInput(j.code); }
    } finally { setCouponBusy(false); }
  }
  // Re-check the coupon when the cart changes (min order, % amounts).
  useEffect(() => { if (coupon) applyCoupon(coupon.code); }, [total]); // eslint-disable-line react-hooks/exhaustive-deps

  async function checkout(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!agree) return setError('Please accept the Terms & Refund Policy');
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: form,
          items: items.map((i) => ({ packageId: i.packageId, quantity: i.quantity, deliveryInfo: i.deliveryInfo })),
          coupon: coupon?.code || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Checkout failed');
      // Cart is kept until payment succeeds; order page clears it.
      window.location.href = json.redirect;
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  if (!ready) return <div className="container-x py-20 text-center text-zinc-500">Loading…</div>;
  if (!items.length)
    return (
      <div className="container-x py-20 text-center">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <Link href="/#products" className="btn-primary mt-6">Browse products</Link>
      </div>
    );

  return (
    <div className="container-x py-10">
      <h1 className="mb-6 text-2xl font-bold">Cart &amp; Checkout</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <ProductIcon src={it.image} name={it.productName} size={48} />
              <div className="min-w-0 flex-1">
                <Link href={`/product/${it.slug}`} className="font-semibold hover:text-brand">{it.productName}</Link>
                <div className="text-sm text-zinc-400">{it.packageName} · {taka(it.price)}</div>
                <label className="mt-2 block text-xs text-zinc-500">{it.deliveryLabel}</label>
                <input className="input mt-1 !py-1.5" value={it.deliveryInfo} onChange={(e) => update(i, { deliveryInfo: e.target.value })} maxLength={200} />
              </div>
              <div className="flex items-center gap-3">
                <select className="input !w-20 !py-1.5" value={it.quantity} onChange={(e) => update(i, { quantity: Number(e.target.value) })}>
                  {Array.from({ length: 10 }, (_, n) => n + 1).map((n) => <option key={n}>{n}</option>)}
                </select>
                <div className="w-20 text-right font-bold">{taka(it.price * it.quantity)}</div>
                <button onClick={() => remove(i)} className="text-zinc-500 hover:text-red-400" aria-label="Remove">✕</button>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={checkout} className="card h-fit space-y-4 p-5">
          <h2 className="font-semibold">Your details</h2>
          <div><label className="label">Full name *</label>
            <input className="input" required maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">Phone (WhatsApp) *</label>
            <input className="input" required inputMode="tel" placeholder="01XXXXXXXXX" pattern="(\+?88)?01[3-9][0-9]{8}" title="Bangladeshi mobile number, e.g. 017XXXXXXXX"
              value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><label className="label">Email (for receipt)</label>
            <input className="input" type="email" maxLength={120} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label className="label">Note (optional)</label>
            <textarea className="input" rows={2} maxLength={500} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>

          <div className="space-y-3 border-t border-line pt-4">
            {coupon ? (
              <div className="flex items-center justify-between rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm">
                <span className="text-green-200">🏷️ <span className="font-mono font-semibold">{coupon.code}</span> · {coupon.label}</span>
                <button type="button" onClick={() => { setCoupon(null); setCouponInput(''); }} className="text-xs text-zinc-400 hover:text-white">Remove</button>
              </div>
            ) : (
              <div>
                <div className="flex gap-2">
                  <input className="input !py-2 font-mono uppercase" placeholder="Coupon code" value={couponInput} onChange={(e) => setCouponInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon(); } }} />
                  <button type="button" onClick={() => applyCoupon()} disabled={couponBusy || !couponInput.trim()} className="btn-ghost shrink-0 !py-2">{couponBusy ? '…' : 'Apply'}</button>
                </div>
                {couponMsg && <p className="mt-1.5 text-xs text-red-300">{couponMsg}</p>}
              </div>
            )}
            {discount > 0 && <>
              <div className="flex justify-between text-sm text-zinc-400"><span>Subtotal</span><span>{taka(total)}</span></div>
              <div className="flex justify-between text-sm text-green-300"><span>Discount</span><span>− {taka(discount)}</span></div>
            </>}
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Total</span>
              <span className="text-2xl font-extrabold text-brand">{taka(payable)}</span>
            </div>
          </div>
          <label className="flex items-start gap-2 text-xs text-zinc-400">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 accent-[#7B2FF7]" />
            <span>I agree to the <Link href="/terms" className="underline">Terms</Link> and <Link href="/refund" className="underline">Refund Policy</Link>.</span>
          </label>
          {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
          <button className="btn-primary w-full !py-3" disabled={loading}>{loading ? 'Redirecting to payment…' : `Pay ${taka(payable)}`}</button>
          <p className="text-center text-xs text-zinc-500">bKash · Nagad · Rocket · Visa · Mastercard — secured by SSLCommerz</p>
        </form>
      </div>
    </div>
  );
}
