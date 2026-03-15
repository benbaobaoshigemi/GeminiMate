import { debugService } from '@/core/services/DebugService';

import { findNativeDownloadButton, findNativeDownloadButtonInContainer } from './downloadButton';
import { resolveWatermarkFetchPlan } from './fetchStrategy';
import { type StatusToastManager, createStatusToastManager } from './statusToast';
import { WatermarkEngine } from './watermarkEngine';

const BRIDGE_ID = 'gv-watermark-bridge';
const STYLE_ID = 'gm-watermark-remover-style';
const BUTTON_CLASS = 'gm-watermark-download-btn';
const ORIGINAL_SRC_KEY = 'gmOriginalSrc';
const PROCESSED_FLAG = 'watermarkProcessed';
const PROCESSED_URL_KEY = 'processedUrl';
const LARGE_WARNING_AUTO_DISMISS_MS = 8000;
const PROCESSING_FALLBACK_AUTO_DISMISS_MS = 35000;

const STATUS_TEXT = {
  downloading: '正在下载原始图片',
  downloadingLarge: '正在下载原始图片（大文件）',
  largeWarning: '大文件警告',
  processing: '正在处理水印中',
  success: '下载已开始（去水印）',
  failPrefix: '去水印下载失败',
  missingNativeButton: '未找到 Gemini 原生下载按钮',
} as const;

type DownloadToastSequence = {
  id: number;
  downloadToastId: string | null;
  warningToastId: string | null;
  processingToastId: string | null;
  processingTimer: ReturnType<typeof setTimeout> | null;
};

let running = false;
let engine: WatermarkEngine | null = null;
let statusToastManager: StatusToastManager | null = null;
let mutationObserver: MutationObserver | null = null;
let fetchBridgeObserver: MutationObserver | null = null;
let statusObserver: MutationObserver | null = null;
let downloadTrackingReady = false;
let lastImmediateToastAt = 0;
let sequenceCounter = 0;
let activeSequence: DownloadToastSequence | null = null;
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
  border: 1px solid rgba(59, 130, 246, 0.45);
  background: rgba(239, 246, 255, 0.96);
  color: #1d4ed8;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 20;
  transition: transform 120ms ease, background-color 120ms ease, box-shadow 120ms ease;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
}
.${BUTTON_CLASS}:hover {
  transform: translateY(-1px) scale(1.03);
  background: rgba(219, 234, 254, 0.98);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.14);
}
.${BUTTON_CLASS}:active {
  transform: translateY(0) scale(0.98);
}
@media (prefers-color-scheme: dark) {
  .${BUTTON_CLASS} {
    border-color: rgba(59, 130, 246, 0.45);
    background: rgba(10, 25, 47, 0.92);
    color: #93c5fd;
    box-shadow: 0 8px 24px rgba(2, 6, 23, 0.28);
  }
  .${BUTTON_CLASS}:hover {
    background: rgba(15, 36, 68, 0.98);
  }
}
.theme-host.dark-theme .${BUTTON_CLASS},
html.dark .${BUTTON_CLASS},
body.dark .${BUTTON_CLASS},
html[data-theme='dark'] .${BUTTON_CLASS},
body[data-theme='dark'] .${BUTTON_CLASS},
html[data-color-scheme='dark'] .${BUTTON_CLASS},
body[data-color-scheme='dark'] .${BUTTON_CLASS} {
  border-color: rgba(59, 130, 246, 0.45);
  background: rgba(10, 25, 47, 0.92);
  color: #93c5fd;
  box-shadow: 0 8px 24px rgba(2, 6, 23, 0.28);
}
.theme-host.dark-theme .${BUTTON_CLASS}:hover,
html.dark .${BUTTON_CLASS}:hover,
body.dark .${BUTTON_CLASS}:hover,
html[data-theme='dark'] .${BUTTON_CLASS}:hover,
body[data-theme='dark'] .${BUTTON_CLASS}:hover,
html[data-color-scheme='dark'] .${BUTTON_CLASS}:hover,
body[data-color-scheme='dark'] .${BUTTON_CLASS}:hover {
  background: rgba(15, 36, 68, 0.98);
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

const canvasToDataURL = (canvas: HTMLCanvasElement, type = 'image/png'): string =>
  canvas.toDataURL(type);

const blobToImageElement = async (blob: Blob): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to decode image'));
    };
    img.crossOrigin = 'anonymous';
    img.src = objectUrl;
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

