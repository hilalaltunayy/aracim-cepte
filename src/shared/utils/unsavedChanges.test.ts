import { describe, expect, it } from 'vitest';
import { UNSAVED_CHANGES_COPY, haveFormValuesChanged } from './unsavedChanges';

describe('unsaved form decisions', () => {
  it('uses the approved exit confirmation copy', () => {
    expect(UNSAVED_CHANGES_COPY).toEqual({
      title: 'Değişiklikler kaydedilmedi',
      message: 'Bu ekrandan çıkarsanız yaptığınız değişiklikler kaybolacak.',
      cancel: 'Vazgeç',
      confirm: 'Çık',
    });
  });

  it('detects changes without treating an unchanged initial form as dirty', () => {
    const initial = { title: 'Bakım', date: null, kilometer: '' };
    expect(haveFormValuesChanged(initial, { ...initial })).toBe(false);
    expect(haveFormValuesChanged(initial, { ...initial, title: 'Yağ bakımı' })).toBe(true);
  });
});
