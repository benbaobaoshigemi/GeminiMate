import { debugService } from '@/core/services/DebugService';
import { findLikelyNativeDownloadButtons } from '@/features/codeActions/nativeDownloadButton';
import {
  ACTION_BUTTON_BUSY_CLASS,
  setActionButtonBusy,
} from '@/features/codeActions/actionBusyState';
import { downloadSvgMarkupAsPng } from '@/features/codeActions/svgDownload';
import { downloadSvgMarkupAsGif } from '@/features/codeActions/svgGifDownload';
import { detectAnimatedSvgMarkup } from '@/features/codeActions/svgExportModel';
import {
  processNativeSvgCodeBlocks,
  setNativeSvgCodeBlockDownloadEnabled,
} from './nativeSvgCodeBlockDownload';

const STYLE_ID = 'gm-svg-render-style';
const DIAGRAM_CLASS = 'gm-svg-diagram';
const DOWNLOAD_BUTTON_CLASS = 'gm-code-download-button';
const SHARE_BUTTON_CLASS = 'gm-code-share-button';
const ICON_BUTTON_CLASS = 'gm-code-action-button';
const HOST_ATTR = 'data-gm-svg-host';
const CODE_ATTR = 'data-gm-svg-code';
const PROCESSING_ATTR = 'data-gm-svg-processing';
const MARKUP_ATTR = 'data-gm-svg-markup';
const DOWNLOAD_BUTTON_ATTR = 'data-gm-svg-download';
const SHARE_BUTTON_ATTR = 'data-gm-svg-share';
const NATIVE_DOWNLOAD_PROXY_ATTR = 'data-gm-svg-native-download-proxy';
const NATIVE_DOWNLOAD_HIDDEN_ATTR = 'data-gm-svg-native-download-hidden';
const TRACE_ENABLED = false;
const DIAG_PREFIX = '[GeminiMate][SVG-DIAG][renderer]';

let started = false;
let renderEnabled = true;
let observer: MutationObserver | null = null;
let debounceTimer: number | null = null;
const startupTimerIds = new Set<number>();
let fullscreenModal: HTMLElement | null = null;
let fullscreenKeydownHandler: ((event: KeyboardEvent) => void) | null = null;
const boundDownloadButtons = new WeakSet<HTMLButtonElement>();
const boundShareButtons = new WeakSet<HTMLButtonElement>();
const boundNativeDownloadButtons = new WeakSet<HTMLButtonElement>();
const boundDiagramContainers = new WeakSet<HTMLElement>();

const DOWNLOAD_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 2v10h14V7H5Zm2 8 2.7-3.3a1 1 0 0 1 1.54 0L13 14l1.9-2.3a1 1 0 0 1 1.55.02L18 15H7Zm2-6.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" fill="currentColor"/>
  </svg>
`;
const SHARE_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M14 4h6v6h-2V7.41l-7.29 7.3-1.42-1.42L16.59 6H14V4Z" fill="currentColor"/>
    <path d="M5 5h6v2H7v10h10v-4h2v6H5V5Z" fill="currentColor"/>
  </svg>
`;

const logTrace = (event: string, detail?: Record<string, unknown>): void => {
  if (!TRACE_ENABLED) return;
  debugService.log('svg-renderer', event, detail);
};

const emitSvgRendererDiagnostic = (
  level: 'info' | 'warn' | 'error',
  event: string,
  detail?: Record<string, unknown>,
): void => {
  const payload = detail ? { event, ...detail } : { event };
  if (level === 'error') {
    console.error(DIAG_PREFIX, payload);
    return;
  }
  if (level === 'warn') {
    console.warn(DIAG_PREFIX, payload);
    return;
  }
  console.info(DIAG_PREFIX, payload);
};

