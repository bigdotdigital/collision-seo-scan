# Stack Cheat Sheet

This is the quick explanation of what each major technology/service does in this repo.

## Core App Stack

- `Next.js`
  The main application framework.
  It serves:
  - public pages
  - dashboard pages
  - report pages
  - API routes

- `React`
  The UI layer inside Next.js.
  It renders the actual components and screens.

- `TypeScript`
  The type system.
  It makes the app safer and easier to maintain.

- `Tailwind CSS`
  Utility-first styling.

- [app/globals.css](/Users/alexklinger/Desktop/big%20dot%20portfolio/app/globals.css)
  The custom design system and global styling layer.

## Database Stack

- `PostgreSQL`
  The actual database technology.

- `Neon`
  The hosted cloud Postgres provider.
  This is where the production-style data lives.

- `Prisma`
  The ORM and schema layer.
  Prisma:
  - defines the database models
  - runs migrations
  - reads/writes data in Neon

- `QueueJob` (DB-backed internal queue)
  Lightweight internal job system stored in Postgres.
  Used for:
  - queued scan execution
  - followup emails
  - daily observation refresh jobs
  - internal background work

- Dedicated worker process
  A separate Node runtime role that polls `QueueJob`, claims work with a lease, executes handlers, and writes results back through Prisma.

## Billing

- `Stripe`
  Handles:
  - checkout
  - subscriptions
  - customer billing portal
  - recurring payments

## Email

- `Resend`
  Primary email delivery service.

- `Nodemailer`
  Fallback / compatibility email layer.

## AI / Enrichment

- `OpenAI`
  Used for AI-assisted enrichment and suggestion logic where useful.

Important:
- AI is not the primary source of truth for measured scan/report data.
- Core measured data should still come from scans, providers, stored observations, and real payloads.

## Browser / Snapshot / Rendering Support

- `Playwright`
  Used for browser automation and page snapshot support.

## How the Pieces Fit Together

The simplest mental model is:

1. `Next.js` runs the app
2. `Prisma` talks to the database
3. `Neon` hosts the PostgreSQL database
4. `Stripe` handles billing
5. `Resend/Nodemailer` handle email
6. `OpenAI` handles some enrichment/suggestion work
7. `Playwright` helps with snapshot/browser-style scan tasks

## One-Paragraph Explanation

> This app is a Next.js + React + TypeScript SaaS product. Prisma is the data-access and schema layer. Neon is the hosted PostgreSQL database. Stripe handles billing. Resend/Nodemailer handle email. Playwright helps with page snapshots and browser-style scan tasks. OpenAI is used for some AI-assisted enrichment, while the core product still relies on real scan data, provider data, and stored observations.
