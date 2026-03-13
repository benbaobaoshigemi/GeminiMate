import { debugService } from '../../core/services/DebugService';
import { logger } from '../../core/services/LoggerService';
import { StorageKeys } from '../../core/types/common';
import type { StarredMessage, StarredMessagesData } from '../../features/timeline/starredTypes';

const FETCH_INTERCEPTOR_SCRIPT_ID = 'gm-fetch-interceptor';
const FETCH_INTERCEPTOR_MATCHES = [
  'https://gemini.google.com/*',
  'https://business.gemini.google/*',
];
const THOUGHT_TRANSLATION_TIMEOUT_MS = 12000;
const DEBUG_LOG_DIR = 'GeminiMate/.log';
const DEBUG_RUNTIME_LOG_FILE = `${DEBUG_LOG_DIR}/geminimate-runtime.log`;
const DEBUG_CACHE_DIR = `${DEBUG_LOG_DIR}/cache`;
const DEBUG_FLUSH_INTERVAL_MS = 1500;
const DEBUG_MAX_LOG_LINES = 9000;
const DEBUG_MAX_DETAIL_CHARS = 2400;
const SHARE_PAYLOAD_PREFIX = 'gm_share_payload_';
const SHARE_PAYLOAD_TTL_MS = 10 * 60 * 1000;
const SHARE_DATA_URL_HTML_LIMIT = 400_000;

type StarredMessageRequest =
  | { type: 'gv.starred.getAll'; payload?: unknown }
  | { type: 'gv.starred.getForConversation'; payload?: unknown }
  | { type: 'gv.starred.add'; payload?: unknown }
  | { type: 'gv.starred.remove'; payload?: unknown };

type FetchImageRequest = { type: 'gv.fetchImage'; url?: unknown };
type ThoughtTranslationRequest = {
  type: 'gm.translateThought';
  text?: unknown;
  targetLang?: unknown;
};
type ShareOpenRequest = {
  type: 'gm.share.open';
  html?: unknown;
  title?: unknown;
};

type PdfDownloadRequest = {
  type: 'gm.pdf.download';
  dataUrl?: unknown;
  filename?: unknown;
};

type DebugIngestRequest = {
  type: 'gm.debug.ingest';
  entry?: unknown;
};

type DebugExportNowRequest = {
  type: 'gm.debug.exportNow';
  reason?: unknown;
};

type DebugCaptureCacheRequest = {
  type: 'gm.debug.captureCache';
  payload?: unknown;
};

type DebugCaptureNowRequest = {
  type: 'gm.debug.captureNow';
  reason?: unknown;
};

type DebugMessageRequest =
  | DebugIngestRequest
  | DebugExportNowRequest
  | DebugCaptureCacheRequest
  | DebugCaptureNowRequest;

type NormalizedDebugEntry = {
  ts: string;
  context: string;
  source: string;
  action: string;
  detail?: unknown;
};

let debugModeEnabled = false;
let debugFileLogEnabled = true;
let debugCacheCaptureEnabled = true;
let debugRuntimeLines: string[] = [];
let debugFileDirty = false;
let debugFlushTimer: ReturnType<typeof setTimeout> | null = null;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unknown error';

const resolveEnabledValue = (value: unknown): boolean => value !== false;

const isStarredMessageRequest = (message: unknown): message is StarredMessageRequest =>
  isRecord(message) && typeof message.type === 'string' && message.type.startsWith('gv.starred.');

const isFetchImageRequest = (message: unknown): message is FetchImageRequest =>
  isRecord(message) && message.type === 'gv.fetchImage';

const isThoughtTranslationRequest = (message: unknown): message is ThoughtTranslationRequest =>
  isRecord(message) && message.type === 'gm.translateThought';
const isShareOpenRequest = (message: unknown): message is ShareOpenRequest =>
  isRecord(message) && message.type === 'gm.share.open';
const isPdfDownloadRequest = (message: unknown): message is PdfDownloadRequest =>
  isRecord(message) && message.type === 'gm.pdf.download';

const isDebugMessageRequest = (message: unknown): message is DebugMessageRequest =>
  isRecord(message) && typeof message.type === 'string' && message.type.startsWith('gm.debug.');

