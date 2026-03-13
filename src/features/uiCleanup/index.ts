import { debugService } from '@/core/services/DebugService';

const STYLE_ID = 'gm-bottom-cleanup-style';

const BOTTOM_DISCLAIMER_SELECTORS = [
  '#app-root > main > side-navigation-v2 > mat-sidenav-container > mat-sidenav-content > div > div.content-container > chat-window > div > input-container > hallucination-disclaimer > div > p',
  'chat-window input-container hallucination-disclaimer',
  'chat-window input-container hallucination-disclaimer *',
] as const;

const INPUT_SHADOW_SELECTORS = [
  '#app-root > main > side-navigation-v2 > mat-sidenav-container > mat-sidenav-content > div > div.content-container > chat-window > div > input-container',
  '#app-root > main > side-navigation-v2 > mat-sidenav-container > mat-sidenav-content > div > div.content-container > chat-window > div > input-container > fieldset',
  '#app-root > main > side-navigation-v2 > mat-sidenav-container > mat-sidenav-content > div > div.content-container > chat-window > div > input-container > fieldset > input-area-v2 > div > div',
  'chat-window input-container',
  'chat-window input-container fieldset',
  'chat-window input-container input-area-v2 > div > div',
  'input-area-v2.input-box-shadow',
  'input-area-v2[class*="input-box-shadow"]',
] as const;

const INPUT_MASK_DIAGNOSTIC_SELECTORS = [
  'chat-window > div > input-container',
  'chat-window input-container',
  'input-container.input-gradient',
  '.autosuggest-scrim',
  '.hidden-content-image-cache',
  'fieldset.input-area-container',
] as const;

let cleanupObserver: MutationObserver | null = null;
let refreshRafId: number | null = null;

const logTrace = (event: string, data: Record<string, unknown> = {}): void => {
  debugService.log('bottom-cleanup', event, data);
  console.info('[GM-TRACE][BottomCleanup]', event, data);
};

const countMatches = (selectors: readonly string[]): number =>
  selectors.reduce((acc, selector) => acc + document.querySelectorAll(selector).length, 0);

const buildStyleText = (): string => {
  const disclaimerCss = BOTTOM_DISCLAIMER_SELECTORS.map(
    (selector) =>
      `${selector} { visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; margin: 0 !important; }`,
  ).join('\n');

  const shadowCss = `${INPUT_SHADOW_SELECTORS.join(',\n')} {
    box-shadow: none !important;
    -webkit-box-shadow: none !important;
    filter: none !important;
  }`;

  // Remove the gradient mask that appears above the input bar in panorama mode.
  const gradientCss = `
chat-window > div > input-container::before,
chat-window > div > input-container::after,
input-container.input-gradient::before,
input-container.input-gradient::after,
input-container[class*="input-gradient"]::before,
input-container[class*="input-gradient"]::after,
input-gradient::before,
input-gradient::after,
.input-gradient::before,
.input-gradient::after {
  display: none !important;
  content: none !important;
  background: transparent !important;
  opacity: 0 !important;
  mask-image: none !important;
  -webkit-mask-image: none !important;
}

.autosuggest-scrim,
chat-window-content > .autosuggest-scrim {
  display: none !important;
  opacity: 0 !important;
  pointer-events: none !important;
  background: transparent !important;
  background-image: none !important;
}`;

  return `${disclaimerCss}\n${shadowCss}\n${gradientCss}`;
};

const ensureStyle = (): void => {
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = buildStyleText();
};

const collectInputDiagnostics = (): Record<string, unknown> => {
  const inputHost = document.querySelector<HTMLElement>('chat-window input-container');
  const inputFieldset = document.querySelector<HTMLElement>('chat-window input-container fieldset.input-area-container');
  const rootContainer = document.querySelector<HTMLElement>('chat-window > div');
  const autosuggestScrim = document.querySelector<HTMLElement>('.autosuggest-scrim');

  return {
    disclaimerCount: countMatches(BOTTOM_DISCLAIMER_SELECTORS),
    inputShadowCount: countMatches(INPUT_SHADOW_SELECTORS),
    inputMaskCount: countMatches(INPUT_MASK_DIAGNOSTIC_SELECTORS),
    hostWidth: inputHost ? getComputedStyle(inputHost).width : null,
    hostMaxWidth: inputHost ? getComputedStyle(inputHost).maxWidth : null,
    hostPaddingInline: inputHost ? getComputedStyle(inputHost).paddingInline : null,
    fieldsetWidth: inputFieldset ? getComputedStyle(inputFieldset).width : null,
    rootWidth: rootContainer ? getComputedStyle(rootContainer).width : null,
    hasAutosuggestScrim: Boolean(autosuggestScrim),
  };
};

const reportMatchCounts = (event: string): void => {
  logTrace(event, collectInputDiagnostics());
};

export function startBottomCleanup(): void {
  ensureStyle();
  reportMatchCounts('start');

  if (cleanupObserver) {
    return;
  }

  cleanupObserver = new MutationObserver(() => {
    if (refreshRafId !== null) {
      return;
    }

    refreshRafId = requestAnimationFrame(() => {
      refreshRafId = null;
      if (!document.getElementById(STYLE_ID)) {
        return;
      }
      ensureStyle();
      reportMatchCounts('mutation-refresh');
    });
  });

  const root = document.querySelector('chat-window') ?? document.body;
  cleanupObserver.observe(root, {
    childList: true,
    subtree: true,
  });
}

export function stopBottomCleanup(): void {
  const style = document.getElementById(STYLE_ID);
  if (style) {
    style.remove();
  }

  if (cleanupObserver) {
    cleanupObserver.disconnect();
    cleanupObserver = null;
  }

  if (refreshRafId !== null) {
    cancelAnimationFrame(refreshRafId);
    refreshRafId = null;
  }

  logTrace('stop');
}

export function isBottomCleanupActive(): boolean {
  return document.getElementById(STYLE_ID) !== null;
}
