# ROUND2-001 — Auth Reset Fix + Password Rules

## Priority
P0 - release critical

## Problem summary
Password reset is still broken on physical Android.

Observed flow:
1. User opens "Şifremi unuttum"
2. User enters e-mail
3. Reset mail arrives
4. User taps link
5. App opens "Yeni şifre" screen
6. Screen shows error:
   "Şifre yenileme bağlantısı kullanılamıyor. Lütfen yeni bir bağlantı isteyin."

This is still failing repeatedly and must be fixed end-to-end.

## Required behavior
When the user taps a fresh reset link:
1. The app must open a valid password reset form
2. The form must allow entering:
   - Yeni şifre
   - Yeni şifre tekrar
3. The password must be validated
4. If valid, it must actually update auth password in backend
5. Success message:
   "Şifreniz yenilendi. Yeni şifrenizle giriş yapabilirsiniz."
6. Then user should be able to log in with the new password
7. Old password must no longer work

## Password rule update
Apply these rules for:
- new signups
- new password reset flow
- future password changes

Rule:
- minimum 8 characters
- at least 1 uppercase letter
- at least 1 number
- at least 1 special character

Do NOT break or force-reset existing old users.
Existing passwords remain as-is unless the user sets a new one.

## UI requirements
- The reset flow must show a real reset form, not only the invalid-link screen
- Validation hint can be shown as a compact helper text under the field
- Error/success banners should use the modern feedback component
- No ugly broken state

## Must investigate
Trace the actual deep-link / callback flow on Android and prove the real failure point.
Do not assume.

## Acceptance criteria
- fresh reset link opens valid reset form
- password can be changed successfully
- old password fails
- new password succeeds
- invalid/expired link still shows correct error
- password rule works for signup and reset
- no weakening of auth security
- no token logging

## Validation
Run focused validation and report concise results.
Also state whether this was tested logically only or through a real device/app flow.

## Output format
Reply briefly with:
1. root cause
2. files changed
3. what was fixed
4. validations
5. remaining blockers

Important: keep your answer short. Do not repeat project architecture. Do not write long audits. Max 10 bullets.
