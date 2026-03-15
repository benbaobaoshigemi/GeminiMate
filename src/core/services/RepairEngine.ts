import katex from 'katex';

import { StorageKeys } from '../types/common';
import { isNodeInModelResponse, isNodeInThoughtTree } from '../utils/responseLifecycle';
import { debugService } from './DebugService';
import { logger } from './LoggerService';
import { findSplitMarkdownBoldRanges } from './markdownSplitBold';

const RE_MATH = /(\$\$[\s\S]*?\$\$)|(\$((?:\\\$|[^$])+?)\$)/g;
const INLINE_MATH_HTML_REGEX = /\$((?:\\\$|[^$])+?)\$/g;
const CJK_CHAR_REGEX =
  /[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF\u3000-\u303F\uFF00-\uFFEF，。、《》；：！？“”’（）【】…—]/;
const MIXED_MATH_FRAGMENT_REGEX =
  /[A-Za-z0-9\\{}_^()[\]+\-./]+(?:\s+[A-Za-z0-9\\{}_^()[\]+\-./]+)*/g;
const HARD_THOUGHT_ROOT_SELECTOR = 'model-thoughts, .model-thoughts';
const DONE_CLASS = 'gemini-fix-done';
const LATEX_NORMALIZED_ATTR = 'data-gm-latex-normalized';
const LATEX_REPAIRED_ATTR = 'data-gm-latex-repaired';
const MD_FIX_CLASS = 'gemini-md-fixed';
const MD_MARK_CLASS = 'gemini-md-fix-mark';
const MD_UNDERLINE_CLASS = 'gemini-md-underline';
const MESSAGE_CONTAINER_SELECTOR = [
  '.message-content',
  'message-content',
  '[data-test-id="message-content"]',
  '.markdown-main-panel',
  'model-response message-content',
  '.model-response message-content',
  '[data-message-author-role="model"] message-content',
  '[aria-label="Gemini response"] message-content',
  '.presented-response-container message-content',
  '.response-container message-content',
  'model-response .markdown-main-panel',
  '.model-response .markdown-main-panel',
  '[data-message-author-role="model"] .markdown-main-panel',
  '[aria-label="Gemini response"] .markdown-main-panel',
].join(', ');

interface TrustedTypesLike {
  createPolicy: (name: string, options: { createHTML: (input: string) => string }) => {
    createHTML: (input: string) => string;
  };
}

declare global {
  interface Window {
    trustedTypes?: TrustedTypesLike;
  }
}

export class RepairEngine {
  private static instance: RepairEngine;
  private observer: MutationObserver | null = null;
  private isMutatingSelf = false;
  private ttPolicy: { createHTML: (html: string) => string } | null = null;
  private started = false;
  private sourceSnapshots = new WeakMap<HTMLElement, string>();
  private rawSnapshots = new WeakMap<HTMLElement, string>();
  private renderedSnapshots = new WeakMap<HTMLElement, string>();
  private pendingFixTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingRollbackTimer: ReturnType<typeof setTimeout> | null = null;
  private forceMarkdownRefresh = false;
  private storageListener:
    | ((changes: Record<string, chrome.storage.StorageChange>, areaName: string) => void)
    | null = null;
  private config = {
    latexEnabled: true,
    markdownEnabled: true,
    emphasisMode: 'bold' as 'bold' | 'underline',
  };

  private trace(_message: string, _context?: Record<string, unknown>): void {}

  private constructor() {
    if (window.trustedTypes) {
      try {
        this.ttPolicy = window.trustedTypes.createPolicy('geminimate-policy', {
          createHTML: (s: string) => s,
        });
      } catch {
        logger.warn('Failed to create TrustedTypes policy');
      }
    }
  }

  static getInstance(): RepairEngine {
    if (!RepairEngine.instance) {
      RepairEngine.instance = new RepairEngine();
    }
    return RepairEngine.instance;
  }

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    logger.info('Starting Repair Engine');
    debugService.log('repair', 'start');
    this.trace('start');

    const res = await chrome.storage.local.get([
      StorageKeys.LATEX_FIXER_ENABLED,
      StorageKeys.MARKDOWN_REPAIR_ENABLED,
      StorageKeys.GEMINI_EMPHASIS_MODE,
    ]);
    this.config.latexEnabled = this.resolveEnabled(res[StorageKeys.LATEX_FIXER_ENABLED], true);
    this.config.markdownEnabled = this.resolveEnabled(res[StorageKeys.MARKDOWN_REPAIR_ENABLED], true);
    this.config.emphasisMode = res[StorageKeys.GEMINI_EMPHASIS_MODE] === 'underline' ? 'underline' : 'bold';
    this.trace('config-loaded', { ...this.config });

