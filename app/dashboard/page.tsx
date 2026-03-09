import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireDashboardContext } from '@/lib/dashboard-auth';
import { PageHeader } from '@/components/page-header';
import { AlertCard } from '@/components/alert-card';
import { KeywordTable } from '@/components/keyword-table';
import { parseJson } from '@/lib/json';
import { parseReportPayload } from '@/lib/report-payload';
import type { CategoryKey, Issue, PrioritizedFix } from '@/lib/types';

export const dynamic = 'force-dynamic';

type SourceConfidence = 'live' | 'cached' | 'modeled' | 'fallback' | 'error' | 'unknown';

type TaskRow = {
  title: string;
  why: string;
  steps: string[];
  impact: 'High' | 'Med' | 'Low';
};

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  technicalSeo: 'Technical Foundation',
  localSeo: 'Local Visibility',
  collisionAuthority: 'Collision Trust Signals',
  speedPerformance: 'Speed & Mobile Experience',
  contentCoverage: 'Service Coverage'
};

const IMPACT_STYLES: Record<TaskRow['impact'], string> = {
  High: 'border-[#ff4d5b]/50 bg-[#ff4d5b]/15 text-[#ff8a93]',
  Med: 'border-[#ff9a5c]/45 bg-[#ff9a5c]/12 text-[#ffb388]',
  Low: 'border-white/25 bg-white/10 text-white/80'
};

function isNonShopCompetitor(name?: string | null, url?: string | null) {
  const sample = `${name || ''} ${url || ''}`.toLowerCase();
  return /(yelp|yellowpages|facebook\.com|mapquest|bbb\.org|foursquare|manta\.com|chamberofcommerce)/.test(sample);
}

function plainLanguage(text: string) {
  return text
    .replace(/SERP/gi, 'Google search results')
    .replace(/CTR/gi, 'click-through rate')
    .replace(/GBP/gi, 'Google Business Profile')
    .replace(/schema/gi, 'structured business markup')
    .replace(/H1/gi, 'main headline')
    .replace(/meta description/gi, 'Google snippet description')
    .replace(/LCP/gi, 'page load speed')
    .replace(/CLS/gi, 'layout stability');
}

function toTaskFromIssue(issue: Issue): TaskRow {
  const steps = issue.fix
    .split(/\.|;|\|/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 3);

  return {
    title: plainLanguage(issue.title),
    why: plainLanguage(issue.why),
    steps: steps.length > 0 ? steps : [plainLanguage(issue.fix)],
    impact: issue.severity
  };
}

function toTaskFromFix(fix: PrioritizedFix): TaskRow {
  return {
    title: plainLanguage(fix.title),
    why: plainLanguage(fix.why),
    steps: (fix.steps || []).map((step) => plainLanguage(step)).slice(0, 4),
    impact: fix.impact
  };
}

function confidenceTone(source: SourceConfidence) {
  if (source === 'live') return 'bg-[#ff4d5b]/15 text-[#ff8a93] border-[#ff4d5b]/45';
  if (source === 'cached') return 'bg-white/10 text-white border-white/20';
  if (source === 'modeled') return 'bg-[#ff9a5c]/12 text-[#ffb388] border-[#ff9a5c]/45';
  if (source === 'error') return 'bg-red-100 text-red-700 border-red-300';
  if (source === 'fallback') return 'bg-black/30 text-white/70 border-white/15';
  return 'bg-black/30 text-white/70 border-white/15';
}

function pickTopTasks(topFixes: PrioritizedFix[], issues: Issue[], fallbackTitle: string): TaskRow[] {
  const fixTasks = topFixes.map(toTaskFromFix);
  const issueTasks = issues.map(toTaskFromIssue);
  const merged = [...fixTasks, ...issueTasks];

  const deduped = merged.filter((row, idx) => {
    const key = row.title.toLowerCase();
    return merged.findIndex((item) => item.title.toLowerCase() === key) === idx;
  });

  if (deduped.length >= 3) return deduped.slice(0, 3);

  const filler: TaskRow[] = [
    {
      title: 'Expand collision service pages by intent',
      why: 'More city + service pages means more qualified estimate calls from search.',
      steps: [
        'Publish pages for collision repair, hail damage, bumper repair, and ADAS calibration in your city.',
        'Add before/after proof and clear estimate CTA on each page.',
        'Link every page back to the quote flow and contact details.'
      ],
      impact: 'Med'
    },
    {
      title: 'Strengthen review and trust proof',
      why: 'Collision buyers compare trust signals before they call or request an estimate.',
      steps: [
        'Feature OEM and I-CAR proof near top-of-page sections.',
        'Add recent review snippets tied to repair outcomes.',
        'Update Google Business Profile photos monthly.'
      ],
      impact: 'Med'
    },
    {
      title: fallbackTitle,
      why: 'Small weekly updates keep rankings moving instead of stalling.',
      steps: [
        'Review weekly alerts and close the highest impact issue first.',
        'Track 10-20 money keywords and adjust pages with drops.',
        'Use competitor wins as a checklist for missing trust and conversion elements.'
      ],
      impact: 'Low'
    }
  ];

  return [...deduped, ...filler].slice(0, 3);
}

