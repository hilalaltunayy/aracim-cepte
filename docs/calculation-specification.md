# Hesaplama spesifikasyonu

Referans fixture tarihi `2026-07-15`, kullanıcı takvimi ve gösterim dili `tr-TR`’dir.

## Gider kapsamı

- `fuel`, `maintenance` ve `expense` türündeki tüm geçerli kayıt tutarları giderdir.
- Tutar sonlu ve sıfırdan büyük olmalıdır.
- `NaN`, `Infinity`, sıfır ve negatif değerler hesaplamaya katılmaz; veritabanı da
  `amount > 0` kuralını uygular.
- Düzenlenmiş kaydın yalnızca güncel hali sayılır.
- Silinen kayıt hiçbir istatistiğe dahil edilmez.

## Tarih ve ay sınırları

- `record_date` bir PostgreSQL `date` ve uygulamada `YYYY-MM-DD` date-only değeridir.
- Date-only değerler parse edilirken gün kaymasını önlemek için yerel saat 12:00 kullanılır.
- Ay anahtarı kullanıcının yerel takviminde `YYYY-MM` biçimindedir.
- Cari ay, anchor tarihinin yerel yıl ve ayıdır.
- Önceki ay takvimsel bir önceki aydır; Ocak → Aralık yıl geçişi desteklenir.
- Artık yıl günleri gerçek takvim doğrulamasından geçer.
- Gelecek tarihli kayıtlar MVP’de izinlidir ve ait olduğu aya yazılır.

## Cari ay tür toplamları

Her tür için:

```text
SUM(valid amount WHERE record_date startsWith current YYYY-MM AND record_type = type)
```

Cari ay toplamı üç tür toplamının toplamıdır.

## Önceki ay karşılaştırması

```text
absolute_change = current_month_total - previous_month_total
percentage_change = absolute_change / previous_month_total * 100
```

Önceki ay toplamı sıfırsa `percentage_change = null` olur. UI yüzde veya sonsuz
değer göstermez; karşılaştırma için önceki ay verisi gerektiğini söyler.

## Son altı ay grafiği

- Anchor ay dahil son altı takvim ayı eskiden yeniye sıralanır.
- Eksik aylar `0` toplamla gösterilir.
- Yıl sınırı normal takvim aritmetiğiyle geçilir.

## Tüm zamanlar toplamı

```text
SUM(all valid record amounts)
```

## Kategori yüzdeleri

Bu sürümde üst kategori kayıt türüdür:

```text
type_percentage = type_all_time_total / all_time_total * 100
```

- Hesaplama tam hassasiyetle yapılır.
- UI/test karşılaştırması iki ondalığa yuvarlanır.
- Boş veri kümesinde her tür `0` ve `%0` döner.
- Yuvarlanmış yüzdelerde çok küçük toplam sapması teorik olarak mümkündür; fixture sonucu tam `%100,00`’dır.

## Toplam yakıt litresi

Yalnızca `record_type = fuel` olan, sonlu ve pozitif litre değerleri toplanır.

## Kilometre başına maliyet

1. Kilometresi olan kayıtlar tarih ve oluşturulma zamanına göre kronolojik sıralanır.
2. En az iki kilometre kaydı gerekir.
3. Kronolojik kilometre hiçbir noktada azalamaz; azalıyorsa sonuç `null` olur.
4. İlk ve son kilometre farkı sıfırdan büyük olmalıdır.
5. İlk ve son kilometre kayıt tarihleri arasındaki tüm geçerli giderler toplanır.
   Bu tarih aralığındaki kilometre içermeyen kayıtlar da maliyete dahildir.
6. Formül:

```text
cost_per_km = in_range_total_expense / (last_km - first_km)
```

Tek kilometre, yalnızca eşit kilometreler, azalan kilometre, geçersiz değer veya
sıfır mesafe için sonuç `null`’dır. `NaN` ve `Infinity` UI’ya taşınmaz.

## Deterministik fixture beklenenleri

| İstatistik               |                                                          Beklenen |
| ------------------------ | ----------------------------------------------------------------: |
| Cari ay yakıt            |                                                         ₺4.156,00 |
| Cari ay bakım            |                                                         ₺3.250,75 |
| Cari ay diğer            |                                                           ₺645,25 |
| Cari ay toplam           |                                                         ₺8.052,00 |
| Önceki ay toplam         |                                                         ₺2.500,00 |
| Mutlak değişim           |                                                         ₺5.552,00 |
| Yüzde değişim            |                                                     %222,08 artış |
| Altı ay                  | ₺2.000,00 · ₺0,00 · ₺6.000,00 · ₺2.100,25 · ₺2.500,00 · ₺8.052,00 |
| Toplam litre             |                                                          353,75 L |
| Tüm zamanlar             |                                                        ₺27.552,35 |
| Yakıt payı               |                                                            %55,92 |
| Bakım payı               |                                                            %37,39 |
| Diğer payı               |                                                             %6,69 |
| Kilometre başına maliyet |                                                          ₺3,15/km |