const isDebugIngestRequest = (message: unknown): message is DebugIngestRequest =>
  isRecord(message) && message.type === 'gm.debug.ingest';

const isDebugExportNowRequest = (message: unknown): message is DebugExportNowRequest =>
  isRecord(message) && message.type === 'gm.debug.exportNow';

const isDebugCaptureCacheRequest = (message: unknown): message is DebugCaptureCacheRequest =>
  isRecord(message) && message.type === 'gm.debug.captureCache';

const isDebugCaptureNowRequest = (message: unknown): message is DebugCaptureNowRequest =>
  isRecord(message) && message.type === 'gm.debug.captureNow';

const getNowIso = (): string => new Date().toISOString();

const createTimestampForFile = (): string =>
  new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '');

const stringifyLimited = (value: unknown, maxChars = DEBUG_MAX_DETAIL_CHARS): string => {
  let serialized = '';
  try {
    serialized = JSON.stringify(value);
  } catch {
    serialized = String(value);
  }
  if (serialized.length <= maxChars) return serialized;
  return `${serialized.slice(0, maxChars)}...<trimmed>`;
};

const normalizeDebugEntry = (value: unknown): NormalizedDebugEntry | null => {
  if (!isRecord(value)) return null;

  const ts = typeof value.ts === 'string' && value.ts.trim() ? value.ts : getNowIso();
  const context = typeof value.context === 'string' && value.context.trim() ? value.context : 'unknown';
  const source = typeof value.source === 'string' && value.source.trim() ? value.source : 'unknown';
  const action = typeof value.action === 'string' && value.action.trim() ? value.action : 'event';

  return {
    ts,
    context,
    source,
    action,
    detail: value.detail,
  };
};

const appendRuntimeLogLine = (line: string): void => {
  debugRuntimeLines.push(line);
  if (debugRuntimeLines.length > DEBUG_MAX_LOG_LINES) {
    debugRuntimeLines = debugRuntimeLines.slice(-DEBUG_MAX_LOG_LINES);
  }
  debugFileDirty = true;
};

const formatDebugLine = (entry: NormalizedDebugEntry): string => {
  const detail = entry.detail === undefined ? '' : ` | detail=${stringifyLimited(entry.detail)}`;
  return `[${entry.ts}] [${entry.context}] ${entry.source}/${entry.action}${detail}`;
};

const downloadTextToLocalLog = async (fileName: string, content: string): Promise<boolean> => {
  if (!chrome.downloads?.download) return false;
  try {
    const dataUrl = `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`;
    await chrome.downloads.download({
      url: dataUrl,
      filename: fileName,
      saveAs: false,
      conflictAction: 'overwrite',
    });
    return true;
  } catch {
    return false;
  }
};

const scheduleDebugFileFlush = (): void => {
  if (!debugModeEnabled || !debugFileLogEnabled || !debugFileDirty) return;
  if (debugFlushTimer !== null) return;
  debugFlushTimer = setTimeout(() => {
    debugFlushTimer = null;
    void flushRuntimeLogFile();
  }, DEBUG_FLUSH_INTERVAL_MS);
};

const flushRuntimeLogFile = async (): Promise<void> => {
  if (!debugModeEnabled || !debugFileLogEnabled || !debugFileDirty) return;
  const content = debugRuntimeLines.join('\n');
  const ok = await downloadTextToLocalLog(DEBUG_RUNTIME_LOG_FILE, content);
  if (ok) {
    debugFileDirty = false;
    return;
  }
  console.warn('[GeminiMate][Debug] Failed to persist runtime log file');
};

const normalizeObjectForSnapshot = (value: unknown, depth = 0): unknown => {
  if (depth > 3) return '[max-depth]';

  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    return value.length > 1200 ? `${value.slice(0, 1200)}...<trimmed>` : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;

  if (Array.isArray(value)) {
    return value.slice(0, 80).map((item) => normalizeObjectForSnapshot(item, depth + 1));
  }

  if (!isRecord(value)) {
    return String(value);
  }

  const entries = Object.entries(value).slice(0, 120);
  const normalized: Record<string, unknown> = {};
  entries.forEach(([key, item]) => {
    normalized[key] = normalizeObjectForSnapshot(item, depth + 1);
  });
  if (Object.keys(value).length > entries.length) {
    normalized.__trimmedKeys = Object.keys(value).length - entries.length;
  }
  return normalized;
};

