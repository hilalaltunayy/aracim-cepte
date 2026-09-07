# Vehicle Profile Photo Persistence Fix — Durable Cloud Storage, Rehydration, and Cross-Device Consistency

**Project:** Aracım Cepte  
**Scope:** Vehicle profile/gallery photo persistence only  
**Priority:** P1 functional reliability  
**Implementation rule:** Keep this issue isolated. Do not redesign the Vehicle screen, 3D vehicle view, tabs, or unrelated photo/document flows.

---

## 0. Problem summary

A vehicle photo can be selected and appears correctly during the active session:

- the small vehicle/avatar icon beside the vehicle title is replaced by the selected vehicle photo
- the "Profil fotoğrafı" area inside "Araç fotoğrafları" shows the selected image

But after leaving and reopening the app with the same account, the photo disappears and the UI falls back to the default vehicle icon.

This strongly suggests the current flow is relying on a transient/local-only source such as a temporary local URI, in-memory state, cache-only path, non-persisted state, or a backend photo record that is not correctly reloaded.

This is a persistence defect, not a visual-design issue.

---

## 1. Reference image

Use `01-vehicle-photo-persistence-problem.png`.

The red-marked areas identify both places that must consistently show the persisted profile photo:

1. the small vehicle image/avatar beside the vehicle name/details
2. the "Profil fotoğrafı" area inside the vehicle photo section

---

## 2. Non-negotiable expected behavior

Once a photo is successfully saved as the vehicle profile photo, it must remain after:

- navigating away and back
- background/foreground
- fully killing and reopening the app
- signing out and signing back in with the same account
- reinstalling the app, assuming backend account/data still exists
- logging into the same account on another device

The source of truth therefore cannot be only a local device URI.

The persisted source of truth must be cloud-backed through the existing Supabase database/storage architecture.

---

## 3. Required audit before editing

Trace the complete existing vehicle-photo flow before changing code.

Audit at minimum:

1. image picker/camera result and URI type (`file://`, `content://`, cache URI, etc.)
2. upload code path
3. Supabase Storage bucket
4. storage path convention
5. DB table/columns that represent vehicle photos
6. how the current profile photo is identified
7. whether the project already uses `vehicle_photos`, unified attachments, `is_profile`, `sort_order`, a profile-photo foreign key/path, or another equivalent model
8. existing vehicle profile/gallery migrations
9. linked remote migration state
10. RLS policies
11. Storage policies
12. bootstrap/data-store reload behavior
13. whether the UI saves or reuses a temporary local URI instead of a durable storage path
14. signed URL generation/expiry behavior
15. whether signed URLs are being persisted incorrectly
16. whether state reset/bootstrap clears photo data
17. vehicle/account isolation
18. whether header/avatar and "Profil fotoğrafı" currently read from different sources

Do not create a second photo system if an existing one already exists.

---

## 4. Required persistence architecture

### 4.1 Persist to cloud storage

After the user confirms/adds a vehicle photo:

1. validate the selected file
2. upload it using the existing vehicle-photo Storage architecture
3. save a durable storage reference/path in the database
4. mark/select the intended profile photo using the existing domain model
5. update local state only after persistence succeeds, or use an optimistic update with safe rollback

A raw local value such as `file:///...` must never be the long-term canonical profile-photo value.

### 4.2 Persist stable object paths, not short-lived signed URLs

If the bucket is private:

- persist the stable object path/key
- generate a fresh signed/renderable URL when needed
- reuse existing attachment/image URL resolver logic if available

Do not store an expiring signed URL as the source of truth.

### 4.3 One canonical profile-photo source

The following surfaces must resolve from the same canonical vehicle profile-photo state:

- vehicle header/avatar
- "Profil fotoğrafı" section
- existing vehicle cards/previews that already use the profile photo

Do not keep independent permanent URI state per component.

---

## 5. Rehydration requirements

On app startup/data bootstrap:

1. restore the authenticated user's vehicles
2. load persisted vehicle-photo metadata
3. resolve the active vehicle's current profile photo
4. generate/restore a renderable URI
5. populate the UI from backend state

The user must not have to reopen the photo editor.

If URL generation is asynchronous, the default placeholder may appear briefly, but it must not overwrite the persisted photo state.

---

## 6. Cross-device and reinstall requirement

A complete fix must pass this scenario:

1. Account A uploads a profile photo on Device 1.
2. Kill/reopen Device 1 → photo remains.
3. Sign out/in as Account A → photo remains.
4. Log into Account A on Device 2 → photo appears.
5. Reinstall on Device 1 and log into Account A → photo appears again.

AsyncStorage/local-cache-only persistence is not sufficient. Local caching may only be a performance optimization.

---

## 7. Replace/cache behavior

If the user replaces the profile photo:

- the new image should appear after successful save
- old cached content must not remain indefinitely
- reuse the project's existing image caching/cache-busting approach
- do not scatter random query parameters through UI components

---

## 8. Delete behavior

Audit current behavior for:

- deleting the active profile photo
- deleting a gallery photo that is profile
- deleting a vehicle
- replacing the profile photo

Required consistency:

- profile reference must be cleared/reassigned safely
- DB metadata and Storage cleanup must remain consistent
- failed DB operations must not leave broken profile references
- newly uploaded orphan files should be cleaned up when safe if metadata persistence fails

