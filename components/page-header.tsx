type PageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  eyebrow?: string;
  badges?: Array<{
    label: string;
    tone?: 'live' | 'cached' | 'modeled' | 'fallback' | 'unknown';
    title?: string;
  }>;
};

function badgeToneClass(tone: NonNullable<PageHeaderProps['badges']>[number]['tone']) {
  if (tone === 'live') return 'dashboard-status-live';
  if (tone === 'cached') return 'dashboard-status-cached';
  if (tone === 'modeled') return 'dashboard-status-modeled';
  if (tone === 'fallback') return 'dashboard-status-fallback';
  return 'dashboard-status-unknown';
}

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow = 'Collision Monitoring',
  badges = []
}: PageHeaderProps) {
  return (
    <header className="dashboard-page-header">
      <div>
        <p className="dashboard-label">{eyebrow}</p>
        <h1 className="dashboard-page-title">{title}</h1>
        {subtitle ? <p className="dashboard-body mt-2 max-w-3xl">{subtitle}</p> : null}
        {badges.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {badges.map((badge) => (
              <span
                key={`${badge.label}-${badge.tone || 'unknown'}`}
                className={`dashboard-status ${badgeToneClass(badge.tone || 'unknown')}`}
                title={badge.title}
              >
                {badge.label}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
