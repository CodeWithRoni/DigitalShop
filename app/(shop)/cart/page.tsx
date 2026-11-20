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

          <div className="flex items-center justify-between border-t border-line pt-4">
            <span className="text-zinc-400">Total</span>
            <span className="text-2xl font-extrabold text-brand">{taka(total)}</span>
          </div>
          <label className="flex items-start gap-2 text-xs text-zinc-400">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 accent-[#7B2FF7]" />
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
