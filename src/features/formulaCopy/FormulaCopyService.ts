/**
 * Formula Copy Service
 * Handles copying LaTeX/MathJax formulas from Gemini chat conversations
 * Uses enterprise patterns: Singleton, Service Layer, Event Delegation
 */
import temml from 'temml';
import browser from 'webextension-polyfill';

import { debugService } from '@/core/services/DebugService';
import { logger } from '@/core/services/LoggerService';
import { StorageKeys } from '@/core/types/common';
import type { ILogger } from '@/core/types/common';

/**
 * Formula copy format options
 */
export type FormulaCopyFormat = 'latex' | 'unicodemath' | 'no-dollar';

/**
 * Configuration for the formula copy service
 */
export interface FormulaCopyConfig {
  toastDuration?: number;
  toastOffsetY?: number;
  maxTraversalDepth?: number;
  format?: FormulaCopyFormat;
}

/**
 * Service class for handling formula copy functionality
 * Implements Singleton pattern for single instance management
 */
export class FormulaCopyService {
  private static instance: FormulaCopyService | null = null;
  private static readonly MATHML_NS = 'http://www.w3.org/1998/Math/MathML';
  private readonly logger: ILogger;
  private readonly config: Required<Omit<FormulaCopyConfig, 'format'>>;
  private currentFormat: FormulaCopyFormat = 'latex';

  // Storage change listener, extracted so it can be removed on destroy
  private readonly handleStorageChange: Parameters<
    typeof browser.storage.onChanged.addListener
  >[0] = (changes, areaName) => {
    if (areaName !== 'local' && areaName !== 'sync') return;

    if (changes[StorageKeys.FORMULA_COPY_ENABLED]) {
      this.copyEnabled = changes[StorageKeys.FORMULA_COPY_ENABLED].newValue !== false;
      this.logger.debug('Formula copy enabled changed', { enabled: this.copyEnabled });
      debugService.log('formula-copy', 'enabled-changed', { enabled: this.copyEnabled });
    }

    if (changes[StorageKeys.FORMULA_COPY_FORMAT]) {
      const newFormat = changes[StorageKeys.FORMULA_COPY_FORMAT].newValue as FormulaCopyFormat;
      if (newFormat === 'latex' || newFormat === 'unicodemath' || newFormat === 'no-dollar') {
        this.currentFormat = newFormat;
        this.logger.debug('Formula format changed', { format: newFormat });
        debugService.log('formula-copy', 'format-changed', { format: newFormat });
      }
    }
  };

  private isInitialized = false;
  private copyEnabled = true;
  private storageListenerAttached = false;
  private mathMlMimeState: 'unknown' | 'supported' | 'unsupported' = 'unknown';
  private i18nMessages: Record<string, string> = {};

  private trace(_message: string, _context?: Record<string, unknown>): void {}

  private constructor(config: FormulaCopyConfig = {}) {
    this.logger = logger.createChild('FormulaCopy');
    this.config = {
      toastDuration: config.toastDuration ?? 2000,
      toastOffsetY: config.toastOffsetY ?? 40,
      maxTraversalDepth: config.maxTraversalDepth ?? 10,
    };
    this.currentFormat = config.format ?? 'latex';
    this.loadI18nMessages();
    this.loadFormatPreference();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: FormulaCopyConfig): FormulaCopyService {
    if (!FormulaCopyService.instance) {
      FormulaCopyService.instance = new FormulaCopyService(config);
    }
    return FormulaCopyService.instance;
  }

  /**
   * Load i18n messages for toast notifications
   */
  private loadI18nMessages(): void {
    try {
      this.i18nMessages = {
        copied: browser.i18n.getMessage('formula_copied') || '✓ Formula copied',
        failed: browser.i18n.getMessage('formula_copy_failed') || '✗ Failed to copy',
      };
    } catch (error) {
      this.logger.warn('Failed to load i18n messages, using defaults', { error });
      this.i18nMessages = {
        copied: '✓ Formula copied',
        failed: '✗ Failed to copy',
      };
    }
  }

  /**
   * Load format preference from storage
   */
  private async loadFormatPreference(): Promise<void> {
    try {
      const localResult = await browser.storage.local.get(StorageKeys.FORMULA_COPY_FORMAT);
      const localFormat = localResult[StorageKeys.FORMULA_COPY_FORMAT] as FormulaCopyFormat | undefined;
      if (localFormat === 'latex' || localFormat === 'unicodemath' || localFormat === 'no-dollar') {
        this.currentFormat = localFormat;
        this.logger.debug('Loaded formula format preference (local)', { format: localFormat });
      } else {
        // Backward-compatible fallback for old sync-based installs.
        const syncResult = await browser.storage.sync.get(StorageKeys.FORMULA_COPY_FORMAT);
        const syncFormat = syncResult[StorageKeys.FORMULA_COPY_FORMAT] as FormulaCopyFormat | undefined;
        if (syncFormat === 'latex' || syncFormat === 'unicodemath' || syncFormat === 'no-dollar') {
          this.currentFormat = syncFormat;
          this.logger.debug('Loaded formula format preference (sync fallback)', {
            format: syncFormat,
          });
        }
      }
    } catch (error) {
      this.logger.warn('Failed to load format preference, using default', { error });
    }
  }

