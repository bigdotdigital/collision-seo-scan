# Admin Market Intel Plan

## Goal
Build a real Denver market intelligence console at `/admin/markets/denver` using the existing `Shop`, `Scan`, `QueueJob`, `ShopGraphEdge`, and observation tables.

## Files To Add
- `lib/admin-market-console.ts`
- `components/admin-market/market-console.tsx`
- `components/admin-market/shop-intel-drawer.tsx`
- `app/admin/markets/[marketSlug]/page.tsx`

## Files To Modify
- `app/admin/page.tsx`

## Schema Changes
- None planned for this pass.

## Data Sources
- `Market` for canonical market resolution
- `Shop` for entity identity and lat/lng/address/public slug
- `Scan` for latest completed scores and report payloads
- `ShopReviewObservation` for reviews and velocity
- `ShopSiteFeatureObservation` for service-page / CTA / OEM coverage
- `ShopInsuranceRelationshipObservation` for insurer signals
- `ShopGraphEdge` for competitor topology
- `QueueJob` + queue metrics for system operations

## Sections To Implement
- top system metrics
- Denver market map
- top shops leaderboard
- weak SEO / high authority opportunities
- competitor topology
- review velocity
- OEM cert coverage matrix
- system operations
- right-side shop intelligence drawer

## Assumptions
- `denver` resolves to the existing collision `Market` row whose city slug matches `denver`
- latest completed `Scan` is the source of truth for current shop score
- latest review/site-feature observations are sufficient for the first console version
- tactical UI can be implemented with Tailwind and route-local components without touching the dashboard design system

## Risks
- some shops may not have lat/lng, so the market map needs a deterministic fallback layout
- review velocity may be sparse for shops with only one observation
- graph edges may be light in low-density test environments, so topology should degrade cleanly
