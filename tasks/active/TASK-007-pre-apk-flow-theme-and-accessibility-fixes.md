# TASK-007 — APK öncesi akış, tema ve erişilebilirlik düzeltmeleri

**Status:** IMPLEMENTED — AWAITING FINAL AUDIT AND ANDROID DEVICE ACCEPTANCE
**Owner:** Codex
**Created:** 2026-08-01
**Updated:** 2026-08-01

## Task ID

TASK-007

## Title

TASK-006 D-01–D-10 ve D-14 APK öncesi düzeltmeleri.

## Goal

Yeni Android acceptance APK'sından önce temel auth/offline/session, kilometre, reminder, dosya açma,
tema kontrastı ve TalkBack kusurlarını kapsam kontrollü biçimde düzeltmek.

## User problem

Kaynak audit'i; bağlantı kesintisinde yanlış yönlendirme, süresi dolan oturumda korumasız ekran,
kilometre/reminder tutarsızlığı, düşük kontrast, yakalanmayan dosya açma hatası ve eksik
erişilebilirlik anlamları buldu. Bunlar yeni APK'nın güvenilir biçimde kabul edilmesini engelliyor.

## Current behavior

- TASK-006, D-01–D-10 ve D-14'ü repository kanıtıyla confirmed defect olarak kaydetti.
- Confirmation resend, notification tap ve dirty-form çıkış kararı kaynakta tamamlanmış değil.
- D-11–D-13 cross-system atomiklik riskleri ayrı güvenlik görevinin kapsamındadır.
- Son audit baseline'ı `c12732908948753cba1a58ec9b42bd0c29f81256` commit'idir.

## Desired behavior

Onaylanan V1 kararları hedefli yardımcılar, merkezi tema tokenları, güvenli navigation guard'ları ve
Türkçe hata/uyarı mesajlarıyla uygulanır; backend atomikliği, şema veya deploy davranışı değişmez.

## Scope

- [x] Offline cold start için açık bağlantı/retry durumu.
- [x] Bütün protected route'larda güvenli session-expiry yönlendirmesi ve tek kullanımlık mesaj.
- [x] Kayıtlarda düşük kilometre reddi; araç editinde açık düzeltme onayı.
- [x] Eşit hedef kilometrede `due`, üstünde `overdue` reminder durumu.
- [x] Dirty entity form çıkış onayı.
- [x] Reminder notification tap route/fallback davranışı.
- [x] İki attachment edit ekranında güvenli açma hatası ve biten loading durumu.
- [x] D-01–D-05 tema kusurları ve 17 runtime color literal'ın semantic token incelemesi.
- [x] D-14 erişilebilirlik role/label/state düzeltmeleri.
- [x] Confirmation email resend ve kısa cooldown.
- [x] Hedefli testler ve TASK-006 QA/audit kanıt güncellemesi.

## Out of scope

- D-11–D-13 atomiklik/backend düzeltmeleri.
- Migration, RLS, Storage policy, Edge Function veya Supabase deploy.
- Offline cache/read-only offline mode.
- Dashboard hesap formülleri ve V1 dışı ürün özellikleri.
- Expo/EAS build, remote Supabase E2E, database reset ve coverage suite.

## Acceptance criteria

- [x] Offline bootstrap başarısızlığı araç yokmuş gibi `/vehicle/edit` açmaz; retry sunar.
- [x] Session expiry mesajı tam onaylanan Türkçe metindir ve protected navigation loop oluşturmaz.
- [x] Düşük record kilometresi kaydedilmez; araç kilometresi yalnız açık kullanıcı onayıyla düşer.
- [x] Kilometre reminder'ı eşitlikte `due`, aşıldığında `overdue` olur; kalan değer negatif görünmez.
- [x] Değişen entity formları Android/header/gesture geri çıkışında onay ister; başarılı save sonrası istemez.
- [x] Notification tap geçerli reminder'ı edit rotasında, silinmiş/geçersiz payload'ı reminders tab'ında açar.
- [x] Attachment açma hatası raw provider ayrıntısı olmadan güvenli metin gösterir ve retry edilebilir.
- [x] 17 runtime color literal semantic tokenlara taşınır; `app.json` native sabitleri korunur.
- [x] Light tema primary/secondary/badge/border ve loading spinner kontrast testleri geçer.
- [x] İşaretli pressable/selected/disabled/loading yüzeyleri TalkBack anlamı taşır.
- [x] Confirmation resend loading/cooldown ve güvenli Türkçe sonuç mesajlarıyla çalışır.
- [x] Zorunlu komutlar geçer; build/deploy/remote E2E çalıştırılmaz.

## Security/privacy requirements

