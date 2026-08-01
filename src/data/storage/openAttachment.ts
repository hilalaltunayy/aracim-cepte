import { AppError } from '@/shared/utils/errors';
import { ATTACHMENT_OPEN_ERROR_MESSAGE } from './attachmentRules';

interface AttachmentOpenGateway {
  createSignedUrl(path: string): Promise<string | null>;
  canOpenUrl(url: string): Promise<boolean>;
  openUrl(url: string): Promise<void>;
}

function isSafeSignedUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export async function openPrivateAttachment(
  path: string,
  gateway: AttachmentOpenGateway,
): Promise<void> {
  try {
    if (!path.trim()) throw new Error('missing path');
    const signedUrl = await gateway.createSignedUrl(path);
    if (!signedUrl || !isSafeSignedUrl(signedUrl)) throw new Error('missing signed url');
    if (!(await gateway.canOpenUrl(signedUrl))) throw new Error('unsupported url');
    await gateway.openUrl(signedUrl);
  } catch {
    throw new AppError(ATTACHMENT_OPEN_ERROR_MESSAGE, 'ATTACHMENT_OPEN_FAILED');
  }
}
