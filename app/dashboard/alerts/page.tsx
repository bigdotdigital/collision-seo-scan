import { prisma } from '@/lib/prisma';
import { requireDashboardContext } from '@/lib/dashboard-auth';
import { PageHeader } from '@/components/page-header';
import { AlertCard } from '@/components/alert-card';

export const dynamic = 'force-dynamic';

export default async function DashboardAlertsPage() {
  const ctx = await requireDashboardContext();

  const [alerts, prefs] = await Promise.all([
    prisma.alert.findMany({
      where: { orgId: ctx.orgId },
      orderBy: { createdAt: 'desc' },
      take: 30
    }),
    prisma.alertPreference.findUnique({
      where: { orgId: ctx.orgId }
    })
  ]);

  return (
    <div>
      <PageHeader
        title="Alerts"
        subtitle="Meaningful change feed for rankings, competitors, and GBP signals."
        eyebrow="Alert Center"
      />

      <div className="mb-4 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
        Thresholds: drop {prefs?.rankDropThreshold ?? 3}, gain {prefs?.rankGainThreshold ?? 3}, digest{' '}
        {prefs?.digestFrequency || 'daily'}.
      </div>

      <div className="space-y-3">
        {alerts.length === 0 ? (
          <article className="card rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
            No alerts yet. This is expected until snapshot + alert jobs run.
          </article>
        ) : (
          alerts.map((alert) => (
            <AlertCard
              key={alert.id}
              type={alert.type}
              severity={alert.severity}
              title="Monitoring alert"
              subtitle="Generated from snapshot changes."
              when={new Date(alert.createdAt).toLocaleString()}
            />
          ))
        )}
      </div>
    </div>
  );
}
