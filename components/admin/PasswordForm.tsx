'use client';
import { useActionState } from 'react';
import { changeMyPassword } from '@/app/admin/feature-actions';

export default function PasswordForm() {
  const [state, action, pending] = useActionState(changeMyPassword, null as { error?: string; ok?: boolean } | null);
  return (
    <form action={action} className="space-y-4 p-5">
      <div><label className="label">Current password</label><input name="current" type="password" required className="input" autoComplete="current-password" /></div>
      <div><label className="label">New password (10+ characters)</label><input name="password" type="password" required minLength={10} className="input" autoComplete="new-password" /></div>
      {state?.error && <p className="text-sm text-red-300">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-300">Password changed ✓</p>}
      <button className="btn-primary" disabled={pending}>{pending ? 'Saving…' : 'Change password'}</button>
    </form>
  );
}
