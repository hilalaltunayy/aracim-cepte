# TASK-019 — Interactive Sedan 3D Proof of Concept

**Status:** IMPLEMENTED — AWAITING ANDROID DEVICE ACCEPTANCE
**Owner:** Codex
**Created:** 2026-08-11
**Updated:** 2026-08-11

## Goal

Araç profilini 3D başarısına bağımlı hale getirmeden, yalnız normalize `sedan` araçlarda çalışan, TASK-018 rengini kullanan ve güvenli orbit/zoom etkileşimi sunan hafif bir 3D POC oluşturmak.

## Current state

- Expo SDK `57.0.9`, React Native `0.86.2`, React `19.2.3` ve Expo Router kullanılıyor.
- `react-native-gesture-handler ~2.32.0` ve root provider mevcut; Reanimated veya 3D/GL dependency yok.
- Araç profili `src/app/(tabs)/vehicle.tsx` içindeki mevcut kart/liste düzenidir.
- TASK-018 `vehicle.bodyType`, `vehicle.colorId` ve `getVehicleRenderColor()` sözleşmesini sağlıyor.
- Merkezi feature flag sistemi bulunmadı.
- Metro/Babel özel yapılandırması yok; procedural geometri seçildiği için GLB asset extension değişikliği gerekmiyor.

## Technology decision

- `expo-gl 57.0.2`: Expo SDK 57'nin resmi OpenGL ES render target'ı; native development/AAB rebuild gerekir.
- `@react-three/fiber 9.5.0`: React 19.2 desteği belgelenen sürüm; declarative Three.js lifecycle/disposal ve Native Canvas sağlar.
- `three 0.185.1` + `@types/three`: sahne, kamera, materyal ve düşük poligon procedural model.
- `expo-asset 57.0.8` ve `expo-file-system 57.0.1`: R3F Native'in açık peer gereksinimleri; runtime dış asset/network kullanılmayacak.

Ham `expo-gl` shader/mesh yönetimi, native crash yüzeyi ve manuel cleanup yükü nedeniyle; Skia/WebView ise ek native ağırlık ve bu POC için daha yüksek bakım maliyeti nedeniyle seçilmedi. Harici GLB/texture/CDN kullanılmayacak.

## Scope

- [x] Merkezi `vehicle3dEnabled` feature flag ve tek 3D config.
- [x] Sedan-only lazy renderer seçimi; unsupported/disabled/error fallback.
- [x] Procedural, markasız, düşük poligon Sedan; TASK-018 material color.
- [x] Sürekli yatay 360 orbit, clamp edilmiş dikey orbit ve pinch zoom.
- [x] Demand-based render, local transient refs, cleanup ve AppState pause güvenliği.
- [x] Mevcut araç ekranına bounded, erişilebilir ve temalı viewport entegrasyonu.
- [x] Hedefli pure logic, component, lazy-gating ve repeated mount/unmount testleri.

## Out of scope

- Diğer gövde tipleri, gerçek marka/model, GLB/texture, hasar panel seçimi, animasyon, HDR/shadow/post-processing, Supabase/migration, 3D tercih persistence, OCR/AI/premium/trips ve release build.

## Acceptance criteria

- [x] Flag kapalı veya gövde `sedan` değilse Canvas/modül initialize olmaz.
- [x] Sedan için lazy 3D yol seçilir; hata yalnız viewport fallback'ine düşer.
- [x] Yatay açı normalize edilir; dikey açı ve zoom merkezi limitlerde clamp edilir.
- [x] Diagonal pan iki açıyı birlikte değiştirir; pinch zoom güvenli sınırlardadır.
- [x] Render interaction React/Zustand/Supabase/AsyncStorage write üretmez.
- [x] Model TASK-018 `getVehicleRenderColor(vehicle.colorId)` değerini kullanır.
- [x] Araç profili, renderer/model/GL hatasında kullanılabilir kalır.
- [x] Renderer application startup'ta yüklenmez; yalnız uygun viewport mountunda lazy load olur.
- [x] Unmount sonrası gesture callbacks/resource referansları bırakılmaz; repeated mount testleri geçer.

