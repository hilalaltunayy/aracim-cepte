# V1 açık/koyu tema denetimi

**Audit date:** 2026-08-01
**Baseline:** `2c5cc0450b558ba94ff0c8e07422db5b4a309cdf`
**Audit coverage:** 26 route + 26 ortak/navigation yüzeyi = **52 tema yüzeyi**

## TASK-007 remediation sonucu — 2026-08-01

TASK-006 aşağıdaki tabloları tarihsel baseline olarak korur. TASK-007 sonrasındaki güncel kaynak
sonucu şöyledir:

- Theme token dosyası ve test fixture'ları hariç `src/**/*.ts(x)` taramasında doğrudan runtime
  `#hex`/`rgb(a)` occurrence sayısı **0**'dır. Önceki 17 occurrence semantic tokenlara taşınmıştır.
- `app.json` içindeki icon, notification ve light/dark splash için dört native config rengi bilinçli
  olarak korunmuştur; JS runtime theme bypass sayılmaz.
- Light `primaryAction`, secondary text, status badge, border ve disabled text tonları koyulaştırıldı;
  dark border/disabled text ayrımı güçlendirildi.
- Onboarding/dashboard için `onBrand`, `onBrandMuted`, marka yüzeyi ve illustration semantic tokenları;
  BodyDiagram için ayrı center-line tokenı eklendi.
- Loading button spinner'ı loading/disabled yüzeyde `disabledText` kullanır.
- TASK-007 sonrası `npm test` sonucu **26 dosya / 121 test PASS**; theme odaklı saf testler güncel
  light/dark kontrast ve loading spinner sınırlarını kapsar.

| TASK-006 bulgusu     | Güncel kaynak sonucu                                               | Kalan doğrulama                         |
| -------------------- | ------------------------------------------------------------------ | --------------------------------------- |
| D-01 primary action  | IMPLEMENTED — normal text ve yüzey kontrast testleri geçiyor       | Android light theme                     |
| D-02 gradient copy   | IMPLEMENTED — iki endpoint için semantic on-brand testleri geçiyor | Onboarding/dashboard Android screenshot |
| D-03 secondary/badge | IMPLEMENTED — normal text ve dört status rengi testli              | Placeholder/badge Android screenshot    |
| D-04 borders         | IMPLEMENTED — light/dark card sınırları 3:1 test eşiğinde          | Input/card/divider Android screenshot   |
| D-05 spinner         | IMPLEMENTED — iki theme için disabled loading color testli         | Gerçek animasyon/loading state          |

Deterministik güncel oranlar: light on-primary/action `5.10:1`, action/screen `4.76:1`, secondary/card
`6.13:1`, secondary/screen `5.72:1`, border/card `3.29:1`, border/screen `3.07:1`; light
info/success/warning/error `5.98 / 5.73 / 6.78 / 6.03:1`; dark border/card `3.33:1`.

React Native screen renderer/snapshot altyapısı hâlâ yoktur. Bu nedenle 52 yüzey için kaynak ve saf
kontrast coverage'ı güncellenmiş olsa da runtime light/dark render sonucu
**MANUAL ANDROID CHECK REQUIRED** olarak kalır.

## Kanıt sınırı

Bu turda çalışan yeni APK, emulator veya screenshot capture yoktur ve build başlatılmamıştır. Kaynak
token kullanımı, deterministik renk kontrastı ve mevcut saf testler denetlenmiştir. Gerçek piksel,
font rasterization, Android üretici UI'sı, safe-area, TalkBack ve cold-start davranışı
**MANUAL ANDROID CHECK REQUIRED** olarak kalır.

Vitest `node` environment ve `src/**/*.test.ts` include kullanır. `.tsx` ekranlarını React Native
renderer içinde light/dark provider ile render eden altyapı yoktur. Bu nedenle “bütün ekranlar iki
temada render edildi” iddiası yapılamaz.

## Merkezi mimari sonucu

| Alan                     | Sonuç                         | Kanıt / sınır                                                                         |
| ------------------------ | ----------------------------- | ------------------------------------------------------------------------------------- |
| Theme provider           | PASS                          | `useColorScheme`, persisted preference ve anlık context update                        |
| Sistem/Açık/Koyu         | PASS (pure) + MANUAL          | Resolver/persistence testli; device UI manuel                                         |
| Semantic token seti      | PASS                          | İstenen screen/card/elevated/text/border/input/disabled/action/status/tab/overlay var |
| Screen/card/input/modal  | PASS coverage                 | Ortak `createStyles(AppTheme)` kullanıyor                                             |
| Status bar               | PASS source + MANUAL          | `scheme` ile light/dark icon seçiliyor                                                |
| Android navigation bar   | POSSIBLE RISK                 | Manuel preference için açık yönetim yok                                               |
| Tab bar/safe-area        | PASS calculation + MANUAL     | Dynamic inset testli; gerçek three-button/gesture bekliyor                            |
| Splash                   | PASS source + POSSIBLE RISK   | System light/dark asset var; persisted override farklıysa flash riski                 |
| Grafik                   | PASS coverage + MANUAL        | Bar/grid/label tokenlı; render/screenshot yok                                         |
| Body SVG                 | PASS coverage + MANUAL        | Ayrı dark body/status/diagram tokenları var; bütün kombinasyonlar görülmedi           |
| Modal/bottom sheet       | PASS coverage + MANUAL        | Surface/overlay/text tokenlı; native focus/back görülmedi                             |
| Native alert/date picker | MANUAL ANDROID CHECK REQUIRED | App manual override ile sistem görünümü ayrışabilir; zorla redesign yok               |

