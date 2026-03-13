type ResolveConversationRootOptions = {
  userSelectors: string[];
  doc?: Document;
};

export const DEFAULT_USER_TURN_SELECTORS = [
  '.user-query-bubble-with-background',
  '.user-query-bubble-container',
  '.user-query-container',
  'user-query-content .user-query-bubble-with-background',
  'div[aria-label="User message"]',
  'article[data-author="user"]',
  'article[data-turn="user"]',
  '[data-message-author-role="user"]',
  'div[role="listitem"][data-user="true"]',
];

export const DEFAULT_ASSISTANT_TURN_SELECTORS = [
  '[aria-label="Gemini response"]',
  '[data-message-author-role="assistant"]',
  '[data-message-author-role="model"]',
  'article[data-author="assistant"]',
  'article[data-turn="assistant"]',
  'article[data-turn="model"]',
  '.model-response, model-response',
  '.response-container',
  'div[role="listitem"]:not([data-user="true"])',
];

const CONVERSATION_ROOT_CANDIDATES = [
  '#chat-history',
  'infinite-scroller.chat-history',
  'chat-window-content',
  'main',
];

export function normalizeSelectorList(selectors: readonly string[]): string[] {
  const out: string[] = [];
  for (const selector of selectors) {
    const parts = String(selector || '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    for (const part of parts) {
      if (!out.includes(part)) out.push(part);
    }
  }
  return out;
}

export function filterOutDeepResearchImmersiveNodes<T extends HTMLElement>(elements: T[]): T[] {
  return elements.filter((element) => !element.closest('deep-research-immersive-panel'));
}

export function filterTopLevelElements<T extends HTMLElement>(elements: readonly T[]): T[] {
  const out: T[] = [];
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    let isDescendant = false;
    for (let j = 0; j < elements.length; j++) {
      if (i === j) continue;
      if (elements[j].contains(element)) {
        isDescendant = true;
        break;
      }
    }
    if (!isDescendant) out.push(element);
  }
  return out;
}

function hasVisibleUserTurns(root: HTMLElement, userSelectors: string[]): boolean {
  if (userSelectors.length === 0) return false;
  const nodes = filterOutDeepResearchImmersiveNodes(
    Array.from(root.querySelectorAll<HTMLElement>(userSelectors.join(','))),
  );
  return nodes.length > 0;
}

export function resolveConversationRoot({
  userSelectors,
  doc = document,
}: ResolveConversationRootOptions): HTMLElement {
  const body = doc.body as HTMLElement;
  const normalizedSelectors = normalizeSelectorList(userSelectors);
  let firstCandidate: HTMLElement | null = null;

  for (const selector of CONVERSATION_ROOT_CANDIDATES) {
    const candidate = doc.querySelector(selector) as HTMLElement | null;
    if (!candidate) continue;
    if (!firstCandidate) firstCandidate = candidate;
    if (hasVisibleUserTurns(candidate, normalizedSelectors)) return candidate;
  }

  return firstCandidate || body;
}

export function findTopUserTurnElement(
  userSelectors: readonly string[],
  doc: Document = document,
): HTMLElement | null {
  const normalizedSelectors = normalizeSelectorList(userSelectors);
  if (normalizedSelectors.length === 0) return null;

  const root = resolveConversationRoot({ userSelectors: normalizedSelectors, doc });
  const nodes = filterOutDeepResearchImmersiveNodes(
    Array.from(root.querySelectorAll<HTMLElement>(normalizedSelectors.join(','))),
  );
  const topLevel = filterTopLevelElements(nodes);
  return topLevel[0] || null;
}