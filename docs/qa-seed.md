# Deterministik QA seed sistemi

Seed sistemi yalnızca açık terminal komutuyla çalışır; uygulama başlangıcında veya
production build’de otomatik çalışmaz.

## Güvenlik kuralları

- Yalnızca ayrılmış, e-postası doğrulanmış QA hesabı kullanın.
- Gerçek kullanıcı hesabına seed çalıştırmayın.
- `QA_TEST_PASSWORD` değerini `.env`, kaynak kodu veya dokümana yazmayın.
- Script service-role/secret key kullanmaz; public key + QA kullanıcısının normal
  oturumu ve RLS ile çalışır.
- `QA_SEED_CONFIRM=ARACIM_CEPTE_QA` tam onayı olmadan script başlamaz.
- Tüm görünür fixture verileri `[QA]` veya `[QA İzolasyon]` etiketlidir.

## PowerShell kullanımı

```powershell
cd "C:\Users\Hilal Yeşim\Desktop\AracimCepte"
$env:QA_TEST_EMAIL="qa-hesabi@example.com"
$env:QA_TEST_PASSWORD="terminalde-girilen-gercek-qa-sifresi"
$env:QA_SEED_CONFIRM="ARACIM_CEPTE_QA"
npm run qa:seed
Remove-Item Env:QA_TEST_PASSWORD
```

Script sabit UUID’leri `upsert` eder. Aynı QA hesabında tekrar çalıştırmak
idempotenttir ve değiştirilmiş fixture satırlarını bilinen değerlere geri getirir.

## Fixture kapsamı

- Ana araç: 2018 Kia Sportage, SUV/crossover, 89.200 km.
- İkincil izolasyon aracı: Toyota Corolla `[QA İzolasyon]`.
- Kasım 2025–Temmuz 2026 arasında 16 ana araç kaydı.
- Mart 2026 boş ay.
- Ondalıklı tutar ve litreler.
- Kilometreli ve kilometresiz kayıtlar; artan kilometre dizisi.
- 9 ana hatırlatıcı: gecikmiş, bugün, 30 gün, uzak gelecek, km gecikmiş,
  1.000 km içinde, planlı, tarih+km, tamamlanmış.
- 6 gövde durumu ve seçili parça notları.
- 2 ekspertiz raporu, 2 araç notu.
- Geçerli, yaklaşan, süresi dolmuş ve süresiz 4 belge.
- Her entity türünde ikinci araca ait en az bir izolasyon satırı.

## Beklenen istatistikler

Beklenen değerler `docs/calculation-specification.md` belgesinde ve
`qa/seed-fixture.json` içindeki `expected` alanında tek kaynaktan izlenebilir.

## Authenticated remote CRUD scripti

Bu script fixture’dan bağımsız geçici bir araç oluşturur; kayıt, hatırlatıcı,
gövde, ekspertiz, not, belge ve Storage CRUD işlemlerini çalıştırıp `finally`
bloğunda temizler.

```powershell
$env:QA_TEST_EMAIL="qa-hesabi@example.com"
$env:QA_TEST_PASSWORD="terminalde-girilen-gercek-qa-sifresi"
$env:QA_REMOTE_CONFIRM="ARACIM_CEPTE_REMOTE_QA"
npm run qa:remote
Remove-Item Env:QA_TEST_PASSWORD
```

Gerçek bir password-reset e-postasını bu koşuda ayrıca göndermek için:

```powershell
$env:QA_SEND_RESET="true"
npm run qa:remote
```

Mailbox erişimi gerektiren link açma ve şifre değiştirme adımı
`docs/manual-acceptance-test.md` ile manuel tamamlanır.
