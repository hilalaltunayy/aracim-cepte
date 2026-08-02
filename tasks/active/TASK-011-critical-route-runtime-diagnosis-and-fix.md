# TASK-011 — Critical route runtime diagnosis and fix

**Status:** IMPLEMENTED — AWAITING CRITICAL ROUTE APK VERIFICATION
**Owner:** Codex
**Created:** 2026-08-02
**Updated:** 2026-08-02

## Task ID

TASK-011

## Title

Critical route runtime diagnosis and minimum Android fix.

## Goal

Gerçek Android APK'da kayıt, belge ve ekspertiz route'larını root Error Boundary'ye düşüren ortak
JavaScript/runtime throw kaynağını kesin stack kanıtıyla bulmak, minimum değişiklikle düzeltmek ve
gerçek route/component mount test boşluğunu kapatmak.

## User problem

Yakıt, bakım, diğer gider, geçmiş detayları, ekspertiz ve belge oluşturma/açma akışları gerçek Android
APK'da kullanılamıyor. Auth kayıt route'u çalışıyor ve kapsam dışında korunmalıdır.

## Current behavior

- Dokuz onaylı route root Error Boundary'de “Bir sorun oluştu” ekranına düşüyor.
- Mevcut “Tekrar dene” aynı hatayı gidermiyor.
- TASK-010 saf unit/smoke testleri gerçek route mount zincirini çalıştırmadığı için throw kaynağını
  kanıtlayamadı.
- Android cihaz stack/log dosyası repository'ye eklenmedi; teşhis yerel geliştirme/test ortamında
  sanitized error ve component stack ile üretilecektir.

## Desired behavior

- İlk throw edilen uygulama dosyası/satırı ve ortak dependency zinciri kanıtlanır.
- Dokuz route geçerli parametreyle render olur; geçersiz parametre güvenli state gösterir.
- Error Boundary retry gerçekten resetlenir, ana sayfaya dönüş çalışır ve kullanıcıya teknik ayrıntı
  sızmaz.
- Auth register ve kullanıcı tarafından çalışan olarak onaylanan V1 davranışları korunur.

## Scope

- [x] Ortak runtime throw'u gerçek mount ve sanitized boundary stack ile yeniden üretmek.
- [x] Minimum ortak route/runtime düzeltmesini yapmak.
- [x] Dokuz bozuk route için route/component render regression testleri eklemek.
- [x] Dashboard litre hesabındaki amount-to-liters fallback riskini düzeltmek/test etmek.
- [x] Bildirim ayarları kısa yolunu Pressable/openSettings/resume testiyle doğrulamak.
- [x] Ortak seçim paneli/bottom sheet safe-area davranışını denetlemek ve merkezileştirmek.
- [x] Confirmation resend payload, e-posta korunumu, cooldown ve üç deneme sınırını doğrulamak.
- [x] TASK-011 kanıt ve manuel APK kabul matrisini güncellemek.

## Out of scope

- Auth register davranışının yeniden tasarlanması.
- Reminder lead-time/status, 09:00 davranışı, tema/startup/toplu silme/hukuk/dashboard tasarımı.
- Supabase schema, migration, RLS, Edge Function veya remote database işlemi.
- EAS/Expo build, deploy, gerçek kullanıcı verisi veya production e-posta teslim testi.

## Acceptance criteria

- [x] Error adı, exact mesaj, ilk uygulama dosyası/satırı ve ortak dependency zinciri kaydedildi.
- [x] Fuel/maintenance/expense create ve edit/detail ekranları gerçek component mount testinden geçti.
- [x] Attachment create, expertise create ve expertise file open state gerçek mount testinden geçti.
- [x] Dashboard/history aksiyonlarının gerçek pathname ve string parametreleri doğrulandı.
- [x] Geçersiz entity/parametreler exception yerine güvenli state üretiyor.
- [x] Auth register smoke regression geçti.
- [x] Litre yalnız `liters` alanından toplanıyor; ₺500/litre yok senaryosu `500 L` göstermiyor.
- [x] Reddedilmiş bildirim izni satırı `Linking.openSettings()` çağırıyor ve resume'da yenileniyor.
- [x] Ortak sheet/picker/modal yüzeylerinde safe-area ve scroll/max-height uygulanıyor.
- [x] Resend `type: signup`, normalize e-posta, 60 saniye cooldown ve en çok üç manuel deneme ile
  test edildi; gerçek teslim manuel bırakıldı.
- [x] Zorunlu doğrulama komutları geçti veya başarısızlık gerçek durumuyla kaydedildi.

## Security/privacy requirements

