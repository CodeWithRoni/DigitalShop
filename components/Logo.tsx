import { SHOP_NAME } from '@/lib/utils';
export default function Logo({ size = 34, withText = true, sub }: { size?: number; withText?: boolean; sub?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="relative grid place-items-center rounded-xl bg-gradient-to-br from-brand to-accent-dark shadow-lg shadow-brand/30" style={{ width: size, height: size }}>
        <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="white" aria-hidden><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" /></svg>
      </span>
      {withText && (
        <span className="font-display text-[17px] font-extrabold tracking-tight">
          {SHOP_NAME}{sub && <span className="ml-1.5 text-xs font-medium text-zinc-500">{sub}</span>}
        </span>
      )}
    </span>
  );
}
