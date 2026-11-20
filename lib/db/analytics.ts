// Date helpers (Asia/Dhaka).

const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000; // Asia/Dhaka is UTC+6, no DST

/** YYYY-MM-DD in Asia/Dhaka for a timestamp. */
export function dhakaDate(ts: string | number | Date) {
  return new Date(new Date(ts).getTime() + DHAKA_OFFSET_MS).toISOString().slice(0, 10);
}
/** Last `n` Dhaka dates ending today (oldest first), optionally shifted back by `shift` days. */
export function lastDays(n: number, shift = 0) {
  const today = new Date(dhakaDate(Date.now()) + 'T00:00:00Z').getTime();
  return Array.from({ length: n }, (_, i) => new Date(today - (n - 1 - i + shift) * 86400000).toISOString().slice(0, 10));
}

