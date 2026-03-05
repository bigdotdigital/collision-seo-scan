import Link from 'next/link';
import { requireDashboardClient } from '@/lib/dashboard-auth';
import { logoutClient } from '@/app/login/actions';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const client = await requireDashboardClient();

  return (
    <main className="container-shell py-8">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Client Portal</p>
          <h1 className="text-2xl font-bold text-slate-900">{client.shopName}</h1>
          <p className="text-sm text-slate-600">{client.city}</p>
        </div>
        <form action={logoutClient}>
          <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium">
            Logout
          </button>
        </form>
      </div>

      <nav className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link href="/dashboard" className="rounded-md border border-slate-300 px-3 py-2">Overview</Link>
        <Link href="/dashboard/keywords" className="rounded-md border border-slate-300 px-3 py-2">Keywords</Link>
        <Link href="/dashboard/reviews" className="rounded-md border border-slate-300 px-3 py-2">Reviews</Link>
        <Link href="/dashboard/reports" className="rounded-md border border-slate-300 px-3 py-2">Snapshots</Link>
      </nav>

      {children}
    </main>
  );
}
