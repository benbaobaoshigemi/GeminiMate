import { debugService } from '@/core/services/DebugService';

const STYLE_ID = 'gm-thought-translation-style';
const TRANSLATION_CLASS = 'gm-thought-translation';
const TRANSLATED_ATTR = 'data-gm-thought-translated';
const PROCESSING_ATTR = 'data-gm-thought-processing';
const SOURCE_ATTR = 'data-gm-thought-source';
const ERROR_ATTR = 'data-gm-thought-error';
const THOUGHT_CONTAINER_SELECTORS = [
  '[data-test-id="thoughts-content"]',
  '.thoughts-content',
  '.thoughts-content-expanded',
  // During active streaming, Gemini uses .thoughts-streaming instead of
  // .thoughts-content-expanded, so we must include it to start translating
  // while thoughts are still being generated.
  '.thoughts-streaming',
  '.thoughts-container',
] as const;
const THOUGHT_TEXT_SELECTORS = [
  ':scope .markdown.markdown-main-panel',
  ':scope > .markdown.markdown-main-panel',
  ':scope .message-container message-content .markdown.markdown-main-panel',
  ':scope .message-container message-content .markdown',
  ':scope message-content .markdown.markdown-main-panel',
  ':scope message-content .markdown',
  ':scope .thought-content',
] as const;
const MAX_TRANSLATION_CHUNK = 2800;
const MIN_STREAMING_GROWTH = 120;
const MIN_REQUEST_INTERVAL_MS = 450;
const THOUGHT_ROOT_SELECTOR =
  '[data-test-id="thoughts-content"], .thoughts-content, .thoughts-content-expanded, .thoughts-streaming, .thoughts-container, .thoughts-wrapper';
const TRACE_ENABLED = false;
const MAX_CONCURRENT_TRANSLATIONS = 1;

type TranslateResponse =
  | { ok: true; translatedText: string }
  | { ok: false; error?: string };

let started = false;
let enabled = true;
let observer: MutationObserver | null = null;
let debounceTimer: number | null = null;
const startupTimerIds = new Set<number>();
const translationCache = new Map<string, string>();
const translationPartCache = new Map<string, string>();
// Generation counter per container: allows a new translation to start even while
// one is in-flight. The in-flight callback checks if it's still the latest version.
const containerVersion = new WeakMap<HTMLElement, number>();
const pendingSourceByContainer = new WeakMap<HTMLElement, string>();
const lastRequestAtByContainer = new WeakMap<HTMLElement, number>();
let activeTranslationRequests = 0;

const logTrace = (event: string, detail?: Record<string, unknown>): void => {
  if (!TRACE_ENABLED) return;
  debugService.log('thought-translation', event, detail);
  console.info('[GM-TRACE][ThoughtTranslation]', event, detail ?? {});
};

