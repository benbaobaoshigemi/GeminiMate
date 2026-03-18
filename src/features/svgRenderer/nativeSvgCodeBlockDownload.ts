import { findLikelyNativeDownloadButtons } from '@/features/codeActions/nativeDownloadButton';
import { setActionButtonBusy } from '@/features/codeActions/actionBusyState';
import { detectAnimatedSvgMarkup } from '@/features/codeActions/svgExportModel';
import { downloadSvgMarkupAsGif } from '@/features/codeActions/svgGifDownload';
import { downloadSvgMarkupAsPng } from '@/features/codeActions/svgDownload';

import { extractSvgMarkupFromPayloadPublic } from './svgMarkupExtraction';

const HOST_SELECTOR = 'svg-code-block';
const LABEL_TEXT = '代码段';
const SHARE_BUTTON_TITLE = '在新窗口打开';
const IMAGE_DOWNLOAD_BUTTON_TITLE = '下载图像 PNG/GIF';
const TOOLBAR_BUTTON_CLASS = 'gm-svg-native-toolbar-button';
const SHARE_BUTTON_ATTR = 'data-gm-svg-native-share';
const IMAGE_DOWNLOAD_BUTTON_ATTR = 'data-gm-svg-native-image-download';
const VIEW_ATTR = 'data-gm-svg-native-view';
const TOGGLE_GROUP_ATTR = 'data-gm-svg-native-toggle';
const CODE_PANEL_ATTR = 'data-gm-svg-native-code-panel';
const MARKUP_ATTR = 'data-gm-svg-native-markup';
const HTML_ATTR = 'data-gm-svg-native-html';
const HYDRATING_ATTR = 'data-gm-svg-native-hydrating';
const DIAG_PREFIX = '[GeminiMate][SVG-DIAG][native]';

const BOUND_HOSTS = new WeakSet<HTMLElement>();
const BOUND_SHARE_BUTTONS = new WeakSet<HTMLButtonElement>();
const BOUND_IMAGE_DOWNLOAD_BUTTONS = new WeakSet<HTMLButtonElement>();
const PENDING_HYDRATIONS = new WeakMap<HTMLElement, Promise<ResolvedSvgPayload | null>>();

let nativeSvgCodeBlockDownloadEnabled = true;

type BackgroundFetchTextResponse = {
  error?: unknown;
  ok?: unknown;
  text?: unknown;
};

type ResolvedSvgPayload = {
  html: string;
  markup: string;
  strategy: string;
};

type FrameSource = {
  protocol: string;
  url: string;
};

const SHARE_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M14 4h6v6h-2V7.41l-7.29 7.3-1.42-1.42L16.59 6H14V4Z" fill="currentColor"/>
    <path d="M5 5h6v2H7v10h10v-4h2v6H5V5Z" fill="currentColor"/>
  </svg>
`;

const IMAGE_DOWNLOAD_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 2v10h14V7H5Zm2 8 2.7-3.3a1 1 0 0 1 1.54 0L13 14l1.9-2.3a1 1 0 0 1 1.55.02L18 15H7Zm2-6.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" fill="currentColor"/>
  </svg>
`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const createTimestamp = (): string =>
  new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '');

const createHtmlSample = (html: string): string =>
  html.replace(/\s+/g, ' ').trim().slice(0, 240);

const wait = (delayMs: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });

const emitNativeSvgDiagnostic = (
  level: 'info' | 'warn' | 'error',
  event: string,
  detail?: Record<string, unknown>,
): void => {
  const payload = detail ? { event, ...detail } : { event };
  const message = `${DIAG_PREFIX} ${JSON.stringify(payload)}`;
  if (level === 'error') {
    console.error(message);
    return;
  }
  if (level === 'warn') {
    console.warn(message);
    return;
  }
  console.info(message);
};

