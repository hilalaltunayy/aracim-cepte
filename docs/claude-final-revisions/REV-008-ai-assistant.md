# REV-008 — Working AI Vehicle Assistant + Chat UI + Daily Quota

## Current physical problem
Assistant opens but returns:
`Araç Asistanı şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.`

UI also feels like a form, not a chatbot.

## Provider/backend
Inspect current project docs/foundation first.
Project previously prepared a Gemini/provider privacy gate.

Use the already-intended provider if possible.
If Gemini free/low-cost tier is the chosen project provider, configure it through server-side Supabase Edge Function architecture.

Hard rules:
- API key server-side only
- no secret in mobile bundle
- preserve redaction/privacy
- preserve grounding
- fail closed

## Assistant scope
Can answer grounded questions:
- dikkat etmem gereken bir şey var mı?
- bakım durumumu özetler misin?
- yakıt tüketimimde değişim?
- son ay yakıta ne kadar harcadım?
- yaklaşan reminder?
- expense summary?

Use:
records, maintenance, fuel, costs, reminders, docs, odometer, deterministic facts, trends, typed signals, evidence.

Must NOT:
- definitive mechanical diagnosis
- fabricated facts
- unsupported live external claims

Evidence:
`Bunu neye göre söyledin?` → human-readable vehicle evidence.

## Final requested quota policy
Previous code was monthly; user now explicitly wants daily:

### Free
**1 successful AI answer/day**

### Premium
**10–15 successful AI answers/day**
Choose one concrete sustainable value after checking provider/cost; prefer 15 if sustainable, otherwise 10.
Document choice.

Server-authoritative.
Only successful provider answers consume.
Failures/refusals/out-of-domain do not consume.

## Chat UI redesign
Make real chatbot:
- assistant/user bubbles
- greeting
- suggested prompt chips
- fixed composer near bottom
- send button
- thinking/loading state
- retry/error
- subtle remaining daily quota
- evidence drawer/card
- same dark navy/aqua theme
- no large outer form-card look

Keep floating Home assistant entry.
