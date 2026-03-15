export type WatermarkFetchStep =
  | 'processed-blob'
  | 'background-runtime'
  | 'page-fetch'
  | 'rendered-image';

export type WatermarkFetchPlanState = {
  sourceUrl: string;
  hasProcessedBlobUrl: boolean;
  hasRenderableImageElement: boolean;
};

export const resolveWatermarkFetchPlan = (
  state: WatermarkFetchPlanState,
): WatermarkFetchStep[] => {
  if (state.hasProcessedBlobUrl) {
    return ['processed-blob'];
  }

  const plan: WatermarkFetchStep[] = [];
  if (/^https?:\/\//i.test(state.sourceUrl)) {
    plan.push('background-runtime', 'page-fetch');
  }

  if (state.hasRenderableImageElement) {
    plan.push('rendered-image');
  }

  return plan;
};
