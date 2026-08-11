import { parseDateOnly, todayDateOnly } from '@/shared/utils/format';

export const DOCUMENT_EXPIRY_SOON_DAYS = 30;

export type DocumentStatus = 'active' | 'expiring_soon' | 'expired' | 'no_expiry';

function calendarDayDifference(from: Date, to: Date): number {
  const fromUtc = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const toUtc = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((toUtc - fromUtc) / 86_400_000);
}

export function getDocumentStatus(
  expiryDate: string | null,
  today = todayDateOnly(),
): DocumentStatus {
  if (!expiryDate) return 'no_expiry';
  const expiry = parseDateOnly(expiryDate);
  const current = parseDateOnly(today);
  if (!expiry || !current) return 'no_expiry';
  const days = calendarDayDifference(current, expiry);
  if (days < 0) return 'expired';
  if (days <= DOCUMENT_EXPIRY_SOON_DAYS) return 'expiring_soon';
  return 'active';
}
