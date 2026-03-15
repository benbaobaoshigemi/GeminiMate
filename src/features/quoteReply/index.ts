import { debugService } from '@/core/services/DebugService';

// ============================================================================
// Constants
// ============================================================================

/** CSS class names for quote reply button */
const CSS_CLASSES = {
  BUTTON: 'gm-quote-btn',
  HIDDEN: 'gm-hidden',
} as const;

/** Timing constants (in milliseconds) */
const TIMING = {
  /** Delay before performing insertion to wait for UI expansion transitions */
  INSERTION_DELAY_MS: 200,
  /** Delay before retrying focus for editors that need extra time */
  FOCUS_RETRY_DELAY_MS: 50,
  /** Debounce delay for selection change detection */
  SELECTION_DEBOUNCE_MS: 250,
} as const;

/** UI positioning constants (in pixels) */
const POSITIONING = {
  /** Minimum distance from viewport edge */
  MIN_EDGE_OFFSET_PX: 10,
  /** Gap between button and selection */
  BUTTON_SELECTION_GAP_PX: 16,
} as const;

/** SVG icon for the quote button */
const QUOTE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path></svg>`;

const STYLE_ID = 'geminimate-quote-reply-style';
const BUTTON_TEXT = '引用回复';

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .gm-quote-btn {
      position: fixed;
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background-color: rgba(239, 246, 255, 0.96);
      color: #1d4ed8;
      border-radius: 999px;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
      cursor: pointer;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s ease;
      border: 1px solid rgba(59, 130, 246, 0.45);
      transform: translateY(0);
      opacity: 1;
      pointer-events: auto;
    }
    .gm-quote-btn:hover {
      background-color: rgba(219, 234, 254, 0.98);
      transform: translateY(-1px);
      box-shadow: 0 10px 28px rgba(15, 23, 42, 0.14);
    }
    .gm-quote-btn svg {
      width: 14px;
      height: 14px;
      opacity: 0.9;
    }
    .gm-quote-btn.gm-hidden {
      opacity: 0;
      transform: translateY(4px);
      pointer-events: none;
      visibility: hidden;
    }
    @media (prefers-color-scheme: dark) {
      .gm-quote-btn {
        background-color: rgba(10, 25, 47, 0.92);
        color: #93c5fd;
        border: 1px solid rgba(59, 130, 246, 0.45);
        box-shadow: 0 8px 24px rgba(2, 6, 23, 0.28);
      }
      .gm-quote-btn:hover {
        background-color: rgba(15, 36, 68, 0.98);
      }
    }
    .theme-host.dark-theme .gm-quote-btn,
    html.dark .gm-quote-btn,
    body.dark .gm-quote-btn,
    html[data-theme="dark"] .gm-quote-btn,
    body[data-theme="dark"] .gm-quote-btn,
    html[data-color-scheme="dark"] .gm-quote-btn,
    body[data-color-scheme="dark"] .gm-quote-btn {
      background-color: rgba(10, 25, 47, 0.92);
      color: #93c5fd;
      border: 1px solid rgba(59, 130, 246, 0.45);
      box-shadow: 0 8px 24px rgba(2, 6, 23, 0.28);
    }
    .theme-host.dark-theme .gm-quote-btn:hover,
    html.dark .gm-quote-btn:hover,
    body.dark .gm-quote-btn:hover,
    html[data-theme="dark"] .gm-quote-btn:hover,
    body[data-theme="dark"] .gm-quote-btn:hover,
    html[data-color-scheme="dark"] .gm-quote-btn:hover,
    body[data-color-scheme="dark"] .gm-quote-btn:hover {
      background-color: rgba(15, 36, 68, 0.98);
    }
  `;
  document.head.appendChild(style);
}

// Function to find the chat input
function getChatInput(): HTMLElement | null {
  // Gemini usually has a rich-textarea
  // Try multiple selectors from most specific to generic
  const selectors = [
    'rich-textarea [contenteditable="true"]',
    'div[contenteditable="true"][role="textbox"]',
    '.input-area textarea',
    'textarea[placeholder*="Ask"]',
    'textarea', // Fallback, might be dangerous
  ];

  for (const selector of selectors) {
    // We probably want the one in the main footer/input area, not others (like edit mode)
    // Usually the main input is visible and larger.
    const els = document.querySelectorAll(selector);
    for (const el of Array.from(els)) {
      // Check if it's visible
      if (el.getBoundingClientRect().height > 0) {
        return el as HTMLElement;
      }
    }
  }
  return null;
}

function countLineBreaks(raw: string): number {
  return (raw.match(/\n/g) || []).length;
}

interface SeparatorInsertResult {
  inserted: boolean;
  insertedBreaks: number;
}

