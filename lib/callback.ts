import 'server-only';
import { NextResponse } from 'next/server';
import { SITE_URL } from './utils';

export async function formData(req: Request) {
  const fd = await req.formData().catch(() => null);
  const get = (k: string) => (fd?.get(k) as string | null) || '';
  return { tran_id: get('tran_id'), val_id: get('val_id'), status: get('status') };
}
/** 303 so the browser follows with GET after SSLCommerz POSTs back. */
export function toOrder(code: string | null, result: string) {
  const url = code ? `${SITE_URL}/order/${code}?payment=${result}` : `${SITE_URL}/track?payment=${result}`;
  return NextResponse.redirect(url, 303);
}