function humanTime(date: Date | null | undefined) {
  if (!date) return 'No snapshot yet';
  return date.toLocaleString();
}

export default async function DashboardOverviewPage() {
  const ctx = await requireDashboardContext();
  const bookCallUrl = process.env.CALENDLY_LINK || 'https://calendly.com/bigdotdigital/30min';

  const [
    latestSnapshot,
    latestScan,
    activeKeywordCount,
    activeCompetitorCount,
    unreadAlerts,
    recentAlerts,
    keywords,
    trackedCompetitors,
    subscription
  ] = await Promise.all([
    prisma.scanSnapshot.findFirst({
      where: { organizationId: ctx.orgId },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.scan.findFirst({
      where: { organizationId: ctx.orgId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        scoreTotal: true,
        scoreWebsite: true,
        scoreLocal: true,
        scoreIntent: true,
        issuesJson: true,
        rawChecksJson: true,
        websiteUrl: true,
        city: true,
        shopName: true
      }
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
      take: 4
    }),
    prisma.trackedKeyword.findMany({
      where: { orgId: ctx.orgId, isActive: true },
      take: 12,
      orderBy: { createdAt: 'asc' },
      include: {
        snapshots: {
          orderBy: { snapshotDate: 'desc' },
          take: 2
        }
      }
    }),
    prisma.trackedCompetitor.findMany({
      where: { orgId: ctx.orgId, isActive: true },
      orderBy: { createdAt: 'asc' },
      take: 6
    }),
    prisma.subscription.findUnique({
      where: { orgId: ctx.orgId },
      select: { planTier: true, status: true, trialEndsAt: true }
    })
  ]);

  const rawPayload = latestScan ? parseJson<unknown>(latestScan.rawChecksJson, null) : null;
  const reportPayload = parseReportPayload(rawPayload);
  const issues = latestScan ? parseJson<Issue[]>(latestScan.issuesJson, []) : [];

  const sourceConfidence = {
    pagespeed: reportPayload?.sources.pagespeed || 'unknown',
    serp: reportPayload?.sources.serp || 'unknown',
    aiSummary: reportPayload?.sources.aiSummary || 'unknown',
    competitors: reportPayload?.sources.competitors || 'unknown',
    keywords: reportPayload?.sources.keywords || 'unknown'
  } as const;
  const providerStatus = reportPayload?.providerStatus || null;

  const categories = reportPayload?.categoryScores
    ? [
        {
          key: 'technicalSeo' as const,
          score: reportPayload.categoryScores.technicalSeo,
          label: CATEGORY_LABELS.technicalSeo,
          meaning: reportPayload.categoryScores.explanations.technicalSeo
        },
        {
          key: 'localSeo' as const,
          score: reportPayload.categoryScores.localSeo,
          label: CATEGORY_LABELS.localSeo,
          meaning: reportPayload.categoryScores.explanations.localSeo
        },
        {
          key: 'collisionAuthority' as const,
          score: reportPayload.categoryScores.collisionAuthority,
          label: CATEGORY_LABELS.collisionAuthority,
          meaning: reportPayload.categoryScores.explanations.collisionAuthority
        },
        {
          key: 'speedPerformance' as const,
          score: reportPayload.categoryScores.speedPerformance,
          label: CATEGORY_LABELS.speedPerformance,
          meaning: reportPayload.categoryScores.explanations.speedPerformance
        },
        {
          key: 'contentCoverage' as const,
          score: reportPayload.categoryScores.contentCoverage,
          label: CATEGORY_LABELS.contentCoverage,
          meaning: reportPayload.categoryScores.explanations.contentCoverage
        }
      ]
    : [];

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

  const topTasks = pickTopTasks(
    reportPayload?.topFixes || [],
    issues,
    'Keep momentum with weekly optimization'
  );

  const competitorAdvantages = (reportPayload?.competitorAdvantages || [])
    .filter((row) => !isNonShopCompetitor(row.name, row.url))
    .slice(0, 4);

  const competitorsForFallback = trackedCompetitors
    .filter((row) => !isNonShopCompetitor(row.name, row.websiteUrl))
    .slice(0, 4);

  const highestTask = topTasks[0];

  return (
    <div>
      <PageHeader
        title="Monitoring Command Center"
        subtitle="Built for collision shops: track local demand, spot leaks, and execute the next fix that drives estimate calls."
        eyebrow="Shop Growth Dashboard"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/reports"
              className="dashboard-button"
            >
              Open latest report
            </Link>
            <a
              href={bookCallUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-[#ff4d5b] px-4 py-2 text-sm font-semibold text-white"
            >
              Book strategy call
            </a>
          </div>
        }
      />

      <section className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">How are we doing?</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {reportPayload?.categoryScores.overall ?? latestScan?.scoreTotal ?? 'N/A'}
            <span className="ml-1 text-lg font-medium text-slate-500">/100</span>
          </p>
          <p className="mt-1 text-sm text-slate-600">Overall local visibility health for this shop.</p>
        </article>

        <article className="card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">What is wrong right now?</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{issues.length || topTasks.length}</p>
          <p className="mt-1 text-sm text-slate-600">
            Active issues to address. We sort fixes by expected call impact.
          </p>
        </article>

        <article className="card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Fix first</p>
          <p className="mt-2 text-base font-semibold text-slate-900">{highestTask?.title || 'No top task yet'}</p>
          <p className="mt-1 text-sm text-slate-600">Start here for the fastest ranking and conversion lift.</p>
        </article>

        <article className="card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Competitor pressure</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {competitorAdvantages.length || competitorsForFallback.length || activeCompetitorCount}
          </p>
          <p className="mt-1 text-sm text-slate-600">Local body shops currently tracked against your market.</p>
        </article>
      </section>

      <section className="mb-4 card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Tasks sorted by priority</h2>
            <p className="mt-1 text-sm text-slate-600">
              Clear work queue for shop owners and managers. Focus on these before low-impact SEO chores.
            </p>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Top 3 this week
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {topTasks.map((task, idx) => (
            <article key={`${task.title}-${idx}`} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${IMPACT_STYLES[task.impact]}`}>
                  {task.impact}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{task.why}</p>
              <div className="mt-3 space-y-1 text-sm text-slate-700">
                {task.steps.slice(0, 3).map((step, stepIdx) => (
                  <p key={`${task.title}-step-${stepIdx}`}>• {step}</p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <article className="card p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">Category breakdown</h2>
            <span className="text-xs text-slate-500">Last scan: {humanTime(latestScan?.createdAt)}</span>
          </div>
          {categories.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              Run a fresh scan to populate category scoring and explanations.
            </div>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {categories.map((category) => (
                <article key={category.key} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{category.label}</p>
                    <p className="text-sm font-semibold text-slate-900">{category.score}/100</p>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-slate-900"
                      style={{ width: `${Math.max(4, Math.min(100, category.score))}%` }}
                    />
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{plainLanguage(category.meaning)}</p>
                </article>
              ))}
            </div>
          )}
        </article>

        <article className="card p-5">
          <h2 className="text-base font-semibold text-slate-900">Source confidence</h2>
          <p className="mt-1 text-sm text-slate-600">
            Every section is tagged so your team knows what is measured live vs modeled.
          </p>
          <div className="mt-4 space-y-2">
            {Object.entries(sourceConfidence).map(([label, source]) => (
              <div key={label} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <span className="text-sm capitalize text-slate-700">{label}</span>
                <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold uppercase ${confidenceTone(source as SourceConfidence)}`}>
                  {source}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            Snapshot: {humanTime(latestSnapshot?.createdAt)}
          </div>
        </article>
      </section>

      <section className="mb-4 card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Data pipeline health</h2>
            <p className="mt-1 text-sm text-slate-600">
              Live status from the most recent scan pipeline execution.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Last scan: {humanTime(latestScan?.createdAt)}
          </span>
        </div>

        {providerStatus ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'PageSpeed', data: providerStatus.pagespeed },
              { label: 'SERP', data: providerStatus.serp },
              { label: 'Map Pack', data: providerStatus.mapPack },
              { label: 'AI Summary', data: providerStatus.aiSummary },
              { label: 'Snapshot', data: providerStatus.snapshot },
              { label: 'Google Places', data: providerStatus.googlePlaces }
            ].map((item) => (
              <article key={item.label} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold uppercase ${confidenceTone((item.data?.status || 'unknown') as SourceConfidence)}`}>
                    {item.data?.status || 'unknown'}
                  </span>
                </div>
                {'provider' in (item.data || {}) && (item.data as { provider?: string }).provider ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Provider: {(item.data as { provider?: string }).provider}
                  </p>
                ) : null}
                <p className="mt-2 text-sm text-slate-600">
                  {item.data?.detail || 'No details available for this provider run.'}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            No pipeline health data yet. Run a fresh scan to populate provider diagnostics.
          </div>
        )}
      </section>

      <section className="mb-4 grid gap-4 md:grid-cols-2">
        <article className="card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-900">How you compare to competitors</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              Local body shops only
            </span>
          </div>
          {competitorAdvantages.length > 0 ? (
            <div className="mt-4 space-y-3">
              {competitorAdvantages.map((row, idx) => (
                <article key={`${row.name}-${idx}`} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{row.name}</p>
                      <p className="text-xs text-slate-500">
                        OEM signals: {row.oemSignalCount} • Capability coverage: {row.capabilityCount} • Estimate CTA:{' '}
                        {row.estimateCta ? 'Yes' : 'No'}
                      </p>
                    </div>
                    {row.url ? (
                      <a href={row.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#ff8a93] underline-offset-2 hover:underline">
                        Visit
                      </a>
                    ) : null}
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-slate-700">
                    {row.advantages.slice(0, 2).map((advantage, i) => (
                      <p key={`${row.name}-adv-${i}`}>• {plainLanguage(advantage)}</p>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              Add 3-5 metro competitors to unlock head-to-head insights and weekly pressure alerts.
            </div>
          )}
        </article>

        <article className="card p-5">
          <h2 className="text-base font-semibold text-slate-900">Alert feed</h2>
          <p className="mt-1 text-sm text-slate-600">
            Unread: {unreadAlerts}. This feed highlights movement that could affect lead flow.
          </p>
          <div className="mt-4 space-y-3">
            {recentAlerts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                No active alerts yet.
              </div>
            ) : (
              recentAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  type={alert.type}
                  severity={alert.severity}
                  title="Monitoring event"
                  subtitle={plainLanguage(parseJson<{ message?: string }>(alert.payloadJson, {}).message || 'Change detected from tracked rankings or competitors.')}
                  when={new Date(alert.createdAt).toLocaleString()}
                />
              ))
            )}
          </div>
        </article>
      </section>

      <article className="card mb-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Weekly plan and support</h2>
            <p className="mt-1 text-sm text-slate-700">
              $49/month includes monitoring, a free setup call, and monthly SEO consult calls to customize this dashboard for your shop.
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Prefer async? Start on your own and email feedback anytime.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-slate-500">Plan status</p>
            <p className="text-sm font-semibold text-slate-900">
              {subscription ? `${subscription.planTier} • ${subscription.status}` : 'No subscription record'}
            </p>
            {subscription?.trialEndsAt ? (
              <p className="text-xs text-slate-600">Trial ends: {new Date(subscription.trialEndsAt).toLocaleDateString()}</p>
            ) : null}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/dashboard/billing"
            className="inline-flex rounded-xl border border-white/20 bg-black/20 px-4 py-2 text-sm font-semibold text-white"
          >
            Manage plan
          </Link>
          <a
            href={bookCallUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-xl bg-[#ff4d5b] px-4 py-2 text-sm font-semibold text-white"
          >
            Book customization call
          </a>
          <a
            href="mailto:bigdotdigital@gmail.com?subject=Dashboard%20customization%20request"
            className="inline-flex rounded-xl border border-white/20 bg-black/20 px-4 py-2 text-sm font-semibold text-white"
          >
            Email support
          </a>
        </div>
      </article>

      <details className="card p-5">
        <summary className="cursor-pointer text-sm font-semibold text-slate-900">
          Technical detail view (rank table)
        </summary>
        <p className="mt-1 text-sm text-slate-600">
          Use this when you want row-level keyword movement.
        </p>
        <div className="mt-4">
          <KeywordTable rows={keywordRows} />
        </div>
      </details>
    </div>
  );
}
