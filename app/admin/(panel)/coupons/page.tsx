import { requireOwner } from '@/lib/admin';
import { listCoupons, type Coupon } from '@/lib/coupons';
import { deleteCoupon, saveCoupon, toggleCoupon } from '../../feature-actions';
import { EmptyState, Flash, FormSwitch, Label, PageHeader, Panel } from '@/components/admin/ui';
import ConfirmButton from '@/components/ConfirmButton';
import CopyButton from '@/components/admin/CopyButton';
import Icon from '@/components/admin/Icon';
import { taka } from '@/lib/utils';

const day = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' }) : '');
const nice = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Dhaka' }) : null);

function state(c: Coupon) {
  const now = Date.now();
  if (!c.is_active) return ['Off', 'border-white/10 text-zinc-400'];
  if (c.expires_at && new Date(c.expires_at).getTime() < now) return ['Expired', 'border-red-500/30 bg-red-500/10 text-red-300'];
  if (c.starts_at && new Date(c.starts_at).getTime() > now) return ['Scheduled', 'border-blue-500/30 bg-blue-500/10 text-blue-300'];
  if (c.max_uses != null && c.used_count >= c.max_uses) return ['Used up', 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300'];
  return ['Active', 'border-green-500/30 bg-green-500/10 text-green-300'];
}

export default async function Coupons(props: { searchParams: Promise<{ saved?: string; error?: string; edit?: string }> }) {
  await requireOwner();
  const sp = await props.searchParams;
  const list = await listCoupons();
  const edit = list.find((c) => String(c.id) === sp.edit);

  return (
    <div>
      <PageHeader title="Coupons" subtitle="Discount codes customers type at checkout. Uses are counted only after payment." />
      <Flash ok={sp.saved ? `Coupon ${sp.saved} saved` : null} error={sp.error} />
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Panel title={edit ? `Edit ${edit.code}` : 'New coupon'} className="h-fit">
          <form action={saveCoupon} key={edit?.id ?? 'new'} className="space-y-4 p-5">
            {edit && <input type="hidden" name="id" value={edit.id} />}
            <div><Label>Code</Label><input name="code" required defaultValue={edit?.code} className="input font-mono uppercase" placeholder="EID20" maxLength={30} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label>
                <select name="type" defaultValue={edit?.type || 'percent'} className="input"><option value="percent">% off</option><option value="fixed">৳ off</option></select></div>
              <div><Label>Discount</Label><input name="value" type="number" step="0.01" min="0.01" required defaultValue={edit?.value} className="input" placeholder="20" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label hint="(৳)">Min. order</Label><input name="min_order" type="number" min="0" defaultValue={edit?.min_order || ''} className="input" placeholder="0" /></div>
              <div><Label hint="(৳, for %)">Max discount</Label><input name="max_discount" type="number" min="0" defaultValue={edit?.max_discount ?? ''} className="input" placeholder="No limit" /></div>
            </div>
            <div><Label hint="(total, all customers)">Usage limit</Label><input name="max_uses" type="number" min="1" defaultValue={edit?.max_uses ?? ''} className="input" placeholder="Unlimited" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Starts</Label><input name="starts_at" type="date" defaultValue={day(edit?.starts_at ?? null)} className="input" /></div>
              <div><Label>Expires</Label><input name="expires_at" type="date" defaultValue={day(edit?.expires_at ?? null)} className="input" /></div>
            </div>
            <FormSwitch name="is_active" defaultChecked={edit ? edit.is_active : true} label="Active" />
            <div className="flex gap-2">
              <button className="btn-primary flex-1"><Icon name="check" size={16} />{edit ? 'Save coupon' : 'Create coupon'}</button>
              {edit && <a href="/admin/coupons" className="btn-ghost">Cancel</a>}
            </div>
          </form>
        </Panel>

        <Panel title={`All coupons · ${list.length}`}>
          {list.length ? (
            <div className="divide-y divide-white/[0.05]">
              {list.map((c) => {
                const [label, cls] = state(c);
                return (
                  <div key={c.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand/30 to-accent-dark/30 text-brand-light"><Icon name="tag" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><span className="font-mono text-base font-bold">{c.code}</span><CopyButton text={c.code} /><span className={`badge ${cls}`}>{label}</span></div>
                      <div className="mt-0.5 text-xs text-zinc-500">
                        {c.type === 'percent' ? `${Number(c.value)}% off` : `${taka(c.value)} off`}
                        {Number(c.min_order) > 0 && ` · min ${taka(c.min_order)}`}
                        {c.max_discount != null && ` · max ${taka(c.max_discount)}`}
                        {nice(c.expires_at) && ` · until ${nice(c.expires_at)}`}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-semibold">{c.used_count}{c.max_uses != null && <span className="text-zinc-500"> / {c.max_uses}</span>} <span className="text-xs font-normal text-zinc-500">used</span></div>
                      <div className="text-xs text-zinc-500">{taka(c.total_discount)} given</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <a href={`/admin/coupons?edit=${c.id}`} className="btn-ghost !px-3 !py-1.5 text-xs">Edit</a>
                      <form action={toggleCoupon}><input type="hidden" name="id" value={c.id} /><button className="btn-ghost !px-3 !py-1.5 text-xs">{c.is_active ? 'Turn off' : 'Turn on'}</button></form>
                      <form action={deleteCoupon}><input type="hidden" name="id" value={c.id} /><ConfirmButton message={`Delete coupon ${c.code}?`} className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 hover:bg-red-500/10 hover:text-red-400"><Icon name="trash" size={15} /></ConfirmButton></form>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <EmptyState icon="tag" title="No coupons yet" text="Create one on the left — e.g. EID20 for 20% off." />}
        </Panel>
      </div>
    </div>
  );
}
