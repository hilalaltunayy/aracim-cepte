# TASK-046 — Vehicle profile photo persistence

Kaynak issue: `vehicle-profile-photo-persistence-04.md` (untracked, repo kökünde referans görseliyle).
Bu dosya o issue'nun yaşayan execution planıdır.

## Goal

Kaydedilmiş araç profil fotoğrafının uygulama yeniden başlatıldıktan sonra da hem küçük araç
avatarında hem "Profil fotoğrafı" bölümünde kalıcı olması; kaynağın tek ve bulut tabanlı olması.

## Background

Fotoğraf seçilip kaydediliyor, oturum boyunca iki yerde de görünüyor, ama app kill/reopen sonrası
varsayılan araç ikonuna düşüyor. Ekran görüntüsünde "1/1 fotoğraf" yazıyor ama görsel render
edilmiyor.

## Current state (audit, 2026-09-07)

Client kalıcılık mimarisi **doğru**. Kök neden sunucuda, deployment drift:

1. **`vehicle_photos` + `attachments` metadata doğru yazılıyor.** Remote DB probe:
   `photo_rows=1, primary_rows=1, photo_attachments=1`. `save_vehicle_photo` RPC atomik ve
   `storage.objects` varlığını doğruluyor.
2. **Storage nesnesi silinmiş.** Aynı probe: `object_exists=false`. İlgili reservation
   `status='failed', failure_code='ORPHAN_CLEANED'`, `failed_at` kayıttan ~25 dk sonra.
3. **Kök neden:** Deployed `reconcile-attachments` Edge Function (v7) **eski** — birleşik
   `attachments` tablosundan (`20260811144343`) önce. Deployed sürümün "referenced" (korunacak
   nesneler) kümesi yalnız legacy `vehicle_documents.attachment_path` ve
   `expertise_reports.attachment_path` kolonlarından kuruluyor. Araç fotoğrafları (ve birleşik
   belgeler, bakım fişleri) `attachments` tablosunda tutulduğu için deployed reconciler hepsini
   orphan sanıp siliyor. Commit `94e6279` bunu düzeltmiş (`attachments.storage_path` eklenmiş) ama
   fonksiyon yeniden deploy edilmemiş.
4. **Tetikleyici sıklığı:** `reconcileVehicleData` her `loadActiveData`'da (her bootstrap / araç
   değişimi) `reconcileAttachments()` (Edge Function) tetikliyor. Başarılı kayıttan sonraki ilk
   app açılışında 10 dk orphan grace penceresi içinde nesne siliniyor.
5. **Yan etki:** Aynı hata birleşik belge ve bakım fişi eklerini de sessizce bozuyor. Aynı
   fonksiyonun yeniden deploy'u hepsini tek seferde düzeltir.
6. **İkincil drift (kapsam dışı):** `vehicle-ai-assistant` (v11) deterministic-fact işinden geride.
   Bu görevde dokunulmaz.

Doğrulanmış olmayan: fiziksel cihazda kabul.

## Scope

- `reconcile-attachments` orphan-karar mantığını test edilebilir `_shared/attachmentReconciliation.ts`
  modülüne çıkar + `.test.mjs` ekle (diğer tüm fonksiyonların deseni; bu drift'in kaçmasının sebebi
  bu mantığın testsiz olması).
- `completed` reservation dalına da grace penceresi ekle: taze kaydedilmiş bir nesne, `attachments`
  satırı görünür olana kadar (grace) korunur.
- Doğru + refactor edilmiş `reconcile-attachments`'ı yeniden deploy et.
- Client kalıcılık testleri (issue §11): kanonik değer storage path (file:// değil), rehydration,
  header/gallery aynı kaynak, hesap/araç izolasyonu.

## Out of scope

- Vehicle ekranı, 3D görünüm, galeri, tab tasarımı; Premium mantığı; Documents/OCR akışı.
- `dataStore` geniş refactor'u; ikinci fotoğraf sistemi; public bucket; RLS zayıflatma.
- `vehicle-ai-assistant` drift'i.
- Silinmiş storage nesnesinin geri getirilmesi (mümkün değil; düzeltilen metadata reconcile
  dangling `attachments` satırını temizler, FK cascade `vehicle_photos` satırını kaldırır,
  kullanıcı fotoğrafı yeniden ekler ve artık kalıcı olur).

## Acceptance criteria

Issue §15. Otomatik doğrulananlar testlerle; cihaz gerektirenler "Manual verification required".

## Risks

- **Deploy engeli:** `db push` auto-mode classifier tarafından engellendi. `functions deploy` de
  engellenebilir; engellenirse komut kullanıcıya bırakılır ve düzeltme deploy'a kadar etkin olmaz.
- Refactor yalnız tek fonksiyonu kapsıyor, davranış birebir korunuyor (grace eklentisi hariç).

## Security/privacy impact

- RLS / Storage politikası değişmiyor. Bucket private kalıyor. Fonksiyon hâlâ caller JWT'sinden
  `owner_id` çözüyor, yalnız kendi klasörünü listeliyor/temizliyor.
- Refactor saf fonksiyon; PII, path veya token loglamıyor.

## Rollback

Refactor + test: `git revert`. Fonksiyon: bir önceki deploy'a `supabase functions deploy` ile
dönülebilir (ama eski sürüm hatalı olduğu için istenmez).
