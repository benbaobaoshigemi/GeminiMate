const INLINE_MATH_REPAIR_BOUNDARY_CHAR_REGEX = /[A-Za-z0-9_]/;

export type LatexRepairReason =
  | 'boundary-space-before'
  | 'boundary-space-after'
  | 'trimmed-inner-padding'
  | 'normalized-math-content'
  | 'normalized-markup'
  | 'extracted-prefix'
  | 'extracted-suffix';

const shouldRepairInlineMathBoundary = (char: string): boolean => {
  if (!char) return false;
  if (/\s/.test(char)) return false;
  return INLINE_MATH_REPAIR_BOUNDARY_CHAR_REGEX.test(char);
};

export const collectInlineMathRepairReasons = (
  originalInner: string,
  normalizedMathSrc: string,
  prefix: string,
  suffix: string,
  before: string,
  after: string,
): LatexRepairReason[] => {
  const reasons: LatexRepairReason[] = [];

  if (shouldRepairInlineMathBoundary(before)) {
    reasons.push('boundary-space-before');
  }
  if (shouldRepairInlineMathBoundary(after)) {
    reasons.push('boundary-space-after');
  }
  if (originalInner !== originalInner.trim()) {
    reasons.push('trimmed-inner-padding');
  }
  if (prefix.length > 0) {
    reasons.push('extracted-prefix');
  }
  if (suffix.length > 0) {
    reasons.push('extracted-suffix');
  }
  if (normalizedMathSrc !== originalInner.trim()) {
    reasons.push('normalized-math-content');
  }

  return reasons;
};

export const collectBlockMathRepairReasons = (
  originalInner: string,
  normalizedMathSrc: string,
  prefix: string,
  suffix: string,
): LatexRepairReason[] => {
  const reasons: LatexRepairReason[] = [];

  if (originalInner !== originalInner.trim()) {
    reasons.push('trimmed-inner-padding');
  }
  if (prefix.length > 0) {
    reasons.push('extracted-prefix');
  }
  if (suffix.length > 0) {
    reasons.push('extracted-suffix');
  }
  if (normalizedMathSrc !== originalInner.trim()) {
    reasons.push('normalized-math-content');
  }

  return reasons;
};
