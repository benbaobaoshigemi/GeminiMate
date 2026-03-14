/**
 * Adjusts the edit input textarea width based on user settings.
 */

import { debugService } from '@/core/services/DebugService';
import { StorageKeys } from '@/core/types/common';

import {
    buildLinearLayoutWidths,
    DEFAULT_LAYOUT_SCALE,
    normalizeStoredLayoutScale,
} from './layoutScale';

const STYLE_ID = 'geminimate-edit-input-width';
const WIDTH_DIAG_PREFIX = '[GM-EditWidth]';

const EDIT_WIDTH_LEGACY_MIN = 30;
const EDIT_WIDTH_LEGACY_DEFAULT = 60;
const EDIT_WIDTH_LEGACY_MAX = 100;

const traceWidth = (event: string, detail: Record<string, unknown> = {}): void => {
    try {
        console.info(WIDTH_DIAG_PREFIX, { event, detail, ts: new Date().toISOString() });
        debugService.log('edit-width', event, detail);
    } catch {
        // ignore
    }
};

function getEditModeSelectors(): string[] {
    return ['.query-content.edit-mode', 'div.edit-mode', '[class*="edit-mode"]'];
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
        EDIT_WIDTH_LEGACY_DEFAULT,
        EDIT_WIDTH_LEGACY_MAX,
        EDIT_WIDTH_LEGACY_MIN,
    );
    const widths = buildLinearLayoutWidths(normalizedScale);
    const inputWidth = `${widths.editInputPx.toFixed(3)}px`;
    const sidebarOpenWidth = `${widths.sidebarExpandedPx.toFixed(3)}px`;
    const sidebarClosedWidth = `${widths.sidebarCollapsedPx.toFixed(3)}px`;
    const editModeRules = getEditModeSelectors().join(',\n    ');
    const style = ensureStyleElement();

    traceWidth('apply-linear-widths', {
        layoutScale: normalizedScale,
        editInputPx: widths.editInputPx,
        sidebarExpandedPx: widths.sidebarExpandedPx,
        sidebarCollapsedPx: widths.sidebarCollapsedPx,
    });

    style.textContent = `
    :root {
      --gm-edit-input-width: ${inputWidth} !important;
      --gm-layout-sidebar-open-baseline: ${sidebarOpenWidth} !important;
      --gm-layout-sidebar-closed-baseline: ${sidebarClosedWidth} !important;
    }

    ${editModeRules} {
      max-width: var(--gm-edit-input-width) !important;
      width: min(100%, var(--gm-edit-input-width)) !important;
      margin-left: auto !important;
      margin-right: auto !important;
    }

    .edit-mode .edit-container,
    .query-content.edit-mode .edit-container {
      max-width: var(--gm-edit-input-width) !important;
      width: min(100%, var(--gm-edit-input-width)) !important;
      margin-left: auto !important;
      margin-right: auto !important;
    }

    .edit-mode .mat-mdc-form-field,
    .edit-container .mat-mdc-form-field,
    .edit-mode .edit-form,
    .edit-mode .mat-mdc-text-field-wrapper,
    .edit-mode .mat-mdc-form-field-flex,
    .edit-mode .mdc-text-field,
    .edit-mode .mat-mdc-form-field-infix {
      max-width: var(--gm-edit-input-width) !important;
      width: 100% !important;
      box-sizing: border-box !important;
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
      max-width: var(--gm-edit-input-width) !important;
      width: min(100%, var(--gm-edit-input-width)) !important;
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
    let currentLayoutScale = DEFAULT_LAYOUT_SCALE;

    chrome.storage.local.get([StorageKeys.GEMINI_EDIT_INPUT_WIDTH], (res) => {
        currentLayoutScale = normalizeStoredLayoutScale(
            res[StorageKeys.GEMINI_EDIT_INPUT_WIDTH],
            EDIT_WIDTH_LEGACY_DEFAULT,
            EDIT_WIDTH_LEGACY_MAX,
            EDIT_WIDTH_LEGACY_MIN,
        );
        applyWidth(currentLayoutScale);
    });

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes[StorageKeys.GEMINI_EDIT_INPUT_WIDTH]) {
            currentLayoutScale = normalizeStoredLayoutScale(
                changes[StorageKeys.GEMINI_EDIT_INPUT_WIDTH].newValue,
                EDIT_WIDTH_LEGACY_DEFAULT,
                EDIT_WIDTH_LEGACY_MAX,
                EDIT_WIDTH_LEGACY_MIN,
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
