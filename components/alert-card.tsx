import type { AlertSeverity, AlertType } from '@prisma/client';

type AlertCardProps = {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  subtitle: string;
  when: string;
};

const tone: Record<AlertSeverity, string> = {
  info: 'bg-slate-200 text-slate-700',
  warning: 'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700'
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
    <article className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <span className={`mt-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full text-[10px] font-bold ${tone[severity]}`}>
            !
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <p className="text-sm text-slate-600">{subtitle}</p>
          </div>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
          {typeLabel[type]}
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-500">{when}</p>
    </article>
  );
}
