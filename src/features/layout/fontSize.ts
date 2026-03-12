import { StorageKeys } from '@/core/types/common';

const STYLE_ID = 'geminimate-font-size-scale';
const DEFAULT_SCALE = 100;
const MIN_SCALE = 80;
const MAX_SCALE = 130;

const DEFAULT_WEIGHT = 400;
const MIN_WEIGHT = 200;
const MAX_WEIGHT = 900;
const DEFAULT_FAMILY = 'default';
const DEFAULT_SANS_PRESET = 'sans-apple';
const DEFAULT_SERIF_PRESET = 'serif-source';

const MIN_LINE_HEIGHT_STEP = 0;
const MAX_LINE_HEIGHT_STEP = 8;
const BODY_LINE_HEIGHT_BASE = 1.75;
const BODY_LINE_HEIGHT_STEP = 0.1;
const HEADING_LINE_HEIGHT_OFFSET = 0.2;

function normalizeFontFamilyValue(value: unknown): string {
  const next = String(value || DEFAULT_FAMILY);
  // Keep compatibility with legacy "monospace" value.
  if (next === 'monospace') return 'sans';
  return next;
}

function normalizeSansPresetValue(fontFamilyValue: unknown, presetValue: unknown): string {
  if (String(fontFamilyValue || '') === 'monospace') return 'sans-tech';
  return String(presetValue || DEFAULT_SANS_PRESET);
}

const SANS_PRESET_FAMILIES: Record<string, string> = {
  'sans-apple':
    "system-ui, -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Noto Sans SC', sans-serif",
  'sans-sys': "'Segoe UI', 'Microsoft YaHei UI', 'Noto Sans SC', sans-serif",
  'sans-harmony': "'HarmonyOS Sans SC', 'HarmonyOS Sans', 'PingFang SC', 'Noto Sans SC', sans-serif",
  'sans-modern': "'MiSans', 'Alibaba PuHuiTi 3.0', 'PingFang SC', 'Noto Sans SC', sans-serif",
  'sans-grotesk': "'Helvetica Neue', Arial, 'Noto Sans SC', sans-serif",
  'sans-humanist': "'Source Sans 3', 'Noto Sans SC', 'Microsoft YaHei UI', sans-serif",
  'sans-tech': "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Courier New', monospace",
};

const SERIF_PRESET_FAMILIES: Record<string, string> = {
  'serif-source': "'Source Han Serif SC', 'Noto Serif SC', 'Songti SC', serif",
  'serif-traditional': "'Songti SC', SimSun, 'Noto Serif SC', serif",
  'serif-fangsong': "FangSong, STFangsong, 'Noto Serif SC', serif",
  'serif-kaiti': "'Kaiti SC', KaiTi, STKaiti, 'Noto Serif SC', serif",
  'serif-newspaper': "Constantia, 'Times New Roman', STSong, 'Noto Serif SC', serif",
  'serif-editorial': "Baskerville, 'Times New Roman', STSong, serif",
  'serif-georgia': "Georgia, Cambria, 'Noto Serif SC', serif",
};

const MODEL_TEXT_SELECTORS = '.markdown';
const TABLE_TEXT_SELECTORS = `
  .markdown table th,
  .markdown table td,
  .markdown table th > p,
  .markdown table td > p,
  .markdown table th li,
  .markdown table td li`.trim();
const USER_TEXT_SELECTORS = '.query-text, .query-text-line';
const INPUT_TEXT_SELECTORS = 'rich-textarea p, rich-textarea [contenteditable], input-area-v2 p';
const INPUT_PLACEHOLDER_SELECTORS = `
  rich-textarea [contenteditable]::before,
  input-area-v2 [contenteditable]::before,
  rich-textarea [data-placeholder]::before,
  input-area-v2 [data-placeholder]::before,
  input-area-v2 textarea::placeholder`.trim();

