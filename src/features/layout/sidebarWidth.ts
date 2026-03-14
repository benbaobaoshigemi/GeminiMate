/**
 * Adjusts Gemini sidebar width and positioning
 */

import { StorageKeys } from '@/core/types/common';
import {
    SIDEBAR_COLLAPSED_BASELINE_PX,
    SIDEBAR_EXPANDED_BASELINE_PX,
} from './layoutScale';

const STYLE_ID = 'geminimate-sidebar-width-style';
const DEFAULT_PX = SIDEBAR_EXPANDED_BASELINE_PX;
const MIN_PX = 180;
const MAX_PX = 540;

const clampNumber = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, Math.round(value)));

function buildStyle(widthPx: number): string {
    const clampedWidth = `${clampNumber(widthPx, MIN_PX, MAX_PX)}px`;
    const closedWidth = `${SIDEBAR_COLLAPSED_BASELINE_PX}px`;
    const openClosedDiff = `max(0px, calc(${clampedWidth} - ${closedWidth}))`;

    return `
    :root {
      --bard-sidenav-open-width: ${clampedWidth} !important;
      --bard-sidenav-closed-width: ${closedWidth} !important;
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

export function startSidebarWidthAdjuster(): void {
    let currentWidthValue = DEFAULT_PX;

    chrome.storage.local.get([StorageKeys.GEMINI_SIDEBAR_WIDTH], (res) => {
        const raw = res[StorageKeys.GEMINI_SIDEBAR_WIDTH];
        if (typeof raw === 'number' && Number.isFinite(raw)) {
            currentWidthValue = clampNumber(raw, MIN_PX, MAX_PX);
        } else {
            currentWidthValue = DEFAULT_PX;
        }
        applyWidth(currentWidthValue);
    });

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes[StorageKeys.GEMINI_SIDEBAR_WIDTH]) {
            const w = Number(changes[StorageKeys.GEMINI_SIDEBAR_WIDTH].newValue);
            if (Number.isFinite(w)) {
                currentWidthValue = clampNumber(w, MIN_PX, MAX_PX);
                applyWidth(currentWidthValue);
            } else {
                currentWidthValue = DEFAULT_PX;
                applyWidth(currentWidthValue);
            }
        }
    });

    window.addEventListener('beforeunload', () => {
        const style = document.getElementById(STYLE_ID);
        if (style) style.remove();
    }, { once: true });
}
