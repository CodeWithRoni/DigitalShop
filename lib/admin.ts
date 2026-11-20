import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE, envOwnerEmail, verifySessionToken } from './auth';
import { one } from './db/pg';

export type Role = 'owner' | 'staff';
export type Admin = { email: string; name: string | null; role: Role; source: 'env' | 'db' };

/** Current signed-in admin (checked against the DB on every request, so deactivation is instant). */
export const getAdmin = cache(async (): Promise<Admin | null> => {
  const email = await verifySessionToken((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!email) return null;
  if (email === envOwnerEmail()) return { email, name: null, role: 'owner', source: 'env' };
  const u = await one<{ email: string; name: string | null; role: Role }>(
    'select email, name, role from admin_users where email = $1 and is_active', [email]);
  return u ? { ...u, source: 'db' } : null;
});

/** Any signed-in admin or staff. */
export async function requireAdmin() {
  const a = await getAdmin();
  if (!a) redirect('/admin/login');
  return a;
}
/** Owner only (products, prices, settings, reports…). Staff are sent to Orders. */
export async function requireOwner() {
  const a = await requireAdmin();
  if (a.role !== 'owner') redirect('/admin/orders?denied=1');
  return a;
}
