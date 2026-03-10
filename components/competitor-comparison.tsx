import { MetricCard } from './metric-card';

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75m6 2.25a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  );
}

function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m15 9-6 6m0-6 6 6m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  );
}

type Competitor = {
  name: string;
  score: number | null;
  hasOemCerts: boolean;
  hasOnlineEstimate: boolean;
  reviewCount: number | null;
  reviewRating: number | null;
};

type CompetitorComparisonProps = {
  yourShop: Competitor;
  competitors: Competitor[];
  reviewGapOverride?: number | null;
};

function reviewLabel(rating: number | null, reviews: number | null) {
  if (typeof rating === 'number' && typeof reviews === 'number') {
    return `${rating.toFixed(1)}★ (${reviews})`;
  }
  return 'Reviews unavailable';
}

export function CompetitorComparison({
  yourShop,
  competitors,
  reviewGapOverride = null
}: CompetitorComparisonProps) {
  const oemGap = competitors.filter((c) => c.hasOemCerts && !yourShop.hasOemCerts).length;
  const estimateGap = competitors.filter((c) => c.hasOnlineEstimate && !yourShop.hasOnlineEstimate).length;

  const averageCompetitorReviews =
    competitors.length > 0
      ? competitors.reduce((sum, c) => sum + (c.reviewCount || 0), 0) / competitors.length
      : 0;
  const reviewGap =
    typeof reviewGapOverride === 'number'
      ? reviewGapOverride
      : averageCompetitorReviews - (yourShop.reviewCount || 0);

  return (
    <div className="card">
      <h3 className="mb-4 text-sm font-semibold text-[var(--text-main)]">Competitor Gap Analysis</h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-md bg-[var(--bg-body)] p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-bold text-white">
              {yourShop.name.charAt(0)}
            </div>
            <div>
              <p className="font-medium text-[var(--text-main)]">{yourShop.name} (You)</p>
              <p className="text-xs text-[var(--text-muted)]">
                Score: {typeof yourShop.score === 'number' ? `${yourShop.score}/100` : 'Unavailable'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold text-[var(--text-main)]">{reviewLabel(yourShop.reviewRating, yourShop.reviewCount)}</p>
          </div>
        </div>

        {competitors.length === 0 ? (
          <div className="rounded-md border border-[var(--border-light)] p-3 text-sm text-[var(--text-secondary)]">
            No competitor comparison data is available yet.
          </div>
        ) : (
          competitors.map((competitor, index) => (
            <div key={index} className="flex items-center justify-between rounded-md border border-[var(--border-light)] p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-orange)] text-sm font-bold text-white">
                  {competitor.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-[var(--text-main)]">{competitor.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Score: {typeof competitor.score === 'number' ? `${competitor.score}/100` : 'Unavailable'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-[var(--text-main)]">{reviewLabel(competitor.reviewRating, competitor.reviewCount)}</p>
              </div>
            </div>
          ))
        )}

        <div className="grid grid-cols-1 gap-4 border-t border-[var(--border-light)] pt-4 md:grid-cols-3">
          <MetricCard
            value={oemGap}
            label="Missing OEM Certifications"
            icon={
              oemGap > 0 ? (
                <XCircleIcon className="h-5 w-5 text-red-500" />
              ) : (
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
              )
            }
            className="md:col-span-1"
          />
          <MetricCard
            value={estimateGap}
            label="Missing Online Estimate"
            icon={
              estimateGap > 0 ? (
                <XCircleIcon className="h-5 w-5 text-red-500" />
              ) : (
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
              )
            }
            className="md:col-span-1"
          />
          <MetricCard
            value={Number.isFinite(reviewGap) ? Math.round(reviewGap) : 'N/A'}
            label="Review Gap"
            subtitle={typeof reviewGapOverride === 'number' ? 'Based on latest review-gap payload' : 'Based on available competitor review counts'}
            trend={
              Number.isFinite(reviewGap)
                ? {
                    value:
                      reviewGap > 0
                        ? `↓ ${Math.round(reviewGap)}`
                        : `↑ ${Math.abs(Math.round(reviewGap))}`,
                    type: reviewGap > 0 ? 'down' : 'up'
                  }
                : undefined
            }
            className="md:col-span-1"
          />
        </div>
      </div>
    </div>
  );
}