Do not turn this into a gallery redesign.

---

## 9. Security / ownership

Verify:

- user can only upload to their own vehicle
- user can only read authorized vehicle photos
- storage paths cannot overwrite another user's object
- profile-photo updates are scoped to the authenticated user's vehicle
- no public-bucket conversion is used merely to simplify rendering

Do not weaken RLS or Storage policies.

---

## 10. Error handling

Do not report success if the image only exists locally but cloud persistence failed.

Keep useful diagnostics for:

- picker failure/cancel
- invalid/unsupported file
- file-read failure
- upload failure
- DB metadata failure
- profile assignment failure
- signed URL/read failure
- auth/RLS/storage permission failure
- network failure

If upload succeeds but metadata save fails, clean up safely and restore the previous profile state where possible.

---

## 11. Tests required

Add focused tests around the real persistence layer.

At minimum:

1. a selected local image URI is not persisted as the canonical profile-photo value
2. successful upload stores a durable storage reference
3. saved profile photo rehydrates after store/bootstrap reload
4. app-state reset + reload resolves the same photo
5. logout/login does not leak another user's photo
6. two vehicles keep distinct photos
7. replacing profile photo updates canonical state
8. failed upload does not mark photo as saved
9. failed metadata/profile assignment rolls back appropriately
10. signed/renderable URL can be regenerated from the persisted storage path
11. header/avatar and "Profil fotoğrafı" use the same canonical source
12. deleting the active profile photo follows existing product rules safely

Extend existing Supabase/photo tests if they already exist instead of building a parallel testing system.

---

## 12. Supabase validation

Inspect local migrations and the linked remote project for vehicle-photo support.

Check:

- expected table exists
- expected columns exist
- expected RPC exists, if applicable
- migration history is aligned
- Storage bucket exists
- RLS policies exist
- Storage policies exist

Do not blindly push unrelated migrations.

If one narrowly required migration is missing, identify it precisely and apply only that migration if the environment permits. Do not delete existing photo data.

---

## 13. UI constraints

This is not a redesign task.

Keep the current:

- Vehicle screen structure
- 3D vehicle view
- photo section
- vehicle/avatar placement
- gallery/profile-photo semantics
- bottom tabs

Only fix persistence and the minimal loading/error behavior required for correctness.

---

## 14. Manual QA

### Scenario A — same session
1. Add profile photo.
2. Confirm both marked locations show it.
3. Navigate away/back.
4. Confirm it remains.

### Scenario B — cold restart
1. Kill app.
2. Reopen.
3. Open same vehicle.
4. Confirm both locations show the photo without re-upload.

### Scenario C — logout/login
1. Log out.
2. Log back into same account.
3. Confirm photo returns.

### Scenario D — two vehicles
1. Give Vehicle A and Vehicle B different photos.
2. Switch between them.
3. Confirm no cross-contamination.

### Scenario E — another installation/device
1. Log into same account on another device/install.
2. Confirm backend photo appears.

### Scenario F — replace
1. Replace profile photo.
2. Confirm both UI surfaces update.
3. Restart app.
4. Confirm replacement persists.

---

## 15. Acceptance criteria

- [ ] Vehicle profile photo is durably stored in Supabase-backed storage/data.
- [ ] Canonical saved value is not a temporary local URI.
- [ ] Photo survives navigation.
- [ ] Photo survives full app restart.
- [ ] Photo survives logout/login.
- [ ] Photo can load on another device with the same account.
- [ ] Photo survives reinstall when backend data still exists.
- [ ] Header/avatar and "Profil fotoğrafı" share one source of truth.
- [ ] Two vehicles cannot mix photos.
- [ ] Two accounts cannot mix photos.
- [ ] Replacement persists after restart.
- [ ] Deletion/reassignment remains consistent.
- [ ] Private/signed URL handling is renewable and safe.
- [ ] RLS/Storage ownership remains secure.
- [ ] Existing Vehicle layout is not redesigned.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Focused tests pass.
- [ ] Android/Expo production validation passes.

---

## 16. Explicitly out of scope

Do not use this task to:

- redesign the Vehicle screen
- redesign the photo gallery
- redesign the 3D car
- redesign tabs
- change Premium entitlement logic
- change Documents/OCR flows
- create a new generic attachment architecture if an existing one already exists
- make Storage public
- broadly refactor dataStore

---

## 17. Required final response from Claude

When complete, return:

1. exact root cause of why the photo disappeared after restart
2. where the image was stored before
3. where/how it is persisted now
4. exact DB table/column/storage path used as source of truth
5. how profile photo is rehydrated on app launch
6. how header/avatar and "Profil fotoğrafı" now share the same source
7. how signed/private URL handling works
8. how replacement/deletion is handled
9. any Supabase migration/RLS/Storage change required
10. files changed
11. tests added
12. commands run and results
13. what was manually/device tested
14. anything not tested because of environment limitations
15. remaining known limitations

Do not return only "fixed".

---

## 18. Final warning

Do not solve this by persisting a local `file://` URI in AsyncStorage.

That may survive one restart on one device but will fail after reinstall, cache cleanup, path changes, or cross-device login.

The durable source of truth must be the authenticated user's backend vehicle-photo data.
