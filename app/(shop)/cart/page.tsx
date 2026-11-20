'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useCart } from '@/components/CartProvider';
import ProductIcon from '@/components/ProductIcon';
import { taka } from '@/lib/utils';

export default function CartPage() {
  const { items, update, remove, total, ready } = useCart();
  const [form, setForm] = useState({ name: '', phone: '', email: '', note: '' });
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    <div className="container-x max-w-5xl py-6 sm:py-10">
      <h1 className="mb-5 font-display text-2xl font-extrabold tracking-tight">Checkout</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:gap-8">
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="card p-4">
              <div className="flex items-start gap-3">
                <ProductIcon src={it.image} name={it.productName} size={44} />
                <div className="min-w-0 flex-1">
                  <Link href={`/product/${it.slug}`} className="font-semibold hover:text-brand-light">{it.productName}</Link>
                  <div className="text-sm text-zinc-400">{it.packageName}</div>
                </div>
                <button onClick={() => remove(i)} className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 hover:bg-white/5 hover:text-red-400" aria-label="Remove">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>
                </button>
              </div>
              <label className="mt-3 block text-xs text-zinc-500">{it.deliveryLabel}</label>
              <input className="input mt-1 !py-2" value={it.deliveryInfo} onChange={(e) => update(i, { deliveryInfo: e.target.value })} maxLength={200} />
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center rounded-xl border border-white/10">
                  <button type="button" className="px-3 py-1.5 text-zinc-300" onClick={() => update(i, { quantity: Math.max(1, it.quantity - 1) })} aria-label="Decrease">−</button>
                  <span className="w-6 text-center text-sm font-semibold">{it.quantity}</span>
                  <button type="button" className="px-3 py-1.5 text-zinc-300" onClick={() => update(i, { quantity: Math.min(50, it.quantity + 1) })} aria-label="Increase">+</button>
                </div>
                <div className="font-bold">{taka(it.price * it.quantity)}</div>
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

          <div className="flex items-center justify-between border-t border-line pt-4">
            <span className="text-zinc-400">Total</span>
            <span className="font-display text-2xl font-extrabold">{taka(total)}</span>
          </div>
          <label className="flex items-start gap-2 text-xs text-zinc-400">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 accent-[#8b5cf6]" />
            <span>I agree to the <Link href="/terms" className="underline">Terms</Link> and <Link href="/refund" className="underline">Refund Policy</Link>.</span>
          </label>
          {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
          <button className="btn-primary w-full !py-3" disabled={loading}>{loading ? 'Redirecting to payment…' : `Pay ${taka(total)}`}</button>
          <p className="text-center text-xs text-zinc-500">bKash · Nagad · Rocket · Visa · Mastercard — secured by SSLCommerz</p>
        </form>
      </div>
    </div>
  );
}
