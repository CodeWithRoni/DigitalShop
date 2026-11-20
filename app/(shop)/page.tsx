import Link from 'next/link';
import { db } from '@/lib/db';
import ProductBrowser from '@/components/ProductBrowser';
import ProductIcon from '@/components/ProductIcon';
import Reveal from '@/components/Reveal';
import { SHOP_NAME, minPrice, taka } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const FAQ = [
  ['কিভাবে অর্ডার করবো?', 'প্রোডাক্ট সিলেক্ট করুন → প্যাকেজ বাছাই করুন → ডেলিভারি তথ্য (ইমেইল/গেম আইডি) দিন → bKash, Nagad, Rocket বা কার্ডে পেমেন্ট করুন। পেমেন্ট সাথে সাথে কনফার্ম হয়ে যাবে।'],
  ['কত সময়ে ডেলিভারি পাবো?', 'সাধারণত পেমেন্টের ১৫ মিনিটের মধ্যে। ডেলিভারি হলে "Track Order" পেজে আপনার অ্যাকাউন্ট/কোড দেখতে পাবেন।'],
  ['অর্ডার স্ট্যাটাস কিভাবে দেখবো?', 'Track Order পেজে অর্ডার কোড আর ফোন নম্বর দিন।'],
  ['রিফান্ড পাবো?', 'ডেলিভারি না হলে বা অ্যাক্টিভেশন ফেইল করলে সম্পূর্ণ টাকা ফেরত দেওয়া হয়।'],
];

const FEATURES = [
  ['M13 2 4 14h7l-1 8 9-12h-7l1-8z', 'Fast delivery', 'Most orders are delivered within minutes of payment.'],
  ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'Secure checkout', 'Pay through SSLCommerz — we never see your card or PIN.'],
  ['M3 3h18v4H3zM5 7v14h14V7M9 11h6', 'Live order tracking', 'Follow your order and get delivery details on one page.'],
  ['M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5', 'Money-back promise', 'Full refund if we can’t deliver your order.'],
];

