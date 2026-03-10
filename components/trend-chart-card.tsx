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
    <article className="dashboard-panel">
      <div className="flex items-center justify-between">
        <h2 className="dashboard-section-title">{title}</h2>
        <span className={`dashboard-status ${delta >= 0 ? 'dashboard-status-positive' : 'dashboard-status-warning'}`}>
          {delta >= 0 ? '+' : ''}
          {delta}
        </span>
      </div>
      {subtitle ? <p className="dashboard-body-sm mt-1">{subtitle}</p> : null}
      <div className="dashboard-subpanel mt-4 rounded-xl p-3">
        <svg viewBox="0 0 100 100" className="h-28 w-full">
          <polyline
            fill="none"
            stroke="rgba(242, 214, 193, 0.18)"
            strokeWidth="0.6"
            points="0,90 100,90"
          />
          <polyline
            fill="none"
            stroke="#f87171"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={path}
          />
        </svg>
      </div>
      <div className="dashboard-caption mt-2 flex items-center justify-between">
        <span>Oldest snapshot</span>
        <span>Latest snapshot</span>
      </div>
    </article>
  );
}
