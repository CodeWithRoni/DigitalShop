'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCart } from './CartProvider';
import Logo from './Logo';

export default function Header() {
  const { count } = useCart();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on(); window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <header className={`sticky top-0 z-40 transition-colors duration-300 ${scrolled ? 'border-b border-white/[0.06] bg-bg/80 backdrop-blur-xl' : 'border-b border-transparent'}`}>
      <div className="container-x flex h-14 items-center justify-between sm:h-16">
        <Link href="/" aria-label="Home"><Logo size={30} /></Link>
        <nav className="flex items-center gap-1 text-sm text-zinc-400">
          <Link href="/#products" className="hidden rounded-lg px-3 py-2 hover:text-white sm:block">Products</Link>
          <Link href="/track" className="rounded-lg px-3 py-2 hover:text-white">Track</Link>
          <Link href="/cart" aria-label="Cart" className="relative ml-1 grid h-10 w-10 place-items-center rounded-xl bg-white/[0.05] text-zinc-200 transition hover:bg-white/10">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            {count > 0 && <span key={count} className="absolute -right-1 -top-1 grid h-5 min-w-5 animate-pop place-items-center rounded-full bg-brand px-1 text-[11px] font-bold text-white">{count}</span>}
          </Link>
        </nav>
      </div>
    </header>
  );
}
