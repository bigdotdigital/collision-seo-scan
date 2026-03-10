import type { ReactNode } from 'react';

type DashboardKpiCardProps = {
  label: string;
  value: ReactNode;
  detail?: string;
  footnote?: string;
  tone?: 'default' | 'accent' | 'warning';
};

function toneClass(tone: DashboardKpiCardProps['tone']) {
  if (tone === 'accent') return 'dashboard-panel dashboard-panel-accent';
  if (tone === 'warning') return 'dashboard-panel dashboard-panel-warning';
  return 'dashboard-panel';
}

export function DashboardKpiCard({
  label,
  value,
  detail,
  footnote,
  tone = 'default'
}: DashboardKpiCardProps) {
  return (
    <article className={toneClass(tone)}>
      <p className="dashboard-label">{label}</p>
      <div className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[var(--dashboard-text)]">
        {value}
      </div>
      {detail ? <p className="dashboard-body mt-2">{detail}</p> : null}
      {footnote ? <p className="dashboard-caption mt-4">{footnote}</p> : null}
    </article>
  );
}
