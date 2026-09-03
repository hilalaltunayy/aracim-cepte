# AI Vehicle Assistant — Go-Live Runbook

**As of:** 2026-09-03 (post physical go-live attempt, function ACTIVE v4).

## Physical-test failure — two provider root causes

1. **Invalid model.** The old default `gemini-3.6-flash` is not a real
   Generative Language API model → `POST …/models/gemini-3.6-flash:generateContent`
   → **404 NOT_FOUND** → `unavailable` → `503`. Default is now
   **`gemini-2.5-flash`** (real, JSON-capable, free-tier).

2. **Thinking budget starvation.** `gemini-2.5-flash` is a *thinking* model. With
   `maxOutputTokens` and no `thinkingConfig` it can spend the entire output
   budget on hidden reasoning and return `finishReason: MAX_TOKENS` with an
   **empty answer**, which the app then maps to "unavailable". The request now
   sends `thinkingConfig: { thinkingBudget: 0 }` for 2.5 models and a generous
   `maxOutputTokens: 2048`; the parser also tolerates a ` ```json ` fence and
   reports `finishReason` + `hasText` in the trace.

Any account-specific model can still be set with `GEMINI_MODEL` (thinkingConfig
is sent only for `gemini-2.5*` / `*-latest`).

The redeployed function logs a redacted trace line per call —
`[ai:assistant:trace] {"stage":"provider","style":…,"model":…,"httpStatus":…,
"providerStatus":"NOT_FOUND","finishReason":"MAX_TOKENS","hasText":false,…}` —
no key, prompt, context, tokens or output. Read it in the Edge Function logs if
it still fails: `providerStatus` names the wrong secret; `finishReason` +
`hasText` show a model/output problem.

## 1. Get a Gemini API key (Google AI Studio)

- Create an API key at Google AI Studio. Confirm the model you will use is
  listed for your key: `GET https://generativelanguage.googleapis.com/v1beta/models`
  with header `x-goog-api-key: <key>`. Pick a `*-flash` model that supports
  `generateContent` and `responseMimeType: application/json` (e.g.
  `gemini-2.5-flash` or `gemini-flash-latest`).

## 2. Set the Edge Function secrets (Supabase)

Set these on the **linked production project** (Dashboard → Project Settings →
Edge Functions → Secrets, or `npx supabase secrets set …`). They are
server-only; never add them to the mobile app, `EXPO_PUBLIC_*`, logs or docs.

| Secret | Value | Required |
| --- | --- | --- |
| `AI_VEHICLE_ASSISTANT_ENABLED` | `true` | yes |
| `AI_PROVIDER_PRIVACY_APPROVED` | `true` — your attestation that provider use is privacy/commercially approved | yes |
| `AI_VEHICLE_ASSISTANT_PROVIDER` | `gemini` | optional (default `gemini`) |
| `GEMINI_API_KEY` | the key from step 1 | yes |
| `GEMINI_MODEL` | e.g. `gemini-2.5-flash` / `gemini-flash-latest` | optional (default `gemini-2.5-flash`) |
| `GEMINI_API_STYLE` | `generate_content` (standard `:generateContent`) or `interactions` | optional (default `generate_content`) |
| `GEMINI_API_BASE_URL` | override only for a non-default host | optional |

Only `AI_VEHICLE_ASSISTANT_ENABLED=true` **and** `AI_PROVIDER_PRIVACY_APPROVED=true`
**and** a non-empty `GEMINI_API_KEY` together open the provider. Any one missing
keeps it fail-closed.

## 3. Apply the migration + redeploy the function

New migration `20260903120000_ai_quota_reservation_hardening.sql` (additive):
cuts the reservation TTL 2 min → 45 s and splits the reserve error so an
in-flight reservation raises `AI_USAGE_IN_PROGRESS` (409), never
`AI_MONTHLY_QUOTA_EXCEEDED`. Apply after `migration list` review:

```
npx supabase db push
```

Then redeploy the function (the `_shared` handler/provider changed — real model
default, redacted trace, retried release):

```
npx supabase functions deploy vehicle-ai-assistant
npx supabase functions list
```

## 3b. Clean up the failed physical-test reservation (only if needed)

Only a validated answer ever reaches `commit`, so the failed test **cannot**
have spent the daily quota. The perceived "used" was almost certainly a
`reserved` row briefly holding the slot — those auto-release (expired sweep) and
need no action.

Confirm with a **read-only** check for the tester's user id and today (UTC):

```sql
select id, operation_id, status, period_start, created_at, responded_at
from public.ai_usage_reservations
where user_id = '<tester-user-uuid>'
  and period_start = (now() at time zone 'utc')::date
order by created_at;
```

- If every row is `released`/`reserved` (expired): nothing to do.
- If a stale `reserved` row is still non-expired and you want it gone now:

  ```sql
  update public.ai_usage_reservations
  set status = 'released', updated_at = now()
  where user_id = '<tester-user-uuid>'
    and period_start = (now() at time zone 'utc')::date
    and status = 'reserved';
  ```

- Only if a `committed` row exists **and** the Edge logs show no `200`
  provider response for that `operation_id` (i.e. it was never a real answer),
  release that one row by id:

  ```sql
  update public.ai_usage_reservations
  set status = 'released', updated_at = now()
  where id = '<that-committed-row-id>' and user_id = '<tester-user-uuid>';
  ```

Never touch other users, other dates, or rows with a `responded_at` matching a
logged successful answer.

## 4. Verify

- In the app, open Araç Asistanı and ask "Bakım durumumu özetler misin?".
  Expect a grounded answer and the daily-quota chip to drop by 1.
- Only a **successful** provider answer consumes quota (Free 1/day,
  Premium 10/day). Failures, refusals, out-of-domain and live-data questions
  consume zero — enforced server-side by the reserve → commit → release RPCs.
- If it still fails: check Edge Function logs for the provider HTTP status. A
  404/400 usually means a wrong `GEMINI_MODEL` or `GEMINI_API_STYLE`; adjust the
  secret (no code change needed) and retry.

## Guardrails (unchanged)

- API key stays server-side; the mobile client only sends `{vehicleId,
  question, operationId}` and never receives raw provider errors.
- Context is redacted (no plate/email/notes/OCR text); evidence is an allowlist;
  deterministic safety override wins over provider content.
- No fake provider success anywhere.
