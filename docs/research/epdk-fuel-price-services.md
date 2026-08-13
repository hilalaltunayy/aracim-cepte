# EPDK akaryakit fiyat XML/web servisleri fizibilitesi

**Arastirma tarihi:** 13 Agustos 2026
**Kapsam:** Resmi EPDK sayfalari, WSDL/XSD semalari, EPDK kilavuzlari ve dusuk hacimli ornek SOAP
cagrilari incelendi. Toplu veri indirme, scraping, production entegrasyonu veya uygulama kodu
degisikligi yapilmadi.

## Kisa sonuc

EPDK, Aracim Cepte icin resmi ve teknik olarak kullanilabilir bir yakit fiyati kaynagi adayi. Ancak
veri istasyon/ilce seviyesinde degil; petrol icin ana granulerlik il + firma markasi + yakit tipi,
LPG icin il + lisans unvani + LPG urun tipi. Bu nedenle Smart Fuel icin sehir/marka referans fiyati
uretebilir; Smart Trips icin tek basina rota uzerinde istasyon secemez.

Uretim sinifi: **YELLOW**. Teknik kaynak resmi ve erisilebilir; fakat ticari uygulama icin yeniden
kullanim kosullari, rate limit, SLA, attribution ve "baska amacla kullanim" siniri EPDK'dan yazili
olarak dogrulanmadan production'a baglanilmamalidir.

Final onerisi: **BUILD ON EPDK + SEPARATE PLACES PROVIDER**.

## Resmi kaynaklar

