# Free / Premium entitlement foundation

Bu belge TASK-028 entitlement sözleşmesinin source-of-truth belgesidir; fiyat, billing veya görünür
paket ekranı değildir.

## Güvenilir plan kaynağı

`public.user_entitlements` yalnız gelecekteki billing/support/server akışları tarafından yazılabilir.
Authenticated mobil istemci yalnız kendi satırını okuyabilir. Satır yoksa, geçersizse, süresi bittiyse
veya okuma başarısızsa sonuç **Free** olur. Kota/Storage gibi güvenlik duyarlı server işlemleri client
sonucuna güvenmez; planı server-side `private.effective_plan_for_user` ile yeniden çözer.

## Merkezi capability sözleşmesi

`src/features/entitlements/domain/entitlements.ts` tek kaynaktır. Gelecek ekranlar dağınık
`isPremium` koşulları eklemez; capability kullanır. `canCreateVehicle` yeni araç aksiyonlarının,
`getOcrInvocationPolicy` ise TASK-031 OCR kullanım sayımının merkezi hook'udur.

| Capability | Free | Premium |
| --- | ---: | ---: |
| Yeni araç | 1 | 3 |
| OCR aylık bütçe (henüz enforce edilmez) | 3 | 30 |
| Kayıt başına ek dosya / byte | 5 / 15 MB | 10 / 30 MB |
| Kullanıcı Storage bütçesi | 25 MB | 100 MB |
| Araç fotoğrafı | 1 | 5 |
| Gelişmiş rapor, yakıt fiyat uyarısı, gelişmiş bildirim/rota | Hayır | Özellik uygulandığında |

AI, mechanic sharing, OBD ve bağlı araç capability'leri yalnız future-ready tanımdır; TASK-028
bunları veya Premium UI'ı uygulamaz. Değerler konservatif başlangıç yapılandırmasıdır, nihai ticari
karar değildir. Downgrade veri silmez; yalnız gelecekte limit üstü yeni aksiyonları engeller.
