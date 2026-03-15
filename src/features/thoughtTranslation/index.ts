import { debugService } from '@/core/services/DebugService';
import { StorageKeys } from '@/core/types/common';
import {
  isModelResponseComplete,
  isNodeInModelResponse as isNodeInModelResponseLifecycle,
} from '@/core/utils/responseLifecycle';
import {
  isManagedThoughtContainerState,
  selectThoughtContainersForCleanup,
} from './containerOwnership';
import {
  hasMeaningfulResponseBodyContentState,
  shouldHideThoughtTranslationDuringRefresh,
  shouldDisplayThoughtTranslation,
} from './displayState';
import { isThoughtContainerActive } from './domState';
import {
  resolveThoughtLayoutInsertionMode,
  resolveThoughtTextEmphasis,
  type ThoughtTextEmphasis,
} from './presentationState';
import { selectActiveThoughtSourceNodes } from './sourceSelection';
import {
  normalizeThoughtSourceTextBlock,
  sanitizeThoughtTranslationArtifacts,
} from './translationArtifacts';

const STYLE_ID = 'gm-thought-translation-style';
const LAYOUT_CLASS = 'gm-thought-translation-layout';
const ORIGINAL_CLASS = 'gm-thought-original';
const TRANSLATION_CLASS = 'gm-thought-translation';
const TRANSLATED_ATTR = 'data-gm-thought-translated';
const PROCESSING_ATTR = 'data-gm-thought-processing';
const SOURCE_ATTR = 'data-gm-thought-source';
const ERROR_ATTR = 'data-gm-thought-error';
const MODE_ATTR = 'data-gm-thought-mode';
const MANAGED_THOUGHT_NODE_SELECTOR = [
  `.${LAYOUT_CLASS}`,
  `[${TRANSLATED_ATTR}]`,
  `[${PROCESSING_ATTR}]`,
  `[${SOURCE_ATTR}]`,
  `[${ERROR_ATTR}]`,
  `[${MODE_ATTR}]`,
].join(', ');

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
const RESPONSE_CONTENT_SELECTOR = '.response-content';
const RESPONSE_BODY_SELECTOR = [
  'structured-content-container.model-response-text',
  '.model-response-text',
].join(', ');
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
const THINKING_DEBUG_TRACE_PREFIX = '[THINKING_DEBUG_TRACE]';
const THINKING_DEBUG_SAMPLE_MS = 400;

type TranslateResponse =
  | { ok: true; translatedText: string }
  | { ok: false; error?: string };
