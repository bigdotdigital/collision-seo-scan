'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFormState, useFormStatus } from 'react-dom';
import { loginClient } from './actions';

const initialState = { ok: false, message: '' };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white"
    >
      {pending ? 'Signing in...' : 'Sign in'}
    </button>
  );
}

export function LoginForm() {
  const [state, action] = useFormState(loginClient, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) router.push('/dashboard');
  }, [router, state?.ok]);

  return (
    <form action={action} className="card mx-auto w-full max-w-md p-6">
      <h1 className="text-2xl font-bold">Client Portal Login</h1>
      <p className="mt-1 text-sm text-slate-600">Use the credentials from your invite email.</p>

      <label className="mt-4 flex flex-col gap-1 text-sm">
        Email
        <input name="email" type="email" required className="rounded-md border border-slate-300 px-3 py-2" />
      </label>

      <label className="mt-3 flex flex-col gap-1 text-sm">
        Password
        <input name="password" type="password" required className="rounded-md border border-slate-300 px-3 py-2" />
      </label>

      {state?.message ? <p className="mt-3 text-sm text-red-600">{state.message}</p> : null}

      <div className="mt-4">
        <SubmitButton />
      </div>
    </form>
  );
}
