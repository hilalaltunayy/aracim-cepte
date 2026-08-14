# Vehicle Intelligence Foundation

## Purpose

TASK-034 derives a small, deterministic intelligence snapshot from a single vehicle's normalized
records. It is a domain layer for future experiences, including TASK-035, not a diagnosis engine,
background job, score dashboard, or AI feature.

```
owner-scoped vehicle data -> facts -> trends -> typed signals -> internal scores -> assistant context
```

## Inputs and scope

The caller supplies an already owner-scoped vehicle plus records, documents, expertise reports and
reminders. The service filters each collection by `vehicleId` again before calculation. It reads no
OCR text, attachment content, attachment bytes, quota/billing state, photo metadata, or account
data. No snapshot or signal is persisted.

Fuel, cost and distance calculations reuse the reports domain. This preserves the TASK-016
historical-odometer rule: inconsistent lower historical odometer events never become travelled
distance.

## Facts, trends and signals

Facts contain neutral values only: document expiry days, latest expertise date, maintenance
recency, recent costs, fuel aggregates, reminder counts and valid distance-derived metrics.
Trends compare the current three calendar-month window with its equivalent prior window.

Typed signals are priority-sorted and use code, domain, severity, bounded confidence, compact
facts and an `explanationKey`; they do not use diagnostic free text. Initial codes cover:

- document expiry and missing expiry information;
- maintenance reminders/recency;
- fuel-consumption and fuel-cost trends;
- recorded-cost and maintenance-cost trends;
- overdue/upcoming reminders; and
- insufficient fuel/distance data.

No manufacturer interval is invented. Maintenance due/overdue signals need an existing periodic
maintenance reminder. Expertise contributes only its normalized existence/date/age; it does not
infer vehicle condition from an attachment.

## Thresholds and scores

`src/features/vehicleIntelligence/config/intelligenceConfig.ts` is the single configuration point
for expiry/reminder windows, trend bands, minimum fuel evidence, score weights and severity
penalties. The internal 0–100 scores are maintenance, documents, fuel efficiency, cost and a
weighted overall score. Scores are not shown in TASK-034.

Unavailable data produces an unavailable (`null`) domain score rather than zero. The overall score
reweights only available domains, and all confidence values remain bounded from 0 to 1.

## TASK-035 context contract

`buildVehicleAssistantContext(snapshot)` exposes only normalized, vehicle-scoped facts,
data-quality state and the five highest-priority signals. It intentionally excludes raw source
records, plates, OCR text, notes, document contents and attachments. It does not call an LLM or
any external provider.

## Operational constraints

Snapshots are calculated only when requested by a future consumer; there is no polling, timer,
background processing or database migration. The current reports, Home, reminder scheduling and
all user-facing screens remain unchanged. Future user-facing explanations must retain
non-diagnostic language and disclose insufficient data rather than presenting an unknown metric as
zero.
