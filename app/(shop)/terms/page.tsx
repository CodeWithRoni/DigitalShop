import { getSettings } from '@/lib/settings';
export const metadata = { title: 'Terms & Conditions' };
export default async function Terms() {
  const { shop_name: SHOP_NAME } = await getSettings();
  return (
    <div className="container-x max-w-3xl py-12">
      <h1 className="mb-6 text-3xl font-bold">Terms &amp; Conditions</h1>
      <div className="card space-y-4 p-6 text-sm leading-relaxed text-zinc-300">
        <p>{SHOP_NAME} is an independent reseller and is not affiliated with, endorsed by, or sponsored by the brands listed on this site. All trademarks belong to their respective owners.</p>
        <p>Customers must provide correct delivery information. Delivery time is usually within 15 minutes after successful payment but may take longer during high demand.</p>
        <p>Shared subscriptions must be used according to the package rules (e.g. screen limits). Misuse may lead to cancellation without refund.</p>
        <p>Prices may change without notice. The price shown at checkout is final for that order.</p>
        <p className="text-zinc-500">Edit this page in <code>app/(shop)/terms/page.tsx</code>.</p>
      </div>
    </div>
  );
}