const fetchImageViaPage = async (url: string): Promise<HTMLImageElement> => {
  try {
    const response = await fetch(url, { credentials: 'include', redirect: 'follow' });
    if (response.ok) {
      return blobToImageElement(await response.blob());
    }
  } catch {
    // ignore and retry without credentials
  }

  const fallbackResponse = await fetch(url, { credentials: 'omit', redirect: 'follow' });
  if (!fallbackResponse.ok) {
    throw new Error(`HTTP ${fallbackResponse.status}`);
  }
  return blobToImageElement(await fallbackResponse.blob());
};

const getStatusToastManager = (): StatusToastManager => {
  if (!statusToastManager) {
    statusToastManager = createStatusToastManager({ maxToasts: 4, anchorTtlMs: 30000 });
  }
  return statusToastManager;
};

const replaceWithNormalSize = (src: string): string =>
  /^https?:\/\//i.test(src) ? src.replace(/=s\d+[^?#]*/, '=s0') : src;

const renderImageElementToCanvas = (imgElement: HTMLImageElement): HTMLCanvasElement => {
  if (imgElement.naturalWidth <= 0 || imgElement.naturalHeight <= 0) {
    throw new Error('Rendered image is not ready');
  }

  const canvas = document.createElement('canvas');
  canvas.width = imgElement.naturalWidth;
  canvas.height = imgElement.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas 2d context');
  }

  ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);
  return canvas;
};

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

