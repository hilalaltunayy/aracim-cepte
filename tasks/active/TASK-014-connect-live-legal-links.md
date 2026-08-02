# TASK-014 — Canlı hukuk bağlantılarını bağlama

**Status:** IMPLEMENTED — AWAITING FINAL APK LEGAL-LINK VERIFICATION
**Owner:** Codex
**Created:** 2026-08-02
**Updated:** 2026-08-02

## Task ID

TASK-014

## Goal

Mobil uygulamadaki hukuk bağlantılarını merkezi ve HTTPS-only bir mekanizmayla canlı hukuk
sitesine bağlamak; bağlantı/ağ başarısızlığında mevcut uygulama içi belgeleri fallback olarak korumak.

## Background

TASK-003 kanonik hukuk içeriğini ve uygulama içi rotaları oluşturdu. Hukuk sitesi
`https://aracimcepte.hilalaltunay.com` altında yayımlandı. Kayıt ve Ayarlar → Yasal ve gizlilik
akışları şu anda yalnız uygulama içi rotalara gider.

## Current state

- Beş uygulama içi hukuk rotası ve generated canonical content korunuyor.
- Kayıt ekranı KVKK ve Gizlilik linklerini doğrudan in-app route'a gönderiyor.
- Yasal ve gizlilik liste ekranı beş satırı doğrudan in-app route'a gönderiyor.
- Expo SDK 57 `expo-linking` belgeleri `canOpenURL` ve `openURL` reject yollarının yakalanmasını
  gerektiriyor.

## Scope

- Beş exact canlı URL için tek merkezi sabit modül.
- HTTPS/host doğrulayan, ağ erişilebilirliğini ve Linking hatalarını güvenli yakalayan ortak helper.
- Kayıt ekranındaki iki ve hukuk liste ekranındaki beş linkte live-first, in-app fallback.
- Yalnız hedefli sabit/helper/component testleri.

## Out of scope

- Hukuk metni, tasarım, hesap silme işlemi veya route içeriği değişikliği.
- Supabase, migration, RLS, Edge Function, auth, reminder, dashboard, tema veya kullanıcı verisi.
- Dependency, Expo config, build/deploy, full test/E2E/coverage/Expo Doctor.

## Acceptance criteria

- [x] Raw canlı URL'ler yalnız tek merkezi modülde bulunur ve exact URL'ler test edilir.
- [x] Kayıt KVKK/Gizlilik linkleri live HTTPS sayfasını tercih eder.
- [x] Yasal ve gizlilik listesindeki beş link live HTTPS sayfasını tercih eder.
- [x] Offline/erişilemez/canOpenURL/openURL hatası güvenli Türkçe mesaj ve in-app fallback sunar.
- [x] HTTP ve beklenmeyen host/scheme reddedilir; raw hata/log yoktur.
- [x] Mevcut in-app hukuk rotaları ve destructive account deletion akışı korunur.
- [x] Hedefli testler, changed-file doğrulamaları ve diff kontrolü geçer.

## Risks

- `canOpenURL` ağ bağlantısını kanıtlamaz; kısa ve iptal edilebilir HEAD erişilebilirlik
  kontrolüyle offline fallback sağlanır.
- Harici tarayıcı cihaz davranışı otomasyonla tam kanıtlanamaz; final APK manuel kontrolü gerekir.

## Security/privacy impact

Yalnız sabit public HTTPS sayfaları açılır. Helper exact host + HTTPS dışını reddeder; URL,
provider hatası, token veya kişisel veri loglamaz. Hukuk sayfasının açılamaması kayıt olma
akışını bloke etmez.

## Relevant files

- `src/features/legal/legalLinks.ts`: merkezi sabitler ve güvenli opener.
- `src/features/legal/legalRoutes.ts`: geriye uyumlu merkezi liste export'u.
- `src/features/auth/registrationFlow.ts`: kayıt linklerinin merkezi kaynağı.
- `src/app/auth/register.tsx`: kayıt live-first davranışı.
- `src/app/legal/index.tsx`: beş hukuk satırının live-first davranışı.
- Hedefli unit/render testleri.

## Implementation steps

1. **Completed:** AGENTS, plan standardı, mevcut route/component ve SDK 57 Linking belgelerini oku.
2. **Completed:** Merkezi URL/helper ve TASK-014 planını oluştur.
3. **Completed:** Kayıt ve hukuk liste ekranlarını live-first/fallback akışına bağla.
4. **Completed:** Hedefli test ve changed-file kontrollerini çalıştır.
5. **Completed:** Diff/güvenlik incelemesi ve dokümantasyon tamamlandı; commit/push final teslim
   adımında.

## Validation commands

```powershell
npx vitest run src/features/legal/legalLinks.test.ts src/features/legal/legalRoutes.test.ts src/features/auth/registrationFlow.test.ts tests/routes/legalLinks.render.test.tsx
npx eslint <changed TypeScript/TSX files>
npx tsc --noEmit <targeted changed-file configuration or project gate if TypeScript cannot isolate safely>
git diff --check
```

Full test/E2E/coverage, Expo Doctor, EAS build ve Supabase remote test çalıştırılmaz.

## Manual checks

- Android APK online: yedi görünür linkin doğru browser URL'sini açması.
- Android APK offline ve browser bulunmayan/hata yolu: Türkçe mesaj → doğru in-app belge.
- Kayıt formunun website hatasında kullanılabilir kalması.
- Ayarlar içindeki destructive account deletion satırının aynen çalışması.

## Rollback strategy

Merkezi helper ve ekran bağlantı değişiklikleri ayrı revert commit'iyle kaldırılabilir; mevcut
in-app rotalar silinmediği için veri veya hukuk içeriği migration'ı gerekmez.

## Expected output

TASK-014, merkezi URL/helper, live-first kayıt ve ayarlar hukuk linkleri, hedefli test kanıtı,
commit SHA ve push sonucu.

## Do not change

Hukuk metinleri/generated content, account deletion işlemi, Supabase/migration/RLS/functions, auth
mantığı, reminder/dashboard/theme, package/config/env veya kullanıcı verisi.

## Completion report

### Completed

- Beş exact public URL tek `LEGAL_LINKS` kaynağına bağlandı; canlı endpoint'lerin tamamı HTTP
  200 döndürdü.
- Kayıt ekranındaki iki ve Yasal ve gizlilik ekranındaki beş link live-first ortak opener kullanıyor.
- HTTPS/exact-host allow-list, 5 saniyelik iptal edilebilir HEAD kontrolü, `canOpenURL`/`openURL`
  catch ve güvenli Türkçe in-app fallback eklendi.
- Mevcut in-app route/content ve Ayarlar'daki destructive account deletion akışı korunuyor.
- 4 hedefli test dosyasında 13 test, changed-file TypeScript ve ESLint kontrolleri geçti.

### Skipped

Full test/E2E/coverage, Expo Doctor, EAS build ve Supabase remote test kapsam kuralı gereği
çalıştırılmadı.

### Failed

İlk hedefli koşu saf helper içindeki React Native importu nedeniyle Node Flow parse hatası verdi;
platform adapter'ı ayrılarak düzeltildi. Final hedefli koşuda başarısız test/kontrol yoktur.

### Manual verification required

Yeni APK'da yedi görünür linkin browser geçişi, offline/Linking fallback'i ve hesap silme
regresyonu.

## Human acceptance result

**Result:** NOT REVIEWED
**Reviewed by:** —
**Date:** —
**Notes:** Final APK hukuk bağlantı kabulü beklenir.
