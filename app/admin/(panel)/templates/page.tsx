import { requireAdmin } from '@/lib/admin';
import { db } from '@/lib/db';
import { listTemplates, TEMPLATE_VARS } from '@/lib/templates';
import { deleteTemplate, saveTemplate } from '../../feature-actions';
import { EmptyState, Flash, Label, PageHeader, Panel } from '@/components/admin/ui';
import ConfirmButton from '@/components/ConfirmButton';
import Icon from '@/components/admin/Icon';

export default async function Templates(props: { searchParams: Promise<{ saved?: string; error?: string; edit?: string }> }) {
  const me = await requireAdmin();
  const sp = await props.searchParams;
  const [list, products] = await Promise.all([listTemplates(), me.role === 'owner' ? db.listProducts({ includeInactive: true }) : Promise.resolve([])]);
  const edit = list.find((t) => String(t.id) === sp.edit);
  const owner = me.role === 'owner';

  return (
    <div>
      <PageHeader title="Message templates" subtitle="Ready-made delivery messages. Pick one on an order page — the customer’s details are filled in for you." />
      <Flash ok={sp.saved ? 'Template saved' : null} error={sp.error} />
      <div className={`grid gap-6 ${owner ? 'xl:grid-cols-[400px_1fr]' : ''}`}>
        {owner && (
          <Panel title={edit ? 'Edit template' : 'New template'} className="h-fit">
            <form action={saveTemplate} key={edit?.id ?? 'new'} className="space-y-4 p-5">
              {edit && <input type="hidden" name="id" value={edit.id} />}
              <div><Label>Name</Label><input name="name" required defaultValue={edit?.name} className="input" placeholder="Netflix — shared screen" /></div>
              <div><Label hint="(optional — shown first for this product)">Product</Label>
                <select name="product_id" defaultValue={edit?.product_id ?? ''} className="input"><option value="">Any product</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div><Label>Message</Label>
                <textarea name="body" required rows={8} defaultValue={edit?.body} className="input font-mono text-xs"
                  placeholder={'Hi {name}, your {product} ({package}) is ready!\n\nEmail: \nPassword: \nProfile: \n\nOrder {order} — thanks for shopping with {shop}.'} /></div>
              <div className="flex flex-wrap gap-1.5 text-xs text-zinc-500">Fill-ins: {TEMPLATE_VARS.map((v) => <code key={v} className="rounded bg-white/[0.06] px-1.5 py-0.5 text-zinc-300">{v}</code>)}</div>
              <div className="flex gap-2"><button className="btn-primary flex-1"><Icon name="check" size={16} />Save</button>{edit && <a href="/admin/templates" className="btn-ghost">Cancel</a>}</div>
            </form>
          </Panel>
        )}
        <Panel title={`Templates · ${list.length}`}>
          {list.length ? (
            <div className="divide-y divide-white/[0.05]">
              {list.map((t) => (
                <div key={t.id} className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{t.name}</span>
                    <span className="badge border-white/10 text-zinc-400">{t.product_name || 'Any product'}</span>
                    {owner && <span className="ml-auto flex gap-1">
                      <a href={`/admin/templates?edit=${t.id}`} className="btn-ghost !px-3 !py-1 text-xs">Edit</a>
                      <form action={deleteTemplate}><input type="hidden" name="id" value={t.id} /><ConfirmButton message={`Delete "${t.name}"?`} className="grid h-7 w-7 place-items-center rounded-lg text-zinc-500 hover:bg-red-500/10 hover:text-red-400"><Icon name="trash" size={14} /></ConfirmButton></form>
                    </span>}
                  </div>
                  <pre className="mt-2 max-h-32 overflow-hidden whitespace-pre-wrap rounded-lg bg-black/20 p-3 font-mono text-xs text-zinc-400">{t.body}</pre>
                </div>
              ))}
            </div>
          ) : <EmptyState icon="message" title="No templates yet" text={owner ? 'Create your first one on the left.' : 'Ask the owner to add some.'} />}
        </Panel>
      </div>
    </div>
  );
}
