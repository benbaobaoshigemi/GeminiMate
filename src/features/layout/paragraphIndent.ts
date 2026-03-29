import { StorageKeys } from '@/core/types/common';
import {
  MODEL_RESPONSE_ROOT_SELECTOR,
  cancelWaitForModelResponsesComplete,
  createResponseCompletionWaitState,
  isAnyModelResponseStreaming,
  isModelResponseComplete,
  isNodeInModelResponse,
  isNodeInThoughtTree,
  waitForModelResponsesComplete,
} from '@/core/utils/responseLifecycle';

const STYLE_ID = 'geminimate-paragraph-indent-style';
const INDENT_CLASS = 'gm-first-line-indent';
const GAP_CLASS = 'gm-paragraph-block-gap';
const MARK_ATTR = 'data-gm-indent-applied';
const DEFAULT_ENABLED = false;
const DEFAULT_PARAGRAPH_BLOCK_GAP_EM = 0;
const MIN_PARAGRAPH_BLOCK_GAP_EM = 0;
const MAX_PARAGRAPH_BLOCK_GAP_EM = 1.2;

const DATA_PATH_PARAGRAPH_SELECTOR = 'p[data-path-to-node]';
const DATA_PATH_BLOCK_SELECTOR = '[data-path-to-node]';

const SKIP_ANCESTOR_SELECTOR = [
  'li',
  'ul',
  'ol',
  'table',
  'blockquote',
  'pre',
  'code',
  '.code-block',
  'code-block',
  '.gm-mermaid-diagram',
  '[data-gm-mermaid-host="1"]',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'model-thoughts',
  '.thoughts-container',
  '.thoughts-content',
  '.thoughts-content-expanded',
  '.thoughts-streaming',
  '[data-test-id*="thought"]',
].join(', ');

let started = false;
let enabled = DEFAULT_ENABLED;
let paragraphBlockGapEm = DEFAULT_PARAGRAPH_BLOCK_GAP_EM;
let observer: MutationObserver | null = null;
let applyTimer: number | null = null;
const responseCompletionWaitState = createResponseCompletionWaitState();
let storageChangeListener:
  | ((changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => void)
  | null = null;

function clampParagraphBlockGapEm(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_PARAGRAPH_BLOCK_GAP_EM;
  const clamped = Math.max(MIN_PARAGRAPH_BLOCK_GAP_EM, Math.min(MAX_PARAGRAPH_BLOCK_GAP_EM, numeric));
  return Math.round(clamped * 100) / 100;
}

function ensureStyle(): HTMLStyleElement {
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  return style;
}

function renderIndentStyle(): void {
  const style = ensureStyle();
  const paragraphGap = `${paragraphBlockGapEm.toFixed(2)}em`;
  style.textContent = `
    .${INDENT_CLASS} {
      text-indent: 2em !important;
    }

    .${GAP_CLASS} {
      margin-block-start: 0 !important;
      margin-block-end: 0 !important;
    }

    .${GAP_CLASS} + .${GAP_CLASS} {
      margin-block-start: ${paragraphGap} !important;
    }
  `;
}

function clearApplyTimer(): void {
  if (applyTimer === null) return;
  clearTimeout(applyTimer);
  applyTimer = null;
}

function removeIndentMark(el: Element): void {
  if (!(el instanceof HTMLElement)) return;

  el.classList.remove(INDENT_CLASS);
  el.classList.remove(GAP_CLASS);
  el.removeAttribute(MARK_ATTR);
}

function rollbackAll(): void {
  document.querySelectorAll(`[${MARK_ATTR}]`).forEach((el) => removeIndentMark(el));
}

function shouldSkipBlock(el: HTMLElement): boolean {
  if (isNodeInThoughtTree(el)) return true;
  return el.closest(SKIP_ANCESTOR_SELECTOR) !== null;
}

function shouldIndentText(raw: string): boolean {
  return raw.replace(/\u00a0/g, ' ').trim().length > 0;
}

function collectCompletedCandidates(): HTMLElement[] {
  const responseRoots = Array.from(document.querySelectorAll<HTMLElement>(MODEL_RESPONSE_ROOT_SELECTOR))
    .filter((node) => !isNodeInThoughtTree(node))
    .filter((node) => isModelResponseComplete(node));
  const candidates = new Set<HTMLElement>();

  responseRoots.forEach((root) => {
    root.querySelectorAll<HTMLElement>(DATA_PATH_PARAGRAPH_SELECTOR).forEach((node) => {
      if (isNodeInThoughtTree(node)) return;
      candidates.add(node);
    });
  });

  return Array.from(candidates);
}

function applyIndentAll(): void {
  const shouldApplyGap = paragraphBlockGapEm > 0;
  if (!enabled && !shouldApplyGap) {
    rollbackAll();
    return;
  }

  const completedCandidates = collectCompletedCandidates();
  const candidateSet = new Set<HTMLElement>(completedCandidates);

  document.querySelectorAll(`[${MARK_ATTR}]`).forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    if (candidateSet.has(node)) return;
    removeIndentMark(node);
  });

  completedCandidates.forEach((node) => {
    if (shouldSkipBlock(node)) {
      removeIndentMark(node);
      return;
    }

    if (!shouldIndentText(node.innerText || node.textContent || '')) {
      removeIndentMark(node);
      return;
    }

    if (enabled) {
      node.classList.add(INDENT_CLASS);
    } else {
      node.classList.remove(INDENT_CLASS);
    }

    if (shouldApplyGap) {
      node.classList.add(GAP_CLASS);
    } else {
      node.classList.remove(GAP_CLASS);
    }

    if (node.classList.contains(INDENT_CLASS) || node.classList.contains(GAP_CLASS)) {
      node.setAttribute(MARK_ATTR, '1');
    } else {
      node.removeAttribute(MARK_ATTR);
    }
  });
}

