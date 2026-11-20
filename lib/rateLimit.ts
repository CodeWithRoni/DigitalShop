// Tiny in-memory rate limiter (per server instance). Good enough to stop casual abuse.
const hits = new Map<string, number[]>();
export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  return arr.length <= max;
}
export function clientIp(req: Request) {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
}
