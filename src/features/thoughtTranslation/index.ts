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

const THOUGHT_CONTAINER_SELECTORS = [
  '[data-test-id="thoughts-content"]',
  '.thoughts-content',
  '.thoughts-content-expanded',
  '.thoughts-streaming',
  '.thoughts-container',
  '.thoughts-wrapper',
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

const THOUGHT_ROOT_SELECTOR =
  '[data-test-id="thoughts-content"], .thoughts-content, .thoughts-content-expanded, .thoughts-streaming, .thoughts-container, .thoughts-wrapper';
const CODE_BLOCK_ROOT_SELECTOR =
  'pre, code-block, .code-block, [data-test-id*="code-block"], [data-test-id*="code_block"]';
const NON_TRANSLATABLE_DESCENDANT_SELECTOR = [
  `.${TRANSLATION_CLASS}`,
  'script',
  'style',
  '.katex',
  'math',
  'svg',
  'button',
  '[role="button"]',
  'mat-icon',
  '.google-symbols',
  'pre',
  'code-block',
  '.code-block',
  '[data-test-id*="code-block"]',
  '[data-test-id*="code_block"]',
].join(', ');
const TERMINAL_TEXT_BLOCK_TAGS = new Set([
  'P',
  'LI',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'BLOCKQUOTE',
  'TD',
  'TH',
  'DT',
  'DD',
]);

const MAX_TRANSLATION_CHUNK = 2800;
const MIN_REQUEST_INTERVAL_MS = 260;
const MAX_CONCURRENT_TRANSLATIONS = 1;
const BLOCK_TRANSLATION_CONCURRENCY = 3;
const INCOMPLETE_RETRY_BASE_DELAY_MS = 260;
const INCOMPLETE_RETRY_MAX_DELAY_MS = 2400;
const TRACE_ENABLED = false;

type TranslateResponse =
  | { ok: true; translatedText: string }
  | { ok: false; error?: string };
type ThoughtTranslationMode = 'compare' | 'replace';
type ThoughtBlockKind = 'text' | 'code';
type ThoughtBlock = {
  id: string;
  text: string;
  kind: ThoughtBlockKind;
};
type TranslationPayload = {
  sourceNodes: HTMLElement[];
  sourceText: string;
  blocks: ThoughtBlock[];
  signature: string;
};
type RetryState = {
  signature: string;
  attempt: number;
};

let started = false;
let enabled = true;
let observer: MutationObserver | null = null;
let debounceTimer: number | null = null;
let translationMode: ThoughtTranslationMode = 'compare';
const startupTimerIds = new Set<number>();
const translationCache = new Map<string, string>();
const translationPartCache = new Map<string, string>();
const containerVersion = new WeakMap<HTMLElement, number>();
const pendingPayloadByContainer = new WeakMap<HTMLElement, TranslationPayload>();
const lastRequestAtByContainer = new WeakMap<HTMLElement, number>();
const retryTimerByContainer = new WeakMap<HTMLElement, number>();
const incompleteRetryStateByContainer = new WeakMap<HTMLElement, RetryState>();
let activeTranslationRequests = 0;

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

    .${TRANSLATION_CLASS} .gm-thought-translation-code {
      margin: 0 0 1em 0 !important;
      padding: 12px 14px !important;
      border-radius: 10px !important;
      overflow-x: auto !important;
      white-space: pre !important;
      background: rgba(15, 23, 42, 0.06) !important;
      border: 0 !important;
    }

    .${TRANSLATION_CLASS} .gm-thought-translation-code:last-child {
      margin-bottom: 0 !important;
    }

    .${TRANSLATION_CLASS} .gm-thought-translation-code code {
      white-space: pre !important;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace !important;
      font-size: 0.92em !important;
      line-height: 1.5 !important;
    }

    .${TRANSLATION_CLASS}[${ERROR_ATTR}="1"] {
      color: #b42318 !important;
    }

    .${TRANSLATION_CLASS}[${ERROR_ATTR}="1"]::before {
      content: '\\601D\\7EF4\\94FE\\7FFB\\8BD1\\91CD\\8BD5\\4E2D';
    }

    [${MODE_ATTR}="replace"] > .${LAYOUT_CLASS} {
      grid-template-columns: minmax(0, 1fr) !important;
      gap: 0 !important;
    }

    [${MODE_ATTR}="replace"] .${ORIGINAL_CLASS} {
      display: none !important;
    }

    [${MODE_ATTR}="replace"] .${TRANSLATION_CLASS} {
      border: 0 !important;
      border-left: 1px solid rgba(0, 0, 0, 0.12) !important;
      background: transparent !important;
      padding: 0 20px 0 24px !important;
      margin: 0 !important;
      font: inherit !important;
    }

    [${MODE_ATTR}="replace"] .${TRANSLATION_CLASS}::before {
      display: none !important;
    }

    @media (prefers-color-scheme: dark) {
      .${TRANSLATION_CLASS} {
        background: #000000 !important;
        border-left-color: rgba(255, 255, 255, 0.14) !important;
      }

      .${TRANSLATION_CLASS} .gm-thought-translation-code {
        background: rgba(148, 163, 184, 0.18) !important;
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

const normalizeCodeText = (value: string): string =>
  value
    .replace(/\u00a0/g, ' ')
    .replace(/\r/g, '')
    .replace(/\u200b/g, '')
    .trim();

const sanitizeTranslationArtifacts = (value: string): string =>
  value
    .replace(
      /([\u4e00-\u9fff\u3002\uff0c\uff1b\uff1a\uff01\uff1f\uff09\u3011])(?:\s*(?:en){2,})(?=\s|$)/gi,
      '$1',
    )
    .replace(/(^|\s)(?:en){2,}(?=\s|$)/gi, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

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
    if (current) chunks.push(current);
    if (paragraph.length <= MAX_TRANSLATION_CHUNK) {
      current = paragraph;
      return;
    }
    for (let index = 0; index < paragraph.length; index += MAX_TRANSLATION_CHUNK) {
      chunks.push(paragraph.slice(index, index + MAX_TRANSLATION_CHUNK));
    }
    current = '';
  });
  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [text];
};

const getElementText = (element: HTMLElement): string =>
  normalizeText(element.textContent || '');

const getNodeDepth = (node: Node): number => {
  let depth = 0;
  let current: Node | null = node;
  while (current.parentNode) {
    current = current.parentNode;
    depth += 1;
  }
  return depth;
};

const sortByDomOrder = (left: HTMLElement, right: HTMLElement): number => {
  if (left === right) return 0;
  const position = left.compareDocumentPosition(right);
  if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
  if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
  return 0;
};

const resolveThoughtToggleExpanded = (container: HTMLElement): boolean | null => {
  const thoughtRoot = container.closest<HTMLElement>('model-thoughts, .model-thoughts');
  if (!thoughtRoot) return null;

  const toggleButton =
    thoughtRoot.querySelector<HTMLElement>('button.thoughts-header-button[aria-expanded]') ??
    thoughtRoot.querySelector<HTMLElement>('button[aria-expanded][data-test-id*="thought"]') ??
    thoughtRoot.querySelector<HTMLElement>('button[aria-expanded][class*="thought"]') ??
    thoughtRoot.querySelector<HTMLElement>('[role="button"][aria-expanded][data-test-id*="thought"]');
  if (!toggleButton) return null;

  const expanded = toggleButton.getAttribute('aria-expanded');
  if (expanded === 'true') return true;
  if (expanded === 'false') return false;
  return null;
};

const isExpandedThoughtContainer = (container: HTMLElement): boolean => {
  const explicitExpanded =
    container.matches('.thoughts-content-expanded') || container.matches('.thoughts-streaming');
  if (!explicitExpanded) return false;
  const toggleExpanded = resolveThoughtToggleExpanded(container);
  if (toggleExpanded === false) return false;
  if (container.getAttribute('aria-hidden') === 'true') return false;
  if (container.hasAttribute('hidden')) return false;
  if (container.closest('[aria-hidden="true"], [hidden]')) return false;

  const computed = window.getComputedStyle(container);
  if (computed.display === 'none' || computed.visibility === 'hidden') return false;

  const rect = container.getBoundingClientRect();
  const hasGeometry = rect.width > 1 && rect.height > 1;
  return hasGeometry;
};

const getThoughtSourceNodes = (container: HTMLElement): HTMLElement[] => {
  const candidates = new Set<HTMLElement>();

  if (container.matches('.markdown, .markdown.markdown-main-panel')) {
    candidates.add(container);
  }

  THOUGHT_TEXT_SELECTORS.forEach((selector) => {
    container.querySelectorAll<HTMLElement>(selector).forEach((node) => candidates.add(node));
  });

  const withText = Array.from(candidates).filter((candidate) => {
    if (candidate.closest(`.${TRANSLATION_CLASS}`)) return false;
    return getElementText(candidate).length > 0;
  });

  const depthPruned = withText
    .sort((left, right) => getNodeDepth(left) - getNodeDepth(right))
    .filter((candidate, _, all) => !all.some((other) => other !== candidate && other.contains(candidate)));

  const ordered = depthPruned.sort(sortByDomOrder);
  if (ordered.length > 0) return ordered;

  return getElementText(container) ? [container] : [];
};

const getTextWithoutSkippedDescendants = (element: HTMLElement): string => {
  const clone = element.cloneNode(true);
  if (!(clone instanceof HTMLElement)) return '';
  clone.querySelectorAll(NON_TRANSLATABLE_DESCENDANT_SELECTOR).forEach((node) => node.remove());
  return normalizeText(clone.textContent || '');
};

const resolveCodeBlockNode = (element: HTMLElement): HTMLElement | null => {
  if (element.matches('pre')) return element;
  const nestedPre = element.querySelector<HTMLElement>('pre');
  if (nestedPre) return nestedPre;

  if (element.matches(CODE_BLOCK_ROOT_SELECTOR)) return element;
  const nested = element.querySelector<HTMLElement>(CODE_BLOCK_ROOT_SELECTOR);
  if (!nested) return null;
  if (TERMINAL_TEXT_BLOCK_TAGS.has(element.tagName) && getTextWithoutSkippedDescendants(element).length > 0) {
    return null;
  }
  return nested;
};

const getCodeBlockText = (element: HTMLElement): string => {
  const pre = element.matches('pre') ? element : element.querySelector<HTMLElement>('pre');
  if (pre) return normalizeCodeText(pre.textContent || '');
  const code = element.matches('code') ? element : element.querySelector<HTMLElement>('code');
  if (code) return normalizeCodeText(code.textContent || '');
  return normalizeCodeText(element.textContent || '');
};

const appendBlock = (
  blocks: ThoughtBlock[],
  nodeIndex: number,
  blockIndex: number,
  rawText: string,
  kind: ThoughtBlockKind = 'text',
): number => {
  const text = kind === 'code' ? normalizeCodeText(rawText) : normalizeText(rawText);
  if (!text) return blockIndex;
  blocks.push({
    id: `node-${nodeIndex}-block-${blockIndex}`,
    text,
    kind,
  });
  return blockIndex + 1;
};

const appendElementBlocks = (
  blocks: ThoughtBlock[],
  nodeIndex: number,
  blockIndex: number,
  element: HTMLElement,
): number => {
  if (element.closest(`.${TRANSLATION_CLASS}`)) return blockIndex;
  if (element.matches('br')) return blockIndex;

  if (element.matches('ul, ol')) {
    let nextBlockIndex = blockIndex;
    Array.from(element.children).forEach((li) => {
      if (!(li instanceof HTMLElement)) return;
      nextBlockIndex = appendElementBlocks(blocks, nodeIndex, nextBlockIndex, li);
    });
    return nextBlockIndex;
  }

  const codeNode = resolveCodeBlockNode(element);
  if (codeNode) {
    return appendBlock(blocks, nodeIndex, blockIndex, getCodeBlockText(codeNode), 'code');
  }

  if (!TERMINAL_TEXT_BLOCK_TAGS.has(element.tagName) && element.children.length > 0) {
    let nextBlockIndex = blockIndex;
    Array.from(element.children).forEach((child) => {
      if (!(child instanceof HTMLElement)) return;
      nextBlockIndex = appendElementBlocks(blocks, nodeIndex, nextBlockIndex, child);
    });
    if (nextBlockIndex > blockIndex) {
      return nextBlockIndex;
    }
  }

  return appendBlock(blocks, nodeIndex, blockIndex, getTextWithoutSkippedDescendants(element), 'text');
};

const buildBlocksForSourceNode = (sourceNode: HTMLElement, nodeIndex: number): ThoughtBlock[] => {
  const blocks: ThoughtBlock[] = [];
  let blockIndex = 0;

  Array.from(sourceNode.childNodes).forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      blockIndex = appendBlock(blocks, nodeIndex, blockIndex, child.textContent || '', 'text');
      return;
    }

    if (!(child instanceof HTMLElement)) {
      return;
    }

    blockIndex = appendElementBlocks(blocks, nodeIndex, blockIndex, child);
  });

  if (blocks.length > 0) return blocks;

  const fallback = getTextWithoutSkippedDescendants(sourceNode);
  if (!fallback) return [];
  return [{ id: `node-${nodeIndex}-block-fallback`, text: fallback, kind: 'text' }];
};

