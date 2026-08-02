import { describe, expect, it } from 'vitest';
import { getSelectionModalLayout } from './selectionModalLayout';

describe('selection modal safe-area layout', () => {
  it('keeps the final option above Android three-button navigation', () => {
    expect(getSelectionModalLayout(640, { top: 24, bottom: 48 })).toEqual({
      paddingTop: 24,
      paddingBottom: 48,
      maxHeight: 548,
      listPaddingBottom: 48,
    });
  });

  it('avoids excessive space with gesture or zero bottom inset', () => {
    expect(getSelectionModalLayout(640, { top: 0, bottom: 0 })).toEqual({
      paddingTop: 20,
      paddingBottom: 20,
      maxHeight: 580,
      listPaddingBottom: 8,
    });
  });
});
