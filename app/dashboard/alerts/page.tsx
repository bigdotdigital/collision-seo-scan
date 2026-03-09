import { prisma } from '@/lib/prisma';
import { requireDashboardContext } from '@/lib/dashboard-auth';
import { PageHeader } from '@/components/page-header';
import { saveAlertPreferences } from './actions';

export const dynamic = 'force-dynamic';

const typeLabel = {
  rank_drop: 'Significant Rank Drop Detected',
  rank_gain: 'Rank Increase Detected',
  competitor_moved_above: 'Competitor Moved Ahead',
  new_competitor: 'New Local Competitor Spotted',
  gbp_issue: 'GBP Health Issue'
} as const;

const severityTone = {
  critical: 'border-red-400 text-red-300',
  warning: 'border-amber-400 text-amber-300',
  info: 'border-blue-400 text-blue-300'
} as const;

function channelToggle(enabled: boolean) {
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

  return (
    <div>
      <PageHeader
        title="Alerts Feed"
        subtitle=""
        eyebrow="Notifications & Activity"
        actions={<p className="text-sm text-white/60">{alerts.filter((a) => !a.isRead).length} unread alerts</p>}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <article className="card rounded-xl border border-dashed p-4 text-sm text-white/65">
              No alerts yet. Alerts appear after monitoring jobs complete.
            </article>
          ) : (
            alerts.map((alert) => (
              <article key={alert.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-4">
                    <span
                      className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border text-lg ${
                        severityTone[alert.severity]
                      }`}
                    >
                      •
                    </span>
                    <div>
                      <p className="text-3xl font-semibold leading-tight text-white">{typeLabel[alert.type]}</p>
                      <p className="mt-1 text-base text-white/65">
                        Generated from ranking and local monitoring signals.
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-white/40">{new Date(alert.createdAt).toLocaleString()}</p>
                </div>
              </article>
            ))
          )}
        </div>

        <aside className="card p-5">
          <h3 className="text-xs uppercase tracking-[0.16em] text-white/45">Alert settings</h3>
          <form action={saveAlertPreferences} className="mt-4 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <p className="text-[24px] font-medium text-white">Rank Volatility</p>
                <p className="text-sm text-white/55">Notify on +/- {prefs?.rankDropThreshold ?? 3} position changes</p>
                <input
                  type="number"
                  name="rankDropThreshold"
                  min={1}
                  max={20}
                  defaultValue={prefs?.rankDropThreshold ?? 3}
                  className="mt-2 w-24 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs text-white"
                />
              </div>
              {channelToggle(true)}
            </div>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <p className="text-[24px] font-medium text-white">Competitor Entry</p>
                <p className="text-sm text-white/55">New domains in top 20 results</p>
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
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[24px] font-medium text-white">GBP Attribute Drift</p>
                <p className="text-sm text-white/55">Profile health and attribute issues</p>
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

            <h3 className="mt-7 text-xs uppercase tracking-[0.16em] text-white/45">Notification channels</h3>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <p className="text-[24px] font-medium text-white">Email Digest</p>
                  <p className="text-sm text-white/55">{prefs?.digestFrequency || 'daily'} summary</p>
                  <select
                    name="digestFrequency"
                    defaultValue={prefs?.digestFrequency || 'daily'}
                    className="mt-2 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs text-white"
                  >
                    <option value="off">off</option>
                    <option value="daily">daily</option>
                    <option value="weekly">weekly</option>
                  </select>
                </div>
                {channelToggle((prefs?.digestFrequency || 'daily') !== 'off')}
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[24px] font-medium text-white">SMS Alerts</p>
                  <p className="text-sm text-white/55">Critical only (coming soon)</p>
                </div>
                {channelToggle(false)}
              </div>
            </div>
            <button className="mt-4 w-full rounded-xl bg-[#ff4d5b] px-4 py-2 text-sm font-semibold text-white" type="submit">
              Save alert settings
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
