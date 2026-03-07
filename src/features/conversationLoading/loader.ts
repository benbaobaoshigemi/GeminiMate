import {
  DEFAULT_ASSISTANT_TURN_SELECTORS,
  findTopUserTurnElement,
  normalizeSelectorList,
} from './dom';
import {
  computeConversationFingerprint,
  waitForConversationFingerprintChangeOrTimeout,
} from './fingerprint';

const SESSION_KEY_PENDING_CONVERSATION_LOAD = 'gv_pending_conversation_load';

type PendingConversationLoad = {
  taskId: string;
  attempt: number;
  url: string;
  timestamp: number;
};

type FingerprintSnapshot = {
  signature: string;
  count: number;
};

export type ConversationLoadResult = {
  status: 'stable' | 'max-attempts' | 'no-top-node';
  attempts: number;
  loadedMore: boolean;
  initialCount: number;
  finalCount: number;
};

export type ProgressiveConversationLoadOptions = {
  taskId?: string;
  userSelectors: readonly string[];
  assistantSelectors?: readonly string[];
  doc?: Document;
  scrollContainer?: HTMLElement | null;
  maxAttempts?: number;
  maxStableAttempts?: number;
  maxSamples?: number;
  waitOptions?: {
    timeoutMs?: number;
    idleMs?: number;
    minWaitMs?: number;
    pollIntervalMs?: number;
  };
  lateChangeWaitMs?: number;
  postChangeDelayMs?: number;
  initialAttempt?: number;
  onAttempt?: (attempt: number) => void;
};

function logConversationLoadDebug(message: string, details?: Record<string, unknown>): void {
  if (details) {
    console.info('[ConversationLoad]', message, details);
    return;
  }
  console.info('[ConversationLoad]', message);
}

