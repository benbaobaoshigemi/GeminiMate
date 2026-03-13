/**
 * Adjusts the edit input textarea width based on user settings
 */

import { StorageKeys } from '@/core/types/common';
import { debugService } from '@/core/services/DebugService';

const STYLE_ID = 'geminimate-edit-input-width';
const UI_DEFAULT_PERCENT = 100;
const UI_MIN_PERCENT = 50;
const UI_MAX_PERCENT = 170;
const FALLBACK_NATIVE_VW = 60;
let nativeBaseVw = FALLBACK_NATIVE_VW;
const WIDTH_DIAG_PREFIX = '[GM-EditWidth]';

const traceWidth = (event: string, detail: Record<string, unknown> = {}): void => {
    try {
        console.info(WIDTH_DIAG_PREFIX, { event, detail, ts: new Date().toISOString() });
        debugService.log('edit-width', event, detail);
    } catch {
        // ignore
    }
};

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

const measureComputedMaxWidthVw = (selectors: string[]): number | null => {
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
            samples.push(toVw(maxWidthPx));
        }
    }
    if (samples.length === 0) return null;
    samples.sort((a, b) => a - b);
    return samples[Math.floor(samples.length / 2)] ?? null;
};

const measureVisibleWidthVw = (selectors: string[]): number | null => {
    for (const selector of selectors) {
        const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
        for (const element of elements) {
            const rect = element.getBoundingClientRect();
            if (rect.width < 120 || rect.height < 16) continue;
            const style = window.getComputedStyle(element);
            if (style.display === 'none' || style.visibility === 'hidden') continue;
            return toVw(rect.width);
        }
    }
    return null;
};

const refreshNativeBaseVw = (): void => {
    const style = document.getElementById(STYLE_ID);
    const previousCssText = style?.textContent ?? null;
    if (style) style.textContent = '';

    const measured =
        measureComputedMaxWidthVw([
            'input-container fieldset.input-area-container',
            'chat-window input-container fieldset.input-area-container',
            '.query-content.edit-mode',
            '.edit-container',
        ]) ??
        measureVisibleWidthVw([
            'input-container fieldset.input-area-container',
            'chat-window input-container fieldset.input-area-container',
            '.query-content.edit-mode',
            '.edit-container',
        ]) ??
        measureVisibleWidthVw(getEditModeSelectors());

    if (style && previousCssText !== null) {
        style.textContent = previousCssText;
    }

    if (measured && Number.isFinite(measured) && measured > 20 && measured <= 100) {
        nativeBaseVw = measured;
        traceWidth('native-base-measured', { nativeBaseVw });
    } else {
        traceWidth('native-base-measure-fallback', {
            measured,
            editSnapshot: collectSelectorSnapshot(getEditModeSelectors()),
            inputSnapshot: collectSelectorSnapshot([
                'input-container fieldset.input-area-container',
                'chat-window input-container fieldset.input-area-container',
            ]),
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
        const mapped = (numeric / Math.max(nativeBaseVw, 1)) * 100;
        return clampPercent(mapped, UI_MIN_PERCENT, UI_MAX_PERCENT);
    }

    return UI_DEFAULT_PERCENT;
};

const uiPercentToTargetVw = (uiPercent: number): number => {
    const normalizedUi = clampPercent(uiPercent, UI_MIN_PERCENT, UI_MAX_PERCENT);
    return (nativeBaseVw * normalizedUi) / 100;
};

function getEditModeSelectors(): string[] {
    return ['.query-content.edit-mode', 'div.edit-mode', '[class*="edit-mode"]'];
}

function applyWidth(uiPercent: number): void {
    const normalizedPercent = clampPercent(uiPercent, UI_MIN_PERCENT, UI_MAX_PERCENT);
    if (normalizedPercent === UI_DEFAULT_PERCENT) {
        const existingStyle = document.getElementById(STYLE_ID);
        if (existingStyle) existingStyle.remove();
        traceWidth('apply-native', { uiPercent: normalizedPercent, nativeBaseVw });
        return;
    }
    const targetWidthVw = uiPercentToTargetVw(normalizedPercent);
    traceWidth('apply-scaled', { uiPercent: normalizedPercent, nativeBaseVw, targetWidthVw });
    const widthValue = `${targetWidthVw.toFixed(3)}vw`;
    const widthRule = `width: min(100%, ${widthValue}) !important;`;
    let style = document.getElementById(STYLE_ID) as HTMLStyleElement;
    if (!style) {
        style = document.createElement('style');
        style.id = STYLE_ID;
        document.head.appendChild(style);
    }

    const editModeSelectors = getEditModeSelectors();
    const editModeRules = editModeSelectors.map((sel) => `${sel}`).join(',\n    ');
    traceWidth('apply-style-scope', {
        uiPercent: normalizedPercent,
        widthValue,
        editModeSelectors: editModeSelectors.length,
    });

    style.textContent = `
    ${editModeRules} {
      max-width: ${widthValue} !important;
      ${widthRule}
      margin-left: auto !important;
      margin-right: auto !important;
    }

    .edit-mode .edit-container,
    .query-content.edit-mode .edit-container {
      max-width: ${widthValue} !important;
      ${widthRule}
      margin-left: auto !important;
      margin-right: auto !important;
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
      max-width: 100% !important;
      width: 100% !important;
      box-sizing: border-box !important;
    }

    input-container fieldset.input-area-container,
    chat-window input-container fieldset.input-area-container {
      max-width: ${widthValue} !important;
      ${widthRule}
      margin-left: auto !important;
      margin-right: auto !important;
    }

    input-container .input-area-container,
    input-area-v2,
    input-area-v2 .input-area-container {
      width: 100% !important;
      box-sizing: border-box !important;
    }
  `;
}

export function startEditInputWidthAdjuster(): void {
    let currentWidthPercent = UI_DEFAULT_PERCENT;
    refreshNativeBaseVw();

    chrome.storage.local.get([StorageKeys.GEMINI_EDIT_INPUT_WIDTH], (res) => {
        const raw = res[StorageKeys.GEMINI_EDIT_INPUT_WIDTH];
        currentWidthPercent = toUiPercent(raw);
        applyWidth(currentWidthPercent);
    });

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes[StorageKeys.GEMINI_EDIT_INPUT_WIDTH]) {
            const newWidth = changes[StorageKeys.GEMINI_EDIT_INPUT_WIDTH].newValue;
            currentWidthPercent = toUiPercent(newWidth);
            applyWidth(currentWidthPercent);
        }
    });

    let debounceTimer: number | null = null;
    const observer = new MutationObserver(() => {
        if (debounceTimer !== null) clearTimeout(debounceTimer);
        debounceTimer = window.setTimeout(() => {
            if (currentWidthPercent === UI_DEFAULT_PERCENT) {
                refreshNativeBaseVw();
            }
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