const getSourcePayload = (container: HTMLElement): TranslationPayload | null => {
  const sourceNodes = getThoughtSourceNodes(container);
  if (sourceNodes.length === 0) return null;

  const blocks = sourceNodes.flatMap((sourceNode, index) => buildBlocksForSourceNode(sourceNode, index));
  const sourceText = normalizeText(
    blocks
      .filter((block) => block.kind === 'text')
      .map((block) => block.text)
      .join('\n\n'),
  );
  if (blocks.length === 0) return null;

  return {
    sourceNodes,
    sourceText,
    blocks,
    signature: blocks.map((block) => `${block.kind}:${block.text}`).join('\u241F'),
  };
};

const buildCompareHtmlFromBlocks = (
  sourceBlocks: ThoughtBlock[],
  translatedBlocks: Array<string | null>,
): string => {
  const html = sourceBlocks
    .map((sourceBlock, index) => {
      const raw = translatedBlocks[index] ?? sourceBlock.text;
      if (sourceBlock.kind === 'code') {
        const codeText = normalizeCodeText(raw);
        if (!codeText) return '';
        return `<pre class="gm-thought-translation-code"><code>${escapeHtml(codeText)}</code></pre>`;
      }

      const paragraph = normalizeText(raw);
      if (!paragraph) return '';
      return `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`;
    })
    .join('');

  return `<div class="gm-thought-translation-content markdown markdown-main-panel">${html}</div>`;
};

