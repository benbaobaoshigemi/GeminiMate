import { StorageKeys } from '@/core/types/common';

const STYLE_ID = 'geminimate-custom-fonts';

export interface CustomFont {
    name: string;
    data: string; // base64 data URL (e.g. data:font/woff2;base64,...)
}

function buildFontFaceCSS(fonts: CustomFont[]): string {
    return fonts
        .map((f) => `@font-face { font-family: '${f.name}'; src: url('${f.data}'); font-display: swap; }`)
        .join('\n');
}

function applyFonts(fonts: CustomFont[]): void {
    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!style) {
        style = document.createElement('style');
        style.id = STYLE_ID;
        document.head.appendChild(style);
    }
    style.textContent = buildFontFaceCSS(fonts);
}

export function startCustomFontInjector(): void {
    chrome.storage.local.get([StorageKeys.GEMINI_CUSTOM_FONTS], (res) => {
        const fonts = (res[StorageKeys.GEMINI_CUSTOM_FONTS] ?? []) as CustomFont[];
        applyFonts(fonts);
    });

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local' || !changes[StorageKeys.GEMINI_CUSTOM_FONTS]) return;
        const fonts = (changes[StorageKeys.GEMINI_CUSTOM_FONTS].newValue ?? []) as CustomFont[];
        applyFonts(fonts);
    });
}
