export interface SelectionModalInsets {
  top: number;
  bottom: number;
}

export interface SelectionModalLayout {
  paddingTop: number;
  paddingBottom: number;
  maxHeight: number;
  listPaddingBottom: number;
}

const EDGE_SPACING = 20;

export function getSelectionModalLayout(
  windowHeight: number,
  insets: SelectionModalInsets,
): SelectionModalLayout {
  const paddingTop = Math.max(insets.top, EDGE_SPACING);
  const paddingBottom = Math.max(insets.bottom, EDGE_SPACING);
  return {
    paddingTop,
    paddingBottom,
    maxHeight: Math.max(0, Math.floor(windowHeight - paddingTop - paddingBottom - EDGE_SPACING)),
    listPaddingBottom: Math.max(insets.bottom, 8),
  };
}
