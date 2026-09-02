# QA-003 — Vehicle Limit Message Localization

## Goal
Fix the corrupted/garbled notification shown when a Free user attempts to add another vehicle.

## Current problem
The vehicle-limit notification contains broken characters and is not readable Turkish.

## Required changes
- Find and fix the encoding/localization issue at its source.
- Keep the Free vehicle limit enforced.
- Use clear Turkish copy, e.g.:
  `Ücretsiz planda en fazla 1 araç ekleyebilirsiniz. Daha fazla araç için Premium'a geçebilirsiniz.`
- If a Premium CTA exists, route to the existing paywall.

## Acceptance criteria
- [ ] No mojibake/broken characters.
- [ ] Message is fully readable Turkish.
- [ ] Existing entitlement rule still works.
