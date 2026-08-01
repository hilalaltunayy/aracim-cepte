# TASK-001 — Android cihaz geri bildirimi ve V1 polish

**Status:** AWAITING USER FEEDBACK  
**Owner:** Unassigned  
**Created:** 2026-08-01  
**Updated:** 2026-08-01

## Task ID

TASK-001

## Title

Android cihaz geri bildirimini kanıta dayalı V1 polish görevine dönüştürmek.

## Goal

Kullanıcının APK'yı gerçek Android cihazda denemesinden gelen görsel, işlevsel ve navigasyon
bulgularını kaydetmek; yalnız onaylanan V1 düzeltmelerini ayrı bir execution plan ile uygulamaya
hazır hale getirmek.

## User problem

`AWAITING USER FEEDBACK` — APK kullanımında yaşanan problem ve etkisi henüz paylaşılmadı.

## Current behavior

Repository belgelerinde Android JS/Hermes export kanıtı vardır ancak gerçek Android cihaz ve APK
kabulü tamamlanmış değildir. Kullanıcının bu APK'ya ilişkin somut geri bildirimi henüz kaydedilmedi.

## Desired behavior

Geri bildirim geldiğinde her bulgu ekran, cihaz, yeniden üretim adımı, beklenen/gerçek davranış ve
öncelikle kaydedilir; V1 kapsamındaki acceptance criteria insan tarafından onaylandıktan sonra
uygulama işi başlar.

## Feedback intake

### Screenshots

- `AWAITING USER FEEDBACK` — Görsel eklenmedi.

### Parent feedback

- `AWAITING USER FEEDBACK` — Ebeveyn geri bildirimi paylaşılmadı.

### User feedback

- `AWAITING USER FEEDBACK` — Kullanıcı geri bildirimi paylaşılmadı.

### Visual defects

- `AWAITING USER FEEDBACK` — Görsel kusur bildirilmedi.

### Functional defects

- `AWAITING USER FEEDBACK` — İşlevsel kusur bildirilmedi.

### Navigation issues

- `AWAITING USER FEEDBACK` — Navigasyon sorunu bildirilmedi.

### Mobile-only issues

- `AWAITING USER FEEDBACK` — Mobil-only sorun bildirilmedi.

## Scope

- [ ] Kullanıcı tarafından sağlanan APK geri bildirimini değiştirmeden kaydetmek.
- [ ] Her bulguyu V1 scope ve release gate ile eşlemek.
- [ ] Onaylanan düzeltmeler için ilgili dosya ve doğrulama kapsamını belirlemek.
- [ ] Uygulamadan önce [PLANS.md](../../PLANS.md) biçiminde execution plan hazırlamak.

## Out of scope

- Kullanıcı kanıtı veya acceptance criteria olmadan hata uydurmak.
- Bu task'ın mevcut `AWAITING USER FEEDBACK` aşamasında kod uygulamak.
- V1 dışı OCR, AI, billing, multi-user, OBD veya üretici entegrasyonları.
- Bağımlılık, migration, Supabase, Expo/EAS veya build değişikliği; ayrıca onaylanmadıkça.

## Acceptance criteria

- [ ] Her geri bildirim maddesi kaynak kişi, cihaz/Android sürümü, app/APK sürümü ve kanıtla kayıtlı.
- [ ] Yeniden üretim adımları, beklenen davranış ve gözlenen davranış ayrılmış.
- [ ] Görsel, işlevsel, navigasyon ve mobile-only bulgular ayrı sınıflandırılmış.
- [ ] Severity/priority ve V1 release etkisi insan tarafından onaylanmış.
- [ ] Uygulama scope'u ve `Do not change` sınırları kesinleşmiş.
- [ ] Otomatik ve gerçek cihaz doğrulama adımları yazılmış.
- [ ] Uygulama sonrası kullanıcı aynı APK/yenisi üzerinde kabul sonucunu kaydetmiş.

## Security/privacy requirements

- Ekran görüntülerinde e-posta, plaka, VIN, kimlik, belge, access token veya gerçek kullanıcı verisi
  varsa paylaşmadan/repository'ye eklemeden önce redakte edilmelidir.
- Test için ayrılmış hesap ve sentetik veri kullanılmalıdır.
- Auth, RLS, Storage ve silme davranışına dokunan her düzeltme negatif güvenlik testi gerektirir.
- Log ve ekran görüntülerine PII/secret eklenemez.

## Relevant screenshots or evidence

- `AWAITING USER FEEDBACK`
- İstenen minimum metadata: cihaz modeli, Android sürümü, APK/build kimliği, tarih, ekran/akış,
  yeniden üretim sıklığı ve ağ durumu.

## Relevant files

- `AWAITING USER FEEDBACK` — Kanıt incelenmeden kaynak dosya tahmin edilmeyecek.
- `docs/product/v1-scope.md`: V1 kapsam sınırı.
- `docs/release/v1-release-gates.md`: Release etkisi ve kabul durumu.
- `docs/manual-acceptance-test.md`: Mevcut gerçek cihaz kontrol listesi.

## Commands to run

```powershell
# AWAITING USER FEEDBACK — Exact komutlar onaylı scope ve execution plan ile eklenecek.
```

Build, Expo server, Supabase reset, remote test veya device install bu bekleme aşamasında
çalıştırılmayacaktır.

## Expected outputs

- Kanıta bağlı, önceliklendirilmiş defect listesi.
- Onaylı scope ve acceptance criteria.
- Uygulama başladığında güncel execution plan ve ayrıştırılmış validation raporu.

## Manual device checks

- [ ] `AWAITING USER FEEDBACK` — Kullanılacak cihaz ve kritik akışlar belirlenecek.
- [ ] Düzeltme sonrası aynı yeniden üretim adımları gerçek Android cihazda tekrarlanacak.
- [ ] Regression için [V1 kritik akışları](../../docs/product/v1-scope.md) etkisine göre seçilecek.

## Do not change

- Kullanıcı geri bildirimi ve kanıtı gelmeden hiçbir uygulama kaynak kodu.
- Migration, package/dependency, `.env`, Expo/EAS, Supabase, Android build ve mağaza ayarları.
- V1 dışı ürün davranışı.

## Completion checklist

- [ ] Geri bildirim alanları gerçek kanıtla dolduruldu.
- [ ] Execution plan onaylandı ve güncel tutuldu.
- [ ] Yalnız onaylı kapsam uygulandı.
- [ ] Acceptance criteria ve ilgili testler kanıtlandı.
- [ ] Diff ve security/privacy regression kontrolü tamamlandı.
- [ ] Completed/skipped/failed/manual checks ayrı raporlandı.

## Review checklist

- [ ] Bağımsız reviewer kanıt ile diff'i eşledi.
- [ ] Kapsam dışı refactor/özellik yok.
- [ ] Android cihaz sonucu ve regression kanıtı güncel.
- [ ] Blocker/critical açık bulgu yok veya release gate `Failed`.

## Human acceptance result

**Result:** NOT REVIEWED — AWAITING USER FEEDBACK  
**Reviewed by:** —  
**Date:** —  
**Notes:** Kullanıcının APK geri bildirimi henüz alınmadı; uygulama yapılmadı.
