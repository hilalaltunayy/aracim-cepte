import type { DocumentType } from '@/domain/entities';
import type { PendingAttachment } from '@/features/attachments/domain/types';
import type { DocumentFormValues } from '../../domain/documentValidation';

export type DocumentOcrFieldId =
  'documentNumber' | 'issuerName' | 'startDate' | 'eventDate' | 'expiryDate';

export interface DocumentOcrSuggestion {
  fieldId: DocumentOcrFieldId;
  suggestedValue: string;
  source: 'document_ocr';
  confidence?: number;
}

export type DocumentOcrFormPatch = Partial<Pick<DocumentFormValues, DocumentOcrFieldId>>;

export interface DocumentOcrProviderInput {
  attachment: PendingAttachment;
  documentType: DocumentType;
}

export type DocumentOcrProviderResult =
  | { status: 'success'; rawText: string }
  | { status: 'no_text' }
  | { status: 'error'; code: 'provider_unavailable' | 'cancelled' | 'failed' };

export interface DocumentOcrProvider {
  analyzeImage(input: DocumentOcrProviderInput): Promise<DocumentOcrProviderResult>;
}

export type DocumentOcrAnalysisResult =
  | { status: 'success'; suggestions: DocumentOcrSuggestion[] }
  | {
      status: 'unsupported' | 'no_result' | 'error';
      code:
        | 'unsupported_document_type'
        | 'unsupported_attachment'
        | 'provider_unavailable'
        | 'cancelled'
        | 'no_text'
        | 'no_supported_fields'
        | 'failed';
    };
