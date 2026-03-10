import { prisma } from '@/lib/prisma';
import { requireDashboardContext } from '@/lib/dashboard-auth';
import { PageHeader } from '@/components/page-header';
import { DashboardKpiCard } from '@/components/dashboard-kpi-card';
import { AlertCard } from '@/components/alert-card';
import { saveAlertPreferences } from './actions';

export const dynamic = 'force-dynamic';

function channelToggle(enabled: boolean) {
  return (
    <span
      className={`relative inline-flex h-6 w-11 items-center rounded-full border ${
        enabled
          ? 'border-[rgba(255,123,127,0.45)] bg-[rgba(255,123,127,0.24)]'
          : 'border-[var(--dashboard-border)] bg-[rgba(255,255,255,0.06)]'
      }`}
    >
      <span className={`h-4 w-4 rounded-full bg-white transition ${enabled ? 'ml-6' : 'ml-1'}`} />
    </span>
  );
}

export default async function DashboardAlertsPage() {
  const ctx = await requireDashboardContext();

  const [alerts, prefs] = await Promise.all([
    prisma.alert.findMany({
      where: { orgId: ctx.orgId },
      orderBy: { createdAt: 'desc' },
      take: 30
    }),
    prisma.alertPreference.findUnique({
      where: { orgId: ctx.orgId }
    })
  ]);

  const unread = alerts.filter((a) => !a.isRead).length;
  const critical = alerts.filter((a) => a.severity === 'critical').length;
  const warnings = alerts.filter((a) => a.severity === 'warning').length;

  return (
    <div className="dashboard-main-inner">
      <PageHeader
        title="Alerts Feed"
        subtitle="Stored alert records and saved preferences only. Controls below do not imply extra channels beyond what already exists."
        eyebrow="Notifications & Activity"
        actions={<p className="dashboard-chip">{unread} unread alerts</p>}
      />

      <section className="mb-5 grid gap-3 lg:grid-cols-4">
        <DashboardKpiCard label="Unread" value={unread} detail="Alerts not yet marked read in the current org." tone={unread > 0 ? 'accent' : 'default'} />
        <DashboardKpiCard label="Critical" value={critical} detail="High-severity events that may need immediate review." tone={critical > 0 ? 'warning' : 'default'} />
        <DashboardKpiCard label="Warnings" value={warnings} detail="Non-critical shifts in rankings, competitors, or GBP state." />
        <DashboardKpiCard
          label="Digest cadence"
          value={prefs?.digestFrequency || 'daily'}
          detail="Saved digest preference from alert settings."
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="dashboard-panel">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="dashboard-section-title">Alert timeline</h2>
              <p className="dashboard-body-sm mt-1">This feed reflects persisted alert rows. Missing alerts mean no event was stored, not that nothing happened.</p>
            </div>
            <span className="dashboard-chip">Latest 30</span>
          </div>

          <div className="mt-4 space-y-3">
            {alerts.length === 0 ? (
              <div className="dashboard-empty-state">
                <p className="dashboard-empty-title">No alerts yet</p>
                <p className="dashboard-body-sm mt-1">Alerts appear after monitoring jobs complete and save an alert record.</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  type={alert.type}
                  severity={alert.severity}
                  title="Monitoring event"
                  subtitle="Generated from ranking, competitor, or GBP monitoring signals."
                  when={new Date(alert.createdAt).toLocaleString()}
                />
              ))
            )}
          </div>
        </section>

        <aside className="dashboard-panel">
          <div>
            <h2 className="dashboard-section-title">Alert settings</h2>
            <p className="dashboard-body-sm mt-1">These controls persist the existing alert preference model only.</p>
          </div>

          <form action={saveAlertPreferences} className="mt-4 space-y-4">
            <div className="dashboard-subpanel flex items-center justify-between rounded-[22px] p-4">
              <div>
                <p className="dashboard-section-title">Rank volatility</p>
                <p className="dashboard-body-sm mt-1">Notify on +/- {prefs?.rankDropThreshold ?? 3} position changes.</p>
                <input
                  type="number"
                  name="rankDropThreshold"
                  min={1}
                  max={20}
                  defaultValue={prefs?.rankDropThreshold ?? 3}
                  className="dashboard-field mt-3 max-w-[110px]"
                />
              </div>
              {channelToggle(true)}
            </div>

            <div className="dashboard-subpanel flex items-center justify-between rounded-[22px] p-4">
              <div>
                <p className="dashboard-section-title">Competitor entry</p>
                <p className="dashboard-body-sm mt-1">New domains in top 20 results.</p>
              </div>
              <label className="cursor-pointer">
                <input
                  type="checkbox"
                  name="newCompetitorEnabled"
                  defaultChecked={Boolean(prefs?.newCompetitorEnabled)}
                  className="sr-only"
                />
                {channelToggle(Boolean(prefs?.newCompetitorEnabled))}
              </label>
            </div>

            <div className="dashboard-subpanel flex items-center justify-between rounded-[22px] p-4">
              <div>
                <p className="dashboard-section-title">GBP attribute drift</p>
                <p className="dashboard-body-sm mt-1">Profile health and attribute issues.</p>
              </div>
              <label className="cursor-pointer">
                <input
                  type="checkbox"
                  name="gbpIssueEnabled"
                  defaultChecked={Boolean(prefs?.gbpIssueEnabled)}
                  className="sr-only"
                />
                {channelToggle(Boolean(prefs?.gbpIssueEnabled))}
              </label>
            </div>

            <input
              type="checkbox"
              name="competitorMoveEnabled"
              defaultChecked={Boolean(prefs?.competitorMoveEnabled)}
              className="hidden"
              readOnly
            />

            <div className="dashboard-subpanel rounded-[22px] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="dashboard-section-title">Email digest</p>
                  <p className="dashboard-body-sm mt-1">Existing persisted cadence only. SMS remains unchanged and not implemented.</p>
                </div>
                {channelToggle((prefs?.digestFrequency || 'daily') !== 'off')}
              </div>
              <select
                name="digestFrequency"
                defaultValue={prefs?.digestFrequency || 'daily'}
                className="dashboard-select mt-3"
              >
                <option value="off">off</option>
                <option value="daily">daily</option>
                <option value="weekly">weekly</option>
              </select>
              <div className="mt-3 flex items-center justify-between rounded-[18px] border border-[var(--dashboard-border)] px-3 py-3">
                <div>
                  <p className="dashboard-section-title">SMS alerts</p>
                  <p className="dashboard-body-sm mt-1">Coming soon. No delivery backend is wired today.</p>
                </div>
                {channelToggle(false)}
              </div>
            </div>

            <button className="dashboard-button-primary w-full" type="submit">
              Save alert settings
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
