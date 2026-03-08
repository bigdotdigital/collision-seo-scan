import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { formatDateTime } from '@/lib/utils';
import { AdminLoginForm } from './admin-login-form';
import {
  createDemoClient,
  convertScanToClient,
  isAdminAuthed,
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

  const [scans, clients] = await Promise.all([
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
    })
  ]);

  const showRealOnly = searchParams?.view === 'real';
  const realScans = scans.filter((scan) => !isLikelyTestScan(scan));
  const displayedScans = showRealOnly ? realScans : scans;

  return (
    <main className="container-shell py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Collision SEO Scan Admin</h1>
        <div className="flex items-center gap-2">
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
