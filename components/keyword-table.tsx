type KeywordRow = {
  id: string;
  keyword: string;
  current: number | null;
  previous: number | null;
  delta: number | null;
};

type KeywordTableProps = {
  rows: KeywordRow[];
};

export function KeywordTable({ rows }: KeywordTableProps) {
  return (
    <article className="card overflow-hidden">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">Tracked Keywords</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            {rows.length} terms
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-3 py-2 text-left">Keyword</th>
              <th className="px-3 py-2 text-left">Current</th>
              <th className="px-3 py-2 text-left">Previous</th>
              <th className="px-3 py-2 text-left">Delta</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-5 text-sm text-slate-500">
                  No keyword data yet. Weekly snapshots will appear here.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-200 transition hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-900">{row.keyword}</td>
                  <td className="px-3 py-2">{row.current ?? 'N/C'}</td>
                  <td className="px-3 py-2">{row.previous ?? 'N/C'}</td>
                  <td className="px-3 py-2">
                    {row.delta === null ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">No baseline</span>
                    ) : (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          row.delta >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {row.delta >= 0 ? '+' : ''}
                        {row.delta}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}
