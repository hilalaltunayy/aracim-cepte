# QA-001 — Onboarding Motion & Typography Refinement

## Goal
Make the first-run Aracım Cepte onboarding screen feel polished and memorable without startup lag.

## Current observations
- The top text `ARACINIZIN DİJİTAL YOL ARKADAŞI` feels too basic/generic.
- The screen is functionally correct, including the `Başlayalım` button, but visually too static.

## Required changes
- Improve the visual treatment of the top tagline: typography, weight, tracking, spacing and hierarchy.
- Prefer the existing typography system unless a new font is clearly justified.
- Add a lightweight entrance sequence:
  1. tagline/title/subtitle reveal with short staggered fade/slide or similar,
  2. vehicle illustration appears smoothly,
  3. wheels perform one subtle rotation sequence,
  4. feature cards reveal with small stagger,
  5. `Başlayalım` appears last.
- Exact motion may be chosen for quality, but it must feel playful and polished.
- Do not use a heavy continuous animation loop.

## Constraints
- No noticeable startup delay.
- No crash/freeze.
- No blocked navigation.
- Keep Aracım Cepte's current aqua/blue identity.
- Do not redesign unrelated content.

## Acceptance criteria
- [ ] Tagline no longer looks like default/template typography.
- [ ] Entrance animation is smooth on physical Android.
- [ ] Wheels rotate once subtly.
- [ ] Screen remains immediately usable.
