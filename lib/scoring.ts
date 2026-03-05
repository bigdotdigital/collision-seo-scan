export function computeScoreV01(input: {
  reviewCount?: number | null;
  reviewRating?: number | null;
  rankPositions?: Record<string, number | null | undefined>;
  hasWebsite?: boolean;
}) {
  const reviews = Math.min(30, Math.max(0, ((input.reviewCount || 0) / 200) * 30));
  const ratingBoost =
    (input.reviewRating || 0) >= 4.6 ? 5 : (input.reviewRating || 0) >= 4.3 ? 3 : 0;

  let rank = 0;
  const ranks = input.rankPositions || {};
  const kws = Object.keys(ranks);
  for (const kw of kws) {
    const pos = ranks[kw];
    if (!pos) continue;
    if (pos <= 3) rank += 15;
    else if (pos <= 10) rank += 8;
    else if (pos <= 20) rank += 3;
  }
  rank = Math.min(40, rank);

  const website = input.hasWebsite ? 20 : 8;
  const gmb = 10;

  const visibilityScore = Math.round(
    Math.min(100, reviews + ratingBoost + rank + website + gmb)
  );

  const componentScores = {
    reviews: Math.round(reviews + ratingBoost),
    rank: Math.round(rank),
    website: Math.round(website),
    gmb: Math.round(gmb)
  };

  return {
    scoringModelVersion: 'v0.1',
    visibilityScore,
    componentScores
  };
}
