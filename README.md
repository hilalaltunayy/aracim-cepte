# Aracım Cepte

Aracım Cepte; Türkiye’deki araç sahiplerinin yakıt, bakım, diğer masraf, hatırlatıcı,
gövde durumu, ekspertiz, not ve belgelerini tek araç odaklı bir arayüzde yönetmesini sağlayan
Expo tabanlı mobil MVP’dir. Veri modeli ve repository katmanı birden fazla aracı destekleyecek
şekilde tasarlanmıştır.

## Teknoloji

- Expo SDK 57, React Native 0.86, React 19 ve strict TypeScript
- Expo Router
- Supabase Auth, Postgres, RLS ve özel Storage bucket
- Zustand ve AsyncStorage
- React Native StyleSheet, SVG ve Linear Gradient
- Expo Notifications, Image Picker ve Document Picker
- Vitest ve Expo ESLint

## Ön koşullar

- Node.js 20 veya üzeri (bu proje Node.js 24 ile doğrulandı)
- npm
- Fiziksel önizleme için güncel Expo Go
- Yerel Supabase için çalışan Docker Desktop
- Uzak kullanım için bir Supabase projesi

## Kurulum

```powershell
npm install
Copy-Item .env.example .env
```

`.env` içinde yalnızca mobil istemcide kullanılabilen proje değerlerini girin:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_LEGACY_ANON_KEY
```

`service_role`, secret key veya veritabanı parolasını mobil uygulamaya eklemeyin.

## Supabase kurulumu

Yerel geliştirme:

```powershell
npx supabase start
npx supabase db reset
npx supabase gen types typescript --local > src/data/supabase/database.types.ts
```

Uzak proje:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Tarayıcı girişi tamamlandıktan sonra `.env` değerlerini Dashboard’daki **Connect** ekranından
alın. Mobil uygulamada yayınlanabilir key veya eski anon key kullanılabilir; secret/service-role
key kullanılamaz.

## Geliştirme komutları

```powershell
npm run start:clear
npm run android
npm run web
npm run typecheck
npm run lint
npm test
npx expo-doctor
```

## Expo Go önizleme

1. Bilgisayar ve telefonun aynı Wi-Fi ağında olduğundan emin olun.
2. Proje kökünde `npm run start:clear` çalıştırın.
3. Android telefona Expo Go kurun ve terminalde görünen QR kodu Expo Go ile tarayın.
4. LAN erişimi engellenirse `npx expo start --tunnel` kullanın.

Yerel bildirimler Expo Go’da çalışır. Uzaktan push bildirimi bu MVP’nin kapsamında değildir.

## Web önizleme

```powershell
npm run web
```

Web önizleme hızlı görsel kontrol içindir. Sistem bildirimleri, dosya açma davranışları,
fotoğraf izinleri ve yerel cihaz entegrasyonları tarayıcıya göre farklılık gösterebilir; son
inceleme fiziksel Android cihazda yapılmalıdır.

## Prompt 3 QA ve release kontrolleri

```powershell
npm run test:coverage
npm run qa:remote:probe
npx supabase db query --linked --file supabase/tests/rls_negative.sql
npx expo export --platform web --output-dir .qa-export/web --clear
npx expo export --platform android --output-dir .qa-export/android --clear
```

Deterministik fixture ve authenticated remote CRUD komutları için
[QA seed belgesi](docs/qa-seed.md), parola dönüş URL’leri için
[Supabase Auth redirect belgesi](docs/supabase-auth-redirects.md), sayısal kurallar için
[hesaplama spesifikasyonu](docs/calculation-specification.md), manuel test için
[kabul listesi](docs/manual-acceptance-test.md) ve kalan riskler için
[release-readiness raporu](docs/release-readiness.md) kullanılmalıdır.

## Mimari özeti

Rota dosyaları `src/app` altında yalnızca ekran kompozisyonu yapar. Domain modelleri
`src/domain`, Supabase ve mapper’lar `src/data`, özellik mantığı `src/features`, ortak UI ve saf
hesaplamalar `src/shared`, oturum dışı istemci durumu `src/store` altındadır. Ayrıntılar için
[mimari belgesi](docs/architecture.md) ve [veritabanı belgesi](docs/database.md) dosyalarına bakın.

## Sorun giderme

- “Supabase bağlantısı henüz yapılandırılmadı”: `.env` dosyasını oluşturup Expo sunucusunu
  yeniden başlatın.
- Docker pipe/motor hatası: Docker Desktop’ı açın ve `docker version` komutunda Server sürümü
  görünene kadar bekleyin.
- Ağ hatası: telefon ve bilgisayarı aynı ağa alın veya Expo tunnel kullanın.
- Bildirim reddedildi: cihazın uygulama ayarlarından izni açın.
- Metro önbelleği: `npm run start:clear`.

Android paket adı ve iOS bundle identifier `com.hilalaltunay.aracimcepte` olarak ayarlandı.
Mağaza kaydından önce bu kimliğin küresel benzersizliği doğrulanmalıdır.
