import { describe, expect, it } from 'vitest';
import { getBottomTabLayout } from './bottomTabLayout';

describe('central bottom-tab safe-area layout', () => {
  it('keeps the compact floating layout for a zero inset', () => {
    expect(getBottomTabLayout(0)).toEqual({
      bottomOffset: 10,
      height: 68,
      paddingBottom: 7,
      screenContentPaddingBottom: 120,
    });
  });

  it('moves the tab bar above Android system navigation and pads scroll content', () => {
    const threeButton = getBottomTabLayout(48);
    expect(threeButton.bottomOffset).toBe(48);
    expect(threeButton.height).toBeGreaterThan(68);
    expect(threeButton.paddingBottom).toBeGreaterThan(7);
    expect(threeButton.screenContentPaddingBottom).toBeGreaterThan(
      threeButton.bottomOffset + threeButton.height,
    );
  });

  it('fails safely for an invalid inset', () => {
    expect(getBottomTabLayout(Number.NaN)).toEqual(getBottomTabLayout(0));
  });
});
