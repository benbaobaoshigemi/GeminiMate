const STYLE_ID = 'gm-youtube-recommendation-blocker-style';
const BLOCKED_ATTR = 'data-gm-youtube-recommendation-blocked';

const TARGET_SELECTORS = [
  '.attachment-container.youtube',
  'youtube-block',
  'link-block:has(a[href*="youtube.com/watch"])',
  'link-block:has(a[href*="youtu.be/"])',
  'p[data-path-to-node]:has(> response-element link-block a[href*="youtube.com/watch"])',
  'p[data-path-to-node]:has(> response-element link-block a[href*="youtu.be/"])',
  'p[data-path-to-node]:has(> link-block a[href*="youtube.com/watch"])',
  'p[data-path-to-node]:has(> link-block a[href*="youtu.be/"])',
  '[data-test-id*="source"]:has(a[href*="youtube.com/watch"])',
  '[data-test-id*="source"]:has(a[href*="youtu.be/"])',
] as const;

const YOUTUBE_LINK_SELECTOR = [
  'a[href*="youtube.com/watch"]',
  'a[href*="youtu.be/"]',
  'a[href*="youtube.com/shorts/"]',
].join(', ');

let observer: MutationObserver | null = null;
let refreshRafId: number | null = null;

const buildStyleText = (): string => `
${TARGET_SELECTORS.join(',\n')},
[${BLOCKED_ATTR}="1"] {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  max-height: 0 !important;
  overflow: hidden !important;
  pointer-events: none !important;
}
`;

const ensureStyle = (): void => {
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = buildStyleText();
};

const markBlocked = (element: Element | null): void => {
  if (!(element instanceof HTMLElement)) return;
  element.setAttribute(BLOCKED_ATTR, '1');
};

const resolveYoutubeBlockRoot = (anchor: HTMLAnchorElement): HTMLElement | null => {
  const paragraphContainer = anchor.closest<HTMLElement>(
    'p[data-path-to-node], li[data-path-to-node], div[data-path-to-node]',
  );
  if (
    paragraphContainer &&
    paragraphContainer.querySelector(
      'link-block a[href*="youtube.com/watch"], link-block a[href*="youtu.be/"], .attachment-container.youtube, youtube-block',
    )
  ) {
    return paragraphContainer;
  }

  const strongRoot = anchor.closest<HTMLElement>(
    'youtube-block, link-block, .attachment-container.youtube, .attachment-container, [data-test-id*="source"], [data-test-id*="grounding"]',
  );
  if (strongRoot) return strongRoot;

  let current: HTMLElement | null = anchor.parentElement;
  for (let depth = 0; current && depth < 5; depth += 1) {
    if (
      current.matches(
        'model-response, response-container, message-content, .markdown, .gm-thought-translation, .gm-thought-original',
      )
    ) {
      break;
    }

    if (current.childElementCount <= 6) {
      return current;
    }
    current = current.parentElement;
  }

  return anchor.parentElement;
};

const markStaticSelectors = (root: ParentNode): void => {
  TARGET_SELECTORS.forEach((selector) => {
    if (root instanceof Element && root.matches(selector)) {
      markBlocked(root);
    }
    root.querySelectorAll(selector).forEach((node) => markBlocked(node));
  });
};

const markYoutubeLinkRoots = (root: ParentNode): void => {
  const anchors = root.querySelectorAll<HTMLAnchorElement>(YOUTUBE_LINK_SELECTOR);
  anchors.forEach((anchor) => {
    const rootNode = resolveYoutubeBlockRoot(anchor);
    markBlocked(rootNode);
  });
};

const applyBlocker = (root: ParentNode): void => {
  markStaticSelectors(root);
  markYoutubeLinkRoots(root);
};

const clearBlockedMarks = (): void => {
  document.querySelectorAll(`[${BLOCKED_ATTR}="1"]`).forEach((node) => {
    node.removeAttribute(BLOCKED_ATTR);
  });
};

const refreshAll = (): void => {
  if (!document.getElementById(STYLE_ID)) return;
  ensureStyle();
  applyBlocker(document);
};

export function startYoutubeRecommendationBlocker(): void {
  ensureStyle();
  refreshAll();
  if (observer) return;

  observer = new MutationObserver(() => {
    if (refreshRafId !== null) return;
    refreshRafId = requestAnimationFrame(() => {
      refreshRafId = null;
      refreshAll();
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

export function stopYoutubeRecommendationBlocker(): void {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (refreshRafId !== null) {
    cancelAnimationFrame(refreshRafId);
    refreshRafId = null;
  }

  clearBlockedMarks();
  document.getElementById(STYLE_ID)?.remove();
}