const captureBackgroundStorageSnapshot = async (
  reason: string,
  payload?: unknown,
  writeTimestampedFile = false,
): Promise<void> => {
  if (!debugModeEnabled || !debugCacheCaptureEnabled) return;

  const all = await chrome.storage.local.get(null);
  const snapshot = {
    ts: getNowIso(),
    reason,
    storageLocal: normalizeObjectForSnapshot(all),
    payload: normalizeObjectForSnapshot(payload),
  };

  const fileName = writeTimestampedFile
    ? `${DEBUG_CACHE_DIR}/background-${createTimestampForFile()}.json`
    : `${DEBUG_CACHE_DIR}/background-latest.json`;
  await downloadTextToLocalLog(fileName, JSON.stringify(snapshot, null, 2));

  appendRuntimeLogLine(
    `[${snapshot.ts}] [background] debug/cache-snapshot | reason=${reason} | keys=${Object.keys(all).length}`,
  );
  scheduleDebugFileFlush();
};

const extractTranslatedText = (payload: unknown): string => {
  const collectSegments = (node: unknown): string[] => {
    if (!Array.isArray(node)) return [];

    const directSegments = node
      .map((segment) => {
        if (!Array.isArray(segment)) return '';
        return typeof segment[0] === 'string' ? segment[0] : '';
      })
      .filter((segment) => segment.length > 0);

    if (directSegments.length > 0) {
      return directSegments;
    }

    const nested: string[] = [];
    node.forEach((child) => {
      nested.push(...collectSegments(child));
    });
    return nested;
  };

  return collectSegments(payload)
    .join('')
    .trim();
};

async function translateThoughtText(text: string, targetLang: string): Promise<string> {
  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', 'auto');
  url.searchParams.set('tl', targetLang);
  url.searchParams.set('dt', 't');
  url.searchParams.set('q', text);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), THOUGHT_TRANSLATION_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('translation_timeout');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`translation_http_${response.status}`);
  }
  const data = (await response.json()) as unknown;
  const translatedText = extractTranslatedText(data);
  if (!translatedText) {
    throw new Error('translation_empty');
  }
  return translatedText;
}

async function registerFetchInterceptor(): Promise<void> {
  if (!chrome.scripting?.registerContentScripts) {
    return;
  }

  try {
    await chrome.scripting.unregisterContentScripts({ ids: [FETCH_INTERCEPTOR_SCRIPT_ID] });
  } catch {
    // ignore if not registered
  }

  const result = await chrome.storage.local.get([StorageKeys.WATERMARK_REMOVER_ENABLED]);
  const enabled = resolveEnabledValue(result[StorageKeys.WATERMARK_REMOVER_ENABLED]);

  if (!enabled) {
    debugService.log('background', 'fetch-interceptor-skipped-disabled');
    return;
  }

  try {
    await chrome.scripting.registerContentScripts([
      {
        id: FETCH_INTERCEPTOR_SCRIPT_ID,
        js: ['fetchInterceptor.js'],
        matches: FETCH_INTERCEPTOR_MATCHES,
        world: 'MAIN',
        runAt: 'document_start',
        persistAcrossSessions: true,
      },
    ]);
    debugService.log('background', 'fetch-interceptor-registered');
  } catch (error) {
    logger.error('Failed to register fetch interceptor', { error });
    debugService.log('background', 'fetch-interceptor-register-failed', {
      error: getErrorMessage(error),
    });
  }
}

