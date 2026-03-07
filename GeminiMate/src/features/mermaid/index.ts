import { debugService } from '@/core/services/DebugService';

const STYLE_ID = 'gm-mermaid-style';
const DIAGRAM_CLASS = 'gm-mermaid-diagram';
const TOGGLE_CLASS = 'gm-mermaid-toggle';
const TOGGLE_BUTTON_CLASS = 'gm-mermaid-toggle-button';
const DOWNLOAD_BUTTON_CLASS = 'gm-code-download-button';
const ICON_BUTTON_CLASS = 'gm-code-action-button';
const MERMAID_HOST_ATTR = 'data-gm-mermaid-host';
const DOWNLOAD_BUTTON_ATTR = 'data-gm-code-download';
const VIEW_ATTR = 'data-gm-mermaid-view';
const CODE_ATTR = 'data-gm-mermaid-code';
const PROCESSING_ATTR = 'data-gm-mermaid-processing';
const FONT_ATTR = 'data-gm-mermaid-font';

type MermaidModule = Awaited<typeof import('mermaid')>['default'];
type MermaidView = 'diagram' | 'code';

let mermaidInstance: MermaidModule | null = null;
let mermaidLoadFailed = false;
let mermaidInitialized = false;
let started = false;
let renderEnabled = true;
let observer: MutationObserver | null = null;
let debounceTimer: number | null = null;
const startupTimerIds = new Set<number>();
let fullscreenModal: HTMLElement | null = null;
let fullscreenKeydownHandler: ((event: KeyboardEvent) => void) | null = null;
const TRACE_ENABLED = false;
const DEFAULT_MERMAID_FONT_FAMILY = 'Google Sans, Roboto, sans-serif';
const STABLE_MERMAID_FONT_FAMILY =
  "'Google Sans', Roboto, 'PingFang SC', 'Noto Sans CJK SC', 'Microsoft YaHei', sans-serif";
let resolvedMermaidFontFamily = STABLE_MERMAID_FONT_FAMILY;
const boundDownloadButtons = new WeakSet<HTMLButtonElement>();
const boundToggleButtons = new WeakSet<HTMLButtonElement>();
const boundDiagramContainers = new WeakSet<HTMLElement>();

const GENERIC_LANGUAGE_LABELS = new Set([
  '代码段',
  '代码',
  '代码块',
  '示例',
  '示例代码',
  'code',
  'code snippet',
  'snippet',
  'example',
  'sample',
  'text',
  'plain',
  'plaintext',
  'raw',
  'output',
  'result',
]);

const MERMAID_PREFIXES = [
  '%%',
  'graph',
  'flowchart',
  'sequenceDiagram',
  'classDiagram',
  'stateDiagram',
  'erDiagram',
  'gantt',
  'pie',
  'gitGraph',
  'journey',
  'mindmap',
  'timeline',
  'zenuml',
  'quadrantChart',
  'requirementDiagram',
  'requirement',
  'sankey-beta',
  'sankey',
  'C4Context',
  'C4Container',
  'C4Component',
  'C4Dynamic',
  'C4Deployment',
  'xychart-beta',
  'xychart',
  'block-beta',
  'block',
  'packet-beta',
  'packet',
  'architecture-beta',
  'architecture',
  'kanban',
  'radar-beta',
  'treemap',
];

const LANGUAGE_EXTENSION_MAP: Record<string, string> = {
  bash: 'sh',
  shell: 'sh',
  sh: 'sh',
  zsh: 'sh',
  powershell: 'ps1',
  ps1: 'ps1',
  python: 'py',
  py: 'py',
  javascript: 'js',
  js: 'js',
  typescript: 'ts',
  ts: 'ts',
  tsx: 'tsx',
  jsx: 'jsx',
  json: 'json',
  html: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'sass',
  less: 'less',
  markdown: 'md',
  md: 'md',
  yaml: 'yml',
  yml: 'yml',
  xml: 'xml',
  sql: 'sql',
  c: 'c',
  cpp: 'cpp',
  'c++': 'cpp',
  csharp: 'cs',
  cs: 'cs',
  java: 'java',
  kotlin: 'kt',
  go: 'go',
  rust: 'rs',
  ruby: 'rb',
  php: 'php',
  swift: 'swift',
  dart: 'dart',
  mermaid: 'mmd',
};