export default async function Home() {
  const [categories, products] = await Promise.all([db.listCategories(), db.listProducts()]);
  const featured = products.filter((p) => p.is_featured);
  const orbit = (featured.length >= 4 ? featured : products).slice(0, 6);
  const spotlight = orbit[0];
  const spotlightMin = spotlight ? minPrice(spotlight.packages) : null;

  return (
    <>
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden">
        <div className="grid-bg pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute -left-32 top-10 h-96 w-96 animate-blob rounded-full bg-brand/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-40 h-80 w-80 animate-blob rounded-full bg-accent/20 blur-3xl [animation-delay:-6s]" />

        <div className="container-x relative grid items-center gap-14 pb-20 pt-14 md:grid-cols-[1.25fr_1fr] md:pb-28 md:pt-20">
          <div className="animate-fade-up">
            <span className="eyebrow">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ring rounded-full bg-accent" /><span className="relative inline-flex h-2 w-2 rounded-full bg-accent" /></span>
              Instant digital delivery in Bangladesh
            </span>
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl xl:text-[3.6rem]">
              Your favourite apps,<br /><span className="text-gradient">unlocked in minutes.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-zinc-400 sm:text-lg">
              Streaming, AI tools, design apps, VPN and game top-ups — priced in taka, paid with bKash, Nagad, Rocket or card.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="#products" className="btn-primary !px-6 !py-3 text-base">
                Browse products
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
              </Link>
              <Link href="/track" className="btn-ghost !px-6 !py-3 text-base">Track an order</Link>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-zinc-400">
              {['No international card needed', 'Secure payment', 'Bangla support'].map((t) => (
                <span key={t} className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10D7EF" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>{t}
                </span>
              ))}
            </div>
          </div>

          {/* Visual: order card with orbiting products */}
          <div className="relative mx-auto hidden h-[420px] w-full max-w-[440px] md:block">
            <div className="absolute inset-8 rounded-full border border-white/[0.06]" />
            <div className="absolute inset-20 rounded-full border border-dashed border-white/[0.08]" />
            {spotlight && (
              <div className="card absolute left-1/2 top-1/2 w-64 -translate-x-1/2 -translate-y-1/2 p-5 shadow-2xl shadow-brand/20">
                <div className="flex items-center gap-3">
                  <ProductIcon src={spotlight.image_url} name={spotlight.name} size={44} />
                  <div>
                    <div className="text-sm font-semibold">{spotlight.name}</div>
                    <div className="text-xs text-zinc-500">{spotlight.packages?.[0]?.name}</div>
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-xs">
                  {['Payment received', 'Processing', 'Delivered'].map((s, i) => (
                    <div key={s} className="flex items-center gap-2">
                      <span className={`grid h-4 w-4 place-items-center rounded-full ${i < 3 ? 'bg-gradient-to-br from-brand to-accent-dark' : 'bg-white/10'}`}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><path d="M20 6 9 17l-5-5"/></svg>
                      </span>
                      <span className="text-zinc-300">{s}</span>
                    </div>
                  ))}
                </div>
                {spotlightMin !== null && (
                  <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
                    <span className="text-xs text-zinc-500">from</span>
                    <span className="font-display text-lg font-extrabold text-gradient">{taka(spotlightMin)}</span>
                  </div>
                )}
              </div>
            )}
            {orbit.slice(1, 6).map((p, i) => {
              const pos = [['6%', '8%'], ['72%', '2%'], ['82%', '62%'], ['4%', '68%'], ['44%', '86%']][i];
              return (
                <Link key={p.id} href={`/product/${p.slug}`} title={p.name}
                  className={`absolute rounded-2xl border border-white/10 bg-white/[0.04] p-2.5 shadow-xl shadow-black/40 backdrop-blur transition hover:scale-110 hover:border-brand/50 ${i % 2 ? 'animate-float-slow' : 'animate-float'}`}
                  style={{ left: pos[0], top: pos[1], animationDelay: `${-i * 1.3}s` }}>
                  <ProductIcon src={p.image_url} name={p.name} size={46} />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== MARQUEE ===== */}
      <section className="relative border-y border-white/[0.06] bg-white/[0.015] py-5">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-bg to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-bg to-transparent" />
        <div className="overflow-hidden">
          <div className="flex w-max animate-marquee gap-10 hover:[animation-play-state:paused]">
            {[...products, ...products].map((p, i) => (
              <Link key={i} href={`/product/${p.slug}`} className="flex items-center gap-2.5 text-sm text-zinc-400 transition hover:text-white">
                <ProductIcon src={p.image_url} name={p.name} size={26} />
                <span className="whitespace-nowrap font-medium">{p.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRODUCTS ===== */}
      <section id="products" className="container-x scroll-mt-20 py-20">
        <Reveal className="mb-10 text-center">
          <span className="eyebrow">Catalogue</span>
          <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Pick what you need</h2>
          <p className="mt-3 text-zinc-400">Choose a product to see all packages and prices.</p>
        </Reveal>
        <ProductBrowser categories={categories} products={products} />
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="container-x py-12">
        <Reveal className="mb-10 text-center">
          <span className="eyebrow">How it works</span>
          <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight">Three steps. That&apos;s it.</h2>
        </Reveal>
        <div className="relative grid gap-5 md:grid-cols-3">
          <div className="pointer-events-none absolute left-[16%] right-[16%] top-9 hidden h-px bg-gradient-to-r from-brand/0 via-brand/50 to-accent/0 md:block" />
          {[
            ['Choose', 'Pick a product and package, then enter your email or game ID.'],
            ['Pay', 'Checkout securely with bKash, Nagad, Rocket or any card.'],
            ['Enjoy', 'Get your subscription or top-up — check status anytime.'],
          ].map(([t, d], i) => (
            <Reveal key={t} delay={i * 120}>
              <div className="card relative h-full p-6 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand to-accent-dark font-display text-lg font-extrabold shadow-lg shadow-brand/30">{i + 1}</div>
                <div className="mt-4 font-display text-lg font-bold">{t}</div>
                <p className="mt-1.5 text-sm text-zinc-400">{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section className="container-x py-16">
        <Reveal className="mb-10 text-center">
          <h2 className="font-display text-3xl font-extrabold tracking-tight">Why {SHOP_NAME}?</h2>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(([icon, t, d], i) => (
            <Reveal key={t} delay={i * 80}>
              <div className="group card h-full p-6 transition hover:-translate-y-1 hover:border-brand/40">
                <div className="grid h-11 w-11 place-items-center rounded-xl border border-brand/30 bg-brand/10 text-brand-light transition group-hover:bg-brand group-hover:text-white">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={icon} /></svg>
                </div>
                <div className="mt-4 font-semibold">{t}</div>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="container-x py-12">
        <Reveal className="mb-8 text-center">
          <span className="eyebrow">FAQ</span>
          <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight">সাধারণ প্রশ্ন</h2>
        </Reveal>
        <div className="mx-auto max-w-3xl space-y-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="card group p-5 open:border-brand/30">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                {q}
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/5 text-zinc-400 transition group-open:rotate-45 group-open:bg-brand group-open:text-white">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="container-x pt-12">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-brand/30 via-brand-dark/20 to-accent/20 p-10 text-center sm:p-14">
            <div className="grid-bg pointer-events-none absolute inset-0 opacity-60" />
            <h2 className="relative font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Ready to upgrade?</h2>
            <p className="relative mx-auto mt-3 max-w-md text-zinc-300">Find your plan, pay in taka and get going in minutes.</p>
            <Link href="#products" className="btn relative mt-7 bg-white !px-7 !py-3 text-base text-zinc-900 hover:bg-zinc-200">Shop now</Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
