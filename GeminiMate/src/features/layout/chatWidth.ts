/**
 * Adjusts the chat area width based on user settings
 */

import { StorageKeys } from '@/core/types/common';

const STYLE_ID = 'geminimate-chat-width';
const DEFAULT_PERCENT = 70;
const MIN_PERCENT = 30;
const MAX_PERCENT = 100;

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

function applyWidth(widthPercent: number) {
    const normalizedPercent = clampPercent(widthPercent, MIN_PERCENT, MAX_PERCENT);
    const widthValue = `${normalizedPercent}vw`;
    const panoramaCleanupRules =
      normalizedPercent >= 95
        ? `
    chat-window > div > input-container,
    chat-window input-container,
    input-container.input-gradient,
    input-container[class*="input-gradient"],
    input-gradient,
    .input-gradient {
      background: transparent !important;
      background-color: transparent !important;
      background-image: none !important;
      box-shadow: none !important;
      -webkit-box-shadow: none !important;
      filter: none !important;
      mask-image: none !important;
      -webkit-mask-image: none !important;
      --bard-color-synthetic--chat-window-surface: transparent !important;
    }

    chat-window > div > input-container::before,
    chat-window > div > input-container::after,
    input-container.input-gradient::before,
    input-container.input-gradient::after,
    input-container[class*="input-gradient"]::before,
    input-container[class*="input-gradient"]::after,
    input-gradient::before,
    input-gradient::after,
    .input-gradient::before,
    .input-gradient::after {
      display: none !important;
      content: none !important;
      background: transparent !important;
      opacity: 0 !important;
      mask-image: none !important;
      -webkit-mask-image: none !important;
    }

    .autosuggest-scrim,
    chat-window-content > .autosuggest-scrim {
      display: none !important;
      opacity: 0 !important;
      pointer-events: none !important;
      background: transparent !important;
      background-image: none !important;
    }

    .hidden-content-image-cache,
    chat-window-content > div.hidden-content-image-cache,
    chat-window-content > .hidden-content-image-cache,
    chat-window .hidden-content-image-cache {
      display: none !important;
      background: transparent !important;
      background-image: none !important;
    }

    chat-window > div,
    chat-window-content,
    input-container fieldset.input-area-container,
    input-container .input-area-container,
    condensed-tos-disclaimer,
    hallucination-disclaimer {
      background: transparent !important;
      background-image: none !important;
      max-width: 100% !important;
      width: 100% !important;
    }
  `
        : '';

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

    const GAP_PX = 10;

    style.textContent = `
    /* Remove width constraints from outer containers that contain conversations */
    .content-wrapper:has(chat-window),
    .main-content:has(chat-window),
    .content-container:has(chat-window),
    .content-container:has(.conversation-container) {
      max-width: none !important;
    }

    /* Remove width constraints from main and conversation containers, but not buttons */
    [role="main"]:has(chat-window),
    [role="main"]:has(.conversation-container) {
      max-width: none !important;
    }

    /* Target chat window and related containers; A small gap to account for scrollbars */
    chat-window,
    .chat-container,
    chat-window-content,
    .chat-history-scroll-container,
    .chat-history,
    .conversation-container {
      max-width: none !important;
      padding-right: ${GAP_PX}px !important;
      box-sizing: border-box !important;
    }

    main > div:has(user-query),
    main > div:has(model-response),
    main > div:has(.conversation-container) {
      max-width: none !important;
      width: 100% !important;
    }

    @supports not selector(:has(*)) {
      .content-wrapper,
      .main-content,
      .content-container {
        max-width: none !important;
      }

      main > div:not(:has(button)):not(.main-menu-button) {
        max-width: none !important;
        width: 100% !important;
      }
    }

    ${userRules} {
      max-width: ${widthValue} !important;
      width: min(100%, ${widthValue}) !important;
      margin-left: auto !important;
      margin-right: auto !important;
    }

    ${assistantRules} {
      max-width: ${widthValue} !important;
      width: min(100%, ${widthValue}) !important;
      margin-left: auto !important;
      margin-right: auto !important;
    }

    ${tableRules} {
      max-width: ${widthValue} !important;
      width: min(100%, ${widthValue}) !important;
      margin-left: auto !important;
      margin-right: auto !important;
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
      width: min(100%, ${widthValue}) !important;
      margin-left: auto !important;
      margin-right: auto !important;
    }

    user-query,
    user-query > *,
    user-query > * > *,
    model-response,
    model-response > *,
    model-response > * > *,
    response-container,
    response-container > *,
    response-container > * > * {
      max-width: ${widthValue} !important;
    }

    .presented-response-container,
    [data-message-author-role] {
      max-width: ${widthValue} !important;
    }

    .user-query-bubble-with-background {
      max-width: ${widthValue} !important;
      width: fit-content !important;
    }

    ${panoramaCleanupRules}
  `;
}

export function startChatWidthAdjuster() {
    let currentWidthPercent = DEFAULT_PERCENT;

    chrome.storage.local.get({ [StorageKeys.GEMINI_CHAT_WIDTH]: DEFAULT_PERCENT }, (res) => {
        const raw = res[StorageKeys.GEMINI_CHAT_WIDTH];
        currentWidthPercent = clampPercent(Number(raw) || DEFAULT_PERCENT, MIN_PERCENT, MAX_PERCENT);
        applyWidth(currentWidthPercent);
    });

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes[StorageKeys.GEMINI_CHAT_WIDTH]) {
            const newWidth = changes[StorageKeys.GEMINI_CHAT_WIDTH].newValue;
            if (typeof newWidth === 'number') {
                currentWidthPercent = clampPercent(newWidth, MIN_PERCENT, MAX_PERCENT);
                applyWidth(currentWidthPercent);
            }
        }
    });

    let debounceTimer: number | null = null;
    const observer = new MutationObserver(() => {
        if (debounceTimer !== null) clearTimeout(debounceTimer);
        debounceTimer = window.setTimeout(() => {
            applyWidth(currentWidthPercent);
            debounceTimer = null;
        }, 200);
    });

    const main = document.querySelector('main');
    if (main) {
        observer.observe(main, { childList: true, subtree: true });
    }

    window.addEventListener('beforeunload', () => {
        observer.disconnect();
        const style = document.getElementById(STYLE_ID);
        if (style) style.remove();
    }, { once: true });
}
