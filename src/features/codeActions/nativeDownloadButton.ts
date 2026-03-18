const DOWNLOAD_ICON_SELECTOR =
  'mat-icon[fonticon="download"], .google-symbols[data-mat-icon-name="download"], [data-mat-icon-name="download"]';

const DOWNLOAD_TEXT_PATTERN = /(下载|download)/i;

export function isLikelyNativeDownloadButton(
  button: HTMLButtonElement,
  ignoredSelectors: string[] = [],
): boolean {
  if (ignoredSelectors.some((selector) => button.matches(selector))) {
    return false;
  }

  if (button.classList.contains('copy-button')) {
    return false;
  }

  const dataTestId = (button.getAttribute('data-test-id') ?? '').toLowerCase();
  if (dataTestId.includes('download')) {
    return true;
  }

  if (button.querySelector(DOWNLOAD_ICON_SELECTOR)) {
    return true;
  }

  const label = [button.title, button.getAttribute('aria-label') ?? '', button.textContent ?? '']
    .join(' ')
    .trim();

  return DOWNLOAD_TEXT_PATTERN.test(label);
}

export function findLikelyNativeDownloadButtons(
  container: ParentNode | null,
  ignoredSelectors: string[] = [],
): HTMLButtonElement[] {
  if (!container) {
    return [];
  }

  return [...container.querySelectorAll('button')].filter((button) =>
    isLikelyNativeDownloadButton(button, ignoredSelectors),
  );
}
