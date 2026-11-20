import { confirmPayment } from '@/lib/payment';
import { formData, toOrder } from '@/lib/callback';

export async function POST(req: Request) {
  const { tran_id, val_id } = await formData(req);
  if (!tran_id || !val_id) return toOrder(null, 'invalid');
  const r = await confirmPayment(val_id, tran_id);
  return toOrder(r.code, r.ok ? 'success' : 'failed');
}