## TASK-006 tarihsel 26 route light/dark baseline'ı

`Token coverage` kaynak seviyesinde provider/theme token kullanımını; `Audit result` kontrast ve
runtime boşluklarını gösterir.

| Route                              | Token coverage                                | Audit result                                                                                      |
| ---------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `/`                                | PASS — ortak LoadingScreen                    | **CONFIRMED DEFECT:** light indicator `primary`/screen oranı `2.81:1`; render manuel              |
| `/onboarding`                      | PARTIAL — gradient tokenlı, 13 direct literal | **CONFIRMED DEFECT:** beyaz/gradient kontrastı; hard-coded illustration; manual reflow            |
| `/auth/login`                      | PASS                                          | **CONFIRMED DEFECT:** light primary/link/secondary/border/loading kontrastı                       |
| `/auth/register`                   | PASS                                          | Aynı shared defect'ler; legal warning/link kontrastı ayrıca etkilenir                             |
| `/auth/forgot-password`            | PASS                                          | Aynı shared input/button/error defect'leri; native alert manual                                   |
| `/auth/reset-password`             | PASS                                          | Aynı shared form/loading/status defect'leri; phase geçişleri manual                               |
| `/(tabs)/index`                    | PARTIAL — 3 direct gradient text literal      | **CONFIRMED DEFECT:** white gradient metni ve secondary/card kontrastı                            |
| `/(tabs)/history`                  | PASS                                          | **CONFIRMED DEFECT:** selected pill label/primary ve borders; selected state accessibility defect |
| `/(tabs)/vehicle`                  | PASS                                          | Shared light secondary/primary/border defect'leri; null state ayrı flow defect'i                  |
| `/(tabs)/reminders`                | PASS                                          | **CONFIRMED DEFECT:** light status badge kontrastları; checkbox/icon manual                       |
| `/(tabs)/settings`                 | PASS                                          | Radio selected/unselected tokenlı; light secondary/border/primary defect'leri; nav bar manual     |
| `/vehicle/edit`                    | PASS                                          | Shared input/select/modal/button defect'leri; native keyboard manual                              |
| `/record/edit`                     | PASS                                          | Shared input/date/modal/button/alert defect'leri; native date picker manual                       |
| `/reminder/edit`                   | PASS                                          | Shared input/date/modal/badge/error; native picker/alert manual                                   |
| `/body-condition`                  | PASS                                          | Body status token setleri ayrı; direct center-line literal; full SVG visual manual                |
| `/expertise`                       | PASS                                          | Shared card/empty/button contrast defect'leri                                                     |
| `/expertise/edit`                  | PASS                                          | Shared form/picker/error/loading; native picker/viewer manual                                     |
| `/notes`                           | PASS                                          | Shared secondary/card/border; direct note Pressable semantics defect                              |
| `/notes/edit`                      | PASS                                          | Shared form/button/error/alert defect'leri                                                        |
| `/documents`                       | PASS                                          | Shared card/badge/empty; status contrast defect'leri                                              |
| `/documents/edit`                  | PASS                                          | Shared form/picker/modal/loading; native viewer/manual                                            |
| `/legal/kvkk-notice`               | PASS                                          | **CONFIRMED DEFECT:** light body secondary ve warning badge contrast; long scroll manual          |
| `/legal/privacy-policy`            | PASS                                          | Aynı legal shared sonucu                                                                          |
| `/legal/retention-and-deletion`    | PASS                                          | Aynı legal shared sonucu                                                                          |
| `/legal/account-and-data-deletion` | PASS                                          | Aynı legal shared sonucu                                                                          |
| `/legal/kvkk-application`          | PASS                                          | Aynı legal shared sonucu; contact text tappable değil                                             |

## TASK-006 tarihsel ortak/navigation tema baseline'ı

