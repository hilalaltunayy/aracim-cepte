# PLAN — P0 Auth ve Araç Verisi Blokerleri

## Goal

Android preview APK'de görülen e-posta doğrulama, parola kurtarma ve giriş sonrası araç verisi yükleme sorunlarının gerçek nedenlerini kanıtlayıp güvenli kod düzeltmelerini ve zorunlu dış ortam adımlarını ayırmak.

## Background

Kök dizindeki `01_auth_email_verification_issue.md`, `02_password_reset_recovery_issue.md` ve `03_vehicle_data_load_failure_after_login.md` gerçek cihaz bulgularını tanımlar. Mevcut TASK-015 auth callback mimarisi, Supabase Auth yapılandırması ve authenticated veri bootstrap zinciri korunacaktır.

## Current state

- Çalışma, kirli araştırma branch'inden ayrı olarak güncel `origin/develop` tabanlı `hotfix/p0-auth-data-blockers` worktree'inde yürütülüyor.
- Kodda doğrulama ve recovery callback rotaları mevcut; gerçek APK davranışı ile Dashboard/şablon/redirect ayarlarının uyumu henüz kanıtlanmadı.
- Giriş sonrası kullanıcıya yalnız genel bağlantı mesajı gösteriliyor; ilk başarısız backend işlemi ve gerçek Supabase hatası henüz saptanmadı.

## Scope

- Auth link üretimi, callback parse/session kurulumu, register/forgot/reset ekranları ve odaklı testleri.
- Oturum sonrası bootstrap sorgu sırası, Supabase repository sorguları, RLS/grant/migration ve ortam eşleşmesi.
- Kullanıcıya güvenli ama tanılanabilir hata sınıflandırması.
- Gerekirse yalnız additive yerel migration; remote deploy yok.
- Zorunlu Supabase Dashboard/EAS/ortam adımlarının belgelenmesi.

## Out of scope

- Premium, UI redesign, paket kimliği, signing, version/versionCode, APK/AAB üretimi.
- E-posta doğrulamasını kapatmak, RLS/Auth güvenliğini gevşetmek.
- İlgisiz refactor, production deploy veya mağaza değişikliği.

## Acceptance criteria

- Kayıt doğrulama linki onaylı app callback'ine yönlenir; başarılı kayıt e-posta teslimiyle yanlış eşitlenmez.
- Recovery linki dedicated reset ekranına gelir; yeni/tekrar parola doğrulanır, Supabase parolası güncellenir, oturum temizlenir ve Login'e dönülür.
- İlk authenticated veri sorgusu ve gerçek hata kategorisi kanıtlanır; genel internet mesajı gerçek nedeni gizlemez.
- Başka kullanıcı verisi açılmaz; RLS/Auth kontrolleri korunur.
- Odaklı auth/data testleri, scoped typecheck/lint ve `git diff --check` geçer veya açıkça raporlanır.

## Risks

- Dashboard redirect/email template ayarı kod dışıdır: kod ve manual ayar çift taraflı doğrulanacak.
- Remote şema ile migration geçmişi farklı olabilir: yalnız read-only inceleme yapılacak, deploy edilmeyecek.
- Hata mesajları hassas backend ayrıntısı sızdırabilir: kullanıcıya kategori, geliştiriciye redakte teknik metadata sağlanacak.

## Security/privacy impact

Auth tokenları URL/log/dokümana yazılmayacak. Service role/secret kullanılmayacak. Ownership/RLS değiştirilmeyecek veya gevşetilmeyecek. Remote sorgular yalnız read-only ve minimum metadata ile yürütülecek.

## Relevant files

- `src/store/authStore.ts`, `src/features/auth/*`, `src/app/auth/*`, `src/app/_layout.tsx`
- `src/store/dataStore.ts`, `src/data/supabase/*`, ilgili repository ve hata yardımcıları
- `app.json`, `eas.json`, auth ve deployment dokümanları
- `supabase/migrations/*`, `supabase/tests/*` (inceleme; yalnız gerekirse additive değişiklik)

## Implementation steps

1. **Completed:** Mevcut auth, data bootstrap, environment ve migration zincirini incele; kök nedenleri ve dış ortam sınırını kanıtla.
2. **Completed:** En dar kod düzeltmelerini ve odaklı regresyon testlerini uygula.
3. **Completed:** Read-only remote/config kanıtlarını topla; manual Dashboard/SMTP/migration adımlarını exact yaz.
4. **Completed:** Hedefli test/lint/typecheck/diff kontrollerini çalıştır ve tam diff/security incelemesi yap.

## Validation commands

- `npm test -- <targeted test files>`
- Değişen dosyalarda `npx eslint ...`
- `npx tsc --noEmit` veya repo içindeki scoped typecheck komutu
- `git diff --check`
- Uygunsa read-only `npx supabase migration list` ve güvenli remote probe; deploy/reset/build yok.

## Manual checks

- Supabase Dashboard Auth provider, Site URL, Redirect URLs, SMTP/log/email şablonu doğrulaması.
- Yeni preview APK üretildikten sonra gerçek Android cihazda kayıt, deep link, recovery ve araç bootstrap retesti.

## Rollback strategy

Kod değişiklikleri bağımsız hotfix commit'iyle geri alınabilir. Remote değişiklik yapılmayacak. Dashboard manual ayarı uygulanırsa önce mevcut değerler kaydedilecek ve yanlışlık halinde önceki değerlere geri dönülecek.

## Expected output

Kanıtlanmış üç kök neden, dar kod/test/dokümantasyon diff'i, güvenli manual Supabase adımları ve APK retest kontrol listesi.

## Do not change

`main`, package ID, signing, versioning, production build, Premium, mevcut kullanıcı verisi, Auth/RLS güvenlik sınırı.

## Completion report

### Completed

- EAS preview Supabase environment eşleşmesi ve public Auth/Data API probları tamamlandı.
- Missing remote tablolar/kolonlar ile ilk bootstrap failure zinciri kanıtlandı.
- Auth fail-closed signup, local confirmation parity, safe data error sınıflandırması ve focused testler eklendi.
- Manual Dashboard/SMTP/migration adımları `docs/bugs/p0-auth-vehicle-remediation.md` içinde kaydedildi.

### Skipped

- APK/AAB build ve remote deploy kullanıcı talimatıyla kapsam dışı.

### Failed

- Repository-wide typecheck, mevcut billing SDK/types ve eski render-test type hataları nedeniyle başarısız; değişen production dosyalarında yeni hata raporlanmadı.
- Repository-wide Vitest: 119 dosyanın 113'ü ve 576 testin 570'i geçti; TASK-037/038/039 ile iki eski route suite'inde bu kapsam dışı 6 failure var.
- Expo Doctor 20/21; mevcut SDK 57 patch-level sürüm farklarını bildirdi. Dependency upgrade kapsam dışı.

### Manual verification required

- Supabase Auth redirect/template/SMTP log ve delivery doğrulaması.
- Pending remote migration dry-run/review/deployment ve RLS negatif doğrulaması.
- Yeni preview APK ile gerçek Android cihaz kabulü; bu görev APK üretmez.
