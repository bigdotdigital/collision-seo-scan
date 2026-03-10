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
    <article className="dashboard-panel overflow-hidden p-0">
      <div className="border-b border-[var(--dashboard-border-strong)] px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="dashboard-section-title">Tracked Keywords</h2>
          <span className="dashboard-status dashboard-status-muted">
            {rows.length} terms
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="dashboard-table w-full min-w-[720px] text-sm">
          <thead>
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
                <td colSpan={4} className="px-3 py-5 text-sm text-[var(--dashboard-text-muted)]">
                  No keyword data yet. Weekly snapshots will appear here.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2 font-medium text-[var(--dashboard-text)]">{row.keyword}</td>
                  <td className="px-3 py-2">{row.current ?? 'N/C'}</td>
                  <td className="px-3 py-2">{row.previous ?? 'N/C'}</td>
                  <td className="px-3 py-2">
                    {row.delta === null ? (
                      <span className="dashboard-status dashboard-status-muted">No baseline</span>
                    ) : (
                      <span
                        className={`dashboard-status ${
                          row.delta >= 0 ? 'dashboard-status-positive' : 'dashboard-status-warning'
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
