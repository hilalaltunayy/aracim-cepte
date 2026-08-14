# Reminder notification preferences

TASK-033, mevcut hatırlatıcı akışını tek bir tarih ve bildirim saati bölümü içinde geliştirir.
Home, reminder listesi ve yerel bildirim gateway'i yeniden tasarlanmaz.

## Product behavior

- Tüm kullanıcılar takvim gün ızgarısını kullanır. Başlıktaki ay/yıl seçimi, aylar ve geçerli yıl ile
  **2040** arasındaki yıllar için hızlı, safe-area uyumlu seçim yüzeyi açar.
- Seçilebilir en son tarih 31 Aralık 2040'tır. Geçmiş günler ve seçili saate göre geçmişte kalmış
  bugünkü tetikler kaydedilemez.
- Free yeni hatırlatıcıları 09:00'da zamanlar. Saat görünür, açıklayıcı ve salt-okunurdur.
- Premium `customReminderTime` capability'si ile saati değiştirebilir; başlangıç değeri 09:00'dır.
- `due_time` olmayan legacy kayıtlar 09:00 olarak yorumlanır. Downgrade, mevcut özel saatli
  hatırlatıcıları silmez veya 09:00'a yazmaz; Free düzenlemede zaman korunur, yeni bir özel saat
  seçilemez.

## Scheduling and security

Kaydetme öncesi tarih+saat yerel olarak doğrulanır. Mevcut notification recovery akışı eski yerel
notification kimliklerini iptal eder, tek bir güncel tetik üretir ve izin/scheduler hatasında kaydı
silmeden tekrar denenebilir durumda bırakır.

`public.enforce_reminder_due_time_entitlement` yeni bir özel `due_time` yazımında server-side
`private.effective_plan_for_user` sonucunu kullanır. Planı eksik, bozuk veya süresi geçmiş kullanıcı
Free kabul edilir. Bu koruma, değiştirilmiş mobil istemcinin yeni Free özel saati yazmasını engeller;
mevcut Premium zamanının downgrade sonrası korunmasına izin verir.

## Verification and rollback

Migration additive'dir; yalnız entitlement trigger'ı ekler. Remote Supabase migration backlog'u bu
görevde deploy edilmez. Geri alma için migration/commit geri alınır; mevcut reminder verisi
değiştirilmez.

Fiziksel Android'de küçük/geniş cihazda takvim, ay/yıl seçimi, Free 09:00, Premium saat seçimi,
izin reddi, edit/delete ve uygulama yeniden açılışında tek bildirim kabulü ayrıca doğrulanmalıdır.
