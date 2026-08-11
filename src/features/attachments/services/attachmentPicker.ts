import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { ATTACHMENT_CONFIG } from '../config/attachmentConfig';
import { normalizeAttachmentMime } from '../domain/attachmentRules';
import { safeAttachmentDisplayName } from '../domain/storagePath';
import type { AttachmentSource, PendingAttachment } from '../domain/types';
import { AppError } from '@/shared/utils/errors';
import { createRequestId } from '@/shared/utils/requestId';

function candidateId() {
  return createRequestId();
}

async function processImage(
  asset: ImagePicker.ImagePickerAsset,
  source: Extract<AttachmentSource, 'camera' | 'gallery'>,
): Promise<PendingAttachment> {
  if (asset.type && asset.type !== 'image') {
    throw new AppError('Bu dosya türü desteklenmiyor.', 'ATTACHMENT_TYPE_NOT_ALLOWED');
  }
  const context = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > ATTACHMENT_CONFIG.maxImageDimension) {
    if (asset.width >= asset.height) {
      context.resize({ width: ATTACHMENT_CONFIG.maxImageDimension, height: null });
    } else {
      context.resize({ width: null, height: ATTACHMENT_CONFIG.maxImageDimension });
    }
  }
  const rendered = await context.renderAsync();
  const output = await rendered.saveAsync({
    compress: ATTACHMENT_CONFIG.imageCompressionQuality,
    format: SaveFormat.JPEG,
    base64: false,
  });
  const localFile = new File(output.uri);
  const sizeBytes = localFile.size;
  if (!Number.isFinite(sizeBytes) || sizeBytes < 1) {
    throw new AppError('Seçilen dosya okunamadı.', 'ATTACHMENT_SIZE_REQUIRED');
  }
  if (sizeBytes > ATTACHMENT_CONFIG.maxImageBytes) {
    throw new AppError('Dosya boyutu izin verilen sınırı aşıyor.', 'ATTACHMENT_FILE_TOO_LARGE');
  }
  const id = candidateId();
  return {
    id,
    requestId: createRequestId(),
    uri: output.uri,
    originalName: safeAttachmentDisplayName(asset.fileName, `fotograf-${id}.jpg`).replace(
      /\.[^.]+$/,
      '.jpg',
    ),
    mimeType: 'image/jpeg',
    sizeBytes,
    source,
    width: output.width,
    height: output.height,
  };
}

export async function takeAttachmentPhoto(): Promise<PendingAttachment | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new AppError(
      'Kamera izni verilmedi. Galeri veya dosya seçeneklerini kullanabilirsiniz.',
      'CAMERA_PERMISSION_DENIED',
    );
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    cameraType: ImagePicker.CameraType.back,
    quality: 1,
    exif: false,
  });
  if (result.canceled || !result.assets[0]) return null;
  return processImage(result.assets[0], 'camera');
}

export async function pickAttachmentFromGallery(): Promise<PendingAttachment | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
    exif: false,
  });
  if (result.canceled || !result.assets[0]) return null;
  return processImage(result.assets[0], 'gallery');
}

export async function pickAttachmentDocument(): Promise<PendingAttachment | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [...ATTACHMENT_CONFIG.supportedMimeTypes],
    copyToCacheDirectory: true,
    multiple: false,
    base64: false,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const mimeType = normalizeAttachmentMime(asset.mimeType);
  if (!mimeType) {
    throw new AppError('Bu dosya türü desteklenmiyor.', 'ATTACHMENT_TYPE_NOT_ALLOWED');
  }
  const sizeBytes = asset.size ?? new File(asset.uri).size;
  if (!Number.isFinite(sizeBytes) || sizeBytes < 1) {
    throw new AppError('Seçilen dosya okunamadı.', 'ATTACHMENT_SIZE_REQUIRED');
  }
  if (sizeBytes > ATTACHMENT_CONFIG.maxFileBytes) {
    throw new AppError('Dosya boyutu izin verilen sınırı aşıyor.', 'ATTACHMENT_FILE_TOO_LARGE');
  }
  const id = candidateId();
  return {
    id,
    requestId: createRequestId(),
    uri: asset.uri,
    originalName: safeAttachmentDisplayName(asset.name, `dosya-${id}`),
    mimeType,
    sizeBytes,
    source: 'document',
  };
}
