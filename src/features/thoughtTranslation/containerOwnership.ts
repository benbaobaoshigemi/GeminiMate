export type ManagedThoughtContainerState = {
  hasManagedLayout: boolean;
  hasTranslatedAttr: boolean;
  hasProcessingAttr: boolean;
  hasSourceAttr: boolean;
  hasErrorAttr: boolean;
  hasModeAttr: boolean;
};

export const isManagedThoughtContainerState = (
  state: ManagedThoughtContainerState,
): boolean =>
  state.hasManagedLayout ||
  state.hasTranslatedAttr ||
  state.hasProcessingAttr ||
  state.hasSourceAttr ||
  state.hasErrorAttr ||
  state.hasModeAttr;

export type ThoughtCleanupCandidate<T> = {
  container: T;
  isActive: boolean;
  isManaged: boolean;
};

export const selectThoughtContainersForCleanup = <T>(
  candidates: Array<ThoughtCleanupCandidate<T>>,
): T[] => candidates.filter((candidate) => candidate.isManaged && !candidate.isActive).map((candidate) => candidate.container);
