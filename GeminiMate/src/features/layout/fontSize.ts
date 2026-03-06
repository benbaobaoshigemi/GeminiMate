import { StorageKeys } from '@/core/types/common';

const STYLE_ID = 'geminimate-font-size-scale';
const DEFAULT_SCALE = 100;
const MIN_SCALE = 80;
const MAX_SCALE = 130;

const DEFAULT_WEIGHT = 400;
const DEFAULT_FAMILY = 'default';

const clampScale = (value: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(value)));

/*
 * Verified DOM selectors from Gemini HTML analysis:
 * - Model responses: .markdown class (inside message-content custom element)
 * - User messages: .query-text and .query-text-line classes
 * - KaTeX formulas: .katex
 *
 * Angular scoped: .markdown[_nghost-ng-c3518605453] — we override with !important
 */
const MODEL_TEXT_SELECTORS = `.markdown`;
const USER_TEXT_SELECTORS = `.query-text, .query-text-line`;
/*
 * Input area selectors: rich-textarea contains the user's typing.
 * Apply font-size here so the typed text matches the conversation text size.
 */
const INPUT_TEXT_SELECTORS = `rich-textarea p, rich-textarea [contenteditable], input-area-v2 p`;

/*
 * Bold/heading selectors inside model/user text blocks.
 */
const BOLD_SELECTORS = `
  .markdown strong, .markdown b, .markdown h1, .markdown h2, .markdown h3,
  .markdown h4, .markdown h5, .markdown h6,
  .query-text strong, .query-text b,
  .query-text-line strong, .query-text-line b`.trim();

function getFontFamilyCSS(family: string): string {
    switch (family) {
        case 'monospace': return "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Courier New', monospace";
        case 'serif': return "Georgia, 'Noto Serif', 'Times New Roman', serif";
        case 'default': return 'inherit';
        default: return `'${family}', sans-serif`; // user-loaded custom font
    }
}

/**
 * Compute a shifted weight for already-bold elements so font-weight adjustment
 * is visible on them too.
 */
function getBoldShiftedWeight(weight: number): number {
    const delta = weight - DEFAULT_WEIGHT;
    const shifted = 700 + delta;
    return Math.min(900, Math.max(weight, shifted));
}

function buildCSS(scalePercent: number, weight: number, family: string): string {
    const clamped = clampScale(scalePercent);
    const scaleValue = clamped / 100;

    /*
     * Use font-size–based scaling instead of zoom:
     *  - Normalises all text to 1rem baseline (fixes "prompt bigger than reply" issue)
     *  - KaTeX scales naturally as em-relative child of the container (no double-zoom)
     *  - Works inside contenteditable without layout side-effects
     */
    const fontSizeRule = `font-size: calc(1rem * ${scaleValue}) !important;`;
    const fontWeightRule = weight !== DEFAULT_WEIGHT ? `font-weight: ${weight} !important;` : '';
    const fontFamilyRule = family !== DEFAULT_FAMILY ? `font-family: ${getFontFamilyCSS(family)} !important;` : '';

    console.log(`[GM-FontSize] buildCSS scale=${clamped}% weight=${weight} family=${family}`);

    const parts: string[] = [];

    /* All conversation text — model, user, input */
    const textRules = [fontSizeRule, fontWeightRule, fontFamilyRule].filter(Boolean).join('\n      ');
    parts.push(`${MODEL_TEXT_SELECTORS}, ${USER_TEXT_SELECTORS}, ${INPUT_TEXT_SELECTORS} {
      ${textRules}
    }`);

    /*
     * Bold/heading elements need an explicit shifted weight so the adjustment
     * is visible on content that already carries a bold default.
     */
    const boldWeight = getBoldShiftedWeight(weight);
    const boldFamilyRule = family !== DEFAULT_FAMILY ? `font-family: ${getFontFamilyCSS(family)} !important;` : '';
    parts.push(`${BOLD_SELECTORS} {
      font-weight: ${boldWeight} !important;${boldFamilyRule ? '\n      ' + boldFamilyRule : ''}
    }`);

    const css = parts.join('\n');
    console.log(`[GM-FontSize] generated CSS:\n${css}`);
    return css;
}

export function startFontSizeAdjuster(): void {
    let currentScale = DEFAULT_SCALE;
    let currentWeight = DEFAULT_WEIGHT;
    let currentFamily = DEFAULT_FAMILY;

    const apply = (): void => {
        let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
        if (!style) {
            style = document.createElement('style');
            style.id = STYLE_ID;
            document.head.appendChild(style);
            console.log('[GM-FontSize] Style element created and inserted into <head>');
        }
        const css = buildCSS(currentScale, currentWeight, currentFamily);
        style.textContent = css;
        console.log('[GM-FontSize] Style element updated', { id: STYLE_ID, inDOM: !!document.getElementById(STYLE_ID) });
    };

    chrome.storage.local.get(
        [StorageKeys.GEMINI_FONT_SIZE_SCALE, StorageKeys.GEMINI_FONT_WEIGHT, StorageKeys.GEMINI_FONT_FAMILY],
        (res) => {
            console.log('[GM-FontSize] Storage read:', res);
            currentScale = clampScale(Number(res[StorageKeys.GEMINI_FONT_SIZE_SCALE]) || DEFAULT_SCALE);
            currentWeight = Number(res[StorageKeys.GEMINI_FONT_WEIGHT]) || DEFAULT_WEIGHT;
            currentFamily = String(res[StorageKeys.GEMINI_FONT_FAMILY] || DEFAULT_FAMILY);
            apply();
        },
    );

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        let changed = false;

        if (changes[StorageKeys.GEMINI_FONT_SIZE_SCALE]) {
            const z = Number(changes[StorageKeys.GEMINI_FONT_SIZE_SCALE].newValue);
            console.log('[GM-FontSize] Scale changed:', z);
            if (Number.isFinite(z)) { currentScale = z; changed = true; }
        }
        if (changes[StorageKeys.GEMINI_FONT_WEIGHT]) {
            const w = Number(changes[StorageKeys.GEMINI_FONT_WEIGHT].newValue);
            console.log('[GM-FontSize] Weight changed:', w);
            if (Number.isFinite(w)) { currentWeight = w; changed = true; }
        }
        if (changes[StorageKeys.GEMINI_FONT_FAMILY]) {
            const f = String(changes[StorageKeys.GEMINI_FONT_FAMILY].newValue || DEFAULT_FAMILY);
            console.log('[GM-FontSize] Family changed:', f);
            currentFamily = f;
            changed = true;
        }

        if (changed) apply();
    });

    window.addEventListener('beforeunload', () => {
        const style = document.getElementById(STYLE_ID);
        if (style) style.remove();
    }, { once: true });
}

