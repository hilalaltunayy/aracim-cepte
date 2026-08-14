# Gemini Free Tier vs Groq Free Tier

**Araştırma tarihi:** 2026-08-15
**Kapsam:** RESEARCH-003; runtime kodu, Edge Function ve bağımlılık değişikliği yoktur.

## Kısa karar

İlk seçimden önce iki sağlayıcıyla sentetik veri kullanan küçük bir POC yapılması önerilir (**C — provider abstraction + POC both**). Resmî dokümanlarda Türkçe araç-bakım kalitesi için karşılaştırılabilir benchmark bulunmadı; bu nedenle Türkçe sonuç kalitesi **NEEDS POC**. Gemini ücretsiz hizmeti prompt/yanıtların ürün geliştirme ve insan incelemesinde kullanılabileceğini ve hassas/kişisel bilgi gönderilmemesi gerektiğini söylüyor. Bu nedenle gerçek kullanıcı bağlamı için Free Tier **RED**. Groq varsayılan olarak inference verisini tutmuyor; ancak güvenilirlik/kötüye kullanım logları, ABD veri konumu ve şartların hukuki yorumu nedeniyle Free Tier **YELLOW**. Üretimden önce ücretli/DPA/ZDR ve KVKK-hukuk incelemesi gerekir.

POC için teknik öncelik verilirse `openai/gpt-oss-20b` (Groq) daha öngörülebilir Free limitleri ve katı JSON Schema desteği nedeniyle ilk adaydır. `gemini-2.5-flash` güçlü ikinci adaydır; Gemini paid geçişi ve çok geniş bağlamı değerlendirilecektir.

## Adaylar ve limitler

| Konu | Gemini | Groq |
|---|---|---|
| Önerilen model | `gemini-2.5-flash` — stable, 1,048,576 input token, function calling ve structured output | `openai/gpt-oss-20b` — production model, 131,072 context, hızlı ve düşük fiyatlı |
| Free API | Var; model/proje/tier erişimi değişebilir | Var; kuruluş/proje limitleri değişebilir |
| Resmî Free limit | Tek bir sabit 2.5 Flash RPM/TPM/RPD yayınlanmıyor; AI Studio’da proje/model bazında görülür. RPD Pacific gece yarısında sıfırlanır | Free tabloda `gpt-oss-20b`: 30 RPM, 1K RPD, 8K TPM, 200K TPD |
| Kapsam | Project bazlı, API key bazlı değil | Organization/project bazlı; istisnalar ve özel limitler olabilir |
| Kart | Free için zorunluluk resmî dokümanda açık değil; paid geçişte billing gerekir | Free için zorunluluk açık değil; Developer paid upgrade için geçerli ödeme yöntemi gerekir |
| Limit davranışı | Dinamik olabilir; kapasite garanti edilmez | 429 ve rate-limit başlıkları; limitler değişebilir |

