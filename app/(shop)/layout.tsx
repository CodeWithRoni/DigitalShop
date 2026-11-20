import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { CartProvider } from '@/components/CartProvider';
import { getSettings } from '@/lib/settings';

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  const notice = s.notice_active && s.notice_text;
  return (
    <CartProvider>
      {notice && (
        <div className="relative z-50 bg-gradient-to-r from-brand via-accent-dark to-brand bg-[length:200%_100%] animate-gradient px-4 py-2 text-center text-sm font-medium text-white">
          {s.notice_link ? <Link href={s.notice_link} className="hover:underline">{s.notice_text} →</Link> : s.notice_text}
        </div>
      )}
      {!s.shop_open && (
        <div className="relative z-50 border-b border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-center text-sm text-yellow-200">
          🕓 {s.closed_message}
        </div>
      )}
      <Header whatsapp={s.whatsapp} />
      <main>{children}</main>
      <Footer shopName={s.shop_name} whatsapp={s.whatsapp} email={s.support_email} />
    </CartProvider>
  );
}