type ThoughtTranslationMode = 'compare' | 'replace';
type ThoughtBlockKind = 'text' | 'code';
type ThoughtBlock = {
  id: string;
  text: string;
  kind: ThoughtBlockKind;
  emphasis: ThoughtTextEmphasis;
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
type CompletedTranslationResult = {
  signature: string;
  sourceText: string;
  html: string;
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
const sourceTextByContainer = new WeakMap<HTMLElement, string>();
const pendingPayloadByContainer = new WeakMap<HTMLElement, TranslationPayload>();
const lastRequestAtByContainer = new WeakMap<HTMLElement, number>();
const retryTimerByContainer = new WeakMap<HTMLElement, number>();
const incompleteRetryStateByContainer = new WeakMap<HTMLElement, RetryState>();
const completedTranslationByContainer = new WeakMap<HTMLElement, CompletedTranslationResult>();
const processingContainerSet = new WeakSet<HTMLElement>();
const debugIdByContainer = new WeakMap<HTMLElement, number>();
let activeTranslationRequests = 0;
let nextDebugContainerId = 1;
let lastScheduledTraceAt = 0;
let suppressedScheduleTraceCount = 0;
let lastMutationTraceAt = 0;
let suppressedMutationTraceCount = 0;

const logTrace = (event: string, detail?: Record<string, unknown>): void => {
  if (!TRACE_ENABLED) return;
  debugService.log('thought-translation', event, detail);
  console.info('[GM-TRACE][ThoughtTranslation]', event, detail ?? {});
};

const emitThinkingDebugTrace = (event: string, detail: Record<string, unknown> = {}): void => {
  console.info(THINKING_DEBUG_TRACE_PREFIX, event, detail);
};

const getContainerDebugId = (container: HTMLElement): string => {
  const existing = debugIdByContainer.get(container);
  if (existing !== undefined) {
    return `thought-${existing}`;
  }

  const next = nextDebugContainerId;
  nextDebugContainerId += 1;
  debugIdByContainer.set(container, next);
  return `thought-${next}`;
};

const getContainerDebugSnapshot = (container: HTMLElement): Record<string, unknown> => {
  const layout = container.querySelector<HTMLDivElement>(`:scope > .${LAYOUT_CLASS}`);
  const originalNode = layout?.querySelector<HTMLDivElement>(`:scope > .${ORIGINAL_CLASS}`) ?? null;
  const translationNode = layout?.querySelector<HTMLDivElement>(`:scope > .${TRANSLATION_CLASS}`) ?? null;
  const directChildren = Array.from(container.children);
  const externalChildCount = directChildren.filter(
    (child) => !(child instanceof HTMLDivElement && child.classList.contains(LAYOUT_CLASS)),
  ).length;
  const translationTextLength = normalizeText(translationNode?.textContent || '').length;

  return {
    containerId: getContainerDebugId(container),
    className: container.className,
    translated: completedTranslationByContainer.has(container),
    processing: processingContainerSet.has(container),
    mode: container.getAttribute(MODE_ATTR) ?? '',
    sourceLength: (sourceTextByContainer.get(container) ?? '').length,
    hasLayout: layout instanceof HTMLDivElement,
    directChildCount: directChildren.length,
    externalChildCount,
    originalChildCount: originalNode?.children.length ?? 0,
    translationTextLength,
  };
};

const traceContainer = (
  container: HTMLElement,
  event: string,
  detail: Record<string, unknown> = {},
): void => {
  emitThinkingDebugTrace(event, {
    ...getContainerDebugSnapshot(container),
    ...detail,
  });
};

const traceScheduledProcess = (reason: string, detail: Record<string, unknown> = {}): void => {
  const now = Date.now();
  if (now - lastScheduledTraceAt < THINKING_DEBUG_SAMPLE_MS) {
    suppressedScheduleTraceCount += 1;
    return;
  }

  emitThinkingDebugTrace('process-scheduled', {
    reason,
    suppressedCount: suppressedScheduleTraceCount,
    ...detail,
  });
  suppressedScheduleTraceCount = 0;
  lastScheduledTraceAt = now;
};

const resolveTranslationMode = (value: unknown): ThoughtTranslationMode =>
  value === 'replace' ? 'replace' : 'compare';

const applyTranslationMode = (container: HTMLElement): void => {
  container.setAttribute(MODE_ATTR, translationMode);
};

const isManagedThoughtContainer = (container: HTMLElement): boolean =>
  isManagedThoughtContainerState({
    hasManagedLayout: container.querySelector(`:scope > .${LAYOUT_CLASS}`) instanceof HTMLDivElement,
    hasTranslatedAttr: container.hasAttribute(TRANSLATED_ATTR),
    hasProcessingAttr: container.hasAttribute(PROCESSING_ATTR),
    hasSourceAttr: container.hasAttribute(SOURCE_ATTR),
    hasErrorAttr: container.hasAttribute(ERROR_ATTR),
    hasModeAttr: container.hasAttribute(MODE_ATTR),
  });

const getManagedThoughtContainers = (): HTMLElement[] => {
  const containers = new Set<HTMLElement>();

  document.querySelectorAll<HTMLElement>(MANAGED_THOUGHT_NODE_SELECTOR).forEach((node) => {
    const container = node.matches(THOUGHT_ROOT_SELECTOR)
      ? node
      : node.closest<HTMLElement>(THOUGHT_ROOT_SELECTOR);
    if (!container) return;
    if (!isManagedThoughtContainer(container)) return;
    containers.add(container);
  });

  return Array.from(containers);
};

const getKnownThoughtContainers = (): HTMLElement[] => {
  const containers = new Set<HTMLElement>();
  getThoughtContainers().forEach((container) => containers.add(container));
  getManagedThoughtContainers().forEach((container) => containers.add(container));
  return Array.from(containers);
};

const hasMeaningfulResponseBodyContent = (node: HTMLElement | null): boolean => {
  if (!node) return false;
  return hasMeaningfulResponseBodyContentState({
    textLength: normalizeText(node.textContent || '').length,
    hasImageLikeContent: node.querySelector('img, video, audio, canvas') !== null,
    hasTableLikeContent: node.querySelector('table, figure') !== null,
    hasCodeLikeContent: node.querySelector('pre, code-block, .code-block') !== null,
  });
};

const findResponseBodyBlock = (container: HTMLElement): HTMLElement | null => {
  const responseContent = container.closest<HTMLElement>(RESPONSE_CONTENT_SELECTOR);
  if (responseContent) {
    const directBody = Array.from(responseContent.children).find(
      (child): child is HTMLElement =>
        child instanceof HTMLElement && child.matches(RESPONSE_BODY_SELECTOR),
    );
    if (directBody) return directBody;
  }

  const responseContainer = container.closest<HTMLElement>(
    '.response-container-content, .presented-response-container',
  );
  if (!responseContainer) return null;
  return responseContainer.querySelector<HTMLElement>(RESPONSE_BODY_SELECTOR);
};

const isThoughtTranslationDisplayReady = (
  container: HTMLElement,
  hasReadyTranslation: boolean,
): boolean => {
  return shouldDisplayThoughtTranslation({
    hasReadyTranslation,
    hasResponseBodyContent: hasMeaningfulResponseBodyContent(findResponseBodyBlock(container)),
    hasResponseCompleted: isModelResponseComplete(container),
  });
};

const hasDisplayedThoughtTranslation = (container: HTMLElement): boolean => {
  const translationNode = container.querySelector<HTMLDivElement>(
    `:scope > .${LAYOUT_CLASS} > .${TRANSLATION_CLASS}`,
  );
  if (!(translationNode instanceof HTMLDivElement)) return false;
  return normalizeText(translationNode.textContent || '').length > 0;
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
        background: #0f172a !important;
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

    .theme-host.dark-theme .${TRANSLATION_CLASS},
    html.dark .${TRANSLATION_CLASS},
    body.dark .${TRANSLATION_CLASS},
    html[data-theme='dark'] .${TRANSLATION_CLASS},
    body[data-theme='dark'] .${TRANSLATION_CLASS},
    html[data-color-scheme='dark'] .${TRANSLATION_CLASS},
    body[data-color-scheme='dark'] .${TRANSLATION_CLASS} {
      background: #0f172a !important;
      border-left-color: rgba(255, 255, 255, 0.14) !important;
    }

    .theme-host.dark-theme .${TRANSLATION_CLASS} .gm-thought-translation-code,
    html.dark .${TRANSLATION_CLASS} .gm-thought-translation-code,
    body.dark .${TRANSLATION_CLASS} .gm-thought-translation-code,
    html[data-theme='dark'] .${TRANSLATION_CLASS} .gm-thought-translation-code,
    body[data-theme='dark'] .${TRANSLATION_CLASS} .gm-thought-translation-code,
    html[data-color-scheme='dark'] .${TRANSLATION_CLASS} .gm-thought-translation-code,
    body[data-color-scheme='dark'] .${TRANSLATION_CLASS} .gm-thought-translation-code {
      background: rgba(148, 163, 184, 0.18) !important;
    }

    @media (max-width: 1100px) {
      .theme-host.dark-theme .${TRANSLATION_CLASS},
      html.dark .${TRANSLATION_CLASS},
      body.dark .${TRANSLATION_CLASS},
      html[data-theme='dark'] .${TRANSLATION_CLASS},
      body[data-theme='dark'] .${TRANSLATION_CLASS},
      html[data-color-scheme='dark'] .${TRANSLATION_CLASS},
      body[data-color-scheme='dark'] .${TRANSLATION_CLASS} {
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
  const toggleExpanded = resolveThoughtToggleExpanded(container);
  if (toggleExpanded === false) return false;

  const hasManagedLayout = container.querySelector(`:scope > .${LAYOUT_CLASS}`) instanceof HTMLDivElement;
  const computed = window.getComputedStyle(container);
  const rect = container.getBoundingClientRect();
  return isThoughtContainerActive({
    hasManagedLayout,
    hasExpandedClass: container.matches('.thoughts-content-expanded'),
    toggleExpanded,
    isAriaHidden: container.getAttribute('aria-hidden') === 'true',
    isHiddenAttr: container.hasAttribute('hidden'),
    ancestorHidden: container.closest('[aria-hidden="true"], [hidden]') !== null,
    isDisplayNone: computed.display === 'none',
    isVisibilityHidden: computed.visibility === 'hidden',
    hasGeometry: rect.width > 1 && rect.height > 1,
  });
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
  const originalSlotCandidateCount = withText.filter(
    (candidate) => candidate.closest(`.${ORIGINAL_CLASS}`) !== null,
  ).length;

  const activeCandidates = selectActiveThoughtSourceNodes(
    withText.map((candidate) => ({
      node: candidate,
      isInOriginalSlot: candidate.closest(`.${ORIGINAL_CLASS}`) !== null,
    })),
  );

  const depthPruned = activeCandidates
    .sort((left, right) => getNodeDepth(left) - getNodeDepth(right))
    .filter((candidate, _, all) => !all.some((other) => other !== candidate && other.contains(candidate)));

  const ordered = depthPruned.sort(sortByDomOrder);
  if (ordered.length > 0) {
    traceContainer(container, 'source-nodes-selected', {
      candidateCount: candidates.size,
      withTextCount: withText.length,
      originalSlotCandidateCount,
      selectedCount: ordered.length,
      selectedTextLength: ordered.reduce((sum, node) => sum + getElementText(node).length, 0),
    });
    return ordered;
  }

  const fallback = getElementText(container) ? [container] : [];
  traceContainer(container, 'source-nodes-fallback', {
    candidateCount: candidates.size,
    withTextCount: withText.length,
    originalSlotCandidateCount,
    selectedCount: fallback.length,
    selectedTextLength: fallback.reduce((sum, node) => sum + getElementText(node).length, 0),
  });
  return fallback;
};

const cloneWithoutSkippedDescendants = (element: HTMLElement): HTMLElement | null => {
  const clone = element.cloneNode(true);
  if (!(clone instanceof HTMLElement)) return null;
  clone.querySelectorAll(NON_TRANSLATABLE_DESCENDANT_SELECTOR).forEach((node) => node.remove());
  return clone;
};

const getTextWithoutSkippedDescendants = (element: HTMLElement): string => {
  const clone = cloneWithoutSkippedDescendants(element);
  if (!(clone instanceof HTMLElement)) return '';
  return normalizeText(clone.textContent || '');
};

const getTextBlockEmphasis = (element: HTMLElement): ThoughtTextEmphasis => {
  const clone = cloneWithoutSkippedDescendants(element);
  if (!(clone instanceof HTMLElement)) return 'normal';

  const fullText = normalizeText(clone.textContent || '');
  const strongText = normalizeText(
    Array.from(clone.querySelectorAll('strong, b'))
      .map((node) => node.textContent || '')
      .join(' '),
  );
  const outsideClone = clone.cloneNode(true);
  if (!(outsideClone instanceof HTMLElement)) return 'normal';
  outsideClone.querySelectorAll('strong, b').forEach((node) => node.remove());
  const textOutsideStrong = normalizeText(outsideClone.textContent || '');

  return resolveThoughtTextEmphasis({
    fullTextLength: fullText.length,
    strongTextLength: strongText.length,
    textOutsideStrongLength: textOutsideStrong.length,
  });
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
  emphasis: ThoughtTextEmphasis = 'normal',
): number => {
  const text =
    kind === 'code' ? normalizeCodeText(rawText) : normalizeThoughtSourceTextBlock(rawText);
  if (!text) return blockIndex;
  blocks.push({
    id: `node-${nodeIndex}-block-${blockIndex}`,
    text,
    kind,
    emphasis: kind === 'code' ? 'normal' : emphasis,
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

  return appendBlock(
    blocks,
    nodeIndex,
    blockIndex,
    getTextWithoutSkippedDescendants(element),
    'text',
    getTextBlockEmphasis(element),
  );
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
  return [
    {
      id: `node-${nodeIndex}-block-fallback`,
      text: fallback,
      kind: 'text',
      emphasis: getTextBlockEmphasis(sourceNode),
    },
  ];
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
      const paragraphHtml = escapeHtml(paragraph).replace(/\n/g, '<br>');
      if (sourceBlock.emphasis === 'strong') {
        return `<p><strong>${paragraphHtml}</strong></p>`;
      }
      return `<p>${paragraphHtml}</p>`;
    })
    .join('');

  return `<div class="gm-thought-translation-content markdown markdown-main-panel">${html}</div>`;
};

const resolveTopLevelSourceAnchor = (
  container: HTMLElement,
  sourceNodes: HTMLElement[],
): HTMLElement | null =>
  sourceNodes.reduce<HTMLElement | null>((resolved, sourceNode) => {
    if (resolved) return resolved;
    if (sourceNode === container) return null;

    let current: HTMLElement | null = sourceNode;
    while (current && current.parentElement !== container) {
      current = current.parentElement;
    }
    return current?.parentElement === container ? current : null;
  }, null);

const ensureTranslationLayout = (
  container: HTMLElement,
  sourceNodes: HTMLElement[],
  initialTranslationHtml?: string,
): { originalNode: HTMLDivElement; translationNode: HTMLDivElement } => {
  applyTranslationMode(container);
  let layout = container.querySelector<HTMLDivElement>(`:scope > .${LAYOUT_CLASS}`);
  let originalNode = layout?.querySelector<HTMLDivElement>(`:scope > .${ORIGINAL_CLASS}`) ?? null;
  let translationNode = layout?.querySelector<HTMLDivElement>(`:scope > .${TRANSLATION_CLASS}`) ?? null;
  const hadLayout = layout instanceof HTMLDivElement;
  const hadOriginalNode = originalNode instanceof HTMLDivElement;
  const hadTranslationNode = translationNode instanceof HTMLDivElement;

  const incomingSourceNodes = sourceNodes.filter((node) => {
    if (!(node instanceof HTMLElement)) return false;
    if (node === container) return false;
    if (!container.contains(node)) return false;
    if (node.closest(`.${TRANSLATION_CLASS}`)) return false;
    return node.closest(`.${ORIGINAL_CLASS}`) === null;
  });
  const insertionMode = resolveThoughtLayoutInsertionMode({
    hasExistingLayout: hadLayout,
    hasIncomingSourceNodes: incomingSourceNodes.length > 0,
  });
  const anchorNode =
    insertionMode === 'before-first-source'
      ? resolveTopLevelSourceAnchor(container, incomingSourceNodes)
      : null;

  if (!(layout instanceof HTMLDivElement)) {
    layout = document.createElement('div');
    layout.className = LAYOUT_CLASS;

    originalNode = document.createElement('div');
    originalNode.className = ORIGINAL_CLASS;
    layout.appendChild(originalNode);

    translationNode = document.createElement('div');
    translationNode.className = TRANSLATION_CLASS;
    if (typeof initialTranslationHtml === 'string') {
      translationNode.innerHTML = initialTranslationHtml;
    }
    layout.appendChild(translationNode);

    if (incomingSourceNodes.length > 0) {
      originalNode.replaceChildren(...incomingSourceNodes);
    } else {
      sourceNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (node === container) return;
        if (!container.contains(node)) return;
        if (node.closest(`.${TRANSLATION_CLASS}`)) return;
        if (node.parentElement === originalNode) return;
        originalNode.appendChild(node);
      });
    }

    if (anchorNode) {
      container.insertBefore(layout, anchorNode);
    } else {
      container.appendChild(layout);
    }
  }

  if (!(originalNode instanceof HTMLDivElement)) {
    originalNode = document.createElement('div');
    originalNode.className = ORIGINAL_CLASS;
    layout.appendChild(originalNode);
  }

  if (incomingSourceNodes.length > 0) {
    originalNode.replaceChildren(...incomingSourceNodes);
  } else {
    sourceNodes.forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      if (node === container) return;
      if (!container.contains(node)) return;
      if (node.closest(`.${TRANSLATION_CLASS}`)) return;
      if (node.parentElement === originalNode) return;
      originalNode.appendChild(node);
    });
  }

  if (!(translationNode instanceof HTMLDivElement)) {
    translationNode = document.createElement('div');
    translationNode.className = TRANSLATION_CLASS;
    layout.appendChild(translationNode);
  }

  if (typeof initialTranslationHtml === 'string') {
    translationNode.innerHTML = initialTranslationHtml;
  }

  traceContainer(container, 'layout-synced', {
    sourceNodeCount: sourceNodes.length,
    incomingSourceNodeCount: incomingSourceNodes.length,
    insertionMode,
    hadLayout,
    hadOriginalNode,
    hadTranslationNode,
    originalChildCountAfterSync: originalNode.children.length,
    translationChildCountAfterSync: translationNode.children.length,
  });

  return { originalNode, translationNode };
};

