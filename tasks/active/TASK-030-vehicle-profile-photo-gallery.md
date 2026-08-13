# TASK-030 — Araç profil fotoğrafı ve Premium mini galeri

**Status:** IMPLEMENTED — AWAITING ANDROID VEHICLE PHOTO GALLERY ACCEPTANCE
**Owner:** Codex
**Created:** 2026-08-13
**Updated:** 2026-08-13

## Goal

TASK-022 özel attachment altyapısı ve TASK-029 aktif araç bağlamını kullanarak, Free için tek profil fotoğrafı ve Premium için en fazla beş fotoğraflık sakin bir mini galeri sunmak.

## Current state

- `origin/develop` TASK-029 merge commit'i `2749602` üzerindedir; branch bu commit'ten açılmıştır.
- `attachments` tablosu ve upload rezervasyonları `vehicle_photo` parent türünü şimdiden tanır; ancak parent reservation fonksiyonu bu tür için server-side kaydetme akışına henüz izin vermez.
- TASK-028 merkezi entitlement sözleşmesi Free `maxVehiclePhotos=1`, Premium `maxVehiclePhotos=5` tanımlar ve server tarafında `private.effective_plan_for_user` ile güvenli çözüm sağlar.
- Araç ekranı mevcut 3D/fallback görselini ve TASK-029 switcher'ını korur; fotoğraf bu yüzeyleri zorla yeniden tasarlamayacaktır.

## Scope

- Additive `vehicle_photos` metadata modeli, owner/RLS/privilege koruması ve yarış-güvenli fotoğraf reservation/save/primary/delete RPC'leri.
- Mevcut private Storage/attachment rezervasyon, görsel sıkıştırma (2000 px, JPEG 0.86) ve cleanup kuyruğunun yeniden kullanılması.
- Aktif araç bundle'ında photo metadata'sı; switcher için yalnız primary preview.
- Araç ekranında profile preview, Free replace/remove, Premium 5 fotoğraflık kontrollü galeri ve focused viewer.
- Hedefli domain/render/repository/SQL-RLS testleri, tasarım kararı ve ürün/task belgesi.

## Out of scope

- Billing/paywall, yeni 3D gövde, sosyal paylaşım, public Storage, thumbnail CDN, remote Supabase deploy, EAS build ve geniş UI refactor.

## Design decision

Mevcut araç kartı profile fotoğrafının hafif giriş noktası olarak korunur; fotoğraf yokken var olan 3D/fallback görünüm değişmez. Premium ek görseller, ana ekranı kalabalıklaştırmayan sayılı küçük galeri girişiyle focused modal viewer'da açılır. Kısa sistem modal geçişleri dışında özel hareket eklenmez; seçili/primary durum metin ve ikonla da anlatılır. Bu karar, sabit image container, progressive disclosure, tanıdık sheet/modal ve reduced-motion'a saygı ilkelerine dayanır.

## Security/privacy requirements

- Storage private, signed URL kısa ömürlü ve path PII içermez.
- Server owner/vehicle/entitlement'ı kendisi çözer; client planı veya limitine güvenmez.
- Yeni SECURITY DEFINER fonksiyonları `auth.uid()` kontrolü, `search_path = ''`, tam şema adları ve anon/PUBLIC execute revoke içerir.
- Fotoğraf silme metadata ve Storage cleanup kuyruğunu tutarlı ele alır; başka kullanıcının fotoğrafına erişim/mutasyon reddedilir.
- Ham URL, object path veya fotoğraf içeriği loglanmaz.

## Implementation plan

1. [x] TASK-022/028/029 sözleşmelerini, mevcut ekran ve attachment akışını incele; görsel ilkeleri kaydet.
2. [x] Araç-fotoğraf metadata/RPC/RLS migration'ını mevcut attachment rezervasyonlarına uyarlayıp local SQL ile doğrula.
3. [x] Repository/store'a photo metadata ve owner-scoped mutation'ları ekle; aktif araç değişiminde stale veriyi temiz tut.
4. [x] Araç profil/switcher için minimal galeri, viewer ve camera/gallery akışını mevcut UI bileşenleriyle uygula.
5. [x] Hedefli testler, changed-file lint/typecheck, SQL/RLS, görsel render QA ve diff/security incelemesini tamamla.

## Acceptance criteria

- [ ] Free yeni 2., Premium yeni 6. fotoğrafı server tarafında ve concurrent istekte geçemez.
- [ ] İlk fotoğraf primary olur; primary değişimi kopya dosya üretmez; primary silinince deterministik fallback seçilir.
- [ ] Downgrade var olan fotoğrafları silmez/gizlemez, yalnız yeni eklemeyi Free sınırında engeller.
- [ ] Araçlar arasında fotoğraf metadata'sı, signed URL'si veya görünümü sızmaz.
- [ ] Fotoğraf yokken mevcut 3D/fallback ve tek araç deneyimi korunur.

## Validation

```powershell
npx vitest run <TASK-030 targeted files>
npx eslint <changed files>
npx tsc --noEmit
npx supabase db lint --local
git diff --check
```

## Manual Android checks

- [ ] Free: fotoğraf yok, ilk fotoğraf, değiştir, kaldır ve ikinci ekleme limiti.
- [ ] Premium: 1/3/5 fotoğraf, primary değişimi, primary silme, viewer/safe-area ve 5/5 durumu.
- [ ] Araç A → B: switcher preview, galeri ve fallback'in doğru kalması.
- [ ] Offline/signed URL hata durumu, kamera/galeri izin reddi ve Android geri tuşu.

## Rollback

Uygulama commit'i geri alınabilir. Remote'a uygulandığında migration geri silinmez; forward migration RPC erişimini kapatır veya yeni fotoğraf yazımını devre dışı bırakır, mevcut attachment/photo metadata'sını ve Storage objelerini silmez.

## Completion report

### Completed

- Hedefli Vitest: 8 dosya / 29 test geçti.
- Edge-function metadata testi: 2 test geçti.
- Local Docker/Postgres SQL/RLS fixture `supabase/tests/vehicle_photo_gallery.sql`, `ON_ERROR_STOP=1` ile geçti.
- Fixture owner isolation, private function exposure, Free/Premium write limits, replacement,
  primary fallback ve deterministik capacity locking denetler.

### Skipped

- Remote Supabase deploy, EAS build, Play Console eylemi ve geniş test paketi kapsam dışı bırakıldı.

### Failed

- Tam proje `npx tsc --noEmit`, TASK-030 kaynak dosyalarında hata bulmadı; ancak önceden var olan
  `tests/routes/authEmailConfirmation.render.test.tsx` ve `tests/routes/legalLinks.render.test.tsx`
  test tipi hataları nedeniyle sıfır çıkış koduyla tamamlanamadı. Bu task kapsamında değiştirilmedi.

### Manual verification required

- Android kamera/galeri izni ve fotoğraf yönü; Free 0/1/ikinci fotoğraf limiti; Premium 1/3/5
  galeri; viewer/safe-area; primary silme fallback'i; A → B switcher thumbnail; offline signed-URL retry.
