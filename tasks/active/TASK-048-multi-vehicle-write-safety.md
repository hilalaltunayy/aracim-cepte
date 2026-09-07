# TASK-048 — Multi-vehicle write safety (stable vehicle target)

Kaynak issue: `multi-vehicle-write-safety-07.md` (repo kökünde). TASK-047 sonrası mimari denetimin
P0 bulgusunu kapatır.

## Goal

Araç-kapsamlı bir formun hedef aracı, form açıldığı andan gönderime kadar sabit kalsın. Aktif araç
sonradan değişse bile kayıt ait olduğu araca yazılsın; mevcut bir kaydın `vehicle_id` alanı normal
düzenleme ile asla başka araca taşınmasın.

## Current state (audit, 2026-09-07)

1. **Kök neden:** `src/store/dataStore.ts` içindeki sekiz araç-kapsamlı action hedefi *gönderim
   anında* canlı state'ten çözüyor: `saveVehiclePhoto` (346), `saveRecord` (420), `saveReminder`
   (440), `saveBodyCondition` (465, `activeVehicle()`), `saveExpertise` (472), `saveNote` (481),
   `saveDocument` (490), `clearSection` (499). Hiçbir form açılışta sabit bir hedef yakalamıyor.
2. **Gerçek `vehicle_id` yeniden atama riski yalnız iki yolda var** (doğrudan `.update()`):
   - `SupabaseAppRepository.saveReminder` — `payload` içinde `vehicle_id` var ve
     `.update(payload).eq('id', id)` çalışıyor → düzenleme hatırlatıcıyı aktif araca taşır. **P0.**
   - `SupabaseAppRepository.saveNote` — aynı desen, `vehicle_notes` üzerinde. **P0.**
3. **Diğer tüm kayıt yolları backend'de zaten korumalı.** Doğrulandı: `save_vehicle_document_consistent`,
   `save_vehicle_document_with_attachments`, `save_expertise_report_consistent`,
   `save_expertise_report_with_attachments`, `save_vehicle_record_atomic_v2`,
   `save_maintenance_record_atomic`, `save_maintenance_record_with_details`, `save_vehicle_photo`
   hepsinde mevcut satır `... and vehicle_id = p_vehicle_id` ile aranıyor (uyuşmazlıkta
   `*_NOT_FOUND`) ve hiçbirinin `UPDATE ... SET` listesinde `vehicle_id` yok. **Migration
   gerekmiyor.**
4. **Silme yolları zaten güvenli:** `deleteRecord/Reminder/Document/Expertise/Note/VehiclePhoto`
   yalnız `id` alıyor, `activeVehicleId` kullanmıyor; RLS sahipliği sınırlıyor.
5. `clearSection` ve `saveBodyCondition` aktif araca bağlı; Settings ve Gövde durumu ekranlarından
   çağrılıyor.

## Scope

- Sekiz store action'ına açık `targetVehicleId` parametresi (issue §8).
- Store'da tek ortak guard: hedef araç `vehicles` içinde yoksa **sessiz fallback yok**, anlaşılır hata.
  Bu aynı zamanda logout/hesap değişimini kapatır (`clear()` sonrası `vehicles` boş).
- Form başına sabit hedef: create'te açılışta yakalanan aktif araç, edit'te kaydın kendi `vehicleId`'si.
  Formlar hedefi çözülene kadar mount edilmiyor (gate deseni; `reminder/edit.tsx` bu yapıya
  TASK-045'te zaten geçmişti).
- `saveReminder` ve `saveNote` update payload'ından `vehicle_id` çıkarılır; update filtresine
  `.eq('vehicle_id', vehicleId)` eklenir (RPC'lerdeki mevcut koruma deseninin aynısı).
- Regresyon testleri (issue §12).

## Out of scope / Do not change

- `VehicleSwitcherSheet`, Home/Vehicle araç değiştirme, `activeVehicleId` ve kalıcılığı.
- Free=1 / Premium=3 limitleri, Reports, Vehicle Assistant, hatırlatıcı listesinin aktif-araç kapsamı.
- RLS, Storage politikaları, storage path düzeni, Family/paylaşılan araç mimarisi.
- Araç silme yaşam döngüsü (ayrı issue), bildirim yönlendirmesi (ayrı issue).
- Migration veya yeni RPC — gerekmiyor (bkz. Current state 3).

## Security/privacy impact

- RLS ve sahiplik kuralları değişmiyor. Yeni guard yalnız **daraltıyor**: istemci artık kendi
  araç listesinde olmayan bir hedefe yazmayı denemiyor; RLS son sınır olarak aynen duruyor.
- `.eq('vehicle_id', …)` update filtresi cross-vehicle yazımı satır seviyesinde imkânsız kılar.

## Rollback

Tek commit; `git revert`. Backend değişikliği yok, deployment yok, migration yok.
