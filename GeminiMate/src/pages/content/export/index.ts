// Static imports to avoid CSP issues with dynamic imports in content scripts
import { StorageKeys } from '@/core/types/common';
import { isSafari } from '@/core/utils/browser';
import { type AppLanguage, normalizeLanguage } from '@/utils/language';
import { TRANSLATIONS, type TranslationKey } from '@/utils/translations';

import { ConversationExportService } from '../../../features/export/services/ConversationExportService';
import { DOMContentExtractor } from '../../../features/export/services/DOMContentExtractor';
import { ImageExportService } from '../../../features/export/services/ImageExportService';
import {
  WordResponseExportService,
  type WordResponseEmphasisMode,
  type WordResponseExportMode,
  type WordResponseTypography,
} from '../../../features/export/services/WordResponseExportService';
import type {
  ConversationMetadata,
  ChatTurn as ExportChatTurn,
  ExportFormat,
} from '../../../features/export/types/export';
import { ExportDialog } from '../../../features/export/ui/ExportDialog';
import { resolveExportErrorMessage } from '../../../features/export/ui/ExportErrorMessage';
import { showExportToast } from '../../../features/export/ui/ExportToast';
import { filterOutDeepResearchImmersiveNodes, resolveConversationRoot } from './conversationDom';
import {
  getConversationMenuContext,
  getResponseMenuContext,
  injectConversationMenuExportButton,
  injectResponseMenuExportButton,
} from './conversationMenuInjection';
import { injectResponseActionCopyImageButtons } from './responseActionImageButton';
import {
  injectResponseActionWordButtons,
  WORD_EXPORT_BUTTON_TEST_ID,
} from './responseActionWordButton';
import { copyImageBlobToClipboard, downloadImageBlob } from './responseImageCopy';
import { groupSelectedMessagesByTurn, resolveInitialSelectedMessageIds } from './selectionUtils';
import { resolveSidebarConversationTarget } from './sidebarConversationTarget';
import {
  computeConversationFingerprint,
  waitForConversationFingerprintChangeOrTimeout,
} from './topNodePreload';

// Storage key to persist export state across reloads (e.g. when clicking top node triggers refresh)
const SESSION_KEY_PENDING_EXPORT = 'gv_export_pending';
const CONVERSATION_MENU_SELECTOR = '.mat-mdc-menu-panel[role="menu"]';
const CONVERSATION_MENU_TRIGGER_TEST_ID = 'actions-menu-button';
const RESPONSE_MENU_TRIGGER_TEST_ID = 'more-menu-button';
const MENU_INJECTION_RETRY_LIMIT = 8;
const MENU_INJECTION_RETRY_DELAY_MS = 80;
const EXPORT_PRELOAD_WAIT_OPTIONS = {
  timeoutMs: 12000,
  minWaitMs: 700,
  idleMs: 320,
  pollIntervalMs: 90,
  maxSamples: 10,
} as const;
const FINAL_EXPORT_PREPARE_DELAY_MS = 120;
let conversationMenuObserver: MutationObserver | null = null;
let responseActionObserver: MutationObserver | null = null;
let wordResponseExportEnabled = true;
let wordResponseExportMode: WordResponseExportMode = 'default';

const DEFAULT_WORD_SANS_PRESET = 'sans-apple';
const DEFAULT_WORD_SERIF_PRESET = 'serif-source';

const WORD_SANS_PRESET_FAMILIES: Record<string, string> = {
  'sans-apple':
    "system-ui, -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Noto Sans SC', sans-serif",
  'sans-sys': "'Segoe UI', 'Microsoft YaHei UI', 'Noto Sans SC', sans-serif",
  'sans-harmony': "'HarmonyOS Sans SC', 'HarmonyOS Sans', 'PingFang SC', 'Noto Sans SC', sans-serif",
  'sans-modern': "'MiSans', 'Alibaba PuHuiTi 3.0', 'PingFang SC', 'Noto Sans SC', sans-serif",
  'sans-grotesk': "'Helvetica Neue', Arial, 'Noto Sans SC', sans-serif",
  'sans-humanist': "'Source Sans 3', 'Noto Sans SC', 'Microsoft YaHei UI', sans-serif",
  'sans-tech': "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Courier New', monospace",
};

const WORD_SERIF_PRESET_FAMILIES: Record<string, string> = {
  'serif-source': "'Source Han Serif SC', 'Noto Serif SC', 'Songti SC', serif",
  'serif-traditional': "'Songti SC', SimSun, 'Noto Serif SC', serif",
  'serif-fangsong': "FangSong, STFangsong, 'Noto Serif SC', serif",
  'serif-kaiti': "'Kaiti SC', KaiTi, STKaiti, 'Noto Serif SC', serif",
  'serif-newspaper': "Constantia, 'Times New Roman', STSong, 'Noto Serif SC', serif",
  'serif-editorial': "Baskerville, 'Times New Roman', STSong, serif",
  'serif-georgia': "Georgia, Cambria, 'Noto Serif SC', serif",
};

interface PendingExportState {
  format: ExportFormat;
  fontSize?: number;
  initialSelectedMessageId?: string;
  attempt: number;
  url: string;
  status: 'clicking';
  timestamp: number;
}

function hashString(input: string): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function isExportFormat(value: unknown): value is ExportFormat {
  return value === 'json' || value === 'markdown' || value === 'pdf' || value === 'image';
}

function waitForElement(selector: string, timeoutMs: number = 6000): Promise<Element | null> {
  return new Promise((resolve) => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);
    const obs = new MutationObserver(() => {
      const found = document.querySelector(selector);
      if (found) {
        try {
          obs.disconnect();
        } catch {}
        resolve(found);
      }
    });
    try {
      obs.observe(document.body, { childList: true, subtree: true });
    } catch {}
    if (timeoutMs > 0)
      setTimeout(() => {
        try {
          obs.disconnect();
        } catch {}
        resolve(null);
      }, timeoutMs);
  });
}

function waitForAnyElement(
  selectors: string[],
  timeoutMs: number = 10000,
): Promise<Element | null> {
  return new Promise((resolve) => {
    // Check first
    for (const s of selectors) {
      const el = document.querySelector(s);
      if (el) return resolve(el);
    }

    const obs = new MutationObserver(() => {
      for (const s of selectors) {
        const found = document.querySelector(s);
        if (found) {
          try {
            obs.disconnect();
          } catch {}
          resolve(found);
          return;
        }
      }
    });

    try {
      obs.observe(document.body, { childList: true, subtree: true });
    } catch {}

    if (timeoutMs > 0)
      setTimeout(() => {
        try {
          obs.disconnect();
        } catch {}
        resolve(null);
      }, timeoutMs);
  });
}

function normalizeText(text: string | null): string {
  try {
    return String(text || '')
      .replace(/\s+/g, ' ')
      .trim();
  } catch {
    return '';
  }
}

// Note: cleaning of thinking toggles is handled at DOM level in extractAssistantText

/**
 * querySelector variant that skips elements nested inside model-thoughts / thoughts-container.
 * When the user expands Gemini's "thinking" section, a second `message-content` element
 * appears *before* the real response in DOM order.  A plain `querySelector` would match
 * the thinking panel first, causing exports to grab the wrong content.
 */
function queryOutsideThoughts<T extends Element = Element>(
  root: Element,
  selector: string,
): T | null {
  const candidates = root.querySelectorAll<T>(selector);
  for (const el of Array.from(candidates)) {
    if (!el.closest('model-thoughts, .thoughts-container, .thoughts-content')) {
      return el;
    }
  }
  return null;
}

function filterTopLevel(elements: Element[]): HTMLElement[] {
  const arr = elements.map((e) => e as HTMLElement);
  const out: HTMLElement[] = [];
  for (let i = 0; i < arr.length; i++) {
    const el = arr[i];
    let isDescendant = false;
    for (let j = 0; j < arr.length; j++) {
      if (i === j) continue;
      const other = arr[j];
      if (other.contains(el)) {
        isDescendant = true;
        break;
      }
    }
    if (!isDescendant) out.push(el);
  }
  return out;
}

function getConversationRoot(userSelectors: string[]): HTMLElement {
  return resolveConversationRoot({ userSelectors, doc: document });
}

function computeConversationId(): string {
  const raw = `${location.host}${location.pathname}${location.search}`;
  return `gemini:${hashString(raw)}`;
}

function getUserSelectors(): string[] {
  const configured = (() => {
    try {
      return (
        localStorage.getItem('geminiTimelineUserTurnSelector') ||
        localStorage.getItem('geminiTimelineUserTurnSelectorAuto') ||
        ''
      );
    } catch {
      return '';
    }
  })();
  const defaults = [
    '.user-query-bubble-with-background',
    '.user-query-bubble-container',
    '.user-query-container',
    'user-query-content .user-query-bubble-with-background',
    'div[aria-label="User message"]',
    'article[data-author="user"]',
    'article[data-turn="user"]',
    '[data-message-author-role="user"]',
    'div[role="listitem"][data-user="true"]',
  ];
  return configured ? [configured, ...defaults.filter((s) => s !== configured)] : defaults;
}

function getAssistantSelectors(): string[] {
  return [
    // Attribute-based roles
    '[aria-label="Gemini response"]',
    '[data-message-author-role="assistant"]',
    '[data-message-author-role="model"]',
    'article[data-author="assistant"]',
    'article[data-turn="assistant"]',
    'article[data-turn="model"]',
    // Common Gemini containers
    '.model-response, model-response',
    '.response-container',
    'div[role="listitem"]:not([data-user="true"])',
  ];
}

