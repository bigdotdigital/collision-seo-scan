type ComparisonMetric = {
  label: string;
  value: string;
};

type CompetitorComparisonCardProps = {
  title: string;
  subtitle?: string;
  metrics?: ComparisonMetric[];
  highlights?: string[];
  href?: string | null;
  hrefLabel?: string;
  tone?: 'default' | 'accent' | 'muted';
};

type CompetitorComparisonGridProps = {
  items: CompetitorComparisonCardProps[];
  emptyTitle: string;
  emptyBody: string;
};

function toneClass(tone: CompetitorComparisonCardProps['tone']) {
  if (tone === 'accent') return 'dashboard-panel dashboard-panel-accent';
  if (tone === 'muted') return 'dashboard-panel dashboard-panel-muted';
  return 'dashboard-panel';
}

export function CompetitorComparisonCard({
  title,
  subtitle,
  metrics = [],
  highlights = [],
  href,
  hrefLabel = 'Open',
  tone = 'default'
}: CompetitorComparisonCardProps) {
  return (
    <article className={toneClass(tone)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="dashboard-section-title">{title}</p>
          {subtitle ? <p className="dashboard-body-sm mt-1">{subtitle}</p> : null}
        </div>
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" className="dashboard-inline-link">
            {hrefLabel}
          </a>
        ) : null}
      </div>

      {metrics.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {metrics.map((metric) => (
            <div key={`${title}-${metric.label}`} className="dashboard-subpanel rounded-[20px] p-3">
              <p className="dashboard-label">{metric.label}</p>
              <p className="mt-1 text-base font-semibold text-[var(--dashboard-text)]">{metric.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {highlights.length > 0 ? (
        <div className="mt-4 space-y-2">
          {highlights.slice(0, 3).map((highlight, index) => (
            <p key={`${title}-highlight-${index}`} className="dashboard-list-row">
              <span className="dashboard-list-dot" />
              <span>{highlight}</span>
            </p>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function CompetitorComparisonGrid({
  items,
  emptyTitle,
  emptyBody
}: CompetitorComparisonGridProps) {
  if (items.length === 0) {
    return (
      <div className="dashboard-empty-state">
        <p className="dashboard-empty-title">{emptyTitle}</p>
        <p className="dashboard-body-sm mt-1">{emptyBody}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {items.map((item) => (
        <CompetitorComparisonCard key={`${item.title}-${item.subtitle || 'card'}`} {...item} />
      ))}
    </div>
  );
}
