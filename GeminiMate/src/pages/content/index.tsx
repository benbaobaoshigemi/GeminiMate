import { repairEngine } from '../../core/services/RepairEngine';
import { debugService } from '../../core/services/DebugService';
import { logger } from '../../core/services/LoggerService';
import { StorageKeys } from '../../core/types/common';
import { getFormulaCopyService, startFormulaCopy, stopFormulaCopy } from '../../features/formulaCopy';
import { startQuoteReply } from '../../features/quoteReply';
import { startTimeline } from '../../features/timeline';
import { startBottomCleanup, stopBottomCleanup } from '../../features/uiCleanup';
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

const resolveEnabledValue = (value: unknown): boolean => value !== false;

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
    ]);
    syncFormulaCopyState(resolveEnabledValue(settings[StorageKeys.FORMULA_COPY_ENABLED]));
    syncQuoteReplyState(resolveEnabledValue(settings[StorageKeys.QUOTE_REPLY_ENABLED]));
    syncWatermarkRemoverState(resolveEnabledValue(settings[StorageKeys.WATERMARK_REMOVER_ENABLED]));
    syncBottomCleanupState(resolveEnabledValue(settings[StorageKeys.BOTTOM_CLEANUP_ENABLED]));

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
      stopControlCapsule();
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
