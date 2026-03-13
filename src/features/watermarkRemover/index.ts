import { debugService } from '@/core/services/DebugService';

import { type StatusToastManager, createStatusToastManager } from './statusToast';
import { WatermarkEngine } from './watermarkEngine';

const BRIDGE_ID = 'gv-watermark-bridge';
const STYLE_ID = 'gm-watermark-remover-style';
const BUTTON_CLASS = 'gm-watermark-download-btn';
const ORIGINAL_SRC_KEY = 'gmOriginalSrc';
const PROCESSED_FLAG = 'watermarkProcessed';
const PROCESSED_URL_KEY = 'processedUrl';

const STATUS_TEXT = {
  preparing: '正在准备去水印下载',
  success: '下载已开始（去水印）',
  failPrefix: '去水印下载失败',
} as const;

let running = false;
let engine: WatermarkEngine | null = null;
let statusToastManager: StatusToastManager | null = null;
let mutationObserver: MutationObserver | null = null;
const processingQueue = new Set<HTMLImageElement>();
const processedBlobUrls = new Set<string>();

const debounce = <T extends (...args: unknown[]) => void>(func: T, wait: number): T => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return ((...args: unknown[]) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
};

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.${BUTTON_CLASS} {
  position: absolute;
  right: 10px;
  bottom: 10px;
  width: 32px;
  height: 32px;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  background: rgba(12, 18, 32, 0.84);
  color: #ffe08a;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 20;
  transition: transform 120ms ease, background-color 120ms ease, box-shadow 120ms ease;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35);
}
.${BUTTON_CLASS}:hover {
  transform: translateY(-1px) scale(1.03);
  background: rgba(20, 30, 48, 0.92);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.4);
}
.${BUTTON_CLASS}:active {
  transform: translateY(0) scale(0.98);
}
`;
  document.head.appendChild(style);
}

function getBridgeElement(): HTMLElement {
  let bridge = document.getElementById(BRIDGE_ID);
  if (!bridge) {
    bridge = document.createElement('div');
    bridge.id = BRIDGE_ID;
    bridge.style.display = 'none';
    document.documentElement.appendChild(bridge);
  }
  return bridge;
}

function notifyFetchInterceptor(enabled: boolean): void {
  const bridge = getBridgeElement();
  bridge.dataset.enabled = String(enabled);
}

const canvasToBlob = (canvas: HTMLCanvasElement, type = 'image/png'): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to convert canvas to blob'));
      }
    }, type);
  });

const fetchImageViaBackground = async (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'gv.fetchImage', url }, (response: unknown) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (!response || typeof response !== 'object') {
        reject(new Error('Invalid response from background'));
        return;
      }

      const payload = response as Record<string, unknown>;
      if (payload.ok !== true || typeof payload.base64 !== 'string') {
        reject(new Error(typeof payload.error === 'string' ? payload.error : 'Failed to fetch image'));
        return;
      }

      const contentType = typeof payload.contentType === 'string' ? payload.contentType : 'image/png';
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.crossOrigin = 'anonymous';
      img.src = `data:${contentType};base64,${payload.base64}`;
    });
  });
};

const getStatusToastManager = (): StatusToastManager => {
  if (!statusToastManager) {
    statusToastManager = createStatusToastManager({ maxToasts: 4, anchorTtlMs: 30000 });
  }
  return statusToastManager;
};

const replaceWithNormalSize = (src: string): string => src.replace(/=s\d+[^?#]*/, '=s0');

function isCandidateImage(img: HTMLImageElement): boolean {
  if (!img.closest('generated-image,.generated-image-container')) return false;
  const src = img.currentSrc || img.src || '';
  if (!src) return false;
  if (src.startsWith('data:image/svg')) return false;
  if (img.naturalWidth > 0 && img.naturalWidth < 80) return false;

  return (
    src.includes('googleusercontent.com') ||
    src.includes('ggpht.com') ||
    src.startsWith('blob:') ||
    img.dataset[PROCESSED_FLAG] === 'true'
  );
}

function findGeminiImages(): HTMLImageElement[] {
  const images = document.querySelectorAll<HTMLImageElement>(
    'generated-image img, .generated-image-container img',
  );
  return [...images].filter(isCandidateImage);
}

function buildDownloadFileName(source: string): string {
  const sanitized = source.split('?')[0].split('#')[0];
  const extensionMatch = sanitized.match(/\.([a-zA-Z0-9]{3,4})$/);
  const extension = extensionMatch ? extensionMatch[1].toLowerCase() : 'png';
  return `geminimate-nowatermark-${Date.now()}.${extension}`;
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 5000);
}

async function processSourceUrlToBlob(sourceUrl: string): Promise<Blob> {
  if (!engine) {
    throw new Error('Watermark engine is not initialized');
  }

  const normalSizeSrc = replaceWithNormalSize(sourceUrl);
  const normalSizeImage = await fetchImageViaBackground(normalSizeSrc);
  const processedCanvas = await engine.removeWatermarkFromImage(normalSizeImage);
  return canvasToBlob(processedCanvas);
}

async function processImagePreview(imgElement: HTMLImageElement): Promise<void> {
  if (!running || !engine || processingQueue.has(imgElement)) return;
  if (imgElement.dataset[PROCESSED_FLAG] === 'true') return;

  processingQueue.add(imgElement);

  try {
    const currentSrc = imgElement.currentSrc || imgElement.src;
    if (!currentSrc) return;

    if (!imgElement.dataset[ORIGINAL_SRC_KEY] && /^https?:\/\//i.test(currentSrc)) {
      imgElement.dataset[ORIGINAL_SRC_KEY] = currentSrc;
    }

    const source = imgElement.dataset[ORIGINAL_SRC_KEY] || currentSrc;
    const processedBlob = await processSourceUrlToBlob(source);
    const processedUrl = URL.createObjectURL(processedBlob);
    processedBlobUrls.add(processedUrl);

    imgElement.src = processedUrl;
    imgElement.dataset[PROCESSED_FLAG] = 'true';
    imgElement.dataset[PROCESSED_URL_KEY] = processedUrl;
  } catch (error) {
    debugService.log('watermark-remover', 'preview-process-failed', { error: String(error) });
  } finally {
    processingQueue.delete(imgElement);
  }
}

async function getProcessedBlobForDownload(imgElement: HTMLImageElement): Promise<Blob> {
  const processedUrl = imgElement.dataset[PROCESSED_URL_KEY];
  if (processedUrl && processedUrl.startsWith('blob:')) {
    const response = await fetch(processedUrl);
    if (response.ok) {
      return response.blob();
    }
  }

  if (imgElement.dataset[PROCESSED_FLAG] === 'true' && imgElement.src.startsWith('blob:')) {
    const response = await fetch(imgElement.src);
    if (response.ok) {
      return response.blob();
    }
  }

  const source = imgElement.dataset[ORIGINAL_SRC_KEY] || imgElement.currentSrc || imgElement.src;
  if (!source) {
    throw new Error('Image source is unavailable');
  }

  return processSourceUrlToBlob(source);
}

function ensureContainerPosition(container: HTMLElement): void {
  const currentPosition = getComputedStyle(container).position;
  if (currentPosition === 'static') {
    container.style.position = 'relative';
  }
}

function ensureBananaDownloadButton(imgElement: HTMLImageElement): void {
  const container = imgElement.closest('generated-image,.generated-image-container') as HTMLElement | null;
  if (!container) return;

  ensureContainerPosition(container);

  let button = container.querySelector(`.${BUTTON_CLASS}`) as HTMLButtonElement | null;
  if (!button) {
    button = document.createElement('button');
    button.type = 'button';
    button.className = BUTTON_CLASS;
    button.textContent = '🍌';
    button.title = '下载去水印的图片';
    button.setAttribute('aria-label', '下载去水印的图片');
    container.appendChild(button);
  }

  button.onclick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!running || !engine) {
      return;
    }

    const manager = getStatusToastManager();
    manager.setAnchorElement(button);

    const toastId = manager.addToast(STATUS_TEXT.preparing, 'info', {
      pending: true,
      autoDismissMs: 15000,
    });

    void (async () => {
      try {
        if (imgElement.dataset[PROCESSED_FLAG] !== 'true') {
          await processImagePreview(imgElement);
        }

        const processedBlob = await getProcessedBlobForDownload(imgElement);
        const source = imgElement.dataset[ORIGINAL_SRC_KEY] || imgElement.currentSrc || imgElement.src;
        const filename = buildDownloadFileName(source);
        triggerBlobDownload(processedBlob, filename);

        manager.updateToast(toastId, STATUS_TEXT.success, 'success', {
          markFinal: true,
          autoDismissMs: 2400,
        });
      } catch (error) {
        manager.updateToast(toastId, `${STATUS_TEXT.failPrefix}: ${String(error)}`, 'error', {
          markFinal: true,
          autoDismissMs: 4200,
        });
        debugService.log('watermark-remover', 'download-process-failed', {
          error: String(error),
        });
      }
    })();
  };
}

function processAllImages(): void {
  const images = findGeminiImages();

  images.forEach((img) => {
    ensureBananaDownloadButton(img);

    const src = img.currentSrc || img.src || '';
    const shouldProcessPreview =
      img.dataset[PROCESSED_FLAG] !== 'true' &&
      (src.includes('googleusercontent.com') || src.includes('ggpht.com'));

    if (shouldProcessPreview) {
      void processImagePreview(img);
    }
  });
}

function setupMutationObserver(): void {
  if (mutationObserver) return;

  const debouncedProcess = debounce(processAllImages, 120);
  mutationObserver = new MutationObserver(() => {
    debouncedProcess();
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src', 'class'],
  });
}

export async function startWatermarkRemover(): Promise<void> {
  if (running) return;

  running = true;
  injectStyles();

  // Disable Voyager-style native download interception path.
  notifyFetchInterceptor(false);

  try {
    engine = await WatermarkEngine.create();
    if (!running) return;

    processAllImages();
    setupMutationObserver();
    debugService.log('watermark-remover', 'started');
  } catch (error) {
    running = false;
    engine = null;
    debugService.log('watermark-remover', 'start-failed', {
      error: String(error),
    });
  }
}

export function stopWatermarkRemover(): void {
  running = false;
  engine = null;
  processingQueue.clear();

  notifyFetchInterceptor(false);

  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }

  document.querySelectorAll(`.${BUTTON_CLASS}`).forEach((button) => {
    button.remove();
  });

  if (statusToastManager) {
    statusToastManager.destroy();
    statusToastManager = null;
  }

  for (const url of processedBlobUrls) {
    URL.revokeObjectURL(url);
  }
  processedBlobUrls.clear();

  const bridge = document.getElementById(BRIDGE_ID);
  if (bridge) {
    bridge.removeAttribute('data-enabled');
  }

  debugService.log('watermark-remover', 'stopped');
}
