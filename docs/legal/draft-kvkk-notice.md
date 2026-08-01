# KVKK Aydınlatma Metni taslağı

> **HUKUK İNCELEMESİ BEKLİYOR**  
> Bu metin hukuki görüş, yayımlanmış nihai aydınlatma metni veya KVKK uyumluluğu iddiası değildir.
> Uygulamadaki taslak ekranla birlikte profesyonel hukukçu tarafından gözden geçirilmelidir.

## Metnin niteliği

Bu belge veri işleme hakkında bilgilendirme taslağıdır; açık rıza beyanı değildir. Hesap oluşturma
ekranında genel “kişisel verilerimin işlenmesine açık rıza veriyorum” kutusu kullanılmaz. Hukuki
dayanaklar, veri sorumlusu kimliği/iletişimi ve ilgili kişi başvuru kanalı hukuk incelemesiyle
kesinleştirilmeden production metni olarak yayımlanamaz.

## Taslak kapsam

- Hesap/e-posta ve isteğe bağlı ad bilgisi.
- Araç, plaka/VIN girilmişse benzersiz araç verisi ve kilometre geçmişi.
- Yakıt, bakım, diğer gider ve hatırlatıcı kayıtları.
- Kullanıcının isteğe bağlı yüklediği, yüksek hassasiyetli veri içerebilen araç belgeleri.
- Güvenlik, kota, silme ve hata yönetimi için içeriksiz teknik metadata.

Amaçlar hesap işletimi, kayıtların saklanması, hatırlatıcı sunumu, güvenlik, destek ve kullanıcının
silme taleplerini yerine getirmekle sınırlandırılmak üzere tasarlanmıştır. Pazarlama, OCR/AI ve
isteğe bağlı hassas belge analizi temel amaçlara dahil değildir.

## Açık kalan hukuki alanlar

- Veri sorumlusu kimliği ve başvuru iletişim kanalı.
- Her veri kategorisinin hukuki dayanağı.
- Supabase Frankfurt, Resend ve alt işleyenler için yurt dışına aktarım değerlendirmesi.
- Kategori bazında saklama, silme, backup ve log süreleri.
- İlgili kişi talep prosedürü ve veri ihlali bildirim değerlendirmesi.

Bu alanlar [KVKK readiness](../security/kvkk-readiness.md) ve
[release kapılarında](../release/v1-release-gates.md) `Not started`/açık blocker kalır.
