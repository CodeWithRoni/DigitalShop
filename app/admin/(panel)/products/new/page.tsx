import { requireOwner } from '@/lib/admin';
import Link from 'next/link';
import { db } from '@/lib/db';
import ProductEditor from '@/components/admin/ProductEditor';

export default async function NewProduct() {
  await requireOwner();
  const cats = await db.listCategories();
  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/admin/products" className="text-sm text-zinc-400 hover:text-white">← Products</Link>
      <h1 className="mb-1 mt-2 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Add a product</h1>
      <p className="mb-6 text-sm text-zinc-400">Fill in the 4 steps — packages and prices are saved together with the product.</p>
      <ProductEditor categories={cats} />
    </div>
  );
}
