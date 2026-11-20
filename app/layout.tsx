import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SHOP_NAME, SITE_URL } from '@/lib/utils';

const DESCRIPTION = 'Netflix, Spotify, ChatGPT, Canva, VPN, gift cards and game top-up at the best BDT price. Pay with bKash, Nagad, Rocket or card.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SHOP_NAME} — Digital Subscriptions & Top-Up in Bangladesh`, template: `%s – ${SHOP_NAME}` },
  description: DESCRIPTION,
  applicationName: SHOP_NAME,
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icon-180.png', sizes: '180x180' }],
  },
  openGraph: {
    type: 'website', siteName: SHOP_NAME, title: `${SHOP_NAME} — Digital Subscriptions & Top-Up`,
    description: DESCRIPTION, images: [{ url: '/og-image.png', width: 1200, height: 630, alt: SHOP_NAME }],
  },
  twitter: { card: 'summary_large_image', images: ['/og-image.png'] },
};

export const viewport: Viewport = { themeColor: '#080E20', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
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
