import type {
  DocumentOcrProvider,
  DocumentOcrProviderInput,
  DocumentOcrProviderResult,
} from '../domain/documentOcrTypes';

interface NativeTextRecognitionResult {
  text: string;
}

export interface NativeTextRecognizer {
  isSupported(): boolean;
  recognizeText(uri: string): Promise<NativeTextRecognitionResult>;
}

type NativeTextRecognizerLoader = () => NativeTextRecognizer | null;

function loadNativeTextRecognizer(): NativeTextRecognizer | null {
  try {
    // This is intentionally lazy: Expo Go or a stale binary can omit the native module. The action
    // must then fail safely and leave manual document entry available.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-mlkit-ocr') as NativeTextRecognizer;
  } catch {
    return null;
  }
}

export function createOnDeviceDocumentOcrProvider(
  loadRecognizer: NativeTextRecognizerLoader = loadNativeTextRecognizer,
): DocumentOcrProvider {
  return {
    async analyzeImage(_input: DocumentOcrProviderInput): Promise<DocumentOcrProviderResult> {
      const recognizer = loadRecognizer();
      if (!recognizer) return { status: 'error', code: 'provider_unavailable' };

      try {
        if (!recognizer.isSupported()) {
          return { status: 'error', code: 'provider_unavailable' };
        }
        const result = await recognizer.recognizeText(_input.attachment.uri);
        return result.text.trim() ? { status: 'success', rawText: result.text } : { status: 'no_text' };
      } catch {
        return { status: 'error', code: 'failed' };
      }
    },
  };
}

/**
 * Google ML Kit text recognition runs in the installed Android application's native process.
 * It receives a local attachment URI only; neither bytes nor recognized text are sent to Supabase
 * or an external provider by this adapter.
 */
export const onDeviceDocumentOcrProvider = createOnDeviceDocumentOcrProvider();