Kaynaklar: [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits), [Gemini model](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash), [Groq rate limits](https://console.groq.com/docs/rate-limits), [Groq models](https://console.groq.com/docs/models), [Groq deprecations](https://console.groq.com/docs/deprecations).

## Yapılandırılmış çıktı ve araçlar

Gemini JSON Schema/structured output ve function calling sunuyor; yine de resmî doküman semantik doğruluğun garanti edilmediğini, uygulama doğrulaması gerektiğini belirtiyor. Groq’ta strict `json_schema` constrained decoding `openai/gpt-oss-20b` ve `openai/gpt-oss-120b` ile destekleniyor; diğer modellerde yalnızca best-effort/JSON syntax olabilir. Her iki sağlayıcı da gelecekteki function/tool çağrılarına uygundur; Groq Responses API beta olduğundan ilk entegrasyonda standart chat-completions uyumlu HTTPS tercih edilmelidir.

Kaynaklar: [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output), [Gemini function calling](https://ai.google.dev/gemini-api/docs/function-calling), [Groq structured outputs](https://console.groq.com/docs/structured-outputs), [Groq OpenAI compatibility](https://console.groq.com/docs/openai).

## Supabase Edge Functions

Her iki API de HTTPS `fetch` ile Deno Edge Function’dan çağrılabilir. Başlangıçta sağlayıcı SDK’sı yerine küçük server-side fetch adaptörleri daha az runtime bağımlılığı taşır. Anahtarlar yalnızca Supabase Edge Function secrets içinde (`Deno.env.get`) tutulmalı; Expo istemcisine konulmamalıdır. Akış: auth → AI quota (Free 3 / Premium 50 başarılı soru/ay) → TASK-034 daraltılmış context → sağlayıcı → JSON Schema doğrulaması → güvenli yanıt.

Kaynaklar: [Supabase Edge Functions](https://supabase.com/docs/guides/functions), [Function secrets](https://supabase.com/docs/guides/functions/secrets).

## Gizlilik ve ticari kullanım

- **Gemini Free: RED.** Google unpaid services için içerik/yanıtları ürün ve ML geliştirmede kullanabileceğini, insan değerlendiricilerin erişebileceğini ve hassas/kişisel bilgi gönderilmemesi gerektiğini bildiriyor. Paid hizmette ürün geliştirme kullanımı yok ve DPA yolu var: [Gemini terms](https://ai.google.dev/gemini-api/terms), [pricing](https://ai.google.dev/gemini-api/docs/pricing).
- **Groq Free: YELLOW.** Varsayılan inference retention yok; reliability/abuse amacıyla en fazla 30 güne kadar log, ABD’de veri işleme ve ZDR koşulları dokümante edilmiş: [Groq data privacy](https://console.groq.com/docs/your-data), [Services Agreement](https://console.groq.com/docs/legal/services-agreement).
- Her iki Free katmanda gelir elde eden uygulamanın ticari kullanım hakkı resmî sayfalarda tek cümleyle garanti edilmediğinden **MANUAL LEGAL/TERMS CONFIRMATION REQUIRED**. Free yalnız geliştirme/sentetik veri için uygun kabul edilmelidir; gerçek kullanıcı bağlamı için ücretli şartlar, DPA/ZDR ve KVKK incelemesi gerekir.

TASK-034’ten yalnızca plaka, ham OCR, notlar ve ek gövdelerini dışlayan normalize facts/signals gönderilmesi doğru minimizasyondur; ancak bu, Gemini Free’ın RED sınıfını değiştirmez. Hiçbir model güncel EPDK fiyatı, istasyon, trafik veya mekanik gerçeklik kaynağı değildir; bunlar gelecekte ayrı araçlarla sağlanmalıdır.

## Erken kullanım uygunluğu

Premium kotasının tamamının kullanıldığı üst sınırda 10/50/100 aktif kullanıcı yaklaşık 17/83/167 soru/gün (500/2.500/5.000 ayda) üretir. Groq’un 1K RPD’si bu ortalamaları karşılar; 8K TPM burst sırasında muhtemel darboğazdır. Gemini’nin kesin Free limitleri hesap/proje bazlı olduğundan kullanıcı sayısı garanti edilemez. Küçük context ve çıktı tavanı, merkezi backoff/429 yönetimi ve kota servisi gereklidir.

## POC skor kartı (1 düşük — 5 yüksek)

| Kriter | Gemini | Groq | Not |
|---|---:|---:|---|
| Free pratikliği | 3 | 4 | Gemini limitleri belirsiz; Groq limitleri yayımlı ama TPM dar |
| Türkçe | 3 | 3 | Resmî karşılaştırmalı kanıt yok; A/B POC |
| Structured output | 5 | 5 | Groq strict schema yalnız GPT-OSS modellerinde |
| Tool calling | 5 | 4 | Groq Responses API beta |
| Edge uyumu | 4 | 4 | Plain fetch ile uygun |
| Free gizlilik | 1 | 3 | Gemini eğitim/inceleme riski; Groq retention/ZDR koşulları |
| Paid ölçekleme | 5 | 4 | İkisinde de paid yol var |
| Gecikme | 4 | 5 | Groq GPT-OSS-20B çok hızlı |
| Model kararlılığı | 4 | 4 | Groq eski Llama modellerini emekliye ayırıyor |

## TASK-035 için sözleşme

`VehicleAssistantProvider` arayüzü (`GeminiVehicleAssistantProvider`, `GroqVehicleAssistantProvider`) UI/domain’den ayrılmalıdır. Çıktı `answer`, `domain`, `severity`, `evidence[]`, `suggestions[]`, `safetyEscalation` alanlarıyla doğrulanmalı; açıkça araç dışı sorular ucuz deterministic gate ile LLM çağrısı yapılmadan reddedilmelidir. Belirsiz sorular için sağlayıcıya gidilebilir, fakat yanıt yalnız TASK-034 kanıtlarına dayanmalı ve tanı iddiası içermemelidir.

**Sonraki karar:** Her iki sağlayıcıyla sentetik Türkçe POC → schema/latency/safety ölçümü → ücretli ve hukuken onaylı tek sağlayıcı seçimi. Üretim gerçek kullanıcı context’i için mevcut Free katmanlar uygun kabul edilmemelidir.
