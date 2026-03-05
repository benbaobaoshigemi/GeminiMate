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
] as const;

let cleanupObserver: MutationObserver | null = null;
let refreshRafId: number | null = null;

const logTrace = (event: string, data: Record<string, unknown> = {}): void => {
  console.log(`[GM-TRACE][BottomCleanup] ${event}`, data);
  debugService.log('bottom-cleanup', event, data);
};

const countMatches = (selectors: readonly string[]): number => {
  return selectors.reduce((acc, selector) => acc + document.querySelectorAll(selector).length, 0);
};

const buildStyleText = (): string => {
  const disclaimerCss = BOTTOM_DISCLAIMER_SELECTORS.map(
    (selector) => `${selector} { visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; margin: 0 !important; }`,
  ).join('\n');
  const shadowCss = `${INPUT_SHADOW_SELECTORS.join(',\n')}, chat-window div.input-area-container::before, chat-window div.input-area-container::after, chat-window input-container::before, chat-window input-container::after {
  box-shadow: none !important;
  -webkit-box-shadow: none !important;
  filter: none !important;
  background: transparent !important;
  background-image: none !important;
  border-top: none !important;
}`;
  return `${disclaimerCss}\n${shadowCss}`;
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

const reportMatchCounts = (event: string): void => {
  logTrace(event, {
    disclaimerCount: countMatches(BOTTOM_DISCLAIMER_SELECTORS),
    inputShadowCount: countMatches(INPUT_SHADOW_SELECTORS),
  });
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

  cleanupObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style'],
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