- Token, parola, signed URL ve raw Supabase/provider hatası loglanmaz veya kullanıcıya gösterilmez.
- Auth guard yalnız istemci navigation güvenliğidir; RLS veya server-side authorization yerine geçmez.
- Notification payload'ı güvenilmeyen girdi kabul edilir; yalnız beklenen reminder kimliği işlenir.
- Resend normalized e-posta kullanır; cooldown istemci UX kontrolüdür ve server rate limitini bypass etmez.
- Şema, RLS, private bucket, signed URL süresi, quota ve silme davranışı değiştirilmez.

## Relevant screenshots or evidence

- [TASK-006 acceptance matrisi](../../docs/qa/v1-acceptance-test-matrix.md)
- [TASK-006 tema audit'i](../../docs/qa/v1-light-dark-theme-audit.md)
- Güncel runtime sonucu yeni Android APK'da doğrulanacaktır; **AWAITING EVIDENCE**.

## Relevant files

- `src/app/_layout.tsx`, `src/app/index.tsx`, `src/store/authStore.ts`, `src/store/dataStore.ts`
- `src/app/**/edit.tsx`, `src/features/reminders/**`, `src/shared/utils/**`
- `src/shared/theme/tokens.ts`, `src/shared/components/**`, onboarding/dashboard/body diagram
- `docs/qa/v1-*.md`, bu görev dosyası ve hedefli `*.test.ts` dosyaları

## Execution plan

### Goal

D-01–D-10 ve D-14 ile onaylanan tamamlayıcı V1 kararlarını yeni APK öncesi testli ve geri alınabilir
bir uygulama diff'iyle kapatmak.

### Background

TASK-006 salt-okunur audit'i defect/riskleri saydı. Kullanıcı offline retry, session expiry, düşük
kilometre, dirty form, notification tap ve confirmation resend davranışlarını bu görev için onayladı.

### Current state

Merkezi theme provider vardır; fakat light kontrast ve üç runtime dosyasında literal renk kusurları
bulunur. Auth/data bootstrap failure ayrımı yoktur. Reminder notification payload'ı tab rotası taşır
ancak response listener yoktur. Entity formlarında ortak dirty guard yoktur.

### Scope

Bu dosyanın `Scope` ve `Acceptance criteria` bölümleri bağlayıcıdır.

### Out of scope

Bu dosyanın `Out of scope` ve `Do not change` bölümleri bağlayıcıdır.

### Risks

- Global auth redirect deep-link recovery'yi kesebilir: public/recovery rotaları ayrı tutulur ve testlenir.
- Dirty guard programatik save navigation'ını engelleyebilir: success öncesi guard devre dışı bırakılır.
- Notification cold-start olayı tekrar işlenebilir: son response güvenli şekilde temizlenir.
- Kontrast düzeltmesi marka görünümünü değiştirebilir: aqua/turkuaz korunur, yalnız semantic tonlar ayarlanır.
- Mileage kuralı eski kaydı düzenlemeyi engelleyebilir: mevcut kaydın kendi kilometresi için açık istisna testlenir.

### Security/privacy impact

Session navigation ve güvenli hata yüzeyi güçlenir. RLS/backend sınırı değişmez. Notification ID UUID
biçiminde doğrulanır; hassas payload/log yoktur. Resend yalnız kullanıcının girdiği normalized e-postaya
Supabase Auth üzerinden yapılır.

### Relevant files

Task'ın `Relevant files` bölümü ve bunların doğrudan hedefli testleri.

### Implementation steps

1. **Completed:** Talimat, audit kanıtı, SDK 57 API'leri ve mevcut kaynakları incele; planı oluştur.
2. **Completed:** Offline/session, mileage/reminder ve navigation kararlarını saf/testlenebilir yardımcılarla düzelt.
3. **Completed:** Dirty form, notification tap, attachment hata ve confirmation resend akışlarını uygula.
4. **Completed:** Theme token/hard-coded literal/kontrast ve erişilebilirlik düzeltmelerini uygula.
5. **Completed:** TASK-006 QA/audit belgelerini yeni kanıt ve açık Android kapılarıyla güncelle.
6. **Completed:** Hedefli testlerden başlayarak bütün zorunlu doğrulamaları ve diff/security review'u çalıştır.
7. **In progress:** Status/completion report'u güncelle, commit et ve `origin/main` dalına push et.

### Validation commands

```powershell
npx vitest run <ilgili hedefli test dosyaları>
npm run typecheck
npm run lint
npm test
git diff --check
```

Hukuk içeriği değişirse generated-content freshness testi ayrıca çalıştırılır. Bu görevde build,
database reset, remote E2E, migration veya deploy komutu çalıştırılmaz.

### Manual checks

- Android cold/warm start, offline→retry, session revoke ve hardware/header/gesture back.
- Notification tap: killed/background/foreground; var/silinmiş/geçersiz reminder.
- TalkBack focus/role/state; light/dark bütün kritik ekranlar; loading/disabled kontrastı.
- Confirmation e-postası teslimatı, cooldown ve deep-link dönüşü.

### Rollback strategy

Tek Git commit'i revert edilerek istemci davranışı ve dokümanlar geri alınabilir. Şema/remote durum
değişmediği için veri rollback'i yoktur.

### Expected output

Testli hedefli uygulama değişiklikleri, güncel QA kanıtı, TASK-007 completion report'u, commit ve push.

### Do not change

`supabase/**`, migration/RLS/Storage/Edge Function, package/lockfile, `app.json`, EAS/Android build
yapılandırması, env/secret, dashboard formülleri, D-11–D-13 davranışı ve kullanıcı verileri.

### Completion report

#### Completed

- D-01–D-10 ve D-14 için kaynak düzeltmeleri uygulandı; D-11–D-13'e dokunulmadı.
- Offline retry, protected-route session expiry, kilometre doğrulama/düzeltme onayı, `due`/`overdue`,
  dirty-form guard, notification tap fallback, attachment safe error/retry ve confirmation resend eklendi.
- Önceki 17 runtime renk literal'ı semantic tokenlara taşındı; marka palette'i ve `app.json` korundu.
- İşaretli ortak/route pressable'larında role, label, selected/disabled/loading/busy state geliştirildi.
- Dört TASK-006 QA/audit belgesi güncel kaynak kanıtı ve açık Android kapılarıyla güncellendi.
- Hedefli Vitest: 10 dosya / 42 test geçti.
- Tam Vitest: 26 dosya / 121 test geçti; TypeScript, lint ve `git diff --check` geçti.
- Diff/kapsam ve security/privacy regression incelemesinde secret, token, signed URL veya raw provider
  logu eklenmediği; `supabase/**`, package/lockfile, `app.json` ve backend atomiklik davranışının
  değişmediği doğrulandı.

#### Skipped

- Hukuk dosyası değişmediği için generated-content freshness çalıştırılmadı.
- Kapsam gereği build, coverage, remote Supabase E2E, database reset, migration ve deploy çalıştırılmadı.
- D-11–D-13 ayrı güvenlik görevi için açık bırakıldı.

#### Failed

- Yok.

#### Manual verification required

- Offline cold start→retry, gerçek session revoke/expiry ve navigation loop olmaması.
- Dirty form için hardware/header/gesture; değişmemiş form ve başarılı save sonrası uyarı olmaması.
- Notification tap killed/background/foreground; bulunan, silinmiş ve desteklenmeyen payload.
- Attachment viewer offline/unsupported/retry; confirmation e-postası teslimatı, cooldown ve deep link.
- Bütün kritik ekranlarda light/dark kontrast, spinner, tab/safe-area, SVG ve TalkBack traversal/state.

## Commands to run

Execution plan `Validation commands` bölümü geçerlidir.

## Expected outputs

- D-01–D-10 ve D-14 sonuç tablosu; test ve Android kabul kanıtı.

## Manual device checks

Execution plan `Manual checks` bölümü bağlayıcıdır.

## Do not change

Execution plan `Do not change` bölümü bağlayıcıdır.

## Completion checklist

- [x] `AGENTS.md`, TASK-006 ve dört QA/audit belgesi okundu.
- [x] Execution plan oluşturuldu.
- [x] Yalnız onaylı kapsam uygulandı.
- [x] Acceptance criteria kaynak/test düzeyinde kanıtlandı; native sonuçlar manuel bırakıldı.
- [x] İlgili otomatik testler çalıştırıldı.
- [x] Diff gözden geçirildi.
- [x] Security/privacy regression kontrolü yapıldı.
- [x] Dokümantasyon güncellendi.
- [x] Completed, skipped, failed ve manual checks ayrı raporlandı.

## Review checklist

- [x] Bağımsız final audit henüz yapılmadı; TASK status bunu açıkça belirtir.
- [x] Kapsam dışı değişiklik yoktur.
- [x] Test kanıtları güncel ve yeniden üretilebilirdir.
- [x] Negatif ve hata durumları kapsanmıştır.
- [x] Güvenlik/gizlilik sınırları korunmuştur.
- [x] Rollback uygulanabilirdir.
- [x] D-01–D-10/D-14 kaynak blocker'ları kapandı; Android acceptance kapısı açık bırakıldı.

## Human acceptance result

**Result:** NOT REVIEWED — AWAITING FINAL AUDIT AND ANDROID DEVICE ACCEPTANCE
**Reviewed by:** —
**Date:** —
**Notes:** Yeni APK oluşturulmadı.
