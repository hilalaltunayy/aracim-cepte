# RESEARCH-001 — Turkish Fuel Price Data Feasibility

**Status:** IMPLEMENTED — AWAITING HUMAN SOURCE-USE DECISION
**Owner:** Codex
**Created:** 2026-08-13
**Updated:** 2026-08-13

## Goal

Assess whether live Turkish fuel-price data can be obtained safely and sustainably for a future
`FuelPriceProvider`, without implementing a runtime integration.

## Background / current state

The post-V1 roadmap lists live fuel prices and Smart Trips as future work. No production fuel-price
provider, scraper, credentials, runtime code, or provider-specific dependency exists in this task.

## Scope

- Public, low-volume inspection of Opet, Petrol Ofisi, Aytemiz, EPDK, Google Maps Platform and
  TomTom documentation/pages.
- One research note with source status, operational risk, data-shape feasibility and next decision.

## Out of scope / do not change

- Application code, dependencies, Supabase, secrets, scraping, polling, production integration,
  authentication/access-control bypass, build, deploy, merge, or `main`.

## Acceptance criteria

- [x] Each requested supplier is classified as documented public API, website-internal endpoint,
  embedded/static data, or undetermined.
- [x] Reuse and operational risks are documented separately from technical accessibility.
- [x] Official/clearly licensed alternatives and the provider-abstraction recommendation are recorded.
- [x] No runtime or infrastructure change is made.

## Risks and security/privacy impact

Using unlicensed website content, treating recommended provincial prices as station truth, exposing
provider credentials, or bulk polling an internal endpoint would be unacceptable. This research uses
no user data and does not add credentials or telemetry.

## Implementation steps

1. Inspect each public price page and its observable data-loading behavior with sample-only reads.
2. Inspect official documentation, terms and robots guidance where publicly available.
3. Record an evidence-bound recommendation in `docs/research/fuel-price-data-feasibility.md`.
4. Review the documentation-only diff and commit it on `research/fuel-price-data`.

## Validation commands

```powershell
git diff --check
git status --short
```

## Manual / human decisions

- Obtain written commercial reuse permission and an SLA from any supplier before a provider website
  or internal endpoint is used in production.
- Decide whether EPDK's official XML service is sufficient for the product's locality/brand needs.
- Validate Google Places `fuelOptions` availability and cost for representative Turkish stations with
  a properly configured project before treating it as a candidate.

## Rollback strategy

This task adds only documentation. Reverting its single documentation commit removes the research
note without changing runtime or remote state.

## Completion report

**Completed:** Public source research, risk classification and source-agnostic recommendation.
**Skipped:** Runtime implementation, broad tests, build, deploy, scraping/polling and PR merge.
**Failed:** None.
**Manual verification required:** Legal/commercial source-use approval and paid-provider coverage/cost
validation.
