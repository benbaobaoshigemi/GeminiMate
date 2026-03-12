import { StorageKeys } from '@/core/types/common';
import {
  isAnyModelResponseStreaming,
  isNodeInModelResponse,
  isNodeInThoughtTree,
} from '@/core/utils/responseLifecycle';

const STYLE_ID = 'geminimate-paragraph-indent-style';
const INDENT_CLASS = 'gm-first-line-indent';
const MARK_ATTR = 'data-gm-indent-applied';
const NORMALIZED_ATTR = 'data-gm-indent-normalized';
const ORIGINAL_TEXT_ATTR = 'data-gm-indent-original-text';
const BODY_LINE_CLASS = 'gm-indent-body-line';
const DEFAULT_ENABLED = false;

const CANDIDATE_SELECTOR = [
  'model-response message-content p',
  '.model-response message-content p',
  '[data-message-author-role="model"] message-content p',
  '[aria-label="Gemini response"] message-content p',
  'model-response .markdown p',
  '.model-response .markdown p',
  '[data-message-author-role="model"] .markdown p',
  '[aria-label="Gemini response"] .markdown p',
  'model-response .markdown-main-panel p',
  '.model-response .markdown-main-panel p',
  '[data-message-author-role="model"] .markdown-main-panel p',
  '[aria-label="Gemini response"] .markdown-main-panel p',
].join(', ');

const SECTION_HEADING_RE =
  /^(?:\u7b2c\s*[\u4e00-\u9fff\d]+\s*[\u7ae0\u8282\u90e8\u5206\u8bb2]|[\u4e00-\u9fff]+\s*[\u3001.\)\uff09])\s*/;
