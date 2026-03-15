export type ThoughtContainerActivityState = {
  hasManagedLayout: boolean;
  hasExpandedClass: boolean;
  toggleExpanded: boolean | null;
  isAriaHidden: boolean;
  isHiddenAttr: boolean;
  ancestorHidden: boolean;
  isDisplayNone: boolean;
  isVisibilityHidden: boolean;
  hasGeometry: boolean;
};

export const isThoughtContainerActive = (state: ThoughtContainerActivityState): boolean => {
  if (state.toggleExpanded === false) return false;

  const hasOpenSignal =
    state.hasManagedLayout ||
    state.hasExpandedClass ||
    state.toggleExpanded === true;
  if (!hasOpenSignal) return false;

  if (state.isAriaHidden || state.isHiddenAttr || state.ancestorHidden) return false;
  if (state.isDisplayNone || state.isVisibilityHidden) return false;

  return state.hasGeometry || state.hasManagedLayout;
};
