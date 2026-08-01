# Release-readiness raporu

Tarih: 2026-07-28  
Proje: `eiqxvvnqkbzbhzpthcwo`

> **Tarihsel snapshot:** Bu rapordaki 10 MB/WebP ve eski Storage policy sonuçları TASK-002 öncesine
> aittir. Güncel 5 MB + PDF/JPEG/PNG + 10 belge/25 MB repository uygulaması ve henüz çalışmamış
> database/cihaz kanıtları için [TASK-002](../tasks/active/TASK-002-storage-quota-and-kvkk-release-readiness.md)
> ile [V1 release kapılarını](release/v1-release-gates.md) kullanın. Bu tarihsel `Passed` durumları yeni
> Storage migration'ını kabul edilmiş göstermez.

Bu rapor “production-ready” beyanı değildir. Kod, web ve veritabanı kontrolleriyle
kanıtlanan durumlar ile fiziksel cihaz/mağaza öncesi kalan işleri ayırır.

| Alan              | Seviye       | Durum                                                                                                                                                                                                                                                    |
| ----------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth              | Major        | Remote public probe geçti: servis erişilebilir, invalid login/weak signup reddediliyor ve e-posta doğrulama açık. Gerçek doğrulama e-postası teslimatı QA mailbox ile tekrar test edilmeli.                                                              |
| Password recovery | Critical     | Dedicated rota, üç callback biçimi, validation ve güvenli hata akışı otomatik/web testte geçti. Dashboard redirect allow-list ve gerçek e-posta linkiyle password update manuel E2E tamamlanmadı.                                                        |
| Database          | Passed       | Beş migration local/remote eşleşiyor; sekiz public tablo RLS açık.                                                                                                                                                                                       |
| RLS/security      | Passed       | Transaction tabanlı user A/B negatif testleri; read/update/delete/spoof ve owner-folder kaçışı reddedildi. Test fixture rollback ile temizlendi.                                                                                                         |
| Password security | Major        | Supabase advisor “Leaked Password Protection Disabled” uyarısı veriyor. Dashboard’dan etkinleştirilmeli.                                                                                                                                                 |
| Calculations      | Passed       | Sabit fixture ile ay, yıl sınırı, zero previous month, altı ay, yüzdeler, litre ve maliyet testleri geçti.                                                                                                                                               |
| Record CRUD       | Major        | Repository contract geçti; ayrılmış QA credential sağlanmadığı için authenticated remote CRUD scripti bu turda çalıştırılmadı.                                                                                                                           |
| Reminders         | Passed       | Öncelik ve bildirim izin reddi saf mantık testlerinde geçti. Fiziksel bildirim teslimi manuel.                                                                                                                                                           |
| Notifications     | Major        | Web sınırlaması beklenen; Android/iOS izin, kanal ve teslim fiziksel cihazda test edilmedi.                                                                                                                                                              |
| Documents/storage | Major        | Private bucket, public/unsigned erişim reddi ve owner-folder RLS doğrulandı. Authenticated upload/signed URL expiry QA hesabıyla çalıştırılmalı.                                                                                                         |
| Body conditions   | Passed       | Şema part doğrulaması ve altı condition fixture’ı mevcut.                                                                                                                                                                                                |
| Navigation        | Passed (web) | Görünür back ve stale entity state web’de doğrulandı. Native gesture/back manuel.                                                                                                                                                                        |
| Web behavior      | Passed       | Static web export geçti; runtime dashboard ve recovery error state açıldı, 390 px yatay taşma ve console error yok.                                                                                                                                      |
| Android behavior  | Major        | Android JS/Hermes export geçti. Fiziksel/emülatör runtime testi yapılmadığı için Passed sayılmaz.                                                                                                                                                        |
| iOS behavior      | Major        | Windows ortamında native iOS çalıştırılamaz; gerçek cihaz/Mac build testi zorunlu.                                                                                                                                                                       |
| Accessibility     | Minor        | Form label, button state ve password visibility accessibility label’ları var; ekran okuyucu manuel turu eksik.                                                                                                                                           |
| Performance       | Minor        | Advisor owner FK index önerileri migration ile giderildi. Gerçek düşük seviye cihaz profili eksik.                                                                                                                                                       |
| Dependencies      | Major        | `npm audit --omit=dev`: Expo build-tool zincirinde 12 moderate `uuid/xcode` bildirimi. Önerilen otomatik çözüm Expo’yu kırıcı biçimde düşürüyor; uygulanmadı. Tam audit ayrıca fix bulunmayan ESLint/brace-expansion dev-only high bildirimleri veriyor. |
| Test coverage     | Major        | 9 dosyada 62/62 test geçti; lines %91,24, statements %87,02. Full native UI E2E eklenmedi.                                                                                                                                                               |

