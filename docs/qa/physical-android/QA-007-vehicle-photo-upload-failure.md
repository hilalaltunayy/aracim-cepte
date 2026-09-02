# QA-007 — Vehicle Photo Upload Failure

## Goal
Fix vehicle-profile photo upload for a Free user who has remaining quota.

## Current observation
UI shows `0/1 fotoğraf`, but upload fails with:
`Fotoğraf kaydedilemedi. Lütfen tekrar deneyin.`

## Required investigation
Trace:
- picker/camera result
- Android file URI
- preprocessing
- MIME/extension
- upload reservation/quota RPC
- storage bucket/path
- storage/RLS policy
- `vehicle_photos` insert
- primary photo assignment
- signed URL/readback

Supabase is connected. If a safe Supabase-side fix is required and available through Codex's connected access, perform and verify it directly.

Do not:
- make storage public,
- disable RLS,
- bypass owner scoping,
- weaken quotas.

## Acceptance criteria
- [ ] Free user at 0/1 can upload one photo.
- [ ] Photo appears immediately and after restart.
- [ ] Primary-photo behavior remains correct.
- [ ] Second Free photo remains blocked.
