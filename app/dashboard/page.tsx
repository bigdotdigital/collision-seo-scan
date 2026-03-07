import { prisma } from '@/lib/prisma';
import { requireDashboardContext } from '@/lib/dashboard-auth';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { TrendChartCard } from '@/components/trend-chart-card';
import { CompetitorComparisonCard } from '@/components/competitor-comparison-card';
import { AlertCard } from '@/components/alert-card';
import { KeywordTable } from '@/components/keyword-table';

export const dynamic = 'force-dynamic';

export default async function DashboardOverviewPage() {
  const ctx = await requireDashboardContext();

  const [latestSnapshot, activeKeywordCount, activeCompetitorCount, unreadAlerts, recentAlerts, keywords] =
    await Promise.all([
      prisma.keywordRankSnapshot.findFirst({
        where: { orgId: ctx.orgId },
        orderBy: { snapshotDate: 'desc' }
      }),
      prisma.trackedKeyword.count({
        where: { orgId: ctx.orgId, isActive: true }
      }),
      prisma.trackedCompetitor.count({
        where: { orgId: ctx.orgId, isActive: true }
      }),
      prisma.alert.count({
        where: { orgId: ctx.orgId, isRead: false }
      }),
      prisma.alert.findMany({
        where: { orgId: ctx.orgId },
        orderBy: { createdAt: 'desc' },
        take: 3
      }),
      prisma.trackedKeyword.findMany({
        where: { orgId: ctx.orgId, isActive: true },
        take: 8,
        orderBy: { createdAt: 'asc' },
        include: {
          snapshots: {
            orderBy: { snapshotDate: 'desc' },
            take: 2
          }
        }
      })
    ]);

  const keywordRows = keywords.map((kw) => {
    const current = kw.snapshots[0]?.rankPosition ?? null;
    const previous = kw.snapshots[1]?.rankPosition ?? null;
    const delta = current !== null && previous !== null ? previous - current : null;
    return {
      id: kw.id,
      keyword: kw.term,
      current,
      previous,
      delta
    };
  });

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle="10-second read on visibility status, movement, and competitive pressure."
        eyebrow="Monitoring Command"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Latest Snapshot"
          value={latestSnapshot ? new Date(latestSnapshot.snapshotDate).toLocaleDateString() : 'No data'}
          hint="Weekly collection job will populate this."
          trend={[41, 43, 44, 46, 49]}
        />
        <StatCard
          label="Tracked Keywords"
          value={activeKeywordCount}
          tone="neutral"
          hint="Core terms currently monitored."
          trend={[20, 26, 28, 30, 34]}
        />
        <StatCard
          label="Tracked Competitors"
          value={activeCompetitorCount}
          tone="neutral"
          hint="Competitor watchlist count."
          trend={[12, 14, 15, 18, 20]}
        />
        <StatCard
          label="Unread Alerts"
          value={unreadAlerts}
          tone={unreadAlerts > 0 ? 'warning' : 'positive'}
          hint={unreadAlerts > 0 ? 'Attention required.' : 'All quiet right now.'}
          trend={[3, 4, 2, 5, unreadAlerts || 1]}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <TrendChartCard
          title="Visibility Trend"
          subtitle="Append-only snapshot baseline; trend UI is wired and ready for live provider data."
          points={[53, 55, 54, 58, 60, 59, 61]}
        />
        <div className="space-y-3">
          <article className="card px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Alert Feed</p>
            <p className="mt-1 text-sm text-slate-600">Newest monitoring signals first.</p>
          </article>
          {recentAlerts.length === 0 ? (
            <article className="card rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
              No alerts yet. Alert engine scaffold is ready.
            </article>
          ) : (
            recentAlerts.map((alert) => (
              <AlertCard
                key={alert.id}
                type={alert.type}
                severity={alert.severity}
                title="Monitoring Event"
                subtitle="Threshold-based change detected from rank snapshots."
                when={new Date(alert.createdAt).toLocaleString()}
              />
            ))
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <CompetitorComparisonCard
          rows={[
            {
              id: 'tracked',
              name: `${activeCompetitorCount} competitors tracked`,
              trackedKeywords: activeKeywordCount,
              note: 'Head-to-head comparisons will populate as rank snapshots are collected.'
            }
          ]}
        />
        <article className="card p-5">
          <h2 className="text-base font-semibold text-slate-900">GBP Health (Scaffold)</h2>
          <p className="mt-1 text-sm text-slate-600">
            GBP scoring is intentionally placeholder until provider wiring is complete.
          </p>
          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            No half-real score shown. Connect live GBP signal source in integration phase.
          </div>
        </article>
      </div>

      <div className="mt-4">
        <KeywordTable rows={keywordRows} />
      </div>
    </div>
  );
}
