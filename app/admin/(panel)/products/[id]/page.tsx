import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import ProductForm from '@/components/ProductForm';
import ConfirmButton from '@/components/ConfirmButton';
import { deletePackage, deleteProduct, savePackage } from '../../../actions';

export default async function EditProduct(props: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string }> }) {
  const [params, searchParams] = await Promise.all([props.params, props.searchParams]);
  const [p, cats] = await Promise.all([db.getProductById(Number(params.id)), db.listCategories()]);
  if (!p) notFound();
  return (
    <div className="max-w-3xl">
      <Link href="/admin/products" className="text-sm text-zinc-400 hover:text-white">← Products</Link>
      <div className="mb-6 mt-2 flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{p.name}</h1>
        {p.is_active && <Link href={`/product/${p.slug}`} target="_blank" className="text-sm text-brand hover:underline">View in store ↗</Link>}
      </div>
      {searchParams.error && <p className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{searchParams.error}</p>}
      {searchParams.saved && <p className="mb-4 rounded-lg bg-green-500/10 p-3 text-sm text-green-200">Saved ✓</p>}

      <h2 className="mb-3 text-lg font-semibold">Packages &amp; prices</h2>
      <div className="card mb-8 divide-y divide-line">
        {p.packages?.map((k) => (
          <div key={k.id} className="flex flex-wrap items-end gap-2 p-3">
            <form action={savePackage} className="flex flex-1 flex-wrap items-end gap-2">
              <input type="hidden" name="id" value={k.id} /><input type="hidden" name="product_id" value={p.id} />
              <div className="min-w-[160px] flex-1"><label className="label">Name</label><input name="name" defaultValue={k.name} className="input !py-1.5" /></div>
              <div className="w-28"><label className="label">Price ৳</label><input name="price" type="number" step="0.01" min="0" defaultValue={k.price} className="input !py-1.5" /></div>
              <div className="w-16"><label className="label">Order</label><input name="sort_order" type="number" defaultValue={k.sort_order} className="input !py-1.5" /></div>
              <label className="flex items-center gap-1.5 pb-2 text-xs"><input type="checkbox" name="is_active" defaultChecked={k.is_active} className="accent-[#7B2FF7]" />Active</label>
              <button className="btn-ghost !px-3 !py-1.5">Save</button>
            </form>
            <form action={deletePackage}>
              <input type="hidden" name="id" value={k.id} /><input type="hidden" name="product_id" value={p.id} />
              <ConfirmButton message={`Delete package "${k.name}"?`} className="!px-3 !py-1.5 text-red-400 hover:text-red-300">Delete</ConfirmButton>
            </form>
          </div>
        ))}
        <form action={savePackage} className="flex flex-wrap items-end gap-2 bg-brand/5 p-3">
          <input type="hidden" name="product_id" value={p.id} /><input type="hidden" name="is_active" value="on" />
          <div className="min-w-[160px] flex-1"><label className="label">New package name</label><input name="name" required placeholder="1 Month" className="input !py-1.5" /></div>
          <div className="w-28"><label className="label">Price ৳</label><input name="price" type="number" step="0.01" min="0" required className="input !py-1.5" /></div>
          <div className="w-16"><label className="label">Order</label><input name="sort_order" type="number" defaultValue={(p.packages?.length || 0)} className="input !py-1.5" /></div>
          <button className="btn-primary !px-4 !py-1.5">+ Add</button>
        </form>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Product details</h2>
      <ProductForm product={p} categories={cats} />

      <form action={deleteProduct} className="mt-8 border-t border-line pt-6">
        <input type="hidden" name="id" value={p.id} />
        <ConfirmButton message={`Delete "${p.name}" and all its packages? Old orders keep their item names.`} className="btn-danger">Delete product</ConfirmButton>
      </form>
    </div>
  );
}
