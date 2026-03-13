import { MetricCard } from '@/components/metric-card';
import { MultiProgressBar } from '@/components/multi-progress-bar';
import { CompetitorComparison } from '@/components/competitor-comparison';
import { InteractiveMap } from '@/components/interactive-map';
import { BarChart } from '@/components/bar-chart';
import { PieChart } from '@/components/pie-chart';
import { HeroMetric } from '@/components/hero-metric';
import { PageHeader } from '@/components/page-header';
import { DashboardModuleCard, LockedModuleTeaser } from '@/components/dashboard-module-card';
import { RefreshDashboardButton } from '@/components/refresh-dashboard-button';
import { requireDashboardContext } from '@/lib/dashboard-auth';
import { refreshDashboardData } from './actions';
import { buildDashboardOverviewPageState } from '@/lib/dashboard-overview-page';

export const dynamic = 'force-dynamic';

export default async function DashboardOverviewPage({
  searchParams
}: {
  searchParams?: { refresh?: string };
}) {
  const ctx = await requireDashboardContext();
  const {
    latestScan,
    activeKeywords,
    subscription,
    reportPayload,
    issues,
    trends,
    categories,
    revenueImpact,
    hasRevenueInputs,
    keywordSummary,
    yourShop,
    competitors,
    competitorSuggestions,
    hasGeographicPoints,
    mapPoints,
    visibilitySegments,
    entitlement,
    architecture,
    mapsAuthority,
    competitorGap,
    repairPlan,
    revenueLeak,
    overviewBadges
  } = await buildDashboardOverviewPageState(ctx.orgId);
  const refreshState = searchParams?.refresh || '';

  return (
    <div className="space-y-6">
      <PageHeader
        title="SEO Revenue Dashboard"
        subtitle="Priority metrics are shown with explicit source status. Measured scores stay separate from modeled traffic, lead, and revenue opportunity."
        eyebrow="Overview"
        badges={overviewBadges}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <form action={refreshDashboardData}>
              <RefreshDashboardButton />
            </form>
            <button className="rounded-md border border-[var(--border-color)] px-4 py-2 text-sm font-medium hover:bg-[var(--bg-body)]">
              Last 30 Days ▼
            </button>
          </div>
        }
      />

      {refreshState === 'done' ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Fresh scan complete. The dashboard is now using the latest workspace data and provider results.
        </div>
      ) : null}
      {refreshState === 'missing' ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Add a shop name, website, and city in dashboard settings before refreshing data.
        </div>
      ) : null}
      {refreshState === 'error' ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Refresh failed. Check the workspace details and try again.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          value={latestScan?.scoreTotal ?? 'N/A'}
          label="Overall SEO Score"
          subtitle="Out of 100 points"
          trend={trends?.overall}
          className="lg:col-span-1"
        />

        <MetricCard
          value={activeKeywords}
          label="Tracked Keywords"
          subtitle="High-intent terms"
          trend={{ value: `${activeKeywords}`, type: activeKeywords > 0 ? 'up' : 'down' }}
          className="lg:col-span-1"
        />

        <MetricCard
          value={issues.length}
          label="Action Items"
          subtitle="Quick fixes available"
          className="lg:col-span-1"
        />

        <MetricCard
          value={subscription?.status === 'active' ? 'Active' : 'Trial'}
          label="Monitoring Status"
          subtitle={
            subscription?.trialEndsAt
              ? `Ends ${new Date(subscription.trialEndsAt).toLocaleDateString()}`
              : ''
          }
          className="lg:col-span-1"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <MetricCard
          value={hasRevenueInputs ? revenueImpact.traffic : 'Unavailable'}
          label="Modeled Search Traffic"
          subtitle={
            hasRevenueInputs
              ? `${revenueImpact.assumptions.ctrModel} from saved money-keyword volume`
              : 'No keyword volume data in the latest scan, so traffic remains unavailable'
          }
          className="lg:col-span-1"
        />
        <MetricCard
          value={hasRevenueInputs ? revenueImpact.leads : 'Unavailable'}
          label="Modeled Leads"
          subtitle={hasRevenueInputs ? revenueImpact.assumptions.leadRate : 'Lead modeling turns on after keyword-demand data is saved'}
          className="lg:col-span-1"
        />
        <MetricCard
          value={hasRevenueInputs ? `$${revenueImpact.revenue.toLocaleString()}` : 'Unavailable'}
          label="Modeled Revenue Opportunity"
          subtitle={hasRevenueInputs ? revenueImpact.assumptions.averageOrderValue : 'Revenue modeling turns on after keyword-demand data is saved'}
          className="lg:col-span-1"
        />
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Tracked Keyword Positions</div>
            <div className="card-action">●●●</div>
          </div>
          <div className="ranking-status text-green">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            {keywordSummary.averagePosition !== null ? `Avg. tracked position ${keywordSummary.averagePosition}` : 'No tracked keyword positions yet'}
          </div>
          <div className="ranking-subtext">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            {keywordSummary.averageDelta !== null
              ? `${keywordSummary.averageDelta >= 0 ? 'Up' : 'Down'} ${Math.abs(keywordSummary.averageDelta)} positions on average`
              : 'Need two keyword snapshots to show movement'}
          </div>
          <BarChart
            data={keywordSummary.barData.length > 0 ? keywordSummary.barData : [10, 10, 10, 10, 10, 10, 10]}
            activeIndex={keywordSummary.barData.length > 0 ? 0 : -1}
            labels={
              keywordSummary.ranked.slice(0, 7).length > 0
                ? keywordSummary.ranked.slice(0, 7).map((row) => row.term.slice(0, 1).toUpperCase())
                : ['K', 'E', 'Y', 'W', 'O', 'R', 'D']
            }
          />
        </div>

        <div className="card span-2">
          <div className="card-header">
            <div className="card-title">SEO Category Mix</div>
            <div className="card-action">●●●</div>
          </div>
          <div className="segmented-control">
            <div className="segment active">Category Scores</div>
            <div className="segment">Current Snapshot</div>
          </div>
          <PieChart segments={visibilitySegments} />
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Google Profile Snapshot</div>
            <div className="card-action" style={{ color: 'var(--accent-blue)' }}>
              {reportPayload?.googlePlace?.googleMapsUri ? 'Maps linked' : 'No live profile link'}
            </div>
          </div>
          <HeroMetric
            value={reportPayload?.googlePlace?.userRatingCount ?? 0}
            label="google reviews"
            orbitStats={[
              { value: Math.round((reportPayload?.googlePlace?.rating ?? 0) * 10), label: 'rating x10' },
              {
                value: typeof reportPayload?.reviewGap?.competitorReviews === 'number' ? reportPayload.reviewGap.competitorReviews : 0,
                label: 'comp reviews'
              }
            ]}
          />
          <div className="hero-footer">
            {reportPayload?.googlePlace
              ? `Google Places snapshot${typeof reportPayload.googlePlace.rating === 'number' ? ` • ${reportPayload.googlePlace.rating.toFixed(1)} star rating` : ''}.`
              : 'No live Google Places profile was captured in the latest payload.'}
          </div>
          <a
            className="button-pill"
            href={reportPayload?.googlePlace?.googleMapsUri || '/dashboard/reports'}
            target={reportPayload?.googlePlace?.googleMapsUri ? '_blank' : undefined}
            rel={reportPayload?.googlePlace?.googleMapsUri ? 'noreferrer' : undefined}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            {reportPayload?.googlePlace?.googleMapsUri ? 'Open Google profile' : 'Open reports'}
          </a>
        </div>
      </div>

      {categories.length > 0 ? (
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--text-main)]">SEO Category Distribution</h3>
          </div>
          <MultiProgressBar segments={categories} />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <DashboardModuleCard
          title="Collision SEO Architecture"
          subtitle="Page structure, collision-service coverage, trust layers, and conversion readiness."
          score={architecture.score}
          badge={<span className={`dashboard-status ${entitlement === 'premium' ? 'dashboard-status-live' : 'dashboard-status-modeled'}`}>{entitlement === 'premium' ? 'Premium' : 'Teaser'}</span>}
        >
          {entitlement === 'premium' ? (
            <div className="space-y-4">
              <div>
                <p className="dashboard-label">Key findings</p>
                <ul className="mt-2 space-y-2 text-sm text-[var(--dashboard-text)]">
                  {architecture.findings.concat(architecture.trustWeaknesses).slice(0, 4).map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="dashboard-label">Page opportunities</p>
                <div className="mt-2 space-y-2">
                  {architecture.pageOpportunities.slice(0, 3).map((item) => (
                    <div key={item.title} className="dashboard-subpanel rounded-[18px] p-3">
                      <p className="text-sm font-semibold text-[var(--dashboard-text)]">{item.title}</p>
                      <p className="dashboard-body-sm mt-1">{item.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <LockedModuleTeaser title="High-intent page opportunities detected" body={architecture.teaser} />
          )}
        </DashboardModuleCard>

        <DashboardModuleCard
          title="Maps Authority"
          subtitle="Google profile and local pack strength using the current provider data."
          score={mapsAuthority.score}
          badge={<span className={`dashboard-status ${entitlement === 'premium' ? 'dashboard-status-live' : 'dashboard-status-modeled'}`}>{entitlement === 'premium' ? 'Premium' : 'Teaser'}</span>}
        >
          {entitlement === 'premium' ? (
            <div className="space-y-4">
              <p className="dashboard-body-sm">{mapsAuthority.competitorComparison}</p>
              <div className="grid gap-3 md:grid-cols-2">
                {mapsAuthority.highLevelGaps.slice(0, 4).map((item) => (
                  <div key={item} className="dashboard-subpanel rounded-[18px] p-3">
                    <p className="text-sm text-[var(--dashboard-text)]">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <LockedModuleTeaser title="Maps and GBP gap signals detected" body={mapsAuthority.teaser} />
          )}
        </DashboardModuleCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <CompetitorComparison
          yourShop={yourShop}
          competitors={competitors}
          reviewGapOverride={reportPayload?.reviewGap?.reviewGap ?? null}
        />
        <InteractiveMap
          points={mapPoints}
          geographic={hasGeographicPoints}
          title={hasGeographicPoints ? 'Interactive Market Map' : 'Interactive Relative Position Map'}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <DashboardModuleCard
          title="Competitor Gap Snapshot"
          subtitle="How nearby competitors appear to out-cover or out-convert your site."
          badge={<span className={`dashboard-status ${entitlement === 'premium' ? 'dashboard-status-live' : 'dashboard-status-modeled'}`}>{entitlement === 'premium' ? 'Premium' : 'Teaser'}</span>}
        >
          {entitlement === 'premium' ? (
            <div className="space-y-3">
              <p className="text-sm text-[var(--dashboard-text)]">{competitorGap.summary}</p>
              <p className="dashboard-body-sm">{competitorGap.servicePageDelta}</p>
              <div className="flex flex-wrap gap-2">
                {competitorGap.strongestSignals.slice(0, 4).map((item) => (
                  <span key={item} className="dashboard-chip">{item}</span>
                ))}
              </div>
            </div>
          ) : (
            <LockedModuleTeaser title="Local competitors appear stronger in several areas" body={competitorGap.teaser} />
          )}
        </DashboardModuleCard>

        <DashboardModuleCard
          title="Recommended Service Page Opportunities"
          subtitle="Highest-value collision pages missing from the current architecture."
          badge={<span className={`dashboard-status ${entitlement === 'premium' ? 'dashboard-status-live' : 'dashboard-status-modeled'}`}>{entitlement === 'premium' ? 'Paid only' : 'Locked'}</span>}
        >
          {entitlement === 'premium' ? (
            <div className="space-y-2">
              {architecture.pageOpportunities.slice(0, 4).map((item) => (
                <div key={item.title} className="dashboard-subpanel rounded-[18px] p-3">
                  <p className="text-sm font-semibold text-[var(--dashboard-text)]">{item.title}</p>
                  <p className="dashboard-body-sm mt-1">{item.reason}</p>
                </div>
              ))}
            </div>
          ) : (
            <LockedModuleTeaser title="High-intent page opportunities detected" body="Upgrade to unlock the exact service, OEM, and specialty page recommendations." />
          )}
        </DashboardModuleCard>

        <DashboardModuleCard
          title="Revenue Leak Indicator"
          subtitle="Severity of current visibility and conversion leakage."
          score={revenueLeak.severity}
          badge={<span className={`dashboard-status ${revenueLeak.severity === 'High' ? 'dashboard-status-warning' : revenueLeak.severity === 'Moderate' ? 'dashboard-status-modeled' : 'dashboard-status-live'}`}>{revenueLeak.severity}</span>}
        >
          {entitlement === 'premium' ? (
            <div className="space-y-3">
              <p className="text-sm text-[var(--dashboard-text)]">{revenueLeak.summary}</p>
              <ul className="space-y-2 text-sm text-[var(--dashboard-text)]">
                {revenueLeak.drivers.map((driver) => (
                  <li key={driver}>• {driver}</li>
                ))}
              </ul>
            </div>
          ) : (
            <LockedModuleTeaser title={`Leak severity: ${revenueLeak.severity}`} body="Upgrade to see the drivers behind the missed opportunity and which fixes matter most." />
          )}
        </DashboardModuleCard>
      </div>

      <DashboardModuleCard
        title="30-Day Repair Plan"
        subtitle="Collision-shop language, sequenced into a practical four-week sprint."
        badge={<span className={`dashboard-status ${entitlement === 'premium' ? 'dashboard-status-live' : 'dashboard-status-modeled'}`}>{entitlement === 'premium' ? 'Paid only' : 'Locked'}</span>}
      >
        {entitlement === 'premium' ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {repairPlan.map((item) => (
              <div key={item.week} className="dashboard-subpanel rounded-[18px] p-4">
                <p className="dashboard-label">{item.week}</p>
                <p className="mt-2 text-sm font-semibold text-[var(--dashboard-text)]">{item.focus}</p>
                <p className="dashboard-body-sm mt-2">{item.action}</p>
              </div>
            ))}
          </div>
        ) : (
          <LockedModuleTeaser title="A prioritized 4-week repair plan is ready" body="Upgrade to unlock the exact weekly sequence instead of a generic summary." />
        )}
      </DashboardModuleCard>

      {competitors.length === 0 && competitorSuggestions.length > 0 ? (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Competitor suggestions</div>
            <div className="card-action">Source-backed</div>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            No tracked competitor comparison is available yet. The latest scan found these shops for review in settings.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {competitorSuggestions.slice(0, 4).map((competitor) => (
              <div key={competitor.name} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-body)] px-4 py-4">
                <p className="font-medium text-[var(--text-main)]">{competitor.name}</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{competitor.websiteUrl || competitor.note}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
