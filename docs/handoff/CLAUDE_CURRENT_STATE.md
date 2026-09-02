# Claude Current State

**As of:** 2026-09-02

**Accepted source checkpoint:** `82cf2590dd42b7ed12e74ae1ca7ef42db42dad67`

**Physical artifact caveat:** Bu checkpoint'ten APK/AAB üretilmedi. `1.0.0` / `versionCode: 2`
closed-test AAB'si daha eski kaynak çizgisidir; eski fiziksel bulgu yeni kaynağın kabulü değildir.

## Status vocabulary

- **DONE:** Repository ve gerekli remote teknik durum doğrulandı; fiziksel kabul gerektirmeyen madde.
- **IMPLEMENTED / PHYSICAL TEST PENDING:** Kod/test mevcut, güncel checkpoint APK'sında kabul yok.
- **CONFIGURATION PENDING:** Kod temeli var; Dashboard/provider/store/secret/insan ayarı eksik veya
  bu handoff'ta doğrulanmadı.
- **BLOCKED:** Release'i engelleyen dış kabul ya da bilinen eksik davranış.
- **NOT STARTED:** Üretim/mağaza adımı başlatılmadı veya kanıtlanmadı.

## Current capability and release matrix

| Area                                 | Status                              | Current evidence / remaining work                                                                                                                                  |
| ------------------------------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Onboarding                           | IMPLEMENTED / PHYSICAL TEST PENDING | Typography ve reduced-motion-aware one-time entrance source/testte; startup smoothness yeni APK'da görülmeli.                                                      |
| Signup                               | IMPLEMENTED / PHYSICAL TEST PENDING | Confirmation-required, fail-closed kayıt ve güvenli metinler mevcut; fresh Android signup matrisi bekliyor.                                                        |
| Email confirmation                   | CONFIGURATION PENDING               | Dedicated callback ve exact URI kaynakta; Dashboard URL/template/SMTP delivery/log + Android email tap kabulü gerekir. Confirmation kapatılmamalı.                 |
| Login                                | IMPLEMENTED / PHYSICAL TEST PENDING | Supabase password login ve returning-user route var; güncel merged checkpoint APK regression'ı bekliyor.                                                           |
| Password reset                       | BLOCKED                             | PKCE/token_hash/implicit recovery ve cold-start guard düzeltildi/test edildi; fresh Android email linki, one-time consumption, old/new password gerçek kabulü yok. |
| Authenticated password change        | BLOCKED                             | Settings hâlâ `/auth/forgot-password` arbitrary-email flow'una gider; authenticated-account-specific change/re-auth UX tamamlanmamış.                              |
| Supabase migrations                  | DONE                                | 2026-09-02 linked audit: 28/28 local/remote migration eşleşiyor, son `20260901160000`.                                                                             |
| Vehicle loading                      | IMPLEMENTED / PHYSICAL TEST PENDING | Remote schema parity sağlandı; first-failure classification ve safe retry mevcut. Güncel APK authenticated bootstrap bekliyor.                                     |
| Vehicle photo upload                 | IMPLEMENTED / PHYSICAL TEST PENDING | Remote `upload-attachment` v6, parent-aware reservation/attachment ID ve photo RPC hattı var; authenticated 0/1 device upload/open/delete bekliyor.                |
| Maintenance                          | IMPLEMENTED / PHYSICAL TEST PENDING | Event/service details, item split, attachments ve atomic save mevcut.                                                                                              |
| Maintenance packages                 | IMPLEMENTED / PHYSICAL TEST PENDING | Default/user packages ve copy-on-select davranışı mevcut.                                                                                                          |
| Maintenance custom operations        | IMPLEMENTED / PHYSICAL TEST PENDING | `custom:` operasyon add/dedupe/remove/save source/testte.                                                                                                          |
| Fuel OCR                             | IMPLEMENTED / PHYSICAL TEST PENDING | On-device preprocess, partial fields, direct edit/clear, explicit transfer; gerçek fiş matrisi bekliyor.                                                           |
| Maintenance OCR                      | IMPLEMENTED / PHYSICAL TEST PENDING | Header + multi-line item + totals partial parse/review; gerçek fatura/work-order matrisi bekliyor.                                                                 |
| General document OCR                 | IMPLEMENTED / PHYSICAL TEST PENDING | Tür odaklı parser/review/transfer; gerçek ruhsat/sigorta/muayene/ekspertiz matrisi bekliyor.                                                                       |
| Documents/archive                    | IMPLEMENTED / PHYSICAL TEST PENDING | Active/Expiring Soon/Archive mutually-exclusive view; expired auto-delete yok; detail/attachment regression bekliyor.                                              |
| Reminders                            | IMPLEMENTED / PHYSICAL TEST PENDING | Hızlı ay/yıl, max 2040, Free 09:00, Premium custom time, legacy fallback, schedule replace/cancel; Android notification lifecycle bekliyor.                        |
| 3D vehicle                           | IMPLEMENTED / PHYSICAL TEST PENDING | 14 body type → 7 low-poly family, demand render, orbit/pinch/scroll arbitration; Android GPU/gesture acceptance bekliyor.                                          |
| Reports                              | IMPLEMENTED / PHYSICAL TEST PENDING | Premium metrics, trends, comparisons, multi-vehicle ve four motion primitives source/testte; chart/layout/motion Android kabulü bekliyor.                          |
| AI Assistant UI                      | IMPLEMENTED / PHYSICAL TEST PENDING | Home FAB, ASK→RESPONSE, contextual greeting, evidence/suggestions/quota/error state var; keyboard/transition/device UX bekliyor.                                   |
| AI Free quota                        | DONE                                | Client config ve remote `private.max_ai_usage_for_user`: 1 başarılı commit/UTC ay. Failure/local gate tüketmez.                                                    |
| AI Premium quota                     | DONE                                | Merkezi ve remote helper: 50 başarılı commit/UTC ay; Premium truth server entitlement'tan gelir.                                                                   |
| AI provider production/privacy gate  | BLOCKED                             | `vehicle-ai-assistant` remote aktif fakat privacy/provider flags + backend-only key olmadan fail-closed. Real-user provider approval/configuration yok.            |
| Premium paywall                      | IMPLEMENTED / PHYSICAL TEST PENDING | Store metadata seçenekleri, restore ve calm disabled/missing Offering states var; gerçek native Offering/purchase yok.                                             |
| RevenueCat code foundation           | DONE                                | SDK adapter, UUID identity, observer, purchase/restore normalization, trusted webhook handler/RPC source mevcut.                                                   |
| RevenueCat credentials               | CONFIGURATION PENDING               | Repository gerçek key içermez; public Android SDK key ve purchase enable gate EAS/store ortamında ayarlanmadı/doğrulanmadı.                                        |
| Google Play subscription products    | NOT STARTED                         | Product ID/activation için repository kanıtı yok. Fiyat hard-code edilmemeli.                                                                                      |
| Monthly base plan                    | NOT STARTED                         | Play Console + RevenueCat package eşlemesi kanıtlanmadı.                                                                                                           |
| Yearly base plan                     | NOT STARTED                         | Play Console + RevenueCat package eşlemesi kanıtlanmadı.                                                                                                           |
| RevenueCat Offering                  | NOT STARTED                         | Current Offering ve monthly/annual package metadata'sı gerçek ortamda yapılandırılıp doğrulanmadı.                                                                 |
| `premium` RevenueCat entitlement     | CONFIGURATION PENDING               | Identifier source contract'ta `premium`; RevenueCat Dashboard/store linkage doğrulanmadı.                                                                          |
| RevenueCat webhook                   | CONFIGURATION PENDING               | Migration/RPC remote; `revenuecat-webhook` source'ta fakat 2026-09-02 remote function listesinde yok. Secret + deploy + event tests gerekir.                       |
| Test purchase                        | NOT STARTED                         | Google Play license tester ve yeni RevenueCat-native Play build gerekir.                                                                                           |
| Restore purchase                     | IMPLEMENTED / PHYSICAL TEST PENDING | Mocked adapter/UI var; gerçek Google Play/RevenueCat restore kabulü yok.                                                                                           |
| Account-switch entitlement isolation | IMPLEMENTED / PHYSICAL TEST PENDING | Sequence guard, logout/listener/state clear mocked tests var; iki license-test hesabıyla device kabulü yok.                                                        |
| EPDK reference-price foundation      | IMPLEMENTED / PHYSICAL TEST PENDING | Provider/parser/cache/Smart Fuel suggestion fail-closed; production traffic/legal reuse approval yok.                                                              |
| Final APK                            | NOT STARTED                         | Checkpoint sonrası önce local production JS bundle, sonra explicit EAS preview APK gerekir.                                                                        |
| Final physical QA                    | BLOCKED                             | Yeni APK olmadan auth, CRUD, OCR, 3D, photo, reminders, AI/paywall ve long-list matrisi kabul edilemez.                                                            |
| Final AAB                            | NOT STARTED                         | Preview APK ve blocker gate'leri geçmeden production AAB üretilmemeli.                                                                                             |
| Google Play production rollout       | BLOCKED                             | Physical acceptance, auth/email, billing/provider, legal/operational release gates ve final AAB yok. Otomatik publish yasak.                                       |

