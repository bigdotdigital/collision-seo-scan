# Public Report Publishing Plan

Date: 2026-03-15

## Goal

Add a public, indexable shop scan publishing layer that:

- uses stable human-readable URLs
- ties pages to canonical `Shop`
- preserves the current scan/report flow
- publishes only quality-controlled summaries
- keeps deeper findings gated

## Current Relevant Architecture

- public report route:
  - [app/report/[scanId]/page.tsx](/Users/alexklinger/Desktop/big%20dot%20portfolio/app/report/%5BscanId%5D/page.tsx)
- canonical shop placeholder route:
  - [app/shops/[placeId]/page.tsx](/Users/alexklinger/Desktop/big%20dot%20portfolio/app/shops/%5BplaceId%5D/page.tsx)
- market placeholder route:
  - [app/markets/[state]/[city]/page.tsx](/Users/alexklinger/Desktop/big%20dot%20portfolio/app/markets/%5Bstate%5D/%5Bcity%5D/page.tsx)
- canonical business model:
  - `Shop`
- event layer:
  - `Scan`

## Planned Schema Changes

### Shop

- `publicProfileSlug`
- `publicProfileOptOutAt`

### Scan

- `publicStatus`
- `publicPublishedAt`
- `publicSummaryJson`

This keeps:
- publishing decision on the scan
- canonical public identity on the shop

## Planned Route

- `/collision-repair-seo-report/[state]/[city]/[shopSlug]`

This route will:
- resolve the canonical shop by slug
- load the most recent published scan for that shop
- render a measured public summary
- noindex if the page is too thin

## Files To Add

- [lib/public-report.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/public-report.ts)
- [app/collision-repair-seo-report/[state]/[city]/[shopSlug]/page.tsx](/Users/alexklinger/Desktop/big%20dot%20portfolio/app/collision-repair-seo-report/%5Bstate%5D/%5Bcity%5D/%5BshopSlug%5D/page.tsx)
- [app/api/public-shop-request/route.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/app/api/public-shop-request/route.ts)

## Files To Modify

- [prisma/schema.prisma](/Users/alexklinger/Desktop/big%20dot%20portfolio/prisma/schema.prisma)
- [lib/scan-workflow.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/scan-workflow.ts)
- [app/shops/[placeId]/page.tsx](/Users/alexklinger/Desktop/big%20dot%20portfolio/app/shops/%5BplaceId%5D/page.tsx)
- [ARCHITECTURE_OVERVIEW.md](/Users/alexklinger/Desktop/big%20dot%20portfolio/ARCHITECTURE_OVERVIEW.md)

## Publishing Rules

Initial publish rule:
- completed scan
- canonical shop present
- not opted out
- enough measured findings to avoid thin content

If a scan does not meet threshold:
- keep it non-public
- do not index

## Public Page Content

Public summary should show:
- shop name
- city/state
- last scanned date
- overall score
- a few measured findings
- premium teaser modules
- claim / request update / request re-scan / opt-out CTA

## Risk Points

1. public pages must stay neutral and measured
2. no speculative or defamatory wording
3. low-quality pages should not be indexed
4. publishing logic must not break the current scan/report pipeline
