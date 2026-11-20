import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { db, usingDatabase } from '@/lib/db';
import { gatewayConfigured } from '@/lib/payment';
import { logout } from '../actions';
import Logo from '@/components/Logo';
import AdminNav from '@/components/AdminNav';
import Icon from '@/components/admin/Icon';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin', robots: { index: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const email = await requireAdmin();
  const counts = await db.countByStatus();
  const pending = counts.processing || 0;
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="z-30 border-b lg:sticky lg:top-0 border-white/[0.06] bg-[#0a1126]/90 backdrop-blur-xl lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-2 p-4 lg:px-5 lg:py-6">
            <Link href="/admin"><Logo height={28} sub="Admin" /></Link>
            <div className="flex items-center gap-1 lg:hidden">
              <Link href="/" target="_blank" className="grid h-9 w-9 place-items-center rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white" aria-label="View store"><Icon name="store" /></Link>
              <form action={logout}><button className="grid h-9 w-9 place-items-center rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white" aria-label="Sign out"><Icon name="logout" /></button></form>
            </div>
          </div>
          <AdminNav pending={pending} />
          <div className="mt-auto hidden space-y-3 p-4 lg:block">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs">
              <Status ok={usingDatabase} label="Database" value={usingDatabase ? 'Neon connected' : 'Local demo file'} />
              <Status ok={gatewayConfigured} label="Payment" value={gatewayConfigured ? 'SSLCommerz live' : 'Demo mode'} />
            </div>
            <Link href="/" target="_blank" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-zinc-400 hover:bg-white/5 hover:text-white">
              <Icon name="store" className="text-zinc-500" /> View store <Icon name="external" size={13} className="ml-auto text-zinc-600" />
            </Link>
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] p-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand to-accent-dark text-xs font-bold uppercase">{email[0]}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-zinc-400">{email}</span>
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
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-zinc-500">{label}</span>
      <span className="flex items-center gap-1.5 text-zinc-300">
        <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-green-400 shadow-[0_0_8px] shadow-green-400' : 'bg-yellow-400'}`} />{value}
      </span>
    </div>
  );
}
