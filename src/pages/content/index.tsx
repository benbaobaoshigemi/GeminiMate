import { repairEngine } from '../../core/services/RepairEngine';
import { debugService } from '../../core/services/DebugService';
import { logger } from '../../core/services/LoggerService';
import { StorageKeys } from '../../core/types/common';
import { getFormulaCopyService, startFormulaCopy, stopFormulaCopy } from '../../features/formulaCopy';
import { startQuoteReply } from '../../features/quoteReply';
import { setMermaidRenderEnabled, startMermaid, stopMermaid } from '../../features/mermaid';
import { setSvgRenderEnabled, startSvgRenderer, stopSvgRenderer } from '../../features/svgRenderer';
import { startThoughtTranslation, stopThoughtTranslation } from '../../features/thoughtTranslation';
import { resolveThoughtTranslationEnabled } from '../../features/thoughtTranslation/settings';
import { startTimeline } from '../../features/timeline';
import { startBottomCleanup, stopBottomCleanup } from '../../features/uiCleanup';
import {
  startYoutubeRecommendationBlocker,
  stopYoutubeRecommendationBlocker,
} from '../../features/uiCleanup/youtubeRecommendationBlocker';
import { startWatermarkRemover, stopWatermarkRemover } from '../../features/watermarkRemover';
import { startControlCapsule, stopControlCapsule } from '../../features/ui/controlCapsule';
import { startExportButton } from './export';
import { startFolderManager } from './folder';
import {
  startChatWidthAdjuster,
  startEditInputWidthAdjuster,
  startSidebarWidthAdjuster,
  startSidebarAutoHide,
  startFontSizeAdjuster,
  startCustomFontInjector,
  startParagraphIndentAdjuster,
} from '../../features/layout';

// Import injected styles
import '../../features/styles/timeline.css';
import '../../features/styles/formulaCopy.css';
import '../../features/styles/controlCapsule.css';

// Staggered initialization similar to Voyager
let formulaCopyRunning = false;
let clickLogListenerAttached = false;
let quoteReplyCleanup: (() => void) | null = null;
let folderManagerInstance: Awaited<ReturnType<typeof startFolderManager>> | null = null;
let watermarkEnabled = false;
let bottomCleanupEnabled = false;
let youtubeRecommendationBlockerEnabled = false;
let mermaidEnabled = false;
let mermaidServiceBootstrapped = false;
let svgRenderEnabled = true;
let svgRendererBootstrapped = false;
let thoughtTranslationEnabled = false;
let debugModeEnabled = false;
let debugCacheCaptureTimer: ReturnType<typeof setInterval> | null = null;

const DEBUG_CACHE_CAPTURE_INTERVAL_MS = 30000;

const resolveEnabledValue = (value: unknown): boolean => value !== false;

const traceThoughtTranslation = (event: string, detail?: Record<string, unknown>): void => {
  debugService.log('thought-translation', event, detail);
  console.info('[GM-TRACE][ThoughtTranslation]', event, detail ?? {});
};

const snapshotWebStorage = (storage: Storage, maxEntries = 80): Record<string, string> => {
  const snapshot: Record<string, string> = {};
  const upperBound = Math.min(storage.length, maxEntries);
  for (let index = 0; index < upperBound; index += 1) {
    const key = storage.key(index);
    if (!key) continue;
    const raw = storage.getItem(key) ?? '';
    snapshot[key] = raw.length > 1600 ? `${raw.slice(0, 1600)}...<trimmed>` : raw;
  }
  if (storage.length > upperBound) {
    snapshot.__trimmedKeys = String(storage.length - upperBound);
  }
  return snapshot;
};

const sendDebugCacheSnapshot = (reason: string): void => {
  if (!debugModeEnabled) return;

  const payload = {
    context: 'content-script',
    reason,
    url: window.location.href,
    ts: new Date().toISOString(),
    localStorage: snapshotWebStorage(window.localStorage),
    sessionStorage: snapshotWebStorage(window.sessionStorage),
  };

  try {
    chrome.runtime.sendMessage({
      type: 'gm.debug.captureCache',
      payload,
    });
  } catch {
    // Ignore messaging failures during navigation/unload transitions.
  }

  debugService.log('debug', 'cache-snapshot-sent', {
    reason,
    localStorageKeys: Object.keys(payload.localStorage).length,
    sessionStorageKeys: Object.keys(payload.sessionStorage).length,
  });
};

