/**
 * Turkish messages for the fixed guard codes the database and Edge Functions raise.
 *
 * Every one of these is a *known, actionable* outcome. Before this table they all
 * collapsed into the generic "İşlem tamamlanamadı. Lütfen tekrar deneyin.", which
 * is what made a stale-Premium reminder save, an over-quota attachment and a
 * genuine validation error indistinguishable to the user and to support.
 *
 * Only these exact sentinel codes are matched. Raw Postgres/provider text, table
 * names, constraint names and provider identifiers are never surfaced.
 */
const BACKEND_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  // --- Entitlement / plan limits -------------------------------------------
  VEHICLE_LIMIT_REACHED: 'Araç limitinize ulaştınız. Mevcut araçlarınız korunur.',
  VEHICLE_PHOTO_LIMIT_REACHED:
    'Araç fotoğrafı limitinize ulaştınız. Yeni fotoğraf için mevcut birini silebilirsiniz.',
  CUSTOM_REMINDER_TIME_PREMIUM_REQUIRED:
    'Özel hatırlatıcı saati Premium ile kullanılabilir. Premium hesabınız yeni onaylandıysa yetkiler eşitlenene kadar kısa süre bekleyip tekrar deneyin.',

  // --- Attachments / storage ------------------------------------------------
  ATTACHMENT_COUNT_QUOTA_EXCEEDED:
    'Bu kayıt için ek dosya sayısı limitine ulaştınız. Bir dosyayı silip tekrar deneyin.',
  ATTACHMENT_ENTITY_COUNT_EXCEEDED:
    'Bu kayıt için ek dosya sayısı limitine ulaştınız. Bir dosyayı silip tekrar deneyin.',
  ATTACHMENT_BYTES_QUOTA_EXCEEDED:
    'Depolama alanınız doldu. Yer açmak için eski ek dosyaları silebilirsiniz.',
  ATTACHMENT_ENTITY_BYTES_EXCEEDED:
    'Bu kayıt için toplam dosya boyutu limitini aşıyorsunuz. Daha küçük bir dosya deneyin.',
  ATTACHMENT_FILE_TOO_LARGE: 'Dosya boyutu planınızın sınırını aşıyor. Daha küçük bir dosya seçin.',
  ATTACHMENT_TYPE_NOT_ALLOWED: 'Bu dosya türü desteklenmiyor. JPG, PNG veya PDF ekleyebilirsiniz.',
  ATTACHMENT_FILENAME_INVALID: 'Dosya adı desteklenmiyor. Dosyayı yeniden adlandırıp deneyin.',
  ATTACHMENT_ALREADY_LINKED: 'Bu dosya kayda zaten eklenmiş.',
  ATTACHMENT_PARENT_FORBIDDEN: 'Bu kayda dosya ekleme yetkiniz yok.',
  ATTACHMENT_VEHICLE_FORBIDDEN: 'Bu araca dosya ekleme yetkiniz yok.',

  // --- OCR ------------------------------------------------------------------
  OCR_MONTHLY_QUOTA_EXCEEDED:
    'Bu ayki tarama limitinize ulaştınız. Bilgileri manuel girebilirsiniz.',
  OCR_RESERVATION_EXPIRED: 'Tarama işlemi zaman aşımına uğradı. Lütfen yeniden tarayın.',
  OCR_RESERVATION_NOT_FOUND: 'Tarama işlemi bulunamadı. Lütfen yeniden tarayın.',
  OCR_OPERATION_CONFLICT: 'Bu tarama zaten başka bir işlem için başlatılmış.',

  // --- AI assistant ---------------------------------------------------------
  AI_MONTHLY_QUOTA_EXCEEDED: 'Araç Asistanı kullanım limitinize ulaştınız.',
  AI_USAGE_IN_PROGRESS: 'Önceki sorunuz hâlâ işleniyor. Lütfen yanıtı bekleyin.',
  AI_VEHICLE_FORBIDDEN: 'Bu araç için Araç Asistanı kullanma yetkiniz yok.',

  // --- Records / documents / ownership -------------------------------------
  RECORD_MILEAGE_TOO_LOW: 'Girilen kilometre önceki kayıtlardan düşük olamaz.',
  RECORD_VEHICLE_FORBIDDEN: 'Bu araç üzerinde işlem yapma yetkiniz yok.',
  DOCUMENT_DATE_ORDER_INVALID: 'Bitiş tarihi başlangıç tarihinden önce olamaz.',
  DOCUMENT_TITLE_REQUIRED: 'Belge başlığı gereklidir.',
  DOCUMENT_TITLE_INVALID: 'Belge başlığı geçersiz.',
  DOCUMENT_NOT_FOUND: 'Bu belge silinmiş veya artık erişilebilir değil.',
  REMINDER_OWNER_MISMATCH: 'Bu hatırlatıcı üzerinde işlem yapma yetkiniz yok.',
  BODY_CONDITION_VEHICLE_FORBIDDEN: 'Bu araç üzerinde işlem yapma yetkiniz yok.',
  IDEMPOTENCY_KEY_REUSED: 'Bu işlem zaten kaydedildi. Listeyi yenileyin.',
  AUTH_REQUIRED: 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.',

  // --- Billing sync ---------------------------------------------------------
  BILLING_SYNC_DISABLED:
    'Hesap yetkileri şu anda eşitlenemiyor. Premium satın alımınız kaybolmaz; kısa süre sonra tekrar deneyin.',
  BILLING_SYNC_UNAVAILABLE:
    'Hesap yetkileri şu anda eşitlenemiyor. Premium satın alımınız kaybolmaz; kısa süre sonra tekrar deneyin.',
};

/**
 * Finds the guard code inside a backend error message.
 *
 * Supabase wraps PostgreSQL exceptions, so the sentinel arrives embedded in a
 * longer string. Matching is anchored on a word boundary so `OCR_REQUEST_INVALID`
 * cannot be reported as a different code that happens to be a prefix.
 */
export function findBackendErrorMessage(message: string): string | null {
  const upper = message.toUpperCase();
  for (const [code, friendly] of Object.entries(BACKEND_ERROR_MESSAGES)) {
    if (new RegExp(`(^|[^A-Z0-9_])${code}([^A-Z0-9_]|$)`).test(upper)) return friendly;
  }
  return null;
}

export const BACKEND_ERROR_CODES = Object.keys(BACKEND_ERROR_MESSAGES);
