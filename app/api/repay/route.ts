import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { canView } from '@/lib/orderAccess';
import { initPayment } from '@/lib/sslcommerz';
import { demoPaymentEnabled, gatewayConfigured } from '@/lib/payment';
import { SITE_URL } from '@/lib/utils';

// Retry payment for an unpaid order (new tran_id each attempt).
export async function POST(req: Request) {
  const fd = await req.formData();
  const code = String(fd.get('code') || '');
  if (!(await canView(code))) return NextResponse.redirect(`${SITE_URL}/track`, 303);
  const order = await db.getOrderByCode(code);
  if (!order || order.payment_status === 'paid' || order.status !== 'pending')
    return NextResponse.redirect(`${SITE_URL}/order/${code}`, 303);

  const tran_id = `${order.code}-${Date.now().toString(36)}`;
  await db.updateOrder(order.id, { tran_id, payment_status: 'unpaid' });

  if (!gatewayConfigured) {
    return NextResponse.redirect(demoPaymentEnabled ? `${SITE_URL}/pay/demo/${code}` : `${SITE_URL}/order/${code}`, 303);
  }
  const r = await initPayment({
    tran_id, total_amount: Number(order.total),
    success_url: `${SITE_URL}/api/payment/success`, fail_url: `${SITE_URL}/api/payment/fail`,
    cancel_url: `${SITE_URL}/api/payment/cancel`, ipn_url: `${SITE_URL}/api/payment/ipn`,
    cus_name: order.customer_name, cus_email: order.customer_email || 'customer@example.com', cus_phone: order.customer_phone,
    product_name: (order.order_items || []).map((i) => `${i.product_name} ${i.package_name}`).join(', ') || 'Digital product',
    value_a: order.code,
  });
  if ('error' in r) return NextResponse.redirect(`${SITE_URL}/order/${code}?payment=failed`, 303);
  return NextResponse.redirect(r.url, 303);
}
