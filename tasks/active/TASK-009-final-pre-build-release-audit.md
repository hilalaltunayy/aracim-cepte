# TASK-009 — Final preview APK öncesi release denetimi

**Status:** AUDIT COMPLETE — READY FOR PREVIEW APK BUILD
**Owner:** Codex
**Created:** 2026-08-01
**Updated:** 2026-08-01

## Task ID

TASK-009

## Title

Preview APK build'i öncesi repository, Supabase deploy, release gate ve aktif görev tutarlılığı denetimi.

## Goal

Yeni preview APK build'i başlatılmadan önce yalnız güncel repository ve read-only remote kanıtıyla
teknik build engeli olup olmadığını belirlemek; Android kabulü ile Play Store production
blocker'larını birbirinden ayırmak.

## User problem

TASK-001–TASK-008 farklı zamanlarda kod, tema, akış, güvenlik ve deploy kanıtı üretti. Yeni bir APK
almadan önce Git, otomatik test, Supabase deploy ve açık görev durumlarının tek güncel kararda
uzlaştırılması gerekiyor.

## Current behavior

- TASK-001, TASK-005, TASK-007 ve TASK-008 gerçek Android cihaz kabulü bekliyor.
- Production release gate; hukuk, web URL'leri, mağaza, gerçek cihaz ve provider-log kontrollerini açık
  tutuyor.
- Preview APK kararı production Play Store readiness iddiası değildir.

## Desired behavior

Audit sonunda yalnız `READY FOR PREVIEW APK BUILD` veya `BLOCKED` kararı verilir. Karar; güncel komut
çıktıları, read-only Supabase envanteri, kaynak güvenlik taraması ve görev/release belgesi
tutarlılığına dayanır.

## Scope

- [x] `main`/`origin/main`, worktree ve TASK-008 commit doğrulaması.
- [x] TypeScript, lint, Vitest, Expo Doctor ve diff kontrolleri.
- [x] Pending migration ve gerekli ACTIVE Edge Function envanteri.
- [x] Client secret/service-role, hard-coded tema rengi ve public Storage URL/bucket taraması.
- [x] TASK-001–TASK-008 ile V1 release belgelerinin tutarlılık denetimi.
- [x] Preview APK ve Play Store production blocker'larının ayrı kararı.

## Out of scope

- Uygulama kodu, runtime davranışı, UI veya yeni özellik değişikliği.
- Migration/Edge Function deploy, remote E2E, database reset veya gerçek kullanıcı verisi işlemi.
- Expo/EAS build, APK/AAB üretimi veya Play Console işlemi.

## Acceptance criteria

- [x] Bütün zorunlu otomatik komutların güncel sonucu kaydedilir; başarısız sonuç Passed sayılmaz.
- [x] Local/remote migration listesi ve gerekli function durumları read-only doğrulanır.
- [x] Secret/public Storage/theme taraması dosya ve kanıt düzeyinde sonuçlandırılır.
- [x] Aktif görevlerin gerçek bekleme durumu ve belge çelişkileri açıkça kaydedilir.
- [x] Hukuk/web eksikleri preview ve production açısından ayrı sınıflandırılır.
- [x] Yalnız iki izinli karardan biri verilir; production-ready iddiası kurulmaz.

## Security/privacy requirements

- Secret değerleri, token, connection string, signed URL, object path veya PII çıktıya yazılmaz.
- Supabase kontrolleri read-only kalır; remote veri ve yapılandırma değiştirilmez.
- Kaynak taraması placeholder/publishable client config ile gerçek secret'ı ayırır.

## Relevant screenshots or evidence

- Yeni APK üretilmediği için runtime ekran kanıtı yoktur: `AWAITING ANDROID DEVICE EVIDENCE`.

## Relevant files

- `AGENTS.md`, `PLANS.md`
- `tasks/active/TASK-001-*.md`–`TASK-008-*.md`
- `docs/product/v1-scope.md`, `docs/release/v1-release-gates.md`
- `docs/release-readiness.md`, `docs/project-status.md`
- `src/shared/theme/**`, `src/data/supabase/**`, `supabase/**`, `app.json`, `eas.json`

## Execution plan

### Goal

Güncel ve tekrar üretilebilir kanıtla preview APK build kapısını değerlendirip production kapılarından
ayrı, tek bir karar vermek.

### Background

TASK-007 kaynak audit kusurlarını, TASK-008 cross-system consistency risklerini uyguladı. İkisi de
Android kabulü bekliyor; TASK-002/003/004 hukuk ve production güvenlik kapılarını ayrıca açık tutuyor.

### Current state

