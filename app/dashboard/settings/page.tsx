import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireDashboardContext } from '@/lib/dashboard-auth';
import { PageHeader } from '@/components/page-header';
import { DashboardKpiCard } from '@/components/dashboard-kpi-card';
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
    <div className="dashboard-main-inner">
      <PageHeader
        title="Account Settings"
        subtitle="The route keeps the same settings actions and payloads. This update only reorganizes them into a clearer operator workspace."
        eyebrow="Settings"
        actions={
          <Link href="/dashboard/onboarding" className="dashboard-button">
            Open onboarding
          </Link>
        }
      />

      <section className="mb-5 grid gap-3 lg:grid-cols-4">
        <DashboardKpiCard label="Location" value={location?.city ? `${location.city}, ${location.state}` : 'Missing'} detail="Primary business location used across the dashboard." />
        <DashboardKpiCard label="Tracked keywords" value={keywordCount} detail="Active keyword records." />
        <DashboardKpiCard label="Tracked competitors" value={competitorCount} detail="Active competitor records." />
        <DashboardKpiCard label="Team members" value={members.length} detail="Visible org memberships for this workspace." />
      </section>

      <div className="mb-4 flex flex-wrap gap-2">
        {['Location', 'Tracking', 'Team', 'Notifications', 'Billing'].map((tab, i) => (
          <span key={tab} className={`dashboard-chip ${i === 0 ? 'dashboard-status-live' : ''}`}>
            {tab}
          </span>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <article className="dashboard-panel">
            <h2 className="dashboard-section-title">Account login</h2>
            <p className="dashboard-body-sm mt-1">Update your display name and password for this dashboard account.</p>
            <form action={saveAccountCredentials} className="mt-4 space-y-3">
              <div>
                <p className="dashboard-label">Email</p>
                <input value={user?.email || 'Legacy client account'} readOnly className="dashboard-field mt-1 opacity-70" />
              </div>
              <div>
                <p className="dashboard-label">Display name</p>
                <input name="name" defaultValue={user?.name || ''} className="dashboard-field mt-1" placeholder="Your name" />
              </div>
              <div>
                <p className="dashboard-label">Current password</p>
                <input name="currentPassword" type="password" className="dashboard-field mt-1" placeholder="Required" required />
              </div>
              <div>
                <p className="dashboard-label">New password (optional)</p>
                <input name="newPassword" type="password" minLength={8} className="dashboard-field mt-1" placeholder="Leave blank to keep current password" />
              </div>
              <button className="dashboard-button-primary mt-2" type="submit">Save account</button>
              {accountState === 'ok' ? <p className="text-sm text-emerald-200">Account updated.</p> : null}
              {accountError ? <p className="text-sm text-red-200">{accountError}</p> : null}
            </form>
          </article>

          <article className="dashboard-panel">
            <h2 className="dashboard-section-title">Location details</h2>
            <p className="dashboard-body-sm mt-1">Configure the primary business entity being monitored.</p>
            <form action={saveLocationDetails} className="mt-4 space-y-3">
              <div>
                <p className="dashboard-label">Business name</p>
                <input name="name" defaultValue={location?.name || org?.name || ''} className="dashboard-field mt-1" placeholder="Your shop name" />
              </div>
              <div>
                <p className="dashboard-label">Street address</p>
                <input name="address" defaultValue={location?.address || ''} className="dashboard-field mt-1" placeholder="Street address" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="dashboard-label">City</p>
                  <input name="city" defaultValue={location?.city || org?.city || ''} className="dashboard-field mt-1" placeholder="City" />
                </div>
                <div>
                  <p className="dashboard-label">State</p>
                  <input name="state" defaultValue={location?.state || org?.state || ''} className="dashboard-field mt-1" placeholder="State" />
                </div>
              </div>
              <div>
                <p className="dashboard-label">Website URL</p>
                <input name="websiteUrl" defaultValue={location?.websiteUrl || org?.websiteUrl || ''} className="dashboard-field mt-1" placeholder="https://yourshop.com" />
              </div>
              <div>
                <p className="dashboard-label">Google business profile URL</p>
                <input name="gbpUrl" defaultValue={location?.gbpUrl || ''} className="dashboard-field mt-1" placeholder="https://business.google.com/..." />
              </div>
              <button className="dashboard-button-primary mt-2" type="submit">Save location</button>
            </form>
          </article>

          <article className="dashboard-panel">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="dashboard-section-title">Keywords & search terms</h2>
                <p className="dashboard-body-sm mt-1">Manage search phrases tracked across Google Maps and Search.</p>
              </div>
              <span className="dashboard-chip">{keywordCount} tracked</span>
            </div>
            <form action={addTrackedKeyword} className="mt-3 flex gap-2">
              <input name="term" className="dashboard-field flex-1" placeholder="Add keyword (e.g. collision repair near me)" required />
              <button className="dashboard-button" type="submit">Add</button>
            </form>
            {keywords.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {keywords.map((k) => (
                  <span key={k.id} className="dashboard-chip">{k.term}</span>
                ))}
              </div>
            ) : (
              <p className="dashboard-body-sm mt-3">No keywords yet. Add your top money terms first.</p>
            )}
          </article>

          <article className="dashboard-panel">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="dashboard-section-title">Competitor tracking</h2>
                <p className="dashboard-body-sm mt-1">Track nearby independent shops you want to outrank.</p>
              </div>
              <span className="dashboard-chip">{competitorCount} tracked</span>
            </div>
            <form action={addTrackedCompetitor} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input name="name" className="dashboard-field" placeholder="Competitor name" required />
              <input name="websiteUrl" className="dashboard-field" placeholder="https://competitor.com (optional)" />
              <button className="dashboard-button" type="submit">Add</button>
            </form>
            {competitors.length > 0 ? (
              <div className="mt-4 space-y-2">
                {competitors.map((c) => (
                  <div key={c.id} className="dashboard-subpanel rounded-[18px] px-3 py-3">
                    <p className="text-[var(--dashboard-text)]">{c.name}</p>
                    <p className="dashboard-caption mt-1">{c.websiteUrl || 'No URL saved'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="dashboard-body-sm mt-3">No competitors added yet.</p>
            )}
          </article>
        </div>

        <div className="space-y-4">
          <article className="dashboard-panel">
            <h2 className="dashboard-section-title">Alerts</h2>
            <div className="mt-4 space-y-3">
              <div className="dashboard-subpanel rounded-[20px] p-4">
                <p className="text-[var(--dashboard-text)]">Rank drops greater than {prefs?.rankDropThreshold ?? 3} spots</p>
                <p className="dashboard-caption mt-1">Configured in Alerts page</p>
              </div>
              <div className="dashboard-subpanel rounded-[20px] p-4">
                <p className="text-[var(--dashboard-text)]">Digest frequency: {prefs?.digestFrequency || 'daily'}</p>
                <p className="dashboard-caption mt-1">Configured in Alerts page</p>
              </div>
              <div className="dashboard-subpanel rounded-[20px] p-4">
                <p className="text-[var(--dashboard-text)]">Competitor movement alerts: {prefs?.competitorMoveEnabled ? 'On' : 'Off'}</p>
                <p className="dashboard-caption mt-1">Configured in Alerts page</p>
              </div>
              <Link href="/dashboard/alerts" className="dashboard-button">
                Open alert settings
              </Link>
            </div>
          </article>

          <article className="dashboard-panel">
            <h2 className="dashboard-section-title">Team members</h2>
            <div className="mt-4 space-y-3">
              {members.length === 0 ? (
                <p className="dashboard-body-sm">No team members yet.</p>
              ) : (
                members.map((m) => (
                  <div key={m.id} className="flex items-start gap-3 border-b border-[var(--dashboard-border)] pb-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(255,123,127,0.24)] text-xs text-[#ffd4cc]">
                      {(m.user.name || m.user.email || 'U').slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-[var(--dashboard-text)]">{m.user.name || 'Team Member'}</p>
                      <p className="dashboard-caption mt-1">{m.user.email}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <a
              href="mailto:bigdotdigital@gmail.com?subject=Dashboard%20team%20invite%20request"
              className="dashboard-button mt-4 w-full"
            >
              Invite user
            </a>
          </article>
        </div>
      </div>
    </div>
  );
}
