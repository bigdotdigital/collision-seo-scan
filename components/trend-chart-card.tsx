type TrendChartCardProps = {
  title: string;
  subtitle?: string;
  points?: number[];
};

export function TrendChartCard({ title, subtitle, points = [55, 57, 54, 60, 62, 64] }: TrendChartCardProps) {
  const min = Math.min(...points);
  const max = Math.max(...points, 1);
  const span = Math.max(max - min, 1);
  const path = points
    .map((point, idx) => {
      const x = (idx / Math.max(points.length - 1, 1)) * 100;
      const y = 100 - ((point - min) / span) * 80 - 10;
      return `${x},${y}`;
    })
    .join(' ');
  const delta = points[points.length - 1] - points[0];

  return (
    <article className="card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${delta >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
          {delta >= 0 ? '+' : ''}
          {delta}
        </span>
      </div>
      {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
      <div className="mt-4 rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-3">
        <svg viewBox="0 0 100 100" className="h-28 w-full">
          <polyline
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="0.6"
            points="0,90 100,90"
          />
          <polyline
            fill="none"
            stroke="#0f766e"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={path}
          />
        </svg>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>Oldest snapshot</span>
        <span>Latest snapshot</span>
      </div>
    </article>
  );
}
