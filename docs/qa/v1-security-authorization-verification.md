# V1 security and authorization verification

**Date:** 2026-08-02

**Environment:** linked Supabase project `eiqxvvnqkbzbhzpthcwo`

**Scope:** TASK-013 targeted verification
**Outcome:** **SECURITY VERIFICATION PASSED — AWAITING LEGAL WEB PUBLICATION AND CLOSED TEST**

This result covers the technical controls tested below. It is not a Google Play production-readiness
claim, a KVKK compliance claim, or a substitute for professional legal review.

## Evidence boundaries

- Only randomly identified synthetic User A/User B accounts, rows, and files were used.
- The linked project ref and public endpoint ref were checked before remote operations.
- Local and remote migration lists matched (10/10); no pending migration was found.
- Final remote function inventory: `upload-attachment` v5, `delete-account` v1, and
  `reconcile-attachments` v3 were `ACTIVE`.
- No migration, database reset, broad regression suite, coverage run, Expo Doctor, or EAS build was
  performed.
- The upload function was temporarily redeployed during diagnosis and then redeployed from the
  unchanged repository source as v5. Its final source and behavior match the repository; there is no
  application or schema change in TASK-013.

## Direct remote synthetic verification

| Control                          | Method                                                                                                                          | Expected result                                                       | Actual result / evidence                                                                                                             | Status |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| Vehicle isolation                | User A queried, updated, and deleted User B's known vehicle ID through an authenticated public client; reverse read also tested | No foreign row; no mutation                                           | No row returned; update/delete affected zero rows; owner row remained; reverse isolation matched                                     | PASS   |
| Record isolation                 | Known User B fuel, maintenance, and expense row IDs tested through User A                                                       | No foreign row or mutation                                            | All three record types hidden; foreign rows survived denied mutations                                                                | PASS   |
| Reminder isolation               | Known User B reminder ID tested through User A                                                                                  | No foreign row or mutation                                            | Hidden and unchanged                                                                                                                 | PASS   |
| Body-condition isolation         | Known User B body-condition row tested through User A                                                                           | No foreign row or mutation                                            | Hidden and unchanged                                                                                                                 | PASS   |
| Expertise isolation              | Known User B expertise-report row tested through User A                                                                         | No foreign row or mutation                                            | Hidden and unchanged                                                                                                                 | PASS   |
| Notes isolation                  | Known User B note row tested through User A                                                                                     | No foreign row or mutation                                            | Hidden and unchanged                                                                                                                 | PASS   |
| Attachment metadata isolation    | Known User B document metadata row tested through User A                                                                        | No foreign row or mutation                                            | Hidden and unchanged                                                                                                                 | PASS   |
| Owner-scoped RPC authorization   | User A called owner-scoped RPCs with User B vehicle/record IDs                                                                  | Reject or return no authorized result                                 | Foreign RPC operations were denied; User B rows remained                                                                             | PASS   |
| Private/service helper grants    | Remote catalog grants plus anon calls for attachment reservation/completion/reconciliation helpers                              | `PUBLIC`/anon/authenticated cannot directly call service-only helpers | Service-only grants restricted; anon execution denied; RLS-only helper not exposed through Data API                                  | PASS   |
| Bucket privacy                   | Remote bucket configuration and unsigned public-object request                                                                  | Bucket private and public URL unusable                                | `public=false`; unsigned public URL rejected                                                                                         | PASS   |
| Cross-user Storage               | User A attempted list, download, signed URL, overwrite, and delete against User B's known object                                | No access and owner object remains                                    | List disclosed no object; download/signed URL/overwrite failed; delete did not remove object; User B still downloaded it             | PASS   |
| Direct unreserved/foreign upload | User A attempted owner-prefix upload without a reservation and User B-prefix upload                                             | Both rejected                                                         | Both Storage writes rejected                                                                                                         | PASS   |
| Object path privacy              | Inspected generated User B object path                                                                                          | Owner/vehicle/random UUID only; no PII                                | UUID owner/vehicle/random object ID plus safe extension; no e-mail/name/plate/test label                                             | PASS   |
| Signed URL lifetime              | Owner URL fetched immediately and again after the 60-second lifetime plus safety margin                                         | Immediate access works; expired access fails                          | Immediate request succeeded; request after approximately 65 seconds failed                                                           | PASS   |
| Allowed files                    | Uploaded signature-valid PDF, JPEG, and PNG through the public Edge endpoint                                                    | Accepted                                                              | All three accepted                                                                                                                   | PASS   |
| Unsupported MIME                 | Uploaded WebP                                                                                                                   | Safe rejection                                                        | `400 / ATTACHMENT_TYPE_NOT_ALLOWED`                                                                                                  | PASS   |
| Spoofed content                  | Declared JPEG while sending PDF magic bytes                                                                                     | Safe rejection                                                        | `400 / ATTACHMENT_CONTENT_MISMATCH`                                                                                                  | PASS   |
| Single-file limit                | Remote declared-size rejection plus exact server reservation boundary; local stream validator for actual bytes                  | Exactly 5 MB allowed; over 5 MB rejected                              | 5,242,880-byte reservation accepted; 5,242,881 declared bytes returned controlled `413`; actual byte-stream limit passed local tests | PASS   |
| Document-count quota             | Created 10 valid objects, attempted an 11th, deleted one, and retried                                                           | 10th succeeds; 11th fails; deletion releases quota                    | All expected transitions observed                                                                                                    | PASS   |
| Total-byte quota                 | Created five 5 MB server-side reservations, then requested another valid upload                                                 | Exactly 25 MB accepted; any additional byte rejected                  | Five reservations accepted; next upload rejected with `ATTACHMENT_BYTES_QUOTA_EXCEEDED`                                              | PASS   |
| Upload idempotency               | Repeated the same upload request ID                                                                                             | One path/object and no duplicate metadata/object                      | Both calls resolved to the same path; one object existed                                                                             | PASS   |
| Delete all records               | Deleted User A vehicle records and re-read User A vehicle/User B records                                                        | User A records removed, vehicle remains, User B untouched             | Exactly User A rows deleted; vehicle and all User B fixtures remained                                                                | PASS   |
| Delete all reminders             | Deleted User A reminders and re-read User B reminder                                                                            | Only User A reminders removed                                         | User A reminder deleted; User B reminder remained                                                                                    | PASS   |
| Delete all vehicle data          | Called owner-scoped consistent vehicle delete, then reconciliation                                                              | User A vehicle graph/object removed; User B untouched                 | User A vehicle/metadata/object unavailable after reconciliation; User B vehicle remained                                             | PASS   |
| Delete account                   | Called deployed account-delete function with User A synthetic account                                                           | Auth, DB, and Storage removed                                         | Auth row, vehicle graph, notes, document metadata, and Storage prefix all zero                                                       | PASS   |
| Revoked account artifacts        | Reused old session and old signed URL                                                                                           | Both unusable                                                         | Old session rejected/no data; old signed URL failed                                                                                  | PASS   |
| Same-email recreation            | Created a new synthetic account with the deleted account's e-mail                                                               | No old data visible                                                   | New identity queried zero old vehicles                                                                                               | PASS   |
| Recovery and reservation release | Re-ran targeted TASK-008 interrupted-upload, metadata/object mismatch, orphan, retry, and cleanup cases                         | Recoverable without duplicates or leaked quota                        | All D-13 targeted controls passed, including interrupted reservation release and orphan cleanup                                      | PASS   |
| Synthetic cleanup                | Final exact-prefix counts for Auth, DB, and Storage                                                                             | All zero                                                              | `auth=true`, `database=true`, `storage=true`; TASK-008 cleanup also all true                                                         | PASS   |