function scheduleApply(): void {
  clearApplyTimer();
  applyTimer = window.setTimeout(() => {
    applyTimer = null;
    applyIndentAll();
  }, 180);
}

function scheduleApplyAfterStreamingCompletes(): void {
  waitForModelResponsesComplete(responseCompletionWaitState, () => {
    scheduleApply();
  });
}

function isRelevantMutationNode(node: Node): boolean {
  const element = node instanceof Element ? node : node.parentElement;
  if (!element) return false;
  if (isNodeInThoughtTree(element)) return false;
  if (element.closest(DATA_PATH_PARAGRAPH_SELECTOR) !== null) return true;
  if (isNodeInModelResponse(element)) return true;
  return element.querySelector(DATA_PATH_BLOCK_SELECTOR) !== null;
}

function hasRelevantMutations(mutations: MutationRecord[]): boolean {
  return mutations.some((mutation) => {
    if (mutation.type === 'characterData') {
      return isRelevantMutationNode(mutation.target);
    }

    if (isRelevantMutationNode(mutation.target)) {
      return true;
    }

    for (const node of Array.from(mutation.addedNodes)) {
      if (isRelevantMutationNode(node)) return true;
    }

    return false;
  });
}

function setupObserver(): void {
  if (observer || !document.body) return;

  observer = new MutationObserver((mutations) => {
    if ((!enabled && paragraphBlockGapEm <= 0) || mutations.length === 0) return;
    if (!hasRelevantMutations(mutations)) return;

    if (isAnyModelResponseStreaming()) {
      scheduleApplyAfterStreamingCompletes();
      return;
    }

    scheduleApply();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'hidden', 'aria-hidden'],
  });
}

export function startParagraphIndentAdjuster(): void {
  if (started) return;
  started = true;

  renderIndentStyle();

  chrome.storage.local.get(
    [StorageKeys.GEMINI_PARAGRAPH_INDENT_ENABLED, StorageKeys.GEMINI_PARAGRAPH_BLOCK_GAP_EM],
    (res) => {
      paragraphBlockGapEm = clampParagraphBlockGapEm(res[StorageKeys.GEMINI_PARAGRAPH_BLOCK_GAP_EM]);
      renderIndentStyle();
      enabled = res[StorageKeys.GEMINI_PARAGRAPH_INDENT_ENABLED] === true;
      if (!enabled && paragraphBlockGapEm <= 0) {
        rollbackAll();
        return;
      }

      if (isAnyModelResponseStreaming()) {
        scheduleApplyAfterStreamingCompletes();
        return;
      }
      scheduleApply();
    },
  );

  storageChangeListener = (changes, area) => {
    if (area !== 'local') return;
    if (changes[StorageKeys.GEMINI_PARAGRAPH_BLOCK_GAP_EM]) {
      paragraphBlockGapEm = clampParagraphBlockGapEm(changes[StorageKeys.GEMINI_PARAGRAPH_BLOCK_GAP_EM].newValue);
      renderIndentStyle();
      if (isAnyModelResponseStreaming()) {
        scheduleApplyAfterStreamingCompletes();
      } else {
        scheduleApply();
      }
    }
    if (!changes[StorageKeys.GEMINI_PARAGRAPH_INDENT_ENABLED]) return;
    enabled = changes[StorageKeys.GEMINI_PARAGRAPH_INDENT_ENABLED].newValue === true;
    if (!enabled && paragraphBlockGapEm <= 0) {
      clearApplyTimer();
      cancelWaitForModelResponsesComplete(responseCompletionWaitState);
      rollbackAll();
      return;
    }

    if (isAnyModelResponseStreaming()) {
      scheduleApplyAfterStreamingCompletes();
      return;
    }
    scheduleApply();
  };
  chrome.storage.onChanged.addListener(storageChangeListener);

  if (document.body) {
    setupObserver();
  } else {
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        setupObserver();
        if (!enabled && paragraphBlockGapEm <= 0) return;
        if (isAnyModelResponseStreaming()) {
          scheduleApplyAfterStreamingCompletes();
          return;
        }
        scheduleApply();
      },
      { once: true },
    );
  }

  window.addEventListener(
    'beforeunload',
    () => {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (storageChangeListener) {
        chrome.storage.onChanged.removeListener(storageChangeListener);
        storageChangeListener = null;
      }
      clearApplyTimer();
      cancelWaitForModelResponsesComplete(responseCompletionWaitState);
      rollbackAll();
      document.getElementById(STYLE_ID)?.remove();
      started = false;
    },
    { once: true },
  );
}
