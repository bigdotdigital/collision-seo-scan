# Aaron Swartz Style Guide

This guide is a local coding reference for this repo.

It is not a claim that this codebase should imitate Aaron Swartz's Python literally.
It is a guide to the recurring fingerprints visible across his public GitHub code:
small files, direct names, explicit control flow, and code that reads like a plain explanation.

## Scope

Reviewed from Aaron Swartz's public GitHub repositories, using the public repo inventory and direct source reads from representative repos.

Public non-fork repo inventory reviewed:

- `aaronsw.github.com`
- `chdns`
- `commentsareclosed`
- `ghcontest`
- `html2text`
- `htmldiff`
- `https-everywhere`
- `metamake`
- `pybandit`
- `pytorctl`
- `rtask`
- `sanitize`
- `tor2web`
- `torperf`
- `try_git`
- `watchdog`

Representative source files inspected directly:

- `watchdog/webapp.py`
- `watchdog/blog.py`
- `html2text/html2text.py`
- `chdns/chdns.py`
- `commentsareclosed/app.py`

## Core principles

### 1. Name things like you mean them

Use names that explain the job without translation.

Good:

- `refreshOrganizationScan`
- `findExistingShop`
- `buildMapsAuthoritySummary`

Bad:

- `processThing`
- `handleData`
- `manager`
- `util2`

Rule:

- Prefer a longer exact name over a short vague name.
- File names should describe the main responsibility, not the layer or fashion of the month.

### 2. Let the route tell a simple story

A route or page should mostly do four things:

1. get data
2. normalize or derive state
3. choose the response
4. render or return it

If a route is doing more than that, move logic into a helper with an obvious name.

### 3. Use small helpers with one job

Aaron's code repeatedly breaks logic into very plain functions:

- `hn`
- `onlywhite`
- `google_list_style`
- `list_numbering_start`

The lesson is not "make everything tiny".
The lesson is "each helper should have one sentence of purpose".

Good helper test:

- you can describe it in one line
- it has a narrow input/output contract
- it removes mental load from the caller

### 4. Prefer direct control flow over abstraction theater

Do not add layers just to sound architectural.

Prefer:

- simple conditionals
- early returns
- small transformations
- visible data flow

Avoid:

- generic manager classes
- wrappers that only rename arguments
- giant config-driven logic for small problems
- indirection that hides what actually happens

### 5. Data transforms should read plainly

If a function shapes data, it should be obvious what comes in and what comes out.

Good:

- `parseMoneyKeywords`
- `buildVisibilitySegments`
- `buildSourceConfidenceState`

Bad:

- one giant route-local block with ten anonymous transformations

### 6. Keep state honest

The repo already needs this for product truthfulness.
The style guide reinforces it:

- measured data should be labeled as measured
- modeled data should be labeled as modeled
- cached data should be labeled as cached
- missing data should be shown as unavailable, not guessed silently

Code should make this distinction explicit in names and output shapes.

Good names:

- `modeledPageSpeedFromScan`
- `premiumEntitlement`
- `hasKeywordVolume`

Bad names:

- `score`
- `value`
- `result`

when the real state is mixed or uncertain.

### 7. Fewer giant files

Aaron's code is often dense, but the responsibilities are still easy to locate.
For this repo:

- routes should not own every transform
- one file should not mix identity resolution, merges, observation writes, and reporting

Split by job:

- `shop-core`
- `shop-merge`
- `shop-observations`

That is the right pattern.

### 8. Comments should explain the non-obvious, not narrate the obvious

Avoid commentary like:

- `// set variable`
- `// loop through items`

Use comments only when they tell the reader something the code itself does not.

Good:

- why cache is reused
- why a fallback exists
- why a merge is blocked

### 9. Prefer simple data structures

Aaron's code repeatedly leans on plain lists, dicts, tuples, and direct objects.
For this repo that means:

- plain typed objects for dashboard view models
- plain helper return values
- avoid over-designed classes unless lifecycle/state really demands it

### 10. Make reading easier than writing

This is the standard:

- the next person should understand the file in one pass
- semantic names beat clever code
- explicit beats compressed
- readable structure beats abstract purity

## Practical rules for this repo

### Routes and pages

- A route should fetch, derive, and render.
- If the route grows a second brain, move it out.
- Keep page-specific shaping in a helper file named for that page or domain.

Examples:

- `lib/dashboard-overview.ts`
- `lib/report-page-helpers.ts`
- `lib/dashboard-refresh.ts`

### Domain modules

Split by responsibility, not by generic layer words.

Good:

- `shop-core.ts`
- `shop-merge.ts`
- `shop-observations.ts`
- `dashboard-intelligence.ts`

Bad:

- `helpers.ts`
- `managers.ts`
- `services.ts`

unless the file really is narrowly scoped and singular.

### UI components

- Components should mostly format and render.
- Business logic belongs in helpers unless it is trivial and local.
- Props should be concrete and semantic.

Good:

- `title`
- `subtitle`
- `badge`
- `highLevelGaps`
- `actionSuggestions`

Bad:

- `data`
- `payload`
- `info`

### Naming

Prefer verbs for actions:

- `refreshDashboardData`
- `claimShopForOrganization`
- `recordReviewObservation`

Prefer nouns for computed state:

- `competitorGap`
- `mapsAuthority`
- `revenueLeak`

### Error handling

Use fail-closed logic for identity and billing-sensitive paths.

Good:

- throw on conflicting shop claim
- block merges on conflicting host or place id
- return unavailable instead of inventing values

## Style fingerprints observed

These patterns showed up repeatedly across the reviewed public repos:

- Plain imports, little ceremony
- Flat helper functions
- Direct conditional branches
- Strong preference for concrete names
- Minimal "framework voice"
- Files that read like executable prose
- Business logic exposed instead of hidden behind abstraction jargon

## What not to imitate literally

Some older code patterns are historical, not goals:

- Python 2 compatibility shims
- multiple imports on one line
- inconsistent indentation styles from older code
- global mutable settings as a default design

We are borrowing the clarity, not the dated syntax.

## Translation into current TypeScript

The modern equivalent of the Swartz style in this repo is:

- explicit types
- small semantic modules
- thin route files
- direct server actions
- honest output labels
- fewer "meta" abstractions

## Standard for future changes

Before shipping a new file or function, ask:

1. Is the name exact?
2. Can a human understand the flow in one pass?
3. Is the responsibility narrow?
4. Is the output honest about uncertainty?
5. Would this still make sense a year from now?

If the answer is no, simplify it.
