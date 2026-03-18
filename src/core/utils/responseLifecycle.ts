const MODEL_RESPONSE_ROOT_SELECTOR = [
  'model-response',
  '.model-response',
  '[data-message-author-role="model"]',
  '[aria-label="Gemini response"]',
  '.presented-response-container',
  '.response-container',
].join(', ');

const MODEL_RESPONSE_COMPLETION_ROOT_SELECTOR = [
  'model-response',
  '.model-response',
  '[data-message-author-role="model"]',
  '[aria-label="Gemini response"]',
  '.response-container',
  '.response-content',
  '.response-container-content',
  '.presented-response-container',
].join(', ');

const STOP_GENERATING_ZH = '\u505c\u6b62\u751f\u6210';

const THOUGHT_TREE_SELECTOR = [
  'model-thoughts',
  '[data-test-id="thoughts-content"]',
  '.thoughts-container',
  '.thoughts-content',
  '.thoughts-content-expanded',
  '.thoughts-streaming',
  '.gm-thought-translation-layout',
  '.gm-thought-translation',
  '[data-gm-thought-replacement="1"]',
].join(', ');

// Keep only strong runtime streaming signals. Weak visual hints (e.g. sparkle icons)
// can remain in DOM after generation completes and cause permanent false positives.
const STREAMING_HINT_SELECTOR = [
  'model-response .deferred-response-indicator',
  '.model-response .deferred-response-indicator',
  '[data-message-author-role="model"] .deferred-response-indicator',
  '[aria-label="Gemini response"] .deferred-response-indicator',
  '.response-container .deferred-response-indicator',
  '.response-content .deferred-response-indicator',
  '.response-container-content .deferred-response-indicator',
  '.presented-response-container .deferred-response-indicator',
  'button[aria-label*="Stop generating"]',
  'button[aria-label*="Stop response"]',
  `button[aria-label*="${STOP_GENERATING_ZH}"]`,
  '[data-test-id*="stop"][data-test-id*="response"]',
  '[data-test-id*="stop"][data-test-id*="generate"]',
].join(', ');

const RESPONSE_COMPLETION_SIGNAL_SELECTOR = [
  'message-actions',
  '[data-test-id="copy-button"]',
  '[data-test-id="more-menu-button"]',
].join(', ');

const resolveElement = (node: Node | Element | null): Element | null => {
  if (!node) return null;
  if (node instanceof Element) return node;
  return node.parentElement;
};

const findModelResponseRoot = (node: Node | Element | null): Element | null => {
  const element = resolveElement(node);
  if (!element) return null;
  return element.closest(MODEL_RESPONSE_ROOT_SELECTOR);
};

const findModelResponseCompletionRoot = (node: Node | Element | null): Element | null => {
  const element = resolveElement(node);
  if (!element) return null;
  return element.closest(MODEL_RESPONSE_COMPLETION_ROOT_SELECTOR) ?? findModelResponseRoot(element);
};

const hasCompletionSignalNearby = (root: Element): boolean => {
  if (root.querySelector(RESPONSE_COMPLETION_SIGNAL_SELECTOR) !== null) return true;

  let current: Element | null = root;
  let depth = 0;
  while (current && depth < 4) {
    const parent = current.parentElement;
    if (!parent) break;
    if (parent.querySelector(RESPONSE_COMPLETION_SIGNAL_SELECTOR) !== null) return true;
    current = parent;
    depth += 1;
  }

  return false;
};

export interface ResponseCompletionWaitState {
  pending: boolean;
  timer: ReturnType<typeof setTimeout> | null;
}

export const createResponseCompletionWaitState = (): ResponseCompletionWaitState => ({
  pending: false,
  timer: null,
});

export const isNodeInThoughtTree = (node: Node | Element | null): boolean => {
  const element = resolveElement(node);
  if (!element) return false;
  return element.closest(THOUGHT_TREE_SELECTOR) !== null;
};

export const isNodeInModelResponse = (node: Node | Element | null): boolean => {
  return findModelResponseRoot(node) !== null;
};

export const isModelResponseComplete = (node: Node | Element | null): boolean => {
  const responseRoot = findModelResponseCompletionRoot(node);
  if (!responseRoot) return false;
  if (responseRoot.querySelector(STREAMING_HINT_SELECTOR) !== null) return false;
  return hasCompletionSignalNearby(responseRoot);
};

export const isAnyModelResponseStreaming = (
  root: ParentNode & {
    querySelector<K extends keyof HTMLElementTagNameMap>(selectors: K): HTMLElementTagNameMap[K] | null;
    querySelector<E extends Element = Element>(selectors: string): E | null;
  } = document,
): boolean => root.querySelector(STREAMING_HINT_SELECTOR) !== null;

export const cancelWaitForModelResponsesComplete = (state: ResponseCompletionWaitState): void => {
  state.pending = false;
  if (state.timer !== null) {
    clearTimeout(state.timer);
    state.timer = null;
  }
};

export const waitForModelResponsesComplete = (
  state: ResponseCompletionWaitState,
  onComplete: () => void,
  delayMs = 220,
): void => {
  state.pending = true;
  if (state.timer !== null) return;

  state.timer = setTimeout(() => {
    state.timer = null;
    if (!state.pending) return;
    if (isAnyModelResponseStreaming()) {
      waitForModelResponsesComplete(state, onComplete, delayMs);
      return;
    }
    state.pending = false;
    onComplete();
  }, delayMs);
};

export {
  MODEL_RESPONSE_COMPLETION_ROOT_SELECTOR,
  MODEL_RESPONSE_ROOT_SELECTOR,
  THOUGHT_TREE_SELECTOR,
};
