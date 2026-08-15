# Free / Premium entitlement foundation

Bu belge TASK-028 entitlement sözleşmesinin source-of-truth belgesidir; fiyat, billing veya görünür
paket ekranı değildir. TASK-036 ile RevenueCat satın alma/subscription kaynağı olarak eklenmiştir;
hangi feature ve limitin açılacağını yine yalnız bu merkezi entitlement sözleşmesi belirler.

## Güvenilir plan kaynağı

`public.user_entitlements` yalnız gelecekteki billing/support/server akışları tarafından yazılabilir.
Authenticated mobil istemci yalnız kendi satırını okuyabilir. Satır yoksa, geçersizse, süresi bittiyse
veya okuma başarısızsa sonuç **Free** olur. Kota/Storage gibi güvenlik duyarlı server işlemleri client
sonucuna güvenmez; planı server-side `private.effective_plan_for_user` ile yeniden çözer.
RevenueCat CustomerInfo mobilde capability yetkisi vermez. Trusted webhook, backend-only kimlik
doğrulamasından sonra service-role-only RPC ile bu satırı idempotent biçimde günceller. Client
satın alma sonucu veya `isPremium` boolean'ı server kotasını değiştiremez.

## Merkezi capability sözleşmesi

`src/features/entitlements/domain/entitlements.ts` tek kaynaktır. Gelecek ekranlar dağınık
`isPremium` koşulları eklemez; capability kullanır. `canCreateVehicle` yeni araç aksiyonlarının,
`getOcrInvocationPolicy` TASK-031 OCR, `getAiAssistantPolicy` ise TASK-035 AI kullanımının merkezi
istemci görünüm hook'udur. Gerçek enforcement server-side plan resolver ile yapılır.

| Capability                                                  |        Free |                Premium |
| ----------------------------------------------------------- | ----------: | ---------------------: |
| Yeni araç                                                   |           1 |                      3 |
| OCR aylık başarılı tarama                                   |           3 |                     30 |
| Kayıt başına ek dosya / byte                                |   5 / 15 MB |             10 / 30 MB |
| Kullanıcı Storage bütçesi                                   |       25 MB |                 100 MB |
| Araç fotoğrafı                                              |           1 |                      5 |
| Gelişmiş rapor, yakıt fiyat uyarısı, gelişmiş bildirim/rota |       Hayır | Özellik uygulandığında |
| Yeni hatırlatıcı için özel bildirim saati                   | 09:00 sabit |                    Var |
| Araç Asistanı aylık başarılı yanıt                          |           3 |                     50 |

Mechanic sharing, OBD ve bağlı araç capability'leri yalnız future-ready tanımdır. AI capability'si
TASK-035'te server-authoritative kota ve fail-closed provider gate ile etkinleştirilmiştir. Değerler
konservatif başlangıç yapılandırmasıdır, nihai ticari
karar değildir. Downgrade veri silmez; yalnız gelecekte limit üstü yeni aksiyonları engeller.

RevenueCat kurulumu, public/secret anahtar sınırı ve post-freeze store/deployment işleri için
[billing foundation belgesine](../billing/revenuecat-premium-foundation.md) bakın.