void (async () => {
  try {
    await debugService.init('background');
    const debugSettings = await chrome.storage.local.get([
      StorageKeys.DEBUG_MODE,
      StorageKeys.DEBUG_FILE_LOG_ENABLED,
      StorageKeys.DEBUG_CACHE_CAPTURE_ENABLED,
    ]);
    debugModeEnabled = debugSettings[StorageKeys.DEBUG_MODE] === true;
    debugFileLogEnabled = debugSettings[StorageKeys.DEBUG_FILE_LOG_ENABLED] !== false;
    debugCacheCaptureEnabled = debugSettings[StorageKeys.DEBUG_CACHE_CAPTURE_ENABLED] !== false;

    logger.info('GeminiMate Background Worker Initialized');
    debugService.log('background', 'worker-initialized');
    appendRuntimeLogLine(
      `[${getNowIso()}] [background] debug/worker-initialized | mode=${String(debugModeEnabled)} | file=${String(debugFileLogEnabled)} | cache=${String(debugCacheCaptureEnabled)}`,
    );
    scheduleDebugFileFlush();

    await registerFetchInterceptor();
  } catch (error) {
    logger.error('Failed to initialize background worker', {
      error: getErrorMessage(error),
    });
  }
})();

chrome.runtime.onInstalled.addListener(() => {
  logger.info('GeminiMate Extension Installed');
  debugService.log('background', 'extension-installed');
  void registerFetchInterceptor();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return;

  if (changes[StorageKeys.WATERMARK_REMOVER_ENABLED]) {
    void registerFetchInterceptor();
  }

  if (changes[StorageKeys.DEBUG_MODE]) {
    debugModeEnabled = changes[StorageKeys.DEBUG_MODE].newValue === true;
    appendRuntimeLogLine(
      `[${getNowIso()}] [background] debug/mode-changed | enabled=${String(debugModeEnabled)}`,
    );
    if (debugModeEnabled) {
      scheduleDebugFileFlush();
      void captureBackgroundStorageSnapshot('debug-mode-enabled');
    }
  }

  if (changes[StorageKeys.DEBUG_FILE_LOG_ENABLED]) {
    debugFileLogEnabled = changes[StorageKeys.DEBUG_FILE_LOG_ENABLED].newValue !== false;
    appendRuntimeLogLine(
      `[${getNowIso()}] [background] debug/file-log-changed | enabled=${String(debugFileLogEnabled)}`,
    );
    if (debugModeEnabled && debugFileLogEnabled) {
      scheduleDebugFileFlush();
    }
  }

  if (changes[StorageKeys.DEBUG_CACHE_CAPTURE_ENABLED]) {
    debugCacheCaptureEnabled = changes[StorageKeys.DEBUG_CACHE_CAPTURE_ENABLED].newValue !== false;
    appendRuntimeLogLine(
      `[${getNowIso()}] [background] debug/cache-capture-changed | enabled=${String(debugCacheCaptureEnabled)}`,
    );
    scheduleDebugFileFlush();
  }
});

const normalizeStarredMessage = (value: unknown): StarredMessage | null => {
  if (!isRecord(value)) return null;
  const turnId = value.turnId;
  const content = value.content;
  const conversationId = value.conversationId;
  const conversationUrl = value.conversationUrl;
  const starredAt = value.starredAt;

  if (
    typeof turnId !== 'string' ||
    typeof content !== 'string' ||
    typeof conversationId !== 'string' ||
    typeof conversationUrl !== 'string' ||
    typeof starredAt !== 'number'
  ) {
    return null;
  }

  return {
    turnId,
    content,
    conversationId,
    conversationUrl,
    conversationTitle:
      typeof value.conversationTitle === 'string' ? value.conversationTitle : undefined,
    starredAt,
  };
};

const normalizeStarredData = (value: unknown): StarredMessagesData => {
  if (!isRecord(value) || !isRecord(value.messages)) {
    return { messages: {} };
  }

  const normalized: Record<string, StarredMessage[]> = {};
  for (const [conversationId, rawMessages] of Object.entries(value.messages)) {
    if (!Array.isArray(rawMessages)) continue;
    const messages = rawMessages
      .map((item) => normalizeStarredMessage(item))
      .filter((item): item is StarredMessage => item !== null);
    normalized[conversationId] = messages;
  }
  return { messages: normalized };
};

