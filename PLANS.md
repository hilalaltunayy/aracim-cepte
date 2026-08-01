# Execution Plan Standard

Execution plan, görevin yaşayan uygulama sözleşmesidir. Kod değişikliğinden önce mevcut durumu,
izin verilen kapsamı, doğrulamayı ve geri dönüş yolunu görünür kılar. Küçük ve açık dokümantasyon
düzeltmeleri dışında her non-trivial görev bir plan kullanır. Uzun, çok adımlı, güvenlik etkili,
veri/migration içeren veya geri dönüşü zor görevler uygulama boyunca aktif planı güncel tutar.

Plan görev dosyasını tekrar etmez; görevdeki niyeti uygulanabilir, doğrulanabilir adımlara çevirir.
Yeni bulgu kapsamı değiştiriyorsa önce görev ve plan güncellenir, gerekiyorsa insan onayı alınır.

## Zorunlu yapı

### Goal

Tek cümlede elde edilecek sonuç ve kullanıcıya sağladığı değer.

### Background

İşin neden gerektiği, ilgili kararlar, önceki çalışmalar ve kaynak belgeler.

### Current state

İncelenen davranış, kanıt, bilinen eksikler ve varsayımlar. Henüz doğrulanmayan bilgi açıkça
etiketlenir.

### Scope

Bu planla değiştirilecek davranışlar, belgeler, testler ve dosyalar.

### Out of scope

İlişkili olsa da özellikle yapılmayacak özellik, refactor, platform, veri veya operasyonlar.

### Acceptance criteria

Gözlenebilir ve test edilebilir bitiş koşulları. Her madde bir komut, test, diff kanıtı veya manuel
kabul adımıyla eşleşmelidir.

### Risks

Teknik, ürün, veri kaybı, geriye uyumluluk, platform ve operasyon riskleri; olasılık/etki ile
azaltma adımları.

### Security/privacy impact

Kimlik doğrulama, authorization, RLS, Storage, secret, PII, retention, log, analytics, üçüncü taraf
ve silme etkisi. Etki yoksa neden olmadığı yazılır.

### Relevant files

İncelenecek/değiştirilecek dosyalar ve her birinin rolü. Dosya listesi kapsam dışına taşmayı
önleyecek kadar spesifik olmalıdır.

### Implementation steps

Sıralı, küçük ve doğrulanabilir adımlar. Her adımın çıktısı belirtilir; araştırma ve uygulama
birbirinden ayrılır. Devam eden tek adım `In progress`, diğerleri `Pending` veya `Completed` olur.

### Validation commands

Çalıştırılacak exact komutlar ve beklenen başarı koşulu. Build, deploy, remote veya destructive
komutlar ayrıca izin gerektirdiği için açıkça işaretlenir.

### Manual checks

Otomasyonun kanıtlayamadığı gerçek cihaz, erişilebilirlik, görsel, e-posta, bildirim, gesture,
mağaza veya üretim kontrolleri; cihaz/ortam ve beklenen sonuçla yazılır.

### Rollback strategy

Değişikliklerin veri kaybetmeden nasıl geri alınacağı. Migration veya uzak durum varsa forward fix,
backup ve restore sınırları açıklanır; `git reset --hard` çözüm olarak yazılmaz.

### Expected output

Oluşacak dosyalar, davranışlar, test kanıtları ve completion report çıktısı.

### Do not change

Dokunulmayacak dosyalar, sistemler, API sözleşmeleri, metinler, veri ve davranışlar.

### Completion report

Aşağıdaki dört başlık ayrı tutulur:

- **Completed:** Uygulanan ve kanıtlanan işler; dosya/test kanıtıyla.
- **Skipped:** Bilinçli çalıştırılmayan kontroller ve nedeni.
- **Failed:** Başarısız komut/kriter, gözlenen çıktı ve sonraki adım.
- **Manual verification required:** Ajanın kanıtlayamadığı kontrol, sorumlu ortam ve beklenen sonuç.

Plan, tamamlanmış olmayan maddeyi tamamlanmış gösteremez. TypeScript ve lint sonucu tek başına
feature kabulü, güvenlik kabulü veya release readiness kanıtı değildir.

## Önerilen plan iskeleti

```markdown
# PLAN — TASK-### — Başlık

## Goal

## Background

## Current state

## Scope

## Out of scope

## Acceptance criteria

## Risks

## Security/privacy impact

## Relevant files

## Implementation steps

## Validation commands

## Manual checks

## Rollback strategy

## Expected output

## Do not change

## Completion report

### Completed

### Skipped

### Failed

### Manual verification required
```
