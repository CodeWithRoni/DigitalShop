import Link from 'next/link';
import { db } from '@/lib/db';
import { toggleProduct } from '../../actions';
import ProductIcon from '@/components/ProductIcon';
import { minPrice, taka } from '@/lib/utils';

export default async function Products({ searchParams }: { searchParams: { q?: string } }) {
  const [products, cats] = await Promise.all([db.listProducts({ includeInactive: true }), db.listCategories()]);
  const q = (searchParams.q || '').toLowerCase();
  const list = products.filter((p) => !q || p.name.toLowerCase().includes(q));
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Products</h1>
        <div className="flex gap-2">
          <form><input name="q" defaultValue={searchParams.q} placeholder="Search…" className="input !w-48" /></form>
          <Link href="/admin/products/new" className="btn-primary">+ New product</Link>
        </div>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-line text-xs uppercase text-zinc-500">
            <tr><th className="p-3">Product</th><th className="p-3">Category</th><th className="p-3">Packages</th><th className="p-3">From</th><th className="p-3">Visible</th><th className="p-3" /></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {list.map((p) => (
              <tr key={p.id} className={p.is_active ? '' : 'opacity-50'}>
                <td className="p-3"><Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 font-semibold hover:text-brand">
                  <ProductIcon src={p.image_url} name={p.name} size={36} />{p.name}{p.is_featured && <span className="text-xs text-yellow-400">★</span>}</Link></td>
                <td className="p-3 text-zinc-400">{cats.find((c) => c.id === p.category_id)?.name || '—'}</td>
                <td className="p-3">{p.packages?.length || 0}</td>
                <td className="p-3">{(() => { const m = minPrice(p.packages); return m === null ? '—' : taka(m); })()}</td>
                <td className="p-3">
                  <form action={toggleProduct}><input type="hidden" name="id" value={p.id} />
                    <button className={`badge ${p.is_active ? 'border-green-500/30 bg-green-500/10 text-green-300' : 'border-line text-zinc-400'}`}>{p.is_active ? 'Active' : 'Hidden'}</button>
                  </form>
                </td>
                <td className="p-3 text-right"><Link href={`/admin/products/${p.id}`} className="text-brand hover:underline">Edit</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
