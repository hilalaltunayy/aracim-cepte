# TASK-001 — Android cihaz geri bildirimi ve V1 polish

**Status:** IMPLEMENTED — AWAITING ANDROID DEVICE ACCEPTANCE

**Owner:** Codex

**Created:** 2026-08-01

**Updated:** 2026-08-01

## Task ID

TASK-001

## Title

Android cihaz geri bildirimine dayalı hedefli V1 kullanılabilirlik ve görsel tutarlılık düzeltmeleri.

## Goal

Kullanıcının gerçek Android cihaz kanıtlarında görülen kayıt, şifre görünürlüğü, alt navigasyon,
tipografi, form etiketi, dosya mesajı ve Hakkında alanı sorunlarını; mevcut ürün dili, güvenlik
sınırları ve V1 kapsamı korunarak düzeltmek.

## User problem

- E-posta doğrulaması zorunlu olmasına rağmen kayıt sonrası kullanıcıya hemen araç ekleyebileceği
  söyleniyor.
- Android üç düğmeli sistem navigasyonu uygulamanın alt sekme ikon ve etiketlerini örtüyor.
- Şifre göz ikonu kalıcı toggle davranışı gösteriyor; kullanıcı yalnız basılı tuttuğu sürede görmek
  istiyor.
- Kayıt ekranındaki hukuk metinleri açık rıza izlenimi vermeden daha açık sunulmalı.
- Büyük başlıklar ve gövde durumu metinleri gereğinden bloklu/ağır görünüyor.
- Formlardaki “(isteğe bağlı)” ekleri görsel kalabalık oluşturuyor.
- Fotoğraf ve belge seçimi hata metinleri kaynak türüne göre yeterince açık değil.
- Ayarlar → Hakkında alanında geliştirici adı görünmüyor.

## Current behavior

- Kayıt başarı alert’i “Hesabınız oluşturuldu / Artık araç bilgilerinizi ekleyebilirsiniz.” diyor ve
  kök rotaya yönlendiriyor.
- Login ve yeni şifre ekranlarındaki göz ikonu tap ile açık/kapalı kalıyor; kayıt ekranında göz ikonu
  yok.
- Kayıt ekranında hukuk rotaları var ancak bir bağlantı “okudum” ifadesi kullanıyor.
- Inter 400/500/600/700 ağırlıkları yüklü; merkezi typography token’ları bulunmasına rağmen ekran ve
  section başlıkları 700 ağırlığıyla bloklu görünüyor.
- Floating tab bar sabit `height`, `paddingBottom` ve `marginBottom` kullanıyor; gerçek bottom inset
  hesaba katılmıyor.
- `Screen` scroll içeriği sabit alt padding kullanıyor.
- Bazı form etiketlerinde görünür “(isteğe bağlı)” eki bulunuyor.
- Attachment hata eşlemesi fotoğraf ve belge seçimini ayırmıyor.

## Desired behavior

Yalnız onaylı maddeler uygulanır: kayıt sonrası doğrulama success state’i, e-posta prefill’li login,
bilgilendirme niteliğinde hukuk linkleri, basılı tutarak şifre gösterme, Inter tabanlı yumuşatılmış
merkezi başlık sistemi, görünür optional eklerinin kaldırılması, safe-area uyumlu merkezi tab bar,
kaynağa uygun güvenli dosya mesajları ve geliştirici bilgisi.

## Feedback intake

### Screenshots

Kullanıcı bu Codex mesajında yedi gerçek Android ekran görüntüsü sağladı. Görseller geçici mesaj
ekleridir; repository’ye kopyalanmayacak, commit edilmeyecek ve TASK içinde dosya yolu/PII
saklanmayacaktır.

Kanıt özeti:

1. Kayıt sonrası yanlış başarı alert’i ve e-posta doğrulama beklentisi.
2. Login kartı ve mevcut göz ikonu davranışı; ekrandaki gerçek e-posta redakte edildi.
3. Dashboard başlık ağırlığı ve üç düğmeli Android navigasyonun floating tab bar’ı örtmesi; gerçek
   plaka redakte edildi.