  private async loadEnabledPreference(): Promise<void> {
    try {
      const result = await browser.storage.local.get(StorageKeys.FORMULA_COPY_ENABLED);
      const value = result[StorageKeys.FORMULA_COPY_ENABLED];
      this.copyEnabled = value !== false;
      this.logger.debug('Loaded formula copy enabled preference', { enabled: this.copyEnabled });
    } catch (error) {
      this.copyEnabled = true;
      this.logger.warn('Failed to load formula copy enabled preference, using default', { error });
    }
  }

  /**
   * Initialize the formula copy feature
   */
  public initialize(): void {
    if (this.isInitialized) {
      this.logger.warn('Service already initialized');
      return;
    }

    this.ensureStorageChangeListener();
    void this.loadEnabledPreference();
    document.addEventListener('click', this.handleClick, true);
    this.isInitialized = true;
    this.trace('initialize', {
      format: this.currentFormat,
      enabled: this.copyEnabled,
    });
    this.logger.info('Formula copy service initialized');
    debugService.log('formula-copy', 'service-initialized');
  }

  /**
   * Clean up the service (for extension unloading)
   */
  public destroy(): void {
    this.teardownStorageChangeListener();

    if (!this.isInitialized) {
      this.logger.warn('Service not initialized, cannot destroy');
      return;
    }

    document.removeEventListener('click', this.handleClick, true);
    this.isInitialized = false;
    this.trace('destroy');
    this.logger.info('Formula copy service destroyed');
    debugService.log('formula-copy', 'service-destroyed');
  }

  private ensureStorageChangeListener(): void {
    if (this.storageListenerAttached) return;
    browser.storage.onChanged.addListener(this.handleStorageChange);
    this.storageListenerAttached = true;
  }

  private teardownStorageChangeListener(): void {
    if (!this.storageListenerAttached) return;
    try {
      browser.storage.onChanged.removeListener(this.handleStorageChange);
    } catch (error) {
      this.logger.warn('Failed to remove storage change listener', { error });
    } finally {
      this.storageListenerAttached = false;
    }
  }

  /**
   * Handle click events using event delegation
   */
  private handleClick = (event: MouseEvent): void => {
    if (!this.isInitialized || !this.copyEnabled) {
      debugService.log('formula-copy', 'click-ignored', {
        initialized: this.isInitialized,
        enabled: this.copyEnabled,
      });
      return;
    }

    const target = event.target as HTMLElement;
    const mathElement = this.findMathElement(target);

    if (!mathElement) {
      debugService.log('formula-copy', 'click-no-math-element');
      return;
    }
    this.trace('math-element-detected', {
      tag: mathElement.tagName.toLowerCase(),
      format: this.currentFormat,
    });
    debugService.log('formula-copy', 'math-click-detected', {
      tag: mathElement.tagName.toLowerCase(),
      format: this.currentFormat,
    });

    // Try to extract LaTeX: first from data-math (Gemini), then from annotation (AI Studio)
    const latexSource = this.extractLatexSource(mathElement);
    if (!latexSource) {
      this.logger.warn('Math element found but no LaTeX source available');
      debugService.log('formula-copy', 'latex-source-missing', {
        tag: mathElement.tagName.toLowerCase(),
        hasDataMath: mathElement.hasAttribute('data-math'),
      });
      return;
    }
    this.trace('latex-source-extracted', {
      length: latexSource.length,
      preview: latexSource.slice(0, 80),
    });
    debugService.log('formula-copy', 'latex-source-extracted', {
      length: latexSource.length,
      preview: latexSource.slice(0, 120),
    });

    // Wrap formula with delimiters based on display type
    const isDisplayMode = this.isDisplayMode(mathElement);
    const { text, html } = this.wrapFormula(latexSource, isDisplayMode, mathElement);

    this.copyFormula(text, html, mathElement);
    event.stopPropagation();
  };

  /**
   * Extract LaTeX source from a math element
   * Supports both Gemini (data-math attribute) and AI Studio (annotation element)
   */
  private extractLatexSource(element: HTMLElement): string | null {
    // 1. Try Gemini's data-math attribute
    const dataMath = element.getAttribute('data-math');
    if (dataMath) {
      // Gemini block math may use data-math="block" as a sentinel,
      // while the real TeX source is stored in annotation.
      if (dataMath === 'block') {
        const blockAnnotation = element.querySelector('annotation[encoding="application/x-tex"]');
        if (blockAnnotation?.textContent) {
          const blockSource = blockAnnotation.textContent.trim();
          if (blockSource && blockSource !== 'block') {
            debugService.log('formula-copy', 'latex-source-from-block-annotation');
            this.trace('latex-source-from-block-annotation', {
              preview: blockSource.slice(0, 80),
            });
            return blockSource;
          }
          this.trace('latex-source-from-block-annotation-invalid', {
            preview: blockSource.slice(0, 80),
          });
        }
        this.trace('latex-source-block-sentinel-unresolved');
        return null;
      }
      debugService.log('formula-copy', 'latex-source-from-data-math');
      return dataMath;
    }

    // 2. Try AI Studio's annotation element with encoding="application/x-tex"
    const annotation = element.querySelector('annotation[encoding="application/x-tex"]');
    if (annotation?.textContent) {
      debugService.log('formula-copy', 'latex-source-from-tex-annotation');
      return annotation.textContent.trim();
    }

    // 3. Fallback: try any annotation element
    const anyAnnotation = element.querySelector('annotation');
    if (anyAnnotation?.textContent) {
      debugService.log('formula-copy', 'latex-source-from-generic-annotation');
      return anyAnnotation.textContent.trim();
    }

    return null;
  }

