# Supabase Auth production yönlendirme yapılandırması

Bu belge, Aracım Cepte production Android auth e-postalarının localhost'a düşmemesi için kod ile
Supabase Dashboard arasında korunması gereken source-of-truth değerleri tanımlar.

## Uygulama kimliği ve rotalar

- Android package: `com.hilalaltunay.aracimcepte`
- Expo scheme: `aracimcepte`
- E-posta doğrulama rotası: `/auth/confirm-email`
- Parola kurtarma rotası: `/auth/reset-password`

Production Android callback URI'ları tam olarak şunlardır:

```text
aracimcepte://auth/confirm-email
aracimcepte://auth/reset-password
```

Scheme `app.json` içindeki mevcut değerdir; bu çalışma yeni bir scheme oluşturmaz.

## Supabase Dashboard — kopyalanacak production değerleri

Authentication → URL Configuration → **Site URL**:

```text
https://aracimcepte.hilalaltunay.com
```

Authentication → URL Configuration → **Redirect URLs** alanına ayrı satırlar halinde:

```text
aracimcepte://auth/confirm-email
aracimcepte://auth/reset-password
```

Production allow-list'inde bu iki exact URI tercih edilir. `aracimcepte://**` wildcard'ı production
için gerekli değildir. Localhost production Site URL olarak bırakılmaz. Geliştirme web rotaları
gerekiyorsa yalnız geliştirme süresince ayrıca allow-list'e alınır; production varsayılanı olarak
kullanılmaz.

Public domain şu anda hukuk sayfalarını barındırır. Bu repository'de doğrulanmış web auth callback
sayfaları bulunmadığı için `/auth/confirm-email` ve `/auth/reset-password` HTTPS adresleri production
Redirect URLs listesine eklenmez. Mobil e-posta akışlarının hedefi yukarıdaki custom-scheme
URI'larıdır.

## Kod tarafındaki davranış

- İlk kayıt `signUp(..., { options: { emailRedirectTo } })` ile confirmation URI'ını gönderir.
- Manuel confirmation resend aynı `emailRedirectTo` değerini gönderir.
- Password reset `resetPasswordForEmail(email, { redirectTo })` ile recovery URI'ını gönderir.
- Confirmation callback başarı ekranını açar, fakat kullanıcıyı otomatik giriş yaptırmaz ve parolayı
  saklamaz.
- Recovery callback PKCE, token hash ve implicit recovery session biçimlerini işler.
- Yeni parola `supabase.auth.updateUser({ password })` ile kaydedilir; ardından kurtarma oturumu
  kapatılır.
- `PASSWORD_RECOVERY` olayı recovery mode'u etkinleştirir.
- Callback tokenları ekranda veya loglarda gösterilmez.

## Neden localhost'a gidiyordu?

İlk signup ve confirmation resend çağrıları `emailRedirectTo` göndermiyordu. Supabase bu durumda
Dashboard Site URL değerini varsayılan dönüş adresi olarak kullanır. Site URL localhost olduğundan,
server tarafındaki doğrulama tamamlandıktan sonra tarayıcı localhost'a yönleniyordu.

Password reset kodu native `redirectTo` üretiyor ve uygulamadaki yeni parola ekranı hazırdı. Ancak
exact URI Dashboard Redirect URLs allow-list'inde değilse veya özel recovery şablonu Supabase'in
ürettiği confirmation URL'sini kullanmıyorsa bu yönlendirme uygulanmaz; Site URL fallback'i sonucu
localhost veya yanlış hedef görülür.

## Email Templates kontrolü

Authentication → Email Templates içinde standart Supabase şablonları ve aşağıdaki değişken
kullanılıyorsa manuel içerik değişikliği gerekmez:

Confirmation signup düğmesi/linki:

```html
<a href="{{ .ConfirmationURL }}">E-posta adresimi doğrula</a>
```

Reset password düğmesi/linki:

```html
<a href="{{ .ConfirmationURL }}">Şifremi yenile</a>
```

`{{ .ConfirmationURL }}` Supabase doğrulama endpoint'ini ve kodun gönderdiği `redirect_to` hedefini
birlikte taşır. Şablonda hard-coded localhost, `{{ .SiteURL }}` ile elle kurulmuş auth linki veya
`redirect_to` bilgisini kaybeden özel bir URL varsa bu link yukarıdaki biçime çevrilmelidir.
`{{ .RedirectTo }}` tek başına confirmation linki olarak kullanılmamalıdır; Supabase doğrulama
endpoint'ini atlar.

## Production Android manuel kabulü

Dashboard değerleri kaydedildikten ve yeni Android artifact yüklendikten sonra sentetik bir e-posta
ile:

1. Temiz bir test hesabı oluşturun ve confirmation e-postasındaki linke dokunun.
2. Android'in Aracım Cepte'yi açtığını ve “E-posta adresiniz doğrulandı” ekranını gösterdiğini
   doğrulayın.
3. “Giriş ekranına dön” ile login'e gidin; otomatik giriş olmadığını doğrulayın ve manuel giriş yapın.
4. Ayrı bir testte “Şifremi unuttum” üzerinden reset e-postası isteyin.
5. Reset linkinin Aracım Cepte → “Yeni şifrenizi belirleyin” ekranını açtığını doğrulayın.
6. Sekiz veya daha fazla karakterli eşleşen parolayı kaydedin; başarıdan sonra login'e dönüldüğünü
   doğrulayın.
7. Eski parolanın reddedildiğini, yeni parolanın çalıştığını ve aynı reset linkinin ikinci kullanımda
   güvenli “süresi dolmuş veya kullanılmış” hatası verdiğini doğrulayın.
8. Bozuk/expired confirmation linkinde ham provider hatası veya token görünmediğini doğrulayın.

Bu kontroller gerçek e-posta teslimi, Supabase Dashboard durumu, Android intent çözümleme ve release
artifact gerektirdiğinden otomatik testlerle Passed sayılamaz.

## 1 Eylül 2026 P0 doğrulama notu

Public Auth probu email provider'ın açık ve auto-confirm'in kapalı olduğunu doğruladı; buna karşın
Dashboard Redirect URL listesi, e-posta şablonu, SMTP handover/delivery logları public API ile
okunamaz. Gerçek cihazda recovery linkinin Login'e düşmesi, kodun gönderdiği exact recovery URI'ının
Dashboard allow-list/template zincirinde korunmadığını gösterir. Signup API başarısı da inbox
teslimi kanıtlamaz. Exact Dashboard, SMTP ve Auth Logs adımları
[`docs/bugs/p0-auth-vehicle-remediation.md`](bugs/p0-auth-vehicle-remediation.md) belgesindedir.