4. Araç bilgileri ekranında “Model yılı (isteğe bağlı)” ve “Plaka (isteğe bağlı)” etiketleri.
5. Gövde durumu ekranında “ÜSTTEN GÖRÜNÜM”, seçili parça, kart başlığı ve status hiyerarşisi.
6. Ekspertiz ekranında “Ek dosya (isteğe bağlı)” ve dosya seçme aksiyonları.
7. Ayarlar ekranında tab bar/system navigation çakışması ve mevcut Hakkında alanı.

### Evidence limits

- Cihaz modeli, Android sürümü ve APK/build kimliği görsel kanıttan güvenle belirlenemedi.
- Basılı tutma, blur/cancel, deep link, klavye, gesture navigation ve ekran okuyucu davranışı statik
  ekran görüntüleriyle doğrulanamaz; yeni APK üzerinde manuel test gerekir.
- Görseller PII içerdiği için repository kanıtı olarak saklanmadı.

### User feedback and approved decisions

- Kayıt sonrası e-posta doğrulaması anlatılacak; otomatik login veya araç ekleme iddiası olmayacak.
- Login e-postası prefill olacak, parola taşınmayacak.
- KVKK Aydınlatma Metni ve Gizlilik Politikası bağlantıları bilgilendirme olarak sunulacak; zorunlu
  rıza checkbox’ı olmayacak.
- Tüm parola alanları yalnız fiziksel basılı tutma sırasında görünür olacak.
- Mevcut Inter ailesi ve aqua/turquoise palet korunacak; yeni font/dependency eklenmeyecek.
- Görünür optional suffix’ler kalkacak fakat validation değişmeyecek.
- Tab bar gerçek bottom inset ile merkezi olarak yerleşecek.
- Fotoğraf ve belge seçimi için farklı, güvenli Türkçe format mesajları kullanılacak.
- SUV / Crossover V1’de gruplu kalacak; yeni SVG veya 3D model olmayacak.
- Native date picker ve genel alert sistemi yeniden tasarlanmayacak.
- Hakkında alanına “Geliştirici / Hilal Yeşim Altunay” eklenecek.

### Severity and V1 impact

- **P1 / release-critical:** Yanlış kayıt completion mesajı; Android tab bar’ın sistem navigasyonuyla
  çakışması.
- **P1 / security-accessibility:** Şifrenin release/cancel/blur/background sonrası görünür
  kalabilmesi; hukuk metninin rıza gibi algılanması.
- **P2 / V1 polish:** Başlık hiyerarşisi, optional suffix’ler, dosya mesajları ve geliştirici bilgisi.

## Scope

- [x] Kayıt success state’i, doğrulama metni ve e-posta prefill’li login navigasyonu.
- [x] Kayıt ekranında iki kanonik hukuk rotasına bilgilendirme linkleri.
- [x] Login, kayıt ve yeni şifre/tekrar alanlarında press-and-hold visibility davranışı.
- [x] Inter tabanlı merkezi page/section/card/label/status typography token düzeltmesi.
- [x] Gövde durumu ekranının aynı token’larla tipografik iyileştirilmesi.
- [x] Görünür “(isteğe bağlı)” / “İsteğe bağlı” label eklerinin kaldırılması.
- [x] Bottom inset’e göre hesaplanan merkezi floating tab bar ve scroll content padding’i.
- [x] Fotoğraf/belge seçimi için kaynak türüne uygun güvenli Türkçe hata eşlemesi.
- [x] Ayarlar → Hakkında alanına geliştirici bilgisinin eklenmesi.
- [x] Gelecekte distinct template olduğunda body type ayrımını değerlendiren iç ürün notu.
- [x] Odaklı test, typecheck, lint, legal freshness ve diff/security review.

## Out of scope

