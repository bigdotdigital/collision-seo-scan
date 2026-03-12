import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireDashboardContext } from '@/lib/dashboard-auth';
import { PageHeader } from '@/components/page-header';
import { DashboardKpiCard } from '@/components/dashboard-kpi-card';
import { TrendChartCard } from '@/components/trend-chart-card';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const ctx = await requireDashboardContext();

  const scans = await prisma.scan.findMany({
    where: { organizationId: ctx.orgId },
    orderBy: { createdAt: 'desc' },
    take: 24,
    select: {
      id: true,
      createdAt: true,
      scoreTotal: true,
      websiteUrl: true
    }
  });

  const trend = scans
    .slice(0, 6)
    .reverse()
    .map((scan) => scan.scoreTotal ?? 0);

  const latest = scans[0] || null;
  const previous = scans[1] || null;
  const growth =
    latest?.scoreTotal !== null &&
    latest?.scoreTotal !== undefined &&
    previous?.scoreTotal !== null &&
    previous?.scoreTotal !== undefined
      ? latest.scoreTotal - previous.scoreTotal
      : null;

  return (
    <div className="dashboard-main-inner">
      <PageHeader
        title="Reports & Scan History"
        subtitle="Historical reports come directly from stored scans. If no scan exists, this page stays explicit about the missing history."
        eyebrow="Reporting"
        badges={[
          {
            label: `Stored scans ${scans.length > 0 ? 'cached' : 'unavailable'}`,
            tone: scans.length > 0 ? 'cached' : 'unknown',
            title: 'Report history comes from scans already saved for this workspace.'
          },
          {
            label: `Trend line ${trend.length > 0 && scans.length > 0 ? 'cached' : 'unavailable'}`,
            tone: trend.length > 0 && scans.length > 0 ? 'cached' : 'unknown',
            title: 'The chart only reflects saved scan scores, not synthetic monthly interpolation.'
          }
        ]}
        actions={
          <Link href="/scan" className="dashboard-button-primary">
            Generate new report
          </Link>
        }
      />

      <section className="mb-5 grid gap-3 lg:grid-cols-4">
        <DashboardKpiCard label="Stored scans" value={scans.length} detail="Recent reportable scans saved for this org." />
        <DashboardKpiCard
          label="Latest score"
          value={latest?.scoreTotal ?? 'Unavailable'}
          detail="Overall score from the newest saved scan."
          tone={latest?.scoreTotal ? 'accent' : 'default'}
        />
        <DashboardKpiCard
          label="Last delta"
          value={growth === null ? 'Unavailable' : `${growth > 0 ? '+' : ''}${growth}`}
          detail="Score change between the two newest saved scans."
          tone={growth !== null && growth < 0 ? 'warning' : 'default'}
        />
        <DashboardKpiCard
          label="Website snapshot"
          value={latest?.websiteUrl ? 'Saved' : 'Unavailable'}
          detail="Whether the newest report stored a source website URL."
        />
      </section>

      <section className="mb-5 grid gap-4 xl:grid-cols-[minmax(320px,0.75fr)_minmax(0,1.25fr)]">
        <TrendChartCard
          title="Visibility trend"
          subtitle="Six most recent scores. If fewer scans exist, the line reflects only the data currently stored."
          points={trend.length > 0 ? trend : [0, 0, 0, 0, 0, 0]}
        />

        <article className="dashboard-panel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="dashboard-section-title">Recent reporting notes</h2>
              <p className="dashboard-body-sm mt-1">Generated from stored scan dates only. No synthetic monthly schedule is implied.</p>
            </div>
            <span className="dashboard-chip">Latest 3 scans</span>
          </div>
          <div className="mt-4 space-y-3">
            {scans.slice(0, 3).map((scan, idx) => (
              <div key={scan.id} className="dashboard-subpanel rounded-[22px] p-4">
                <p className="dashboard-label">Scan #{idx + 1}</p>
                <p className="mt-2 text-lg font-semibold text-[var(--dashboard-text)]">
                  {scan.createdAt.toLocaleDateString()}
                </p>
                <p className="dashboard-body-sm mt-2">
                  {scan.scoreTotal === null ? 'Score unavailable for this scan.' : `Overall score ${scan.scoreTotal}.`}
                </p>
              </div>
            ))}
            {scans.length === 0 ? (
              <div className="dashboard-empty-state">
                <p className="dashboard-empty-title">No stored scans</p>
                <p className="dashboard-body-sm mt-1">Generate a scan to start building report history.</p>
              </div>
            ) : null}
          </div>
        </article>
      </section>

      <section className="dashboard-panel overflow-hidden p-0">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--dashboard-border-strong)] px-5 py-4">
          <div>
            <h2 className="dashboard-section-title">Scan history</h2>
            <p className="dashboard-body-sm mt-1">Each row is a real stored scan. “Open” links preserve the existing report route.</p>
          </div>
          <span className="dashboard-chip">Existing `/report/[id]` links</span>
        </div>
        <div className="overflow-x-auto p-5">
          <table className="dashboard-table w-full min-w-[760px] text-sm">
            <thead>
              <tr>
                <th className="py-3 text-left">Report</th>
                <th className="py-3 text-left">Score</th>
                <th className="py-3 text-left">Change</th>
                <th className="py-3 text-left">Source URL</th>
                <th className="py-3 text-right">Open</th>
              </tr>
            </thead>
            <tbody>
              {scans.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-5 text-[var(--dashboard-text-muted)]">
                    No scans available yet.
                  </td>
                </tr>
              ) : (
                scans.map((scan, idx) => {
                  const previousScan = scans[idx + 1] || null;
                  const delta =
                    previousScan?.scoreTotal !== null &&
                    previousScan?.scoreTotal !== undefined &&
                    scan.scoreTotal !== null &&
                    scan.scoreTotal !== undefined
                      ? scan.scoreTotal - previousScan.scoreTotal
                      : null;

                  return (
                    <tr key={scan.id}>
                      <td className="py-4">
                        <p className="text-base text-[var(--dashboard-text)]">{new Date(scan.createdAt).toLocaleDateString()} Performance Report</p>
                        <p className="dashboard-caption mt-1">Generated {scan.createdAt.toLocaleString()}</p>
                      </td>
                      <td className="py-4 text-[var(--dashboard-text-muted)]">{scan.scoreTotal ?? 'Unavailable'}</td>
                      <td className="py-4">
                        {delta === null ? (
                          <span className="dashboard-status dashboard-status-unknown">No prior scan</span>
                        ) : (
                          <span className={`dashboard-status ${delta >= 0 ? 'dashboard-status-positive' : 'dashboard-status-warning'}`}>
                            {delta > 0 ? `+${delta}` : delta}
                          </span>
                        )}
                      </td>
                      <td className="py-4 text-[var(--dashboard-text-muted)]">{scan.websiteUrl || 'Unavailable'}</td>
                      <td className="py-4 text-right">
                        <a href={`/report/${scan.id}`} className="dashboard-button">
                          Open
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