| ID  | Yüzey                          | Light                          | Dark                                 | Sonuç                                                   |
| --- | ------------------------------ | ------------------------------ | ------------------------------------ | ------------------------------------------------------- |
| T01 | Root Stack header/content      | Tokenlı                        | Tokenlı                              | PASS source; navigation transition manual               |
| T02 | BackButton                     | Tokenlı                        | Tokenlı                              | Border kontrast defect'i; hit/back manual               |
| T03 | StatusBar                      | dark icons                     | light icons                          | PASS source; OEM/manual                                 |
| T04 | Floating tab bar               | Tokenlı                        | Tokenlı                              | Light selected label defect; Android nav manual         |
| T05 | Screen/SafeArea/scroll padding | Tokenlı                        | Tokenlı                              | PASS source; safe-area manual                           |
| T06 | AppHeader                      | Primary/secondary              | Primary/secondary                    | Light secondary defect                                  |
| T07 | Card/FormSection               | Surface/border                 | Surface/border                       | Border defect                                           |
| T08 | AppButton                      | Action/onPrimary               | Action/onPrimary                     | Light normal text defect                                |
| T09 | AppButton loading/disabled     | Disabled surface               | Disabled surface                     | **CONFIRMED DEFECT:** spinner branch wrong token        |
| T10 | AppInput                       | Input/text/border/placeholder  | Ayrı dark token                      | Light placeholder + border defect                       |
| T11 | PasswordInput                  | AppInput + muted eye           | Aynı semantic                        | Shared defect; press behavior manual                    |
| T12 | SelectField                    | Input/modal/selected           | Ayrı dark token                      | Shared border; modal focus/back manual                  |
| T13 | DateField                      | Input/elevated/action          | Ayrı dark token                      | Native picker theme manual                              |
| T14 | SectionHeader/action           | Text/action                    | Ayrı dark token                      | Light action contrast + role eksikliği                  |
| T15 | EmptyState                     | Card/pale/icon/text            | Ayrı dark token                      | Light secondary/action contrast                         |
| T16 | LoadingScreen                  | Screen/primary/text            | Ayrı dark token                      | Light indicator contrast defect                         |
| T17 | ErrorBanner                    | Error surface/text/action      | Ayrı dark token                      | Light retry/error `4.47:1` sınır altı                   |
| T18 | StatusBadge                    | 5 semantic tone                | 5 ayrı dark tone                     | Light tone'ların tümü `4.5:1` altında                   |
| T19 | AttachmentField                | Shared controls                | Shared controls                      | Token coverage PASS; native picker manual               |
| T20 | RecordCard                     | Surface/pale/text/icon         | Ayrı dark token                      | Shared light primary/secondary defect                   |
| T21 | ReminderCard                   | Badge/icon/text                | Ayrı dark token                      | Light badge defect; checkbox manual                     |
| T22 | DocumentCard                   | Badge/icon/text                | Ayrı dark token                      | Light badge defect                                      |
| T23 | MiniBarChart                   | Primary/grid/text              | Ayrı dark token                      | Light label/action contrast; visual manual              |
| T24 | BodyDiagram                    | 6 status + diagram token       | 6 dark status + diagram              | PASS source; discrimination/manual                      |
| T25 | SettingsRow/ThemeOptionRow     | Semantic row/radio             | Semantic row/radio                   | Border/primary light defect; selected state source PASS |
| T26 | Onboarding/Dashboard gradient  | Marka gradient + white literal | Brighter dark tokens + white literal | **CONFIRMED DEFECT:** endpoint contrast                 |

## TASK-006 tarihsel hard-coded renk taraması

Komut kapsamı: bütün `src/**/*.ts(x)`; theme token dosyası ve test fixture'ları ayrı değerlendirildi.

- Theme token dosyası dışında **17 direct runtime color literal occurrence** bulundu.
- Bu occurrence'lar **3 source dosyada** bulunuyor.
- `app.json` içinde icon/notification/light splash/dark splash için **4 native config color** var;
  bunlar merkezi JS theme token'ına bağlanamaz ve beklenen config sabitleridir.
- `tokens.ts` içindeki hex değerler merkezi source-of-truth olduğundan bypass sayılmadı.

| Dosya                                        | Adet | Literal türü                                | Sınıf                  | Değerlendirme                                                                |
| -------------------------------------------- | ---: | ------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------- |
| `src/app/onboarding.tsx`                     |   13 | Illustration hex + white rgba surfaces/text | POSSIBLE RISK + DEFECT | Illustration self-contained; beyaz metin/gradient kontrastı confirmed defect |
| `src/app/(tabs)/index.tsx`                   |    3 | White rgba hero text                        | CONFIRMED DEFECT       | Her iki palette endpoint'inde normal text AA altında                         |
| `src/features/bodyCondition/BodyDiagram.tsx` |    1 | White rgba center line                      | POSSIBLE RISK          | Decorative; dark/light görünürlük manuel                                     |
| `app.json`                                   |    4 | Icon, notification ve iki splash background | PASS config            | Native config için beklenen sabitler                                         |

