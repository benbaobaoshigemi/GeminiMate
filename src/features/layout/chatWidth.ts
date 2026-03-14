/**
 * Adjusts the chat area width based on user settings.
 */

import { debugService } from '@/core/services/DebugService';
import { StorageKeys } from '@/core/types/common';

import {
    buildLinearLayoutWidths,
    DEFAULT_LAYOUT_SCALE,
    normalizeStoredLayoutScale,
} from './layoutScale';

const STYLE_ID = 'geminimate-chat-width';
const WIDTH_DIAG_PREFIX = '[GM-ChatWidth]';

const CHAT_WIDTH_LEGACY_MIN = 30;
const CHAT_WIDTH_LEGACY_DEFAULT = 70;
const CHAT_WIDTH_LEGACY_MAX = 100;

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

function getDualColumnSelectors(): string[] {
    return [
        'table-block',
        '.table-block',
        'table-block .table-block',
        'table-block .table-content',
        '.table-block.new-table-style',
        '.table-block.has-scrollbar',
        '.table-block .table-content',
        '.table-block-component',
        '.table-block-component > response-element',
        '.table-block-component response-element',
        '.table-block-component table-block',
        '.table-block-component .horizontal-scroll-wrapper',
        '.table-block-component .table-footer',
        '.horizontal-scroll-wrapper',
        '.table-footer',
    ];
}

const ensureStyleElement = (): HTMLStyleElement => {
    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!style) {
        style = document.createElement('style');
        style.id = STYLE_ID;
        document.head.appendChild(style);
    }
    return style;
};

function applyWidth(layoutScale: number): void {
    const normalizedScale = normalizeStoredLayoutScale(
        layoutScale,
        CHAT_WIDTH_LEGACY_DEFAULT,
        CHAT_WIDTH_LEGACY_MAX,
        CHAT_WIDTH_LEGACY_MIN,
    );
    const widths = buildLinearLayoutWidths(normalizedScale);
    const standardWidth = `${widths.chatStandardPx.toFixed(3)}px`;
    const dualColumnWidth = `${widths.chatDualColumnPx.toFixed(3)}px`;
    const style = ensureStyleElement();

    const userRules = getUserSelectors().join(',\n    ');
    const assistantRules = getAssistantSelectors().join(',\n    ');
    const dualColumnRules = getDualColumnSelectors().join(',\n    ');

    traceWidth('apply-linear-widths', {
        layoutScale: normalizedScale,
        chatStandardPx: widths.chatStandardPx,
        chatDualColumnPx: widths.chatDualColumnPx,
    });

    style.textContent = `
    :root {
      --gm-chat-width-standard: ${standardWidth} !important;
      --gm-chat-width-dual-column: ${dualColumnWidth} !important;
    }

    chat-window-content > .conversation-container,
    .chat-history-scroll-container > .conversation-container,
    .chat-history > .conversation-container,
    .conversation-container {
      max-width: var(--gm-chat-width-standard) !important;
      box-sizing: border-box !important;
    }

    ${userRules} {
      max-width: var(--gm-chat-width-standard) !important;
    }

    ${assistantRules} {
      max-width: var(--gm-chat-width-standard) !important;
    }

    ${dualColumnRules} {
      max-width: var(--gm-chat-width-dual-column) !important;
      box-sizing: border-box !important;
    }

    .horizontal-scroll-wrapper,
    .horizontal-scroll-wrapper > .table-block-component,
    .table-block-component,
    .table-block-component > response-element,
    .table-block-component response-element,
    .table-block-component table-block,
    table-block,
    table-block .table-block,
    .table-block,
    .table-block.has-scrollbar,
    .table-block.new-table-style {
      display: block !important;
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      box-sizing: border-box !important;
    }

    table-block .table-block,
    .table-block.has-scrollbar,
    .table-block.new-table-style {
      overflow-x: hidden !important;
    }

    table-block .table-content,
    .table-block .table-content,
    .table-block-component .horizontal-scroll-wrapper,
    .horizontal-scroll-wrapper {
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      overflow-x: auto !important;
      box-sizing: border-box !important;
    }

    table-block .table-footer,
    .table-block .table-footer,
    .table-block-component .table-footer,
    .table-footer {
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      box-sizing: border-box !important;
    }

    model-response:has(> .deferred-response-indicator),
    .response-container:has(img[src*="sparkle"]),
    main > div:has(img[src*="sparkle"]) {
      max-width: var(--gm-chat-width-standard) !important;
    }

    .user-query-bubble-with-background {
      max-width: var(--gm-chat-width-standard) !important;
      width: fit-content !important;
    }
  `;
}

export function startChatWidthAdjuster(): void {
    let currentLayoutScale = DEFAULT_LAYOUT_SCALE;

    chrome.storage.local.get([StorageKeys.GEMINI_CHAT_WIDTH], (res) => {
        currentLayoutScale = normalizeStoredLayoutScale(
            res[StorageKeys.GEMINI_CHAT_WIDTH],
            CHAT_WIDTH_LEGACY_DEFAULT,
            CHAT_WIDTH_LEGACY_MAX,
            CHAT_WIDTH_LEGACY_MIN,
        );
        applyWidth(currentLayoutScale);
    });

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes[StorageKeys.GEMINI_CHAT_WIDTH]) {
            currentLayoutScale = normalizeStoredLayoutScale(
                changes[StorageKeys.GEMINI_CHAT_WIDTH].newValue,
                CHAT_WIDTH_LEGACY_DEFAULT,
                CHAT_WIDTH_LEGACY_MAX,
                CHAT_WIDTH_LEGACY_MIN,
            );
            applyWidth(currentLayoutScale);
        }
    });

    window.addEventListener(
        'beforeunload',
        () => {
            const style = document.getElementById(STYLE_ID);
            if (style) style.remove();
        },
        { once: true },
    );
}
