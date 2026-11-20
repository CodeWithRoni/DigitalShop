import { db } from '@/lib/db';
import { deleteCategory, saveCategory } from '../../actions';
import ConfirmButton from '@/components/ConfirmButton';
import { PageHeader } from '@/components/admin/ui';

export default async function Categories(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams;
  const [cats, products] = await Promise.all([db.listCategories(), db.listProducts({ includeInactive: true })]);
  return (
    <div className="max-w-4xl">
      <PageHeader title="Categories" subtitle="Group products on the storefront" />
      {searchParams.error && <p className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{searchParams.error}</p>}
      <div className="card divide-y divide-line">
        {cats.map((c) => (
          <div key={c.id} className="flex flex-wrap items-end gap-2 p-3">
            <form action={saveCategory} className="flex flex-1 flex-wrap items-end gap-2">
              <input type="hidden" name="id" value={c.id} />
              <div className="w-44"><label className="label">Name</label><input name="name" defaultValue={c.name} className="input !py-1.5" /></div>
              <div className="w-32"><label className="label">Slug</label><input name="slug" defaultValue={c.slug} className="input !py-1.5" /></div>
              <div className="min-w-[160px] flex-1"><label className="label">Description</label><input name="description" defaultValue={c.description || ''} className="input !py-1.5" /></div>
              <div className="w-16"><label className="label">Order</label><input name="sort_order" type="number" defaultValue={c.sort_order} className="input !py-1.5" /></div>
              <button className="btn-ghost !px-3 !py-1.5">Save</button>
            </form>
            <form action={deleteCategory}>
              <input type="hidden" name="id" value={c.id} />
              <ConfirmButton message={`Delete category "${c.name}"? Its ${products.filter((p) => p.category_id === c.id).length} products become uncategorized.`} className="!px-3 !py-1.5 text-sm text-red-400">Delete</ConfirmButton>
            </form>
          </div>
        ))}
        <form action={saveCategory} className="flex flex-wrap items-end gap-2 bg-brand/5 p-3">
          <div className="w-44"><label className="label">New category</label><input name="name" required className="input !py-1.5" placeholder="Gift Cards" /></div>
          <div className="min-w-[160px] flex-1"><label className="label">Description</label><input name="description" className="input !py-1.5" /></div>
          <div className="w-16"><label className="label">Order</label><input name="sort_order" type="number" defaultValue={cats.length} className="input !py-1.5" /></div>
          <button className="btn-primary !px-4 !py-1.5">+ Add</button>
        </form>
      </div>
    </div>
  );
}
