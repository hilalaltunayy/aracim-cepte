# Ayrı açık rıza değerlendirmesi gerektirebilecek işlemler

> **HUKUK İNCELEMESİ BEKLİYOR**  
> Bu belge belirli bir işlem için açık rızanın kesin hukuki dayanak olduğunu söylemez. Uygulanabilir
> dayanak ve aktarım mekanizması profesyonel hukukçu tarafından işlem bazında belirlenmelidir.

## Temel ayrım

KVKK aydınlatma metni kullanıcıyı veri işleme hakkında bilgilendirir; açık rıza değildir. Genel,
paketlenmiş veya hizmet için zorunluymuş gibi sunulan “kişisel verilerimin işlenmesine açık rıza
veriyorum” kutusu kullanılmaz. Açık rıza gerektiğine hukuk incelemesiyle karar verilen bir işlem,
temel hizmetten ayrılabilen, belirli, bilgilendirilmiş, geri alınabilir ve varsayılan olarak seçilmemiş
bir kontrolle sunulmalıdır.

## Yurt dışına veri aktarımı

- Supabase Frankfurt, control-plane/backup/support akışları, Resend ve alt işleyenlerin ülkeleri gerçek
  data-flow ile doğrulanır.
- Uygulanabilir aktarım mekanizması ve açık rıza gerekip gerekmediği hukukçu tarafından belirlenir.
- Açık rıza seçilirse aktarım ülkeleri/sağlayıcıları, veri kategorileri, amaç, risk ve geri alma etkisi
  ayrı sunulur; aydınlatma metnine gömülmez.

## Gelecekte OCR/AI sağlayıcısına belge gönderimi

- V1'de belge OCR/AI sağlayıcısına gönderilmez.
- Gelecekte her gönderim öncesi provider, ülke, saklama/training ayarı, çıkarılacak alanlar ve yanlış
  sonuç riski açıklanır.
- Kullanıcı onayı olmayan belge otomatik gönderilmez; rıza/diğer dayanak kararı provider ve işlem
  özelinde hukuk incelemesi ister.

## Pazarlama ve ticari elektronik ileti

- Şifre sıfırlama, doğrulama ve güvenlik bildirimi gibi zorunlu işlem e-postaları pazarlama izniyle
  birleştirilmez.
- Pazarlama/ticari elektronik ileti tercihi ayrı, isteğe bağlı, varsayılan boş ve geri alınabilir olur;
  uygulanabilir elektronik ileti kuralları ayrıca hukuk incelemesinden geçer.
- Pazarlama izni verilmemesi temel hizmeti engellemez.

## İsteğe bağlı hassas belge analizi

- Kaza, sigorta, ruhsat veya hukuki belge analizi yüksek hassasiyetli ve üçüncü kişi verisi içerebilir.
- Analiz varsayılan kapalıdır; belge/amaç/çıktı saklama süresi ve sağlayıcı ayrı açıklanır.
- Kullanıcı analizi reddedebilir veya geri alabilir; temel belge saklama işlevi bundan bağımsız kalır.

## Uygulama öncesi acceptance criteria

- [ ] Hukukçu işlem bazında dayanak ve rıza gereksinimini kaydetti.
- [ ] Rıza aydınlatma metninden, Terms ve pazarlama izninden ayrı sunuldu.
- [ ] Checkbox/toggle varsayılan seçili değil ve granular.
- [ ] Rıza kaydı metin sürümü, zaman, işlem amacı ve geri alma durumunu PII minimizasyonuyla tutuyor.
- [ ] Reddetme/geri alma temel hizmeti gereksiz biçimde engellemiyor.
- [ ] Provider aktarımı ve retention rıza geri alındığında duruyor veya hukuki istisna açıklanıyor.