## Remote state verified during handoff

- Migration history: local/remote 28/28 eşleşiyor.
- Active Edge Functions: `upload-attachment` v6, `delete-account` v1,
  `reconcile-attachments` v3, `vehicle-ai-assistant` v1.
- Not deployed/listed: `revenuecat-webhook`.
- No remote write, migration deploy, function deploy, EAS build veya Play action bu handoff'ta yapılmadı.

## Next safe release sequence

1. `claude/final-qa-fixes` dalında önce bu açık blocker'ların root cause/acceptance gereksinimlerini
   task/spec ile ele al; checkpoint tag'ini koru.
2. Authenticated password-change UX'i ve gerekli auth regression'larını tamamla; Dashboard
   redirect/template/SMTP durumunu insanla doğrula.
3. `npx expo export:embed --eager --platform android --dev false` ve ilgili test/lint/type/diff
   kontrollerini geçir.
4. Kullanıcının açık talimatıyla preview APK üret; production AAB üretme.
5. Fiziksel Android'de auth, vehicle bootstrap/photo, kayıt/OCR, 3D gesture, reminders,
   reports/AI/paywall/keyboard matrisi kaydedilerek kabul edilsin.
6. RevenueCat için Play products/base plans, `premium` entitlement, Offering, public SDK key,
   webhook secret/deploy ve license-test purchase/restore/account switch'i ayrı trusted süreçte yap.
7. Gemini/EPDK real-user production gates yalnız privacy/legal/commercial onay ve trusted backend
   configuration sonrası açılabilir.
8. Bütün release blocker'ları kanıtla kapandıktan sonra final AAB ve Google Play production rollout
   için ayrı insan onayı al.

## Known documentation drift

`docs/project-status.md`, `docs/database.md`, `docs/release-readiness.md` ve bazı task completion
notları farklı tarihlerin kanıtını taşır; örneğin eski remote migration/backlog ifadeleri bugün
geçerli değildir. Bunları silme veya geçmiş kanıtı yeniden yazma. İşe başlamadan remote state'i
yeniden ölç ve yeni tarihli status/release belgesini açıkça güncelle.
