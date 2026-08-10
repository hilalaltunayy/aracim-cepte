# TASK-017 — Bakım paketleri ve çoklu bakım işlemleri temeli

**Status:** IMPLEMENTED — AWAITING ANDROID DEVICE ACCEPTANCE

**Owner:** Codex

**Created:** 2026-08-11

**Updated:** 2026-08-11

## Goal

Mevcut `vehicle_records` bakım event modelini geriye uyumlu tutarak bir bakım kaydına birden çok
işlem bağlamak, config tabanlı varsayılan paket ve kullanıcıya özel tekrar kullanılabilir paket
akışını eklemek.

## Background

Bakım kayıtları ayrı bir event tablosu yerine `vehicle_records` içinde
`record_type='maintenance'` olarak saklanıyor. Ortak kayıt formu tek `category` metni kullanıyor;
history kartı bu başlığı gösteriyor. TASK-016 event kilometresini nullable observation,
`vehicles.current_km` değerini ise düşmeyen high-water mark olarak tanımladı.

## Current state

- Bakım create/edit, yakıt ve giderle aynı `src/app/record/edit.tsx` rotasında.
- Normal record write yolu idempotent `save_vehicle_record_atomic` RPC’si.
- Legacy bakım kaydında operasyon alt satırı veya kullanıcı şablonu yok.
- `vehicle_records` RLS sahiplik ve vehicle ilişkisini doğruluyor.

## Scope

- Additive `maintenance_items` ve `maintenance_templates` tabloları.
- Bakım event + final item setini tek transaction’da yazan owner-scoped RPC.
- Merkezi bakım kataloğu ve varsayılan “Periyodik Bakım” paketi.
- Ortak bakım formunda paket uygulama, manuel seçim, kullanıcı paketi oluşturma/silme.
- Compact history özeti ve edit/detail ekranında tam operasyon listesi.
- Legacy sıfır-item bakım kaydı ve TASK-016 kilometre davranışının korunması.

## Out of scope

OCR, AI, reminder otomasyonu, per-item maliyet UI’si, premium, 3D, trip, OBD, provider entegrasyonu,
geniş template yönetim ekranı ve unrelated refactor.

## Acceptance criteria

- Çoklu ve tekli bakım işlemi kaydedilebilir ve düzenlenebilir.
- Varsayılan/kullanıcı paketi seçimleri form state’ine kopyalanır; kaynak paket değişmez.
- Kullanıcı paketi owner-scoped olarak oluşturulabilir, tekrar kullanılabilir ve silinebilir.
- Legacy bakım kayıtları operasyon uydurulmadan okunur/düzenlenir.
- Maintenance event ve item replacement atomiktir; child satırlar parent silinince cascade olur.
- Cross-user template/item erişimi RLS/RPC tarafından reddedilir.
- Tarihsel düşük kilometre kabul edilir; `current_km` yalnız daha yüksek bilinen kilometrede artar.
- History kartı operasyonları tek tek dökmeden compact özet gösterir.

## Risks

- Yeni RPC deploy edilmeden yeni client bakım kaydı yazamaz; release sırası migration önce client
  olmalıdır.
- Legacy bakım eventleri item’sızdır; UI `category` fallback’ini korumalıdır.
- User template item kimlikleri config kataloğuyla doğrulanır; gelecekte kaldırılan katalog öğeleri
  okunabilir fallback gerektirir.

## Security/privacy impact

Yeni tablolar RLS ile owner-scoped olur. Item insert/update parent maintenance record ve vehicle
sahipliğini doğrular. RPC `auth.uid()`, locked vehicle/record, güvenli `search_path` ve scoped
idempotency kullanır. Yeni kişisel veri veya provider aktarımı yoktur.

## Relevant files

- `src/app/record/edit.tsx`
- `src/features/maintenance/`
- `src/domain/entities/index.ts`
- `src/domain/repositories/AppRepository.ts`
- `src/data/repositories/SupabaseAppRepository.ts`
- `src/store/dataStore.ts`
- `src/shared/components/entityCards.tsx`
- `supabase/migrations/20260810221647_maintenance_packages_foundation.sql`
- `supabase/tests/maintenance_packages.sql`

## Implementation steps

1. **Completed:** Existing maintenance/event, form, repository, RPC and RLS contracts inspected.
2. **Completed:** Add backward-compatible schema, RLS and atomic maintenance RPC.
3. **Completed:** Add domain/catalog, repository/store mapping and minimal maintenance package UI.
4. **Completed:** Add focused unit/render/SQL authorization tests.
5. **Completed:** Review diff, security/privacy regression, documentation and completion evidence.

## Validation commands

```powershell
npx vitest run <TASK-017 targeted test files>
npx eslint <TASK-017 changed TS/TSX files>
npx tsc --noEmit
# local-only targeted SQL, if local Supabase prerequisites are available
git diff --check
```

## Manual checks

Existing/legacy maintenance, multi/single operation create, historical mileage, package apply/edit,
user package create/reuse/delete, compact history and full edit/detail operations on Android.

## Rollback strategy

Client changes can be reverted without rewriting legacy data. Deployed schema is rolled forward:
new UI/RPC usage is disabled first, then a later forward migration may revoke the new RPC/tables
after confirming no new item/template data must be retained. Existing `vehicle_records` stay intact.

## Expected output

Backward-compatible maintenance item/template foundation, atomic write path, minimal mobile flow and
targeted security/behavior evidence.

## Do not change

Auth, legal, dashboard calculations, reminders, document security, Expo/EAS config, dependencies,
production Supabase, Play Console and all features listed in `Out of scope`.

## Completion report

### Completed

- `vehicle_records` bakım event source-of-truth olarak korundu; source alanı additive eklendi.
- Maintenance item/template tabloları, index/FK/cascade/RLS ve owner-scoped atomic RPC eklendi.
- Merkezi katalog, varsayılan paket, kullanıcı paketi oluşturma/silme/reuse ve manuel seçim bağlandı.
- Legacy kayıt fallback'i, compact history özeti ve edit/detail tam seçim listesi eklendi.
- 6 hedefli Vitest dosyasında 31 test geçti; 20 unrelated test `-t` filtresiyle atlandı.
- Local migration apply, hedefli SQL transaction/RLS testi ve `supabase db lint --level error` geçti.
- Değişen TS/TSX dosyalarının ESLint kontrolü ve `git diff --check` geçti.

### Skipped

Broad test suite, coverage, EAS build, remote Supabase deploy ve Play Console kapsam dışıdır.

### Failed

`npx tsc --noEmit`, TASK-017 dışındaki mevcut
`tests/routes/authEmailConfirmation.render.test.tsx` ve `tests/routes/legalLinks.render.test.tsx`
dosyalarındaki 7 tip hatası nedeniyle non-zero döndü. Çıktıda TASK-017 dosyası hatası yoktur.

### Manual verification required

Android'de legacy/multi/single bakım, tarihsel kilometre, paket apply/edit, kullanıcı paketi
create/reuse/delete, compact history ve edit/detail operasyon listesi doğrulanmalıdır.
