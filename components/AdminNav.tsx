'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon, { type IconName } from './admin/Icon';

const LINKS: [string, string, IconName][] = [
  ['/admin', 'Dashboard', 'dashboard'],
  ['/admin/orders', 'Orders', 'orders'],
  ['/admin/customers', 'Customers', 'customers'],
  ['/admin/products', 'Products', 'products'],
  ['/admin/categories', 'Categories', 'categories'],
];

export default function AdminNav({ pending = 0 }: { pending?: number }) {
  const path = usePathname();
  return (
    <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:pb-0">
      {LINKS.map(([href, label, icon]) => {
        const on = href === '/admin' ? path === href : path.startsWith(href);
        return (
          <Link key={href} href={href}
            className={`group relative flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${on ? 'bg-gradient-to-r from-brand/20 to-brand/5 font-semibold text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
            {on && <span className="absolute inset-y-2 left-0 hidden w-1 rounded-full bg-gradient-to-b from-brand to-accent-dark lg:block" />}
            <Icon name={icon} className={on ? 'text-brand-light' : 'text-zinc-500 group-hover:text-zinc-300'} />
            {label}
            {href === '/admin/orders' && pending > 0 && (
              <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-accent/20 px-1.5 text-[11px] font-bold text-accent">{pending}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