const getStarredData = async (): Promise<StarredMessagesData> => {
  const result = await chrome.storage.local.get([StorageKeys.TIMELINE_STARRED_MESSAGES]);
  return normalizeStarredData(result[StorageKeys.TIMELINE_STARRED_MESSAGES]);
};

const setStarredData = async (data: StarredMessagesData): Promise<void> => {
  await chrome.storage.local.set({ [StorageKeys.TIMELINE_STARRED_MESSAGES]: data });
};

async function fetchImageWithFallback(url: string): Promise<Response> {
  try {
    const includeResponse = await fetch(url, { credentials: 'include', redirect: 'follow' });
    if (includeResponse.ok) {
      return includeResponse;
    }
  } catch {
    // ignore and fallback
  }

  return fetch(url, { credentials: 'omit', redirect: 'follow' });
}

async function blobToBase64(blob: Blob): Promise<string> {
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        resolve(dataUrl.substring(dataUrl.indexOf(',') + 1));
      };
      reader.onerror = () => reject(new Error('FileReader failed'));
      reader.readAsDataURL(blob);
    });
  }
  const buffer = await blob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return btoa(binary);
}

const createSharePayloadId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const getShareStorage = (): chrome.storage.SessionArea | chrome.storage.LocalStorageArea =>
  chrome.storage.session ?? chrome.storage.local;

const cleanupExpiredSharePayloads = async (
  storage: chrome.storage.SessionArea | chrome.storage.LocalStorageArea,
): Promise<void> => {
  const all = await storage.get(null);
  const now = Date.now();
  const staleKeys = Object.entries(all)
    .filter(([key, value]) => {
      if (!key.startsWith(SHARE_PAYLOAD_PREFIX)) return false;
      if (!isRecord(value)) return true;
      const createdAt = typeof value.createdAt === 'number' ? value.createdAt : 0;
      return createdAt <= 0 || now - createdAt > SHARE_PAYLOAD_TTL_MS;
    })
    .map(([key]) => key);
  if (!staleKeys.length) return;
  await storage.remove(staleKeys);
};

const openShareViewerTab = async (html: string, title: string): Promise<void> => {
  // A top-level data: page avoids the extension viewer/blob execution quirks
  // and lets self-contained dynamic HTML run as a normal standalone document.
  if (html.length <= SHARE_DATA_URL_HTML_LIMIT) {
    const url = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
    await chrome.tabs.create({ url });
    return;
  }

  const payloadId = createSharePayloadId();
  const storageKey = `${SHARE_PAYLOAD_PREFIX}${payloadId}`;
  const storage = getShareStorage();
  await cleanupExpiredSharePayloads(storage);
  await storage.set({
    [storageKey]: {
      html,
      title,
      createdAt: Date.now(),
    },
  });

  const url = chrome.runtime.getURL(`share-viewer.html?id=${encodeURIComponent(payloadId)}`);
  await chrome.tabs.create({ url });
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const waitForDownloadFilename = async (downloadId: number): Promise<string> => {
  const maxAttempts = 25;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const items = await chrome.downloads.search({ id: downloadId });
    const filePath = items[0]?.filename;
    if (filePath) {
      return filePath;
    }
    await sleep(200);
  }

  throw new Error('download_path_unavailable');
};

const downloadPdfAndResolvePath = async (dataUrl: string, filename: string): Promise<string> => {
  if (!chrome.downloads?.download) {
    throw new Error('downloads_api_unavailable');
  }

  const downloadId = await chrome.downloads.download({
    url: dataUrl,
    filename,
    saveAs: false,
    conflictAction: 'uniquify',
  });

  if (typeof downloadId !== 'number') {
    throw new Error('download_failed');
  }

  return waitForDownloadFilename(downloadId);
};

