# Premium Reports V1

TASK-032, aktif aracın mevcut owner-scoped kayıtlarından deterministik bir Premium rapor üretir.
Raporlar yeni bir veri kopyası, üçüncü taraf analytics sağlayıcısı veya backend aggregation katmanı
oluşturmaz; `advancedReports` entitlement'ı fail-closed biçimde Free kullanıcıya kilitli durum sunar.

## Mobile design decision

Mevcut Aracım Cepte aqua/turkuaz kart ve tipografi sistemi korunur. Web/desktop referanslarından yalnız
tek güçlü KPI, tek sakin zaman serisi ve anlamlı maliyet dağılımı ilkeleri alınmıştır; sidebar, yoğun
grid, Tailwind/shadcn veya ayrı Premium teması alınmamıştır. Ekran dikey progressive disclosure ile
önce kayıtlı maliyet, sonra trend, dağılım, yakıt/verimlilik ve bakım özetini gösterir.

Grafik sözlüğü bilinçli olarak iki yüzeyle sınırlıdır: dönemsel toplamlar için SVG line/soft-area trendi,
kategoriler için yatay oran çubukları. İlk ekranda sürekli animasyon yoktur; mevcut kısa ekran geçişi
dışında hareket bilgiye erişimi geciktirmez.

## Data-quality rules

- Yalnız seçili dönem ve aktif araç kayıtları hesaba katılır; başka aracın kaydı rapora giremez.
- `recorded vehicle cost`, yakıt/bakım/diğer mevcut kayıtlardır; kaydedilmemiş vergi, sigorta veya
  başka maliyetler tahmin edilmez.
- Mesafe, km başı maliyet ve tüketim en az iki tutarlı, tarih sıralı bilinen kilometre gerektirir.
  TASK-016 tarihsel düşük kilometre kaydı varsa türetilmiş mesafe bilinmiyor olarak kalır.
- Litre, önceki dönem tabanı veya veri noktası yeterli değilse `0` yerine açıklayıcı boş durum gösterilir.

Bu ekran Home tasarımını değiştirmez. Gelecekteki AI özelliği bu deterministik özetleri AI olarak
etiketlemeden yanında kullanabilir.
