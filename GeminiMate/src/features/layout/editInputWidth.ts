/**
 * Adjusts the edit input textarea width based on user settings
 */

import { StorageKeys } from '@/core/types/common';

const STYLE_ID = 'geminimate-edit-input-width';
const DEFAULT_PERCENT = 60;
const MIN_PERCENT = 30;
const MAX_PERCENT = 100;

const clampPercent = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, Math.round(value)));

function getEditModeSelectors(): string[] {
    return ['.query-content.edit-mode', 'div.edit-mode', '[class*="edit-mode"]'];
}

function applyWidth(widthPercent: number): void {
    const normalizedPercent = clampPercent(widthPercent, MIN_PERCENT, MAX_PERCENT);
    const widthValue = `${normalizedPercent}vw`;

    let style = document.getElementById(STYLE_ID) as HTMLStyleElement;
    if (!style) {
        style = document.createElement('style');
        style.id = STYLE_ID;
        document.head.appendChild(style);
    }

    const editModeSelectors = getEditModeSelectors();
    const editModeRules = editModeSelectors.map((sel) => `${sel}`).join(',\n    ');

    style.textContent = `
    .content-wrapper:has(.edit-mode),
    .main-content:has(.edit-mode),
    .content-container:has(.edit-mode) {
      max-width: none !important;
    }

    [role="main"]:has(.edit-mode) {
      max-width: none !important;
    }

    main > div:has(.edit-mode) {
      max-width: none !important;
      width: 100% !important;
    }

    ${editModeRules} {
      max-width: ${widthValue} !important;
      width: min(100%, ${widthValue}) !important;
    }

    .edit-mode .edit-container,
    .query-content.edit-mode .edit-container {
      max-width: ${widthValue} !important;
      width: min(100%, ${widthValue}) !important;
    }

    .edit-mode .mat-mdc-form-field,
    .edit-container .mat-mdc-form-field,
    .edit-mode .edit-form {
      max-width: ${widthValue} !important;
      width: 100% !important;
    }

    .edit-mode .mat-mdc-text-field-wrapper,
    .edit-mode .mat-mdc-form-field-flex,
    .edit-mode .mdc-text-field {
      max-width: ${widthValue} !important;
      width: 100% !important;
    }

    .edit-mode .mat-mdc-form-field-infix {
      max-width: ${widthValue} !important;
      width: 100% !important;
    }

    .edit-mode textarea,
    .edit-container textarea,
    .edit-mode .mat-mdc-input-element,
    .edit-mode .cdk-textarea-autosize {
      max-width: ${widthValue} !important;
      width: 100% !important;
      box-sizing: border-box !important;
    }

    input-container {
      max-width: ${widthValue} !important;
      width: min(100%, ${widthValue}) !important;
      margin-left: auto !important;
      margin-right: auto !important;
    }

    input-container .input-area-container {
      max-width: 100% !important;
      width: 100% !important;
    }

    input-area-v2 {
      max-width: 100% !important;
      width: 100% !important;
    }

    input-area-v2 .input-area {
      max-width: 100% !important;
      width: 100% !important;
    }

    @supports not selector(:has(*)) {
      .content-wrapper,
      .main-content,
      .content-container {
        max-width: none !important;
      }
    }
  `;
}

export function startEditInputWidthAdjuster(): void {
    let currentWidthPercent = DEFAULT_PERCENT;

    chrome.storage.local.get({ [StorageKeys.GEMINI_EDIT_INPUT_WIDTH]: DEFAULT_PERCENT }, (res) => {
        const raw = res[StorageKeys.GEMINI_EDIT_INPUT_WIDTH];
        currentWidthPercent = clampPercent(Number(raw) || DEFAULT_PERCENT, MIN_PERCENT, MAX_PERCENT);
        applyWidth(currentWidthPercent);
    });

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes[StorageKeys.GEMINI_EDIT_INPUT_WIDTH]) {
            const newWidth = changes[StorageKeys.GEMINI_EDIT_INPUT_WIDTH].newValue;
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
        observer.observe(main, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class'],
        });
    }

    window.addEventListener('beforeunload', () => {
        observer.disconnect();
        const style = document.getElementById(STYLE_ID);
        if (style) style.remove();
    }, { once: true });
}
