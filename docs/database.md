# Veritabanı ve güvenlik

## Tablolar

- `profiles`: `auth.users` ile bire bir kullanıcı profili.
- `vehicles`: sahibi, araç kimliği, kilometre, yakıt ve gövde tipi.
- `vehicle_records`: yakıt, bakım ve diğer masraf kayıtları.
- `maintenance_items`: bakım event'ine bağlı sıfır veya daha çok yapılandırılmış operasyon.
- `maintenance_templates`: kullanıcıya ait, tekrar kullanılabilir bakım operasyonu preset'leri.
- `reminders`: tarih ve/veya kilometre hedefleri ile yerel bildirim kimliği.
- `body_part_conditions`: araç, gövde şeması ve parça için geriye uyumlu parent/representative
  durum ve not.
- `body_part_condition_values`: bir parent gövde parçasına bağlı normalize edilmiş durum seti.
- `expertise_reports`: rapor meta verisi ve geriye uyumlu isteğe bağlı tek-ek yolu.
- `attachments`: kamera, galeri ve dosya seçiciden gelen ekler için ortak owner/vehicle/parent
  scoped metadata.
- `vehicle_notes`: araç özelinde düz metin notlar.
- `vehicle_documents`: tür bazlı normalize kurum/tarih/numara metadata'sı, not ve geriye uyumlu özel
  tek-ek yolu.

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

## Gövde parçası çoklu durum modeli

`body_part_conditions` mevcut araç/şema/parça kimliğini, notu ve eski istemciler için deterministic
representative `condition` alanını korur. Yeni `body_part_condition_values`, aynı parent altında
normalize durumları ayrı satırlar olarak saklar. `condition_set_initialized=false` olan ve child
satırı bulunmayan parent legacy tekli kayıttır; istemcide `[condition]` olarak okunur. Aynı marker
`true` iken child satırı yoksa bu gerçek boş settir ve `unknown` olarak yorumlanmaz.

Primary durumlar `original`, `painted`, `locally_painted` ve `replaced` olup aynı sette en fazla biri
bulunabilir. `damaged` primary durumla birlikte veya tek başına kullanılabilir. `unknown` yalnız
başına geçerlidir. Mobil toggle bu uyumsuzlukları seçim anında değiştirerek çözer; database RPC'si
de aynı invariants'ı tekrar doğrular. Representative renk önceliği merkezi helper'da deterministik
olup `damaged`, bilinen boya/değişim durumlarının önünde gösterilir; gerçek tüm durumlar metinsel
etiketlerde korunur.

`save_body_part_conditions_atomic` owner vehicle'ı kilitler, parent satırı ile final child setini
tek transaction içinde değiştirir ve güvenli boş `search_path` kullanır. Child tablo authenticated
istemciye yalnız SELECT grant verir; doğrudan write kapalıdır. RLS parent ve araç sahipliğini birlikte
doğrular. Eski istemcinin mevcut parent `condition` alanına owner-scoped yazması, child setini silip
satırı tekrar legacy singleton moduna alan trigger ile geriye uyumlu kalır.

Araç veya parent silinince child değerler cascade ile temizlenir. Remote rollback, migration
history'sini değiştirmek yerine yeni forward migration ile RPC erişimini durdurup istemciyi korunan
legacy `condition` alanına döndürmelidir; child verisi inceleme/migrasyon tamamlanana kadar
silinmemelidir.

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

Yakıt ve diğer gider create/update işlemleri mobil repository'de `save_vehicle_record_atomic_v2`,
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

## Yakıt kayıt modeli

Yakıt event'inin toplam tutarı mevcut `vehicle_records.amount` alanında zorunlu kalır. Litre ve
litre fiyatı bilinmiyorsa sahte `0` yerine sırasıyla nullable `liters` ve `price_per_liter` kullanılır;
bu nedenle yalnız toplam tutarlı bir yakıt kaydı geçerlidir. Opsiyonel `station_brand`, uygulamadaki
merkezi katalogdan gelen kararlı kimliği (`opet`, `petrol_ofisi`, `other` gibi) saklar ve serbest metin
veya kişisel veri içermez.

Yeni mobil istemci `save_vehicle_record_atomic_v2` ile bu alanları owner-scoped, idempotent ve
kilometre high-water kuralıyla aynı transaction'da yazar. Önceki RPC imzası eski istemciler için
korunur. Bir kayıt yakıt dışı türe çevrilirse BEFORE trigger litre/fiyat/istasyon alanlarını temizler;
DB constraint'i yakıt ayrıntılarının gider/bakım satırında kalmasını önler. Mevcut `vehicle_records`
RLS politikaları yeni nullable kolonları da aynı sahiplik sınırı içinde korur.

## Hatırlatıcı yerel saat modeli

`reminders.due_date` takvim gününü, nullable `due_time` ise kullanıcının seçtiği yerel duvar saatini
saklar. Yeni tarihli hatırlatıcılarda varsayılan `09:00`'dır. Migration legacy satırlara sahte saat
yazmaz; `due_time is null` olan eski satırlar istemcide 09:00 fallback'iyle okunur. Yeni/düzenlenen
hatırlatıcı için birleşik yerel tarih+saat geçmişteyse repository DB write ve local notification
schedule başlamadan işlemi reddeder. Bu alan mevcut `reminders` RLS sahiplik sınırını değiştirmez.

