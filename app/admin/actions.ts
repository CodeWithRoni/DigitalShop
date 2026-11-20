'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { requireAdmin, requireOwner } from '@/lib/admin';
import { logActivity } from '@/lib/activity';
import { one, q } from '@/lib/db/pg';
import { verifyPassword } from '@/lib/password';
import { ADMIN_COOKIE, checkEnvOwner, cookieOptions, createSessionToken, envOwnerEmail } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
import type { OrderStatus, PaymentStatus, ProductPayload } from '@/lib/types';

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export async function login(_: unknown, fd: FormData) {
  const ip = ((await headers()).get('x-forwarded-for') || 'local').split(',')[0];
  if (!rateLimit('login:' + ip, 8, 15 * 60_000)) return { error: 'Too many attempts. Try again in 15 minutes.' };
  const email = str(fd, 'email').toLowerCase(); const password = String(fd.get('password') || '');
  let ok = await checkEnvOwner(email, password);
  let role = 'owner';
  if (!ok && email !== envOwnerEmail()) {
    const u = await one<{ id: number; password_hash: string; role: string }>(
      'select id, password_hash, role from admin_users where email = $1 and is_active', [email]).catch(() => null);
    if (u && (await verifyPassword(password, u.password_hash))) {
      ok = true; role = u.role;
      await q('update admin_users set last_login_at = now() where id = $1', [u.id]);
    }
  }
  if (!ok) return { error: 'Wrong email or password' };
  (await cookies()).set(ADMIN_COOKIE, await createSessionToken(email), cookieOptions);
  await logActivity(email, 'Signed in', 'admin', null, `role: ${role}`);
  redirect(role === 'owner' ? '/admin' : '/admin/orders');
}

export async function logout() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect('/admin/login');
}

const ORDER_STATUSES: OrderStatus[] = ['pending', 'processing', 'delivered', 'cancelled', 'refunded'];
const PAY_STATUSES: PaymentStatus[] = ['unpaid', 'paid', 'failed', 'refunded'];

export async function updateOrder(fd: FormData) {
  const me = await requireAdmin();
  const id = Number(fd.get('id'));
  const order = await db.getOrderById(id);
  if (!order) return;
  const status = str(fd, 'status') as OrderStatus;
  const payment_status = str(fd, 'payment_status') as PaymentStatus;
  const patch: Record<string, unknown> = {
    delivery_message: str(fd, 'delivery_message') || null,
    admin_note: str(fd, 'admin_note') || null,
  };
  if (ORDER_STATUSES.includes(status)) patch.status = status;
  if (PAY_STATUSES.includes(payment_status)) {
    patch.payment_status = payment_status;
    if (payment_status === 'paid' && order.payment_status !== 'paid') {
      patch.paid_at = new Date().toISOString();
      patch.payment_method = order.payment_method || 'Manual (admin)';
    }
  }
  await db.updateOrder(id, patch);
  const changes = [
    patch.status && patch.status !== order.status ? `status ${order.status} → ${patch.status}` : '',
    patch.payment_status && patch.payment_status !== order.payment_status ? `payment ${order.payment_status} → ${patch.payment_status}` : '',
    (patch.delivery_message || null) !== (order.delivery_message || null) ? 'delivery message updated' : '',
    (patch.admin_note || null) !== (order.admin_note || null) ? 'note updated' : '',
  ].filter(Boolean).join(', ');
  if (changes) await logActivity(me.email, 'Updated order', 'order', id, `${order.code}: ${changes}`);
  if (patch.status === 'delivered' && order.status !== 'delivered') await import('@/lib/notify').then((n) => n.notifyDelivered(id)).catch(() => {});
  revalidatePath(`/admin/orders/${id}`);
  redirect(`/admin/orders/${id}?saved=1`);
}

/** Bulk status change from the Orders list. */
export async function bulkSetStatus(fd: FormData) {
  const me = await requireAdmin();
  const status = str(fd, 'status') as OrderStatus;
  const ids = fd.getAll('ids').map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 200);
  const back = str(fd, 'back') || '/admin/orders';
  if (!ORDER_STATUSES.includes(status) || !ids.length) redirect(back);
  const rows = await q<{ id: number; code: string; status: string }>('select id, code, status from orders where id = any($1::bigint[])', [ids]);
  await q('update orders set status = $1 where id = any($2::bigint[])', [status, ids]);
  await logActivity(me.email, 'Bulk updated orders', 'order', null, `${rows.length} orders → ${status}: ${rows.map((r) => r.code).join(', ')}`);
  if (status === 'delivered') {
    const n = await import('@/lib/notify');
    for (const r of rows) if (r.status !== 'delivered') await n.notifyDelivered(r.id).catch(() => {});
  }
  revalidatePath('/admin/orders');
  revalidatePath('/admin');
  redirect(back + (back.includes('?') ? '&' : '?') + `bulk=${rows.length}`);
}

