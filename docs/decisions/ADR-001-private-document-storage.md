# ADR-001 — V1 private belge depolama

**Status:** Accepted for V1  
**Date:** 2026-08-01  
**Decision owners:** Product owner + technical owner  
**Related:** [Storage policy](../security/storage-policy.md),
[threat model](../security/privacy-threat-model.md),
[data classification](../security/data-classification.md)

## Context

AracımCepte araç ruhsatı, sigorta, muayene, servis ve benzeri yüksek hassasiyetli dosyaları
saklayabilir. V1'in owner-scoped erişim, pratik mobil görüntüleme, silme ve düşük operasyon
karmaşıklığına ihtiyacı vardır. Public URL hassas dosyalar için uygun değildir. Acele client-side
şifreleme ise anahtar kurtarma, cihaz değişimi, metadata, paylaşım, arama/OCR, backup ve hesap silme
gibi sorunları çözmeden yanlış güven hissi yaratabilir.

## Decision

V1:

- Private Supabase Storage bucket kullanır.
- Storage policy/RLS ile authenticated owner scope uygular.
- Dosyaya yalnız owner doğrulamasından sonra kısa ömürlü signed URL ile erişir.
- Public object URL kullanmaz.
- Client'a service-role/secret key koymaz.
- PII-free random object ID ve server-side file/kota kontrollerini zorunlu tutar.
- Acele, özel tasarımsız client-side veya end-to-end encryption uygulamaz.

Uçtan uca/client-side şifreleme ancak tehditleri, anahtar yaşam döngüsünü, kurtarmayı, çoklu cihazı,
silme/backup davranışını, performansı, paylaşımı ve migration'ı ele alan ayrı bir ADR ve açık ürün
onayıyla yeniden değerlendirilir.

## Neden

- Supabase Auth + private Storage policy, mevcut mimariyle uyumlu owner authorization sağlar.
- Signed URL mobil istemcide kalıcı public erişim oluşturmadan kısa süreli görüntülemeyi mümkün kılar.
- Server-managed encryption at rest/in transit ve erişim kontrolü V1 için yönetilebilir bir temel
  sunar; bunun uçtan uca şifreleme olmadığı açıkça kabul edilir.
- Rushed client crypto; anahtar kaybıyla kalıcı veri kaybı, yanlış nonce/key kullanımı, plaintext
  cache, recovery bypass ve çoklu cihaz sorunları doğurabilir.
- V1 scope güvenilir temel akışları bitirmeyi, deneysel kriptografi uygulamamayı gerektirir.

## Trade-off'lar

### Kazanımlar

- Daha basit mobil upload/download ve cihaz değişimi.
- Merkezi RLS, silme, kota ve audit uygulanabilirliği.
- Kısa sürede test edilebilir private erişim modeli.
- Gelecek OCR/export için kontrollü server-side işleme olasılığı.

### Kabul edilen sınırlamalar

- Yetkili Supabase/altyapı ve ayrıcalıklı server süreçleri teorik olarak plaintext içeriğe erişebilir;
  bu model zero-knowledge değildir.
- Yanlış admin yetkisi, service-role sızıntısı veya hatalı policy yüksek etki taşır.
- Signed URL süre boyunca bearer capability'dir ve sızarsa erişim verir.
- Provider/subprocessor ve sınır ötesi işleme hukuki/gizlilik incelemesi gerektirir.

Bu riskler admin minimizasyonu/MFA, secret yönetimi, kısa URL, RLS negatif testleri, audit, retention
ve incident response ile azaltılır; ortadan kalkmış sayılmaz.

## Reddedilen seçenekler

- **Public bucket + gizli/tahmin edilemez URL:** URL gizliliği authorization değildir; reddedildi.
- **Uzun ömürlü signed URL/cache:** Link sızıntısı ve silme sonrası erişim riskini büyütür; reddedildi.
- **V1'de hızlı client-side encryption:** Anahtar/recovery/migration tasarımı olmadan güvenli ve
  kullanılabilir kabul edilemez; ertelendi.
- **Belge özelliğini tümüyle kaldırmak:** Mevcut V1 ürün yönüyle uyumsuz; release gate'leri
  karşılanmazsa ürün sahibi bunu ayrı scope kararı olarak değerlendirebilir.

## Gelecek migration değerlendirmeleri

Client-side/E2E model araştırılırsa ayrı ADR en az şunları tanımlar:

- Tehdit aktörü ve hedeflenen gizlilik garantisi; metadata'nın ne kadarının açık kaldığı.
- Kullanıcı anahtar üretimi, cihazlar arası senkronizasyon, recovery ve kayıp cihaz revoke'u.
- Key rotation, password reset ilişkisi ve support'un erişemediği veri için kullanıcı iletişimi.
- Mevcut plaintext object'lerin sürümlü, kesintisiz ve doğrulanabilir re-encryption süreci.
- Çift format döneminde idempotency, rollback ve veri bütünlüğü.
- Thumbnail/preview/cache/export/OCR/AI işleme noktalarında plaintext yaşam döngüsü.
- Paylaşım ve çoklu kullanıcı için key wrapping/revocation.
- Delete, backup, quota, egress ve performans etkisi.
- Bağımsız kriptografi/security review ve gerçek cihaz testleri.

## Consequences

[Storage politikası](../security/storage-policy.md) V1'in bağlayıcı uygulama standardıdır. Public
bucket, public URL veya client service-role release blocker'dır. Bu ADR encryption özelliği
uygulamaz; yalnız V1 kararını ve yeniden değerlendirme kapısını kaydeder.