## Araç belgesi metadata modeli

`vehicle_documents.document_type` merkezi uygulama kataloğundaki kararlı tür kimliğidir. Mevcut
`title`, `document_number`, `issue_date`, `expiry_date`, `note` ve `attachment_path` alanları eski
istemciler için korunur. TASK-023 şu nullable normalize alanları ekler:

- `issuer_name`: sigorta şirketi, muayene istasyonu, ekspertiz merkezi veya belgeyi düzenleyen kurum.
- `start_date`: sigorta poliçesi başlangıç tarihi.
- `event_date`: türüne göre tescil, muayene, rapor, fatura veya diğer belge tarihi.

Yeni istemci sigorta başlangıcını `start_date`, diğer türlerin olay tarihini `event_date` üzerinden
okur; normalize alan yoksa `issue_date` türüne göre deterministik fallback'tir. Sync trigger eski
istemcinin `issue_date` yazısını sigortada `start_date`, diğer türlerde `event_date` ile uyumlu tutar;
yeni RPC de legacy alanı aynı tür kuralıyla yazar. Eksik legacy metadata uydurulmaz ve yeni alanlar
başlangıçta nullable'dır.

Sigorta için `start_date <= expiry_date`, muayene için `event_date <= expiry_date` ilişkisi hem saf
uygulama doğrulamasında hem database constraint/RPC katmanında korunur. Diğer türlere ilgisiz bir
genel `issue_date` zorunluluğu uygulanmaz. Süre durumu persist edilmez; merkezi 30 günlük eşikle
`active`, `expiring_soon`, `expired` veya `no_expiry` olarak türetilir. Expired belge otomatik
silinmez.

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
kotası atomik rezervasyonla uygulanır. TASK-022 ekspertiz entegrasyonu ayrıca parent başına ortak
5 ek ve 15 MB sınırı uygular; TASK-023 aynı parent havuzunu `vehicle_document` için de kullanır.
Kamera, galeri ve dosya kaynakları ayrı kota değildir. Merkezi mobil
varsayılanlar `src/features/attachments/config/attachmentConfig.ts` içindedir.

Legacy nesne yolu korunur:

```text
<auth-user-id>/<vehicle-id>/<random-object-id>.<validated-extension>
```

Yeni parent-scoped nesne yolu:

```text
<auth-user-id>/<vehicle-id>/<parent-type>/<parent-id>/<random-attachment-id>.<validated-extension>
```

Upload Edge Function dosya boyutunu ve PDF/JPEG/PNG magic byte'larını doğrular; service-role ile kota
rezervasyonu alır, ancak Storage yüklemesini authenticated kullanıcı istemcisiyle yaparak `owner_id`
ve INSERT RLS kontrolünü korur. Path orijinal dosya adı veya PII içermez. SELECT/DELETE politikaları
ilk segmenti `auth.uid()` ve mevcut nesnenin `owner_id` değeriyle sınırlar; doğrudan UPDATE kapalıdır.
Dosya açma işlemi owner kontrolü sonrasında 60 saniyelik imzalı URL üretir. Cihazın original dosya
adı object path'e veya kalıcı metadata'ya taşınmaz; Edge Function kaynak/MIME üzerinden
`kamera-fotografi.jpg`, `galeri-fotografi.png` veya `belge.pdf` gibi genel, PII-free görünür ad
üretir.

`attachments` doğrudan authenticated write grant'i vermez. Metadata seçimi owner + vehicle RLS ile
sınırlıdır; parent-scoped reservation yalnız service role Edge Function tarafından çağrılır.
`save_expertise_report_with_attachments` ve `save_vehicle_document_with_attachments` authenticated
kullanıcının `auth.uid()` sahipliğini doğrular, parent ve final ek listesini tek transaction içinde
bağlar. Ekspertiz/belge silme trigger'ları metadata'yı kaldırıp Storage nesnelerini idempotent cleanup
queue'ya alır. Eski
`expertise_reports.attachment_path` satırları read-time mapper fallback'iyle açılabilir kalır; sahte
metadata migration'ı yapılmaz. Aynı fallback `vehicle_documents.attachment_path` için de geçerlidir.

## Migrasyon akışı

Migrasyonlar Supabase CLI’nin `migration new` komutuyla oluşturuldu:

1. `20260728092412_initial_schema.sql`
2. `20260728092414_storage_policies.sql`
3. `20260801111349_enforce_attachment_quotas_and_private_uploads.sql`
4. `20260810212244_historical_odometer_support.sql`
5. `20260810221647_maintenance_packages_foundation.sql`
6. `20260811102853_vehicle_taxonomy_normalized_colors.sql`
7. `20260811133756_feedback_stabilization_fuel_fields.sql`
8. `20260811134804_reminder_due_time.sql`
9. `20260811140844_body_condition_multiselect.sql`
10. `20260811144343_unified_attachment_foundation.sql`
11. `20260811153131_document_type_details.sql`

Yerel doğrulama için `npx supabase db reset`; uzak bağlı proje için `npx supabase db push`
kullanılır. Uzak çalıştırmadan önce proje referansı ve tarayıcı kimlik doğrulaması gerekir.
