# CLAUDE_MASTER_PROMPT — Final Aracım Cepte Revision Pass

Read FIRST:
1. `CLAUDE.md`
2. `docs/handoff/CLAUDE_PROJECT_CONTEXT.md`
3. `docs/handoff/CLAUDE_CURRENT_STATE.md`
4. Every MD file in this final revision pack.

Work only on `claude/final-qa-fixes`.

Before editing:
- verify branch
- verify checkpoint ancestry
- inspect git status

Do not merge main/develop, force-push, rewrite history, delete tags/branches or push unless explicitly requested.

Implement this entire final revision batch holistically while preserving existing architecture and working behavior.

Key requirements that must actually work:
- password reset fresh-link flow
- modern auth UI without breaking auth
- soft Login→Home intro
- Home visual polish
- new read-only record detail pages
- Fuel two-of-three Smart Fuel save rule
- Fuel OCR
- Maintenance OCR
- General document OCR
- professional 3D body-type coverage and gestures
- vehicle photo persistence
- real AI provider/backend path
- Free AI = 1 successful answer/day
- Premium AI = one documented sustainable value between 10–15 successful answers/day
- real RevenueCat purchase/restore flow
- Premium multi-vehicle isolation

UI direction:
preserve dark navy / blue / aqua identity, move away from giant framed form cards, use independent rounded fields, subtle automotive line-art background, modern feedback banners, lightweight microinteractions.

Do not over-animate or sacrifice Android performance.

Use connected Supabase access for safe backend work; inspect, apply, verify. Never weaken RLS/private Storage/owner isolation.

OCR must return partial editable suggestions and never auto-save.

AI keys stay server-side and answers remain grounded/safe.

Premium must use trusted RevenueCat/Supabase entitlement, never a production fake toggle.

Run:
- affected focused tests
- relevant regressions
- changed-file ESLint
- TypeScript
- git diff --check
- local Android production bundle validation

Do not start an EAS build.

Final report sections:
1. Revision files completed
2. Root causes found
3. UI system changes
4. Functional fixes
5. OCR fixes and validation
6. 3D fixes
7. Vehicle photo persistence
8. AI provider / grounding / quota
9. Premium / RevenueCat
10. Supabase changes and verification
11. Automated validation
12. Remaining blockers before APK
13. Exact physical Android retest checklist
14. Exact next preview APK command
