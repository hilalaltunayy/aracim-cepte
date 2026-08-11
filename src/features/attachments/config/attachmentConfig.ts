export const ATTACHMENT_CONFIG = {
  maxAttachmentsPerEntity: 5,
  maxFileBytes: 5 * 1024 * 1024,
  maxImageBytes: 5 * 1024 * 1024,
  maxTotalBytesPerEntity: 15 * 1024 * 1024,
  supportedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'] as const,
  imageCompressionQuality: 0.86,
  maxImageDimension: 2000,
} as const;

export type SupportedAttachmentMime = (typeof ATTACHMENT_CONFIG.supportedMimeTypes)[number];

export function getAttachmentLimits() {
  return ATTACHMENT_CONFIG;
}
