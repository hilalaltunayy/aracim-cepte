@AGENTS.md

# Claude Code çalışma sözleşmesi

Bu dosya Claude Code için repository-özel ek talimattır. `AGENTS.md` birincil güvenlik, kapsam,
test ve release kurallarını taşır; ikisini birlikte uygula. Durum bilgisi için önce
`docs/handoff/CLAUDE_CURRENT_STATE.md`, mimari bağlam için
`docs/handoff/CLAUDE_PROJECT_CONTEXT.md`, Supabase envanteri için
`docs/handoff/CLAUDE_SUPABASE_MAP.md` okunmalıdır. Eski tarihli durum belgelerini güncel checkpoint
kanıtı gibi yorumlama.

## PROJECT IDENTITY

Aracım Cepte, Türkiye'deki kişisel araç sahiplerinin araçlarını, kilometreyi, yakıt/bakım/diğer
giderleri, hatırlatıcıları, belgeleri, ekspertizi, notları ve araç fotoğraflarını tek Android-öncelikli
mobil deneyimde yönetmesini sağlar. Temel amaç güvenilir kayıt, kullanıcıya ait kalıcı veri ve
anlaşılır Türkçe UX'tir.

Ürün merkezi Free/Premium entitlement modeli kullanır. Free kayıt ve takip tabanını sağlar;
Premium çoklu araç, daha yüksek kotalar, gelişmiş raporlar ve özel hatırlatma saati gibi merkezi
capability'leri açar. Ödeme durumu ayrı, güvenilir RevenueCat/Supabase hattından entitlement'a
eşlenir; ekranlar RevenueCat SDK nesnelerine veya dağınık `isPremium` kontrollerine bağlanmaz.

Google Play'de `1.0.0` / Android `versionCode: 2` tarihsel closed-test AAB'si vardır. Güncel kaynak
checkpoint'i bu artifact'tan ileridedir ve yeni preview APK üzerinde fiziksel Android kabulü
gerektirir. Preview kabul edilmeden production AAB veya rollout yapılmaz.

## TECH STACK

- Expo SDK 57, React Native 0.86.2, React 19.2.3 ve strict TypeScript 6.
- Expo Router (`expo-router/entry`) ve React Native `StyleSheet` tabanlı UI.
- Zustand ve AsyncStorage ile oturum dışı uygulama/tercih durumu.
- Supabase Auth, Postgres, RLS, private Storage ve Edge Functions.
- RevenueCat `react-native-purchases`; public SDK anahtarları mobilde, webhook secret'ı backend'de.
- Cihaz üzerinde `expo-mlkit-ocr` ve `expo-image-manipulator` ile OCR.
- `@react-three/fiber/native`, `three`, `expo-gl` ve gesture-handler ile düşük poligonlu 3D araç.
- Deterministik Vehicle Intelligence ve server-side Gemini adapter'lı AI Assistant temeli.
- EAS Build: internal APK `preview`, app-bundle `production`; Google Play Android dağıtımı.
- Vitest, React Test Renderer, ESLint/Expo ESLint ve Prettier.

Repository'de olmayan servis veya framework'ü varmış gibi belgeleme ya da ekleme.

## REPOSITORY STRUCTURE

- `src/app`: Expo Router route ve ekran kompozisyonu. Runtime route ağacıdır.
- `src/domain`: Platformdan bağımsız entity, draft ve `AppRepository` sözleşmeleri.
- `src/data`: Supabase client, generated DB tipleri, mapper, repository ve private Storage erişimi.
- `src/features`: Özellik domain'i, servisleri, provider adapter'ları ve feature UI bileşenleri.
- `src/shared`: Tema/tokens, ortak bileşenler, validasyon ve saf yardımcılar.
- `src/store`: Auth ve araç/veri Zustand store'ları; active vehicle seçimi ve bootstrap.
- `supabase/migrations`: İleri yönlü schema/RLS/RPC geçmişi; uygulanmış dosyaları yeniden yazma.
- `supabase/functions`: Trusted Edge Functions ve test edilebilir `_shared` handler/provider'lar.
- `supabase/tests`: SQL güvenlik, RLS, kota ve idempotency fixture'ları.
- `tests`: Route ağacının dışında tutulması gereken render/integration testleri.
- `docs`: Ürün, mimari, güvenlik, QA, release ve handoff kanıtı.
- `tasks`: PLANS.md biçimindeki aktif/review/completed task planları.
- `scripts`: QA, remote probe ve yalnız araştırma/POC araçları.

