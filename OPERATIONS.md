# Operations

This repo now has a DB-backed scan queue, a dedicated worker entrypoint, and daily observation refresh jobs.

## Scan Execution Model

Public scans no longer run the full website audit inline inside the request.

Current flow:

1. public request creates a queued `Scan`
2. a `QueueJob` of type `scan_execute` is created
3. the queue worker processes the job
4. the same `Scan` row is updated to:
   - `queued`
   - `running`
   - `completed`
   - `failed`

Important:
- the report URL is created immediately and stays stable
- report pages can now show queued/running/failed states

## Runtime Roles

- `npm run start:web`
  Runs the Next.js app for web/API/report/dashboard traffic.

- `npm run start:worker`
  Runs the long-lived queue worker process that drains `QueueJob`.

The web app and worker share the same database and business logic, but they are separate runtime roles.

## Key Queue Files

- [app/api/scan/route.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/app/api/scan/route.ts)
- [lib/scan-queue.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/scan-queue.ts)
- [lib/scan-job-runner.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/scan-job-runner.ts)
- [lib/queue/worker.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/queue/worker.ts)
- [lib/queue/handlers.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/queue/handlers.ts)
- [lib/queue/claim-jobs.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/queue/claim-jobs.ts)
- [scripts/worker.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/scripts/worker.ts)
- [app/api/cron/process-queue/route.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/app/api/cron/process-queue/route.ts)
- [lib/jobs.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/jobs.ts)

## Queue Job Types

- `scan_execute`
  Runs the actual queued scan
- `followup_email`
  Sends post-report followup email
- `dashboard_support_ticket`
  Existing support ticket queue entry
- `daily_observation_refresh`
  Refreshes review snapshots and tracked competitor graph edges
- `rank_snapshot_collect`
  Collects rank snapshots through the existing rank pipeline

## Cron Routes

- [app/api/cron/process-queue/route.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/app/api/cron/process-queue/route.ts)
  Manual/fallback queue tick for draining jobs on demand

- [app/api/cron/daily-observation-refresh/route.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/app/api/cron/daily-observation-refresh/route.ts)
  Schedules:
  - `daily_observation_refresh`
  - `rank_snapshot_collect`

- [app/api/cron/benchmark-rollup/route.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/app/api/cron/benchmark-rollup/route.ts)
  Rebuilds benchmark snapshots

## Required Secret

- `CRON_SECRET`

Cron routes expect:
- header `x-cron-secret: <CRON_SECRET>`

## Recommended Schedule

- `worker`
  always on

- `daily-observation-refresh`
  once daily during low-traffic hours to enqueue daily work

- `benchmark-rollup`
  once daily after observation refresh completes

- `rank-snapshot-collect`
  optional separate run if you want a dedicated schedule beyond the daily bundle

## What To Watch

Admin page now shows:
- queued scans
- running scans
- failed scans
- completed scans
- recent queue jobs

Use [app/admin/page.tsx](/Users/alexklinger/Desktop/big%20dot%20portfolio/app/admin/page.tsx) as the first operational check.

## Queue Safety

- jobs are claimed with a lease (`lockedAt`, `lockOwner`)
- stale processing jobs can be reclaimed if a worker dies
- the worker refreshes the lease while long jobs run
- the worker shuts down gracefully on `SIGTERM` / `SIGINT`

## Retry Behavior

- queue jobs track `attempts` and `maxAttempts`
- failed scan jobs are rescheduled automatically until `maxAttempts`
- scan-linked observations are cleared before retry writes, to reduce duplicate artifacts

## Recommended Worker Env Vars

- `QUEUE_BATCH_SIZE`
- `QUEUE_POLL_INTERVAL_MS`
- `QUEUE_LEASE_MS`
- `QUEUE_HEARTBEAT_MS`
- `WORKER_ID`

## Daily Observation Coverage

Current daily refresh includes:
- review snapshots for known shops via Google Places
- tracked competitor graph edges
- rank snapshot collection through the existing rank pipeline

Current limitation:
- daily non-manual SERP/map-pack refresh is still partial and should be extended using existing provider logic rather than bolting on a parallel system
