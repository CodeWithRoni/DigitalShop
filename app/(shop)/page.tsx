import Link from 'next/link';
import { db } from '@/lib/db';
import ProductBrowser from '@/components/ProductBrowser';
import ProductIcon from '@/components/ProductIcon';
import Reveal from '@/components/Reveal';

export const dynamic = 'force-dynamic';

const FAQ = [
  ['কিভাবে অর্ডার করবো?', 'প্রোডাক্ট ও প্যাকেজ বাছাই করুন → ইমেইল/গেম আইডি দিন → bKash, Nagad, Rocket বা কার্ডে পেমেন্ট করুন। পেমেন্ট সাথে সাথে কনফার্ম হয়ে যাবে।'],
  ['কত সময়ে ডেলিভারি পাবো?', 'সাধারণত পেমেন্টের ১৫ মিনিটের মধ্যে। ডেলিভারি তথ্য "Track Order" পেজে দেখতে পাবেন।'],
  ['রিফান্ড পাবো?', 'ডেলিভারি না হলে বা অ্যাক্টিভেশন ফেইল করলে সম্পূর্ণ টাকা ফেরত দেওয়া হয়।'],
];

const TRUST = [
  ['M13 2 4 14h7l-1 8 9-12h-7l1-8z', 'Fast delivery', 'Usually within 15 minutes'],
  ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'Secure payment', 'bKash, Nagad, Rocket, card'],
  ['M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5', 'Money-back', 'Full refund if not delivered'],
];

export default async function Home() {
  const [categories, products] = await Promise.all([db.listCategories(), db.listProducts()]);
  const featured = products.filter((p) => p.is_featured);
  const icons = (featured.length >= 5 ? featured : products).slice(0, 5);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[820px] -translate-x-1/2 animate-glow rounded-full bg-gradient-to-r from-brand/25 to-accent/20 blur-3xl" />
        <div className="container-x relative pb-12 pt-12 text-center sm:pb-16 sm:pt-20">
          <div className="mx-auto flex w-fit -space-x-2 animate-fade-up">
            {icons.map((p, i) => (
              <div key={p.id} className="rounded-2xl ring-4 ring-bg transition hover:z-10 hover:-translate-y-1" style={{ zIndex: 5 - i }}>
                <ProductIcon src={p.image_url} name={p.name} size={44} />
              </div>
            ))}
          </div>
          <h1 className="mx-auto mt-7 max-w-3xl animate-fade-up font-display text-[2.1rem] font-extrabold leading-[1.1] tracking-tight [animation-delay:80ms] sm:text-5xl lg:text-6xl">
            Premium apps &amp; top-ups, <span className="text-gradient">paid in taka.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl animate-fade-up text-[15px] leading-relaxed text-zinc-400 [animation-delay:160ms] sm:text-lg">
            Netflix, ChatGPT, Canva, Free Fire and more — pay with bKash, Nagad, Rocket or card and get it in minutes.
          </p>
          <div className="mt-7 flex animate-fade-up flex-col justify-center gap-3 [animation-delay:240ms] sm:flex-row">
            <Link href="#products" className="btn-primary !py-3 text-base">Browse products</Link>
            <Link href="/track" className="btn-ghost !py-3 text-base">Track order</Link>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="container-x">
        <div className="card grid grid-cols-3 divide-x divide-white/[0.06]">
          {TRUST.map(([d, t, s]) => (
            <div key={t} className="flex flex-col items-center gap-1.5 px-2 py-4 text-center sm:flex-row sm:gap-3 sm:px-5 sm:text-left">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand-light">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
              </span>
              <span>
                <span className="block text-xs font-semibold sm:text-sm">{t}</span>
                <span className="hidden text-xs text-zinc-500 sm:block">{s}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Products */}
      <section id="products" className="container-x scroll-mt-16 pt-14 sm:pt-20">
        <h2 className="mb-6 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">All products</h2>
        <ProductBrowser categories={categories} products={products} />
      </section>

      {/* FAQ */}
      <section className="container-x pt-8">
        <Reveal>
          <h2 className="mb-5 font-display text-2xl font-extrabold tracking-tight">প্রশ্ন ও উত্তর</h2>
          <div className="space-y-2.5">
            {FAQ.map(([q, a]) => (
              <details key={q} className="card group px-5 py-4 open:border-brand/30">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold">
                  {q}
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-white/5 text-zinc-400 transition group-open:rotate-45 group-open:bg-brand group-open:text-white">+</span>
                </summary>
                <p className="mt-2.5 text-sm leading-relaxed text-zinc-400">{a}</p>
              </details>
            ))}
          </div>
        </Reveal>
      </section>
    </>
  );
}
