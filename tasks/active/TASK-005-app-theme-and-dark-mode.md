# TASK-005 — Uygulama teması ve koyu mod

**Status:** IMPLEMENTED — AWAITING ANDROID DEVICE ACCEPTANCE

**Owner:** Codex

**Created:** 2026-08-01

**Updated:** 2026-08-01

## Task ID

TASK-005

## Title

Kalıcı, sistem temasını izleyen ve uygulama genelinde tutarlı açık/koyu tema sistemi.

## Goal

Kullanıcının Ayarlar ekranından Sistem/Açık/Koyu tercihi yapabildiği, seçimi cihazda saklanan ve tüm
açık ekranlara yeniden başlatma gerektirmeden uygulanan merkezi tema mimarisi oluşturmak.

## User problem

Uygulama yalnız açık renk token’ları kullanıyor; sistem koyu temasını takip etmiyor ve kullanıcıya
kalıcı görünüm tercihi sunmuyor.

## Current behavior

- `src/shared/theme/index.ts` marka, yüzey ve durum renklerini tek statik `colors` nesnesinde tutuyor.
- Yaklaşık 28 UI dosyasında `StyleSheet.create` çağrıları bu renkleri module-load sırasında sabitliyor.
- Ayarlar ekranında Görünüm bölümü ve tema tercihi yok.
- App açılışı font yüklenmesini splash arkasında bekliyor; tema tercihi hydration kapısı yok.
- Status bar her zaman koyu ikon kullanıyor.

## Desired behavior

- `system`, `light`, `dark` tercihleri ve açık/koyu çözülmüş tema ayrılır.
- Sistem tercihinde React Native sistem color scheme değişiklikleri canlı izlenir.
- Tercih AsyncStorage’da yalnız cihaz UI ayarı olarak saklanır.
- Light/dark semantic token setleri provider üzerinden bütün UI ağacına dağıtılır.
- Marka aqua/turkuaz kimliği korunurken surface, text, border, input, disabled, status, tab, overlay,
  grafik ve body-diagram renkleri iki tema için ayrı ayarlanır.

## Scope

- [x] Merkezi semantic light/dark token setleri ve theme provider.
- [x] Tema tercihinin güvenli parse/load/save katmanı ve AsyncStorage persistence.
- [x] Sistem color scheme takibi ve canlı tema geçişi.
- [x] Font + tema hydration tamamlanmadan splash’in kaldırılmaması.
- [x] Temaya uygun StatusBar.
- [x] Ayarlar → Görünüm altında üç erişilebilir seçenek.
- [x] Ortak UI, auth, onboarding, tab ekranları, formlar, hukuk, grafik ve body diagram stillerinin
      provider tabanlı hale getirilmesi.
- [x] Odaklı tema testleri, typecheck, lint, full unit regression ve diff/security review.

## Out of scope

- Native Android date picker veya sistem alert yeniden tasarımı.
- Yeni renk paleti/marka tasarımı, yeni font veya dependency.
- Kullanıcı/araç/hesap/domain verisi veya business logic değişikliği.
- Supabase, auth, migration, RLS, Storage, kota veya backend davranışı.
- Expo/EAS build, deploy, remote Supabase E2E, database reset veya mağaza işlemi.

## Acceptance criteria

- [x] Ayarlar’da “Görünüm” bölümü Sistem ayarını kullan/Açık/Koyu seçeneklerini gösterir.
- [x] Seçim anında bütün açık UI ağacına uygulanır.
- [x] Seçim kapatıp açma sonrasında AsyncStorage’dan geri yüklenir.
- [x] Sistem seçeneği cihazın light/dark değişikliğini canlı izler.
- [x] Geçersiz/silinmiş persisted değer güvenli biçimde `system` fallback kullanır.
- [x] Semantic tokenlar screen/card/elevated/text/border/input/disabled/action/status/tab/overlay
      gereksinimlerinin tamamını içerir.
- [x] Statik açık yüzey renkleri ekran dosyalarında ayrı yamalar olarak çoğalmaz.
- [x] Auth, onboarding, dashboard, geçmiş, araç, hatırlatıcılar, belgeler, hukuk ve ayarlar her iki
      temada provider token’larını kullanır.
