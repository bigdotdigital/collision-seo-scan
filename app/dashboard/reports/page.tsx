import { prisma } from '@/lib/prisma';
import { requireDashboardContext } from '@/lib/dashboard-auth';
import { PageHeader } from '@/components/page-header';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const ctx = await requireDashboardContext();

  const scans = await prisma.scan.findMany({
    where: { organizationId: ctx.orgId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      createdAt: true,
      scoreTotal: true,
      websiteUrl: true
    }
  });

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Scan and visibility history scaffold for monitoring timeline."
      />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[780px] text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Scan ID</th>
              <th className="px-3 py-2 text-left">Visibility Score</th>
              <th className="px-3 py-2 text-left">Website</th>
            </tr>
          </thead>
          <tbody>
            {scans.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-slate-500">
                  No scans available yet for this organization.
                </td>
              </tr>
            ) : (
              scans.map((scan) => (
                <tr key={scan.id} className="border-t border-slate-200">
                  <td className="px-3 py-2">{scan.createdAt.toLocaleString()}</td>
                  <td className="px-3 py-2 font-mono text-xs">{scan.id}</td>
                  <td className="px-3 py-2">{scan.scoreTotal ?? 'N/A'}</td>
                  <td className="px-3 py-2">{scan.websiteUrl}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
