export function safeStoredFilename(source: string, mimeType: string): string {
  const extension =
    mimeType === 'application/pdf' ? 'pdf' : mimeType === 'image/png' ? 'png' : 'jpg';
  if (source === 'camera') return `kamera-fotografi.${extension}`;
  if (source === 'gallery') return `galeri-fotografi.${extension}`;
  return `belge.${extension}`;
}
