import { AppError } from '@/shared/utils/errors';

/**
 * Re-downloading a file the user already uploaded.
 *
 * Deliberately the same shape as {@link import('./openAttachment')}: a short
 * lived signed URL is minted for one object, used immediately, and never
 * persisted. The bucket stays private and no public URL is ever produced —
 * "save to device" copies the bytes, it does not expose the object.
 */
export interface AttachmentDownloadGateway {
  createSignedUrl(path: string): Promise<string | null>;
  /** Downloads the URL into app-private cache and resolves the local file URI. */
  downloadToCache(url: string, fileName: string): Promise<string>;
  isSharingAvailable(): Promise<boolean>;
  /** Opens the platform save/share sheet so the user picks the destination. */
  share(uri: string, mimeType: string, fileName: string): Promise<void>;
  /** Best-effort cache cleanup; a failure here must never fail the download. */
  cleanup(uri: string): Promise<void>;
}

export interface AttachmentDownloadRequest {
  storagePath: string;
  fileName: string;
  mimeType: string;
}

export interface AttachmentDownloadResult {
  fileName: string;
  saved: boolean;
}

export const ATTACHMENT_DOWNLOAD_ERROR_MESSAGE =
  'Dosya indirilemedi. Lütfen bağlantınızı kontrol edip tekrar deneyin.';
export const ATTACHMENT_DOWNLOAD_MISSING_MESSAGE =
  'Dosya bulutta bulunamadı. Kayıt silinmiş olabilir.';
export const ATTACHMENT_DOWNLOAD_UNSUPPORTED_MESSAGE =
  'Bu cihazda dosya kaydetme ekranı açılamıyor.';

function isSafeSignedUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export async function downloadPrivateAttachment(
  request: AttachmentDownloadRequest,
  gateway: AttachmentDownloadGateway,
): Promise<AttachmentDownloadResult> {
  if (!request.storagePath.trim()) {
    throw new AppError(ATTACHMENT_DOWNLOAD_MISSING_MESSAGE, 'ATTACHMENT_DOWNLOAD_FAILED');
  }

  let signedUrl: string | null;
  try {
    signedUrl = await gateway.createSignedUrl(request.storagePath);
  } catch {
    signedUrl = null;
  }
  // A missing signed URL means the object is gone or not ours — RLS and the
  // Storage policy decide that, and both look the same from here.
  if (!signedUrl || !isSafeSignedUrl(signedUrl)) {
    throw new AppError(ATTACHMENT_DOWNLOAD_MISSING_MESSAGE, 'ATTACHMENT_DOWNLOAD_FAILED');
  }

  let localUri: string;
  try {
    localUri = await gateway.downloadToCache(signedUrl, request.fileName);
    if (!localUri) throw new Error('empty download uri');
  } catch {
    throw new AppError(ATTACHMENT_DOWNLOAD_ERROR_MESSAGE, 'ATTACHMENT_DOWNLOAD_FAILED');
  }

  try {
    if (!(await gateway.isSharingAvailable())) {
      throw new AppError(
        ATTACHMENT_DOWNLOAD_UNSUPPORTED_MESSAGE,
        'ATTACHMENT_DOWNLOAD_UNSUPPORTED',
      );
    }
    await gateway.share(localUri, request.mimeType, request.fileName);
    return { fileName: request.fileName, saved: true };
  } catch (caught) {
    if (caught instanceof AppError) throw caught;
    throw new AppError(ATTACHMENT_DOWNLOAD_ERROR_MESSAGE, 'ATTACHMENT_DOWNLOAD_FAILED');
  } finally {
    // The cached copy is a staging area, not an archive: the user's chosen
    // destination now holds the file, so drop ours.
    await gateway.cleanup(localUri).catch(() => undefined);
  }
}
