import { requireOwner } from '@/lib/admin';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import ProductEditor from '@/components/admin/ProductEditor';
import ConfirmButton from '@/components/ConfirmButton';
import { deleteProduct } from '../../../actions';

export default async function EditProduct(props: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  await requireOwner();
  const [params, searchParams] = await Promise.all([props.params, props.searchParams]);
  const [p, cats] = await Promise.all([db.getProductById(Number(params.id)), db.listCategories()]);
  if (!p) notFound();
  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/admin/products" className="text-sm text-zinc-400 hover:text-white">← Products</Link>
      <div className="mb-6 mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{p.name}</h1>
        <div className="flex items-center gap-3">
          {searchParams.saved && <span className="rounded-full bg-green-500/10 px-3 py-1 text-sm text-green-300">✓ Saved</span>}
          {p.is_active && <Link href={`/product/${p.slug}`} target="_blank" className="btn-ghost !py-2">View in store ↗</Link>}
        </div>
      </div>
      <ProductEditor key={p.id + (searchParams.saved ? '-s' : '')} product={p} categories={cats} />
      <section className="card -mt-20 mb-24 flex flex-col gap-3 border-red-500/20 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-semibold text-red-300">Delete product</div>
          <div className="text-sm text-zinc-500">Removes it and its packages from the store. Past orders keep their item names.</div>
        </div>
        <form action={deleteProduct}>
          <input type="hidden" name="id" value={p.id} />
          <ConfirmButton message={`Delete "${p.name}" and all its packages?`} className="btn-danger">Delete</ConfirmButton>
        </form>
      </section>
    </div>
  );
}
