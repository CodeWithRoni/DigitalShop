'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { ADMIN_COOKIE, checkCredentials, cookieOptions, createSessionToken } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
import type { OrderStatus, PaymentStatus } from '@/lib/types';

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export async function login(_: unknown, fd: FormData) {
  const ip = ((await headers()).get('x-forwarded-for') || 'local').split(',')[0];
  if (!rateLimit('login:' + ip, 8, 15 * 60_000)) return { error: 'Too many attempts. Try again in 15 minutes.' };
  const email = str(fd, 'email'); const password = String(fd.get('password') || '');
  if (!(await checkCredentials(email, password))) return { error: 'Wrong email or password' };
  (await cookies()).set(ADMIN_COOKIE, await createSessionToken(email.toLowerCase()), cookieOptions);
  redirect('/admin');
}

export async function logout() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect('/admin/login');
}

const ORDER_STATUSES: OrderStatus[] = ['pending', 'processing', 'delivered', 'cancelled', 'refunded'];
const PAY_STATUSES: PaymentStatus[] = ['unpaid', 'paid', 'failed', 'refunded'];

export async function updateOrder(fd: FormData) {
  await requireAdmin();
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
  revalidatePath(`/admin/orders/${id}`);
  redirect(`/admin/orders/${id}?saved=1`);
}


export async function setOrderStatus(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get('id'));
  const status = str(fd, 'status') as OrderStatus;
  if (!ORDER_STATUSES.includes(status)) return;
  await db.updateOrder(id, { status });
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath('/admin');
  redirect(`/admin/orders/${id}?saved=1`);
}

export async function saveProduct(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get('id')) || undefined;
  const name = str(fd, 'name');
  const slug = slugify(str(fd, 'slug') || name);
  if (!name || !slug) redirect(`/admin/products/${id ?? 'new'}?error=Name+is+required`);
  let saved;
  try {
    saved = await db.saveProduct({
      id, name, slug,
      category_id: Number(fd.get('category_id')) || null,
      short_description: str(fd, 'short_description') || null,
      description: str(fd, 'description') || null,
      image_url: str(fd, 'image_url') || null,
      delivery_label: str(fd, 'delivery_label') || 'Email / Account info',
      delivery_hint: str(fd, 'delivery_hint') || null,
      is_active: fd.get('is_active') === 'on',
      is_featured: fd.get('is_featured') === 'on',
      sort_order: Number(fd.get('sort_order')) || 0,
    });
  } catch (e) {
    redirect(`/admin/products/${id ?? 'new'}?error=${encodeURIComponent((e as Error).message)}`);
  }
  revalidatePath('/admin/products');
  redirect(`/admin/products/${saved.id}?saved=1`);
}

export async function toggleProduct(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get('id'));
  const p = await db.getProductById(id);
  if (p) await db.saveProduct({ id, name: p.name, slug: p.slug, is_active: !p.is_active });
  revalidatePath('/admin/products');
}

export async function deleteProduct(fd: FormData) {
  await requireAdmin();
  await db.deleteProduct(Number(fd.get('id')));
  revalidatePath('/admin/products');
  redirect('/admin/products');
}

export async function savePackage(fd: FormData) {
  await requireAdmin();
  const product_id = Number(fd.get('product_id'));
  const price = Number(fd.get('price'));
  const name = str(fd, 'name');
  if (!name || !Number.isFinite(price) || price < 0) redirect(`/admin/products/${product_id}?error=Package+name+and+valid+price+required`);
  await db.savePackage({
    id: Number(fd.get('id')) || undefined, product_id, name, price,
    is_active: fd.get('is_active') === 'on', sort_order: Number(fd.get('sort_order')) || 0,
  });
  revalidatePath(`/admin/products/${product_id}`);
}

export async function deletePackage(fd: FormData) {
  await requireAdmin();
  await db.deletePackage(Number(fd.get('id')));
  revalidatePath(`/admin/products/${Number(fd.get('product_id'))}`);
}

export async function saveCategory(fd: FormData) {
  await requireAdmin();
  const name = str(fd, 'name');
  const slug = slugify(str(fd, 'slug') || name);
  if (!name) return;
  try {
    await db.saveCategory({ id: Number(fd.get('id')) || undefined, name, slug, description: str(fd, 'description') || null, sort_order: Number(fd.get('sort_order')) || 0 });
  } catch (e) {
    redirect(`/admin/categories?error=${encodeURIComponent((e as Error).message)}`);
  }
  revalidatePath('/admin/categories');
}

export async function deleteCategory(fd: FormData) {
  await requireAdmin();
  await db.deleteCategory(Number(fd.get('id')));
  revalidatePath('/admin/categories');
}
