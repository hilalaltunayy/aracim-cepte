# Aracım Cepte — Critical Issue 04: Password Reset Deep Link Invalid on Android

## Severity
**P0 / Production blocker**

## Context
The latest Android preview APK is installed on a physical Android tablet.

The password recovery email is successfully sent by Supabase, but tapping the recovery link on Android does not complete the recovery flow.

This is no longer an iOS/Safari-only observation. The same recovery flow fails on the Android device where the Aracım Cepte APK is installed.

## Current Confirmed Facts

- `POST /auth/v1/recover` returns HTTP 200.
- The password reset email is actually delivered.
- Supabase URL Configuration already contains:
  - `aracimcepte://auth/reset-password`
  - `aracimcepte://auth/confirm-email`
- The Reset Password email template uses `{{ .ConfirmationURL }}`.
- The app already has a dedicated reset-password flow/screen according to the previous code audit.
- On Android, tapping the reset link reaches the app flow but the app reports that the password reset link is invalid or incomplete and asks the user to request a new link.
- On iPhone/Safari, the custom scheme cannot be opened because the app is not installed there. That is not the target device behavior and is not the root issue.
- The Android failure is the authoritative reproduction.

## User-visible Android Error

> "Şifre yenileme bağlantısı geçersiz veya eksik. Lütfen yeni bağlantı isteyin."

## Expected Flow

1. User taps "Forgot password".
2. User enters the email address of the account to recover.
3. Supabase sends a recovery email.
4. User opens the recovery email on the Android device.
5. User taps the recovery link.
6. `aracimcepte://auth/reset-password` opens Aracım Cepte.
7. The recovery token/code/session is correctly parsed and exchanged.
8. Dedicated Reset Password screen opens.
9. User enters a new password and confirmation.
10. Supabase updates the password.
11. Success confirmation is shown.
12. User is redirected to Login.
13. Old password no longer works.
14. New password works.

## Investigation Scope

### 1. Recovery Email Request
Inspect:
- `resetPasswordForEmail(...)`
- exact `redirectTo` value
- preview-build environment overrides
- whether generated Supabase links preserve the intended redirect

### 2. Supabase Link Format
Determine the actual flow used by the project:
- PKCE/code
- token hash
- implicit tokens
- or another supported recovery mechanism

Do not assume the current parser matches the generated email link.

### 3. Deep Link Parsing
Inspect:
- Expo Router deep-link handling
- `Linking.getInitialURL()`
- runtime link listeners
- callback route parsing
- query parameters
- URL fragments/hash parameters
- custom-scheme normalization

Verify the implementation parses the format Supabase actually sends.

### 4. Session Exchange
Inspect the correct Supabase recovery mechanism for the received URL, including where applicable:
- `exchangeCodeForSession(...)`
- `setSession(...)`
- `verifyOtp(...)`
- auth-event/session hydration

Trace the exact code path that decides the link is "invalid or incomplete".

### 5. Auth State Events
Inspect:
- `supabase.auth.onAuthStateChange(...)`
- `PASSWORD_RECOVERY`
- `SIGNED_IN`
- session hydration
- cold-start race conditions

The app must not redirect away before recovery state is established.

### 6. Navigation Guards
Inspect whether auth guards, bootstrap navigation, or login redirects consume or discard recovery state before the Reset Password screen can use it.

### 7. One-time Token Behavior
Previous logs showed `/verify` activity including `403 One-time token not found`.

Investigate whether:
- the token is consumed before app handling completes,
- browser redirect consumes it,
- duplicate listeners/open events process it twice,
- callback verification occurs more than once.

Do not mask an app-side double-consumption bug by merely asking for a fresh link.

## Required Diagnostics

Add focused development-only diagnostics where useful.

Safe diagnostics may include:
- received deep-link path
- names of received parameters, not secret values
- whether `code` exists
- whether `token_hash` exists
- auth event name
- whether a recovery session exists
- safe Supabase error code/category

Never log:
- passwords
- access token values
- refresh token values
- token hashes
- OTPs
- service-role keys
- full credential-bearing recovery URLs

## Required Fix

Implement the recovery flow that matches the actual Supabase-generated link and current auth configuration.

Do not:
- disable recovery security
- bypass token/session validation
- create fake sessions
- weaken global auth guards
- expose credentials
- redesign unrelated auth screens

Preserve the current Aracım Cepte design system.

## Additional UX Issue Found

While signed in as account A, the Settings/password UI allows the user to type account B's email and send a reset email to B.

This is not necessarily an account-takeover vulnerability because mailbox access is still required, but it is poor authenticated-account UX.

Required behavior:

### Logged-out
**Forgot Password**
- user enters the account email to recover
- response should avoid account enumeration where practical

### Logged-in
**Change Password**
- operate on the currently authenticated account
- do not use an arbitrary email field as the main password-change UX
- use Supabase's secure authenticated password-change/re-authentication approach

Fix the Android recovery-link P0 first; then correct this logged-in UX.

## Acceptance Criteria

- [ ] `POST /recover` still succeeds.
- [ ] Recovery email arrives.
- [ ] Fresh link opened on Android launches Aracım Cepte.
- [ ] Fresh valid link does not show "invalid or incomplete".
- [ ] Dedicated Reset Password screen appears.
- [ ] Recovery session/state is valid.
- [ ] New password and confirmation are validated.
- [ ] Password update succeeds.
- [ ] Success state is shown.
- [ ] User returns to Login.
- [ ] Old password fails.
- [ ] New password works.
- [ ] Expired/used links fail safely.
- [ ] Duplicate handling does not consume the token twice.
- [ ] Existing login/signup flows do not regress.
- [ ] Logged-in Settings no longer treats arbitrary-email recovery as normal "change password".
- [ ] Targeted tests pass.

## Manual Supabase Actions

If a Dashboard change is still required, report:
- exact Dashboard path
- exact current value
- exact required value
- why it is required
- whether a new APK build is needed

Do not pretend external actions were completed.

## Validation Before New APK

After implementation:
- run targeted auth/recovery tests
- run changed-file lint/type checks where applicable
- verify no package ID/signing/version changes

Do NOT build an APK automatically.

## Android Retest

1. Build a fresh preview APK.
2. Install/update it on the Android tablet.
3. Request a brand-new recovery email.
4. Open that new email on Android.
5. Tap the link once.
6. Confirm Reset Password screen opens.
7. Set a new password.
8. Confirm success -> Login.
9. Verify old password fails.
10. Verify new password works.
