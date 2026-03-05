'use client';

import { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { loginAdmin } from './actions';

const initialState = { ok: false, message: '' };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
    >
      {pending ? 'Checking...' : 'Enter Admin'}
    </button>
  );
}

export function AdminLoginForm() {
  const router = useRouter();
  const [state, action] = useFormState(loginAdmin, initialState);

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [router, state?.ok]);

  return (
    <form action={action} className="card mx-auto mt-20 max-w-sm p-6">
      <h1 className="text-xl font-bold">Admin Access</h1>
      <label className="mt-4 flex flex-col gap-1 text-sm">
        Password
        <input name="password" type="password" className="rounded-md border border-slate-300 px-3 py-2" required />
      </label>
      {state?.message ? <p className="mt-2 text-sm text-red-600">{state.message}</p> : null}
      <div className="mt-4">
        <SubmitButton />
      </div>
    </form>
  );
}
