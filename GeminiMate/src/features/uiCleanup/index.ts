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

  /*
   * Panoramic mode: eliminate the dark areas around the (centered/limited-width) input box.
   *
   * Root cause analysis from HTML inspection:
   * 1. input-container IS the input-gradient Angular component (_nghost-ng-c2403657804).
   *    Its ::before pseudo-element draws a semi-transparent gradient that overlays the last
   *    50px of the chat scroll area — removed below.
   * 2. fieldset.input-area-container has max-width:830px centered inside the full-width
   *    input-container. The sides of input-container (outside 830px) appear dark because
   *    they show the parent background. Fix: extend fieldset to fill its container.
   * 3. chat-window-content (the scroll area) may be clipped short. Removing bottom padding
   *    lets it use more vertical space.
   */
  const gradientMaskCss = `
/* Remove the gradient fade that obscures bottom of chat content */
input-gradient::before,
.input-gradient::before,
input-container::before,
input-container::after {
  content: none !important;
  display: none !important;
  background: none !important;
  opacity: 0 !important;
}

/* Make input-gradient component itself fully transparent so nothing dark leaks around the input box */
input-gradient,
.input-gradient,
chat-window input-container {
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
}

/* Extend the inner fieldset to fill the full container width,
   eliminating the dark patches on left/right of the input box */
fieldset.input-area-container {
  max-width: 100% !important;
  width: 100% !important;
}

/* Give the chat scroll area more room by removing excess bottom padding */
chat-window-content,
.chat-history {
  padding-bottom: 0 !important;
}`;

  return `${disclaimerCss}\n${shadowCss}\n${gradientMaskCss}`;
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
