# AI Vehicle Assistant Foundation

TASK-035, araç sahibinin açık sorusu üzerine çalışan, geçmiş konuşma tutmayan **ASK → RESPONSE**
temelidir. Home veya mevcut araç akışlarını yeniden tasarlamaz.

## Güven sınırı ve akış

Mobil uygulama yalnız authenticated Supabase oturumu ile `vehicle-ai-assistant` Edge Function'ını
çağırır. Function kimliği JWT'den alır, araç sahipliğini RLS-scoped istemciyle doğrular, TASK-034
biçiminde minimize edilmiş bağlam üretir, deterministik domain/canlı-veri/güvenlik kontrollerini
uygular, AI kotasını rezerve eder ve provider adapter'ını çağırır. Doğrulanmış yanıt sonrası kota
commit edilir; her hata rezervasyonu release eder.

Mobil koda Gemini veya service-role secret konmaz. Provider interface'i Gemini türlerini ürün/domain
katmanına sızdırmaz. İlk adapter, resmi
[Gemini Interactions API](https://ai.google.dev/api/interactions-api-v1) üzerinden stabil
`gemini-3.6-flash` modelini `store=false` ve JSON Schema response formatıyla çağırır.

## Gizlilik ve grounding

Edge Function yalnız gerekli kolonları seçer. Provider bağlamı; deterministik araç facts, trend,
signal, confidence/data-quality alanlarıyla sınırlıdır. Plaka, e-posta/ad, notlar, OCR metni,
attachment metadata/gövdesi, belge numarası ve görseller seçilmez veya gönderilmez. Yanıttaki her
`factCode`, gönderilen context'ten üretilen canonical allowlist içinde olmalıdır; aksi yanıt geçersiz
sayılır ve kota tüketmez.

## Guardrail davranışı

- Açıkça araç dışı ve yalnız canlı fiyat/konum/trafik isteyen sorular provider'a gitmeden yerelde
  yanıtlanır ve kota tüketmez.
- Karma sorularda desteklenen araç yorumu korunur; canlı bölüm için `externalDataRequired=true` olur.
- Fren, direksiyon, duman/yangın, hararet ve yakıt kaçağı gibi kritik ifadelerde deterministik safety
  override model çıktısına üstün gelir. Kesin mekanik teşhis dili normalize edilir.
- Teknik hata, timeout, rate limit, malformed/schema/grounding hatası sıfır kullanım tüketir.

## Kota ve production enablement

UTC takvim ayı için Free **3**, Premium **50** başarılı yanıt kullanır. `ai_usage_reservations` ve
authenticated-only RPC'ler advisory lock ile paralel aşımı engeller. Soru, yanıt ve context tabloda
tutulmaz. Downgrade veri silmez.

Gerçek provider trafiği varsayılan olarak kapalıdır. Trusted Edge ortamında aşağıdakilerin tümü
olmadan provider oluşturulmaz:

- `AI_VEHICLE_ASSISTANT_ENABLED=true`
- `AI_PROVIDER_PRIVACY_APPROVED=true`
- `AI_VEHICLE_ASSISTANT_PROVIDER=gemini` (varsayılan adapter)
- `GEMINI_API_KEY`

Free Tier gerçek kullanıcı bağlamı için onay sayılmaz. Privacy/legal ve uygun ticari veri işleme
kararı tamamlanmadan iki approval flag'i etkinleştirilmemelidir. Gelecekte EPDK, Places/POI ve Routing
ayrı deterministic tool adapter'ları olarak eklenebilir; model bu canlı verilerin kaynağı değildir.

## Operasyon ve rollback

Remote migration/Function deploy bu görevde yapılmaz. Rollback, route/function'ın geri alınması ve
AI RPC execute grant'lerinin ileri migration ile kapatılmasıdır; mevcut kullanıcı verisi silinmez.
