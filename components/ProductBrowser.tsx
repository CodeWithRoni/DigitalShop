'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Category, Product } from '@/lib/types';
import { minPrice, taka } from '@/lib/utils';
import ProductIcon from './ProductIcon';

export default function ProductBrowser({ categories, products }: { categories: Category[]; products: Product[] }) {
  const [active, setActive] = useState<number | 'all'>('all');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return products.filter((p) => (active === 'all' || p.category_id === active) && (!t || p.name.toLowerCase().includes(t)));
  }, [products, active, q]);

  const groups = categories.map((c) => ({ c, items: filtered.filter((p) => p.category_id === c.id) })).filter((g) => g.items.length);
  const uncategorized = filtered.filter((p) => !categories.some((c) => c.id === p.category_id));

  return (
    <div>
      <div className="card sticky top-16 z-30 sm:top-[72px] mb-10 flex flex-col gap-3 !bg-bg/95 p-2 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-1 overflow-x-auto">
          <Tab on={active === 'all'} onClick={() => setActive('all')}>All</Tab>
          {categories.map((c) => <Tab key={c.id} on={active === c.id} onClick={() => setActive(c.id)}>{c.name}</Tab>)}
        </div>
        <div className="relative lg:w-72">
          <svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Netflix, Free Fire…" className="input !border-transparent !bg-white/[0.04] !pl-10" />
        </div>
      </div>

      {groups.map(({ c, items }) => (
        <section key={c.id} id={c.slug} className="mb-14 scroll-mt-40">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h3 className="font-display text-xl font-bold">{c.name}</h3>
              {c.description && <p className="mt-1 text-sm text-zinc-500">{c.description}</p>}
            </div>
            <span className="hidden text-xs text-zinc-500 sm:block">{items.length} products</span>
          </div>
          <Grid items={items} />
        </section>
      ))}
      {uncategorized.length > 0 && <Grid items={uncategorized} />}
      {!filtered.length && <p className="py-16 text-center text-zinc-500">No products match “{q}”.</p>}
    </div>
  );
}

function Tab({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition ${on ? 'bg-gradient-to-r from-brand to-brand-dark text-white shadow-lg shadow-brand/30' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
      {children}
    </button>
  );
}

function Grid({ items }: { items: Product[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {items.map((p) => {
        const min = minPrice(p.packages);
        return (
          <Link key={p.id} href={`/product/${p.slug}`}
            className="group relative rounded-2xl bg-gradient-to-br from-white/[0.09] to-white/[0.02] p-px transition duration-300 hover:-translate-y-1 hover:from-brand hover:to-accent-dark hover:shadow-2xl hover:shadow-brand/20">
            <div className="relative flex h-full flex-col overflow-hidden rounded-[15px] bg-[#0b0d19] p-5">
              <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-brand/20 opacity-0 blur-2xl transition group-hover:opacity-100" />
              <div className="flex items-start justify-between">
                <ProductIcon src={p.image_url} name={p.name} size={52} />
                {p.is_featured && <span className="rounded-md bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">Popular</span>}
              </div>
              <div className="mt-4 font-semibold leading-snug">{p.name}</div>
              <div className="mt-1 text-xs text-zinc-500">{p.packages?.length || 0} packages</div>
              <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
                <span className="text-sm">
                  {min !== null ? <><span className="text-xs text-zinc-500">from </span><span className="font-bold text-white">{taka(min)}</span></> : <span className="text-zinc-500">Coming soon</span>}
                </span>
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/5 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:bg-brand group-hover:text-white">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
