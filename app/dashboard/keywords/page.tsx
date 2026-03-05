import { prisma } from '@/lib/prisma';
import { requireDashboardClient } from '@/lib/dashboard-auth';
import { parseJson } from '@/lib/json';

type RankingRow = {
  keyword: string;
  currentRank: number | null;
  previousRank: number | null;
  delta: number | null;
  note?: string;
};

export const dynamic = 'force-dynamic';

export default async function KeywordsPage() {
  const client = await requireDashboardClient();

  const snapshot = await prisma.metricSnapshot.findFirst({
    where: { clientId: client.id },
    orderBy: { createdAt: 'desc' }
  });

  const rows = parseJson<RankingRow[]>(snapshot?.keywordsJson, []);

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-200 p-5">
        <h2 className="text-lg font-bold">Keyword Rankings</h2>
        <p className="mt-1 text-sm text-slate-600">Simple movement tracking from latest snapshot.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-3 py-2 text-left">Keyword</th>
              <th className="px-3 py-2 text-left">Current</th>
              <th className="px-3 py-2 text-left">Previous</th>
              <th className="px-3 py-2 text-left">Movement</th>
              <th className="px-3 py-2 text-left">Bar</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const bar = row.delta ? Math.min(Math.abs(row.delta) * 10, 100) : 0;
              const positive = (row.delta || 0) > 0;

              return (
                <tr key={row.keyword} className="border-t border-slate-200">
                  <td className="px-3 py-2">{row.keyword}</td>
                  <td className="px-3 py-2">{row.currentRank ?? 'N/C'}</td>
                  <td className="px-3 py-2">{row.previousRank ?? 'N/C'}</td>
                  <td className="px-3 py-2">
                    {row.delta === null ? row.note || 'No data' : `${positive ? '+' : ''}${row.delta}`}
                  </td>
                  <td className="px-3 py-2">
                    <div className="h-2 w-40 rounded bg-slate-200">
                      <div
                        className={`h-2 rounded ${positive ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        style={{ width: `${bar}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
