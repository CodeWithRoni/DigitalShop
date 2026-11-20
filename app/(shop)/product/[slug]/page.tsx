import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import ProductIcon from '@/components/ProductIcon';
import PackagePicker from '@/components/PackagePicker';
import { minPrice, taka } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const p = await db.getProductBySlug(params.slug);
  return p ? { title: `${p.name} Price in Bangladesh`, description: p.short_description || undefined } : {};
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await db.getProductBySlug(params.slug);
  if (!product) notFound();
  const all = await db.listProducts();
  const related = all.filter((p) => p.category_id === product.category_id && p.id !== product.id).slice(0, 6);
  const min = minPrice(product.packages);

  return (
    <div className="container-x py-8">
      <nav className="mb-5 text-xs text-zinc-500">
        <Link href="/" className="hover:text-white">Home</Link> / {product.categories?.name && <>
          <Link href={`/#${product.categories.slug}`} className="hover:text-white">{product.categories.name}</Link> / </>}
        <span className="text-zinc-300">{product.name}</span>
      </nav>

      <div className="card relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 animate-blob rounded-full bg-brand/25 blur-3xl" />
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-50" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="w-fit shrink-0 rounded-[14px] bg-gradient-to-br from-brand to-accent-dark p-[2px] shadow-2xl shadow-brand/30"><ProductIcon src={product.image_url} name={product.name} size={88} /></div>
          <div>
            {product.categories && <span className="badge mb-2 border-line bg-white/5 text-zinc-300">{product.categories.name}</span>}
            <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{product.name} <span className="font-semibold text-zinc-400">— Price in Bangladesh</span></h1>
            {product.short_description && <p className="mt-2 max-w-2xl text-sm text-zinc-400">{product.short_description}</p>}
            {min !== null && <span className="btn-primary mt-4 !cursor-default !py-1.5">Starting from {taka(min)}</span>}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <h2 className="font-display text-xl font-bold">All {product.name} packages &amp; prices</h2>
          <p className="mb-4 mt-1 text-sm text-zinc-400">Select a package → enter delivery info → pay online. Done.</p>
          <PackagePicker product={product} />
          {product.description && <div className="card mt-6 whitespace-pre-line p-5 text-sm text-zinc-300">{product.description}</div>}
        </div>
        <aside className="card h-fit p-5 text-sm">
          <div className="mb-3 font-semibold">Why buy here?</div>
          <ul className="space-y-2 text-zinc-300">
            {['Best BDT price', 'Delivery usually within 15 min', '100% original — no mods', 'bKash / Nagad / Rocket / Card', 'Support in Bangla & English', 'Money-back on failed delivery'].map((t) => (
              <li key={t}><span className="text-accent">✓</span> {t}</li>
            ))}
          </ul>
        </aside>
      </div>

      {related.length > 0 && (
        <div className="mt-12">
          <h3 className="mb-4 text-lg font-bold">More in {product.categories?.name}</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {related.map((p) => (
              <Link key={p.id} href={`/product/${p.slug}`} className="card flex flex-col items-center gap-2 p-4 text-center text-xs hover:border-brand/50">
                <ProductIcon src={p.image_url} name={p.name} size={44} />{p.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