const DOWNLOAD_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3a1 1 0 0 1 1 1v8.59l2.3-2.29a1 1 0 1 1 1.4 1.41l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 1.4-1.41L11 12.59V4a1 1 0 0 1 1-1Zm-7 14a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z" fill="currentColor"/>
  </svg>
`;

const logTrace = (event: string, detail?: Record<string, unknown>): void => {
  if (!TRACE_ENABLED) return;
  debugService.log('mermaid', event, detail);
  console.info('[GM-TRACE][Mermaid]', event, detail ?? {});
};

export const _resetMermaidLoader = (): void => {
  mermaidInstance = null;
  mermaidLoadFailed = false;
  mermaidInitialized = false;
};

export const normalizeWhitespace = (code: string): string =>
  code
    .replace(/[\u00A0\u2002\u2003\u2009\u3000]/g, ' ')
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, '');

const resolveMermaidFontFamily = (): string => {
  // Keep Mermaid metrics stable and aligned with reference behavior.
  // Dynamic runtime font switching can cause label overflow/clipping.
  return STABLE_MERMAID_FONT_FAMILY || DEFAULT_MERMAID_FONT_FAMILY;
};

const syncResolvedMermaidFontFamily = (): boolean => {
  const next = resolveMermaidFontFamily();
  if (next === resolvedMermaidFontFamily) return false;
  resolvedMermaidFontFamily = next;
  // Mermaid caches theme variables internally; re-init when runtime font changed.
  mermaidInitialized = false;
  return true;
};

const waitForDocumentFonts = async (): Promise<void> => {
  if (!(document as Document & { fonts?: FontFaceSet }).fonts?.ready) return;
  const readyPromise = (document as Document & { fonts?: FontFaceSet }).fonts!.ready;
  await Promise.race([
    readyPromise,
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, 1200);
    }),
  ]);
};

export const isGenericLanguageLabel = (language: string | null): boolean => {
  if (!language) return true;
  return GENERIC_LANGUAGE_LABELS.has(language.toLowerCase());
};

export const isMermaidCode = (code: string): boolean => {
  const trimmed = normalizeWhitespace(code).trim();
  if (trimmed.length < 20) return false;

  const startsWithKeyword = MERMAID_PREFIXES.some((prefix) =>
    trimmed.toLowerCase().startsWith(prefix.toLowerCase()),
  );
  if (!startsWithKeyword) return false;

  const lines = trimmed.split('\n').filter((line) => line.trim().length > 0);
  if (lines.length < 2) return false;

  const lastLine = lines[lines.length - 1].trim();
  const incompleteEndings = ['-->', '---', '-.', '==>', ':::', '[', '(', '{', '|', '&', ','];
  return !incompleteEndings.some((ending) => lastLine.endsWith(ending));
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

    .code-block-decoration .buttons {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: flex-end !important;
      flex-wrap: nowrap !important;
      gap: 6px !important;
      margin-left: auto !important;
    }

    .${TOGGLE_CLASS} {
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

    .${ICON_BUTTON_CLASS} svg {
      width: 18px;
      height: 18px;
      display: block;
      fill: currentColor;
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

    .${DIAGRAM_CLASS} .label,
    .${DIAGRAM_CLASS} .edgeLabel,
    .${DIAGRAM_CLASS} foreignObject,
    .${DIAGRAM_CLASS} foreignObject * {
      overflow: visible !important;
    }

    .gm-mermaid-render-error {
      padding: 20px;
      text-align: center;
      color: #64748b;
    }

    .gm-mermaid-render-error strong {
      display: block;
      margin-bottom: 8px;
      color: #334155;
    }

    .gm-mermaid-modal {
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

    .gm-mermaid-modal.visible {
      opacity: 1;
    }

    .gm-mermaid-modal-content {
      max-width: min(92vw, 1600px);
      max-height: 88vh;
      overflow: auto;
      background: rgba(255, 255, 255, 0.96);
      border: 1px solid rgba(148, 163, 184, 0.22);
      border-radius: 20px;
      box-shadow: 0 24px 60px rgba(15, 23, 42, 0.3);
      padding: 20px;
    }

    .gm-mermaid-modal-close {
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

    .dark-theme .${TOGGLE_CLASS},
    html.dark .${TOGGLE_CLASS},
    body.dark .${TOGGLE_CLASS} {
      background: rgba(15, 23, 42, 0.72);
      border-color: rgba(148, 163, 184, 0.18);
    }

    .dark-theme .${TOGGLE_BUTTON_CLASS},
    html.dark .${TOGGLE_BUTTON_CLASS},
    body.dark .${TOGGLE_BUTTON_CLASS} {
      color: rgba(226, 232, 240, 0.88);
    }

    .dark-theme .${TOGGLE_BUTTON_CLASS}.active,
    html.dark .${TOGGLE_BUTTON_CLASS}.active,
    body.dark .${TOGGLE_BUTTON_CLASS}.active {
      color: #93c5fd;
      background: rgba(59, 130, 246, 0.2);
    }

    .dark-theme .${ICON_BUTTON_CLASS},
    html.dark .${ICON_BUTTON_CLASS},
    body.dark .${ICON_BUTTON_CLASS} {
      color: rgba(226, 232, 240, 0.88);
    }
  `;

  document.head.appendChild(style);
};

