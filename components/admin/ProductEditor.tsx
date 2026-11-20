'use client';
/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useActionState, useEffect, useMemo, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import type { Category, Product, ProductPayload } from '@/lib/types';
import { saveProductFull } from '@/app/admin/actions';
import ProductIcon from '@/components/ProductIcon';
import Icon from './Icon';

const DELIVERY_PRESETS = [
  { label: 'Email / Account info', hint: 'Email for account delivery' },
  { label: 'Your Gmail address', hint: 'example@gmail.com' },
  { label: 'Player ID (UID)', hint: 'e.g. 2384719201' },
  { label: 'User ID + Zone ID', hint: 'e.g. 12345678 (1234)' },
  { label: 'Phone number', hint: '01XXXXXXXXX' },
  { label: 'Profile / Username', hint: '@username' },
];
const PACKAGE_IDEAS = ['1 Month', '3 Months', '6 Months', '12 Months', 'Lifetime'];

type Pkg = { key: string; id?: number; name: string; price: string; is_active: boolean };
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
let seq = 0;
const newKey = () => `n${++seq}`;

export default function ProductEditor({ product, categories }: { product?: Product | null; categories: Category[] }) {
  const p = product;
  const [state, action] = useActionState(saveProductFull, null as { error?: string } | null);

  const [name, setName] = useState(p?.name || '');
  const [slug, setSlug] = useState(p?.slug || '');
  const [slugTouched, setSlugTouched] = useState(!!p);
  const [categoryId, setCategoryId] = useState<number | null>(p?.category_id ?? categories[0]?.id ?? null);
  const [shortDesc, setShortDesc] = useState(p?.short_description || '');
  const [desc, setDesc] = useState(p?.description || '');
  const [image, setImage] = useState(p?.image_url || '');
  const [domain, setDomain] = useState('');
  const [deliveryLabel, setDeliveryLabel] = useState(p?.delivery_label || DELIVERY_PRESETS[0].label);
  const [deliveryHint, setDeliveryHint] = useState(p?.delivery_hint || '');
  const [active, setActive] = useState(p ? p.is_active : true);
  const [featured, setFeatured] = useState(p?.is_featured || false);
  const [sortOrder, setSortOrder] = useState(String(p?.sort_order ?? 0));
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [pkgs, setPkgs] = useState<Pkg[]>(() =>
    p?.packages?.length
      ? p.packages.map((k) => ({ key: `e${k.id}`, id: k.id, name: k.name, price: String(k.price), is_active: k.is_active }))
      : [{ key: newKey(), name: '1 Month', price: '', is_active: true }],
  );
  const [dirty, setDirty] = useState(false);
  const first = useRef(true);

  const effectiveSlug = slugTouched ? slugify(slug) : slugify(name);
  const activePrices = pkgs.filter((k) => k.is_active && k.name.trim() && k.price !== '' && Number(k.price) >= 0).map((k) => Number(k.price));
  const minPrice = activePrices.length ? Math.min(...activePrices) : null;
  const category = categories.find((c) => c.id === categoryId);

  const payload: ProductPayload = useMemo(() => ({
    id: p?.id, name, slug: effectiveSlug, category_id: categoryId,
    short_description: shortDesc, description: desc, image_url: image,
    delivery_label: deliveryLabel, delivery_hint: deliveryHint,
    is_active: active, is_featured: featured, sort_order: Number(sortOrder) || 0,
    packages: pkgs.map(({ id, name, price, is_active }) => ({ id, name, price, is_active })),
  }), [p?.id, name, effectiveSlug, categoryId, shortDesc, desc, image, deliveryLabel, deliveryHint, active, featured, sortOrder, pkgs]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setDirty(true);
  }, [payload]);
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); } };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const updPkg = (key: string, patch: Partial<Pkg>) => setPkgs((l) => l.map((k) => (k.key === key ? { ...k, ...patch } : k)));
  const movePkg = (i: number, d: -1 | 1) => setPkgs((l) => {
    const j = i + d; if (j < 0 || j >= l.length) return l;
    const n = [...l]; [n[i], n[j]] = [n[j], n[i]]; return n;
  });
  const addPkg = (nameHint = '') => setPkgs((l) => [...l, { key: newKey(), name: nameHint, price: '', is_active: true }]);

  function applyLogo() {
    const d = domain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (d) setImage(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=128`);
  }

  return (
    <form action={action} onSubmit={() => setDirty(false)} className="pb-28">
      <input type="hidden" name="data" value={JSON.stringify(payload)} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {/* 1. Basics */}
          <Section n={1} title="Basic info" desc="What are you selling?">
            <Field label="Product name" required>
              <input className="input !py-3 text-base" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Netflix Premium" maxLength={120} autoFocus={!p} />
            </Field>
            <Field label="Category">
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <Chip key={c.id} on={categoryId === c.id} onClick={() => setCategoryId(c.id)}>{c.name}</Chip>
                ))}
                <Chip on={categoryId === null} onClick={() => setCategoryId(null)}>None</Chip>
                <Link href="/admin/categories" target="_blank" className="rounded-full border border-dashed border-white/15 px-3.5 py-1.5 text-sm text-zinc-400 hover:border-brand/50 hover:text-white">+ New category</Link>
              </div>
            </Field>
            <Field label="Short description" hint="Shown under the product name. One or two lines.">
              <textarea className="input" rows={2} value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} maxLength={300}
                placeholder="e.g. Private & shared screens with instant delivery." />
              <Counter n={shortDesc.length} max={300} />
            </Field>
          </Section>

          {/* 2. Image */}
          <Section n={2} title="Logo / image" desc="Square logos look best.">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.03]">
                <ProductIcon key={image} src={image || null} name={name || '?'} size={60} />
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <label className="label">Get logo from website</label>
                  <div className="flex gap-2">
                    <input className="input" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="netflix.com"
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyLogo(); } }} />
                    <button type="button" onClick={applyLogo} className="btn-ghost shrink-0">Use logo</button>
                  </div>
                </div>
                <div>
                  <label className="label">…or paste an image URL</label>
                  <input className="input" value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://…/logo.png" />
                </div>
              </div>
            </div>
          </Section>

          {/* 3. Packages */}
          <Section n={3} title="Packages & prices" desc="Customers pick one of these. Drag order with the arrows.">
            <div className="space-y-2">
              <div className="hidden grid-cols-[28px_1fr_140px_88px_36px] gap-2 px-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500 sm:grid">
                <span /><span>Package name</span><span>Price</span><span>Status</span><span />
              </div>
              {pkgs.map((k, i) => (
                <div key={k.key} className={`grid grid-cols-[28px_1fr_36px] items-center gap-2 rounded-xl border p-2 transition sm:grid-cols-[28px_1fr_140px_88px_36px] ${k.is_active ? 'border-white/10 bg-white/[0.02]' : 'border-white/5 bg-transparent opacity-60'}`}>
                  <div className="flex flex-col items-center text-zinc-500">
                    <button type="button" onClick={() => movePkg(i, -1)} disabled={i === 0} className="leading-none hover:text-white disabled:opacity-20" aria-label="Move up">▲</button>
                    <button type="button" onClick={() => movePkg(i, 1)} disabled={i === pkgs.length - 1} className="leading-none hover:text-white disabled:opacity-20" aria-label="Move down">▼</button>
                  </div>
                  <input className="input !py-2" value={k.name} onChange={(e) => updPkg(k.key, { name: e.target.value })} placeholder="e.g. 1 Month" maxLength={120} />
                  <button type="button" onClick={() => setPkgs((l) => l.filter((x) => x.key !== k.key))} className="grid h-9 w-9 place-items-center rounded-lg text-zinc-500 hover:bg-red-500/10 hover:text-red-400 sm:order-last" aria-label="Remove package">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
                  </button>
                  <div className="relative col-span-2 col-start-2 sm:col-span-1 sm:col-start-auto">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">৳</span>
                    <input className="input !py-2 !pl-7 text-right font-semibold" inputMode="decimal" value={k.price}
                      onChange={(e) => updPkg(k.key, { price: e.target.value.replace(/[^\d.]/g, '') })} placeholder="0" />
                  </div>
                  <div className="col-start-2 sm:col-start-auto">
                    <Switch on={k.is_active} onChange={(v) => updPkg(k.key, { is_active: v })} label={k.is_active ? 'On' : 'Off'} />
                  </div>
                </div>
              ))}
              {!pkgs.length && <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-sm text-zinc-500">No packages yet — the product will show “Coming soon”.</p>}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => addPkg()} className="btn-ghost !py-2"><Icon name="plus" size={16} />Add package</button>
              <span className="text-xs text-zinc-500">Quick add:</span>
              {PACKAGE_IDEAS.filter((n) => !pkgs.some((k) => k.name === n)).map((n) => (
                <button key={n} type="button" onClick={() => addPkg(n)} className="rounded-full bg-white/[0.05] px-3 py-1 text-xs text-zinc-300 hover:bg-white/10">+ {n}</button>
              ))}
            </div>
          </Section>

          {/* 4. Delivery */}
          <Section n={4} title="What should the customer enter?" desc="We ask for this at checkout so you know where to deliver.">
            <div className="flex flex-wrap gap-2">
              {DELIVERY_PRESETS.map((d) => (
                <Chip key={d.label} on={deliveryLabel === d.label} onClick={() => { setDeliveryLabel(d.label); setDeliveryHint(d.hint); }}>{d.label}</Chip>
              ))}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Field label"><input className="input" value={deliveryLabel} onChange={(e) => setDeliveryLabel(e.target.value)} maxLength={80} /></Field>
              <Field label="Example text (placeholder)"><input className="input" value={deliveryHint} onChange={(e) => setDeliveryHint(e.target.value)} maxLength={80} /></Field>
            </div>
          </Section>

          {/* 5. Advanced */}
          <section className="card">
            <button type="button" onClick={() => setShowAdvanced((v) => !v)} className="flex w-full items-center justify-between px-5 py-4 text-left">
              <span><span className="font-semibold">More options</span><span className="ml-2 text-sm text-zinc-500">URL, sort order, long description</span></span>
              <span className={`text-zinc-400 transition ${showAdvanced ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {showAdvanced && (
              <div className="space-y-4 border-t border-white/[0.06] px-5 py-5">
                <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
                  <Field label="Page URL" hint={`yoursite.com/product/${effectiveSlug || 'product-name'}`}>
                    <input className="input font-mono" value={slugTouched ? slug : effectiveSlug} onChange={(e) => { setSlugTouched(true); setSlug(e.target.value); }} placeholder="netflix" />
                  </Field>
                  <Field label="Sort order" hint="Lower shows first"><input className="input" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} /></Field>
                </div>
                <Field label="Long description" hint="Rules, how it works, warranty — shown on the product page.">
                  <textarea className="input" rows={5} value={desc} onChange={(e) => setDesc(e.target.value)} />
                </Field>
              </div>
            )}
          </section>
        </div>

        {/* Right: preview + publish */}
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="card p-5">
            <div className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">Store preview</div>
            <div className="rounded-2xl bg-gradient-to-br from-white/[0.09] to-white/[0.02] p-px">
              <div className="rounded-[15px] bg-[#0c1328] p-5">
                <div className="flex items-start justify-between">
                  <ProductIcon key={image} src={image || null} name={name || '?'} size={52} />
                  {featured && <span className="rounded-md bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">Popular</span>}
                </div>
                <div className="mt-4 font-semibold">{name || <span className="text-zinc-600">Product name</span>}</div>
                <div className="mt-1 text-xs text-zinc-500">{category?.name || 'No category'} · {pkgs.filter((k) => k.is_active && k.name).length} packages</div>
                <div className="mt-4 border-t border-white/[0.06] pt-3 text-sm">
                  {minPrice !== null ? <><span className="text-xs text-zinc-500">from </span><span className="font-bold">৳{minPrice.toLocaleString('en-IN')}</span></> : <span className="text-zinc-500">Coming soon</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="card space-y-4 p-5">
            <Toggle on={active} onChange={setActive} title="Visible in store" desc={active ? 'Customers can see and buy it' : 'Hidden — only admins see it'} />
            <Toggle on={featured} onChange={setFeatured} title="Popular / featured" desc="Highlighted on the homepage" />
          </div>

          <Checklist items={[
            ['Name added', !!name.trim()],
            ['Logo added', !!image],
            ['At least one priced package', minPrice !== null],
          ]} />
        </aside>
      </div>

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-bg/90 backdrop-blur-xl lg:left-[248px]">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-8">
          <div className="min-w-0 flex-1 text-sm">
            {state?.error
              ? <span className="text-red-300">⚠ {state.error}</span>
              : <span className="text-zinc-400">{dirty ? 'You have unsaved changes' : p ? 'All changes saved' : 'Fill in the details, then save'}</span>}
          </div>
          <Link href="/admin/products" className="btn-ghost !py-2.5">Cancel</Link>
          <SaveButton label={p ? 'Save changes' : 'Create product'} disabled={!name.trim()} />
        </div>
      </div>
    </form>
  );
}

function SaveButton({ label, disabled }: { label: string; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary !px-6 !py-2.5" disabled={disabled || pending}>
      {pending ? 'Saving…' : <><Icon name="check" size={16} />{label}</>}
    </button>
  );
}

function Section({ n, title, desc, children }: { n: number; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand to-accent-dark text-xs font-bold">{n}</span>
        <div>
          <h2 className="font-semibold">{title}</h2>
          {desc && <p className="text-sm text-zinc-500">{desc}</p>}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}{required && <span className="text-brand-light"> *</span>}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

function Counter({ n, max }: { n: number; max: number }) {
  return <div className={`mt-1 text-right text-[11px] ${n > max * 0.9 ? 'text-yellow-400' : 'text-zinc-600'}`}>{n}/{max}</div>;
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className={`rounded-full border px-3.5 py-1.5 text-sm transition ${on ? 'border-brand bg-brand/20 font-medium text-white' : 'border-white/10 text-zinc-400 hover:border-white/25 hover:text-white'}`}>
      {children}
    </button>
  );
}

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex items-center gap-2 text-xs text-zinc-400">
      <span className={`relative h-6 w-10 rounded-full transition ${on ? 'bg-gradient-to-r from-brand to-accent-dark' : 'bg-white/10'}`}>
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? 'left-5' : 'left-1'}`} />
      </span>
      {label}
    </button>
  );
}

function Toggle({ on, onChange, title, desc }: { on: boolean; onChange: (v: boolean) => void; title: string; desc: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-zinc-500">{desc}</div>
      </div>
      <Switch on={on} onChange={onChange} />
    </div>
  );
}

function Checklist({ items }: { items: [string, boolean][] }) {
  const done = items.filter(([, ok]) => ok).length;
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-zinc-500">
        <span>Ready to sell</span><span>{done}/{items.length}</span>
      </div>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-brand to-accent transition-all" style={{ width: `${(done / items.length) * 100}%` }} />
      </div>
      <ul className="space-y-2 text-sm">
        {items.map(([t, ok]) => (
          <li key={t} className={`flex items-center gap-2 ${ok ? 'text-zinc-300' : 'text-zinc-500'}`}>
            <span className={`grid h-4 w-4 place-items-center rounded-full ${ok ? 'bg-green-500/20 text-green-400' : 'border border-white/15'}`}>
              {ok && <Icon name="check" size={10} />}
            </span>{t}
          </li>
        ))}
      </ul>
    </div>
  );
}
