/* eslint-disable @next/next/no-img-element */
import { SHOP_NAME } from '@/lib/utils';

/**
 * Brand logo from /public (see /brand for the full kit).
 * - full: shopping-bag mark + "DigitalShop" wordmark (logo-dark.png, for dark backgrounds)
 * - mark: the "D + cart" app icon only
 */
export default function Logo({ height = 34, variant = 'full', sub }: { height?: number; variant?: 'full' | 'mark'; sub?: string }) {
  if (variant === 'mark') {
    return <img src="/mark.png" alt={SHOP_NAME} width={Math.round(height * 1.12)} height={height} style={{ height, width: 'auto' }} />;
  }
  return (
    <span className="flex items-center gap-2">
      <img src="/logo-dark.png" alt={SHOP_NAME} width={Math.round(height * 3.8)} height={height} style={{ height, width: 'auto' }} />
      {sub && <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[11px] font-medium text-zinc-400">{sub}</span>}
    </span>
  );
}