export async function setOrderStatus(fd: FormData) {
  const me = await requireAdmin();
  const id = Number(fd.get('id'));
  const status = str(fd, 'status') as OrderStatus;
  if (!ORDER_STATUSES.includes(status)) return;
  const order = await db.getOrderById(id);
  if (!order) return;
  await db.updateOrder(id, { status });
  await logActivity(me.email, 'Updated order', 'order', id, `${order.code}: status ${order.status} → ${status}`);
  if (status === 'delivered' && order.status !== 'delivered') await import('@/lib/notify').then((n) => n.notifyDelivered(id)).catch(() => {});
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath('/admin');
  redirect(`/admin/orders/${id}?saved=1`);
}

export async function saveProductFull(_: unknown, fd: FormData): Promise<{ error?: string }> {
  const me = await requireOwner();
  let d: ProductPayload;
  try { d = JSON.parse(String(fd.get('data') || '')); } catch { return { error: 'Invalid form data' }; }
  const name = (d.name || '').trim().slice(0, 120);
  const slug = slugify((d.slug || '').trim() || name);
  if (!name || !slug) return { error: 'Product name is required' };
  const pkgs = (d.packages || [])
    .map((k, i) => ({ id: Number(k.id) || undefined, name: String(k.name || '').trim().slice(0, 120), price: Number(k.price), is_active: !!k.is_active, sort_order: i }))
    .filter((k) => k.name || k.id);
  for (const k of pkgs) {
    if (!k.name) return { error: 'Every package needs a name' };
    if (!Number.isFinite(k.price) || k.price < 0) return { error: `Enter a valid price for "${k.name}"` };
  }
  let saved;
  try {
    saved = await db.saveProduct({
      id: Number(d.id) || undefined, name, slug,
      category_id: Number(d.category_id) || null,
      short_description: d.short_description?.trim() || null,
      description: d.description?.trim() || null,
      image_url: d.image_url?.trim() || null,
      delivery_label: d.delivery_label?.trim() || 'Email / Account info',
      delivery_hint: d.delivery_hint?.trim() || null,
      is_active: !!d.is_active, is_featured: !!d.is_featured,
      sort_order: Number(d.sort_order) || 0,
    });
    const existing = d.id ? (await db.getProductById(saved.id))?.packages || [] : [];
    const keep = new Set(pkgs.filter((k) => k.id).map((k) => k.id));
    for (const old of existing) if (!keep.has(old.id)) await db.deletePackage(old.id);
    for (const k of pkgs) {
      const own = !k.id || existing.some((e) => e.id === k.id);
      if (own) await db.savePackage({ ...k, id: k.id, product_id: saved.id });
    }
  } catch (e) {
    return { error: (e as Error).message === 'Slug already used' ? 'Another product already uses this URL slug — change the name or slug.' : (e as Error).message };
  }
  await logActivity(me.email, d.id ? 'Edited product' : 'Created product', 'product', saved.id,
    `${name} · ${pkgs.map((k) => `${k.name} ৳${k.price}${k.is_active ? '' : ' (off)'}`).join(', ')}`);
  revalidatePath('/admin/products');
  revalidatePath(`/admin/products/${saved.id}`);
  redirect(`/admin/products/${saved.id}?saved=1`);
}

export async function toggleProduct(fd: FormData) {
  const me = await requireOwner();
  const id = Number(fd.get('id'));
  const p = await db.getProductById(id);
  if (p) {
    await db.saveProduct({ id, name: p.name, slug: p.slug, is_active: !p.is_active });
    await logActivity(me.email, p.is_active ? 'Hid product' : 'Showed product', 'product', id, p.name);
  }
  revalidatePath('/admin/products');
}

export async function deleteProduct(fd: FormData) {
  const me = await requireOwner();
  const id = Number(fd.get('id'));
  const p = await db.getProductById(id);
  await db.deleteProduct(id);
  await logActivity(me.email, 'Deleted product', 'product', id, p?.name);
  revalidatePath('/admin/products');
  redirect('/admin/products');
}

export async function saveCategory(fd: FormData) {
  const me = await requireOwner();
  const name = str(fd, 'name');
  const slug = slugify(str(fd, 'slug') || name);
  if (!name) return;
  try {
    await db.saveCategory({ id: Number(fd.get('id')) || undefined, name, slug, description: str(fd, 'description') || null, sort_order: Number(fd.get('sort_order')) || 0 });
  } catch (e) {
    redirect(`/admin/categories?error=${encodeURIComponent((e as Error).message)}`);
  }
  await logActivity(me.email, fd.get('id') ? 'Edited category' : 'Created category', 'category', str(fd, 'id') || null, name);
  revalidatePath('/admin/categories');
}

export async function deleteCategory(fd: FormData) {
  const me = await requireOwner();
  await db.deleteCategory(Number(fd.get('id')));
  await logActivity(me.email, 'Deleted category', 'category', str(fd, 'id'));
  revalidatePath('/admin/categories');
}
