import Link from 'next/link';
import { parseJson } from '@/lib/json';
import { prisma } from '@/lib/prisma';
import { findDuplicateShopCandidates } from '@/lib/shop-data';
import { formatDateTime } from '@/lib/utils';
import { AdminLoginForm } from './admin-login-form';
import {
  createDemoClient,
  convertScanToClient,
  isAdminAuthed,
  mergeDuplicateShops,
  resetDemoClient,
  sendScanFollowupNow
} from './actions';
import { LogoutButton } from './logout-button';

export const dynamic = 'force-dynamic';

const TEST_EMAIL_PATTERNS = [
  'alxklngr@gmail.com',
  'demo@collisionseoscan.local',
  '@example.com',
  '@collisionseoscan.local'
];

const TEST_SHOP_PATTERNS = [
  'werkheiser',
  'ace auto hail',
  'aceautohail',
  '5280autohail',
  '5280 auto hail',
  'demo'
];

const TEST_DOMAIN_PATTERNS = ['werkheisercollision.com', 'aceautohailrepair.com', '5280autohailrepair.com', 'example.com'];

function includesAny(value: string, patterns: string[]) {
  const n = value.toLowerCase();
  return patterns.some((p) => n.includes(p));
}

function isLikelyTestScan(scan: {
  shopName: string;
  email: string | null;
  websiteUrl: string;
}) {
  const email = (scan.email || '').toLowerCase();
  const shop = (scan.shopName || '').toLowerCase();
  const website = (scan.websiteUrl || '').toLowerCase();
  return (
    includesAny(email, TEST_EMAIL_PATTERNS) ||
    includesAny(shop, TEST_SHOP_PATTERNS) ||
    includesAny(website, TEST_DOMAIN_PATTERNS)
  );
}

