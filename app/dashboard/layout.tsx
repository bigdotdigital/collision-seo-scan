import { SidebarNav } from '@/components/sidebar-nav';
import { Topbar } from '@/components/topbar';
import { requireDashboardContext } from '@/lib/dashboard-auth';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireDashboardContext();

  return (
    <div className="flex h-screen overflow-hidden">
        <SidebarNav />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-[var(--bg-body)] p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
