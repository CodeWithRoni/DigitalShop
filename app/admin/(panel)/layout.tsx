import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { usingSupabase } from '@/lib/db';
import { gatewayConfigured } from '@/lib/payment';
import { logout } from '../actions';
import Logo from '@/components/Logo';
import AdminNav from '@/components/AdminNav';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin', robots: { index: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const email = await requireAdmin();
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[230px_1fr]">
      <aside className="border-b border-line bg-white/[0.02] lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-2 p-4 lg:block">
          <Link href="/admin"><Logo size={30} sub="Admin" /></Link>
          <Link href="/" target="_blank" className="text-xs text-zinc-400 hover:text-white lg:mt-2 lg:block">View store ↗</Link>
        </div>
        <AdminNav />
        <div className="hidden space-y-2 p-4 text-xs text-zinc-500 lg:block">
          <div>Storage: <span className={usingSupabase ? 'text-brand' : 'text-yellow-400'}>{usingSupabase ? 'Supabase' : 'Local demo file'}</span></div>
          <div>Payment: <span className={gatewayConfigured ? 'text-brand' : 'text-yellow-400'}>{gatewayConfigured ? 'SSLCommerz' : 'Demo mode'}</span></div>
          <div className="truncate pt-2">{email}</div>
          <form action={logout}><button className="text-zinc-400 hover:text-white">Sign out</button></form>
        </div>
      </aside>
      <main className="min-w-0 p-4 sm:p-8">{children}</main>
    </div>
  );
}
