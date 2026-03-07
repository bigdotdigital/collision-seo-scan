type StatCardProps = {
  label: string;
  value: string | number;
  tone?: 'neutral' | 'positive' | 'warning';
  hint?: string;
  trend?: number[];
};

export function StatCard({ label, value, tone = 'neutral', hint, trend = [40, 45, 42, 49, 53] }: StatCardProps) {
  const toneClass =
    tone === 'positive'
      ? 'text-emerald-700'
      : tone === 'warning'
        ? 'text-amber-700'
        : 'text-slate-900';
  const toneChip =
    tone === 'positive'
      ? 'bg-emerald-100 text-emerald-700'
      : tone === 'warning'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-slate-100 text-slate-600';
  const max = Math.max(...trend, 1);

  return (
    <article className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${toneChip}`}>{tone}</span>
      </div>
      <p className={`mt-2 text-3xl font-bold ${toneClass}`}>{value}</p>
      {hint ? <p className="mt-1 text-sm text-slate-600">{hint}</p> : null}
      <div className="mt-4 flex h-7 items-end gap-1">
        {trend.map((point, idx) => {
          const h = Math.max(20, Math.round((point / max) * 100));
          return (
            <div key={`${point}-${idx}`} className="h-full flex-1 rounded-sm bg-slate-100">
              <div className="w-full rounded-sm bg-slate-400/80" style={{ height: `${h}%` }} />
            </div>
          );
        })}
      </div>
    </article>
  );
}
