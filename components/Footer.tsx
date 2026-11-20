import Link from 'next/link';

import Logo from './Logo';

export default function Footer({ shopName, whatsapp, email }: { shopName: string; whatsapp?: string; email?: string }) {
  return (
    <footer className="relative mt-24 border-t border-white/[0.06]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/60 to-transparent" />
      <div className="container-x grid gap-10 py-12 text-sm text-zinc-400 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm leading-relaxed">Premium subscriptions, gift cards and game top-ups — paid in taka, delivered in minutes.</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {['bKash', 'Nagad', 'Rocket', 'Visa', 'Mastercard'].map((m) => (
              <span key={m} className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-zinc-300">{m}</span>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          <div className="mb-1 font-semibold text-white">Help</div>
          <Link href="/track" className="hover:text-white">Track Order</Link>
          <Link href="/refund" className="hover:text-white">Refund Policy</Link>
          <Link href="/terms" className="hover:text-white">Terms &amp; Conditions</Link>
        </div>
        <div className="flex flex-col gap-2.5">
          <div className="mb-1 font-semibold text-white">Contact</div>
          {whatsapp && <a href={`https://wa.me/${whatsapp}`} className="hover:text-white">WhatsApp: +{whatsapp}</a>}
          {email && <a href={`mailto:${email}`} className="hover:text-white">{email}</a>}
          <span>Bangla &amp; English support</span>
        </div>
      </div>
      <div className="border-t border-white/[0.06] py-5 text-center text-xs text-zinc-500">
        © {new Date().getFullYear()} {shopName}. All rights reserved. Independent reseller — not affiliated with the brands listed.
      </div>
    </footer>
  );
}
