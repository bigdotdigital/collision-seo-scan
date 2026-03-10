type Trend = {
  value: string;
  type: 'up' | 'down';
};

type MetricCardProps = {
  value: string | number;
  label: string;
  subtitle?: string;
  trend?: Trend;
  icon?: React.ReactNode;
  className?: string;
};

function ArrowTrendingUpIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 18 6.75-6.75 4.5 4.5L21.75 7.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 7.5h5.25v5.25" />
    </svg>
  );
}

function ArrowTrendingDownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 6 6.75 6.75 4.5-4.5 8.25 8.25" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 16.5h5.25v-5.25" />
    </svg>
  );
}

export function MetricCard({ value, label, subtitle, trend, icon, className = '' }: MetricCardProps) {
  return (
    <div className={`card ${className}`}>
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-main)]">{label}</h3>
          {subtitle ? <p className="mt-1 text-xs text-[var(--text-muted)]">{subtitle}</p> : null}
        </div>
        {icon ? <div className="text-[var(--text-muted)]">{icon}</div> : null}
      </div>

      <div className="metric-value mb-2">{value}</div>

      {trend ? (
        <div className={`trend-${trend.type}`}>
          {trend.type === 'up' ? (
            <ArrowTrendingUpIcon className="h-3 w-3" />
          ) : (
            <ArrowTrendingDownIcon className="h-3 w-3" />
          )}
          {trend.value}
        </div>
      ) : null}
    </div>
  );
}