const syncDebugModeState = (enabled: boolean): void => {
  debugModeEnabled = enabled;
  if (!enabled) {
    if (debugCacheCaptureTimer !== null) {
      clearInterval(debugCacheCaptureTimer);
      debugCacheCaptureTimer = null;
    }
    return;
  }

  sendDebugCacheSnapshot('debug-mode-enabled');
  if (debugCacheCaptureTimer !== null) {
    clearInterval(debugCacheCaptureTimer);
  }
  debugCacheCaptureTimer = setInterval(() => {
    sendDebugCacheSnapshot('periodic');
  }, DEBUG_CACHE_CAPTURE_INTERVAL_MS);
};

const syncFormulaCopyState = (enabled: boolean): void => {
  const service = getFormulaCopyService();
  formulaCopyRunning = service.isServiceInitialized();

  if (enabled && !formulaCopyRunning) {
    startFormulaCopy();
    formulaCopyRunning = true;
    logger.info('Formula copy enabled');
    debugService.log('formula-copy', 'toggle-on');
    return;
  }

  if (!enabled) {
    stopFormulaCopy();
    formulaCopyRunning = false;
    logger.info('Formula copy disabled');
    debugService.log('formula-copy', 'toggle-off');
  }
};

const syncQuoteReplyState = (enabled: boolean): void => {
  if (enabled && !quoteReplyCleanup) {
    quoteReplyCleanup = startQuoteReply();
    debugService.log('quote-reply', 'toggle-on');
    return;
  }

  if (!enabled && quoteReplyCleanup) {
    quoteReplyCleanup();
    quoteReplyCleanup = null;
    debugService.log('quote-reply', 'toggle-off');
  }
};

const syncWatermarkRemoverState = (enabled: boolean): void => {
  if (enabled === watermarkEnabled) {
    return;
  }

  watermarkEnabled = enabled;
  if (!enabled) {
    stopWatermarkRemover();
    debugService.log('watermark-remover', 'toggle-off');
    return;
  }

  void startWatermarkRemover()
    .then(() => {
      if (!watermarkEnabled) {
        stopWatermarkRemover();
      }
    })
    .catch((error: unknown) => {
      debugService.log('watermark-remover', 'toggle-on-failed', {
        error: String(error),
      });
      watermarkEnabled = false;
    });
  debugService.log('watermark-remover', 'toggle-on');
};

const syncBottomCleanupState = (enabled: boolean): void => {
  if (enabled === bottomCleanupEnabled) {
    return;
  }
  bottomCleanupEnabled = enabled;
  if (enabled) {
    startBottomCleanup();
    debugService.log('bottom-cleanup', 'toggle-on');
    return;
  }
  stopBottomCleanup();
  debugService.log('bottom-cleanup', 'toggle-off');
};

const syncYoutubeRecommendationBlockerState = (enabled: boolean): void => {
  if (enabled === youtubeRecommendationBlockerEnabled) {
    return;
  }

  youtubeRecommendationBlockerEnabled = enabled;
  if (enabled) {
    startYoutubeRecommendationBlocker();
    debugService.log('youtube-recommendation-blocker', 'toggle-on');
    return;
  }

  stopYoutubeRecommendationBlocker();
  debugService.log('youtube-recommendation-blocker', 'toggle-off');
};

const syncMermaidState = (enabled: boolean): void => {
  mermaidEnabled = enabled;
  if (!mermaidServiceBootstrapped) {
    mermaidServiceBootstrapped = true;
    void startMermaid().then(() => {
      setMermaidRenderEnabled(mermaidEnabled);
      debugService.log('mermaid', 'service-bootstrapped', { renderEnabled: mermaidEnabled });
    });
    return;
  }
  setMermaidRenderEnabled(enabled);
  debugService.log('mermaid', enabled ? 'toggle-on' : 'toggle-off');
};

const syncSvgRenderState = (enabled: boolean): void => {
  svgRenderEnabled = enabled;
  if (!svgRendererBootstrapped) {
    svgRendererBootstrapped = true;
    void startSvgRenderer().then(() => {
      setSvgRenderEnabled(svgRenderEnabled);
      debugService.log('svg-renderer', 'service-bootstrapped', {
        renderEnabled: svgRenderEnabled,
      });
    });
    return;
  }
  setSvgRenderEnabled(enabled);
  debugService.log('svg-renderer', enabled ? 'toggle-on' : 'toggle-off');
};

const syncThoughtTranslationState = (enabled: boolean): void => {
  if (enabled === thoughtTranslationEnabled) {
    return;
  }
  thoughtTranslationEnabled = enabled;
  if (enabled) {
    traceThoughtTranslation('toggle-on');
    startThoughtTranslation();
    debugService.log('thought-translation', 'toggle-on');
    return;
  }
  traceThoughtTranslation('toggle-off');
  stopThoughtTranslation();
  debugService.log('thought-translation', 'toggle-off');
};