## Kanıtlanmış güvenlik kontrolleri

- `.env` Git tarafından ignore ediliyor.
- Mobil istemcide service-role/secret key yok.
- Auth/recovery tokenları UI veya loglara yazılmıyor.
- Raw Supabase hataları kullanıcıya doğrudan gösterilmiyor.
- Tüm public tablolar RLS korumalı.
- Child insert/update politikaları hem kullanıcı hem araç sahipliğini doğruluyor.
- Storage bucket private, 10 MB limitli ve owner klasörü zorunlu.

## Validation sonuçları

- TypeScript: geçti.
- ESLint: geçti.
- Vitest: 9 dosya, 62/62 geçti.
- V8 coverage: statements `%87,02`, branches `%78,40`, functions `%92,75`, lines `%91,24`.
- Expo Doctor: 20/20 geçti.
- Web static export: geçti; 27 rota, `/auth/reset-password` dahil.
- Android export: geçti; Hermes bundle üretildi.
- Remote migration: 5/5 local/remote eşleşiyor.
- Remote schema: 8 public tablo RLS açık, 30 public policy, 4 Storage policy,
  9 uygulama trigger’ı, 22 public index.
- RLS negatif testi: user B profil/araç read; update/delete; child ownership spoof;
  vehicle reassignment ve attachment folder escape reddedildi.
- RLS test cleanup: geçici auth user ve araç sayısı `0`.
- Public remote probe: reset isteği kabul edildi, anonim tablo/private bucket erişimi reddedildi.
- Security advisor: yalnız “Leaked Password Protection Disabled” uyarısı kaldı.
- Performance advisor: eksik FK index uyarıları giderildi; yeni/az kullanılan indexler için
  yalnız normal `unused_index` bilgi kayıtları kaldı.
- Dependency audit: production zincirinde 12 moderate; kırıcı downgrade dışında güvenli
  otomatik çözüm sunulmadı. Dev zincirinde ayrıca fix bulunmayan 9 high bildirimi var.

## Play Store öncesi blocker/critical işler

1. Supabase Dashboard redirect allow-list’i `docs/supabase-auth-redirects.md` ile tamamlamak.
2. Ayrılmış QA mailbox ile parola reset e-postası → yeni parola → eski link tekrar kullanımı E2E testini bitirmek.
3. Custom SMTP teslimatını gerçek alıcılarla doğrulamak.
4. Leaked Password Protection özelliğini etkinleştirmek.
5. Android release build’i imzalı veya internal-test kanalında gerçek cihazda çalıştırmak.
6. Privacy policy, veri silme akışı, mağaza metadata ve bildirim izin açıklamalarını release kapsamına almak.

## Kalan iOS/Android manuel kontroller

- Expo Go ve development build deep link.
- Native date picker.
- Android notification channel ve izin.
- iOS notification permission ve teslim.
- Image/document picker cancel ve permission denied.
- Klavye, safe area, back gesture, düşük bellek/ağ kesintisi.
- Private attachment upload, immediate signed access, expiry ve delete.
