import { debugService } from '@/core/services/DebugService';

import { DOWNLOAD_ICON_SELECTOR, findNativeDownloadButton } from './downloadButton';
import { type StatusToastManager, createStatusToastManager } from './statusToast';
import { WatermarkEngine } from './watermarkEngine';

const BRIDGE_ID = 'gv-watermark-bridge';
const PROCESSING_TIMEOUT_MS = 30000;
const LARGE_WARNING_AUTO_DISMISS_MS = 8000;
const PROCESSING_FALLBACK_AUTO_DISMISS_MS = 35000;

const STATUS_TEXT = {
  downloading: '正在下载原始图片',
  downloadingLarge: '正在下载原始图片（大文件）',
  warningLarge: '大文件下载可能较慢',
  processing: '正在移除水印',
  success: '下载已开始',
  errorPrefix: '下载失败',
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
let activeSequence: DownloadToastSequence | null = null;
let lastImmediateToastAt = 0;
let sequenceCounter = 0;

const processingQueue = new Set<HTMLImageElement>();
let mutationObserver: MutationObserver | null = null;
let bridgeRequestObserver: MutationObserver | null = null;
let bridgeStatusObserver: MutationObserver | null = null;
let downloadPointerHandler: ((event: Event) => void) | null = null;
let downloadClickHandler: ((event: Event) => void) | null = null;

const debounce = <T extends (...args: unknown[]) => void>(func: T, wait: number): T => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return ((...args: unknown[]) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
};

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

const isValidGeminiImage = (img: HTMLImageElement): boolean =>
  img.closest('generated-image,.generated-image-container') !== null;

const findGeminiImages = (): HTMLImageElement[] =>
  [...document.querySelectorAll<HTMLImageElement>('img[src*="googleusercontent.com"], img[src*="ggpht.com"]')].filter(
    (img) => isValidGeminiImage(img) && img.dataset.watermarkProcessed !== 'true',
  );

const replaceWithNormalSize = (src: string): string => src.replace(/=s\d+[^?#]*/, '=s0');

function addDownloadIndicator(imgElement: HTMLImageElement): void {
  const container = imgElement.closest('generated-image,.generated-image-container');
  if (!container) return;

  const nativeDownloadIcon = container.querySelector(DOWNLOAD_ICON_SELECTOR);
  const nativeButton = nativeDownloadIcon?.closest('button');
  if (!nativeButton) return;

  if (container.querySelector('.nanobanana-indicator')) return;

  const indicator = document.createElement('span');
  indicator.className = 'nanobanana-indicator';
  indicator.textContent = '🍌';
  indicator.title = 'NanoBanana: Downloads will have watermark removed';

  Object.assign(indicator.style, {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    fontSize: '12px',
    pointerEvents: 'none',
    zIndex: '10',
    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
  });

  const buttonContainer = nativeButton.parentElement;
  if (buttonContainer) {
    const currentPosition = getComputedStyle(buttonContainer).position;
    if (currentPosition === 'static') {
      (buttonContainer as HTMLElement).style.position = 'relative';
    }
    buttonContainer.appendChild(indicator);
  }
}

async function processImage(imgElement: HTMLImageElement): Promise<void> {
  if (!running || !engine || processingQueue.has(imgElement)) return;

  processingQueue.add(imgElement);
  imgElement.dataset.watermarkProcessed = 'processing';

  try {
    const normalSizeSrc = replaceWithNormalSize(imgElement.src);
    const normalSizeImage = await fetchImageViaBackground(normalSizeSrc);
    if (!running || !engine) return;

    const processedCanvas = await engine.removeWatermarkFromImage(normalSizeImage);
    const processedBlob = await canvasToBlob(processedCanvas);
    const processedUrl = URL.createObjectURL(processedBlob);

    imgElement.src = processedUrl;
    imgElement.dataset.watermarkProcessed = 'true';
    imgElement.dataset.processedUrl = processedUrl;

    addDownloadIndicator(imgElement);
  } catch (error) {
    debugService.log('watermark-remover', 'preview-process-failed', { error: String(error) });
    imgElement.dataset.watermarkProcessed = 'failed';
  } finally {
    processingQueue.delete(imgElement);
  }
}

function processAllImages(): void {
  const images = findGeminiImages();
  images.forEach((img) => {
    void processImage(img);
  });

  const processedImages = document.querySelectorAll<HTMLImageElement>('img[data-watermark-processed="true"]');
  processedImages.forEach(addDownloadIndicator);
}

function setupMutationObserver(): void {
  if (mutationObserver) return;
  const debouncedProcess = debounce(processAllImages, 120);
  mutationObserver = new MutationObserver(() => debouncedProcess());
  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'src'],
  });
}

