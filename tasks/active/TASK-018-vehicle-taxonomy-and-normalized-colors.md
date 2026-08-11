# TASK-018 — Vehicle Taxonomy and Normalized Vehicle Color Foundation

**Status:** IMPLEMENTED — AWAITING REMOTE MIGRATION AND ANDROID ACCEPTANCE
**Owner:** Codex
**Created:** 2026-08-11
**Updated:** 2026-08-11

## Goal

Araç profilinde gelecekteki görselleştirme katmanlarının doğrudan tüketebileceği kararlı gövde tipi ve renk kimlikleri oluşturmak; mevcut araçları ve gövde durumu ekranını geriye uyumlu korumak.

## Current behavior

- `vehicles.body_type`, gövde durumu SVG şemasıyla ortak kullanılan üç eski enum değerinden biridir.
- `vehicles.color` serbest metindir ve render edilebilir kararlı bir renk kimliği sağlamaz.
- Araç formu yeni araçta sessizce `sedan_hatchback` seçer ve renk için serbest metin kullanır.
- Araç profilinde eski birleşik gövde etiketi görünür; renk kompakt profil bilgisinde gösterilmez.

## Scope

- [x] 14 üyeli merkezi gövde tipi kataloğu ve 12 üyeli merkezi renk kataloğu.
- [x] Mevcut `body_type` enumunun additive genişletilmesi ve nullable `color_id` alanı.
- [x] Legacy gövde/renk değerlerinin kayıpsız ve güvenli gösterimi.
- [x] Araç create/edit ekranında gövde ve swatch destekli renk seçimi.
- [x] Araç profilinde kullanıcı etiketleriyle kompakt gövde/renk gösterimi.
- [x] Mevcut üç SVG şemasına merkezi uyumluluk eşlemesi.
- [x] Hedefli domain, persistence, render ve yerel SQL/RLS doğrulamaları.

## Out of scope

- 3D/360 render, kamera/gesture, yeni SVG silüetleri, OCR, AI, premium, auth, reminder, maintenance, dependency veya release değişiklikleri.
- Remote Supabase deploy, EAS build, Play Console ve `main`/release branch değişikliği.

## Acceptance criteria

- [x] Tüm zorunlu gövde/renk kimlikleri tek katalogdan doğru etiket ve render rengi üretir.
- [x] Cabrio/Roadster ayrıdır; `mpv_minivan`, `sports_car`, `campervan`, `minibus` doğru çözülür.
- [x] Yeni araç seçimsiz sahte gövde varsayımı almaz; kaydetmek için seçim gerekir.
- [x] Normalize gövde ve renk create/edit sırasında saklanır ve tekrar açıldığında geri yüklenir.
- [x] Bilinen legacy renkler deterministik çözülür; bilinmeyen metin korunur ve güvenli fallback kullanır.
- [x] Eski gövde değerleri okunur; gövde durumu ekranı yeni taksonomiyle crash üretmez.
- [x] Profil ham iç kimlik yerine kullanıcı etiketi gösterir.
- [x] Migration additive, geriye uyumlu ve mevcut RLS satır sahipliğiyle korunur.

## Security/privacy requirements

- Yeni tablo veya genişletilmiş veri toplama yoktur; renk/gövde aynı araç sahipliği satırında tutulur.
- Mevcut `vehicles` RLS politikaları yeni alanları da korumalıdır; User A, User B aracını okuyamamalı/değiştirememelidir.
- Secret, PII logu, remote veri veya production deploy yoktur.

## Relevant files

- `src/app/vehicle/edit.tsx`: create/edit seçicileri ve legacy form durumu.
- `src/features/vehicles/`: merkezi kataloglar ve sunum sözleşmesi.
- `src/domain/entities/index.ts`: normalize araç profil sözleşmesi.
- `src/data/repositories/SupabaseAppRepository.ts`: persistence payloadı.
- `src/features/bodyCondition/`: eski SVG şeması uyumluluğu.
- `supabase/migrations/20260811102853_vehicle_taxonomy_normalized_colors.sql`: forward migration.

## Implementation steps

1. Mevcut enumu silmeden 14 normalize değeri ekle; `vehicles.color_id` nullable ve kontrollü ekle.
2. Gövde/renk katalogları ile legacy çözümleme ve render fallback helperlarını oluştur.
3. Domain, generated DB types, mapper ve repository payloadını güncelle.
4. Seçicileri kataloglardan üret; legacy değerleri açılışta koru; profil etiketini merkezileştir.
5. Yeni gövde kimliklerini mevcut SVG şemalarına yalnız uyumluluk amacıyla eşle.
6. Hedefli testleri ve yerel SQL/RLS kontrollerini çalıştır; diff/security review yap.

## Validation commands

```powershell
npx vitest run <TASK-018 targeted files>
npx eslint <changed TypeScript/TSX files>
npx tsc --noEmit
git diff --check
```

## Manual device checks

- [ ] Android'de yeni araçta tüm gövde/renk seçenekleri, swatch ve TalkBack etiketleri.
- [ ] Create/edit persistence, yeniden açma ve diğer alanların korunması.
- [ ] Legacy araç/renk fallback gösterimi ve normal save öncesi veri kaybı olmaması.
- [ ] Profil kompakt görünümü ve gövde durumu ekranının yeni tiplerle çalışması.

## Rollback strategy

Uygulama commit'i geri alınabilir. PostgreSQL enum değerleri güvenli biçimde silinemez; forward recovery yeni istemcinin eski ve yeni değerleri okumaya devam etmesi, gerekirse `color_id` kullanımının istemci tarafında devre dışı bırakılmasıdır. Nullable `color_id` mevcut satırları veya eski istemcileri zorlamaz.

## Do not change

- `main`, release branch/tag, auth, maintenance, reminder, dashboard hesapları, dependencies, Expo/EAS yapılandırması, production Supabase ve kullanıcı verileri.

## Completion report

### Completed

- Hedefli Vitest: 5 dosya, 104/104 test geçti.
- Değişen TypeScript/TSX dosyalarında ESLint geçti.
- Yerel Supabase migration + sentetik SQL/RLS doğrulaması geçti; transaction rollback edildi.
- `git diff --check` ve secret/artifact kapsam taraması geçti.

### Skipped

- Broad test suite, coverage, EAS build ve remote Supabase deploy kapsam gereği çalıştırılmadı.

### Failed

- Full `npx tsc --noEmit`, TASK-018 dışındaki mevcut auth/legal render testlerinin bilinen tip hataları nedeniyle başarısız. TASK-018 dosyası hatası raporlanmadı.

### Manual verification required

- Aşağıdaki Android kontrolleri ve migration'ın doğrulanmış remote projeye ayrı deploy'u bekliyor.

## Human acceptance result

**Result:** NOT REVIEWED
**Reviewed by:** —
**Date:** —
**Notes:** Fiziksel Android doğrulaması bekleniyor.