function getContenteditableQuoteSeparator(): string {
  return '\n\n';
}

function getPlaceholderCandidates(input: HTMLElement): string[] {
  const richTextarea = input.closest('rich-textarea');
  const candidates = [
    input.getAttribute('data-placeholder'),
    input.getAttribute('aria-placeholder'),
    input.getAttribute('placeholder'),
    richTextarea?.getAttribute('data-placeholder'),
    richTextarea?.getAttribute('aria-placeholder'),
    richTextarea?.getAttribute('placeholder'),
  ];

  return candidates.filter((value): value is string => Boolean(value)).map((value) => value.trim());
}

function isChatInputEmpty(input: HTMLElement | HTMLTextAreaElement): boolean {
  if (input instanceof HTMLTextAreaElement) {
    return input.value.trim().length === 0;
  }

  const rawContent = input.innerText ?? input.textContent ?? '';
  const trimmedContent = rawContent.trim();

  // If visible text exists and it's not placeholder text, treat as non-empty even if
  // Quill's `ql-blank` class lags behind DOM updates.
  if (trimmedContent.length > 0) {
    const placeholders = getPlaceholderCandidates(input);
    const isPlaceholderText = placeholders.some(
      (placeholder) => placeholder.length > 0 && placeholder === trimmedContent,
    );
    if (!isPlaceholderText) {
      return false;
    }
  }

  // Gemini currently uses Quill internals. `ql-blank` is its canonical empty marker.
  if (input.classList.contains('ql-blank')) {
    return true;
  }

  return trimmedContent.length === 0;
}

/**
 * Attempts to insert separator text via execCommand and reports whether
 * content changed plus how many line breaks were observed as inserted.
 */
function tryInsertQuoteSeparator(input: HTMLElement, separator: string): SeparatorInsertResult {
  const beforeVisible = input.innerText ?? '';
  const beforeRaw = input.textContent ?? '';
  const beforeVisibleLineBreakCount = countLineBreaks(beforeVisible);
  const beforeRawLineBreakCount = countLineBreaks(beforeRaw);
  let ok = false;
  try {
    ok = document.execCommand('insertText', false, separator);
  } catch {
    ok = false;
  }
  if (!ok) return { inserted: false, insertedBreaks: 0 };

  const afterVisible = input.innerText ?? '';
  const afterRaw = input.textContent ?? '';
  if (afterVisible === beforeVisible && afterRaw === beforeRaw) {
    return { inserted: false, insertedBreaks: 0 };
  }

  const visibleLineBreakDelta = countLineBreaks(afterVisible) - beforeVisibleLineBreakCount;
  const rawLineBreakDelta = countLineBreaks(afterRaw) - beforeRawLineBreakCount;
  const insertedBreaks = Math.max(0, visibleLineBreakDelta, rawLineBreakDelta);
  return { inserted: true, insertedBreaks };
}

