# CTO Review Workflow

This document defines how to use an external model such as Mistral as a CTO/reviewer for this codebase without creating conflicting implementations or more technical debt.

## Purpose

Use the external model for:
- architecture review
- bug finding
- backend/data-flow critique
- edge-case analysis
- acceptance criteria

Do not use the external model as a second independent builder working in parallel on the same feature.

## Roles

### CTO / Reviewer Model

The reviewer model is responsible for:
- identifying architectural weaknesses
- flagging correctness risks
- spotting stale-data and fallback problems
- identifying security issues
- proposing tighter acceptance criteria
- reviewing diffs and changed files

The reviewer model is not responsible for:
- rewriting the whole app
- inventing new product direction every cycle
- generating parallel implementations for the same feature

### Builder / Implementer

The builder is responsible for:
- making code changes in the actual repo
- integrating with the real architecture
- preserving route and payload compatibility where required
- running builds/tests
- shipping the final implementation

## Operating Rules

1. One source of implementation truth

Only one model should produce the implementation that lands in the repo for a given change set.

2. Review real artifacts

The reviewer should inspect:
- real files
- real diffs
- real screenshots
- real logs

Avoid asking for review based on vague summaries alone.

3. Structured output only

The reviewer should return findings in a strict format, not broad brainstorming.

4. No praise, no fluff

The point of review is defect detection, risk reduction, and architectural clarity.

5. Preserve existing system constraints

Reviews should assume:
- current routes stay stable unless there is a strong reason to change them
- current payload compatibility should be preserved where possible
- fake data should not be presented as live data
- honest degraded states are better than synthetic placeholder states

6. Builder validates before merge

A review finding is not automatically correct. The builder still has to validate it against:
- the current codebase
- actual runtime behavior
- existing data models

## Standard Workflow

### Loop A: Feature Build

1. Builder implements the change locally.
2. Builder generates a focused diff or file set.
3. Reviewer inspects that diff.
4. Reviewer returns findings and acceptance criteria.
5. Builder applies valid changes.
6. Builder runs build/test verification.
7. Ship.

### Loop B: Bug Investigation

1. Capture:
   - failing route
   - screenshot
   - scan ID or record ID
   - logs if available
2. Builder traces the relevant code path.
3. Reviewer inspects the code path or patch.
4. Reviewer returns:
   - likely root cause
   - missing guardrails
   - better fallback behavior
5. Builder implements fix and verifies.

### Loop C: Architecture Review

1. Provide reviewer with:
   - file list
   - current behavior
   - intended behavior
   - constraints
2. Reviewer returns:
   - risks by severity
   - recommended architecture adjustments
   - migration or sequencing advice
3. Builder applies only what is justified by the actual codebase and product stage.

## Review Input Template

Use this when sending work to the reviewer:

```text
You are acting as CTO/reviewer for a vertical SaaS codebase.

Context:
- Product: collision shop SEO scanner + monitoring dashboard
- Stack: Next.js 14 App Router, Prisma, Postgres/Neon, Tailwind
- Goal: review implementation quality, not rewrite the whole app

Task:
Review the attached file(s) or diff.

Focus on:
1. architectural weaknesses
2. correctness risks
3. stale/cache risks
4. fake vs live data presentation risks
5. security concerns
6. scalability concerns
7. cleaner implementation direction

Constraints:
- preserve current routes
- preserve payload compatibility where possible
- avoid fake data
- prefer production-safe patterns
- avoid large rewrites unless clearly necessary

Return output in this exact format:

## Findings
- Severity: high|med|low
- File:
- Problem:
- Why it matters:
- Recommended fix:

## Architecture Notes
- short bullets only

## Acceptance Criteria
- concrete, testable bullets only
```

## Diff Review Template

Use this for reviewing a patch:

```text
Review this diff like a CTO.

Focus on:
- data correctness
- failure modes
- stale/cache risks
- whether fallbacks are honest
- whether the UI could misrepresent modeled data as live
- whether this increases or reduces technical debt

Do not praise.
Do not summarize vaguely.
Be specific.
```

## Screenshot / UX Review Template

Use this when the issue is visual or report-output quality:

```text
Review this screenshot as a product/CTO reviewer.

Identify:
- places where the UI misrepresents the backend state
- fake or placeholder-seeming data
- confusing hierarchy
- broken affordances
- layout problems caused by bad component logic rather than just styling

Return:

## Findings
- Severity:
- Area:
- Problem:
- Why it matters:
- Recommended fix:

## UX Risks
- short bullets only

## Acceptance Criteria
- concrete, testable bullets only
```

## What Good Review Looks Like

Good review output:
- points to exact files or sections
- distinguishes measured vs modeled vs fallback data
- suggests small, coherent changes
- gives testable acceptance criteria
- avoids feature sprawl

Bad review output:
- “rewrite everything”
- “make it more scalable” with no specifics
- new product ideas unrelated to the change under review
- generic praise with no defects

## Merge Gate

Before shipping a reviewed change, the builder should confirm:

- build passes
- changed routes render
- fallback states are honest
- no placeholder competitor or keyword data is shown as live
- any modeled values are labeled clearly
- no user-specific data leaks across accounts

## Current Product Priorities

When in doubt, optimize for these in order:

1. data correctness
2. honest fallback behavior
3. clean report readability for shop owners
4. stable onboarding and account flows
5. dashboard usefulness
6. monetization polish

## Practical Rule

If the reviewer and builder disagree, prefer:
- the code path that can be tested now
- the implementation that reduces fake outputs
- the smaller change that improves correctness first

Correctness before sophistication.
