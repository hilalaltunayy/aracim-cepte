# Deterministic assistant fallback — plan (NOT implemented)

Prepared for the case where the next real Gemini test still fails and we need a
release-safe Vehicle Assistant. **Nothing in this document is implemented yet.**

## Verdict

**Yes — this can ship as one isolated commit.** The architecture already
supports it; almost nothing new is required.

## Why it is already almost free

`VehicleAssistantResult.source` is already `'provider' | 'local'`, and the
`'local'` path already exists and already consumes **zero** quota:

- `classifyQuestion()` returns deterministic local answers for out-of-domain and
  live-data questions and returns **before** `reserveQuota`.
- `applyDeterministicSafety()` already synthesises a grounded safety answer that
  overrides provider content.
- `loadVehicleAssistantContext()` already produces the typed
  `VehicleAssistantContext` (maintenance/document/fuel/cost/reminder facts,
  trends, `highPrioritySignals`, `dataQuality`).
- `canonicalEvidenceCodes(context)` already yields the allowlisted evidence codes
  and `normalizeVehicleAssistantEvidence()` rebuilds human labels from trusted
  context.

So the fallback is a **new pure function over data we already compute**, plus one
branch. No new dependency, no network call, no schema or migration, no
entitlement change.

## Scope of the one commit

1. `supabase/functions/_shared/deterministicAssistantAnswer.ts` (new, pure):
   `buildDeterministicAssistantAnswer(context, question): VehicleAssistantResponse | null`
   - Routes the question to an intent using the same keyword families
     `classifyQuestion` already uses (maintenance / fuel / cost / reminders /
     documents / general).
   - Emits a short Turkish summary composed **only** from typed facts and
     `highPrioritySignals`; every claim carries an evidence entry whose
     `factCode` is in the allowlist.
   - Returns `null` when the context is too thin to say anything true — the
     caller then keeps today's honest failure message.
   - `severity` from the existing signal severities; `safetyEscalation` still
     decided by `applyDeterministicSafety`.
2. `vehicleAssistantHandler.ts`: in the two failure paths (provider missing, and
   the `catch` after a provider error) try the fallback **after** releasing any
   reservation, and return `source: 'local'` with `quotaState(await getQuota())`.
   If the fallback returns `null`, throw the existing 503 exactly as today.
3. Client: label a `source === 'local'` answer, e.g.
   *"Bu özet, yapay zekâ olmadan kendi kayıtlarınızdan üretildi."* — the bubble
   must not read as a Gemini answer.
4. Tests: fallback used on provider failure → `release` called, `commit` not
   called, `source === 'local'`; thin context → still 503; evidence codes stay
   inside the allowlist; no provider call on the fallback path.

Estimated size: one new ~150-line pure module, ~15 lines in the handler, ~5 in
the UI, plus tests. Nothing outside `_shared` + the assistant screen.

## Rules honoured

| Rule | How |
| --- | --- |
| Never present fallback output as Gemini | `source: 'local'` (already in the contract) + explicit UI label |
| Provider failure must not consume AI quota | Fallback runs only after `releaseQuota`, returns without `commitQuota`; usage still comes from committed rows only |
| No fake Premium entitlement | Untouched; entitlement stays server-authoritative from `user_entitlements` |
| No network dependency | Pure function over the already-loaded context |
| Reuse existing deterministic facts/trends/signals | Consumes `VehicleAssistantContext` verbatim; no new derivation |
| Gemini can become primary later without migration | It already is primary — the fallback sits only in the failure branch; deleting the branch restores today's behaviour |

## Explicitly out of scope

- No new quota bucket or counter for local answers.
- No caching or persistence of answers (chat history is still not stored).
- No change to the reserve → commit/release lifecycle.
- No mechanical-diagnosis claims; the same safety override applies.

## Decision gate

Implement only if the next physical Gemini test still fails **after** the
migration is applied, the function is redeployed, and `[ai:assistant:trace]`
shows the provider is genuinely unreachable rather than misconfigured.