- [EPDK Web Servisler](https://www.epdk.gov.tr/Detay/Icerik/3-0-226/web-servisler)
- [EPDK Akaryakit Fiyatlari](https://www.epdk.gov.tr/Detay/Icerik/3-0-158/akaryak)
- [Pompa fiyatlari giris sayfasi](https://lisans.epdk.gov.tr/epvys-web/faces/pages/online/tarife/petrol/akaryakitFiyatSorgula.xhtml)
- [Petrol piyasasi bayi satis fiyati bulteni](https://bildirim.epdk.gov.tr/bildirim-portal/faces/pages/tarife/petrol/yonetim/petrolBultenRapor.xhtml)
- [LPG piyasasi urun fiyatlari](https://bildirim.epdk.gov.tr/bildirim-portal/faces/pages/tarife/lpg/illereGoreLPGFiyatSorgula.xhtml)

## Servis envanteri

| Servis | URL | Stil | Parametre | Veri granulerligi | Auth/key | Not |
| --- | --- | --- | --- | --- | --- | --- |
| Illere gore petrol bayi fiyatlari | `https://lisansws.epdk.gov.tr/services/bildirimPetrolAkaryakitFiyatlari` | SOAP/XML, `genelSorgu` | `sorguNo=72`, `parametreler=<il trafik kodu>` | Il + firma markasi + yakit tipi + fiyat + tarih | Ornek cagrida auth/key gerekmedi | Istanbul Anadolu `341`, Avrupa `342`. |
| En yuksek hacimli 8 firma ortalama petrol fiyatlari | `https://lisansws.epdk.gov.tr/services/bildirimPetrol8FirmaBulten` | SOAP/XML, `genelSorgu` | `sorguNo=71`, `parametreler=<GG/AA/YYYY>` | Ulusal/rapor ortalamasi + yakit tipi + birim + fiyat | Ornek cagrida auth/key gerekmedi | WSDL'de WSO2 throttling policy etiketi var; sayisal limit bulunmadi. |
| LPG illere gore LPG fiyatlari | `https://lisansws.epdk.gov.tr/services/bildirimLPGTarife` | SOAP/XML, `genelSorgu` | `sorguNo=54`, `parametreler=<GG/AA/YYYY>`, `parametreler=<il trafik kodu>` | Il + lisans unvani + LPG urun tipi + fiyat | Ornek cagrida auth/key gerekmedi | WSDL'de WSO2 throttling policy etiketi var; sayisal limit bulunmadi. |

WSDL/XSD semasi tum bu servislerde ayni genel sozlesmeyi kullaniyor: `genelSorgu` istegi
`sorguNo` ve tekrar eden string `parametreler` aliyor; cevap `return` alaninda XML metni olarak
donuyor. Bu nedenle alan anlamlari XSD'den degil, resmi kilavuz ve ornek response yapisindan
okunmali.

## Petrol bayi fiyatlari

Resmi sayfa bu servisi "Illere Gore Akaryakit Bayi Fiyatlarina Iliskin XML Web Servisi
(01.01.2016 Tarihinden Itibaren)" olarak listeliyor. Kilavuz, il trafik koduyla sorgu yapildigini
ve `sorguNo=72` kullanildigini belirtiyor.

Dusuk hacimli Konya ornek sorgusunda cevap satiri su alanlari verdi:

- `Tarih`: `2026-08-11 00:00:00.0`
- `YakitTipi`: or. `Kursunsuz Benzin 95 Oktan`
- `Il`: or. `KONYA`
- `FirmaMarkasi`: or. `7KITA`
- `Fiyat`: or. `71.88`

Bu servis gasoline/diesel gibi petrol urunleri icin il + marka seviyesinde current/reference fiyat
uretebilir. Cevapta ilce, bayi/istasyon adi, adres veya koordinat gorulmedi. Fiyat satiri "fiili"
veri niteliginde olsa da istasyon bazli kesin pompa fiyati olarak sunulmamalidir; granulerlik marka
ve il seviyesidir.

## Sekiz firma ortalama petrol fiyatlari

Resmi sayfa bu servisi "En Yuksek Islem Hacimli Sekiz Firmanin Ortalama Akaryakit Bayi Fiyatlarina
Iliskin XML Web Servisi" olarak listeliyor. Kilavuz `sorguNo=71` ve `GG/AA/YYYY` tarih parametresi
gosteriyor.

Ornek cevap alanlari:

- `YakitTipi`
- `Birim`
- `Fiyat`

Bu servis marka/ilce/istasyon secimi icin uygun degil. Yerel veri yoksa ulusal veya genel referans
fallback'i olarak kullanilabilir; kullaniciya **TAHMIN** veya "genel referans" olarak etiketlenmelidir.

## LPG fiyatlari

Resmi EPDK akaryakit sayfasi LPG icin "LPG Piyasasi Illere Gore LPG Fiyatlari Web Servisi"ni
listeliyor. Kılavuz `sorguNo=54`, tarih ve il trafik kodu parametrelerini veriyor; Istanbul Anadolu
icin `341`, Avrupa icin `342` ozel kodlari belirtiliyor.

Dusuk hacimli Konya ornek sorgusunda cevap `Results/Metadata/Table/Row` yapisindaydi ve su kolonlari
tasiyordu:

- `yakitTuru`
- `lisansUnvani`
- `fiyat`

Bu LPG servisi otogaz dahil LPG urunlerini il + lisans unvani seviyesinde verebilir. Ancak ilce,
istasyon, adres, koordinat veya ayrik update timestamp alanlari gorulmedi; tarih istegin parametresi
olarak disaridan veriliyor.

## Geografi, marka ve istasyon cozunurlugu

| Alan | Petrol il servisi | 8 firma ortalamasi | LPG servisi |
| --- | --- | --- | --- |
| Il | Var | Yok | Parametre ile var |
| Ilce | Yok | Yok | Yok |
| Istanbul bolge ayrimi | `341` Anadolu, `342` Avrupa | Yok | `341` Anadolu, `342` Avrupa |
| Marka/sirket | `FirmaMarkasi` | Yok | `lisansUnvani` |
| Istasyon/bayi adi | Yok | Yok | Yok |
| Adres/koordinat | Yok | Yok | Yok |
| Current fiyat | Var; response `Tarih` tasiyor | Tarih parametresine bagli ortalama | Tarih parametresine bagli |
| Gecmis veri | 01.01.2016'dan itibaren isaretlenmis | Tarih parametresi ile var | Tarih parametresi ile var |

Sonuc: EPDK sirket/marka seviyesi ile istasyon seviyesi arasindaki ayrimi kapatmiyor. Petrol Ofisi
gibi marka secimi icin il bazli referans alinabilir; "Selcuklu'daki belirli istasyon" veya "rota
uzerindeki en ucuz istasyon" icin ayrica POI/Places kaynagi gerekir.

## Kullanim senaryolari

| Senaryo | Durum | Gerekce |
| --- | --- | --- |
| Konya / Selcuklu / Petrol Ofisi / Diesel icin current/reference fiyat | **POSSIBLE WITH AGGREGATION** | EPDK il + marka + yakit tipi verir; ilce yoktur. Selcuklu icin Konya marka referansi kullanilabilir ve tahmin diye etiketlenmelidir. |
| Desteklenmeyen marka icin yerel coklu saglayici ortalama/aralik | **POSSIBLE WITH AGGREGATION** | Il seviyesinde marka/firma satirlariyla ortalama/aralik hesaplanabilir; ilce/istasyon icin destek yoktur. |
| Yakit fiyat degisim uyarilari | **POSSIBLE WITH AGGREGATION** | Gunluk tarihli satirlar karsilastirilabilir; polling/rate limit ve gecikme EPDK ile netlestirilmelidir. |
| Smart Trips rota yakit maliyeti | **POSSIBLE WITH AGGREGATION** | Il gecisleri icin tahmini maliyet hesaplanabilir; istasyon duragi secimi desteklenmez. |
| Rota uzerinde yakit duragi secimi | **NOT SUPPORTED** | Istasyon konumu, adres ve koordinat yoktur. |

## Ornek normalizasyon

Petrol il servisi su modele kismen dogrudan map edilebilir:

```json
{
  "provider": "epdk",
  "brand": "7KITA",
  "stationName": null,
  "city": "KONYA",
  "district": null,
  "fuelType": "gasoline_95",
  "pricePerLiter": 71.88,
  "currency": "TRY",
  "observedAt": "2026-08-11",
  "sourceGranularity": "province_brand"
}
```

LPG servisi icin `brand` dogrudan marka degil, lisans unvani olabilir; UI tarafinda kullaniciya marka
gibi gostermeden once ayrica marka/esleme sozlugu gerekir. `pricePerLiter` yalniz otogaz gibi litre
bazli satirlar icin dogrudan doldurulmalidir; tuplu veya dokme LPG satirlarinda urun birimi ayrica
normalleştirilmeden litre fiyati gibi kullanilmamalidir:

```json
{
  "provider": "epdk",
  "brand": null,
  "companyName": "LISANS UNVANI",
  "stationName": null,
  "city": "KONYA",
  "district": null,
  "fuelType": "autogas",
  "pricePerLiter": null,
  "currency": "TRY",
  "observedAt": "2026-08-13",
  "sourceGranularity": "province_company"
}
```

## Lisans, sartlar ve operasyon riski

Resmi web servislerin herkese acik gorunmesi, ticari uygulama icin otomatik lisans anlamina gelmez.
EPDK fiyat raporu alaninda bultenlerin belirli kamu ihale/fiyat farki hesaplari icin yayimlandigi ve
petrol fiyatlari piyasada olustugundan baska amaclarla kullanimin uygun olmadigini belirten metinler
gorunuyor. Bu nedenle production entegrasyonu oncesi EPDK'dan yazili izin veya acik kullanim sartlari
alinmalidir.

Risk sinifi:

- **Teknik kaynak:** GREEN/YELLOW arasi; resmi XML servis var ve sample cagri calisti.
- **Production hukuki/operasyonel kullanilabilirlik:** **YELLOW**; ticari yeniden kullanim, attribution,
  rate limit, cache suresi ve SLA belirsiz.
- **Istasyon/rota urun uygunlugu:** YELLOW; il/marka tahmini icin uygun, istasyon secimi icin eksik.

## Onerilen fallback modeli

EPDK'nin gercekten destekledigi seviyelere gore guvenli siralama:

1. Il + marka/firma + yakit tipi fiyatı.
2. Il + yakit tipi marka araligi veya ortalamasi.
3. Sekiz firma ulusal/genel ortalamasi.
4. Canli veri yok: fiyat gostermeme veya kullanicidan manuel fiyat isteme.

Ilce/istasyon fallback'i EPDK ile dogrulanmadigi icin bu siraya eklenmemelidir. Her aggregate veya
province-level fallback kullaniciya acikca **TAHMIN** olarak gosterilmelidir.

## Smart Fuel ve Smart Trips karari

Smart Fuel icin EPDK, il + marka/firma bazli referans fiyat kaynagi olarak iyi ilk adaydir. Ilce
istenirse veri "il tahmini" olarak dusurulmelidir. Desteklenmeyen marka veya marka eslesmesi olmayan
durumlarda il bazli ortalama/aralik kullanilabilir.

Smart Trips icin EPDK tek basina yeterli degil. Rota uzerinde istasyon secmek, en yakin istasyonu
bulmak veya istasyon koordinatlarina gore durak onermek icin ayri bir Places/POI/routing saglayicisi
gerekir. EPDK bu senaryoda yalniz fiyat katmani veya il bazli maliyet tahmini saglamalidir.

## Sonraki karar

Oneri: **BUILD ON EPDK + SEPARATE PLACES PROVIDER**.

Bir sonraki uygulama kararindan once:

1. EPDK'ya ticari mobil uygulama kullanimi, attribution, cache suresi, rate limit ve SLA icin yazili
   soru seti gonderilmeli.
2. `FuelPriceProvider` yalniz server-side tasarlanmali; mobil istemci EPDK endpoint'lerini dogrudan
   cagirmamali.
3. POI/Places kaynagi ayri arastirilmali; station coordinates EPDK'dan geliyormus gibi varsayilmamali.
4. UI copy'sinde "kesin pompa fiyati" yerine "referans fiyat" veya "tahmini fiyat" ayrimi korunmali.
