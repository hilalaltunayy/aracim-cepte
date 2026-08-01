export function withoutOptionalSuffix(label: string): string {
  const trimmed = label.trim();
  if (trimmed.toLocaleLowerCase('tr-TR') === 'isteğe bağlı') return '';
  return trimmed.replace(/\s*\(isteğe bağlı\)\s*$/iu, '').trim();
}