function dedupeByTextAndOffset(elements: HTMLElement[], firstTurnOffset: number): HTMLElement[] {
  const seen = new Set<string>();
  const out: HTMLElement[] = [];
  for (const el of elements) {
    const offsetFromStart = (el.offsetTop || 0) - firstTurnOffset;
    const key = `${normalizeText(el.textContent || '')}|${Math.round(offsetFromStart)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(el);
  }
  return out;
}

function ensureTurnId(el: Element, index: number): string {
  const asEl = el as HTMLElement & { dataset?: DOMStringMap & { turnId?: string } };
  let id = asEl.dataset?.turnId || '';
  if (!id) {
    const basis = normalizeText(asEl.textContent || '') || `user-${index}`;
    id = `u-${index}-${hashString(basis)}`;
    try {
      if (asEl.dataset) asEl.dataset.turnId = id;
    } catch {}
  }
  return id;
}

function readStarredSet(): Set<string> {
  const cid = computeConversationId();
  try {
    const raw = localStorage.getItem(`geminiTimelineStars:${cid}`);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.map((x: unknown) => String(x)));
  } catch {
    return new Set();
  }
}

function extractAssistantText(el: HTMLElement): string {
  // Prefer direct text from message container if available (connected to DOM)
  // Use queryOutsideThoughts to avoid matching the message-content inside
  // the expanded thinking/reasoning panel.
  try {
    const mc = queryOutsideThoughts<HTMLElement>(
      el,
      'message-content, .markdown, .markdown-main-panel',
    );
    if (mc) {
      const raw = mc.textContent || mc.innerText || '';
      const txt = normalizeText(raw);
      if (txt) return txt;
    }
  } catch {}

  // Clone and remove reasoning toggles/labels before reading text (detached fallback)
  const clone = el.cloneNode(true) as HTMLElement;
  const matchesReasonToggle = (txt: string): boolean => {
    const s = normalizeText(txt).toLowerCase();
    if (!s) return false;
    return (
      /^(show\s*(thinking|reasoning)|hide\s*(thinking|reasoning))$/i.test(s) ||
      /^(显示\s*(思路|推理)|隐藏\s*(思路|推理))$/u.test(s)
    );
  };
  const shouldDrop = (node: HTMLElement): boolean => {
    const role = (node.getAttribute('role') || '').toLowerCase();
    const aria = (node.getAttribute('aria-label') || '').toLowerCase();
    const txt = node.textContent || '';
    if (matchesReasonToggle(txt)) return true;
    if (role === 'button' && (/thinking|reasoning/i.test(txt) || /思路|推理/u.test(txt)))
      return true;
    if (/thinking|reasoning/i.test(aria) || /思路|推理/u.test(aria)) return true;
    return false;
  };
  try {
    const candidates = clone.querySelectorAll(
      'button, [role="button"], [aria-label], span, div, a',
    );
    candidates.forEach((n) => {
      const eln = n as HTMLElement;
      if (shouldDrop(eln)) eln.remove();
    });
  } catch {}
  const text = normalizeText(clone.innerText || clone.textContent || '');
  return text;
}

type ChatTurn = {
  turnId: string;
  user: string;
  assistant: string;
  starred: boolean;
  userElement?: HTMLElement;
  assistantElement?: HTMLElement;
  assistantHostElement?: HTMLElement;
};

function collectChatPairs(): ChatTurn[] {
  const userSelectors = getUserSelectors();
  const root = getConversationRoot(userSelectors);
  const assistantSelectors = getAssistantSelectors();
  const userNodeList = filterOutDeepResearchImmersiveNodes(
    Array.from(root.querySelectorAll<HTMLElement>(userSelectors.join(','))),
  );
  if (!userNodeList || userNodeList.length === 0) return [];
  let users = filterTopLevel(userNodeList);
  if (users.length === 0) return [];

  const firstOffset = (users[0] as HTMLElement).offsetTop || 0;
  users = dedupeByTextAndOffset(users, firstOffset);
  const userOffsets = users.map((el) => (el as HTMLElement).offsetTop || 0);

  const assistantsAll = filterOutDeepResearchImmersiveNodes(
    Array.from(root.querySelectorAll<HTMLElement>(assistantSelectors.join(','))),
  );
  const assistants = filterTopLevel(assistantsAll);
  const assistantOffsets = assistants.map((el) => (el as HTMLElement).offsetTop || 0);

  const starredSet = readStarredSet();
  const pairs: ChatTurn[] = [];
  for (let i = 0; i < users.length; i++) {
    const uEl = users[i] as HTMLElement;
    const uText = normalizeText(uEl.innerText || uEl.textContent || '');
    const start = userOffsets[i];
    const end = i + 1 < userOffsets.length ? userOffsets[i + 1] : Number.POSITIVE_INFINITY;
    let aText = '';
    let aEl: HTMLElement | null = null;
    let bestIdx = -1;
    let bestOff = Number.POSITIVE_INFINITY;
    for (let k = 0; k < assistants.length; k++) {
      const off = assistantOffsets[k];
      if (off >= start && off < end) {
        if (off < bestOff) {
          bestOff = off;
          bestIdx = k;
        }
      }
    }
    if (bestIdx >= 0) {
      aEl = assistants[bestIdx] as HTMLElement;
      aText = extractAssistantText(aEl);
    } else {
      // Fallback: search next siblings up to a small window
      let sib: HTMLElement | null = uEl;
      for (let step = 0; step < 8 && sib; step++) {
        sib = sib.nextElementSibling as HTMLElement | null;
        if (!sib) break;
        if (sib.matches(userSelectors.join(','))) break;
        if (sib.matches(assistantSelectors.join(','))) {
          aEl = sib;
          aText = extractAssistantText(sib);
          break;
        }
      }
    }
    const turnId = ensureTurnId(uEl, i);
    const starred = !!turnId && starredSet.has(turnId);
    if (uText || aText) {
      // Prefer a richer assistant container for downstream rich extraction
      let finalAssistantEl: HTMLElement | undefined = undefined;
      if (aEl) {
        const pick =
          queryOutsideThoughts<HTMLElement>(aEl, 'message-content') ||
          queryOutsideThoughts<HTMLElement>(aEl, '.markdown, .markdown-main-panel') ||
          (aEl.closest('.presented-response-container') as HTMLElement | null) ||
          queryOutsideThoughts<HTMLElement>(
            aEl,
            '.presented-response-container, .response-content',
          ) ||
          queryOutsideThoughts<HTMLElement>(aEl, 'response-element') ||
          aEl;
        finalAssistantEl = pick || undefined;
      }
      pairs.push({
        turnId,
        user: uText,
        assistant: aText,
        starred,
        userElement: uEl,
        assistantElement: finalAssistantEl,
        assistantHostElement: aEl || undefined,
      });
    }
  }
  return pairs;
}

type ExportMessageRole = 'user' | 'assistant';

type ExportMessage = {
  messageId: string;
  role: ExportMessageRole;
  hostElement: HTMLElement;
  exportElement?: HTMLElement;
  text: string;
  starred: boolean;
};

function buildExportMessagesFromPairs(pairs: ChatTurn[]): ExportMessage[] {
  const out: ExportMessage[] = [];
  pairs.forEach((pair) => {
    if (pair.userElement) {
      out.push({
        messageId: `${pair.turnId}:u`,
        role: 'user',
        hostElement: pair.userElement,
        exportElement: pair.userElement,
        text: pair.user,
        starred: pair.starred,
      });
    }

    const assistantHost = pair.assistantHostElement;
    if (assistantHost) {
      out.push({
        messageId: `${pair.turnId}:a`,
        role: 'assistant',
        hostElement: assistantHost,
        exportElement: pair.assistantElement || assistantHost,
        text: pair.assistant,
        starred: pair.starred,
      });
    }
  });
  return out;
}

function computeSortedMessages(pairsInput: ChatTurn[]): Array<ExportMessage & { absTop: number }> {
  const msgs = buildExportMessagesFromPairs(pairsInput);
  const withPos = msgs.map((message) => {
    const rect = message.hostElement.getBoundingClientRect();
    return {
      ...message,
      absTop: rect.top + window.scrollY,
    };
  });

  withPos.sort((a, b) => a.absTop - b.absTop);
  return withPos;
}

function buildTurnsForSelectedMessages(
  selectedMessages: readonly ExportMessage[],
): ExportChatTurn[] {
  const groupedTurns = groupSelectedMessagesByTurn(selectedMessages);
  return groupedTurns
    .map((turn) => ({
      user: turn.user?.text || '',
      assistant: turn.assistant?.text || '',
      starred: turn.starred,
      omitEmptySections: true,
      userElement: turn.user?.exportElement,
      assistantElement: turn.assistant?.exportElement,
    }))
    .filter(
      (turn) =>
        turn.user.length > 0 ||
        turn.assistant.length > 0 ||
        !!turn.userElement ||
        !!turn.assistantElement,
    );
}

function buildTurnsForSelectedMessageIds(
  selectedMessageIds: ReadonlySet<string>,
  pairsInput: ChatTurn[] = collectChatPairs(),
): ExportChatTurn[] {
  if (selectedMessageIds.size === 0) return [];
  const selectedMessages = computeSortedMessages(pairsInput).filter((message) =>
    selectedMessageIds.has(message.messageId),
  );
  return buildTurnsForSelectedMessages(selectedMessages);
}

function resolveAssistantMessageIdFromMenuTrigger(trigger: HTMLElement | null): string | null {
  if (!trigger) return null;

  const assistantHost = trigger.closest(
    [
      '.response-container',
      'response-container',
      '.model-response',
      'model-response',
      '[data-message-author-role="assistant"]',
      '[data-message-author-role="model"]',
      'article[data-author="assistant"]',
      'article[data-turn="assistant"]',
      'article[data-turn="model"]',
    ].join(', '),
  ) as HTMLElement | null;

  const messages = buildExportMessagesFromPairs(collectChatPairs()).filter(
    (message) => message.role === 'assistant',
  );

  if (assistantHost) {
    const target = messages.find((message) => {
      const host = message.hostElement;
      return (
        host === assistantHost ||
        host.contains(assistantHost) ||
        assistantHost.contains(host) ||
        host.contains(trigger)
      );
    });
    if (target) return target.messageId;
  }

  const fallback = messages.find((message) => {
    const host = message.hostElement;
    return host.contains(trigger) || trigger.contains(host);
  });

  return fallback?.messageId || null;
}

function ensureDropdownInjected(logoElement: Element): HTMLButtonElement | null {
  // Check if already injected
  const existingWrapper = document.querySelector('.gv-logo-dropdown-wrapper');
  if (existingWrapper) {
    return existingWrapper.querySelector('.gv-export-dropdown-btn') as HTMLButtonElement | null;
  }

  const logo = logoElement as HTMLElement;
  const parent = logo.parentElement;
  if (!parent) return null;

  // Create wrapper that will contain both logo and dropdown
  const wrapper = document.createElement('div');
  wrapper.className = 'gv-logo-dropdown-wrapper';

  // Move logo into wrapper
  parent.insertBefore(wrapper, logo);
  wrapper.appendChild(logo);

  // Create dropdown container
  const dropdown = document.createElement('div');
  dropdown.className = 'gv-logo-dropdown';

  // Create export button inside dropdown
  const btn = document.createElement('button');
  btn.className = 'gv-export-dropdown-btn';
  btn.type = 'button';
  btn.title = 'Export chat history';
  btn.setAttribute('aria-label', 'Export chat history');

  // Export icon
  const iconSpan = document.createElement('span');
  iconSpan.className = 'gv-export-dropdown-icon';
  btn.appendChild(iconSpan);

  // Export text label
  const labelSpan = document.createElement('span');
  labelSpan.className = 'gv-export-dropdown-label';
  labelSpan.textContent = 'Export';
  btn.appendChild(labelSpan);

  dropdown.appendChild(btn);
  wrapper.appendChild(dropdown);

  return btn;
}

async function loadDictionaries(): Promise<Record<AppLanguage, Record<string, string>>> {
  return TRANSLATIONS;
}

/**
 * Extract human-readable conversation title from the current page
 * Used for JSON/Markdown metadata so all formats share the same title.
 * Mirrors the logic used by PDFPrintService.getConversationTitle.
 */
function isMeaningfulConversationTitle(title: string | null | undefined): title is string {
  const t = (title || '').trim();
  if (!t) return false;
  if (
    t === 'Untitled Conversation' ||
    t === 'Gemini' ||
    t === 'Google Gemini' ||
    t === 'New chat'
  ) {
    return false;
  }
  if (t.startsWith('Gemini -')) return false;
  return true;
}

function extractConversationIdFromUrl(): string | null {
  const appMatch = window.location.pathname.match(/\/app\/([^/?#]+)/);
  if (appMatch?.[1]) return appMatch[1];
  const gemMatch = window.location.pathname.match(/\/gem\/[^/]+\/([^/?#]+)/);
  if (gemMatch?.[1]) return gemMatch[1];
  return null;
}

function extractConversationIdFromHref(href: string): string | null {
  if (!href) return null;
  try {
    const parsed = new URL(href, window.location.origin);
    const appMatch = parsed.pathname.match(/\/app\/([^/?#]+)/);
    if (appMatch?.[1]) return appMatch[1];
    const gemMatch = parsed.pathname.match(/\/gem\/[^/]+\/([^/?#]+)/);
    if (gemMatch?.[1]) return gemMatch[1];
    return null;
  } catch {
    return null;
  }
}

function isGemLabel(text: string | null | undefined): boolean {
  const t = (text || '').trim().toLowerCase();
  return t === 'gem' || t === 'gems';
}

function extractTitleFromLinkText(link?: HTMLAnchorElement | null): string | null {
  if (!link) return null;
  const text = (link.innerText || '').trim();
  if (!text) return null;
  const parts = text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !isGemLabel(s))
    .filter((s) => s.length >= 2);
  if (parts.length === 0) return null;
  return parts.reduce((a, b) => (b.length > a.length ? b : a), parts[0]) || null;
}

function extractTitleFromConversationElement(conversationEl: HTMLElement): string | null {
  const scope =
    (conversationEl.closest('[data-test-id="conversation"]') as HTMLElement) || conversationEl;
  const bySelector = scope.querySelector(
    '.gds-label-l, .conversation-title-text, [data-test-id="conversation-title"], h3',
  );
  const selectorTitle = bySelector?.textContent?.trim();
  if (isMeaningfulConversationTitle(selectorTitle) && !isGemLabel(selectorTitle)) {
    return selectorTitle;
  }

  const link = scope.querySelector(
    'a[href*="/app/"], a[href*="/gem/"]',
  ) as HTMLAnchorElement | null;
  const ariaTitle = link?.getAttribute('aria-label')?.trim();
  if (isMeaningfulConversationTitle(ariaTitle) && !isGemLabel(ariaTitle)) {
    return ariaTitle;
  }
  const linkTitle = link?.getAttribute('title')?.trim();
  if (isMeaningfulConversationTitle(linkTitle) && !isGemLabel(linkTitle)) {
    return linkTitle;
  }
  const fromLinkText = extractTitleFromLinkText(link);
  if (isMeaningfulConversationTitle(fromLinkText)) {
    return fromLinkText;
  }

  const label = scope.querySelector('.gds-body-m, .gds-label-m, .subtitle');
  const labelText = label?.textContent?.trim();
  if (isMeaningfulConversationTitle(labelText) && !isGemLabel(labelText)) {
    return labelText;
  }

  const raw = scope.textContent?.trim() || '';
  if (!raw) return null;
  const firstLine =
    raw
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)[0] || raw;
  if (isMeaningfulConversationTitle(firstLine) && !isGemLabel(firstLine)) {
    return firstLine.slice(0, 80);
  }

  return null;
}

function extractTitleFromNativeSidebarByConversationId(conversationId: string): string | null {
  const escapedConversationId = escapeCssAttributeValue(conversationId);
  const byJslog = document.querySelector(
    `[data-test-id="conversation"][jslog*="c_${escapedConversationId}"]`,
  ) as HTMLElement | null;
  if (byJslog) {
    const title = extractTitleFromConversationElement(byJslog);
    if (title) return title;
  }

  const byHrefLink = document.querySelector(
    `[data-test-id="conversation"] a[href*="${escapedConversationId}"]`,
  ) as HTMLElement | null;
  if (byHrefLink) {
    const title = extractTitleFromConversationElement(byHrefLink);
    if (title) return title;
  }

  return null;
}

function escapeCssAttributeValue(value: string): string {
  const escape = globalThis.CSS?.escape;
  if (typeof escape === 'function') {
    return escape(value);
  }
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function getConversationTitleForExport(): string {
  // Strategy 1: Get from active conversation in GeminiMate Folder UI (most accurate)
  try {
    const activeFolderTitle =
      document.querySelector(
        '.gv-folder-conversation.gv-folder-conversation-selected .gv-conversation-title',
      ) || document.querySelector('.gv-folder-conversation-selected .gv-conversation-title');

    if (activeFolderTitle?.textContent?.trim()) {
      return activeFolderTitle.textContent.trim();
    }
  } catch (error) {
    try {
      console.debug('[Export] Failed to get title from Folder Manager:', error);
    } catch {}
  }

  // Strategy 1b: Get from Gemini native sidebar via current conversation ID
  try {
    const conversationId = extractConversationIdFromUrl();
    if (conversationId) {
      const title = extractTitleFromNativeSidebarByConversationId(conversationId);
      if (title) return title;
    }
  } catch (error) {
    try {
      console.debug('[Export] Failed to get title from native sidebar by conversation id:', error);
    } catch {}
  }

  // Strategy 2: Try to get from page title
  const titleElement = document.querySelector('title');
  if (titleElement) {
    const title = titleElement.textContent?.trim();
    if (isMeaningfulConversationTitle(title)) {
      return title;
    }
  }

  // Strategy 3: Try to get from sidebar conversation list.
  try {
    const selectors = [
      'mat-list-item.mdc-list-item--activated [mat-line]',
      'mat-list-item[aria-current="page"] [mat-line]',
      '.conversation-list-item.active .conversation-title',
      '.active-conversation .title',
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      const title = element?.textContent?.trim();
      if (isMeaningfulConversationTitle(title)) {
        return title;
      }
    }
  } catch (error) {
    try {
      console.debug('[Export] Failed to get title from sidebar:', error);
    } catch {}
  }

  // Strategy 4: URL fallback
  const conversationId = extractConversationIdFromUrl();
  if (conversationId) {
    return `Conversation ${conversationId.slice(0, 8)}`;
  }

  return 'Untitled Conversation';
}

function findSidebarConversationLinkById(conversationId: string): HTMLAnchorElement | null {
  const escapedConversationId = escapeCssAttributeValue(conversationId);
  const byJslog = document.querySelector(
    `[data-test-id="conversation"][jslog*="c_${escapedConversationId}"] a[href]`,
  ) as HTMLAnchorElement | null;
  if (byJslog) return byJslog;

  const links = Array.from(
    document.querySelectorAll<HTMLAnchorElement>(
      '[data-test-id="conversation"] a[href], a[data-test-id="conversation"][href]',
    ),
  );
  for (const link of links) {
    if (extractConversationIdFromHref(link.href) === conversationId) {
      return link;
    }
  }

  return null;
}

function triggerNativeClick(target: HTMLElement): void {
  const opts = { bubbles: true, cancelable: true, view: window };
  target.dispatchEvent(new MouseEvent('pointerdown', opts));
  target.dispatchEvent(new MouseEvent('mousedown', opts));
  target.dispatchEvent(new MouseEvent('mouseup', opts));
  target.dispatchEvent(new MouseEvent('click', opts));
}

async function waitForConversationUrl(
  conversationId: string,
  timeoutMs: number = 10000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (extractConversationIdFromUrl() === conversationId) return true;
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  return false;
}

async function navigateToConversationAndWait(
  conversationId: string,
  fallbackUrl: string,
): Promise<boolean> {
  const currentConversationId = extractConversationIdFromUrl();
  if (currentConversationId === conversationId) {
    const existing = await waitForAnyElement(getUserSelectors(), 8000);
    return !!existing;
  }

  const link = findSidebarConversationLinkById(conversationId);
  if (link) {
    triggerNativeClick(link);
  } else if (fallbackUrl) {
    window.location.assign(fallbackUrl);
  } else {
    return false;
  }

  const routeReady = await waitForConversationUrl(conversationId, 12000);
  if (!routeReady) return false;
  const contentReady = await waitForAnyElement(getUserSelectors(), 15000);
  return !!contentReady;
}

async function exportFromSidebarConversationTrigger(
  trigger: HTMLElement,
  dict: Record<AppLanguage, Record<string, string>>,
  getCurrentLanguage: () => AppLanguage,
): Promise<void> {
  const target = resolveSidebarConversationTarget(trigger);
  if (!target) {
    alert('Unable to locate the selected conversation. Please open it first, then export.');
    return;
  }

  const ready = await navigateToConversationAndWait(target.conversationId, target.url);
  if (!ready) {
    alert('Failed to open the selected conversation for export. Please retry.');
    return;
  }

  await showExportDialog(dict, getCurrentLanguage());
}

function normalizeLang(lang: string | undefined): AppLanguage {
  return normalizeLanguage(lang);
}

function normalizeWordResponseExportMode(value: unknown): WordResponseExportMode {
  return value === 'academic' ? 'academic' : 'default';
}

async function refreshWordResponseExportSettings(): Promise<void> {
  try {
    const result = await chrome.storage.local.get([
      StorageKeys.WORD_RESPONSE_EXPORT_ENABLED,
      StorageKeys.WORD_RESPONSE_EXPORT_MODE,
    ]);
    wordResponseExportEnabled = result[StorageKeys.WORD_RESPONSE_EXPORT_ENABLED] !== false;
    wordResponseExportMode = normalizeWordResponseExportMode(
      result[StorageKeys.WORD_RESPONSE_EXPORT_MODE],
    );
  } catch {
    wordResponseExportEnabled = true;
    wordResponseExportMode = 'default';
  }
}

function resolveWordFontFamilyFromStorage(result: Record<string, unknown>): string {
  const family = String(result[StorageKeys.GEMINI_FONT_FAMILY] || 'default');
  if (family === 'sans') {
    const preset = String(result[StorageKeys.GEMINI_SANS_PRESET] || DEFAULT_WORD_SANS_PRESET);
    return WORD_SANS_PRESET_FAMILIES[preset] ?? WORD_SANS_PRESET_FAMILIES[DEFAULT_WORD_SANS_PRESET];
  }
  if (family === 'serif') {
    const preset = String(result[StorageKeys.GEMINI_SERIF_PRESET] || DEFAULT_WORD_SERIF_PRESET);
    return WORD_SERIF_PRESET_FAMILIES[preset] ?? WORD_SERIF_PRESET_FAMILIES[DEFAULT_WORD_SERIF_PRESET];
  }
  if (family === 'monospace') {
    return WORD_SANS_PRESET_FAMILIES['sans-tech'];
  }
  if (family === 'default') {
    return WORD_SANS_PRESET_FAMILIES[DEFAULT_WORD_SANS_PRESET];
  }
  return `'${family}', ${WORD_SANS_PRESET_FAMILIES[DEFAULT_WORD_SANS_PRESET]}`;
}

function resolveWordTypographyFromStorage(result: Record<string, unknown>): WordResponseTypography {
  return {
    fontFamily: resolveWordFontFamilyFromStorage(result),
    fontSizeScale: Number(result[StorageKeys.GEMINI_FONT_SIZE_SCALE]) || 100,
    fontWeight: Number(result[StorageKeys.GEMINI_FONT_WEIGHT]) || 400,
    letterSpacing: Number(result[StorageKeys.GEMINI_LETTER_SPACING]) || 0,
    lineHeight: Number(result[StorageKeys.GEMINI_LINE_HEIGHT]) || 0,
    paragraphIndentEnabled: result[StorageKeys.GEMINI_PARAGRAPH_INDENT_ENABLED] === true,
  };
}

type ResponseWordExportTexts = {
  label: string;
  success: string;
  failed: string;
  disabled: string;
  targetMissing: string;
};

function getResponseWordExportTexts(lang: AppLanguage): ResponseWordExportTexts {
  if (lang === 'zh') {
    return {
      label: '导出回复为 Word',
      success: '已导出 Word 文件',
      failed: '导出 Word 失败',
      disabled: '请先在设置中开启单条回复 Word 导出',
      targetMissing: '未找到可导出的回复内容',
    };
  }

  if (lang === 'zh_TW') {
    return {
      label: '匯出回覆為 Word',
      success: '已匯出 Word 檔案',
      failed: '匯出 Word 失敗',
      disabled: '請先在設定中啟用單條回覆 Word 匯出',
      targetMissing: '找不到可匯出的回覆內容',
    };
  }

  return {
    label: 'Export response as Word',
    success: 'Word file exported',
    failed: 'Failed to export Word file',
    disabled: 'Enable single response Word export in settings first',
    targetMissing: 'Unable to locate response content',
  };
}

async function getLanguage(): Promise<AppLanguage> {
  try {
    // Add timeout to prevent hanging in Firefox
    const stored = await Promise.race([
      new Promise<unknown>((resolve) => {
        try {
          const win = window as Window & {
            chrome?: {
              storage?: { sync?: { get: (key: string, cb: (r: unknown) => void) => void } };
            };
            browser?: { storage?: { sync?: { get: (key: string) => Promise<unknown> } } };
          };
          if (win.chrome?.storage?.sync?.get) {
            win.chrome.storage.sync.get(StorageKeys.LANGUAGE, resolve);
          } else if (win.browser?.storage?.sync?.get) {
            win.browser.storage.sync
              .get(StorageKeys.LANGUAGE)
              .then(resolve)
              .catch(() => resolve({}));
          } else {
            resolve({});
          }
        } catch {
          resolve({});
        }
      }),
      new Promise<unknown>((resolve) => setTimeout(() => resolve({}), 1000)),
    ]);
    const rec = stored && typeof stored === 'object' ? (stored as Record<string, unknown>) : {};
    const v =
      typeof rec[StorageKeys.LANGUAGE] === 'string'
        ? (rec[StorageKeys.LANGUAGE] as string)
        : undefined;
    return normalizeLang(v || navigator.language || 'en');
  } catch {
    return 'en';
  }
}

/**
 * Finds the top-most user message element in the DOM.
 */
function getTopUserElement(selectors: string[]): HTMLElement | null {
  const root = getConversationRoot(selectors);
  const all = filterOutDeepResearchImmersiveNodes(
    Array.from(root.querySelectorAll<HTMLElement>(selectors.join(','))),
  );
  if (!all.length) return null;
  const topLevel = filterTopLevel(all);
  return topLevel.length > 0 ? topLevel[0] : null;
}

function isElementVisibleForAlignment(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width < 24 || rect.height < 12) return false;

  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  const opacity = Number.parseFloat(style.opacity || '1');
  if (Number.isFinite(opacity) && opacity <= 0.01) return false;

  return true;
}

function isLikelySidebarElement(el: HTMLElement): boolean {
  if (
    el.closest(
      [
        '[data-test-id="side-nav"]',
        'side-navigation',
        'mat-sidenav',
        'aside',
        'nav',
        '.side-nav',
        '.sidenav',
        '.chat-history-nav',
      ].join(','),
    )
  ) {
    return true;
  }

  const rect = el.getBoundingClientRect();
  const isNarrow = rect.width > 0 && rect.width <= Math.max(380, window.innerWidth * 0.45);
  const isLeftRail = rect.left <= Math.max(40, window.innerWidth * 0.18);
  const isTall = rect.height >= window.innerHeight * 0.35;
  return isNarrow && isLeftRail && isTall;
}

function pickBestVisibleAlignmentTarget(
  selectors: string[],
  options?: {
    minWidth?: number;
    minHeight?: number;
    allowSidebar?: boolean;
  },
): HTMLElement | null {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(selectors.join(',')));
  let best: { el: HTMLElement; score: number } | null = null;
  const minWidth = options?.minWidth ?? 220;
  const minHeight = options?.minHeight ?? 24;
  const viewportCenter = window.innerWidth / 2;

  for (const candidate of candidates) {
    if (!candidate.isConnected) continue;
    if (!isElementVisibleForAlignment(candidate)) continue;
    if (!options?.allowSidebar && isLikelySidebarElement(candidate)) continue;

    const rect = candidate.getBoundingClientRect();
    if (rect.width < minWidth || rect.height < minHeight) continue;
    if (rect.bottom < -16 || rect.top > window.innerHeight + 16) continue;

    const center = rect.left + rect.width / 2;
    const area = rect.width * rect.height;
    const distancePenalty = Math.abs(center - viewportCenter) * 120;
    const score = area - distancePenalty;

    if (!best || score > best.score) {
      best = { el: candidate, score };
    }
  }

  return best?.el || null;
}

function resolveConversationCanvasCenterX(): number {
  const viewportCenter = window.innerWidth / 2;

  const canvasTarget = pickBestVisibleAlignmentTarget(
    [
      '#chat-history',
      'infinite-scroller.chat-history',
      '.chat-history-scroll-container',
      'chat-window-content',
      'main chat-window-content',
    ],
    {
      minWidth: Math.min(420, Math.max(280, window.innerWidth * 0.42)),
      minHeight: 80,
    },
  );
  if (canvasTarget) {
    const rect = canvasTarget.getBoundingClientRect();
    return rect.left + rect.width / 2;
  }

  const composerTarget = pickBestVisibleAlignmentTarget(
    [
      'rich-textarea',
      '[aria-label*="Enter a prompt"]',
      '[aria-label*="prompt"]',
      '[aria-label*="Gemini"]',
      '[contenteditable="true"][aria-label]',
    ],
    {
      minWidth: Math.min(460, Math.max(240, window.innerWidth * 0.28)),
      minHeight: 28,
    },
  );
  if (composerTarget) {
    const rect = composerTarget.getBoundingClientRect();
    return rect.left + rect.width / 2;
  }

  const selectors = getUserSelectors();
  const topUser = getTopUserElement(selectors);
  if (topUser && !isLikelySidebarElement(topUser)) {
    const rect = topUser.getBoundingClientRect();
    if (rect.width > 24) return rect.left + rect.width / 2;
  }

  const root = getConversationRoot(selectors);
  if (root && !isLikelySidebarElement(root)) {
    const rect = root.getBoundingClientRect();
    if (rect.width > Math.max(300, window.innerWidth * 0.42)) return rect.left + rect.width / 2;
  }

  const main = document.querySelector<HTMLElement>('main');
  if (main && !isLikelySidebarElement(main)) {
    const rect = main.getBoundingClientRect();
    if (rect.width > 24) return rect.left + rect.width / 2;
  }

  return viewportCenter;
}

function alignElementToConversationTitleCenter(element: HTMLElement): () => void {
  const apply = () => {
    if (window.innerWidth <= 640) {
      element.style.removeProperty('left');
      element.style.removeProperty('transform');
      return;
    }

    const rawCenter = resolveConversationCanvasCenterX();
    const safeMargin = 24;
    const clampedCenter = Math.round(
      Math.max(safeMargin, Math.min(window.innerWidth - safeMargin, rawCenter)),
    );
    element.style.left = `${clampedCenter}px`;
    element.style.transform = 'translateX(-50%)';
  };

  apply();
  const resizeHandler = () => apply();
  window.addEventListener('resize', resizeHandler);
  const timeoutId = window.setTimeout(apply, 220);

  return () => {
    window.removeEventListener('resize', resizeHandler);
    window.clearTimeout(timeoutId);
  };
}

/**
 * Executes the export sequence:
 * 1. Find top node and click it.
 * 2. Wait to see if refresh happens.
 * 3. If refresh -> script dies, on load we resume.
 * 4. If no refresh -> we are stable, proceed to export.
 */
async function executeExportSequence(
  format: ExportFormat,
  dict: Record<AppLanguage, Record<string, string>>,
  lang: AppLanguage,
  paramState?: PendingExportState,
  fontSize?: number,
  initialSelectedMessageId?: string,
): Promise<void> {
  const state: PendingExportState = paramState || {
    format,
    fontSize,
    initialSelectedMessageId,
    attempt: 0,
    url: location.href,
    status: 'clicking',
    timestamp: Date.now(),
  };

  if (state.attempt > 25) {
    console.warn('[GeminiMate] Export aborted: too many attempts.');
    sessionStorage.removeItem(SESSION_KEY_PENDING_EXPORT);
    alert('Export stopped: Too many attempts detected.');
    return;
  }

  // 1. Find Top Node
  if (state.attempt > 0) {
    console.log('[GeminiMate] Resuming export... waiting for content load.');
    const userSelectors = getUserSelectors();
    await waitForAnyElement(userSelectors, 15000);
  }

  // Wait a bit if we just reloaded
  const userSelectors = getUserSelectors();
  let topNode = getTopUserElement(userSelectors);
  if (!topNode) {
    await waitForElement('body', 2000);
    const pairs = collectChatPairs();
    if (pairs.length > 0 && pairs[0].userElement) {
      topNode = pairs[0].userElement;
    }
  }

  if (!topNode) {
    console.log('[GeminiMate] No top node found, proceeding to export directly.');
    sessionStorage.removeItem(SESSION_KEY_PENDING_EXPORT);
    await performFinalExport(format, dict, lang, state.fontSize, state.initialSelectedMessageId);
    return;
  }

  const fingerprintSelectors = [...getUserSelectors(), ...getAssistantSelectors()];
  const beforeFingerprint = computeConversationFingerprint(document.body, fingerprintSelectors, 10);

  console.log(`[GeminiMate] Simulating click on top node (Attempt ${state.attempt + 1})...`);

  // Update state before action to persist across potential reload
  sessionStorage.setItem(
    SESSION_KEY_PENDING_EXPORT,
    JSON.stringify({ ...state, attempt: state.attempt + 1, timestamp: Date.now() }),
  );

  // Dispatch click logic
  try {
    topNode.scrollIntoView({ behavior: 'auto', block: 'center' });
    const opts = { bubbles: true, cancelable: true, view: window };
    topNode.dispatchEvent(new MouseEvent('mousedown', opts));
    topNode.dispatchEvent(new MouseEvent('mouseup', opts));
    topNode.click();
  } catch (e) {
    console.error('[GeminiMate] Failed to click top node:', e);
  }

  // 2. Wait for either hard refresh (page unload) OR a "soft refresh" that loads more history.
  // If the page unloads, the script stops and `checkPendingExport()` resumes on next load via sessionStorage.
  const { changed } = await waitForConversationFingerprintChangeOrTimeout(
    document.body,
    fingerprintSelectors,
    beforeFingerprint,
    EXPORT_PRELOAD_WAIT_OPTIONS,
  );

  if (changed) {
    console.log('[GeminiMate] History expanded (soft refresh). Clicking top node again...');
    await executeExportSequence(format, dict, lang, {
      ...state,
      attempt: state.attempt + 1,
      timestamp: Date.now(),
    });
    return;
  }

  console.log('[GeminiMate] No refresh or update detected. Exporting...');
  sessionStorage.removeItem(SESSION_KEY_PENDING_EXPORT);
  await performFinalExport(format, dict, lang, state.fontSize, state.initialSelectedMessageId);
}

async function executeExportSequenceWithProgress(
  format: ExportFormat,
  dict: Record<AppLanguage, Record<string, string>>,
  lang: AppLanguage,
  paramState?: PendingExportState,
  fontSize?: number,
  initialSelectedMessageId?: string,
): Promise<void> {
  const t = (key: TranslationKey) => dict[lang]?.[key] ?? dict.en?.[key] ?? key;
  const hideProgress = showExportProgressOverlay(t);
  try {
    await executeExportSequence(format, dict, lang, paramState, fontSize, initialSelectedMessageId);
  } finally {
    hideProgress();
  }
}

/**
 * Performs the actual file generation and download.
 */
async function performFinalExport(
  format: ExportFormat,
  dict: Record<AppLanguage, Record<string, string>>,
  lang: AppLanguage,
  fontSize?: number,
  initialSelectedMessageId?: string,
) {
  const t = (key: TranslationKey) => dict[lang]?.[key] ?? dict.en?.[key] ?? key;

  await new Promise((r) => setTimeout(r, FINAL_EXPORT_PREPARE_DELAY_MS));

  const pairs = collectChatPairs();
  const messages = buildExportMessagesFromPairs(pairs);
  if (messages.length === 0) {
    alert(t('export_dialog_warning'));
    return;
  }

  const selectedIds = new Set<string>();
  let allMessageIds: string[] = [];
  const cleanupTasks: Array<() => void> = [];
  const idToHost = new Map<string, HTMLElement>();
  const idToCheckbox = new Map<string, HTMLButtonElement>();
  const knownIds = new Set<string>();
  let pendingInitialSelectionId: string | null = initialSelectedMessageId || null;

  let autoSelectAll = false;

  const cleanup = () => {
    cleanupTasks.forEach((fn) => {
      try {
        fn();
      } catch {}
    });
    cleanupTasks.length = 0;
  };

  const setSelected = (id: string, next: boolean) => {
    if (next) selectedIds.add(id);
    else selectedIds.delete(id);

    const btn = idToCheckbox.get(id);
    if (btn) {
      btn.setAttribute('aria-pressed', next ? 'true' : 'false');
      btn.dataset.selected = next ? 'true' : 'false';
    }
    const host = idToHost.get(id);
    if (host) {
      if (next) host.classList.add('gv-export-msg-selected');
      else host.classList.remove('gv-export-msg-selected');
    }
  };

  const updateBottomBar = (bar: HTMLElement) => {
    const countEl = bar.querySelector(
      '[data-gv-export-selection-count="true"]',
    ) as HTMLElement | null;
    if (countEl) {
      countEl.textContent = t('export_select_mode_count').replace(
        '{count}',
        String(selectedIds.size),
      );
    }

    const exportBtn = bar.querySelector(
      '[data-gv-export-action="export"]',
    ) as HTMLButtonElement | null;
    if (exportBtn) {
      exportBtn.disabled = selectedIds.size === 0;
    }

    const selectAllBtn = bar.querySelector(
      '[data-gv-export-action="selectAll"]',
    ) as HTMLButtonElement | null;
    if (selectAllBtn) {
      const isAllSelected = allMessageIds.length > 0 && selectedIds.size === allMessageIds.length;
      selectAllBtn.dataset.checked = isAllSelected ? 'true' : 'false';
    }
  };

  const attachSelectorIfNeeded = (msg: ExportMessage) => {
    if (knownIds.has(msg.messageId)) return;
    knownIds.add(msg.messageId);

    const host = msg.hostElement;
    idToHost.set(msg.messageId, host);
    host.classList.add('gv-export-msg-host');
    cleanupTasks.push(() => host.classList.remove('gv-export-msg-host'));

    const selector = document.createElement('div');
    selector.className = 'gv-export-msg-selector';
    selector.dataset.gvExportMessageId = msg.messageId;

    const checkbox = document.createElement('button');
    checkbox.type = 'button';
    checkbox.className = 'gv-export-msg-checkbox';
    checkbox.setAttribute('aria-pressed', 'false');
    checkbox.title = t('export_select_mode_toggle');

    const mark = document.createElement('span');
    mark.className = 'gv-export-msg-checkbox-mark';
    checkbox.appendChild(mark);

    const swallow = (ev: Event) => {
      try {
        ev.preventDefault();
      } catch {}
      try {
        ev.stopPropagation();
      } catch {}
    };

    const toggleSelection = () => {
      autoSelectAll = false;
      const next = !selectedIds.has(msg.messageId);
      setSelected(msg.messageId, next);
      const bar = document.querySelector(
        '[data-gv-export-select-bar="true"]',
      ) as HTMLElement | null;
      if (bar) updateBottomBar(bar);
    };

    checkbox.addEventListener('click', (ev) => {
      swallow(ev);
      toggleSelection();
    });

    host.addEventListener('click', toggleSelection);
    cleanupTasks.push(() => host.removeEventListener('click', toggleSelection));

    selector.appendChild(checkbox);
    host.appendChild(selector);
    cleanupTasks.push(() => selector.remove());

    idToCheckbox.set(msg.messageId, checkbox);
  };

  const syncMessages = (pairsInput: ChatTurn[]) => {
    const sorted = computeSortedMessages(pairsInput);
    allMessageIds = sorted.map((m) => m.messageId);

    sorted.forEach((m) => attachSelectorIfNeeded(m));

    // Auto-select new messages when a policy is active.
    if (autoSelectAll) {
      for (const id of allMessageIds) setSelected(id, true);
    }

    const initialSelected = resolveInitialSelectedMessageIds(
      allMessageIds,
      pendingInitialSelectionId,
    );
    if (initialSelected.size > 0) {
      initialSelected.forEach((id) => setSelected(id, true));
      pendingInitialSelectionId = null;
    }
  };

  // Selection mode body class
  document.body.classList.add('gv-export-select-mode');
  cleanupTasks.push(() => document.body.classList.remove('gv-export-select-mode'));

  // Bottom action bar
  const bar = document.createElement('div');
  bar.className = 'gv-export-select-bar';
  bar.dataset.gvExportSelectBar = 'true';

  const selectAllBtn = document.createElement('button');
  selectAllBtn.type = 'button';
  selectAllBtn.className = 'gv-export-select-all-toggle';
  selectAllBtn.dataset.gvExportAction = 'selectAll';
  selectAllBtn.textContent = t('export_select_mode_select_all');

  const count = document.createElement('div');
  count.className = 'gv-export-select-count';
  count.dataset.gvExportSelectionCount = 'true';
  count.textContent = t('export_select_mode_count').replace('{count}', '0');

  const exportBtn = document.createElement('button');
  exportBtn.type = 'button';
  exportBtn.className = 'gv-export-select-export-btn';
  exportBtn.dataset.gvExportAction = 'export';
  exportBtn.textContent = t('pm_export');
  exportBtn.disabled = true;

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'gv-export-select-cancel-btn';
  cancelBtn.title = t('pm_cancel');
  cancelBtn.textContent = '×';

  bar.appendChild(selectAllBtn);
  bar.appendChild(count);
  bar.appendChild(exportBtn);
  bar.appendChild(cancelBtn);

  document.body.appendChild(bar);
  cleanupTasks.push(() => bar.remove());
  cleanupTasks.push(alignElementToConversationTitleCenter(bar));

  const swallow = (ev: Event) => {
    try {
      ev.preventDefault();
    } catch {}
    try {
      ev.stopPropagation();
    } catch {}
  };

  selectAllBtn.addEventListener('click', (ev) => {
    swallow(ev);
    const isAllSelected = allMessageIds.length > 0 && selectedIds.size === allMessageIds.length;
    if (isAllSelected) {
      selectedIds.clear();
      autoSelectAll = false;
      allMessageIds.forEach((id) => setSelected(id, false));
    } else {
      selectedIds.clear();
      autoSelectAll = true;
      allMessageIds.forEach((id) => setSelected(id, true));
    }
    updateBottomBar(bar);
  });

  const finish = () => {
    allMessageIds.forEach((id) => setSelected(id, false));
    selectedIds.clear();
    autoSelectAll = false;
    cleanup();
  };

  cancelBtn.addEventListener('click', (ev) => {
    swallow(ev);
    finish();
  });

  exportBtn.addEventListener('click', async (ev) => {
    swallow(ev);
    if (selectedIds.size === 0) {
      alert(t('export_select_mode_empty'));
      return;
    }

    const turnsForExport = buildTurnsForSelectedMessageIds(selectedIds, collectChatPairs());
    if (turnsForExport.length === 0) {
      alert(t('export_select_mode_empty'));
      return;
    }

    // Cleanup before export so selection UI isn't captured.
    finish();

    const metadata: ConversationMetadata = {
      url: location.href,
      exportedAt: new Date().toISOString(),
      count: turnsForExport.length,
      title: getConversationTitleForExport(),
    };

    let includeImageSource = true;
    if (format === 'markdown') {
      const hasSearchImages = turnsForExport.some(
        (turn) =>
          turn.assistantElement?.querySelector('.attachment-container.search-images') != null,
      );
      if (hasSearchImages) {
        includeImageSource = confirm(t('export_md_include_source_confirm'));
      }
    }

    const hideProgress = showExportProgressOverlay(t);
    try {
      const resultPromise = ConversationExportService.export(turnsForExport, metadata, {
        format,
        fontSize,
        includeImageSource,
      });
      const minVisiblePromise = new Promise((resolve) => setTimeout(resolve, 420));
      const [result] = await Promise.all([resultPromise, minVisiblePromise]);

      if (!result.success) {
        alert(resolveExportErrorMessage(result.error, t));
      } else if (format === 'pdf' && isSafari()) {
        showExportToast(t('export_toast_safari_pdf_ready'), { autoDismissMs: 5000 });
      }
    } catch (err) {
      console.error('[GeminiMate] Export error:', err);
      alert('Export error occurred.');
    } finally {
      hideProgress();
    }
  });

  // Observe new lazy-loaded messages while selection mode is active.
  const root = getConversationRoot(getUserSelectors());
  let refreshTimer: number | null = null;
  const scheduleRefresh = () => {
    if (refreshTimer) return;
    refreshTimer = window.setTimeout(() => {
      refreshTimer = null;
      try {
        syncMessages(collectChatPairs());
        updateBottomBar(bar);
      } catch {}
    }, 250);
  };

  const obs = new MutationObserver(() => scheduleRefresh());
  try {
    obs.observe(root, { childList: true, subtree: true });
    cleanupTasks.push(() => obs.disconnect());
  } catch {}

  // Escape to cancel
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      finish();
      document.removeEventListener('keydown', onKeyDown);
    }
  };
  document.addEventListener('keydown', onKeyDown);
  cleanupTasks.push(() => document.removeEventListener('keydown', onKeyDown));

  // Initial sync
  syncMessages(pairs);
  updateBottomBar(bar);
}

function showExportProgressOverlay(t: (key: TranslationKey) => string): () => void {
  const overlay = document.createElement('div');
  overlay.className = 'gv-export-progress-overlay';

  const card = document.createElement('div');
  card.className = 'gv-export-progress-card';

  const spinner = document.createElement('div');
  spinner.className = 'gv-export-progress-spinner';

  const title = document.createElement('div');
  title.className = 'gv-export-progress-title';
  title.textContent = `${t('pm_export')}...`;

  const desc = document.createElement('div');
  desc.className = 'gv-export-progress-desc';
  desc.textContent = t('loading');

  card.appendChild(spinner);
  card.appendChild(title);
  card.appendChild(desc);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  const unbindAlignment = alignElementToConversationTitleCenter(overlay);

  return () => {
    unbindAlignment();
    try {
      overlay.remove();
    } catch {}
  };
}

/**
 * Check if there is a pending export operation from a previous page load.
 */
async function checkPendingExport() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY_PENDING_EXPORT);
    if (!raw) return;

    const parsed = JSON.parse(raw) as Partial<PendingExportState>;
    if (
      !isExportFormat(parsed.format) ||
      typeof parsed.attempt !== 'number' ||
      typeof parsed.url !== 'string' ||
      parsed.status !== 'clicking' ||
      typeof parsed.timestamp !== 'number'
    ) {
      sessionStorage.removeItem(SESSION_KEY_PENDING_EXPORT);
      return;
    }
    const state: PendingExportState = {
      format: parsed.format,
      fontSize: typeof parsed.fontSize === 'number' ? parsed.fontSize : undefined,
      initialSelectedMessageId:
        typeof parsed.initialSelectedMessageId === 'string'
          ? parsed.initialSelectedMessageId
          : undefined,
      attempt: parsed.attempt,
      url: parsed.url,
      status: parsed.status,
      timestamp: parsed.timestamp,
    };

    // Validate context
    if (state.url !== location.href) {
      // User navigated away? Abort.
      sessionStorage.removeItem(SESSION_KEY_PENDING_EXPORT);
      return;
    }

    // If state exists, it means we clicked and page refreshed.
    // So we resume the sequence.
    console.log('[GeminiMate] Resuming pending export sequence...');

    // We need i18n for final export/alert
    const dict = await loadDictionaries();
    const lang = await getLanguage();

    await executeExportSequenceWithProgress(state.format, dict, lang, state);
  } catch (e) {
    console.error('[GeminiMate] Failed to resume pending export:', e);
    sessionStorage.removeItem(SESSION_KEY_PENDING_EXPORT);
  }
}

function getConversationMenuPanelsFromNode(node: HTMLElement): HTMLElement[] {
  const panels: HTMLElement[] = [];
  if (node.matches(CONVERSATION_MENU_SELECTOR)) {
    panels.push(node);
  }
  panels.push(...Array.from(node.querySelectorAll<HTMLElement>(CONVERSATION_MENU_SELECTOR)));
  return panels;
}

function parseMenuTriggerPanelIds(trigger: HTMLElement): string[] {
  const raw = `${trigger.getAttribute('aria-controls') || ''} ${
    trigger.getAttribute('aria-owns') || ''
  }`;
  return raw
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

type ResponseCopyImageTexts = {
  label: string;
  copied: string;
  downloaded: string;
  failed: string;
  unsupported: string;
  targetMissing: string;
};

function getResponseCopyImageTexts(lang: AppLanguage): ResponseCopyImageTexts {
  if (lang === 'zh') {
    return {
      label: '复制回复为图片',
      copied: '已复制回复图片',
      downloaded: '已下载回复图片（Safari 剪贴板限制）',
      failed: '复制回复图片失败',
      unsupported: '当前浏览器不支持复制图片到剪贴板',
      targetMissing: '未找到可复制的回复内容',
    };
  }

  if (lang === 'zh_TW') {
    return {
      label: '複製回覆為圖片',
      copied: '已複製回覆圖片',
      downloaded: '已下載回覆圖片（Safari 剪貼簿限制）',
      failed: '複製回覆圖片失敗',
      unsupported: '目前瀏覽器不支援將圖片複製到剪貼簿',
      targetMissing: '找不到可複製的回覆內容',
    };
  }

  return {
    label: 'Copy response as image',
    copied: 'Response image copied',
    downloaded: 'Downloaded response image (Safari clipboard limitation)',
    failed: 'Failed to copy response image',
    unsupported: 'Clipboard image copy is not supported in this browser',
    targetMissing: 'Unable to locate response content',
  };
}

function buildResponseImageFilename(): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `gemini-response-${stamp}.png`;
}

function isUnsupportedClipboardError(error: unknown): boolean {
  if (error instanceof DOMException) {
    const name = error.name.toLowerCase();
    if (name === 'notallowederror' || name === 'notsupportederror' || name === 'securityerror') {
      return true;
    }
  }

  if (!(error instanceof Error)) return false;

  if (/clipboard image copy is not supported/i.test(error.message)) {
    return true;
  }

  const lowerMessage = error.message.toLowerCase();
  return (
    lowerMessage.includes('clipboard') &&
    (lowerMessage.includes('not allowed') ||
      lowerMessage.includes('permission') ||
      lowerMessage.includes('gesture') ||
      lowerMessage.includes('unsupported'))
  );
}

async function handleResponseCopyImageClick(
  trigger: HTMLElement,
  getCurrentLanguage: () => AppLanguage,
): Promise<void> {
  if (trigger.dataset.gvCopyImageBusy === '1') {
    return;
  }
  trigger.dataset.gvCopyImageBusy = '1';

  const texts = getResponseCopyImageTexts(getCurrentLanguage());
  const messageId = resolveAssistantMessageIdFromMenuTrigger(trigger);
  let blobForFallback: Blob | null = null;
  try {
    if (!messageId) {
      showExportToast(texts.targetMissing);
      return;
    }

    const selectedMessageIds = new Set<string>([messageId]);
    const turnsForExport = buildTurnsForSelectedMessageIds(selectedMessageIds, collectChatPairs());
    if (turnsForExport.length === 0) {
      showExportToast(texts.targetMissing);
      return;
    }

    const metadata: ConversationMetadata = {
      url: location.href,
      exportedAt: new Date().toISOString(),
      count: turnsForExport.length,
      title: getConversationTitleForExport(),
    };

    const blob = await ImageExportService.renderConversationBlob(turnsForExport, metadata, {});
    blobForFallback = blob;
    await copyImageBlobToClipboard(blob);
    showExportToast(texts.copied);
  } catch (error) {
    if (isSafari() && blobForFallback) {
      downloadImageBlob(blobForFallback, buildResponseImageFilename());
      showExportToast(texts.downloaded, { autoDismissMs: 3200 });
      return;
    }
    if (isUnsupportedClipboardError(error)) {
      showExportToast(texts.unsupported, { autoDismissMs: 3200 });
      return;
    }
    console.error('[GeminiMate] Failed to copy response image:', error);
    showExportToast(texts.failed, { autoDismissMs: 3200 });
  } finally {
    delete trigger.dataset.gvCopyImageBusy;
  }
}

async function handleResponseWordExportClick(
  trigger: HTMLElement,
  getCurrentLanguage: () => AppLanguage,
): Promise<void> {
  if (trigger.dataset.gvWordExportBusy === '1') return;
  trigger.dataset.gvWordExportBusy = '1';

  const texts = getResponseWordExportTexts(getCurrentLanguage());
  try {
    if (!wordResponseExportEnabled) {
      showExportToast(texts.disabled, { autoDismissMs: 2800 });
      return;
    }

    const messageId = resolveAssistantMessageIdFromMenuTrigger(trigger);
    if (!messageId) {
      showExportToast(texts.targetMissing);
      return;
    }

    const selectedMessageIds = new Set<string>([messageId]);
    const turns = buildTurnsForSelectedMessageIds(selectedMessageIds, collectChatPairs());
    const targetTurn = turns.find((turn) => turn.assistantElement || turn.assistant.trim());
    if (!targetTurn) {
      showExportToast(texts.targetMissing);
      return;
    }

    const typographyKeys = [
      StorageKeys.GEMINI_FONT_SIZE_SCALE,
      StorageKeys.GEMINI_FONT_WEIGHT,
      StorageKeys.GEMINI_FONT_FAMILY,
      StorageKeys.GEMINI_SANS_PRESET,
      StorageKeys.GEMINI_SERIF_PRESET,
      StorageKeys.GEMINI_LETTER_SPACING,
      StorageKeys.GEMINI_LINE_HEIGHT,
      StorageKeys.GEMINI_PARAGRAPH_INDENT_ENABLED,
      StorageKeys.GEMINI_EMPHASIS_MODE,
      StorageKeys.WORD_RESPONSE_EXPORT_MODE,
    ];
    const styleSettings = (await chrome.storage.local.get(typographyKeys)) as Record<string, unknown>;
    const effectiveWordMode =
      styleSettings[StorageKeys.WORD_RESPONSE_EXPORT_MODE] === undefined
        ? wordResponseExportMode
        : normalizeWordResponseExportMode(styleSettings[StorageKeys.WORD_RESPONSE_EXPORT_MODE]);
    const extracted = targetTurn.assistantElement
      ? DOMContentExtractor.extractAssistantContent(targetTurn.assistantElement)
      : {
          text: targetTurn.assistant,
          html: '',
        };

    const exportResult = WordResponseExportService.exportSingleResponse({
      assistantHtml: extracted.html || '',
      assistantText: extracted.text || targetTurn.assistant,
      conversationTitle: getConversationTitleForExport(),
      mode: effectiveWordMode,
      emphasisMode:
        styleSettings[StorageKeys.GEMINI_EMPHASIS_MODE] === 'underline'
          ? ('underline' as WordResponseEmphasisMode)
          : ('bold' as WordResponseEmphasisMode),
      typography: resolveWordTypographyFromStorage(styleSettings),
    });

    if (!exportResult.success) {
      showExportToast(texts.failed, { autoDismissMs: 3200 });
      return;
    }

    showExportToast(texts.success);
  } catch (error) {
    console.error('[GeminiMate] Failed to export Word response:', error);
    showExportToast(texts.failed, { autoDismissMs: 3200 });
  } finally {
    delete trigger.dataset.gvWordExportBusy;
  }
}

function applyResponseActionButtons(getCurrentLanguage: () => AppLanguage): void {
  const texts = getResponseCopyImageTexts(getCurrentLanguage());
  injectResponseActionCopyImageButtons(document, {
    label: texts.label,
    tooltip: texts.label,
    onClick: (button) => {
      void handleResponseCopyImageClick(button, getCurrentLanguage);
    },
  });

  if (!wordResponseExportEnabled) {
    document
      .querySelectorAll(`[data-test-id="${WORD_EXPORT_BUTTON_TEST_ID}"]`)
      .forEach((node) => node.remove());
    return;
  }

  const wordTexts = getResponseWordExportTexts(getCurrentLanguage());
  injectResponseActionWordButtons(document, {
    label: wordTexts.label,
    tooltip: wordTexts.label,
    onClick: (button) => {
      void handleResponseWordExportClick(button, getCurrentLanguage);
    },
  });
}

function setupResponseActionCopyImageObserver({
  getCurrentLanguage,
}: {
  getCurrentLanguage: () => AppLanguage;
}): void {
  applyResponseActionButtons(getCurrentLanguage);
  if (responseActionObserver) return;

  const hasResponseActionMenuButton = (node: HTMLElement): boolean => {
    if (node.getAttribute('data-test-id') === RESPONSE_MENU_TRIGGER_TEST_ID) return true;
    return node.querySelector(`[data-test-id="${RESPONSE_MENU_TRIGGER_TEST_ID}"]`) !== null;
  };

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (!hasResponseActionMenuButton(node)) return;
        const texts = getResponseCopyImageTexts(getCurrentLanguage());
        injectResponseActionCopyImageButtons(node, {
          label: texts.label,
          tooltip: texts.label,
          onClick: (button) => {
            void handleResponseCopyImageClick(button, getCurrentLanguage);
          },
        });

        if (!wordResponseExportEnabled) {
          node
            .querySelectorAll(`[data-test-id="${WORD_EXPORT_BUTTON_TEST_ID}"]`)
            .forEach((wordButton) => wordButton.remove());
          return;
        }

        const wordTexts = getResponseWordExportTexts(getCurrentLanguage());
        injectResponseActionWordButtons(node, {
          label: wordTexts.label,
          tooltip: wordTexts.label,
          onClick: (button) => {
            void handleResponseWordExportClick(button, getCurrentLanguage);
          },
        });
      });
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  responseActionObserver = observer;

  window.addEventListener(
    'beforeunload',
    () => {
      try {
        responseActionObserver?.disconnect();
      } catch {}
      responseActionObserver = null;
    },
    { once: true },
  );
}

function setupConversationMenuExportObserver({
  dict,
  getCurrentLanguage,
  onExport,
}: {
  dict: Record<AppLanguage, Record<string, string>>;
  getCurrentLanguage: () => AppLanguage;
  onExport: (context: {
    menuType: 'top' | 'sidebar' | 'message';
    trigger: HTMLElement | null;
  }) => void;
}): void {
  if (conversationMenuObserver) return;

  const tryInjectOnPanel = (
    menuPanel: HTMLElement,
    retriesLeft: number = MENU_INJECTION_RETRY_LIMIT,
  ) => {
    if (!menuPanel.isConnected) return;
    const currentLang = getCurrentLanguage();
    const label =
      dict[currentLang]?.['exportChatJson'] ??
      dict.en?.['exportChatJson'] ??
      'Export conversation history';
    const tooltip =
      dict[currentLang]?.['exportChatJson'] ??
      dict.en?.['exportChatJson'] ??
      'Export conversation history';

    const menuContext = getConversationMenuContext(menuPanel);
    if (menuContext) {
      const injected = injectConversationMenuExportButton(menuPanel, {
        label,
        tooltip,
        onClick: () => onExport(menuContext),
      });
      if (!injected && retriesLeft > 0) {
        window.setTimeout(
          () => tryInjectOnPanel(menuPanel, retriesLeft - 1),
          MENU_INJECTION_RETRY_DELAY_MS,
        );
      }
      return;
    }

    const responseMenuContext = getResponseMenuContext(menuPanel);
    if (responseMenuContext) {
      const injected = injectResponseMenuExportButton(menuPanel, {
        label,
        tooltip,
        onClick: () =>
          onExport({
            menuType: 'message',
            trigger: responseMenuContext.trigger,
          }),
      });
      if (!injected && retriesLeft > 0) {
        window.setTimeout(
          () => tryInjectOnPanel(menuPanel, retriesLeft - 1),
          MENU_INJECTION_RETRY_DELAY_MS,
        );
      }
      return;
    }

    if (retriesLeft > 0) {
      window.setTimeout(
        () => tryInjectOnPanel(menuPanel, retriesLeft - 1),
        MENU_INJECTION_RETRY_DELAY_MS,
      );
    }
  };

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        const panelSet = new Set<HTMLElement>();
        const panels = getConversationMenuPanelsFromNode(node);
        panels.forEach((panel) => panelSet.add(panel));
        const closestPanel = node.closest(CONVERSATION_MENU_SELECTOR) as HTMLElement | null;
        if (closestPanel) panelSet.add(closestPanel);
        panelSet.forEach((panel) => {
          window.setTimeout(() => tryInjectOnPanel(panel), 30);
        });
      });
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  conversationMenuObserver = observer;

  const existingPanels = document.querySelectorAll<HTMLElement>(CONVERSATION_MENU_SELECTOR);
  existingPanels.forEach((panel) => window.setTimeout(() => tryInjectOnPanel(panel), 30));

  const onMenuTriggerInteraction = (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const trigger = target.closest(
      `[data-test-id="${CONVERSATION_MENU_TRIGGER_TEST_ID}"], [data-test-id="${RESPONSE_MENU_TRIGGER_TEST_ID}"]`,
    ) as HTMLElement | null;
    if (!trigger) return;

    const panelIds = parseMenuTriggerPanelIds(trigger);
    if (panelIds.length === 0) return;

    for (let attempt = 0; attempt <= MENU_INJECTION_RETRY_LIMIT; attempt++) {
      window.setTimeout(() => {
        panelIds.forEach((id) => {
          const panel = document.getElementById(id);
          if (!(panel instanceof HTMLElement)) return;
          if (!panel.matches(CONVERSATION_MENU_SELECTOR)) return;
          tryInjectOnPanel(panel);
        });
      }, attempt * MENU_INJECTION_RETRY_DELAY_MS);
    }
  };

  document.addEventListener('click', onMenuTriggerInteraction, true);
  document.addEventListener('pointerdown', onMenuTriggerInteraction, true);

  window.addEventListener(
    'beforeunload',
    () => {
      try {
        conversationMenuObserver?.disconnect();
      } catch {}
      try {
        document.removeEventListener('click', onMenuTriggerInteraction, true);
      } catch {}
      try {
        document.removeEventListener('pointerdown', onMenuTriggerInteraction, true);
      } catch {}
      conversationMenuObserver = null;
    },
    { once: true },
  );
}

export async function startExportButton(): Promise<void> {
  // Check for pending export immediately
  checkPendingExport();

  await refreshWordResponseExportSettings();

  // i18n setup for tooltip and label
  const dict = await loadDictionaries();
  let lang = await getLanguage();

  setupConversationMenuExportObserver({
    dict,
    getCurrentLanguage: () => lang,
    onExport: (context) => {
      if (context.menuType === 'sidebar' && context.trigger) {
        void exportFromSidebarConversationTrigger(context.trigger, dict, () => lang);
        return;
      }
      if (context.menuType === 'message') {
        const initialSelectedMessageId = resolveAssistantMessageIdFromMenuTrigger(context.trigger);
        void showExportDialog(dict, lang, { initialSelectedMessageId });
        return;
      }
      void showExportDialog(dict, lang);
    },
  });
  setupResponseActionCopyImageObserver({
    getCurrentLanguage: () => lang,
  });

  const logo =
    (await waitForElement('[data-test-id="logo"]', 6000)) || (await waitForElement('.logo', 2000));
  if (!logo) return;
  const btn = ensureDropdownInjected(logo);
  if (!btn) return;
  if ((btn as Element & { _gvBound?: boolean })._gvBound) return;
  (btn as Element & { _gvBound?: boolean })._gvBound = true;

  // Swallow events on the button to avoid parent navigation (logo click -> /app)
  const swallow = (e: Event) => {
    try {
      e.preventDefault();
    } catch {}
    try {
      e.stopPropagation();
    } catch {}
  };
  // Capture low-level press events to avoid parent logo navigation, but do NOT capture 'click'
  ['pointerdown', 'mousedown', 'pointerup', 'mouseup'].forEach((type) => {
    try {
      btn.addEventListener(type, swallow, true);
    } catch {}
  });

  const t = (key: TranslationKey) => dict[lang]?.[key] ?? dict.en?.[key] ?? key;
  const title = t('exportChatJson');
  const labelText = t('pm_export');
  btn.title = title;
  btn.setAttribute('aria-label', title);

  // Update label text
  const labelEl = btn.querySelector('.gv-export-dropdown-label');
  if (labelEl) labelEl.textContent = labelText;

  // listen for runtime language changes
  const storageChangeHandler = (
    changes: Record<string, chrome.storage.StorageChange>,
    area: string,
  ) => {
    if (area === 'sync') {
      const nextRaw = changes[StorageKeys.LANGUAGE]?.newValue;
      if (typeof nextRaw === 'string') {
        const next = normalizeLang(nextRaw);
        lang = next;
        const ttl =
          dict[next]?.['exportChatJson'] ?? dict.en?.['exportChatJson'] ?? 'Export chat history';
        btn.title = ttl;
        btn.setAttribute('aria-label', ttl);

        // Update visible label text
        const lbl = btn.querySelector('.gv-export-dropdown-label');
        if (lbl)
          lbl.textContent = dict[next]?.['pm_export'] ?? dict.en?.['pm_export'] ?? 'Export';

        applyResponseActionButtons(() => lang);
      }
      return;
    }

    if (area === 'local') {
      if (
        changes[StorageKeys.WORD_RESPONSE_EXPORT_ENABLED] ||
        changes[StorageKeys.WORD_RESPONSE_EXPORT_MODE]
      ) {
        if (changes[StorageKeys.WORD_RESPONSE_EXPORT_ENABLED]) {
          wordResponseExportEnabled =
            changes[StorageKeys.WORD_RESPONSE_EXPORT_ENABLED].newValue !== false;
        }
        if (changes[StorageKeys.WORD_RESPONSE_EXPORT_MODE]) {
          wordResponseExportMode = normalizeWordResponseExportMode(
            changes[StorageKeys.WORD_RESPONSE_EXPORT_MODE].newValue,
          );
        }
        applyResponseActionButtons(() => lang);
      }
    }
  };

  try {
    chrome.storage?.onChanged?.addListener(storageChangeHandler);

    // Cleanup listener on page unload to prevent memory leaks
    window.addEventListener(
      'beforeunload',
      () => {
        try {
          chrome.storage?.onChanged?.removeListener(storageChangeHandler);
        } catch (e) {
          console.error('[GeminiMate] Failed to remove storage listener on unload:', e);
        }
      },
      { once: true },
    );
  } catch {}

  btn.addEventListener('click', (ev) => {
    // Stop parent navigation, but allow this handler to run
    swallow(ev);
    try {
      // Show export dialog instead of directly exporting
      showExportDialog(dict, lang);
    } catch (err) {
      try {
        console.error('GeminiMate export failed', err);
      } catch {}
    }
  });

  // ─── DOM recovery (resize / print) ─────────────────────────────────────
  // Gemini may re-render the logo/header area (and thus destroy the wrapper
  // + export button) during window resize or window.print().  We use a
  // single debounced handler that fires on resize, afterprint, and our own
  // gv-print-cleanup event.  It checks whether the button is still attached
  // and re-injects if not.
  let currentBtn: HTMLButtonElement = btn;
  let reinjectTimer: ReturnType<typeof setTimeout> | null = null;

  const reinjectExportButtonIfNeeded = () => {
    // Debounce: Gemini fires many mutations during resize; wait until it
    // settles before we attempt re-injection.
    if (reinjectTimer !== null) clearTimeout(reinjectTimer);
    reinjectTimer = setTimeout(() => {
      reinjectTimer = null;
      try {
        // If the button is still in the document, nothing to do.
        if (document.body.contains(currentBtn)) return;

        // Remove stale wrapper if it somehow survived but lost the button.
        const staleWrapper = document.querySelector('.gv-logo-dropdown-wrapper');
        if (staleWrapper) staleWrapper.remove();

        // Re-find the logo element (Gemini may have created a fresh one).
        const newLogo =
          document.querySelector('[data-test-id="logo"]') ?? document.querySelector('.logo');
        if (!newLogo) return;

        const newBtn = ensureDropdownInjected(newLogo);
        if (!newBtn) return;
        if ((newBtn as Element & { _gvBound?: boolean })._gvBound) return;
        (newBtn as Element & { _gvBound?: boolean })._gvBound = true;

        // Re-bind all event listeners on the fresh button.
        ['pointerdown', 'mousedown', 'pointerup', 'mouseup'].forEach((type) => {
          try {
            newBtn.addEventListener(type, swallow, true);
          } catch {}
        });

        const freshT = (key: TranslationKey) => dict[lang]?.[key] ?? dict.en?.[key] ?? key;
        const ttl = freshT('exportChatJson');
        const lbl = freshT('pm_export');
        newBtn.title = ttl;
        newBtn.setAttribute('aria-label', ttl);
        const labelEl = newBtn.querySelector('.gv-export-dropdown-label');
        if (labelEl) labelEl.textContent = lbl;

        newBtn.addEventListener('click', (ev) => {
          swallow(ev);
          try {
            showExportDialog(dict, lang);
          } catch (err) {
            try {
              console.error('GeminiMate export failed', err);
            } catch {}
          }
        });

        // Update our tracking reference so the next check uses the new element.
        currentBtn = newBtn;
      } catch (e) {
        try {
          console.debug('[GeminiMate] Export button re-injection failed:', e);
        } catch {}
      }
    }, 800);
  };

  window.addEventListener('resize', reinjectExportButtonIfNeeded);
  window.addEventListener('gv-print-cleanup', reinjectExportButtonIfNeeded);
  window.addEventListener('afterprint', reinjectExportButtonIfNeeded);
}

async function showExportDialog(
  dict: Record<AppLanguage, Record<string, string>>,
  lang: AppLanguage,
  options?: {
    initialSelectedMessageId?: string | null;
  },
): Promise<void> {
  const t = (key: TranslationKey) => dict[lang]?.[key] ?? dict.en?.[key] ?? key;

  // We defer collection until after the export sequence (scrolling/refresh checks)

  const dialog = new ExportDialog();

  dialog.show({
    onExport: async (format, fontSize) => {
      try {
        await executeExportSequenceWithProgress(
          format,
          dict,
          lang,
          undefined,
          fontSize,
          options?.initialSelectedMessageId || undefined,
        );
      } catch (err) {
        console.error('[GeminiMate] Export error:', err);
      }
    },

    onCancel: () => {
      // Dialog closed
    },
    translations: {
      title: t('export_dialog_title'),
      selectFormat: t('export_dialog_select'),
      warning: t('export_dialog_warning'),
      safariCmdpHint: t('export_dialog_safari_cmdp_hint'),
      safariMarkdownHint: t('export_dialog_safari_markdown_hint'),
      cancel: t('pm_cancel'),
      export: t('pm_export'),
      fontSizeLabel: t('export_fontsize_label'),
      fontSizePreview: t('export_fontsize_preview'),
      formatDescriptions: {
        json: t('export_format_json_description'),
        markdown: t('export_format_markdown_description'),
        pdf: t('export_format_pdf_description'),
        image: t('export_format_image_description'),
      },
    },
  });
}

export default { startExportButton };

