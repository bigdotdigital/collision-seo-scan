import { prisma } from '@/lib/prisma';
import { requireDashboardClient } from '@/lib/dashboard-auth';
import { formatDateTime } from '@/lib/utils';
import { parseJson } from '@/lib/json';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const client = await requireDashboardClient();

  const snapshots = await prisma.metricSnapshot.findMany({
    where: { clientId: client.id },
    orderBy: { createdAt: 'desc' },
    take: 30
  });

  return (
    <div className="card overflow-x-auto">
      <div className="border-b border-slate-200 p-5">
        <h2 className="text-lg font-bold">Snapshot History</h2>
      </div>

      <table className="w-full min-w-[780px] text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="px-3 py-2 text-left">Date</th>
            <th className="px-3 py-2 text-left">Score</th>
            <th className="px-3 py-2 text-left">Summary</th>
            <th className="px-3 py-2 text-left">Review Data</th>
          </tr>
        </thead>
        <tbody>
          {snapshots.map((snapshot) => {
            const summary = parseJson<{ note?: string; up?: number; down?: number }>(snapshot.summaryJson, {});
            const hasReviews = Boolean(snapshot.reviewsJson);

            return (
              <tr key={snapshot.id} className="border-t border-slate-200">
                <td className="px-3 py-2">{formatDateTime(snapshot.createdAt)}</td>
                <td className="px-3 py-2">{snapshot.scoreTotal ?? 'N/A'}</td>
                <td className="px-3 py-2">
                  {summary.note || 'No note'}
                  <div className="text-xs text-slate-500">Up {summary.up || 0} / Down {summary.down || 0}</div>
                </td>
                <td className="px-3 py-2">{hasReviews ? 'Yes' : 'No'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
