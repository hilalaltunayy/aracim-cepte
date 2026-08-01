export function getButtonAccessibility(title: string, disabled = false, loading = false) {
  return {
    label: loading ? `${title}, işlem devam ediyor` : title,
    state: { disabled: disabled || loading, busy: loading },
  };
}

export function getDashboardShortcutAccessibilityLabel(action: string): string {
  return action === 'Hatırlat' ? 'Yeni hatırlatıcı ekle' : `${action} kaydı ekle`;
}

export function getSelectionAccessibilityState(selected: boolean) {
  return { checked: selected } as const;
}

export function getNoteAccessibilityLabel(title: string): string {
  return `${title} notunu aç`;
}
