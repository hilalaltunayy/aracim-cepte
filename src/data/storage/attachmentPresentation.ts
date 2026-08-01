export function getAttachmentTypeLabel(path: string | null): string | null {
  if (!path) return null;
  const extension = path.split('.').pop()?.toLowerCase();
  if (extension === 'pdf') return 'PDF';
  if (extension === 'jpg' || extension === 'jpeg') return 'JPG';
  if (extension === 'png') return 'PNG';
  return 'Dosya';
}