## Local targeted verification

| Control                       | Method                                                                      | Expected result                                           | Actual result / evidence                                                                                                                | Status |
| ----------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| MIME and magic-byte validator | `node --test` for shared file validation                                    | Only PDF/JPEG/PNG signatures and matching MIME accepted   | 3/3 tests passed                                                                                                                        | PASS   |
| Storage cleanup safety        | `node --test` for bounded cleanup/account-delete stop behavior              | Owner prefix only; failure stops destructive completion   | 3/3 tests passed                                                                                                                        | PASS   |
| Client attachment rules       | Targeted Vitest file                                                        | Correct allow-lists, limits, and safe Turkish mapping     | Passed                                                                                                                                  | PASS   |
| Repository security rules     | Targeted Vitest file                                                        | Owner-scoped repository behavior remains enforced         | Passed                                                                                                                                  | PASS   |
| Client privileged-secret scan | Tracked client/runtime source scan; `.env` tracking check                   | No service-role/admin/private key/token in client         | No privileged secret candidate; only `.env.example` tracked                                                                             | PASS   |
| Public Storage/log scan       | Search for public URL helpers and logs containing token/password/signed URL | No public URL and no sensitive log payload                | No `getPublicUrl`/public-object use. Development auth logging passes values through redaction; error-boundary diagnostics are sanitized | PASS   |
| PII path/source scan          | Search runtime source and inspect path generator                            | No operational e-mail, phone, plate, or PII filename/path | No operational PII candidate outside canonical legal contact content; generated object paths are UUID-based                             | PASS   |