    this.storageListener = (changes, areaName) => {
      if (areaName !== 'local') return;

      let changed = false;

      if (changes[StorageKeys.LATEX_FIXER_ENABLED]) {
        this.config.latexEnabled = this.resolveEnabled(
          changes[StorageKeys.LATEX_FIXER_ENABLED].newValue,
          true,
        );
        changed = true;
      }
      if (changes[StorageKeys.MARKDOWN_REPAIR_ENABLED]) {
        this.config.markdownEnabled = this.resolveEnabled(
          changes[StorageKeys.MARKDOWN_REPAIR_ENABLED].newValue,
          true,
        );
        this.forceMarkdownRefresh = true;
        changed = true;
      }
      if (changes[StorageKeys.GEMINI_EMPHASIS_MODE]) {
        this.config.emphasisMode =
          changes[StorageKeys.GEMINI_EMPHASIS_MODE].newValue === 'underline' ? 'underline' : 'bold';
        this.forceMarkdownRefresh = true;
        changed = true;
      }
      if (!changed) return;

      debugService.log('repair', 'config-changed', {
        current: this.config,
      });
      this.trace('config-changed', {
        current: this.config,
      });

      // Rapid toggles can queue conflicting tasks; always keep only the latest intent.
      if (this.config.latexEnabled || this.config.markdownEnabled) {
        this.scheduleFixAll('config-changed');
      } else {
        this.scheduleRollback('config-turned-off');
      }
    };
    chrome.storage.onChanged.addListener(this.storageListener);