const ensureTranslationLayout = (
  container: HTMLElement,
  sourceNodes: HTMLElement[],
): { originalNode: HTMLDivElement; translationNode: HTMLDivElement } => {
  applyTranslationMode(container);
  let layout = container.querySelector<HTMLDivElement>(`:scope > .${LAYOUT_CLASS}`);
  let originalNode = layout?.querySelector<HTMLDivElement>(`:scope > .${ORIGINAL_CLASS}`) ?? null;
  let translationNode = layout?.querySelector<HTMLDivElement>(`:scope > .${TRANSLATION_CLASS}`) ?? null;

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

  sourceNodes.forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    if (!container.contains(node)) return;
    if (node.closest(`.${TRANSLATION_CLASS}`)) return;
    if (node.parentElement === originalNode) return;
    originalNode.appendChild(node);
  });

  if (!(translationNode instanceof HTMLDivElement)) {
    translationNode = document.createElement('div');
    translationNode.className = TRANSLATION_CLASS;
    layout.appendChild(translationNode);
  }

  return { originalNode, translationNode };
};

const restoreOriginalThoughtLayout = (container: HTMLElement): void => {
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

const getThoughtContainers = (): HTMLElement[] => {
  const containers = new Set<HTMLElement>();
  THOUGHT_CONTAINER_SELECTORS.forEach((selector) => {
    document.querySelectorAll<HTMLElement>(selector).forEach((node) => containers.add(node));
  });
  document.querySelectorAll<HTMLElement>('.thoughts-container .markdown.markdown-main-panel').forEach((node) => {
    const thoughtRoot = node.closest<HTMLElement>(THOUGHT_ROOT_SELECTOR) ?? node;
    containers.add(thoughtRoot);
  });

  const expanded = Array.from(containers).filter(isExpandedThoughtContainer);
  const deduped = expanded.filter(
    (container) => !expanded.some((other) => other !== container && container.contains(other)),
  );
  const explicitlyExpanded = deduped.filter((container) => container.matches('.thoughts-content-expanded'));
  return explicitlyExpanded.length > 0 ? explicitlyExpanded : deduped;
};

const getContainerVersion = (container: HTMLElement): number => containerVersion.get(container) ?? 0;

const bumpContainerVersion = (container: HTMLElement): number => {
  const next = getContainerVersion(container) + 1;
  containerVersion.set(container, next);
  return next;
};

const clearContainerRetryTimer = (container: HTMLElement): void => {
  const timerId = retryTimerByContainer.get(container);
  if (timerId !== undefined) {
    clearTimeout(timerId);
    retryTimerByContainer.delete(container);
  }
};

const scheduleContainerRetry = (container: HTMLElement, delayMs: number): void => {
  clearContainerRetryTimer(container);
  const timerId = window.setTimeout(() => {
    retryTimerByContainer.delete(container);
    scheduleProcess();
  }, Math.max(30, delayMs));
  retryTimerByContainer.set(container, timerId);
};

const clearIncompleteRetryState = (container: HTMLElement): void => {
  incompleteRetryStateByContainer.delete(container);
};

const scheduleIncompleteRetry = (container: HTMLElement, payload: TranslationPayload): void => {
  const previous = incompleteRetryStateByContainer.get(container);
  const nextAttempt =
    previous && previous.signature === payload.signature ? previous.attempt + 1 : 1;
  incompleteRetryStateByContainer.set(container, {
    signature: payload.signature,
    attempt: nextAttempt,
  });

  const delay = Math.min(
    INCOMPLETE_RETRY_MAX_DELAY_MS,
    INCOMPLETE_RETRY_BASE_DELAY_MS * nextAttempt,
  );
  scheduleContainerRetry(container, delay);
};

const resetContainerState = (container: HTMLElement): void => {
  bumpContainerVersion(container);
  clearContainerRetryTimer(container);
  clearIncompleteRetryState(container);
  pendingPayloadByContainer.delete(container);
  container.removeAttribute(TRANSLATED_ATTR);
  container.removeAttribute(PROCESSING_ATTR);
  container.removeAttribute(SOURCE_ATTR);
  container.removeAttribute(ERROR_ATTR);
};

const translateText = async (sourceText: string): Promise<string> => {
  const normalized = normalizeText(sourceText);
  if (!normalized) return '';

  const cached = translationCache.get(normalized);
  if (cached) return cached;

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

    if (!response || response.ok !== true) {
      const errorMessage = response && 'error' in response ? response.error : undefined;
      throw new Error(errorMessage || 'translation_failed');
    }

    const translatedPart = normalizeText(sanitizeTranslationArtifacts(response.translatedText));
    if (!translatedPart) {
      throw new Error('translation_empty_chunk');
    }

    translationPartCache.set(part, translatedPart);
    translatedParts.push(translatedPart);
  }

  const translated = normalizeText(translatedParts.join('\n\n'));
  if (!translated) {
    throw new Error('translation_empty');
  }

  translationCache.set(normalized, translated);
  return translated;
};

