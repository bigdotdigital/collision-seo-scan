import { prisma } from '@/lib/prisma';
import { requireDashboardContext } from '@/lib/dashboard-auth';
import { PageHeader } from '@/components/page-header';
import { CompetitorComparisonCard } from '@/components/competitor-comparison-card';

export const dynamic = 'force-dynamic';

export default async function DashboardCompetitorsPage() {
  const ctx = await requireDashboardContext();

  const competitors = await prisma.trackedCompetitor.findMany({
    where: { orgId: ctx.orgId, isActive: true },
    orderBy: { createdAt: 'asc' },
    take: 20
  });

  return (
    <div>
      <PageHeader
        title="Competitors"
        subtitle="Track which local competitors are entering, rising, or falling."
        eyebrow="Competitive Watch"
        actions={
          <button className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">
            Add Competitor
          </button>
        }
      />
      <div className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
        Competitor rank-over-rank movement will populate after the snapshot collector runs.
      </div>
      <CompetitorComparisonCard
        rows={competitors.map((row) => ({
          id: row.id,
          name: row.name,
          trackedKeywords: Math.max(1, competitors.length),
          note: row.websiteUrl || 'No website URL captured yet'
        }))}
      />
    </div>
  );
}