- Onboarding, login kartı, dashboard kartları, listeler veya paletin geniş redesign’ı.
- Date picker ve genel native alert replacement.
- 3D araç modeli, SVG geometrisi veya yeni body silhouette.
- Dashboard hesapları, maliyet/istatistik/business logic, auth güvenliği veya deep-link davranışı.
- Database schema, migration, RLS, Storage policy, kota veya remote Supabase değişikliği.
- Dependency/package, Expo/EAS/Android build ayarı, build, deploy veya remote E2E.

## Acceptance criteria

- [x] Başarı başlığı “E-postanızı doğrulayın” ve mesajı onaylı exact copy’dir.
- [x] “Giriş ekranına dön” login’e gider ve normalize edilmiş kayıt e-postasını prefill eder.
- [x] Parola success anında temizlenir; route parametresi/session içinde taşınmaz ve otomatik login yoktur.
- [x] İki hukuk metni mevcut uygulama rotalarında açılır; rıza/“okudum” checkbox’ı yoktur.
- [x] Beş parola alanı hidden başlar, press-in ile görünür ve release/cancel/blur/background ile gizlenir.
- [x] Göz kontrolü “Şifreyi görmek için basılı tutun” accessibility label’ını kullanır.
- [x] Merkezi heading sistemi Inter semibold/balanced bold, tutarlı line-height ve letter-spacing kullanır.
- [x] Body-condition eyebrow, seçili parça, kart heading ve status stilleri merkezi sisteme uyar.
- [x] Hiçbir kullanıcı form label’ında “(isteğe bağlı)” veya standalone “İsteğe bağlı” görünmez;
      required validation değişmez.
- [x] Tab bar height, bottom padding ve bottom offset gerçek inset’ten hesaplanır; scroll sonu bar altında
      kalmaz ve zero inset’te gereksiz boşluk oluşmaz.
- [x] Fotoğraf seçimi yalnız JPG/JPEG/PNG; belge seçimi PDF/JPG/JPEG/PNG mesajını verir.
- [x] 5 MB, 10 belge, 25 MB ve unknown mesajları onaylı exact copy’dir; raw provider error gösterilmez.
- [x] “Geliştirici / Hilal Yeşim Altunay” mevcut Settings card/list sistemiyle görünür; sürüm korunur.
- [x] Ekran görüntüleri git status veya commit içeriğinde bulunmaz.

## Security/privacy requirements

- Ekran görüntülerindeki gerçek e-posta/plaka repository’ye veya completion report’a yazılmaz.
- Parola hiçbir route parametresi, kalıcı store, log, test fixture veya success state içinde tutulmaz.
- Password field keyboard/autofill/secureTextEntry davranışı korunur.
- Aydınlatma metni açık rıza değildir; genel zorunlu açık rıza checkbox’ı eklenmez.
- MIME, magic-byte, boyut, kota, private Storage ve RLS enforcement değiştirilmez/zayıflatılmaz.
- Raw Supabase/provider hataları kullanıcıya gösterilmez.

## Relevant files

- `src/app/auth/login.tsx`, `register.tsx`, `reset-password.tsx`
- `src/features/auth/registrationFlow.ts`, `passwordVisibility.ts`
- `src/shared/components/ui.tsx`
- `src/shared/theme/index.ts`
- `src/app/(tabs)/_layout.tsx`
- `src/shared/utils/bottomTabLayout.ts`, `formLabels.ts`
- `src/features/bodyCondition/BodyDiagram.tsx`, `src/app/body-condition/index.tsx`
- Form ekranları ve `src/shared/components/AttachmentField.tsx`
- `src/data/storage/attachments.ts`, `attachmentRules.ts`
- `src/app/(tabs)/settings.tsx`, `src/features/settings/about.ts`
- `docs/product/vehicle-domain-guide.md`

## Implemented files

- **Auth UX:** `src/app/auth/login.tsx`, `register.tsx`, `reset-password.tsx`,
  `src/features/auth/registrationFlow.ts`, `passwordVisibility.ts` ve odaklı testleri.
