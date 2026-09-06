# TASK-043 — Premium PDF araç raporu + bulut belge yeniden indirme

Kaynak: `aracim-cepte-premium-pdf-report-spec.md` ve
`aracim-cepte-cloud-document-redownload-spec.md`. İki ayrı track, aynı batch.

## Goal

Premium kullanıcıya paylaşılabilir, print-friendly bir PDF araç raporu üretmek; ve her kullanıcının
daha önce yüklediği private belgeleri cihazına geri indirebilmesini sağlamak.

## Current state (audit, kanıtlanmış)

### Rapor / veri katmanı

- `src/features/reports/domain/vehicleReports.ts:95` — `buildVehicleReport` dönemsel toplam, yakıt,
  bakım, mesafe, tüketim ve karşılaştırmaları zaten deterministik üretiyor. PDF bunu yeniden
  hesaplamaz, aynı sonucu tüketir.
- `src/store/dataStore.ts:38-46` — `vehicles`, `records`, `reminders`, `bodyConditions`,
  `expertiseReports`, `notes`, `documents` tek store'da mevcut. PDF için yeni sorgu/şema gerekmedi.
- `src/features/bodyCondition/schemas.ts:162` — `bodySchemas` her kasa tipi için silhouette,
  windshield, rearWindow ve parça bazında SVG `path` taşıyor. PDF line-art bunu yeniden kullanır;
  3D'ye dokunulmadı.
- `src/shared/utils/analytics.ts:198` `getReminderDisplay` ve
  `src/features/documents/domain/documentStatus.ts:13` `getDocumentStatus` gecikmiş/yaklaşan
  hesabını zaten yapıyor.
- `expo-print` ve `expo-sharing` **kurulu değildi**; `expo install` ile SDK 57 sürümleriyle eklendi.

### Belge / storage katmanı

- `src/data/storage/attachments.ts:191` — `openAttachment` `vehicle-attachments` bucket'ında
  **60 saniyelik signed URL** üretip `Linking.openURL` ile açıyor. Bucket private.
- Yükleme `upload-attachment` Edge Function üzerinden; storage path'i server üretiyor, client
  override edemiyor.
- `attachments` tablosu `original_filename`, `mime_type`, `size_bytes`, `storage_path`,
  `created_at`, `parent_type/parent_id` tutuyor.
- Desteklenen türler yalnız `application/pdf`, `image/jpeg`, `image/png`
  (`attachmentConfig.ts:8`).
- **Local-only kalıcı attachment yok.** `Attachment` ve `LegacyAttachment` tiplerinin ikisi de
  zorunlu `storagePath` taşır; `uri` yalnız yükleme öncesi `PendingAttachment`'ta bulunur. Bu
  nedenle migration gerekmedi.

## Scope

1. PDF: pure document model + print-friendly HTML + injectable gateway + Premium gating.
2. İndirme: signed URL → cache → native save sheet → cleanup; her plana açık.
3. Premium copy: `Detaylı PDF araç raporu`, `Bulut belge arşivi ve yeniden indirme`.

## Out of scope

Auth, OCR, onboarding, 3D, Vehicle Assistant, RevenueCat purchase/restore/webhook, Supabase şeması,
mevcut raporlar dashboard'unun yeniden tasarımı, satışa hazırlık raporu (ayrı feature olarak
yapılmadı — PDF kapsamı bunu karşılıyor), aylık özet, yakıt anomalisi, bakım maliyet tahmini, OBD.

## Ürün kararı — indirme gating

Spec §8 iki seçenek sunuyor. Seçilen: **indirme her planda açık.** Kullanıcının kendi yüklediği
dosyaya erişimi abonelik bitince kesmek bulut arşivinin güvenilirliğini yok eder. Premium farkı
yükleme limiti, depolama kotası ve PDF raporda korunur.

## Acceptance criteria

- PDF yalnız aktif entitlement ile üretilir; Free kullanıcı butona basınca paywall'a gider.
- PDF ekran görüntüsü değil; veriden üretilmiş seçilebilir metin ve vektör line-art içerir.
- Türkçe karakter, TL ve tarih biçimleri doğru; kullanıcı metni HTML-escape edilir.
- Mevcut "Aç" davranışı değişmez; "Cihaza indir" ek olarak gelir.
- Bucket private kalır, public URL üretilmez, cache kopyası temizlenir.
- Başka kullanıcının path'i imzalanamaz; hata mesajı object varlığını sızdırmaz.

## Risks

- İki yeni native modül eklendi → mevcut binary üzerine OTA ile gitmez, yeni build şart.
- expo-print HTML motoru platforma özgü; sayfa kırılımı fiziksel cihazda doğrulanmalı.

## Rollback

Her track ayrı commit. `git revert` yeterli; migration veya remote mutasyon yok. Revert sonrası
`expo-print`/`expo-sharing` bağımlılıkları da geri alınır.
