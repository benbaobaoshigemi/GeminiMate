import { StorageKeys } from '@/core/types/common';

const DEFAULT_ZOOM = 110;

function applyZoom(zoomPercent: number) {
    const zoomValue = zoomPercent / 100;
    // Use zoom property for best compatibility with Gemini's layout
    // Fallback to transform if needed, but zoom is cleaner for layout recalculation
    (document.body.style as any).zoom = zoomValue.toString();
}

export function startPageZoom() {
    chrome.storage.local.get({ [StorageKeys.GEMINI_PAGE_ZOOM]: DEFAULT_ZOOM }, (res) => {
        applyZoom(res[StorageKeys.GEMINI_PAGE_ZOOM]);
    });

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes[StorageKeys.GEMINI_PAGE_ZOOM]) {
            applyZoom(changes[StorageKeys.GEMINI_PAGE_ZOOM].newValue);
        }
    });
}
