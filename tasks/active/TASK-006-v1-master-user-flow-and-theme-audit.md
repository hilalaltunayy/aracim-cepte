# TASK-006 — V1 ana kullanıcı akışı ve tema denetimi

**Status:** AUDIT COMPLETE — AWAITING HUMAN TRIAGE AND ANDROID ACCEPTANCE
**Owner:** Codex
**Created:** 2026-08-01
**Updated:** 2026-08-01

## Task ID

TASK-006

## Title

V1 ekran, kullanıcı akışı, karar yolu ve açık/koyu tema kapsamının APK öncesi kaynak denetimi.

## Goal

Yeni APK alınmadan önce V1'in kullanıcıya açık bütün yüzeylerini ve ana karar yollarını repository
kanıtıyla envanterlemek; eksik, çelişkili, riskli ve yalnız Android cihazda doğrulanabilecek maddeleri
düzeltme yapmadan release kararına sunmak.

## User problem

Mevcut görevler belirli alanları doğruluyor ancak bütün ekranların, hata/boş/loading durumlarının,
uçtan uca kullanıcı işlemlerinin ve light/dark kapsamının tek güncel kabul matrisi bulunmuyor.

## Current behavior

- Expo Router altında 26 navigable route, iki layout dosyası ve beş ana tab bulunuyor.
- TASK-001 ve TASK-005 kod/otomasyon uygulamalarını tamamladı ancak yeni Android APK kabulü bekliyor.
- V1 release kapılarında auth, Android, hukuk ve mağaza kontrolleri açık.
- Güncel çalışan APK veya bu audit turunda çekilmiş light/dark ekran görüntüsü yoktur; görsel/runtime
  iddialar repository kaynaklarıyla sınırlıdır.

## Desired behavior

Dört QA belgesi; tam kaynak envanterini, ana kullanıcı akışlarını, kabul matrisini ve light/dark
denetimini aynı terimler, kanıt bağlantıları ve açık manuel test boşluklarıyla tanımlar.

## Scope

- [x] Route, ekran, form, modal, alert, eylem, link, picker ve UI state envanteri.
- [x] V1 ana kullanıcı akışlarının başarı/alternatif/hata/navigation/persistence/security denetimi.
- [x] Bütün kaynaklarda hard-coded renk ve theme-token bypass taraması.
- [x] Light/dark ortak bileşen, navigation, grafik, SVG, modal, splash ve native yüzey denetimi.
- [x] Repository kanıtlı acceptance matrisi ve Android manuel test adımları.
- [x] QA belgeleri için Markdown bağlantı, test ve diff doğrulaması.

## Out of scope

- Uygulama davranışı, UI, business logic veya test kodu değişikliği.
- Bulunan defect/risklerin düzeltilmesi.
- Expo/EAS build, APK/AAB, deploy, Supabase işlemi veya remote E2E.
- Eski APK ya da önceki ekran görüntülerinin güncel light/dark runtime kanıtı sayılması.

## Acceptance criteria

- [x] `docs/qa/v1-screen-inventory.md` bütün kaynak yüzeylerini sayılabilir kimliklerle listeler.
- [x] `docs/qa/v1-master-user-flow.md` istenen ana akışların her alanını ve uygun Mermaid şemalarını içerir.
- [x] `docs/qa/v1-acceptance-test-matrix.md` otomatik/repository/manüel kanıtı ve sonucu ayırır.
- [x] `docs/qa/v1-light-dark-theme-audit.md` bütün theme tüketicilerini ve hard-coded renkleri sınıflandırır.
- [x] Koddan doğrulanamayan hiçbir davranış Passed gösterilmez; `HUMAN DECISION REQUIRED` veya
      `MANUAL ANDROID CHECK REQUIRED` kullanılır.
- [x] Confirmed defect, possible risk, manuel Android ve APK öncesi zorunlu maddeler sayılır.
- [x] Yalnız dokümantasyon/task dosyaları değişir; build/deploy/Supabase çalıştırılmaz.

## Security/privacy requirements

