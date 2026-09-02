# Claude Supabase Map

**Read-only audit date:** 2026-09-02

**CLI:** Supabase CLI `2.110.0`

**Commands:** `npx supabase migration list --linked`, `npx supabase functions list`

Bu ek belge migration/function drift ve yanlış deploy riskini azaltmak için oluşturuldu. Secret,
credential, user row veya raw payload içermez. Aşağıdaki remote state zamanla değişebilir; herhangi
bir işlemden önce aynı read-only komutlarla yeniden doğrula.

## Migration parity

Handoff anında aşağıdaki **28 migration'ın tamamı local ve remote history'de aynı version ile
mevcuttu**; local-only veya remote-only migration yoktu:

1. `20260728092412_initial_schema.sql`
2. `20260728092414_storage_policies.sql`
3. `20260728140259_harden_rls_auto_enable.sql`
4. `20260728150000_harden_child_vehicle_ownership.sql`
5. `20260728153000_add_child_owner_indexes.sql`
6. `20260801111349_enforce_attachment_quotas_and_private_uploads.sql`
7. `20260801132557_fix_attachment_reservation_storage_policy.sql`
8. `20260801165118_task_008_data_consistency_and_recovery.sql`
9. `20260801171638_task_008_reconciliation_service_grants.sql`
10. `20260801172536_task_008_db_first_bulk_cleanup.sql`
11. `20260810212244_historical_odometer_support.sql`
12. `20260810221647_maintenance_packages_foundation.sql`
13. `20260811102853_vehicle_taxonomy_normalized_colors.sql`
14. `20260811133756_feedback_stabilization_fuel_fields.sql`
15. `20260811134804_reminder_due_time.sql`
16. `20260811140844_body_condition_multiselect.sql`
17. `20260811144343_unified_attachment_foundation.sql`
18. `20260811153131_document_type_details.sql`
19. `20260811161233_maintenance_service_details.sql`
20. `20260813183547_user_entitlements_foundation.sql`
21. `20260813192935_vehicle_creation_entitlement_limit.sql`
22. `20260813200419_vehicle_profile_photo_gallery.sql`
23. `20260814093043_usage_quota_enforcement.sql`
24. `20260814100358_entitlement_aware_attachment_storage_quotas.sql`
25. `20260814133000_reminder_notification_preferences.sql`
26. `20260815001644_ai_vehicle_assistant_quota.sql`
27. `20260815143910_revenuecat_billing_foundation.sql`
28. `20260901160000_free_ai_quota_one.sql`

Uygulanmış migration dosyalarını değiştirme veya tek tek tekrar çalıştırma. Yeni schema işi için
önce remote/local parity ve exact target project'i doğrula, sonra yeni additive migration oluştur.

## Core database surfaces

### User and vehicle data

- `profiles`
- `vehicles`
- `vehicle_records`
- `reminders`
- `body_part_conditions`, `body_part_condition_values`
- `expertise_reports`
- `vehicle_notes`
- `vehicle_documents`
- `maintenance_items`, `maintenance_templates`
- `attachments`, `vehicle_photos`

Bu tablolar owner/parent vehicle RLS sınırında kalır. Bir feature hatasını gidermek için RLS'i
gevşetme veya client-supplied owner ID'ye güvenme.

### Operational and authorization data

- `attachment_upload_reservations`, `attachment_cleanup_queue`
- `record_mutation_requests`
- `ocr_usage_reservations`, `ai_usage_reservations`
- `user_entitlements`
- `billing_webhook_events`

Quota/entitlement/storage reservation tabloları direct client write alanı değildir. Capability
kararı UI CustomerInfo veya local store'dan değil trusted RPC/Edge boundary'den gelir.

## Important RPC families

- Record/km: `save_vehicle_record_atomic_v2`, legacy-compatible record RPC'leri.
- Maintenance: `save_maintenance_record_atomic`, `save_maintenance_record_with_details`.
- Body: `save_body_part_conditions_atomic`.
- Documents/expertise: `save_vehicle_document_with_attachments`,
  `save_expertise_report_with_attachments`, consistent delete/clear/cleanup RPC'leri.
