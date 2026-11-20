import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE, verifySessionToken } from './auth';

/** Call at the top of every admin page and server action. */
export async function requireAdmin() {
  const email = await verifySessionToken((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!email) redirect('/admin/login');
  return email;
}
