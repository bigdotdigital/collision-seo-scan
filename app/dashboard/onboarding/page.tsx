import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireDashboardContext } from '@/lib/dashboard-auth';
import { PageHeader } from '@/components/page-header';
import { DashboardKpiCard } from '@/components/dashboard-kpi-card';

export const dynamic = 'force-dynamic';

export default async function DashboardOnboardingPage({
  searchParams
}: {
  searchParams?: { updated?: string; error?: string; checkout?: string; trial?: string };
}) {
  const ctx = await requireDashboardContext();

  const [org, location, keywordCount, competitorCount, keywords, competitors] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: ctx.orgId },
      select: { name: true, websiteUrl: true, city: true, state: true }
    }),
    prisma.location.findFirst({
      where: { orgId: ctx.orgId, isPrimary: true },
      select: { name: true, address: true, city: true, state: true, websiteUrl: true, gbpUrl: true }
    }),
    prisma.trackedKeyword.count({ where: { orgId: ctx.orgId, isActive: true } }),
    prisma.trackedCompetitor.count({ where: { orgId: ctx.orgId, isActive: true } }),
    prisma.trackedKeyword.findMany({
      where: { orgId: ctx.orgId, isActive: true },
      orderBy: { createdAt: 'asc' },
      take: 15,
      select: { id: true, term: true }
    }),
    prisma.trackedCompetitor.findMany({
      where: { orgId: ctx.orgId, isActive: true },
      orderBy: { createdAt: 'asc' },
      take: 10,
      select: { id: true, name: true, websiteUrl: true }
    })
  ]);

  const ready = keywordCount >= 3 && competitorCount >= 1 && Boolean(location?.websiteUrl || org?.websiteUrl);
  const updated = searchParams?.updated || '';
  const hasError = searchParams?.error === '1';
  const checkoutSuccess = searchParams?.checkout === 'success';
  const trialStarted = searchParams?.trial === 'started';
  const calendly = process.env.CALENDLY_LINK || 'https://calendly.com/bigdotdigital/30min';

  return (
    <div className="dashboard-main-inner">
      <PageHeader
        title="Set Up Your Monitoring Workspace"
        subtitle="This route still writes through the same onboarding endpoints. The redesign just makes readiness and missing inputs easier to see."
        eyebrow="Onboarding"
        badges={[
          {
            label: `Prefill ${(location || org) ? 'cached' : 'unavailable'}`,
            tone: location || org ? 'cached' : 'unknown',
            title: 'Fields may be prefilled from existing org, location, or earlier scan-linked workspace data.'
          },
          {
            label: `Readiness ${ready ? 'live' : 'unavailable'}`,
            tone: ready ? 'live' : 'unknown',
            title: 'Readiness is based only on the current completion rule: website + 3 keywords + 1 competitor.'
          }
        ]}
      />

      <section className="mb-5 grid gap-3 lg:grid-cols-4">
        <DashboardKpiCard label="Keywords" value={`${keywordCount}/3`} detail="Minimum keyword count required for readiness." tone={keywordCount >= 3 ? 'accent' : 'warning'} />
        <DashboardKpiCard label="Competitors" value={`${competitorCount}/1`} detail="At least one competitor unlocks head-to-head analysis." tone={competitorCount >= 1 ? 'accent' : 'warning'} />
        <DashboardKpiCard label="Website" value={location?.websiteUrl || org?.websiteUrl ? 'Added' : 'Missing'} detail="Website URL is required for a complete setup." tone={location?.websiteUrl || org?.websiteUrl ? 'accent' : 'warning'} />
        <DashboardKpiCard label="Workspace" value={ready ? 'Ready' : 'In progress'} detail="Readiness is based on the existing completion rule." />
      </section>

      <section className="dashboard-panel mb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="dashboard-section-title">Setup status</h2>
            <p className="dashboard-body-sm mt-1">If you came from a scan, fields may already be prefilled from existing org or location data.</p>
          </div>
          <span className={`dashboard-status ${ready ? 'dashboard-status-live' : 'dashboard-status-warning'}`}>
            {ready ? 'Ready to monitor' : 'Needs input'}
          </span>
        </div>
        {updated ? (
          <p className={`mt-4 text-sm ${hasError ? 'text-red-700' : 'text-emerald-700'}`}>
            {hasError
              ? `Could not save ${updated}. Please check fields and try again.`
              : `${updated.charAt(0).toUpperCase() + updated.slice(1)} saved.`}
          </p>
        ) : null}
        {checkoutSuccess ? <p className="mt-2 text-sm text-emerald-700">Trial checkout complete. Finish onboarding below and your dashboard will start tracking.</p> : null}
        {trialStarted ? <p className="mt-2 text-sm text-emerald-700">Trial started. Complete onboarding below to start tracking.</p> : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="dashboard-panel">
          <h2 className="dashboard-section-title">1. Shop details</h2>
          <form action="/api/dashboard/onboarding?type=location" method="post" className="mt-4 space-y-3">
            <input name="name" defaultValue={location?.name || org?.name || ''} className="dashboard-field" placeholder="Shop name" />
            <input name="websiteUrl" defaultValue={location?.websiteUrl || org?.websiteUrl || ''} className="dashboard-field" placeholder="https://yourshop.com" />
            <input name="address" defaultValue={location?.address || ''} className="dashboard-field" placeholder="Street address" />
            <div className="grid grid-cols-2 gap-2">
              <input name="city" defaultValue={location?.city || org?.city || ''} className="dashboard-field" placeholder="City" />
              <input name="state" defaultValue={location?.state || org?.state || ''} className="dashboard-field" placeholder="State" />
            </div>
            <input name="gbpUrl" defaultValue={location?.gbpUrl || ''} className="dashboard-field" placeholder="Google Business Profile URL" />
            <button className="dashboard-button-primary" type="submit">Save details</button>
          </form>
        </article>

        <article className="dashboard-panel">
          <div>
            <h2 className="dashboard-section-title">2. Keywords</h2>
            <form action="/api/dashboard/onboarding?type=keyword" method="post" className="mt-3 flex gap-2">
              <input name="term" className="dashboard-field flex-1" placeholder="collision repair near me" required />
              <button className="dashboard-button" type="submit">Add</button>
            </form>
          </div>

          <div className="mt-5">
            <h2 className="dashboard-section-title">3. Competitor</h2>
            <form action="/api/dashboard/onboarding?type=competitor" method="post" className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
              <input name="name" className="dashboard-field" placeholder="Competitor name" required />
              <input name="websiteUrl" className="dashboard-field" placeholder="https://competitor.com" />
              <button className="dashboard-button" type="submit">Add</button>
            </form>
          </div>

          <div className="dashboard-subpanel mt-5 rounded-[22px] p-4">
            <p className="dashboard-label">Current setup</p>
            <p className="mt-2 text-sm text-[var(--dashboard-text)]">
              {keywords.length} keyword{keywords.length === 1 ? '' : 's'} • {competitors.length} competitor{competitors.length === 1 ? '' : 's'}
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <p className="dashboard-label">Keywords</p>
                {keywords.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {keywords.map((k) => (
                      <span key={k.id} className="dashboard-chip">{k.term}</span>
                    ))}
                  </div>
                ) : (
                  <p className="dashboard-body-sm mt-2">No keywords added yet.</p>
                )}
              </div>
              <div>
                <p className="dashboard-label">Competitors</p>
                {competitors.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    {competitors.map((c) => (
                      <p key={c.id} className="dashboard-body-sm">
                        {c.name}
                        {c.websiteUrl ? <span className="text-[var(--dashboard-text-faint)]"> • {c.websiteUrl}</span> : null}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="dashboard-body-sm mt-2">No competitors added yet.</p>
                )}
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="dashboard-panel mt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="dashboard-body">
            {ready
              ? 'Workspace requirements are met. You can move into the dashboard without adding more onboarding data.'
              : 'Complete website + 3 keywords + 1 competitor to finish onboarding.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <a href={calendly} target="_blank" rel="noreferrer" className="dashboard-button">
              Book setup call
            </a>
            <Link href={ready ? '/dashboard' : '/dashboard/settings'} className="dashboard-button-primary">
              {ready ? 'Go to dashboard' : 'Open full settings'}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
