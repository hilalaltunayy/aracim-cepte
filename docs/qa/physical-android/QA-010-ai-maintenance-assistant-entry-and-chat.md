# QA-010 — AI Vehicle / Maintenance Assistant

## Goal
Expose the existing AI Vehicle Assistant foundation as a polished, discoverable core feature.

## Persistent entry
Add a floating assistant button in the main app experience:
- circular,
- Aracım Cepte aqua/blue identity,
- subtle lightweight animated ring/pulse is acceptable,
- stays visible while the main page scrolls,
- must not cover bottom navigation or critical actions,
- accessible touch target.

Prefer bottom-right unless current layout clearly requires another safe position.

## Chat presentation
On tap:
- open a polished dedicated assistant screen/panel,
- slide transition is preferred,
- do not use a generic empty white/black screen,
- use coherent bubbles, loading/thinking state, safe errors, remaining quota and back/close behavior.

## Greeting
When user name exists, use a contextual greeting such as:
`Günaydın Hilal, bugün aracınla ilgili ne danışmak istersin?`

Do not block if name is unavailable.

## Product behavior
Assistant must use existing structured vehicle context:
- maintenance
- fuel
- documents
- costs
- reminders
- odometer
- typed signals/trends
- evidence

Keep existing privacy/safety grounding:
- no fabricated facts,
- no raw OCR dump,
- no unnecessary PII,
- no unsupported live fuel-price claims,
- no definitive unsafe diagnosis,
- human-readable evidence for `Bunu neye göre söyledin?`

## Quota
User explicitly requests:
- Free = **1 successful AI answer per month**

For Premium:
- inspect the existing finalized product/backend quota and preserve it unless current project docs define a newer final value,
- do not invent a new Premium quota number,
- keep quota server-authoritative.

If current code is Free 3/month, update backend/domain/UI coherently to Free 1/month.

Failed provider calls, local out-of-domain refusals and unsupported live-data refusals must not consume successful-answer quota.

## Acceptance criteria
- [ ] Floating assistant entry exists and does not obstruct UI.
- [ ] Chat opens with polished motion.
- [ ] Free quota = 1 successful answer/month.
- [ ] Premium uses trusted existing quota.
- [ ] Grounding, evidence, privacy and safety remain intact.
- [ ] Physical Android remains smooth.
