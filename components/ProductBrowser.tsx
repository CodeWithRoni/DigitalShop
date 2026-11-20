'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Category, Product } from '@/lib/types';
import { minPrice, taka } from '@/lib/utils';
import ProductIcon from './ProductIcon';

export default function ProductBrowser({ categories, products }: { categories: Category[]; products: Product[] }) {
  const [active, setActive] = useState<number | 'all'>('all');
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return products.filter((p) => (active === 'all' || p.category_id === active) && (!t || p.name.toLowerCase().includes(t)));
  }, [products, active, q]);

  return (
    <div>
      <div className="sticky top-14 z-30 -mx-4 mb-6 space-y-3 bg-bg/85 px-4 py-3 backdrop-blur-xl sm:top-16 sm:mx-0 sm:flex sm:items-center sm:justify-between sm:space-y-0 sm:rounded-2xl sm:border sm:border-white/[0.06] sm:p-2">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <Chip on={active === 'all'} onClick={() => setActive('all')}>All</Chip>
          {categories.map((c) => <Chip key={c.id} on={active === c.id} onClick={() => setActive(c.id)}>{c.name}</Chip>)}
        </div>
        <div className="relative sm:w-64">
          <svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" className="input !bg-white/[0.04] !pl-10" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {list.map((p, i) => {
          const min = minPrice(p.packages);
          return (
            <Link key={p.id} href={`/product/${p.slug}`} style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
              className="card group relative flex animate-fade-up flex-col p-4 transition duration-300 hover:-translate-y-1 hover:border-brand/50 hover:bg-white/[0.05] hover:shadow-xl hover:shadow-brand/10 sm:p-5">
              <div className="flex items-start justify-between">
                <span className="transition duration-300 group-hover:scale-110"><ProductIcon src={p.image_url} name={p.name} size={46} /></span>
                {p.is_featured && <span className="rounded-md bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-accent">Hot</span>}
              </div>
              <div className="mt-3 line-clamp-2 text-sm font-semibold leading-snug sm:text-[15px]">{p.name}</div>
              <div className="mt-auto pt-3 text-sm">
                {min !== null ? <><span className="text-xs text-zinc-500">from </span><span className="font-bold text-white">{taka(min)}</span></> : <span className="text-xs text-zinc-500">Coming soon</span>}
              </div>
            </Link>
          );
        })}
      </div>
      {!list.length && <p className="py-16 text-center text-zinc-500">No products found.</p>}
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${on ? 'bg-white text-zinc-900' : 'bg-white/[0.05] text-zinc-400 hover:bg-white/10 hover:text-white'}`}>
      {children}
    </button>
  );
}