- Production Error Boundary kullanıcıya stack, PII, token, e-posta, signed URL veya object path göstermez.
- Development/test diagnostic stack sanitize edilir; gerçek e-posta loglanmaz.
- Signed URL/provider hatası kullanıcıya aktarılmaz.
- Supabase güvenlik sınırları, private Storage ve mevcut kullanıcı verisi değiştirilmez.

## Relevant screenshots or evidence

- 1–2 Ağustos 2026 gerçek Android cihaz geri bildirimi: dokuz route aynı root Error Boundary ekranına
  düşüyor; auth register route'u çalışıyor. Screenshot dosyaları repository'ye alınmayacaktır.
- Commit tabanı: `7a7fddf50cf0859d9abfb2cb9ebc2c7746e230f4`.
- Exact development/test stack:

  ```text
  TypeError: Cannot read properties of undefined (reading 'getRandomValues')
      at createRequestId (src/shared/utils/requestId.ts:4:21)
      at RecordEditRenderProbe (src/shared/utils/requestId.runtime.test.tsx:30:3)
  ```

- İlk uygulama frame'i `requestId.ts:4:21`; render zinciri
  `record/documents/expertise edit → useRef(createRequestId()) → globalThis.crypto.getRandomValues`.
  Android/Hermes ortamında Web Crypto nesnesi olmadığı için route formu veya navigation guard render
  edilmeden throw oluşuyordu.
- TASK-010 testleri helper/path çıktısını sınadı fakat route component'lerini mount etmedi ve Node
  ortamında Web Crypto bulunduğu için Android'deki eksik global koşulunu üretmedi.

## Relevant files

- `src/shared/hooks/useUnsavedChangesGuard.ts`: bozuk route'ların ortak navigation guard zinciri.
- `src/shared/utils/requestId.ts`: kesin ilk throw ve SDK 57 native UUID düzeltmesi.
- `src/shared/components/AppErrorBoundary.tsx`: sanitized dev/test teşhis ve retry/reset.
- `src/app/record/edit.tsx`: yakıt/bakım/diğer create ve edit route'u.
- `src/app/documents/edit.tsx`: belge create/edit route'u.
- `src/app/expertise/edit.tsx`: ekspertiz create/edit/file-open route'u.
- `src/app/(tabs)/index.tsx`: dashboard quick action ve litre gösterimi.
- `src/app/(tabs)/history.tsx`: kayıt detay route üretimi.
- `src/app/(tabs)/settings.tsx`: notification settings shortcut.
- `src/app/auth/register.tsx`: yalnız resend ve auth register smoke regression kapsamı.
- `src/shared/components/ui.tsx`, `selectionModalLayout.ts`: bütün özel seçim yüzeylerinin merkezi
  safe-area/scroll/max-height davranışı.
- `tests/routes/criticalRoutes.render.test.tsx`: dokuz route, href, invalid state, dosya hata/retry ve
  auth register mount kanıtı.

## Implementation steps

1. TASK-010 öncesi/sonrası diff ve dokuz route'un import/hook zincirini çıkar.
2. Minimum React Native component mount harness'ı ile önce mevcut throw'u boundary içinde yakala.
3. Exact error/stack ve ilk uygulama frame'ini task kanıtına yaz.
4. Ortak kök nedeni minimum değişiklikle düzelt; route state ve auth register davranışına dokunma.
5. Gerçek route mount, quick-action/history param, Error Boundary reset ve üç yan kapsam testlerini ekle.
6. Hedefli testlerden sonra tam doğrulamaları, diff ve security/privacy regression incelemesini çalıştır.

## Commands to run

```powershell
npm run test -- <targeted route/render test files>
npm run typecheck
npm run lint
npm test
npx expo-doctor
git diff --check
```

## Expected outputs

- Dokuz route için render exception bulunmayan test kanıtı.
- Exact throw kanıtı ve minimum ortak fix.
- Dashboard litre, notification settings, safe-area ve resend hedefli regression sonuçları.

## Manual device checks

- [ ] Yeni APK'da dokuz route'u create/edit/open yollarıyla tek tek aç.
- [ ] Android üç tuşlu ve gesture navigation'da bütün seçim panellerinin son aksiyonunu doğrula.
- [ ] Bildirim ayarlarına gidip uygulamaya dönünce izin durumunun yenilendiğini doğrula.
- [ ] Doğrulanmamış sentetik hesapla ikinci doğrulama e-postasının gerçek teslimini doğrula.
- [ ] Unsupported/expired/missing ekspertiz dosyasında crash yerine güvenli hata gösterildiğini doğrula.

## Rollback strategy

