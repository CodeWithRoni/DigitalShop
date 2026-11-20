'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAdmin, requireOwner } from '@/lib/admin';
import { logActivity } from '@/lib/activity';
import { one, q } from '@/lib/db/pg';
import { saveSettings, type Settings } from '@/lib/settings';
import { sendEmail, sendTelegram } from '@/lib/notify';
import { normalizeCode } from '@/lib/coupons';
import { recordRefund } from '@/lib/refunds';
import { addStock, deleteStockItem } from '@/lib/stock';
import { hashPassword, passwordProblem, verifyPassword } from '@/lib/password';
import { saveImage } from '@/lib/images';
import { envOwnerEmail } from '@/lib/auth';

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const num = (fd: FormData, k: string) => { const v = str(fd, k); return v === '' ? null : Number(v); };
const back = (path: string, params: Record<string, string>) => redirect(`${path}?${new URLSearchParams(params)}`);

/* ---------- Store settings & notifications ---------- */

export async function saveStoreSettings(fd: FormData) {
  const me = await requireOwner();
  const patch: Partial<Settings> = {
    shop_name: str(fd, 'shop_name').slice(0, 60) || 'DigitalShop',
    whatsapp: str(fd, 'whatsapp').replace(/\D/g, '').slice(0, 15),
    support_email: str(fd, 'support_email').slice(0, 120),
    notice_active: fd.get('notice_active') === 'on',
    notice_text: str(fd, 'notice_text').slice(0, 200),
    notice_link: str(fd, 'notice_link').slice(0, 300),
    shop_open: fd.get('shop_open') === 'on',
    closed_message: str(fd, 'closed_message').slice(0, 300),
    telegram_chat_id: str(fd, 'telegram_chat_id').slice(0, 40),
    notify_email: str(fd, 'notify_email').slice(0, 120),
    notify_unpaid: fd.get('notify_unpaid') === 'on',
    low_stock_threshold: Math.max(0, Math.min(1000, Number(str(fd, 'low_stock_threshold')) || 0)),
  };
  if (patch.notice_link && !/^(https?:\/\/|\/)/.test(patch.notice_link)) patch.notice_link = '';
  await saveSettings(patch);
  await logActivity(me.email, 'Updated store settings', 'settings', null, `shop ${patch.shop_open ? 'open' : 'closed'}${patch.notice_active ? `, notice: "${patch.notice_text}"` : ''}`);
  revalidatePath('/', 'layout');
  back('/admin/settings', { saved: '1' });
}

export async function sendTestNotification(fd: FormData) {
  await requireOwner();
  const kind = str(fd, 'kind');
  const err = kind === 'email'
    ? await sendEmail(str(fd, 'to'), 'Test notification ✓', '<p>Your shop can send you emails. 🎉</p>')
    : await sendTelegram('✅ <b>Test notification</b>\nYour shop is connected to Telegram. New orders will appear here.');
  back('/admin/settings', err ? { error: err } : { tested: kind });
}

/* ---------- Coupons ---------- */

