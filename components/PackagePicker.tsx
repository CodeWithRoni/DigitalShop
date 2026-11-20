'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Product } from '@/lib/types';
import { taka } from '@/lib/utils';
import { useCart } from './CartProvider';

export default function PackagePicker({ product }: { product: Product }) {
  const pkgs = product.packages || [];
  const [selected, setSelected] = useState<number | null>(pkgs[0]?.id ?? null);
  const [info, setInfo] = useState('');
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const { add } = useCart();
  const router = useRouter();
  const sel = pkgs.find((p) => p.id === selected);

  if (!pkgs.length) return <div className="card p-6 text-sm text-zinc-400">No packages available right now.</div>;

  function addToCart(goCheckout: boolean) {
    if (!sel) return setMsg({ ok: false, text: 'Please select a package' });
    if (!info.trim()) {
      document.getElementById('delivery-info')?.focus();
      return setMsg({ ok: false, text: `Please enter ${product.delivery_label}` });
    }
    add({
      productId: product.id, packageId: sel.id, productName: product.name, packageName: sel.name,
      slug: product.slug, image: product.image_url, price: Number(sel.price), quantity: qty,
      deliveryLabel: product.delivery_label, deliveryInfo: info.trim(),
    });
    if (goCheckout) router.push('/cart');
    else { setMsg({ ok: true, text: 'Added to cart ✓' }); setTimeout(() => setMsg(null), 2000); }
  }

  return (
    <>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {pkgs.map((p) => {
          const on = selected === p.id;
          return (
            <button type="button" key={p.id} onClick={() => setSelected(p.id)} aria-pressed={on}
              className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left transition active:scale-[.98] ${on ? 'border-brand bg-brand/10' : 'border-white/10 bg-white/[0.02] hover:border-white/25'}`}>
              <span className="flex items-center gap-3">
                <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition ${on ? 'border-brand bg-brand' : 'border-zinc-600'}`}>
                  {on && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </span>
                <span className="text-sm font-medium">{p.name}</span>
              </span>
              <span className="font-bold">{taka(p.price)}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        <label htmlFor="delivery-info" className="label">{product.delivery_label} *</label>
        <input id="delivery-info" className="input !py-3" value={info} onChange={(e) => { setInfo(e.target.value); setMsg(null); }}
          placeholder={product.delivery_hint || product.delivery_label} maxLength={200} autoComplete="off" />
        {msg && <p className={`mt-2 text-sm ${msg.ok ? 'text-accent' : 'text-red-400'}`}>{msg.text}</p>}
      </div>

      {/* Desktop actions */}
      <div className="mt-5 hidden items-center gap-3 sm:flex">
        <Qty qty={qty} setQty={setQty} />
        <button className="btn-ghost !py-3" onClick={() => addToCart(false)}>Add to cart</button>
        <button className="btn-primary flex-1 !py-3" onClick={() => addToCart(true)}>Buy now{sel ? ` · ${taka(Number(sel.price) * qty)}` : ''}</button>
      </div>

      {/* Mobile sticky bar */}
      <div id="mobile-buy-bar" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-bg/90 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur-xl sm:hidden">
        <div className="flex items-center gap-2">
          <Qty qty={qty} setQty={setQty} />
          <button className="btn-ghost !px-3.5 !py-3" onClick={() => addToCart(false)} aria-label="Add to cart">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          </button>
          <button className="btn-primary flex-1 !py-3" onClick={() => addToCart(true)}>Buy{sel ? ` · ${taka(Number(sel.price) * qty)}` : ''}</button>
        </div>
      </div>
    </>
  );
}

function Qty({ qty, setQty }: { qty: number; setQty: (f: (q: number) => number) => void }) {
  return (
    <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.03]">
      <button type="button" className="px-3 py-2.5 text-zinc-300" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">−</button>
      <span className="w-6 text-center text-sm font-semibold">{qty}</span>
      <button type="button" className="px-3 py-2.5 text-zinc-300" onClick={() => setQty((q) => Math.min(50, q + 1))} aria-label="Increase">+</button>
    </div>
  );
}
