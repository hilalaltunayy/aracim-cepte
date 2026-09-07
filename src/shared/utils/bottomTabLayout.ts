const BASE_TAB_HEIGHT = 61;
const MIN_TAB_BOTTOM_PADDING = 7;
const MAX_TAB_BOTTOM_PADDING = 14;
const MIN_FLOATING_OFFSET = 10;
const MIN_SCREEN_BOTTOM_PADDING = 120;

/** Tab bar horizontal margin — mirrors `marginHorizontal` in src/app/(tabs)/_layout.tsx. */
export const TAB_BAR_SIDE_MARGIN = 12;
/** Home tab count — mirrors the `<Tabs.Screen>` list in src/app/(tabs)/_layout.tsx. */
export const HOME_TAB_COUNT = 5;

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

/**
 * Horizontal `right` offset (screen edge → the control's right edge) for a
 * bottom-right floating control that must not visually cap the last tab.
 *
 * The control's centre is placed over the gap between the last two tabs, so the
 * placement scales with the real tab grid instead of a fixed device offset: on
 * a phone it sits just inside the edge, on a tablet it moves further in as the
 * tabs spread out, and on any width its centre lands on a tab boundary rather
 * than over the last tab's icon. `minEdgeGap` is a floor, never the value.
 */
export function getFloatingControlRightOffset(
  screenWidth: number,
  controlSize: number,
  minEdgeGap: number,
): number {
  const width = Number.isFinite(screenWidth) && screenWidth > 0 ? screenWidth : 0;
  const tabWidth = Math.max(0, (width - TAB_BAR_SIDE_MARGIN * 2) / HOME_TAB_COUNT);
  // Distance from the screen's right edge to the last-two-tabs boundary.
  const boundaryFromRight = TAB_BAR_SIDE_MARGIN + tabWidth;
  return Math.max(minEdgeGap, boundaryFromRight - controlSize / 2);
}
