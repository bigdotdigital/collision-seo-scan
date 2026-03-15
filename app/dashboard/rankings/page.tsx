import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireDashboardContext } from '@/lib/dashboard-auth';
import { PageHeader } from '@/components/page-header';
import { DashboardKpiCard } from '@/components/dashboard-kpi-card';
import { DashboardTrendIndicator } from '@/components/dashboard-trend-indicator';
import { deriveKeywordSuggestions } from '@/lib/dashboard-suggestions';

export const dynamic = 'force-dynamic';

function trendBars(delta: number | null) {
  const up = delta !== null && delta > 0;
  const down = delta !== null && delta < 0;
  const base = [18, 26, 16, 32];
  return base.map((h, i) => {
    const amp = up ? i * 2 + 1 : down ? -i : 0;
    return Math.max(8, h + amp);
  });
}

export default async function DashboardRankingsPage() {
  const ctx = await requireDashboardContext();

  const [keywords, latestScan, observedKeywords] = await Promise.all([
    prisma.trackedKeyword.findMany({
      where: { orgId: ctx.orgId, isActive: true },
      include: {
        snapshots: {
          orderBy: { snapshotDate: 'desc' },
          take: 2
        }
      },
      orderBy: { createdAt: 'asc' },
      take: 150
    }),
    prisma.scan.findFirst({
      where: { organizationId: ctx.orgId, executionStatus: 'completed' },
      orderBy: { createdAt: 'desc' },
      select: {
        shopName: true,
        city: true,
        websiteUrl: true,
        moneyKeywordsJson: true,
        competitorsJson: true,
        rawChecksJson: true
      }
    }),
    prisma.organization.findUnique({
      where: { id: ctx.orgId },
      select: { shopId: true }
    }).then((organization) =>
      organization?.shopId
        ? prisma.shopKeywordObservation.findMany({
            where: { shopId: organization.shopId },
            orderBy: { observedAt: 'desc' },
            distinct: ['keyword'],
            take: 10,
            select: {
              keyword: true,
              searchVolume: true,
              confidence: true
            }
          })
        : Promise.resolve([])
    )
  ]);

  const rows = keywords.map((kw) => {
    const current = kw.snapshots[0]?.rankPosition ?? null;
    const previous = kw.snapshots[1]?.rankPosition ?? null;
    const delta = current !== null && previous !== null ? previous - current : null;
    const score = current === null ? null : Math.max(35, Math.min(98, 100 - current * 2));
    return {
      id: kw.id,
      keyword: kw.term,
      current,
      previous,
      delta,
      score
    };
  });

  const withBaseline = rows.filter((row) => row.delta !== null);
  const top3 = rows.filter((row) => row.current !== null && row.current <= 3).length;
  const top10 = rows.filter((row) => row.current !== null && row.current <= 10).length;
  const improving = withBaseline.filter((row) => (row.delta || 0) > 0).length;
  const declining = withBaseline.filter((row) => (row.delta || 0) < 0).length;
  const hasSnapshotData = rows.some((row) => row.current !== null || row.previous !== null);
  const keywordSuggestions = latestScan
    ? await deriveKeywordSuggestions({
        shopName: latestScan.shopName,
        city: latestScan.city,
        websiteUrl: latestScan.websiteUrl,
        moneyKeywordsJson: latestScan.moneyKeywordsJson,
        competitorsJson: latestScan.competitorsJson,
        rawChecksJson: latestScan.rawChecksJson,
        allowAi: true
      })
    : [];
  const suggestedTerms = keywordSuggestions.filter(
    (suggestion) => !keywords.some((keyword) => keyword.term.toLowerCase() === suggestion.term.toLowerCase())
  );
  const observedSuggestionTerms = observedKeywords.filter(
    (row, index, all) =>
      !keywords.some((keyword) => keyword.term.toLowerCase() === row.keyword.toLowerCase()) &&
      all.findIndex((candidate) => candidate.keyword.toLowerCase() === row.keyword.toLowerCase()) === index
  );

  return (
    <div className="dashboard-main-inner">
      <PageHeader
        title="Keyword Rankings"
        subtitle="Row-level ranking data only. Where there is no baseline snapshot, the table stays explicit about that gap."
        eyebrow="Collision Repair SEO"
        badges={[
          {
            label: `Rank snapshots ${hasSnapshotData ? 'live' : 'unavailable'}`,
            tone: hasSnapshotData ? 'live' : 'unknown',
            title: 'Current and previous positions are shown only when saved rank snapshots exist.'
          },
          {
            label: `Shop observations ${observedKeywords.length > 0 ? 'cached' : 'unavailable'}`,
            tone: observedKeywords.length > 0 ? 'cached' : 'unknown',
            title: 'Observed keyword terms come from canonical shop history when live snapshots are sparse.'
          },
          {
            label: `Suggestions ${suggestedTerms.length > 0 ? 'fallback' : 'unavailable'}`,
            tone: suggestedTerms.length > 0 ? 'fallback' : 'unknown',
            title: 'Fallback suggestions come from the latest scan and AI-assisted keyword suggestion flow.'
          }
        ]}
        actions={<p className="dashboard-chip">Tracking {rows.length} keywords</p>}
      />

      <section className="mb-5 grid gap-3 lg:grid-cols-4">
        <DashboardKpiCard
          label="Tracked terms"
          value={rows.length}
          detail="All active keywords in the current workspace."
        />
        <DashboardKpiCard
          label="Top 3"
          value={top3}
          detail="Keywords currently ranking in positions 1 through 3."
          tone={top3 > 0 ? 'accent' : 'default'}
        />
        <DashboardKpiCard
          label="Top 10"
          value={top10}
          detail="Terms with first-page visibility."
        />
        <DashboardKpiCard
          label="Without baseline"
          value={rows.length - withBaseline.length}
          detail="Terms that only have one snapshot, so trend is unavailable."
          tone={rows.length - withBaseline.length > 0 ? 'warning' : 'default'}
        />
      </section>

      <section className="dashboard-panel mb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="dashboard-section-title">Movement summary</h2>
            <p className="dashboard-body-sm mt-1">Improvement and decline counts are based only on keywords with at least two saved snapshots.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a className="dashboard-button" href="/api/dashboard/keywords/export">
              Export CSV
            </a>
            <Link href="/dashboard/onboarding" className="dashboard-button-primary">
              Add keyword
            </Link>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <DashboardTrendIndicator
            label="Improving terms"
            value={String(improving)}
            direction={improving > 0 ? 'up' : 'flat'}
            detail="Count of keywords whose latest rank improved vs the prior snapshot."
          />
          <DashboardTrendIndicator
            label="Declining terms"
            value={String(declining)}
            direction={declining > 0 ? 'down' : 'flat'}
            detail="Count of keywords whose latest rank dropped vs the prior snapshot."
          />
          <DashboardTrendIndicator
            label="No baseline"
            value={String(rows.length - withBaseline.length)}
            direction={rows.length - withBaseline.length > 0 ? 'unknown' : 'flat'}
            detail="Trend bars are decorative when a baseline does not exist."
          />
        </div>

        {!hasSnapshotData && (observedSuggestionTerms.length > 0 || suggestedTerms.length > 0) ? (
          <div className="dashboard-subpanel mt-4 rounded-[22px] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="dashboard-section-title">Known shop keyword opportunities</p>
                <p className="dashboard-body-sm mt-1">
                  These terms come from stored shop observations and the latest scan, and are safer than stale starter keywords when no ranking snapshots exist yet.
                </p>
              </div>
              <Link href="/dashboard/settings" className="dashboard-button">
                Review in settings
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {[...observedSuggestionTerms, ...suggestedTerms].slice(0, 8).map((suggestion) => (
                <span key={'term' in suggestion ? suggestion.term : suggestion.keyword} className="dashboard-chip">
                  {'term' in suggestion ? suggestion.term : suggestion.keyword}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="dashboard-panel overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--dashboard-border-strong)] px-5 py-4">
          <div className="flex flex-wrap gap-2">
            {['All Positions', 'Top 3', '4-10', '11+'].map((chip, idx) => (
              <span key={chip} className={`dashboard-chip ${idx === 0 ? 'dashboard-status-live' : ''}`}>
                {chip}
              </span>
            ))}
          </div>
          <p className="dashboard-caption">Static chips only. Interactive filters are not wired in the current payload contract.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="dashboard-table w-full min-w-[980px] text-sm">
            <thead>
              <tr>
                <th className="px-6 py-4 text-left">Keyword</th>
                <th className="px-6 py-4 text-left">Current</th>
                <th className="px-6 py-4 text-left">Previous</th>
                <th className="px-6 py-4 text-left">Delta</th>
                <th className="px-6 py-4 text-left">30-day trend</th>
                <th className="px-6 py-4 text-left">Opportunity</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-6 text-[var(--dashboard-text-muted)]">
                    No tracked keywords yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-6 py-5 text-base text-[var(--dashboard-text)]">{row.keyword}</td>
                    <td className="px-6 py-5">
                      <span className="dashboard-status dashboard-status-muted">{row.current ?? 'N/A'}</span>
                    </td>
                    <td className="px-6 py-5 text-[var(--dashboard-text-muted)]">{row.previous ?? 'N/A'}</td>
                    <td className="px-6 py-5">
                      {row.delta === null ? (
                        <span className="dashboard-status dashboard-status-unknown">No baseline</span>
                      ) : (
                        <span className={`dashboard-status ${row.delta > 0 ? 'dashboard-status-positive' : row.delta < 0 ? 'dashboard-status-warning' : 'dashboard-status-info'}`}>
                          {row.delta > 0 ? `+${row.delta}` : row.delta}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-end gap-1">
                        {trendBars(row.delta).map((bar, i) => (
                          <span
                            key={`${row.id}-bar-${i}`}
                            className="w-1 rounded-sm bg-[var(--dashboard-accent)]"
                            style={{ height: `${bar}px`, opacity: row.delta === null ? 0.25 : 0.55 + i * 0.1 }}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {row.score === null ? (
                        <span className="dashboard-status dashboard-status-unknown">Unavailable</span>
                      ) : (
                        <span className="dashboard-status dashboard-status-live">{row.score}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
