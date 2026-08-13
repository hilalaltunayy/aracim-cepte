# Araç profil fotoğrafı ve mini galeri

## Amaç ve kapsam

Araç fotoğrafları, araç profilinin hafif görsel kimliğidir. Ana araç ekranı sakin kalır:
mevcut araç/3D görünümü fotoğraf yokken korunur; birincil fotoğraf varsa yalnız araç bağlamında
küçük bir önizleme kullanılır. Fotoğraflar yakıt, bakım, belge veya diğer kayıt ekranlarının
görsel bağımlılığı değildir.

## Plan ve kapasite

Merkezi entitlement katmanı tek kaynaktır:

| Plan | Yeni araç fotoğrafı limiti |
| --- | --- |
| Free | 1 |
| Premium | 5 |

Limit yalnız yeni yazımları sınırlar. Premium'dan Free'ye geçildiğinde mevcut fotoğraflar
silinmez, gizlenmez ve okunabilir kalır; yalnız yeni ekleme engellenir. Tek fotoğrafı değiştirmek,
net fotoğraf sayısını artırmadığı için mümkün kalır.

## Veri ve güvenlik

`vehicle_photos`, mevcut private `attachments` kaydına bağlanan küçük metadata tablosudur.
İlk kaydedilen fotoğraf birincildir. Birincil fotoğraf silinirse en düşük stabil sıralı kalan
fotoğraf birincil olur; son fotoğraf silinirse mevcut fotosuz görünüm geri döner.

Dosyalar `vehicle-attachments` private bucket'ında, PII içermeyen rastgele owner/vehicle/photo
segmentleriyle tutulur. Görüntüleme yalnız kısa ömürlü signed URL ile yapılır. Sunucu tarafındaki
rezervasyon fonksiyonu, doğrulanmış sahiplik, genel Storage kotası ve Free/Premium fotoğraf sayısını
aynı transaction/lock sınırında kontrol eder. İstemcinin plan veya limit göndermesi yetki vermez.

## Etkileşim ilkeleri

Mevcut araç kartındaki sabit oranlı küçük önizleme, odaklanmış tam ekran görüntüleyici ve
progressive-disclosure fotoğraf aksiyonları kullanılır. Araç seçicide yalnız hafif thumbnail
gösterilir. Hareket varsayılan platform modal geçişiyle sınırlıdır; galeri görünümü, büyük gridler,
dekoratif efektler veya kalıcı Premium görselleri eklenmez.

## Sonraki işler

TASK-031, plan tabanlı genel attachment ve OCR kullanım sayacı/enforcement'ını genişletebilir.
Remote Supabase'e uygulanmamış forward migration'lar, Android birleşik kabulünden önce tarih
sırasıyla deploy edilip doğrulanmalıdır.
