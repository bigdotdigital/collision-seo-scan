# Worker Upgrade Plan

## Audit

Current queue entrypoints:
- public scan submission: [app/api/scan/route.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/app/api/scan/route.ts)
- fallback queue draining: [app/api/cron/process-queue/route.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/app/api/cron/process-queue/route.ts)
- daily observation refresh: [app/api/cron/daily-observation-refresh/route.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/app/api/cron/daily-observation-refresh/route.ts)

Current orchestration:
- scans create `QueueJob(type=scan_execute)` rows
- cron route calls `processQueuedScans()` and `processFollowupQueue()`
- claim logic lives in [lib/scan-queue.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/scan-queue.ts)
- heavy scan handler lives in [lib/scan-job-runner.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/scan-job-runner.ts)
- daily observation route still executes work inline

Persistence and dependencies:
- scan lifecycle state lives on `Scan`
- queue state lives on `QueueJob`
- successful scans write canonical observations through [lib/shop-observations.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/shop-observations.ts)
- scan completion also writes graph edges through [lib/shop-graph.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/shop-graph.ts)
- report/dashboard pages depend on `Scan` shape and expect `executionStatus`

Current risk points:
- queue execution still depends on request-style cron triggers
- claiming is "find then update", which is vulnerable to races under multiple workers
- no dedicated worker process or graceful shutdown path
- daily jobs are not yet scheduled through the queue

## Implementation

Files to add:
- `lib/queue/claim-jobs.ts`
- `lib/queue/handlers.ts`
- `lib/queue/metrics.ts`
- `lib/queue/worker.ts`
- `scripts/worker.ts`

Files to modify:
- `prisma/schema.prisma`
- `lib/scan-queue.ts`
- `lib/scan-job-runner.ts`
- `lib/jobs.ts`
- `app/api/cron/process-queue/route.ts`
- `app/api/cron/daily-observation-refresh/route.ts`
- `app/admin/page.tsx`
- `package.json`
- `OPERATIONS.md`
- `ARCHITECTURE_OVERVIEW.md`
- `STACK_CHEAT_SHEET.md`

Migration required:
- add `QueueJob.lockedAt`
- add `QueueJob.lockOwner`
- add index for stale lease lookup

Assumptions:
- Postgres-backed queue remains the source of truth for now
- one or more dedicated Node workers will run the poll loop
- cron routes remain as manual/fallback triggers and for scheduling recurring queue work

Primary risk points:
- reclaiming stale processing jobs without duplicate execution
- keeping long scan jobs leased while they run
- preserving current scan/report/dashboard behavior while moving execution out of cron