const captureClientCacheSnapshot = async (
  payload: unknown,
  writeTimestampedFile = false,
): Promise<void> => {
  if (!debugModeEnabled || !debugCacheCaptureEnabled) return;

  const normalized = normalizeObjectForSnapshot(payload);
  const payloadRecord = isRecord(normalized) ? normalized : { payload: normalized };
  const context =
    typeof payloadRecord.context === 'string' && payloadRecord.context.trim()
      ? payloadRecord.context.trim().toLowerCase()
      : 'content';
  const reason =
    typeof payloadRecord.reason === 'string' && payloadRecord.reason.trim()
      ? payloadRecord.reason.trim()
      : 'periodic';

  const snapshot = {
    ts: getNowIso(),
    context,
    reason,
    data: payloadRecord,
  };

  const fileName = writeTimestampedFile
    ? `${DEBUG_CACHE_DIR}/${context}-${createTimestampForFile()}.json`
    : `${DEBUG_CACHE_DIR}/${context}-latest.json`;
  await downloadTextToLocalLog(fileName, JSON.stringify(snapshot, null, 2));

  appendRuntimeLogLine(
    `[${snapshot.ts}] [${context}] debug/cache-snapshot | reason=${reason}`,
  );
  scheduleDebugFileFlush();
};

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (isDebugMessageRequest(message)) {
    if (isDebugIngestRequest(message)) {
      const entry = normalizeDebugEntry(message.entry);
      if (entry) {
        appendRuntimeLogLine(formatDebugLine(entry));
        scheduleDebugFileFlush();
      }
      sendResponse({ ok: true });
      return;
    }

    if (isDebugCaptureCacheRequest(message)) {
      void captureClientCacheSnapshot(message.payload)
        .then(() => {
          sendResponse({ ok: true });
        })
        .catch((error: unknown) => {
          sendResponse({ ok: false, error: getErrorMessage(error) });
        });
      return true;
    }

    if (isDebugCaptureNowRequest(message)) {
      const reason = typeof message.reason === 'string' ? message.reason : 'manual';
      void captureBackgroundStorageSnapshot(`manual-${reason}`, undefined, true)
        .then(() => sendResponse({ ok: true }))
        .catch((error: unknown) => sendResponse({ ok: false, error: getErrorMessage(error) }));
      return true;
    }

    if (isDebugExportNowRequest(message)) {
      const reason = typeof message.reason === 'string' ? message.reason : 'manual';
      void (async () => {
        appendRuntimeLogLine(`[${getNowIso()}] [background] debug/export-now | reason=${reason}`);
        await captureBackgroundStorageSnapshot(`export-${reason}`, undefined, true);
        await flushRuntimeLogFile();
      })()
        .then(() => sendResponse({ ok: true }))
        .catch((error: unknown) => sendResponse({ ok: false, error: getErrorMessage(error) }));
      return true;
    }
  }

  if (isFetchImageRequest(message)) {
    const url = typeof message.url === 'string' ? message.url : '';
    if (!/^https?:\/\//i.test(url)) {
      sendResponse({ ok: false, error: 'invalid_url' });
      return;
    }

    fetchImageWithFallback(url)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const blob = await response.blob();
        const base64 = await blobToBase64(blob);
        const contentType = blob.type || 'image/png';
        sendResponse({
          ok: true,
          contentType,
          base64,
          data: `data:${contentType};base64,${base64}`,
        });
      })
      .catch((error: unknown) => {
        sendResponse({ ok: false, error: getErrorMessage(error) });
      });

    return true;
  }

  if (isThoughtTranslationRequest(message)) {
    const text = typeof message.text === 'string' ? message.text.trim() : '';
    const targetLang = typeof message.targetLang === 'string' ? message.targetLang : 'zh-CN';
    if (!text) {
      sendResponse({ ok: false, error: 'missing_text' });
      return;
    }

    translateThoughtText(text, targetLang)
      .then((translatedText) => {
        debugService.log('background', 'thought-translation-success', {
          targetLang,
          sourceLength: text.length,
          translatedLength: translatedText.length,
        });
        sendResponse({ ok: true, translatedText });
      })
      .catch((error: unknown) => {
        debugService.log('background', 'thought-translation-failed', {
          targetLang,
          sourceLength: text.length,
          error: getErrorMessage(error),
        });
        sendResponse({ ok: false, error: getErrorMessage(error) });
      });

    return true;
  }

  if (isShareOpenRequest(message)) {
    const html = typeof message.html === 'string' ? message.html : '';
    const title = typeof message.title === 'string' && message.title.trim()
      ? message.title.trim()
      : 'GeminiMate Share';

    if (!html.trim()) {
      sendResponse({ ok: false, error: 'empty_html' });
      return;
    }

    void openShareViewerTab(html, title)
      .then(() => sendResponse({ ok: true }))
      .catch((error: unknown) => sendResponse({ ok: false, error: getErrorMessage(error) }));
    return true;
  }

  if (isPdfDownloadRequest(message)) {
    const dataUrl = typeof message.dataUrl === 'string' ? message.dataUrl : '';
    const filename = typeof message.filename === 'string' ? message.filename : 'geminimate.pdf';

    if (!dataUrl.startsWith('data:application/pdf')) {
      sendResponse({ ok: false, error: 'invalid_pdf_data' });
      return;
    }

    void downloadPdfAndResolvePath(dataUrl, filename)
      .then((filePath) => sendResponse({ ok: true, filePath }))
      .catch((error: unknown) => sendResponse({ ok: false, error: getErrorMessage(error) }));
    return true;
  }

  if (!isStarredMessageRequest(message)) {
    return;
  }

  debugService.log('background', 'message-received', {
    type: message.type,
  });

  const run = async (): Promise<void> => {
    switch (message.type) {
      case 'gv.starred.getAll': {
        const data = await getStarredData();
        debugService.log('background', 'starred-get-all', {
          conversations: Object.keys(data.messages).length,
        });
        sendResponse({ ok: true, data });
        return;
      }

      case 'gv.starred.getForConversation': {
        const payload = isRecord(message.payload) ? message.payload : {};
        const conversationId = payload.conversationId;
        if (typeof conversationId !== 'string') {
          sendResponse({ ok: false, error: 'Missing conversationId' });
          return;
        }
        const data = await getStarredData();
        debugService.log('background', 'starred-get-for-conversation', {
          conversationId,
          count: (data.messages[conversationId] ?? []).length,
        });
        sendResponse({
          ok: true,
          messages: data.messages[conversationId] ?? [],
        });
        return;
      }

      case 'gv.starred.add': {
        const messageToAdd = normalizeStarredMessage(message.payload);
        if (!messageToAdd) {
          sendResponse({ ok: false, error: 'Invalid message payload' });
          return;
        }

        const data = await getStarredData();
        const existing = data.messages[messageToAdd.conversationId] ?? [];
        const alreadyExists = existing.some((item) => item.turnId === messageToAdd.turnId);
        if (alreadyExists) {
          debugService.log('background', 'starred-add-ignored-duplicate', {
            conversationId: messageToAdd.conversationId,
            turnId: messageToAdd.turnId,
          });
          sendResponse({ ok: true, added: false });
          return;
        }

        data.messages[messageToAdd.conversationId] = [...existing, messageToAdd];
        await setStarredData(data);
        debugService.log('background', 'starred-added', {
          conversationId: messageToAdd.conversationId,
          turnId: messageToAdd.turnId,
        });
        sendResponse({ ok: true, added: true });
        return;
      }

      case 'gv.starred.remove': {
        const payload = isRecord(message.payload) ? message.payload : {};
        const conversationId = payload.conversationId;
        const turnId = payload.turnId;
        if (typeof conversationId !== 'string' || typeof turnId !== 'string') {
          sendResponse({ ok: false, error: 'Missing conversationId or turnId' });
          return;
        }

        const data = await getStarredData();
        const existing = data.messages[conversationId] ?? [];
        const next = existing.filter((item) => item.turnId !== turnId);
        const removed = next.length !== existing.length;

        if (next.length === 0) {
          delete data.messages[conversationId];
        } else {
          data.messages[conversationId] = next;
        }

        await setStarredData(data);
        debugService.log('background', 'starred-removed', {
          conversationId,
          turnId,
          removed,
        });
        sendResponse({ ok: true, removed });
        return;
      }
    }
  };

  run().catch((error: unknown) => {
    logger.error('Background message handler failed', { error });
    debugService.log('background', 'message-error', {
      error: getErrorMessage(error),
    });
    sendResponse({ ok: false, error: getErrorMessage(error) });
  });

  return true;
});
