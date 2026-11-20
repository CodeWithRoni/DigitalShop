import { markFailed } from '@/lib/payment';
import { formData, toOrder } from '@/lib/callback';

export async function POST(req: Request) {
  const { tran_id } = await formData(req);
  return toOrder(tran_id ? await markFailed(tran_id) : null, 'failed');
}
