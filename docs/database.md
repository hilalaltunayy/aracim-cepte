# Veritabanı ve güvenlik

## Tablolar

- `profiles`: `auth.users` ile bire bir kullanıcı profili.
- `vehicles`: sahibi, araç kimliği, kilometre, yakıt ve gövde tipi.
- `vehicle_records`: yakıt, bakım ve diğer masraf kayıtları.
- `maintenance_items`: bakım event'ine bağlı sıfır veya daha çok yapılandırılmış operasyon.
- `maintenance_templates`: kullanıcıya ait, tekrar kullanılabilir bakım operasyonu preset'leri.
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

## Araç taksonomisi ve renk sözleşmesi

`vehicles.body_type`, eski üçlü gövde şeması değerlerini silmeden 14 normalize ürün kimliğini de
destekler. Yeni/normal kaydedilen araçlar `sedan`, `suv`, `roadster`, `mpv_minivan` gibi kararlı
kimlikler kullanır; mevcut `sedan_hatchback`, `suv_crossover` ve `pickup_light_commercial` satırları
geriye uyumluluk için yerinde kalır ve kullanıcı normal edit/save yapmadan yapay bir tipe çevrilmez.
Mevcut gövde durumu SVG'leri ayrı bir merkezi uyumluluk eşlemesiyle üç eski şemadan birini kullanır;
bu eşleme yeni bir silüet veya 3D desteği iddiası değildir.

`vehicles.color` bilinmeyen legacy serbest metni kayıpsız tutar. Nullable `vehicles.color_id`, yalnız
merkezi katalogdaki 12 kararlı renk tokenından birini saklar ve DB check constraint ile doğrulanır.
Yeni render sözleşmesi `color_id` üzerinden label/HEX fallback alır; `color_id` null ise eski metin
gösterilebilir, render ise nötr güvenli fallback kullanır. Yeni alan aynı `vehicles` satırında olduğu
için mevcut owner-scoped RLS politikaları ek bir erişim yüzeyi açmadan alanı da korur.

## Kilometre modeli

`vehicles.current_km`, aracın ayrı saklanan ve gerilemeyen güncel kilometre high-water mark'ıdır.
`vehicle_records.kilometer` ise kayıt tarihindeki event kilometresi olup nullable'dır;
`vehicle_records.record_date` event tarihidir. Boş kilometre “Kilometreyi bilmiyorum” anlamına gelir
ve `0` gibi sahte bir sentinel değer kullanılmaz.

Yakıt ve diğer gider create/update işlemleri mobil repository'de `save_vehicle_record_atomic`,
bakım event + final operasyon seti ise `save_maintenance_record_atomic` RPC'sinden geçer. Her iki
RPC aynı transaction içinde kaydı yazar ve bilinen event kilometresi mevcut `current_km` değerinden
yüksekse aracı ilerletir:

```text
event_km null       => current_km değişmez
event_km <= current => current_km değişmez
event_km > current  => current_km = event_km
```

Tarihsel bir kaydın düzenlenmesi veya silinmesi `current_km` değerini düşürmez; değer record
tablosundaki `MAX(kilometer)` üzerinden yeniden türetilmez. Aynı gün içindeki event'lerin güvenilir
bir sırası olmadığı için çelişkili bilinen kilometreler uygulamada advisory warning üretir, hard
block oluşturmaz. Form, en yakın önceki/sonraki bilinen kilometreyle çelişki gördüğünde kullanıcıdan
“Yine de kaydet” onayı ister.

## Bakım event ve paket modeli

`vehicle_records` içindeki `record_type='maintenance'` satırı bakım event source-of-truth'udur;
mevcut ID, tarih, nullable event kilometresi, toplam maliyet ve not alanları korunur.
`maintenance_items.maintenance_record_id` bu event'e bağlanır ve parent kayıt silinince cascade
olur. Legacy V1 bakım kayıtlarına sahte operasyon üretilmez; sıfır item geçerli ve mevcut
`category` UI fallback başlığıdır.

Uygulama bakım create/edit işleminde event ve seçilen item setini
`save_maintenance_record_atomic` içinde birlikte kaydeder. Edit sırasında önceki item seti aynı
transaction'da final seçimle değiştirilir. `maintenance_templates` yalnız kullanıcı preset'idir;
event kaydına seçimler kopyalanır ve event düzenlemesi template'i değiştirmez. Varsayılan paketler
lokal merkezi config'tedir, database'de global kullanıcı satırı olarak çoğaltılmaz.

Yeni tablolar RLS ile owner-scoped'dur. Item okuması parent bakım event/vehicle sahipliğini de
doğrular; item write normal client grant'ine açık değildir ve owner-scoped atomic RPC üzerinden
yapılır. Kullanıcı template CRUD'u doğrudan RLS ile yalnız `owner_id = auth.uid()` satırlarına
izin verir.

Mevcut `vehicle_records` RLS ve tablo grant'leri değiştirilmez. Normal mobil write yolu RPC ile
sınırlıdır; ancak özel bir authenticated Data API istemcisinin kendi owner-scoped yakıt/gider
satırına doğrudan yazması atomik high-water güncellemesini atlayabilir. Yeni bakım item write grant'i
bu nedenle yalnız atomic RPC'ye bırakılmıştır. Kalan legacy bypass riski, ileride record tablo write
grant'leri daraltılmadan önce QA seed/bakım araçları RPC'ye taşınarak ayrıca ele alınmalıdır.

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
4. `20260810212244_historical_odometer_support.sql`
5. `20260810221647_maintenance_packages_foundation.sql`
6. `20260811102853_vehicle_taxonomy_normalized_colors.sql`

Yerel doğrulama için `npx supabase db reset`; uzak bağlı proje için `npx supabase db push`
kullanılır. Uzak çalıştırmadan önce proje referansı ve tarayıcı kimlik doğrulaması gerekir.
