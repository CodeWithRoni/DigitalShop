'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Product } from '@/lib/types';
import { taka } from '@/lib/utils';
import { useCart } from './CartProvider';

export default function PackagePicker({ product }: { product: Product }) {
  const pkgs = product.packages || [];
  const soldOut = (k: (typeof pkgs)[number]) => !!k.stock_managed && (k.stock_available || 0) <= 0;
  const [selected, setSelected] = useState<number | null>((pkgs.find((k) => !soldOut(k)) || pkgs[0])?.id ?? null);
  const [info, setInfo] = useState('');
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState('');
  const { add } = useCart();
  const router = useRouter();

  const selPkg = pkgs.find((p) => p.id === selected);
  if (!pkgs.length) return <div className="card p-6 text-zinc-400">No packages available right now.</div>;

  function addToCart(goCheckout: boolean) {
    const pkg = pkgs.find((p) => p.id === selected);
    if (!pkg) return setMsg('Please select a package');
    if (soldOut(pkg)) return setMsg('This package is out of stock');
    if (pkg.stock_managed && qty > (pkg.stock_available || 0)) return setMsg(`Only ${pkg.stock_available} left`);
    if (!info.trim()) return setMsg(`Please enter ${product.delivery_label}`);
    add({
      productId: product.id, packageId: pkg.id, productName: product.name, packageName: pkg.name,
      slug: product.slug, image: product.image_url, price: Number(pkg.price), quantity: qty,
      deliveryLabel: product.delivery_label, deliveryInfo: info.trim(),
    });
    if (goCheckout) router.push('/cart');
    else { setMsg('Added to cart ✓'); setTimeout(() => setMsg(''), 2000); }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {pkgs.map((p) => {
          const on = selected === p.id;
          const out = soldOut(p);
          return (
            <button type="button" key={p.id} onClick={() => !out && setSelected(p.id)} disabled={out}
              className={`relative flex items-center justify-between gap-3 rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${on ? 'border-brand bg-brand/10 shadow-lg shadow-brand/10' : 'border-white/10 bg-white/[0.02] hover:border-white/25'}`}>
              {p.stock_managed && (
                <span className={`absolute -top-2 right-3 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${out ? 'bg-zinc-700 text-zinc-300' : 'bg-accent/20 text-accent'}`}>
                  {out ? 'Out of stock' : (p.stock_available || 0) <= 5 ? `⚡ Instant · ${p.stock_available} left` : '⚡ Instant'}
                </span>
              )}
              <span className="flex items-center gap-3">
                <span className={`grid h-5 w-5 place-items-center rounded-full border-2 ${on ? 'border-brand bg-brand' : 'border-zinc-600'}`}>
                  {on && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><path d="M20 6 9 17l-5-5"/></svg>}
                </span>
                <span className="text-sm font-medium">{p.name}</span>
              </span>
              <span className={`font-display font-extrabold ${on ? 'text-gradient' : 'text-white'}`}>{taka(p.price)}</span>
            </button>
          );
        })}
      </div>
      <div className="card space-y-4 p-5">
        <div>
          <label className="label">{product.delivery_label} *</label>
          <input className="input" value={info} onChange={(e) => setInfo(e.target.value)} placeholder={product.delivery_hint || product.delivery_label} maxLength={200} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.03]">
            <button type="button" className="px-3.5 py-2.5 text-zinc-300 hover:text-white" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">−</button>
            <span className="w-8 text-center text-sm font-semibold">{qty}</span>
            <button type="button" className="px-3.5 py-2.5 text-zinc-300 hover:text-white" onClick={() => setQty((q) => Math.min(50, q + 1))} aria-label="Increase">+</button>
          </div>
          <button className="btn-ghost !py-3" onClick={() => addToCart(false)}>Add to Cart</button>
          <button className="btn-primary flex-1 !py-3 sm:flex-none" onClick={() => addToCart(true)}>
            Buy Now{selPkg ? ` — ${taka(Number(selPkg.price) * qty)}` : ''}
          </button>
          {msg && <span className="text-sm text-accent">{msg}</span>}
        </div>
      </div>
    </div>
  );
}
