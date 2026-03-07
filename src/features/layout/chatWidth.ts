/**
 * Adjusts the chat area width based on user settings
 */

import { StorageKeys } from '@/core/types/common';
import { debugService } from '@/core/services/DebugService';

const STYLE_ID = 'geminimate-chat-width';
const UI_DEFAULT_PERCENT = 100;
const UI_MIN_PERCENT = 100;
const UI_MAX_PERCENT = 170;
const FALLBACK_NATIVE_PX = 960;
let nativeBasePx = FALLBACK_NATIVE_PX;
const WIDTH_DIAG_PREFIX = '[GM-ChatWidth]';

const traceWidth = (event: string, detail: Record<string, unknown> = {}): void => {
    try {
        console.info(WIDTH_DIAG_PREFIX, { event, detail, ts: new Date().toISOString() });
        debugService.log('chat-width', event, detail);
    } catch {
        // ignore
    }
};

function getUserSelectors(): string[] {
    return [
        '.user-query-bubble-container',
        '.user-query-container',
        'user-query-content',
        'user-query',
        'div[aria-label="User message"]',
        'article[data-author="user"]',
        '[data-message-author-role="user"]',
    ];
}

function getAssistantSelectors(): string[] {
    return [
        'model-response',
        '.model-response',
        'response-container',
        '.response-container',
        '.presented-response-container',
        '[aria-label="Gemini response"]',
        '[data-message-author-role="assistant"]',
        '[data-message-author-role="model"]',
        'article[data-author="assistant"]',
    ];
}

function getTableSelectors(): string[] {
    return [
        'table-block',
        '.table-block',
        'table-block .table-block',
        'table-block .table-content',
        '.table-block.new-table-style',
        '.table-block.has-scrollbar',
        '.table-block .table-content',
    ];
}

const clampPercent = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, Math.round(value)));

const toVw = (px: number): number => {
    const viewportWidth = Math.max(window.innerWidth, 1);
    return (px / viewportWidth) * 100;
};

type SelectorSnapshot = {
    selector: string;
    tag: string;
    className: string;
    rectWidthVw: number;
    computedMaxWidth: string;
};

const collectSelectorSnapshot = (selectors: string[]): SelectorSnapshot[] => {
    const snapshots: SelectorSnapshot[] = [];
    for (const selector of selectors) {
        const element = document.querySelector<HTMLElement>(selector);
        if (!element) continue;
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        snapshots.push({
            selector,
            tag: element.tagName.toLowerCase(),
            className: element.className || '',
            rectWidthVw: Number(toVw(rect.width).toFixed(3)),
            computedMaxWidth: style.maxWidth,
        });
        if (snapshots.length >= 4) break;
    }
    return snapshots;
};

const parsePx = (value: string): number | null => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed || trimmed === 'none' || trimmed === 'auto') return null;
    if (!trimmed.endsWith('px')) return null;
    const parsed = Number.parseFloat(trimmed);
    if (!Number.isFinite(parsed)) return null;
    return parsed;
};

const measureComputedMaxWidthPx = (selectors: string[]): number | null => {
    const samples: number[] = [];
    for (const selector of selectors) {
        const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
        for (const element of elements) {
            const rect = element.getBoundingClientRect();
            if (rect.width < 120 || rect.height < 16) continue;
            const style = window.getComputedStyle(element);
            if (style.display === 'none' || style.visibility === 'hidden') continue;
            const maxWidthPx = parsePx(style.maxWidth);
            if (maxWidthPx === null) continue;
            if (maxWidthPx < 120 || maxWidthPx > window.innerWidth) continue;
            samples.push(maxWidthPx);
        }
    }
    if (samples.length === 0) return null;
    samples.sort((a, b) => a - b);
    return samples[Math.floor(samples.length / 2)] ?? null;
};

const measureVisibleWidthPx = (selectors: string[]): number | null => {
    for (const selector of selectors) {
        const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
        for (const element of elements) {
            const rect = element.getBoundingClientRect();
            if (rect.width < 120 || rect.height < 16) continue;
            const style = window.getComputedStyle(element);
            if (style.display === 'none' || style.visibility === 'hidden') continue;
            return rect.width;
        }
    }
    return null;
};

const refreshNativeBasePx = (): void => {
    const style = document.getElementById(STYLE_ID);
    const previousCssText = style?.textContent ?? null;
    if (style) style.textContent = '';
    const measured =
        measureVisibleWidthPx(getAssistantSelectors()) ??
        measureVisibleWidthPx(getUserSelectors()) ??
        measureComputedMaxWidthPx(getAssistantSelectors()) ??
        measureComputedMaxWidthPx(getUserSelectors()) ??
        measureVisibleWidthPx(['.presented-response-container', 'model-response', '.response-container']);
    if (style && previousCssText !== null) {
        style.textContent = previousCssText;
    }
    if (measured && Number.isFinite(measured) && measured > 120 && measured <= window.innerWidth) {
        nativeBasePx = measured;
        traceWidth('native-base-measured', {
            nativeBasePx,
            nativeBaseVw: Number(toVw(nativeBasePx).toFixed(3)),
        });
    } else {
        traceWidth('native-base-measure-fallback', {
            measured,
            assistantSnapshot: collectSelectorSnapshot(getAssistantSelectors()),
            userSnapshot: collectSelectorSnapshot(getUserSelectors()),
        });
    }
};