TASK-011 commit'i geri alınır; schema/deploy olmadığı için veri rollback'i gerekmez. Test altyapısı
değişiklikleri aynı commit içindedir.

## Do not change

- Kullanıcının açıkça koruduğu TASK-010 davranışları ve auth register akışı.
- Supabase schema/migration/RLS/Edge Functions ve gerçek kullanıcı verisi.
- EAS/Expo build/deploy ayarları veya UI tasarımı.

## Completion report

### Completed

- `globalThis.crypto.getRandomValues` Android bağımlılığı kaldırıldı; Expo SDK 57'nin önerilen
  `expo-crypto.randomUUID()` uygulaması kullanıldı.
- Dirty-form guard'ın SDK private `expo-router/build/...` import'u public
  `expo-router/react-navigation` girişine taşındı; form davranışı değiştirilmedi.
- Üç kayıt create, üç kayıt edit/detail, belge create, ekspertiz create ve ekspertiz open state gerçek
  React component mount testlerinden geçti. Liste/dashboard/history href'leri exact pathname ve yalnız
  string parametrelerle doğrulandı; invalid ID üç route'ta güvenli missing state oldu.
- Error Boundary development/test için e-posta, URL, secret ve kullanıcı path'i redact eden diagnostic
  üretir; production kullanıcı metni değişmez. Retry key child tree'yi remount eder; ana sayfa aksiyonu
  navigation stack'ini temizler.
- Litresiz ₺500 yakıt `500 L` göstermez; litre kartı `—` gösterir ve amount yalnız gider toplamında kalır.
- Bildirim izin satırı gerçek component testinde Pressable/openSettings/resume yenilemesi ve güvenli
  reject mesajıyla geçti.
- Source envanterinde tek özel runtime `Modal` ortak `SelectField` içindedir. Reminder lead-time/özel
  gün, araç-yakıt, kayıt kategorisi, belge ve gövde seçimleri merkezi safe-area yüzeyini kullanır;
  liste ekran yüksekliğine bağlı ve scroll edilebilirdir.
- Confirmation resend official `type: signup` payload'unu, normalize e-postayı, 60 saniye cooldown'u
  ve oturum başına üç manuel deneme sınırını korur; verified/rate-limit/provider hataları başarı sayılmaz.
- Geliştirme sırasındaki geniş hedefli sette 11 dosya/65 test; final kritik regresyon tekrarında 10
  dosya/38 test; tam sette 45 dosya/184 test geçti. TypeScript, lint, Expo Doctor 20/20,
  `git diff --check` ve Markdown local link kontrolü geçti.
- Runtime hard-coded renk literal'i, kapsam dışı migration/function/env/app config değişikliği ve ham
  provider/signed URL logu bulunmadı. Dev diagnostic yalnız sanitize edilmiş uygulama frame'lerini loglar.

### Skipped

- EAS build, Supabase deploy/reset ve gerçek delivery testi talimat gereği çalıştırılmayacaktır.
- Supabase/Resend production SMTP teslim logları repository/CLI'da erişilebilir değildir; gerçek
  sentetik QA mailbox teslimi ve provider dashboard logu manuel kapıdır.

### Failed

- Final otomatik kontrolde başarısızlık yok. İlk tam test çağrısı eski `requestId.test.ts` native module
  mock eksikliğini buldu; test Expo native boundary mock'u ile düzeltildi ve tam paket yeniden geçildi.

### Manual verification required

- Yeni Android APK ile dokuz route ve gerçek e-posta teslim kabulü.

## Completion checklist

- [x] `AGENTS.md`, TASK-010 ve execution plan okundu/güncellendi.
- [x] Yalnız onaylı kapsam uygulandı.
- [x] Acceptance criteria kanıtlandı.
- [x] İlgili otomatik testler çalıştırıldı.
- [x] Diff gözden geçirildi.
- [x] Security/privacy regression kontrolü yapıldı.
- [x] Dokümantasyon güncellendi.
- [x] Completed, skipped, failed ve manual checks ayrı raporlandı.

## Review checklist

- [ ] Bağımsız reviewer atanmadı; sınırlama açıklanacak.
- [x] Kapsam dışı değişiklik yoktur.
- [x] Test kanıtları güncel ve yeniden üretilebilirdir.
- [x] Negatif ve hata durumları kapsanmıştır.
- [x] Güvenlik/gizlilik sınırları korunmuştur.
- [x] Rollback uygulanabilirdir.
- [ ] Açık kritik veya blocker bulgu yoktur.

## Human acceptance result

**Result:** NOT REVIEWED
**Reviewed by:** —
**Date:** —
**Notes:** Yeni APK ile kritik route doğrulaması bekleniyor.
