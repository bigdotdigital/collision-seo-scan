import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireDashboardContext } from '@/lib/dashboard-auth';
import { PageHeader } from '@/components/page-header';
import { addTrackedCompetitor, addTrackedKeyword, saveAccountCredentials, saveLocationDetails } from './actions';

export const dynamic = 'force-dynamic';

export default async function DashboardSettingsPage({
  searchParams
}: {
  searchParams?: { account?: string; reason?: string };
}) {
  const ctx = await requireDashboardContext();

  const [org, location, keywordCount, competitorCount, prefs, members, keywords, competitors, user] = await Promise.all([
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
    }),
    ctx.userId.startsWith('legacy-client-')
      ? Promise.resolve(null)
      : prisma.user.findUnique({
          where: { id: ctx.userId },
          select: { name: true, email: true }
        })
  ]);

  const accountState = searchParams?.account || '';
  const accountReason = searchParams?.reason || '';
  const accountError =
    accountState === 'error'
      ? accountReason === 'current'
        ? 'Current password is incorrect.'
        : accountReason === 'length'
        ? 'New password must be at least 8 characters.'
        : accountReason === 'legacy'
        ? 'Please re-login through the monitoring flow to enable account updates.'
        : 'Could not update account details.'
      : null;

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
            <h2 className="text-[30px] font-semibold text-white">Account Login</h2>
            <p className="mt-1 text-sm text-white/60">
              Update your display name and password for this dashboard account.
            </p>
            <form action={saveAccountCredentials} className="mt-4 space-y-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-white/45">Email</p>
                <input
                  value={user?.email || 'Legacy client account'}
                  readOnly
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-white/65"
                />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-white/45">Display name</p>
                <input
                  name="name"
                  defaultValue={user?.name || ''}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white"
                  placeholder="Your name"
                />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-white/45">Current password</p>
                <input
                  name="currentPassword"
                  type="password"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white"
                  placeholder="Required"
                  required
                />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-white/45">
                  New password (optional)
                </p>
                <input
                  name="newPassword"
                  type="password"
                  minLength={8}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white"
                  placeholder="Leave blank to keep current password"
                />
              </div>
              <button className="dashboard-button mt-2" type="submit">
                Save account
              </button>
              {accountState === 'ok' ? (
                <p className="text-sm text-emerald-300">Account updated.</p>
              ) : null}
              {accountError ? <p className="text-sm text-red-300">{accountError}</p> : null}
            </form>
          </article>

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
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-white/85">Rank drops {'>'} {prefs?.rankDropThreshold ?? 3} spots</p>
                <p className="mt-1 text-xs text-white/55">Configured in Alerts page</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-white/85">Digest frequency: {prefs?.digestFrequency || 'daily'}</p>
                <p className="mt-1 text-xs text-white/55">Configured in Alerts page</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-white/85">
                  Competitor movement alerts: {prefs?.competitorMoveEnabled ? 'On' : 'Off'}
                </p>
                <p className="mt-1 text-xs text-white/55">Configured in Alerts page</p>
              </div>
              <Link
                href="/dashboard/alerts"
                className="inline-flex rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-sm text-white"
              >
                Open alert settings
              </Link>
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
