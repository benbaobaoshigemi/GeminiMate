import { debugService } from '@/core/services/DebugService';

const STYLE_ID = 'gm-svg-render-style';
const DIAGRAM_CLASS = 'gm-svg-diagram';
const TOGGLE_CLASS = 'gm-svg-toggle';
const TOGGLE_BUTTON_CLASS = 'gm-svg-toggle-button';
const HOST_ATTR = 'data-gm-svg-host';
const VIEW_ATTR = 'data-gm-svg-view';
const CODE_ATTR = 'data-gm-svg-code';
const PROCESSING_ATTR = 'data-gm-svg-processing';
const MARKUP_ATTR = 'data-gm-svg-markup';
const TRACE_ENABLED = false;

let started = false;
let renderEnabled = true;
let observer: MutationObserver | null = null;
let debounceTimer: number | null = null;
const startupTimerIds = new Set<number>();
let fullscreenModal: HTMLElement | null = null;
let fullscreenKeydownHandler: ((event: KeyboardEvent) => void) | null = null;
const boundToggleButtons = new WeakSet<HTMLButtonElement>();
const boundDiagramContainers = new WeakSet<HTMLElement>();

type SvgView = 'diagram' | 'code';

const logTrace = (event: string, detail?: Record<string, unknown>): void => {
  if (!TRACE_ENABLED) return;
  debugService.log('svg-renderer', event, detail);
  console.info('[GM-TRACE][SvgRenderer]', event, detail ?? {});
};

