export function isLikelyNonShopCompetitor(name?: string | null, websiteUrl?: string | null): boolean {
  const sample = `${name || ''} ${websiteUrl || ''}`.toLowerCase();
  return /(yelp|yellowpages|facebook\.com|mapquest|bbb\.org|foursquare|manta\.com|chamberofcommerce|angi|yellowbook)/.test(
    sample
  );
}