The generated legal content intentionally contains the public privacy contact address from the
canonical legal documents. It is product/legal contact content, not an authentication secret or QA
user data, and is not written to logs or object paths.

## Manual Android checks still required

| Control                     | Method                                                                                                                       | Expected result                                                                                | Actual result / evidence                                                              | Status                |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------- |
| Destructive-action UI       | New APK: exercise all-record, all-reminder, all-vehicle-data, and account deletion; include double tap, failure, and restart | Loading/disabled state; no double execution; stable empty state after restart                  | Backend boundary verified; new APK UI/lifecycle acceptance is outstanding             | MANUAL CHECK REQUIRED |
| File picker and safe errors | Android picker with allowed, unsupported, spoofed, exact/over-limit files                                                    | Safe Turkish messages; no raw provider/path/URL                                                | Server controls verified; native picker/display still requires device acceptance      | MANUAL CHECK REQUIRED |
| Local notification cleanup  | Delete reminders/data with scheduled Android notifications                                                                   | Associated device notifications cancel/reconcile; User B irrelevant on-device state unaffected | Database row behavior verified; Android OS scheduling state cannot be proven remotely | MANUAL CHECK REQUIRED |
| Provider/admin log sample   | Supabase/Resend dashboards under least-privilege admin access                                                                | No PII, signed URL, token, or file content in operational logs                                 | Source scan passed; provider-side operational sample not performed                    | MANUAL CHECK REQUIRED |

## Legal and operational open items

| Control                        | Method                                                                                                           | Expected result                                     | Actual result / evidence                                                                                                     | Status                      |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Legal web publication          | Publish stable privacy and account-deletion URLs and link them from app/store                                    | Publicly reachable, versioned pages                 | TASK-014 verified all five URLs with HTTP 200 and connected the app live-first; APK/Play listing acceptance remains separate | PASS                        |
| KVKK and cross-border transfer | Product-owner and counsel assessment of Frankfurt processing, mechanisms, notices, and data flows                | Documented lawful decision and updated notices      | Open; technical isolation does not decide legal basis                                                                        | LEGAL/OPERATIONAL OPEN ITEM |
| Processor/subprocessor review  | Review Supabase and Resend roles, terms, DPA, locations, retention, and subprocessors                            | Approved and recorded operational/legal assessment  | Open                                                                                                                         | LEGAL/OPERATIONAL OPEN ITEM |
| Professional legal review      | Qualified review of notices, privacy policy, retention/deletion, incident response, and Play Data Safety answers | Written approval/action list                        | Required before production; not completed                                                                                    | LEGAL/OPERATIONAL OPEN ITEM |
| Closed-test acceptance         | Install a new artifact and complete the Android acceptance matrix                                                | Device evidence recorded against the exact artifact | Not performed by this task; no build was started                                                                             | MANUAL CHECK REQUIRED       |

## Commands and evidence

```powershell
node --test supabase/functions/_shared/fileValidation.test.mjs supabase/functions/_shared/storageCleanup.test.mjs
npx vitest run src/data/storage/attachmentRules.test.ts src/shared/utils/repositoryRules.test.ts
$env:QA_REMOTE_CONFIRM='ARACIM_CEPTE_REMOTE_QA'
$env:QA_EXPECTED_PROJECT_REF='eiqxvvnqkbzbhzpthcwo'
node scripts/qa-task013.mjs
node scripts/qa-task008.mjs
```

The TASK-013 remote run reported every targeted control `true`, no failed checks, no failure, and
`auth/database/storage=true` cleanup. The targeted TASK-008 recovery run also reported no failure and
complete User A/User B/Storage cleanup.

## Readiness separation

TASK-014 follow-up (2026-08-02): Beş hukuk URL'si artık public olarak HTTP 200 döndürmektedir ve
uygulamadaki görünür hukuk linkleri live-first/in-app fallback davranışına bağlanmıştır. Bu
TASK-013 snapshot'ındaki "henüz canlı değil" bulgusunu geçersiz kılar; yeni APK manuel kabulü ve
profesyonel hukuk incelemesi yine açıktır.

- **Security verification:** passed for the controls and environment recorded here.
- **Preview/closed-test APK:** still requires a separately built artifact and Android acceptance.
- **Google Play production:** not ready while release gates remain open or failed.
- **KVKK/legal:** readiness work remains open and requires professional legal review.
