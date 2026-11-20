'use client';
import { useActionState, useState } from 'react';
import { submitReview } from '@/app/(shop)/order/[code]/review-action';

export default function ReviewForm({ code, productId, productName }: { code: string; productId: number; productName: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [state, action, pending] = useActionState(submitReview, null as { ok?: boolean; error?: string } | null);
  if (state?.ok) return <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-200">Thanks for rating {productName}! ⭐</div>;
  return (
    <form action={action} className="rounded-xl border border-white/10 p-4">
      <input type="hidden" name="code" value={code} /><input type="hidden" name="product_id" value={productId} /><input type="hidden" name="rating" value={rating} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-medium">{productName}</span>
        <div className="flex" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} type="button" aria-label={`${i} star${i > 1 ? 's' : ''}`} onMouseEnter={() => setHover(i)} onClick={() => setRating(i)} className="p-0.5 transition hover:scale-110">
              <svg width="26" height="26" viewBox="0 0 24 24"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" fill={(hover || rating) >= i ? '#fbbf24' : 'rgba(255,255,255,0.15)'} /></svg>
            </button>
          ))}
        </div>
      </div>
      {rating > 0 && (
        <div className="mt-3 space-y-3">
          <textarea name="comment" rows={2} maxLength={600} className="input" placeholder="What did you like? (optional)" />
          <div className="flex items-center gap-3">
            <button className="btn-primary !py-2" disabled={pending}>{pending ? 'Sending…' : 'Submit review'}</button>
            {state?.error && <span className="text-sm text-red-300">{state.error}</span>}
          </div>
        </div>
      )}
    </form>
  );
}
