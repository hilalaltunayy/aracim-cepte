# Supabase client secrets, RLS and privileged-access audit

**Date:** 2026-08-14  
**Scope:** SECURITY-AUDIT-001; repository source, current local Supabase schema and narrowly scoped
negative fixtures. No production mutation, remote migration deployment or credential rotation was performed.

## Credential model

The Expo client initialises one normal Supabase client from `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_ANON_KEY`. These are publishable client configuration values, not privileged
credentials. Source/configuration and tracked-file scans found no service-role/secret/admin/database
credential in mobile runtime code or a public Expo variable. Expected `service_role` references are
limited to SQL grant/revoke hardening and trusted Edge/server context; no value is recorded here.

A bounded Git-history pattern scan found no committed privileged key value. One historical deployment
commit mentions the service role in its subject/context; its changed-file list contains release/QA
documentation and scripts, not a credential finding. A real future leak requires immediate redaction
and manual Supabase credential rotation/revocation; rotation was intentionally not automated.

## Authorization evidence

- All current application-owned public tables have RLS enabled. Local effective policies scope vehicles,
  records, attachments, photos, entitlements and OCR reservations to `auth.uid()`/owned vehicles.
- `vehicle-attachments` is private. Storage object policies are authenticated and owner/reservation-scoped;
  no public URL model or mobile service-role access is used. The signed-URL lifetime remains governed by
  the existing 60-second storage helper.
- Sensitive tables (`user_entitlements`, `ocr_usage_reservations`, `vehicle_photos`) deny direct
  authenticated INSERT/UPDATE/DELETE. They expose only owner-scoped reads where needed.
- Audited `SECURITY DEFINER` RPCs use `search_path = ''`, derive the caller from `auth.uid()`, and deny
  anon execution. Authenticated execution is granted only to intended owner-scoped functions.

## Findings

| Severity | Finding | Status |
| --- | --- | --- |
| INFO | No privileged Supabase credential was found in client/public configuration. | PASS |
| INFO | Local RLS, private Storage and cross-user vehicle/photo/attachment fixtures preserved owner isolation. | PASS |
| INFO | Entitlement and OCR-usage direct client mutation is denied; audited OCR RPCs reject anon and foreign reservations. | PASS |
| LOW (resolved locally) | SQL lint found an ambiguous column reference in TASK-031's idempotent OCR-reservation branch. The pending forward migration now qualifies the reference; a duplicate-operation fixture passes. | FIXED — remains uncommitted with TASK-031 |
| LOW | TASK-031 is intentionally incomplete. Its current OCR reservation path is owner-scoped and idempotent, but a reserved scan released only by expiry after an interrupted fuel/maintenance screen can temporarily occupy capacity. It does not commit usage or grant cross-user access. | OPEN — retain for TASK-031 completion |

## Evidence and remaining work

Local evidence: `supabase/tests/rls_negative.sql`, `supabase/tests/vehicle_photo_gallery.sql`, and
`supabase/tests/ocr_usage_quota.sql` run against the local stack; the last fixture additionally checks
anon RPC denial, entitlement/OCR write denial and foreign OCR commit/release denial. See the historical
remote synthetic evidence in [V1 security verification](../qa/v1-security-authorization-verification.md)
and the [private Storage policy](storage-policy.md).

This audit does not replace a fresh remote migration/Android acceptance pass. TASK-031 attachment/storage
quota completion and its local/remote validation remain separate; no user data or existing quota behavior
was altered by this audit.
