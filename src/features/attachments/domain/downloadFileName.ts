import { buildSafeFileName } from '@/shared/utils/safeFileName';
import type { SupportedAttachmentMime } from '../config/attachmentConfig';

/**
 * Names a file the user is about to save outside the app.
 *
 * Once a document leaves Aracım Cepte it loses all of its surrounding context,
 * so `belge.pdf` in a Downloads folder is close to useless. The stored original
 * name is kept whenever there is one, and otherwise a name is composed from the
 * metadata we do have — the parent record's title and date.
 */

const EXTENSION_BY_MIME: Readonly<Record<SupportedAttachmentMime, string>> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

export function getAttachmentExtension(mimeType: string): string {
  return EXTENSION_BY_MIME[mimeType as SupportedAttachmentMime] ?? 'bin';
}

export interface AttachmentDownloadNameInput {
  originalName: string | null | undefined;
  mimeType: string;
  /** Parent record title, e.g. "Ekspertiz Raporu" or "Trafik Sigortası". */
  contextLabel?: string | null;
  /** ISO `YYYY-MM-DD`; only the year is used, to keep names short. */
  contextDate?: string | null;
}

/**
 * The extension always follows the stored MIME type, never the original name:
 * a PDF renamed to `belge.jpg` before upload must still be saved as a PDF or
 * the device will refuse to open it.
 */
export function buildAttachmentDownloadName(input: AttachmentDownloadNameInput): string {
  const extension = getAttachmentExtension(input.mimeType);
  const original = input.originalName?.trim();
  if (original) return buildSafeFileName(original, extension, 'belge');

  const year = input.contextDate?.trim().slice(0, 4);
  const parts = [year, input.contextLabel?.trim() || 'Belge'].filter(Boolean);
  return buildSafeFileName(parts.join('_'), extension, 'belge');
}
