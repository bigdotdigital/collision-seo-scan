# Architecture Overview

This document explains the current technical architecture of the collision SEO SaaS so new engineers and other agents can quickly build an accurate mental model.

## One-Sentence Summary

This is a `Next.js + React + TypeScript + Prisma + PostgreSQL` SaaS app for collision-repair SEO scanning, reporting, premium monitoring, and long-term market intelligence.

## The Core Product Model

There are two systems living together in this codebase:

1. The customer-facing SaaS workspace
2. The market-intelligence data platform

That distinction is why the domain model separates `Organization` from `Shop`.

- `Organization`
  The paid workspace/account context a customer logs into.
- `Shop`
  The canonical real-world business entity.
- `Scan`
  A scan event that captures scores, checks, summaries, and raw payload data.

This separation is intentional and important.

Example:
- A competitor can exist in the system as a `Shop` even if they never sign up.
- A paying customer uses an `Organization`.
- Later, that customer can claim or link to an already-known `Shop`.

That model supports both:
- customer dashboards
- long-term benchmark / data products

## Tech Stack

### Frontend

- `Next.js 14`
- `React 18`
- `TypeScript`
- `Tailwind CSS`
- custom design system styles in [app/globals.css](/Users/alexklinger/Desktop/big%20dot%20portfolio/app/globals.css)

### Backend

- Next.js route handlers under [app/api](/Users/alexklinger/Desktop/big%20dot%20portfolio/app/api)
- server-side TypeScript modules in [lib](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib)
- dedicated queue worker entrypoint in [scripts/worker.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/scripts/worker.ts)
- `Prisma` as ORM
- `PostgreSQL` as primary database

### External Services

- `Stripe` for billing and portal management
- `OpenAI` package installed for AI-assisted enrichment/suggestions
- `Resend` and `Nodemailer` for email delivery/fallbacks
- `Playwright` for page snapshots / rendering support
- web/provider fetch logic for local business and search data

## App Layers

The app is easiest to understand as five layers:

### 1. Pages and API Routes

Located in [app](/Users/alexklinger/Desktop/big%20dot%20portfolio/app)

- public marketing and scan pages
- dashboard pages
- report pages
- admin pages
- API routes

### 2. View-State Builders

These assemble page data before rendering.

Examples:
- [lib/dashboard-overview-page.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/dashboard-overview-page.ts)
- [lib/report-page-state.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/report-page-state.ts)

Pattern:
- fetch records
- normalize and derive state
- return a named object for rendering

### 3. Workflows / Orchestration

These coordinate larger business operations.

Examples:
- [lib/scan-workflow.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/scan-workflow.ts)
- [lib/billing-checkout.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/billing-checkout.ts)
- [lib/dashboard-refresh.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/dashboard-refresh.ts)

Pattern:
- validate inputs
- call domain helpers
- save results
- return concise outcomes

### 4. Domain Modules

These contain business logic around scans, shops, billing, reporting, and dashboard intelligence.

Examples:
- [lib/scan-engine.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/scan-engine.ts)
- [lib/shop-data.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/shop-data.ts)
- [lib/dashboard-intelligence.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/dashboard-intelligence.ts)

### 5. Persistence

Modeled in [prisma/schema.prisma](/Users/alexklinger/Desktop/big%20dot%20portfolio/prisma/schema.prisma)

This includes:
- SaaS workspace tables
- scan/report tables
- canonical shop graph
- observation tables
- benchmark tables

## Important User-Facing Flows

### Public Scan Flow

Entry point:
- [app/api/scan/route.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/app/api/scan/route.ts)

Main orchestration:
- [lib/scan-workflow.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/scan-workflow.ts)

Queue layer:
- [lib/scan-queue.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/scan-queue.ts)
- [lib/scan-job-runner.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/scan-job-runner.ts)
- [lib/queue/worker.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/queue/worker.ts)
- [lib/queue/handlers.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/queue/handlers.ts)
- [lib/queue/claim-jobs.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/queue/claim-jobs.ts)

Scan engine:
- [lib/scan-engine.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/scan-engine.ts)

The scan flow:
1. validate and rate-limit the request
2. create a queued `Scan`
3. enqueue a `scan_execute` job
4. dedicated worker process runs the actual scan
5. update the same `Scan` row through queued/running/completed/failed
6. write canonical shop observations and graph edges
7. expose report/dashboard data from the completed scan

The worker uses Postgres-backed leases on `QueueJob` so multiple workers can run without double-processing the same job.

### Report Flow

Entry point:
- [app/report/[scanId]/page.tsx](/Users/alexklinger/Desktop/big%20dot%20portfolio/app/report/%5BscanId%5D/page.tsx)

State builder:
- [lib/report-page-state.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/report-page-state.ts)

Helpers:
- [lib/report-page-helpers.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/report-page-helpers.ts)
- [lib/report-view-model.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/report-view-model.ts)

Important note:
- the free report flow is intentionally preserved
- premium intelligence should layer on top of it, not replace it casually

### Dashboard Flow

Overview:
- [app/dashboard/page.tsx](/Users/alexklinger/Desktop/big%20dot%20portfolio/app/dashboard/page.tsx)
- [lib/dashboard-overview-page.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/dashboard-overview-page.ts)

