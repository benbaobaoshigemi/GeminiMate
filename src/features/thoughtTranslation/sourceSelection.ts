export type ThoughtSourceCandidate<T> = {
  node: T;
  isInOriginalSlot: boolean;
};

export const selectActiveThoughtSourceNodes = <T>(
  candidates: Array<ThoughtSourceCandidate<T>>,
): T[] => {
  const freshNodes = candidates.filter((candidate) => !candidate.isInOriginalSlot).map((candidate) => candidate.node);
  if (freshNodes.length > 0) return freshNodes;
  return candidates.map((candidate) => candidate.node);
};