const describeClickTarget = (target: EventTarget | null): Record<string, unknown> => {
  if (!(target instanceof Element)) {
    return { tag: 'unknown' };
  }

  const text = (target.textContent ?? '').trim().slice(0, 80);
  return {
    tag: target.tagName.toLowerCase(),
    id: target.id || null,
    className: target.className || null,
    text: text.length > 0 ? text : null,
  };
};

const attachClickLoggerOnce = (): void => {
  if (clickLogListenerAttached) return;
  clickLogListenerAttached = true;
  document.addEventListener(
    'click',
    (event: MouseEvent) => {
      debugService.log('click', 'document-click', {
        x: event.clientX,
        y: event.clientY,
        target: describeClickTarget(event.target),
      });
    },
    true,
  );
};

const extractCustomFontNames = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (item && typeof item === 'object' && 'name' in item ? String(item.name || '') : ''))
    .filter((name) => name.length > 0);
};

const traceCustomFontStorage = (event: 'initial' | 'changed', value: unknown): void => {
  const fontNames = extractCustomFontNames(value);
  console.error('[VIBE_DEBUG_TRACE][CUSTOM_FONT_STORAGE_PAGE_TRACE]', {
    event,
    fontNames,
    fontCount: fontNames.length,
  });
  console.error(
    '[VIBE_DEBUG_TRACE][CUSTOM_FONT_STORAGE_PAGE_TRACE_JSON]',
    JSON.stringify(
      {
        event,
        fontNames,
        fontCount: fontNames.length,
      },
      null,
      2,
    ),
  );
};

const handleStorageChanged = (
  changes: Record<string, chrome.storage.StorageChange>,
  areaName: string,
): void => {
  if (areaName !== 'local') return;
  const formulaChange = changes[StorageKeys.FORMULA_COPY_ENABLED];
  if (formulaChange) {
    const enabled = resolveEnabledValue(formulaChange.newValue);
    debugService.log('storage', 'formula-copy-enabled-changed', {
      enabled,
    });
    syncFormulaCopyState(enabled);
  }

  const quoteReplyChange = changes[StorageKeys.QUOTE_REPLY_ENABLED];
  if (quoteReplyChange) {
    const enabled = resolveEnabledValue(quoteReplyChange.newValue);
    debugService.log('storage', 'quote-reply-enabled-changed', {
      enabled,
    });
    syncQuoteReplyState(enabled);
  }

  const watermarkChange = changes[StorageKeys.WATERMARK_REMOVER_ENABLED];
  if (watermarkChange) {
    const enabled = resolveEnabledValue(watermarkChange.newValue);
    debugService.log('storage', 'watermark-remover-enabled-changed', {
      enabled,
    });
    syncWatermarkRemoverState(enabled);
  }

  const bottomCleanupChange = changes[StorageKeys.BOTTOM_CLEANUP_ENABLED];
  if (bottomCleanupChange) {
    const enabled = resolveEnabledValue(bottomCleanupChange.newValue);
    debugService.log('storage', 'bottom-cleanup-enabled-changed', {
      enabled,
    });
    syncBottomCleanupState(enabled);
  }

  const youtubeRecommendationBlockerChange = changes[StorageKeys.YOUTUBE_RECOMMENDATION_BLOCKER_ENABLED];
  if (youtubeRecommendationBlockerChange) {
    const enabled = resolveEnabledValue(youtubeRecommendationBlockerChange.newValue);
    debugService.log('storage', 'youtube-recommendation-blocker-enabled-changed', {
      enabled,
    });
    syncYoutubeRecommendationBlockerState(enabled);
  }

  const mermaidChange = changes[StorageKeys.MERMAID_RENDER_ENABLED];
  if (mermaidChange) {
    const enabled = resolveEnabledValue(mermaidChange.newValue);
    debugService.log('storage', 'mermaid-enabled-changed', { enabled });
    syncMermaidState(enabled);
  }

  const svgRenderChange = changes[StorageKeys.SVG_RENDER_ENABLED];
  if (svgRenderChange) {
    const enabled = resolveEnabledValue(svgRenderChange.newValue);
    debugService.log('storage', 'svg-render-enabled-changed', { enabled });
    syncSvgRenderState(enabled);
  }

  const thoughtTranslationChange = changes[StorageKeys.THOUGHT_TRANSLATION_ENABLED];
  if (thoughtTranslationChange) {
    const enabled = resolveThoughtTranslationEnabled(thoughtTranslationChange.newValue);
    debugService.log('storage', 'thought-translation-enabled-changed', { enabled });
    syncThoughtTranslationState(enabled);
  }

  const debugModeChange = changes[StorageKeys.DEBUG_MODE];
  if (debugModeChange) {
    const enabled = debugModeChange.newValue === true;
    debugService.log('storage', 'debug-mode-enabled-changed', { enabled });
    syncDebugModeState(enabled);
  }

  const customFontsChange = changes[StorageKeys.GEMINI_CUSTOM_FONTS];
  if (customFontsChange) {
    traceCustomFontStorage('changed', customFontsChange.newValue);
  }
};

