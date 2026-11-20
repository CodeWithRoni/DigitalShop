import { requireAdmin } from '@/lib/admin';
import { PageHeader, Panel } from '@/components/admin/ui';
import PasswordForm from '@/components/admin/PasswordForm';

export default async function Account() {
  const me = await requireAdmin();
  return (
    <div className="max-w-xl">
      <PageHeader title="My account" subtitle={`${me.email} · ${me.role === 'owner' ? 'Owner' : 'Staff'}`} />
      <Panel title="Change password">
        {me.source === 'env'
          ? <p className="p-5 text-sm text-zinc-400">You are the main owner. Your password is <code className="text-zinc-200">ADMIN_PASSWORD</code> in Vercel → Settings → Environment Variables. Change it there and redeploy.</p>
          : <PasswordForm />}
      </Panel>
    </div>
  );
}
