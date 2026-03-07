/**
 * Adjusts Gemini sidebar width and positioning
 */

import { StorageKeys } from '@/core/types/common';

const STYLE_ID = 'geminimate-sidebar-width-style';
const DEFAULT_PX = 312;
const MIN_PX = 180;
const MAX_PX = 540;

const clampNumber = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, Math.round(value)));

function buildStyle(widthPx: number): string {
    const clampedWidth = `${clampNumber(widthPx, MIN_PX, MAX_PX)}px`;
    const closedWidth = 'var(--bard-sidenav-closed-width, 72px)';
    const openClosedDiff = `max(0px, calc(${clampedWidth} - ${closedWidth}))`;

    return `
    :root {
      --bard-sidenav-open-width: ${clampedWidth} !important;
      --bard-sidenav-open-closed-width-diff: ${openClosedDiff} !important;
      --gv-sidenav-shift: ${openClosedDiff} !important;
    }

    #app-root:has(side-navigation-content > div.collapsed) {
      --gv-sidenav-shift: 0px !important;
    }

    bard-sidenav {
      --bard-sidenav-open-width: ${clampedWidth} !important;
      --bard-sidenav-open-closed-width-diff: ${openClosedDiff} !important;
    }
  `;
}

function applyWidth(widthPx: number): void {
    let style = document.getElementById(STYLE_ID) as HTMLStyleElement;
    if (!style) {
        style = document.createElement('style');
        style.id = STYLE_ID;
        document.documentElement.appendChild(style);
    }
    style.textContent = buildStyle(widthPx);
}

function clearWidthOverride(): void {
    const style = document.getElementById(STYLE_ID);
    if (style) style.remove();
}

export function startSidebarWidthAdjuster(): void {
    let currentWidthValue = DEFAULT_PX;

    chrome.storage.local.get([StorageKeys.GEMINI_SIDEBAR_WIDTH], (res) => {
        const raw = res[StorageKeys.GEMINI_SIDEBAR_WIDTH];
        if (typeof raw === 'number' && Number.isFinite(raw)) {
            currentWidthValue = clampNumber(raw, MIN_PX, MAX_PX);
            applyWidth(currentWidthValue);
        } else {
            clearWidthOverride();
        }
    });

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes[StorageKeys.GEMINI_SIDEBAR_WIDTH]) {
            const w = Number(changes[StorageKeys.GEMINI_SIDEBAR_WIDTH].newValue);
            if (Number.isFinite(w)) {
                currentWidthValue = clampNumber(w, MIN_PX, MAX_PX);
                applyWidth(currentWidthValue);
            } else {
                clearWidthOverride();
            }
        }
    });

    window.addEventListener('beforeunload', () => {
        const style = document.getElementById(STYLE_ID);
        if (style) style.remove();
    }, { once: true });
}