const ensureStyles = (): void => {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .${TOGGLE_CLASS} {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px;
      margin-inline-end: 6px;
      border-radius: 999px;
      border: 1px solid rgba(148, 163, 184, 0.22);
      background: rgba(248, 250, 252, 0.88);
    }

    .${TOGGLE_BUTTON_CLASS} {
      border: none;
      background: transparent;
      color: #475569;
      border-radius: 999px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      line-height: 1;
      padding: 6px 10px;
      transition: all 160ms ease;
    }

    .${TOGGLE_BUTTON_CLASS}.active {
      background: rgba(59, 130, 246, 0.16);
      color: #1d4ed8;
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
  closeButton.textContent = 'x';

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

const getToggleGroup = (codeBlockHost: HTMLElement): HTMLElement | null =>
  codeBlockHost.querySelector(`.${TOGGLE_CLASS}`) as HTMLElement | null;

const getCurrentView = (codeBlockHost: HTMLElement): SvgView =>
  codeBlockHost.getAttribute(VIEW_ATTR) === 'code' ? 'code' : 'diagram';

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
      <div style="margin-top:8px;font-size:12px;">你仍然可以切回代码视图查看源码。</div>
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

  if (!svg.getAttribute('xmlns')) {
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }

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

const setDiagramMarkup = (
  codeBlockHost: HTMLElement,
  diagramContainer: HTMLElement,
  svgMarkup: string,
  aspectRatio: string,
): void => {
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
  const responseEl = codeBlockHost.closest('model-response, .model-response, [data-message-author-role="model"]');
  if (!responseEl) return true;
  if (responseEl.querySelector('message-actions')) return true;
  if (responseEl.querySelector('.deferred-response-indicator')) return false;
  return false;
};

const updateView = (codeBlockHost: HTMLElement, view: SvgView): void => {
  const diagramContainer = getDiagramContainer(codeBlockHost);
  const codeContentContainer = getCodeContentContainer(
    codeBlockHost,
    getCodeElementFromHost(codeBlockHost) ?? undefined,
  );

  const nextView: SvgView = view === 'diagram' && diagramContainer ? 'diagram' : 'code';
  codeBlockHost.setAttribute(VIEW_ATTR, nextView);

  if (diagramContainer) {
    diagramContainer.style.display = nextView === 'diagram' ? 'block' : 'none';
  }

  if (codeContentContainer) {
    codeContentContainer.style.display = nextView === 'diagram' ? 'none' : '';
  }

  const buttons = codeBlockHost.querySelectorAll<HTMLButtonElement>(`.${TOGGLE_BUTTON_CLASS}`);
  buttons.forEach((button) => {
    button.classList.toggle('active', button.dataset.view === nextView);
  });
};

const bindToggleButton = (button: HTMLButtonElement, codeBlockHost: HTMLElement, view: SvgView): void => {
  if (boundToggleButtons.has(button)) return;
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    updateView(codeBlockHost, view);
  });
  boundToggleButtons.add(button);
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

const ensureToggleControls = (codeBlockHost: HTMLElement): void => {
  const buttonsContainer = getButtonsContainer(codeBlockHost);
  if (!buttonsContainer) return;

  const existingGroup = getToggleGroup(codeBlockHost);
  if (existingGroup) {
    const diagramButton = existingGroup.querySelector<HTMLButtonElement>(`.${TOGGLE_BUTTON_CLASS}[data-view="diagram"]`);
    const codeButton = existingGroup.querySelector<HTMLButtonElement>(`.${TOGGLE_BUTTON_CLASS}[data-view="code"]`);
    if (diagramButton && codeButton) {
      bindToggleButton(diagramButton, codeBlockHost, 'diagram');
      bindToggleButton(codeButton, codeBlockHost, 'code');
      return;
    }
    existingGroup.remove();
  }

  const group = document.createElement('div');
  group.className = TOGGLE_CLASS;

  const diagramButton = document.createElement('button');
  diagramButton.type = 'button';
  diagramButton.className = `${TOGGLE_BUTTON_CLASS} active`;
  diagramButton.dataset.view = 'diagram';
  diagramButton.textContent = '图形';

  const codeButton = document.createElement('button');
  codeButton.type = 'button';
  codeButton.className = TOGGLE_BUTTON_CLASS;
  codeButton.dataset.view = 'code';
  codeButton.textContent = '代码';

  bindToggleButton(diagramButton, codeBlockHost, 'diagram');
  bindToggleButton(codeButton, codeBlockHost, 'code');

  group.append(diagramButton, codeButton);

  const copyButton = getCopyButton(codeBlockHost);
  if (copyButton) {
    buttonsContainer.insertBefore(group, copyButton);
  } else {
    buttonsContainer.appendChild(group);
  }
};

const teardownSvgHost = (codeBlockHost: HTMLElement): void => {
  const diagramContainer = getDiagramContainer(codeBlockHost);
  diagramContainer?.remove();

  const toggleGroup = getToggleGroup(codeBlockHost);
  toggleGroup?.remove();

  const codeContentContainer = getCodeContentContainer(
    codeBlockHost,
    getCodeElementFromHost(codeBlockHost) ?? undefined,
  );
  if (codeContentContainer) {
    codeContentContainer.style.display = '';
  }

  codeBlockHost.removeAttribute(HOST_ATTR);
  codeBlockHost.removeAttribute(VIEW_ATTR);
  codeBlockHost.removeAttribute(CODE_ATTR);
  codeBlockHost.removeAttribute(PROCESSING_ATTR);
  codeBlockHost.removeAttribute(MARKUP_ATTR);
};

const renderSvg = (codeElement: HTMLElement, sourceCode: string): void => {
  const normalizedCode = normalizeSvgSource(sourceCode);
  const codeBlockHost = getCodeBlockHost(codeElement);
  if (!codeBlockHost) return;

  const existingDiagram = getDiagramContainer(codeBlockHost);
  const hasRenderableDiagram = existingDiagram?.querySelector('iframe') instanceof HTMLIFrameElement;
  if (codeBlockHost.getAttribute(CODE_ATTR) === normalizedCode && hasRenderableDiagram) {
    ensureToggleControls(codeBlockHost);
    if (existingDiagram) {
      bindDiagramContainer(existingDiagram);
    }
    return;
  }

  if (codeBlockHost.getAttribute(PROCESSING_ATTR) === '1') return;

  const codeContentContainer = getCodeContentContainer(codeBlockHost, codeElement);
  if (!codeContentContainer) return;

  codeBlockHost.setAttribute(PROCESSING_ATTR, '1');

  try {
    const diagramContainer = ensureDiagramContainer(codeBlockHost, codeContentContainer);
    ensureToggleControls(codeBlockHost);
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
    const currentView = codeBlockHost.getAttribute(VIEW_ATTR);
    updateView(codeBlockHost, currentView === 'code' ? 'code' : 'diagram');
  } finally {
    codeBlockHost.removeAttribute(PROCESSING_ATTR);
  }
};

const processCodeBlocks = (): void => {
  if (!started) return;

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
      if (target?.closest(`.${DIAGRAM_CLASS}, .${TOGGLE_CLASS}`)) {
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
    scheduleProcess();
    scheduleWarmupPasses();
    return;
  }

  started = true;
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
  started = false;
  logTrace('stop');
}

export function setSvgRenderEnabled(enabled: boolean): void {
  renderEnabled = enabled;
  scheduleProcess();
}

export function isSvgRendererActive(): boolean {
  return started;
}
