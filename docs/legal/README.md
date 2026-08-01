# Aracım Cepte hukuk içeriği

> **HUKUK İNCELEMESİ BEKLİYOR**
> Bu klasördeki taslaklar hukuki görüş veya KVKK uyumluluğu kanıtı değildir. Profesyonel hukuk
> incelemesi ve gerçek production veri akışı doğrulaması tamamlanmadan nihai metin olarak
> yayımlanmamalıdır.

## Tek source-of-truth

Uygulamada gösterilen hukuk içeriğinin kanonik kaynakları şunlardır:

- [KVKK Aydınlatma Metni](kvkk-aydinlatma-metni.md)
- [Gizlilik Politikası](gizlilik-politikasi.md)
- [Kişisel Veri Saklama ve Silme Politikası](saklama-ve-silme-politikasi.md)
- [KVKK Başvuru, Hesap ve Veri Silme Metni](kvkk-basvuru-ve-hesap-silme.md)

[Açık rıza değerlendirme sınırları](explicit-consent-boundaries.md) tamamlayıcı ürün ve hukuk
rehberidir; kullanıcıya sunulan kanonik metinlerden biri değildir.

## Uygulama içeriği üretimi

`src/features/legal/generatedLegalContent.ts`, yukarıdaki dört Markdown kaynağından
`node scripts/generate-legal-content.mjs` komutuyla üretilir. Üretilen dosya elle düzenlenmez.
Kaynak metin değiştirildikten sonra üretim komutu çalıştırılır ve
`node scripts/generate-legal-content.mjs --check` ile güncellik doğrulanır.

Birleşik KVKK başvuru/hesap silme metni uygulamada iki ayrı görünüm olarak sunulur; iki görünüm de
aynı kanonik Markdown dosyasındaki ilgili bölümlerden üretilir.

## Yayın öncesi zorunlu kontroller

- Metinlerin profesyonel hukuk incelemesi
- Gerçek production sağlayıcı, alt işleyen ve yurt dışı aktarım mekanizması doğrulaması
- Saklama, yedek ve log sürelerinin gerçek ayarlarla kesinleştirilmesi
- Migration ve Edge Function production deploy kanıtı
- RLS/Storage negatif testleri ve hesap silme uçtan uca kanıtı
- Gerçek Android cihazda içerik, navigasyon ve erişilebilirlik kontrolü
- Planlanan hukuk sitesinin yayımlanması ve uygulama/store bağlantılarının doğrulanması

Bu maddeler tamamlanmadıkça release gate `Passed` yapılamaz.