const getCodeBlockLanguage = (codeElement: Element): string | null => {
  const codeBlock = codeElement.closest('.code-block, code-block');
  if (!codeBlock) return null;

  const candidates: Array<Element | null> = [
    codeElement,
    codeElement.closest('pre'),
    codeBlock,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const attrValue =
      candidate.getAttribute('data-language') ||
      candidate.getAttribute('data-lang') ||
      candidate.getAttribute('lang');
    if (attrValue?.trim()) {
      return attrValue.trim().toLowerCase();
    }

    const className =
      candidate instanceof HTMLElement ? candidate.className : candidate.getAttribute('class') || '';
    const match = className.match(/(?:language|lang)-([a-z0-9+#._-]+)/i);
    if (match?.[1]) {
      return match[1].toLowerCase();
    }
  }

  const decoration = codeBlock.querySelector('.code-block-decoration');
  if (!decoration) return null;

  const languageLabel = decoration.querySelector(':scope > span');
  const value = languageLabel?.textContent?.trim().toLowerCase();
  return value || null;
};

export const loadMermaid = async (): Promise<MermaidModule | null> => {
  if (mermaidInstance) return mermaidInstance;
  if (mermaidLoadFailed) return null;

  try {
    const mod = await import('mermaid');
    mermaidInstance = mod.default;
    return mermaidInstance;
  } catch (error) {
    mermaidLoadFailed = true;
    logTrace('load-failed', { error: String(error) });
    return null;
  }
};

const initMermaid = async (): Promise<boolean> => {
  if (mermaidInitialized) return true;

  const mermaid = await loadMermaid();
  if (!mermaid) return false;

  const isDarkMode =
    document.body.classList.contains('dark-theme') ||
    document.body.getAttribute('data-theme') === 'dark' ||
    document.documentElement.classList.contains('dark') ||
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  resolvedMermaidFontFamily = resolveMermaidFontFamily();

  mermaid.initialize({
    startOnLoad: false,
    theme: isDarkMode ? 'dark' : 'default',
    securityLevel: 'loose',
    // Keep consistent with Gemini runtime typography and reference behavior.
    fontFamily: resolvedMermaidFontFamily,
    themeVariables: {
      fontFamily: resolvedMermaidFontFamily,
    },
    logLevel: 5,
  });

  mermaidInitialized = true;
  return true;
};

const normalizeCodeSource = (value: string): string =>
  value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

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

const ensureSvgFontStyleTag = (svg: SVGElement): void => {
  const defs = svg.querySelector('defs') ?? svg.insertBefore(document.createElementNS('http://www.w3.org/2000/svg', 'defs'), svg.firstChild);
  let style = defs.querySelector('style[data-gm-mermaid-font="1"]') as SVGStyleElement | null;
  if (!style) {
    style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.setAttribute('data-gm-mermaid-font', '1');
    defs.appendChild(style);
  }
  style.textContent = `
    text, tspan, .label, .nodeLabel, .edgeLabel, foreignObject, foreignObject * {
      font-family: ${resolvedMermaidFontFamily} !important;
    }
    .label, .edgeLabel, foreignObject, foreignObject * {
      overflow: visible !important;
      line-height: 1.25 !important;
    }
  `;
};

const serializeSvg = (svgElement: SVGElement): string => {
  const clone = svgElement.cloneNode(true);
  if (!(clone instanceof SVGElement)) {
    return svgElement.outerHTML;
  }

  if (!clone.getAttribute('xmlns')) {
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }

  if (!clone.getAttribute('xmlns:xlink')) {
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  }

  const defs = clone.querySelector('defs') ?? clone.insertBefore(document.createElementNS('http://www.w3.org/2000/svg', 'defs'), clone.firstChild);
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = `text, tspan, .label, .nodeLabel, .edgeLabel, foreignObject, foreignObject * { font-family: ${resolvedMermaidFontFamily} !important; }`;
  defs.appendChild(style);

  return new XMLSerializer().serializeToString(clone);
};

const applySvgFontFamily = (container: HTMLElement): void => {
  const svg = container.querySelector('svg');
  if (!(svg instanceof SVGElement)) return;
  svg.style.setProperty('font-family', resolvedMermaidFontFamily, 'important');
  svg.style.setProperty('overflow', 'visible', 'important');
  ensureSvgFontStyleTag(svg);
  svg.querySelectorAll<Element>('.label, .edgeLabel, foreignObject, foreignObject *').forEach((node) => {
    if (node instanceof SVGElement) {
      node.style.setProperty('overflow', 'visible', 'important');
      return;
    }
    if (node instanceof HTMLElement) {
      node.style.setProperty('overflow', 'visible', 'important');
      node.style.setProperty('line-height', '1.25', 'important');
    }
  });
};

const bindDownloadButton = (button: HTMLButtonElement, codeBlockHost: HTMLElement): void => {
  if (boundDownloadButtons.has(button)) return;
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    downloadCurrentContent(codeBlockHost);
  });
  boundDownloadButtons.add(button);
};

const bindToggleButton = (
  button: HTMLButtonElement,
  codeBlockHost: HTMLElement,
  view: MermaidView,
): void => {
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
    const svg = diagramContainer.querySelector('svg');
    if (svg) {
      openFullscreen(diagramContainer.innerHTML);
    }
  });
  boundDiagramContainers.add(diagramContainer);
};