const BOLD_SELECTORS = `
  .markdown strong:not(.gemini-md-underline), .markdown b:not(.gemini-md-underline),
  .markdown h1, .markdown h2, .markdown h3, .markdown h4, .markdown h5, .markdown h6,
  .query-text strong:not(.gemini-md-underline), .query-text b:not(.gemini-md-underline),
  .query-text-line strong:not(.gemini-md-underline), .query-text-line b:not(.gemini-md-underline)`.trim();
const FORMULA_SELECTORS = '.markdown .katex, .query-text .katex, .query-text-line .katex';

const clampScale = (value: number): number => Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(value)));
const clampWeight = (value: number): number => Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, Math.round(value)));
const clampLineHeightStep = (value: number): number =>
  Math.min(MAX_LINE_HEIGHT_STEP, Math.max(MIN_LINE_HEIGHT_STEP, Math.round(value)));

function resolveBodyLineHeight(step: number): number {
  return BODY_LINE_HEIGHT_BASE + clampLineHeightStep(step) * BODY_LINE_HEIGHT_STEP;
}

function getFontFamilyCSS(family: string, sansPreset: string, serifPreset: string): string {
  switch (family) {
    case 'monospace':
      return SANS_PRESET_FAMILIES['sans-tech'];
    case 'sans':
      return SANS_PRESET_FAMILIES[sansPreset] ?? SANS_PRESET_FAMILIES[DEFAULT_SANS_PRESET];
    case 'serif':
      return SERIF_PRESET_FAMILIES[serifPreset] ?? SERIF_PRESET_FAMILIES[DEFAULT_SERIF_PRESET];
    case 'default':
      return 'inherit';
    default:
      return `'${family}', sans-serif`;
  }
}

function getBoldShiftedWeight(weight: number): number {
  const delta = weight - DEFAULT_WEIGHT;
  const shifted = 700 + delta;
  return Math.min(900, Math.max(weight, shifted));
}