const ensureStyles = (): void => {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .code-block-decoration .buttons {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: flex-end !important;
      flex-wrap: nowrap !important;
      gap: 6px !important;
      margin-left: auto !important;
      pointer-events: auto !important;
      position: relative !important;
      z-index: 2 !important;
    }

    .code-block-decoration .buttons > * {
      pointer-events: auto !important;
      position: relative;
      z-index: 2;
    }

    .${SHARE_BUTTON_CLASS} {
      order: 1;
      flex: 0 0 auto;
    }

    .${DOWNLOAD_BUTTON_CLASS} {
      order: 2;
      flex: 0 0 auto;
    }

    .code-block-decoration .buttons > .copy-button,
    .code-block-decoration .buttons > button.copy-button {
      order: 3;
      flex: 0 0 auto;
    }

    .${ICON_BUTTON_CLASS} {
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 999px;
      padding: 0;
      background: transparent;
      color: var(--gem-sys-color--on-surface-variant, #5f6368);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      vertical-align: middle;
      line-height: 1;
      pointer-events: auto !important;
      position: relative;
      z-index: 2;
      transition: background-color 160ms ease, color 160ms ease, opacity 160ms ease;
    }

    .${ICON_BUTTON_CLASS}:hover {
      background: rgba(148, 163, 184, 0.14);
      color: var(--gem-sys-color--on-surface, #111827);
    }

    .${ICON_BUTTON_CLASS}:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }

    .${ICON_BUTTON_CLASS}.${ACTION_BUTTON_BUSY_CLASS},
    .gm-svg-native-toolbar-button.${ACTION_BUTTON_BUSY_CLASS} {
      opacity: 0.88;
    }

    .${ICON_BUTTON_CLASS}.${ACTION_BUTTON_BUSY_CLASS}:disabled,
    .gm-svg-native-toolbar-button.${ACTION_BUTTON_BUSY_CLASS}:disabled {
      opacity: 0.88;
    }

    .${ICON_BUTTON_CLASS} svg {
      width: 18px;
      height: 18px;
      display: block;
      fill: currentColor;
    }

    .${ICON_BUTTON_CLASS}.${ACTION_BUTTON_BUSY_CLASS} svg,
    .gm-svg-native-toolbar-button.${ACTION_BUTTON_BUSY_CLASS} svg {
      opacity: 0.18;
    }

    .${ICON_BUTTON_CLASS}.${ACTION_BUTTON_BUSY_CLASS}::after,
    .gm-svg-native-toolbar-button.${ACTION_BUTTON_BUSY_CLASS}::after {
      content: '';
      position: absolute;
      width: 16px;
      height: 16px;
      border-radius: 999px;
      border: 2px solid rgba(148, 163, 184, 0.32);
      border-top-color: currentColor;
      animation: gm-svg-action-spin 720ms linear infinite;
    }

    svg-code-block .svg-toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: nowrap;
    }

    svg-code-block .svg-label {
      flex: 0 0 auto;
      color: #475569;
      font-weight: 500;
    }

    svg-code-block .svg-actions {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-inline-start: auto;
    }

    .gm-svg-native-toolbar-button {
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 999px;
      padding: 0;
      background: transparent;
      color: var(--gem-sys-color--on-surface-variant, #5f6368);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
      transition: background-color 160ms ease, color 160ms ease, opacity 160ms ease;
    }

    .gm-svg-native-toolbar-button:hover {
      background: rgba(148, 163, 184, 0.14);
      color: var(--gem-sys-color--on-surface, #111827);
    }

    .gm-svg-native-toolbar-button:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }

    .gm-svg-native-toolbar-button svg {
      width: 18px;
      height: 18px;
      display: block;
      fill: currentColor;
    }

    @keyframes gm-svg-action-spin {
      from {
        transform: rotate(0deg);
      }

      to {
        transform: rotate(360deg);
      }
    }

    svg-code-block .svg-preview {
      border-top: 1px solid rgba(148, 163, 184, 0.16);
    }

    .${DIAGRAM_CLASS} {
      display: none;
      padding: 16px 18px 18px;
      overflow: auto;
      text-align: center;
      cursor: zoom-in;
      border-top: 1px solid rgba(148, 163, 184, 0.16);
    }

    .${DIAGRAM_CLASS} svg {
      max-width: 100%;
      height: auto;
      overflow: visible !important;
    }

    .${DIAGRAM_CLASS} iframe {
      display: block;
      width: 100%;
      min-height: 160px;
      border: 0;
      background: transparent;
      pointer-events: none;
    }

    .gm-svg-modal {
      position: fixed;
      inset: 0;
      z-index: 2147483646;
      background: rgba(2, 6, 23, 0.84);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 160ms ease;
    }

    .gm-svg-modal.visible {
      opacity: 1;
    }

    .gm-svg-modal-content {
      max-width: min(92vw, 1600px);
      max-height: 88vh;
      overflow: auto;
      background: rgba(255, 255, 255, 0.96);
      border: 1px solid rgba(148, 163, 184, 0.22);
      border-radius: 20px;
      box-shadow: 0 24px 60px rgba(15, 23, 42, 0.3);
      padding: 20px;
    }

    .gm-svg-modal-close {
      position: fixed;
      top: 18px;
      right: 18px;
      width: 40px;
      height: 40px;
      border: none;
      border-radius: 999px;
      cursor: pointer;
      font-size: 18px;
      color: white;
      background: rgba(15, 23, 42, 0.66);
    }

    .gm-svg-render-error {
      padding: 20px;
      text-align: center;
      color: #64748b;
    }

    .gm-svg-render-error strong {
      display: block;
      margin-bottom: 8px;
      color: #334155;
    }

    @media (prefers-color-scheme: dark) {
      .gm-svg-modal-content {
        background: rgba(15, 23, 42, 0.94);
        border-color: rgba(148, 163, 184, 0.18);
        box-shadow: 0 24px 60px rgba(2, 6, 23, 0.48);
      }

      .gm-svg-modal-close {
        background: rgba(30, 41, 59, 0.88);
      }

      .gm-svg-render-error {
        color: #94a3b8;
      }

      .gm-svg-render-error strong {
        color: #e2e8f0;
      }
    }

    .theme-host.dark-theme .gm-svg-modal-content,
    html.dark .gm-svg-modal-content,
    body.dark .gm-svg-modal-content,
    html[data-theme='dark'] .gm-svg-modal-content,
    body[data-theme='dark'] .gm-svg-modal-content,
    html[data-color-scheme='dark'] .gm-svg-modal-content,
    body[data-color-scheme='dark'] .gm-svg-modal-content {
      background: rgba(15, 23, 42, 0.94);
      border-color: rgba(148, 163, 184, 0.18);
      box-shadow: 0 24px 60px rgba(2, 6, 23, 0.48);
    }

    .theme-host.dark-theme .gm-svg-modal-close,
    html.dark .gm-svg-modal-close,
    body.dark .gm-svg-modal-close,
    html[data-theme='dark'] .gm-svg-modal-close,
    body[data-theme='dark'] .gm-svg-modal-close,
    html[data-color-scheme='dark'] .gm-svg-modal-close,
    body[data-color-scheme='dark'] .gm-svg-modal-close {
      background: rgba(30, 41, 59, 0.88);
    }

    .theme-host.dark-theme .${ICON_BUTTON_CLASS},
    html.dark .${ICON_BUTTON_CLASS},
    body.dark .${ICON_BUTTON_CLASS},
    html[data-theme='dark'] .${ICON_BUTTON_CLASS},
    body[data-theme='dark'] .${ICON_BUTTON_CLASS},
    html[data-color-scheme='dark'] .${ICON_BUTTON_CLASS},
    body[data-color-scheme='dark'] .${ICON_BUTTON_CLASS} {
      color: rgba(226, 232, 240, 0.88);
    }

    .theme-host.dark-theme .gm-svg-native-toolbar-button,
    html.dark .gm-svg-native-toolbar-button,
    body.dark .gm-svg-native-toolbar-button,
    html[data-theme='dark'] .gm-svg-native-toolbar-button,
    body[data-theme='dark'] .gm-svg-native-toolbar-button,
    html[data-color-scheme='dark'] .gm-svg-native-toolbar-button,
    body[data-color-scheme='dark'] .gm-svg-native-toolbar-button {
      color: rgba(226, 232, 240, 0.88);
    }

    .theme-host.dark-theme .gm-svg-render-error,
    html.dark .gm-svg-render-error,
    body.dark .gm-svg-render-error,
    html[data-theme='dark'] .gm-svg-render-error,
    body[data-theme='dark'] .gm-svg-render-error,
    html[data-color-scheme='dark'] .gm-svg-render-error,
    body[data-color-scheme='dark'] .gm-svg-render-error {
      color: #94a3b8;
    }

    .theme-host.dark-theme .gm-svg-render-error strong,
    html.dark .gm-svg-render-error strong,
    body.dark .gm-svg-render-error strong,
    html[data-theme='dark'] .gm-svg-render-error strong,
    body[data-theme='dark'] .gm-svg-render-error strong,
    html[data-color-scheme='dark'] .gm-svg-render-error strong,
    body[data-color-scheme='dark'] .gm-svg-render-error strong {
      color: #e2e8f0;
    }
  `;

  document.head.appendChild(style);
};

const closeFullscreen = (): void => {
  if (fullscreenKeydownHandler) {
    document.removeEventListener('keydown', fullscreenKeydownHandler);
    fullscreenKeydownHandler = null;
  }
  if (!fullscreenModal) return;
  const modal = fullscreenModal;
  modal.classList.remove('visible');
  fullscreenModal = null;
  window.setTimeout(() => modal.remove(), 160);
};

const openFullscreen = (svgHtml: string): void => {
  if (fullscreenModal) return;

  const modal = document.createElement('div');
  modal.className = 'gm-svg-modal';

  const closeButton = document.createElement('button');
  closeButton.className = 'gm-svg-modal-close';
  closeButton.type = 'button';
  closeButton.textContent = '×';

  const content = document.createElement('div');
  content.className = 'gm-svg-modal-content';
  const viewer = document.createElement('iframe');
  viewer.setAttribute('aria-label', 'SVG 全屏预览');
  viewer.sandbox.add('allow-same-origin');
  viewer.srcdoc = createSvgPreviewDocument(svgHtml);
  viewer.style.width = '100%';
  viewer.style.height = '80vh';
  viewer.style.border = '0';
  content.appendChild(viewer);

  modal.append(closeButton, content);
  document.body.appendChild(modal);
  fullscreenModal = modal;

  closeButton.addEventListener('click', closeFullscreen);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeFullscreen();
    }
  });

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    closeFullscreen();
  };
  fullscreenKeydownHandler = onKeyDown;
  document.addEventListener('keydown', onKeyDown);
  requestAnimationFrame(() => modal.classList.add('visible'));
};

const normalizeSvgSource = (value: string): string =>
  value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

const getCodeBlockHost = (codeElement: Element): HTMLElement | null =>
  codeElement.closest('.code-block, code-block') as HTMLElement | null;

const getDecoration = (codeBlockHost: HTMLElement): HTMLElement | null =>
  codeBlockHost.querySelector('.code-block-decoration');

const getButtonsContainer = (codeBlockHost: HTMLElement): HTMLElement | null => {
  const decoration = getDecoration(codeBlockHost);
  if (!decoration) return null;

  const existing = decoration.querySelector(':scope > .buttons');
  if (existing instanceof HTMLElement) {
    return existing;
  }

  const buttons = document.createElement('div');
  buttons.className = 'buttons';
  decoration.appendChild(buttons);
  return buttons;
};

const getCopyButton = (codeBlockHost: HTMLElement): HTMLElement | null =>
  codeBlockHost.querySelector(
    '.code-block-decoration .buttons > .copy-button, .code-block-decoration .buttons > button.copy-button',
  ) as HTMLElement | null;

const getCodeElementFromHost = (codeBlockHost: HTMLElement): HTMLElement | null =>
  (codeBlockHost.querySelector('code[data-test-id="code-content"]') as HTMLElement | null) ??
  (codeBlockHost.querySelector('.formatted-code-block-internal-container code') as HTMLElement | null) ??
  (codeBlockHost.querySelector('pre code') as HTMLElement | null) ??
  (codeBlockHost.querySelector('code.code-container') as HTMLElement | null);

const getCodeContentContainer = (
  codeBlockHost: HTMLElement,
  fallbackCodeElement?: HTMLElement,
): HTMLElement | null =>
  (codeBlockHost.querySelector('.formatted-code-block-internal-container') as HTMLElement | null) ??
  (fallbackCodeElement?.closest('.formatted-code-block-internal-container') as HTMLElement | null) ??
  (fallbackCodeElement?.closest('pre') as HTMLElement | null) ??
  fallbackCodeElement ??
  null;

const getDiagramContainer = (codeBlockHost: HTMLElement): HTMLElement | null =>
  codeBlockHost.querySelector(`.${DIAGRAM_CLASS}`) as HTMLElement | null;

const createTimestamp = (): string =>
  new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '');

const openShareHtml = (html: string, title: string): boolean => {
  if (!html.trim()) {
    return false;
  }

  try {
    const runnerUrl = chrome.runtime.getURL('sandbox/runner.html');
    const previewWindow = window.open(runnerUrl, '_blank');
    if (!previewWindow) {
      return false;
    }

    const handleMessage = (event: MessageEvent): void => {
      if (event.source !== previewWindow || event.data?.type !== 'RUNNER_READY') {
        return;
      }

      window.removeEventListener('message', handleMessage);
      previewWindow.postMessage(
        {
          type: 'PREVIEW_HTML',
          html,
          title,
        },
        '*',
      );
    };

    window.addEventListener('message', handleMessage);
    return true;
  } catch {
    return false;
  }
};

const wrapHtmlDocument = (body: string, title: string, bodyStyle: string): string => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${title}</title>
  </head>
  <body style="${bodyStyle}">${body}</body>
</html>`;

const createIconButton = (
  title: string,
  icon: string,
  attrName: string,
  extraClassName: string,
): HTMLButtonElement => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `${ICON_BUTTON_CLASS} ${extraClassName}`;
  button.innerHTML = icon;
  button.title = title;
  button.setAttribute('aria-label', title);
  button.setAttribute(attrName, '1');
  return button;
};

const bindNativeDownloadButton = (button: HTMLButtonElement, codeBlockHost: HTMLElement): void => {
  if (boundNativeDownloadButtons.has(button)) return;
  button.addEventListener(
    'click',
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      void downloadCurrentContent(codeBlockHost);
    },
    true,
  );
  boundNativeDownloadButtons.add(button);
};

