export const DEFAULT_LAYOUT_SCALE = 100;
export const MIN_LAYOUT_SCALE = 100;
export const MAX_LAYOUT_SCALE = 170;

export const CHAT_STANDARD_BASELINE_PX = 760;
export const CHAT_DUAL_COLUMN_BASELINE_PX = 1172;
export const EDIT_INPUT_BASELINE_PX = 760;
export const SIDEBAR_EXPANDED_BASELINE_PX = 308;
export const SIDEBAR_COLLAPSED_BASELINE_PX = 72;

const LEGACY_LAYOUT_MIN = 30;

export interface LinearLayoutWidths {
  readonly layoutScale: number;
  readonly chatStandardPx: number;
  readonly chatDualColumnPx: number;
  readonly editInputPx: number;
  readonly sidebarExpandedPx: number;
  readonly sidebarCollapsedPx: number;
}

export const clampLayoutScale = (value: number): number =>
  Math.max(MIN_LAYOUT_SCALE, Math.min(MAX_LAYOUT_SCALE, Math.round(value)));

const mapLegacyLayoutScale = (
  value: number,
  legacyDefault: number,
  legacyMax: number,
): number => {
  if (legacyMax <= legacyDefault) {
    return DEFAULT_LAYOUT_SCALE;
  }
  const ratio = (value - legacyDefault) / (legacyMax - legacyDefault);
  return clampLayoutScale(DEFAULT_LAYOUT_SCALE + ratio * (MAX_LAYOUT_SCALE - DEFAULT_LAYOUT_SCALE));
};

export const normalizeStoredLayoutScale = (
  raw: unknown,
  legacyDefault: number,
  legacyMax: number,
  legacyMin = LEGACY_LAYOUT_MIN,
): number => {
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) {
    return DEFAULT_LAYOUT_SCALE;
  }
  if (numeric >= MIN_LAYOUT_SCALE && numeric <= MAX_LAYOUT_SCALE) {
    return clampLayoutScale(numeric);
  }
  if (numeric >= legacyMin && numeric <= legacyMax) {
    return mapLegacyLayoutScale(numeric, legacyDefault, legacyMax);
  }
  return DEFAULT_LAYOUT_SCALE;
};

export const scaleBaselinePx = (basePx: number, layoutScale: number): number =>
  Number(((basePx * clampLayoutScale(layoutScale)) / DEFAULT_LAYOUT_SCALE).toFixed(3));

export const buildLinearLayoutWidths = (layoutScale: number): LinearLayoutWidths => {
  const normalizedScale = clampLayoutScale(layoutScale);
  return {
    layoutScale: normalizedScale,
    chatStandardPx: scaleBaselinePx(CHAT_STANDARD_BASELINE_PX, normalizedScale),
    chatDualColumnPx: scaleBaselinePx(CHAT_DUAL_COLUMN_BASELINE_PX, normalizedScale),
    editInputPx: scaleBaselinePx(EDIT_INPUT_BASELINE_PX, normalizedScale),
    sidebarExpandedPx: scaleBaselinePx(SIDEBAR_EXPANDED_BASELINE_PX, normalizedScale),
    sidebarCollapsedPx: scaleBaselinePx(SIDEBAR_COLLAPSED_BASELINE_PX, normalizedScale),
  };
};