function buildCSS(
  scalePercent: number,
  weight: number,
  family: string,
  sansPreset: string,
  serifPreset: string,
  letterSpacing: number,
  lineHeight: number,
): string {
  const clampedScale = clampScale(scalePercent);
  const scaleValue = clampedScale / 100;
  const normalizedLineHeightStep = clampLineHeightStep(lineHeight);
  const bodyLineHeight = resolveBodyLineHeight(normalizedLineHeightStep);

  const fontSizeRule = `font-size: calc(1rem * ${scaleValue}) !important;`;
  const fontWeightRule = weight !== DEFAULT_WEIGHT ? `font-weight: ${weight} !important;` : '';
  const fontVariationRule =
    weight !== DEFAULT_WEIGHT ? `font-variation-settings: 'wght' ${weight} !important;` : '';
  const fontFamilyRule =
    family !== DEFAULT_FAMILY
      ? `font-family: ${getFontFamilyCSS(family, sansPreset, serifPreset)} !important;`
      : '';
  const fontSynthesisRule = 'font-synthesis: weight !important;';
  const letterSpacingRule =
    letterSpacing > 0 ? `letter-spacing: ${(letterSpacing * 0.01).toFixed(2)}em !important;` : '';
  const lineHeightRule =
    normalizedLineHeightStep > 0 ? `line-height: ${bodyLineHeight.toFixed(3)} !important;` : '';

  const parts: string[] = [];

  const conversationTextRules = [
    fontSizeRule,
    fontWeightRule,
    fontVariationRule,
    fontFamilyRule,
    fontSynthesisRule,
    letterSpacingRule,
    lineHeightRule,
  ]
    .filter(Boolean)
    .join('\n      ');
  parts.push(`${MODEL_TEXT_SELECTORS}, ${TABLE_TEXT_SELECTORS}, ${USER_TEXT_SELECTORS} {
      ${conversationTextRules}
    }`);

  const inputTextRules = [fontSizeRule, fontWeightRule, fontVariationRule, fontFamilyRule, fontSynthesisRule]
    .filter(Boolean)
    .join('\n      ');
  parts.push(`${INPUT_TEXT_SELECTORS} {
      ${inputTextRules}
    }`);

  parts.push(`${INPUT_PLACEHOLDER_SELECTORS} {
      font-size: initial !important;
      letter-spacing: normal !important;
      line-height: normal !important;
      font-variation-settings: normal !important;
      font-family: initial !important;
      font-weight: 400 !important;
      font-synthesis: initial !important;
    }`);

  const hFamilyRule =
    family !== DEFAULT_FAMILY
      ? `\n      font-family: ${getFontFamilyCSS(family, sansPreset, serifPreset)} !important;`
      : '';
  const hLetterRule = letterSpacingRule ? `\n      ${letterSpacingRule}` : '';
  const hLineHeight =
    normalizedLineHeightStep > 0 ? Math.max(1.2, bodyLineHeight - HEADING_LINE_HEIGHT_OFFSET) : 1.25;
  const hLineHeightRule = `\n      line-height: ${hLineHeight.toFixed(2)} !important;`;
  parts.push(
    `.markdown h1 { font-size: calc(1.75rem * ${scaleValue}) !important;${hFamilyRule}${hLetterRule}${hLineHeightRule}\n      margin-top: 1.6em !important; margin-bottom: 0.5em !important; }`,
  );
  parts.push(
    `.markdown h2 { font-size: calc(1.5rem * ${scaleValue}) !important;${hFamilyRule}${hLetterRule}${hLineHeightRule}\n      margin-top: 1.4em !important; margin-bottom: 0.45em !important; }`,
  );
  parts.push(
    `.markdown h3 { font-size: calc(1.2rem * ${scaleValue}) !important;${hFamilyRule}${hLetterRule}${hLineHeightRule}\n      margin-top: 1.2em !important; margin-bottom: 0.4em !important; }`,
  );
  parts.push(
    `.markdown h4, .markdown h5, .markdown h6 { font-size: calc(1.05rem * ${scaleValue}) !important;${hFamilyRule}${hLetterRule}${hLineHeightRule}\n      margin-top: 1.0em !important; margin-bottom: 0.35em !important; }`,
  );

  if (family !== DEFAULT_FAMILY) {
    parts.push(
      `.timeline-preview-search input::placeholder { font-family: ${getFontFamilyCSS(family, sansPreset, serifPreset)} !important; }`,
    );
  }

  const boldWeight = getBoldShiftedWeight(weight);
  const boldFamilyRule =
    family !== DEFAULT_FAMILY ? `font-family: ${getFontFamilyCSS(family, sansPreset, serifPreset)} !important;` : '';
  const boldVariationRule = `font-variation-settings: 'wght' ${boldWeight} !important;`;
  parts.push(`${BOLD_SELECTORS} {
      font-weight: ${boldWeight} !important;${boldFamilyRule ? `\n      ${boldFamilyRule}` : ''}
      ${boldVariationRule}
    }`);

  parts.push(`${FORMULA_SELECTORS} {
      font-weight: ${weight} !important;
      font-variation-settings: normal !important;
      font-synthesis: none !important;
    }`);
  parts.push(`${FORMULA_SELECTORS} * {
      font-weight: inherit !important;
      font-variation-settings: normal !important;
    }`);

  return parts.join('\n');
}

