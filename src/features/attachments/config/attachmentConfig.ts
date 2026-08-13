import { FREE_ENTITLEMENTS, type PlanEntitlements } from '@/features/entitlements/domain/entitlements';

export const ATTACHMENT_CONFIG = {
  maxAttachmentsPerEntity: FREE_ENTITLEMENTS.maxAttachmentsPerEntity,
  maxFileBytes: 5 * 1024 * 1024,
  maxImageBytes: 5 * 1024 * 1024,
  maxTotalBytesPerEntity: FREE_ENTITLEMENTS.maxAttachmentBytesPerEntity,
  supportedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'] as const,
  imageCompressionQuality: 0.86,
  maxImageDimension: 2000,
} as const;

export type SupportedAttachmentMime = (typeof ATTACHMENT_CONFIG.supportedMimeTypes)[number];

/** Presentation-only hook; server Storage/RPC enforcement remains authoritative. */
export function getAttachmentLimits(
  entitlements: Pick<PlanEntitlements, 'maxAttachmentsPerEntity' | 'maxAttachmentBytesPerEntity'> =
    FREE_ENTITLEMENTS,
) {
  return {
    ...ATTACHMENT_CONFIG,
    maxAttachmentsPerEntity: entitlements.maxAttachmentsPerEntity,
    maxTotalBytesPerEntity: entitlements.maxAttachmentBytesPerEntity,
  };
}