const syncNativeDownloadButtons = (codeBlockHost: HTMLElement): void => {
  const buttonsContainer = getButtonsContainer(codeBlockHost);
  if (!buttonsContainer) return;

  const nativeButtons = findLikelyNativeDownloadButtons(buttonsContainer, [
    `[${DOWNLOAD_BUTTON_ATTR}="1"]`,
    `[${SHARE_BUTTON_ATTR}="1"]`,
    '.copy-button',
  ]);

  nativeButtons.forEach((button) => {
    bindNativeDownloadButton(button, codeBlockHost);
    button.hidden = true;
    button.setAttribute(NATIVE_DOWNLOAD_PROXY_ATTR, '1');
    button.setAttribute(NATIVE_DOWNLOAD_HIDDEN_ATTR, '1');
  });
};

const restoreNativeDownloadButtons = (codeBlockHost: HTMLElement): void => {
  codeBlockHost
    .querySelectorAll<HTMLButtonElement>(`button[${NATIVE_DOWNLOAD_PROXY_ATTR}="1"]`)
    .forEach((button) => {
      button.hidden = false;
      button.removeAttribute(NATIVE_DOWNLOAD_PROXY_ATTR);
      button.removeAttribute(NATIVE_DOWNLOAD_HIDDEN_ATTR);
    });
};