const wrapHtmlDocument = (body: string, title: string): string => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:24px;background:#f8fafc;display:flex;justify-content:center;align-items:flex-start;">${body}</body>
</html>`;

const sendShareOpenRequest = async (html: string, title: string): Promise<boolean> => {
  const response = await new Promise<Record<string, unknown>>((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'gm.share.open', html, title }, (payload: unknown) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (!isRecord(payload)) {
        reject(new Error('Invalid share response'));
        return;
      }

      resolve(payload);
    });
  });

  return response.ok === true;
};

const fetchTextViaBackground = async (url: string): Promise<string | null> => {
  const response = await new Promise<BackgroundFetchTextResponse>((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'gm.fetchText', url }, (payload: unknown) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (!isRecord(payload)) {
        reject(new Error('Invalid text fetch response'));
        return;
      }

      resolve(payload as BackgroundFetchTextResponse);
    });
  });

  if (response.ok !== true || typeof response.text !== 'string') {
    emitNativeSvgDiagnostic('warn', 'background-fetch-text-failed', {
      error:
        typeof response.error === 'string'
          ? response.error
          : response.error instanceof Error
            ? response.error.message
            : undefined,
      url,
    });
    return null;
  }

  return response.text;
};

const getToolbar = (host: HTMLElement): HTMLElement | null =>
  host.querySelector('.svg-toolbar');

const getActionsContainer = (host: HTMLElement): HTMLElement | null =>
  host.querySelector('.svg-actions');

const getPreviewFrame = (host: HTMLElement): HTMLIFrameElement | null =>
  host.querySelector('.svg-preview iframe');

const getCachedMarkup = (host: HTMLElement): string =>
  host.getAttribute(MARKUP_ATTR)?.trim() ?? '';

const getCachedHtml = (host: HTMLElement): string =>
  host.getAttribute(HTML_ATTR)?.trim() ?? '';

const setCachedPayload = (host: HTMLElement, payload: ResolvedSvgPayload): void => {
  host.setAttribute(MARKUP_ATTR, payload.markup);
  host.setAttribute(HTML_ATTR, payload.html);
};

const createPayloadFromMarkup = (markup: string, strategy: string): ResolvedSvgPayload => ({
  html: wrapHtmlDocument(markup, 'SVG Share'),
  markup,
  strategy,
});

const createCachedPayload = (host: HTMLElement): ResolvedSvgPayload | null => {
  const markup = getCachedMarkup(host);
  if (!markup) {
    return null;
  }

  return {
    html: getCachedHtml(host) || wrapHtmlDocument(markup, 'SVG Share'),
    markup,
    strategy: 'cache',
  };
};

const readFrameDocumentMarkup = (frame: HTMLIFrameElement): string | null => {
  try {
    const documentMarkup = frame.contentDocument?.documentElement.outerHTML ?? '';
    return documentMarkup.trim() ? documentMarkup : null;
  } catch {
    return null;
  }
};

const waitForFrameReady = async (frame: HTMLIFrameElement): Promise<void> => {
  if (frame.contentDocument?.readyState === 'complete') {
    return;
  }

  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = (): void => {
      if (settled) {
        return;
      }
      settled = true;
      frame.removeEventListener('load', onLoad);
      window.clearTimeout(timerId);
      resolve();
    };

    const onLoad = (): void => finish();
    const timerId = window.setTimeout(finish, 1200);
    frame.addEventListener('load', onLoad, { once: true });
  });
};

const resolveFrameSource = (frame: HTMLIFrameElement): FrameSource | null => {
  const src = frame.getAttribute('src')?.trim() ?? '';
  if (!src) {
    return null;
  }

  try {
    const url = new URL(src, window.location.href);
    return {
      protocol: url.protocol,
      url: url.toString(),
    };
  } catch {
    return null;
  }
};

const fetchFrameSourceHtml = async (frame: HTMLIFrameElement): Promise<string | null> => {
  const source = resolveFrameSource(frame);
  if (!source) {
    return null;
  }

  if (source.protocol === 'file:') {
    try {
      const response = await fetch(source.url);
      if (response.ok) {
        return response.text();
      }
    } catch {
      // fall through to background fetch
    }
  }

  return fetchTextViaBackground(source.url);
};

const extractPayloadFromHtml = (html: string): ResolvedSvgPayload | null => {
  const extraction = extractSvgMarkupFromPayloadPublic(html);
  if (!extraction.markup) {
    emitNativeSvgDiagnostic('warn', 'hydrate-missing-svg', {
      containsDataSvgUrl: extraction.diagnostic.containsDataSvgUrl,
      containsEscapedSvgTag: extraction.diagnostic.containsEscapedSvgTag,
      containsRawSvgTag: extraction.diagnostic.containsRawSvgTag,
      containsSrcdoc: extraction.diagnostic.containsSrcdoc,
      htmlLength: html.length,
      sample: createHtmlSample(html),
    });
    return null;
  }

  return {
    html,
    markup: extraction.markup,
    strategy: extraction.strategy ?? 'unknown',
  };
};

const findNativeCopyButton = (actionsContainer: HTMLElement): HTMLButtonElement | null =>
  [...actionsContainer.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
    button.querySelector(
      'mat-icon[fonticon="content_copy"], .google-symbols[data-mat-icon-name="content_copy"], [data-mat-icon-name="content_copy"]',
    ),
  ) ?? null;

const readClipboardTextBestEffort = async (): Promise<string> => {
  if (!navigator.clipboard?.readText) {
    return '';
  }

  try {
    return await navigator.clipboard.readText();
  } catch (error: unknown) {
    emitNativeSvgDiagnostic('warn', 'clipboard-read-failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return '';
  }
};

const capturePayloadViaNativeCopy = async (host: HTMLElement): Promise<ResolvedSvgPayload | null> => {
  const actionsContainer = getActionsContainer(host);
  const nativeCopyButton = actionsContainer ? findNativeCopyButton(actionsContainer) : null;
  if (!nativeCopyButton) {
    emitNativeSvgDiagnostic('warn', 'native-copy-missing');
    return null;
  }

  let copiedText = '';
  const onCopy = (event: ClipboardEvent): void => {
    const text = event.clipboardData?.getData('text/plain')?.trim() ?? '';
    if (text) {
      copiedText = text;
    }
  };

  document.addEventListener('copy', onCopy, true);
  try {
    emitNativeSvgDiagnostic('info', 'native-copy-click');
    nativeCopyButton.click();
    await wait(180);

    const clipboardText = copiedText || (await readClipboardTextBestEffort()).trim();
    if (!clipboardText) {
      emitNativeSvgDiagnostic('warn', 'native-copy-empty');
      return null;
    }

    const extraction = extractSvgMarkupFromPayloadPublic(clipboardText);
    if (!extraction.markup) {
      emitNativeSvgDiagnostic('warn', 'native-copy-non-svg', {
        containsDataSvgUrl: extraction.diagnostic.containsDataSvgUrl,
        containsEscapedSvgTag: extraction.diagnostic.containsEscapedSvgTag,
        containsRawSvgTag: extraction.diagnostic.containsRawSvgTag,
        containsSrcdoc: extraction.diagnostic.containsSrcdoc,
        sample: createHtmlSample(clipboardText),
      });
      return null;
    }

    const payload = createPayloadFromMarkup(
      extraction.markup,
      extraction.strategy ? `native-copy:${extraction.strategy}` : 'native-copy',
    );
    setCachedPayload(host, payload);
    emitNativeSvgDiagnostic('info', 'native-copy-success', {
      markupLength: payload.markup.length,
      strategy: payload.strategy,
    });
    return payload;
  } finally {
    document.removeEventListener('copy', onCopy, true);
  }
};

const hydrateHostPayload = async (host: HTMLElement): Promise<ResolvedSvgPayload | null> => {
  const cached = createCachedPayload(host);
  if (cached) {
    emitNativeSvgDiagnostic('info', 'hydrate-cache-hit', {
      markupLength: cached.markup.length,
    });
    return cached;
  }

  const pending = PENDING_HYDRATIONS.get(host);
  if (pending) {
    emitNativeSvgDiagnostic('info', 'hydrate-pending-reused');
    return pending;
  }

  const frame = getPreviewFrame(host);
  if (!frame) {
    emitNativeSvgDiagnostic('warn', 'hydrate-missing-frame');
    return null;
  }

  const task = (async (): Promise<ResolvedSvgPayload | null> => {
    host.setAttribute(HYDRATING_ATTR, '1');

    try {
      await waitForFrameReady(frame);

      const documentMarkup = readFrameDocumentMarkup(frame);
      if (documentMarkup) {
        const fromDocument = extractPayloadFromHtml(documentMarkup);
        if (fromDocument) {
          setCachedPayload(host, fromDocument);
          emitNativeSvgDiagnostic('info', 'hydrate-success', {
            markupLength: fromDocument.markup.length,
            strategy: `frame-document:${fromDocument.strategy}`,
          });
          return fromDocument;
        }
      }

      const fromNativeCopy = await capturePayloadViaNativeCopy(host);
      if (fromNativeCopy) {
        return fromNativeCopy;
      }

      const fetchedHtml = await fetchFrameSourceHtml(frame);
      if (!fetchedHtml) {
        emitNativeSvgDiagnostic('warn', 'hydrate-empty-html');
        return null;
      }

      const fromFetch = extractPayloadFromHtml(fetchedHtml);
      if (!fromFetch) {
        return null;
      }

      setCachedPayload(host, fromFetch);
      emitNativeSvgDiagnostic('info', 'hydrate-success', {
        markupLength: fromFetch.markup.length,
        strategy: `frame-src:${fromFetch.strategy}`,
      });
      return fromFetch;
    } finally {
      host.removeAttribute(HYDRATING_ATTR);
      PENDING_HYDRATIONS.delete(host);
    }
  })();

  PENDING_HYDRATIONS.set(host, task);
  return task;
};

const getNativeDownloadButton = (actionsContainer: HTMLElement): HTMLButtonElement | null =>
  findLikelyNativeDownloadButtons(actionsContainer, [
    `button[${IMAGE_DOWNLOAD_BUTTON_ATTR}="1"]`,
    `button[${SHARE_BUTTON_ATTR}="1"]`,
  ])[0] ?? null;

const createToolbarButton = (
  title: string,
  iconMarkup: string,
  markerAttr: string,
): HTMLButtonElement => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = TOOLBAR_BUTTON_CLASS;
  button.title = title;
  button.setAttribute('aria-label', title);
  button.setAttribute(markerAttr, '1');
  button.innerHTML = iconMarkup;
  return button;
};

const runButtonAction = async (
  button: HTMLButtonElement,
  action: () => Promise<void>,
): Promise<void> => {
  setActionButtonBusy(button, true);
  try {
    await action();
  } finally {
    setActionButtonBusy(button, false);
  }
};

const ensureShareButton = (host: HTMLElement): HTMLButtonElement | null => {
  const actionsContainer = getActionsContainer(host);
  const nativeDownloadButton = actionsContainer ? getNativeDownloadButton(actionsContainer) : null;
  if (!actionsContainer || !nativeDownloadButton) {
    return null;
  }

  let shareButton = actionsContainer.querySelector(
    `button[${SHARE_BUTTON_ATTR}="1"]`,
  ) as HTMLButtonElement | null;

  if (!shareButton) {
    shareButton = createToolbarButton(SHARE_BUTTON_TITLE, SHARE_ICON, SHARE_BUTTON_ATTR);
    actionsContainer.appendChild(shareButton);
  }

  return shareButton;
};

const ensureImageDownloadButton = (host: HTMLElement): HTMLButtonElement | null => {
  const actionsContainer = getActionsContainer(host);
  const nativeDownloadButton = actionsContainer ? getNativeDownloadButton(actionsContainer) : null;
  if (!actionsContainer || !nativeDownloadButton) {
    return null;
  }

  let imageButton = actionsContainer.querySelector(
    `button[${IMAGE_DOWNLOAD_BUTTON_ATTR}="1"]`,
  ) as HTMLButtonElement | null;

  if (!imageButton) {
    imageButton = createToolbarButton(
      IMAGE_DOWNLOAD_BUTTON_TITLE,
      IMAGE_DOWNLOAD_ICON,
      IMAGE_DOWNLOAD_BUTTON_ATTR,
    );
    actionsContainer.appendChild(imageButton);
  }

  return imageButton;
};

const cleanupLegacyUi = (host: HTMLElement): void => {
  host.removeAttribute(VIEW_ATTR);
  const toolbar = getToolbar(host);
  toolbar?.querySelector(`[${TOGGLE_GROUP_ATTR}="1"]`)?.remove();
  host.querySelector(`[${CODE_PANEL_ATTR}="1"]`)?.remove();
};

const reorderToolbarButtons = (host: HTMLElement): void => {
  const actionsContainer = getActionsContainer(host);
  if (!actionsContainer) {
    return;
  }

  const shareButton = actionsContainer.querySelector(
    `button[${SHARE_BUTTON_ATTR}="1"]`,
  ) as HTMLButtonElement | null;
  const imageDownloadButton = actionsContainer.querySelector(
    `button[${IMAGE_DOWNLOAD_BUTTON_ATTR}="1"]`,
  ) as HTMLButtonElement | null;
  const copyButton = findNativeCopyButton(actionsContainer);
  const nativeDownloadButton = findLikelyNativeDownloadButtons(actionsContainer).find(
    (button) =>
      button.getAttribute(IMAGE_DOWNLOAD_BUTTON_ATTR) !== '1' &&
      button.getAttribute(SHARE_BUTTON_ATTR) !== '1',
  );

  if (shareButton) {
    actionsContainer.appendChild(shareButton);
  }
  if (imageDownloadButton) {
    actionsContainer.appendChild(imageDownloadButton);
  }
  if (copyButton) {
    actionsContainer.appendChild(copyButton);
  }
  if (nativeDownloadButton) {
    actionsContainer.appendChild(nativeDownloadButton);
  }
};

const triggerMarkupDownload = async (payload: ResolvedSvgPayload): Promise<{ filename: string; kind: 'gif' | 'png' }> => {
  const animated = detectAnimatedSvgMarkup(payload.markup);
  if (animated) {
    const filename = `geminimate-svg-animation-${createTimestamp()}.gif`;
    await downloadSvgMarkupAsGif(payload.markup, filename);
    return {
      filename,
      kind: 'gif',
    };
  }

  const filename = `geminimate-svg-${createTimestamp()}.png`;
  await downloadSvgMarkupAsPng(payload.markup, filename);
  return {
    filename,
    kind: 'png',
  };
};

const bindShareButton = (button: HTMLButtonElement, host: HTMLElement): void => {
  if (BOUND_SHARE_BUTTONS.has(button)) {
    return;
  }

  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    emitNativeSvgDiagnostic('info', 'share-click');

    void runButtonAction(button, async () => {
      const payload = await hydrateHostPayload(host);
      if (!payload) {
        throw new Error('svg_payload_unavailable');
      }

      const html = payload.html || wrapHtmlDocument(payload.markup, 'SVG Share');
      const opened = await sendShareOpenRequest(html, 'SVG Share');
      emitNativeSvgDiagnostic(opened ? 'info' : 'warn', 'share-open', {
        opened,
        strategy: payload.strategy,
      });
    }).catch((error: unknown) => {
      emitNativeSvgDiagnostic('error', 'share-failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  });

  BOUND_SHARE_BUTTONS.add(button);
};

const bindImageDownloadButton = (button: HTMLButtonElement, host: HTMLElement): void => {
  if (BOUND_IMAGE_DOWNLOAD_BUTTONS.has(button)) {
    return;
  }

  button.addEventListener(
    'click',
    (event) => {
      if (!nativeSvgCodeBlockDownloadEnabled) {
        emitNativeSvgDiagnostic('warn', 'image-download-disabled');
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      emitNativeSvgDiagnostic('info', 'image-download-click');

      void runButtonAction(button, async () => {
        const payload = await hydrateHostPayload(host);
        if (!payload) {
          throw new Error('svg_payload_unavailable');
        }

        const result = await triggerMarkupDownload(payload);
        emitNativeSvgDiagnostic('info', 'image-download-finished', {
          filename: result.filename,
          kind: result.kind,
          strategy: payload.strategy,
        });
      }).catch((error: unknown) => {
        emitNativeSvgDiagnostic('error', 'image-download-failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      });
    },
    true,
  );

  BOUND_IMAGE_DOWNLOAD_BUTTONS.add(button);
};

const isHostBindingStable = (host: HTMLElement): boolean => {
  const toolbar = getToolbar(host);
  const actionsContainer = getActionsContainer(host);
  if (!toolbar || !actionsContainer) {
    return false;
  }

  const hasPreviewFrame = getPreviewFrame(host) instanceof HTMLIFrameElement;
  const hasShareButton =
    actionsContainer.querySelector(`button[${SHARE_BUTTON_ATTR}="1"]`) instanceof HTMLButtonElement;
  const hasImageDownloadButton =
    actionsContainer.querySelector(`button[${IMAGE_DOWNLOAD_BUTTON_ATTR}="1"]`) instanceof HTMLButtonElement;

  return hasPreviewFrame && hasShareButton && hasImageDownloadButton;
};

const processNativeSvgCodeBlockHost = (host: HTMLElement): void => {
  if (BOUND_HOSTS.has(host) && isHostBindingStable(host)) {
    return;
  }

  const toolbar = getToolbar(host);
  const actionsContainer = getActionsContainer(host);
  if (!toolbar || !actionsContainer) {
    return;
  }

  cleanupLegacyUi(host);
  const label = toolbar.querySelector('.svg-label');
  if (label) {
    label.textContent = LABEL_TEXT;
  }

  const shareButton = ensureShareButton(host);
  const imageDownloadButton = ensureImageDownloadButton(host);
  if (!shareButton || !imageDownloadButton) {
    emitNativeSvgDiagnostic('warn', 'host-missing-buttons');
    return;
  }

  bindShareButton(shareButton, host);
  bindImageDownloadButton(imageDownloadButton, host);
  reorderToolbarButtons(host);
  BOUND_HOSTS.add(host);
  emitNativeSvgDiagnostic('info', 'host-bound');
};

export const processNativeSvgCodeBlocks = (): void => {
  document.querySelectorAll<HTMLElement>(HOST_SELECTOR).forEach(processNativeSvgCodeBlockHost);
};

export const setNativeSvgCodeBlockDownloadEnabled = (enabled: boolean): void => {
  nativeSvgCodeBlockDownloadEnabled = enabled;
};
