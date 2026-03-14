export type ThoughtTranslationMode = 'compare' | 'replace';

export const resolveThoughtTranslationEnabled = (value: unknown): boolean => {
  if (value === true || value === 'true' || value === 1 || value === '1') {
    return true;
  }
  return false;
};

export const resolveThoughtTranslationMode = (value: unknown): ThoughtTranslationMode =>
  value === 'replace' ? 'replace' : 'compare';