Denetim tamamlandı. `main` ve `origin/main` TASK-008 SHA'sında eşleşti; audit başlamadan kalan tracked
değişiklik yoktu ve yalnız bu TASK/release belgesi oluşturuldu. Yerel kapılar geçti; linked Supabase
ref'i doğrulandı, local/remote migration farkı ve inactive gerekli function bulunmadı.

### Scope

Bu dosyanın `Scope` bölümü bağlayıcıdır.

### Out of scope

Bu dosyanın `Out of scope` ve `Do not change` bölümleri bağlayıcıdır.

### Risks

- Tarihsel belgeler güncel deploy ile çelişebilir: güncel Git/CLI envanteri öncelenir, belge farkı
  açıkça raporlanır.
- Source scan false positive üretebilir: yalnız dosya/secret türü raporlanır, değer yazılmaz.
- Otomatik test native sonucu kanıtlayamaz: Android maddeleri manuel kapı olarak bırakılır.

### Security/privacy impact

Salt-okunur source ve deploy envanteri yapılır. Secret, kullanıcı verisi, Auth, RLS, Storage ve
remote runtime değiştirilmez.

### Relevant files

Task'ın `Relevant files` bölümü ve doğrudan release/test konfigürasyonu.

### Implementation steps

1. **Completed:** AGENTS, plan standardı, V1 release belgeleri ve TASK-001–TASK-008'i oku.
2. **Completed:** Git, otomatik doğrulama ve read-only Supabase envanterini çalıştır.
3. **Completed:** Secret, tema, public Storage ve kesin blocker kaynak taramasını yap.
4. **Completed:** Görev/release/hukuk-web tutarlılığını sınıflandır.
5. **Completed:** Audit kanıtını, tek kararı ve completion report'u yaz; diff'i gözden geçir.
6. **Completed:** Yalnız audit dokümanı değişikliklerini commit/push et.

### Validation commands

```powershell
git status --short --branch
git rev-parse HEAD
git rev-parse origin/main
npm run typecheck
npm run lint
npm test
npx expo-doctor
npx supabase migration list
npx supabase functions list
git diff --check
```

Remote E2E, database reset, migration/function deploy ve Expo/EAS build çalıştırılmaz.

### Manual checks

- Yeni preview APK üzerinde TASK-001, TASK-005, TASK-007 ve TASK-008 Android kabul listeleri.
- Auth e-posta/deep-link, notification lifecycle, picker/upload, navigation/safe-area, light/dark ve
  TalkBack kontrolleri.

### Rollback strategy

Yalnız audit belgesi eklenir/güncellenir; gerekirse ayrı revert commit'i kullanılabilir. Veri veya
remote rollback gerektiren işlem yapılmaz.

### Expected output

Tek preview kararı, geçen/başarısız kontroller, kesin blocker'lar, Android manuel listesi ve kullanıcıya
sunulacak build komutu.

### Do not change

`src/**`, `supabase/migrations/**`, Edge Function kaynak/deploy durumu, package/lockfile, Expo/EAS/
Android config, `.env*`, remote proje veya kullanıcı verisi.

### Completion report

#### Completed

- `main` ve `origin/main` `9a59547327a919c1a2a3693f0949d5e5b7662f89` SHA'sında eşleşti;
  TASK-008 commit'i mevcut ve audit dışı worktree değişikliği yoktu.
- `npm run typecheck`, `npm run lint`, `npm test` (28 dosya/127 test), `npx expo-doctor` (20/20) ve
  `git diff --check` geçti.
- Linked project ref `eiqxvvnqkbzbhzpthcwo`; 10 migration local/remote eşleşiyor, pending migration
  yok. `upload-attachment` v3, `delete-account` v1 ve `reconcile-attachments` v3 `ACTIVE`.
- Remote bucket `public=false`, `5242880` byte ve yalnız PDF/JPEG/PNG allow-list'iyle doğrulandı.
- Client kaynaklarında service-role/secret veya public Storage URL yok. Tracked credential taramasının
  tek isim eşleşmesi server QA scriptindeki dosyaya yazılmaması gereken environment değişkeni adıdır;
  credential değeri değildir ve client bundle kapsamında değildir.
- Theme token dosyası dışında `src/**/*.ts(x)` runtime hex/rgb/black/white literal'i bulunmadı.
- Preview EAS environment'ında gerekli iki public Supabase değişkeninin ad düzeyinde varlığı,
  değerleri gösterilmeden doğrulandı.
- TASK-001, TASK-005, TASK-007 ve TASK-008'in Android kabulü beklediği doğrulandı.
- Sonuç: **READY FOR PREVIEW APK BUILD**. Bu sonuç production Play Store kabulü değildir.

