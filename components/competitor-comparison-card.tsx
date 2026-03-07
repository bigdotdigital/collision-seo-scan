type CompetitorComparisonRow = {
  id: string;
  name: string;
  trackedKeywords: number;
  note?: string;
};

type CompetitorComparisonCardProps = {
  rows: CompetitorComparisonRow[];
};

export function CompetitorComparisonCard({ rows }: CompetitorComparisonCardProps) {
  const maxKeywords = Math.max(...rows.map((row) => row.trackedKeywords), 1);

  return (
    <article className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">Competitor Snapshot</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
          {rows.length} tracked
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-600">Side-by-side competitor watchlist for this location.</p>
      <div className="mt-4 space-y-3">
        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm text-slate-500">
            No competitors tracked yet.
          </div>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="rounded-lg border border-slate-200 px-3 py-3">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-slate-900">{row.name}</p>
                <p className="text-xs font-semibold text-slate-500">{row.trackedKeywords} overlapping terms</p>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-teal-700/80"
                  style={{ width: `${Math.max(8, (row.trackedKeywords / maxKeywords) * 100)}%` }}
                />
              </div>
              {row.note ? <p className="mt-1 text-xs text-slate-600">{row.note}</p> : null}
            </div>
          ))
        )}
      </div>
    </article>
  );
}
