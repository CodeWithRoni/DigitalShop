'use client';
import { useRef, useState } from 'react';

/** Delivery message textarea with one-click templates. */
export default function DeliveryMessageField({ defaultValue, templates }: { defaultValue: string; templates: { name: string; text: string }[] }) {
  const [value, setValue] = useState(defaultValue);
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <label className="label !mb-0">Delivery message — the customer sees this on their order page</label>
        {templates.length > 0 && (
          <select className="input !w-auto !py-1.5 text-xs" value="" onChange={(e) => {
            const t = templates[Number(e.target.value)];
            if (!t) return;
            setValue((v) => (v.trim() ? `${v.trim()}\n\n${t.text}` : t.text));
            requestAnimationFrame(() => ref.current?.focus());
          }}>
            <option value="">+ Insert template…</option>
            {templates.map((t, i) => <option key={i} value={i}>{t.name}</option>)}
          </select>
        )}
      </div>
      <textarea ref={ref} name="delivery_message" value={value} onChange={(e) => setValue(e.target.value)} rows={6} className="input font-mono"
        placeholder={'Email: xxx@gmail.com\nPassword: ********\nProfile: 2  ·  PIN: 1234'} />
    </div>
  );
}