- [x] Grafik, modal/bottom sheet ve body SVG iki temada ayırt edilebilir tokenlar kullanır.
- [x] Status bar ikonları çözülmüş temaya uyar.
- [x] Splash tema hydration tamamlanmadan kapanmaz.
- [x] Tema tercihi kullanıcı/domain verisini değiştirmez ve Supabase’e yazılmaz.
- [x] Build/deploy çalıştırılmaz; task Android kabulüne kadar active kalır.

## Security/privacy requirements

- Tema tercihi PII değildir; yalnız sabit storage key altında `system|light|dark` değeri saklanır.
- Tema state’i auth/session/user/vehicle kayıtlarından bağımsızdır.
- Secret, provider error, kullanıcı verisi veya analytics/log eklenmez.
- Supabase client, migration, RLS, Storage ve auth dosyaları değiştirilmez.

## Relevant screenshots or evidence

- Repository’deki mevcut açık tema uygulaması ve TASK-001 Android ekran kanıtı mevcut light baseline’dır.
- Dark-mode gerçek cihaz kanıtı henüz yoktur; implementation sonrası manuel kabul gerekir.

## Relevant files

- `src/shared/theme/tokens.ts`: light/dark semantic renk ve gölge tokenları.
- `src/shared/theme/ThemeProvider.tsx`: sistem teması çözümü, provider ve theme hooks.
- `src/shared/theme/index.ts`: merkezi theme API ve tipografi/spacing exportları.
- `src/store/themeStore.ts`: kalıcı UI tercihi.
- `src/features/theme/themePreference.ts`: parse/resolve/persistence sözleşmesi ve testleri.
- `src/app/_layout.tsx`: provider, splash hydration, status bar ve navigation theme.
- `src/app/(tabs)/settings.tsx`: Görünüm seçim akışı.
- `src/shared/components/*`: ortak surface/input/modal/chart/card davranışı.
- `src/app/**`, `src/features/bodyCondition/**`, `src/features/legal/**`: themed screen styles.

## Execution plan

### Goal

Mevcut marka dilini koruyan, merkezi, kalıcı ve canlı güncellenen iki temalı UI sistemi uygulamak.

### Background

Expo SDK 57, React Native `useColorScheme`, mevcut AsyncStorage ve Zustand kullanıldı; dependency
eklenmedi. Sistem temasının native katmanda da izlenmesi ve açılış parlamasının azaltılması için
`app.json` yalnız `userInterfaceStyle: automatic` ve splash dark varyantıyla güncellendi.

### Current state

Repository başlangıçta temiz `main` dalında. Tema statik ve açık; persistence/provider yok.

### Scope

Bu task’ın `Scope` bölümü bağlayıcıdır.

### Out of scope

Bu task’ın `Out of scope` ve `Do not change` bölümleri bağlayıcıdır.

### Acceptance criteria

Bu task’ın `Acceptance criteria` bölümü bağlayıcıdır.

### Risks

- Statik StyleSheet’te kalan renkler dark mode tutarsızlığı yaratabilir: kaynak taraması ve ekran
  envanteriyle denetlenir.
- Async hydration light flash yaratabilir: provider children’ı hydration sonuna kadar render etmez;
  mevcut splash korunur.
- Düşük kontrast: semantic dark yüzey/metin/status tokenları ayrı seçilir ve manuel Android kontrolü
  açık bırakılır.
- Sistem değişimi kaçırılabilir: React Native `useColorScheme` provider içinde doğrudan kullanılır.

### Security/privacy impact

Yalnız cihaz-local UI tercihi eklenir. Auth, backend, veri sahipliği, log ve kullanıcı verisi etkisi
yoktur.

### Relevant files

Task’ın `Relevant files` bölümü ve theme import eden mevcut UI envanteri.

### Implementation steps

1. **Completed:** Theme envanteri, task ve execution plan.
2. **Completed:** Semantic tokens, persistence helper/store ve provider.
3. **Completed:** Root hydration/status/navigation ve Settings Görünüm akışı.
4. **Completed:** Ortak bileşenler ve tüm ekran stillerini themed factory’ye taşıma.
5. **Completed:** Grafik/body SVG kontrastı ve statik renk regression taraması.
6. **Completed:** Focused tests → typecheck/lint/full tests → diff/security review.
7. **In progress:** Completion evidence, commit ve `origin/main` push.

### Validation commands

