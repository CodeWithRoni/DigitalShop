import { NextResponse } from 'next/server';
import { confirmPayment, markFailed } from '@/lib/payment';
import { formData } from '@/lib/callback';

// Server-to-server notification from SSLCommerz. Catches payments where the
// customer closed the browser before returning to the success URL.
export async function POST(req: Request) {
  const { tran_id, val_id, status } = await formData(req);
  if (!tran_id) return NextResponse.json({ ok: false }, { status: 400 });
  if (val_id && (status === 'VALID' || status === 'VALIDATED')) {
    const r = await confirmPayment(val_id, tran_id);
    return NextResponse.json({ ok: r.ok });
  }
  if (status === 'FAILED') await markFailed(tran_id);
  return NextResponse.json({ ok: true });
}
