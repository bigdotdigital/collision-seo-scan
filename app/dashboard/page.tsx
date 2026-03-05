import { prisma } from '@/lib/prisma';
import { requireDashboardClient } from '@/lib/dashboard-auth';
import { parseJson } from '@/lib/json';
import { formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function DashboardOverviewPage() {
  const client = await requireDashboardClient();

  const fullClient = await prisma.client.findUnique({
    where: { id: client.id },
    include: {
      scans: { orderBy: { createdAt: 'asc' } },
      metricSnapshots: { orderBy: { createdAt: 'desc' }, take: 2 },
      keywords: true
    }
  });

  if (!fullClient) return null;

  const baseline = fullClient.scans[0]?.scoreTotal ?? 0;
  const latestScore = fullClient.metricSnapshots[0]?.scoreTotal ?? fullClient.scans[0]?.scoreTotal ?? 0;
  const delta = latestScore - baseline;

  const latestSummary = parseJson<{ up?: number; down?: number; note?: string }>(
    fullClient.metricSnapshots[0]?.summaryJson,
    {}
  );

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="card p-5">
        <p className="text-xs uppercase tracking-wide text-slate-500">Latest snapshot</p>
        <p className="mt-1 text-lg font-semibold">
          {fullClient.metricSnapshots[0]
            ? formatDateTime(fullClient.metricSnapshots[0].createdAt)
            : 'No snapshots yet'}
        </p>
      </div>
      <div className="card p-5">
        <p className="text-xs uppercase tracking-wide text-slate-500">Score trend</p>
        <p className="mt-1 text-3xl font-bold">{latestScore}</p>
        <p className="text-sm text-slate-600">Baseline {baseline} ({delta >= 0 ? '+' : ''}{delta})</p>
      </div>
      <div className="card p-5">
        <p className="text-xs uppercase tracking-wide text-slate-500">Keyword movement</p>
        <p className="mt-1 text-sm text-slate-700">Up: {latestSummary.up || 0}</p>
        <p className="text-sm text-slate-700">Down: {latestSummary.down || 0}</p>
      </div>

      <div className="card p-6 md:col-span-2">
        <h2 className="text-lg font-bold">Next actions this week</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>Refresh top 3 landing pages with city + service heading alignment.</li>
          <li>Request 2 new reviews and link them from homepage trust section.</li>
          <li>Improve estimate CTA visibility across mobile navigation and footer.</li>
        </ul>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-bold">Tracked keywords</h2>
        <p className="mt-2 text-3xl font-bold">{fullClient.keywords.length}</p>
      </div>
    </div>
  );
}
