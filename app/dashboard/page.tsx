import { prisma } from '@/lib/prisma';
import { requireDashboardContext } from '@/lib/dashboard-auth';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { TrendChartCard } from '@/components/trend-chart-card';
import { CompetitorComparisonCard } from '@/components/competitor-comparison-card';
import { AlertCard } from '@/components/alert-card';
import { KeywordTable } from '@/components/keyword-table';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardOverviewPage() {
  const ctx = await requireDashboardContext();
  const bookCallUrl = process.env.CALENDLY_LINK || 'https://calendly.com/bigdotdigital/30min';

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
        subtitle="Fast read on ranking momentum, competitor pressure, and what to fix first."
        eyebrow="Monitoring Command"
      />

      {activeKeywordCount === 0 || activeCompetitorCount === 0 ? (
        <article className="card mb-4 p-5">
          <h2 className="text-base font-semibold text-slate-900">Finish setup to unlock live insights</h2>
          <p className="mt-1 text-sm text-slate-700">
            Add your first tracked keywords and competitors, then we&apos;ll start weekly movement
            snapshots and alerts.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/dashboard/rankings"
              className="inline-flex rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900"
            >
              Setup keyword tracking
            </Link>
            <Link
              href="/dashboard/competitors"
              className="inline-flex rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900"
            >
              Setup competitor watch
            </Link>
            <a
              href={bookCallUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Book setup call
            </a>
          </div>
        </article>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Latest Snapshot"
          value={latestSnapshot ? new Date(latestSnapshot.snapshotDate).toLocaleDateString() : 'No data'}
          hint="Updates each weekly monitoring run."
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
          subtitle="Weekly baseline of ranking visibility movement over time."
          points={[53, 55, 54, 58, 60, 59, 61]}
        />
        <div className="space-y-3">
          <article className="card px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Alert Feed</p>
            <p className="mt-1 text-sm text-slate-600">Newest monitoring signals first.</p>
          </article>
          {recentAlerts.length === 0 ? (
            <article className="card rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
              No alerts yet. This is normal until initial snapshots are collected.
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
          <h2 className="text-base font-semibold text-slate-900">GBP Health</h2>
          <p className="mt-1 text-sm text-slate-600">
            Local profile health signals are shown once Google Business Profile syncing is connected.
          </p>
          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            Connect GBP to track review velocity, category accuracy, and listing completeness.
          </div>
        </article>
      </div>

      <article className="card mt-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Need help customizing your dashboard?
            </h2>
            <p className="mt-1 text-sm text-slate-700">
              $49/month includes a free setup call and monthly SEO consult calls with Big Dot to
              tailor this dashboard to your exact needs.
            </p>
          </div>
          <a
            href={process.env.CALENDLY_LINK || 'https://calendly.com/bigdotdigital/30min'}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Book a call with Big Dot
          </a>
        </div>
      </article>

      <div className="mt-4">
        <KeywordTable rows={keywordRows} />
      </div>
    </div>
  );
}
