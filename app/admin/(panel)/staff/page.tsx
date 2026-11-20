import { requireOwner } from '@/lib/admin';
import { q } from '@/lib/db/pg';
import { envOwnerEmail } from '@/lib/auth';
import { addStaff, deleteStaff, resetStaffPassword, toggleStaff } from '../../feature-actions';
import { Flash, Label, PageHeader, Panel } from '@/components/admin/ui';
import ConfirmButton from '@/components/ConfirmButton';
import Icon from '@/components/admin/Icon';

type U = { id: number; email: string; name: string | null; role: string; is_active: boolean; last_login_at: string | null; created_at: string };
const when = (d: string | null) => (d ? new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Dhaka' }) : 'Never');

export default async function Staff(props: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireOwner();
  const sp = await props.searchParams;
  const users = await q<U>('select id, email, name, role, is_active, last_login_at, created_at from admin_users order by is_active desc, role, email');

  return (
    <div>
      <PageHeader title="Staff & roles" subtitle="Give helpers their own login. Every action is recorded in the Activity log." />
      <Flash ok={sp.saved ? `Saved for ${sp.saved}` : null} error={sp.error} />

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="card p-4"><div className="flex items-center gap-2 font-semibold"><Icon name="shield" size={16} className="text-brand-light" />Owner</div>
          <p className="mt-1 text-sm text-zinc-400">Everything: dashboard, sales & reports, products and prices, coupons, stock, settings, staff.</p></div>
        <div className="card p-4"><div className="flex items-center gap-2 font-semibold"><Icon name="users" size={16} className="text-accent" />Staff</div>
          <p className="mt-1 text-sm text-zinc-400">Only Orders, Customers and message templates — can deliver orders, can’t see revenue or change prices.</p></div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Panel title="Add a team member" className="h-fit">
          <form action={addStaff} className="space-y-4 p-5">
            <div><Label>Name</Label><input name="name" className="input" placeholder="Rakib" /></div>
            <div><Label>Email (used to log in)</Label><input name="email" type="email" required className="input" /></div>
            <div><Label hint="(10+ characters — share it privately)">Password</Label><input name="password" type="text" required minLength={10} className="input font-mono" autoComplete="off" /></div>
            <div><Label>Role</Label><select name="role" className="input" defaultValue="staff"><option value="staff">Staff — orders only</option><option value="owner">Owner — full access</option></select></div>
            <button className="btn-primary w-full"><Icon name="plus" size={16} />Add member</button>
          </form>
        </Panel>

        <Panel title="Team">
          <div className="divide-y divide-white/[0.05]">
            <div className="flex items-center gap-3 px-5 py-4">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand to-accent-dark text-sm font-bold uppercase">{envOwnerEmail()[0]}</span>
              <div className="min-w-0 flex-1"><div className="font-medium">{envOwnerEmail()}</div><div className="text-xs text-zinc-500">Main owner · password in Vercel (ADMIN_PASSWORD)</div></div>
              <span className="badge border-brand/30 bg-brand/10 text-brand-light">Owner</span>
            </div>
            {users.map((u) => (
              <div key={u.id} className={`flex flex-wrap items-center gap-3 px-5 py-4 ${u.is_active ? '' : 'opacity-60'}`}>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.06] text-sm font-bold uppercase">{(u.name || u.email)[0]}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{u.name || u.email} {!u.is_active && <span className="text-xs text-red-300">(deactivated)</span>}</div>
                  <div className="text-xs text-zinc-500">{u.email} · last login {when(u.last_login_at)}</div>
                </div>
                <span className={`badge ${u.role === 'owner' ? 'border-brand/30 bg-brand/10 text-brand-light' : 'border-accent/30 bg-accent/10 text-accent'}`}>{u.role === 'owner' ? 'Owner' : 'Staff'}</span>
                <details className="relative">
                  <summary className="btn-ghost cursor-pointer list-none !px-3 !py-1.5 text-xs">Manage</summary>
                  <div className="absolute right-0 z-20 mt-2 w-72 space-y-3 rounded-xl border border-white/10 bg-[#0c1328] p-4 shadow-2xl">
                    <form action={resetStaffPassword} className="space-y-2"><input type="hidden" name="id" value={u.id} />
                      <input name="password" required minLength={10} placeholder="New password" className="input !py-2 font-mono" autoComplete="off" />
                      <button className="btn-ghost w-full !py-2 text-xs">Reset password</button></form>
                    <form action={toggleStaff}><input type="hidden" name="id" value={u.id} /><button className="btn-ghost w-full !py-2 text-xs">{u.is_active ? 'Deactivate (block login)' : 'Re-activate'}</button></form>
                    <form action={deleteStaff}><input type="hidden" name="id" value={u.id} /><ConfirmButton message={`Remove ${u.email}?`} className="btn-danger w-full !py-2 text-xs">Remove</ConfirmButton></form>
                  </div>
                </details>
              </div>
            ))}
            {!users.length && <p className="px-5 py-6 text-sm text-zinc-500">No team members yet.</p>}
          </div>
        </Panel>
      </div>
    </div>
  );
}
