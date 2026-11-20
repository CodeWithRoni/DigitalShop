export const metadata = { title: 'Refund Policy' };
export default function Refund() {
  return (
    <div className="container-x max-w-3xl py-12">
      <h1 className="mb-6 text-3xl font-bold">Refund Policy</h1>
      <div className="card space-y-4 p-6 text-sm leading-relaxed text-zinc-300">
        <p>We offer a full refund if we cannot deliver your order or if activation fails from our side.</p>
        <p>Refunds are not available after a subscription or top-up has been delivered and activated successfully, or if wrong delivery info (email / player ID) was provided by the customer.</p>
        <p>Refunds are sent to the original payment method (bKash / Nagad / Rocket / card) within 1–3 working days.</p>
        <p>ডেলিভারি না হলে বা অ্যাক্টিভেশন ফেইল করলে সম্পূর্ণ টাকা ফেরত দেওয়া হবে। ভুল তথ্য দিলে রিফান্ড প্রযোজ্য নয়।</p>
        <p className="text-zinc-500">Edit this page in <code>app/(shop)/refund/page.tsx</code>.</p>
      </div>
    </div>
  );
}
