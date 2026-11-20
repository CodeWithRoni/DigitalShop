'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DailyPoint } from '@/lib/db/types';

const fmt = (n: number) => '৳' + Math.round(n).toLocaleString('en-IN');
const day = (d: string, long = false) =>
  new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(long ? { weekday: 'short' } : {}), timeZone: 'UTC' });

export default function RevenueChart({ data }: { data: DailyPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  // Draw in real pixels so labels stay readable on phones.
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(720);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = W < 500 ? 200 : 260, PL = 44, PR = 14, PT = 16, PB = 28;
  const { max, ticks, x, y, line, area } = useMemo(() => {
    const raw = Math.max(...data.map((d) => d.revenue), 0);
    // "nice" step so the axis has 4 bands just above the peak
    const rough = Math.max(raw, 1000) / 4;
    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= rough)!;
    const max = step * 4;
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
    const x = (i: number) => PL + (data.length === 1 ? (W - PL - PR) / 2 : (i / (data.length - 1)) * (W - PL - PR));
    const y = (v: number) => PT + (1 - v / max) * (H - PT - PB);
    // smooth-ish path (monotone cubic approximation)
    const pts = data.map((d, i) => [x(i), y(d.revenue)] as const);
    let line = '';
    pts.forEach(([px, py], i) => {
      if (!i) { line = `M${px},${py}`; return; }
      const [qx, qy] = pts[i - 1]; const cx = (qx + px) / 2;
      line += ` C${cx},${qy} ${cx},${py} ${px},${py}`;
    });
    const area = pts.length ? `${line} L${pts[pts.length - 1][0]},${H - PB} L${pts[0][0]},${H - PB} Z` : '';
    return { max, ticks, x, y, line, area };
  }, [data, W, H]);

  const total = data.reduce((a, d) => a + d.revenue, 0);
  const h = hover !== null ? data[hover] : null;
  const labelEvery = Math.ceil(data.length / (W < 500 ? 4 : 7));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 px-5 pt-4">
        <div>
          <div className="text-xs text-zinc-500">{h ? day(h.date, true) : `Last ${data.length} days`}</div>
          <div className="font-display text-2xl font-extrabold tracking-tight">{fmt(h ? h.revenue : total)}</div>
        </div>
        <div className="text-right text-xs text-zinc-500">
          {h ? <><span className="text-zinc-300">{h.paidOrders}</span> paid · {h.orders} order{h.orders === 1 ? '' : 's'} total</> : 'Paid revenue per day'}
        </div>
      </div>
      <div className="relative" ref={box}>
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block w-full touch-none select-none"
          onMouseLeave={() => setHover(null)}
          onPointerMove={(e) => {
            const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
            const px = ((e.clientX - r.left) / r.width) * W;
            const i = Math.round(((px - PL) / (W - PL - PR)) * (data.length - 1));
            setHover(Math.max(0, Math.min(data.length - 1, i)));
          }}>
          <defs>
            <linearGradient id="revArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#7B2FF7" stopOpacity=".45" /><stop offset="1" stopColor="#3677FF" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="revLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#7B2FF7" /><stop offset=".55" stopColor="#3677FF" /><stop offset="1" stopColor="#10D7EF" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PL} x2={W - PR} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,.06)" strokeDasharray={t ? '3 4' : undefined} />
              <text x={PL - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#71717a">{t >= 1000 ? `${(t / 1000).toFixed(t % 1000 ? 1 : 0)}k` : Math.round(t)}</text>
            </g>
          ))}
          {data.map((d, i) => (i % labelEvery === 0 || i === data.length - 1) && (
            <text key={d.date} x={x(i)} y={H - 8} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'} fontSize="11" fill="#71717a">{day(d.date)}</text>
          ))}
          <path d={area} fill="url(#revArea)" className="animate-[fade-up_.8s_ease-out_both]" />
          <path d={line} fill="none" stroke="url(#revLine)" strokeWidth="2.5" strokeLinecap="round" pathLength={1}
            strokeDasharray="1" strokeDashoffset="0" className="[animation:draw_1.2s_ease-out_both]" />
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={PT} y2={H - PB} stroke="rgba(255,255,255,.25)" strokeDasharray="3 3" />
              <circle cx={x(hover)} cy={y(data[hover].revenue)} r="5" fill="#10D7EF" stroke="#080E20" strokeWidth="2" />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
