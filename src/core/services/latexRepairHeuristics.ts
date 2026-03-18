const INLINE_MATH_REPAIR_BOUNDARY_CHAR_REGEX = /[A-Za-z0-9_]/;

export const shouldRepairInlineMathBoundary = (char: string): boolean => {
  if (!char) return false;
  if (/\s/.test(char)) return false;
  return INLINE_MATH_REPAIR_BOUNDARY_CHAR_REGEX.test(char);
};

export const hasMeaningfulInlineMathContentRepair = (
  originalInner: string,
  normalizedMathSrc: string,
  prefix: string,
  suffix: string,
): boolean => {
  if (prefix.length > 0 || suffix.length > 0) return true;
  return normalizedMathSrc !== originalInner.trim();
};
