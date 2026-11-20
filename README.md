# DigitalShop — Digital subscription & top-up store (Bangladesh)

Storefront + Admin Panel + SSLCommerz payment (bKash, Nagad, Rocket, card).
Built with **Next.js 14 (App Router) + Tailwind CSS**. Database: **Supabase (optional)**.

## Ki ki ache

**Customer site**
- Home: hero, category tab, search, product grid, FAQ
- Product page: package/dam select, delivery info (email / Player ID), quantity, Add to Cart / Buy Now
- Cart & Checkout: nam, phone, email → online payment
- Order page: status (Placed → Processing → Delivered) + admin-er pathano delivery details
- Track Order: order code + phone diye order dekha
- Refund / Terms page

**Admin Panel** (`/admin`)
- Dashboard: delivery baki order, aj-er sale, mot revenue, pending payment
- Orders: status filter, search (code/nam/phone), order detail, status + payment status change,
  customer-ke delivery message pathano (login info ityadi), internal note, WhatsApp button
- Products: add/edit/hide/delete, package & dam add/edit/delete, featured
- Categories: add/edit/delete

**Payment (SSLCommerz)**
- Checkout → SSLCommerz page → success/fail/cancel callback + IPN
- Protiti payment SSLCommerz validation API diye verify kora hoy, amount o mile dekha hoy
- Dam sobsomoy server/database theke neya hoy (browser theke dam pathiye cheat kora jabe na)
- Gateway key na thakle local-e **Demo payment** page ase (test-er jonno)

## Local-e chalano (database chara)

```bash
npm install
cp .env.example .env.local     # Supabase line gulo khali rakhun
npm run dev
```
- Store: http://localhost:3000
- Admin: http://localhost:3000/admin  → dev-e default `admin@demo.com` / `admin123`
- Data `data/local-db.json` file-e save hoy (prothom bar `data/seed.json` theke demo product ase).
  Reset korte file-ta delete korun.

## Pore Supabase jog kora (kono code change lagbe na)
1. Supabase-e project banan → SQL Editor-e `supabase/schema.sql` chalan, tarpor `supabase/seed.sql` (demo product chaile)
2. `.env.local`-e `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` din
3. Restart → admin sidebar-e "Storage: Supabase" dekhabe

Sob table-e RLS on, kono policy nei — mane browser theke keu sorasori database dhorte parbe na;
sob kaj server (service-role key) diye hoy.

## SSLCommerz setup
1. Sandbox account: https://developer.sslcommerz.com/registration/
2. `.env.local`-e `SSLCZ_STORE_ID`, `SSLCZ_STORE_PASSWORD`, `SSLCZ_IS_LIVE=false`
3. `NEXT_PUBLIC_SITE_URL` e apnar public URL din (callback-er jonno). Local test-e ngrok/cloudflared lagbe.
4. SSLCommerz merchant panel-e IPN URL: `https://YOUR-DOMAIN/api/payment/ipn`
5. Live hole `SSLCZ_IS_LIVE=true` ar live store ID/password.

## Deploy (Vercel)
- **Vercel-e local JSON file kaj kore na** (read-only disk) — tai deploy-er age Supabase lagbe.
  VPS (`npm run build && npm start`)-e local file cholbe, kintu backup rakhun.
- Production-e must: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `AUTH_SECRET` (32+ character random).

## Customize
| Ki | Kothay |
|---|---|
| Shop nam, WhatsApp | `.env` → `NEXT_PUBLIC_SHOP_NAME`, `NEXT_PUBLIC_WHATSAPP` (880 diye) |
| Rong | `tailwind.config.ts` → `brand` |
| Home text, FAQ | `app/(shop)/page.tsx` |
| Refund / Terms | `app/(shop)/refund/page.tsx`, `app/(shop)/terms/page.tsx` |
| Product, dam | Admin Panel theke |

## Folder
```
app/(shop)/        customer pages
app/admin/         admin panel (+ actions.ts = sob admin kaj)
app/api/           checkout, payment callbacks, track, repay
lib/db/            storage: local.ts (JSON) / supabase.ts — same interface
lib/sslcommerz.ts  gateway; lib/payment.ts verify logic
supabase/          schema.sql, seed.sql
```