    this.setupObserver();
    this.fixAll();
  }

  private resolveEnabled(value: unknown, defaultValue: boolean): boolean {
    if (typeof value === 'boolean') return value;
    return defaultValue;
  }

  private setupObserver(): void {
    const bootstrap = (): void => {
      if (this.observer || !document.body) return;

      this.observer = new MutationObserver((mutations) => {
        if (this.isMutatingSelf || (!this.config.latexEnabled && !this.config.markdownEnabled)) {
          return;
        }
        if (mutations.length === 0) return;
        if (!this.hasRelevantMessageMutations(mutations)) return;
        debugService.log('repair', 'mutation-detected', { count: mutations.length });
        this.trace('mutation-detected', { count: mutations.length });
        this.scheduleFixAll('mutation');
      });

      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    };

    if (document.body) {
      bootstrap();
      return;
    }

    document.addEventListener(
      'DOMContentLoaded',
      () => {
        bootstrap();
      },
      { once: true },
    );
  }

  private scheduleFixAll(reason: string): void {
    if (this.pendingRollbackTimer !== null) {
      clearTimeout(this.pendingRollbackTimer);
      this.pendingRollbackTimer = null;
    }
    if (this.pendingFixTimer !== null) return;
    this.trace('schedule-fix', { reason });
    this.pendingFixTimer = setTimeout(() => {
      this.pendingFixTimer = null;
      debugService.log('repair', 'fix-scheduled', { reason });
      this.fixAll();
    }, 120);
  }

  private scheduleRollback(reason: string): void {
    if (this.pendingFixTimer !== null) {
      clearTimeout(this.pendingFixTimer);
      this.pendingFixTimer = null;
    }
    if (this.pendingRollbackTimer !== null) return;
    this.trace('schedule-rollback', { reason });
    this.pendingRollbackTimer = setTimeout(() => {
      this.pendingRollbackTimer = null;
      debugService.log('repair', 'rollback-scheduled', { reason });
      this.rollbackAll();
    }, 120);
  }

  private getMessageContainers(): HTMLElement[] {
    const containers = Array.from(document.querySelectorAll(MESSAGE_CONTAINER_SELECTOR)) as HTMLElement[];
    const scopedContainers = containers.filter((container) => {
      if (container.closest(HARD_THOUGHT_ROOT_SELECTOR)) return false;
      if (isNodeInThoughtTree(container)) return false;
      return isNodeInModelResponse(container);
    });

    // Always prefer leaf content nodes to avoid rewriting high-level model-response roots.
    return scopedContainers.filter(
      (container) => !scopedContainers.some((other) => other !== container && container.contains(other)),
    );
  }

  private isRelevantMutationNode(node: Node): boolean {
    const element = node instanceof Element ? node : node.parentElement;
    if (!element) return false;
    if (element.closest(HARD_THOUGHT_ROOT_SELECTOR)) return false;
    if (isNodeInThoughtTree(element)) return false;

    if (element.closest(MESSAGE_CONTAINER_SELECTOR) !== null) {
      return true;
    }
    if (isNodeInModelResponse(element)) {
      return true;
    }
    return element.querySelector(MESSAGE_CONTAINER_SELECTOR) !== null;
  }

  private hasRelevantMessageMutations(mutations: MutationRecord[]): boolean {
    return mutations.some((mutation) => {
      if (mutation.type === 'characterData') {
        return this.isRelevantMutationNode(mutation.target);
      }

      if (this.isRelevantMutationNode(mutation.target)) {
        return true;
      }

      for (const node of Array.from(mutation.addedNodes)) {
        if (this.isRelevantMutationNode(node)) return true;
      }

      return false;
    });
  }

  fixAll(): void {
    if (this.isMutatingSelf) {
      this.scheduleFixAll('locked-retry');
      return;
    }
    if (!this.config.latexEnabled && !this.config.markdownEnabled) return;

    this.isMutatingSelf = true;
    this.trace('fix-start', { ...this.config });

    try {
      const containers = this.getMessageContainers();
      this.trace('fix-containers', { count: containers.length });
      containers.forEach((container) => {
        this.captureOrRefreshSourceSnapshot(container);
        this.processContainerFromSource(container);
      });
      debugService.log('repair', 'fix-all-completed', {
        containerCount: containers.length,
        config: this.config,
      });
      logger.debug(`Fix complete. Scanned ${containers.length} containers.`);
    } catch (error) {
      logger.error('Fix All failed', { error });
      debugService.log('repair', 'fix-all-failed', { error: String(error) });
    } finally {
      this.forceMarkdownRefresh = false;
      setTimeout(() => {
        this.isMutatingSelf = false;
        this.trace('fix-end');
      }, 80);
    }
  }

  private rollbackAll(): void {
    if (this.isMutatingSelf) {
      this.scheduleRollback('locked-retry');
      return;
    }
    this.isMutatingSelf = true;
    this.trace('rollback-start');

    try {
      const containers = this.getMessageContainers();
      let restored = 0;

      containers.forEach((container) => {
        const snapshot = this.rawSnapshots.get(container) ?? this.sourceSnapshots.get(container);
        if (typeof snapshot !== 'string') return;
        if (container.innerHTML !== snapshot) {
          this.safeSetInnerHTML(container, snapshot);
          restored += 1;
        }
        this.renderedSnapshots.set(container, snapshot);
      });

      debugService.log('repair', 'rollback-completed', { restored });
      logger.info('Repair rollback completed', { restored });
      this.trace('rollback-completed', { restored });
    } catch (error) {
      logger.error('Repair rollback failed', { error });
      debugService.log('repair', 'rollback-failed', { error: String(error) });
    } finally {
      setTimeout(() => {
        this.isMutatingSelf = false;
        this.trace('rollback-end');
      }, 80);
    }
  }

  private captureOrRefreshSourceSnapshot(container: HTMLElement): void {
    const currentHtml = container.innerHTML;
    const previousRendered = this.renderedSnapshots.get(container);

    // Initial snapshot
    if (previousRendered === undefined) {
      this.sourceSnapshots.set(container, currentHtml);
      this.rawSnapshots.set(container, currentHtml);
      this.renderedSnapshots.set(container, currentHtml);
      return;
    }

    // No change
    if (currentHtml === previousRendered) {
      if (!this.sourceSnapshots.has(container)) {
        this.sourceSnapshots.set(container, currentHtml);
      }
      if (!this.rawSnapshots.has(container)) {
        this.rawSnapshots.set(container, currentHtml);
      }
      return;
    }

    // If current DOM contains our patch markers, rebuild source from current patched HTML.
    if (this.containsOwnPatchMarkers(currentHtml)) {
      const reconstructedSource = this.extractSourceFromPatchedHtml(currentHtml);
      this.sourceSnapshots.set(container, reconstructedSource);
      this.renderedSnapshots.set(container, currentHtml);
      this.trace('snapshot-reconstructed-from-patched-html', {
        sourceLength: reconstructedSource.length,
        renderedLength: currentHtml.length,
      });
      return;
    }

    // External DOM updates (clean content) should refresh source snapshot.
    this.sourceSnapshots.set(container, currentHtml);
    this.rawSnapshots.set(container, currentHtml);
    this.renderedSnapshots.set(container, currentHtml);
  }

  private containsOwnPatchMarkers(html: string): boolean {
    return (
      html.includes(DONE_CLASS) ||
      html.includes(LATEX_NORMALIZED_ATTR) ||
      html.includes(LATEX_REPAIRED_ATTR) ||
      html.includes(MD_FIX_CLASS) ||
      html.includes(MD_MARK_CLASS)
    );
  }

  private processContainerFromSource(container: HTMLElement): void {
    const source = this.sourceSnapshots.get(container) ?? container.innerHTML;
    const rawSource = this.rawSnapshots.get(container) ?? source;
    const currentInnerHTML = container.innerHTML;
    const hasPatchMarkers = this.containsOwnPatchMarkers(currentInnerHTML);
    const shouldRebuildMarkdown =
      this.forceMarkdownRefresh &&
      this.config.markdownEnabled &&
      (currentInnerHTML.includes(MD_FIX_CLASS) || currentInnerHTML.includes(MD_MARK_CLASS));

    if (shouldRebuildMarkdown) {
      // Rebuild from current patched DOM even when snapshot === current HTML.
      // This guarantees emphasis mode toggles reflow all old markdown repairs.
      const rebuiltSource = this.extractSourceFromPatchedHtml(currentInnerHTML);
      this.sourceSnapshots.set(container, rebuiltSource);
      if (currentInnerHTML !== rebuiltSource) {
        this.safeSetInnerHTML(container, rebuiltSource);
      }
    } else if (currentInnerHTML !== source) {
      // Reset to source when:
      // (a) no patch markers at all (external update), OR
      // (b) latex is now disabled but our rendered math markers are still present
      const shouldReset =
        !hasPatchMarkers ||
        (!this.config.latexEnabled && currentInnerHTML.includes(DONE_CLASS));
      if (shouldReset) {
        const nextHtml =
          !this.config.latexEnabled && currentInnerHTML.includes(DONE_CLASS) ? rawSource : source;
        this.safeSetInnerHTML(container, nextHtml);
      }
    }

    if (
      !this.config.latexEnabled &&
      currentInnerHTML !== rawSource &&
      (currentInnerHTML.includes(DONE_CLASS) || currentInnerHTML.includes(LATEX_NORMALIZED_ATTR))
    ) {
      this.safeSetInnerHTML(container, rawSource);
    }

    if (this.config.latexEnabled) {
      this.normalizeBrokenMathMarkup(container);
      this.revertNativeMath(container);
      this.walkLatex(container);
    }
    if (this.config.markdownEnabled) {
      this.repairMarkdown(container);
    }

    this.renderedSnapshots.set(container, container.innerHTML);
  }

  private revertNativeMath(container: HTMLElement): void {
    container.querySelectorAll('source-footnote').forEach((f) => f.remove());

    let unwrapped = false;
    container.querySelectorAll('span[class^="citation-"]').forEach((span) => {
      while (span.firstChild) span.parentNode?.insertBefore(span.firstChild, span);
      span.parentNode?.removeChild(span);
      unwrapped = true;
    });

    container.querySelectorAll(`.math-inline:not(.${DONE_CLASS})`).forEach((mi) => {
      const math = mi.getAttribute('data-math');
      if (!math) return;
      mi.parentNode?.replaceChild(document.createTextNode(`$${math}$`), mi);
      unwrapped = true;
    });

    container.querySelectorAll(`.math-block:not(.${DONE_CLASS})`).forEach((mb) => {
      let math = mb.getAttribute('data-math');
      if (math === 'block') {
        const ann = mb.querySelector('annotation[encoding="application/x-tex"]');
        if (ann) math = ann.textContent;
      }
      if (!math) return;
      mb.parentNode?.replaceChild(document.createTextNode(`$$${math}$$`), mb);
      unwrapped = true;
    });

    if (unwrapped) container.normalize();
  }

  private extractSourceFromPatchedHtml(html: string): string {
    const template = document.createElement('template');
    template.innerHTML = html;
    const root = template.content;

    Array.from(root.querySelectorAll(`.math-inline.${DONE_CLASS}`)).forEach((element) => {
      const math = element.getAttribute('data-math');
      if (!math) return;
      this.replaceElementWithText(element, `$${math}$`);
    });

    Array.from(root.querySelectorAll(`.math-block.${DONE_CLASS}`)).forEach((element) => {
      let math = element.getAttribute('data-math');
      if (math === 'block') {
        const annotation = element.querySelector('annotation[encoding="application/x-tex"]');
        if (annotation?.textContent) {
          math = annotation.textContent;
        }
      }
      if (!math) return;
      this.replaceElementWithText(element, `$$${math}$$`);
    });

    Array.from(root.querySelectorAll(`[${LATEX_NORMALIZED_ATTR}]`)).forEach((element) => {
      element.removeAttribute(LATEX_NORMALIZED_ATTR);
    });
    Array.from(root.querySelectorAll(`[${LATEX_REPAIRED_ATTR}]`)).forEach((element) => {
      element.removeAttribute(LATEX_REPAIRED_ATTR);
    });

    Array.from(root.querySelectorAll(`b.${MD_FIX_CLASS}, strong.${MD_FIX_CLASS}`)).forEach(
      (element) => {
        const text = (element.textContent ?? '').trim();
        this.replaceElementWithText(element, `**${text}**`);
      },
    );

    Array.from(root.querySelectorAll(`span.${MD_MARK_CLASS}`)).forEach((element) => {
      this.replaceElementWithText(element, element.textContent ?? '');
    });

    Array.from(
      root.querySelectorAll(`b.${MD_MARK_CLASS}:not(.${MD_FIX_CLASS}), strong.${MD_MARK_CLASS}:not(.${MD_FIX_CLASS})`),
    ).forEach((element) => {
      element.classList.remove(MD_MARK_CLASS);
      element.classList.remove(MD_UNDERLINE_CLASS);
      element.removeAttribute('style');
      element.removeAttribute('title');
    });

    return template.innerHTML;
  }

  private replaceElementWithText(element: Element, text: string): void {
    const textNode = document.createTextNode(text);
    element.parentNode?.replaceChild(textNode, element);
  }

  private walkLatex(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE && (node.nodeValue?.trim().length ?? 0) > 0) {
      this.processTextNodeLatex(node as Text);
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName.toUpperCase();
    if (tag === 'CODE' || tag === 'PRE' || tag === 'STYLE' || tag === 'SCRIPT') return;
    if (el.classList.contains(DONE_CLASS)) return;

    Array.from(el.childNodes).forEach((child) => this.walkLatex(child));
  }

  private processTextNodeLatex(textNode: Text): void {
    const originalText = textNode.nodeValue;
    if (!originalText || (!originalText.includes('$') && !originalText.includes('＄'))) return;

    const text = originalText.replace(/＄/g, '$');
    if (!text.includes('$')) return;

    RE_MATH.lastIndex = 0;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    const fragments: Node[] = [];

    while ((match = RE_MATH.exec(text)) !== null) {
      if (match.index > lastIndex) {
        fragments.push(document.createTextNode(text.slice(lastIndex, match.index)));
      }

      const blockMath = match[1];
      const inlineMath = match[2];
      const inner = match[3];

      if (blockMath) {
        const blockSource = blockMath.trim().slice(2, -2);
        const { prefix, mathSrc, suffix } = this.sanitizeMathContent(blockSource);
        const repaired =
          text !== originalText ||
          prefix.length > 0 ||
          suffix.length > 0 ||
          mathSrc !== blockSource.trim();
        if (prefix) fragments.push(document.createTextNode(prefix));
        fragments.push(
          this.createNativeMathNode(mathSrc, true, repaired) ?? document.createTextNode(blockMath),
        );
        if (suffix) fragments.push(document.createTextNode(suffix));
      } else if (inlineMath) {
        const { prefix, mathSrc, suffix } = this.sanitizeMathContent(inner);
        const before = match.index > 0 ? text[match.index - 1] : '';
        const after = RE_MATH.lastIndex < text.length ? text[RE_MATH.lastIndex] : '';
        const beforeNeedsSpace = Boolean(before && !/\s/.test(before));
        const afterNeedsSpace = Boolean(after && !/\s/.test(after));
        const repaired =
          text !== originalText ||
          beforeNeedsSpace ||
          afterNeedsSpace ||
          prefix.length > 0 ||
          suffix.length > 0 ||
          mathSrc !== inner.trim();

        if (beforeNeedsSpace) fragments.push(document.createTextNode(' '));
        if (prefix) fragments.push(document.createTextNode(prefix));
        if (mathSrc.length > 0) {
          fragments.push(
            this.createNativeMathNode(mathSrc, false, repaired) ?? document.createTextNode(inlineMath),
          );
        }
        if (suffix) fragments.push(document.createTextNode(suffix));
        if (afterNeedsSpace) fragments.push(document.createTextNode(' '));
      }

      lastIndex = RE_MATH.lastIndex;
    }

    if (lastIndex === 0) return;
    if (lastIndex < text.length) fragments.push(document.createTextNode(text.slice(lastIndex)));

    const parent = textNode.parentNode;
    if (!parent) return;
    fragments.forEach((f) => parent.insertBefore(f, textNode));
    parent.removeChild(textNode);
  }

  private normalizeBrokenMathMarkup(container: HTMLElement): void {
    const blocks = Array.from(container.querySelectorAll('p, li, blockquote, td')) as HTMLElement[];
    const leafBlocks = blocks.filter(
      (block) => !blocks.some((other) => other !== block && block.contains(other)),
    );

    leafBlocks.forEach((element) => {
      if (element.closest('pre, code, .code-block, code-block')) return;
      if (element.querySelector('button, [role="button"]')) return;

      const originalHTML = element.innerHTML;
      if (!originalHTML.includes('$') && !originalHTML.includes('＄')) return;

      const normalizedHTML = this.normalizeMathInBlockHtml(originalHTML);
      if (normalizedHTML !== originalHTML) {
        this.safeSetInnerHTML(element, normalizedHTML);
        element.setAttribute(LATEX_NORMALIZED_ATTR, '1');
      } else if (element.hasAttribute(LATEX_NORMALIZED_ATTR)) {
        element.removeAttribute(LATEX_NORMALIZED_ATTR);
      }
    });
  }

  private normalizeMathInBlockHtml(html: string): string {
    const inlineMathRegex = new RegExp(INLINE_MATH_HTML_REGEX.source, 'g');
    const normalizedInput = html.replace(/＄/g, '$');
    let changed = false;

    const normalized = normalizedInput.replace(inlineMathRegex, (full: string, inner: string) => {
      if (!inner.includes('<') && !inner.includes('math-inline') && !inner.includes('math-block')) {
        return full;
      }

      const normalizedInner = this.normalizeInlineMathSegment(inner);
      if (!normalizedInner) return full;

      const rebuilt = CJK_CHAR_REGEX.test(normalizedInner)
        ? this.rebuildMixedMathSegment(normalizedInner)
        : null;
      const candidate = rebuilt ?? `$${normalizedInner}$`;
      if (candidate !== full) {
        changed = true;
      }
      return candidate;
    });

    return changed ? normalized : html;
  }

  private normalizeInlineMathSegment(segmentInnerHtml: string): string {
    const template = document.createElement('template');
    template.innerHTML = segmentInnerHtml;
    const root = template.content;

    Array.from(root.querySelectorAll('[data-math]')).forEach((element) => {
      const math = element.getAttribute('data-math');
      this.replaceElementWithText(element, math ?? (element.textContent ?? ''));
    });

    Array.from(root.querySelectorAll('i, em')).forEach((element) => {
      this.replaceElementWithText(element, `_${element.textContent ?? ''}_`);
    });

    Array.from(root.querySelectorAll('b, strong')).forEach((element) => {
      this.replaceElementWithText(element, `**${element.textContent ?? ''}**`);
    });

    const flattened = (root.textContent ?? '').replace(/\u00a0/g, ' ');
    return this.normalizeMathEscapes(flattened).replace(/\s{2,}/g, ' ').trim();
  }

  private normalizeMathEscapes(input: string): string {
    return input.replace(/\\\\([a-zA-Z]+)/g, '\\$1');
  }

  private rebuildMixedMathSegment(content: string): string | null {
    if (!CJK_CHAR_REGEX.test(content)) return null;

    const fragmentRegex = new RegExp(MIXED_MATH_FRAGMENT_REGEX.source, 'g');
    let rebuilt = '';
    let lastIndex = 0;
    let mathFragmentCount = 0;
    let match: RegExpExecArray | null;

    while ((match = fragmentRegex.exec(content)) !== null) {
      const fragment = match[0];
      rebuilt += content.slice(lastIndex, match.index);

      if (this.isLikelyMathFragment(fragment)) {
        rebuilt += `$${fragment.trim()}$`;
        mathFragmentCount += 1;
      } else {
        rebuilt += fragment;
      }

      lastIndex = fragmentRegex.lastIndex;
    }

    rebuilt += content.slice(lastIndex);
    if (mathFragmentCount === 0) return null;

    return rebuilt;
  }

  private isLikelyMathFragment(fragment: string): boolean {
    const token = fragment.trim();
    if (token.length < 2) return false;
    if (CJK_CHAR_REGEX.test(token)) return false;
    if (/^[0-9]+$/.test(token)) return false;
    if (/[\\_^{}\[\]()]/.test(token)) return true;

    return /^(?:[A-Z][a-z]?\d*){2,}$/.test(token);
  }

  private sanitizeMathContent(raw: string): { prefix: string; mathSrc: string; suffix: string } {
    let cleaned = raw.trim();
    let prefix = '';
    let suffix = '';
    const cjkSequenceRegex = new RegExp(`${CJK_CHAR_REGEX.source}+`);
    const lead = cleaned.match(new RegExp('^' + cjkSequenceRegex.source));
    if (lead) {
      prefix = lead[0];
      cleaned = cleaned.slice(prefix.length).trim();
    }

    const trail = cleaned.match(new RegExp(cjkSequenceRegex.source + '$'));
    if (trail) {
      suffix = trail[0];
      cleaned = cleaned.slice(0, -suffix.length).trim();
    }

    return { prefix, mathSrc: cleaned, suffix };
  }

  private createNativeMathNode(mathSrc: string, displayMode: boolean, repaired: boolean): HTMLElement | null {
    if (!mathSrc) return null;
    try {
      const html = katex.renderToString(mathSrc, { displayMode, throwOnError: false, strict: false });
      const el = document.createElement(displayMode ? 'div' : 'span');
      el.className = `${displayMode ? 'math-block' : 'math-inline'} ${DONE_CLASS}`;
      el.setAttribute('data-math', mathSrc);
      if (repaired) {
        el.setAttribute(LATEX_REPAIRED_ATTR, '1');
      }

      if (displayMode) {
        if (repaired) {
          el.style.borderLeft = '2px solid rgba(220, 38, 38, 0.45)';
        }
      } else {
        el.style.padding = '0 2px';
        if (repaired) {
          el.style.borderBottom = '1px dashed rgba(220, 38, 38, 0.75)';
        }
      }

      this.safeSetInnerHTML(el, html);
      return el;
    } catch {
      return null;
    }
  }

  private getMarkdownEmphasisStyle(): string {
    // Bold mode: just bold weight, NO underline decoration.
    // Underline mode: yellow dashed underline, normal weight.
    return this.config.emphasisMode === 'underline'
      ? 'border-bottom: 2px dashed #ffd400; font-weight: inherit !important;'
      : 'font-weight: bold;';
  }

  private applyEmphasisToElement(el: HTMLElement, repaired: boolean, styleText: string): void {
    el.setAttribute('style', styleText);

    if (this.config.emphasisMode === 'underline') {
      el.classList.add(MD_UNDERLINE_CLASS);
      if (!repaired) {
        el.classList.add(MD_MARK_CLASS);
        el.setAttribute('title', 'Markdown Emphasis Adjusted');
      }
      return;
    }

    el.classList.remove(MD_UNDERLINE_CLASS);
    if (!repaired) {
      el.classList.remove(MD_MARK_CLASS);
      if (el.getAttribute('title') === 'Markdown Emphasis Adjusted') {
        el.removeAttribute('title');
      }
    }
  }

  private repairMarkdown(container: HTMLElement): void {
    const boldStyle = this.getMarkdownEmphasisStyle();
    this.repairSplitMarkdownRanges(container, boldStyle);
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let node = walker.nextNode();
    while (node) {
      textNodes.push(node as Text);
      node = walker.nextNode();
    }
    textNodes.forEach((textNode) => {
      this.rewriteMarkdownInTextNode(textNode, boldStyle);
    });

    // Normalize all previously repaired markdown nodes to the current emphasis mode.
    // This avoids stale underline/bold mix when users switch modes repeatedly.
    const repairedBolds = container.querySelectorAll(`b.${MD_FIX_CLASS}, strong.${MD_FIX_CLASS}`);
    repairedBolds.forEach((el) => {
      const b = el as HTMLElement;
      this.applyEmphasisToElement(b, true, boldStyle);
    });

    const bolds = container.querySelectorAll(`b:not(.${MD_FIX_CLASS}), strong:not(.${MD_FIX_CLASS})`);
    bolds.forEach((el) => {
      const b = el as HTMLElement;
      if (b.closest('h1, h2, h3, h4, h5, h6')) return;
      if (b.closest('pre, code, .code-block, code-block')) return;
      const orig = b.textContent || '';
      const trimmed = orig.trim();
      if (trimmed !== orig) {
        b.textContent = trimmed;
      }
      this.applyEmphasisToElement(b, false, boldStyle);
    });
  }

  private repairSplitMarkdownRanges(container: HTMLElement, boldStyle: string): void {
    const parents = [
      container,
      ...Array.from(container.querySelectorAll('*')),
    ].filter((node): node is HTMLElement => node instanceof HTMLElement);
    let changed = false;

    parents.forEach((parent) => {
      if (this.shouldSkipMarkdownContainer(parent)) return;
      while (this.rewriteSplitMarkdownInParent(parent, boldStyle)) {
        changed = true;
      }
    });

    if (changed) {
      container.normalize();
    }
  }

  private shouldSkipMarkdownContainer(container: HTMLElement): boolean {
    if (container.closest(`pre, code, .code-block, code-block, .${DONE_CLASS}`)) return true;
    if (container.closest('.katex, .katex-display, math, svg')) return true;
    if (
      container.closest(
        'a, button, [role="button"], [role="link"], input, textarea, select, option, label, summary, details',
      )
    ) {
      return true;
    }
    if (container.closest('[contenteditable="true"], [data-gm-ignore-markdown="1"]')) return true;
    return false;
  }

  private rewriteSplitMarkdownInParent(parent: HTMLElement, boldStyle: string): boolean {
    const childNodes = Array.from(parent.childNodes);
    if (childNodes.length < 3) {
      return false;
    }

    const range = findSplitMarkdownBoldRanges(
      childNodes.map((node) => ({
        kind:
          node.nodeType === Node.TEXT_NODE
            ? 'text'
            : this.isMarkdownBridgeNode(node)
              ? 'bridge'
              : 'blocked',
        text: node.nodeType === Node.TEXT_NODE ? node.nodeValue ?? '' : node.textContent ?? '',
      })),
    )[0];

    if (!range) {
      return false;
    }

    const startNode = childNodes[range.startTokenIndex];
    const endNode = childNodes[range.endTokenIndex];
    if (!(startNode instanceof Text) || !(endNode instanceof Text) || startNode === endNode) {
      return false;
    }
    const startText = startNode.nodeValue ?? '';
    const endText = endNode.nodeValue ?? '';
    const beforeStart = this.normalizeMathSpacingInText(startText.slice(0, range.startMarkerIndex));
    const insideStart = startText.slice(range.startMarkerIndex + 2);
    const insideEnd = endText.slice(0, range.endMarkerIndex);
    const afterEnd = this.normalizeMathSpacingInText(endText.slice(range.endMarkerIndex + 2));

    const boldNode = document.createElement('b');
    boldNode.className = `${MD_FIX_CLASS} ${MD_MARK_CLASS}`;
    this.applyEmphasisToElement(boldNode, true, boldStyle);
    boldNode.setAttribute('title', 'Markdown Bold Repaired');

    if (beforeStart) {
      parent.insertBefore(document.createTextNode(beforeStart), startNode);
    }
    parent.insertBefore(boldNode, startNode);

    if (insideStart) {
      boldNode.appendChild(document.createTextNode(insideStart));
    }

    parent.removeChild(startNode);

    let cursor = boldNode.nextSibling;
    while (cursor && cursor !== endNode) {
      const nextSibling = cursor.nextSibling;
      boldNode.appendChild(cursor);
      cursor = nextSibling;
    }

    if (insideEnd) {
      boldNode.appendChild(document.createTextNode(insideEnd));
    }

    const afterAnchor = endNode.nextSibling;
    parent.removeChild(endNode);
    if (afterEnd) {
      parent.insertBefore(document.createTextNode(afterEnd), afterAnchor);
    }

    this.trimMarkdownEdgeWhitespace(boldNode);
    return true;
  }

  private isMarkdownBridgeNode(node: Node): boolean {
    if (!(node instanceof HTMLElement)) {
      return false;
    }

    if (
      node.closest(
        'pre, code, .code-block, code-block, .katex, .katex-display, math, svg, a, button, [role="button"], [role="link"], input, textarea, select, option, label, summary, details, [contenteditable="true"], [data-gm-ignore-markdown="1"]',
      )
    ) {
      return false;
    }

    const tag = node.tagName.toUpperCase();
    return ![
      'ADDRESS',
      'ARTICLE',
      'ASIDE',
      'BLOCKQUOTE',
      'DETAILS',
      'DIV',
      'DL',
      'FIELDSET',
      'FIGCAPTION',
      'FIGURE',
      'FOOTER',
      'FORM',
      'H1',
      'H2',
      'H3',
      'H4',
      'H5',
      'H6',
      'HEADER',
      'HR',
      'LI',
      'MAIN',
      'NAV',
      'OL',
      'P',
      'SECTION',
      'TABLE',
      'TBODY',
      'TD',
      'TFOOT',
      'TH',
      'THEAD',
      'TR',
      'UL',
    ].includes(tag);
  }

  private trimMarkdownEdgeWhitespace(boldNode: HTMLElement): void {
    const firstChild = boldNode.firstChild;
    if (firstChild?.nodeType === Node.TEXT_NODE) {
      const firstTextNode = firstChild as Text;
      const trimmedLeading = (firstTextNode.nodeValue ?? '').replace(/^[\s\xa0]+/g, '');
      if (trimmedLeading.length === 0) {
        boldNode.removeChild(firstTextNode);
      } else if (trimmedLeading !== firstTextNode.nodeValue) {
        firstTextNode.nodeValue = trimmedLeading;
      }
    }

    const lastChild = boldNode.lastChild;
    if (lastChild?.nodeType === Node.TEXT_NODE) {
      const lastTextNode = lastChild as Text;
      const trimmedTrailing = (lastTextNode.nodeValue ?? '').replace(/[\s\xa0]+$/g, '');
      if (trimmedTrailing.length === 0) {
        boldNode.removeChild(lastTextNode);
      } else if (trimmedTrailing !== lastTextNode.nodeValue) {
        lastTextNode.nodeValue = trimmedTrailing;
      }
    }
  }

  private normalizeMathSpacingInText(text: string): string {
    let normalized = text;
    normalized = normalized.replace(/([^\s\$])(\${2,})(?!\d)/g, '$1 $2');
    normalized = normalized.replace(/(\${2,})([^\s\$])/g, '$1 $2');
    normalized = normalized.replace(/([^\s-])(\$)([^$]+)(\$)(?!\$)/g, '$1 $2$3$4');
    normalized = normalized.replace(/(?<!\$)(\$)([^$]+)(\$)([^\s-])/g, '$1$2$3 $4');
    return normalized;
  }

  private shouldSkipMarkdownNode(textNode: Text): boolean {
    const parent = textNode.parentElement;
    if (!parent) return true;
    if (parent.closest(`pre, code, .code-block, code-block, .${DONE_CLASS}`)) return true;
    if (parent.closest('.katex, .katex-display, math, svg')) return true;
    if (
      parent.closest(
        'a, button, [role="button"], [role="link"], input, textarea, select, option, label, summary, details',
      )
    ) {
      return true;
    }
    if (parent.closest('[contenteditable="true"], [data-gm-ignore-markdown="1"]')) return true;
    return false;
  }

  private rewriteMarkdownInTextNode(textNode: Text, boldStyle: string): void {
    if (this.shouldSkipMarkdownNode(textNode)) return;
    const originalText = textNode.nodeValue ?? '';
    if (originalText.length === 0) return;

    const hasBoldMarker = /\*\*[\s\S]+?\*\*/.test(originalText);
    const hasMathSpacingIssue =
      /([^\s\$])(\${2,})(?!\d)/.test(originalText) ||
      /(\${2,})([^\s\$])/.test(originalText) ||
      /([^\s-])(\$)([^$]+)(\$)(?!\$)/.test(originalText) ||
      /(?<!\$)(\$)([^$]+)(\$)([^\s-])/.test(originalText);
    if (!hasBoldMarker && !hasMathSpacingIssue) {
      return;
    }

    const fragment = document.createDocumentFragment();
    const boldRegex = /\*\*([\s\S]+?)\*\*/g;
    let cursor = 0;
    let changed = false;
    let match: RegExpExecArray | null;

    while ((match = boldRegex.exec(originalText)) !== null) {
      const before = originalText.slice(cursor, match.index);
      const normalizedBefore = this.normalizeMathSpacingInText(before);
      if (normalizedBefore !== before) {
        changed = true;
      }
      if (normalizedBefore) {
        fragment.appendChild(document.createTextNode(normalizedBefore));
      }

      const rawContent = match[1] ?? '';
      const trimmed = rawContent.replace(/^[\s\xa0]+|[\s\xa0]+$/g, '');
      if (!trimmed) {
        fragment.appendChild(document.createTextNode(match[0]));
      } else {
        const underlineClass = this.config.emphasisMode === 'underline' ? ` ${MD_UNDERLINE_CLASS}` : '';
        const boldNode = document.createElement('b');
        boldNode.className = `${MD_FIX_CLASS} ${MD_MARK_CLASS}${underlineClass}`;
        boldNode.setAttribute('style', boldStyle);
        boldNode.setAttribute('title', 'Markdown Bold Repaired');
        boldNode.textContent = trimmed;
        fragment.appendChild(boldNode);
        changed = true;
      }

      cursor = boldRegex.lastIndex;
    }

    const trailing = originalText.slice(cursor);
    const normalizedTrailing = this.normalizeMathSpacingInText(trailing);
    if (normalizedTrailing !== trailing) {
      changed = true;
    }
    if (normalizedTrailing) {
      fragment.appendChild(document.createTextNode(normalizedTrailing));
    }

    if (changed) {
      textNode.parentNode?.replaceChild(fragment, textNode);
    }
  }

  private safeSetInnerHTML(el: HTMLElement, html: string): void {
    if (this.ttPolicy) {
      el.innerHTML = this.ttPolicy.createHTML(html);
      return;
    }
    el.innerHTML = html;
  }
}

export const repairEngine = RepairEngine.getInstance();
