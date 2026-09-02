# P0 Auth ve Araç Verisi Düzeltme Kaydı

Kanıt tarihi: 1 Eylül 2026. İncelenen ortam: EAS `preview` ve preview APK'nin kullandığı Supabase
public API. Bu incelemede secret, token, parola veya kullanıcı kaydı okunmadı; remote SQL/migration
uygulanmadı.

## Kanıtlanan durum

- EAS `preview` ortamında Supabase URL ve anon/publishable key adları mevcut ve değerleri yerel QA
  ortamıyla birebir eşleşiyor. Preview'ın yanlış projeye gitmesi bulgusu yok.
- Remote Auth erişilebilir, email provider açık ve email auto-confirm kapalı. E-posta doğrulaması
  güvenlik gereği etkin kalıyor.
- Kod signup için `aracimcepte://auth/confirm-email`, recovery için
  `aracimcepte://auth/reset-password` gönderiyor. Dedicated callback ekranları ve recovery session
  doğrulaması mevcut.
- Remote public Data API metadata probunda `vehicle_photos`, `attachments`, `maintenance_items`,
  `maintenance_templates`, `body_part_condition_values` ve `user_entitlements` bulunamadı
  (`PGRST205`). `vehicles.color_id`, fuel alanları, `reminders.due_time` ve
  `vehicle_documents.details` da remote şemada yok (`42703`).
- Giriş sonrası ilk zorunlu sorgu `vehicles` listesidir. Kayıtlı aracı olan kullanıcıda hemen
  ardından başlayan `vehicle_photos` ve `attachments` sorguları missing-table ile başarısız olur.
  Bu, gerçek cihazdaki genel internet mesajının gerçek nedenidir: preview kodu ile remote migration
  seviyesi uyuşmuyor.

## Kod düzeltmeleri

- Yerel Supabase Auth parity ayarında email confirmation açıldı; confirmation ve recovery URI'ları
  exact allow-list'e eklendi.
- Signup cevabı artık session dönmesini "doğrulama bekliyor" diye kabul etmiyor; email confirmation
  kapalı bir ortam fail-closed davranıyor.
- Signup/resend metinleri API kabulünü inbox teslimi gibi göstermiyor.
- Authenticated data sorguları operation + güvenli provider code + kategori ile yalnız development
  ortamında izleniyor; token, e-posta veya raw provider mesajı loglanmıyor.
- Schema, permission, auth, network ve server sorunları ayrıştırılıyor. Schema hatası artık kullanıcıya
  yanlış "internetinizi kontrol edin" mesajı göstermiyor.

## Zorunlu Supabase Dashboard işlemleri

Bu adımlar uygulanmadan e-posta teslimi ve deep-link kabulü tamamlanmış sayılamaz.

1. **Authentication → Providers → Email**
   - Email provider: Enabled.
   - Confirm email: Enabled.
   - Değiştirmeyin/kapamayın. Public probe auto-confirm'in şu anda kapalı olduğunu doğruladı.
2. **Authentication → URL Configuration**
   - Site URL: `https://aracimcepte.hilalaltunay.com`
   - Redirect URLs içine ayrı exact satırlar:
     - `aracimcepte://auth/confirm-email`
     - `aracimcepte://auth/reset-password`
3. **Authentication → Email Templates**
   - Confirm signup ve Reset password düğmeleri `{{ .ConfirmationURL }}` kullanmalı.
   - Hard-coded Site URL/localhost veya yalnız `{{ .RedirectTo }}` kullanan link bırakılmamalı.
4. **Authentication → Logs → Auth Logs**
   - Yeni ve daha önce kullanılmamış bir test adresiyle signup yaptıktan hemen sonra mail event'ini
     kontrol edin. Handover error/rate-limit varsa exact code'u kaydedin.
   - Handover başarılıysa SMTP sağlayıcısının delivery/bounce/suppression logunu kontrol edin.
5. **Project Settings → Authentication → SMTP Settings** (Dashboard adlandırması değişirse Auth →
   SMTP)
   - Production için doğrulanmış domainli custom SMTP yapılandırın. Supabase built-in mail servisi
     yalnız geliştirme/demonstrasyon içindir ve düşük limitlidir.

SMTP, URL allow-list ve template değişiklikleri server-side'dır; tek başına APK rebuild gerektirmez.
Ancak bu hotfix kodunu test etmek için daha sonra yeni preview APK gerekir.

## Zorunlu remote migration işlemi

Remote şema güncellenmeden mevcut `develop` uygulaması araç verisini yükleyemez. Repository kökünde,
doğru proje seçildiğini Dashboard adı/URL'siyle ikinci kez doğruladıktan sonra:

```powershell
npx supabase link --project-ref <EXPO_PUBLIC_SUPABASE_URL içindeki project ref>
npx supabase migration list
npx supabase db push --linked --dry-run
```

Dry-run çıktısını repository migration listesiyle inceleyin. Remote'da bulunmayan migration'ları
atlamadan, sırayla uygulamak için insan onayından sonra:

```powershell
npx supabase db push --linked
```

Bu additive migration deployment'ıdır; seed eklenmemeli ve `--include-all` ancak migration history
incelemesi gerçekten gerektiriyorsa kullanılmalıdır. En az `20260810212244` ve sonrasındaki şema
beklentilerinin remote'da eksik olduğu public metadata ile kanıtlandı; exact pending listeyi yalnız
linked `migration list`/dry-run belirleyebilir. Deployment sonrası aşağıdaki tablolar/alanlar ve RLS
negatif testleri doğrulanmadan APK kabulüne geçilmemelidir.

Remote migration deployment APK rebuild gerektirmez; hotfix kod değişiklikleri yeni APK gerektirir.