- Vehicle creation/photos: `create_vehicle_with_limit`, `reserve_vehicle_photo_upload`,
  `save_vehicle_photo`, `set_vehicle_photo_primary`, `delete_vehicle_photo`.
- Attachments: parent-aware reserve/mark/cleanup/reconcile RPC'leri.
- Reminder: `enforce_reminder_due_time_entitlement` trigger path.
- OCR: `reserve_ocr_usage`, `commit_ocr_usage`, `release_ocr_usage`, `get_my_ocr_usage`.
- AI: `reserve_ai_usage`, `commit_ai_usage`, `release_ai_usage`, `get_my_ai_usage`.
- Billing: `process_revenuecat_subscription_event` service-role-only.

Privileged functions fixed empty `search_path`, `auth.uid()`/ownership check ve dar role grant'lerini
korumalıdır. `process_revenuecat_subscription_event` client/anon/authenticated execute'a açılmaz.

## Private Storage

- Bucket: `vehicle-attachments`
- Visibility: private
- Allowed stored media foundation: validated PDF/JPEG/PNG; current Edge Function validates size,
  declared MIME and magic bytes.
- Object path begins with authenticated owner UUID; new objects include vehicle/parent/random IDs.
- Read uses owner authorization + short-lived signed URL. Public URL or public bucket yasaktır.
- Delete flows queue Storage cleanup after DB-first metadata changes; reconcile function handles
  orphan/missing metadata recovery.

Plan entitlement limitleri ile bucket/Edge hard file limitini birbirine karıştırma. Gerçek etkin
limit hem current migration/RPC hem mobile entitlement source'tan birlikte doğrulanmalıdır.

## Remote Edge Functions at handoff

| Function                | Remote state                  | Notes                                                                                                |
| ----------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| `upload-attachment`     | ACTIVE v6                     | Parent/photo-aware upload contract; function performs its own auth handling.                         |
| `delete-account`        | ACTIVE v1                     | Auth/DB/Storage deletion path; physical UI acceptance remains separate.                              |
| `reconcile-attachments` | ACTIVE v3                     | Trusted reconciliation/cleanup flow.                                                                 |
| `vehicle-ai-assistant`  | ACTIVE v1                     | Provider/privacy config absent or unapproved must remain fail-closed.                                |
| `revenuecat-webhook`    | **NOT LISTED / NOT DEPLOYED** | Source exists; requires backend-only auth secret, explicit deploy and RevenueCat event verification. |

`verify_jwt=false` CLI metadata does not mean unauthenticated access is allowed: current functions
validate Authorization/session in handler code where required. Do not change this metadata or trust
boundary without reading the exact function and tests.

## Auth configuration boundary

Repository expects:

- Site URL: `https://aracimcepte.hilalaltunay.com`
- Confirmation redirect: `aracimcepte://auth/confirm-email`
- Recovery redirect: `aracimcepte://auth/reset-password`
- Confirm signup and reset templates using Supabase `ConfirmationURL`.

Dashboard redirect allowlist, template body, Auth Logs and SMTP delivery state are not fully readable
from schema migration history. Verify these manually in Dashboard/provider logs and on a fresh
Android artifact; do not infer delivery from `POST /recover` 200.

## Safe verification and change sequence

1. Confirm branch/worktree and read `AGENTS.md` + target task.
2. Run `npx supabase --version` and `npx supabase migration list --linked`.
3. Run `npx supabase functions list`; compare expected version/source before deploy.
4. Inspect target migration, RLS, grants, RPC signature, generated DB types and negative tests.
5. For schema work, create a new forward/additive migration; do not edit applied files.
6. Run local reset/SQL tests when Docker is available. Never replace a failed local destructive test
   with an unapproved production mutation.
7. Dry-run/inspect exact linked target before any user-approved remote apply.
8. After apply/deploy, repeat migration/function inventory and safe negative/unauthenticated probes.
9. Record date, command, environment, completed/skipped/failed/manual acceptance separately.

Remote write/deploy was intentionally **not performed** during the Claude handoff task.
