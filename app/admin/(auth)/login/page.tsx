'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { login } from '../../actions';
import Logo from '@/components/Logo';

function Submit() {
  const { pending } = useFormStatus();
  return <button className="btn-primary w-full" disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</button>;
}

export default function Login() {
  const [state, action] = useFormState(login, null as { error?: string } | null);
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <form action={action} className="card w-full max-w-sm space-y-4 p-7">
        <div className="text-center">
          <div className="mb-4 flex justify-center"><Logo variant="mark" height={56} /></div>
          <h1 className="text-xl font-bold">Admin Panel</h1>
          <p className="text-sm text-zinc-400">Sign in to manage orders</p>
        </div>
        <div><label className="label">Email</label><input name="email" type="email" required className="input" autoComplete="username" /></div>
        <div><label className="label">Password</label><input name="password" type="password" required className="input" autoComplete="current-password" /></div>
        {state?.error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{state.error}</p>}
        <Submit />
      </form>
    </div>
  );
}
