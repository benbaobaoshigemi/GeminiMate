import katex from 'katex';

import { StorageKeys } from '../types/common';
import { debugService } from './DebugService';
import { logger } from './LoggerService';

const RE_MATH = /(\$\$[\s\S]*?\$\$)|(\$((?:\\\$|[^$])+?)\$)/g;
const DONE_CLASS = 'gemini-fix-done';
const MD_FIX_CLASS = 'gemini-md-fixed';
const MD_MARK_CLASS = 'gemini-md-fix-mark';
const MESSAGE_CONTAINER_SELECTOR =
  '.message-content, message-content, [data-test-id="message-content"], model-response, model-response-text, .model-response-text, .response-content, .markdown-main-panel, .markdown';

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
  private static readonly TRACE_PREFIX = '[GM-TRACE][RepairEngine]';
  private observer: MutationObserver | null = null;
  private isMutatingSelf = false;
  private ttPolicy: { createHTML: (html: string) => string } | null = null;
  private started = false;
  private sourceSnapshots = new WeakMap<HTMLElement, string>();
  private renderedSnapshots = new WeakMap<HTMLElement, string>();
  private pendingFixTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingRollbackTimer: ReturnType<typeof setTimeout> | null = null;
  private storageListener:
    | ((changes: Record<string, chrome.storage.StorageChange>, areaName: string) => void)
    | null = null;
  private config = {
    latexEnabled: true,
    markdownEnabled: true,
  };

  private trace(message: string, context?: Record<string, unknown>): void {
    if (context) {
      console.log(`${RepairEngine.TRACE_PREFIX} ${message}`, context);
      return;
    }
    console.log(`${RepairEngine.TRACE_PREFIX} ${message}`);
  }

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
    ]);
    this.config.latexEnabled = this.resolveEnabled(res[StorageKeys.LATEX_FIXER_ENABLED], true);
    this.config.markdownEnabled = this.resolveEnabled(res[StorageKeys.MARKDOWN_REPAIR_ENABLED], true);
    this.trace('config-loaded', { ...this.config });

    this.storageListener = (changes, areaName) => {
      if (areaName !== 'local') return;

      const prev = { ...this.config };
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
        changed = true;
      }
      if (!changed) return;

      debugService.log('repair', 'config-changed', {
        previous: prev,
        current: this.config,
      });
      this.trace('config-changed', {
        previous: prev,
        current: this.config,
      });

      const turnedOff =
        (prev.latexEnabled && !this.config.latexEnabled) ||
        (prev.markdownEnabled && !this.config.markdownEnabled);

      if (turnedOff) {
        this.trace('schedule-rollback-on-toggle-off');
        this.scheduleRollback('config-turned-off');
        if (this.config.latexEnabled || this.config.markdownEnabled) {
          this.scheduleFixAll('reapply-after-rollback');
        }
        return;
      }

      if (this.config.latexEnabled || this.config.markdownEnabled) {
        this.scheduleFixAll('config-changed');
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
    if (this.pendingFixTimer !== null) return;
    this.trace('schedule-fix', { reason });
    this.pendingFixTimer = setTimeout(() => {
      this.pendingFixTimer = null;
      debugService.log('repair', 'fix-scheduled', { reason });
      this.fixAll();
    }, 120);
  }

  private scheduleRollback(reason: string): void {
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
    const containerSet = new Set(containers);
    return containers.filter((container) => {
      let parent = container.parentElement;
      while (parent) {
        if (containerSet.has(parent)) return false;
        parent = parent.parentElement;
      }
      return true;
    });
  }

  private hasRelevantMessageMutations(mutations: MutationRecord[]): boolean {
    return mutations.some((mutation) => {
      if (mutation.type === 'characterData') {
        const parent = mutation.target.parentElement;
        return parent?.closest(MESSAGE_CONTAINER_SELECTOR) !== null;
      }

      if (mutation.target instanceof Element) {
        if (mutation.target.closest(MESSAGE_CONTAINER_SELECTOR)) {
          return true;
        }
      }

      for (const node of Array.from(mutation.addedNodes)) {
        if (node instanceof Element) {
          if (node.matches(MESSAGE_CONTAINER_SELECTOR) || node.closest(MESSAGE_CONTAINER_SELECTOR)) {
            return true;
          }
          continue;
        }

        if (node.nodeType === Node.TEXT_NODE) {
          const textParent = node.parentElement;
          if (textParent?.closest(MESSAGE_CONTAINER_SELECTOR)) {
            return true;
          }
        }
      }

      return false;
    });
  }

  fixAll(): void {
    if (this.isMutatingSelf) return;
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
        const snapshot = this.sourceSnapshots.get(container);
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
      this.renderedSnapshots.set(container, currentHtml);
      return;
    }

    // No change
    if (currentHtml === previousRendered) {
      if (!this.sourceSnapshots.has(container)) {
        this.sourceSnapshots.set(container, currentHtml);
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
    this.renderedSnapshots.set(container, currentHtml);
  }

  private containsOwnPatchMarkers(html: string): boolean {
    return (
      html.includes(DONE_CLASS) ||
      html.includes(MD_FIX_CLASS) ||
      html.includes(MD_MARK_CLASS)
    );
  }

  private processContainerFromSource(container: HTMLElement): void {
    const source = this.sourceSnapshots.get(container) ?? container.innerHTML;
    if (container.innerHTML !== source && !this.containsOwnPatchMarkers(container.innerHTML)) {
      this.safeSetInnerHTML(container, source);
    }

    if (this.config.latexEnabled) {
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
      mb.parentNode?.replaceChild(document.createTextNode(`\n$$${math}$$\n`), mb);
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
      this.replaceElementWithText(element, `\n$$${math}$$\n`);
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
    const text = textNode.nodeValue;
    if (!text || !text.includes('$')) return;

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
        const { prefix, mathSrc, suffix } = this.sanitizeMathContent(blockMath.trim().slice(2, -2));
        if (prefix) fragments.push(document.createTextNode(prefix));
        fragments.push(this.createNativeMathNode(mathSrc, true) ?? document.createTextNode(blockMath));
        if (suffix) fragments.push(document.createTextNode(suffix));
      } else if (inlineMath) {
        const { prefix, mathSrc, suffix } = this.sanitizeMathContent(inner);
        const before = match.index > 0 ? text[match.index - 1] : '';
        const after = RE_MATH.lastIndex < text.length ? text[RE_MATH.lastIndex] : '';

        if (before && !/\s/.test(before)) fragments.push(document.createTextNode(' '));
        if (prefix) fragments.push(document.createTextNode(prefix));
        if (mathSrc.length > 0) {
          fragments.push(this.createNativeMathNode(mathSrc, false) ?? document.createTextNode(inlineMath));
        }
        if (suffix) fragments.push(document.createTextNode(suffix));
        if (after && !/\s/.test(after)) fragments.push(document.createTextNode(' '));
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

  private sanitizeMathContent(raw: string): { prefix: string; mathSrc: string; suffix: string } {
    let cleaned = raw.trim();
    let prefix = '';
    let suffix = '';
    const cjkRegex =
      /[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF\u3000-\u303F\uFF00-\uFFEF，。、《》；：！？“”’（）【】…—]+/;
    const lead = cleaned.match(new RegExp('^' + cjkRegex.source));
    if (lead) {
      prefix = lead[0];
      cleaned = cleaned.slice(prefix.length).trim();
    }

    const trail = cleaned.match(new RegExp(cjkRegex.source + '$'));
    if (trail) {
      suffix = trail[0];
      cleaned = cleaned.slice(0, -suffix.length).trim();
    }

    return { prefix, mathSrc: cleaned, suffix };
  }

  private createNativeMathNode(mathSrc: string, displayMode: boolean): HTMLElement | null {
    if (!mathSrc) return null;
    try {
      const html = katex.renderToString(mathSrc, { displayMode, throwOnError: false, strict: false });
      const el = document.createElement(displayMode ? 'div' : 'span');
      el.className = `${displayMode ? 'math-block' : 'math-inline'} ${DONE_CLASS}`;
      el.setAttribute('data-math', mathSrc);
      el.setAttribute('title', 'Fixed by GeminiMate');

      if (displayMode) {
        el.style.borderLeft = '2px solid rgba(76, 175, 80, 0.1)';
      } else {
        el.style.borderBottom = '1px dashed rgba(76, 175, 80, 0.2)';
        el.style.padding = '0 2px';
      }

      this.safeSetInnerHTML(el, html);
      return el;
    } catch {
      return null;
    }
  }

  private repairMarkdown(container: HTMLElement): void {
    const blocks = container.querySelectorAll('p, li, blockquote, td, span, div');

    blocks.forEach((block) => {
      const b = block as HTMLElement;
      if (b.closest(`pre, code, .${DONE_CLASS}`)) return;
      if (b.querySelector('table, h1, h2, h3')) return;

      const originalHTML = b.innerHTML;
      let fixedHTML = originalHTML;

      fixedHTML = fixedHTML.replace(/\*\*([\s\S]+?)\*\*/g, (match, content: string) => {
        if (!content.trim()) return match;
        const trimmed = content.replace(/^[\s\xa0]+|[\s\xa0]+$/g, '');
        return `<b class="${MD_FIX_CLASS} ${MD_MARK_CLASS}" style="border-bottom: 2px dashed #ffab40; font-weight: bold;" title="Markdown Bold Repaired">${trimmed}</b>`;
      });

      fixedHTML = fixedHTML.replace(
        /([^\s\$])(\${2,})(?!\d)/g,
        `$1<span class="${MD_MARK_CLASS}" style="border-bottom: 2px dashed #b2ff59"> $2</span>`,
      );
      fixedHTML = fixedHTML.replace(
        /(\${2,})([^\s\$])/g,
        `<span class="${MD_MARK_CLASS}" style="border-bottom: 2px dashed #b2ff59">$1 </span>$2`,
      );

      fixedHTML = fixedHTML.replace(/([^\s-])(\$)([^$]+)(\$)(?!\$)/g, '$1 $2$3$4');
      fixedHTML = fixedHTML.replace(/(?<!\$)(\$)([^$]+)(\$)([^\s-])/g, '$1$2$3 $4');

      if (fixedHTML !== originalHTML) {
        this.safeSetInnerHTML(b, fixedHTML);
      }
    });

    const bolds = container.querySelectorAll(`b:not(.${MD_FIX_CLASS}), strong:not(.${MD_FIX_CLASS})`);
    bolds.forEach((el) => {
      const b = el as HTMLElement;
      if (b.children.length > 0) return;
      const orig = b.textContent || '';
      const trimmed = orig.trim();
      if (trimmed !== orig) {
        b.textContent = trimmed;
        b.style.borderBottom = '2px dashed #40c4ff';
        b.classList.add(MD_MARK_CLASS);
      }
    });
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