Premium intelligence:
- [lib/dashboard-intelligence.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/dashboard-intelligence.ts)

The dashboard combines:
- latest workspace scan
- tracked keywords
- tracked competitors
- subscription state
- canonical shop intelligence
- premium module summaries

### Billing Flow

Checkout route:
- [app/api/stripe/create-checkout-session/route.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/app/api/stripe/create-checkout-session/route.ts)

Billing helper:
- [lib/billing-checkout.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/billing-checkout.ts)

Stripe utilities:
- [lib/stripe.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/stripe.ts)

This flow handles:
- session/org resolution
- self-serve account creation
- membership linking
- org seeding from scans
- Stripe customer creation
- checkout session creation

## Data Model

## SaaS / Workspace Entities

- `User`
  Human account
- `OrgMembership`
  Links user to organization
- `Organization`
  Workspace/account
- `Location`
  Workspace location settings
- `Subscription`
  Billing state
- `TrackedKeyword`
  Workspace-tracked keyword
- `TrackedCompetitor`
  Workspace-tracked competitor
- `AlertPreference`
  Notification settings

## Scan / Report Entities

- `Scan`
  Main scan record
- `ScanSnapshot`
  Snapshot history for scans
- `QueueJob`
  Background work queue
- `Lead`
  Funnel/contact capture

## Canonical Market-Intelligence Entities

- `Market`
  Canonical city/region market
- `Shop`
  Canonical business identity
- `BenchmarkSnapshot`
  Materialized benchmark summaries

## Observation Tables

These are the foundation of the data moat.

- `ShopKeywordObservation`
- `ShopReviewObservation`
- `ShopCompetitorObservation`
- `ShopRankObservation`
- `ShopSerpObservation`
- `ShopConversionObservation`
- `ShopSiteFeatureObservation`

These make it possible to answer questions like:
- which shops rank in a market
- which review patterns correlate with rankings
- which site features correlate with stronger visibility
- which markets are under-optimized

There is also now a lightweight graph edge layer:

- `ShopGraphEdge`

Current edge types include:
- `MAP_PACK_COMPETITOR`
- `TRACKED_COMPETITOR`
- `MARKET_COMPETITOR`

## Why `Shop` and `Organization` Are Separate

This is the most important concept for other agents to understand.

`Organization` is the customer workspace.

`Shop` is the real-world business record.

They are related, but not interchangeable.

Why this matters:
- a shop may exist before signup
- a shop may only appear via competitor tracking
- a shop may later sign up and claim its existing record
- competitor tracking grows the market database

If an agent collapses these concepts back together, they will damage the long-term architecture.

## Current Code Organization Principles

We have been refactoring toward a more semantic structure:

- page files should mostly load state and render
- large workflows should live in named `lib/*workflow*` files
- repeated persistence helpers should live in small semantic modules
- UI components should not contain hidden business logic

Recent examples:
- scan flow split into:
  - [lib/scan-pages.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/scan-pages.ts)
  - [lib/scan-market.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/scan-market.ts)
  - [lib/scan-summary.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/scan-summary.ts)
  - [lib/scan-workflow.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/scan-workflow.ts)
- dashboard state extraction:
  - [lib/dashboard-overview-page.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/dashboard-overview-page.ts)
- report state extraction:
  - [lib/report-page-state.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/report-page-state.ts)
- billing extraction:
  - [lib/billing-checkout.ts](/Users/alexklinger/Desktop/big%20dot%20portfolio/lib/billing-checkout.ts)

## Design / UX Principles

Important UI rules in this repo:

- do not present modeled values as measured facts
- preserve honest degraded states
- distinguish `live`, `cached`, `modeled`, `fallback`, and unavailable data
- keep free report flow useful and stable
- premium layers should add deeper strategy, not destroy the base experience

## Security / Operational Notes

Current important protections:
- rate limiting on public scan and lead paths
- idempotent handling on some funnel endpoints
- conflict guards on shop claim flows
- canonical shop matching via normalized host and strong identifiers

Still important for future work:
- browser/manual QA after major UI changes
- stronger abuse controls on public endpoints
- merge/admin review tooling for duplicate shops
- continued truthfulness review for modeled dashboard metrics

## Guidance for Other Agents

If you are another agent working in this repo, follow these rules:

1. Do not rewrite the free scan/report flow unless there is a strong reason.
2. Preserve route compatibility whenever possible.
3. Treat `Shop` and `Organization` as different entities.
4. Prefer adding intelligence as an enrichment layer instead of rewriting the scanner.
5. Put page data assembly in helper/state modules rather than inline route code.
6. Keep UI honest about measured vs modeled data.
7. Do not introduce fake completeness.
8. Reuse existing data sources before inventing new backend requirements.

## Short Explanation for Quick Hand-Off

Use this if you need to brief another agent quickly:

> This repo is a Next.js 14 + React + TypeScript SaaS app backed by PostgreSQL via Prisma. It has a public scan/report flow, an authenticated dashboard/workspace layer, Stripe billing, and a canonical `Shop` + `Market` intelligence model behind the scenes. `Organization` is the customer workspace, `Shop` is the real-world business entity, and `Scan` is the event layer. Observation tables store keyword, review, rank, SERP, conversion, and site-feature data over time so the app can power both customer dashboards and future benchmark/report products.
