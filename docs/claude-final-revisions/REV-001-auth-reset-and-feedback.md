# REV-001 — Password Reset + Modern Feedback

## Fiziksel bug
Şifremi unuttum akışı:
1. e-posta giriliyor,
2. recovery mail geliyor,
3. linke basılınca kısa süre browser açılıyor,
4. uygulama açılıyor,
5. gerçek reset formu yerine `Şifre yenileme bağlantısı geçersiz veya eksik` hatası geliyor.

Önceki cold-start/linking düzeltmesi fiziksel Android'de yeterli olmadı.

## İstenen gerçek akış
Forgot Password → email → fresh recovery link → Aracım Cepte → dedicated New Password screen.

Ekranda:
- Yeni şifre
- Yeni şifre tekrar
- görünürlük kontrolü
- signup ile aynı parola kriterleri
- `Şifreyi yenile`

Başarı:
`Şifreniz yenilendi. Yeni şifrenizle giriş yapabilirsiniz.`
→ Login.

Eski şifre başarısız, yeni şifre başarılı olmalı.

## Root-cause araştırması
Gerçek callback zincirini tekrar izleyin:
- resetPasswordForEmail redirectTo
- Supabase ConfirmationURL
- custom scheme
- Android browser handoff
- Expo Router initial URL
- query/hash params
- PKCE / implicit / token-hash
- exchangeCodeForSession / setSession / verifyOtp
- PASSWORD_RECOVERY
- duplicate token consumption
- navigation/bootstrap race

Fresh link yanlışlıkla invalid sayılmamalı.

## Güvenlik
Token doğrulamasını gevşetmeyin, reusable link yapmayın, tokenları loglamayın.

## Modern feedback sistemi
Mevcut büyük düz kırmızı/mavi blokları ortak modern bir bileşene dönüştürün:
- error / warning / success / info
- soft tint
- rounded compact banner/toast
- küçük ikon
- fade + kısa slide
- erişilebilir kontrast

İş mantığını değiştirmeyin; sadece sunum dilini modernleştirin.