```powershell
npx vitest run src/features/theme/themePreference.test.ts src/shared/theme/tokens.test.ts
npm run typecheck
npm run lint
npm test
git diff --check
```

### Manual checks

- Android: Sistem/Açık/Koyu seç, anlık geçiş ve uygulama restart persistence.
- Sistem seçiliyken cihaz temasını uygulama açıkken değiştir.
- Auth, onboarding, dashboard, geçmiş, araç, hatırlatıcılar, belge/hukuk/ayar ekranlarını iki temada
  dar portrait genişlikte dolaş.
- Input/focus/error/disabled, kart, modal/select, grafik, body SVG, tab bar ve scroll sonunu kontrol et.
- Status bar ikon kontrastı ve cold-start flash davranışını gözle.
- Native date picker ve alert’in sistem görünümünü koruduğunu doğrula.

### Rollback strategy

Veri migration’ı yoktur. UI commit’i revert edilebilir; geçersiz/eski storage değeri `system` fallback
ile güvenli kalır.

### Expected output

Theme provider/store/tokens, Görünüm ayarı, themed UI dosyaları, focused regression testleri, güncel
TASK kanıtı ve Git handoff.

### Do not change

Supabase, migration, RLS, auth/backend, domain/business logic, kullanıcı verisi, package/lockfile,
`userInterfaceStyle` ve splash dark varyantı dışındaki Expo/EAS/Android config, build ve deploy.

## Commands to run

Execution plan `Validation commands` bölümü geçerlidir.

## Expected outputs

- `IMPLEMENTED — AWAITING ANDROID DEVICE ACCEPTANCE` durumunda active task.
- Otomatik tema davranışı kanıtı ve açık manuel Android kabul listesi.

## Manual device checks

Execution plan `Manual checks` bölümü bağlayıcıdır.

## Do not change

Execution plan `Do not change` bölümü bağlayıcıdır.

## Completion report

### Completed

- Merkezi provider, semantic light/dark tokenlar ve `system|light|dark` resolver uygulandı.
- Tercih `@aracim-cepte/theme-preference-v1` AsyncStorage anahtarında kalıcılaştırıldı.
- Ayarlar → Görünüm akışı erişilebilir radio seçenekleriyle eklendi.
- Ortak UI, auth, onboarding, navigation, tablar, dashboard, kayıt kartları, araç, belge, hukuk,
  grafik ve body diagram tema tokenlarına geçirildi.
- `app.json` sistem teması ve light/dark splash varyantı için güncellendi.
- Odaklı Vitest: 2 dosya, 8 test geçti.
- Full Vitest: 20 dosya, 98 test geçti.
- `npm run typecheck`, `npm run lint` ve `git diff --check` geçti.
- Kaynak/diff güvenlik incelemesinde kullanıcı verisi, secret, backend, migration, auth veya iş mantığı
  değişikliği bulunmadı.

### Skipped

- Expo/EAS build, deploy, remote Supabase E2E ve database işlemleri kullanıcı talimatı gereği
  çalıştırılmadı.

### Failed

- Yok.

### Manual verification required

- Gerçek Android cihazda sistem/açık/koyu canlı geçişi, restart persistence, cold-start splash,
  status bar, kontrast ve ana ekran envanteri.

## Completion checklist

- [x] `AGENTS.md`, task standardı ve execution plan okundu/güncellendi.
- [x] Yalnız onaylı kapsam uygulandı.
- [x] Acceptance criteria otomatik olarak kanıtlanabilen ölçüde doğrulandı.
- [x] İlgili otomatik testler çalıştırıldı.
- [x] Diff ve security/privacy review tamamlandı.
- [x] Dokümantasyon ve completion report güncellendi.

## Review checklist

- [x] Kapsam dışı business/backend değişikliği yok.
- [x] Light/dark/system ve persistence test kanıtı güncel.
- [x] Statik renk/kontrast regressions gözden geçirildi.
- [ ] Android cihaz sonucu kaydedildi.

## Human acceptance result

**Result:** NOT REVIEWED — AWAITING ANDROID DEVICE ACCEPTANCE

**Reviewed by:** —

**Date:** —

**Notes:** Otomatik doğrulamalar geçti. Build başlatılmadı; gerçek cihaz kabulü kullanıcı tarafından
yeni APK üzerinde yapılmalıdır.