  /**
   * Copy formula to clipboard and show notification
   */
  private async copyFormula(
    text: string,
    html: string | undefined,
    mathElement: HTMLElement,
  ): Promise<void> {
    try {
      this.trace('copy-start', {
        format: this.currentFormat,
        hasHtml: Boolean(html),
        textLength: text.length,
      });
      debugService.log('formula-copy', 'copy-start', {
        format: this.currentFormat,
        hasHtml: Boolean(html),
        textLength: text.length,
        textPreview: text.slice(0, 120),
      });
      const success = await this.copyToClipboard(text, html);

      if (success) {
        this.showInlineSuccess(mathElement);
        this.logger.debug('Formula copied successfully', { length: text.length, hasHtml: !!html });
        debugService.log('formula-copy', 'copy-success', {
          format: this.currentFormat,
          textLength: text.length,
          hasHtml: !!html,
        });
        this.trace('copy-success', {
          format: this.currentFormat,
        });
      } else {
        this.showInlineError(mathElement);
        this.logger.error('Failed to copy formula');
        debugService.log('formula-copy', 'copy-failed');
        this.trace('copy-failed');
      }
    } catch (error) {
      this.showInlineError(mathElement);
      this.logger.error('Error copying formula', { error });
      debugService.log('formula-copy', 'copy-error', { error: String(error) });
      this.trace('copy-error', {
        name: this.getErrorName(error),
        message: this.getErrorMessage(error),
      });
    }
  }

