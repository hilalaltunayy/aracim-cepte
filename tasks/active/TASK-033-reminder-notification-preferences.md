# TASK-033 — Reminder notification preferences

**Status:** IMPLEMENTED — AWAITING ANDROID ACCEPTANCE
**Updated:** 2026-08-14

## Scope

- Tüm kullanıcılar için gün ızgaralı, ay/yıl hızlı seçimli reminder tarihi.
- Free için görünür fakat salt-okunur 09:00; Premium için merkezi `customReminderTime` capability ile saat seçimi.
- Legacy `due_time` fallback'i, downgrade veri koruması ve mevcut tekil local-notification recovery sözleşmesi.

## Decisions

- Tarih/yıl aralığı çalışılan yıl ile 2040 arasındadır. Tarih+saat geçmişse kaydetme reddedilir.
- Free kullanıcının önceden Premium iken oluşturduğu özel saat düzenlemede korunur; yeni özel saat seçemez.
- Yeni Free özel saat yazımı, additive SQL trigger ile server-side entitlement çözümüne karşı da engellenir.

## Validation

- Hedefli Vitest: reminder date/time, schedule preferences, UI, scheduler/recovery, entitlement ve repository guard.
- SQL/RLS fixture: Free custom-time yazımı reddi ve downgrade sonrası mevcut özel zamanın korunması.
- Remote deploy, EAS build ve fiziksel Android kabulü bu görevde yapılmaz.

## Rollback

Client/SQL commit geri alınabilir; legacy reminder değerleri dönüştürülmez veya silinmez.