async function processSourceUrlToBlob(
  sourceUrl: string,
  imgElement?: HTMLImageElement,
): Promise<Blob> {
  if (!engine) {
    throw new Error('Watermark engine is not initialized');
  }

  const normalSizeSrc = replaceWithNormalSize(sourceUrl);
  const fetchPlan = resolveWatermarkFetchPlan({
    sourceUrl: normalSizeSrc,
    hasProcessedBlobUrl: false,
    hasRenderableImageElement: imgElement instanceof HTMLImageElement,
  });

  let sourceRenderable: HTMLImageElement | HTMLCanvasElement | null = null;
  let lastError: unknown = null;

  for (const step of fetchPlan) {
    try {
      if (step === 'background-runtime') {
        sourceRenderable = await fetchImageViaBackground(normalSizeSrc);
        break;
      }
      if (step === 'page-fetch') {
        sourceRenderable = await fetchImageViaPage(normalSizeSrc);
        break;
      }
      if (step === 'rendered-image' && imgElement) {
        sourceRenderable = renderImageElementToCanvas(imgElement);
        break;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (!sourceRenderable) {
    throw new Error(lastError instanceof Error ? lastError.message : 'Failed to fetch');
  }

  const processedCanvas = await engine.removeWatermarkFromImage(sourceRenderable);
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
    const processedBlob = await processSourceUrlToBlob(source, imgElement);
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

async function processImageRequest(
  requestId: string,
  base64: string,
  bridge: HTMLElement,
): Promise<void> {
  if (!engine) {
    bridge.dataset.response = JSON.stringify({
      requestId,
      error: 'Watermark engine is not initialized',
    });
    return;
  }

  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.crossOrigin = 'anonymous';
      img.src = base64;
    });

    const processedCanvas = await engine.removeWatermarkFromImage(img);
    bridge.dataset.response = JSON.stringify({
      requestId,
      base64: canvasToDataURL(processedCanvas),
    });
  } catch (error) {
    bridge.dataset.response = JSON.stringify({
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function setupFetchInterceptorBridge(): void {
  if (fetchBridgeObserver) return;

  const bridge = getBridgeElement();
  fetchBridgeObserver = new MutationObserver(() => {
    const requestData = bridge.dataset.request;
    if (!requestData) return;

    bridge.removeAttribute('data-request');

    let parsed: unknown;
    try {
      parsed = JSON.parse(requestData);
    } catch (error) {
      debugService.log('watermark-remover', 'bridge-request-parse-failed', {
        error: String(error),
      });
      return;
    }

    if (!parsed || typeof parsed !== 'object') {
      return;
    }

    const payload = parsed as Record<string, unknown>;
    const requestId = typeof payload.requestId === 'string' ? payload.requestId : '';
    const base64 = typeof payload.base64 === 'string' ? payload.base64 : '';
    if (!requestId || !base64) {
      return;
    }

    void processImageRequest(requestId, base64, bridge);
  });

  fetchBridgeObserver.observe(bridge, { attributes: true, attributeFilter: ['data-request'] });
}

function clearActiveSequenceTimers(): void {
  if (!activeSequence?.processingTimer) return;
  clearTimeout(activeSequence.processingTimer);
  activeSequence.processingTimer = null;
}

function showImmediateDownloadToast(button: HTMLButtonElement): void {
  const now = Date.now();
  if (now - lastImmediateToastAt < 300) return;
  lastImmediateToastAt = now;

  const manager = getStatusToastManager();
  manager.setAnchorElement(button);

  clearActiveSequenceTimers();

  const sequenceId = ++sequenceCounter;
  const downloadToastId = manager.addToast(STATUS_TEXT.downloading, 'info', {
    autoDismissMs: 3000,
  });

  const processingTimer = setTimeout(() => {
    if (!activeSequence || activeSequence.id !== sequenceId) return;
    if (activeSequence.downloadToastId) {
      manager.removeToast(activeSequence.downloadToastId);
      activeSequence.downloadToastId = null;
    }
    if (!activeSequence.processingToastId) {
      activeSequence.processingToastId = manager.addToast(STATUS_TEXT.processing, 'info', {
        pending: true,
        autoDismissMs: PROCESSING_FALLBACK_AUTO_DISMISS_MS,
      });
    }
  }, 3000);

  activeSequence = {
    id: sequenceId,
    downloadToastId,
    warningToastId: null,
    processingToastId: null,
    processingTimer,
  };
}

function setupDownloadButtonTracking(): void {
  if (downloadTrackingReady) return;
  downloadTrackingReady = true;

  const captureAnchor = (event: Event): void => {
    if (!running) return;
    const button = findNativeDownloadButton(event.target);
    if (!button) return;
    showImmediateDownloadToast(button);
  };

  document.addEventListener('pointerdown', captureAnchor, true);
  document.addEventListener('click', captureAnchor, true);
}

function setupStatusListener(): void {
  if (statusObserver) return;

  const bridge = getBridgeElement();
  const manager = getStatusToastManager();

  const finalizeSequence = (level: 'success' | 'error', message: string): void => {
    clearActiveSequenceTimers();

    if (activeSequence?.warningToastId) {
      manager.removeToast(activeSequence.warningToastId);
      activeSequence.warningToastId = null;
    }
    if (activeSequence?.downloadToastId) {
      manager.removeToast(activeSequence.downloadToastId);
      activeSequence.downloadToastId = null;
    }

    if (
      activeSequence?.processingToastId &&
      manager.updateToast(activeSequence.processingToastId, message, level, {
        autoDismissMs: level === 'success' ? 2400 : 4200,
        markFinal: true,
      })
    ) {
      return;
    }

    if (
      !manager.updateLatestPending(message, level, {
        autoDismissMs: level === 'success' ? 2400 : 4200,
        markFinal: true,
      })
    ) {
      manager.addToast(message, level, {
        autoDismissMs: level === 'success' ? 2400 : 4200,
      });
    }
  };

  const handleStatus = (statusData: string): void => {
    if (!statusData) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(statusData);
    } catch (error) {
      debugService.log('watermark-remover', 'status-parse-failed', { error: String(error) });
      bridge.removeAttribute('data-status');
      return;
    }

    bridge.removeAttribute('data-status');
    if (!parsed || typeof parsed !== 'object') return;

    const payload = parsed as Record<string, unknown>;
    const type = typeof payload.type === 'string' ? payload.type : '';
    const message = typeof payload.message === 'string' ? payload.message : '';

    switch (type) {
      case 'DOWNLOADING':
        if (activeSequence && !activeSequence.downloadToastId) {
          activeSequence.downloadToastId = manager.addToast(STATUS_TEXT.downloading, 'info', {
            autoDismissMs: 3000,
          });
        }
        break;
      case 'DOWNLOADING_LARGE':
        if (!activeSequence) break;
        if (!activeSequence.downloadToastId) {
          activeSequence.downloadToastId = manager.addToast(STATUS_TEXT.downloadingLarge, 'info', {
            autoDismissMs: 3000,
          });
        } else {
          manager.updateToast(activeSequence.downloadToastId, STATUS_TEXT.downloadingLarge, 'info');
        }
        if (!activeSequence.warningToastId) {
          activeSequence.warningToastId = manager.addToast(STATUS_TEXT.largeWarning, 'warning', {
            autoDismissMs: LARGE_WARNING_AUTO_DISMISS_MS,
          });
        }
        break;
      case 'PROCESSING':
        if (activeSequence?.processingToastId) {
          manager.updateToast(activeSequence.processingToastId, STATUS_TEXT.processing, 'info');
          break;
        }
        if (!activeSequence?.processingTimer) {
          const processingToastId = manager.addToast(STATUS_TEXT.processing, 'info', {
            pending: true,
            autoDismissMs: PROCESSING_FALLBACK_AUTO_DISMISS_MS,
          });
          if (activeSequence) {
            activeSequence.processingToastId = processingToastId;
          }
        }
        break;
      case 'SUCCESS':
        finalizeSequence('success', STATUS_TEXT.success);
        break;
      case 'ERROR':
        finalizeSequence('error', `${STATUS_TEXT.failPrefix}: ${message}`);
        break;
    }
  };

  statusObserver = new MutationObserver(() => {
    const statusData = bridge.dataset.status;
    if (!statusData) return;
    handleStatus(statusData);
  });

  statusObserver.observe(bridge, { attributes: true, attributeFilter: ['data-status'] });
  if (bridge.dataset.status) {
    handleStatus(bridge.dataset.status);
  }
}

function ensureContainerPosition(container: HTMLElement): void {
  const currentPosition = getComputedStyle(container).position;
  if (currentPosition === 'static') {
    container.style.position = 'relative';
  }
}

function removeBananaButton(container: HTMLElement): void {
  const button = container.querySelector(`.${BUTTON_CLASS}`);
  if (button) {
    button.remove();
  }
}

function ensureBananaDownloadButton(imgElement: HTMLImageElement): void {
  const container = imgElement.closest('generated-image,.generated-image-container') as HTMLElement | null;
  if (!container) return;

  const nativeDownloadButton = findNativeDownloadButtonInContainer(container);
  if (!nativeDownloadButton) {
    removeBananaButton(container);
    return;
  }

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

    const nativeDownloadButton = findNativeDownloadButtonInContainer(container);
    if (!nativeDownloadButton) {
      const manager = getStatusToastManager();
      manager.setAnchorElement(button);
      manager.addToast(`${STATUS_TEXT.failPrefix}: ${STATUS_TEXT.missingNativeButton}`, 'error', {
        autoDismissMs: 4200,
      });
      debugService.log('watermark-remover', 'native-download-button-missing');
      return;
    }

    showImmediateDownloadToast(button);
    nativeDownloadButton.click();
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
  getBridgeElement();
  setupStatusListener();
  setupDownloadButtonTracking();

  try {
    engine = await WatermarkEngine.create();
    if (!running) return;

    setupFetchInterceptorBridge();
    notifyFetchInterceptor(true);

    processAllImages();
    setupMutationObserver();
    debugService.log('watermark-remover', 'started');
  } catch (error) {
    running = false;
    engine = null;
    notifyFetchInterceptor(false);
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
  clearActiveSequenceTimers();
  activeSequence = null;

  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }

  if (fetchBridgeObserver) {
    fetchBridgeObserver.disconnect();
    fetchBridgeObserver = null;
  }

  if (statusObserver) {
    statusObserver.disconnect();
    statusObserver = null;
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
    bridge.removeAttribute('data-request');
    bridge.removeAttribute('data-response');
    bridge.removeAttribute('data-status');
  }

  debugService.log('watermark-remover', 'stopped');
}
