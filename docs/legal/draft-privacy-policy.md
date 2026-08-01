# Gizlilik Politikası taslağı

> **HUKUK İNCELEMESİ BEKLİYOR**  
> Bu taslak production için yayımlanmış politika değildir ve hukuki uyumluluk iddiası oluşturmaz.

## Taslak teknik taahhütler

- Araç kayıtları ve belgeler authenticated kullanıcıya/owner'a özel tutulur.
- Belge bucket'ı private kalır; public URL kullanılmaz.
- Ücretsiz kullanıcı sınırı 10 belge, toplam 25 MB ve dosya başına 5 MB'dır.
- Yalnız PDF, JPG/JPEG ve PNG kabul edilir.
- Object path orijinal dosya adı/PII içermez; random object ID kullanır.
- Dosya erişimi kısa süreli signed URL ile sağlanır.
- Dosya içeriği, signed URL, access token, filename, plaka/VIN veya e-posta loglanmaz.
- Belge ve hesap silmede ilişkili Storage object'leri kaldırılır.

## Açık kalan politika alanları

Nihai politika; veri sorumlusu, işleme amaçları/dayanakları, sağlayıcı/alt işleyenler, yurt dışına
aktarım, saklama süreleri, backup/log davranışı, ilgili kişi başvuru kanalı, değişiklik bildirimi ve
incident iletişimini profesyonel hukuk incelemesiyle tamamlamalıdır.

Belge OCR/AI sağlayıcısına gönderilmez. Gelecekte böyle bir özellik önerilirse ayrı privacy/security
tasarımı, açık kullanıcı aksiyonu ve [açık rıza sınırları](explicit-consent-boundaries.md) değerlendirmesi
gerektirir.