`src/app` altına `*.test.*`, fixture veya Node-only test utility koyma. Expo Router eager route
discovery bu dosyaları Metro graph'ına alır; Vitest → Vite → Node runtime Android bundle'ını bozar.

## ARCHITECTURE RULES

- Route'lar ekran kompozisyonu yapar; SQL/Supabase ayrıntısı `src/data` repository ve feature
  servislerinde kalır. Saf hesaplamalar domain/shared katmanında test edilir.
- Ekran → Zustand action → `AppRepository` → `SupabaseAppRepository` → mapper/domain akışını koru.
- Supabase session uzak kimlik kaynağıdır. AsyncStorage yalnız onboarding, active vehicle ve tema
  gibi uygun istemci durumlarını saklar.
- Active vehicle bütün ilgili query/mutation/report/intelligence akışlarında korunur.
- Entitlement capability ve sayısal limitlerin kaynağı
  `src/features/entitlements/domain/entitlements.ts` dosyasıdır. Hassas enforcement server-side'dır.
- OCR ve AI kotası reserve → commit → release yaşam döngüsüyle yalnız başarılı kullanımda tüketilir.
- Private ekler owner/vehicle/parent scoped, tahmin edilemez path, metadata RPC ve kısa ömürlü signed
  URL üzerinden çalışır. Başarılı UI sonucu remote mutation tamamlanmadan gösterilmez.
- Auth recovery `aracimcepte://auth/reset-password` callback'ini PKCE `code`, recovery
  `token_hash` veya implicit recovery session biçiminde tek kez işler; recovery guard'ı reset
  ekranını login yönlendirmesinden önce tutar. Confirmation ayrı callback'tir.
- Hatırlatıcıda Free yeni saat 09:00, Premium `customReminderTime`; legacy null saat 09:00 fallback.
- OCR ilkesi: detect/preprocess → parse → editable review/clear → explicit form transfer → normal
  `Kaydet`. OCR hiçbir kaydı otomatik kaydetmez ve eksik değeri uydurmaz.
- Vehicle Intelligence gerçek kayıtları normalize facts/trends/signals/confidence/scores'a çevirir.
  AI yalnız minimize context ve canonical evidence code kullanır; iç skorlar kullanıcıya sağlık
  teşhisi gibi sunulmaz.
- AI yanıtı structured schema, evidence allowlist, out-of-domain/live-data gate ve deterministic
  safety override'dan geçer. Model canlı fiyat/konum veya kesin mekanik teşhis kaynağı değildir.

## SECURITY RULES

Claude hiçbir zaman:

- RLS'i kapatmaz veya ownership koşulunu `true`/geniş permissive policy ile değiştirmez.
- `service_role`, provider secret, webhook secret, DB parolası ya da tokenı mobil koda,
  `EXPO_PUBLIC_*`, loga, test fixture'ına veya dokümana koymaz.
- Private Storage bucket'ını public yapmaz; kısa signed URL sınırını atlamaz.
- Başka kullanıcı/araç verisine erişimi mümkün kılmaz veya caller-supplied `user_id`'ye güvenmez.
- Client Premium durumunu, entitlement'ı, planı veya kota sayacını authorization gerçeği saymaz.
- Server-authoritative reserve/commit/release kotalarını bypass etmez.
- Password, recovery token/hash, access/refresh token, OCR ham metni, ek gövdesi veya AI private
  context'ini loglamaz.

Owner isolation, private Storage, server-authoritative Premium/kota durumu, authenticated UUID
kimliği, fail-closed provider gates ve amaçla sınırlı AI context her değişiklikte korunmalıdır.

## SUPABASE WORKING RULES

Supabase bağlantısı varsa gerekli işlem için önce current remote state'i oku, local migration ve
generated tiplerle karşılaştır, yalnız güvenli ve görevce izinli forward değişikliği uygula, sonra
remote sonucu doğrula. Erişilebilir CLI/MCP ile güvenli biçimde yapılabilen teknik işi kullanıcıya
devretme; yalnız gerçekten Dashboard/store/harici insan yetkisi gerektiren adımı manuel iste.

