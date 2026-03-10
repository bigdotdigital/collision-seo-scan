type DashboardTrendIndicatorProps = {
  label: string;
  value: string;
  direction?: 'up' | 'down' | 'flat' | 'unknown';
  detail?: string;
};

function directionGlyph(direction: DashboardTrendIndicatorProps['direction']) {
  if (direction === 'up') return '↑';
  if (direction === 'down') return '↓';
  if (direction === 'flat') return '→';
  return '•';
}

function directionClass(direction: DashboardTrendIndicatorProps['direction']) {
  if (direction === 'up') return 'dashboard-trend dashboard-trend-up';
  if (direction === 'down') return 'dashboard-trend dashboard-trend-down';
  if (direction === 'flat') return 'dashboard-trend dashboard-trend-flat';
  return 'dashboard-trend dashboard-trend-unknown';
}

export function DashboardTrendIndicator({
  label,
  value,
  direction = 'unknown',
  detail
}: DashboardTrendIndicatorProps) {
  return (
    <div className="dashboard-subpanel rounded-[20px] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="dashboard-label">{label}</p>
        <span className={directionClass(direction)}>
          {directionGlyph(direction)} {value}
        </span>
      </div>
      {detail ? <p className="dashboard-body-sm mt-2">{detail}</p> : null}
    </div>
  );
}
