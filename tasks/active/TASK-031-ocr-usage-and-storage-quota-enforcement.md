# TASK-031 — OCR kullanım ve Storage kota enforcement

**Status:** IMPLEMENTED — AWAITING REMOTE MIGRATION AND ANDROID VERIFICATION

## Goal

Merkezi Free/Premium entitlement değerlerini, on-device OCR için başarılı tanıma bazlı aylık kullanım
ve private attachment Storage için server-authoritative yazım limitlerine dönüştürmek.

## Plan

1. [x] TASK-022/025B/026/027/028/030 sözleşmelerini ve mevcut reservation akışını incele.
2. [x] Additive OCR reservation/usage ve plan-aware attachment quota migration'ını uygula.
3. [x] Üç OCR girişini ortak reservation→commit/release servisine bağla; yalnız minimal limit bilgisi göster.
4. [x] Hedefli Vitest, local SQL/RLS, lint/typecheck, diff ve görsel durum incelemesini tamamla.

## Security and privacy

- OCR raw text saklanmaz; yalnız purpose, UTC ay bucket'ı, idempotency operation ID ve zaman tutulur.
- İstemci entitlement veya byte değeriyle yetki veremez; attachment plan limitleri private resolver tarafında çözülür.
- OCR başarısız/boş/iptal ise reservation release edilir; yalnız başarılı non-empty tanıma commit edilir.
- Attachment/Storage geçici reservation'ları başarısız akışta kalıcı count veya byte tüketmez.
- RLS yalnız sahibinin usage özetini okutur; yazma/mutation RPC'lerle owner-scoped kalır.

## Manual checks

- Android: Free 0/3, 2/3, 3/3; Premium 30; başarısız OCR; iptal; document/fuel/maintenance OCR;
  Free 5/entity/25 MB, Premium 10/entity/100 MB ve vehicle-photo replacement/limit mesajları.

## Rollback

Forward migration, mevcut veri ve attachment'ları silmez. Gerekirse sonraki migration yeni reservation
oluşturmayı kapatır veya limit resolver'ını daraltır; committed usage ve private object'ler silinmez.
