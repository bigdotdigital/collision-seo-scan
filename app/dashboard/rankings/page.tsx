import { prisma } from '@/lib/prisma';
import { requireDashboardContext } from '@/lib/dashboard-auth';
import { PageHeader } from '@/components/page-header';
import { KeywordTable } from '@/components/keyword-table';

export const dynamic = 'force-dynamic';

export default async function DashboardRankingsPage() {
  const ctx = await requireDashboardContext();

  const keywords = await prisma.trackedKeyword.findMany({
    where: { orgId: ctx.orgId, isActive: true },
    include: {
      snapshots: {
        orderBy: { snapshotDate: 'desc' },
        take: 2
      }
    },
    orderBy: { createdAt: 'asc' },
    take: 50
  });

  const rows = keywords.map((kw) => {
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

  return (
    <div>
      <PageHeader
        title="Rankings"
        subtitle="Keyword-by-keyword movement with weekly snapshot deltas."
        eyebrow="Rank Tracking"
        actions={
          <button className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">
            Add Keyword
          </button>
        }
      />
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <article className="card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total terms</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{rows.length}</p>
        </article>
        <article className="card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Positive movers</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{rows.filter((r) => (r.delta || 0) > 0).length}</p>
        </article>
        <article className="card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Negative movers</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{rows.filter((r) => (r.delta || 0) < 0).length}</p>
        </article>
      </div>
      <KeywordTable rows={rows} />
    </div>
  );
}
