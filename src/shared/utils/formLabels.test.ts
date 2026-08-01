import { describe, expect, it } from 'vitest';
import { withoutOptionalSuffix } from './formLabels';

describe('form labels', () => {
  it('removes only the visible optional suffix', () => {
    expect(withoutOptionalSuffix('Model yılı (isteğe bağlı)')).toBe('Model yılı');
    expect(withoutOptionalSuffix('İsteğe bağlı')).toBe('');
    expect(withoutOptionalSuffix('Gerekli açıklama')).toBe('Gerekli açıklama');
  });
});
