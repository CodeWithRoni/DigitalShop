import 'server-only';
import { one } from './db/pg';
import { getSettings } from './settings';
import { SITE_URL, taka } from './utils';
import type { Order } from './types';

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function withTimeout(p: Promise<Response>, ms = 6000) {
  const t = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));
  return Promise.race([p, t]);
}

/** Send a Telegram message to the shop's chat. Returns an error string or null. */
export async function sendTelegram(html: string, chatIdOverride?: string): Promise<string | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = chatIdOverride || (await getSettings()).telegram_chat_id;
  if (!token) return 'TELEGRAM_BOT_TOKEN is not set in Vercel';
  if (!chat) return 'Telegram chat ID is empty';
  try {
    const r = await withTimeout(fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text: html.slice(0, 4000), parse_mode: 'HTML', disable_web_page_preview: true }),
    }));
    if (!r.ok) return `Telegram: ${((await r.json().catch(() => ({}))) as { description?: string }).description || r.status}`;
    return null;
  } catch (e) {
    return `Telegram: ${(e as Error).message}`;
  }
}

/** Send an email through Resend (https://resend.com). Returns an error string or null. */
export async function sendEmail(to: string, subject: string, html: string): Promise<string | null> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return 'RESEND_API_KEY is not set in Vercel';
  if (!to) return 'No recipient';
  const s = await getSettings();
  const from = process.env.RESEND_FROM || `${s.shop_name} <onboarding@resend.dev>`;
  try {
    const r = await withTimeout(fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, html }),
    }));
    if (!r.ok) return `Email: ${((await r.json().catch(() => ({}))) as { message?: string }).message || r.status}`;
    return null;
  } catch (e) {
    return `Email: ${(e as Error).message}`;
  }
}

async function loadOrder(id: number) {
  return one<Order>(`select o.*, coalesce((select json_agg(i order by i.id) from order_items i where i.order_id = o.id), '[]') as order_items from orders o where o.id = $1`, [id]);
}
const itemsText = (o: Order) => (o.order_items || []).map((i) => `• ${esc(i.product_name)} — ${esc(i.package_name)} ×${i.quantity}\n   ↳ <code>${esc(i.delivery_info)}</code>`).join('\n');

/** Tell the shop owner about a new order (paid, or unpaid if enabled). Never throws. */
export async function notifyNewOrder(orderId: number, kind: 'paid' | 'placed') {
  try {
    const s = await getSettings();
    if (kind === 'placed' && !s.notify_unpaid) return;
    const o = await loadOrder(orderId);
    if (!o) return;
    const head = kind === 'paid'
      ? (o.auto_delivered ? '✅ <b>Paid & auto-delivered</b>' : '💰 <b>New paid order — deliver now</b>')
      : '🕓 <b>New order (not paid yet)</b>';
    const text = `${head}\n\n<b>${esc(o.code)}</b> · ${esc(taka(o.total))}${Number(o.discount) ? ` (coupon ${esc(o.coupon_code)})` : ''}\n👤 ${esc(o.customer_name)} · ${esc(o.customer_phone)}\n\n${itemsText(o)}\n\n<a href="${SITE_URL}/admin/orders/${o.id}">Open in admin →</a>`;
    await sendTelegram(text);
    if (s.notify_email) {
      await sendEmail(s.notify_email, `${kind === 'paid' ? 'New paid order' : 'New order'} ${o.code} — ${taka(o.total)}`,
        `<p>${text.replace(/\n/g, '<br>')}</p>`);
    }
  } catch (e) {
    console.error('notifyNewOrder failed', e);
  }
}

/** Email the customer that their order is delivered (only if they gave an email). Never throws. */
export async function notifyDelivered(orderId: number) {
  try {
    const o = await loadOrder(orderId);
    if (!o?.customer_email || !process.env.RESEND_API_KEY) return;
    const s = await getSettings();
    const items = (o.order_items || []).map((i) => `<li>${esc(i.product_name)} — ${esc(i.package_name)} × ${i.quantity}</li>`).join('');
    await sendEmail(o.customer_email, `Your order ${o.code} is delivered ✓`, `
      <div style="font-family:Arial,sans-serif;max-width:520px">
        <h2>Hi ${esc(o.customer_name)}, your order is ready!</h2>
        <p>Order <b>${esc(o.code)}</b></p><ul>${items}</ul>
        <p>See your delivery details here (use your order code and phone number):</p>
        <p><a href="${SITE_URL}/track?code=${encodeURIComponent(o.code)}" style="background:#7B2FF7;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">View my order</a></p>
        <p style="color:#888">— ${esc(s.shop_name)}</p>
      </div>`);
  } catch (e) {
    console.error('notifyDelivered failed', e);
  }
}

export async function notifyLowStock(packageId: number) {
  try {
    const s = await getSettings();
    const r = await one<{ product: string; package: string; left: number }>(
      `select p.name as product, k.name as package,
         (select count(*)::int from stock_items x where x.package_id = k.id and x.status = 'available') as left
       from packages k join products p on p.id = k.product_id where k.id = $1`, [packageId]);
    if (!r || r.left > s.low_stock_threshold) return;
    await sendTelegram(`${r.left === 0 ? '🚫 <b>Out of stock</b>' : '⚠️ <b>Low stock</b>'}\n${esc(r.product)} — ${esc(r.package)}: <b>${r.left}</b> left\n<a href="${SITE_URL}/admin/stock">Add stock →</a>`);
  } catch (e) {
    console.error('notifyLowStock failed', e);
  }
}

export async function notifyReview(productName: string, rating: number, name: string) {
  await sendTelegram(`⭐ <b>New review (${rating}/5)</b> for ${esc(productName)} by ${esc(name)}\n<a href="${SITE_URL}/admin/reviews">Approve or hide →</a>`).catch(() => null);
}