export function startQuoteReply() {
  injectStyles();

  let quoteBtn: HTMLElement | null = null;
  let currentSelectionRange: Range | null = null;
  let isInternalClick = false;
  let scrollRafId: number | null = null;
  let selectionDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  /** Update button position based on current selection range's viewport coordinates. */
  function updatePosition() {
    if (!quoteBtn || !currentSelectionRange) return;

    const rangeRect = currentSelectionRange.getBoundingClientRect();

    // Hide when selection is scrolled out of viewport
    const isOffScreen = rangeRect.bottom < 0 || rangeRect.top > window.innerHeight;

    if (isOffScreen) {
      if (!quoteBtn.classList.contains(CSS_CLASSES.HIDDEN)) {
        quoteBtn.classList.add(CSS_CLASSES.HIDDEN);
      }
      return;
    }

    if (quoteBtn.classList.contains(CSS_CLASSES.HIDDEN)) {
      quoteBtn.classList.remove(CSS_CLASSES.HIDDEN);
    }

    // Ensure the button is visible before measuring to get actual dimensions
    const btnRect = quoteBtn.getBoundingClientRect();

    // Use getClientRects to get the precise position of the first line.
    // This prevents the button from being pushed down by empty space in multi-line selections.
    const firstLineRect =
      typeof currentSelectionRange.getClientRects === 'function'
        ? currentSelectionRange.getClientRects()[0] || rangeRect
        : rangeRect;

    // position: fixed uses viewport coordinates, no scrollY/X needed
    const top = firstLineRect.top - btnRect.height - POSITIONING.BUTTON_SELECTION_GAP_PX;
    const left = rangeRect.left + rangeRect.width / 2 - btnRect.width / 2;

    // Edge protection: prevent the button from being clipped or overflowing the viewport
    const maxLeft = window.innerWidth - btnRect.width - POSITIONING.MIN_EDGE_OFFSET_PX;

    quoteBtn.style.top = `${Math.max(POSITIONING.MIN_EDGE_OFFSET_PX, top)}px`;
    quoteBtn.style.left = `${Math.min(maxLeft, Math.max(POSITIONING.MIN_EDGE_OFFSET_PX, left))}px`;
  }

  function onScrollOrResize() {
    if (scrollRafId) return;
    scrollRafId = requestAnimationFrame(() => {
      updatePosition();
      scrollRafId = null;
    });
  }

  // Create button
  function createButton() {
    if (quoteBtn) return;
    quoteBtn = document.createElement('div');
    quoteBtn.className = `${CSS_CLASSES.BUTTON} ${CSS_CLASSES.HIDDEN}`;
    quoteBtn.innerHTML = `${QUOTE_ICON}<span>${BUTTON_TEXT}</span>`;

    quoteBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      isInternalClick = true;
      handleQuoteClick();
    });

    document.body.appendChild(quoteBtn);
  }

  function handleQuoteClick() {
    if (!currentSelectionRange) return;
    const selectedText = currentSelectionRange.toString().trim();
    if (!selectedText) return;

    const input = getChatInput();
    if (input) {
      // Format: > selection
      // Prepare quote body (without leading/trailing newlines - those are added at insertion time)
      const quoteBody = selectedText
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n');

      // Ensure the input is visible
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Robust insertion and focus logic
      const performInsertion = () => {
        // First focus attempt
        input.focus();

        // Check input state at insertion time to avoid race conditions
        // (user might type or another quote might be inserted during the delay)
        const isInputEmpty = isChatInputEmpty(input);

        // 1. Add a newline at the end (any quote)
        // 2. Add a newline at the start if not the first quote
        // Example:
        // ------------
        // |> Quote 1 |
        // |New text 1|
        // |> Quote 2 |
        // |New text 2|
        // ------------
        const quoteWithTrailingNewline = `${quoteBody}\n`;

        if (input instanceof HTMLTextAreaElement) {
          // Standard Textarea logic - simplified append
          const prefix = isInputEmpty ? '' : '\n\n';
          input.value += `${prefix}${quoteWithTrailingNewline}`;
          input.selectionStart = input.selectionEnd = input.value.length;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          // Contenteditable (Gemini/Quill) logic
          const sel = window.getSelection();

          // For empty editors, insert from start.
          if (sel) {
            const range = document.createRange();
            range.selectNodeContents(input);
            if (isInputEmpty) {
              range.collapse(true);
            } else {
              range.collapse(false); // Move cursor to very end
            }
            sel.removeAllRanges();
            sel.addRange(range);
          }

          // Try to insert a separator via execCommand in one shot.
          // If the command succeeds and mutates content, only the quote body
          // (or missing part of it) remains to be inserted.
          // If insertion does not mutate content, fall back to prepending separator.
          const quoteSeparator = getContenteditableQuoteSeparator();
          const requiredSeparatorBreaks = countLineBreaks(quoteSeparator);
          let contentToInsert: string;
          let forceRangeInsertion = false;
          if (!isInputEmpty) {
            const separatorResult = tryInsertQuoteSeparator(input, quoteSeparator);
            if (separatorResult.inserted) {
              const missingBreaks = Math.max(
                0,
                requiredSeparatorBreaks - separatorResult.insertedBreaks,
              );
              contentToInsert =
                missingBreaks > 0
                  ? `${'\n'.repeat(missingBreaks)}${quoteWithTrailingNewline}`
                  : quoteWithTrailingNewline;
              // Avoid re-running execCommand after partial mutation to prevent duplicate separators.
              forceRangeInsertion = missingBreaks > 0;
            } else {
              contentToInsert = `${quoteSeparator}${quoteWithTrailingNewline}`;
            }
          } else {
            contentToInsert = quoteWithTrailingNewline;
          }

          // Quill handles text insertion better with native insertText command.
          // Fallback to manual Range insertion when command is unavailable.
          let inserted = false;
          if (!forceRangeInsertion) {
            try {
              inserted = document.execCommand('insertText', false, contentToInsert);
            } catch {
              inserted = false;
            }
          }

          if (!inserted) {
            const textNode = document.createTextNode(contentToInsert);
            if (sel) {
              if (forceRangeInsertion) {
                const endRange = document.createRange();
                endRange.selectNodeContents(input);
                endRange.collapse(false);
                sel.removeAllRanges();
                sel.addRange(endRange);
              }
            }

            if (sel && sel.rangeCount > 0) {
              const insertRange = sel.getRangeAt(0);
              insertRange.insertNode(textNode);

              // Move cursor to after the inserted text
              insertRange.setStartAfter(textNode);
              insertRange.setEndAfter(textNode);
              sel.removeAllRanges();
              sel.addRange(insertRange);
            } else {
              // Fallback: just append to the input
              input.appendChild(textNode);
            }
          }

          // Re-force cursor to the end after insertion
          const finalRange = document.createRange();
          finalRange.selectNodeContents(input);
          finalRange.collapse(false);
          sel?.removeAllRanges();
          sel?.addRange(finalRange);

          input.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // Final focus force
        input.focus();
        // Some editors need an extra click or focus to show the cursor
        setTimeout(() => input.focus(), TIMING.FOCUS_RETRY_DELAY_MS);
      };

      // Use a slightly longer delay to wait for any expansion transitions
      setTimeout(performInsertion, TIMING.INSERTION_DELAY_MS);

      // Hide button and clear selection state
      hideButton();
      currentSelectionRange = null;
      window.getSelection()?.removeAllRanges();
    } else {
      debugService.log('quote-reply', 'chat-input-not-found');
    }
  }

  function showButton() {
    if (!quoteBtn) createButton();
    if (!quoteBtn) return;

    // updatePosition() manages visibility (HIDDEN class) based on viewport check
    updatePosition();

    // Add listeners for scroll/resize
    window.addEventListener('scroll', onScrollOrResize, { capture: true, passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });
  }

  function hideButton() {
    if (quoteBtn) {
      quoteBtn.classList.add(CSS_CLASSES.HIDDEN);
    }
    // Remove listeners
    window.removeEventListener('scroll', onScrollOrResize, { capture: true });
    window.removeEventListener('resize', onScrollOrResize);
    if (scrollRafId) {
      cancelAnimationFrame(scrollRafId);
      scrollRafId = null;
    }
  }

  function handleSelectionChange() {
    // Debounce to let selection settle and avoid redundant updates on rapid key events
    if (selectionDebounceTimer) clearTimeout(selectionDebounceTimer);
    selectionDebounceTimer = setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        hideButton();
        currentSelectionRange = null;
        return;
      }

      const text = selection.toString().trim();
      if (!text) {
        hideButton();
        currentSelectionRange = null;
        return;
      }

      // Check if selection is within a message user/model bubble
      // We don't want to quote random UI elements
      const anchor = selection.anchorNode;
      if (!anchor) return;

      const element =
        anchor.nodeType === Node.TEXT_NODE ? anchor.parentElement : (anchor as HTMLElement);

      // Check if selection is inside main content area
      // Gemini uses <main> or sometimes specific classes. We want to avoid nav, sidebar, etc.
      const mainContent = document.querySelector('main');
      if (mainContent && !mainContent.contains(element)) {
        hideButton();
        return;
      }

      // Also explicitly check for sidebar classes just in case
      if (
        element?.closest('nav') ||
        element?.closest('[role="navigation"]') ||
        element?.closest('.sidebar') ||
        element?.closest('.mat-drawer')
      ) {
        hideButton();
        return;
      }

      // Selectors for valid areas: user-query-container, model-response, conversation-container
      // Or just check if it's not the input box itself
      if (element?.closest('[contenteditable="true"]')) {
        hideButton();
        return;
      }

      // Also check if we are selecting code block content? Might be fine.

      const range = selection.getRangeAt(0);
      currentSelectionRange = range;
      const rect = range.getBoundingClientRect();

      // If rect is zero (e.g. invisible), don't show
      if (rect.width === 0 && rect.height === 0) return;

      showButton();
    }, TIMING.SELECTION_DEBOUNCE_MS);
  }

  function onMouseUp(_: MouseEvent) {
    if (isInternalClick) {
      isInternalClick = false;
      return;
    }
    handleSelectionChange();
  }

  // Listen to selection changes via mouseup (often better for "finished" selection)
  // selectionchange event fires too often while dragging.
  document.addEventListener('mouseup', onMouseUp);

  function onKeys(e: KeyboardEvent) {
    if (e.key === 'Shift' || e.key.startsWith('Arrow')) {
      handleSelectionChange();
    }
  }

  // Also listen to keyup for keyboard selection
  document.addEventListener('keyup', onKeys);

  debugService.log('quote-reply', 'started');

  // Cleanup
  return () => {
    hideButton();
    if (selectionDebounceTimer) clearTimeout(selectionDebounceTimer);
    document.removeEventListener('mouseup', onMouseUp);
    document.removeEventListener('keyup', onKeys);
    if (quoteBtn) quoteBtn.remove();
    const style = document.getElementById(STYLE_ID);
    if (style) style.remove();
    debugService.log('quote-reply', 'stopped');
  };
}
