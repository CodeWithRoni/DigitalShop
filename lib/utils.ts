export const SHOP_NAME = process.env.NEXT_PUBLIC_SHOP_NAME || 'DigitalShop';
export const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP || '';
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

export function taka(n: number | string) {
  return '৳' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export function minPrice(pkgs?: { price: number; is_active: boolean }[]) {
  const active = (pkgs || []).filter((p) => p.is_active).map((p) => Number(p.price));
  return active.length ? Math.min(...active) : null;
}

export function orderCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return 'DS-' + Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

export function normalizePhone(p: string) {
  const d = p.replace(/\D/g, '');
  if (d.startsWith('880')) return '0' + d.slice(3);
  return d;
}

export const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending', processing: 'Processing', delivered: 'Delivered',
  cancelled: 'Cancelled', refunded: 'Refunded',
  unpaid: 'Unpaid', paid: 'Paid', failed: 'Failed',
};

export const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  processing: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  delivered: 'bg-green-500/15 text-green-300 border-green-500/30',
  cancelled: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
  refunded: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  unpaid: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
  paid: 'bg-green-500/15 text-green-300 border-green-500/30',
  failed: 'bg-red-500/15 text-red-300 border-red-500/30',
};
