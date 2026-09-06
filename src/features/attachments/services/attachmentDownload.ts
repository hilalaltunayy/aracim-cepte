import { downloadAttachmentToDevice } from '@/data/storage/attachments';
import { buildAttachmentDownloadName } from '../domain/downloadFileName';
import type { PersistedAttachment } from '../domain/types';

export interface AttachmentDownloadContext {
  /** Parent record title, used only when the stored original name is missing. */
  label?: string | null;
  /** Parent record date, used only when the stored original name is missing. */
  date?: string | null;
}

/**
 * Saves one already-uploaded attachment back to the device.
 *
 * Available on every plan: these are files the user uploaded themselves, and
 * losing access to your own documents because a subscription lapsed would make
 * the cloud archive untrustworthy. Storage quota and new uploads stay gated.
 */
export async function downloadPersistedAttachment(
  attachment: PersistedAttachment,
  context: AttachmentDownloadContext = {},
) {
  return downloadAttachmentToDevice({
    storagePath: attachment.storagePath,
    mimeType: attachment.mimeType,
    fileName: buildAttachmentDownloadName({
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      contextLabel: context.label,
      contextDate: context.date,
    }),
  });
}
