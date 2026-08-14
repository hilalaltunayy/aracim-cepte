# OCR ve attachment kullanım kotaları

Free: ayda 3 başarılı OCR, entity başına 5 attachment ve kullanıcı başına 25 MB logical Storage.
Premium: sırasıyla 30, 10 ve 100 MB'dır. OCR ayı UTC takvim ayıdır; cron veya cihaz saatiyle reset gerekmez.

OCR yalnız on-device motor okunabilir, boş olmayan metin ürettiğinde bir kez sayılır. Permission,
dosya, provider, boş metin, iptal veya teknik hata sıfır tüketir. Review panelini kapatmak ya da
formu kaydetmemek başarılı tanımayı geri almaz.

Attachment reservation'ları da server-side uygulanır. Vehicle gallery fotoğrafları kullanıcı toplam
Storage hesabına dahildir; ayrı Free 1 / Premium 5 fotoğraf kuralı devam eder. Tek Storage object bir
kez sayılır. Edge Function'in aldığı doğrulanmış byte sayısı Storage metadata ile eşleşmeden uploaded
durumuna geçmez.

OCR ve attachment kotaları reservation→commit/release akışıyla uygulanır. Dosya işleme, upload,
metadata veya teknik hata kalıcı count/byte hakkı tüketmez; başarılı silme Storage object temizlendikten
sonra alanı serbest bırakır. Replacement yeni dosya güvenle hazır olduktan sonra eski dosyayı temizler;
eski dosyanın byte'ı geçici olarak kalıcı kota borcu sayılmaz.

Plan düşüşü mevcut veri/fotoğraf/attachment silmez; yalnız yeni yazımlar yeni plan limitlerine göre
engellenir. Supabase proje kapasitesi ayrı bir operasyonel ölçüttür ve kullanıcı sayısı arttıkça
izlenmelidir. TASK-031 migration'ları remote'a henüz deploy edilmemiştir; backlog sırayla uygulanıp
remote kabul yapılmalıdır.