async function processImageRequest(
  requestId: string,
  base64: string,
  bridge: HTMLElement,
): Promise<void> {
  if (!engine) {
    bridge.dataset.response = JSON.stringify({ requestId, error: 'Watermark engine not initialized' });
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
    const processedDataUrl = canvasToDataURL(processedCanvas);
    bridge.dataset.response = JSON.stringify({ requestId, base64: processedDataUrl });
  } catch (error) {
    bridge.dataset.response = JSON.stringify({ requestId, error: String(error) });
  }
}

function setupFetchInterceptorBridge(): void {
  if (bridgeRequestObserver) return;

  const bridge = getBridgeElement();
  bridgeRequestObserver = new MutationObserver(() => {
    const requestData = bridge.dataset.request;
    if (!requestData) return;

    bridge.removeAttribute('data-request');
    try {
      const parsed = JSON.parse(requestData) as { requestId?: unknown; base64?: unknown };
      if (typeof parsed.requestId !== 'string' || typeof parsed.base64 !== 'string') {
        return;
      }
      void processImageRequest(parsed.requestId, parsed.base64, bridge);
    } catch (error) {
      debugService.log('watermark-remover', 'bridge-request-parse-failed', {
        error: String(error),
      });
    }
  });

  bridgeRequestObserver.observe(bridge, { attributes: true, attributeFilter: ['data-request'] });
}

const getStatusToastManager = (): StatusToastManager => {
  if (!statusToastManager) {
    statusToastManager = createStatusToastManager({ maxToasts: 4, anchorTtlMs: 30000 });
  }
  return statusToastManager;
};

function finalizeSequence(level: 'success' | 'error', message: string): void {
  const manager = getStatusToastManager();

  if (activeSequence?.processingTimer) {
    clearTimeout(activeSequence.processingTimer);
    activeSequence.processingTimer = null;
  }
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
      autoDismissMs: level === 'success' ? 2500 : 4000,
      markFinal: true,
    })
  ) {
    return;
  }

  if (
    !manager.updateLatestPending(message, level, {
      autoDismissMs: level === 'success' ? 2500 : 4000,
      markFinal: true,
    })
  ) {
    manager.addToast(message, level, {
      autoDismissMs: level === 'success' ? 2500 : 4000,
    });
  }
}

function showImmediateDownloadToast(button: HTMLButtonElement): void {
  const now = Date.now();
  if (now - lastImmediateToastAt < 300) return;
  lastImmediateToastAt = now;

  const manager = getStatusToastManager();
  manager.setAnchorElement(button);

  if (activeSequence?.processingTimer) {
    clearTimeout(activeSequence.processingTimer);
  }

  const sequenceId = ++sequenceCounter;
  const downloadToastId = manager.addToast(STATUS_TEXT.downloading, 'info', { autoDismissMs: 3000 });

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
  if (downloadPointerHandler || downloadClickHandler) return;

  downloadPointerHandler = (event: Event): void => {
    const button = findNativeDownloadButton(event.target);
    if (!button) return;
    showImmediateDownloadToast(button);
  };

  downloadClickHandler = (event: Event): void => {
    const button = findNativeDownloadButton(event.target);
    if (!button) return;
    showImmediateDownloadToast(button);
  };

  document.addEventListener('pointerdown', downloadPointerHandler, true);
  document.addEventListener('click', downloadClickHandler, true);
}

