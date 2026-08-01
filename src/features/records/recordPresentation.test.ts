import { describe, expect, it } from 'vitest';
import { getRecordPresentation } from './recordPresentation';

describe('record category presentation', () => {
  it('keeps fuel, maintenance and expense icon/type mapping consistent', () => {
    expect(getRecordPresentation({ recordType: 'fuel', category: 'Yakıt alımı' })).toEqual({
      title: 'Yakıt alımı',
      typeLabel: 'Yakıt',
      icon: 'water-outline',
    });
    expect(getRecordPresentation({ recordType: 'maintenance', category: 'Diğer' })).toEqual({
      title: 'Diğer bakım',
      typeLabel: 'Bakım',
      icon: 'construct-outline',
    });
    expect(getRecordPresentation({ recordType: 'expense', category: 'Diğer' })).toEqual({
      title: 'Diğer masraf',
      typeLabel: 'Diğer Masraf',
      icon: 'receipt-outline',
    });
  });
});
