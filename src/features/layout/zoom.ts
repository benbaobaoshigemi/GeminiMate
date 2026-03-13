import { StorageKeys } from '@/core/types/common';

const DEFAULT_ZOOM = 110;
const MIN_ZOOM = 90;
const MAX_ZOOM = 120;

const clampZoom = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value)));

export function startZoomAdjuster(): void {
    let currentZoom = DEFAULT_ZOOM;

    const applyZoom = (zoomValue: number) => {
        const val = clampZoom(zoomValue);
        // Cast to 'any' since zoom is not a standard property in typescript dom lib yet
        (document.documentElement.style as any).zoom = `${val}%`;
    };

    chrome.storage.local.get({ [StorageKeys.GEMINI_ZOOM_LEVEL]: DEFAULT_ZOOM }, (res) => {
        currentZoom = Number(res[StorageKeys.GEMINI_ZOOM_LEVEL]) || DEFAULT_ZOOM;
        applyZoom(currentZoom);
    });

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes[StorageKeys.GEMINI_ZOOM_LEVEL]) {
            const z = Number(changes[StorageKeys.GEMINI_ZOOM_LEVEL].newValue);
            if (Number.isFinite(z)) {
                currentZoom = z;
                applyZoom(currentZoom);
            }
        }
    });

    window.addEventListener('beforeunload', () => {
        (document.documentElement.style as any).zoom = '';
    }, { once: true });
}
