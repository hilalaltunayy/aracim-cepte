import type { DocumentOcrProvider } from '../domain/documentOcrTypes';

/**
 * Safe production default until an OCR engine/provider has a separate SDK, privacy and legal review.
 * Keeping this explicit prevents document bytes from being sent to an unapproved external service.
 */
export const unavailableDocumentOcrProvider: DocumentOcrProvider = {
  async analyzeImage() {
    return { status: 'error', code: 'provider_unavailable' };
  },
};