- Migration'lar additive ve forward-compatible olmalı; uygulanmış migration dosyasını değiştirme,
  geçmişi yeniden yazma veya applied migration'ı körlemesine tekrar çalıştırma.
- Remote `migration list`, function list, RLS/grant ve hedef proje doğrulanmadan deploy yapma.
- Destructive schema/data işlemi için açık kullanıcı izni gerekir.
- Yeni user-owned tabloda RLS + owner negatif testi; `SECURITY DEFINER` RPC'de `search_path=''`,
  `auth.uid()`/ownership kontrolü ve dar grant gerekir.
- Client self-upgrade yolu açılamaz. RevenueCat webhook RPC'si service-role-only kalır.
- Remote envanterin 2026-09-02 checkpoint'i için `docs/handoff/CLAUDE_SUPABASE_MAP.md` kullan;
  yeniden doğrulamadan güncel varsayma.

## GIT RULES

Claude yalnız `claude/final-qa-fixes` dalında/worktree'sinde çalışır. Her iş öncesi branch, status,
upstream ve dirty dosyaları raporlar. Kullanıcı değişikliklerini korur.

- `main` veya `develop` içine otomatik merge yapma.
- Force-push, history rewrite, destructive reset, mevcut branch/tag silme yapma.
- Kullanıcı açıkça istemedikçe push yapma.
- `pre-claude-handoff-2026-09` checkpoint tag'ini değiştirme, taşıma veya silme.
- Riskli Git işleminden önce exact ref/SHA ve rollback yolunu göster.
- İlgisiz dirty dosyayı stage, format, discard veya overwrite etme.

## BUILD / RELEASE RULES

- Önce preview APK, fiziksel Android kabulü, sonra production AAB.
- APK/AAB üretme, Google Play'e yükleme, tester track veya rollout'u değiştirme ancak açık kullanıcı
  talimatıyla yapılır; otomatik publish yoktur.
- Android package `com.hilalaltunay.aracimcepte`, signing/EAS credential kimliği ve mevcut versioning
  açık gerekçe/onay olmadan değişmez.
- EAS build harcamadan önce ilgili production JavaScript bundle'ını yerelde şu sınıfta bir komutla
  doğrula: `npx expo export:embed --eager --platform android --dev false`.
- Web export native davranış veya Android kabul kanıtı değildir.

## TESTING RULES

Değişiklik riskine göre önce odaklı domain/render/Edge/SQL regression testlerini çalıştır. İlgili
changed-file ESLint, scoped veya tam TypeScript ve `git diff --check` zorunludur. Runtime graph/build
değişikliğinde local Android production bundle doğrulaması yap.

Geniş/security/native/release işlerinde `npm run typecheck`, `npm run lint`, `npm test`, Supabase
negatif testleri ve fiziksel cihaz kontrolünü kapsamla orantılı değerlendir. Çalıştırılmayanı veya
önceden mevcut unrelated failure'ı yeni regression'dan ayrı raporla. TypeScript/lint tek başına
ürün, güvenlik veya fiziksel kabul değildir.

## LARGE ISSUE WORKFLOW

1. İlgili Markdown issue/spec/QA dosyalarının tamamını editten önce oku.
2. `PLANS.md` biçiminde yaşayan execution plan oluştur/güncelle.
3. İlk gerçek hatayı ve kök nedeni kanıtla; genel ağ mesajını kök neden sayma.
4. Batch'i bütüncül uygula; mevcut çalışan davranış ve dirty kullanıcı dosyalarını koru.
5. Güvenlik/gizlilik ve exact diff incelemesi dahil uygun otomatik validasyonu çalıştır.
6. Root cause, dosyalar, uygulanan/değişmeyen noktalar, failed/skipped ve manuel kabulü açıkça raporla.
7. Dokümante batch varken tekrar tekrar küçük ad-hoc düzeltme yapma.

Claude güvenle gerçekleştirebildiği teknik değişikliği kullanıcıya komut olarak bırakmamalıdır;
ancak satın alma, e-posta teslimi, fiziksel cihaz ve Play Console gibi gerçek insan/harici kabulünü
tamamlanmış gibi göstermemelidir.