const toUiPercent = (value: unknown): number => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return UI_DEFAULT_PERCENT;
    }

    if (numeric >= UI_MIN_PERCENT && numeric <= UI_MAX_PERCENT) {
        return clampPercent(numeric, UI_MIN_PERCENT, UI_MAX_PERCENT);
    }

    if (numeric > 0) {
        const mapped = (numeric / Math.max(nativeBasePx, 1)) * 100;
        return clampPercent(mapped, UI_MIN_PERCENT, UI_MAX_PERCENT);
    }

    return UI_DEFAULT_PERCENT;
};

const uiPercentToTargetPx = (uiPercent: number): number => {
    const normalizedUi = clampPercent(uiPercent, UI_MIN_PERCENT, UI_MAX_PERCENT);
    return (nativeBasePx * normalizedUi) / 100;
};

function applyWidth(uiPercent: number) {
    const normalizedPercent = clampPercent(uiPercent, UI_MIN_PERCENT, UI_MAX_PERCENT);
    if (normalizedPercent === UI_DEFAULT_PERCENT) {
        const existingStyle = document.getElementById(STYLE_ID);
        if (existingStyle) existingStyle.remove();
        traceWidth('apply-native', {
            uiPercent: normalizedPercent,
            nativeBasePx,
            nativeBaseVw: Number(toVw(nativeBasePx).toFixed(3)),
        });
        return;
    }
    const targetWidthPx = uiPercentToTargetPx(normalizedPercent);
    traceWidth('apply-scaled', {
        uiPercent: normalizedPercent,
        nativeBasePx,
        nativeBaseVw: Number(toVw(nativeBasePx).toFixed(3)),
        targetWidthPx,
        targetWidthVw: Number(toVw(targetWidthPx).toFixed(3)),
    });
    const widthValue = `${targetWidthPx.toFixed(3)}px`;
    let style = document.getElementById(STYLE_ID) as HTMLStyleElement;
    if (!style) {
        style = document.createElement('style');
        style.id = STYLE_ID;
        document.head.appendChild(style);
    }

    const userSelectors = getUserSelectors();
    const assistantSelectors = getAssistantSelectors();
    const tableSelectors = getTableSelectors();

    const userRules = userSelectors.map((sel) => `${sel}`).join(',\n    ');
    const assistantRules = assistantSelectors.map((sel) => `${sel}`).join(',\n    ');
    const tableRules = tableSelectors.map((sel) => `${sel}`).join(',\n    ');
    traceWidth('apply-style-scope', {
        uiPercent: normalizedPercent,
        widthValue,
        userSelectors: userSelectors.length,
        assistantSelectors: assistantSelectors.length,
        tableSelectors: tableSelectors.length,
    });

    style.textContent = `
    chat-window-content > .conversation-container,
    .chat-history-scroll-container > .conversation-container,
    .chat-history > .conversation-container,
    .conversation-container {
      max-width: ${widthValue} !important;
      box-sizing: border-box !important;
    }

    ${userRules} {
      max-width: ${widthValue} !important;
    }

    ${assistantRules} {
      max-width: ${widthValue} !important;
    }

    ${tableRules} {
      max-width: ${widthValue} !important;
      box-sizing: border-box !important;
    }

    table-block .table-block,
    .table-block.has-scrollbar,
    .table-block.new-table-style {
      overflow-x: hidden !important;
    }

    table-block .table-content,
    .table-block .table-content {
      width: 100% !important;
      overflow-x: auto !important;
    }

    model-response:has(> .deferred-response-indicator),
    .response-container:has(img[src*="sparkle"]), 
    main > div:has(img[src*="sparkle"]) {
      max-width: ${widthValue} !important;
    }

    .user-query-bubble-with-background {
      max-width: ${widthValue} !important;
      width: fit-content !important;
    }
  `;
}

export function startChatWidthAdjuster() {
    let currentWidthPercent = UI_DEFAULT_PERCENT;
    refreshNativeBasePx();

    chrome.storage.local.get([StorageKeys.GEMINI_CHAT_WIDTH], (res) => {
        const raw = res[StorageKeys.GEMINI_CHAT_WIDTH];
        currentWidthPercent = toUiPercent(raw);
        applyWidth(currentWidthPercent);
    });

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes[StorageKeys.GEMINI_CHAT_WIDTH]) {
            const newWidth = changes[StorageKeys.GEMINI_CHAT_WIDTH].newValue;
            currentWidthPercent = toUiPercent(newWidth);
            applyWidth(currentWidthPercent);
        }
    });

    let debounceTimer: number | null = null;
    const observer = new MutationObserver(() => {
        if (debounceTimer !== null) clearTimeout(debounceTimer);
        debounceTimer = window.setTimeout(() => {
            if (currentWidthPercent === UI_DEFAULT_PERCENT) {
                refreshNativeBasePx();
            }
            applyWidth(currentWidthPercent);
            debounceTimer = null;
        }, 200);
    });

    const main = document.querySelector('main');
    if (main) {
        observer.observe(main, { childList: true, subtree: true });
    }

    window.addEventListener('resize', () => {
        refreshNativeBasePx();
        applyWidth(currentWidthPercent);
    });

    window.addEventListener('beforeunload', () => {
        observer.disconnect();
        const style = document.getElementById(STYLE_ID);
        if (style) style.remove();
    }, { once: true });
}
