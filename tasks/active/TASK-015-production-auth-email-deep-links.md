# TASK-015 — Production auth e-posta deep linkleri

**Status:** IMPLEMENTED — AWAITING SUPABASE DASHBOARD CONFIGURATION AND ANDROID DEVICE ACCEPTANCE  
**Owner:** Codex  
**Created:** 2026-08-09  
**Updated:** 2026-08-09

## Task ID

TASK-015

## Title

Production e-posta doğrulama ve parola kurtarma deep linklerini düzelt.

## Goal

Supabase Auth e-postalarının production Android uygulamasındaki doğru ve güvenli auth rotalarına
dönmesini; hiçbir production akışının localhost'a düşmemesini sağlamak.

## User problem

Hesap doğrulaması server tarafında başarılı olsa da tarayıcı localhost'a yönleniyor. Parola kurtarma
e-postası ise uygulamadaki yeni parola ekranını güvenilir biçimde açmıyor.

## Current behavior

- Expo scheme `aracimcepte`, reset rotası `/auth/reset-password` olarak mevcut.
- Recovery callback parser; PKCE, token hash ve implicit session biçimlerini destekliyor.
- Yeni parola `supabase.auth.updateUser({ password })` ile kaydediliyor.
- `signUp` ve confirmation resend çağrıları `emailRedirectTo` göndermiyor.
- Dashboard production Site URL/allow-list belgesi hâlâ localhost ve placeholder değerler içeriyor.

## Desired behavior

- İlk signup ve resend confirmation e-postaları `aracimcepte://auth/confirm-email` hedefine döner.
- Başarılı doğrulama anlaşılır uygulama içi başarı ekranı gösterir; hata/expired durumları güvenli
  Türkçe mesaj verir.
- Password reset `aracimcepte://auth/reset-password` rotasına döner ve mevcut recovery session,
  parola politikası, `PASSWORD_RECOVERY` ve `updateUser` davranışı korunur.
- Supabase Dashboard için production Site URL ve exact redirect allow-list değerleri belgelenir.

## Scope

- [x] Signup ve resend çağrılarına confirmation `emailRedirectTo` eklemek.
- [x] E-posta doğrulama callback'ini güvenli biçimde sınıflandırmak ve başarı rotası eklemek.
- [x] Auth Stack'e confirmation rotasını eklemek.
- [x] Password recovery davranışını hedefli testlerle yeniden doğrulamak.
- [x] `docs/supabase-auth-redirects.md` dosyasını production değerleriyle güncellemek.

## Out of scope

- Supabase Dashboard'u, email template'lerini veya uzak projeyi otomatik değiştirmek.
- Yeni AAB/EAS build, Play Console yüklemesi veya Supabase deploy yapmak.
- Auth dışındaki uygulama özellikleri, database şeması, RLS veya kullanıcı verisi.
- Universal/App Links veya yeni scheme tasarlamak.

## Acceptance criteria

- [x] Production confirmation URI tam olarak `aracimcepte://auth/confirm-email` olur.
- [x] Production recovery URI tam olarak `aracimcepte://auth/reset-password` olur.
- [x] Signup ve resend aynı confirmation redirect'ini kullanır.
- [x] Confirmation başarı/hata route'u token veya provider ayrıntısı göstermez/loglamaz.
- [x] Recovery linki session kurar; geçerli parola `updateUser` ile kaydolur; invalid/expired link
  güvenli Türkçe hata verir.
- [x] Site URL ve Redirect URLs değerleri kopyalanabilir biçimde belgelenir.

## Risks

- Dashboard allow-list güncellenmezse Supabase `redirectTo` değerini kabul etmeyip Site URL'ye geri
  düşebilir.
- Custom scheme yalnız uygulama yüklüyse açılır; web fallback/universal link ayrı kapsamdır.
- Email template `{{ .ConfirmationURL }}` yerine hard-coded `{{ .SiteURL }}` kullanıyorsa kod tarafı
  redirect'i etkisiz kalabilir.

## Security/privacy impact

- Recovery tokenları URL'den yalnız session kurmak için işlenir; UI veya loglara yazılmaz.
- Confirmation ekranı URL'deki access/refresh tokenlarını saklamaz veya göstermez.
- Service-role/secret, database, RLS ve kullanıcı verisi değişmez.

## Relevant files

- `app.json`: mevcut `aracimcepte` scheme ve Android package kanıtı.
- `src/store/authStore.ts`: signup, resend, reset ve password update çağrıları.
- `src/features/auth/recoveryRedirect.ts`: merkezi native/web auth redirect üretimi.
- `src/features/auth/passwordRecovery.ts`: recovery callback/session doğrulaması.
- `src/app/auth/reset-password.tsx`: yeni parola ekranı.
- `src/app/auth/confirm-email.tsx`: yeni confirmation sonucu ekranı.
- `docs/supabase-auth-redirects.md`: Dashboard manuel ayarlarının source-of-truth'u.

