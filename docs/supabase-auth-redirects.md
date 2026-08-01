# Supabase Auth yönlendirme yapılandırması

Bu belge, Supabase Dashboard → Authentication → URL Configuration ekranına
eklenmesi gereken parola kurtarma yönlendirmelerini listeler.

## Site URL

Yerel geliştirme sırasında:

```text
http://localhost:8083
```

Üretimde bu değer gerçek HTTPS alan adıyla değiştirilmelidir:

```text
https://YOUR_PRODUCTION_DOMAIN
```

## Redirect URLs

Yerel web:

```text
http://localhost:8083/auth/reset-password
http://127.0.0.1:8083/auth/reset-password
```

Expo Go geliştirme bağlantıları:

```text
exp://**/--/auth/reset-password
```

Development build ve gelecekteki Android/iOS standalone uygulamalar:

```text
aracimcepte://auth/reset-password
aracimcepte://**
```

Üretim web:

```text
https://YOUR_PRODUCTION_DOMAIN/auth/reset-password
```

Preview ortamı kullanılacaksa yalnızca ilgili sağlayıcının gerçek alan adı eklenmelidir:

```text
https://YOUR_PREVIEW_DOMAIN/**/auth/reset-password
```

Üretimde wildcard yerine mümkün olduğunca tam HTTPS yolu kullanılmalıdır.

## Kod tarafındaki eşleşme

- Expo URL şeması: `aracimcepte`
- Expo Router rotası: `/auth/reset-password`
- Web geliştirme dönüşü: `http://localhost:8083/auth/reset-password`
- Native dönüş: çalışma ortamına göre `Linking.createURL('/auth/reset-password')`
- Desteklenen callback biçimleri:
  - PKCE `?code=...`
  - `?token_hash=...&type=recovery`
  - `#access_token=...&refresh_token=...&type=recovery`

Tokenlar ekranda gösterilmez ve loglanmaz. Kurtarma dışındaki callback türleri yeni
şifre ekranını etkinleştirmez.

## E-posta şablonu kontrolü

Recovery şablonunda Supabase tarafından üretilen `{{ .ConfirmationURL }}` kullanılmalıdır.
Özel bir link kuruluyorsa hedefin `{{ .RedirectTo }}` değerini koruduğu doğrulanmalıdır.

## Üretim öncesi zorunlu manuel test

1. Dashboard’a yukarıdaki geliştirme URL’lerini ekleyin.
2. Ayrılmış QA hesabından parola sıfırlama e-postası isteyin.
3. Aynı tarayıcıda web linkini açın ve `/auth/reset-password` rotasını doğrulayın.
4. Aynı cihazda Expo Go linkini açın.
5. Development build içinde `aracimcepte://auth/reset-password` bağlantısını açın.
6. Şifreyi değiştirin, kurtarma oturumunun kapandığını ve eski şifrenin reddedildiğini doğrulayın.
7. Aynı linkin ikinci kullanımında Türkçe “süresi dolmuş veya kullanılmış” mesajını doğrulayın.
