# Operations

This repo now has a DB-backed scan queue and daily observation refresh jobs.

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

## Key Queue Files

- [app/api/scan/route.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/app/api/scan/route.ts)
- [lib/scan-queue.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/scan-queue.ts)
- [lib/scan-job-runner.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/scan-job-runner.ts)
- [app/api/cron/process-queue/route.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/app/api/cron/process-queue/route.ts)
- [lib/jobs.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/jobs.ts)

## Queue Job Types

- `scan_execute`
  Runs the actual queued scan
- `followup_email`
  Sends post-report followup email
- `dashboard_support_ticket`
  Existing support ticket queue entry

## Cron Routes

- [app/api/cron/process-queue/route.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/app/api/cron/process-queue/route.ts)
  Processes queued scans and due followup emails

- [app/api/cron/daily-observation-refresh/route.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/app/api/cron/daily-observation-refresh/route.ts)
  Runs:
  - daily review observation refresh
  - tracked competitor graph edge refresh
  - rank snapshot collection

- [app/api/cron/benchmark-rollup/route.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/app/api/cron/benchmark-rollup/route.ts)
  Rebuilds benchmark snapshots

## Required Secret

- `CRON_SECRET`

Cron routes expect:
- header `x-cron-secret: <CRON_SECRET>`

## Recommended Schedule

- `process-queue`
  every 1 minute

- `daily-observation-refresh`
  once daily during low-traffic hours

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

## Retry Behavior

- queue jobs track `attempts` and `maxAttempts`
- failed scan jobs are rescheduled automatically until `maxAttempts`
- scan-linked observations are cleared before retry writes, to reduce duplicate artifacts

## Daily Observation Coverage

Current daily refresh includes:
- review snapshots for known shops via Google Places
- tracked competitor graph edges
- rank snapshot collection through the existing rank pipeline

Current limitation:
- daily non-manual SERP/map-pack refresh is still partial and should be extended using existing provider logic rather than bolting on a parallel system
