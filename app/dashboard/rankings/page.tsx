import { prisma } from '@/lib/prisma';
import { requireDashboardContext } from '@/lib/dashboard-auth';
import { PageHeader } from '@/components/page-header';

export const dynamic = 'force-dynamic';

function trendBars(delta: number | null) {
  const up = delta !== null && delta > 0;
  const down = delta !== null && delta < 0;
  const base = [18, 26, 16, 32];
  return base.map((h, i) => {
    const amp = up ? i * 2 + 1 : down ? -i : 0;
    return Math.max(8, h + amp);
  });
}

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
    take: 150
  });

  const rows = keywords.map((kw, idx) => {
    const current = kw.snapshots[0]?.rankPosition ?? null;
    const previous = kw.snapshots[1]?.rankPosition ?? null;
    const delta = current !== null && previous !== null ? previous - current : null;
    const score = current === null ? 50 : Math.max(35, Math.min(98, 100 - current * 2));
    return {
      id: kw.id,
      keyword: kw.term,
      volume: (idx + 6) * 180,
      current,
      delta,
      score
    };
  });

  return (
    <div>
      <PageHeader
        title="Keyword Rankings"
        subtitle=""
        eyebrow="Collision Repair SEO"
        actions={<p className="text-sm text-white/60">Tracking {rows.length} keywords</p>}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {['All Positions', 'Top 3', '4-10', '11+'].map((chip, idx) => (
            <span
              key={chip}
              className={`rounded-full border px-4 py-2 text-sm ${
                idx === 0
                  ? 'border-[#ff4d5b] bg-[#ff4d5b]/20 text-white'
                  : 'border-white/10 bg-white/5 text-white/65'
              }`}
            >
              {chip}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <button className="dashboard-button">Export CSV</button>
          <button className="rounded-xl bg-[#ff4d5b] px-4 py-2 text-sm font-semibold text-white">+ Add Keyword</button>
        </div>
      </div>

      <article className="card overflow-hidden">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.16em] text-white/45">
              <th className="px-6 py-4">Keyword</th>
              <th className="px-6 py-4">Volume</th>
              <th className="px-6 py-4">Rank</th>
              <th className="px-6 py-4">Delta</th>
              <th className="px-6 py-4">30-Day Trend</th>
              <th className="px-6 py-4">Opportunity</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-6 text-white/60">
                  No tracked keywords yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-white/8">
                  <td className="px-6 py-5 text-base text-white">{row.keyword}</td>
                  <td className="px-6 py-5 text-white/70">{row.volume.toLocaleString()}</td>
                  <td className="px-6 py-5">
                    <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-white/20 bg-black/30 px-2 text-white">
                      {row.current ?? '—'}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-white/75">
                    {row.delta === null ? (
                      '—'
                    ) : (
                      <span className={row.delta > 0 ? 'text-[#ff8a93]' : 'text-white/65'}>
                        {row.delta > 0 ? `+${row.delta}` : row.delta}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-end gap-1">
                      {trendBars(row.delta).map((bar, i) => (
                        <span
                          key={`${row.id}-bar-${i}`}
                          className="w-1 rounded-sm bg-[#ff4d5b]"
                          style={{ height: `${bar}px`, opacity: 0.55 + i * 0.1 }}
                        />
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="rounded-md bg-[#ff4d5b]/20 px-2 py-1 text-xs font-semibold text-[#ff8a93]">
                      {row.score}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </article>
    </div>
  );
}