#### Skipped

- Build, deploy, remote E2E ve database reset kapsam gereği çalıştırılmadı.
- Supabase Security Advisor bu turda yeniden çalıştırılmadı; TASK-008'de connector yetkisi reddedilmişti.
  Güncel migration/function/bucket envanteri ve geçmiş negatif E2E kanıtı yeniden E2E çalıştırılmadan
  read-only doğrulandı.

#### Failed

- Başarısız zorunlu otomatik kontrol veya kesin preview blocker yoktur.

#### Manual verification required

- Yeni preview APK üzerinde gerçek Android kabulü.
- TASK-001: kayıt completion/prefill, password hold, safe-area, typography ve picker mesajları.
- TASK-005: system/light/dark geçişi, persistence, splash/status/navigation bar ve kritik ekran kontrastı.
- TASK-007: offline/session, dirty form, notification tap, attachment retry, resend ve TalkBack.
- TASK-008: reminder notification reconciliation, kesintili upload/retry, silme ve CRUD/restart regresyonu.

## Task ve dokümantasyon tutarlılığı

- TASK-001, TASK-005, TASK-007 ve TASK-008 durumları gerçek Android kabulünü açıkça bekliyor ve güncel
  kaynak/deploy kanıtıyla uyumludur.
- TASK-005 ve TASK-007 execution planlarında commit/push adımı hâlâ `In progress`; TASK-004 Scope'ta
  commit/push checkbox'ı açık görünür. İlgili completion report'ları ve Git geçmişi işin tamamlandığını
  kanıtlar. Bunlar tarihsel görev içi bookkeeping drift'idir, preview build blocker'ı değildir.
- TASK-002'nin bazı gelecekteki teknik checkbox'ları TASK-004/TASK-008 remote kanıtına rağmen açık
  kalmıştır. Güncel teknik kaynak `TASK-008` ve release gate; hukuk/device/production kararları gerçekten
  açıktır.
- `docs/project-status.md` remote bağlantı ve hesap silme konusunda tarihsel/stale bilgi içerir;
  `docs/release-readiness.md` kendisini tarihsel snapshot olarak işaretler. Güncel karar bu TASK ve
  `docs/release/v1-release-gates.md` üzerinden verilmiştir.

## Hukuk ve web ayrımı

- Planlanan subdomain, gizlilik politikası ve hesap silme URL'leri 2026-08-01 read-only HTTP
  kontrolünde erişilebilir yanıt vermedi.
- Kanonik metinler `HUKUK İNCELEMESİ BEKLİYOR`; Supabase Frankfurt/yurt dışı aktarımı ve alt işleyen
  incelemesi açıktır.
- Bunlar **preview APK build blocker'ı değildir**; Google Play production release blocker'ıdır.

## Final decision

**READY FOR PREVIEW APK BUILD**

Kod/deploy tarafında preview APK üretimine kesin engel bulunmadı. Kalan teknik kabul maddeleri yeni
APK üzerinde gerçek Android cihaz testidir. Production Play Store yayını hazır değildir.

Onay sonrasında çalıştırılacak komut:

```powershell
npx --yes eas-cli@latest build --platform android --profile preview
```

## Commands to run

Execution plan `Validation commands` bölümü geçerlidir.

## Expected outputs

- İzin verilen iki karardan biri ve kanıt özeti.

## Manual device checks

Execution plan `Manual checks` bölümü bağlayıcıdır.

## Do not change

Execution plan `Do not change` bölümü bağlayıcıdır.

## Completion checklist

- [x] Talimatlar, görevler ve release belgeleri okundu.
- [x] Zorunlu otomatik doğrulamalar çalıştırıldı.
- [x] Read-only Supabase ve security/privacy taraması tamamlandı.
- [x] Görev/release/hukuk ayrımı tutarlı biçimde kaydedildi.
- [x] Diff gözden geçirildi.
- [x] Completed/skipped/failed/manual kontroller ayrı raporlandı.

## Review checklist

- [x] Uygulama kodu, migration, function veya remote durum değişmedi.
- [x] Preview kararı production readiness iddiası oluşturmuyor.
- [x] Başarısız veya manuel kontrol Passed sayılmadı.
- [x] Kesin blocker varsa dosya/kanıtla listelendi.

## Human acceptance result

**Result:** READY FOR PREVIEW APK BUILD — ANDROID ACCEPTANCE PENDING
**Reviewed by:** Codex repository/read-only deploy audit
**Date:** 2026-08-01
**Notes:** Production Play Store readiness verilmedi; build bu görevde başlatılmadı.
