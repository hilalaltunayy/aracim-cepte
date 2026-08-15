# EPDK fuel-price foundation

**Repository implementation date:** 2026-08-15
**Production status:** Disabled; local source and fixture tests only

## Purpose and scope

TASK-039 adds a provider-independent fuel-reference boundary. It does not make a live price claim.
Every normalized EPDK value is labelled an **estimated reference**: it may be province/brand or
province-level data, but is not a confirmed price at a user's specific station, district or pump.

The official source catalog currently lists province-based petrol XML at
`https://lisansws.epdk.gov.tr/services/bildirimPetrolAkaryakitFiyatlari` and province-based LPG XML
at `https://lisansws.epdk.gov.tr/services/bildirimLPGTarife`. The EPDK catalog describes the petrol
province request as `sorguNo=72` with a province traffic code. Source-format compatibility must be
rechecked against the official catalog before live enablement.

## Architecture

`EpdkXmlSource` -> `EpdkFuelPriceProvider` -> normalized `FuelPriceProvider` contract -> bounded
`FuelPriceReferenceCache` -> explicit Smart Fuel suggestion.

The mobile form never calls EPDK directly. Its default `FuelPriceReferenceLookup` is disabled. A
future approved trusted backend/cache adapter can implement that lookup without leaking EPDK XML
types into the application. The provider request contract contains only province code/name,
supported fuel type and optional normalized brand; it contains no identity, plate, notes, OCR,
attachments or vehicle history.

The normalized contract carries source, fuel type, province, mapped/raw brand, TRY price,
effective/fetched dates, freshness, province/brand granularity and `isEstimatedReference: true`.
İstanbul Anadolu and İstanbul Avrupa are separate normalized province identities. Unsupported fuel
types and unreliable brand matches are omitted rather than guessed.

## Smart Fuel precedence

The existing two-of-three deterministic calculation remains the only calculation rule. Reference
prices do not save records or silently change values.

1. User-confirmed receipt/input
2. OCR-confirmed receipt value
3. User-entered manual value
4. Explicitly accepted EPDK reference
5. Unknown

When a reference is made available through a future approved path, the user selects a province and
explicitly requests one lookup. The card says `EPDK referans fiyatı`, explains that a station pump
price can differ, and allows `Referans fiyatı kullan`. With total-only input, it can calculate an
estimated litre quantity. A known/confirmed price is never overwritten; users can still overwrite a
previously accepted estimate normally.

## Cache and freshness

The in-memory cache has no polling, app-start fetch or per-row requests. It is used only by a future
explicit lookup action. Freshness is derived from `fetchedAt`: current up to 24 hours, recent up to
72 hours, then stale. A stale value remains visibly stale and must not be presented as current.
Persistence is intentionally absent, so no migration is required.

## Production gate and future boundaries

`FUEL_PRICE_REFERENCE_AVAILABILITY` is fail-closed. Enablement requires dated written review of
commercial reuse, attribution, cache rules, rate limits, reliability and display/redistribution
conditions. TASK-039 did not enable real EPDK traffic, deploy an Edge Function, add a database cache
or change a tester build.

`FuelPriceAlertRuleInput` and `FuelPriceAssistantToolInput` are types only. Future alerts need a
separate approved scheduler; future AI explanations must call a trusted `FuelPriceProvider` tool,
never EPDK directly. Smart Trips will additionally need independent Places and Routing providers;
EPDK does not provide station coordinates, route, hours or nearby-station facts.

## Manual acceptance after freeze

- Confirm official service schema, request method and province/İstanbul behavior with a non-user
  test query.
- Complete legal/operational reuse review and configure attribution/cache/rate limits.
- Implement and deploy a trusted cache/Edge lookup only after approval.
- Verify the physical Android province picker, unavailable state, reference estimate and manual/OCR
  precedence without changing the existing Smart Fuel flow.
