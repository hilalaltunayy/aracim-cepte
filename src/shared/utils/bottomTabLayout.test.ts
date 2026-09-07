import { describe, expect, it } from 'vitest';
import { getBottomTabLayout, getFloatingControlRightOffset } from './bottomTabLayout';

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

describe('floating control horizontal placement', () => {
  it('centres the control on the last-two-tabs boundary as the grid widens', () => {
    // centre-from-edge = right + controlSize/2 should equal one tab width + margin.
    const boundary = (width: number) => (width - 12 * 2) / 5 + 12;

    const phone = getFloatingControlRightOffset(390, 56, 24);
    expect(phone + 28).toBeCloseTo(boundary(390));

    const tablet = getFloatingControlRightOffset(800, 56, 24);
    expect(tablet + 28).toBeCloseTo(boundary(800));
    expect(tablet).toBeGreaterThan(phone);
  });

  it('never drops below the minimum edge gap', () => {
    expect(getFloatingControlRightOffset(220, 56, 24)).toBe(24);
  });

  it('fails safely for an invalid width', () => {
    expect(getFloatingControlRightOffset(Number.NaN, 56, 24)).toBe(24);
  });
});
