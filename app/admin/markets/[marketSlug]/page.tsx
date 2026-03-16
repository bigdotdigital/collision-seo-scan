import Link from 'next/link';
import { getAdminMarketConsoleState } from '@/lib/admin-market-console';
import { AdminLoginForm } from '@/app/admin/admin-login-form';
import { isAdminAuthed } from '@/app/admin/actions';
import { MarketConsole } from '@/components/admin-market/market-console';

export const dynamic = 'force-dynamic';

export default async function AdminMarketPage({
  params
}: {
  params: { marketSlug: string };
}) {
  if (!(process.env.ADMIN_PASSWORD || '').trim()) {
    return (
      <main className="container-shell py-12">
        <div className="card p-6">
          <h1 className="text-xl font-bold">Admin disabled</h1>
          <p className="mt-2 text-sm text-slate-600">Set `ADMIN_PASSWORD` to access this page.</p>
        </div>
      </main>
    );
  }

  const authed = await isAdminAuthed();
  if (!authed) return <AdminLoginForm />;

  const state = await getAdminMarketConsoleState(params.marketSlug);
  if (!state) {
    return (
      <main className="container-shell py-12">
        <div className="card p-6">
          <h1 className="text-xl font-bold">Market not found</h1>
          <p className="mt-2 text-sm text-slate-600">
            No collision market matched <span className="font-mono">{params.marketSlug}</span>.
          </p>
          <Link href="/admin" className="mt-4 inline-block text-sm text-teal-700 underline">
            Back to admin
          </Link>
        </div>
      </main>
    );
  }

  return <MarketConsole state={state} />;
}
