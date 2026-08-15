# UI polish and Premium experience pass

TASK-038 keeps the existing light-first aqua/turquoise product identity. It is a refinement pass,
not a Home or navigation redesign.

## Shared visual decisions

- `layout` centralizes the established 20px screen gutter, 20px section rhythm, 18px card padding
  and a 48px compact-button touch target.
- Existing semantic theme colors, Inter typography, card radius and restrained elevation remain the
  source of truth. No dependency, new color system, gradient treatment or dark Premium theme was
  added.
- Shared modals now use the same quiet handle, bordered elevated surface and existing safe-area
  layout. Button feedback uses short timing animations instead of spring bounce.
- Full-screen data loads use static layout-shaped placeholders rather than an attention-heavy
  spinner. They intentionally do not shimmer or loop.
- Empty states can retain the existing concise explanation while exposing an optional explicit CTA;
  error retry targets keep a comfortable hit area.

## High-value surface refinements

- Document rows keep the TASK-037 archive organization and now show issuer and an attachment cue
  when available; incomplete legacy metadata remains safe.
- History filters use the same restrained segmented-surface language as Documents instead of a
  saturated row of independent pills.
- Settings sections no longer render a trailing divider after their final row.
- Vehicle Assistant remains ASK → RESPONSE. A result includes one restrained severity/safety state
  and exposes its human-readable evidence through an accessible progressive-disclosure control;
  it does not become a chat transcript.
- The existing paywall retains store-provided package metadata, billing-disabled and restore states;
  shared surface/button improvements apply without changing billing behavior.

## Performance and acceptance

No polling, listener, network request, timer, chart or image-loading behavior was added. Existing
reports calculations/motion, billing gates, AI gates, gallery and active-vehicle logic are unchanged.

Source/render review covers responsive flex layouts, min-width guards on dense rows, safe text
truncation for document metadata and compact buttons with a 48px minimum target. A local Expo web
preview could not be reached from the in-app browser during this pass, so visual acceptance remains
source/render-level only. Physical Android validation after the deployment freeze must inspect Home,
vehicle/switcher, reports motion, assistant, paywall, reminder sheets, gallery, long lists,
keyboard/form behavior and system appearance.

No migration, remote environment, tester environment, production Gemini traffic or real purchase
configuration was changed.
