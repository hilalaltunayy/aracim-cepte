# TASK-012 — Dashboard aylık özet ve küçük UI düzenlemeleri

**Status:** IMPLEMENTED — AWAITING FINAL MINI APK VERIFICATION
**Owner:** Codex
**Created:** 2026-08-02
**Updated:** 2026-08-02

## Task ID

TASK-012

## Title

Dashboard aylık özetini doğrula ve dar ekran UI ayrıntılarını düzelt.

## Goal

Android APK geri bildirimindeki dört dar kapsamlı dashboard/gövde görünümü sorununu çalışan V1
akışlarını değiştirmeden gidermek.

## User problem

Kullanıcı geçmişte bakım ve diğer kayıtları gördüğü halde yeni takvim ayının kartlarında sıfır
görmüş; altı aylık özet açıklaması dar ekranda sıkışmış; free sürümde boş premium kart kalmış ve
gövde diyagramı yönlendirme etiketi sağ kenara fazla yaklaşmıştır.

## Current behavior and root-cause evidence

- `vehicle_records.record_type` enum'u `fuel | maintenance | expense` değerlerini kullanır;
  `databaseMappers.ts` ve `getRecordTypeTotals` bu alanları bire bir taşır. Bakım/diğer mapping
  kusuru bulunmadı.
- İlk kritik mantık noktası `src/app/(tabs)/index.tsx` içindeki dashboard hesaplarıdır. History tüm
  kayıtları gösterirken `getCurrentMonthRecordTypeTotals` yalnız cihazın geçerli `YYYY-MM`
  dönemini alır. 1–2 Ağustos APK geri bildiriminde Temmuz çubuğu/önceki kayıtlar görünürken yeni
  ay kartlarının sıfır olması bu zaman penceresi farkından kaynaklanır; önceki ay verisi “Bu ay”
  kartlarına eklenmemelidir.
- Aynı ekranda current totals, altı aylık seri ve karşılaştırma ayrı örtük `new Date()` çağrılarıyla
  anchor alıyordu. Ay sınırında teorik ayrışmayı kaldırmak için tek `dashboardAnchor` kullanılır.
- `MiniBarChart` caption'ında daralma sınırı; `BodyDiagram` pill'inde esnek genişlik sınırı yoktu.
- `Yaklaşık maliyet` kartı free dashboard'da koşulsuz render ediliyordu.

## Desired behavior

- Aynı takvim ayındaki `maintenance` ve `expense` kayıtları doğru kartlara toplanır; yakıt korunur.
- Dashboard hesapları aynı zaman referansını kullanır.
- Altı aylık açıklama dar ekranda kendi alanında dengeli biçimde sarılabilir.
- Free sürümde `Yaklaşık maliyet` kartı ve boşluğu render edilmez.
- `Parçaya dokunun` pill'i sınırlı, ortalanmış ve dar ekrana uyumlu kalır.

## Scope

- [x] Dashboard tek-anchor aylık hesap bağlantısı ve odaklı render kanıtı.
- [x] Mini chart dar ekran caption düzeni.
- [x] Free premium maliyet kartının kaldırılması.
- [x] Gövde diyagramı yönlendirme pill hizası.
- [x] Değişen davranışlara özel testler.

## Out of scope

- Route, auth, reminder, notification, offline/startup, tema, veri modeli veya backend değişikliği.
- Supabase schema/migration/RLS/Edge Function/deploy, remote E2E ve EAS build.
- Önceki ay kayıtlarını “Bu ay” toplamına dahil etmek veya premium sistemi tasarlamak.

## Acceptance criteria

- [x] Ağustos tarihli fuel/maintenance/expense fixture'ları sırasıyla Yakıt/Bakım/Diğer kartlarında.
- [x] Aynı fixture altı aylık serinin Ağustos toplamıyla uyumlu.
- [x] Altı aylık caption `flexShrink` ve sınırlı genişlikle güvenli sarılır.
- [x] `Yaklaşık maliyet` free dashboard render çıktısında yoktur.
- [x] Gövde pill'i sınırlı genişlik, shrink ve ortalanmış metin kullanır; render throw etmez.
- [x] TypeScript, lint, hedefli Vitest ve `git diff --check` geçer.