export function startFontSizeAdjuster(): void {
  let currentScale = DEFAULT_SCALE;
  let currentWeight = DEFAULT_WEIGHT;
  let currentFamily = DEFAULT_FAMILY;
  let currentSansPreset = DEFAULT_SANS_PRESET;
  let currentSerifPreset = DEFAULT_SERIF_PRESET;
  let currentLetterSpacing = 0;
  let currentLineHeight = 0;

  const apply = (): void => {
    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent = buildCSS(
      currentScale,
      currentWeight,
      currentFamily,
      currentSansPreset,
      currentSerifPreset,
      currentLetterSpacing,
      currentLineHeight,
    );
  };

  const handleStorageChanged = (
    changes: { [key: string]: chrome.storage.StorageChange },
    area: string,
  ): void => {
    if (area !== 'local') return;
    let changed = false;

    if (changes[StorageKeys.GEMINI_FONT_SIZE_SCALE]) {
      const z = Number(changes[StorageKeys.GEMINI_FONT_SIZE_SCALE].newValue);
      if (Number.isFinite(z)) {
        currentScale = clampScale(z);
        changed = true;
      }
    }
    if (changes[StorageKeys.GEMINI_FONT_WEIGHT]) {
      const w = Number(changes[StorageKeys.GEMINI_FONT_WEIGHT].newValue);
      if (Number.isFinite(w)) {
        currentWeight = clampWeight(w);
        changed = true;
      }
    }
    if (changes[StorageKeys.GEMINI_FONT_FAMILY]) {
      currentFamily = normalizeFontFamilyValue(changes[StorageKeys.GEMINI_FONT_FAMILY].newValue);
      if (!changes[StorageKeys.GEMINI_SANS_PRESET]) {
        currentSansPreset = normalizeSansPresetValue(
          changes[StorageKeys.GEMINI_FONT_FAMILY].newValue,
          currentSansPreset,
        );
      }
      changed = true;
    }
    if (changes[StorageKeys.GEMINI_SANS_PRESET]) {
      currentSansPreset = normalizeSansPresetValue(
        changes[StorageKeys.GEMINI_FONT_FAMILY]?.newValue ?? currentFamily,
        changes[StorageKeys.GEMINI_SANS_PRESET].newValue,
      );
      changed = true;
    }
    if (changes[StorageKeys.GEMINI_SERIF_PRESET]) {
      currentSerifPreset = String(changes[StorageKeys.GEMINI_SERIF_PRESET].newValue || DEFAULT_SERIF_PRESET);
      changed = true;
    }
    if (changes[StorageKeys.GEMINI_LETTER_SPACING]) {
      const ls = Number(changes[StorageKeys.GEMINI_LETTER_SPACING].newValue);
      if (Number.isFinite(ls)) {
        currentLetterSpacing = ls;
        changed = true;
      }
    }
    if (changes[StorageKeys.GEMINI_LINE_HEIGHT]) {
      const lh = Number(changes[StorageKeys.GEMINI_LINE_HEIGHT].newValue);
      if (Number.isFinite(lh)) {
        currentLineHeight = clampLineHeightStep(lh);
        changed = true;
      }
    }

    if (changed) apply();
  };

  chrome.storage.local.get(
    [
      StorageKeys.GEMINI_FONT_SIZE_SCALE,
      StorageKeys.GEMINI_FONT_WEIGHT,
      StorageKeys.GEMINI_FONT_FAMILY,
      StorageKeys.GEMINI_SANS_PRESET,
      StorageKeys.GEMINI_SERIF_PRESET,
      StorageKeys.GEMINI_LETTER_SPACING,
      StorageKeys.GEMINI_LINE_HEIGHT,
    ],
    (res) => {
      currentScale = clampScale(Number(res[StorageKeys.GEMINI_FONT_SIZE_SCALE]) || DEFAULT_SCALE);
      currentWeight = clampWeight(Number(res[StorageKeys.GEMINI_FONT_WEIGHT]) || DEFAULT_WEIGHT);
      currentFamily = normalizeFontFamilyValue(res[StorageKeys.GEMINI_FONT_FAMILY]);
      currentSansPreset = normalizeSansPresetValue(
        res[StorageKeys.GEMINI_FONT_FAMILY],
        res[StorageKeys.GEMINI_SANS_PRESET],
      );
      currentSerifPreset = String(res[StorageKeys.GEMINI_SERIF_PRESET] || DEFAULT_SERIF_PRESET);
      currentLetterSpacing = Number(res[StorageKeys.GEMINI_LETTER_SPACING]) || 0;
      currentLineHeight = clampLineHeightStep(Number(res[StorageKeys.GEMINI_LINE_HEIGHT]) || 0);
      apply();
    },
  );

  chrome.storage.onChanged.addListener(handleStorageChanged);

  window.addEventListener(
    'beforeunload',
    () => {
      chrome.storage.onChanged.removeListener(handleStorageChanged);
      document.getElementById(STYLE_ID)?.remove();
    },
    { once: true },
  );
}