function getElementPreview(element: HTMLElement | null | undefined, maxLength = 120): string {
  if (!element) return '';
  try {
    const normalized = String(element.textContent || '')
      .replace(/\s+/g, ' ')
      .trim();
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, maxLength)}...`;
  } catch {
    return '';
  }
}

function describeElement(element: HTMLElement | null | undefined): Record<string, unknown> | null {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return {
    tagName: element.tagName,
    className: element.className,
    id: element.id || '',
    preview: getElementPreview(element),
    rectTop: Math.round(rect.top),
    rectHeight: Math.round(rect.height),
  };
}

function describeFingerprintChange(before: FingerprintSnapshot, after: FingerprintSnapshot) {
  return {
    beforeCount: before.count,
    afterCount: after.count,
    beforeSignature: before.signature,
    afterSignature: after.signature,
    signatureChanged: before.signature !== after.signature,
    countChanged: before.count !== after.count,
  };
}

function readPendingConversationLoads(): PendingConversationLoad[] {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY_PENDING_CONVERSATION_LOAD);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as PendingConversationLoad[]) : [];
  } catch {
    return [];
  }
}

function writePendingConversationLoads(entries: PendingConversationLoad[]): void {
  try {
    if (entries.length === 0) {
      sessionStorage.removeItem(SESSION_KEY_PENDING_CONVERSATION_LOAD);
      return;
    }
    sessionStorage.setItem(SESSION_KEY_PENDING_CONVERSATION_LOAD, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

function setPendingConversationLoad(entry: PendingConversationLoad): void {
  const entries = readPendingConversationLoads().filter((item) => item.taskId !== entry.taskId);
  entries.push(entry);
  writePendingConversationLoads(entries);
}

function clearPendingConversationLoad(taskId: string | undefined): void {
  if (!taskId) return;
  const entries = readPendingConversationLoads().filter((item) => item.taskId !== taskId);
  writePendingConversationLoads(entries);
}

export function getPendingConversationLoad(
  taskId: string,
  url: string = location.href,
): PendingConversationLoad | null {
  const now = Date.now();
  const entry = readPendingConversationLoads().find((item) => item.taskId === taskId) || null;
  if (!entry) {
    logConversationLoadDebug('No pending conversation load state found', { taskId, url });
    return null;
  }
  if (entry.url !== url) {
    logConversationLoadDebug('Discarding pending conversation load due to URL mismatch', {
      taskId,
      expectedUrl: entry.url,
      actualUrl: url,
      attempt: entry.attempt,
    });
    clearPendingConversationLoad(taskId);
    return null;
  }
  if (now - entry.timestamp > 5 * 60_000) {
    logConversationLoadDebug('Discarding expired pending conversation load state', {
      taskId,
      url,
      attempt: entry.attempt,
      ageMs: now - entry.timestamp,
    });
    clearPendingConversationLoad(taskId);
    return null;
  }
  logConversationLoadDebug('Resuming pending conversation load state', {
    taskId,
    url,
    attempt: entry.attempt,
    ageMs: now - entry.timestamp,
  });
  return entry;
}

function clickElement(target: HTMLElement): void {
  const options = { bubbles: true, cancelable: true, view: window };
  target.dispatchEvent(new MouseEvent('pointerdown', options));
  target.dispatchEvent(new MouseEvent('mousedown', options));
  target.dispatchEvent(new MouseEvent('mouseup', options));
  target.dispatchEvent(new MouseEvent('click', options));
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isScrollableElement(element: HTMLElement): boolean {
  try {
    const style = window.getComputedStyle(element);
    const overflowY = style.overflowY;
    if (!(overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay')) return false;
    return element.scrollHeight > element.clientHeight + 2;
  } catch {
    return false;
  }
}

function resolveScrollContainer(
  doc: Document,
  topUserTurn: HTMLElement | null,
  preferred?: HTMLElement | null,
): HTMLElement {
  if (preferred?.isConnected) return preferred;

  let current = topUserTurn?.parentElement ?? null;
  while (current && current !== doc.body) {
    if (isScrollableElement(current)) return current;
    current = current.parentElement;
  }

  return (
    (doc.scrollingElement as HTMLElement | null) ??
    doc.documentElement ??
    (doc.body as HTMLElement)
  );
}

function getScrollTop(container: HTMLElement): number {
  try {
    return Number(container.scrollTop) || 0;
  } catch {
    return 0;
  }
}

function describeScrollContainer(container: HTMLElement | null | undefined): Record<string, unknown> | null {
  if (!container) return null;
  return {
    tagName: container.tagName,
    className: container.className,
    id: container.id || '',
    scrollTop: Math.round(getScrollTop(container)),
    clientHeight: Math.round(container.clientHeight || 0),
    scrollHeight: Math.round(container.scrollHeight || 0),
  };
}

function forceScrollContainerToTop(container: HTMLElement): void {
  try {
    container.scrollTop = 0;
  } catch {
    // ignore
  }

  try {
    container.scrollTo({ top: 0, behavior: 'auto' });
  } catch {
    try {
      container.scrollTo(0, 0);
    } catch {
      // ignore
    }
  }
}

function getOffsetTopWithinContainer(element: HTMLElement, container: HTMLElement): number {
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  return elementRect.top - containerRect.top + getScrollTop(container);
}

function alignTopUserTurnNearViewportTop(topUserTurn: HTMLElement, container: HTMLElement): void {
  if (!topUserTurn.isConnected) return;

  const targetTop = Math.max(0, getOffsetTopWithinContainer(topUserTurn, container) - 8);
  try {
    container.scrollTop = targetTop;
  } catch {
    // ignore
  }

  try {
    container.scrollTo({ top: targetTop, behavior: 'auto' });
  } catch {
    try {
      container.scrollTo(0, targetTop);
    } catch {
      // ignore
    }
  }
}

export async function progressivelyLoadConversationContent(
  options: ProgressiveConversationLoadOptions,
): Promise<ConversationLoadResult> {
  const doc = options.doc ?? document;
  const taskId = options.taskId;
  const userSelectors = normalizeSelectorList(options.userSelectors);
  const assistantSelectors = normalizeSelectorList(
    options.assistantSelectors ?? DEFAULT_ASSISTANT_TURN_SELECTORS,
  );
  const fingerprintSelectors = [...userSelectors, ...assistantSelectors];
  const maxAttempts =
    typeof options.maxAttempts === 'number' && Number.isFinite(options.maxAttempts)
      ? Math.max(1, Math.floor(options.maxAttempts))
      : Number.POSITIVE_INFINITY;
  const maxStableAttempts = Math.max(1, options.maxStableAttempts ?? 2);
  const maxSamples = Math.max(1, options.maxSamples ?? 10);
  const lateChangeWaitMs = Math.max(0, options.lateChangeWaitMs ?? 600);
  const postChangeDelayMs = Math.max(0, options.postChangeDelayMs ?? 120);
  let attempts = Math.max(0, options.initialAttempt ?? 0);
  let loadedMore = false;
  let currentScrollContainer = options.scrollContainer ?? null;
  let stableAttempts = 0;

  const initialFingerprint = computeConversationFingerprint(doc.body, fingerprintSelectors, maxSamples);
  let finalCount = initialFingerprint.count;

  logConversationLoadDebug('Starting progressive conversation load', {
    taskId: taskId || '',
    initialAttempt: attempts,
    maxAttempts,
    maxStableAttempts,
    maxSamples,
    lateChangeWaitMs,
    userSelectors,
    assistantSelectors,
    initialFingerprint,
    initialScrollContainer: describeScrollContainer(currentScrollContainer),
    url: location.href,
  });

  while (attempts < maxAttempts) {
    const topUserTurn = findTopUserTurnElement(userSelectors, doc);
    if (!topUserTurn) {
      logConversationLoadDebug('Stopping progressive load because no top user turn was found', {
        taskId: taskId || '',
        attempts,
        loadedMore,
        finalCount,
      });
      clearPendingConversationLoad(taskId);
      return {
        status: 'no-top-node',
        attempts,
        loadedMore,
        initialCount: initialFingerprint.count,
        finalCount,
      };
    }

    const before = computeConversationFingerprint(doc.body, fingerprintSelectors, maxSamples);
    currentScrollContainer = resolveScrollContainer(doc, topUserTurn, currentScrollContainer);
    logConversationLoadDebug('Attempt prepared', {
      taskId: taskId || '',
      attempt: attempts + 1,
      beforeFingerprint: before,
      topUserTurn: describeElement(topUserTurn),
      scrollContainer: describeScrollContainer(currentScrollContainer),
    });
    if (taskId) {
      setPendingConversationLoad({
        taskId,
        attempt: attempts + 1,
        url: location.href,
        timestamp: Date.now(),
      });
    }

    options.onAttempt?.(attempts + 1);
    forceScrollContainerToTop(currentScrollContainer);
    logConversationLoadDebug('Forced scroll container to top before refresh click', {
      taskId: taskId || '',
      attempt: attempts + 1,
      scrollContainer: describeScrollContainer(currentScrollContainer),
    });
    await wait(80);

    const refreshedTopUserTurn = findTopUserTurnElement(userSelectors, doc) ?? topUserTurn;
    alignTopUserTurnNearViewportTop(refreshedTopUserTurn, currentScrollContainer);
    logConversationLoadDebug('Aligned top user turn near viewport top', {
      taskId: taskId || '',
      attempt: attempts + 1,
      topUserTurn: describeElement(refreshedTopUserTurn),
      scrollContainer: describeScrollContainer(currentScrollContainer),
    });
    await wait(80);

    try {
      refreshedTopUserTurn.scrollIntoView({ behavior: 'auto', block: 'start' });
    } catch {
      // ignore
    }
    forceScrollContainerToTop(currentScrollContainer);
    logConversationLoadDebug('Forced scroll container to top immediately before click dispatch', {
      taskId: taskId || '',
      attempt: attempts + 1,
      topUserTurn: describeElement(refreshedTopUserTurn),
      scrollContainer: describeScrollContainer(currentScrollContainer),
    });
    await wait(50);
    clickElement(refreshedTopUserTurn);
    logConversationLoadDebug('Dispatched click sequence on top user turn', {
      taskId: taskId || '',
      attempt: attempts + 1,
      topUserTurn: describeElement(refreshedTopUserTurn),
    });

    const { changed, fingerprint } = await waitForConversationFingerprintChangeOrTimeout(
      doc.body,
      fingerprintSelectors,
      before,
      {
        timeoutMs: options.waitOptions?.timeoutMs ?? 12000,
        idleMs: options.waitOptions?.idleMs ?? 320,
        minWaitMs: options.waitOptions?.minWaitMs ?? 700,
        pollIntervalMs: options.waitOptions?.pollIntervalMs ?? 90,
        maxSamples,
      },
    );

    attempts += 1;
    finalCount = fingerprint.count;
    logConversationLoadDebug('Attempt finished waiting for conversation fingerprint change', {
      taskId: taskId || '',
      attempt: attempts,
      changed,
      stableAttempts,
      scrollContainer: describeScrollContainer(currentScrollContainer),
      fingerprintChange: describeFingerprintChange(before, fingerprint),
      topUserTurnAfterWait: describeElement(findTopUserTurnElement(userSelectors, doc)),
    });
    if (!changed) {
      if (lateChangeWaitMs > 0) {
        await wait(lateChangeWaitMs);
        const lateFingerprint = computeConversationFingerprint(doc.body, fingerprintSelectors, maxSamples);
        const lateChanged =
          lateFingerprint.signature !== before.signature || lateFingerprint.count !== before.count;
        finalCount = lateFingerprint.count;
        logConversationLoadDebug('Late fingerprint recheck after stable wait', {
          taskId: taskId || '',
          attempt: attempts,
          lateChanged,
          lateFingerprint,
          fingerprintChange: describeFingerprintChange(before, lateFingerprint),
        });
        if (lateChanged) {
          loadedMore = true;
          stableAttempts = 0;
          forceScrollContainerToTop(currentScrollContainer);
          await wait(80);
          continue;
        }
      }

      stableAttempts += 1;
      logConversationLoadDebug('Stable attempt recorded after no detected history expansion', {
        taskId: taskId || '',
        attempt: attempts,
        stableAttempts,
        maxStableAttempts,
        finalCount,
      });

      if (stableAttempts < maxStableAttempts) {
        forceScrollContainerToTop(currentScrollContainer);
        await wait(160);
        continue;
      }

      logConversationLoadDebug('Stopping progressive load because conversation fingerprint became stable', {
        taskId: taskId || '',
        attempts,
        stableAttempts,
        loadedMore,
        finalCount,
      });
      clearPendingConversationLoad(taskId);
      return {
        status: 'stable',
        attempts,
        loadedMore,
        initialCount: initialFingerprint.count,
        finalCount,
      };
    }

    loadedMore = true;
    stableAttempts = 0;
    if (postChangeDelayMs > 0) {
      await wait(postChangeDelayMs);
    }

    forceScrollContainerToTop(currentScrollContainer);
    logConversationLoadDebug('History expanded; forcing scroll container to top for next attempt', {
      taskId: taskId || '',
      attempt: attempts,
      scrollContainer: describeScrollContainer(currentScrollContainer),
    });
    await wait(80);
  }

  logConversationLoadDebug('Stopping progressive load because max attempts was reached', {
    taskId: taskId || '',
    attempts,
    loadedMore,
    initialCount: initialFingerprint.count,
    finalCount,
  });
  clearPendingConversationLoad(taskId);
  return {
    status: 'max-attempts',
    attempts,
    loadedMore,
    initialCount: initialFingerprint.count,
    finalCount,
  };
}
