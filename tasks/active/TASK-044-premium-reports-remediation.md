# TASK-044 — Premium Reports remediation

Kaynak: `premium-reports-remediation-01-with-references/premium-reports-remediation-01.md`.
Kapsam kasıtlı olarak dardır: yalnız Raporlar ekranı + Raporlar/Belgeler dışa aktarma yüzeyleri.

## Goal

Rapor hesaplarının dönem doğruluğunu kanıtla, seçili dönemi kalıcı kıl, Raporlar ekranını
kart yığınından grafik-öncelikli editoryal bir deneyime dönüştür (light + dark), ve dışa
aktarma aksiyonlarını görünür yap.

## Audit (Phase A — tamamlandı)

### Veri akışı
- `src/app/reports.tsx` → `VehicleReportsScreen` → `useDataStore()` (`records`, `vehicles`,
  `activeVehicleId`, ...). Kayıtlar aktif araç için tek seferde `appRepository.loadVehicleData`
  ile yüklenir; store `activeVehicleId` + load-sequence guard (`canApplyVehicleData`) ile
  çapraz-araç bulaşmasını önler.
- **Tek kanonik hesap:** `src/features/reports/domain/vehicleReports.ts` →
  `buildVehicleReport(records, vehicle, periodId, anchor?)` → `VehicleReport`.
- Ekran `report`'u `useMemo((records, vehicle, periodId))` ile üretir.
- **PDF zaten aynı kaynağı kullanıyor:** `buildVehicleReportDocument({..., report})` verilen
  `report`'u reuse eder (`vehicleReportDocument.ts:151`). Ekran `report`'u geçiriyor
  (`VehicleReportsScreen.tsx:214`). UI ↔ PDF sayı tutarlılığı hâlihazırda sağlanıyor.

### Dönem mantığı — `getReportPeriod`
- `last_month` = **önceki tam takvim ayı** (offset -1, end = bu ayın 0. günü). DOĞRU.
- `six_months` (varsayılan) = bu ay + önceki 5 ay (offset -5, 6 bucket). DOĞRU.
- `three_months` = bu ay + önceki 2 ay. DOĞRU. (`vehicleIntelligence` de bunu kullanır.)
- `inRange`: `recordDate >= start && recordDate <= end`, date-only string, kapsayıcı. Sınırlar
  doğru.
- Bulgular:
  - `end` = bu takvim ayının sonu (bugün değil) → bu ayın ileri-tarihli kaydı toplamlara sızar.
  - `last_month`/`month` = 1 bucket → `hasTrend` her zaman false → tek-aylık dönemde **hiç trend
    grafiği yok** (MD 5.2.C haftalık gruplama istiyor).
  - `distance()` yalnız dönem-içi odometre okur; dönem öncesi baseline yok (MD 3.5).
  - Sınır (ilk/son gün, hemen önce/sonra) testi yok (MD 3.6 zorunlu kılıyor).

### Kalıcılık
- `useDataStore` zustand `persist` + `partialize` → yalnız `activeVehicleId`, `onboardingSeen`.
  Storage `createSafeStringStorage(AsyncStorage)`, anahtar `aracim-cepte-preferences`.
- **`periodId` = `useState('six_months')` — kalıcı değil, her mount'ta sıfırlanıyor.**

### Grafik / tema
- `react-native-svg@15.15.4` mevcut. `ReportCharts.tsx`: `DonutChart`, `TrendChart`,
  `BarChart`, `GrowingBar` (native-safe: sayısal proplar, path string, Pressable overlay).
  Yalnız `VehicleReportsScreen` import ediyor.
- **Chart renk token'ı yok**; ekran `colors.primaryAction/aqua/warning` kullanıyor.
- Font: yalnız Inter (`@expo-google-fonts/inter`), `_layout.tsx`'te `useFonts`. Serif yok.

### PDF / dışa aktarma motoru — MEVCUT
- `src/features/reports/pdf/`: `vehicleReportDocument.ts` (saf model, `report` reuse),
  `vehicleReportHtml.ts` (print HTML), `vehicleReportPdf.ts` (enjekte edilebilir gateway ile
  orkestrasyon), `expoReportPdfGateway.ts` (expo-print + expo-sharing). Commit `a37e536`.
- Ekranda büyük bir "PDF araç raporu" Card'ı zaten bu akışı kanonik `report` ile çağırıyor.

### Belgeler dışa aktarma — MEVCUT
- Ek başına "Cihaza indir": `UnifiedAttachmentField` `onDownloadAttachment` →
  `downloadPersistedAttachment` → signed URL → cache → paylaşım sheet. Commit `3ebc65e`.
  `documents/edit.tsx` vb.'de bağlı. **Belgeler LİSTE ekranında yok.**

## Scope

1. `vehicleReports.ts`: tek `ResolvedPeriod` çözümü, half-open interval, tek-aylık dönemde
   haftalık bucket, `distance` dönem-öncesi baseline, `end`-bugün sınırı, kısmi bucket işareti.
   Kapsamlı sınır testleri. `VehicleReport` geriye uyumlu (sadece alan ekleme).
2. `dataStore`: `reportPeriodId` state + partialize + `setReportPeriod` action + doğrulama.
   Ekran store'dan okur (mount-time default yok, flicker yok).
3. Tema: `tokens.ts` chart paleti (light + dark), opsiyonel editoryal serif (`Lora`) —
   yalnız temiz kurulum + bundle doğrulaması geçerse.
4. `VehicleReportsScreen.tsx` + `ReportCharts.tsx`: grafik-öncelikli editoryal yeniden tasarım.
   Ekran testini yeniden yaz.
5. Dışa aktarma: header'da paylaş ikonu (büyük Card yerine); `DocumentCard` opsiyonel indirme +
   `documents/index.tsx` bağlama.

## Out of scope

MD §11: Home, paywall tasarımı, abonelik fiyat/ürün, RevenueCat purchase/restore/webhook,
araç detay, bakım/yakıt formları, onboarding, tema sistemi refactor, state kütüphanesi
değişimi, Supabase şema (rapor doğruluğunu bloke eden dar bir düzeltme dışında).

## Acceptance

MD §13 tüm maddeleri. Öne çıkanlar: `last_month` yalnız önceki tam ay; tüm bölümler + PDF aynı
çözülmüş aralık; Fuel+Maintenance+Other=Total; sınır tarihleri test edilir; boş veri ≠ hata;
seçili dönem navigasyon/restart sonrası korunur; kart yığını kaldırılır; palet mavi-ötesi;
light+dark çalışır; dışa aktarma görünür + kanonik hesabı kullanır.

## Rollback

Her faz ayrı commit; `git revert` yeterli. Migration / remote mutasyon yok. Serif eklenirse
revert bağımlılığı da geri alır.
