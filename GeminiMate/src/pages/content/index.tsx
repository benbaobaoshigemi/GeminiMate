import { repairEngine } from '../../core/services/RepairEngine';
import { debugService } from '../../core/services/DebugService';
import { logger } from '../../core/services/LoggerService';
import { StorageKeys } from '../../core/types/common';
import { getFormulaCopyService, startFormulaCopy, stopFormulaCopy } from '../../features/formulaCopy';
import { startQuoteReply } from '../../features/quoteReply';
import { setMermaidRenderEnabled, startMermaid, stopMermaid } from '../../features/mermaid';
import { startThoughtTranslation, stopThoughtTranslation } from '../../features/thoughtTranslation';
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
let mermaidEnabled = false;
let mermaidServiceBootstrapped = false;
let thoughtTranslationEnabled = false;

const resolveEnabledValue = (value: unknown): boolean => value !== false;
const resolveThoughtTranslationValue = (value: unknown): boolean => {
  if (value === false || value === 'false' || value === 0 || value === '0' || value === null) {
    return false;
  }
  return true;
};

const traceThoughtTranslation = (event: string, detail?: Record<string, unknown>): void => {
  debugService.log('thought-translation', event, detail);
  console.info('[GM-TRACE][ThoughtTranslation]', event, detail ?? {});
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

  const mermaidChange = changes[StorageKeys.MERMAID_RENDER_ENABLED];
  if (mermaidChange) {
    const enabled = resolveEnabledValue(mermaidChange.newValue);
    debugService.log('storage', 'mermaid-enabled-changed', { enabled });
    syncMermaidState(enabled);
  }

  const thoughtTranslationChange = changes[StorageKeys.THOUGHT_TRANSLATION_ENABLED];
  if (thoughtTranslationChange) {
    const enabled = resolveThoughtTranslationValue(thoughtTranslationChange.newValue);
    debugService.log('storage', 'thought-translation-enabled-changed', { enabled });
    syncThoughtTranslationState(enabled);
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
      StorageKeys.MERMAID_RENDER_ENABLED,
      StorageKeys.THOUGHT_TRANSLATION_ENABLED,
    ]);
    syncFormulaCopyState(resolveEnabledValue(settings[StorageKeys.FORMULA_COPY_ENABLED]));
    syncQuoteReplyState(resolveEnabledValue(settings[StorageKeys.QUOTE_REPLY_ENABLED]));
    syncWatermarkRemoverState(resolveEnabledValue(settings[StorageKeys.WATERMARK_REMOVER_ENABLED]));
    syncBottomCleanupState(resolveEnabledValue(settings[StorageKeys.BOTTOM_CLEANUP_ENABLED]));
    syncMermaidState(resolveEnabledValue(settings[StorageKeys.MERMAID_RENDER_ENABLED]));
    traceThoughtTranslation('initial-setting', {
      rawValue: settings[StorageKeys.THOUGHT_TRANSLATION_ENABLED],
      resolved: resolveThoughtTranslationValue(settings[StorageKeys.THOUGHT_TRANSLATION_ENABLED]),
    });
    syncThoughtTranslationState(resolveThoughtTranslationValue(settings[StorageKeys.THOUGHT_TRANSLATION_ENABLED]));

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
      stopMermaid();
      stopThoughtTranslation();
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
