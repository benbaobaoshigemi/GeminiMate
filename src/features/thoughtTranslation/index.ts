import { debugService } from '@/core/services/DebugService';
import { StorageKeys } from '@/core/types/common';

const STYLE_ID = 'gm-thought-translation-style';
const LAYOUT_CLASS = 'gm-thought-translation-layout';
const ORIGINAL_CLASS = 'gm-thought-original';
const TRANSLATION_CLASS = 'gm-thought-translation';
const TRANSLATED_ATTR = 'data-gm-thought-translated';
const PROCESSING_ATTR = 'data-gm-thought-processing';
const SOURCE_ATTR = 'data-gm-thought-source';
const ERROR_ATTR = 'data-gm-thought-error';
const MODE_ATTR = 'data-gm-thought-mode';
const REPLACEMENT_ATTR = 'data-gm-thought-replacement';
const HIDDEN_ORIGINAL_CLASS = 'gm-thought-original-hidden';
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
const LINE_BREAK_TOKEN = '__GM_THOUGHT_NL_9F2E__';

type TranslateResponse =
  | { ok: true; translatedText: string }
  | { ok: false; error?: string };
type ThoughtTranslationMode = 'compare' | 'replace';
type ReplacementState = {
  anchor: Comment;
  originalNode: HTMLElement;
  translatedNode: HTMLElement | null;
};

let started = false;
let enabled = true;
let observer: MutationObserver | null = null;
let debounceTimer: number | null = null;
let translationMode: ThoughtTranslationMode = 'compare';
const startupTimerIds = new Set<number>();
const translationCache = new Map<string, string>();
const translationPartCache = new Map<string, string>();
// Generation counter per container: allows a new translation to start even while
// one is in-flight. The in-flight callback checks if it's still the latest version.
const containerVersion = new WeakMap<HTMLElement, number>();
const pendingSourceByContainer = new WeakMap<HTMLElement, string>();
const lastRequestAtByContainer = new WeakMap<HTMLElement, number>();
let activeTranslationRequests = 0;
const replacementStateByContainer = new WeakMap<HTMLElement, ReplacementState>();

const logTrace = (event: string, detail?: Record<string, unknown>): void => {
  if (!TRACE_ENABLED) return;
  debugService.log('thought-translation', event, detail);
  console.info('[GM-TRACE][ThoughtTranslation]', event, detail ?? {});
};

const resolveTranslationMode = (value: unknown): ThoughtTranslationMode =>
  value === 'replace' ? 'replace' : 'compare';

const applyTranslationMode = (container: HTMLElement): void => {
  container.setAttribute(MODE_ATTR, translationMode);
};

const handleStorageChanged = (
  changes: Record<string, chrome.storage.StorageChange>,
  areaName: string,
): void => {
  if (areaName !== 'local') return;
  const modeChange = changes[StorageKeys.THOUGHT_TRANSLATION_MODE];
  if (!modeChange) return;
  translationMode = resolveTranslationMode(modeChange.newValue);
  document.querySelectorAll<HTMLElement>(THOUGHT_ROOT_SELECTOR).forEach((container) => {
    applyTranslationMode(container);
  });
  scheduleProcess();
};

