import type { DocumentType } from '@/domain/entities';
import type { PendingAttachment } from '@/features/attachments/domain/types';
import { OCR_SUPPORTED_DOCUMENT_TYPES, parseDocumentOcrText } from '../domain/documentOcrParser';
import type { DocumentOcrAnalysisResult, DocumentOcrProvider } from '../domain/documentOcrTypes';
import { unavailableDocumentOcrProvider } from '../providers/unavailableDocumentOcrProvider';

const OCR_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png']);

export async function analyzeDocumentAttachment(
  documentType: DocumentType,
  attachment: PendingAttachment,
  provider: DocumentOcrProvider = unavailableDocumentOcrProvider,
): Promise<DocumentOcrAnalysisResult> {
  if (!OCR_SUPPORTED_DOCUMENT_TYPES.includes(documentType)) {
    return { status: 'unsupported', code: 'unsupported_document_type' };
  }
  if (!OCR_IMAGE_MIME_TYPES.has(attachment.mimeType)) {
    return { status: 'unsupported', code: 'unsupported_attachment' };
  }

  try {
    const result = await provider.analyzeImage({ attachment, documentType });
    if (result.status === 'error') return { status: 'error', code: result.code };
    if (result.status === 'no_text' || !result.rawText.trim()) {
      return { status: 'no_result', code: 'no_text' };
    }
    const suggestions = parseDocumentOcrText(documentType, result.rawText);
    if (!suggestions.length) return { status: 'no_result', code: 'no_supported_fields' };
    return { status: 'success', suggestions };
  } catch {
    return { status: 'error', code: 'failed' };
  }
}

export function getDocumentOcrMessage(
  result: Exclude<DocumentOcrAnalysisResult, { status: 'success' }>,
): string {
  if (result.code === 'unsupported_document_type') {
    return 'Bu belge türü için tarama henüz desteklenmiyor. Bilgileri manuel girebilirsiniz.';
  }
  if (result.code === 'unsupported_attachment') {
    return 'Belge tarama için JPG veya PNG biçiminde bir görüntü ekleyin.';
  }
  if (result.code === 'provider_unavailable') {
    return 'Belge tarama sağlayıcısı henüz kullanılamıyor. Bilgileri manuel girebilirsiniz.';
  }
  if (result.code === 'no_text' || result.code === 'no_supported_fields') {
    return 'Belgeden okunabilir bilgi bulunamadı.';
  }
  if (result.code === 'cancelled') return 'Belge tarama iptal edildi.';
  return 'Belge taranamadı. Bilgileri manuel girebilirsiniz.';
}
