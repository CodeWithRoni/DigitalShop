import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { db } from '@/lib/db';
import { one } from '@/lib/db/pg';
import { getSettings } from '@/lib/settings';
import { gatewayConfigured } from '@/lib/payment';
import { logout } from '../actions';
import Logo from '@/components/Logo';
import AdminNav from '@/components/AdminNav';
import Icon from '@/components/admin/Icon';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin', robots: { index: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin();
  const [counts, rv, settings] = await Promise.all([
    db.countByStatus(),
    one<{ n: number }>("select count(*)::int as n from reviews where status = 'pending'"),
    getSettings(),
  ]);
  const pending = counts.processing || 0;
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr] print:block">
      <aside className="z-30 border-b lg:sticky lg:top-0 border-white/[0.06] bg-[#0a1126]/90 backdrop-blur-xl lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-2 p-4 lg:px-5 lg:py-5">
            <Link href={me.role === 'owner' ? '/admin' : '/admin/orders'}><Logo height={28} sub={me.role === 'owner' ? 'Admin' : 'Staff'} /></Link>
            <div className="flex items-center gap-1 lg:hidden">
              <Link href="/" target="_blank" className="grid h-9 w-9 place-items-center rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white" aria-label="View store"><Icon name="store" /></Link>
              <form action={logout}><button className="grid h-9 w-9 place-items-center rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white" aria-label="Sign out"><Icon name="logout" /></button></form>
            </div>
          </div>
          <AdminNav pending={pending} reviews={rv?.n || 0} role={me.role} />
          <div className="hidden shrink-0 space-y-2.5 border-t border-white/[0.04] p-3 lg:block">
            <div className="flex items-center justify-between gap-2 px-1 text-[11px]">
              <Status ok={settings.shop_open} label="" value={settings.shop_open ? 'Store open' : 'Store closed'} />
              <Status ok={gatewayConfigured} label="" value={gatewayConfigured ? 'Payments live' : 'Demo payments'} />
              <Link href="/" target="_blank" className="grid h-7 w-7 place-items-center rounded-lg text-zinc-500 hover:bg-white/5 hover:text-white" title="View store" aria-label="View store"><Icon name="store" size={15} /></Link>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] p-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand to-accent-dark text-xs font-bold uppercase">{(me.name || me.email)[0]}</span>
              <Link href="/admin/account" className="min-w-0 flex-1 text-xs hover:opacity-80"><span className="block truncate text-zinc-300">{me.name || me.email}</span><span className="text-zinc-500">{me.role === 'owner' ? 'Owner' : 'Staff'} · My account</span></Link>
              <form action={logout}><button className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 hover:bg-white/5 hover:text-white" aria-label="Sign out" title="Sign out"><Icon name="logout" size={16} /></button></form>
            </div>
          </div>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-7xl animate-fade-up">{children}</div>
      </main>
    </div>
  );
}

function Status({ ok, label, value }: { ok: boolean; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-zinc-500">{label}</span>}
      <span className="flex items-center gap-1.5 text-zinc-400">
        <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-green-400 shadow-[0_0_8px] shadow-green-400' : 'bg-yellow-400'}`} />{value}
      </span>
    </div>
  );
}