const ENUMERATED_LIST_HEADING_RE = /^\d+\s*[\u3001.\)\uff09]\s*$/;

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
let observer: MutationObserver | null = null;
let applyTimer: number | null = null;
let streamCompletionTimer: number | null = null;
let pendingApplyAfterStreaming = false;
let storageChangeListener:
  | ((changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => void)
  | null = null;

function ensureStyle(): void {
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (style) return;
  style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .${INDENT_CLASS} {
      text-indent: 2em !important;
    }

    .${BODY_LINE_CLASS} {
      display: block !important;
      text-indent: 2em !important;
    }
  `;
  document.head.appendChild(style);
}

function clearApplyTimer(): void {
  if (applyTimer === null) return;
  clearTimeout(applyTimer);
  applyTimer = null;
}

function clearStreamCompletionTimer(): void {
  if (streamCompletionTimer === null) return;
  clearTimeout(streamCompletionTimer);
  streamCompletionTimer = null;
}

function removeIndentMark(el: Element): void {
  if (!(el instanceof HTMLElement)) return;

  const originalText = el.getAttribute(ORIGINAL_TEXT_ATTR);
  if (originalText !== null) {
    el.textContent = originalText;
    el.removeAttribute(ORIGINAL_TEXT_ATTR);
    el.removeAttribute(NORMALIZED_ATTR);
  }

  el.classList.remove(INDENT_CLASS);
  el.removeAttribute(MARK_ATTR);
}

function rollbackAll(): void {
  document.querySelectorAll(`[${MARK_ATTR}], [${NORMALIZED_ATTR}]`).forEach((el) => removeIndentMark(el));
}

function shouldSkipBlock(el: HTMLElement): boolean {
  if (isNodeInThoughtTree(el)) return true;
  return el.closest(SKIP_ANCESTOR_SELECTOR) !== null;
}

function isEnumeratedListHeading(text: string): boolean {
  return ENUMERATED_LIST_HEADING_RE.test(text.trim());
}

function shouldIndentText(raw: string): boolean {
  return raw.replace(/\u00a0/g, ' ').trim().length > 0;
}

function normalizeMergedHeadingParagraph(el: HTMLElement): void {
  if (el.getAttribute(NORMALIZED_ATTR) === '1') return;
  if (shouldSkipBlock(el)) return;
  if (el.children.length > 0) return;

  const raw = (el.textContent || '').replace(/\r/g, '');
  if (!raw.includes('\n')) return;

  const [firstLine, ...restLines] = raw.split('\n');
  const heading = firstLine.trim();
  const body = restLines.join('\n').trim();

  if (!heading || !body) return;
  if (isEnumeratedListHeading(heading)) return;
  if (!SECTION_HEADING_RE.test(heading)) return;
  if (!shouldIndentText(body)) return;

  el.setAttribute(ORIGINAL_TEXT_ATTR, raw);
  el.setAttribute(NORMALIZED_ATTR, '1');
  el.textContent = '';
  el.appendChild(document.createTextNode(heading));

  const bodyLine = document.createElement('span');
  bodyLine.className = BODY_LINE_CLASS;
  bodyLine.textContent = body;
  el.appendChild(bodyLine);
}

function isParagraphLikeCandidate(el: HTMLElement): boolean {
  const tag = el.tagName.toUpperCase();
  if (tag === 'P') return true;
  if (tag !== 'DIV') return false;

  const style = window.getComputedStyle(el);
  if (style.display !== 'block') return false;

  const children = Array.from(el.children) as HTMLElement[];
  if (children.length === 0) return true;

  return children.every((child) => {
    const childTag = child.tagName.toUpperCase();
    if (childTag === 'BR') return true;
    if (
      ['B', 'STRONG', 'SPAN', 'A', 'EM', 'I', 'U', 'CODE', 'MARK', 'SMALL', 'SUB', 'SUP'].includes(
        childTag,
      )
    ) {
      return true;
    }

    const childDisplay = window.getComputedStyle(child).display;
    return childDisplay === 'inline' || childDisplay === 'inline-block' || childDisplay === 'contents';
  });
}

function applyIndentAll(): void {
  if (!enabled) {
    rollbackAll();
    return;
  }

  const candidates = Array.from(document.querySelectorAll<HTMLElement>(CANDIDATE_SELECTOR))
    .filter((node) => !isNodeInThoughtTree(node));
  const candidateSet = new Set<HTMLElement>(candidates);

  candidates.forEach((node) => {
    normalizeMergedHeadingParagraph(node);
  });

  document.querySelectorAll(`[${MARK_ATTR}], [${NORMALIZED_ATTR}]`).forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    if (candidateSet.has(node)) return;
    removeIndentMark(node);
  });

  candidates.forEach((node) => {
    if (!isParagraphLikeCandidate(node)) {
      removeIndentMark(node);
      return;
    }

    if (shouldSkipBlock(node)) {
      removeIndentMark(node);
      return;
    }

    if (node.getAttribute(NORMALIZED_ATTR) === '1') {
      node.classList.add(INDENT_CLASS);
      node.setAttribute(MARK_ATTR, '1');
      return;
    }

    if (!shouldIndentText(node.innerText || node.textContent || '')) {
      removeIndentMark(node);
      return;
    }

    node.classList.add(INDENT_CLASS);
    node.setAttribute(MARK_ATTR, '1');
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
  pendingApplyAfterStreaming = true;
  if (streamCompletionTimer !== null) return;
  streamCompletionTimer = window.setTimeout(() => {
    streamCompletionTimer = null;
    if (!pendingApplyAfterStreaming) return;
    if (isAnyModelResponseStreaming()) {
      scheduleApplyAfterStreamingCompletes();
      return;
    }
    pendingApplyAfterStreaming = false;
    scheduleApply();
  }, 220);
}

function isRelevantMutationNode(node: Node): boolean {
  const element = node instanceof Element ? node : node.parentElement;
  if (!element) return false;
  if (isNodeInThoughtTree(element)) return false;
  if (element.closest(CANDIDATE_SELECTOR) !== null) return true;
  if (isNodeInModelResponse(element)) return true;
  return element.querySelector(CANDIDATE_SELECTOR) !== null;
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
    if (!enabled || mutations.length === 0) return;
    if (!hasRelevantMutations(mutations)) return;

    if (isAnyModelResponseStreaming()) {
      scheduleApplyAfterStreamingCompletes();
      return;
    }

    if (pendingApplyAfterStreaming) {
      pendingApplyAfterStreaming = false;
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

  ensureStyle();

  chrome.storage.local.get([StorageKeys.GEMINI_PARAGRAPH_INDENT_ENABLED], (res) => {
    enabled = res[StorageKeys.GEMINI_PARAGRAPH_INDENT_ENABLED] === true;
    if (!enabled) {
      rollbackAll();
      return;
    }

    if (isAnyModelResponseStreaming()) {
      scheduleApplyAfterStreamingCompletes();
      return;
    }
    scheduleApply();
  });

  storageChangeListener = (changes, area) => {
    if (area !== 'local') return;
    if (!changes[StorageKeys.GEMINI_PARAGRAPH_INDENT_ENABLED]) return;
    enabled = changes[StorageKeys.GEMINI_PARAGRAPH_INDENT_ENABLED].newValue === true;
    if (!enabled) {
      pendingApplyAfterStreaming = false;
      clearApplyTimer();
      clearStreamCompletionTimer();
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
        if (!enabled) return;
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
      pendingApplyAfterStreaming = false;
      clearApplyTimer();
      clearStreamCompletionTimer();
      rollbackAll();
      document.getElementById(STYLE_ID)?.remove();
      started = false;
    },
    { once: true },
  );
}
