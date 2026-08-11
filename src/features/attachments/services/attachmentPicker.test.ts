/* eslint-disable import/first */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requestCameraPermissionsAsync: vi.fn(),
  launchCameraAsync: vi.fn(),
  launchImageLibraryAsync: vi.fn(),
  getDocumentAsync: vi.fn(),
  renderAsync: vi.fn(),
  saveAsync: vi.fn(),
  resize: vi.fn(),
  fileSize: 1024,
}));

vi.mock('expo-image-picker', () => ({
  CameraType: { back: 'back' },
  requestCameraPermissionsAsync: mocks.requestCameraPermissionsAsync,
  launchCameraAsync: mocks.launchCameraAsync,
  launchImageLibraryAsync: mocks.launchImageLibraryAsync,
}));
vi.mock('expo-document-picker', () => ({ getDocumentAsync: mocks.getDocumentAsync }));
vi.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  ImageManipulator: {
    manipulate: () => ({ resize: mocks.resize, renderAsync: mocks.renderAsync }),
  },
}));
vi.mock('expo-file-system', () => ({
  File: class {
    size = mocks.fileSize;
  },
}));
vi.mock('@/shared/utils/errors', () => ({
  AppError: class AppError extends Error {
    constructor(message: string, public code?: string) {
      super(message);
    }
  },
}));
vi.mock('@/shared/utils/requestId', () => {
  let counter = 0;
  return { createRequestId: () => `00000000-0000-4000-8000-${String(++counter).padStart(12, '0')}` };
});

import {
  pickAttachmentDocument,
  pickAttachmentFromGallery,
  takeAttachmentPhoto,
} from './attachmentPicker';

describe('attachment pickers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fileSize = 1024;
    mocks.requestCameraPermissionsAsync.mockResolvedValue({ granted: true });
    mocks.renderAsync.mockResolvedValue({ saveAsync: mocks.saveAsync });
    mocks.saveAsync.mockResolvedValue({ uri: 'file:///prepared.jpg', width: 2000, height: 1500 });
  });

  it('requests camera permission only for camera and handles cancellation', async () => {
    mocks.launchCameraAsync.mockResolvedValue({ canceled: true, assets: null });
    expect(await takeAttachmentPhoto()).toBeNull();
    expect(mocks.requestCameraPermissionsAsync).toHaveBeenCalledOnce();

    mocks.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null });
    expect(await pickAttachmentFromGallery()).toBeNull();
    expect(mocks.requestCameraPermissionsAsync).toHaveBeenCalledOnce();
  });

  it('returns camera and gallery images through the same prepared model', async () => {
    const asset = {
      uri: 'file:///source.jpg',
      width: 4000,
      height: 3000,
      type: 'image',
      fileName: 'IMG_1.jpg',
    };
    mocks.launchCameraAsync.mockResolvedValue({ canceled: false, assets: [asset] });
    mocks.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [asset] });
    expect(await takeAttachmentPhoto()).toMatchObject({ source: 'camera', mimeType: 'image/jpeg' });
    expect(await pickAttachmentFromGallery()).toMatchObject({
      source: 'gallery',
      mimeType: 'image/jpeg',
    });
    expect(mocks.resize).toHaveBeenCalledWith({ width: 2000, height: null });
  });

  it('returns PDF documents and treats picker cancellation as a no-op', async () => {
    mocks.getDocumentAsync.mockResolvedValue({ canceled: true, assets: null });
    expect(await pickAttachmentDocument()).toBeNull();
    mocks.getDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///report.pdf', name: 'report.pdf', mimeType: 'application/pdf', size: 512 }],
    });
    expect(await pickAttachmentDocument()).toMatchObject({
      source: 'document',
      mimeType: 'application/pdf',
      sizeBytes: 512,
    });
  });

  it('contains camera denial without launching hardware', async () => {
    mocks.requestCameraPermissionsAsync.mockResolvedValue({ granted: false });
    await expect(takeAttachmentPhoto()).rejects.toMatchObject({ code: 'CAMERA_PERMISSION_DENIED' });
    expect(mocks.launchCameraAsync).not.toHaveBeenCalled();
  });
});