function setupStatusListener(): void {
  if (bridgeStatusObserver) return;

  const bridge = getBridgeElement();
  const manager = getStatusToastManager();

  const handleStatus = (statusData: string): void => {
    try {
      const parsed = JSON.parse(statusData) as { type?: unknown; message?: unknown };
      if (typeof parsed.type !== 'string') return;
      bridge.removeAttribute('data-status');

      switch (parsed.type) {
        case 'DOWNLOADING':
          if (activeSequence?.warningToastId) {
            manager.removeToast(activeSequence.warningToastId);
            activeSequence.warningToastId = null;
          }
          if (activeSequence && !activeSequence.downloadToastId) {
            activeSequence.downloadToastId = manager.addToast(STATUS_TEXT.downloading, 'info', {
              autoDismissMs: 3000,
            });
          }
          break;

        case 'DOWNLOADING_LARGE':
          if (activeSequence) {
            if (!activeSequence.downloadToastId) {
              activeSequence.downloadToastId = manager.addToast(STATUS_TEXT.downloadingLarge, 'info', {
                autoDismissMs: 3000,
              });
            } else {
              manager.updateToast(activeSequence.downloadToastId, STATUS_TEXT.downloadingLarge, 'info');
            }

            if (!activeSequence.warningToastId) {
              activeSequence.warningToastId = manager.addToast(STATUS_TEXT.warningLarge, 'warning', {
                autoDismissMs: LARGE_WARNING_AUTO_DISMISS_MS,
              });
            }
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

        case 'ERROR': {
          const message = typeof parsed.message === 'string' ? parsed.message : 'Unknown error';
          finalizeSequence('error', `${STATUS_TEXT.errorPrefix}: ${message}`);
          break;
        }
      }
    } catch (error) {
      debugService.log('watermark-remover', 'status-parse-failed', { error: String(error) });
    }
  };

  bridgeStatusObserver = new MutationObserver(() => {
    const statusData = bridge.dataset.status;
    if (!statusData) return;
    handleStatus(statusData);
  });

  bridgeStatusObserver.observe(bridge, { attributes: true, attributeFilter: ['data-status'] });

  if (bridge.dataset.status) {
    handleStatus(bridge.dataset.status);
  }
}

export async function startWatermarkRemover(): Promise<void> {
  if (running) return;
  running = true;
  notifyFetchInterceptor(true);
  setupStatusListener();
  setupDownloadButtonTracking();

  try {
    engine = await WatermarkEngine.create();
    if (!running) return;

    setupFetchInterceptorBridge();
    processAllImages();
    setupMutationObserver();
    debugService.log('watermark-remover', 'started');
  } catch (error) {
    running = false;
    notifyFetchInterceptor(false);
    debugService.log('watermark-remover', 'start-failed', {
      error: String(error),
    });
  }
}

export function stopWatermarkRemover(): void {
  running = false;
  notifyFetchInterceptor(false);
  engine = null;

  processingQueue.clear();

  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }

  if (bridgeRequestObserver) {
    bridgeRequestObserver.disconnect();
    bridgeRequestObserver = null;
  }

  if (bridgeStatusObserver) {
    bridgeStatusObserver.disconnect();
    bridgeStatusObserver = null;
  }

  if (downloadPointerHandler) {
    document.removeEventListener('pointerdown', downloadPointerHandler, true);
    downloadPointerHandler = null;
  }

  if (downloadClickHandler) {
    document.removeEventListener('click', downloadClickHandler, true);
    downloadClickHandler = null;
  }

  if (activeSequence?.processingTimer) {
    clearTimeout(activeSequence.processingTimer);
  }
  activeSequence = null;

  if (statusToastManager) {
    statusToastManager.destroy();
    statusToastManager = null;
  }

  const bridge = document.getElementById(BRIDGE_ID);
  if (bridge) {
    bridge.removeAttribute('data-request');
    bridge.removeAttribute('data-response');
    bridge.removeAttribute('data-status');
  }

  debugService.log('watermark-remover', 'stopped');
}

export async function processDownloadBlob(blob: Blob): Promise<Blob> {
  if (!engine) {
    throw new Error('Watermark engine not initialized');
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read blob as data URL'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to decode image'));
    img.crossOrigin = 'anonymous';
    img.src = dataUrl;
  });

  const processedCanvas = await engine.removeWatermarkFromImage(img);
  return canvasToBlob(processedCanvas);
}

export function isWatermarkRemoverRunning(): boolean {
  return running;
}

export function getProcessingTimeoutMs(): number {
  return PROCESSING_TIMEOUT_MS;
}
