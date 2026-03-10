import { SidebarNav } from '@/components/sidebar-nav';
import { Topbar } from '@/components/topbar';
import { requireDashboardContext } from '@/lib/dashboard-auth';
import { prisma } from '@/lib/prisma';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireDashboardContext();
  const latestScan = await prisma.scan.findFirst({
    where: { organizationId: ctx.orgId },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true }
  });

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav lastScanAt={latestScan?.createdAt?.toISOString() || null} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-[var(--bg-body)] p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