const hideThoughtTranslationUntilReady = (container: HTMLElement): void => {
  if (!(container.querySelector(`:scope > .${LAYOUT_CLASS}`) instanceof HTMLDivElement)) return;
  traceContainer(container, 'translation-hidden-until-ready', {
    hasReadyTranslation: completedTranslationByContainer.has(container),
  });
  restoreOriginalThoughtLayout(container);
};

const showCompletedThoughtTranslation = (
  container: HTMLElement,
  payload: TranslationPayload,
  completed: CompletedTranslationResult,
): void => {
  const { translationNode } = ensureTranslationLayout(
    container,
    payload.sourceNodes,
    completed.html,
  );
  translationNode.removeAttribute(ERROR_ATTR);
  container.removeAttribute(ERROR_ATTR);
  container.setAttribute(TRANSLATED_ATTR, '1');
  traceContainer(container, 'translation-displayed', {
    blockCount: payload.blocks.length,
    sourceLength: payload.sourceText.length,
  });
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
  traceContainer(container, 'layout-restored');
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
  const effectiveDelayMs = Math.max(30, delayMs);
  traceContainer(container, 'retry-scheduled', { delayMs: effectiveDelayMs });
  const timerId = window.setTimeout(() => {
    retryTimerByContainer.delete(container);
    scheduleProcess('retry-timer', { containerId: getContainerDebugId(container), delayMs: effectiveDelayMs });
  }, effectiveDelayMs);
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
  processingContainerSet.delete(container);
  sourceTextByContainer.delete(container);
  pendingPayloadByContainer.delete(container);
  completedTranslationByContainer.delete(container);
  container.removeAttribute(TRANSLATED_ATTR);
  container.removeAttribute(PROCESSING_ATTR);
  container.removeAttribute(SOURCE_ATTR);
  container.removeAttribute(ERROR_ATTR);
  traceContainer(container, 'container-state-reset');
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

    const translatedPart = normalizeText(sanitizeThoughtTranslationArtifacts(response.translatedText));
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

const buildTranslationHtml = (
  sourceBlocks: ThoughtBlock[],
  translatedBlocks: Array<string | null>,
): string => buildCompareHtmlFromBlocks(sourceBlocks, translatedBlocks);

const translatePayloadByBlocks = async (
  container: HTMLElement,
  payload: TranslationPayload,
  version: number,
): Promise<{ incompleteCount: number; html: string }> => {
  const sourceBlocks = payload.blocks;
  const translatedBlocks: Array<string | null> = sourceBlocks.map((block) =>
    block.kind === 'code' ? block.text : null,
  );

  const textBlockIndexes = sourceBlocks
    .map((block, index) => (block.kind === 'text' ? index : -1))
    .filter((index) => index >= 0);
  if (textBlockIndexes.length === 0) {
    return { incompleteCount: 0, html: buildTranslationHtml(sourceBlocks, translatedBlocks) };
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
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  if (getContainerVersion(container) !== version) {
    return {
      incompleteCount: textBlockIndexes.length,
      html: buildTranslationHtml(sourceBlocks, translatedBlocks),
    };
  }

  return {
    incompleteCount,
    html: buildTranslationHtml(sourceBlocks, translatedBlocks),
  };
};

const runTranslationForContainer = (container: HTMLElement, payload: TranslationPayload): void => {
  const now = Date.now();
  const version = bumpContainerVersion(container);
  const preserveDisplayedTranslation = !shouldHideThoughtTranslationDuringRefresh({
    hasDisplayedTranslation: hasDisplayedThoughtTranslation(container),
    isDisplayReady: isThoughtTranslationDisplayReady(container, true),
  });
  pendingPayloadByContainer.delete(container);
  completedTranslationByContainer.delete(container);
  sourceTextByContainer.set(container, payload.sourceText);
  processingContainerSet.add(container);
  lastRequestAtByContainer.set(container, now);
  activeTranslationRequests += 1;

  if (preserveDisplayedTranslation) {
    traceContainer(container, 'translation-refresh-preserved-display', {
      version,
      sourceNodeCount: payload.sourceNodes.length,
      blockCount: payload.blocks.length,
      sourceLength: payload.sourceText.length,
    });
  } else {
    hideThoughtTranslationUntilReady(container);
  }
  traceContainer(container, 'translation-started', {
    version,
    sourceNodeCount: payload.sourceNodes.length,
    blockCount: payload.blocks.length,
    sourceLength: payload.sourceText.length,
    activeTranslationRequests,
    preserveDisplayedTranslation,
  });

  void translatePayloadByBlocks(container, payload, version)
    .then((result) => {
      if (getContainerVersion(container) !== version) return;

      if (result.incompleteCount > 0) {
        pendingPayloadByContainer.set(container, payload);
        scheduleIncompleteRetry(container, payload);
        logTrace('thought-translation-incomplete', {
          incompleteCount: result.incompleteCount,
          blockCount: payload.blocks.length,
        });
        traceContainer(container, 'translation-incomplete', {
          version,
          incompleteCount: result.incompleteCount,
          blockCount: payload.blocks.length,
        });
        return;
      }

      const completed = {
        signature: payload.signature,
        sourceText: payload.sourceText,
        html: result.html,
      };
      completedTranslationByContainer.set(container, completed);
      clearIncompleteRetryState(container);
      if (isThoughtTranslationDisplayReady(container, true)) {
        showCompletedThoughtTranslation(container, payload, completed);
      } else {
        traceContainer(container, 'translation-ready-waiting-for-complete', {
          version,
          blockCount: payload.blocks.length,
          sourceLength: payload.sourceText.length,
        });
      }
      logTrace('thought-translation-completed', {
        blockCount: payload.blocks.length,
        sourceLength: payload.sourceText.length,
      });
      traceContainer(container, 'translation-completed', {
        version,
        blockCount: payload.blocks.length,
        sourceLength: payload.sourceText.length,
      });
    })
    .catch((error: unknown) => {
      if (getContainerVersion(container) !== version) return;
      pendingPayloadByContainer.set(container, payload);
      scheduleIncompleteRetry(container, payload);
      logTrace('thought-translation-failed', { error: String(error) });
      traceContainer(container, 'translation-failed', {
        version,
        error: String(error),
      });
    })
    .finally(() => {
      activeTranslationRequests = Math.max(0, activeTranslationRequests - 1);
      processingContainerSet.delete(container);
      scheduleProcess('translation-finished', {
        containerId: getContainerDebugId(container),
        version,
        activeTranslationRequests,
      });
    });
};

const removeAllTranslations = (): void => {
  getKnownThoughtContainers().forEach((container) => {
    if (!isManagedThoughtContainer(container)) return;
    restoreOriginalThoughtLayout(container);
    resetContainerState(container);
    container.removeAttribute(MODE_ATTR);
  });
};

const processContainer = (container: HTMLElement): void => {
  const payload = getSourcePayload(container);
  if (!payload) {
    traceContainer(container, 'process-no-payload');
    return;
  }

  const previousRetryState = incompleteRetryStateByContainer.get(container);
  if (previousRetryState && previousRetryState.signature !== payload.signature) {
    clearIncompleteRetryState(container);
  }

  const prevSource = sourceTextByContainer.get(container) ?? '';
  const isProcessing = processingContainerSet.has(container);
  const now = Date.now();

  const sameAsCurrentSource = prevSource === payload.sourceText;
  const hasPendingPayload = pendingPayloadByContainer.has(container);
  const hasIncompleteRetry =
    incompleteRetryStateByContainer.get(container)?.signature === payload.signature;
  let completed = completedTranslationByContainer.get(container);

  if (completed && completed.signature !== payload.signature) {
    completedTranslationByContainer.delete(container);
    completed = undefined;
  }

  const hasReadyTranslation = completed?.signature === payload.signature;
  const displayReady = isThoughtTranslationDisplayReady(container, hasReadyTranslation);

  if (hasReadyTranslation) {
    if (displayReady) {
      showCompletedThoughtTranslation(container, payload, completed);
      traceContainer(container, 'process-skip-ready-translation', {
        blockCount: payload.blocks.length,
        sourceLength: payload.sourceText.length,
      });
    } else {
      hideThoughtTranslationUntilReady(container);
      traceContainer(container, 'process-wait-display-complete', {
        blockCount: payload.blocks.length,
        sourceLength: payload.sourceText.length,
      });
    }

    if (!isProcessing && !hasPendingPayload && !hasIncompleteRetry) {
      return;
    }
  }

  if (
    hasReadyTranslation &&
    !isProcessing &&
    sameAsCurrentSource &&
    !hasPendingPayload &&
    !hasIncompleteRetry
  ) {
    traceContainer(container, 'process-skip-same-source', {
      blockCount: payload.blocks.length,
      sourceLength: payload.sourceText.length,
    });
    return;
  }

  if (isProcessing) {
    if (!sameAsCurrentSource) {
      pendingPayloadByContainer.set(container, payload);
    }
    traceContainer(container, 'process-pending-while-processing', {
      sameAsCurrentSource,
      blockCount: payload.blocks.length,
      sourceLength: payload.sourceText.length,
    });
    return;
  }

  if (activeTranslationRequests >= MAX_CONCURRENT_TRANSLATIONS) {
    pendingPayloadByContainer.set(container, payload);
    traceContainer(container, 'process-queued-concurrency', {
      activeTranslationRequests,
      blockCount: payload.blocks.length,
      sourceLength: payload.sourceText.length,
    });
    return;
  }

  const lastRequestAt = lastRequestAtByContainer.get(container) ?? 0;
  if (prevSource && !sameAsCurrentSource && now - lastRequestAt < MIN_REQUEST_INTERVAL_MS) {
    pendingPayloadByContainer.set(container, payload);
    const delayMs = MIN_REQUEST_INTERVAL_MS - (now - lastRequestAt);
    traceContainer(container, 'process-throttled', {
      blockCount: payload.blocks.length,
      sourceLength: payload.sourceText.length,
      delayMs,
    });
    scheduleContainerRetry(container, delayMs);
    return;
  }

  traceContainer(container, 'process-run-translation', {
    blockCount: payload.blocks.length,
    sourceLength: payload.sourceText.length,
    sameAsCurrentSource,
  });
  runTranslationForContainer(container, payload);
};

const processThoughts = (): void => {
  if (!enabled) {
    removeAllTranslations();
    return;
  }

  const containers = getThoughtContainers();
  const managedContainers = getManagedThoughtContainers();
  logTrace('thought-container-scan', { count: containers.length });
  emitThinkingDebugTrace('container-scan', {
    count: containers.length,
    containerIds: containers.slice(0, 6).map((container) => getContainerDebugId(container)),
    managedCount: managedContainers.length,
    managedContainerIds: managedContainers.slice(0, 6).map((container) => getContainerDebugId(container)),
  });

  selectThoughtContainersForCleanup(
    managedContainers.map((container) => ({
      container,
      isActive: containers.includes(container),
      isManaged: true,
    })),
  ).forEach((container) => {
    traceContainer(container, 'process-cleanup-stale-container');
    restoreOriginalThoughtLayout(container);
    resetContainerState(container);
    container.removeAttribute(MODE_ATTR);
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
      return (
        isNodeInThoughtTree(mutation.target) ||
        isNodeInModelResponseLifecycle(mutation.target)
      );
    }

    if (mutation.type === 'characterData') {
      if (isNodeInTranslationBlock(mutation.target)) return false;
      return (
        isNodeInExpandedThoughtTree(mutation.target) ||
        isNodeInModelResponseLifecycle(mutation.target)
      );
    }

    if (isNodeInTranslationBlock(mutation.target)) return false;
    if (isNodeInExpandedThoughtTree(mutation.target)) return true;
    if (isNodeInModelResponseLifecycle(mutation.target)) return true;

    for (const node of Array.from(mutation.addedNodes)) {
      if (isNodeInTranslationBlock(node)) continue;
      if (isNodeInExpandedThoughtTree(node)) return true;
      if (isNodeInModelResponseLifecycle(node)) return true;
    }

    for (const node of Array.from(mutation.removedNodes)) {
      if (isNodeInTranslationBlock(node)) continue;
      if (isNodeInExpandedThoughtTree(node)) return true;
      if (isNodeInModelResponseLifecycle(node)) return true;
    }

    return false;
  });

const traceMutationBatch = (mutations: MutationRecord[]): void => {
  const now = Date.now();
  if (now - lastMutationTraceAt < THINKING_DEBUG_SAMPLE_MS) {
    suppressedMutationTraceCount += 1;
    return;
  }

  const containerIds = new Set<string>();
  const mutationTypes = new Set<string>();
  mutations.forEach((mutation) => {
    mutationTypes.add(mutation.type);
    const container = getClosestThoughtContainer(mutation.target);
    if (container) {
      containerIds.add(getContainerDebugId(container));
    }
  });

  emitThinkingDebugTrace('mutation-batch', {
    mutationCount: mutations.length,
    mutationTypes: Array.from(mutationTypes),
    containerIds: Array.from(containerIds).slice(0, 6),
    suppressedCount: suppressedMutationTraceCount,
  });
  suppressedMutationTraceCount = 0;
  lastMutationTraceAt = now;
};

const scheduleProcess = (
  reason = 'unspecified',
  detail: Record<string, unknown> = {},
): void => {
  if (!enabled) {
    removeAllTranslations();
    return;
  }

  traceScheduledProcess(reason, {
    hasDebounceTimer: debounceTimer !== null,
    ...detail,
  });
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
      emitThinkingDebugTrace('warmup-pass', { delayMs: delay });
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
  getKnownThoughtContainers().forEach((container) => {
    bumpContainerVersion(container);
    processingContainerSet.delete(container);
    completedTranslationByContainer.delete(container);
    sourceTextByContainer.delete(container);
    restoreOriginalThoughtLayout(container);
    container.removeAttribute(MODE_ATTR);
  });
  scheduleProcess('storage-mode-change');
};

export function startThoughtTranslation(): void {
  enabled = true;
  ensureStyle();
  chrome.storage.local.get([StorageKeys.THOUGHT_TRANSLATION_MODE], (result) => {
    translationMode = resolveTranslationMode(result[StorageKeys.THOUGHT_TRANSLATION_MODE]);
    scheduleProcess('startup-storage-sync');
  });

  chrome.storage.onChanged.removeListener(handleStorageChanged);
  chrome.storage.onChanged.addListener(handleStorageChanged);

  if (!observer && document.body) {
    observer = new MutationObserver((mutations) => {
      if (!hasRelevantThoughtMutations(mutations)) return;
      traceMutationBatch(mutations);
      scheduleProcess('mutation-observer', { mutationCount: mutations.length });
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

  scheduleProcess('start-thought-translation');
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

  getKnownThoughtContainers().forEach((container) => {
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
