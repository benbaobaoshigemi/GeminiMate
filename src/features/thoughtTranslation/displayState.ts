export type ThoughtTranslationDisplayState = {
  hasReadyTranslation: boolean;
  hasResponseBodyContent: boolean;
  hasResponseCompleted: boolean;
};

export type ThoughtTranslationRefreshDisplayState = {
  hasDisplayedTranslation: boolean;
  isDisplayReady: boolean;
};

export type ResponseBodyContentState = {
  textLength: number;
  hasImageLikeContent: boolean;
  hasTableLikeContent: boolean;
  hasCodeLikeContent: boolean;
};

export const hasMeaningfulResponseBodyContentState = (
  state: ResponseBodyContentState,
): boolean => {
  if (state.textLength > 0) return true;
  if (state.hasImageLikeContent) return true;
  if (state.hasTableLikeContent) return true;
  if (state.hasCodeLikeContent) return true;
  return false;
};

export const shouldDisplayThoughtTranslation = (
  state: ThoughtTranslationDisplayState,
): boolean => {
  if (!state.hasReadyTranslation) return false;
  if (!state.hasResponseBodyContent) return false;
  if (!state.hasResponseCompleted) return false;
  return true;
};

export const shouldHideThoughtTranslationDuringRefresh = (
  state: ThoughtTranslationRefreshDisplayState,
): boolean => {
  if (!state.isDisplayReady) return true;
  if (!state.hasDisplayedTranslation) return true;
  return false;
};
