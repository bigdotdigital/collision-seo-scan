import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireDashboardContext } from '@/lib/dashboard-auth';

export const dynamic = 'force-dynamic';

export default async function DashboardOnboardingPage({
  searchParams
}: {
  searchParams?: { updated?: string; error?: string; checkout?: string };
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
  const calendly = process.env.CALENDLY_LINK || 'https://calendly.com/bigdotdigital/30min';

  return (
    <div className="space-y-4">
      <section className="card p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-white/50">Onboarding</p>
        <h1 className="mt-2 text-4xl font-semibold text-white">Set up your monitoring workspace</h1>
        <p className="mt-2 text-sm text-white/70">
          If you came from a scan, fields are prefilled. If not, add your core shop details below.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-white/85">
            Keywords: {keywordCount}/3
          </span>
          <span className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-white/85">
            Competitors: {competitorCount}/1
          </span>
          <span className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-white/85">
            Website: {location?.websiteUrl || org?.websiteUrl ? 'Added' : 'Missing'}
          </span>
        </div>
        {updated ? (
          <p className={`mt-3 text-sm ${hasError ? 'text-red-300' : 'text-emerald-300'}`}>
            {hasError
              ? `Could not save ${updated}. Please check fields and try again.`
              : `${updated.charAt(0).toUpperCase() + updated.slice(1)} saved.`}
          </p>
        ) : null}
        {checkoutSuccess ? (
          <p className="mt-2 text-sm text-emerald-300">
            Trial checkout complete. Finish onboarding below and your dashboard will start tracking.
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="card p-6">
          <h2 className="text-2xl font-semibold text-white">1) Shop details</h2>
          <form action="/api/dashboard/onboarding?type=location" method="post" className="mt-4 space-y-3">
            <input
              name="name"
              defaultValue={location?.name || org?.name || ''}
              className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white"
              placeholder="Shop name"
            />
            <input
              name="websiteUrl"
              defaultValue={location?.websiteUrl || org?.websiteUrl || ''}
              className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white"
              placeholder="https://yourshop.com"
            />
            <input
              name="address"
              defaultValue={location?.address || ''}
              className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white"
              placeholder="Street address"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                name="city"
                defaultValue={location?.city || org?.city || ''}
                className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white"
                placeholder="City"
              />
              <input
                name="state"
                defaultValue={location?.state || org?.state || ''}
                className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white"
                placeholder="State"
              />
            </div>
            <input
              name="gbpUrl"
              defaultValue={location?.gbpUrl || ''}
              className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white"
              placeholder="Google Business Profile URL"
            />
            <button className="dashboard-button" type="submit">
              Save details
            </button>
          </form>
        </article>

        <article className="card p-6 space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-white">2) Keywords</h2>
            <form action="/api/dashboard/onboarding?type=keyword" method="post" className="mt-3 flex gap-2">
              <input
                name="term"
                className="flex-1 rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white"
                placeholder="collision repair near me"
                required
              />
              <button className="dashboard-button" type="submit">
                Add
              </button>
            </form>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-white">3) Competitor</h2>
            <form action="/api/dashboard/onboarding?type=competitor" method="post" className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
              <input
                name="name"
                className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white"
                placeholder="Competitor name"
                required
              />
              <input
                name="websiteUrl"
                className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white"
                placeholder="https://competitor.com"
              />
              <button className="dashboard-button" type="submit">
                Add
              </button>
            </form>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-white/55">Current setup</p>
            <p className="mt-1 text-sm text-white/85">
              {keywords.length} keyword{keywords.length === 1 ? '' : 's'} • {competitors.length} competitor{competitors.length === 1 ? '' : 's'}
            </p>
            <div className="mt-3 space-y-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">Keywords</p>
                {keywords.length > 0 ? (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {keywords.map((k) => (
                      <span key={k.id} className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-xs text-white/85">
                        {k.term}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-white/55">No keywords added yet.</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">Competitors</p>
                {competitors.length > 0 ? (
                  <div className="mt-1 space-y-1">
                    {competitors.map((c) => (
                      <p key={c.id} className="text-xs text-white/80">
                        {c.name}
                        {c.websiteUrl ? <span className="text-white/50"> • {c.websiteUrl}</span> : null}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-white/55">No competitors added yet.</p>
                )}
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-white/80">
            {ready
              ? 'Great, your workspace is ready.'
              : 'Complete website + 3 keywords + 1 competitor to finish onboarding.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={calendly}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-white/20 bg-black/20 px-4 py-2 text-sm font-semibold text-white"
            >
              Book setup call
            </a>
            <Link
              href={ready ? '/dashboard' : '/dashboard/settings'}
              className="rounded-xl bg-[#ff4d5b] px-4 py-2 text-sm font-semibold text-white"
            >
              {ready ? 'Go to dashboard' : 'Open full settings'}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
