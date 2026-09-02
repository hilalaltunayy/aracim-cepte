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
type OcrImagePreprocessor = (input: DocumentOcrProviderInput) => Promise<string>;

export async function prepareOcrImage(input: DocumentOcrProviderInput): Promise<string> {
  // Keep the native dependency lazy so pure parser/domain consumers stay platform-independent.
  const { ImageManipulator, SaveFormat } = await import('expo-image-manipulator');
  const context = ImageManipulator.manipulate(input.attachment.uri);
  const { width, height } = input.attachment;
  if (width && height && Math.max(width, height) > 2200) {
    if (width >= height) context.resize({ width: 2200, height: null });
    else context.resize({ width: null, height: 2200 });
  } else {
    // Forces EXIF orientation into pixels before ML Kit reads the local file.
    context.rotate(0);
  }
  const rendered = await context.renderAsync();
  const output = await rendered.saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.96,
    base64: false,
  });
  return output.uri;
}

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
  preprocess: OcrImagePreprocessor = prepareOcrImage,
): DocumentOcrProvider {
  return {
    async analyzeImage(_input: DocumentOcrProviderInput): Promise<DocumentOcrProviderResult> {
      const recognizer = loadRecognizer();
      if (!recognizer) return { status: 'error', code: 'provider_unavailable' };

      try {
        if (!recognizer.isSupported()) {
          return { status: 'error', code: 'provider_unavailable' };
        }
        const normalizedUri = await preprocess(_input).catch(() => _input.attachment.uri);
        const result = await recognizer.recognizeText(normalizedUri);
        return result.text.trim()
          ? { status: 'success', rawText: result.text }
          : { status: 'no_text' };
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