- Gerçek kullanıcı verisi, credential, `.env` değeri veya eski ekran görüntüsündeki PII açılmaz.
- RLS/Storage/auth sonuçları yalnız güncel repository/release kanıtı kadar raporlanır.
- Cross-user erişim, raw hata, signed URL, silme ve session beklentileri acceptance matrisinde korunur.
- Bu audit KVKK uyumluluğu veya production readiness iddiası oluşturmaz.

## Relevant screenshots or evidence

- TASK-001 yedi Android görselinin redakte özetini içerir; görseller repository'de değildir.
- Bu turda build/uygulama çalıştırılmayacağı için yeni screenshot capture yapılamaz.
- Görsel, dokunma, native picker/alert, Android navigation ve splash sonuçları manuel kabul kapısıdır.

## Relevant files

- `src/app/**`: route ve ekran yüzeyleri.
- `src/shared/components/**`: ortak UI, picker, modal, loading/error/empty ve kartlar.
- `src/store/**`, `src/data/**`, `src/features/**`: kullanıcı eylemi, persistence ve hata yolları.
- `src/shared/theme/**`, `app.json`: light/dark token, provider, splash ve native tema ayarı.
- `docs/product/v1-scope.md`, `docs/release/v1-release-gates.md`: kapsam ve release sınıflandırması.
- `tasks/active/TASK-001-android-device-feedback-and-v1-polish.md` ve
  `tasks/active/TASK-005-app-theme-and-dark-mode.md`: bekleyen Android kabul kanıtı.

## Execution plan

### Goal

Kaynak kodu değiştirmeden V1 için yeniden üretilebilir, sayılabilir ve release öncesi karar vermeye
uygun kapsamlı QA audit paketi üretmek.

### Background

TASK-001 görünür Android polish sorunlarını, TASK-005 merkezi temayı uyguladı. İkisi de yeni APK
manuel kabulü bekliyor; release gates ayrıca auth, hukuk ve mağaza blocker'larını açık tutuyor.

### Current state

Repository `main` dalında temiz başladı. Çalışan uygulama veya yeni APK açılmayacak; denetim kaynak,
mevcut testler ve güncel repository belgeleriyle sınırlı olacak.

### Scope

Bu task'ın `Scope` bölümü bağlayıcıdır.

### Out of scope

Bu task'ın `Out of scope` ve `Do not change` bölümleri bağlayıcıdır.

### Risks

- Statik kaynak runtime/native sonucu kanıtlayamaz: ilgili satırlar manuel Android olarak işaretlenir.
- Eski belgeler güncel davranışla çelişebilir: güncel kod/release gate kanıtı ayrılır ve çelişki yazılır.
- Envanter sayıları tanımsız kalabilir: route, screen-state, action ve themed component sayım yöntemleri
  belgelerde açıkça tanımlanır.

### Security/privacy impact

Salt-okunur kaynak denetimi ve dokümantasyon yapılır. Veri, auth, backend, Storage, log ve uzak ortam
değişmez. PII içeren geçmiş görseller açılmaz veya kopyalanmaz.

### Relevant files

Task'ın `Relevant files` bölümü ve bu dosyaların doğrudan import ettiği davranış/test kaynakları.

### Implementation steps

1. **Completed:** Talimatlar, V1 kaynakları ve önceki task kanıtlarını oku; planı oluştur.
2. **Completed:** Route, ekran, kontrol ve state envanterini kaynak koddan çıkar.
3. **Completed:** Ana kullanıcı akışları ve acceptance matrisi için kanıt haritası oluştur.
4. **Completed:** Hard-coded renk/theme bypass taraması ve light/dark sınıflandırması yap.
5. **Completed:** Mevcut güvenli testleri çalıştır; runtime/render boşluklarını açık bırak.
6. **Completed:** Dört QA belgesini tamamla; link/diff/security review yap.
7. **Completed:** Task completion kanıtını yaz; audit paketini commit/push teslimatına hazırla.

### Validation commands

```powershell
npm test
# Repository-relative Markdown linklerini salt-okunur PowerShell kontrolüyle doğrula
git diff --check
git status --short
```

Repository'de Markdown link scripti yoksa eşdeğer salt-okunur local link taraması kullanılır. Build,
deploy, database ve remote Supabase komutları çalıştırılmaz.

### Manual checks

