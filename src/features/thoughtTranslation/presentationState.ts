export type ThoughtLayoutInsertionMode =
  | 'before-first-source'
  | 'keep-existing'
  | 'append-tail';

export type ThoughtLayoutInsertionState = {
  hasExistingLayout: boolean;
  hasIncomingSourceNodes: boolean;
};

export type ThoughtTextEmphasis = 'normal' | 'strong';

export type ThoughtTextEmphasisState = {
  fullTextLength: number;
  strongTextLength: number;
  textOutsideStrongLength: number;
};

export const resolveThoughtLayoutInsertionMode = (
  state: ThoughtLayoutInsertionState,
): ThoughtLayoutInsertionMode => {
  if (state.hasExistingLayout) return 'keep-existing';
  if (state.hasIncomingSourceNodes) return 'before-first-source';
  return 'append-tail';
};

export const resolveThoughtTextEmphasis = (
  state: ThoughtTextEmphasisState,
): ThoughtTextEmphasis => {
  if (state.fullTextLength <= 0) return 'normal';
  if (state.strongTextLength <= 0) return 'normal';
  if (state.strongTextLength !== state.fullTextLength) return 'normal';
  if (state.textOutsideStrongLength > 0) return 'normal';
  return 'strong';
};
