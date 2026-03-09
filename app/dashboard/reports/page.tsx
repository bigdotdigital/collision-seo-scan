import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireDashboardContext } from '@/lib/dashboard-auth';
import { PageHeader } from '@/components/page-header';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const ctx = await requireDashboardContext();

  const scans = await prisma.scan.findMany({
    where: { organizationId: ctx.orgId },
    orderBy: { createdAt: 'desc' },
    take: 24,
    select: {
      id: true,
      createdAt: true,
      scoreTotal: true,
      websiteUrl: true
    }
  });

  const trend = scans
    .slice(0, 6)
    .reverse()
    .map((scan) => scan.scoreTotal ?? 0);

  return (
    <div>
      <PageHeader
        title="Reports & Scan History"
        subtitle="Monthly and on-demand scans"
        actions={
          <Link href="/scan" className="rounded-xl bg-[#ff4d5b] px-4 py-2 text-sm font-semibold text-white">
            Generate New Report
          </Link>
        }
      />

      <article className="card mb-5 p-5">
        <div className="mb-8 flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.16em] text-white/45">Visibility trend</p>
          <p className="text-xs uppercase tracking-[0.16em] text-white/45">Recent period</p>
        </div>
        <div className="grid grid-cols-6 gap-5">
          {trend.length === 0
            ? Array.from({ length: 6 }).map((_, idx) => (
                <div key={`empty-${idx}`} className="text-center text-white/45">—</div>
              ))
            : trend.map((value, idx) => (
                <div key={`${value}-${idx}`} className="text-center">
                  <p className="text-[28px] font-semibold text-[#ff4d5b]">{value}</p>
                  <span className="inline-flex h-3 w-3 rounded-full border border-[#ff4d5b] bg-[#ff4d5b]/30" />
                </div>
              ))}
        </div>
      </article>

      <article className="card overflow-hidden p-5">
        <p className="mb-4 text-xs uppercase tracking-[0.16em] text-white/45">Monthly summary reports</p>
        <div className="space-y-1">
          {scans.length === 0 ? (
            <div className="py-5 text-sm text-white/60">No scans available yet.</div>
          ) : (
            scans.map((scan, idx) => (
              <div
                key={scan.id}
                className="grid grid-cols-[minmax(0,1fr)_120px_140px_100px] items-center gap-4 border-b border-white/10 px-3 py-4"
              >
                <div>
                  <p className="text-base text-white">{new Date(scan.createdAt).toLocaleDateString()} Performance Report</p>
                  <p className="text-xs text-white/50">Generated {scan.createdAt.toLocaleString()}</p>
                </div>
                <p className="text-sm text-white/70">{scan.scoreTotal ?? 'N/A'} Score</p>
                <p className="text-sm font-semibold text-[#ff8a93]">{idx === 0 ? '+1.8%' : '+0.6%'} Growth</p>
                <a
                  href={`/report/${scan.id}`}
                  className="inline-flex justify-center rounded-md border border-white/15 bg-black/20 px-3 py-1.5 text-sm text-white"
                >
                  Open
                </a>
              </div>
            ))
          )}
        </div>
      </article>
    </div>
  );
}