const renderTranslationNode = (
  translationNode: HTMLElement,
  sourceBlocks: ThoughtBlock[],
  translatedBlocks: Array<string | null>,
): void => {
  translationNode.innerHTML = buildCompareHtmlFromBlocks(sourceBlocks, translatedBlocks);
  translationNode.removeAttribute(ERROR_ATTR);
};

const translatePayloadByBlocks = async (
  container: HTMLElement,
  payload: TranslationPayload,
  version: number,
  translationNode: HTMLElement,
): Promise<{ incompleteCount: number }> => {
  const sourceBlocks = payload.blocks;
  const translatedBlocks: Array<string | null> = sourceBlocks.map((block) =>
    block.kind === 'code' ? block.text : null,
  );
  renderTranslationNode(translationNode, sourceBlocks, translatedBlocks);

  const textBlockIndexes = sourceBlocks
    .map((block, index) => (block.kind === 'text' ? index : -1))
    .filter((index) => index >= 0);
  if (textBlockIndexes.length === 0) {
    return { incompleteCount: 0 };
  }

  let incompleteCount = 0;
  let nextBlockIndex = 0;

  const workerCount = Math.max(
    1,
    Math.min(BLOCK_TRANSLATION_CONCURRENCY, textBlockIndexes.length),
  );

  const worker = async (): Promise<void> => {
    while (true) {
      const position = nextBlockIndex;
      nextBlockIndex += 1;
      if (position >= textBlockIndexes.length) return;

      const index = textBlockIndexes[position];

      const blockText = sourceBlocks[index]?.text ?? '';
      if (!blockText) {
        translatedBlocks[index] = '';
        if (getContainerVersion(container) !== version) return;
        renderTranslationNode(translationNode, sourceBlocks, translatedBlocks);
        continue;
      }

      try {
        const translated = await translateText(blockText);
        if (getContainerVersion(container) !== version) {
          return;
        }
        translatedBlocks[index] = translated;
      } catch (error: unknown) {
        incompleteCount += 1;
        translatedBlocks[index] = null;
        logTrace('block-translation-failed', {
          blockId: payload.blocks[index]?.id,
          error: String(error),
        });
      }

      if (getContainerVersion(container) !== version) {
        return;
      }
      renderTranslationNode(translationNode, sourceBlocks, translatedBlocks);
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  if (getContainerVersion(container) !== version) {
    return { incompleteCount: textBlockIndexes.length };
  }

  return { incompleteCount };
};

const runTranslationForContainer = (container: HTMLElement, payload: TranslationPayload): void => {
  const now = Date.now();
  const version = bumpContainerVersion(container);
  pendingPayloadByContainer.delete(container);
  lastRequestAtByContainer.set(container, now);
  activeTranslationRequests += 1;

  container.setAttribute(PROCESSING_ATTR, '1');
  container.setAttribute(SOURCE_ATTR, payload.sourceText);
  container.removeAttribute(ERROR_ATTR);
  applyTranslationMode(container);

  const { translationNode } = ensureTranslationLayout(container, payload.sourceNodes);
  if (!translationNode.textContent) {
    translationNode.textContent = '\u7ffb\u8bd1\u4e2d...';
  }

  void translatePayloadByBlocks(container, payload, version, translationNode)
    .then((result) => {
      if (getContainerVersion(container) !== version) return;

      if (result.incompleteCount > 0) {
        container.removeAttribute(TRANSLATED_ATTR);
        pendingPayloadByContainer.set(container, payload);
        scheduleIncompleteRetry(container, payload);
        logTrace('thought-translation-incomplete', {
          incompleteCount: result.incompleteCount,
          blockCount: payload.blocks.length,
        });
        return;
      }

      container.setAttribute(TRANSLATED_ATTR, '1');
      container.removeAttribute(ERROR_ATTR);
      clearIncompleteRetryState(container);
      logTrace('thought-translation-completed', {
        blockCount: payload.blocks.length,
        sourceLength: payload.sourceText.length,
      });
    })
    .catch((error: unknown) => {
      if (getContainerVersion(container) !== version) return;
      const message = `\u7ffb\u8bd1\u91cd\u8bd5\u4e2d: ${String(error)}`;
      translationNode.textContent = message;
      translationNode.setAttribute(ERROR_ATTR, '1');
      container.setAttribute(ERROR_ATTR, '1');
      container.removeAttribute(TRANSLATED_ATTR);
      pendingPayloadByContainer.set(container, payload);
      scheduleIncompleteRetry(container, payload);
      logTrace('thought-translation-failed', { error: String(error) });
    })
    .finally(() => {
      activeTranslationRequests = Math.max(0, activeTranslationRequests - 1);
      if (getContainerVersion(container) === version) {
        container.removeAttribute(PROCESSING_ATTR);
      }
      scheduleProcess();
    });
};

const removeAllTranslations = (): void => {
  THOUGHT_CONTAINER_SELECTORS.forEach((selector) => {
    document.querySelectorAll<HTMLElement>(selector).forEach((container) => {
      restoreOriginalThoughtLayout(container);
      resetContainerState(container);
      container.removeAttribute(MODE_ATTR);
    });
  });
};

const processContainer = (container: HTMLElement): void => {
  const payload = getSourcePayload(container);
  if (!payload) return;

  const previousRetryState = incompleteRetryStateByContainer.get(container);
  if (previousRetryState && previousRetryState.signature !== payload.signature) {
    clearIncompleteRetryState(container);
  }

  const prevSource = container.getAttribute(SOURCE_ATTR) ?? '';
  const isProcessing = container.getAttribute(PROCESSING_ATTR) === '1';
  const now = Date.now();

  const sameAsCurrentSource = prevSource === payload.sourceText;
  const hasPendingPayload = pendingPayloadByContainer.has(container);
  const hasIncompleteRetry =
    incompleteRetryStateByContainer.get(container)?.signature === payload.signature;

  if (
    container.getAttribute(TRANSLATED_ATTR) === '1' &&
    !isProcessing &&
    sameAsCurrentSource &&
    !hasPendingPayload &&
    !hasIncompleteRetry
  ) {
    return;
  }

  if (isProcessing) {
    if (!sameAsCurrentSource) {
      pendingPayloadByContainer.set(container, payload);
    }
    return;
  }

  if (activeTranslationRequests >= MAX_CONCURRENT_TRANSLATIONS) {
    pendingPayloadByContainer.set(container, payload);
    return;
  }

  const lastRequestAt = lastRequestAtByContainer.get(container) ?? 0;
  if (prevSource && !sameAsCurrentSource && now - lastRequestAt < MIN_REQUEST_INTERVAL_MS) {
    pendingPayloadByContainer.set(container, payload);
    scheduleContainerRetry(container, MIN_REQUEST_INTERVAL_MS - (now - lastRequestAt));
    return;
  }

  runTranslationForContainer(container, payload);
};

const processThoughts = (): void => {
  if (!enabled) {
    removeAllTranslations();
    return;
  }

  const containers = getThoughtContainers();
  logTrace('thought-container-scan', { count: containers.length });

  document
    .querySelectorAll<HTMLElement>(`.${TRANSLATION_CLASS}, ${THOUGHT_ROOT_SELECTOR}`)
    .forEach((node) => {
      const container = node.matches(THOUGHT_ROOT_SELECTOR)
        ? node
        : node.closest<HTMLElement>(THOUGHT_ROOT_SELECTOR);
      if (container && !containers.includes(container)) {
        restoreOriginalThoughtLayout(container);
        resetContainerState(container);
        container.removeAttribute(MODE_ATTR);
      }
    });

  containers.forEach((container) => processContainer(container));
};

const isNodeInTranslationBlock = (node: Node): boolean => {
  const element = node instanceof Element ? node : node.parentElement;
  return element?.closest(`.${TRANSLATION_CLASS}`) !== null;
};

const isNodeInThoughtTree = (node: Node): boolean => {
  const element = node instanceof Element ? node : node.parentElement;
  return element?.closest(THOUGHT_ROOT_SELECTOR) !== null;
};

const getClosestThoughtContainer = (node: Node): HTMLElement | null => {
  const element = node instanceof Element ? node : node.parentElement;
  if (!element) return null;
  return element.closest<HTMLElement>(THOUGHT_ROOT_SELECTOR);
};

const isNodeInExpandedThoughtTree = (node: Node): boolean => {
  const container = getClosestThoughtContainer(node);
  if (!container) return false;
  return isExpandedThoughtContainer(container);
};

const hasRelevantThoughtMutations = (mutations: MutationRecord[]): boolean =>
  mutations.some((mutation) => {
    if (mutation.type === 'attributes') {
      if (isNodeInTranslationBlock(mutation.target)) return false;
      return isNodeInThoughtTree(mutation.target);
    }

    if (mutation.type === 'characterData') {
      if (isNodeInTranslationBlock(mutation.target)) return false;
      return isNodeInExpandedThoughtTree(mutation.target);
    }

    if (isNodeInTranslationBlock(mutation.target)) return false;
    if (isNodeInExpandedThoughtTree(mutation.target)) return true;

    for (const node of Array.from(mutation.addedNodes)) {
      if (isNodeInTranslationBlock(node)) continue;
      if (isNodeInExpandedThoughtTree(node)) return true;
    }

    for (const node of Array.from(mutation.removedNodes)) {
      if (isNodeInTranslationBlock(node)) continue;
      if (isNodeInExpandedThoughtTree(node)) return true;
    }

    return false;
  });

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
  }, 160);
};

const scheduleWarmupPasses = (): void => {
  [180, 800, 1800, 3200].forEach((delay) => {
    const timerId = window.setTimeout(() => {
      startupTimerIds.delete(timerId);
      if (!enabled) return;
      processThoughts();
    }, delay);
    startupTimerIds.add(timerId);
  });
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
    bumpContainerVersion(container);
    container.removeAttribute(PROCESSING_ATTR);
    container.removeAttribute(TRANSLATED_ATTR);
  });
  scheduleProcess();
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
      attributes: true,
      attributeFilter: ['class', 'style', 'aria-hidden', 'hidden'],
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

  document.querySelectorAll<HTMLElement>(THOUGHT_ROOT_SELECTOR).forEach((container) => {
    clearContainerRetryTimer(container);
    clearIncompleteRetryState(container);
  });

  removeAllTranslations();
  document.getElementById(STYLE_ID)?.remove();
  started = false;
  logTrace('stop');
}

export function isThoughtTranslationActive(): boolean {
  return started && enabled;
}
