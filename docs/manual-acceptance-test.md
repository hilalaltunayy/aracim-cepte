# Manuel kabul testi

Test tarihi/anchor: `2026-07-15`. Gerçek cihaz testi için ayrılmış, e-postası
doğrulanmış bir QA hesabı kullanın. Gerçek kullanıcı hesabına seed çalıştırmayın.

## Hazırlık

- [ ] Supabase Dashboard redirect URL’lerini `docs/supabase-auth-redirects.md` belgesine göre ekleyin.
- [ ] Ayrılmış QA hesabını oluşturup e-postasını doğrulayın.
- [ ] Terminalde QA değişkenlerini yalnızca oturumluk tanımlayın.
- [ ] `npm run qa:seed` çalıştırın.
- [ ] Uygulamayı `npx expo start --web --clear --port 8082` ile açın.
- [ ] `[QA]` ve `[QA İzolasyon]` etiketli iki aracın yalnızca bu QA hesabında olduğunu doğrulayın.

## Kayıt, doğrulama, giriş ve oturum

- [ ] Yeni bir e-posta ile hesap oluşturun.
- [ ] Doğrulama e-postasının geldiğini ve linkin hesabı doğruladığını kontrol edin.
- [ ] Doğrulama öncesi giriş reddediliyorsa Türkçe mesajı kontrol edin.
- [ ] Doğrulama sonrası giriş yapın.
- [ ] Uygulamayı kapatıp açın; oturum geri yüklenmeli.
- [ ] Çıkış yapın; korumalı ekranlar girişe dönmeli.
- [ ] Hatalı e-posta, zayıf şifre ve eşleşmeyen şifre tekrarını deneyin.
- [ ] Kaydet butonuna art arda dokunun; tek kayıt oluşmalı.

## Parola kurtarma

- [ ] “Şifremi unuttum” ekranından QA e-postasına link gönderin.
- [ ] Web linki `/auth/reset-password` ekranını açmalı; ana sayfaya gitmemeli.
- [ ] Expo Go’da e-posta linki aynı özel ekrana açılmalı.
- [ ] Development build’de `aracimcepte://auth/reset-password` çalışmalı.
- [ ] “Yeni şifre” ve “Yeni şifre tekrar” alanlarının görünürlük butonlarını deneyin.
- [ ] 7 karakter, 73 karakter ve eşleşmeyen şifre reddedilmeli.
- [ ] Geçerli şifre güncellenmeli ve giriş ekranına dönmeli.
- [ ] Eski şifre reddedilmeli; yeni şifre kabul edilmeli.
- [ ] Aynı link ikinci kez açıldığında güvenli Türkçe hata gösterilmeli.
- [ ] Eksik, bozuk ve süresi geçmiş linkler yeni link isteme CTA’sı göstermeli.
- [ ] Normal oturumla doğrudan reset rotası açıldığında yeni parola formu etkinleşmemeli.

## Araçlar ve izolasyon

- [ ] Kia Sportage `[QA]` bilgilerini açın: 2018, SUV/crossover, 89.200 km.
- [ ] Marka/model/yıl/renk düzenleyip kaydedin ve geri açarak kalıcılığı kontrol edin.
- [ ] Negatif km, geçersiz yıl, boş/yalnız boşluk marka-model reddedilmeli.
- [ ] 90.000 km’lik kayıt ekleyin; araç km’si yükselmeli.
- [ ] Daha düşük km’li geçmiş kayıt ekleyin; araç güncel km’si düşmemeli.
- [ ] `npm test` içindeki fixture izolasyon testinin her entity türünde iki aracı
      ayrı tuttuğunu kontrol edin; public UI ikinci araç seçimi sunmamalı.
- [ ] Public MVP hesabında QA seed dışında ikinci araç oluşturma yolunun sunulmadığını doğrulayın.

## Kayıtlar ve dashboard

- [ ] Yakıt kaydında `100,50` ve `2,75` değerlerini kaydedin.
- [ ] Noktalı ondalık girdiyi deneyin.
- [ ] Sıfır/negatif tutar, negatif km, geçersiz tarih reddedilmeli.
- [ ] Yakıt, bakım ve diğer gider kayıtlarını oluşturun.
- [ ] Geçmiş filtrelerinde tür ve tarih sırasını kontrol edin.
- [ ] Bir kaydı düzenleyin, türünü ve ayını değiştirin; dashboard yeniden hesaplanmalı.
- [ ] Kaydı silin; listeden ve tüm türetilmiş istatistiklerden çıkmalı.
- [ ] Ağ bağlantısını kayıt sırasında kesin; güvenli Türkçe hata ve yeniden deneme davranışını kontrol edin.

Seed ile beklenen dashboard:

