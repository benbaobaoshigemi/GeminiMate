import { StorageKeys } from '@/core/types/common';

const STYLE_ID = 'geminimate-paragraph-indent-style';
const INDENT_CLASS = 'gm-first-line-indent';
const MARK_ATTR = 'data-gm-indent-applied';
const NORMALIZED_ATTR = 'data-gm-indent-normalized';
const ORIGINAL_TEXT_ATTR = 'data-gm-indent-original-text';
const BODY_LINE_CLASS = 'gm-indent-body-line';
const DEFAULT_ENABLED = false;

const CANDIDATE_SELECTOR = [
  // Restrict indent targets to actual response paragraphs.
  // Broad div selectors were incorrectly catching thoughts panels,
  // source buttons, and other layout wrappers.
  'model-response message-content p',
  'model-response .markdown p',
  'model-response .markdown-main-panel p',
  'structured-content-container message-content p',
  '[data-test-id="message-content"] p',
].join(', ');
const SECTION_HEADING_RE = /^(?:第\s*[一二三四五六七八九十百千万\d]+\s*[章节部分节讲]|[一二三四五六七八九十百千万]+\s*[、.．:：-])\s*/;
const ENUMERATED_LIST_HEADING_RE = /^\d+\s*[、.．:)）-]\s*$/;

let started = false;
let enabled = DEFAULT_ENABLED;
let observer: MutationObserver | null = null;
let applyTimers: number[] = [];
let storageChangeListener: ((changes: { [key: string]: chrome.storage.StorageChange; }, areaName: string) => void) | null = null;

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

// 修复列表、代码块、表格被缩进导致排版炸裂的黑名单
const SKIP_ANCESTOR_SELECTOR = [
  'li', 'ul', 'ol', // 必须跳过列表，否则缩进会使文字脱离前面的序号
  'table', 'blockquote',
  'pre', 'code',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'model-thoughts', '.thoughts-container', '.thoughts-content',
  '[data-test-id*="thought"]', '[class*="thought"]'
].join(', ');

function shouldSkipBlock(el: HTMLElement): boolean {
  return !!el.closest(SKIP_ANCESTOR_SELECTOR);
}

function isEnumeratedListHeading(text: string): boolean {
  return ENUMERATED_LIST_HEADING_RE.test(text.trim());
}

function shouldIndentText(raw: string): boolean {
  const text = raw.replace(/\u00a0/g, ' ').trim();
  return text.length > 0;
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
    if (['B', 'STRONG', 'SPAN', 'A', 'EM', 'I', 'U', 'CODE', 'MARK', 'SMALL', 'SUB', 'SUP'].includes(childTag)) {
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

  const normalizationCandidates = document.querySelectorAll(CANDIDATE_SELECTOR);
  normalizationCandidates.forEach((node) => {
    if (node instanceof HTMLElement) {
      normalizeMergedHeadingParagraph(node);
    }
  });

  const candidates = document.querySelectorAll(CANDIDATE_SELECTOR);
  const candidateSet = new Set<HTMLElement>();
  candidates.forEach((node) => {
    if (node instanceof HTMLElement) {
      candidateSet.add(node);
    }
  });

  document.querySelectorAll(`[${MARK_ATTR}], [${NORMALIZED_ATTR}]`).forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    if (candidateSet.has(node)) return;
    removeIndentMark(node);
  });

  candidates.forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
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

function clearApplyTimers(): void {
  if (applyTimers.length === 0) return;
  applyTimers.forEach((timer) => clearTimeout(timer));
  applyTimers = [];
}

function scheduleApply(): void {
  // Gemini often hydrates the same paragraph in multiple passes.
  // Run once after the current mutation burst, then re-check twice more
  // to catch late text/markdown/formula rendering without waiting for user input.
  clearApplyTimers();
  [120, 360, 900].forEach((delay) => {
    const timer = window.setTimeout(() => {
      applyIndentAll();
      applyTimers = applyTimers.filter((id) => id !== timer);
    }, delay);
    applyTimers.push(timer);
  });
}

function setupObserver(): void {
  if (observer || !document.body) return;
  observer = new MutationObserver((mutations) => {
    if (!enabled || mutations.length === 0) return;
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
    scheduleApply();
  });

  storageChangeListener = (changes, area) => {
    if (area !== 'local') return;
    if (!changes[StorageKeys.GEMINI_PARAGRAPH_INDENT_ENABLED]) return;
    enabled = changes[StorageKeys.GEMINI_PARAGRAPH_INDENT_ENABLED].newValue === true;
    if (!enabled) {
      rollbackAll();
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
      clearApplyTimers();
      rollbackAll();
      document.getElementById(STYLE_ID)?.remove();
      started = false;
    },
    { once: true },
  );
}
