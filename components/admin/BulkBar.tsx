'use client';
import { useEffect, useState } from 'react';
import { bulkSetStatus } from '@/app/admin/actions';

/** Floating bar for bulk order actions. Checkboxes elsewhere use form="bulk-orders". */
export default function BulkBar({ back }: { back: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const count = () => setN(document.querySelectorAll('input[form="bulk-orders"][name="ids"]:checked').length);
    document.addEventListener('change', count);
    count();
    return () => document.removeEventListener('change', count);
  }, []);
  const toggleAll = (on: boolean) => {
    document.querySelectorAll<HTMLInputElement>('input[form="bulk-orders"][name="ids"]').forEach((c) => { c.checked = on; });
    setN(on ? document.querySelectorAll('input[form="bulk-orders"][name="ids"]').length : 0);
  };
  return (
    <>
      <form id="bulk-orders" action={bulkSetStatus} onSubmit={(e) => { if (!confirm(`Change ${n} order(s)?`)) e.preventDefault(); }}>
        <input type="hidden" name="back" value={back} />
      </form>
      <div className={`fixed inset-x-0 bottom-4 z-40 mx-auto flex w-fit max-w-[95vw] items-center gap-2 rounded-2xl border border-white/10 bg-[#0c1328]/95 p-2 pl-4 shadow-2xl backdrop-blur-xl transition lg:left-[248px] ${n ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'}`}>
        <span className="whitespace-nowrap text-sm"><b>{n}</b> selected</span>
        <button type="button" onClick={() => toggleAll(false)} className="text-xs text-zinc-400 hover:text-white">Clear</button>
        <span className="mx-1 h-6 w-px bg-white/10" />
        {[['delivered', 'Mark delivered', 'btn-primary'], ['processing', 'Processing', 'btn-ghost'], ['cancelled', 'Cancel', 'btn-ghost']].map(([s, l, c]) => (
          <button key={s} form="bulk-orders" name="status" value={s} className={`${c} !px-3 !py-2 text-xs`}>{l}</button>
        ))}
      </div>
    </>
  );
}

export function SelectAll() {
  return (
    <input type="checkbox" aria-label="Select all" className="h-4 w-4 accent-[#7B2FF7]"
      onChange={(e) => {
        document.querySelectorAll<HTMLInputElement>('input[form="bulk-orders"][name="ids"]').forEach((c) => { c.checked = e.target.checked; });
        document.dispatchEvent(new Event('change'));
      }} />
  );
}
