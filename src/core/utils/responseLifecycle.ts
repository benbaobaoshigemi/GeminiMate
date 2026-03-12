const MODEL_RESPONSE_ROOT_SELECTOR = [
  'model-response',
  '.model-response',
  '[data-message-author-role="model"]',
  '[aria-label="Gemini response"]',
  '.presented-response-container',
  '.response-container',
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
  'button[aria-label*="Stop generating"]',
  'button[aria-label*="Stop response"]',
  `button[aria-label*="${STOP_GENERATING_ZH}"]`,
  '[data-test-id*="stop"][data-test-id*="response"]',
  '[data-test-id*="stop"][data-test-id*="generate"]',
].join(', ');

const resolveElement = (node: Node | Element | null): Element | null => {
  if (!node) return null;
  if (node instanceof Element) return node;
  return node.parentElement;
};

export const isNodeInThoughtTree = (node: Node | Element | null): boolean => {
  const element = resolveElement(node);
  if (!element) return false;
  return element.closest(THOUGHT_TREE_SELECTOR) !== null;
};

export const isNodeInModelResponse = (node: Node | Element | null): boolean => {
  const element = resolveElement(node);
  if (!element) return false;
  return element.closest(MODEL_RESPONSE_ROOT_SELECTOR) !== null;
};

export const isAnyModelResponseStreaming = (
  root: ParentNode & {
    querySelector<K extends keyof HTMLElementTagNameMap>(selectors: K): HTMLElementTagNameMap[K] | null;
    querySelector<E extends Element = Element>(selectors: string): E | null;
  } = document,
): boolean => root.querySelector(STREAMING_HINT_SELECTOR) !== null;

export {
  MODEL_RESPONSE_ROOT_SELECTOR,
  THOUGHT_TREE_SELECTOR,
};
