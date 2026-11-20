'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCart } from './CartProvider';
import { WHATSAPP } from '@/lib/utils';
import Logo from './Logo';

export default function Header() {
  const { count } = useCart();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 10);
    on(); window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <header className={`sticky top-0 z-40 transition-all duration-300 ${scrolled ? 'border-b border-white/[0.06] bg-bg/70 shadow-2xl shadow-black/40 backdrop-blur-xl' : 'border-b border-transparent'}`}>
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="Home"><Logo height={36} /></Link>
        <nav className="flex items-center gap-1 text-sm text-zinc-400 sm:gap-2">
          {[['/', 'Home'], ['/#products', 'Products'], ['/track', 'Track Order']].map(([h, l], i) => (
            <Link key={h} href={h} className={`rounded-lg px-3 py-2 transition hover:bg-white/5 hover:text-white ${i < 2 ? 'hidden sm:block' : ''}`}>{l}</Link>
          ))}
          <Link href="/cart" aria-label="Cart" className="relative ml-1 grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-200 transition hover:border-brand/50">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            {count > 0 && <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-gradient-to-r from-brand to-accent-dark px-1 text-[11px] font-bold text-white">{count}</span>}
          </Link>
          {WHATSAPP && <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noreferrer" className="btn-primary ml-1 hidden !py-2 md:inline-flex">Support</a>}
        </nav>
      </div>
    </header>
  );
}
