import { db } from '@/lib/db';
import { formData, toOrder } from '@/lib/callback';

export async function POST(req: Request) {
  const { tran_id } = await formData(req);
  const order = tran_id ? await db.getOrderByTranId(tran_id) : null;
  return toOrder(order?.code || null, 'cancelled');
}