const createTimestamp = (): string =>
  new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '');

const resolveExtension = (language: string | null): string => {
  const normalized = (language ?? '').trim().toLowerCase();
  if (!normalized) return 'txt';
  return LANGUAGE_EXTENSION_MAP[normalized] ?? 'txt';
};

const triggerDownload = (parts: BlobPart[], filename: string, contentType: string): void => {
  const blob = new Blob(parts, { type: contentType });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
};

const getCurrentView = (codeBlockHost: HTMLElement): MermaidView =>
  codeBlockHost.getAttribute(VIEW_ATTR) === 'code' ? 'code' : 'diagram';

const updateDownloadButtonState = (codeBlockHost: HTMLElement): void => {
  const button = codeBlockHost.querySelector(
    `[${DOWNLOAD_BUTTON_ATTR}="1"]`,
  ) as HTMLButtonElement | null;
  if (!button) return;

  const codeElement = getCodeElementFromHost(codeBlockHost);
  const sourceCode = normalizeCodeSource(codeElement?.textContent || '');
  const language = getCodeBlockLanguage(codeElement ?? codeBlockHost);
  const isMermaidHost = codeBlockHost.getAttribute(MERMAID_HOST_ATTR) === '1';
  const isDiagramView = isMermaidHost && getCurrentView(codeBlockHost) === 'diagram';
  const svgElement = getDiagramContainer(codeBlockHost)?.querySelector('svg');

  if (isDiagramView && svgElement instanceof SVGElement) {
    button.disabled = false;
    button.title = '下载 Mermaid 图像';
    button.setAttribute('aria-label', '下载 Mermaid 图像');
    return;
  }

  // Keep the button enabled even while the code element is still streaming;
  // downloadCurrentContent already handles empty source gracefully.
  button.disabled = false;
  const extension = resolveExtension(language);
  button.title = `下载代码 (.${extension})`;
  button.setAttribute('aria-label', `下载代码 (.${extension})`);
};