- Yeni APK üzerinde acceptance matrisindeki bütün `MANUAL ANDROID CHECK REQUIRED` satırları.
- Light/dark/system, cold start, native alert/date picker, status/navigation bar ve TalkBack.
- Gerçek e-posta doğrulama/reset, ağ kesintisi/session expiry ve belge picker davranışı.

### Rollback strategy

Yalnız yeni audit dokümanları ve task dosyası vardır; gerekirse yeni bir revert commit'iyle geri
alınabilir. Veri veya uzak ortam rollback'i gerekmez.

### Expected output

TASK-006, dört QA belgesi, sayısal audit özeti, doğrulama kanıtı, commit ve push sonucu.

### Do not change

`src/**`, `supabase/**`, package/lockfile, app/Expo/EAS/Android yapılandırması, `.env*`, kullanıcı
verisi, build çıktıları ve bütün remote sistemler.

### Completion report

#### Completed

- Görev ve yaşayan execution plan oluşturuldu.
- 26 route, 5 tab, 11 form ve bütün ortak modal/alert/loading/error/empty yüzeyleri envanterlendi.
- 35 kanonik kullanıcı işlemi başarı/alternatif/hata/loading/back/persistence/security ve Android
  kabul adımlarıyla denetlendi.
- 26 route + 26 ortak/navigation yüzeyi olmak üzere 52 light/dark yüzey kaynak seviyesinde incelendi.
- Theme token dışındaki 17 runtime color literal, 14 confirmed defect ve 15 possible risk kaydedildi.
- `npm test`: 20 dosya / 98 test geçti; RN screen render test altyapısı olmadığı açık test boşluğu
  olarak kaydedildi.
- Repository-relative Markdown bağlantı kontrolü geçti.
- `git diff --check` geçti; kapsam incelemesinde yalnız bu görev ve dört QA belgesi bulundu.
- Güvenlik/gizlilik regresyon incelemesinde secret, PII, ekran görüntüsü, uygulama kodu, migration,
  package/environment veya build çıktısı eklenmediği doğrulandı.

#### Skipped

- Build, deploy, remote Supabase ve yeni screenshot capture kapsam gereği çalıştırılmadı.
- React Native light/dark ekran render testi mevcut Vitest node altyapısı desteklemediği için
  çalıştırılmadı; Passed varsayılmadı.

#### Failed

- Başarısız otomatik test yok. Kaynak audit bulguları acceptance matrisinde defect/risk olarak açık.

#### Manual verification required

- Yeni Android APK üzerinde 26 route, native UI, auth e-postaları, navigation, theme, notification,
  picker, session/offline ve deletion acceptance matrisi.

## Commands to run

Execution plan `Validation commands` bölümü geçerlidir.

## Expected outputs

- Dört kaynak-temelli QA belgesi ve release-before-build sayım özeti.

## Manual device checks

Execution plan `Manual checks` bölümü bağlayıcıdır.

## Do not change

Execution plan `Do not change` bölümü bağlayıcıdır.

## Completion checklist

- [x] `AGENTS.md`, görev kaynakları ve execution plan okundu/güncellendi.
- [x] Yalnız onaylı dokümantasyon kapsamı uygulandı.
- [x] Acceptance criteria kanıtlandı.
- [x] İlgili mevcut testler çalıştırıldı.
- [x] Diff ve security/privacy regression kontrolü tamamlandı.
- [x] Completed, skipped, failed ve manual checks ayrı raporlandı.

## Review checklist

- [x] Sayımlar ve repository kanıt bağlantıları yeniden üretilebilir.
- [x] Runtime kanıtı olmayan davranış Passed gösterilmemiştir.
- [x] Negatif, hata, offline ve session expiry yolları kapsanmıştır.
- [x] Light/dark bütün source taraması ve istisna listesi tamamdır.
- [x] Kapsam dışı kod/build/backend değişikliği yoktur.

## Human acceptance result

**Result:** NOT REVIEWED — AWAITING HUMAN TRIAGE AND ANDROID ACCEPTANCE
**Reviewed by:** —
**Date:** —
**Notes:** Kaynak denetimi tamamlandı. Yeni APK üretilmedi; defect önceliklendirmesi ve sonraki
uygulama görevi insan onayı bekliyor.
