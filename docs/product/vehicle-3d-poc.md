# Sedan 3D POC

## Karar ve kapsam

TASK-019, yalnız normalize `bodyType = sedan` araçlar için hafif bir etkileşimli 3D kanıt
çalışmasıdır. Araç profili veya kalıcı araç verisi bu görünüme bağlı değildir. Diğer gövde
tipleri, üreticiye özgü modeller, hasar paneli seçimi ve gerçekçi model asset'leri bu kapsamda
değildir.

Render katmanı Expo SDK 57 uyumlu `expo-gl`, `@react-three/fiber/native` ve `three` kullanır.
Sedan, `src/features/vehicle3d/Sedan3DScene.tsx` içinde procedural ve markasız geometriyle
üretilir. Harici GLB, texture, ağ kaynağı veya lisanslı üretici varlığı yoktur.

## Runtime mimarisi

- Merkezi flag: `src/shared/config/featureFlags.ts` içindeki `vehicle3dEnabled`.
- Sedan kapısı: flag açık ve gövde tipi tam olarak `sedan` ise lazy renderer yüklenir.
- Renk: `vehicle.colorId` doğrudan TASK-018 `getVehicleRenderColor()` sözleşmesine verilir;
  bilinmeyen renk mevcut nötr fallback'i kullanır ve persisted veri değişmez.
- Fallback: desteklenmeyen gövde tipi ve render hatası küçük, teknik olmayan viewport
  mesajlarıdır. Araç ekranı kullanılabilir kalır.
- Loading: yalnız 3D alanında gösterilir; araç ekranını bloke etmez.
- Flag kapalıyken region `null` döner; dynamic import çağrılmaz ve GL context kurulmaz.

## Kamera ve etkileşim

Tüm sayısal sınırlar `src/features/vehicle3d/config.ts` içindedir:

- yatay başlangıç: `32°`, sürekli ve `0–360°` aralığına normalize;
- dikey başlangıç: `18°`, clamp: `-12°…72°`;
- kamera mesafesi: başlangıç `6.2`, pinch clamp: `4.2…8.4`;
- pan hassasiyeti: yatay `0.42`, dikey `0.32` derece/piksel.

Pan yatay ve dikey orbit'i aynı anda güncellediği için diagonal sürükleme doğaldır. Pinch
zoom uygulanır. Etkileşim yalnız bounded viewport içindedir; ekranın geri kalanı mevcut
ScrollView davranışını korur.

## Performans ve lifecycle

- `frameloop="demand"`: statik araç için sürekli animation/render loop yoktur.
- Kamera/orbit değerleri React veya Zustand state'i yerine renderer-local ref'lerde tutulur.
- Gesture başına yalnız kamera mutasyonu ve `invalidate()` vardır; Supabase, network,
  AsyncStorage veya persisted store write yoktur.
- Sahne yalnız basit box/cylinder geometrileri, iki yönlü ve bir ambient light kullanır;
  shadow, HDR, post-processing, texture ve animasyon yoktur.
- App active olduğunda tek redraw istenir. AppState listener'ları unmount'ta kaldırılır.
- React Three Fiber declarative sahne kaynaklarını unmount'ta dispose eder; controller referansı
  ayrıca temizlenir.

## Build ve boyut etkisi

`expo-gl` native kod içerdiği için POC'yi gerçek release/dev client'ta denemek yeni bir Android
build gerektirir. TASK-019 EAS build başlatmaz. Procedural modelin ayrı dosya asset boyutu `0 bayt`,
texture boyutu `0 bayt` ve yaklaşık geometri karmaşıklığı 500 üçgenden azdır. Asıl paket
etkisi Three.js/R3F/Expo GL dependency'lerinden gelir ve completion raporunda ölçülür.

## Android kabul kontrol listesi

Aşağıdakiler gerçek bir Android artifact ve fiziksel cihaz olmadan `Passed` sayılmaz:

1. Araç profilini aç; ekran donmadan 3D viewport yüklensin.
2. Yatay sürükle; tam 360 derece orbit ile ön/arka/iki yan/diagonal görünsün.
3. Dikey ve diagonal sürükle; üst ve alçak açılar çalışsın, kamera ters dönmesin.
4. Pinch yap; zoom limitlerde kalsın ve kamera aracın içine girmesin.
5. Araç rengi TASK-018 seçimiyle eşleşsin; bilinmeyen renk crash oluşturmasın.
6. Araç ekranından çık/gir işlemini 10–20 kez tekrarla; crash veya artan lag olmasın.
7. Sonrasında yakıt/bakım/diğer sekmelerini aç; uygulama responsive kalsın.
8. Uygulamayı background'a al ve geri dön; sahne güvenle yeniden çizilsin.
9. Android üç tuş ve gesture navigation ile viewport/scroll çatışması olmasın.
10. Açık ve koyu temada container, araç ve fallback okunabilir olsun.
11. Sedan dışı gövde tipi sakin fallback göstersin.
12. Feature flag kapatıldığında 3D alanı/renderer yüklenmesin.
13. Legacy/eksik body type veya color verisi araç profilini bozmasın.
14. Düşük/orta seviye Android GPU'da belirgin takılma, ısınma veya context kaybı olmasın.

## Rollback

Hızlı runtime rollback için `vehicle3dEnabled` değeri `false` yapılır. Tam rollback için
TASK-019 merge commit'i revert edilir ve eklenen 3D dependency'leri package/lockfile'dan kaldırılır.
Database migration veya araç verisi rollback'i yoktur.