const downloadCurrentContent = (codeBlockHost: HTMLElement): void => {
  const codeElement = getCodeElementFromHost(codeBlockHost);
  const sourceCode = normalizeCodeSource(codeElement?.textContent || '');
  const language = getCodeBlockLanguage(codeElement ?? codeBlockHost);
  const isMermaidHost = codeBlockHost.getAttribute(MERMAID_HOST_ATTR) === '1';
  const isDiagramView = isMermaidHost && getCurrentView(codeBlockHost) === 'diagram';
  const svgElement = getDiagramContainer(codeBlockHost)?.querySelector('svg');

  if (isDiagramView && svgElement instanceof SVGElement) {
    const svgText = serializeSvg(svgElement);
    const filename = `geminimate-mermaid-${createTimestamp()}.svg`;
    triggerDownload([svgText], filename, 'image/svg+xml;charset=utf-8');
    logTrace('download-diagram', { filename, view: 'diagram' });
    return;
  }

  if (!sourceCode.trim()) {
    logTrace('download-skipped-empty', {
      language,
      mermaidHost: isMermaidHost,
    });
    return;
  }

  const extension = resolveExtension(language);
  const filename = `geminimate-code-${createTimestamp()}.${extension}`;
  const contentType =
    extension === 'json'
      ? 'application/json;charset=utf-8'
      : extension === 'svg'
        ? 'image/svg+xml;charset=utf-8'
        : 'text/plain;charset=utf-8';

  triggerDownload([sourceCode], filename, contentType);
  logTrace('download-code', {
    filename,
    language,
    view: isMermaidHost ? getCurrentView(codeBlockHost) : 'code',
  });
};

const createIconButton = (title: string): HTMLButtonElement => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `${ICON_BUTTON_CLASS} ${DOWNLOAD_BUTTON_CLASS}`;
  button.innerHTML = DOWNLOAD_ICON;
  button.title = title;
  button.setAttribute('aria-label', title);
  button.setAttribute(DOWNLOAD_BUTTON_ATTR, '1');
  return button;
};

const ensureDownloadButton = (codeBlockHost: HTMLElement): void => {
  const buttonsContainer = getButtonsContainer(codeBlockHost);
  if (!buttonsContainer) return;

  let button = buttonsContainer.querySelector(
    `[${DOWNLOAD_BUTTON_ATTR}="1"]`,
  ) as HTMLButtonElement | null;

  if (!button) {
    const copyButton = getCopyButton(codeBlockHost);
    button = createIconButton('下载代码');
    bindDownloadButton(button, codeBlockHost);

    if (copyButton) {
      buttonsContainer.insertBefore(button, copyButton);
    } else {
      buttonsContainer.appendChild(button);
    }

    logTrace('download-button-inserted', {
      language: getCodeBlockLanguage(getCodeElementFromHost(codeBlockHost) ?? codeBlockHost),
    });
  } else {
    bindDownloadButton(button, codeBlockHost);
  }

  updateDownloadButtonState(codeBlockHost);
};

const getToggleGroup = (codeBlockHost: HTMLElement): HTMLElement | null =>
  codeBlockHost.querySelector(`.${TOGGLE_CLASS}`) as HTMLElement | null;

const updateView = (codeBlockHost: HTMLElement, view: MermaidView): void => {
  const diagramContainer = getDiagramContainer(codeBlockHost);
  const codeContentContainer = getCodeContentContainer(
    codeBlockHost,
    getCodeElementFromHost(codeBlockHost) ?? undefined,
  );

  const nextView: MermaidView =
    view === 'diagram' && diagramContainer ? 'diagram' : 'code';

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

  updateDownloadButtonState(codeBlockHost);

  logTrace('view-updated', {
    view: nextView,
    mermaidHost: codeBlockHost.getAttribute(MERMAID_HOST_ATTR) === '1',
  });
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
  diagramButton.textContent = '图表';

  const codeButton = document.createElement('button');
  codeButton.type = 'button';
  codeButton.className = TOGGLE_BUTTON_CLASS;
  codeButton.dataset.view = 'code';
  codeButton.textContent = '代码';

  bindToggleButton(diagramButton, codeBlockHost, 'diagram');
  bindToggleButton(codeButton, codeBlockHost, 'code');

  group.append(diagramButton, codeButton);

  const downloadButton = buttonsContainer.querySelector(
    `[${DOWNLOAD_BUTTON_ATTR}="1"]`,
  ) as HTMLElement | null;
  const copyButton = getCopyButton(codeBlockHost);
  const insertionPoint = downloadButton ?? copyButton;
  if (insertionPoint) {
    buttonsContainer.insertBefore(group, insertionPoint);
  } else {
    buttonsContainer.appendChild(group);
  }
};

