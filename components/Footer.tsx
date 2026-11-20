import Link from 'next/link';
import { SHOP_NAME, WHATSAPP } from '@/lib/utils';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-white/[0.06]">
      <div className="container-x flex flex-col gap-6 py-8 text-sm text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
        <Logo size={28} />
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/track" className="hover:text-white">Track Order</Link>
          <Link href="/refund" className="hover:text-white">Refund</Link>
          <Link href="/terms" className="hover:text-white">Terms</Link>
          {WHATSAPP && <a href={`https://wa.me/${WHATSAPP}`} className="hover:text-white">WhatsApp</a>}
        </nav>
      </div>
      <div className="container-x border-t border-white/[0.06] py-5 text-xs text-zinc-500">
        © {new Date().getFullYear()} {SHOP_NAME} · Independent reseller, not affiliated with listed brands.
      </div>
    </footer>
  );
}
