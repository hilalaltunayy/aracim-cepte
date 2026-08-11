import { describe, expect, it, vi } from 'vitest';
import type { PendingAttachment } from '@/features/attachments/domain/types';
import type { DocumentOcrProvider } from '../domain/documentOcrTypes';
import { analyzeDocumentAttachment } from './documentOcrService';

const image: PendingAttachment = {
  id: 'pending-1',
  requestId: 'request-1',
  uri: 'file:///synthetic-document.jpg',
  originalName: 'synthetic-document.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 1000,
  source: 'camera',
};

const provider = (result: Awaited<ReturnType<DocumentOcrProvider['analyzeImage']>>) => ({
  analyzeImage: vi.fn().mockResolvedValue(result),
});

describe('document OCR service', () => {
  it('returns structured suggestions without exposing raw text', async () => {
    const result = await analyzeDocumentAttachment(
      'traffic_insurance',
      image,
      provider({ status: 'success', rawText: 'Poliçe No: TEST-42' }),
    );
    expect(result).toEqual({
      status: 'success',
      suggestions: [
        { fieldId: 'documentNumber', suggestedValue: 'TEST-42', source: 'document_ocr' },
      ],
    });
    expect(JSON.stringify(result)).not.toContain('Poliçe No');
  });

  it('normalizes no-text and provider failures', async () => {
    await expect(
      analyzeDocumentAttachment('registration', image, provider({ status: 'no_text' })),
    ).resolves.toEqual({ status: 'no_result', code: 'no_text' });
    await expect(
      analyzeDocumentAttachment(
        'registration',
        image,
        provider({ status: 'error', code: 'provider_unavailable' }),
      ),
    ).resolves.toEqual({ status: 'error', code: 'provider_unavailable' });
  });

  it('handles thrown provider errors without provider details', async () => {
    const failingProvider: DocumentOcrProvider = {
      analyzeImage: vi.fn().mockRejectedValue(new Error('private provider detail')),
    };
    const result = await analyzeDocumentAttachment('registration', image, failingProvider);
    expect(result).toEqual({ status: 'error', code: 'failed' });
    expect(JSON.stringify(result)).not.toContain('private provider detail');
  });

  it('does not call the provider for PDFs or unsupported document types', async () => {
    const mockProvider = provider({ status: 'success', rawText: 'Belge No: 1' });
    await expect(
      analyzeDocumentAttachment(
        'registration',
        { ...image, mimeType: 'application/pdf', originalName: 'synthetic.pdf' },
        mockProvider,
      ),
    ).resolves.toEqual({ status: 'unsupported', code: 'unsupported_attachment' });
    await expect(analyzeDocumentAttachment('invoice', image, mockProvider)).resolves.toEqual({
      status: 'unsupported',
      code: 'unsupported_document_type',
    });
    expect(mockProvider.analyzeImage).not.toHaveBeenCalled();
  });
});