  /**
   * Copy text to clipboard using modern API with fallback
   */
  private async copyToClipboard(text: string, html?: string): Promise<boolean> {
    // Try modern Clipboard API first (supports MIME types)
    if (navigator.clipboard?.write) {
      const isWordMathMLMode = this.currentFormat === 'unicodemath' && Boolean(html);

      // Primary path for Word MathML: legacy HTML copy keeps rich clipboard formats
      // that are more consistently consumed by desktop editors (including Word).
      if (isWordMathMLMode && html) {
        this.trace('clipboard-unicodemath-primary-legacy-html');
        debugService.log('formula-copy', 'clipboard-unicodemath-primary-legacy-html');
        if (this.copyToClipboardLegacyHtml(html, text)) {
          this.trace('clipboard-unicodemath-primary-legacy-html-success');
          debugService.log('formula-copy', 'clipboard-unicodemath-primary-legacy-html-success');
          return true;
        }
        this.trace('clipboard-unicodemath-primary-legacy-html-failed-fallback-modern');
        debugService.log(
          'formula-copy',
          'clipboard-unicodemath-primary-legacy-html-failed-fallback-modern',
        );
      }

      const items: Record<string, Blob> = {};

      if (isWordMathMLMode) {
        items['text/html'] = new Blob([html], { type: 'text/html' });
        if (
          html?.includes(`xmlns:mml="${FormulaCopyService.MATHML_NS}"`) &&
          this.shouldWriteMathMlMime()
        ) {
          items['application/mathml+xml'] = new Blob([text], { type: 'application/mathml+xml' });
        }
      } else {
        items['text/plain'] = new Blob([text], { type: 'text/plain' });
        if (html) {
          items['text/html'] = new Blob([html], { type: 'text/html' });
        }
      }

      try {
        this.trace('clipboard-write-attempt', {
          types: Object.keys(items),
          isWordMathMLMode,
        });
        this.trace('clipboard-payload-preview', {
          textPlainLength: text.length,
          textPlainPreview: text.slice(0, 160),
          htmlLength: html?.length ?? 0,
          htmlPreview: html ? html.slice(0, 160) : null,
        });
        debugService.log('formula-copy', 'clipboard-write-attempt', {
          types: Object.keys(items),
        });
        await navigator.clipboard.write([new ClipboardItem(items)]);
        if (Object.prototype.hasOwnProperty.call(items, 'application/mathml+xml')) {
          this.mathMlMimeState = 'supported';
          this.trace('mathml-mime-mark-supported-after-write');
        }
        this.trace('clipboard-write-success', {
          types: Object.keys(items),
        });
        debugService.log('formula-copy', 'clipboard-write-success', {
          types: Object.keys(items),
        });
        return true;
      } catch (error) {
        this.trace('clipboard-write-error', {
          name: this.getErrorName(error),
          message: this.getErrorMessage(error),
          types: Object.keys(items),
        });
        debugService.log('formula-copy', 'clipboard-write-error', {
          name: this.getErrorName(error),
          message: this.getErrorMessage(error),
          types: Object.keys(items),
        });
        if (this.isMathMLClipboardUnsupported(error)) {
          this.mathMlMimeState = 'unsupported';
          this.trace('mathml-mime-unsupported-disable-cache');
          debugService.log('formula-copy', 'mathml-mime-disabled-after-error');
          // Retry with HTML-only payload to avoid Word preferring text/plain.
          if (html) {
            const retryItems: Record<string, Blob> = {
              'text/html': new Blob([html], { type: 'text/html' }),
            };
            try {
              this.trace('clipboard-retry-without-mathml-mime');
              debugService.log('formula-copy', 'clipboard-write-retry-without-mathml-mime');
              await navigator.clipboard.write([new ClipboardItem(retryItems)]);
              this.trace('clipboard-retry-success', {
                types: Object.keys(retryItems),
              });
              this.trace('clipboard-retry-payload-preview', {
                textPlainLength: text.length,
                textPlainPreview: text.slice(0, 160),
                htmlLength: html?.length ?? 0,
                htmlPreview: html ? html.slice(0, 160) : null,
              });
              debugService.log('formula-copy', 'clipboard-write-retry-success', {
                types: Object.keys(retryItems),
              });
              return true;
            } catch (retryError) {
              this.logger.warn('Retry without MathML MIME failed, trying writeText MathML', {
                retryError,
              });
              debugService.log('formula-copy', 'clipboard-write-retry-error', {
                name: this.getErrorName(retryError),
                message: this.getErrorMessage(retryError),
              });
              this.trace('clipboard-retry-error', {
                name: this.getErrorName(retryError),
                message: this.getErrorMessage(retryError),
              });
            }
          }

          if (html && this.copyToClipboardLegacyHtml(html, text)) {
            return true;
          }

          // Keep MathML payload even in fallback paths.
          if (navigator.clipboard?.writeText) {
            try {
              await navigator.clipboard.writeText(text);
              this.trace('clipboard-writeText-success');
              debugService.log('formula-copy', 'clipboard-writeText-success');
              return true;
            } catch (writeTextError) {
              this.logger.warn('writeText fallback failed, trying legacy copy', { writeTextError });
              debugService.log('formula-copy', 'clipboard-writeText-error', {
                name: this.getErrorName(writeTextError),
                message: this.getErrorMessage(writeTextError),
              });
              this.trace('clipboard-writeText-error', {
                name: this.getErrorName(writeTextError),
                message: this.getErrorMessage(writeTextError),
              });
            }
          }
          return this.copyToClipboardLegacy(text);
        }

        this.logger.error('Clipboard API failed, trying fallback', { error });
        if (html && this.copyToClipboardLegacyHtml(html, text)) {
          return true;
        }
        if (html && navigator.clipboard?.writeText) {
          try {
            await navigator.clipboard.writeText(text);
            this.trace('clipboard-writeText-success-non-mathml');
            debugService.log('formula-copy', 'clipboard-writeText-success-non-mathml-error-path');
            return true;
          } catch (writeTextError) {
            this.logger.warn('writeText fallback failed, trying legacy copy', { writeTextError });
            debugService.log('formula-copy', 'clipboard-writeText-error-non-mathml-error-path', {
              name: this.getErrorName(writeTextError),
              message: this.getErrorMessage(writeTextError),
            });
            this.trace('clipboard-writeText-error-non-mathml', {
              name: this.getErrorName(writeTextError),
              message: this.getErrorMessage(writeTextError),
            });
          }
        }
        return this.copyToClipboardLegacy(text);
      }
    }

    // Fallback: If only writeText is available (no MIME support)
    if (navigator.clipboard?.writeText && !html) {
      try {
        await navigator.clipboard.writeText(text);
        this.trace('clipboard-writeText-success-no-html');
        debugService.log('formula-copy', 'clipboard-writeText-success-no-html');
        return true;
      } catch (error) {
        this.logger.error('Clipboard API failed, trying fallback', { error });
        debugService.log('formula-copy', 'clipboard-writeText-error-no-html', {
          name: this.getErrorName(error),
          message: this.getErrorMessage(error),
        });
        this.trace('clipboard-writeText-error-no-html', {
          name: this.getErrorName(error),
          message: this.getErrorMessage(error),
        });
        return this.copyToClipboardLegacy(text);
      }
    }

    if (html && this.copyToClipboardLegacyHtml(html, text)) {
      return true;
    }

    // Fallback to execCommand for older browsers (text only)
    return this.copyToClipboardLegacy(text);
  }