## Implementation steps

1. **Completed:** Mevcut scheme, route, listener ve Supabase çağrılarını incele.
2. **Completed:** Confirmation redirect helper, signup/resend kullanımı ve sonucu ekranını ekle.
3. **Completed:** Dashboard production yapılandırma belgesini güncelle.
4. **Completed with known repository blocker:** Hedefli Vitest, changed-file lint, diff ve log taraması
   geçti. Tam typecheck, değişiklik dışındaki `tests/routes/legalLinks.render.test.tsx` tip hatalarında
   başarısız oldu.
5. **Completed:** Android/AAB manuel doğrulama adımlarını belgeleyip raporla.

## Commands to run

```powershell
npx vitest run src/features/auth/registrationFlow.test.ts src/features/auth/confirmationResend.test.ts src/features/auth/passwordRecovery.test.ts src/features/auth/emailConfirmation.test.ts src/features/auth/recoveryRedirect.test.ts tests/routes/authEmailConfirmation.render.test.tsx
npm run typecheck
npm run lint
git diff --check
```

## Expected outputs

- Confirmation ve recovery için iki exact production deep link.
- Yeni confirmation success/error route'u.
- Kopyalanabilir Supabase Dashboard ayarları ve hedefli test kanıtı.

## Manual device checks

- [ ] Yeni production Android build'de signup confirmation e-postasını aç ve başarı ekranını doğrula.
- [ ] Reset e-postasını aç, yeni parola kaydet, eski/yeni parola ve reused/expired linki doğrula.

## Rollback strategy

Yalnız TASK-015 tarafından eklenen route/helper kullanımlarını geri alıp signup/resend'i önceki
çağrı biçimine döndürmek mümkündür. Uzak Dashboard değişikliği otomatik yapılmayacağı için rollback
insan tarafından URL Configuration değerlerinin önceki haline alınmasıdır.

## Do not change

- Database, migration, RLS, Storage, Edge Functions ve Supabase deploy.
- Login iş mantığı, hesap/veri silme, diğer ürün özellikleri ve kullanıcı verileri.
- `app.json` içindeki mevcut `aracimcepte` scheme.
- Mevcut AAB, Play Console ve EAS build durumu.

## Completion checklist

- [x] `AGENTS.md`, görev ve execution plan okundu/güncellendi.
- [x] Yalnız onaylı kapsam uygulandı.
- [x] Acceptance criteria kanıtlandı.
- [x] İlgili hedefli otomatik testler çalıştırıldı.
- [x] Diff gözden geçirildi.
- [x] Security/privacy regression kontrolü yapıldı.
- [x] Dokümantasyon güncellendi.
- [x] Completed, skipped, failed ve manual checks ayrı raporlandı.

## Review checklist

- [x] Kapsam dışı değişiklik yoktur.
- [x] Hedefli test kanıtları günceldir.
- [x] Invalid/expired link ve token gizliliği kapsanmıştır.
- [x] Dashboard manuel değerleri kod redirect'leriyle eşleşir.

## Human acceptance result

**Result:** NOT REVIEWED  
**Reviewed by:** —  
**Date:** —  
**Notes:** Yeni production Android artifact ve gerçek e-posta teslim/deep-link testi bekleniyor.

## Completion report

### Completed

- Signup ve confirmation resend aynı exact native callback URI'ını gönderiyor.
- Confirmation route'u success/invalid durumlarını ham callback ayrıntısı göstermeden render ediyor.
- Mevcut recovery session, `PASSWORD_RECOVERY`, parola doğrulama ve `updateUser` akışı korundu.
- 2026-08-09 tarihinde 6 hedefli Vitest dosyasında 18 test geçti; changed-file ESLint ve
  `git diff --check` geçti.

### Skipped

- Full Vitest, E2E, Expo/EAS build, Supabase deploy ve Dashboard otomasyonu dar kapsam ve açık yasak
  nedeniyle çalıştırılmadı.

### Failed

- `npm run typecheck`, mevcut ve bu görevde değiştirilmeyen
  `tests/routes/legalLinks.render.test.tsx:137-153` tuple/mock tip hataları nedeniyle başarısız oldu.

### Manual verification required

- Supabase Site URL, Redirect URLs ve gerekirse Email Templates değerlerinin insan tarafından
  kaydedilmesi gerekir.
- Yeni production Android artifact üzerinde gerçek confirmation ve recovery e-posta linkleri test
  edilmelidir.
