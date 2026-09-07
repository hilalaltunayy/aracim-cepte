# Premium Reports V1

TASK-032, aktif aracın mevcut owner-scoped kayıtlarından deterministik bir Premium rapor üretir.
Raporlar yeni bir veri kopyası, üçüncü taraf analytics sağlayıcısı veya backend aggregation katmanı
oluşturmaz; `advancedReports` entitlement'ı fail-closed biçimde Free kullanıcıya kilitli durum sunar.

## Mobile design decision

Ekran, kart yığını yerine tek bir editoryal rapor olarak okunur (TASK-044). Bölümler ince ayraç
çizgileriyle ayrılır; yalnız grafik tuvalleri hafif bir yüzey kullanabilir. Başlık figürleri ve bölüm
başlıkları editoryal serif aksanı (`Lora`) kullanır, gövde metni Inter kalır.

Grafik paleti tek maviye bağlı değildir: `colors.chart` token'ı yakıt = mavi, bakım = deniz yeşili,
diğer = sıcak amber rollerini taşır ve light/dark için ayrı tanımlıdır. Grafik sözlüğü:

- **Maliyet eğilimi:** yuvarlak uçlu dikey sütunlar; her sütun o dönemi domine eden kategoriye göre
  renklenir, boş dönem hayalet çubuk olur, içinde bulunulan tamamlanmamış aralık çapraz tarama ile
  işaretlenir. Tek-aylık dönemlerde sütunlar haftalıktır, daha uzun dönemlerde aylık.
- **Harcama dağılımı:** kategori paletli donut + etiket/tutar/yüzde taşıyan lejant.
- **Yakıt/verimlilik ve bakım:** veri destekliyorsa küçük bir sütun şeridi, ardından tipografik
  KPI satırları (etiket sol, değer sağ, aralarında ince çizgi) — kutu yok.
- **Karşılaştırma:** yatay kategori çubukları, aktif araç vurgulu.

Hareket kısa reveal/entrance ile sınırlıdır; süreklilik gösteren timer yoktur.

## TASK-032B completion

- Seçili araç için mevcut store verisi kullanılır; Premium çoklu araç karşılaştırması ise en fazla iki
  ek sahip olunan araç için repository üzerinden ayrı owner-scoped okuma yapar. Sonuçlar araç bazında
  kayıtlı maliyet, yakıt, bakım, mesafe ve km maliyetini karşılaştırır.
- Ana maliyet trendine ek olarak yakıt ve bakım harcaması için ayrı, seçili döneme bağlı trend yüzeyleri
  vardır. Kaydedilmiş istasyon ve bakım kalemi verisi varsa oran çubuklarıyla gösterilir.
- Grafikler soldan sağa reveal, oran çubukları sıfırdan giriş ve dönem değişimi tek seferlik
  fade/transition kullanır. Tüm grafik bucket'ları dönem uzunluğuyla sınırlıdır; süreklilik gösteren
  timer veya loop yoktur. (TASK-044'te KPI count-up kaldırıldı; büyük figürler serif tipografi ile
  verilir.)

## Dönem çözümü (TASK-044)

`resolvePeriod(id, anchor)` tek yetkili yorumdur; ekran hero'su, trend, dağılım, yakıt/verimlilik ve
PDF dışa aktarma aynı çözülmüş aralığı kullanır. Aralıklar half-open date-only string'lerdir
(`startInclusive <= recordDate < endExclusive`) ve üst sınır "yarın"da (anchor + 1 gün) kapatılır —
ileri tarihli kayıt toplamı şişiremez, içinde bulunulan ay/hafta gerçek bir kısmi aralıktır.

- `last_month` = **önceki tam takvim ayı**.
- `six_months` (varsayılan) = içinde bulunulan ay dahil önceki 5 ay.
- `three_months` / `month` / `year` da aynı "bu dönem + öncesi" mantığıyla.
- Karşılaştırma, hemen önceki eşdeğer uzunluktaki pencereye göredir.

Seçili dönem `aracim-cepte-preferences` store'unda stabil bir id olarak kalıcıdır; geçersiz/eski bir
değer `sanitizeStoredReportPeriod` ile ürün varsayılanına düşer.

## Data-quality rules

- Yalnız seçili dönem ve aktif araç kayıtları hesaba katılır; başka aracın kaydı rapora giremez.
- `recorded vehicle cost`, yakıt/bakım/diğer mevcut kayıtlardır; kaydedilmemiş vergi, sigorta veya
  başka maliyetler tahmin edilmez.
- Mesafe, dönem içinde iki veya daha fazla tutarlı odometre okuması varsa aralık içinde ölçülür;
  yalnız tek okuma varsa dönem öncesi son okuma başlangıç noktası olarak kullanılır (parasal tutarı
  hesaba girmez). Tarihsel düşük kilometre veya yetersiz okuma varsa türetilmiş mesafe bilinmiyor
  kalır.
- Litre, önceki dönem tabanı veya veri noktası yeterli değilse `0` yerine açıklayıcı boş durum
  gösterilir. Boş veri ile backend hatası ayrı ele alınır.

## Dışa aktarma

Rapor ekranı başlığında görünür bir paylaş ikonu, mevcut PDF motorunu (`vehicleReportPdf` +
`expoReportPdfGateway`, expo-print/expo-sharing) değiştirmeden çağırır ve ekranın gösterdiği kanonik
`VehicleReport`'u geçer; PDF farklı sayı gösteremez. Aksiyon entitlement'ı yeniden doğrular, Free
kullanıcıyı paywall'a yönlendirir, hatada satır içi banner gösterir ve tekrar tekrar dokunmada iş
yığmaz. Belgeler listesinde her belge kartı, saklı tek dosyayı mevcut `downloadPersistedAttachment`
akışıyla cihaza indirir.

Bu ekran Home tasarımını değiştirmez. Gelecekteki AI özelliği bu deterministik özetleri AI olarak
etiketlemeden yanında kullanabilir.