  private copyToClipboardLegacyHtml(html: string, textFallback: string): boolean {
    let container: HTMLDivElement | null = null;
    const selection = window.getSelection();
    const previousActiveElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    try {
      container = document.createElement('div');
      container.contentEditable = 'true';
      container.style.position = 'fixed';
      container.style.left = '-99999px';
      container.style.top = '0';
      container.style.opacity = '0';
      container.style.pointerEvents = 'none';
      container.setAttribute('xmlns:mml', FormulaCopyService.MATHML_NS);
      container.innerHTML = this.extractHtmlFragment(html);
      document.body.appendChild(container);

      if (!selection) {
        this.trace('clipboard-legacy-html-selection-missing');
        return this.copyToClipboardLegacy(textFallback);
      }

      const range = document.createRange();
      range.selectNodeContents(container);
      selection.removeAllRanges();
      selection.addRange(range);

      const success = document.execCommand('copy');
      selection.removeAllRanges();
      this.trace('clipboard-legacy-html-result', { success });
      debugService.log('formula-copy', 'clipboard-legacy-html-result', { success });
      if (success) {
        return true;
      }

      this.trace('clipboard-legacy-html-fallback-text');
      return this.copyToClipboardLegacy(textFallback);
    } catch (error) {
      this.logger.warn('Legacy HTML clipboard copy failed, fallback to text copy', { error });
      this.trace('clipboard-legacy-html-error', {
        name: this.getErrorName(error),
        message: this.getErrorMessage(error),
      });
      debugService.log('formula-copy', 'clipboard-legacy-html-error', {
        name: this.getErrorName(error),
        message: this.getErrorMessage(error),
      });
      return this.copyToClipboardLegacy(textFallback);
    } finally {
      if (selection) {
        selection.removeAllRanges();
      }
      if (container?.parentElement) {
        container.parentElement.removeChild(container);
      }
      if (previousActiveElement) {
        previousActiveElement.focus({ preventScroll: true });
      }
    }
  }

  private extractHtmlFragment(html: string): string {
    const startMarker = '<!--StartFragment-->';
    const endMarker = '<!--EndFragment-->';
    const startIndex = html.indexOf(startMarker);
    const endIndex = html.indexOf(endMarker);

    if (startIndex >= 0 && endIndex > startIndex) {
      return html.slice(startIndex + startMarker.length, endIndex);
    }

    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const fragment = parsed.body?.innerHTML?.trim();
    return fragment || html;
  }

