import type { Category, Product } from '@/lib/types';
import { saveProduct } from '@/app/admin/actions';

export default function ProductForm({ product, categories }: { product?: Product | null; categories: Category[] }) {
  const p = product;
  return (
    <form action={saveProduct} className="card space-y-4 p-5">
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label">Name *</label><input name="name" required defaultValue={p?.name} className="input" /></div>
        <div><label className="label">URL slug (auto if empty)</label><input name="slug" defaultValue={p?.slug} className="input" placeholder="netflix" /></div>
        <div><label className="label">Category</label>
          <select name="category_id" defaultValue={p?.category_id ?? ''} className="input">
            <option value="">— None —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></div>
        <div><label className="label">Sort order</label><input name="sort_order" type="number" defaultValue={p?.sort_order ?? 0} className="input" /></div>
      </div>
      <div><label className="label">Image / icon URL</label><input name="image_url" defaultValue={p?.image_url || ''} className="input" placeholder="https://…" /></div>
      <div><label className="label">Short description</label><textarea name="short_description" rows={2} defaultValue={p?.short_description || ''} className="input" /></div>
      <div><label className="label">Full description (optional)</label><textarea name="description" rows={4} defaultValue={p?.description || ''} className="input" /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label">Delivery field label (what customer must enter)</label>
          <input name="delivery_label" defaultValue={p?.delivery_label || 'Email / Account info'} className="input" placeholder="Free Fire Player ID (UID)" /></div>
        <div><label className="label">Delivery field placeholder</label><input name="delivery_hint" defaultValue={p?.delivery_hint || ''} className="input" /></div>
      </div>
      <div className="flex flex-wrap gap-6 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" name="is_active" defaultChecked={p ? p.is_active : true} className="accent-[#8b5cf6]" /> Visible in store</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="is_featured" defaultChecked={p?.is_featured} className="accent-[#8b5cf6]" /> Featured on homepage</label>
      </div>
      <button className="btn-primary">{p ? 'Save product' : 'Create product'}</button>
    </form>
  );
}
