# Collision SEO Scan SaaS (Phase 1.5)

A fast, client-closing SaaS-style app for collision shops:
- public scan + report
- booking + lead capture
- admin conversion flow
- lightweight client portal
- in-app queue + cron endpoints

## Stack
- Next.js 14 App Router + TypeScript
- TailwindCSS
- Prisma
- SQLite in dev (`DATABASE_URL=file:./dev.db`)
- Easy switch to Postgres in prod by changing Prisma datasource URL/provider

## Core Flows
1. Public scan (`/` or `/scan`)
2. Report (`/report/[scanId]`) with score, issues, money keywords, competitor snapshot, impact model, 30-day plan
3. Booking flow (`/thanks/[scanId]`) with tracked Calendly URL
4. Admin (`/admin`) converts lead scans into clients
5. Client portal (`/login`, `/dashboard`, `/dashboard/rankings`, `/dashboard/competitors`, `/dashboard/alerts`, `/dashboard/billing`, `/dashboard/settings`)
6. Weekly refresh + queue processing via cron endpoints

## Setup
1. Install:
```bash
npm install
```

2. Env:
```bash
cp .env.example .env
```

3. Set required vars in `.env`:
- `ADMIN_PASSWORD`
- `CRON_SECRET`

Optional but recommended:
- `NEXT_PUBLIC_BASE_URL=http://localhost:3000`
- `CALENDLY_LINK`
- `SALES_PHONE`
- `SMTP_*`
- `OPENAI_API_KEY`
- `SERP_API_KEY`
- `KEYWORD_API_KEY` or `GOOGLE_ADS_KEY`

4. Prisma client:
```bash
npm run prisma:generate
```

5. Create DB schema (if first run):
```bash
npx prisma db push
```

6. Start app:
```bash
npm run dev
```

## Development Workflow
- Use [CTO_REVIEW_WORKFLOW.md](/Users/alexklinger/Desktop/big dot portfolio/CTO_REVIEW_WORKFLOW.md) when you want an external model such as Mistral to act as reviewer/CTO.
- Recommended split:
  - external model = architecture/review/findings
  - builder in this repo = implementation/testing/shipping
- Review real files, diffs, screenshots, and logs instead of vague summaries.
- Keep one implementation source of truth in this repo.

Care is in the mainframe somewhere, even when the stack is loud.

## Scripts
- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run smoke:scan`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run prisma:push`

## Cron Endpoints
Use `POST` with header `x-cron-secret: <CRON_SECRET>`.

- Weekly snapshot refresh:
`/api/cron/weekly-refresh`

- Queue processor (24h lead follow-up emails):
`/api/cron/process-queue`

- Rank snapshot collector (dashboard scaffold):
`/api/cron/rank-snapshot-collect`

- Alert generation (dashboard scaffold):
`/api/cron/alert-generate`

- Alert digest sender (dashboard scaffold):
`/api/cron/alert-digest-send`

Example:
```bash
curl -X POST http://localhost:3000/api/cron/weekly-refresh \
  -H "x-cron-secret: your-secret"
```

## Graceful Fallbacks
- No SMTP: emails are logged and app continues.
- No OpenAI key: deterministic summary template.
- No SERP key: competitor cards remain stable with teardown note.
- No keyword API key: volume/CPC shown as unknown.
- No ranking connector: dashboard stores "not configured" ranking placeholders.

## Data Notes (SQLite)
Prisma + SQLite in this environment stores JSON payloads as serialized `String` fields (`issuesJson`, `rawChecksJson`, etc.) to keep local dev stable.

## Main Routes
Public:
- `/`
- `/scan`
- `/report/[scanId]`
- `/thanks/[scanId]`

Client portal:
- `/login`
- `/dashboard`
- `/dashboard/rankings`
- `/dashboard/competitors`
- `/dashboard/alerts`
- `/dashboard/billing`
- `/dashboard/settings`
- `/dashboard/keywords`
- `/dashboard/reviews`
- `/dashboard/reports`

Admin:
- `/admin`
- `/admin/client/[clientId]`

## One-Click Demo Client
From `/admin`, click `Seed demo client` to generate a demo account, baseline scan, keywords, and snapshot.
Click `Reset demo client` to delete the current demo client data and recreate it from scratch.
Default credentials:
- Email: `demo@collisionseoscan.local`
- Password: `demo1234`

Override with env vars:
- `DEMO_CLIENT_EMAIL`
- `DEMO_CLIENT_PASSWORD`
- `DEMO_CLIENT_CITY`
- `DEMO_CLIENT_SHOP`
- `DEMO_CLIENT_SITE`