const ensureStyle = (): void => {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .${TRANSLATION_CLASS} {
      margin-top: 12px;
      padding: 12px 14px;
      border-radius: 14px;
      border: 1px solid rgba(59, 130, 246, 0.18);
      background: rgba(59, 130, 246, 0.06);
      color: inherit;
      line-height: 1.72;
      white-space: pre-wrap;
    }

    .${TRANSLATION_CLASS}::before {
      content: '思维链翻译';
      display: block;
      margin-bottom: 8px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #2563eb;
    }

    .${TRANSLATION_CLASS}[${ERROR_ATTR}="1"] {
      border-color: rgba(239, 68, 68, 0.24);
      background: rgba(239, 68, 68, 0.06);
    }

    .${TRANSLATION_CLASS}[${ERROR_ATTR}="1"]::before {
      content: '思维链翻译失败';
      color: #dc2626;
    }

    /* ── Right-side side-by-side layout ── */
    /* When a translation block is present, show thought content and translation
       in a two-column flex row so the translation appears to the RIGHT. */
    .thoughts-content-expanded:has(.${TRANSLATION_CLASS}),
    .thoughts-streaming:has(.${TRANSLATION_CLASS}),
    .thoughts-content:has(.${TRANSLATION_CLASS}) {
      display: flex !important;
      flex-direction: row !important;
      align-items: flex-start !important;
      gap: 20px !important;
    }

    /* Thought text takes the remaining space on the left */
    .thoughts-content-expanded > :not(.${TRANSLATION_CLASS}),
    .thoughts-streaming > :not(.${TRANSLATION_CLASS}),
    .thoughts-content > :not(.${TRANSLATION_CLASS}) {
      flex: 1 1 0 !important;
      min-width: 0 !important;
    }

    /* Translation block is fixed-width on the right */
    .thoughts-content-expanded > .${TRANSLATION_CLASS},
    .thoughts-streaming > .${TRANSLATION_CLASS},
    .thoughts-content > .${TRANSLATION_CLASS} {
      flex: 0 0 38% !important;
      max-width: 38% !important;
      margin-top: 0 !important;
      position: sticky;
      top: 8px;
      align-self: flex-start;
    }
  `;
  document.head.appendChild(style);
};

const normalizeText = (value: string): string =>
  value
    .replace(/\u00a0/g, ' ')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const splitIntoChunks = (text: string): string[] => {
  const paragraphs = text.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = '';
  paragraphs.forEach((paragraph) => {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length <= MAX_TRANSLATION_CHUNK) {
      current = candidate;
      return;
    }
    if (current) {
      chunks.push(current);
    }
    if (paragraph.length <= MAX_TRANSLATION_CHUNK) {
      current = paragraph;
      return;
    }
    for (let index = 0; index < paragraph.length; index += MAX_TRANSLATION_CHUNK) {
      chunks.push(paragraph.slice(index, index + MAX_TRANSLATION_CHUNK));
    }
    current = '';
  });
  if (current) {
    chunks.push(current);
  }
  return chunks.length > 0 ? chunks : [text];
};

const isExpandedThoughtContainer = (container: HTMLElement): boolean => {
  if (container.matches('.thoughts-content-expanded')) return true;
  if (container.getAttribute('aria-hidden') === 'true') return false;
  if (container.hasAttribute('hidden')) return false;
  // Be permissive during streaming: the thought content may be in a partially-visible
  // panel (.thoughts-streaming wrapper). Only reject elements with display:none ancestry.
  if (container.offsetParent !== null || container.getClientRects().length > 0) return true;
  // Fallback: accept any container that is inside the thoughts wrapper even if not
  // in the layout flow (e.g., overflow:hidden parent). If the element has text content
  // it is worth translating; processThoughts will skip it gracefully when empty.
  return container.closest('.thoughts-wrapper, .thoughts-container, thoughts-entry') !== null;
};

const getPrimaryThoughtTextElement = (container: HTMLElement): HTMLElement | null => {
  if (container.matches('.markdown.markdown-main-panel')) {
    return container;
  }

  const candidates = THOUGHT_TEXT_SELECTORS.flatMap((selector) =>
    Array.from(container.querySelectorAll<HTMLElement>(selector)),
  ).filter((candidate) => !candidate.closest(`.${TRANSLATION_CLASS}`));

  let bestCandidate: HTMLElement | null = null;
  let bestLength = 0;

  candidates.forEach((candidate) => {
    // textContent avoids expensive layout reads from innerText during streaming.
    const sourceText = normalizeText(candidate.textContent || '');
    if (!sourceText) return;
    if (sourceText.length > bestLength) {
      bestCandidate = candidate;
      bestLength = sourceText.length;
    }
  });

  return bestCandidate;
};

const getThoughtContainers = (): HTMLElement[] => {
  const containers = new Set<HTMLElement>();

  THOUGHT_CONTAINER_SELECTORS.forEach((selector) => {
    document.querySelectorAll<HTMLElement>(selector).forEach((node) => {
      containers.add(node);
    });
  });

  // Explicitly support the active-expanded thoughts markdown shape reported by the user.
  document
    .querySelectorAll<HTMLElement>('.thoughts-container .markdown.markdown-main-panel')
    .forEach((node) => {
      const thoughtRoot =
        node.closest<HTMLElement>('[data-test-id="thoughts-content"], .thoughts-content, .thoughts-container') ??
        node;
      containers.add(thoughtRoot);
    });

  const expanded = Array.from(containers).filter(isExpandedThoughtContainer);

  // Remove ancestor containers — keep only the innermost (most specific) ones.
  const deduped = expanded.filter(
    (c) => !expanded.some((other) => other !== c && c.contains(other)),
  );

  // Prefer the explicitly-expanded right-panel containers only.
  // This prevents duplicate translation boxes appearing in the main conversation flow.
  const explicitlyExpanded = deduped.filter((c) => c.matches('.thoughts-content-expanded'));
  return explicitlyExpanded.length > 0 ? explicitlyExpanded : deduped;
};

const translateText = async (sourceText: string): Promise<string> => {
  const normalized = normalizeText(sourceText);
  if (!normalized) return '';

  const cached = translationCache.get(normalized);
  if (cached) {
    return cached;
  }

  const parts = splitIntoChunks(normalized);
  const translatedParts: string[] = [];

  for (const part of parts) {
    const cachedPart = translationPartCache.get(part);
    if (cachedPart) {
      translatedParts.push(cachedPart);
      continue;
    }

    const response = (await chrome.runtime.sendMessage({
      type: 'gm.translateThought',
      text: part,
      targetLang: 'zh-CN',
    })) as TranslateResponse;

    if (!response?.ok) {
      throw new Error(response?.error || 'translation_failed');
    }

    translationPartCache.set(part, response.translatedText);
    translatedParts.push(response.translatedText);
  }

  const translated = normalizeText(translatedParts.join('\n\n'));
  translationCache.set(normalized, translated);
  return translated;
};

const ensureTranslationNode = (container: HTMLElement): HTMLDivElement => {
  const existing = container.querySelector(`:scope > .${TRANSLATION_CLASS}`);
  if (existing instanceof HTMLDivElement) {
    return existing;
  }

  const node = document.createElement('div');
  node.className = TRANSLATION_CLASS;
  container.appendChild(node);
  return node;
};

const removeAllTranslations = (): void => {
  document.querySelectorAll(`.${TRANSLATION_CLASS}`).forEach((node) => node.remove());
  THOUGHT_CONTAINER_SELECTORS.forEach((selector) => {
    document.querySelectorAll<HTMLElement>(selector).forEach((container) => {
      container.removeAttribute(TRANSLATED_ATTR);
      container.removeAttribute(PROCESSING_ATTR);
      container.removeAttribute(SOURCE_ATTR);
      container.removeAttribute(ERROR_ATTR);
    });
  });
};

const processThoughts = (): void => {
  if (!enabled) {
    removeAllTranslations();
    return;
  }

  const containers = getThoughtContainers();
  logTrace('thought-container-scan', { count: containers.length });

  // Remove stale translation nodes that belong to containers no longer tracked.
  document.querySelectorAll<HTMLElement>(`.${TRANSLATION_CLASS}`).forEach((node) => {
    const parent = node.parentElement;
    if (parent && !containers.includes(parent)) {
      node.remove();
      parent.removeAttribute(TRANSLATED_ATTR);
      parent.removeAttribute(PROCESSING_ATTR);
      parent.removeAttribute(SOURCE_ATTR);
      parent.removeAttribute(ERROR_ATTR);
    }
  });

  containers.forEach((container) => {
    logTrace('thought-root-found', {
      className: container.className,
    });

    const textElement = getPrimaryThoughtTextElement(container);
    if (!textElement) {
      logTrace('thought-translation-empty-source', {
        reason: 'missing-text-element',
      });
      return;
    }

    const sourceText = normalizeText(textElement.textContent || '');
    logTrace('thought-text-extracted', {
      length: sourceText.length,
      preview: sourceText.slice(0, 80),
    });

    if (!sourceText) {
      logTrace('thought-translation-empty-source', {
        reason: 'empty-text',
      });
      return;
    }

    const prevSource = container.getAttribute(SOURCE_ATTR) ?? '';
    const isProcessing = container.getAttribute(PROCESSING_ATTR) === '1';
    const sourceGrowth = sourceText.length - prevSource.length;
    const now = Date.now();

    // Never overlap requests for the same container.
    // If streaming text grows enough, queue a follow-up pass instead.
    if (isProcessing) {
      if (sourceGrowth >= MIN_STREAMING_GROWTH) {
        pendingSourceByContainer.set(container, sourceText);
      }
      return;
    }

    if (activeTranslationRequests >= MAX_CONCURRENT_TRANSLATIONS) {
      pendingSourceByContainer.set(container, sourceText);
      return;
    }

    const lastRequestAt = lastRequestAtByContainer.get(container) ?? 0;
    if (prevSource && sourceText !== prevSource && now - lastRequestAt < MIN_REQUEST_INTERVAL_MS) {
      return;
    }

    const translationNode = ensureTranslationNode(container);

    // Skip if already stably translated with the exact same text.
    if (
      !isProcessing &&
      container.getAttribute(TRANSLATED_ATTR) === '1' &&
      prevSource === sourceText &&
      translationNode.textContent
    ) {
      logTrace('thought-translation-skipped-already-processed', {
        sourceLength: sourceText.length,
      });
      return;
    }

    // Bump generation so any prior in-flight call's result will be discarded.
    const myVersion = (containerVersion.get(container) ?? 0) + 1;
    containerVersion.set(container, myVersion);
    pendingSourceByContainer.delete(container);
    lastRequestAtByContainer.set(container, now);
    activeTranslationRequests += 1;

    container.setAttribute(PROCESSING_ATTR, '1');
    container.setAttribute(SOURCE_ATTR, sourceText);
    // Keep old translation text visible while updating — only show spinner on very first load.
    if (!translationNode.textContent || translationNode.textContent === '翻译中...') {
      translationNode.textContent = '翻译中...';
    }
    translationNode.removeAttribute(ERROR_ATTR);

    logTrace('thought-translation-requested', {
      sourceLength: sourceText.length,
      version: myVersion,
    });

    void translateText(sourceText)
      .then((translated) => {
        // Stale: a newer translation has already started, discard this result.
        if (containerVersion.get(container) !== myVersion) {
          logTrace('thought-translation-stale-ignored', { version: myVersion });
          return;
        }
        if (!enabled) return;
        translationNode.textContent = translated || '未返回可用翻译。';
        translationNode.removeAttribute(ERROR_ATTR);
        container.setAttribute(TRANSLATED_ATTR, '1');
        container.removeAttribute(ERROR_ATTR);
        logTrace('thought-translation-inserted', {
          sourceLength: sourceText.length,
          translatedLength: translated.length,
        });
      })
      .catch((error: unknown) => {
        if (containerVersion.get(container) !== myVersion) return;
        translationNode.textContent = `翻译失败：${String(error)}`;
        translationNode.setAttribute(ERROR_ATTR, '1');
        container.setAttribute(ERROR_ATTR, '1');
        container.removeAttribute(TRANSLATED_ATTR);
        logTrace('translate-failed', {
          error: String(error),
          sourceLength: sourceText.length,
        });
      })
      .finally(() => {
        activeTranslationRequests = Math.max(0, activeTranslationRequests - 1);
        // Only release the processing lock if we are still the latest version.
        if (containerVersion.get(container) === myVersion) {
          container.removeAttribute(PROCESSING_ATTR);
        }
        if (pendingSourceByContainer.has(container)) {
          // Prioritize queued streaming updates immediately after current request.
          lastRequestAtByContainer.delete(container);
          pendingSourceByContainer.delete(container);
        }
        // Always reschedule: catches text that arrived while we were translating.
        scheduleProcess();
      });
  });
};

const isNodeInTranslationBlock = (node: Node): boolean => {
  const element = node instanceof Element ? node : node.parentElement;
  return element?.closest(`.${TRANSLATION_CLASS}`) !== null;
};

const isNodeInThoughtTree = (node: Node): boolean => {
  const element = node instanceof Element ? node : node.parentElement;
  return element?.closest(THOUGHT_ROOT_SELECTOR) !== null;
};

const hasRelevantThoughtMutations = (mutations: MutationRecord[]): boolean => {
  return mutations.some((mutation) => {
    if (mutation.type === 'characterData') {
      if (isNodeInTranslationBlock(mutation.target)) return false;
      return isNodeInThoughtTree(mutation.target);
    }

    if (isNodeInTranslationBlock(mutation.target)) {
      return false;
    }

    if (isNodeInThoughtTree(mutation.target)) {
      return true;
    }

    for (const node of Array.from(mutation.addedNodes)) {
      if (isNodeInTranslationBlock(node)) continue;
      if (isNodeInThoughtTree(node)) return true;
    }

    for (const node of Array.from(mutation.removedNodes)) {
      if (isNodeInTranslationBlock(node)) continue;
      if (isNodeInThoughtTree(node)) return true;
    }

    return false;
  });
};

const scheduleProcess = (): void => {
  if (!enabled) {
    removeAllTranslations();
    return;
  }

  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = window.setTimeout(() => {
    debounceTimer = null;
    processThoughts();
  }, 220);
};

const scheduleWarmupPasses = (): void => {
  [180, 800, 1800, 3200].forEach((delay) => {
    const timerId = window.setTimeout(() => {
      startupTimerIds.delete(timerId);
      if (!enabled) return;
      logTrace('warmup-scan', { delay });
      processThoughts();
    }, delay);
    startupTimerIds.add(timerId);
  });
};

export function startThoughtTranslation(): void {
  enabled = true;
  ensureStyle();

  if (!observer && document.body) {
    observer = new MutationObserver((mutations) => {
      if (!hasRelevantThoughtMutations(mutations)) return;
      scheduleProcess();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  if (!started) {
    started = true;
    logTrace('start');
  }

  scheduleProcess();
  scheduleWarmupPasses();
}

export function stopThoughtTranslation(): void {
  enabled = false;

  if (observer) {
    observer.disconnect();
    observer = null;
  }

  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  startupTimerIds.forEach((timerId) => clearTimeout(timerId));
  startupTimerIds.clear();

  removeAllTranslations();
  document.getElementById(STYLE_ID)?.remove();
  started = false;
  logTrace('stop');
}

export function isThoughtTranslationActive(): boolean {
  return started && enabled;
}