- **Central UI/layout:** `src/shared/components/ui.tsx`, `src/shared/theme/index.ts`,
  `src/app/_layout.tsx`, `src/app/(tabs)/_layout.tsx`, `src/shared/utils/bottomTabLayout.ts`,
  `formLabels.ts` ve testleri.
- **Targeted typography/forms:** body-condition, vehicle, record, reminder, expertise ve document form
  ekranları ile `AttachmentField.tsx`.
- **Attachment copy:** `src/data/storage/attachmentRules.ts`, `attachments.ts` ve mevcut test dosyası.
- **About/product note:** `src/app/(tabs)/settings.tsx`, `src/features/settings/about.ts` ve testi,
  `docs/product/vehicle-domain-guide.md`.

## Execution plan

### Goal

Onaylı Android geri bildirimini tek kapsamlı, test edilebilir ve geri alınabilir V1 polish diff’iyle
uygulamak.

### Background

Yedi kullanıcı ekran görüntüsü ve bu görevdeki exact UX kararları kaynak kabul edilir. TASK-002/003/004
güvenlik, hukuk source-of-truth ve Storage sınırları korunur.

### Current state

Onaylı scope uygulandı. Odaklı ve tam unit testleri, typecheck, lint ve legal-content freshness geçti;
repository diff/security review tamamlandı. Görsel ve etkileşim kabulü yeni Android APK’yı bekliyor.

### Scope / Out of scope / Acceptance criteria

Bu task’ın aynı adlı bölümleri bağlayıcıdır.

### Risks

- Password press event’inin cancel/background durumunu kaçırması: merkezi component ve saf state testleri.
- Tab bar’ın büyük inset’te aşırı yüksek veya küçük inset’te yetersiz olması: saf layout hesap testi ve
  gerçek cihaz kabulü.
- Registration parametresinde parola sızıntısı: route helper yalnız normalize edilmiş e-posta döndürür.
- Merkezi typography değişiminin reflow yaratması: dar Android portrait manuel kontrolü.

### Security/privacy impact

Auth credential işleme değişmez; yalnız parola visibility ömrü kısaltılır. Legal içerik kaynağı
değişmez. Storage/server enforcement değişmez. PII içeren görseller kalıcılaştırılmaz.

### Implementation steps

1. **Completed:** TASK kanıtı ve planı güncellendi.
2. **Completed:** Registration/legal/password davranışları merkezi yardımcılarla uygulandı.
3. **Completed:** Typography, form labels, body condition ve safe-area düzeni uygulandı.
4. **Completed:** Attachment mesajları ve developer row’u uygulandı.
5. **Completed:** Odaklı testler → tam unit suite → typecheck/lint/legal freshness → diff/security review.
6. **In progress:** Kanıt raporu, commit ve `origin/main` push.

### Validation commands

```powershell
npx vitest run <focused test files>
npm run typecheck
npm run lint
node scripts/generate-legal-content.mjs --check
git diff --check
```

Remote Supabase E2E, database reset, coverage, Expo/EAS build ve production deploy çalıştırılmaz.

### Manual checks

- Android üç düğmeli ve gesture navigation’da tab ikon/etiket/tap alanı.
- Dar portrait genişlikte son scroll içeriğinin görünürlüğü.
- Kayıt → success → login email prefill; parola boş; confirmation deep-link/resend regression.
- Login/register/reset alanlarında press, release, drag-away, cancel, blur, background ve navigation.
- TalkBack accessibility label/focus ve keyboard/autofill.
- Heading reflow/Türkçe karakterler; body-condition hiyerarşisi.
- Fotoğraf/belge picker gerçek cihaz hata mesajları.

### Rollback strategy

Tek commit; veri/migration/remote durum değişikliği yoktur. Gerekirse ilgili UI commit’i yeni bir revert
commit’iyle geri alınabilir.

### Expected output

Onaylı UI/auth polish kodu, odaklı testler, güncel TASK-001 kanıtı, temiz diff, commit ve push sonucu.