const initExtension = async () => {
  try {
    await debugService.init('content-script');
    attachClickLoggerOnce();
    debugService.log('content', 'init-started');

    await repairEngine.start();
    debugService.log('content', 'repair-engine-started');

    const settings = await chrome.storage.local.get([
      StorageKeys.FORMULA_COPY_ENABLED,
      StorageKeys.QUOTE_REPLY_ENABLED,
      StorageKeys.WATERMARK_REMOVER_ENABLED,
      StorageKeys.BOTTOM_CLEANUP_ENABLED,
      StorageKeys.YOUTUBE_RECOMMENDATION_BLOCKER_ENABLED,
      StorageKeys.MERMAID_RENDER_ENABLED,
      StorageKeys.SVG_RENDER_ENABLED,
      StorageKeys.THOUGHT_TRANSLATION_ENABLED,
      StorageKeys.DEBUG_MODE,
      StorageKeys.GEMINI_CUSTOM_FONTS,
    ]);
    syncFormulaCopyState(resolveEnabledValue(settings[StorageKeys.FORMULA_COPY_ENABLED]));
    syncQuoteReplyState(resolveEnabledValue(settings[StorageKeys.QUOTE_REPLY_ENABLED]));
    syncWatermarkRemoverState(resolveEnabledValue(settings[StorageKeys.WATERMARK_REMOVER_ENABLED]));
    syncBottomCleanupState(resolveEnabledValue(settings[StorageKeys.BOTTOM_CLEANUP_ENABLED]));
    syncYoutubeRecommendationBlockerState(
      resolveEnabledValue(settings[StorageKeys.YOUTUBE_RECOMMENDATION_BLOCKER_ENABLED]),
    );
    syncMermaidState(resolveEnabledValue(settings[StorageKeys.MERMAID_RENDER_ENABLED]));
    syncSvgRenderState(resolveEnabledValue(settings[StorageKeys.SVG_RENDER_ENABLED]));
    traceThoughtTranslation('initial-setting', {
      rawValue: settings[StorageKeys.THOUGHT_TRANSLATION_ENABLED],
      resolved: resolveThoughtTranslationEnabled(settings[StorageKeys.THOUGHT_TRANSLATION_ENABLED]),
    });
    syncThoughtTranslationState(
      resolveThoughtTranslationEnabled(settings[StorageKeys.THOUGHT_TRANSLATION_ENABLED]),
    );
    syncDebugModeState(settings[StorageKeys.DEBUG_MODE] === true);
    traceCustomFontStorage('initial', settings[StorageKeys.GEMINI_CUSTOM_FONTS]);

      // Initialize Timeline with SPA route handling
      startTimeline();
      folderManagerInstance = await startFolderManager();
      void startExportButton();

      // Layout features
    startChatWidthAdjuster();
    startEditInputWidthAdjuster();
    startSidebarWidthAdjuster();
    startSidebarAutoHide();
    startFontSizeAdjuster();
    startCustomFontInjector();
    startParagraphIndentAdjuster();
    startControlCapsule();

    chrome.storage.onChanged.addListener(handleStorageChanged);
    window.addEventListener('beforeunload', () => {
      chrome.storage.onChanged.removeListener(handleStorageChanged);
      if (quoteReplyCleanup) {
        quoteReplyCleanup();
        quoteReplyCleanup = null;
      }
      if (folderManagerInstance) {
        folderManagerInstance.destroy();
        folderManagerInstance = null;
      }
      stopWatermarkRemover();
      stopBottomCleanup();
      stopYoutubeRecommendationBlocker();
      stopMermaid();
      stopSvgRenderer();
      stopThoughtTranslation();
      stopControlCapsule();
      if (debugCacheCaptureTimer !== null) {
        clearInterval(debugCacheCaptureTimer);
        debugCacheCaptureTimer = null;
      }
    });

    logger.info('GeminiMate Content Script Initialized');
    debugService.log('content', 'init-completed');
  } catch (error) {
    logger.error('Failed to initialize content script', { error });
    debugService.log('content', 'init-failed', { error: String(error) });
  }
};

// Start initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initExtension);
} else {
  initExtension();
}
