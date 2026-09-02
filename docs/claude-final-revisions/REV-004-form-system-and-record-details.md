# REV-004 — Record Forms + Read-Only Record Detail Pages

## Genel form problemi
Kayıt ekranlarında büyük dış `Kayıt ayrıntıları` dikdörtgeni ve label+input yığınları çok eski/formal görünüyor.

Apply consistently:
- Fuel
- Maintenance
- Other Expense
- New Document
- Reminder
- ilgili Settings/edit ekranları

## Yeni form dili
- gereksiz büyük dış form kartlarını kaldır
- bağımsız rounded inputs
- mümkünse field adı input içinde placeholder/floating-label olarak
- dropdown seçimleri korunacak
- hiçbir mevcut field/feature kaldırılmayacak
- aynı automotive background dili kullanılabilir

Save validation bloklanıyorsa:
- gerçek validation message
- kısa button shake feedback kabul

## Eksik kayıt detay sayfaları
Mevcut problem:
History/Recent Activity'de geçmiş kayda basınca doğrudan edit/add formuna gidiliyor.

Yeni flow:
History/Recent → **Read-only Detail Page** → `Düzenle` → mevcut edit form.

### Fuel detail
date, odometer, total, litres, unit price, station, notes, attachments, varsa derived info.

### Maintenance detail
date, odometer, package, operations/custom operations, service type, service/mechanic, parts, labor, total, invoice no, notes, attachments.

### Other Expense detail
type/title, date, amount, odometer, notes, attachments.

Detail ekranı form gibi değil, temiz bir bilgi sayfası gibi görünmeli.
