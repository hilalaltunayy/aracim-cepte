# Proje durumu

**Ana release kanıtı tarihi:** 2026-08-10

**Son V1.1 development notu:** 2026-08-15

**Güncel release aşaması:** Google Play Closed Testing

**Uygulama:** `1.0.0` / Android `versionCode: 2`

Bu belge mevcut durumu özetler. Ayrıntılı gate statüleri için
[V1 release kapıları](release/v1-release-gates.md), tarihsel test snapshot'ı için
[release-readiness raporu](release-readiness.md) kullanılır. AAB üretimi veya Closed Testing'in
başlaması production ya da hukuki hazırlığın tamamlandığı anlamına gelmez.

## Güncel doğrulanmış gerçekler

- Android-first Expo/React Native uygulaması Expo Router, React Native 0.86, React 19 ve Expo SDK 57
  üzerinde çalışır.
- Supabase projesi uygulamaya bağlıdır; Auth, Postgres, RLS, private Storage ve Edge Function
  akışları repository ile birlikte kullanılmaktadır.
- Araç, yakıt, bakım, diğer gider, hatırlatıcı, gövde durumu, ekspertiz, belge ve veri yönetimi
  akışlarının uygulama kodu mevcuttur.
- Private document Storage; owner-scoped random path, private bucket, kısa ömürlü signed URL,
  MIME/magic-byte, 5 MB dosya, 10 belge ve toplam 25 MB kontrollerine göre tasarlanmış ve sentetik
  remote QA ile hedefli olarak doğrulanmıştır.
- RLS, cross-user isolation, owner-scoped RPC, quota/recovery ve Auth/DB/Storage hesap silme
  kontrolleri iki sentetik kullanıcıyla gerçekleştirilmiştir. Kanıt kapsamı ve açık manuel kontroller
  [güvenlik doğrulama matrisindedir](qa/v1-security-authorization-verification.md).
- Public hukuk sitesi `https://aracimcepte.hilalaltunay.com` adresinde yayındadır; uygulama canlı
  hukuk linklerini tercih eder ve uygulama içi içeriği fallback olarak korur.
- Production e-posta doğrulama ve parola kurtarma callback'leri
  `aracimcepte://auth/confirm-email` ve `aracimcepte://auth/reset-password` olarak uygulanmıştır.
  Production Supabase Site URL değeri `https://aracimcepte.hilalaltunay.com` adresidir.
- Production Android AAB `1.0.0` / `versionCode: 2` ile başarıyla oluşturulmuştur. Bu artifact auth
  production deep-link düzeltmelerini içerir ve Google Play Closed Testing aşamasındadır.
- Release source snapshot'ı `ad3ed50b025db693186e38ebf9a109512cc319bf` commit'idir;
  `release/1.0.0-closed-test-b2` branch'i ve `v1.0.0-closed-test-b2` annotated tag'i aynı commit'i
  korur.
- `main` stabil çizgidir. `develop`, V1.1+ entegrasyon branch'idir; feature ve chore çalışmaları
  `develop` tabanlı izole branch ve PR ile ilerler.
- GitHub Repository Rulesets; `main` ve `develop` için PR zorunluluğu ile deletion/force-push
  engelini, `release/*` ve `v*` için deletion/force-update engelini uygular. Repository'de henüz
  workflow olmadığı için required status check yapılandırılmamıştır.

## Tarihsel repository ve QA kanıtı

- TypeScript, ESLint, Vitest, Expo Doctor, Metro/export, route/render ve hedefli Android crash
  regression testleri farklı task'larda çalıştırılmıştır.
- Remote Supabase migration, RLS/Storage negatif testleri, D-11/D-12/D-13 consistency/recovery ve
  TASK-013 security authorization doğrulamaları kaydedilmiştir.
- 1–2 Ağustos Android testinde bulunan route crash, toplu silme state ve UX sorunları için kaynak
  düzeltmeleri ve regression testleri uygulanmıştır.

Bu maddeler tarihsel kanıttır; bugün yeniden çalıştırılmış testler veya build 2'nin eksiksiz cihaz
kabulü gibi yorumlanamaz. Exact tarihler ve durumlar [V1 release kapılarında](release/v1-release-gates.md)
ve ilgili task dosyalarındadır.

## Manuel doğrulama gerekli

- Build 2 üzerinde signup → gerçek confirmation e-postası → uygulama callback'i → login akışı.
- Build 2 üzerinde password reset e-postası → recovery session → yeni parola → eski link reddi.
- Closed Testing katılımcılarıyla kritik Android route, belge açma, notification, safe-area,
  background/killed lifecycle, account/data deletion ve yeniden başlatma matrisi.
- External hukuk linkleri ve offline uygulama içi fallback davranışı.
- Provider/admin loglarının PII, token ve signed URL sızıntısı açısından operasyonel örneklemi.
- Google Play listing, Data Safety, screenshot/asset ve kapalı test gereksinimlerinin Play Console
  tarafındaki nihai kontrolü.

Manuel sonuç kaydı olmadan bu kontroller `Passed` sayılamaz.

## Hukuki ve operasyonel açık maddeler

- KVKK aydınlatma, gizlilik, saklama/silme ve başvuru metinleri için profesyonel hukuk incelemesi.
- Supabase Frankfurt kullanımı nedeniyle yurt dışına veri aktarımı değerlendirmesi ve uygun hukuki
  mekanizma/iletişim kararı.
- Supabase, Resend ve ilgili processor/subprocessor değerlendirmesi.
- Veri ihlali prosedürü, retention/deletion operasyonu ve veri-subject request sürecinin sahipleri.
- Google Play production rollout kararı ve Closed Testing kabul kanıtının insan tarafından
  onaylanması.

Supabase kullanımı, public hukuk sitesi veya teknik güvenlik testleri tek başına KVKK uyumluluğu
oluşturmaz. Hazırlık durumu profesyonel hukuk incelemesi gerektirir.

## 25–26 Ağustos post-freeze backlog'u

RevenueCat Premium foundation kaynakta, feature flag ile kapalı ve remote-deploy edilmemiş olarak
hazırlanmıştır. Yerel billing migration'ı, `revenuecat-webhook`, RevenueCat/store ürün ve Offering
konfigürasyonu, yeni native AAB ile license-tester kabulü current Closed Testing ortamına dokunmadan
planlı deployment penceresinde ayrıca uygulanacaktır. Ayrıntılı sıra
[RevenueCat Premium foundation](billing/revenuecat-premium-foundation.md) belgesindedir.

Bu backlog mevcut 12 kullanıcılı tester ortamının, yayınlanmış AAB'nin veya Supabase remote
durumunun TASK-036 sırasında değiştiği anlamına gelmez.

## Sonraki kontrollü adım

Closed Testing build 2 için Android acceptance kanıtını tamamla; auth callback ve kritik V1
akışlarının sonucunu release gate'lerine işle. V1.1 geliştirmesi
[development roadmap](product/development-roadmap.md) ve `develop` tabanlı feature branch'lerle,
release snapshot'ına dokunmadan ilerlemelidir.