`colors.white` merkezi token olmakla birlikte onboarding/dashboard gradient copy için semantic
`onBrand`/`onBrandMuted` ayrımını sağlamıyor; bu nedenle literal taramasında görünmese de kontrast
bulgusuna dahildir.

## TASK-006 tarihsel deterministik kontrast sonuçları

Oranlar WCAG relative luminance formülüyle exact token hex'lerinden hesaplandı. Normal text için
`4.5:1`, large text için `3:1`, anlamlı control boundary için `3:1` referans alındı.

| Pair                                   |                          Oran | Sonuç                                                     |
| -------------------------------------- | ----------------------------: | --------------------------------------------------------- |
| Light `onPrimary` / `primaryAction`    |                      `3.01:1` | CONFIRMED DEFECT — 15 px button text için yetersiz        |
| Light `primaryAction` / screen         |                      `2.81:1` | CONFIRMED DEFECT — link/tab label için yetersiz           |
| Dark `onPrimary` / `primaryAction`     |                      `7.33:1` | PASS                                                      |
| White / light gradient primary→aqua    |           `3.01:1` → `2.07:1` | CONFIRMED DEFECT                                          |
| White / dark gradient primary→aqua     |           `2.53:1` → `1.87:1` | CONFIRMED DEFECT                                          |
| Light secondary / card                 |                      `4.21:1` | CONFIRMED DEFECT — normal text altında                    |
| Light secondary / screen               |                      `3.94:1` | CONFIRMED DEFECT                                          |
| Dark secondary / input                 |                      `8.03:1` | PASS                                                      |
| Light info/success/warning/error badge | `4.12 / 4.00 / 2.65 / 3.80:1` | CONFIRMED DEFECT                                          |
| Dark info/success/warning/error badge  | `6.41 / 6.02 / 6.30 / 5.39:1` | PASS                                                      |
| Light border / card                    |                      `1.26:1` | CONFIRMED DEFECT — meaningful boundary ise yetersiz       |
| Dark border / card                     |                      `1.50:1` | CONFIRMED DEFECT — meaningful boundary ise yetersiz       |
| Light disabled text / surface          |                      `2.66:1` | Disabled WCAG exemption olsa da POSSIBLE READABILITY RISK |
| Dark disabled text / surface           |                      `3.77:1` | POSSIBLE READABILITY RISK                                 |

## Modal, native ve açılış denetimi

- **Select modal:** `modalOverlay`, `elevatedSurface`, semantic text/selected background kullanıyor —
  source coverage PASS; Android back/focus/keyboard **MANUAL**.
- **Date picker:** App wrapper themed; native Android picker'a explicit app preference gönderilmiyor —
  **POSSIBLE RISK**, sistemden farklı manual tema ile test edilmeli.
- **Alert:** Native appearance zorlanmıyor; app manual override ile ayrışabilir — **MANUAL**.
- **Tab/safe-area:** bottom inset dinamik; Android nav bar rengi/icon mode'u explicit değil —
  **POSSIBLE RISK**.
- **Splash:** `userInterfaceStyle=automatic`, light/dark background tanımlı; persisted `light` seçimi
  dark sistemde veya tersi durumda native splash sistem renginde başlayıp JS tercihine geçer —
  **POSSIBLE RISK**, cold-start video gerekir.

## TASK-006 test baseline'ı ve güncel test boşluğu

- TASK-006 sırasında `npm test`: **20 dosya / 98 test PASS**; TASK-007 güncel sonucu yukarıdadır.
- Theme-focused pure tests: preference seçenekleri, system çözümü, storage helper, required tokenlar ve
  sınırlı dark contrast assertion'ı var.
- Mevcut contrast testi yalnız dark primary/secondary ve dark primary action'ı kontrol ettiği için
  light theme defect'lerini yakalamıyor.
- React Native component render, screen snapshot, accessibility tree veya Android screenshot test
  altyapısı yoktur.
- Bu nedenle 52 surface için kaynak coverage denetlendi; hiçbiri runtime light/dark render Passed
  sayılmadı.

## TASK-006 tarihsel sonuç sınıflandırması

- **PASS:** Merkezi provider/token kapsamı, dark ana metin/action/status tokenları, themed modal ve SVG
  kaynak bağlantıları.
- **CONFIRMED DEFECT:** 5 tema bulgusu — primary/action, gradient copy, secondary/status,
  border/control ve loading spinner kontrastı.
- **POSSIBLE RISK:** Android navigation bar, native picker/alert, splash override mismatch, SVG
  discrimination, disabled readability ve hard-coded decorative colors.
- **MANUAL ANDROID CHECK REQUIRED:** 26 route'un iki temada ekran görüntüsü, bütün ortak state'ler,
  system override, TalkBack, safe-area, native UI ve cold-start.
