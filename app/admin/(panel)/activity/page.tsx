import Link from 'next/link';
import { requireOwner } from '@/lib/admin';
import { listActivity } from '@/lib/activity';
import { q } from '@/lib/db/pg';
import { EmptyState, PageHeader, Panel } from '@/components/admin/ui';
import Icon, { type IconName } from '@/components/admin/Icon';

const ICON: Record<string, IconName> = { order: 'orders', product: 'products', category: 'categories', coupon: 'tag', settings: 'settings', staff: 'shield', package: 'key', template: 'message', review: 'star', admin: 'users', image: 'upload' };
const when = (d: string) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dhaka' });
const PAGE = 100;

export default async function Activity(props: { searchParams: Promise<{ actor?: string; entity?: string; page?: string }> }) {
  await requireOwner();
  const sp = await props.searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const [rows, actors] = await Promise.all([
    listActivity({ actor: sp.actor, entity: sp.entity, limit: PAGE + 1, offset: (page - 1) * PAGE }),
    q<{ actor: string }>('select distinct actor from activity_log order by actor'),
  ]);
  const more = rows.length > PAGE;
  const link = (entity: string | null, id: string | null) =>
    entity === 'order' && id ? `/admin/orders/${id}` : entity === 'product' && id ? `/admin/products/${id}` : null;
  const qs = (p: Record<string, string | undefined>) => '?' + new URLSearchParams(Object.entries({ actor: sp.actor, entity: sp.entity, ...p }).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <div className="max-w-5xl">
      <PageHeader title="Activity log" subtitle="Who changed what, and when." />
      <form className="mb-4 flex flex-wrap gap-2">
        <select name="actor" defaultValue={sp.actor || ''} className="input !w-60"><option value="">Everyone</option>{actors.map((a) => <option key={a.actor}>{a.actor}</option>)}</select>
        <select name="entity" defaultValue={sp.entity || ''} className="input !w-44"><option value="">All types</option>{Object.keys(ICON).map((e) => <option key={e} value={e}>{e}</option>)}</select>
        <button className="btn-ghost">Filter</button>
      </form>
      <Panel>
        {rows.length ? (
          <ol className="divide-y divide-white/[0.05]">
            {rows.slice(0, PAGE).map((r) => {
              const href = link(r.entity, r.entity_id);
              return (
                <li key={r.id} className="flex gap-3 px-5 py-3.5">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.05] text-zinc-400"><Icon name={ICON[r.entity || ''] || 'activity'} size={15} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm"><span className="font-medium">{r.actor}</span> <span className="text-zinc-400">{r.action.toLowerCase()}</span>
                      {href && <Link href={href} className="ml-1 text-brand-light hover:underline">open →</Link>}</div>
                    {r.details && <div className="mt-0.5 break-words text-xs text-zinc-500">{r.details}</div>}
                  </div>
                  <time className="shrink-0 text-xs text-zinc-500">{when(r.created_at)}</time>
                </li>
              );
            })}
          </ol>
        ) : <EmptyState icon="activity" title="Nothing yet" text="Changes made in the admin panel will appear here." />}
      </Panel>
      <div className="mt-4 flex justify-between">
        {page > 1 ? <Link className="btn-ghost" href={qs({ page: String(page - 1) })}>← Newer</Link> : <span />}
        {more && <Link className="btn-ghost" href={qs({ page: String(page + 1) })}>Older →</Link>}
      </div>
    </div>
  );
}
