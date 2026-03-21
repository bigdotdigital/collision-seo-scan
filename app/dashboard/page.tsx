import type { ReactNode } from 'react';
import Link from 'next/link';
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
import { getDashboardProfileById, isDashboardProfileId, type DashboardModuleId, type DashboardProfileId } from '@/lib/dashboard-profile';
import { DASHBOARD_FOCUS_TAGS } from '@/lib/dashboard-config';
import { refreshDashboardData } from './actions';
import { buildDashboardOverviewPageState } from '@/lib/dashboard-overview-page';

export const dynamic = 'force-dynamic';

export default async function DashboardOverviewPage({
  searchParams
}: {
  searchParams?: { refresh?: string; view?: string };
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
    demandContext,
    overviewBadges,
    marketInsights,
    organization,
    setupReadiness,
    nextSteps,
    dataHealth,
    weeklySummary,
    valueMoments,
    dashboardProfile,
    detectedDashboardProfile,
    dashboardCustomization
  } = await buildDashboardOverviewPageState(ctx.orgId);
  const refreshState = searchParams?.refresh || '';
  const forcedProfileId = isDashboardProfileId(searchParams?.view) ? searchParams?.view : null;
  const effectiveProfile = forcedProfileId ? getDashboardProfileById(forcedProfileId) : dashboardProfile;
  const premiumBadge = (
    <span className={`dashboard-status ${entitlement === 'premium' ? 'dashboard-status-live' : 'dashboard-status-modeled'}`}>
      {entitlement === 'premium' ? 'Premium' : 'Teaser'}
    </span>
  );
  const paidBadge = (
    <span className={`dashboard-status ${entitlement === 'premium' ? 'dashboard-status-live' : 'dashboard-status-modeled'}`}>
      {entitlement === 'premium' ? 'Paid only' : 'Locked'}
    </span>
  );
  const demandBadge = (
    <span
      className={`dashboard-status ${
        demandContext?.urgencyLabel === 'High Pressure'
          ? 'dashboard-status-warning'
          : demandContext?.urgencyLabel === 'Active'
            ? 'dashboard-status-modeled'
            : 'dashboard-status-live'
      }`}
    >
      {demandContext?.urgencyLabel || 'Unavailable'}
    </span>
  );
  const revenueBadge = (
    <span
      className={`dashboard-status ${
        revenueLeak.severity === 'High'
          ? 'dashboard-status-warning'
          : revenueLeak.severity === 'Moderate'
            ? 'dashboard-status-modeled'
            : 'dashboard-status-live'
      }`}
    >
      {revenueLeak.severity}
    </span>
  );
  const allModuleIds: DashboardModuleId[] = [
    'architecture',
    'maps',
    'demand',
    'competitorGap',
    'servicePages',
    'revenueLeak',
    'repairPlan'
  ];
  const primaryModuleIds = effectiveProfile.moduleIds;
  const secondaryModuleIds = allModuleIds.filter((id) => !primaryModuleIds.includes(id));
  const moduleMeta: Record<DashboardModuleId, { title: string; summary: string }> = {
    architecture: {
      title: 'Collision SEO Architecture',
      summary: 'Page structure, service coverage, trust layers, and conversion readiness.'
    },
    maps: {
      title: 'Maps Authority',
      summary: 'Google profile strength, review trust, and local pack leverage.'
    },
    demand: {
      title: 'Local Demand Context',
      summary: 'Crash, traffic, and hail pressure around this market.'
    },
    competitorGap: {
      title: 'Competitor Gap Snapshot',
      summary: 'Where nearby shops appear to out-cover or out-convert you.'
    },
    servicePages: {
      title: 'Recommended Service Page Opportunities',
      summary: 'High-intent collision pages missing from the current architecture.'
    },
    revenueLeak: {
      title: 'Revenue Leak Indicator',
      summary: 'Severity of the visibility and conversion leakage right now.'
    },
    repairPlan: {
      title: '30-Day Repair Plan',
      summary: 'The four-week sprint most likely to move this shop next.'
    }
  };
  const profileActionCards = [
    {
      title:
        nextSteps[0]?.title ||
        (effectiveProfile.id === 'conversion'
          ? 'Tighten estimate capture'
          : effectiveProfile.id === 'maps'
            ? 'Increase review and GBP authority'
            : effectiveProfile.id === 'storm'
              ? 'Publish storm-intent pages'
              : effectiveProfile.id === 'authority'
                ? 'Add trust and specialty proof'
                : 'Keep weekly momentum'),
      detail:
        nextSteps[0]?.detail ||
        effectiveProfile.nextPriority
    },
    {
      title:
        effectiveProfile.id === 'storm'
          ? 'Watch hail-driven demand'
          : effectiveProfile.id === 'maps'
            ? 'Close the local trust gap'
            : effectiveProfile.id === 'conversion'
              ? 'Reduce conversion leaks'
              : 'Use the strongest local signal',
      detail:
        demandContext?.summary ||
        'Use the demand layer to decide where urgency is real instead of treating every SEO task equally.'
    },
    {
      title: 'Stay on the weekly loop',
      detail:
        latestScan
          ? `${dataHealth.lastScanAgeLabel}. Keep refreshing so the dashboard can show movement instead of one-time diagnosis.`
          : 'Run the first scan so the dashboard can start building real week-over-week history.'
    }
  ];
  const moduleBadges: Partial<Record<DashboardModuleId, ReactNode>> = {
    architecture: premiumBadge,
    maps: premiumBadge,
    demand: demandBadge,
    competitorGap: premiumBadge,
    servicePages: paidBadge,
    revenueLeak: revenueBadge,
    repairPlan: paidBadge
  };
  const moduleScores: Partial<Record<DashboardModuleId, string | number>> = {
    architecture: architecture.score,
    maps: mapsAuthority.score,
    demand: demandContext?.demandPressure,
    revenueLeak: revenueLeak.severity
  };
  const moduleActionLinks: Record<DashboardModuleId, { href: string; label: string }> = {
    architecture: { href: '/dashboard/reports', label: 'Open latest report' },
    maps: { href: '/dashboard/reviews', label: 'Review maps trust' },
    demand: { href: '/dashboard/reports', label: 'See demand-backed report' },
    competitorGap: { href: '/dashboard/competitors', label: 'Review competitors' },
    servicePages: { href: '/dashboard/reports', label: 'See page gaps' },
    revenueLeak: { href: '/dashboard/reports', label: 'Review missed revenue' },
    repairPlan: { href: '/dashboard/reports', label: 'Open repair plan' }
  };
  const weeklyCommandDeck = [
    {
      label: 'Do first',
      title: profileActionCards[0]?.title || 'Review your primary recommendation',
      detail: profileActionCards[0]?.detail || effectiveProfile.nextPriority,
      tone: 'strong'
    },
    {
      label: 'Watch closely',
      title:
        demandContext?.urgencyLabel === 'High Pressure'
          ? `${demandContext.city} demand is active`
          : marketInsights.percentileLabel,
      detail:
        demandContext?.summary ||
        `You are currently ${marketInsights.percentileLabel.toLowerCase()} against our stored collision cohort.`,
      tone: demandContext?.urgencyLabel === 'High Pressure' ? 'warning' : 'default'
    },
    {
      label: 'Keep steady',
      title: latestScan ? dataHealth.lastScanAgeLabel : 'Start your weekly loop',
      detail:
        latestScan
          ? 'Fresh scans make the dashboard feel alive and keep your comparison deltas trustworthy.'
          : 'The first completed scan turns this from setup into a real weekly workspace.',
      tone: 'default'
    }
  ] as const;
  const ownerSnapshot = [
    {
      label: 'Primary focus',
      value: effectiveProfile.focusLabel,
      detail: effectiveProfile.nextPriority
    },
    {
      label: 'Best business lever',
      value: valueMoments[0]?.value || 'Monitoring',
      detail: valueMoments[0]?.detail || 'Use the dashboard to find the fastest business win.'
    },
    {
      label: 'Confidence',
      value: valueMoments[2]?.value || 'Building',
      detail: valueMoments[2]?.detail || 'Saved sources make this workspace more resilient.'
    }
  ];
  const focusTagLabels = Object.fromEntries(
    DASHBOARD_FOCUS_TAGS.map((tag) => [
      tag,
      tag === 'service-area'
        ? 'Service area'
        : tag === 'oem'
          ? 'OEM'
          : tag === 'adas'
            ? 'ADAS'
            : tag.charAt(0).toUpperCase() + tag.slice(1)
    ])
  ) as Record<(typeof DASHBOARD_FOCUS_TAGS)[number], string>;
  const renderModuleBody = (moduleId: DashboardModuleId) => {
    switch (moduleId) {
      case 'architecture':
        return (
          <>
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
          </>
        );
      case 'maps':
        return (
          <>
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
          </>
        );
      case 'demand':
        return (
          <>
            {demandContext ? (
              <div className="space-y-3">
                <p className="text-sm text-[var(--dashboard-text)]">{demandContext.summary}</p>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="dashboard-subpanel rounded-[18px] p-3">
                    <p className="dashboard-label">Crash</p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--dashboard-text)]">{demandContext.crashPressure}</p>
                  </div>
                  <div className="dashboard-subpanel rounded-[18px] p-3">
                    <p className="dashboard-label">Traffic</p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--dashboard-text)]">{demandContext.trafficExposure}</p>
                  </div>
                  <div className="dashboard-subpanel rounded-[18px] p-3">
                    <p className="dashboard-label">Hail</p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--dashboard-text)]">{demandContext.hailPressure}</p>
                  </div>
                </div>
              </div>
            ) : (
              <LockedModuleTeaser title="Local demand data is still filling in" body="Run a market-intel refresh to unlock city-level crash, traffic, and hail context." />
            )}
          </>
        );
      case 'competitorGap':
        return (
          <>
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
          </>
        );
      case 'servicePages':
        return (
          <>
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
          </>
        );
      case 'revenueLeak':
        return (
          <>
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
          </>
        );
      case 'repairPlan':
        return (
          <>
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
          </>
        );
      }
  };
  const moduleDeltaMeta: Partial<Record<DashboardModuleId, { label: string; tone: 'up' | 'down' | 'flat' }>> = {
    architecture: trends?.website
      ? {
          label: `${trends.website.type === 'up' ? '+' : '-'}${trends.website.value} vs last scan`,
          tone: trends.website.type === 'up' ? 'up' : 'down'
        }
      : undefined,
    maps: trends?.local
      ? {
          label: `${trends.local.type === 'up' ? '+' : '-'}${trends.local.value} vs last scan`,
          tone: trends.local.type === 'up' ? 'up' : 'down'
        }
      : undefined,
    revenueLeak: trends?.overall
      ? {
          label: `${trends.overall.type === 'up' ? 'Score up' : 'Score down'} ${trends.overall.value}`,
          tone: trends.overall.type === 'up' ? 'up' : 'down'
        }
      : undefined,
    demand: demandContext
      ? {
          label: `${demandContext.urgencyLabel} market`,
          tone: demandContext.urgencyLabel === 'High Pressure' ? 'down' : 'flat'
        }
      : undefined,
    competitorGap: competitors.length > 0
      ? {
          label: `${competitors.length} tracked competitors`,
          tone: 'flat'
        }
      : undefined,
    servicePages: architecture.pageOpportunities.length > 0
      ? {
          label: `${architecture.pageOpportunities.length} page gaps found`,
          tone: 'flat'
        }
      : undefined,
    repairPlan: {
      label: latestScan ? dataHealth.lastScanAgeLabel : 'Awaiting first scan',
      tone: 'flat'
    }
  };
  const profileViewIds: DashboardProfileId[] = ['conversion', 'maps', 'authority', 'storm', 'balanced'];

  return (
    <div className="space-y-6">
      <PageHeader
        title="SEO Revenue Dashboard"
        subtitle="Your weekly monitoring workspace for visibility, map authority, local demand pressure, and the clearest next steps to win more estimates."
        eyebrow="Overview"
        badges={overviewBadges}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <form action={refreshDashboardData}>
              <RefreshDashboardButton />
            </form>
            <Link
              href="/dashboard/reports"
              className="rounded-md border border-[var(--border-color)] px-4 py-2 text-sm font-medium hover:bg-[var(--bg-body)]"
            >
              View Report History
            </Link>
          </div>
        }
      />

      {refreshState === 'done' ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Fresh scan complete. The dashboard is now using the latest workspace data and provider results.
        </div>
      ) : null}
      {refreshState === 'queued' ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          Refresh queued. We saved a new scan and the dashboard will update when background processing finishes.
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

      <section className="card overflow-hidden">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="dashboard-status dashboard-status-cached">Weekly owner brief</span>
              <span
                className={`dashboard-status ${
                  weeklySummary.urgency === 'high'
                    ? 'dashboard-status-warning'
                    : weeklySummary.urgency === 'medium'
                      ? 'dashboard-status-modeled'
                      : 'dashboard-status-live'
                }`}
              >
                {weeklySummary.urgency === 'high'
                  ? 'Needs attention'
                  : weeklySummary.urgency === 'medium'
                    ? 'Worth acting on'
                    : 'In a good place'}
              </span>
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--text-main)]">
              {weeklySummary.headline}
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--text-secondary)]">
              {weeklySummary.subhead}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {nextSteps.slice(0, 3).map((step) => (
                <span key={step.title} className="rounded-full border border-[var(--border-color)] bg-[var(--bg-body)] px-3 py-1.5 text-sm text-[var(--text-secondary)]">
                  {step.title}
                </span>
              ))}
            </div>
            {dashboardCustomization.focusTags.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {dashboardCustomization.focusTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[var(--dashboard-border-strong)] bg-[var(--dashboard-bg-soft)] px-3 py-1.5 text-sm font-medium text-[var(--text-main)]"
                  >
                    Focus: {focusTagLabels[tag]}
                  </span>
                ))}
              </div>
            ) : null}
            {dashboardCustomization.customSummary ? (
              <div className="mt-6 rounded-2xl border border-[var(--dashboard-border-strong)] bg-[var(--dashboard-bg-soft)] p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Customized for this shop</div>
                <p className="mt-2 text-sm leading-7 text-[var(--text-main)]">{dashboardCustomization.customSummary}</p>
              </div>
            ) : null}
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {weeklyCommandDeck.map((item) => (
                <div
                  key={item.label}
                  className={`rounded-2xl border p-4 ${
                    item.tone === 'strong'
                      ? 'border-[var(--dashboard-border-strong)] bg-[var(--dashboard-bg-soft)]'
                      : item.tone === 'warning'
                        ? 'border-amber-200 bg-amber-50'
                        : 'border-[var(--border-color)] bg-[var(--bg-body)]'
                  }`}
                >
                  <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">{item.label}</div>
                  <div className="mt-2 text-base font-semibold text-[var(--text-main)]">{item.title}</div>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-px bg-[var(--border-color)] xl:grid-rows-3">
            {ownerSnapshot.map((item) => (
              <div key={item.label} className="bg-[var(--bg-card)] p-5">
                <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">{item.label}</div>
                <div className="mt-2 text-xl font-semibold text-[var(--text-main)]">{item.value}</div>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="grid gap-px bg-[var(--border-color)] xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className="bg-[var(--bg-card)] p-6">
            <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">Workspace profile</div>
            <h2 className="mt-3 text-2xl font-semibold text-[var(--text-main)]">{effectiveProfile.label}</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{effectiveProfile.summary}</p>
            <div className="mt-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-body)] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Current focus</div>
              <div className="mt-2 text-lg font-semibold text-[var(--text-main)]">{effectiveProfile.focusLabel}</div>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{effectiveProfile.nextPriority}</p>
            </div>
          </div>
          <div className="bg-[var(--bg-card)] p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">Recommended module stack</div>
              <span className="dashboard-status dashboard-status-cached">
                {forcedProfileId ? 'Manual view' : 'Detected automatically'}
              </span>
            </div>
            {dashboardCustomization.ownerWeeklyGoal ? (
              <div className="mt-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-body)] p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Weekly goal</div>
                <div className="mt-2 text-base font-semibold text-[var(--text-main)]">{dashboardCustomization.ownerWeeklyGoal}</div>
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {profileViewIds.map((profileId) => {
                const profile = getDashboardProfileById(profileId);
                const isActive = effectiveProfile.id === profileId;
                const params = new URLSearchParams();
                if (profileId !== dashboardProfile.id) {
                  params.set('view', profileId);
                }
                const href = params.toString() ? `/dashboard?${params.toString()}` : '/dashboard';

                return (
                  <Link
                    key={profileId}
                    href={href}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      isActive
                        ? 'border-[var(--dashboard-border-strong)] bg-[var(--dashboard-bg-soft)] text-[var(--text-main)]'
                        : 'border-[var(--border-color)] bg-[var(--bg-body)] text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    {profile.label.replace(' Profile', '')}
                  </Link>
                );
              })}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {effectiveProfile.moduleTitles.map((title, index) => (
                <div key={title} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-body)] p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Module {index + 1}</div>
                  <div className="mt-2 text-sm font-semibold text-[var(--text-main)]">{title}</div>
                </div>
              ))}
            </div>
            {dashboardCustomization.operatorNote ? (
              <div className="mt-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-body)] p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Operator note</div>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{dashboardCustomization.operatorNote}</p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <section className="card overflow-hidden">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">This week</p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--text-main)]">
                {organization?.name || latestScan?.shopName || 'Your shop'} is{' '}
                {setupReadiness.ready ? 'fully set up for monitoring' : 'still finishing setup'}
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
                {setupReadiness.ready
                  ? 'Your workspace has enough foundation data to keep tracking weekly and turn scans into specific action.'
                  : 'Finish the missing foundation inputs below so the dashboard can model opportunity more cleanly and keep week-over-week telemetry stable.'}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-body)] px-4 py-3 text-right">
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Setup progress</div>
              <div className="mt-2 text-3xl font-semibold text-[var(--text-main)]">
                {setupReadiness.completed}/{setupReadiness.total}
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-body)] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Last scan</div>
              <div className="mt-2 text-lg font-semibold text-[var(--text-main)]">{dataHealth.lastScanAgeLabel}</div>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Weekly monitoring works best when your freshest scan is recent and attached to a real website.
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-body)] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Saved data coverage</div>
              <div className="mt-2 text-lg font-semibold text-[var(--text-main)]">
                {dataHealth.websiteStatus} site • {dataHealth.googleStatus} maps
              </div>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                We now fall back to saved shop data so the dashboard and reports stay useful when provider calls are thin.
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-body)] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Tracking foundation</div>
              <div className="mt-2 text-lg font-semibold text-[var(--text-main)]">
                {dataHealth.keywordStatus} • {dataHealth.competitorStatus}
              </div>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                The $49 plan gets stronger when keyword tracking and competitor coverage are both real, not inferred.
              </p>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">Next best moves</p>
              <h2 className="mt-2 text-xl font-semibold text-[var(--text-main)]">Keep the dashboard compounding</h2>
            </div>
            <span className={`dashboard-status ${setupReadiness.ready ? 'dashboard-status-live' : 'dashboard-status-warning'}`}>
              {setupReadiness.ready ? 'Ready' : 'Action needed'}
            </span>
          </div>
          <div className="space-y-3">
            {(nextSteps.length > 0
              ? nextSteps
              : [
                  {
                    title: 'Stay on weekly refresh',
                    detail: 'Your foundation is in good shape. The next payoff comes from weekly scan history and acting on the repair plan.'
                  },
                  {
                    title: 'Review your local demand context',
                    detail: 'Crash, traffic, and hail pressure now help prioritize fixes in active markets.'
                  },
                  {
                    title: 'Use reports in sales conversations',
                    detail: 'Your saved dashboard data now backs up reports when live provider calls are incomplete.'
                  }
                ]
            ).slice(0, 3).map((step) => (
              <div key={step.title} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-body)] p-4">
                <div className="text-sm font-semibold text-[var(--text-main)]">{step.title}</div>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{step.detail}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          value={latestScan?.scoreTotal ?? 'N/A'}
          label="Overall SEO Score"
          subtitle="Out of 100 points"
          trend={trends?.overall}
          className="lg:col-span-1"
        />

        <MetricCard
          value={latestScan ? dataHealth.lastScanAgeLabel.replace('Scanned ', '') : 'Pending'}
          label="Latest Scan"
          subtitle={
            latestScan
              ? 'Freshness of your saved monitoring data'
              : 'Run your first completed scan to start weekly tracking'
          }
          className="lg:col-span-1"
        />

        <MetricCard
          value={reportPayload?.googlePlace?.userRatingCount ?? 'Pending'}
          label="Google Review Snapshot"
          subtitle={
            reportPayload?.googlePlace
              ? typeof reportPayload.googlePlace.rating === 'number'
                ? `${reportPayload.googlePlace.rating.toFixed(1)} star rating`
                : 'Saved profile'
              : 'Waiting on a saved Google profile snapshot'
          }
          className="lg:col-span-1"
        />

        <MetricCard
          value={nextSteps.length > 0 ? nextSteps.length : issues.length}
          label="Priority Actions"
          subtitle={
            nextSteps.length > 0
              ? 'Setup and growth tasks worth doing next'
              : 'Quick fixes available from the latest scan'
          }
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <section className="card">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">What our dataset says</p>
              <h2 className="mt-2 text-xl font-semibold text-[var(--text-main)]">You’re not competing against a generic SEO rubric</h2>
              <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
                This compares your latest scan to {marketInsights.cohortLabel} in our own collision dataset.
              </p>
            </div>
            <span className="dashboard-status dashboard-status-cached">{marketInsights.percentileLabel}</span>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-body)] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Overall vs cohort</div>
              <div className={`mt-2 text-2xl font-semibold ${marketInsights.scoreDelta >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                {marketInsights.scoreDelta >= 0 ? '+' : ''}
                {marketInsights.scoreDelta}
              </div>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">points against {marketInsights.cohortSize} scanned shops</p>
            </div>
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-body)] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Website delta</div>
              <div className={`mt-2 text-2xl font-semibold ${marketInsights.websiteDelta >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                {marketInsights.websiteDelta >= 0 ? '+' : ''}
                {marketInsights.websiteDelta}
              </div>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">technical/site structure vs cohort</p>
            </div>
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-body)] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Local delta</div>
              <div className={`mt-2 text-2xl font-semibold ${marketInsights.localDelta >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                {marketInsights.localDelta >= 0 ? '+' : ''}
                {marketInsights.localDelta}
              </div>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">maps/reviews/local trust vs cohort</p>
            </div>
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-body)] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Intent delta</div>
              <div className={`mt-2 text-2xl font-semibold ${marketInsights.intentDelta >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                {marketInsights.intentDelta >= 0 ? '+' : ''}
                {marketInsights.intentDelta}
              </div>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">service/offer coverage vs cohort</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {marketInsights.leverageNotes.map((note) => (
              <div key={note} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-body)] p-4">
                <p className="text-sm text-[var(--text-secondary)]">{note}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">Blind spots in the market</p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--text-main)]">What still breaks on real collision sites</h2>
          </div>
          <div className="space-y-3">
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-body)] p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--text-main)]">No estimate flow</span>
                <span className="dashboard-status dashboard-status-warning">{marketInsights.issueRates.noEstimate}%</span>
              </div>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">A third of scanned shops still fail here. This is one of the clearest separators in our own data.</p>
            </div>
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-body)] p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--text-main)]">No saved reviews</span>
                <span className="dashboard-status dashboard-status-modeled">{marketInsights.issueRates.noReviews}%</span>
              </div>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Review trust is still inconsistent across the market, which means visible proof can move faster than pure content work.</p>
            </div>
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-body)] p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--text-main)]">No OEM/cert signals</span>
                <span className="dashboard-status dashboard-status-cached">{marketInsights.issueRates.noOem}%</span>
              </div>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Certification proof still meaningfully separates stronger shops from weaker ones in the scans we’ve stored.</p>
            </div>
            {marketInsights.cityRank ? (
              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-body)] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[var(--text-main)]">Market density rank</span>
                  <span className="dashboard-status dashboard-status-live">#{marketInsights.cityRank}</span>
                </div>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">Your city is one of the densest collision datasets we’ve scanned so far, so these comparisons are grounded in real local competition.</p>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      {demandContext ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <MetricCard
            value={demandContext.demandPressure}
            label={`${demandContext.city} Demand Pressure`}
            subtitle={`${demandContext.urgencyLabel} market`}
            className="lg:col-span-1"
          />
          <MetricCard
            value={demandContext.crashPressure}
            label="Crash Pressure"
            subtitle="Stored weekly city demand signal"
            className="lg:col-span-1"
          />
          <MetricCard
            value={demandContext.hailPressure}
            label="Hail Pressure"
            subtitle="Storm-driven repair demand context"
            className="lg:col-span-1"
          />
          <MetricCard
            value={demandContext.trafficExposure}
            label="Traffic Exposure"
            subtitle="Corridor intensity around your market"
            className="lg:col-span-1"
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <MetricCard
          value={hasRevenueInputs ? revenueImpact.traffic : 'Pending'}
          label="Modeled Search Traffic"
          subtitle={
            hasRevenueInputs
              ? `${revenueImpact.assumptions.ctrModel} from saved money-keyword volume`
              : 'Add keyword-demand inputs and this turns on automatically'
          }
          className="lg:col-span-1"
        />
        <MetricCard
          value={hasRevenueInputs ? revenueImpact.leads : 'Pending'}
          label="Modeled Leads"
          subtitle={hasRevenueInputs ? revenueImpact.assumptions.leadRate : 'Lead modeling turns on after keyword-demand data is saved'}
          className="lg:col-span-1"
        />
        <MetricCard
          value={hasRevenueInputs ? `$${revenueImpact.revenue.toLocaleString()}` : 'Pending'}
          label="Modeled Revenue Opportunity"
          subtitle={hasRevenueInputs ? revenueImpact.assumptions.averageOrderValue : 'Revenue opportunity shows once saved keyword volume is attached'}
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
              {reportPayload?.googlePlace?.googleMapsUri
                ? reportPayload?.sources?.reviews === 'cached'
                  ? 'Stored profile linked'
                  : 'Maps linked'
                : reportPayload?.googlePlace
                  ? 'Stored profile'
                  : 'No profile saved'}
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
              ? `${reportPayload?.sources?.reviews === 'cached' ? 'Stored Google profile snapshot' : 'Google Places snapshot'}${
                  typeof reportPayload.googlePlace.rating === 'number' ? ` • ${reportPayload.googlePlace.rating.toFixed(1)} star rating` : ''
                }.`
              : 'No saved Google profile snapshot yet.'}
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

      <section className="card overflow-hidden">
        <div className="grid gap-px bg-[var(--border-color)] xl:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
          <div className="bg-[var(--bg-card)] p-6">
            <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">Profile-driven focus</div>
            <h2 className="mt-3 text-2xl font-semibold text-[var(--text-main)]">Primary modules for this shop</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                This workspace is currently in the <span className="font-semibold text-[var(--text-main)]">{effectiveProfile.label}</span>, so we’re putting the most relevant modules first instead of making every card compete equally.
              </p>
              {dashboardCustomization.preferredProfileId && dashboardCustomization.preferredProfileId !== detectedDashboardProfile.id ? (
                <p className="mt-3 text-sm text-[var(--text-secondary)]">
                  This stack is manually pinned instead of using the auto-detected profile.
                </p>
              ) : null}
            <div className="mt-5 space-y-3">
              {primaryModuleIds.map((moduleId, index) => (
                <div key={moduleId} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-body)] p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Priority {index + 1}</div>
                  <div className="mt-2 text-base font-semibold text-[var(--text-main)]">{moduleMeta[moduleId].title}</div>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">{moduleMeta[moduleId].summary}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[var(--bg-card)] p-6">
            <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">Operator notes</div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-body)] p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Current focus</div>
                <div className="mt-2 text-lg font-semibold text-[var(--text-main)]">{effectiveProfile.focusLabel}</div>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{effectiveProfile.nextPriority}</p>
              </div>
              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-body)] p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Secondary stack</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {secondaryModuleIds.map((moduleId) => (
                    <span key={moduleId} className="dashboard-chip">
                      {moduleMeta[moduleId].title}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-sm text-[var(--text-secondary)]">Nothing disappears. Lower-priority modules just move behind the first stack so the page feels tailored instead of overwhelming.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">Primary modules</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--text-main)]">What deserves attention first</h2>
          </div>
          <span className="dashboard-status dashboard-status-live">{effectiveProfile.focusLabel}</span>
        </div>
        <div className="mb-6 grid gap-3 md:grid-cols-3">
          {profileActionCards.map((item, index) => (
            <div
              key={item.title}
              className={`rounded-2xl border p-4 ${
                index === 0
                  ? 'border-[var(--dashboard-border-strong)] bg-[var(--dashboard-bg-soft)]'
                  : 'border-[var(--border-color)] bg-[var(--bg-card)]'
              }`}
            >
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Action {index + 1}</div>
              <div className="mt-2 text-base font-semibold text-[var(--text-main)]">{item.title}</div>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{item.detail}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {primaryModuleIds.map((moduleId, index) => {
            const tone =
              index === 0
                ? effectiveProfile.id === 'storm'
                  ? 'warning'
                  : 'accent'
                : 'default';

            return (
              <div key={moduleId} className={index === 0 ? 'xl:col-span-2' : ''}>
                <DashboardModuleCard
                  title={moduleMeta[moduleId].title}
                  subtitle={moduleMeta[moduleId].summary}
                  score={moduleScores[moduleId]}
                  badge={moduleBadges[moduleId]}
                  eyebrow={index === 0 ? 'Primary spotlight' : `Priority ${index + 1}`}
                  tone={tone}
                  className={index === 0 ? 'shadow-md' : ''}
                >
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-body)] px-4 py-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Why this is on top</div>
                        <div className="mt-1 text-sm font-semibold text-[var(--text-main)]">
                          {index === 0 ? profileActionCards[0].title : profileActionCards[Math.min(index, profileActionCards.length - 1)].title}
                        </div>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          {index === 0 ? profileActionCards[0].detail : profileActionCards[Math.min(index, profileActionCards.length - 1)].detail}
                        </p>
                      </div>
                      {moduleDeltaMeta[moduleId] ? (
                        <span
                          className={`dashboard-status ${
                            moduleDeltaMeta[moduleId]?.tone === 'up'
                              ? 'dashboard-status-live'
                              : moduleDeltaMeta[moduleId]?.tone === 'down'
                                ? 'dashboard-status-warning'
                                : 'dashboard-status-cached'
                          }`}
                        >
                          {moduleDeltaMeta[moduleId]?.label}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Best next move</div>
                        <div className="mt-1 text-sm font-semibold text-[var(--text-main)]">
                          {moduleActionLinks[moduleId].label}
                        </div>
                      </div>
                      <Link
                        href={moduleActionLinks[moduleId].href}
                        className="rounded-full border border-[var(--dashboard-border-strong)] bg-[var(--dashboard-bg-soft)] px-3 py-1.5 text-sm font-medium text-[var(--text-main)] transition hover:opacity-90"
                      >
                        Open
                      </Link>
                    </div>
                    {renderModuleBody(moduleId)}
                  </div>
                </DashboardModuleCard>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">Secondary modules</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--text-main)]">Keep the rest of the system in view</h2>
          </div>
          <span className="dashboard-status dashboard-status-cached">Still available</span>
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {secondaryModuleIds.map((moduleId) => (
            <DashboardModuleCard
              key={moduleId}
              title={moduleMeta[moduleId].title}
              subtitle={moduleMeta[moduleId].summary}
              score={moduleScores[moduleId]}
              badge={moduleBadges[moduleId]}
              eyebrow="Secondary module"
              tone="muted"
              compact
            >
              <div className="space-y-3">
                {moduleDeltaMeta[moduleId] ? (
                  <div className="flex items-center justify-between rounded-2xl border border-[var(--border-color)] bg-[var(--bg-body)] px-3 py-2">
                    <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Weekly signal</span>
                    <span
                      className={`dashboard-status ${
                        moduleDeltaMeta[moduleId]?.tone === 'up'
                          ? 'dashboard-status-live'
                          : moduleDeltaMeta[moduleId]?.tone === 'down'
                            ? 'dashboard-status-warning'
                            : 'dashboard-status-cached'
                      }`}
                    >
                      {moduleDeltaMeta[moduleId]?.label}
                    </span>
                  </div>
                ) : null}
                {renderModuleBody(moduleId)}
              </div>
            </DashboardModuleCard>
          ))}
        </div>
      </section>

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
