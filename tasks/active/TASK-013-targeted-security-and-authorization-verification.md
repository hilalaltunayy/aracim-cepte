# TASK-013 — Hedefli güvenlik ve yetkilendirme doğrulaması

**Status:** SECURITY VERIFICATION PASSED — AWAITING LEGAL WEB PUBLICATION AND CLOSED TEST
**Owner:** Codex
**Created:** 2026-08-02
**Updated:** 2026-08-02

## Task ID

TASK-013

## Goal

Hukuk web sayfaları yayımlanmadan ve Google Play closed test hazırlanmadan önce V1 kullanıcı
izolasyonu, Storage, dosya/kota, RPC ve yıkıcı silme sınırlarını dar ve tekrar üretilebilir kanıtla
doğrulamak.

## Background

TASK-002 belge güvenliği hedefini tanımladı; TASK-004/TASK-008 doğrulanmış Supabase projesine teknik
uygulamaları deploy edip sentetik negatif test kanıtı üretti. TASK-009 bu durumu read-only inceledi.
Bu görev geniş regresyon yerine yalnız güncel güvenlik sınırlarını yeniden doğrular.

## Current state

- Linked ref ve `.env` public endpoint ref'i `eiqxvvnqkbzbhzpthcwo` ile eşleşmiştir.
- On local ve remote migration eşleşir; pending migration yoktur.
- `upload-attachment` v5, `delete-account` v1 ve `reconcile-attachments` v3 ACTIVE görünür.
- Önceki kanıtlar günceldir fakat bu görevde yeniden çalıştırılmayan kontrol yeni PASS sayılmaz.

## Scope

- İki sentetik kullanıcıyla DB/RLS, owner RPC, private Storage ve destructive-action negatif testleri.
- PDF/JPEG/PNG, WebP/spoof, 5 MB ve 10 belge/25 MB kota sınırları.
- Account deletion, eski session/URL ve aynı e-postayla yeniden kayıt izolasyonu.
- Function/RPC grant, client secret/log/path taraması.
- Güvenlik kanıt belgesi ve release gate güncellemesi.

## Out of scope

- Uygulama/UI redesign veya yeni ürün özelliği.
- Mevcut migration/schema değişikliği, database reset ve gerçek kullanıcı verisi. Tanı sırasında
  `upload-attachment` aynı repository kaynağından yeniden deploy edilmiş, finalde net runtime/source
  değişikliği bırakılmamıştır.
- Tam Vitest/E2E/regression/coverage, Expo Doctor ve EAS build.
- KVKK uyumluluk kararı, hukuk web yayını veya Play production readiness.

## Acceptance criteria

- [x] User A ve User B karşılıklı olarak foreign DB satırı okuyamaz/değiştiremez/silemez.
- [x] Foreign owner-scoped RPC çağrıları ve anon/PUBLIC private helper çağrıları reddedilir.
- [x] Bucket private; foreign list/download/signed URL/overwrite/delete/direct upload reddedilir.
- [x] PDF/JPEG/PNG kabul; WebP, spoof ve 5 MB üstü reddedilir; tam sınır belgelenir.
- [x] 10. belge ve 25 MB sınırı kabul; 11. belge ve 25 MB üstü reddedilir.
- [x] Retry/reservation/deletion/orphan recovery kontrolleri hedefli kanıtlanır.
- [x] Toplu records/reminders/vehicle-data ve hesap silme User B'ye dokunmaz.
- [x] Account delete Auth/DB/Storage/session/URL temizliğini ve aynı e-posta yeniden kayıt izolasyonunu sağlar.
- [x] Client secret/log/PII path taraması privileged secret veya hassas log bulmaz.
- [x] Sentetik Auth/DB/Storage verisi finalde temizlenir.

## Risks

- Remote test gerçek projeye bağlanır: exact ref kapısı, rastgele sentetik kimlik/e-posta ve `finally`
  cleanup zorunludur.
- Signed URL expiry testi zaman alır: yalnız test object'i ve kısa 60 saniye kullanılır.
- Bir kontrol başarısızsa yalnız minimum güvenlik düzeltmesi değerlendirilir; sonuç PASS yapılmaz.

## Security/privacy impact

Yüksek fakat sentetikle sınırlıdır. Secret değerleri çıktıya/loga yazılmaz; test object path'leri UUID
segmentlerinden oluşur. Gerçek kullanıcı sorgusu, export'u veya mutation'ı yapılmaz.

## Relevant files

- `scripts/qa-task013.mjs`: hedefli sentetik remote doğrulama ve cleanup.
- `supabase/functions/_shared/fileValidation.test.mjs`: MIME/magic/size saf testleri.
- `src/data/storage/attachmentRules.test.ts`: client güvenli allow-list/error mapping kanıtı.
- `docs/qa/v1-security-authorization-verification.md`: kontrol matrisi ve gerçek sonuçlar.
- `docs/release/v1-release-gates.md`: güncel release kanıt özeti.

