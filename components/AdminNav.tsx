'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  ['/admin', 'Dashboard'],
  ['/admin/orders', 'Orders'],
  ['/admin/products', 'Products'],
  ['/admin/categories', 'Categories'],
];
export default function AdminNav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:pb-0">
      {LINKS.map(([href, label]) => {
        const on = href === '/admin' ? path === href : path.startsWith(href);
        return (
          <Link key={href} href={href}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm ${on ? 'bg-brand/15 font-semibold text-brand' : 'text-zinc-300 hover:bg-white/5'}`}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