## Security/privacy requirements

Yalnız yerel hesaplama ve stil değişikliği vardır. RLS, Storage, secret, PII, loglama ve kullanıcı
verisine dokunulmaz; test verileri sentetiktir.

## Relevant screenshots or evidence

- 1–2 Ağustos 2026 Android APK manuel geri bildirimi; ekran görüntüleri repository'ye eklenmedi.
- `docs/qa/v1-acceptance-test-matrix.md` A10-18 / A11 kanıt bağlamı.
- `qa/seed-fixture.json` tür ve takvim ayı hesaplama fixture'ı.

## Relevant files

- `src/app/(tabs)/index.tsx`: dashboard anchor ve free kart görünürlüğü.
- `src/shared/components/MiniBarChart.tsx`: altı aylık caption yerleşimi.
- `src/features/bodyCondition/BodyDiagram.tsx`: pill yerleşimi.
- `tests/routes/criticalRoutes.render.test.tsx`: gerçek dashboard render regresyonu.
- `src/shared/components/dashboardMiniPolish.render.test.tsx`: ortak UI layout smoke testleri.

## Commands to run

```powershell
npx vitest run tests/routes/criticalRoutes.render.test.tsx src/shared/components/dashboardMiniPolish.render.test.tsx src/shared/utils/analytics.prompt3.test.ts
npm run typecheck
npm run lint
git diff --check
```

## Expected outputs

- Hedefli testler, typecheck, lint ve whitespace kontrolü başarılı.
- Uygulama build'i veya remote işlem başlatılmaz.

## Manual device checks

- [ ] Dar Android ekranda üç aylık kart toplamını aynı ay tarihli gerçek kayıtlarla doğrula.
- [ ] Altı aylık caption'ın taşmadığını açık/koyu temada doğrula.
- [ ] Free dashboard'da premium maliyet kartı/boşluğu olmadığını doğrula.
- [ ] Gövde pill'inin üç tuşlu ve gesture navigation cihazlarında dengeli göründüğünü doğrula.

## Do not change

TASK isteğindeki route, file flow, Error Boundary, reminder/notification, theme, auth/resend,
offline/startup, body data model, Supabase ve kullanıcı verisi koruma listesi eksiksiz geçerlidir.

## Completion checklist

- [x] `AGENTS.md`, son commitler ve ilgili APK/QA kanıtları okundu.
- [x] Yalnız onaylı kapsam uygulandı.
- [x] Acceptance criteria kaynak ve hedefli testlerle kanıtlandı.
- [x] Otomatik doğrulamalar çalıştırıldı ve sonuçları aşağıya kaydedildi.
- [x] Diff ve security/privacy regresyon kontrolü tamamlandı.
- [x] Ekran görüntüleri repository'ye eklenmedi.

## Automated validation results

- Hedefli Vitest: **Passed** — 3 dosya, 44 test.
- `npm run typecheck`: **Passed**.
- `npm run lint`: **Passed**.
- `git diff --check`: **Passed**.
- Tam `npm test`, EAS build, Supabase ve remote E2E: kapsam gereği **Skipped**.

## Review checklist

- [x] Kapsam dışı değişiklik yoktur.
- [x] Test kanıtları güncel ve yeniden üretilebilirdir.
- [x] Yakıt, route ve diğer korunan davranışlarda regresyon yoktur.
- [x] İnsan Android kabul maddeleri Passed yapılmamıştır.

## Human acceptance result

**Result:** AWAITING FINAL MINI APK VERIFICATION
**Reviewed by:** —
**Date:** —
**Notes:** Yeni APK alınmadan gerçek cihaz maddeleri Passed değildir.
