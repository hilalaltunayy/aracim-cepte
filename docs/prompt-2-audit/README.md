# Prompt 2 tasarım ve işlev denetimi

## Kapsam

Aracım Cepte mobil akışında dashboard, hatırlatıcı formu, belge tarih alanları,
araç düzenleme navigasyonu, alt sekmeler ve gövde durumu ekranı incelendi.

## Başlangıç bulguları

1. Dashboard'da 390 px mobil genişlikte hero ve yatay kart grupları sıkışıyordu.
2. Başlıklar ve veri değerleri gereğinden sert ağırlıktaydı.
3. Form alanları tek bir uzun akış gibi görünüyordu; bölüm hiyerarşisi zayıftı.
4. Web tarih alanı takvim kontrolü oluşturmuyordu.
5. Gövde durumu görseli bağlantısız dikdörtgenlerden oluşuyordu.
6. Doğrudan açılan detay rotalarında kayıt sonrası geri dönüş güvenilir değildi.

## Uygulanan kararlar

- Inter tabanlı merkezi tipografi ölçeği ve daha hafif renk/gölge sistemi.
- Formlar için açıklamalı, beyaz kart grupları ve tutarlı CTA düzeni.
- Web'de gerçek `input[type="date"]`; native'de Expo uyumlu tarih seçici.
- Her detay rotasında görünür, erişilebilir geri düğmesi ve güvenli fallback rotası.
- Gövde tipine göre değişen, tekerlek/cam/ayna detayları olan etkileşimli üstten araç silueti.
- Kart ve satırlarda basma geri bildirimi ile daha açık erişilebilir etiketler.

## Görsel kaynak

Araç siluetinin üstten görünüş oranları için Butterflytronics'in
["Car top transport vehicle"](https://icon-icons.com/icon/car-top-transport-vehicle/123457)
çalışması görsel referans olarak kullanıldı. Kaynak CC BY 4.0 lisanslıdır.
