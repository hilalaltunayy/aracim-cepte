# AI Vehicle Assistant — Go-Live Runbook

**Status:** Code-side complete and fail-closed (ROUND2-002). The assistant returns
"Araç Asistanı şu anda kullanılamıyor" purely because the Edge Function has **no
Gemini configuration** — `createConfiguredVehicleAssistantProvider` returns
`null`, so `handleVehicleAssistant` throws `503 AI_ASSISTANT_UNAVAILABLE` before
any provider call. Nothing else is wrong in the request path.

**As of:** 2026-09-03. `20260902120000_ai_daily_quota.sql` is already applied
(Local = Remote). The `vehicle-ai-assistant` function is already deployed (v1).

## 1. Get a Gemini API key (Google AI Studio)

- Create an API key at Google AI Studio (or a Verti/Vertex key if that is the
  chosen account). Note the **model name** your key can call (e.g.
  `gemini-2.5-flash`, `gemini-3.6-flash`, …) — the app defaults to
  `gemini-3.6-flash` but the model is overridable, see step 2.

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
| `GEMINI_MODEL` | e.g. `gemini-2.5-flash` | optional (default `gemini-3.6-flash`) |
| `GEMINI_API_STYLE` | `generate_content` (standard `:generateContent`) or `interactions` | optional (default `generate_content`) |
| `GEMINI_API_BASE_URL` | override only for a non-default host | optional |

Only `AI_VEHICLE_ASSISTANT_ENABLED=true` **and** `AI_PROVIDER_PRIVACY_APPROVED=true`
**and** a non-empty `GEMINI_API_KEY` together open the provider. Any one missing
keeps it fail-closed.

## 3. Redeploy the function (only if code changed)

The `_shared` provider code changed in this batch (added the standard
`generate_content` request/response path + env overrides), so redeploy once:

```
npx supabase functions deploy vehicle-ai-assistant
```

Then confirm: `npx supabase functions list` shows a new version.

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