- [ ] Cari ay yakıt: `₺4.156,00`
- [ ] Cari ay bakım: `₺3.250,75`
- [ ] Cari ay diğer: `₺645,25`
- [ ] Cari ay toplam: `₺8.052,00`
- [ ] Önceki ay: `₺2.500,00`
- [ ] Değişim: `%222,08 artış`
- [ ] Altı ay: `2.000 / 0 / 6.000 / 2.100,25 / 2.500 / 8.052`
- [ ] Toplam yakıt: `353,75 L`
- [ ] Tüm zamanlar: `₺27.552,35`
- [ ] Tür payları: `%55,92 / %37,39 / %6,69`
- [ ] Maliyet: `₺3,15/km`

## Hatırlatıcılar ve bildirim

- [ ] Gecikmiş tarih, bugün, 30 gün içinde ve uzak gelecek durumlarını karşılaştırın.
- [ ] 89.000 km gecikmiş, 90.000 km yaklaşan ve 93.000 km planlı olmalı.
- [ ] Hem tarih hem km içeren kayıtta daha acil durum kazanmalı.
- [ ] Tamamlanmış kayıt ayrı durumda görünmeli.
- [ ] Tarih veya kilometreden en az biri zorunlu olmalı.
- [ ] Bildirim iznini reddedin; kayıt yine kaydolmalı, uygulama çökmemeli.
- [ ] İzin verildiğinde gelecekteki tarih için yerel bildirimi cihaz ayarlarında kontrol edin.

## Gövde, ekspertiz ve notlar

- [ ] Altı gövde durumunun tümü farklı parçalarda görünmeli.
- [ ] Seçili parça ve not kaydedildikten sonra ekranı yeniden açınca kalmalı.
- [ ] Gövde tipinde bulunmayan part key kaydedilememeli.
- [ ] İki ekspertiz raporunu açın, düzenleyin ve birini silin.
- [ ] Not oluşturun, uzun metni kaydırın, düzenleyin ve silin.
- [ ] Silinmiş entity URL’sini tekrar açın; yeni kayıt formu yerine “artık erişilebilir değil” mesajı gelmeli.

## Belgeler ve Storage

- [ ] Geçerli, 30 gün içinde bitecek, süresi dolmuş ve süresiz belge durumlarını kontrol edin.
- [ ] Düzenlenme tarihinden önce bitiş tarihi reddedilmeli.
- [ ] PNG, JPG/JPEG ve PDF yükleyin; WebP'nin güvenli Türkçe mesajla reddedildiğini doğrulayın.
- [ ] 4,9 MB ve tam 5 MB izinli dosyaları yükleyin; 5 MB üzerindeki dosyanın reddedildiğini doğrulayın.
- [ ] 10 belge sınırını ve 25 MB toplam sınırını ayrı fixture hesaplarda doğrulayın; 11. belge ve limiti
      aşan byte reddedilmeli.
- [ ] Uzantısı izinli fakat içeriği farklı/spoof edilmiş dosyanın reddedildiğini doğrulayın.
- [ ] İptal edilen picker hiçbir değişiklik yapmamalı.
- [ ] Başarısız yükleme kayıt formunu korumalı ve güvenli hata göstermeli.
- [ ] Eki açın; imzalı URL çalışmalı.
- [ ] İmzalı URL süresi dolduktan sonra tekrar açılmamalı.
- [ ] Public bucket URL’si erişimi reddetmeli.
- [ ] Eki silin; eski imzalı URL ve liste erişimi başarısız olmalı.
- [ ] İkinci QA kullanıcısı ilk kullanıcının path'ini list/read/signed URL/update/delete edememeli.

## Navigasyon, klavye ve platform farkları

- [ ] Tüm detay ekranlarında Android ve iOS görünür geri butonu çalışmalı.
- [ ] iOS swipe-back mevcut kalmalı.
- [ ] Alt tab bar detay/modal ekranlarında yanlış görünmemeli.
- [ ] Küçük ekranda klavye açıkken son alan ve Kaydet butonuna kaydırılabilmeli.
- [ ] Web tarih alanları native HTML date input kullanmalı.
- [ ] iOS/Android tarih seçicileri gerçek cihazda ayrı ayrı test edilmeli.
- [ ] Web push/local notification davranışının native ile aynı olmadığı kabul edilmeli.

## Veri silme ve son kontrol

- [ ] Bölüm temizleme aksiyonlarını yalnız QA fixture verisinde deneyin.
- [ ] Araç silmenin alt kayıtları ve ekleri temizlediğini doğrulayın.
- [ ] Hesap silmenin kullanıcıya ait tüm Storage nesnelerini ve veritabanı kayıtlarını kaldırdığını,
      session'ı kapattığını ve eski signed URL'yi geçersiz bıraktığını doğrulayın.
- [ ] Kayıt ekranındaki KVKK Aydınlatma Metni ve Gizlilik Politikası bağlantıları uygulama içinde
      açılmalı; ikisi de `HUKUK İNCELEMESİ BEKLİYOR` ibaresini göstermeli ve aydınlatma açık rıza gibi
      sunulmamalı.
- [ ] Çıkış sonrası başka kullanıcı verisi cache üzerinden görünmemeli.
- [ ] Uygulamayı yeniden başlatıp oturum ve aktif araç geri yüklemesini kontrol edin.
