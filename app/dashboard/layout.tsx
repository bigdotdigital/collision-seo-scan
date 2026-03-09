import { SidebarNav } from '@/components/sidebar-nav';
import { logoutClient } from '@/app/login/actions';
import { requireDashboardContext } from '@/lib/dashboard-auth';
import { prisma } from '@/lib/prisma';

function toDisplayCase(value: string | null | undefined): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed !== trimmed.toLowerCase()) return trimmed;
  return trimmed
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireDashboardContext();
  const org = await prisma.organization.findUnique({
    where: { id: ctx.orgId },
    select: { name: true, city: true }
  });

  return (
    <main className="dashboard-shell">
      <div className="dashboard-grid">
        <SidebarNav />
        <section className="dashboard-main min-w-0">
          <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <p className="dashboard-eyebrow">
                Collision Repair SEO / {toDisplayCase(org?.city) || 'Location'}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-white">
                {toDisplayCase(org?.name) || 'Organization'}
              </h1>
            </div>
            <form action={logoutClient}>
              <button className="dashboard-button">Logout</button>
            </form>
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}
