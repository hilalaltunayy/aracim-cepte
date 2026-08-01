# Veritabanı ve güvenlik

## Tablolar

- `profiles`: `auth.users` ile bire bir kullanıcı profili.
- `vehicles`: sahibi, araç kimliği, kilometre, yakıt ve gövde tipi.
- `vehicle_records`: yakıt, bakım ve diğer masraf kayıtları.
- `reminders`: tarih ve/veya kilometre hedefleri ile yerel bildirim kimliği.
- `body_part_conditions`: araç, gövde şeması ve parça için tekil durum.
- `expertise_reports`: rapor meta verisi ve isteğe bağlı özel ek yolu.
- `vehicle_notes`: araç özelinde düz metin notlar.
- `vehicle_documents`: belge türü, tarihler, not ve özel ek yolu.

Araç ilişkili bütün tablolar `vehicle_id` ve `owner_id` taşır. Araç silinirse yabancı anahtarlar
üzerinden ilişkili satırlar cascade ile silinir. Paylaşım özelliği ileride ayrı izin tablosu ile
eklenebilir.

## RLS

Public şemadaki tüm uygulama tablolarında RLS etkindir. Politikalar `TO authenticated` ile
birlikte `(select auth.uid()) = owner_id` veya profil için `id` kontrolü kullanır. UPDATE
politikalarında hem `USING` hem `WITH CHECK` bulunur. İlişkili insert’lerde aracın aynı
kullanıcıya ait olduğu ayrıca doğrulanır. `anon` rolüne tablo erişimi verilmez.

Yeni profil trigger’ı `security definer` gerektirir çünkü `auth.users` insert’inden sonra
public profile oluşturur. Fonksiyon boş `search_path` ve nitelikli tablo adı kullanır; PUBLIC,
anon ve authenticated execute yetkileri kaldırılmıştır.

Mobil uygulama yalnızca yayınlanabilir/anon key kullanır. `service_role`, secret key veya
veritabanı parolası istemciye girmez.

## Storage

`vehicle-attachments` bucket’ı özeldir, dosya başına 5 MB sınırı vardır ve yalnız JPEG, PNG ve PDF
kabul eder. Yeni upload için servis tarafında kullanıcı başına en fazla 10 nesne ve toplam 25 MB
kotası atomik rezervasyonla uygulanır. Nesne yolu:

```text
<auth-user-id>/<vehicle-id>/<random-object-id>.<validated-extension>
```

Upload Edge Function dosya boyutunu ve PDF/JPEG/PNG magic byte'larını doğrular; service-role ile kota
rezervasyonu alır, ancak Storage yüklemesini authenticated kullanıcı istemcisiyle yaparak `owner_id`
ve INSERT RLS kontrolünü korur. Path orijinal dosya adı veya PII içermez. SELECT/DELETE politikaları
ilk segmenti `auth.uid()` ve mevcut nesnenin `owner_id` değeriyle sınırlar; doğrudan UPDATE kapalıdır.
Dosya açma işlemi owner kontrolü sonrasında 60 saniyelik imzalı URL üretir.

## Migrasyon akışı

Migrasyonlar Supabase CLI’nin `migration new` komutuyla oluşturuldu:

1. `20260728092412_initial_schema.sql`
2. `20260728092414_storage_policies.sql`
3. `20260801111349_enforce_attachment_quotas_and_private_uploads.sql`

Yerel doğrulama için `npx supabase db reset`; uzak bağlı proje için `npx supabase db push`
kullanılır. Uzak çalıştırmadan önce proje referansı ve tarayıcı kimlik doğrulaması gerekir.
