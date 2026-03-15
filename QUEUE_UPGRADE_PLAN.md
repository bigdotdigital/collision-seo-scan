# Queue Upgrade Plan

Date: 2026-03-15

## Audit Summary

### Current Scan Entrypoints

- public scan submission:
  - [app/api/scan/route.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/app/api/scan/route.ts)
- dashboard refresh path:
  - [app/dashboard/actions.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/app/dashboard/actions.ts)
  - [lib/dashboard-refresh.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/dashboard-refresh.ts)

### Current Scan Orchestration

- main orchestration:
  - [lib/scan-workflow.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/scan-workflow.ts)
- scan engine:
  - [lib/scan-engine.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/scan-engine.ts)
- scan is still executed synchronously inside the public request today

### Current Persistence

- `Scan` rows are created through:
  - [lib/org-data.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/org-data.ts)
- full scan completion and observation writes happen in:
  - [lib/scan-workflow.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/scan-workflow.ts)

### Existing Queue / Job Abstractions

- `QueueJob` model already exists in Prisma
- queue processing already exists for followup emails:
  - [lib/jobs.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/jobs.ts)
  - [app/api/cron/process-queue/route.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/app/api/cron/process-queue/route.ts)

### Existing Cron-Style Routes

- [app/api/cron/process-queue/route.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/app/api/cron/process-queue/route.ts)
- [app/api/cron/rank-snapshot-collect/route.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/app/api/cron/rank-snapshot-collect/route.ts)
- [app/api/cron/benchmark-rollup/route.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/app/api/cron/benchmark-rollup/route.ts)
- [app/api/cron/alert-generate/route.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/app/api/cron/alert-generate/route.ts)
- [app/api/cron/alert-digest-send/route.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/app/api/cron/alert-digest-send/route.ts)
- [app/api/cron/weekly-refresh/route.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/app/api/cron/weekly-refresh/route.ts)

### Existing Observation Writes

Observation helpers already exist in:
- [lib/shop-observations.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/shop-observations.ts)

Current scan completion already writes:
- keyword observations
- review observations
- SERP observations
- site feature observations
- competitor observations
- conversion observations

Rank observations are already written by:
- [lib/rank-snapshot-engine.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/rank-snapshot-engine.ts)

### Current Rate Limiting / Retry Behavior

- request rate limiting exists for public scan and some public actions
- queue retries are minimal today:
  - `QueueJob.attempts`
  - status updates in [lib/jobs.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/jobs.ts)
- no true scan execution retry path yet

### Current Report / Dashboard Dependency on `Scan`

- reports and dashboard still expect a stable `Scan` id and latest saved payload
- this means queued execution should preserve the scan id from submission through completion
- report/dashboard compatibility depends on updating the same queued scan row rather than creating a second scan row later

## Planned Changes

## Files To Add

- [lib/scan-queue.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/scan-queue.ts)
- [lib/scan-job-runner.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/scan-job-runner.ts)
- [lib/shop-graph.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/shop-graph.ts)
- [app/api/cron/daily-observation-refresh/route.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/app/api/cron/daily-observation-refresh/route.ts)
- [OPERATIONS.md](/Users/alexklinger/Desktop/big%20dot%20portfolio/OPERATIONS.md)

## Files To Modify

- [prisma/schema.prisma](/Users/alexklinger/Desktop/big%20dot%20portfolio/prisma/schema.prisma)
- [app/api/scan/route.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/app/api/scan/route.ts)
- [app/api/scan/[scanId]/route.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/app/api/scan/%5BscanId%5D/route.ts)
- [lib/scan-workflow.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/scan-workflow.ts)
- [lib/scan-store.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/scan-store.ts)
- [lib/jobs.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/jobs.ts)
- [app/admin/page.tsx](/Users/alexklinger/Desktop/big%20dot%20portfolio/app/admin/page.tsx)
- [ARCHITECTURE_OVERVIEW.md](/Users/alexklinger/Desktop/big%20dot%20portfolio/ARCHITECTURE_OVERVIEW.md)
- [STACK_CHEAT_SHEET.md](/Users/alexklinger/Desktop/big%20dot%20portfolio/STACK_CHEAT_SHEET.md)

## Prisma Changes Required

1. extend `Scan` with execution lifecycle fields
2. extend `QueueJob` with job lifecycle fields useful for retries and visibility
3. add `ShopGraphEdge`

## Assumptions

- DB-backed queue is the right fit for now because `QueueJob` already exists
- we should preserve the current scan API shape and return a `scanId` immediately
- report routes can tolerate queued/running scans if we expose execution status cleanly
- existing observation helpers should be reused rather than replaced

## Risk Points

1. queued scans must keep the same `scanId`, or the public report flow will break
2. report/dashboard code must not interpret queued scans as completed zero-score scans
3. graph-edge writes must avoid exploding duplicate rows
4. daily observation jobs must batch conservatively and fail safely
5. retries must not duplicate obvious observations or emails
