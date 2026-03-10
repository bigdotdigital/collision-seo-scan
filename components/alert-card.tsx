import type { AlertSeverity, AlertType } from '@prisma/client';

type AlertCardProps = {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  subtitle: string;
  when: string;
};

const tone: Record<AlertSeverity, string> = {
  info: 'dashboard-status dashboard-status-info',
  warning: 'dashboard-status dashboard-status-warning',
  critical: 'dashboard-status dashboard-status-critical'
};

const typeLabel: Record<AlertType, string> = {
  rank_drop: 'Rank Drop',
  rank_gain: 'Rank Gain',
  competitor_moved_above: 'Competitor Moved Above',
  new_competitor: 'New Competitor',
  gbp_issue: 'GBP Issue'
};

export function AlertCard({ type, severity, title, subtitle, when }: AlertCardProps) {
  return (
    <article className="dashboard-panel">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <span className={`mt-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full text-[10px] font-bold ${tone[severity]}`}>
            !
          </span>
          <div>
            <p className="dashboard-section-title">{title}</p>
            <p className="dashboard-body-sm mt-1">{subtitle}</p>
          </div>
        </div>
        <span className="dashboard-status dashboard-status-muted">
          {typeLabel[type]}
        </span>
      </div>
      <p className="dashboard-caption mt-3">{when}</p>
    </article>
  );
}
