export const ACTION_BUTTON_BUSY_CLASS = 'gm-code-action-button--busy';

const ACTION_BUTTON_BUSY_ATTR = 'data-gm-action-busy';
const ACTION_BUTTON_WAS_DISABLED_ATTR = 'data-gm-action-was-disabled';

export const setActionButtonBusy = (button: HTMLButtonElement, busy: boolean): void => {
  if (busy) {
    if (button.getAttribute(ACTION_BUTTON_BUSY_ATTR) === '1') {
      return;
    }

    button.setAttribute(ACTION_BUTTON_BUSY_ATTR, '1');
    button.setAttribute(ACTION_BUTTON_WAS_DISABLED_ATTR, button.disabled ? '1' : '0');
    button.setAttribute('aria-busy', 'true');
    button.classList.add(ACTION_BUTTON_BUSY_CLASS);
    button.disabled = true;
    return;
  }

  if (button.getAttribute(ACTION_BUTTON_BUSY_ATTR) !== '1') {
    return;
  }

  const wasDisabled = button.getAttribute(ACTION_BUTTON_WAS_DISABLED_ATTR) === '1';
  button.disabled = wasDisabled;
  button.removeAttribute(ACTION_BUTTON_BUSY_ATTR);
  button.removeAttribute(ACTION_BUTTON_WAS_DISABLED_ATTR);
  button.removeAttribute('aria-busy');
  button.classList.remove(ACTION_BUTTON_BUSY_CLASS);
};