const ensureStyle = (): void => {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .${LAYOUT_CLASS} {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
      align-items: start !important;
      gap: 24px !important;
      width: 100% !important;
      max-width: 100% !important;
    }

    .${ORIGINAL_CLASS},
    .${TRANSLATION_CLASS} {
      min-width: 0 !important;
      width: 100% !important;
      max-width: 100% !important;
      box-sizing: border-box !important;
      overflow: visible !important;
      color: inherit;
      white-space: pre-wrap !important;
      overflow-wrap: break-word !important;
      word-break: normal !important;
    }

    .${TRANSLATION_CLASS}::before {
      content: '\\601D\\7EF4\\94FE\\7FFB\\8BD1';
      display: block;
      margin-bottom: 12px;
      color: inherit;
      opacity: 0.72;
      font: inherit;
      font-weight: 600;
    }

    .${TRANSLATION_CLASS} {
      padding: 0 !important;
      margin: 0 !important;
      border: 0 !important;
      border-left: 1px solid rgba(0, 0, 0, 0.12) !important;
      background: #ffffff !important;
      border-radius: 0 !important;
      padding: 0 20px 0 24px !important;
      box-shadow: none !important;
      font: inherit !important;
      font-family: inherit !important;
      font-size: inherit !important;
      line-height: inherit !important;
    }

    .${TRANSLATION_CLASS},
    .${TRANSLATION_CLASS} * {
      font-family: inherit !important;
      font-size: inherit !important;
      line-height: inherit !important;
      max-width: 100% !important;
      color: inherit !important;
      background: transparent !important;
    }

    .${TRANSLATION_CLASS} .gm-thought-translation-content {
      white-space: normal !important;
    }

    .${TRANSLATION_CLASS} .gm-thought-translation-content p {
      margin: 0 0 1em 0 !important;
    }

    .${TRANSLATION_CLASS} .gm-thought-translation-content p:last-child {
      margin-bottom: 0 !important;
    }

    .${TRANSLATION_CLASS}[${ERROR_ATTR}="1"] {
      color: #b42318 !important;
    }

    .${TRANSLATION_CLASS}[${ERROR_ATTR}="1"]::before {
      content: '\\601D\\7EF4\\94FE\\7FFB\\8BD1\\5931\\8D25';
    }

    [${MODE_ATTR}="replace"] > .${LAYOUT_CLASS} {
      grid-template-columns: minmax(0, 1fr) !important;
      gap: 0 !important;
    }

    [${MODE_ATTR}="replace"] .${ORIGINAL_CLASS} {
      display: none !important;
    }

    [${MODE_ATTR}="replace"] .${TRANSLATION_CLASS} {
      display: contents !important;
      border: 0 !important;
      background: transparent !important;
      padding: 0 !important;
      margin: 0 !important;
      font: inherit !important;
    }

    [${MODE_ATTR}="replace"] .${TRANSLATION_CLASS}::before {
      display: none !important;
    }

    .${HIDDEN_ORIGINAL_CLASS} {
      display: none !important;
    }

    @media (prefers-color-scheme: dark) {
      .${TRANSLATION_CLASS} {
        background: #000000 !important;
        border-left-color: rgba(255, 255, 255, 0.14) !important;
      }
    }

    @media (max-width: 1100px) {
      .${LAYOUT_CLASS} {
        grid-template-columns: minmax(0, 1fr) !important;
      }

      .${TRANSLATION_CLASS} {
        border-left: 0 !important;
        border-top: 1px solid rgba(0, 0, 0, 0.12) !important;
        padding: 20px 0 0 0 !important;
      }
    }

    @media (max-width: 1100px) and (prefers-color-scheme: dark) {
      .${TRANSLATION_CLASS} {
        border-top-color: rgba(255, 255, 255, 0.14) !important;
      }
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

const BLOCK_SELECTOR = [
  'p',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'figcaption',
  'td',
  'th',
].join(', ');

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildTranslatedHtml = (text: string): string => {
  const normalized = normalizeText(text);
  if (!normalized) return '';

  const paragraphs = normalized.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const html = paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');

  return `<div class="gm-thought-translation-content markdown markdown-main-panel">${html}</div>`;
};

const wrapTranslatedHtml = (innerHtml: string): string =>
  `<div class="gm-thought-translation-content markdown markdown-main-panel">${innerHtml}</div>`;

const getTranslatableBlocks = (root: HTMLElement): HTMLElement[] => {
  const blocks = Array.from(root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR))
    .filter((node) => !node.querySelector(BLOCK_SELECTOR));
  return blocks.length > 0 ? blocks : [root];
};

const buildReplacementHtml = async (textElement: HTMLElement, translatedFallback: string): Promise<string> => {
  const sourceBlocks = getTranslatableBlocks(textElement);
  const translatedBlocks = await Promise.all(
    sourceBlocks.map(async (block) => {
      const blockText = normalizeText(block.innerText || block.textContent || '');
      if (!blockText) return '';
      return translateText(blockText);
    }),
  );

  const clone = textElement.cloneNode(true);
  if (!(clone instanceof HTMLElement)) {
    return buildTranslatedHtml(translatedFallback);
  }
  clone.classList.remove(HIDDEN_ORIGINAL_CLASS);

  const cloneBlocks = getTranslatableBlocks(clone);
  if (cloneBlocks.length !== translatedBlocks.length) {
    return buildTranslatedHtml(translatedFallback);
  }

  cloneBlocks.forEach((block, index) => {
    const translated = normalizeText(translatedBlocks[index] || '');
    if (!translated) {
      block.textContent = '';
      return;
    }

    const lines = translated.split('\n').filter(Boolean);
    if (lines.length <= 1) {
      block.textContent = translated;
      return;
    }

    block.replaceChildren();
    lines.forEach((line, lineIndex) => {
      if (lineIndex > 0) {
        block.appendChild(document.createElement('br'));
      }
      block.appendChild(document.createTextNode(line));
    });
  });

  return clone.outerHTML;
};

const buildCompareHtml = async (textElement: HTMLElement, translatedFallback: string): Promise<string> => {
  const replacementHtml = await buildReplacementHtml(textElement, translatedFallback);
  return wrapTranslatedHtml(replacementHtml);
};

const restoreReplacementLayout = (container: HTMLElement): void => {
  const state = replacementStateByContainer.get(container);
  if (!state) return;

  state.translatedNode?.remove();
  if (!state.originalNode.isConnected) {
    state.anchor.parentNode?.insertBefore(state.originalNode, state.anchor);
  }
  state.anchor.remove();
  state.originalNode.classList.remove(HIDDEN_ORIGINAL_CLASS);
  replacementStateByContainer.delete(container);
};

const getReplacementNode = (container: HTMLElement): HTMLElement | null =>
  replacementStateByContainer.get(container)?.translatedNode ?? null;

const ensureReplacementState = (textElement: HTMLElement): ReplacementState => {
  const container = textElement.closest<HTMLElement>(THOUGHT_ROOT_SELECTOR) ?? textElement.parentElement;
  if (!container) {
    throw new Error('missing_thought_container');
  }

  const existingState = replacementStateByContainer.get(container);
  if (existingState) {
    return existingState;
  }

  const anchor = document.createComment('gm-thought-replacement-anchor');
  const parent = textElement.parentNode;
  if (!parent) {
    throw new Error('missing_thought_parent');
  }

  parent.insertBefore(anchor, textElement);
  parent.removeChild(textElement);
  textElement.classList.add(HIDDEN_ORIGINAL_CLASS);

  const state: ReplacementState = {
    anchor,
    originalNode: textElement,
    translatedNode: null,
  };
  replacementStateByContainer.set(container, state);
  return state;
};

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

  const extractText = (el: HTMLElement): string => {
    // innerText preserves visual paragraph/list newlines in thought panels.
    const raw = typeof el.innerText === 'string' && el.innerText.length > 0
      ? el.innerText
      : el.textContent || '';
    return normalizeText(raw);
  };

  candidates.forEach((candidate) => {
    const sourceText = extractText(candidate);
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

    const encodedPart = part.replace(/\n/g, ` ${LINE_BREAK_TOKEN} `);
    const response = (await chrome.runtime.sendMessage({
      type: 'gm.translateThought',
      text: encodedPart,
      targetLang: 'zh-CN',
    })) as TranslateResponse;

    if (!response?.ok) {
      throw new Error(response?.error || 'translation_failed');
    }

    const restoreTokenRegex = new RegExp(`\\s*${LINE_BREAK_TOKEN}\\s*`, 'g');
    const restoredLineBreaks = response.translatedText.replace(restoreTokenRegex, '\n');
    translationPartCache.set(part, restoredLineBreaks);
    translatedParts.push(restoredLineBreaks);
  }

  const translated = normalizeText(translatedParts.join('\n\n'));
  translationCache.set(normalized, translated);
  return translated;
};

const ensureTranslationLayout = (
  container: HTMLElement,
): { originalNode: HTMLDivElement; translationNode: HTMLDivElement } => {
  applyTranslationMode(container);
  let layout = container.querySelector(`:scope > .${LAYOUT_CLASS}`);
  let originalNode = layout?.querySelector(`:scope > .${ORIGINAL_CLASS}`) ?? null;
  let translationNode = layout?.querySelector(`:scope > .${TRANSLATION_CLASS}`) ?? null;

  if (!(layout instanceof HTMLDivElement)) {
    layout = document.createElement('div');
    layout.className = LAYOUT_CLASS;
    container.appendChild(layout);
  }

  if (!(originalNode instanceof HTMLDivElement)) {
    originalNode = document.createElement('div');
    originalNode.className = ORIGINAL_CLASS;
    layout.appendChild(originalNode);
  }

  const looseNodes = Array.from(container.childNodes).filter((node) => node !== layout);
  looseNodes.forEach((node) => originalNode.appendChild(node));

  if (!(translationNode instanceof HTMLDivElement)) {
    translationNode = document.createElement('div');
    translationNode.className = TRANSLATION_CLASS;
    layout.appendChild(translationNode);
  }

  return { originalNode, translationNode };
};

const restoreOriginalThoughtLayout = (container: HTMLElement): void => {
  restoreReplacementLayout(container);
  const layout = container.querySelector(`:scope > .${LAYOUT_CLASS}`);
  if (!(layout instanceof HTMLDivElement)) return;

  const originalNode = layout.querySelector(`:scope > .${ORIGINAL_CLASS}`);
  if (originalNode instanceof HTMLDivElement) {
    while (originalNode.firstChild) {
      container.insertBefore(originalNode.firstChild, layout);
    }
  }

  layout.remove();
};

const removeAllTranslations = (): void => {
  THOUGHT_CONTAINER_SELECTORS.forEach((selector) => {
    document.querySelectorAll<HTMLElement>(selector).forEach((container) => {
      restoreOriginalThoughtLayout(container);
      container.removeAttribute(TRANSLATED_ATTR);
      container.removeAttribute(PROCESSING_ATTR);
      container.removeAttribute(SOURCE_ATTR);
      container.removeAttribute(ERROR_ATTR);
      container.removeAttribute(MODE_ATTR);
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
  document
    .querySelectorAll<HTMLElement>(`.${TRANSLATION_CLASS}, [${REPLACEMENT_ATTR}="1"], ${THOUGHT_ROOT_SELECTOR}`)
    .forEach((node) => {
      const container = node.matches(THOUGHT_ROOT_SELECTOR)
        ? node
        : node.closest<HTMLElement>(THOUGHT_ROOT_SELECTOR);
      if (container && !containers.includes(container)) {
        restoreOriginalThoughtLayout(container);
        container.removeAttribute(TRANSLATED_ATTR);
        container.removeAttribute(PROCESSING_ATTR);
        container.removeAttribute(SOURCE_ATTR);
        container.removeAttribute(ERROR_ATTR);
      }
    });

  containers.forEach((container) => {
    logTrace('thought-root-found', {
      className: container.className,
    });

    const replacementState = replacementStateByContainer.get(container);
    const sourceElement = replacementState?.originalNode ?? getPrimaryThoughtTextElement(container);
    const textElement = sourceElement;
    if (!textElement) {
      logTrace('thought-translation-empty-source', {
        reason: 'missing-text-element',
      });
      return;
    }

    const sourceText = normalizeText(
      (typeof textElement.innerText === 'string' && textElement.innerText.length > 0)
        ? textElement.innerText
        : (textElement.textContent || ''),
    );
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

    if (translationMode === 'replace') {
      const layout = container.querySelector(`:scope > .${LAYOUT_CLASS}`);
      if (layout instanceof HTMLDivElement) {
        restoreOriginalThoughtLayout(container);
      }
    } else {
      restoreReplacementLayout(container);
    }

    const translationNode = translationMode === 'replace'
      ? ((): HTMLElement => {
          const state = ensureReplacementState(textElement);
          if (state.translatedNode) {
            return state.translatedNode;
          }

          const translatedNode = textElement.cloneNode(true);
          if (!(translatedNode instanceof HTMLElement)) {
            throw new Error('replacement_clone_failed');
          }
          translatedNode.classList.remove(HIDDEN_ORIGINAL_CLASS);
          translatedNode.setAttribute(REPLACEMENT_ATTR, '1');
          state.anchor.parentNode?.insertBefore(translatedNode, state.anchor.nextSibling);
          state.translatedNode = translatedNode;
          return translatedNode;
        })()
      : ensureTranslationLayout(container).translationNode;

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
      .then(async (translated) => {
        // Stale: a newer translation has already started, discard this result.
        if (containerVersion.get(container) !== myVersion) {
          logTrace('thought-translation-stale-ignored', { version: myVersion });
          return;
        }
        if (!enabled) return;
        const renderedHtml = translationMode === 'replace'
          ? await buildReplacementHtml(textElement, translated || '未返回可用翻译。')
          : await buildCompareHtml(textElement, translated || '未返回可用翻译。');
        if (containerVersion.get(container) !== myVersion) {
          logTrace('thought-translation-stale-ignored', { version: myVersion, stage: 'render-html' });
          return;
        }
        if (translationMode === 'replace') {
          const translatedNode = translationNode;
          const renderedNode = document.createElement('div');
          renderedNode.innerHTML = renderedHtml;
          const firstElement = renderedNode.firstElementChild;
          if (!(firstElement instanceof HTMLElement)) {
            throw new Error('replacement_render_failed');
          }
          firstElement.classList.remove(HIDDEN_ORIGINAL_CLASS);
          firstElement.setAttribute(REPLACEMENT_ATTR, '1');
          translatedNode.replaceWith(firstElement);
          const state = replacementStateByContainer.get(container);
          if (state) {
            state.translatedNode = firstElement;
          }
        } else {
          translationNode.innerHTML = renderedHtml;
          translationNode.removeAttribute(ERROR_ATTR);
        }
        container.setAttribute(TRANSLATED_ATTR, '1');
        container.removeAttribute(ERROR_ATTR);
        logTrace('thought-translation-inserted', {
          sourceLength: sourceText.length,
          translatedLength: translated.length,
        });
      })
      .catch((error: unknown) => {
        if (containerVersion.get(container) !== myVersion) return;
        if (translationMode === 'replace') {
          translationNode.textContent = `翻译失败：${String(error)}`;
        } else {
          translationNode.textContent = `翻译失败：${String(error)}`;
          translationNode.setAttribute(ERROR_ATTR, '1');
        }
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
  chrome.storage.local.get([StorageKeys.THOUGHT_TRANSLATION_MODE], (result) => {
    translationMode = resolveTranslationMode(result[StorageKeys.THOUGHT_TRANSLATION_MODE]);
    document.querySelectorAll<HTMLElement>(THOUGHT_ROOT_SELECTOR).forEach((container) => {
      applyTranslationMode(container);
    });
    scheduleProcess();
  });
  chrome.storage.onChanged.removeListener(handleStorageChanged);
  chrome.storage.onChanged.addListener(handleStorageChanged);

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
  chrome.storage.onChanged.removeListener(handleStorageChanged);

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
