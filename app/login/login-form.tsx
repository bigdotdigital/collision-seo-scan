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
    <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(13,148,136,0.12),_transparent_42%),linear-gradient(180deg,#ffffff,_#f8fafc)] p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Shop SEO Scan</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900">
          Monitoring dashboard for collision shops
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
          Sign in to see your saved scans, weekly tracking, local demand pressure, and the next fixes most likely to move estimates.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Saved history</p>
            <p className="mt-2 text-sm text-slate-700">Your scans and trends stay attached to your workspace.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Weekly monitoring</p>
            <p className="mt-2 text-sm text-slate-700">Fresh scan telemetry and scan-backed opportunity tracking.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Local context</p>
            <p className="mt-2 text-sm text-slate-700">Demand pressure, map presence, and competitor signal in one place.</p>
          </div>
        </div>
      </section>

      <form action={action} className="card w-full p-6">
        <h2 className="text-2xl font-bold">Sign in</h2>
        <p className="mt-1 text-sm text-slate-600">
          Use the credentials from your invite email or the account you created during trial signup.
        </p>

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

        <div className="mt-5 space-y-2 text-sm text-slate-600">
          <p>
            New here?{' '}
            <a href="/monitoring" className="font-medium text-teal-700 hover:text-teal-800">
              Create your monitoring account
            </a>
          </p>
          <p>
            Need help?{' '}
            <a href="mailto:support@bigdotdigital.com" className="font-medium text-teal-700 hover:text-teal-800">
              Email support
            </a>
          </p>
        </div>
      </form>
    </div>
  );
}
