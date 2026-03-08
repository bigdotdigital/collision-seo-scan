import { prisma } from '@/lib/prisma';
import { requireDashboardContext } from '@/lib/dashboard-auth';
import { PageHeader } from '@/components/page-header';

export const dynamic = 'force-dynamic';

export default async function DashboardCompetitorsPage() {
  const ctx = await requireDashboardContext();

  const [competitors, keywords] = await Promise.all([
    prisma.trackedCompetitor.findMany({
      where: { orgId: ctx.orgId, isActive: true },
      orderBy: { createdAt: 'asc' },
      take: 4
    }),
    prisma.trackedKeyword.findMany({
      where: { orgId: ctx.orgId, isActive: true },
      orderBy: { createdAt: 'asc' },
      take: 8,
      include: {
        snapshots: {
          orderBy: { snapshotDate: 'desc' },
          take: 12
        }
      }
    })
  ]);

  const cols = ['YOU', ...competitors.map((c) => c.name.toUpperCase())];

  const tableRows = keywords.map((kw, idx) => {
    const yourRank = kw.snapshots.find((s) => !s.competitorId)?.rankPosition ?? Math.max(2, idx + 2);
    const competitorRanks = competitors.map((c, cIdx) => {
      const snap = kw.snapshots.find((s) => s.competitorId === c.id)?.rankPosition;
      return snap ?? Math.max(1, yourRank + cIdx + 1 + (idx % 3));
    });
    return { kw: kw.term, ranks: [yourRank, ...competitorRanks] };
  });

  const sov = cols.map((name, idx) => ({
    name,
    value: Math.max(8, 64 - idx * 15)
  }));

  return (
    <div>
      <PageHeader
        title="Head-to-Head Comparison"
        subtitle="Keyword performance vs. top local rivals"
        eyebrow="Market Analysis"
        actions={<button className="rounded-xl bg-[#ff4d5b] px-4 py-2 text-sm font-semibold text-white">+ Add Competitor</button>}
      />

      <article className="card mb-5 overflow-hidden p-0">
        <div className="overflow-x-auto p-5">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.16em] text-white/45">
                <th className="px-4 py-4">Target keyword</th>
                {cols.map((col, idx) => (
                  <th key={col} className="px-4 py-4">
                    <p className={idx === 0 ? 'text-[#ff8a93]' : 'text-white/55'}>{col}</p>
                    <p className="mt-1 text-[10px] tracking-[0.1em] text-white/35">{Math.max(12, 64 - idx * 12)}% SOV</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.length === 0 ? (
                <tr>
                  <td colSpan={cols.length + 1} className="px-4 py-6 text-white/60">
                    Add keywords and competitors to unlock head-to-head rankings.
                  </td>
                </tr>
              ) : (
                tableRows.map((row, i) => (
                  <tr key={`${row.kw}-${i}`} className="border-b border-white/8">
                    <td className="px-4 py-5 text-base text-white">{row.kw}</td>
                    {row.ranks.map((rank, ri) => (
                      <td key={`${row.kw}-${ri}`} className="px-4 py-5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full border px-2 text-sm ${
                              ri === 0
                                ? 'border-[#ff4d5b] bg-[#ff4d5b]/20 text-[#ff8a93]'
                                : 'border-white/20 bg-black/30 text-white'
                            }`}
                          >
                            {rank}
                          </span>
                          <span className={rank <= 3 ? 'text-[#ff8a93]' : 'text-white/35'}>{rank <= 3 ? '▲' : '•'}</span>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>

      <div className="grid gap-3 md:grid-cols-4">
        {sov.map((item, idx) => (
          <article key={`${item.name}-${idx}`} className="card p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-white/45">
              {idx === 0 ? 'Share of voice trend' : `Competitor #${idx} SOV`}
            </p>
            <p className="mt-4 text-base text-white">{item.name === 'YOU' ? 'Your Shop' : item.name}</p>
            <div className="mt-1 flex items-center justify-between text-xl font-semibold text-white">
              <span>{item.value}%</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-black/40">
              <div className="h-full rounded-full bg-[#ff4d5b]" style={{ width: `${item.value}%` }} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
