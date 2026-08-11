import type { AttachmentParentType } from './types';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function extensionForMime(mimeType: string): 'pdf' | 'jpg' | 'png' | null {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  return null;
}

export function buildAttachmentStoragePath(input: {
  ownerId: string;
  vehicleId: string;
  parentType: AttachmentParentType;
  parentId: string;
  attachmentId: string;
  mimeType: string;
}): string | null {
  const extension = extensionForMime(input.mimeType);
  const ids = [input.ownerId, input.vehicleId, input.parentId, input.attachmentId];
  if (!extension || ids.some((value) => !uuidPattern.test(value))) return null;
  return `${input.ownerId}/${input.vehicleId}/${input.parentType}/${input.parentId}/${input.attachmentId}.${extension}`;
}

export function safeAttachmentDisplayName(value: string | null | undefined, fallback: string): string {
  const leaf = value?.replace(/\\/g, '/').split('/').at(-1)?.replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return (leaf || fallback).slice(0, 120);
}