const removeConflictingMermaidButtons = (codeBlockHost: HTMLElement): void => {
  codeBlockHost.querySelector('[data-gm-code-share="1"]')?.remove();
  codeBlockHost.querySelector('[data-gm-code-download="1"]')?.remove();
  codeBlockHost.querySelector('.gm-mermaid-toggle')?.remove();
};

const getCodeBlockLanguage = (codeElement: Element): string | null => {
  const codeBlock = codeElement.closest('.code-block, code-block');
  if (!codeBlock) return null;

  const decoration = codeBlock.querySelector('.code-block-decoration');
  if (!decoration) return null;

  const languageLabel = decoration.querySelector(':scope > span');
  const value = languageLabel?.textContent?.trim().toLowerCase();
  return value || null;
};

const isSvgCode = (code: string, language: string | null): boolean => {
  if (language === 'svg') return true;
  const trimmed = normalizeSvgSource(code).toLowerCase();
  if (!trimmed.startsWith('<svg')) return false;
  return trimmed.includes('</svg>');
};

const setErrorDiagram = (diagramContainer: HTMLElement, error: string): void => {
  const shortError = error.length > 240 ? `${error.slice(0, 240)}...` : error;
  diagramContainer.innerHTML = `
    <div class="gm-svg-render-error">
      <strong>SVG 渲染失败</strong>
      <div>${shortError}</div>
    </div>
  `;
};

