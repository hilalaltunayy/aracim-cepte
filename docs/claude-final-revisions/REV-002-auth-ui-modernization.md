# REV-002 — Login & Signup UI Modernization

## Hedef
Auth işleyişine dokunmadan Login ve Signup ekranlarını 21. yüzyıl mobil tasarım standardına yaklaştırmak.

## Login sorunları
- yanlış/generic araç ikonu kullanılıyor; gerçek Aracım Cepte logosu değil
- büyük dış form kartı ve içinde alanlar eski görünüyor
- tablet üzerinde üst taraf dolu, alt taraf bomboş
- animasyon/microinteraction yok

## Login tasarım yönü
- mevcut koyu lacivert + mavi + aqua kimliği korunacak
- gerçek proje logo asset'i kullanılacak
- büyük dış form kartı kaldırılacak
- bağımsız yuvarlatılmış inputlar
- dengeli tablet/telefon yerleşimi
- yarı saydam, otomotiv temalı arka plan dekoru
- `Tekrar hoş geldiniz` kısa typewriter/fade-stagger ile gelebilir
- logo/brand elementi kısa slide/fade ile yerleşebilir
- form animasyondan sonra açılabilir

## Şifre görünürlüğü microinteraction
Plain eye yerine küçük ama profesyonel animatik bir visibility karakteri/eye state kullanılabilir:
- hidden: gözünü kapatıyor/uzak bakıyor
- visible: şifreye bakıyor
Fallback erişilebilir eye icon korunmalı.

## Hatalı giriş
Local olarak geçersiz formda button disabled.
Server login reject olursa:
- gerçek hata bannerı
- kısa horizontal shake/head-shake microinteraction.

## Signup
- büyük dış çerçeveli form kaldırılacak
- bağımsız inputlar:
  - Adınız
  - E-posta adresiniz
  - Şifreniz
  - Şifrenizi tekrar girin
- gereksiz label + input tekrarından kaçının ama accessibility korunmalı
- küçük vehicle/brand illustration olabilir
- KVKK ve Gizlilik linkleri alt bölümde modern chip/link butonları olarak kalsın
- mevcut URL'leri değişmeyin

## Referans
Kullanıcının verdiği modern login/signup örneği sadece kompozisyon ilhamıdır; kopyalanmamalı.
