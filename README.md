# DigitalShop — Digital subscription & top-up store (Bangladesh)

Storefront + Admin Panel + SSLCommerz payment (bKash, Nagad, Rocket, card).
Built with **Next.js 16 (App Router) + React 19 + Tailwind CSS**. Database: **Neon (PostgreSQL)**.

## Ki ki ache

**Customer site**
- Home: hero, category tab, search, product grid, FAQ
- Product page: package/dam select, delivery info (email / Player ID), quantity, Add to Cart / Buy Now
- Cart & Checkout: nam, phone, email → online payment
- Order page: status (Placed → Processing → Delivered) + admin-er pathano delivery details
- Track Order: order code + phone diye order dekha
- Refund / Terms page

**Admin Panel** (`/admin`)
- **Dashboard:** revenue, orders, average order, customers (7/30/90 days), charts, top products, "waiting for delivery" alert
- **Orders:** filters, search, date range, CSV export, **bulk actions** (mark many delivered/cancelled), timeline, history
- **Delivery message templates:** one-click messages with `{name}`, `{order}`, `{product}`… filled in
- **Refunds:** record full/partial refunds per order (amount, method, reason)
- **Customers:** grouped by phone, orders and spend, repeat buyers
- **Products:** one-page editor with live preview, packages & prices, **image upload**
- **Stock & auto-delivery:** paste gift cards / keys / logins per package — paid orders get one instantly; low-stock alerts
- **Coupons:** % or ৳ off, min order, max discount, usage limit, start/end dates
- **Reviews:** customers rate products after delivery; you approve before they show
- **Reports:** monthly sales report — Excel (CSV) download and Print / Save as PDF
- **Store settings:** shop name, WhatsApp, announcement bar, open/closed switch, notifications
- **Notifications:** Telegram (and optional email) for new paid orders, low stock, new reviews
- **Staff & roles:** add staff logins (orders only) or extra owners; deactivate anytime
- **Activity log:** who changed what and when

**Payment (SSLCommerz)**
- Checkout → SSLCommerz page → success/fail/cancel callback + IPN
- Protiti payment SSLCommerz validation API diye verify kora hoy, amount o mile dekha hoy
- Dam sobsomoy server/database theke neya hoy (browser theke dam pathiye cheat kora jabe na)
- Gateway key na thakle local-e **Demo payment** page ase (test-er jonno)

## Local-e chalano
```bash
npm install
cp .env.example .env.local     # DATABASE_URL-e Neon connection string din (ba local Postgres)
npm run dev
```
- Store: http://localhost:3000 · Admin: http://localhost:3000/admin (dev-e default `admin@demo.com` / `admin123`)
- Database table gulo app nije theke toiri kore (prothom bar chalানোর somoy). Demo product chaile `database/seed.sql` chalan.

## Neon database setup
1. https://neon.tech -e account khulun → **New Project** (Region: **Singapore** — Bangladesh-er kachakachi)
2. (Optional) Table app nije-i banay. Chaile SQL Editor-e `database/schema.sql` chalate paren.
3. Demo product chaile `database/seed.sql` o Run korun (na chaile Admin Panel theke nijer product add korun)
4. **Connect** button → **Pooled connection** on kore connection string copy korun, eta dekhte emon:
   `postgresql://user:pass@ep-xxxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`
5. `.env.local` (ar Vercel → Settings → Environment Variables)-e boshan: `DATABASE_URL=...`
6. Restart → Admin sidebar-e "Storage: Neon (Postgres)" dekhabe

`schema.sql` abar chalaleo kono data muche jabe na (sob `if not exists`).
Database password kokhono GitHub-e push korben na — sudhu `.env.local` / Vercel env-e rakhun.

## Telegram notification setup
1. Telegram-e **@BotFather** → `/newbot` → nam din → **token** pabe
2. Vercel → Settings → Environment Variables → `TELEGRAM_BOT_TOKEN` = token → Redeploy
3. Notun bot-take Telegram-e ekta message din (jemon "hi")
4. **@userinfobot**-ke message dile apnar **chat ID** pabe → Admin → Store settings → Telegram chat ID → Save → "Send test Telegram"

## SSLCommerz setup
1. Sandbox account: https://developer.sslcommerz.com/registration/
2. `.env.local`-e `SSLCZ_STORE_ID`, `SSLCZ_STORE_PASSWORD`, `SSLCZ_IS_LIVE=false`
3. `NEXT_PUBLIC_SITE_URL` e apnar public URL din (callback-er jonno). Local test-e ngrok/cloudflared lagbe.
4. SSLCommerz merchant panel-e IPN URL: `https://YOUR-DOMAIN/api/payment/ipn`
5. Live hole `SSLCZ_IS_LIVE=true` ar live store ID/password.

## Deploy (Vercel)
- **Vercel-e local JSON file kaj kore na** (read-only disk) — tai deploy-er age `DATABASE_URL` (Neon) din.
  VPS (`npm run build && npm start`)-e local file cholbe, kintu backup rakhun.
- Production-e must: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `AUTH_SECRET` (32+ character random).

## Brand / Logo
- Full brand kit: `brand/` folder (SVG source, app icons, Android launcher icons)
- Site-e use hocche: `public/logo-dark.png` (header/footer/admin), `public/mark.png` (admin login),
  `public/favicon.ico` + `icon-*.png` (browser/phone icon), `public/site.webmanifest`, `public/og-image.png` (share preview)
- Brand colors: navy `#080E20`, purple `#7B2FF7`, blue `#3677FF`, cyan `#10D7EF` (`tailwind.config.ts`)

## Customize
| Ki | Kothay |
|---|---|
| Shop nam, WhatsApp | `.env` → `NEXT_PUBLIC_SHOP_NAME`, `NEXT_PUBLIC_WHATSAPP` (880 diye) |
| Rong | `tailwind.config.ts` → `brand`, `accent` |
| Logo | `public/logo-dark.png` replace korun |
| Home text, FAQ | `app/(shop)/page.tsx` |
| Refund / Terms | `app/(shop)/refund/page.tsx`, `app/(shop)/terms/page.tsx` |
| Product, dam | Admin Panel theke |

## Folder
```
app/(shop)/        customer pages
app/admin/         admin panel (+ actions.ts = sob admin kaj)
app/api/           checkout, payment callbacks, track, repay
lib/db/            storage: local.ts (JSON demo) / postgres.ts (Neon) — same interface
lib/sslcommerz.ts  gateway; lib/payment.ts verify logic
database/          schema.sql, seed.sql (Neon SQL Editor-e chalan)
```
