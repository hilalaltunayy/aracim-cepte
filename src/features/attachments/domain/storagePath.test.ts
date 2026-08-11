import { describe, expect, it } from 'vitest';
import { buildAttachmentStoragePath, extensionForMime, safeAttachmentDisplayName } from './storagePath';

const ids = {
  ownerId: '11111111-1111-4111-8111-111111111111',
  vehicleId: '22222222-2222-4222-8222-222222222222',
  parentId: '33333333-3333-4333-8333-333333333333',
  attachmentId: '44444444-4444-4444-8444-444444444444',
} as const;

describe('attachment storage paths', () => {
  it('uses generated owner, vehicle, parent and attachment identifiers', () => {
    expect(
      buildAttachmentStoragePath({
        ...ids,
        parentType: 'expertise_report',
        mimeType: 'application/pdf',
      }),
    ).toBe(
      `${ids.ownerId}/${ids.vehicleId}/expertise_report/${ids.parentId}/${ids.attachmentId}.pdf`,
    );
  });

  it('does not accept filenames or unsafe values as path identifiers', () => {
    expect(
      buildAttachmentStoragePath({
        ...ids,
        attachmentId: '../../plate-user.pdf',
        parentType: 'expertise_report',
        mimeType: 'application/pdf',
      }),
    ).toBeNull();
    expect(safeAttachmentDisplayName('../../secret/rapor.pdf', 'dosya.pdf')).toBe('rapor.pdf');
    expect(safeAttachmentDisplayName('..\\private\\rapor.pdf', 'dosya.pdf')).toBe('rapor.pdf');
  });

  it('maps only supported MIME types to extensions', () => {
    expect(extensionForMime('image/jpeg')).toBe('jpg');
    expect(extensionForMime('image/png')).toBe('png');
    expect(extensionForMime('application/pdf')).toBe('pdf');
    expect(extensionForMime('image/webp')).toBeNull();
  });
});
