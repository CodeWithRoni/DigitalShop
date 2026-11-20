import type { Metadata } from 'next';
import './globals.css';
import { SHOP_NAME } from '@/lib/utils';

export const metadata: Metadata = {
  title: { default: `${SHOP_NAME} — Digital Subscriptions & Top-Up in Bangladesh`, template: `%s – ${SHOP_NAME}` },
  description: 'Netflix, Spotify, ChatGPT, Canva, VPN, gift cards and game top-up at the best BDT price. Pay with bKash, Nagad, Rocket or card.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
