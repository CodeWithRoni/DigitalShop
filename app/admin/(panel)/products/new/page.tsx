import Link from 'next/link';
import { db } from '@/lib/db';
import ProductForm from '@/components/ProductForm';

export default async function NewProduct(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams;
  const cats = await db.listCategories();
  return (
    <div className="max-w-3xl">
      <Link href="/admin/products" className="text-sm text-zinc-400 hover:text-white">← Products</Link>
      <h1 className="mb-6 mt-2 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">New product</h1>
      {searchParams.error && <p className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{searchParams.error}</p>}
      <ProductForm categories={cats} />
      <p className="mt-3 text-sm text-zinc-500">After creating, you can add packages &amp; prices.</p>
    </div>
  );
}
