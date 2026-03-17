import type { ReactNode } from 'react';

export function DashboardModuleCard({
  title,
  subtitle,
  score,
  children,
  badge,
  eyebrow,
  className,
  tone = 'default',
  compact = false
}: {
  title: string;
  subtitle: string;
  score?: string | number;
  badge?: ReactNode;
  eyebrow?: string;
  className?: string;
  tone?: 'default' | 'accent' | 'muted' | 'warning';
  compact?: boolean;
  children: ReactNode;
}) {
  const toneClass =
    tone === 'accent'
      ? 'dashboard-panel-accent dashboard-panel-tone'
      : tone === 'muted'
        ? 'dashboard-panel-muted'
        : tone === 'warning'
          ? 'dashboard-panel-warning dashboard-panel-tone'
          : '';

  return (
    <article className={['dashboard-panel', toneClass, compact ? 'p-4' : '', className].filter(Boolean).join(' ')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {eyebrow ? <p className="dashboard-label">{eyebrow}</p> : null}
          <h2 className="dashboard-section-title">{title}</h2>
          <p className="dashboard-body-sm mt-1">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {badge}
          {score !== undefined ? <span className="dashboard-status dashboard-status-live">Score {score}</span> : null}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </article>
  );
}

export function LockedModuleTeaser({
  title,
  body
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="dashboard-subpanel rounded-[22px] p-4">
      <p className="dashboard-label">Premium module</p>
      <p className="mt-2 text-base font-semibold text-[var(--dashboard-text)]">{title}</p>
      <p className="dashboard-body-sm mt-2">{body}</p>
      <p className="dashboard-caption mt-3">Upgrade to unlock the exact fixes, deltas, and repair plan.</p>
    </div>
  );
}
