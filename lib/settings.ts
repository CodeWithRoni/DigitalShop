import 'server-only';
import { cache } from 'react';
import { q } from './db/pg';

export type Settings = {
  shop_name: string;
  whatsapp: string;
  support_email: string;
  notice_active: boolean;
  notice_text: string;
  notice_link: string;
  shop_open: boolean;
  closed_message: string;
  telegram_chat_id: string;
  notify_email: string;
  notify_unpaid: boolean;
  low_stock_threshold: number;
};

export const DEFAULT_SETTINGS: Settings = {
  shop_name: process.env.NEXT_PUBLIC_SHOP_NAME || 'DigitalShop',
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP || '',
  support_email: '',
  notice_active: false,
  notice_text: '',
  notice_link: '',
  shop_open: true,
  closed_message: 'We are not taking orders right now. Please check back soon.',
  telegram_chat_id: process.env.TELEGRAM_CHAT_ID || '',
  notify_email: '',
  notify_unpaid: false,
  low_stock_threshold: 3,
};

/** Store settings (DB values over env defaults). Cached per request. Never throws. */
export const getSettings = cache(async (): Promise<Settings> => {
  try {
    const rows = await q<{ key: string; value: unknown }>('select key, value from settings');
    const s = { ...DEFAULT_SETTINGS } as Record<string, unknown>;
    for (const r of rows) if (r.key in s) s[r.key] = r.value;
    return s as Settings;
  } catch {
    return DEFAULT_SETTINGS;
  }
});

export async function saveSettings(patch: Partial<Settings>) {
  const allowed = Object.keys(DEFAULT_SETTINGS);
  for (const [k, v] of Object.entries(patch)) {
    if (!allowed.includes(k)) continue;
    await q(`insert into settings (key, value, updated_at) values ($1, $2::jsonb, now())
             on conflict (key) do update set value = excluded.value, updated_at = now()`, [k, JSON.stringify(v)]);
  }
}

export const telegramConfigured = () => !!process.env.TELEGRAM_BOT_TOKEN;
export const emailConfigured = () => !!process.env.RESEND_API_KEY;
