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
  const related = all.filter((p) => p.category_id === product.category_id && p.id !== product.id).slice(0, 4);
  const min = minPrice(product.packages);

  return (
    <div className="container-x max-w-3xl pb-6 pt-6 sm:py-10">
      <Link href="/#products" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>All products
      </Link>

      <div className="mt-5 flex animate-fade-up items-center gap-4">
        <ProductIcon src={product.image_url} name={product.name} size={64} />
        <div className="min-w-0">
          {product.categories && <div className="text-xs font-medium text-brand-light">{product.categories.name}</div>}
          <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{product.name}</h1>
          {min !== null && <div className="text-sm text-zinc-400">Starting from <span className="font-semibold text-white">{taka(min)}</span></div>}
        </div>
      </div>
      {product.short_description && <p className="mt-4 text-sm leading-relaxed text-zinc-400">{product.short_description}</p>}

      <div className="mt-6 flex flex-wrap gap-2 text-xs text-zinc-300">
        {['⚡ Delivery in ~15 min', '🔒 Secure payment', '↩ Refund if not delivered'].map((t) => (
          <span key={t} className="rounded-full bg-white/[0.05] px-3 py-1.5">{t}</span>
        ))}
      </div>

      <h2 className="mb-3 mt-8 font-semibold">Choose a package</h2>
      <PackagePicker product={product} />
      {product.description && <div className="card mt-6 whitespace-pre-line p-5 text-sm leading-relaxed text-zinc-300">{product.description}</div>}

      {related.length > 0 && (
        <div className="mt-12">
          <h3 className="mb-3 font-semibold">You may also like</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {related.map((p) => {
              const m = minPrice(p.packages);
              return (
                <Link key={p.id} href={`/product/${p.slug}`} className="card flex items-center gap-3 p-3 transition hover:border-brand/50">
                  <ProductIcon src={p.image_url} name={p.name} size={36} />
                  <span className="min-w-0"><span className="block truncate text-sm font-medium">{p.name}</span>
                    {m !== null && <span className="text-xs text-zinc-500">from {taka(m)}</span>}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
