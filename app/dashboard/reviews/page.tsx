import { prisma } from '@/lib/prisma';
import { requireDashboardClient } from '@/lib/dashboard-auth';
import { parseJson } from '@/lib/json';
import { saveManualReviews } from './actions';

export const dynamic = 'force-dynamic';

export default async function ReviewsPage() {
  const client = await requireDashboardClient();

  const latest = await prisma.metricSnapshot.findFirst({
    where: { clientId: client.id },
    orderBy: { createdAt: 'desc' }
  });

  const reviews = parseJson<{ rating?: number; totalReviews?: number; newReviews30d?: number }>(
    latest?.reviewsJson,
    {}
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="card p-6">
        <h2 className="text-lg font-bold">Review Velocity</h2>
        <p className="mt-2 text-sm text-slate-600">Manual input for now. Connector can be added later.</p>
        <div className="mt-4 space-y-2 text-sm text-slate-700">
          <p>Current rating: {reviews.rating ?? 'N/A'}</p>
          <p>Total reviews: {reviews.totalReviews ?? 'N/A'}</p>
          <p>New reviews (30d): {reviews.newReviews30d ?? 'N/A'}</p>
        </div>
      </div>

      <form action={saveManualReviews} className="card p-6">
        <h2 className="text-lg font-bold">Update Reviews</h2>
        <label className="mt-3 flex flex-col gap-1 text-sm">
          Rating
          <input
            name="rating"
            defaultValue={reviews.rating ?? ''}
            className="rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="mt-3 flex flex-col gap-1 text-sm">
          Total Reviews
          <input
            name="totalReviews"
            defaultValue={reviews.totalReviews ?? ''}
            className="rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="mt-3 flex flex-col gap-1 text-sm">
          New Reviews (last 30 days)
          <input
            name="newReviews30d"
            defaultValue={reviews.newReviews30d ?? ''}
            className="rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <button className="mt-4 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white">
          Save review snapshot
        </button>
      </form>
    </div>
  );
}
