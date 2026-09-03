# ROUND2-002 — AI Assistant Must Work

## Priority
P0 - release critical

## Problem summary
The vehicle assistant UI exists, but the assistant does not work.
It shows:
"Araç Asistanı şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin."

This is one of the most important product features and must start working.

## Product decision
Use the already intended architecture:
- provider: Gemini
- integration path: Supabase Edge Function
- API key must remain server-side only
- no client-side secret exposure

## Required behavior
The assistant must answer questions grounded in the user's vehicle data.

Examples:
- "Şu an dikkat etmem gereken bir şey var mı?"
- "Bakım durumumu özetler misin?"
- "Yakıt tüketimimde bir değişim var mı?"
- "Son 1 ayda yakıta ne kadar harcadım?"
- "Masraflarımı özetler misin?"

It must NOT pretend to make exact mechanical diagnosis.
It should give grounded, cautious, report-like answers.

## Quota
Current policy target:
- Free: 1 successful answer per day
- Premium: 10 successful answers per day

Only successful responses should consume quota.

## UI requirements
Keep the chat UI structure, but make sure the feature works.
The current UI can stay mostly as-is for now if needed.
Functionality comes first.

## Must investigate
Determine why the current assistant is failing.
Possible causes:
- missing edge function config
- missing Supabase secrets
- provider not enabled
- client contract mismatch
- migration / quota mismatch
- error swallowing in UI

## Important
If external manual setup is required, stop and provide the exact steps for:
- Supabase secrets
- function deploy
- any environment variables
- any verification commands

## Acceptance criteria
- assistant returns real answer instead of unavailable error
- quota rules are enforced correctly
- secrets stay server-side
- no fake responses
- no broken UI state
- failures show honest feedback

## Output format
Reply briefly with:
1. root cause
2. code fixes done
3. external steps required (if any)
4. validation status
5. remaining blockers

Important: keep your answer short. Do not repeat project architecture. Do not write long audits. Max 10 bullets.
