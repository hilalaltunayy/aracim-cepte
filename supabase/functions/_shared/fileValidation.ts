export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

export type AllowedAttachmentMime = 'application/pdf' | 'image/jpeg' | 'image/png';

const allowedMimeTypes = new Set<AllowedAttachmentMime>([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);

export function normalizeDeclaredMime(value: string | null): AllowedAttachmentMime | null {
  const normalized = value?.split(';', 1)[0]?.trim().toLowerCase();
  return normalized && allowedMimeTypes.has(normalized as AllowedAttachmentMime)
    ? (normalized as AllowedAttachmentMime)
    : null;
}

export function detectAttachmentMime(bytes: Uint8Array): AllowedAttachmentMime | null {
  if (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  ) {
    return 'application/pdf';
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }

  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (
    bytes.length >= pngSignature.length &&
    pngSignature.every((value, index) => bytes[index] === value)
  ) {
    return 'image/png';
  }

  return null;
}

export function validateAttachment(
  bytes: Uint8Array,
  declaredMime: string | null,
): { ok: true; mimeType: AllowedAttachmentMime } | { ok: false; code: string } {
  if (bytes.length < 1) return { ok: false, code: 'ATTACHMENT_EMPTY' };
  if (bytes.length > MAX_ATTACHMENT_BYTES) {
    return { ok: false, code: 'ATTACHMENT_FILE_TOO_LARGE' };
  }

  const normalizedMime = normalizeDeclaredMime(declaredMime);
  if (!normalizedMime) return { ok: false, code: 'ATTACHMENT_TYPE_NOT_ALLOWED' };

  const detectedMime = detectAttachmentMime(bytes);
  if (!detectedMime || detectedMime !== normalizedMime) {
    return { ok: false, code: 'ATTACHMENT_CONTENT_MISMATCH' };
  }

  return { ok: true, mimeType: detectedMime };
}
