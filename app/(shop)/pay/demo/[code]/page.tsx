import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { canView } from '@/lib/orderAccess';
import { confirmDemoPayment, demoPaymentEnabled, markFailed } from '@/lib/payment';
import { taka } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Demo payment', robots: { index: false } };

// Stand-in for the SSLCommerz page while the gateway keys are not configured.
export default async function DemoPay(props: { params: Promise<{ code: string }> }) {
  if (!demoPaymentEnabled) notFound();
  const code = decodeURIComponent((await props.params).code);
  if (!(await canView(code))) notFound();
  const order = await db.getOrderByCode(code);
  if (!order) notFound();

  async function pay(formData: FormData) {
    'use server';
    const result = formData.get('result');
    const o = await db.getOrderByCode(code);
    if (!o?.tran_id || !(await canView(code))) return;
    if (result === 'success') await confirmDemoPayment(o.tran_id);
    else await markFailed(o.tran_id);
    redirect(`/order/${code}?payment=${result === 'success' ? 'success' : 'failed'}`);
  }

  return (
    <div className="container-x max-w-md py-16">
      <div className="card p-6 text-center">
        <span className="badge border-yellow-500/30 bg-yellow-500/10 text-yellow-300">TEST MODE</span>
        <h1 className="mt-4 text-xl font-bold">Demo payment</h1>
        <p className="mt-2 text-sm text-zinc-400">SSLCommerz keys are not set yet, so this page simulates the payment gateway. No real money is charged.</p>
        <div className="my-6 text-3xl font-extrabold text-brand">{taka(order.total)}</div>
        <div className="mb-6 font-mono text-sm text-zinc-400">{order.code}</div>
        <form action={pay} className="flex gap-3">
          <button name="result" value="fail" className="btn-ghost flex-1">Simulate fail</button>
          <button name="result" value="success" className="btn-primary flex-1">Simulate success</button>
        </form>
      </div>
    </div>
  );
}
