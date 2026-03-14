export interface PreviewPanelPlacementInput {
  readonly viewportWidth: number;
  readonly occupiedLeft: number;
  readonly occupiedRight: number;
  readonly panelWidth: number;
  readonly gap: number;
  readonly isRTL: boolean;
  readonly viewportPadding?: number;
}

export interface PreviewPanelGapInput {
  readonly toggleInset: number | null;
  readonly fallbackGap: number;
}

export const resolvePreviewPanelGap = ({
  toggleInset,
  fallbackGap,
}: PreviewPanelGapInput): number => {
  if (typeof toggleInset === 'number' && Number.isFinite(toggleInset)) {
    return Math.max(0, Math.round(Math.abs(toggleInset)));
  }
  return Math.max(0, Math.round(fallbackGap));
};

export const computePreviewPanelLeft = ({
  viewportWidth,
  occupiedLeft,
  occupiedRight,
  panelWidth,
  gap,
  isRTL,
  viewportPadding = 8,
}: PreviewPanelPlacementInput): number => {
  if (isRTL) {
    return Math.min(
      viewportWidth - panelWidth - viewportPadding,
      Math.round(occupiedRight + gap),
    );
  }

  return Math.max(viewportPadding, Math.round(occupiedLeft - gap - panelWidth));
};
