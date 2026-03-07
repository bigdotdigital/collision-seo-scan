import { SidebarNav } from '@/components/sidebar-nav';
import { logoutClient } from '@/app/login/actions';
import { requireDashboardContext } from '@/lib/dashboard-auth';
import { prisma } from '@/lib/prisma';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireDashboardContext();
  const org = await prisma.organization.findUnique({
    where: { id: ctx.orgId },
    select: { name: true, city: true }
  });

  return (
    <main className="container-shell py-6">
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white/80 px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Big Dot Monitoring</p>
            <h1 className="text-2xl font-bold text-slate-900">{org?.name || 'Organization'}</h1>
            <p className="text-sm text-slate-600">{org?.city || 'Location pending'}</p>
          </div>
          <form action={logoutClient}>
            <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium">
              Logout
            </button>
          </form>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[260px_minmax(0,1fr)]">
        <SidebarNav />
        <section className="min-w-0">{children}</section>
      </div>
    </main>
  );
}