export default async function AdminPage({
  searchParams
}: {
  searchParams?: { view?: string };
}) {
  if (!(process.env.ADMIN_PASSWORD || '').trim()) {
    return (
      <main className="container-shell py-12">
        <div className="card p-6">
          <h1 className="text-xl font-bold">Admin disabled</h1>
          <p className="mt-2 text-sm text-slate-600">Set `ADMIN_PASSWORD` to access this page.</p>
        </div>
      </main>
    );
  }

  const authed = await isAdminAuthed();
  if (!authed) return <AdminLoginForm />;

  const [scans, clients, benchmarkSnapshots, duplicateGroups, queueJobs] = await Promise.all([
    prisma.scan.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        leads: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    }),
    prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        metricSnapshots: { orderBy: { createdAt: 'desc' }, take: 1 }
      }
    }),
    prisma.benchmarkSnapshot.findMany({
      orderBy: [{ observedAt: 'desc' }, { createdAt: 'desc' }],
      take: 8,
      include: {
        market: {
          select: {
            id: true,
            city: true,
            state: true,
            vertical: true
          }
        }
      }
    }),
    findDuplicateShopCandidates(8),
    prisma.queueJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 40,
      select: {
        id: true,
        type: true,
        status: true,
        scanId: true,
        attempts: true,
        maxAttempts: true,
        createdAt: true,
        runAt: true,
        startedAt: true,
        finishedAt: true,
        errorType: true,
        error: true
      }
    })
  ]);
  const allowDemoTools = process.env.ALLOW_ADMIN_DEMO_TOOLS === '1';

  const showRealOnly = searchParams?.view === 'real';
  const realScans = scans.filter((scan) => !isLikelyTestScan(scan));
  const displayedScans = showRealOnly ? realScans : scans;
  const queuedScans = scans.filter((scan) => scan.executionStatus === 'queued');
  const runningScans = scans.filter((scan) => scan.executionStatus === 'running');
  const failedScans = scans.filter((scan) => scan.executionStatus === 'failed');
  const completedScans = scans.filter((scan) => scan.executionStatus === 'completed');
  return (
    <main className="container-shell py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Collision SEO Scan Admin</h1>
        <div className="flex items-center gap-2">
          {allowDemoTools ? (
            <>
              <form action={createDemoClient}>
                <button
                  type="submit"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold"
                >
                  Seed demo client
                </button>
              </form>
              <form action={resetDemoClient}>
                <button
                  type="submit"
                  className="rounded-md border border-red-300 px-3 py-2 text-sm font-semibold text-red-700"
                >
                  Reset demo client
                </button>
              </form>
            </>
          ) : null}
          <LogoutButton />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
        <p className="text-slate-700">
          Showing <span className="font-semibold">{displayedScans.length}</span> scans
          {showRealOnly ? (
            <>
              {' '}
              (<span className="font-semibold">{realScans.length}</span> likely real / net-new)
            </>
          ) : null}
        </p>
        <div className="flex items-center gap-2">
          <Link
            href={showRealOnly ? '/admin' : '/admin?view=real'}
            className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
              showRealOnly
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                : 'border-slate-300 bg-white text-slate-700'
            }`}
          >
            {showRealOnly ? 'Showing real leads only' : 'Real leads only'}
          </Link>
          {showRealOnly ? (
            <Link
              href="/admin"
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              Show all scans
            </Link>
          ) : null}
        </div>
      </div>

      <div className="card mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div>
            <h2 className="text-lg font-bold">Scan Queue</h2>
            <p className="mt-1 text-sm text-slate-600">
              Current scan execution states and recent queue jobs.
            </p>
          </div>
        </div>
        <div className="grid gap-4 border-b border-slate-200 p-4 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Queued</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{queuedScans.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Running</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{runningScans.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Failed</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{failedScans.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Completed</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{completedScans.length}</p>
          </div>
        </div>
        <div className="overflow-x-auto p-4">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="px-3 py-2 font-semibold">Type</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Scan</th>
                <th className="px-3 py-2 font-semibold">Attempts</th>
                <th className="px-3 py-2 font-semibold">Run At</th>
                <th className="px-3 py-2 font-semibold">Last Error</th>
              </tr>
            </thead>
            <tbody>
              {queueJobs.map((job) => (
                <tr key={job.id} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-900">{job.type}</td>
                  <td className="px-3 py-2 text-slate-700">{job.status}</td>
                  <td className="px-3 py-2 text-slate-700">{job.scanId?.slice(0, 8) || '—'}</td>
                  <td className="px-3 py-2 text-slate-700">
                    {job.attempts}/{job.maxAttempts}
                  </td>
                  <td className="px-3 py-2 text-slate-700">{formatDateTime(job.runAt)}</td>
                  <td className="px-3 py-2 text-slate-700">{job.errorType || job.error || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div>
            <h2 className="text-lg font-bold">Benchmark Snapshots</h2>
            <p className="mt-1 text-sm text-slate-600">
              Latest city-market rollups from canonical shop observations.
            </p>
          </div>
          <Link
            href="/api/admin/benchmark-report?take=8"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
          >
            Open JSON report
          </Link>
        </div>
        <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
          {benchmarkSnapshots.map((snapshot) => {
            const featureRates = parseJson<Record<string, number | null>>(snapshot.featureRatesJson, {});
            const keywordHighlights = parseJson<Array<{ keyword: string; totalVolume?: number }>>(
              snapshot.keywordHighlightsJson,
              []
            );
            return (
              <div key={snapshot.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  {snapshot.market.city}
                  {snapshot.market.state ? `, ${snapshot.market.state}` : ''} · {snapshot.market.vertical}
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {typeof snapshot.avgOverallScore === 'number' ? snapshot.avgOverallScore.toFixed(1) : 'N/A'}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Avg score across {snapshot.shopCount} shops / {snapshot.scanCount} scans
                </p>
                <dl className="mt-4 space-y-1 text-sm text-slate-700">
                  <div className="flex items-center justify-between gap-3">
                    <dt>Estimate CTA rate</dt>
                    <dd>{typeof featureRates.estimateCtaRate === 'number' ? `${Math.round(featureRates.estimateCtaRate * 100)}%` : 'N/A'}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt>Review proof rate</dt>
                    <dd>{typeof featureRates.reviewProofRate === 'number' ? `${Math.round(featureRates.reviewProofRate * 100)}%` : 'N/A'}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt>Certification page rate</dt>
                    <dd>{typeof featureRates.certificationPageRate === 'number' ? `${Math.round(featureRates.certificationPageRate * 100)}%` : 'N/A'}</dd>
                  </div>
                </dl>
                <p className="mt-4 text-xs text-slate-500">
                  Top keyword: {keywordHighlights[0]?.keyword || 'Not enough keyword observations yet'}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/api/admin/benchmark-report?marketId=${snapshot.market.id}&take=12`}
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700"
                  >
                    Drill down
                  </Link>
                  <Link
                    href={`/api/admin/benchmark-report?marketId=${snapshot.market.id}&take=12&format=csv`}
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700"
                  >
                    CSV
                  </Link>
                </div>
              </div>
            );
          })}
          {benchmarkSnapshots.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600 md:col-span-2 xl:col-span-4">
              No benchmark snapshots exist yet. Run the benchmark rollup cron after new scans land.
            </div>
          ) : null}
        </div>
      </div>

      <div className="card mb-8">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-lg font-bold">Duplicate Shop Review</h2>
          <p className="mt-1 text-sm text-slate-600">
            Only strong-identifier duplicate groups are shown here. Name-only guesses are excluded from merge actions.
          </p>
        </div>
        <div className="space-y-4 p-4">
          {duplicateGroups.map((group, groupIndex) => {
            const [primary] = group.shops;
            return (
              <div key={`${primary.id}-${groupIndex}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Candidate group
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {primary.city || 'Unknown city'}
                    {primary.state ? `, ${primary.state}` : ''} · {group.shops.length} records
                  </p>
                </div>
                <div className="space-y-3">
                  {group.shops.map((shop, index) => (
                    <div key={shop.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {shop.name} {index === 0 ? '(suggested primary)' : ''}
                        </p>
                        <p className="text-sm text-slate-600">
                          {shop.websiteUrl || 'No website'} · scans {shop._count.scans} · orgs {shop._count.organizations} · competitor refs {shop._count.trackedAsCompetitor}
                        </p>
                      </div>
                      {index > 0 ? (
                        <form action={mergeDuplicateShops}>
                          <input type="hidden" name="sourceShopId" value={shop.id} />
                          <input type="hidden" name="destinationShopId" value={primary.id} />
                          <button
                            type="submit"
                            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                          >
                            Merge into primary
                          </button>
                        </form>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {duplicateGroups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              No obvious duplicate canonical shops detected from current name/domain heuristics.
            </div>
          ) : null}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-lg font-bold">Scans</h2>
        </div>
        <table className="w-full min-w-[1080px] border-collapse text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Shop</th>
              <th className="px-3 py-2 text-left">City</th>
              <th className="px-3 py-2 text-left">Website</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Score</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Intake</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayedScans.map((scan) => (
              <tr key={scan.id} className="border-t border-slate-200 align-top">
                <td className="px-3 py-2">{formatDateTime(scan.createdAt)}</td>
                <td className="px-3 py-2">{scan.shopName}</td>
                <td className="px-3 py-2">{scan.city}</td>
                <td className="px-3 py-2">
                  <a href={scan.websiteUrl} className="text-teal-700 underline" target="_blank" rel="noreferrer">
                    {scan.websiteUrl}
                  </a>
                </td>
                <td className="px-3 py-2">{scan.email || '—'}</td>
                <td className="px-3 py-2 font-semibold">{scan.scoreTotal}</td>
                <td className="px-3 py-2">{scan.status}</td>
                <td className="px-3 py-2 text-xs text-slate-700">
                  {scan.leads[0] ? (
                    <>
                      <p>Intent: {scan.leads[0].intent || '—'}</p>
                      <p>Budget: {scan.leads[0].budgetRange || '—'}</p>
                      <p>Timeline: {scan.leads[0].timeline || '—'}</p>
                    </>
                  ) : (
                    'No intake yet'
                  )}
                </td>
                <td className="space-y-2 px-3 py-2">
                  <Link href={`/report/${scan.id}`} className="text-teal-700 underline">
                    Open report
                  </Link>
                  <div>
                    <form action={convertScanToClient}>
                      <input type="hidden" name="scanId" value={scan.id} />
                      <input type="hidden" name="plan" value="leadgen" />
                      <button
                        type="submit"
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold"
                      >
                        Convert to Client
                      </button>
                    </form>
                  </div>
                  {scan.email ? (
                    <div>
                      <form action={sendScanFollowupNow}>
                        <input type="hidden" name="scanId" value={scan.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                        >
                          Send follow-up now
                        </button>
                      </form>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
            {displayedScans.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-5 text-center text-sm text-slate-600">
                  No scans match this filter yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="card mt-8 overflow-x-auto">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-lg font-bold">Clients</h2>
        </div>
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-3 py-2 text-left">Created</th>
              <th className="px-3 py-2 text-left">Shop</th>
              <th className="px-3 py-2 text-left">Plan</th>
              <th className="px-3 py-2 text-left">Owner Email</th>
              <th className="px-3 py-2 text-left">Active</th>
              <th className="px-3 py-2 text-left">Latest Snapshot</th>
              <th className="px-3 py-2 text-left">Open</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} className="border-t border-slate-200">
                <td className="px-3 py-2">{formatDateTime(client.createdAt)}</td>
                <td className="px-3 py-2">{client.shopName}</td>
                <td className="px-3 py-2">{client.plan}</td>
                <td className="px-3 py-2">{client.ownerEmail}</td>
                <td className="px-3 py-2">{client.isActive ? 'Yes' : 'No'}</td>
                <td className="px-3 py-2">
                  {client.metricSnapshots[0]
                    ? formatDateTime(client.metricSnapshots[0].createdAt)
                    : 'No snapshots'}
                </td>
                <td className="px-3 py-2">
                  <Link href={`/admin/client/${client.id}`} className="text-teal-700 underline">
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
