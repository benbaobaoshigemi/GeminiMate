const ULTRA_UPSELL_LABELS = new Set([
  '\u5347\u7ea7\u5230googleaiultra',
  'upgradetogoogleaiultra',
]);

const normalizeUltraUpsellLabel = (value: string): string =>
  value
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase();

export const isExactUltraUpsellLabel = (value: string): boolean =>
  ULTRA_UPSELL_LABELS.has(normalizeUltraUpsellLabel(value));
