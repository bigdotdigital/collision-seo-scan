import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireDashboardContext } from '@/lib/dashboard-auth';
import { PageHeader } from '@/components/page-header';
import { addTrackedCompetitor, addTrackedKeyword, saveLocationDetails } from './actions';

export const dynamic = 'force-dynamic';

function toggle(enabled: boolean) {
  return (
    <span
      className={`relative inline-flex h-6 w-10 items-center rounded-full border ${
        enabled ? 'border-[#ff4d5b] bg-[#ff4d5b]/30' : 'border-white/15 bg-black/30'
      }`}
    >
      <span className={`h-4 w-4 rounded-full bg-white transition ${enabled ? 'ml-5' : 'ml-1'}`} />
    </span>
  );
}

export default async function DashboardSettingsPage() {
  const ctx = await requireDashboardContext();

  const [org, location, keywordCount, competitorCount, prefs, members, keywords, competitors] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: ctx.orgId },
      select: { name: true, websiteUrl: true, city: true, state: true, phone: true }
    }),
    prisma.location.findFirst({
      where: { orgId: ctx.orgId, isPrimary: true },
      select: { name: true, city: true, state: true, websiteUrl: true, gbpUrl: true, address: true }
    }),
    prisma.trackedKeyword.count({
      where: { orgId: ctx.orgId, isActive: true }
    }),
    prisma.trackedCompetitor.count({
      where: { orgId: ctx.orgId, isActive: true }
    }),
    prisma.alertPreference.findUnique({
      where: { orgId: ctx.orgId }
    }),
    prisma.orgMembership.findMany({
      where: { orgId: ctx.orgId },
      take: 5,
      include: { user: { select: { email: true, name: true } } }
    }),
    prisma.trackedKeyword.findMany({
      where: { orgId: ctx.orgId, isActive: true },
      orderBy: { createdAt: 'asc' },
      take: 12,
      select: { id: true, term: true }
    }),
    prisma.trackedCompetitor.findMany({
      where: { orgId: ctx.orgId, isActive: true },
      orderBy: { createdAt: 'asc' },
      take: 8,
      select: { id: true, name: true, websiteUrl: true }
    })
  ]);

  return (
    <div>
      <PageHeader
        title="Account Settings"
        subtitle="System preferences"
        actions={
          <Link href="/dashboard/onboarding" className="rounded-xl bg-[#ff4d5b] px-4 py-2 text-sm font-semibold text-white">
            Open onboarding
          </Link>
        }
      />

      <div className="mb-4 flex gap-6 border-b border-white/10 pb-3 text-sm">
        {['Location Info', 'Tracking', 'Team', 'Notifications', 'Billing'].map((tab, i) => (
          <span key={tab} className={i === 0 ? 'border-b-2 border-[#ff4d5b] pb-2 text-white' : 'text-white/55'}>
            {tab}
          </span>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <article className="card p-6">
            <h2 className="text-[30px] font-semibold text-white">Location Details</h2>
            <p className="mt-1 text-sm text-white/60">Configure the primary business entity being monitored.</p>

            <form action={saveLocationDetails} className="mt-4 space-y-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-white/45">Business name</p>
                <input
                  name="name"
                  defaultValue={location?.name || org?.name || ''}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white"
                  placeholder="Your shop name"
                />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-white/45">Street address</p>
                <input
                  name="address"
                  defaultValue={location?.address || ''}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white"
                  placeholder="Street address"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-white/45">City</p>
                  <input
                    name="city"
                    defaultValue={location?.city || org?.city || ''}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white"
                    placeholder="City"
                  />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-white/45">State</p>
                  <input
                    name="state"
                    defaultValue={location?.state || org?.state || ''}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white"
                    placeholder="State"
                  />
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-white/45">Website URL</p>
                <input
                  name="websiteUrl"
                  defaultValue={location?.websiteUrl || org?.websiteUrl || ''}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white"
                  placeholder="https://yourshop.com"
                />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-white/45">Google business profile URL</p>
                <input
                  name="gbpUrl"
                  defaultValue={location?.gbpUrl || ''}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white"
                  placeholder="https://business.google.com/..."
                />
              </div>
              <button className="dashboard-button mt-2" type="submit">
                Save location
              </button>
            </form>
          </article>

          <article className="card p-6">
            <h2 className="text-[30px] font-semibold text-white">Keywords & Search Terms</h2>
            <p className="mt-1 text-sm text-white/60">Manage search phrases tracked across Google Maps and Search.</p>
            <form action={addTrackedKeyword} className="mt-3 flex gap-2">
              <input
                name="term"
                className="flex-1 rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white"
                placeholder="Add keyword (e.g. collision repair near me)"
                required
              />
              <button className="dashboard-button" type="submit">
                Add
              </button>
            </form>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-sm text-white/75">{keywordCount} tracked keywords</span>
              <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-sm text-white/75">{competitorCount} tracked competitors</span>
              {location?.city ? (
                <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-sm text-white/75">{location.city}, {location.state}</span>
              ) : null}
            </div>
            {keywords.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {keywords.map((k) => (
                  <span key={k.id} className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-sm text-white/85">
                    {k.term}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-white/55">No keywords yet. Add your top money terms first.</p>
            )}
          </article>

          <article className="card p-6">
            <h2 className="text-[30px] font-semibold text-white">Competitor Tracking</h2>
            <p className="mt-1 text-sm text-white/60">Track nearby independent shops you want to outrank.</p>
            <form action={addTrackedCompetitor} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input
                name="name"
                className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white"
                placeholder="Competitor name"
                required
              />
              <input
                name="websiteUrl"
                className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white"
                placeholder="https://competitor.com (optional)"
              />
              <button className="dashboard-button" type="submit">
                Add
              </button>
            </form>
            {competitors.length > 0 ? (
              <div className="mt-3 space-y-2">
                {competitors.map((c) => (
                  <div key={c.id} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                    <p className="text-white">{c.name}</p>
                    <p className="text-xs text-white/55">{c.websiteUrl || 'No URL saved'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-white/55">No competitors added yet.</p>
            )}
          </article>
        </div>

        <div className="space-y-4">
          <article className="card p-6">
            <h2 className="text-[30px] font-semibold text-white">Alerts</h2>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-white/75">Rank drops {'>'} {prefs?.rankDropThreshold ?? 3} spots</span>
                {toggle(true)}
              </div>
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-white/75">New review alert</span>
                {toggle((prefs?.digestFrequency || 'daily') !== 'off')}
              </div>
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-white/75">Competitor movement</span>
                {toggle(Boolean(prefs?.competitorMoveEnabled))}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/75">Weekly summary email</span>
                {toggle((prefs?.digestFrequency || 'daily') !== 'off')}
              </div>
            </div>
          </article>

          <article className="card p-6">
            <h2 className="text-[30px] font-semibold text-white">Team Members</h2>
            <div className="mt-4 space-y-3">
              {members.length === 0 ? (
                <p className="text-sm text-white/60">No team members yet.</p>
              ) : (
                members.map((m) => (
                  <div key={m.id} className="flex items-start gap-3 border-b border-white/10 pb-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#ff4d5b]/25 text-xs text-[#ff8a93]">
                      {(m.user.name || m.user.email || 'U').slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-white">{m.user.name || 'Team Member'}</p>
                      <p className="text-xs text-white/60">{m.user.email}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <a
              href="mailto:bigdotdigital@gmail.com?subject=Dashboard%20team%20invite%20request"
              className="mt-3 block w-full rounded-xl border border-white/15 bg-black/20 px-4 py-2 text-center text-sm text-white"
            >
              + Invite User
            </a>
          </article>
        </div>
      </div>
    </div>
  );
}
