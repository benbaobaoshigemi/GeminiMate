export interface CanvasModeQueryRoot {
  querySelector(selectors: string): unknown;
}

export const IMMERSIVE_CANVAS_SELECTOR =
  'immersive-panel slides-immersive-panel, immersive-panel web-preview iframe, immersive-panel';

export const isCanvasImmersiveModeActive = (root: CanvasModeQueryRoot): boolean =>
  root.querySelector(IMMERSIVE_CANVAS_SELECTOR) !== null;
