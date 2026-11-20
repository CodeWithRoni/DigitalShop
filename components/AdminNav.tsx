'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon, { type IconName } from './admin/Icon';

type L = { href: string; label: string; icon: IconName; owner?: boolean };
const GROUPS: { title: string; links: L[] }[] = [
  { title: 'Sales', links: [
    { href: '/admin', label: 'Dashboard', icon: 'dashboard', owner: true },
    { href: '/admin/orders', label: 'Orders', icon: 'orders' },
    { href: '/admin/customers', label: 'Customers', icon: 'customers' },
    { href: '/admin/reports', label: 'Reports', icon: 'report', owner: true },
  ] },
  { title: 'Catalogue', links: [
    { href: '/admin/products', label: 'Products', icon: 'products', owner: true },
    { href: '/admin/categories', label: 'Categories', icon: 'categories', owner: true },
    { href: '/admin/stock', label: 'Stock & keys', icon: 'key', owner: true },
    { href: '/admin/coupons', label: 'Coupons', icon: 'tag', owner: true },
    { href: '/admin/reviews', label: 'Reviews', icon: 'star', owner: true },
  ] },
  { title: 'Settings', links: [
    { href: '/admin/templates', label: 'Message templates', icon: 'message' },
    { href: '/admin/settings', label: 'Store settings', icon: 'settings', owner: true },
    { href: '/admin/staff', label: 'Staff', icon: 'shield', owner: true },
    { href: '/admin/activity', label: 'Activity log', icon: 'activity', owner: true },
  ] },
];

export default function AdminNav({ pending = 0, reviews = 0, role }: { pending?: number; reviews?: number; role: 'owner' | 'staff' }) {
  const path = usePathname();
  const badge: Record<string, number> = { '/admin/orders': pending, '/admin/reviews': reviews };
  return (
    <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 lg:min-h-0 lg:flex-1 lg:flex-col lg:gap-0 lg:overflow-y-auto lg:pb-0">
      {GROUPS.map((g) => {
        const links = g.links.filter((l) => role === 'owner' || !l.owner);
        if (!links.length) return null;
        return (
          <div key={g.title} className="flex gap-1 lg:mb-3 lg:flex-col lg:gap-0">
            <div className="hidden px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600 lg:block">{g.title}</div>
            {links.map(({ href, label, icon }) => {
              const on = href === '/admin' ? path === href : path.startsWith(href);
              return (
                <Link key={href} href={href}
                  className={`group relative flex shrink-0 items-center gap-3 rounded-xl px-3 py-[7px] text-sm transition ${on ? 'bg-gradient-to-r from-brand/20 to-brand/5 font-semibold text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
                  {on && <span className="absolute inset-y-2 left-0 hidden w-1 rounded-full bg-gradient-to-b from-brand to-accent-dark lg:block" />}
                  <Icon name={icon} size={17} className={on ? 'text-brand-light' : 'text-zinc-500 group-hover:text-zinc-300'} />
                  {label}
                  {badge[href] > 0 && (
                    <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-accent/20 px-1.5 text-[11px] font-bold text-accent">{badge[href]}</span>
                  )}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
