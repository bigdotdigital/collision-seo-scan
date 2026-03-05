'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { logoutAdmin } from './actions';

export function LogoutButton() {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <button
      onClick={() =>
        start(async () => {
          await logoutAdmin();
          router.refresh();
        })
      }
      className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium"
      disabled={pending}
    >
      {pending ? 'Signing out...' : 'Logout'}
    </button>
  );
}
