# REV-003 — Login→Home Transition + Dashboard Polish

## Soft transition
Login sonrası Home `tak diye` açılmamalı.

Önerilen sequence:
1. merkezde `Merhaba <ad>`
2. birkaç kısa typographic reveal/style state
3. yazı yukarı kayar
4. `<vehicle model> bugün nasıl?` benzeri contextual ikinci satır gelir
5. o da yukarı kayar
6. Home içeriği aşağıdan/yukarı doğru soft slide ile yerleşir

Apple Hello hissinden ilham alınabilir ama birebir kopya yok.

Bu intro her tab dönüşünde değil, fresh login/cold authenticated launch gibi mantıklı anlarda gösterilmeli.

## Static Home değişiklikleri
- generic sağ üst araç ikonunu kaldırın
- büyük mavi vehicle summary card kalsın
- Yakıt/Bakım/Masraf/Hatırlat quick actions kalsın
- `Bu ayın görünümü` metriği kalsın

## Background
Koyu lacivert temel korunacak.
Sabit, çok düşük kontrastlı soft gray/blue automotive line-art wallpaper ekleyin:
wheel, wrench, fuel drop, document, bell, odometer, simple car outline.
Emoji kullanmayın.
Scroll ile background taşınmasın.

## Grafik
Son 6 ay grafiği daha profesyonel olmalı:
- refined animated bar veya clean line/area chart
- tap ile period/value tooltip
- `Önceki aya göre %...` insight kalsın
- deep premium analytics Free Home'a taşınmasın
- `Altı aylık toplam gider` gibi gereksiz tekrarları kaldırabilirsiniz

## Toplam yakıt
Ayrı, yarısı boş geniş kart kaldırılmalı.
Toplam yakıt metric'i chart tooltip/compact inline summary gibi daha zarif bir yere taşınmalı.

## Son hareketler
İşlev aynı kalacak; sadece visual polish.
