import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireDashboardContext } from '@/lib/dashboard-auth';
import { PageHeader } from '@/components/page-header';
import { DashboardKpiCard } from '@/components/dashboard-kpi-card';
import { CompetitorComparisonGrid } from '@/components/competitor-comparison-card';
import { deriveCompetitorSuggestions } from '@/lib/dashboard-suggestions';

export const dynamic = 'force-dynamic';

export default async function DashboardCompetitorsPage() {
  const ctx = await requireDashboardContext();

  const [org, competitors, keywords, latestScan, observedCompetitors] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: ctx.orgId },
      select: { shopId: true }
    }),
    prisma.trackedCompetitor.findMany({
      where: { orgId: ctx.orgId, isActive: true },
      orderBy: { createdAt: 'asc' },
      take: 4,
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            websiteUrl: true,
            city: true,
            state: true
          }
        }
      }
    }),
    prisma.trackedKeyword.findMany({
      where: { orgId: ctx.orgId, isActive: true },
      orderBy: { createdAt: 'asc' },
      take: 8,
      include: {
        snapshots: {
          orderBy: { snapshotDate: 'desc' },
          take: 12
        }
      }
    }),
    prisma.scan.findFirst({
      where: { organizationId: ctx.orgId },
      orderBy: { createdAt: 'desc' },
      select: {
        shopName: true,
        city: true,
        websiteUrl: true,
        competitorsJson: true,
        rawChecksJson: true
      }
    }),
    prisma.organization.findUnique({
      where: { id: ctx.orgId },
      select: { shopId: true }
    }).then((organization) =>
      organization?.shopId
        ? prisma.shopCompetitorObservation.findMany({
            where: { sourceShopId: organization.shopId },
            orderBy: { observedAt: 'desc' },
            distinct: ['competitorShopId'],
            take: 6,
            include: {
              competitorShop: {
                select: {
                  name: true,
                  websiteUrl: true,
                  city: true,
                  state: true
                }
              }
            }
          })
        : Promise.resolve([])
    )
  ]);

  const observedSuggestions = observedCompetitors.map((row) => ({
    name: row.competitorShop.name,
    websiteUrl: row.competitorShop.websiteUrl,
    note:
      row.competitorShop.city && row.competitorShop.state
        ? `${row.competitorShop.city}, ${row.competitorShop.state}`
        : row.notes || 'Observed in prior competitor tracking.',
    source: 'cached' as const
  }));

  const canonicalCompetitors = competitors.map((competitor) => ({
    ...competitor,
    displayName: competitor.shop?.name || competitor.name,
    displayWebsite: competitor.shop?.websiteUrl || competitor.websiteUrl || null,
    marketLabel:
      competitor.shop?.city && competitor.shop?.state
        ? `${competitor.shop.city}, ${competitor.shop.state}`
        : competitor.shop?.city || null
  }));

  const cols = ['YOU', ...canonicalCompetitors.map((c) => c.displayName.toUpperCase())];

  const tableRows = keywords
    .map((kw) => {
      const yourSnap = kw.snapshots.find((s) => !s.competitorId);
      const yourRank = yourSnap?.rankPosition ?? null;
      const competitorRanks = canonicalCompetitors.map((c) => {
        const snap = kw.snapshots.find((s) => s.competitorId === c.id);
        return snap?.rankPosition ?? null;
      });
      const hasAnyData = yourRank !== null || competitorRanks.some((r) => r !== null);
      return hasAnyData ? { kw: kw.term, ranks: [yourRank, ...competitorRanks] } : null;
    })
    .filter((row): row is { kw: string; ranks: Array<number | null> } => Boolean(row));

  const sov = cols.map((name, idx) => {
    const trackedRows = tableRows.filter((row) => row.ranks[idx] !== null);
    const top3 = trackedRows.filter((row) => (row.ranks[idx] || 999) <= 3).length;
    const value = trackedRows.length > 0 ? Math.round((top3 / trackedRows.length) * 100) : null;
    return { name, value, trackedRows: trackedRows.length };
  });

  const comparisonCards = canonicalCompetitors.map((competitor) => {
    const competitorIndex = canonicalCompetitors.findIndex((item) => item.id === competitor.id) + 1;
    const rowsWithData = tableRows.filter((row) => row.ranks[competitorIndex] !== null);
    const top3Count = rowsWithData.filter((row) => (row.ranks[competitorIndex] || 999) <= 3).length;
    return {
      title: competitor.displayName,
      subtitle: competitor.displayWebsite || competitor.marketLabel || 'No canonical shop URL saved',
      href: competitor.displayWebsite || undefined,
      hrefLabel: 'Visit site',
      metrics: [
        { label: 'Tracked terms', value: String(rowsWithData.length) },
        { label: 'Top 3 count', value: String(top3Count) },
        { label: 'Share of voice', value: sov[competitorIndex]?.value === null ? 'Unavailable' : `${sov[competitorIndex]?.value}%` }
      ],
      highlights: rowsWithData.length === 0
        ? ['No overlapping keyword snapshots are available for this competitor yet.']
        : rowsWithData.slice(0, 3).map((row) => `${row.kw}: rank ${row.ranks[competitorIndex]}`)
    };
  });
  const competitorSuggestions = latestScan
    ? deriveCompetitorSuggestions({
        shopName: latestScan.shopName,
        city: latestScan.city,
        websiteUrl: latestScan.websiteUrl,
        competitorsJson: latestScan.competitorsJson,
        rawChecksJson: latestScan.rawChecksJson
      })
    : [];
  const suggestedCompetitors = [...observedSuggestions, ...competitorSuggestions].filter(
    (suggestion, index, all) =>
      !canonicalCompetitors.some((competitor) => competitor.displayName.toLowerCase() === suggestion.name.toLowerCase()) &&
      all.findIndex((row) => row.name.toLowerCase() === suggestion.name.toLowerCase()) === index
  );

  return (
    <div className="dashboard-main-inner">
      <PageHeader
        title="Head-to-Head Comparison"
        subtitle="Competitor tables only show saved overlaps from tracked keywords and snapshots. No synthetic rank estimates are introduced."
        eyebrow="Market Analysis"
        badges={[
          {
            label: `Tracked competitors ${canonicalCompetitors.length > 0 ? 'live' : 'unavailable'}`,
            tone: canonicalCompetitors.length > 0 ? 'live' : 'unknown',
            title: 'Tracked competitors are workspace records linked to canonical shops when available.'
          },
          {
            label: `Observed rivals ${observedSuggestions.length > 0 ? 'cached' : 'unavailable'}`,
            tone: observedSuggestions.length > 0 ? 'cached' : 'unknown',
            title: 'Observed rivals come from canonical shop competitor observations.'
          },
          {
            label: `Scan suggestions ${competitorSuggestions.length > 0 ? 'fallback' : 'unavailable'}`,
            tone: competitorSuggestions.length > 0 ? 'fallback' : 'unknown',
            title: 'Scan suggestions are source-backed candidates from the latest saved scan.'
          }
        ]}
        actions={
          <Link href="/dashboard/onboarding" className="dashboard-button-primary">
            Add competitor
          </Link>
        }
      />

      <section className="mb-5 grid gap-3 lg:grid-cols-4">
        <DashboardKpiCard label="Tracked rivals" value={canonicalCompetitors.length} detail="Active competitor records in the workspace." />
        <DashboardKpiCard label="Overlap terms" value={tableRows.length} detail="Keywords where at least one side has stored ranking data." />
        <DashboardKpiCard
          label="Your SOV"
          value={sov[0]?.value === null ? 'Unavailable' : `${sov[0]?.value}%`}
          detail="Percent of overlapping terms where your shop ranks in the top 3."
          tone={sov[0]?.value && sov[0].value >= 50 ? 'accent' : 'default'}
        />
        <DashboardKpiCard
          label="Coverage gaps"
          value={keywords.length - tableRows.length}
          detail="Tracked keywords with no head-to-head data yet."
          tone={keywords.length - tableRows.length > 0 ? 'warning' : 'default'}
        />
      </section>

      <section className="dashboard-panel mb-5 overflow-hidden p-0">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--dashboard-border-strong)] px-5 py-4">
          <div>
            <h2 className="dashboard-section-title">Competitor matrix</h2>
            <p className="dashboard-body-sm mt-1">Cells show stored ranking positions only. Blank cells mean the system does not have that competitor snapshot.</p>
          </div>
          <span className="dashboard-chip">Rank positions</span>
        </div>

        <div className="overflow-x-auto p-5">
          <table className="dashboard-table w-full min-w-[980px] text-sm">
            <thead>
              <tr>
                <th className="px-4 py-4 text-left">Target keyword</th>
                {cols.map((col, idx) => (
                  <th key={col} className="px-4 py-4 text-left">
                    <p className={idx === 0 ? 'text-[var(--dashboard-text)]' : 'text-[var(--dashboard-text-muted)]'}>{col}</p>
                    <p className="dashboard-caption mt-1">
                      {sov[idx]?.value === null ? 'SOV unavailable' : `${sov[idx]?.value}% SOV`}
                    </p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.length === 0 ? (
                <tr>
                  <td colSpan={cols.length + 1} className="px-4 py-6 text-[var(--dashboard-text-muted)]">
                    No head-to-head ranking data yet. Run a scan and refresh rankings to populate this table.
                  </td>
                </tr>
              ) : (
                tableRows.map((row, i) => (
                  <tr key={`${row.kw}-${i}`}>
                    <td className="px-4 py-5 text-base text-[var(--dashboard-text)]">{row.kw}</td>
                    {row.ranks.map((rank, ri) => (
                      <td key={`${row.kw}-${ri}`} className="px-4 py-5">
                        {rank === null ? (
                          <span className="dashboard-status dashboard-status-unknown">N/A</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className={`dashboard-status ${ri === 0 ? 'dashboard-status-live' : 'dashboard-status-muted'}`}>
                              {rank}
                            </span>
                            <span className={rank <= 3 ? 'text-[#ffd0c6]' : 'text-[var(--dashboard-text-faint)]'}>
                              {rank <= 3 ? 'Top 3' : 'Tracked'}
                            </span>
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {suggestedCompetitors.length > 0 ? (
        <section className="dashboard-panel mb-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="dashboard-section-title">Latest scan suggestions</h2>
              <p className="dashboard-body-sm mt-1">
                These competitor names came from source-backed scan data and can be imported into tracking from settings.
              </p>
            </div>
            <Link href="/dashboard/settings" className="dashboard-button">
              Import in settings
            </Link>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {suggestedCompetitors.slice(0, 4).map((competitor) => (
              <div key={competitor.name} className="dashboard-subpanel rounded-[22px] p-4">
                <p className="text-[var(--dashboard-text)]">{competitor.name}</p>
                <p className="dashboard-caption mt-1">{competitor.websiteUrl || competitor.note}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="dashboard-panel">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="dashboard-section-title">Competitor cards</h2>
            <p className="dashboard-body-sm mt-1">These cards summarize only measurable overlap. Competitors with no overlap stay honest about that gap.</p>
          </div>
          <span className="dashboard-chip">Reusable comparison grid</span>
        </div>
        <div className="mt-4">
          <CompetitorComparisonGrid
            items={comparisonCards}
            emptyTitle="No tracked competitors"
            emptyBody="Add at least one competitor in onboarding or settings to unlock head-to-head analysis."
          />
        </div>
      </section>
    </div>
  );
}
