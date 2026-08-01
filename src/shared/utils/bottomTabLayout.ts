const BASE_TAB_HEIGHT = 61;
const MIN_TAB_BOTTOM_PADDING = 7;
const MAX_TAB_BOTTOM_PADDING = 14;
const MIN_FLOATING_OFFSET = 10;
const MIN_SCREEN_BOTTOM_PADDING = 120;

export interface BottomTabLayout {
  bottomOffset: number;
  height: number;
  paddingBottom: number;
  screenContentPaddingBottom: number;
}

export function getBottomTabLayout(bottomInset: number): BottomTabLayout {
  const inset = Number.isFinite(bottomInset) ? Math.max(0, bottomInset) : 0;
  const bottomOffset = Math.max(MIN_FLOATING_OFFSET, inset);
  const paddingBottom = Math.max(
    MIN_TAB_BOTTOM_PADDING,
    Math.min(MAX_TAB_BOTTOM_PADDING, Math.round(inset / 2)),
  );
  const height = BASE_TAB_HEIGHT + paddingBottom;

  return {
    bottomOffset,
    height,
    paddingBottom,
    screenContentPaddingBottom: Math.max(MIN_SCREEN_BOTTOM_PADDING, height + bottomOffset + 24),
  };
}