type SanitizedSvgResult = {
  markup: string;
  aspectRatio: string;
};

const getSvgAspectRatio = (svg: Element): string => {
  const viewBox = svg.getAttribute('viewBox');
  if (viewBox) {
    const values = viewBox.trim().split(/[\s,]+/).map((value) => Number.parseFloat(value));
    if (values.length === 4 && Number.isFinite(values[2]) && Number.isFinite(values[3]) && values[2] > 0 && values[3] > 0) {
      return `${values[2]} / ${values[3]}`;
    }
  }

  const width = Number.parseFloat(svg.getAttribute('width') ?? '');
  const height = Number.parseFloat(svg.getAttribute('height') ?? '');
  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
    return `${width} / ${height}`;
  }

  return '16 / 9';
};

const ensureSvgNamespaces = (svg: Element): void => {
  if (!svg.getAttribute('xmlns')) {
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }

  const usesXlinkHref =
    svg.querySelector('[xlink\\:href]') !== null ||
    Array.from(svg.attributes).some((attribute) => attribute.name === 'xlink:href');
  if (usesXlinkHref && !svg.getAttribute('xmlns:xlink')) {
    svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  }
};

const sanitizeSvgMarkup = (source: string): SanitizedSvgResult => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(source, 'image/svg+xml');
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    throw new Error(parserError.textContent || 'Invalid SVG');
  }

  const svg = doc.documentElement;
  if (svg.tagName.toLowerCase() !== 'svg') {
    throw new Error('SVG root element is missing');
  }

  svg.querySelectorAll('script').forEach((node) => node.remove());
  svg.querySelectorAll('*').forEach((node) => {
    Array.from(node.attributes).forEach((attr) => {
      if (/^on/i.test(attr.name)) {
        node.removeAttribute(attr.name);
      }
    });
  });

  ensureSvgNamespaces(svg);

  return {
    markup: new XMLSerializer().serializeToString(svg),
    aspectRatio: getSvgAspectRatio(svg),
  };
};

const createSvgPreviewDocument = (svgMarkup: string): string => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        background: transparent;
        overflow: hidden;
      }

      body {
        display: flex;
        align-items: stretch;
        justify-content: center;
      }

      svg {
        width: 100%;
        height: 100%;
        display: block;
      }
    </style>
  </head>
  <body>${svgMarkup}</body>