### Do not change

Bu task’ın `Out of scope` bölümü ve kullanıcının mevcut palette/business/security sınırları.

## Vehicle body type future note

V1’de aynı SVG/body template’i kullanan **SUV / Crossover** gruplu kalır. Ayrı ve doğrulanmış template’ler
hazırlandığında Sedan, Hatchback, Station wagon, Coupe, Convertible, SUV/Crossover, Pickup,
Van/Minivan ve Light commercial ayrımı ayrı bir ürün/architecture task’ında değerlendirilebilir. Bu
not kullanıcıya görünür unfinished feature değildir.

## Commands to run

Execution plan içindeki validation commands geçerlidir.

## Automated validation results

- Focused Vitest: 6 dosya / 19 test geçti.
- Full Vitest: 18 dosya / 90 test geçti.
- `npm run typecheck`: geçti.
- `npm run lint`: geçti.
- `node scripts/generate-legal-content.mjs --check`: generated içerik güncel.
- `git diff --check`: geçti.
- Source/scope scan: eski kayıt copy’si, tap-toggle şifre metni ve test dışı optional suffix yok;
  migration/package/env/build dosyası değişmedi.

## Expected outputs

- Hedefli V1 polish diff’i ve odaklı test kanıtı.
- Status: `IMPLEMENTED — AWAITING ANDROID DEVICE ACCEPTANCE`.
- Gerçek cihazda yeni APK kabulü gelene kadar task `tasks/active/` altında kalır.

## Manual device checks

Execution plan `Manual checks` bölümü bağlayıcıdır.

## Do not change

Execution plan ve `Out of scope` sınırları bağlayıcıdır.

## Completion report

### Completed

- Kullanıcı geri bildirimi ve yedi ekranlık redakte görsel kanıt özeti kaydedildi.
- Onaylı scope, riskler, acceptance criteria ve execution plan yazıldı.
- Registration confirmation, legal links, press-and-hold password, typography, safe-area, form label,
  attachment message ve developer identity değişiklikleri uygulandı.
- Odaklı/tam testler, typecheck, lint, legal freshness ve diff/security kontrolleri geçti.

### Skipped

- Build, deploy, remote Supabase E2E, database reset ve coverage kullanıcı talimatı gereği atlandı.
- Screenshot dosyaları PII riski ve açık talimat nedeniyle repository’ye alınmadı.

### Failed

- Açık otomatik test hatası yok. İlk focused run’daki Türkçe büyük `İ` case-folding hatası düzeltildi;
  aynı set 19/19 ve tam suite 90/90 geçti.

### Manual verification required

- Yeni APK üzerinde üç düğmeli/gesture safe-area, scroll sonu, registration prefill, press/cancel/blur/
  background password davranışı, TalkBack, typography reflow ve picker mesajları.

## Completion checklist

- [x] Geri bildirim alanları redakte kanıtla dolduruldu.
- [x] Execution plan ve scope onaylı talimatla güncellendi.
- [x] Yalnız onaylı kapsam uygulandı.
- [x] Acceptance criteria ve odaklı testler kanıtlandı.
- [x] Diff ve security/privacy regression kontrolü tamamlandı.
- [x] Completed/skipped/failed/manual checks ayrı raporlandı.

## Review checklist

- [x] Kanıt ile diff eşlendi.
- [x] Kapsam dışı refactor/özellik yok.
- [x] Accessibility, password, auth/deep-link ve Turkish copy regression review tamamlandı.
- [ ] Android cihaz sonucu kaydedildi.

## Human acceptance result

**Result:** NOT REVIEWED — AWAITING NEW ANDROID APK ACCEPTANCE

**Reviewed by:** —

**Date:** —

**Notes:** Kod ve otomatik doğrulama tamamlandı. Kullanıcı talimatı gereği build başlatılmadı; task,
yeni APK gerçek cihaz kabulü gelene kadar active kalır.
