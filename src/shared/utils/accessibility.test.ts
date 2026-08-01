import { describe, expect, it } from 'vitest';
import {
  getButtonAccessibility,
  getDashboardShortcutAccessibilityLabel,
  getNoteAccessibilityLabel,
  getSelectionAccessibilityState,
} from './accessibility';

describe('shared accessibility semantics', () => {
  it('announces disabled and loading button states', () => {
    expect(getButtonAccessibility('Kaydet', false, true)).toEqual({
      label: 'Kaydet, işlem devam ediyor',
      state: { disabled: true, busy: true },
    });
    expect(getButtonAccessibility('Kaydet', true, false).state.disabled).toBe(true);
  });

  it('describes shortcuts, notes and selected filters as actions', () => {
    expect(getDashboardShortcutAccessibilityLabel('Yakıt')).toBe('Yakıt kaydı ekle');
    expect(getDashboardShortcutAccessibilityLabel('Hatırlat')).toBe('Yeni hatırlatıcı ekle');
    expect(getNoteAccessibilityLabel('Lastik ölçüleri')).toBe('Lastik ölçüleri notunu aç');
    expect(getSelectionAccessibilityState(true)).toEqual({ checked: true });
  });
});