## Implementation steps

1. **Completed:** Talimatları, TASK-002/008/009, security/release belgelerini ve son commitleri oku.
2. **Completed:** Linked ref, migration ve ACTIVE function envanterini read-only doğrula.
3. **Completed:** Hedefli yerel ve remote sentetik güvenlik testlerini çalıştır; cleanup'ı doğrula.
4. **Completed:** Kanıt matrisi, release gate ve completion report'u güncelle.
5. **Completed:** Diff/security review tamamlandı; commit ve `origin/main` push final teslim adımında.

## Validation commands

```powershell
node --test supabase/functions/_shared/bodyReader.test.mjs supabase/functions/_shared/fileValidation.test.mjs supabase/functions/_shared/storageCleanup.test.mjs
npx vitest run src/data/storage/attachmentRules.test.ts src/shared/utils/repositoryRules.test.ts
$env:QA_REMOTE_CONFIRM='ARACIM_CEPTE_REMOTE_QA'
$env:QA_EXPECTED_PROJECT_REF='eiqxvvnqkbzbhzpthcwo'
node scripts/qa-task013.mjs
node scripts/qa-task008.mjs
git diff --check
```

Tam test paketi, coverage, broad E2E, Expo Doctor ve build çalıştırılmaz.

## Manual checks

- Android UI'dan toplu silme ve hesap silme loading/double-tap/error/restart davranışı.
- Android picker ile exact-limit dosya seçimi ve güvenli Türkçe hata sunumu.
- Local notification cihaz schedule/cancel/reconciliation davranışı.
- Provider dashboard/loglarında PII, path veya signed URL bulunmadığının operasyonel incelemesi.

## Rollback strategy

Test scripti ve belgeler ayrı revert commit'iyle kaldırılabilir. Schema/deploy değişikliği yapılmaz;
sentetik veri testin `finally` cleanup'ında ve linked SQL doğrulamasında silinir.

## Expected output

TASK-013, hedefli test scripti, güncel kontrol matrisi/release gate, sentetik cleanup kanıtı, final
durum, commit SHA ve push sonucu.

## Do not change

Uygulama runtime/UI, mevcut migration/function kaynakları veya deploy'u, package/lockfile, Expo/EAS,
`.env*`, gerçek kullanıcılar ve gerçek Storage nesneleri.

## Completion report

### Completed

- Doğru linked ref, 10/10 migration eşleşmesi ve gerekli ACTIVE function envanteri doğrulandı.
- İki sentetik kullanıcıyla DB/RLS, owner RPC, private Storage, MIME/magic/size, kota, retry,
  destructive actions ve account deletion kontrolleri geçti.
- Eski session/signed URL ve aynı e-postayla yeni hesap izolasyonu geçti.
- TASK-008'in doğrudan ilgili interrupted reservation/orphan/reconciliation testleri geçti.
- Client secret, public URL, hassas log ve operasyonel PII/path taraması geçti.
- Sentetik Auth, DB ve Storage verisi kalıntısız temizlendi.

### Skipped

- Tam Vitest, broad E2E/UI regresyon, coverage, Expo Doctor, EAS build ve ilgisiz lint/typecheck
  kapsam kuralı gereği çalıştırılmadı.
- Gerçek Android ve provider/admin dashboard log örneklemi otomatik kanıt kapsamı dışında kaldı.

### Failed

Final kanıt koşusunda başarısız güvenlik kontrolü yok. Tanı sırasındaki iki test altyapısı sorunu
(5 MB+ gerçek gövdenin uzak bağlantıda timeout olması ve sign-out sonrası cleanup sırası) düzeltildi;
bunlar final ürün kusuru değildi.

Değişen tek JavaScript QA betiğinde hedefli ESLint komutu, mevcut ESLint yapılandırmasının kurulu
olmayan `@typescript-eslint` eklentisine referans vermesi nedeniyle dosya analizinden önce başlatılamadı.
Dependency değişikliği kapsam dışı bırakıldı; `node --check`, Prettier, hedefli yerel testler,
gerçek remote koşu ve `git diff --check` geçti.

### Manual verification required

- Yeni APK'da destructive-action loading/double-tap/error/restart ve file picker mesajları.
- Android local notification cancel/reconciliation.
- Supabase/Resend provider log örneklemi.
- Hukuk web yayını, KVKK/yurt dışı aktarım kararı ve profesyonel hukuk incelemesi teknik
  PASS'ten ayrı açık maddelerdir.

## Human acceptance result

**Result:** NOT REVIEWED
**Reviewed by:** —
**Date:** —
**Notes:** Google Play production readiness iddiası değildir.
