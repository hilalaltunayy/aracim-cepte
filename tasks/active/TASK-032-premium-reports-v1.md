# TASK-032 — Premium Reports V1

**Status:** IMPLEMENTED — AWAITING ANDROID PREMIUM REPORTS ACCEPTANCE
**Owner:** Codex
**Created:** 2026-08-14
**Updated:** 2026-08-14

## Goal

Aktif araç için, mevcut Aracım Cepte görsel dilini koruyan, Premium yetkisiyle açılan ve kayıtlı veriye dayalı mobil raporlar sunmak.

## Current state

- TASK-031, PR #18 ile `develop` içine `560cb48b814f538d37a586faa8216aa5af8c98e7` commit'i olarak merge edilmiştir.
- Dashboard aktif aracın kayıtlarını saf `analytics.ts` yardımcılarıyla özetler; yeni bir raporlama route'u yoktur.
- `react-native-svg` ve merkezi `advancedReports` entitlement'ı mevcuttur. Rapor için yeni provider, storage, RLS erişim yolu veya migration gerekli görünmemektedir.

## Scope

- Aktif araç bağlamında dönem seçimi, maliyet özeti, trend, maliyet dağılımı, yakıt/bakım metrikleri ve deterministik özetler.
- Premium locked state, veri-yetersizliği durumları, erişilebilir grafik açıklamaları ve hedefli saf-domain/render testleri.
- TASK-032 tasarım/veri-kalitesi kararlarını belgelemek.

## Out of scope

- Home veya tab navigasyonunun yeniden tasarımı, AI, ödeme/paywall, yeni analitik SDK, backend aggregation, migration, remote deploy ve EAS build.

## Implementation plan

1. [x] TASK-031 merge ön koşulunu ve mevcut dashboard/entitlement/chart altyapısını doğrula.
2. [x] Mobil rapor hiyerarşisini mevcut tema ve sağlanan referanslardan türet; web dashboard kodu/dependency kullanma.
3. [x] Saf, araç-scope'lu rapor hesaplama/formatlama modelini ve hedefli testleri ekle.
4. [x] Premium report route'unu, sakin kart/area trend/breakdown görselleriyle Araç ekranından erişilebilir yap.
5. [x] Diff, hedefli test, lint/typecheck ve görsel/statik incelemeyi tamamla; PR/merge güvenli ise uygula.

## Data-quality and security

- Bilinmeyen kilometre/litre sıfırmış gibi gösterilmez; mesafe, tüketim, km başı maliyet ve önceki dönem oranı yalnız yeterli veriyle hesaplanır.
- Rapor yalnız mevcut store'un owner-scoped aktif araç verisini kullanır. Premium görünümü merkezi entitlement'ın fail-closed sonucuna göre kapalıdır; yeni RLS, secret veya kullanıcı verisi aktarımı yoktur.

## TASK-032B completion (2026-08-14)

- Hesaplamalar `vehicleReports` domain katmanında tutulur; ekran yalnız sunum modelini kullanır.
- Premium kullanıcıda seçili aracın mevcut verisi, diğer en fazla iki sahip olunan araç için repository üzerinden ayrı owner-scoped okumalarla birleştirilir. Karşılaştırma; kayıtlı maliyet, yakıt, bakım, mesafe ve km maliyetini yalnız yeterli veri olduğunda gösterir.
- Yakıt ve bakım trendleri aynı seçili dönemin sınırlı aylık bucket'larından üretilir. İstasyon ve bakım kalemi dağılımları kaydedilmiş normalleştirilmiş alanlara dayanır; eksik veri tahmin edilmez.
- Motion: KPI count-up, çizgi/alan soldan sağa reveal, oran çubuklarının sıfırdan giriş animasyonu ve dönem değişiminde tek seferlik fade/transition uygulanır. Döngüsel animasyon veya timer yoktur.
- Home, navigation, RLS, Storage ve şema değiştirilmez; migration gerekmez.

## Validation

```powershell
npx vitest run src/features/reports src/shared/utils
npx eslint <changed-files>
npx tsc --noEmit
git diff --check
```

## Manual verification required

- Android küçük/geniş telefonlarda Free locked, Premium zengin/sparse/boş veri, dönem değişimi, koyu/açık tema ve aktif araç A→B veri izolasyonu.

## Rollback

Bu görev yalnız additive istemci route/domain/belge değişikliğidir; commit geri alınabilir. Veri veya şema silinmez.

## Validation evidence

- 2026-08-14 / yerel: `npx vitest run src/features/reports/domain/vehicleReports.test.ts src/features/reports/services/vehicleReportLoader.test.ts src/features/reports/components/VehicleReportsScreen.test.tsx` → 3 dosya / 28 test geçti.
- 2026-08-14 / yerel: değişen dosyalara yönelik ESLint ve `git diff --check` geçti.
- `npx tsc --noEmit`, TASK-032 kaynak hatası vermedi; önceden var olan `authEmailConfirmation` ve `legalLinks` render-test tip hataları nedeniyle sıfır olmayan çıkış koduyla bitti.

## Manual Android acceptance

- Free locked; Premium dolu/yakıt-only/bakım-only/seyrek/boş veri; dönem değiştirme; açık/koyu tema; küçük/geniş telefon; A→B aktif araç verisi ve geri navigasyon kontrol edilmelidir.
- Screenshot tabanlı görsel QA, Codex in-app browser yerel Expo önizlemesine erişemediği için bu çalışma ortamında kanıtlanamadı. Android fiziksel kabulü sırasında küçük/normal/geniş telefon ve tablet genişliğinde özellikle grafik etiketleri, uzun TRY tutarları, dönem geçişi ve dört motion davranışı doğrulanmalıdır.
