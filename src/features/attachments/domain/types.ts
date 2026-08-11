import type { SupportedAttachmentMime } from '../config/attachmentConfig';

export type AttachmentSource = 'camera' | 'gallery' | 'document';
export type AttachmentParentType =
  | 'expertise_report'
  | 'vehicle_document'
  | 'maintenance_record'
  | 'vehicle_photo';

export interface Attachment {
  id: string;
  ownerId: string;
  vehicleId: string;
  parentType: AttachmentParentType;
  parentId: string;
  source: AttachmentSource;
  originalName: string;
  storagePath: string;
  mimeType: SupportedAttachmentMime;
  sizeBytes: number;
  createdAt: string;
  legacy?: false;
}

export interface LegacyAttachment {
  id: string;
  storagePath: string;
  originalName: string;
  mimeType: SupportedAttachmentMime;
  sizeBytes: null;
  source: 'document';
  legacy: true;
}

export interface PendingAttachment {
  id: string;
  requestId: string;
  uri: string;
  originalName: string;
  mimeType: SupportedAttachmentMime;
  sizeBytes: number;
  source: AttachmentSource;
  width?: number;
  height?: number;
}

export type PersistedAttachment = Attachment | LegacyAttachment;
export type AttachmentListItem = PersistedAttachment | PendingAttachment;

export function isPendingAttachment(item: AttachmentListItem): item is PendingAttachment {
  return 'uri' in item;
}
