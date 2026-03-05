import { debugService } from '../../core/services/DebugService';
import { logger } from '../../core/services/LoggerService';
import { StorageKeys } from '../../core/types/common';
import type { StarredMessage, StarredMessagesData } from '../../features/timeline/starredTypes';

const FETCH_INTERCEPTOR_SCRIPT_ID = 'gm-fetch-interceptor';
const FETCH_INTERCEPTOR_MATCHES = [
  'https://gemini.google.com/*',
  'https://business.gemini.google/*',
];

type StarredMessageRequest =
  | { type: 'gv.starred.getAll'; payload?: unknown }
  | { type: 'gv.starred.getForConversation'; payload?: unknown }
  | { type: 'gv.starred.add'; payload?: unknown }
  | { type: 'gv.starred.remove'; payload?: unknown };

type FetchImageRequest = { type: 'gv.fetchImage'; url?: unknown };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unknown error';

const resolveEnabledValue = (value: unknown): boolean => value !== false;

const isStarredMessageRequest = (message: unknown): message is StarredMessageRequest =>
  isRecord(message) && typeof message.type === 'string' && message.type.startsWith('gv.starred.');

const isFetchImageRequest = (message: unknown): message is FetchImageRequest =>
  isRecord(message) && message.type === 'gv.fetchImage';

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
    logger.info('GeminiMate Background Worker Initialized');
    debugService.log('background', 'worker-initialized');
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
  if (!changes[StorageKeys.WATERMARK_REMOVER_ENABLED]) return;
  void registerFetchInterceptor();
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

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const length = bytes.byteLength;
  for (let i = 0; i < length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
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
        const base64 = arrayBufferToBase64(await blob.arrayBuffer());
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
