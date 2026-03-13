import type { ReactNode } from 'react';

export function DashboardModuleCard({
  title,
  subtitle,
  score,
  children,
  badge
}: {
  title: string;
  subtitle: string;
  score?: string | number;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="dashboard-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
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