</html>`;

import { isModelResponseComplete } from '@/core/utils/responseLifecycle';

const setDiagramMarkup = (
  codeBlockHost: HTMLElement,
  diagramContainer: HTMLElement,
  svgMarkup: string,
  aspectRatio: string,
): void => {
  codeBlockHost.setAttribute(MARKUP_ATTR, svgMarkup);
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-label', 'SVG 预览');
  frame.sandbox.add('allow-same-origin');
  frame.srcdoc = createSvgPreviewDocument(svgMarkup);
  frame.style.width = '100%';
  frame.style.aspectRatio = aspectRatio;
  frame.style.minHeight = '160px';
  frame.style.border = '0';
  codeBlockHost.setAttribute(MARKUP_ATTR, svgMarkup);
  diagramContainer.replaceChildren(frame);
};

const isResponseComplete = (codeBlockHost: HTMLElement): boolean => {
  return isModelResponseComplete(codeBlockHost);
};

const showDiagramOnly = (codeBlockHost: HTMLElement): void => {
  const diagramContainer = getDiagramContainer(codeBlockHost);
  const codeContentContainer = getCodeContentContainer(
    codeBlockHost,
    getCodeElementFromHost(codeBlockHost) ?? undefined,
  );

  if (diagramContainer) {
    diagramContainer.style.display = 'block';
  }

  if (codeContentContainer) {
    codeContentContainer.style.display = 'none';
  }
  updateDownloadButtonState(codeBlockHost);
};

const bindDiagramContainer = (diagramContainer: HTMLElement): void => {
  if (boundDiagramContainers.has(diagramContainer)) return;
  diagramContainer.addEventListener('click', () => {
    const codeBlockHost = diagramContainer.closest<HTMLElement>('.code-block, code-block');
    const svgMarkup = codeBlockHost?.getAttribute(MARKUP_ATTR) ?? '';
    if (svgMarkup) {
      openFullscreen(svgMarkup);
    }
  });
  boundDiagramContainers.add(diagramContainer);
};

const updateDownloadButtonState = (codeBlockHost: HTMLElement): void => {
  const button = codeBlockHost.querySelector(
    `[${DOWNLOAD_BUTTON_ATTR}="1"]`,
  ) as HTMLButtonElement | null;
  if (!button) return;

  const isSvgHost = codeBlockHost.getAttribute(HOST_ATTR) === '1';
  const svgMarkup = codeBlockHost.getAttribute(MARKUP_ATTR) ?? '';
  const codeElement = getCodeElementFromHost(codeBlockHost);
  const sourceCode = normalizeSvgSource(codeElement?.textContent || '');
  const effectiveMarkup = svgMarkup || sourceCode;

  if (isSvgHost && effectiveMarkup) {
    button.disabled = false;
    button.title = '下载图像 PNG/GIF';
    button.setAttribute('aria-label', '下载图像 PNG/GIF');
    return;
  }

  button.disabled = true;
  button.title = '暂无可下载图形';
  button.setAttribute('aria-label', '暂无可下载图形');
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

const shareCurrentContent = async (codeBlockHost: HTMLElement): Promise<void> => {
  const codeElement = getCodeElementFromHost(codeBlockHost);
  const sourceCode = normalizeSvgSource(codeElement?.textContent || '');
  const svgMarkup = codeBlockHost.getAttribute(MARKUP_ATTR) ?? '';
  const effectiveMarkup = svgMarkup || sourceCode;
  if (!effectiveMarkup.trim()) {
    emitSvgRendererDiagnostic('warn', 'share-empty');
    return;
  }

  const html = wrapHtmlDocument(
    effectiveMarkup,
    'SVG Share',
    'margin:0;padding:24px;background:#f8fafc;display:flex;justify-content:center;align-items:flex-start;',
  );
  const opened = openShareHtml(html, 'SVG Share');
  emitSvgRendererDiagnostic(opened ? 'info' : 'warn', 'share-open', {
    opened,
    markupLength: effectiveMarkup.length,
  });
};

const bindShareButton = (button: HTMLButtonElement, codeBlockHost: HTMLElement): void => {
  if (boundShareButtons.has(button)) return;
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    emitSvgRendererDiagnostic('info', 'share-click');
    void runButtonAction(button, () => shareCurrentContent(codeBlockHost)).catch((error: unknown) => {
      emitSvgRendererDiagnostic('error', 'share-failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  });
  boundShareButtons.add(button);
};

const updateShareButtonState = (codeBlockHost: HTMLElement): void => {
  const button = codeBlockHost.querySelector(
    `[${SHARE_BUTTON_ATTR}="1"]`,
  ) as HTMLButtonElement | null;
  if (!button) return;

  const codeElement = getCodeElementFromHost(codeBlockHost);
  const sourceCode = normalizeSvgSource(codeElement?.textContent || '');
  const svgMarkup = codeBlockHost.getAttribute(MARKUP_ATTR) ?? '';
  const canShare = !!(svgMarkup || sourceCode).trim();
  button.disabled = !canShare;
  button.title = canShare ? '分享到新窗口' : '当前图形暂不可分享';
  button.setAttribute('aria-label', button.title);
};

const downloadCurrentContent = async (codeBlockHost: HTMLElement): Promise<void> => {
  const codeElement = getCodeElementFromHost(codeBlockHost);
  const sourceCode = normalizeSvgSource(codeElement?.textContent || '');
  const svgMarkup = codeBlockHost.getAttribute(MARKUP_ATTR) ?? '';
  const isSvgHost = codeBlockHost.getAttribute(HOST_ATTR) === '1';
  const effectiveMarkup = svgMarkup || sourceCode;

  emitSvgRendererDiagnostic('info', 'download-start', {
    isSvgHost,
    markupLength: effectiveMarkup.length,
  });

  if (isSvgHost && effectiveMarkup) {
    const animated = detectAnimatedSvgMarkup(effectiveMarkup);
    if (animated) {
      const filename = `geminimate-svg-${createTimestamp()}.gif`;
      await downloadSvgMarkupAsGif(effectiveMarkup, filename);
      logTrace('download', {
        filename,
        kind: 'gif',
      });
      emitSvgRendererDiagnostic('info', 'download-gif', {
        filename,
      });
      return;
    }

    const filename = `geminimate-svg-${createTimestamp()}`;
    await downloadSvgMarkupAsPng(effectiveMarkup, filename);
    logTrace('download', {
      filename: `${filename}.png`,
      kind: 'png',
    });
    emitSvgRendererDiagnostic('info', 'download-png', {
      filename: `${filename}.png`,
    });
    return;
  }

  emitSvgRendererDiagnostic('warn', 'download-skipped-empty', {
    isSvgHost,
    markupLength: effectiveMarkup.length,
  });
};

const ensureShareButton = (codeBlockHost: HTMLElement): void => {
  const buttonsContainer = getButtonsContainer(codeBlockHost);
  if (!buttonsContainer) return;

  let button = buttonsContainer.querySelector(
    `[${SHARE_BUTTON_ATTR}="1"]`,
  ) as HTMLButtonElement | null;

  if (!button) {
    const copyButton = getCopyButton(codeBlockHost);
    button = createIconButton('分享到新窗口', SHARE_ICON, SHARE_BUTTON_ATTR, SHARE_BUTTON_CLASS);
    bindShareButton(button, codeBlockHost);

    if (copyButton) {
      buttonsContainer.insertBefore(button, copyButton);
    } else {
      buttonsContainer.appendChild(button);
    }
  } else {
    bindShareButton(button, codeBlockHost);
  }

  syncNativeDownloadButtons(codeBlockHost);
  updateShareButtonState(codeBlockHost);
};

const bindDownloadButton = (button: HTMLButtonElement, codeBlockHost: HTMLElement): void => {
  if (boundDownloadButtons.has(button)) return;
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    emitSvgRendererDiagnostic('info', 'download-click');
    void runButtonAction(button, () => downloadCurrentContent(codeBlockHost)).catch((error: unknown) => {
      emitSvgRendererDiagnostic('error', 'download-failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  });
  boundDownloadButtons.add(button);
};

const ensureDownloadButton = (codeBlockHost: HTMLElement): void => {
  const buttonsContainer = getButtonsContainer(codeBlockHost);
  if (!buttonsContainer) return;

  let button = buttonsContainer.querySelector(
    `[${DOWNLOAD_BUTTON_ATTR}="1"]`,
  ) as HTMLButtonElement | null;

  if (!button) {
    const copyButton = getCopyButton(codeBlockHost);
    button = createIconButton('下载图像 PNG/GIF', DOWNLOAD_ICON, DOWNLOAD_BUTTON_ATTR, DOWNLOAD_BUTTON_CLASS);
    bindDownloadButton(button, codeBlockHost);

    if (copyButton) {
      buttonsContainer.insertBefore(button, copyButton);
    } else {
      buttonsContainer.appendChild(button);
    }
  } else {
    bindDownloadButton(button, codeBlockHost);
  }

  syncNativeDownloadButtons(codeBlockHost);
  updateDownloadButtonState(codeBlockHost);
  updateShareButtonState(codeBlockHost);
};

const ensureDiagramContainer = (
  codeBlockHost: HTMLElement,
  codeContentContainer: HTMLElement,
): HTMLElement => {
  let diagramContainer = getDiagramContainer(codeBlockHost);
  if (diagramContainer) {
    bindDiagramContainer(diagramContainer);
    return diagramContainer;
  }

  diagramContainer = document.createElement('div');
  diagramContainer.className = DIAGRAM_CLASS;
  bindDiagramContainer(diagramContainer);
  codeContentContainer.parentElement?.insertBefore(diagramContainer, codeContentContainer);
  return diagramContainer;
};

const teardownSvgHost = (codeBlockHost: HTMLElement): void => {
  restoreNativeDownloadButtons(codeBlockHost);

  const diagramContainer = getDiagramContainer(codeBlockHost);
  diagramContainer?.remove();

  codeBlockHost.querySelector('.gm-svg-toggle')?.remove();
  codeBlockHost.querySelector(`[${SHARE_BUTTON_ATTR}="1"]`)?.remove();
  codeBlockHost.querySelector(`[${DOWNLOAD_BUTTON_ATTR}="1"]`)?.remove();

  const codeContentContainer = getCodeContentContainer(
    codeBlockHost,
    getCodeElementFromHost(codeBlockHost) ?? undefined,
  );
  if (codeContentContainer) {
    codeContentContainer.style.display = '';
  }

  codeBlockHost.removeAttribute(HOST_ATTR);
  codeBlockHost.removeAttribute(CODE_ATTR);
  codeBlockHost.removeAttribute(PROCESSING_ATTR);
  codeBlockHost.removeAttribute(MARKUP_ATTR);
};

const renderSvg = (codeElement: HTMLElement, sourceCode: string): void => {
  const normalizedCode = normalizeSvgSource(sourceCode);
  const codeBlockHost = getCodeBlockHost(codeElement);
  if (!codeBlockHost) return;

  removeConflictingMermaidButtons(codeBlockHost);

  const existingDiagram = getDiagramContainer(codeBlockHost);
  const hasRenderableDiagram =
    existingDiagram?.querySelector('iframe') instanceof HTMLIFrameElement ||
    existingDiagram?.querySelector('svg') instanceof SVGElement;
  if (codeBlockHost.getAttribute(CODE_ATTR) === normalizedCode && hasRenderableDiagram) {
    ensureShareButton(codeBlockHost);
    ensureDownloadButton(codeBlockHost);
    if (existingDiagram) {
      bindDiagramContainer(existingDiagram);
    }
    showDiagramOnly(codeBlockHost);
    return;
  }

  if (codeBlockHost.getAttribute(PROCESSING_ATTR) === '1') return;

  const codeContentContainer = getCodeContentContainer(codeBlockHost, codeElement);
  if (!codeContentContainer) return;

  codeBlockHost.setAttribute(PROCESSING_ATTR, '1');

  try {
    const diagramContainer = ensureDiagramContainer(codeBlockHost, codeContentContainer);
    ensureShareButton(codeBlockHost);
    ensureDownloadButton(codeBlockHost);
    codeBlockHost.setAttribute(HOST_ATTR, '1');

    try {
      const sanitized = sanitizeSvgMarkup(normalizedCode);
      setDiagramMarkup(codeBlockHost, diagramContainer, sanitized.markup, sanitized.aspectRatio);
      logTrace('rendered', { codeLength: normalizedCode.length });
    } catch (error) {
      setErrorDiagram(diagramContainer, String(error));
      logTrace('render-failed', { error: String(error) });
    }

    codeBlockHost.setAttribute(CODE_ATTR, normalizedCode);
    showDiagramOnly(codeBlockHost);
  } finally {
    codeBlockHost.removeAttribute(PROCESSING_ATTR);
  }
};

const processCodeBlocks = (): void => {
  if (!started) return;

  processNativeSvgCodeBlocks();

  const codeElements = document.querySelectorAll<HTMLElement>(
    'code[data-test-id="code-content"], .formatted-code-block-internal-container code, .code-block pre code, code.code-container',
  );

  const activeHosts = new Set<HTMLElement>();

  codeElements.forEach((codeElement) => {
    const codeBlockHost = getCodeBlockHost(codeElement);
    if (!codeBlockHost) return;

    activeHosts.add(codeBlockHost);

    // Avoid handling Mermaid-owned hosts here.
    if (codeBlockHost.getAttribute('data-gm-mermaid-host') === '1') {
      return;
    }

    const code = normalizeSvgSource(codeElement.textContent || '');
    const language = getCodeBlockLanguage(codeElement);
    const responseComplete = isResponseComplete(codeBlockHost);

    const shouldRenderSvg = renderEnabled && responseComplete && isSvgCode(code, language);
    if (shouldRenderSvg) {
      renderSvg(codeElement, code);
      return;
    }

    if (codeBlockHost.getAttribute(HOST_ATTR) === '1') {
      teardownSvgHost(codeBlockHost);
    }
  });

  document.querySelectorAll<HTMLElement>(`[${HOST_ATTR}="1"]`).forEach((codeBlockHost) => {
    if (!activeHosts.has(codeBlockHost)) {
      teardownSvgHost(codeBlockHost);
    }
  });

  codeElements.forEach((codeElement) => {
    const codeBlockHost = getCodeBlockHost(codeElement);
    if (!codeBlockHost) return;
    if (codeBlockHost.getAttribute(HOST_ATTR) !== '1') {
      codeBlockHost.querySelector(`[${SHARE_BUTTON_ATTR}="1"]`)?.remove();
      codeBlockHost.querySelector(`[${DOWNLOAD_BUTTON_ATTR}="1"]`)?.remove();
      return;
    }
    updateShareButtonState(codeBlockHost);
    updateDownloadButtonState(codeBlockHost);
  });
};

const scheduleProcess = (): void => {
  if (!started) return;
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = window.setTimeout(() => {
    debounceTimer = null;
    processCodeBlocks();
  }, 320);
};

const scheduleWarmupPasses = (): void => {
  [120, 700, 1600, 3000].forEach((delay) => {
    const timerId = window.setTimeout(() => {
      startupTimerIds.delete(timerId);
      if (!started) return;
      processCodeBlocks();
    }, delay);
    startupTimerIds.add(timerId);
  });
};

const setupObserver = (): void => {
  if (observer || !document.body) return;
  observer = new MutationObserver((mutations) => {
    const hasCodeMutation = mutations.some((mutation) => {
      const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
      if (target?.closest(`.${DIAGRAM_CLASS}`)) {
        return false;
      }
      if (target?.closest('.code-block, code-block, model-response')) {
        return true;
      }
      for (const node of Array.from(mutation.addedNodes)) {
        const element = node instanceof Element ? node : node.parentElement;
        if (element?.closest('.code-block, code-block, model-response')) {
          return true;
        }
      }
      return false;
    });
    if (!hasCodeMutation) return;
    scheduleProcess();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
};

export async function startSvgRenderer(): Promise<void> {
  if (started) {
    setNativeSvgCodeBlockDownloadEnabled(renderEnabled);
    scheduleProcess();
    scheduleWarmupPasses();
    return;
  }

  started = true;
  setNativeSvgCodeBlockDownloadEnabled(renderEnabled);
  ensureStyles();
  setupObserver();
  processCodeBlocks();
  scheduleWarmupPasses();
  logTrace('start');
}

export function stopSvgRenderer(): void {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  startupTimerIds.forEach((timerId) => clearTimeout(timerId));
  startupTimerIds.clear();

  document.querySelectorAll<HTMLElement>(`[${HOST_ATTR}="1"]`).forEach((host) => teardownSvgHost(host));
  closeFullscreen();
  document.getElementById(STYLE_ID)?.remove();
  setNativeSvgCodeBlockDownloadEnabled(false);
  started = false;
  logTrace('stop');
}

export function setSvgRenderEnabled(enabled: boolean): void {
  renderEnabled = enabled;
  setNativeSvgCodeBlockDownloadEnabled(enabled);
  scheduleProcess();
}

export function isSvgRendererActive(): boolean {
  return started;
}