const setErrorDiagram = (diagramContainer: HTMLElement, error: string): void => {
  const shortError = error.length > 240 ? `${error.slice(0, 240)}...` : error;
  diagramContainer.innerHTML = `
    <div class="gm-mermaid-render-error">
      <strong>Mermaid 渲染失败</strong>
      <div>${shortError}</div>
      <div style="margin-top:8px;font-size:12px;">你仍然可以切回代码视图或直接下载源码。</div>
    </div>
  `;
};

const teardownMermaidHost = (codeBlockHost: HTMLElement, removeDownloadButton: boolean): void => {
  const diagramContainer = getDiagramContainer(codeBlockHost);
  diagramContainer?.remove();

  const toggleGroup = getToggleGroup(codeBlockHost);
  toggleGroup?.remove();

  if (removeDownloadButton) {
    codeBlockHost.querySelector(`[${DOWNLOAD_BUTTON_ATTR}="1"]`)?.remove();
  } else {
    updateDownloadButtonState(codeBlockHost);
  }

  const codeContentContainer = getCodeContentContainer(
    codeBlockHost,
    getCodeElementFromHost(codeBlockHost) ?? undefined,
  );
  if (codeContentContainer) {
    codeContentContainer.style.display = '';
  }

  codeBlockHost.removeAttribute(MERMAID_HOST_ATTR);
  codeBlockHost.removeAttribute(VIEW_ATTR);
  codeBlockHost.removeAttribute(CODE_ATTR);
  codeBlockHost.removeAttribute(FONT_ATTR);
  codeBlockHost.removeAttribute(PROCESSING_ATTR);
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
  modal.className = 'gm-mermaid-modal';

  const closeButton = document.createElement('button');
  closeButton.className = 'gm-mermaid-modal-close';
  closeButton.type = 'button';
  closeButton.textContent = '×';

  const content = document.createElement('div');
  content.className = 'gm-mermaid-modal-content';
  content.innerHTML = svgHtml;

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

const renderMermaid = async (codeElement: HTMLElement, sourceCode: string): Promise<void> => {
  const normalizedCode = normalizeWhitespace(sourceCode);
  const codeBlockHost = getCodeBlockHost(codeElement);
  if (!codeBlockHost) return;
  const fontChanged = syncResolvedMermaidFontFamily();
  const previousFont = codeBlockHost.getAttribute(FONT_ATTR) ?? '';
  const fontMismatch = previousFont !== resolvedMermaidFontFamily;
  const existingDiagram = getDiagramContainer(codeBlockHost);
  const hasRenderableDiagram =
    existingDiagram?.querySelector('svg') instanceof SVGElement;
  if (
    codeBlockHost.getAttribute(CODE_ATTR) === normalizedCode &&
    !fontChanged &&
    !fontMismatch &&
    hasRenderableDiagram
  ) {
    ensureDownloadButton(codeBlockHost);
    ensureToggleControls(codeBlockHost);
    if (existingDiagram) {
      bindDiagramContainer(existingDiagram);
      applySvgFontFamily(existingDiagram);
    }
    updateDownloadButtonState(codeBlockHost);
    return;
  }
  if (codeBlockHost.getAttribute(PROCESSING_ATTR) === '1') return;

  const codeContentContainer = getCodeContentContainer(codeBlockHost, codeElement);
  if (!codeContentContainer) return;

  codeBlockHost.setAttribute(PROCESSING_ATTR, '1');

  try {
    await waitForDocumentFonts();
    const ready = await initMermaid();
    if (!ready) {
      logTrace('load-unavailable');
      return;
    }
    const mermaid = await loadMermaid();
    if (!mermaid) return;

    const diagramContainer = ensureDiagramContainer(codeBlockHost, codeContentContainer);
    ensureDownloadButton(codeBlockHost);
    ensureToggleControls(codeBlockHost);
    codeBlockHost.setAttribute(MERMAID_HOST_ATTR, '1');

    const uniqueId = `gm-mermaid-${Math.random().toString(36).slice(2, 10)}`;
    try {
      const result = await mermaid.render(uniqueId, normalizedCode);
      const svg = typeof result === 'string' ? result : result.svg;
      diagramContainer.innerHTML = svg;
      applySvgFontFamily(diagramContainer);
      logTrace('rendered', { codeLength: normalizedCode.length });
    } catch (error) {
      setErrorDiagram(diagramContainer, String(error));
      logTrace('render-failed', { error: String(error) });
    }

    codeBlockHost.setAttribute(CODE_ATTR, normalizedCode);
    codeBlockHost.setAttribute(FONT_ATTR, resolvedMermaidFontFamily);
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
  logTrace('scan-start', { codeCount: codeElements.length, renderEnabled });

  codeElements.forEach((codeElement) => {
    const codeBlockHost = getCodeBlockHost(codeElement);
    if (!codeBlockHost) {
      return;
    }

    activeHosts.add(codeBlockHost);
    ensureDownloadButton(codeBlockHost);

    const code = normalizeCodeSource(codeElement.textContent || '');
    const language = getCodeBlockLanguage(codeElement);
    // Only render Mermaid after the response is complete (message-actions present).
    // This prevents parsing errors on incomplete/mid-stream Mermaid syntax.
    const responseEl = codeBlockHost.closest('model-response, .model-response, [data-message-author-role="model"]');
    const responseComplete = !responseEl || responseEl.querySelector('message-actions') !== null;
    const shouldRenderMermaid =
      renderEnabled &&
      responseComplete &&
      (language === 'mermaid' || (isGenericLanguageLabel(language) && isMermaidCode(code)));

    if (shouldRenderMermaid) {
      void renderMermaid(codeElement, code);
      return;
    }

    if (codeBlockHost.getAttribute(MERMAID_HOST_ATTR) === '1') {
      teardownMermaidHost(codeBlockHost, false);
      logTrace('mermaid-host-rolled-back', {
        language,
        codeLength: code.length,
      });
    } else {
      updateDownloadButtonState(codeBlockHost);
    }
  });

  document
    .querySelectorAll<HTMLElement>(`[${MERMAID_HOST_ATTR}="1"]`)
    .forEach((codeBlockHost) => {
      if (!activeHosts.has(codeBlockHost)) {
        teardownMermaidHost(codeBlockHost, false);
      }
    });
  logTrace('scan-end', { activeHostCount: activeHosts.size, renderEnabled });
};

const rollbackRenderedBlocks = (): void => {
  document.querySelectorAll<HTMLElement>('.code-block, code-block').forEach((codeBlockHost) => {
    teardownMermaidHost(codeBlockHost, true);
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
  }, 350);
};

const scheduleWarmupPasses = (): void => {
  [120, 700, 1600, 3000].forEach((delay) => {
    const timerId = window.setTimeout(() => {
      startupTimerIds.delete(timerId);
      if (!started) return;
      logTrace('warmup-scan', { delay });
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
      if (target?.closest(`.${DIAGRAM_CLASS}, .${TOGGLE_CLASS}, .${DOWNLOAD_BUTTON_CLASS}`)) {
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
    logTrace('mutation-detected', { count: mutations.length });
    scheduleProcess();
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
};

export async function startMermaid(): Promise<void> {
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
  void initMermaid();
  logTrace('start');
}

export function stopMermaid(): void {
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
  rollbackRenderedBlocks();
  closeFullscreen();
  document.getElementById(STYLE_ID)?.remove();
  mermaidInitialized = false;
  started = false;
  logTrace('stop');
}

export function isMermaidActive(): boolean {
  return started;
}

export function setMermaidRenderEnabled(enabled: boolean): void {
  renderEnabled = enabled;
  logTrace('render-toggle', { enabled });
  scheduleProcess();
}
