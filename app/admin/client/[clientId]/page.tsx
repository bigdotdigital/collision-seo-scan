import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isAdminAuthed, forceRefreshClientSnapshot } from '@/app/admin/actions';
import { prisma } from '@/lib/prisma';
import { formatDateTime } from '@/lib/utils';
import { parseJson } from '@/lib/json';

export const dynamic = 'force-dynamic';

export default async function AdminClientPage({ params }: { params: { clientId: string } }) {
  const authed = await isAdminAuthed();
  if (!authed) {
    return (
      <main className="container-shell py-10">
        <p className="text-sm">Unauthorized. Visit /admin first.</p>
      </main>
    );
  }

  const client = await prisma.client.findUnique({
    where: { id: params.clientId },
    include: {
      scans: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          leads: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      },
      keywords: true,
      metricSnapshots: { orderBy: { createdAt: 'desc' }, take: 10 }
    }
  });

  if (!client) return notFound();

  const latestSummary = parseJson<{ up?: number; down?: number; note?: string }>(
    client.metricSnapshots[0]?.summaryJson,
    {}
  );

  return (
    <main className="container-shell py-10">
      <div className="mb-5">
        <Link href="/admin" className="text-sm text-teal-700 underline">
          Back to admin
        </Link>
      </div>

      <div className="card p-6">
        <h1 className="text-2xl font-bold">{client.shopName}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {client.city} • {client.websiteUrl}
        </p>
        <p className="mt-2 text-sm text-slate-700">
          Owner: {client.ownerEmail} • Plan: {client.plan}
        </p>
        <div className="mt-4">
          <form action={forceRefreshClientSnapshot}>
            <input type="hidden" name="clientId" value={client.id} />
            <button
              type="submit"
              className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white"
            >
              Force refresh snapshot
            </button>
          </form>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="card p-6">
          <h2 className="text-lg font-bold">Latest Snapshot</h2>
          {client.metricSnapshots[0] ? (
            <>
              <p className="mt-2 text-sm text-slate-700">
                {formatDateTime(client.metricSnapshots[0].createdAt)}
              </p>
              <p className="mt-1 text-sm text-slate-700">Keywords up: {latestSummary.up || 0}</p>
              <p className="text-sm text-slate-700">Keywords down: {latestSummary.down || 0}</p>
              <p className="mt-1 text-sm text-slate-500">{latestSummary.note || 'No note'}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-600">No snapshots yet.</p>
          )}
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-bold">Keywords</h2>
          <p className="mt-2 text-sm text-slate-700">{client.keywords.length} tracked keywords</p>
          <ul className="mt-3 space-y-1 text-sm text-slate-700">
            {client.keywords.slice(0, 8).map((kw) => (
              <li key={kw.id}>{kw.keyword}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card mt-6 p-6">
        <h2 className="text-lg font-bold">Recent Scans</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {client.scans.map((scan) => (
            <li key={scan.id} className="rounded-md border border-slate-200 p-3">
              {formatDateTime(scan.createdAt)} • Score {scan.scoreTotal} •{' '}
              <Link href={`/report/${scan.id}`} className="text-teal-700 underline">
                Open report
              </Link>
              {scan.leads[0] ? (
                <p className="mt-1 text-xs text-slate-600">
                  Intake: {scan.leads[0].intent || '—'} | {scan.leads[0].budgetRange || '—'} |{' '}
                  {scan.leads[0].timeline || '—'}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
