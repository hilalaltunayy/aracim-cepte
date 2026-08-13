# TASK-029 — Çoklu Araç Deneyimi ve Premium Araç Sınırı

**Status:** IMPLEMENTED — AWAITING ANDROID MULTI-VEHICLE ACCEPTANCE
**Owner:** Codex
**Created:** 2026-08-13
**Updated:** 2026-08-13

## Goal

Merkezi entitlement modeliyle Free için 1, Premium için 3 araç sınırını güvenli biçimde uygular; aktif araç seçimini kalıcı, araç kapsamlı veriyi yalıtılmış ve çoklu araç geçişini sade bir mobil akışta sunar.

## Current state

- `origin/develop` TASK-028 merge commit'i `88bf9b4` üzerindedir.
- Store zaten kalıcı `activeVehicleId` ve geçersiz kimlik için deterministik araç çözümleyicisi taşır; ancak araç oluşturma istemciden doğrudan `vehicles` tablosuna yazılır ve server tarafında entitlement limiti yoktur.
- Araç yüklemesi aktif kimlik değiştiğinde eski isteğin sonucunu yeni seçime yazabilecek yarış durumuna açıktır.
- Mevcut entitlement düzeni fail-closed Free varsayılanı, `maxVehicles` ve private server-side plan resolver sağlar.

## Scope

- Merkezi entitlement kullanılarak araç ekleme uygunluğu, kapasite metni ve server-authoritative create sınırı.
- Kalıcı aktif araç seçimi, yarış güvenliği ve silinen/geçersiz aktif araç fallback'i.
- Mevcut tasarım diliyle dashboard ve Araç ekranında araç seçici; tek araçta düşük sürtünme.
- Downgrade'de mevcut araçları koruyup yalnız yeni eklemeyi sınırlama.
- Hedefli domain/store/render/SQL-RLS testleri ve ürün/task dokümantasyonu.

## Out of scope

- Ödeme, paywall, galeri, yeni 3D araç türü, EPDK/Smart Trips, remote Supabase deploy ve geniş UI refactor.

## Acceptance criteria

- [ ] Free 1., Premium 1–3. aracı server tarafında güvenli oluşturur; limit aşımı ve eşzamanlı deneme geçemez.
- [ ] Aktif araç geçişi kalıcıdır; stale ID/silinmiş araç güvenli fallback alır ve araçlar arası veri sızıntısı olmaz.
- [ ] Tek araç deneyimi sade kalır; çoklu araçta erişilebilir, seçili durumu renk dışı da belirgin bir seçim yüzeyi vardır.
- [ ] Downgrade araç/veri silmez; yeni araç eklemeyi Free limitiyle sınırlar.
- [ ] Migration additive, RLS/privilege düzeni negatif testlidir; uzaktan deploy edilmez.

## Security/privacy requirements

- Araç sayısı client planına güvenmeden authenticated owner ve private plan resolver ile transaction içinde hesaplanır.
- RLS sahiplik sınırı korunur; foreign vehicle veya entitlement ile limit yükseltilemez.
- Yeni log, PII veya secret eklenmez.

## Relevant files

- `src/store/dataStore.ts`: aktif araç ve araç kapsamlı bundle yükleme.
- `src/data/repositories/SupabaseAppRepository.ts`: araç create RPC entegrasyonu.
- `src/app/(tabs)/index.tsx`, `src/app/(tabs)/vehicle.tsx`: araç bağlamı ve switcher girişleri.
- `src/features/vehicles/*`: switcher/presentation ve saf kurallar.
- `supabase/migrations/*`, `supabase/tests/*`: yaratma limiti ve RLS/permission kanıtı.

## Implementation steps

1. [x] TASK-028 entitlement ve mevcut aktif araç davranışını incele.
2. [x] Araç yaratmayı owner-serialized, server-authoritative RPC'ye taşı; direct client insert yolunu kapat.
3. [x] Aktif araç değişiminde eski bundle sonucunu reddet ve seçici/kapasite girişlerini mevcut UI sisteminde uygula.
4. [x] Hedefli domain, repository, render ve local SQL/RLS kanıtını çalıştır; diff/security gözden geçir.

## Risks

- Remote migration backlog uygulanmadan yeni create RPC production ortamında bulunmaz; bu nedenle Android build/acceptance öncesi migration'lar sırasıyla remote'a uygulanıp doğrulanmalıdır.
- Gerçek Android'de switcher motion, safe area ve ardışık araç geçişleri ayrıca kabul edilmelidir.

## Validation commands

```powershell
npx vitest run <TASK-029 targeted files>
npx eslint <changed files>
npx tsc --noEmit
npx supabase db lint --local
git diff --check
```

## Manual device checks

- [ ] Android: tek araç dashboard/araç ekranı ve araç ekleme.
- [ ] Android: Premium QA kullanıcıda 2–3 araç arasında dashboard, geçmiş, belge, hatırlatıcı ve gövde verilerinin değişmesi.
- [ ] Android: Free limit mesajı, Premium 3/3 kapasitesi ve downgrade sonrası mevcut üç aracın okunabilmesi.
- [ ] Android: switcher erişilebilirlik, dar ekran ve gesture/üç tuş safe area.

## Rollback strategy

Uygulama commit'i geri alınabilir. Remote uygulandığında migration geriye silme yerine forward migration ile authenticated create grant/policy/RPC önceki güvenli davranışa alınır; araç veya kullanıcı verisi silinmez.

## Completion report

### Completed

- Merkezi Free/Premium kapasitesiyle aktif araç store durumu, güvenli bundle geçişi ve switcher uygulandı.
- `20260813192935_vehicle_creation_entitlement_limit.sql` forward migration'ı direct authenticated araç insert'ini kapatır; owner başına advisory lock'lı RPC üzerinden Free 1 / Premium 3 limiti uygular.
- Hedefli Vitest: 6 dosya, 17 test geçti. Yerel SQL/RLS fixture, TASK-018/TASK-028 önkoşullarıyla transaction içinde geçti ve rollback sonrası local şemada veri bırakmadı.
- Changed-file ESLint ve `git diff --check` geçti. `npx supabase db lint --local` yalnız önceden var olan üç kullanılmayan değişken uyarısını verdi.

### Skipped

- Remote migration/deploy, EAS build ve Play işlemleri kapsam dışıdır.
- Fiziksel Android görsel/gesture kabulü ve concurrency'nin gerçek cihaz/ağ koşullarındaki ölçümü yapılmadı.

### Failed

- `npx tsc --noEmit`, TASK-029 kaynaklarında hata vermedi; ancak önceden var olan auth/legal render-test tip hataları nedeniyle proje geneli başarısız kaldı.

### Manual verification required

- Gerçek Android çoklu araç geçişi ve limit durumları.