  /**
   * Legacy clipboard copy method using execCommand
   */
  private copyToClipboardLegacy(text: string): boolean {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      textarea.style.pointerEvents = 'none';

      document.body.appendChild(textarea);
      textarea.select();

      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      this.trace('clipboard-legacy-result', { success });
      debugService.log('formula-copy', 'clipboard-legacy-result', { success });

      return success;
    } catch (error) {
      this.logger.error('Legacy clipboard copy failed', { error });
      debugService.log('formula-copy', 'clipboard-legacy-error', {
        name: this.getErrorName(error),
        message: this.getErrorMessage(error),
      });
      this.trace('clipboard-legacy-error', {
        name: this.getErrorName(error),
        message: this.getErrorMessage(error),
      });
      return false;
    }
  }

  private isMathMLClipboardUnsupported(error: unknown): boolean {
    const name = this.getErrorName(error);
    const nameMatches = name === 'notallowederror' || name === 'notsupportederror';
    if (!nameMatches) {
      return false;
    }

    const message = this.getErrorMessage(error);
    if (!message) {
      return true;
    }

    const lowerMessage = message.toLowerCase();
    return lowerMessage.includes('mathml') || lowerMessage.includes('application/mathml+xml');
  }

  private shouldWriteMathMlMime(): boolean {
    if (this.mathMlMimeState === 'supported') {
      return true;
    }

    if (this.mathMlMimeState === 'unsupported') {
      this.trace('mathml-mime-skip-cached-disabled');
      debugService.log('formula-copy', 'mathml-mime-skip-cached-disabled');
      return false;
    }

    const clipboardItemCtor = globalThis.ClipboardItem as unknown as {
      supports?: (type: string) => boolean;
    };

    if (typeof clipboardItemCtor?.supports === 'function') {
      const supported = clipboardItemCtor.supports('application/mathml+xml');
      this.trace('mathml-mime-support-check-non-authoritative', {
        supported,
        state: this.mathMlMimeState,
      });
      debugService.log('formula-copy', 'mathml-mime-support-check', { supported });
      if (supported) {
        this.mathMlMimeState = 'supported';
      } else {
        this.mathMlMimeState = 'unsupported';
      }
      return supported;
    }

    // Unknown browser capability: conservative choice to avoid repeated NotAllowedError in Chromium.
    this.trace('mathml-mime-support-unknown-conservative-false');
    debugService.log('formula-copy', 'mathml-mime-support-unknown-conservative-false');
    return false;
  }

  private getErrorMessage(error: unknown): string | null {
    if (error instanceof Error) {
      return error.message;
    }

    return typeof error === 'string' ? error : null;
  }

  private getErrorName(error: unknown): string | null {
    if (error instanceof DOMException) {
      return error.name.toLowerCase();
    }

    if (error instanceof Error) {
      return error.name.toLowerCase();
    }

    return null;
  }

  /**
   * Find the nearest math element in the DOM tree
   * Supports both Gemini (data-math attribute) and AI Studio (ms-katex container)
   */
  private findMathElement(target: HTMLElement): HTMLElement | null {
    // 1. Try Gemini's data-math attribute (direct)
    const direct = target.closest('[data-math]');
    if (direct instanceof HTMLElement) {
      return direct;
    }

    // 2. Try Gemini's .math-inline, .math-block containers
    const geminiContainer = target.closest('.math-inline, .math-block');
    if (geminiContainer instanceof HTMLElement) {
      return this.findDataMathInSubtree(geminiContainer);
    }

    // 3. Try AI Studio's ms-katex container
    const aiStudioContainer = target.closest('ms-katex');
    if (aiStudioContainer instanceof HTMLElement) {
      return aiStudioContainer;
    }

    // 4. Try AI Studio: clicked inside .katex element
    const katexElement = target.closest('.katex');
    if (katexElement instanceof HTMLElement) {
      // Find the parent ms-katex container
      const parentMsKatex = katexElement.closest('ms-katex');
      if (parentMsKatex instanceof HTMLElement) {
        return parentMsKatex;
      }
    }

    return null;
  }

  /**
   * Check if element is a math container
   */
  private isMathContainer(element: HTMLElement): boolean {
    return element.classList.contains('math-inline') || element.classList.contains('math-block');
  }

  /**
   * Check if formula is in display mode (block formula)
   * Supports both Gemini (.math-block class) and AI Studio (math display="block" attribute)
   */
  private isDisplayMode(element: HTMLElement): boolean {
    // 1. Gemini: check for .math-block container
    if (element.closest('.math-block') !== null) {
      return true;
    }

    // 2. AI Studio: check for math element with display="block" attribute
    const mathElement = element.querySelector('math[display="block"]');
    if (mathElement) {
      return true;
    }

    // 3. AI Studio: check if ms-katex container has block-like styling
    // (display formulas are typically block-level in AI Studio)
    if (element.tagName.toLowerCase() === 'ms-katex') {
      const style = window.getComputedStyle(element);
      if (style.display === 'block' || style.display === 'flex') {
        return true;
      }
    }

    return false;
  }

  /**
   * Wrap formula with appropriate delimiters based on format
   * @param formula - Raw LaTeX formula
   * @param isDisplayMode - Whether formula is in display mode
   * @returns Object containing text and optional html
   */
  private wrapFormula(
    formula: string,
    isDisplayMode: boolean,
    mathElement: HTMLElement,
  ): { text: string; html?: string } {
    if (this.currentFormat === 'unicodemath') {
      // Main path: reuse already-rendered MathML from page DOM to avoid parser mismatch.
      const domMathML = this.extractMathMLSource(mathElement);
      if (domMathML) {
        this.logger.debug('Using DOM MathML source for copy conversion');
        debugService.log('formula-copy', 'mathml-source-dom', {
          length: domMathML.length,
          preview: domMathML.slice(0, 120),
        });
        this.trace('mathml-source-dom', {
          preview: domMathML.slice(0, 80),
        });
        return this.buildWordMathMLPayload(domMathML);
      }

      // Fallback path: convert LaTeX to MathML when DOM MathML is unavailable.
      try {
        debugService.log('formula-copy', 'mathml-source-temml-fallback');
        this.trace('mathml-source-temml-fallback');
        const strippedFormula = this.stripMathDelimiters(formula);
        const rawMathML = temml.renderToString(strippedFormula, {
          displayMode: isDisplayMode,
          xml: true,
          annotate: false,
          throwOnError: false,
          colorIsTextColor: true,
          trust: false,
        });
        debugService.log('formula-copy', 'mathml-generated-by-temml', {
          length: rawMathML.length,
          preview: rawMathML.slice(0, 120),
        });
        this.trace('mathml-generated-by-temml', {
          preview: rawMathML.slice(0, 80),
        });
        return this.buildWordMathMLPayload(rawMathML);
      } catch (error) {
        this.logger.error('MathML conversion failed', { error });
        debugService.log('formula-copy', 'mathml-conversion-failed', {
          name: this.getErrorName(error),
          message: this.getErrorMessage(error),
        });
        this.trace('mathml-conversion-failed', {
          name: this.getErrorName(error),
          message: this.getErrorMessage(error),
        });
        return { text: formula };
      }
    }

    if (this.currentFormat === 'no-dollar') {
      return { text: formula };
    }

    // Default: LaTeX format with delimiters
    const wrapped = isDisplayMode ? `$$${formula}$$` : `$${formula}$`;
    return { text: wrapped };
  }

  private ensureMathMLNamespace(mathML: string): string {
    if (mathML.includes('xmlns=')) {
      return mathML;
    }

    return mathML.replace('<math', `<math xmlns="${FormulaCopyService.MATHML_NS}"`);
  }

  private buildWordMathMLPayload(rawMathML: string): { text: string; html: string } {
    const sanitizedMathML = this.stripMathMLAnnotations(rawMathML);
    const namespacedMathML = this.ensureMathMLNamespace(sanitizedMathML);
    const wordMathML = this.toWordMathML(namespacedMathML);
    const htmlMathML = this.toHtmlMathML(wordMathML);
    const htmlWrapped = this.wrapMathMLForWordHtml(htmlMathML);
    debugService.log('formula-copy', 'word-mathml-payload-built', {
      rawLength: rawMathML.length,
      sanitizedLength: sanitizedMathML.length,
      wordLength: wordMathML.length,
      htmlMathLength: htmlMathML.length,
      htmlLength: htmlWrapped.length,
      hasWordBlockCompat: wordMathML.includes('<mml:mpadded lspace="0">'),
      preview: wordMathML.slice(0, 120),
    });
    this.trace('word-mathml-payload-built', {
      rawLength: rawMathML.length,
      wordLength: wordMathML.length,
      hasMmlRoot: wordMathML.includes('<mml:math'),
      hasWordBlockCompat: wordMathML.includes('<mml:mpadded lspace="0">'),
      wordPreview: wordMathML.slice(0, 120),
      htmlPreview: htmlMathML.slice(0, 120),
      htmlHasStartFragment: htmlWrapped.includes('<!--StartFragment-->'),
    });
    this.trace('word-mathml-final-snapshot', {
      text: wordMathML.slice(0, 500),
    });
    this.trace('word-mathml-html-snapshot', {
      htmlMath: htmlMathML.slice(0, 500),
    });

    return { text: wordMathML, html: htmlWrapped };
  }

  private toHtmlMathML(wordMathML: string): string {
    // For HTML clipboard payload, use non-prefixed MathML tags so the browser keeps
    // them as actual element nodes in contenteditable copy, instead of textual XML.
    let htmlMath = wordMathML
      .replace(/<mml:/g, '<')
      .replace(/<\/mml:/g, '</')
      .replace(/\s+xmlns:mml="http:\/\/www\.w3\.org\/1998\/Math\/MathML"/, '');

    if (!htmlMath.includes('xmlns="http://www.w3.org/1998/Math/MathML"')) {
      htmlMath = htmlMath.replace(
        '<math',
        `<math xmlns="${FormulaCopyService.MATHML_NS}"`,
      );
    }

    return htmlMath;
  }

  private extractMathMLSource(element: HTMLElement): string | null {
    let mathNode: Element | null = null;

    if (element.localName === 'math') {
      mathNode = element;
    } else {
      mathNode = element.querySelector('math');
    }

    if (!mathNode) {
      debugService.log('formula-copy', 'mathml-source-dom-missing');
      this.trace('mathml-source-dom-missing');
      return null;
    }

    return new XMLSerializer().serializeToString(mathNode);
  }

  private toWordMathML(mathML: string): string {
    const parsed = new DOMParser().parseFromString(mathML, 'application/xml');
    if (parsed.getElementsByTagName('parsererror').length > 0) {
      return this.stripMathMLAnnotations(mathML);
    }

    const root = parsed.documentElement;
    if (root.localName !== 'math') {
      return this.stripMathMLAnnotations(mathML);
    }

    // Remove annotations (<annotation> and <annotation-xml>)
    for (const annotation of Array.from(root.getElementsByTagName('annotation'))) {
      annotation.parentNode?.removeChild(annotation);
    }
    for (const annotationXml of Array.from(root.getElementsByTagName('annotation-xml'))) {
      annotationXml.parentNode?.removeChild(annotationXml);
    }

    // Unwrap <semantics> if present at root
    const semantics = Array.from(root.getElementsByTagName('semantics')).find(
      (node) => node.parentElement === root,
    );
    if (semantics) {
      const presentation = semantics.firstElementChild;
      if (presentation) {
        while (root.firstChild) {
          root.removeChild(root.firstChild);
        }
        root.appendChild(presentation);
      }
    }

    this.stripPresentationAttributes(root);
    this.applyWordBlockCompatibility(root);

    const output = document.implementation.createDocument(
      FormulaCopyService.MATHML_NS,
      'mml:math',
      null,
    );
    const outputRoot = output.documentElement;

    // Copy root attributes (display, etc.), excluding namespace declarations
    for (const attr of Array.from(root.attributes)) {
      if (attr.name.startsWith('xmlns')) {
        continue;
      }
      outputRoot.setAttribute(attr.name, attr.value);
    }

    for (const child of Array.from(root.childNodes)) {
      outputRoot.appendChild(this.cloneNodeWithMathMLPrefix(output, child));
    }

    return new XMLSerializer().serializeToString(outputRoot);
  }

  private applyWordBlockCompatibility(root: Element): void {
    if (root.getAttribute('display') !== 'block') {
      return;
    }

    let topLevelMrow = Array.from(root.children).find((child) => child.localName === 'mrow');
    // Normalize block formulas to a single top-level mrow so Word receives a stable tree shape.
    if (!topLevelMrow) {
      const ownerDocument = root.ownerDocument ?? document;
      const createdMrow = ownerDocument.createElementNS(FormulaCopyService.MATHML_NS, 'mrow');
      const rootChildren = Array.from(root.childNodes);
      if (rootChildren.length === 0) {
        return;
      }
      for (const child of rootChildren) {
        createdMrow.appendChild(child);
      }
      root.appendChild(createdMrow);
      topLevelMrow = createdMrow;
      this.trace('word-block-compat-created-top-level-mrow');
    }

    const firstElementChild = Array.from(topLevelMrow.children)[0];
    if (!firstElementChild) {
      return;
    }

    if (firstElementChild.localName === 'mpadded') {
      return;
    }

    const ownerDocument = root.ownerDocument ?? document;
    const mpadded = ownerDocument.createElementNS(FormulaCopyService.MATHML_NS, 'mpadded');
    mpadded.setAttribute('lspace', '0');
    topLevelMrow.replaceChild(mpadded, firstElementChild);
    mpadded.appendChild(firstElementChild);

    this.trace('word-block-compat-applied', {
      wrappedTag: firstElementChild.localName,
    });
  }

  private cloneNodeWithMathMLPrefix(targetDocument: Document, sourceNode: Node): Node {
    if (sourceNode.nodeType === Node.TEXT_NODE) {
      return targetDocument.createTextNode(sourceNode.nodeValue ?? '');
    }

    if (sourceNode.nodeType !== Node.ELEMENT_NODE) {
      return targetDocument.importNode(sourceNode, true);
    }

    const sourceElement = sourceNode as Element;
    const namespaceUri = sourceElement.namespaceURI;
    const localName = sourceElement.localName;

    const isMathMl = namespaceUri === FormulaCopyService.MATHML_NS || namespaceUri === null;
    const qualifiedName = isMathMl ? `mml:${localName}` : sourceElement.tagName;
    const element = isMathMl
      ? targetDocument.createElementNS(FormulaCopyService.MATHML_NS, qualifiedName)
      : targetDocument.createElement(qualifiedName);

    for (const attr of Array.from(sourceElement.attributes)) {
      if (attr.name.startsWith('xmlns')) {
        continue;
      }
      element.setAttribute(attr.name, attr.value);
    }

    for (const child of Array.from(sourceElement.childNodes)) {
      element.appendChild(this.cloneNodeWithMathMLPrefix(targetDocument, child));
    }

    return element;
  }

  private wrapMathMLForWordHtml(mathML: string): string {
    // Word's HTML importer is sensitive to fragments; include Start/End markers.
    return [
      `<html xmlns:mml="${FormulaCopyService.MATHML_NS}">`,
      '<head><meta charset="utf-8"></head>',
      '<body><!--StartFragment-->',
      mathML,
      '<!--EndFragment--></body></html>',
    ].join('');
  }

  private stripMathMLAnnotations(mathML: string): string {
    return mathML
      .replace(/<annotation(?:-xml)?[\s\S]*?<\/annotation(?:-xml)?>/g, '')
      .replace(/<semantics>\s*([\s\S]*?)\s*<\/semantics>/g, '$1');
  }

  private stripPresentationAttributes(root: Element): void {
    if (root.hasAttribute('class')) {
      root.removeAttribute('class');
    }
    if (root.hasAttribute('style')) {
      root.removeAttribute('style');
    }

    for (const element of Array.from(root.getElementsByTagName('*'))) {
      if (element.hasAttribute('class')) {
        element.removeAttribute('class');
      }
      if (element.hasAttribute('style')) {
        element.removeAttribute('style');
      }
    }
  }

  private stripMathDelimiters(formula: string): string {
    const trimmed = formula.trim();

    if (trimmed.startsWith('$$') && trimmed.endsWith('$$')) {
      return trimmed.slice(2, -2);
    }

    if (trimmed.startsWith('\\[') && trimmed.endsWith('\\]')) {
      return trimmed.slice(2, -2);
    }

    if (trimmed.startsWith('\\(') && trimmed.endsWith('\\)')) {
      return trimmed.slice(2, -2);
    }

    if (trimmed.startsWith('$') && trimmed.endsWith('$')) {
      return trimmed.slice(1, -1);
    }

    return formula;
  }

  /**
   * Search for data-math attribute in element subtree
   */
  private findDataMathInSubtree(root: HTMLElement): HTMLElement | null {
    const direct = root.querySelector('[data-math]');
    return direct instanceof HTMLElement ? direct : null;
  }

  /**
   * Walk up from mathElement to find the nearest visual block wrapper
   * (e.g. .math-display, .katex-display) within a few levels, for display formulas.
   */
  private getBlockElement(el: HTMLElement): HTMLElement {
    let cur: HTMLElement | null = el;
    for (let i = 0; i < 4 && cur; i++) {
      if (
        cur.classList.contains('math-display') ||
        cur.classList.contains('katex-display') ||
        cur.classList.contains('math-block')
      ) {
        return cur;
      }
      cur = cur.parentElement;
    }
    return el;
  }

  /**
   * Show inline success highlight (green outline + checkmark badge) on the formula block.
   */
  private showInlineSuccess(mathElement: HTMLElement): void {
    const block = this.getBlockElement(mathElement);
    block.classList.remove('gv-copy-error');
    block.classList.add('gv-copy-success');
    setTimeout(() => {
      block.classList.remove('gv-copy-success');
    }, 1400);
  }

  /**
   * Show inline error highlight (red outline) on the formula block.
   */
  private showInlineError(mathElement: HTMLElement): void {
    const block = this.getBlockElement(mathElement);
    block.classList.remove('gv-copy-success');
    block.classList.add('gv-copy-error');
    setTimeout(() => {
      block.classList.remove('gv-copy-error');
    }, 1400);
  }

  /**
   * Check if service is initialized
   */
  public isServiceInitialized(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance getter
export const getFormulaCopyService = (config?: FormulaCopyConfig) =>
  FormulaCopyService.getInstance(config);
