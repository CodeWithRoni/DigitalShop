import Link from 'next/link';
import { requireOwner } from '@/lib/admin';
import { listReviews } from '@/lib/reviews';
import { deleteReview, setReviewStatus } from '../../feature-actions';
import { EmptyState, PageHeader, Panel } from '@/components/admin/ui';
import ConfirmButton from '@/components/ConfirmButton';
import Icon from '@/components/admin/Icon';
import Stars from '@/components/Stars';

const TABS = [['', 'All'], ['pending', 'Waiting'], ['approved', 'Approved'], ['hidden', 'Hidden']];
const when = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Dhaka' });

export default async function Reviews(props: { searchParams: Promise<{ status?: string }> }) {
  await requireOwner();
  const { status = '' } = await props.searchParams;
  const list = await listReviews(status);
  return (
    <div className="max-w-4xl">
      <PageHeader title="Reviews" subtitle="Customers can rate products after delivery. Nothing shows in the store until you approve it." />
      <div className="mb-4 flex gap-2">
        {TABS.map(([v, l]) => (
          <Link key={v} href={`/admin/reviews${v ? `?status=${v}` : ''}`} className={`rounded-full border px-3.5 py-1.5 text-sm ${status === v ? 'border-brand bg-brand text-white' : 'border-white/10 text-zinc-300 hover:bg-white/5'}`}>{l}</Link>
        ))}
      </div>
      <Panel>
        {list.length ? (
          <div className="divide-y divide-white/[0.05]">
            {list.map((r) => (
              <div key={r.id} className="flex flex-wrap gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Stars value={r.rating} size={14} />
                    <span className="font-medium">{r.customer_name}</span>
                    <span className="text-xs text-zinc-500">on {r.product_name} · {when(r.created_at)}{r.order_code && <> · <Link className="text-brand-light hover:underline" href={`/admin/orders/${r.order_id}`}>{r.order_code}</Link></>}</span>
                    <span className={`badge ${r.status === 'approved' ? 'border-green-500/30 bg-green-500/10 text-green-300' : r.status === 'pending' ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300' : 'border-white/10 text-zinc-400'}`}>{r.status === 'pending' ? 'Waiting' : r.status}</span>
                  </div>
                  {r.comment ? <p className="mt-1.5 text-sm text-zinc-300">{r.comment}</p> : <p className="mt-1.5 text-sm italic text-zinc-600">No comment</p>}
                </div>
                <div className="flex items-start gap-1">
                  {r.status !== 'approved' && <form action={setReviewStatus}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="approved" /><button className="btn-ghost !px-3 !py-1.5 text-xs text-green-300">Approve</button></form>}
                  {r.status !== 'hidden' && <form action={setReviewStatus}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="hidden" /><button className="btn-ghost !px-3 !py-1.5 text-xs">Hide</button></form>}
                  <form action={deleteReview}><input type="hidden" name="id" value={r.id} /><ConfirmButton message="Delete this review?" className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 hover:bg-red-500/10 hover:text-red-400"><Icon name="trash" size={15} /></ConfirmButton></form>
                </div>
              </div>
            ))}
          </div>
        ) : <EmptyState icon="star" title="No reviews here" text="Customers get a “Rate your purchase” box on their order page after delivery." />}
      </Panel>
    </div>
  );
}
