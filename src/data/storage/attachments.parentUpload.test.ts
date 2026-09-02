/* eslint-disable import/first */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PendingAttachment } from '@/features/attachments/domain/types';

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), getUser: vi.fn() }));

vi.mock('expo-document-picker', () => ({}));
vi.mock('expo-image-picker', () => ({}));
vi.mock('react-native', () => ({ Linking: {} }));
vi.mock('@/data/supabase/client', () => ({
  getSupabaseClient: () => ({
    auth: { getUser: mocks.getUser },
    functions: { invoke: mocks.invoke },
  }),
}));
vi.mock('@/data/supabase/functionErrors', () => ({ getFunctionErrorCode: vi.fn() }));
vi.mock('@/shared/utils/requestId', () => ({
  createRequestId: () => 'a3520000-0000-4000-8000-000000000099',
}));

import { uploadParentAttachment } from './attachments';

const photo: PendingAttachment = {
  id: 'pending-photo',
  requestId: 'a3520000-0000-4000-8000-000000000001',
  uri: 'file:///synthetic-photo.jpg',
  originalName: 'synthetic-photo.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 4,
  source: 'gallery',
};

describe('vehicle photo parent upload contract', () => {
  beforeEach(() => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'owner-a' } } });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new Uint8Array([0xff, 0xd8, 0xff, 0xd9]).buffer,
      }),
    );
  });

  it('sends the vehicle-photo reservation headers and requires the attachment id response', async () => {
    mocks.invoke.mockResolvedValue({
      data: {
        path: 'owner/vehicle/vehicle_photo/photo/attachment.jpg',
        attachmentId: 'attachment-a',
      },
      error: null,
    });
    await expect(
      uploadParentAttachment('vehicle-a', 'vehicle_photo', 'photo-a', photo),
    ).resolves.toEqual({
      path: 'owner/vehicle/vehicle_photo/photo/attachment.jpg',
      attachmentId: 'attachment-a',
    });
    expect(mocks.invoke).toHaveBeenCalledWith(
      'upload-attachment',
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-vehicle-id': 'vehicle-a',
          'x-attachment-parent-type': 'vehicle_photo',
          'x-attachment-parent-id': 'photo-a',
          'x-attachment-source': 'gallery',
        }),
      }),
    );
  });

  it('fails closed when an outdated function omits attachmentId', async () => {
    mocks.invoke.mockResolvedValue({ data: { path: 'legacy/path.jpg' }, error: null });
    await expect(
      uploadParentAttachment('vehicle-a', 'vehicle_photo', 'photo-a', photo),
    ).rejects.toMatchObject({ code: 'UNKNOWN' });
  });
});
