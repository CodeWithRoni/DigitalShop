'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function TrackForm() {
  const sp = useSearchParams();
  const router = useRouter();
  const [code, setCode] = useState(sp.get('code') || '');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    const res = await fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, phone }) });
    const json = await res.json();
    if (!res.ok) { setError(json.error); setLoading(false); return; }
    router.push(`/order/${json.code}`);
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-6">
      <div><label className="label">Order code</label>
        <input className="input font-mono uppercase" required placeholder="DS-XXXXXXXX" value={code} onChange={(e) => setCode(e.target.value)} /></div>
      <div><label className="label">Phone number used at checkout</label>
        <input className="input" required inputMode="tel" placeholder="01XXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
      {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      <button className="btn-primary w-full" disabled={loading}>{loading ? 'Checking…' : 'Track order'}</button>
    </form>
  );
}

export default function TrackPage() {
  return (
    <div className="container-x max-w-md py-16">
      <h1 className="mb-2 text-center text-2xl font-bold">Track your order</h1>
      <p className="mb-6 text-center text-sm text-zinc-400">অর্ডার কোড আর ফোন নম্বর দিয়ে অর্ডারের অবস্থা দেখুন।</p>
      <Suspense><TrackForm /></Suspense>
    </div>
  );
}