## Security/privacy impact

- Yeni kullanıcı verisi, ağ isteği, analytics/log payloadı veya database alanı yoktur.
- Model bundled procedural kaynak olup marka, PII, dış URL veya üçüncü taraf asset içermez.
- Renderer hataları kullanıcıya teknik detay göstermez ve secret/PII loglamaz.

## Relevant files

- `src/features/vehicle3d/`: feature flag, config, orbit domain, wrapper, scene ve fallback.
- `src/app/(tabs)/vehicle.tsx`: bounded araç profili entegrasyonu.
- `src/features/vehicles/config/vehicleColors.ts`: mevcut render-color contract.
- `package.json`, `package-lock.json`: yalnız seçilen 3D stack dependency'leri.
- `docs/product/vehicle-3d-poc.md`: teknoloji, lifecycle, rollback ve Android kabul notu.

## Implementation steps

1. Expo uyumlu dependency sürümlerini exact/SDK-compatible kur.
2. Feature flag, camera/orbit/zoom config ve saf clamp/normalize helperlarını oluştur.
3. Procedural Sedan sahnesini demand render, minimal ışık ve materyal rengiyle uygula.
4. Gesture Handler pan/pinch olaylarını renderer refs'ine lokal bağla; ekran dışı gesture'ları etkileme.
5. Lazy wrapper, region error boundary, loading/unsupported/disabled fallback ve mevcut araç ekranı entegrasyonunu ekle.
6. Hedefli test, Expo Android production bundle/config, diff/dependency/security kontrollerini çalıştır.

## Validation commands

```powershell
npx vitest run <TASK-019 targeted files>
npx eslint <changed files>
npx tsc --noEmit
npx expo export:embed --eager --platform android --dev false
npx expo-doctor
git diff --check
```

## Manual checks

Fiziksel Android cihazda orbit/zoom, 10–20 giriş-çıkış, background/resume, farklı GPU'lar, gesture/scroll çatışması, tema, unsupported/flag-off ve diğer ekran responsiveness kontrolleri Pending kalacaktır.

## Rollback strategy

Önce merkezi `vehicle3dEnabled` false yapılarak runtime tamamen nötrlenir. Tam rollback feature commit/merge revert'i ve eklenen beş dependency'nin kaldırılmasıdır. Database veya araç verisi rollback'i yoktur.

## Do not change

- `main`, release branch/tag, Supabase/schema/RLS, auth, maintenance, fuel/expense, reminder, document, OCR/AI/premium/trips, app version/release credentials ve Play Console.

## Completion report

### Completed

- Dört hedefli test dosyasında 14/14 test geçti.
- Değişen TypeScript kaynaklarında yeni type error yok; hedefli ESLint geçti.
- Android production Metro export 2.140 modülle başarılı oldu.
- `npm ci --dry-run --include=optional` lockfile uyumunu doğruladı.

### Skipped

- EAS/native development build, Play/production submit, Supabase ve broad test suite çalıştırılmadı.

### Failed

- Full `tsc --noEmit`, TASK-019 dosyalarında hata vermedi ancak daha önceden var olan auth/legal
  render test type hataları nedeniyle process exit `1` kaldı.
- Expo Doctor 19/20 geçti; mevcut projenin dokuz Expo SDK 57 patch paketi son patch
  beklentisinin gerisinde. Kapsam dışı toplu upgrade yapılmadı.

### Manual verification required

- Fiziksel Android GPU, orbit/zoom, gesture-scroll, 10–20 remount, background/resume ve tema kabulü Pending.

## Human acceptance result

**Result:** NOT REVIEWED
**Reviewed by:** —
**Date:** —
**Notes:** Fiziksel Android GPU/performance kabulü bekleniyor.
