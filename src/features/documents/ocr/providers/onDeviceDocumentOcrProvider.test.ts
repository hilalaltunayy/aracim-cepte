import { describe, expect, it, vi } from 'vitest';
import type { PendingAttachment } from '@/features/attachments/domain/types';
import {
  createOnDeviceDocumentOcrProvider,
  type NativeTextRecognizer,
} from './onDeviceDocumentOcrProvider';

const attachment: PendingAttachment = {
  id: 'pending-ocr-image',
  requestId: 'request-ocr-image',
  uri: 'file:///synthetic-ocr-document.jpg',
  originalName: 'synthetic-ocr-document.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 1024,
  source: 'camera',
};

const input = { attachment, documentType: 'traffic_insurance' as const };

function recognizer(overrides: Partial<NativeTextRecognizer> = {}): NativeTextRecognizer {
  return {
    isSupported: vi.fn(() => true),
    recognizeText: vi.fn().mockResolvedValue({ text: 'Poliçe No: LOCAL-42' }),
    ...overrides,
  };
}

describe('on-device document OCR provider', () => {
  it('maps real native recognition text from the local URI without network/provider details', async () => {
    const native = recognizer();
    const provider = createOnDeviceDocumentOcrProvider(() => native);

    await expect(provider.analyzeImage(input)).resolves.toEqual({
      status: 'success',
      rawText: 'Poliçe No: LOCAL-42',
    });
    expect(native.recognizeText).toHaveBeenCalledWith(attachment.uri);
  });

  it('returns no_text for an empty native result', async () => {
    const provider = createOnDeviceDocumentOcrProvider(() =>
      recognizer({ recognizeText: vi.fn().mockResolvedValue({ text: '   ' }) }),
    );

    await expect(provider.analyzeImage(input)).resolves.toEqual({ status: 'no_text' });
  });

  it('recognizes the normalized local image while falling back safely when preprocessing fails', async () => {
    const native = recognizer();
    const preprocess = vi.fn().mockResolvedValue('file:///normalized-ocr.jpg');
    await createOnDeviceDocumentOcrProvider(() => native, preprocess).analyzeImage(input);
    expect(preprocess).toHaveBeenCalledWith(input);
    expect(native.recognizeText).toHaveBeenCalledWith('file:///normalized-ocr.jpg');

    const fallback = recognizer();
    await createOnDeviceDocumentOcrProvider(
      () => fallback,
      vi.fn().mockRejectedValue(new Error('synthetic preprocess failure')),
    ).analyzeImage(input);
    expect(fallback.recognizeText).toHaveBeenCalledWith(attachment.uri);
  });

  it('keeps manual fallback safe when the module is unavailable, unsupported, or throws', async () => {
    await expect(
      createOnDeviceDocumentOcrProvider(() => null).analyzeImage(input),
    ).resolves.toEqual({ status: 'error', code: 'provider_unavailable' });

    await expect(
      createOnDeviceDocumentOcrProvider(() =>
        recognizer({ isSupported: vi.fn(() => false) }),
      ).analyzeImage(input),
    ).resolves.toEqual({ status: 'error', code: 'provider_unavailable' });

    await expect(
      createOnDeviceDocumentOcrProvider(() =>
        recognizer({
          recognizeText: vi.fn().mockRejectedValue(new Error('native internal detail')),
        }),
      ).analyzeImage(input),
    ).resolves.toEqual({ status: 'error', code: 'failed' });
  });
});