export async function saveCoupon(fd: FormData) {
  const me = await requireOwner();
  const id = Number(fd.get('id')) || null;
  const code = normalizeCode(str(fd, 'code'));
  const type = str(fd, 'type') === 'fixed' ? 'fixed' : 'percent';
  const value = Number(str(fd, 'value'));
  if (code.length < 3) back('/admin/coupons', { error: 'Code must be at least 3 letters/numbers' });
  if (!(value > 0) || (type === 'percent' && value > 100)) back('/admin/coupons', { error: type === 'percent' ? 'Percent must be between 1 and 100' : 'Enter a discount amount above 0' });
  const vals = [code, type, value, num(fd, 'min_order') || 0, num(fd, 'max_discount'), num(fd, 'max_uses'),
    str(fd, 'starts_at') ? `${str(fd, 'starts_at')}T00:00:00+06:00` : null, str(fd, 'expires_at') ? `${str(fd, 'expires_at')}T23:59:59+06:00` : null, fd.get('is_active') === 'on'];
  try {
    if (id) await q(`update coupons set code=$1, type=$2, value=$3, min_order=$4, max_discount=$5, max_uses=$6, starts_at=$7, expires_at=$8, is_active=$9 where id=$10`, [...vals, id]);
    else await q(`insert into coupons (code, type, value, min_order, max_discount, max_uses, starts_at, expires_at, is_active) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, vals);
  } catch (e) {
    back('/admin/coupons', { error: (e as { code?: string }).code === '23505' ? `Coupon ${code} already exists` : (e as Error).message });
  }
  await logActivity(me.email, id ? 'Edited coupon' : 'Created coupon', 'coupon', id, `${code}: ${type === 'percent' ? `${value}%` : `৳${value}`} off`);
  revalidatePath('/admin/coupons');
  back('/admin/coupons', { saved: code });
}

export async function toggleCoupon(fd: FormData) {
  const me = await requireOwner();
  const r = await one<{ code: string; is_active: boolean }>('update coupons set is_active = not is_active where id = $1 returning code, is_active', [Number(fd.get('id'))]);
  if (r) await logActivity(me.email, r.is_active ? 'Enabled coupon' : 'Disabled coupon', 'coupon', str(fd, 'id'), r.code);
  revalidatePath('/admin/coupons');
}

export async function deleteCoupon(fd: FormData) {
  const me = await requireOwner();
  const r = await one<{ code: string }>('delete from coupons where id = $1 returning code', [Number(fd.get('id'))]);
  if (r) await logActivity(me.email, 'Deleted coupon', 'coupon', str(fd, 'id'), r.code);
  revalidatePath('/admin/coupons');
}

/* ---------- Refunds ---------- */

export async function addRefund(fd: FormData) {
  const me = await requireOwner();
  const orderId = Number(fd.get('order_id'));
  try {
    const r = await recordRefund(orderId, Number(str(fd, 'amount')), str(fd, 'reason').slice(0, 300), str(fd, 'method').slice(0, 60), me.email);
    await logActivity(me.email, 'Recorded refund', 'order', orderId, `${r.code}: ৳${str(fd, 'amount')} via ${str(fd, 'method') || '—'}${r.full ? ' (full)' : ''} — ${str(fd, 'reason')}`);
  } catch (e) {
    back(`/admin/orders/${orderId}`, { refundError: (e as Error).message });
  }
  revalidatePath(`/admin/orders/${orderId}`);
  back(`/admin/orders/${orderId}`, { refunded: '1' });
}

/* ---------- Stock ---------- */

export async function addStockAction(fd: FormData) {
  const me = await requireOwner();
  const pid = Number(fd.get('package_id'));
  const r = await addStock(pid, String(fd.get('items') || ''), str(fd, 'mode') === 'block' ? 'block' : 'line');
  await logActivity(me.email, 'Added stock', 'package', pid, `${r.added} added, ${r.skipped} duplicates skipped`);
  revalidatePath('/admin/stock');
  back('/admin/stock', { package: String(pid), added: String(r.added), skipped: String(r.skipped) });
}

export async function deleteStockAction(fd: FormData) {
  const me = await requireOwner();
  const r = await deleteStockItem(Number(fd.get('id')));
  if (r) await logActivity(me.email, 'Deleted stock item', 'package', r.package_id, `item #${str(fd, 'id')}`);
  revalidatePath('/admin/stock');
}

/* ---------- Message templates ---------- */

export async function saveTemplate(fd: FormData) {
  const me = await requireOwner();
  const id = Number(fd.get('id')) || null;
  const name = str(fd, 'name').slice(0, 80); const body = str(fd, 'body').slice(0, 3000);
  const pid = Number(fd.get('product_id')) || null;
  if (!name || !body) back('/admin/templates', { error: 'Name and message are required' });
  if (id) await q('update message_templates set name=$1, body=$2, product_id=$3 where id=$4', [name, body, pid, id]);
  else await q('insert into message_templates (name, body, product_id) values ($1,$2,$3)', [name, body, pid]);
  await logActivity(me.email, id ? 'Edited template' : 'Created template', 'template', id, name);
  revalidatePath('/admin/templates');
  back('/admin/templates', { saved: '1' });
}

export async function deleteTemplate(fd: FormData) {
  const me = await requireOwner();
  const r = await one<{ name: string }>('delete from message_templates where id = $1 returning name', [Number(fd.get('id'))]);
  if (r) await logActivity(me.email, 'Deleted template', 'template', str(fd, 'id'), r.name);
  revalidatePath('/admin/templates');
}

/* ---------- Staff ---------- */

export async function addStaff(fd: FormData) {
  const me = await requireOwner();
  const email = str(fd, 'email').toLowerCase(); const name = str(fd, 'name').slice(0, 60);
  const role = str(fd, 'role') === 'owner' ? 'owner' : 'staff';
  const pw = String(fd.get('password') || '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) back('/admin/staff', { error: 'Enter a valid email' });
  if (email === envOwnerEmail()) back('/admin/staff', { error: 'That email is already the main owner' });
  const bad = passwordProblem(pw); if (bad) back('/admin/staff', { error: bad });
  try {
    await q('insert into admin_users (email, name, role, password_hash) values ($1,$2,$3,$4)', [email, name || null, role, await hashPassword(pw)]);
  } catch (e) {
    back('/admin/staff', { error: (e as { code?: string }).code === '23505' ? 'This email already has an account' : (e as Error).message });
  }
  await logActivity(me.email, 'Added team member', 'staff', email, role);
  revalidatePath('/admin/staff');
  back('/admin/staff', { saved: email });
}

export async function toggleStaff(fd: FormData) {
  const me = await requireOwner();
  const r = await one<{ email: string; is_active: boolean }>('update admin_users set is_active = not is_active where id = $1 returning email, is_active', [Number(fd.get('id'))]);
  if (r) await logActivity(me.email, r.is_active ? 'Re-activated team member' : 'Deactivated team member', 'staff', r.email);
  revalidatePath('/admin/staff');
}

export async function resetStaffPassword(fd: FormData) {
  const me = await requireOwner();
  const pw = String(fd.get('password') || '');
  const bad = passwordProblem(pw); if (bad) back('/admin/staff', { error: bad });
  const r = await one<{ email: string }>('update admin_users set password_hash = $1 where id = $2 returning email', [await hashPassword(pw), Number(fd.get('id'))]);
  if (r) await logActivity(me.email, 'Reset password', 'staff', r.email);
  back('/admin/staff', { saved: r?.email || '' });
}

export async function deleteStaff(fd: FormData) {
  const me = await requireOwner();
  const r = await one<{ email: string }>('delete from admin_users where id = $1 returning email', [Number(fd.get('id'))]);
  if (r) await logActivity(me.email, 'Removed team member', 'staff', r.email);
  revalidatePath('/admin/staff');
}

export async function changeMyPassword(_: unknown, fd: FormData): Promise<{ error?: string; ok?: boolean }> {
  const me = await requireAdmin();
  if (me.source === 'env') return { error: 'The main owner password is set in Vercel (ADMIN_PASSWORD).' };
  const u = await one<{ id: number; password_hash: string }>('select id, password_hash from admin_users where email = $1', [me.email]);
  if (!u || !(await verifyPassword(String(fd.get('current') || ''), u.password_hash))) return { error: 'Current password is wrong' };
  const pw = String(fd.get('password') || '');
  const bad = passwordProblem(pw); if (bad) return { error: bad };
  await q('update admin_users set password_hash = $1 where id = $2', [await hashPassword(pw), u.id]);
  await logActivity(me.email, 'Changed own password', 'staff', me.email);
  return { ok: true };
}

/* ---------- Reviews ---------- */

export async function setReviewStatus(fd: FormData) {
  const me = await requireOwner();
  const status = str(fd, 'status');
  if (!['approved', 'hidden', 'pending'].includes(status)) return;
  const r = await one<{ customer_name: string; rating: number }>('update reviews set status = $1 where id = $2 returning customer_name, rating', [status, Number(fd.get('id'))]);
  if (r) await logActivity(me.email, `Review ${status}`, 'review', str(fd, 'id'), `${r.customer_name} · ${r.rating}★`);
  revalidatePath('/admin/reviews');
}

export async function deleteReview(fd: FormData) {
  const me = await requireOwner();
  await q('delete from reviews where id = $1', [Number(fd.get('id'))]);
  await logActivity(me.email, 'Deleted review', 'review', str(fd, 'id'));
  revalidatePath('/admin/reviews');
}

/* ---------- Image upload (product editor) ---------- */

export async function uploadImage(fd: FormData): Promise<{ url?: string; error?: string }> {
  const me = await requireOwner();
  const file = fd.get('file');
  if (!(file instanceof File)) return { error: 'No file' };
  const r = await saveImage(file);
  if ('url' in r) await logActivity(me.email, 'Uploaded image', 'image', r.url);
  return r;
}
