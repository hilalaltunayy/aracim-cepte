import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { getSupabaseClient } from '@/data/supabase/client';
import { getFunctionErrorCode } from '@/data/supabase/functionErrors';
import { AppError } from '@/shared/utils/errors';
import { createRequestId } from '@/shared/utils/requestId';
import {
  ALLOWED_ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_BYTES,
  getAttachmentErrorMessage,
  getAttachmentPickerErrorMessage,
  normalizeAttachmentMime,
} from './attachmentRules';

export interface PickedAttachment {
  uri: string;
  name: string;
  mimeType: string;
  source: 'image' | 'document';
}

export async function pickImage(): Promise<PickedAttachment | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new AppError('Fotoğraf erişim izni verilmedi.');
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  const mimeType = normalizeAttachmentMime(asset.mimeType ?? 'image/jpeg');
  if (!mimeType || mimeType === 'application/pdf') {
    throw new AppError(
      getAttachmentPickerErrorMessage('image', 'ATTACHMENT_TYPE_NOT_ALLOWED'),
      'ATTACHMENT_TYPE_NOT_ALLOWED',
    );
  }
  if (asset.fileSize && asset.fileSize > MAX_ATTACHMENT_BYTES) {
    throw new AppError(
      getAttachmentPickerErrorMessage('image', 'ATTACHMENT_FILE_TOO_LARGE'),
      'ATTACHMENT_FILE_TOO_LARGE',
    );
  }
  return {
    uri: asset.uri,
    name: asset.fileName ?? `fotograf-${Date.now()}.jpg`,
    mimeType,
    source: 'image',
  };
}

export async function pickDocument(): Promise<PickedAttachment | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [...ALLOWED_ATTACHMENT_MIME_TYPES],
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  const mimeType = normalizeAttachmentMime(asset.mimeType);
  if (!mimeType) {
    throw new AppError(
      getAttachmentPickerErrorMessage('document', 'ATTACHMENT_TYPE_NOT_ALLOWED'),
      'ATTACHMENT_TYPE_NOT_ALLOWED',
    );
  }
  if (asset.size && asset.size > MAX_ATTACHMENT_BYTES) {
    throw new AppError(
      getAttachmentPickerErrorMessage('document', 'ATTACHMENT_FILE_TOO_LARGE'),
      'ATTACHMENT_FILE_TOO_LARGE',
    );
  }
  return {
    uri: asset.uri,
    name: asset.name,
    mimeType,
    source: 'document',
  };
}

export async function uploadAttachment(
  vehicleId: string,
  attachment: PickedAttachment,
  requestId = createRequestId(),
): Promise<string> {
  const client = getSupabaseClient();
  const { data } = await client.auth.getUser();
  if (!data.user) throw new AppError('Dosya yüklemek için oturum açmalısınız.');
  const mimeType = normalizeAttachmentMime(attachment.mimeType);
  if (!mimeType) throw new AppError(getAttachmentErrorMessage('ATTACHMENT_TYPE_NOT_ALLOWED'));
  const response = await fetch(attachment.uri);
  if (!response.ok) throw new AppError('Seçilen dosya okunamadı.');
  const body = await response.arrayBuffer();
  if (body.byteLength > MAX_ATTACHMENT_BYTES) {
    throw new AppError(getAttachmentErrorMessage('ATTACHMENT_FILE_TOO_LARGE'));
  }
  const { data: upload, error } = await client.functions.invoke<{ path?: string }>(
    'upload-attachment',
    {
      body,
      headers: {
        'Content-Type': mimeType,
        'x-vehicle-id': vehicleId,
        'x-file-size': String(body.byteLength),
        'x-upload-request-id': requestId,
      },
    },
  );
  if (error) {
    const code = await getFunctionErrorCode(error);
    throw new AppError(
      getAttachmentPickerErrorMessage(attachment.source, code),
      code ?? 'ATTACHMENT_UPLOAD_FAILED',
    );
  }
  if (!upload?.path) {
    throw new AppError(getAttachmentErrorMessage('ATTACHMENT_UPLOAD_FAILED'));
  }
  return upload.path;
}

export async function deleteAttachment(path: string | null): Promise<void> {
  if (!path) return;
  const client = getSupabaseClient();
  const { error } = await client.rpc('request_attachment_cleanup', { p_object_path: path });
  if (error) throw error;
  await reconcileAttachments();
}

export async function reconcileAttachments(): Promise<void> {
  const { error } = await getSupabaseClient().functions.invoke('reconcile-attachments', {
    body: {},
  });
  if (error) throw new AppError('Dosya temizliği daha sonra yeniden denenecek.');
}

export async function openAttachment(path: string): Promise<void> {
  const { data, error } = await getSupabaseClient()
    .storage.from('vehicle-attachments')
    .createSignedUrl(path, 60);
  if (error || !data.signedUrl) throw error ?? new AppError('Dosya açılamadı.');
  const supported = await Linking.canOpenURL(data.signedUrl);
  if (!supported) throw new AppError('Bu dosya türü cihazda açılamıyor.');
  await Linking.openURL(data.signedUrl);
}
