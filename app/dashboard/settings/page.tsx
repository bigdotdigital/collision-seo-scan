import { prisma } from '@/lib/prisma';
import { requireDashboardContext } from '@/lib/dashboard-auth';
import { PageHeader } from '@/components/page-header';
import { SettingsPanel } from '@/components/settings-panel';

export const dynamic = 'force-dynamic';

export default async function DashboardSettingsPage() {
  const ctx = await requireDashboardContext();

  const [org, location, keywordCount, competitorCount, prefs] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: ctx.orgId },
      select: { name: true, websiteUrl: true, city: true, state: true }
    }),
    prisma.location.findFirst({
      where: { orgId: ctx.orgId, isPrimary: true },
      select: { name: true, city: true, state: true, websiteUrl: true, gbpUrl: true }
    }),
    prisma.trackedKeyword.count({
      where: { orgId: ctx.orgId, isActive: true }
    }),
    prisma.trackedCompetitor.count({
      where: { orgId: ctx.orgId, isActive: true }
    }),
    prisma.alertPreference.findUnique({
      where: { orgId: ctx.orgId }
    })
  ]);

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Configuration scaffolding for location, tracking scope, and notifications."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <SettingsPanel
          title="Location"
          rows={[
            { label: 'Organization', value: org?.name || 'Not set' },
            { label: 'Primary location', value: location?.name || 'Not set' },
            { label: 'City / State', value: `${location?.city || org?.city || 'N/A'} / ${location?.state || org?.state || 'N/A'}` },
            { label: 'Website', value: location?.websiteUrl || org?.websiteUrl || 'Not set' },
            { label: 'GBP URL', value: location?.gbpUrl || 'Not set' }
          ]}
        />

        <SettingsPanel
          title="Tracking"
          rows={[
            { label: 'Active keywords', value: String(keywordCount) },
            { label: 'Tracked competitors', value: String(competitorCount) },
            { label: 'Drop threshold', value: String(prefs?.rankDropThreshold ?? 3) },
            { label: 'Gain threshold', value: String(prefs?.rankGainThreshold ?? 3) },
            { label: 'Digest frequency', value: prefs?.digestFrequency || 'daily' }
          ]}
          hint="Editing controls will be added after data wiring and role gates are complete."
        />
      </div>
    </div>
  );
}

