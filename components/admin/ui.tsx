import Link from 'next/link';
import Icon, { type IconName } from './Icon';

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className = '' }: { title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
          <h2 className="text-sm font-semibold">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Segmented links, e.g. 7d / 30d / 90d. */
export function Segmented({ items, active }: { items: { href: string; label: string; key: string }[]; active: string }) {
  return (
    <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
      {items.map((i) => (
        <Link key={i.key} href={i.href} scroll={false}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${active === i.key ? 'bg-white text-zinc-900 shadow' : 'text-zinc-400 hover:text-white'}`}>
          {i.label}
        </Link>
      ))}
    </div>
  );
}

export function Delta({ cur, prev }: { cur: number; prev: number }) {
  if (!prev && !cur) return <span className="text-xs text-zinc-500">—</span>;
  if (!prev) return <span className="inline-flex items-center gap-0.5 rounded-md bg-green-500/10 px-1.5 py-0.5 text-xs font-semibold text-green-300">New</span>;
  const pct = ((cur - prev) / prev) * 100;
  const up = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold ${up ? 'bg-green-500/10 text-green-300' : 'bg-red-500/10 text-red-300'}`}>
      <Icon name={up ? 'arrowUp' : 'arrowDown'} size={12} />{Math.abs(pct).toFixed(pct > -10 && pct < 10 ? 1 : 0)}%
    </span>
  );
}

export function Sparkline({ values, color = '#7B2FF7' }: { values: number[]; color?: string }) {
  const w = 120, h = 36;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => [values.length === 1 ? w : (i / (values.length - 1)) * w, h - 3 - (v / max) * (h - 6)]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const id = 'sp' + color.replace('#', '');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible" aria-hidden>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".35" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function KpiCard({ icon, label, value, cur, prev, spark, color }: {
  icon: IconName; label: string; value: string; cur: number; prev: number; spark: number[]; color: string;
}) {
  return (
    <div className="card group relative overflow-hidden p-4 transition hover:border-white/15 sm:p-5">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-20 blur-2xl transition group-hover:opacity-40" style={{ background: color }} />
      <div className="flex items-center justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: color + '22', color }}><Icon name={icon} /></span>
        <Delta cur={cur} prev={prev} />
      </div>
      <div className="mt-3 truncate text-[11px] font-medium uppercase tracking-wide text-zinc-500 sm:mt-4 sm:text-xs">{label}</div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <div className="font-display text-xl font-extrabold tracking-tight sm:text-2xl">{value}</div>
        <div className="hidden sm:block"><Sparkline values={spark} color={color} /></div>
      </div>
      <div className="mt-1 hidden text-[11px] text-zinc-500 sm:block">vs previous period</div>
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: IconName; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.04] text-zinc-500"><Icon name={icon} size={22} /></span>
      <div className="mt-3 font-semibold">{title}</div>
      {text && <p className="mt-1 max-w-xs text-sm text-zinc-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
