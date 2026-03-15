export type StatusToastLevel = 'info' | 'warning' | 'success' | 'error';

type ToastRecord = {
  id: string;
  element: HTMLDivElement;
  isFinal: boolean;
  timeoutId: ReturnType<typeof setTimeout> | null;
};

type ToastOptions = {
  autoDismissMs?: number;
  pending?: boolean;
  markFinal?: boolean;
};

export type StatusToastManager = {
  addToast: (message: string, level: StatusToastLevel, options?: ToastOptions) => string;
  removeToast: (id: string) => boolean;
  updateToast: (
    id: string,
    message: string,
    level: StatusToastLevel,
    options?: ToastOptions,
  ) => boolean;
  updateLatestPending: (
    message: string,
    level: StatusToastLevel,
    options?: ToastOptions,
  ) => boolean;
  setAnchorElement: (element: HTMLElement | null) => void;
  getToastElements: () => HTMLDivElement[];
  destroy: () => void;
};

type StatusToastManagerOptions = {
  containerId?: string;
  anchorTtlMs?: number;
  maxToasts?: number;
};

const STYLE_ID = 'gm-status-toast-style';
const DEFAULT_CONTAINER_ID = 'gm-status-toast-container';
const LEVEL_CLASSES: StatusToastLevel[] = ['info', 'warning', 'success', 'error'];

export function createStatusToastManager(
  options: StatusToastManagerOptions = {},
): StatusToastManager {
  const containerId = options.containerId ?? DEFAULT_CONTAINER_ID;
  const anchorTtlMs = options.anchorTtlMs ?? 8000;
  const maxToasts = options.maxToasts ?? 4;
  const toasts: ToastRecord[] = [];
  let anchorElement: HTMLElement | null = null;
  let anchorUpdatedAt = 0;
  let positionRaf: number | null = null;

  const ensureStyles = (): void => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
.gm-status-toast-container {
  position: fixed;
  z-index: 2147483647;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
  max-width: min(360px, calc(100vw - 24px));
}
.gm-status-toast {
  pointer-events: auto;
  font-family: "Segoe UI", Roboto, sans-serif;
  font-size: 13px;
  line-height: 1.4;
  padding: 10px 12px;
  border-radius: 999px;
  border: 1px solid rgba(59, 130, 246, 0.45);
  background: rgba(239, 246, 255, 0.96);
  color: #1d4ed8;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
  opacity: 0;
  transform: translateY(6px);
  transition: opacity 150ms ease, transform 150ms ease;
}
.gm-status-toast.show {
  opacity: 1;
  transform: translateY(0);
}
.gm-status-toast--info { border-color: rgba(59, 130, 246, 0.45); color: #1d4ed8; }
.gm-status-toast--warning { background: #fffbeb; border-color: rgba(245, 158, 11, 0.35); color: #b45309; }
.gm-status-toast--success { background: #f0fdf4; border-color: rgba(34, 197, 94, 0.35); color: #15803d; }
.gm-status-toast--error { background: #fef2f2; border-color: rgba(239, 68, 68, 0.35); color: #b91c1c; }
@media (prefers-color-scheme: dark) {
  .gm-status-toast {
    border-color: rgba(59, 130, 246, 0.45);
    background: rgba(10, 25, 47, 0.92);
    color: #93c5fd;
    box-shadow: 0 8px 24px rgba(2, 6, 23, 0.28);
  }
  .gm-status-toast--info { color: #93c5fd; }
  .gm-status-toast--warning { background: rgba(120, 53, 15, 0.92); color: #fcd34d; border-color: rgba(245, 158, 11, 0.35); }
  .gm-status-toast--success { background: rgba(20, 83, 45, 0.92); color: #86efac; border-color: rgba(34, 197, 94, 0.35); }
  .gm-status-toast--error { background: rgba(127, 29, 29, 0.92); color: #fca5a5; border-color: rgba(239, 68, 68, 0.35); }
}
.theme-host.dark-theme .gm-status-toast,
html.dark .gm-status-toast,
body.dark .gm-status-toast,
html[data-theme='dark'] .gm-status-toast,
body[data-theme='dark'] .gm-status-toast,
html[data-color-scheme='dark'] .gm-status-toast,
body[data-color-scheme='dark'] .gm-status-toast {
  border-color: rgba(59, 130, 246, 0.45);
  background: rgba(10, 25, 47, 0.92);
  color: #93c5fd;
  box-shadow: 0 8px 24px rgba(2, 6, 23, 0.28);
}
.theme-host.dark-theme .gm-status-toast--info,
html.dark .gm-status-toast--info,
body.dark .gm-status-toast--info,
html[data-theme='dark'] .gm-status-toast--info,
body[data-theme='dark'] .gm-status-toast--info,
html[data-color-scheme='dark'] .gm-status-toast--info,
body[data-color-scheme='dark'] .gm-status-toast--info {
  color: #93c5fd;
}
.theme-host.dark-theme .gm-status-toast--warning,
html.dark .gm-status-toast--warning,
body.dark .gm-status-toast--warning,
html[data-theme='dark'] .gm-status-toast--warning,
body[data-theme='dark'] .gm-status-toast--warning,
html[data-color-scheme='dark'] .gm-status-toast--warning,
body[data-color-scheme='dark'] .gm-status-toast--warning {
  background: rgba(120, 53, 15, 0.92);
  color: #fcd34d;
  border-color: rgba(245, 158, 11, 0.35);
}
.theme-host.dark-theme .gm-status-toast--success,
html.dark .gm-status-toast--success,
body.dark .gm-status-toast--success,
html[data-theme='dark'] .gm-status-toast--success,
body[data-theme='dark'] .gm-status-toast--success,
html[data-color-scheme='dark'] .gm-status-toast--success,
body[data-color-scheme='dark'] .gm-status-toast--success {
  background: rgba(20, 83, 45, 0.92);
  color: #86efac;
  border-color: rgba(34, 197, 94, 0.35);
}
.theme-host.dark-theme .gm-status-toast--error,
html.dark .gm-status-toast--error,
body.dark .gm-status-toast--error,
html[data-theme='dark'] .gm-status-toast--error,
body[data-theme='dark'] .gm-status-toast--error,
html[data-color-scheme='dark'] .gm-status-toast--error,
body[data-color-scheme='dark'] .gm-status-toast--error {
  background: rgba(127, 29, 29, 0.92);
  color: #fca5a5;
  border-color: rgba(239, 68, 68, 0.35);
}
`;
    document.head.appendChild(style);
  };

  const ensureContainer = (): HTMLDivElement => {
    const existing = document.getElementById(containerId);
    if (existing instanceof HTMLDivElement) return existing;
    const container = document.createElement('div');
    container.id = containerId;
    container.className = 'gm-status-toast-container';
    document.body.appendChild(container);
    return container;
  };

  const getAnchorRect = (): DOMRect | null => {
    if (!anchorElement || !anchorElement.isConnected) return null;
    if (Date.now() - anchorUpdatedAt > anchorTtlMs) return null;
    return anchorElement.getBoundingClientRect();
  };

  const schedulePositionUpdate = (): void => {
    if (positionRaf !== null) return;
    positionRaf = window.requestAnimationFrame(() => {
      positionRaf = null;
      positionContainer();
    });
  };

  const positionContainer = (): void => {
    const container = ensureContainer();
    const anchorRect = getAnchorRect();
    if (!anchorRect) {
      container.style.right = '20px';
      container.style.bottom = '82px';
      container.style.left = 'auto';
      container.style.top = 'auto';
      return;
    }

    const rect = container.getBoundingClientRect();
    const width = rect.width || container.offsetWidth || 280;
    const height = rect.height || container.offsetHeight || 48;
    const gap = 12;
    const padding = 10;

    let left = anchorRect.right + gap;
    if (left + width + padding > window.innerWidth) {
      left = anchorRect.left - width - gap;
    }
    left = Math.max(padding, Math.min(left, window.innerWidth - width - padding));

    const centerY = anchorRect.top + anchorRect.height / 2;
    let top = centerY - height / 2;
    top = Math.max(padding, Math.min(top, window.innerHeight - height - padding));

    container.style.left = `${left}px`;
    container.style.top = `${top}px`;
    container.style.right = 'auto';
    container.style.bottom = 'auto';
  };

  const applyLevelClass = (element: HTMLElement, level: StatusToastLevel): void => {
    element.classList.remove(...LEVEL_CLASSES.map((value) => `gm-status-toast--${value}`));
    element.classList.add(`gm-status-toast--${level}`);
  };

  const removeToastInternal = (toast: ToastRecord): void => {
    if (toast.timeoutId) {
      clearTimeout(toast.timeoutId);
      toast.timeoutId = null;
    }
    toast.element.remove();
    const index = toasts.findIndex((item) => item.id === toast.id);
    if (index >= 0) {
      toasts.splice(index, 1);
    }
    schedulePositionUpdate();
  };

  const scheduleDismiss = (toast: ToastRecord, autoDismissMs: number): void => {
    if (toast.timeoutId) {
      clearTimeout(toast.timeoutId);
    }
    toast.timeoutId = setTimeout(() => removeToastInternal(toast), autoDismissMs);
  };

  const addToast = (
    message: string,
    level: StatusToastLevel,
    options: ToastOptions = {},
  ): string => {
    ensureStyles();
    const container = ensureContainer();
    const toast = document.createElement('div');
    toast.className = 'gm-status-toast';
    toast.textContent = message;
    applyLevelClass(toast, level);
    container.appendChild(toast);

    const id = `gm-toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const record: ToastRecord = {
      id,
      element: toast,
      isFinal: options.pending ? false : true,
      timeoutId: null,
    };
    toasts.push(record);
    toast.addEventListener('click', () => removeToastInternal(record));

    if (toasts.length > maxToasts) {
      removeToastInternal(toasts[0]);
    }

    window.requestAnimationFrame(() => toast.classList.add('show'));
    schedulePositionUpdate();

    if (options.autoDismissMs && options.autoDismissMs > 0) {
      scheduleDismiss(record, options.autoDismissMs);
    }
    return id;
  };

  const removeToast = (id: string): boolean => {
    const record = toasts.find((item) => item.id === id);
    if (!record) return false;
    removeToastInternal(record);
    return true;
  };

  const updateToast = (
    id: string,
    message: string,
    level: StatusToastLevel,
    options: ToastOptions = {},
  ): boolean => {
    const record = toasts.find((item) => item.id === id);
    if (!record) return false;
    record.element.textContent = message;
    applyLevelClass(record.element, level);
    if (options.markFinal) {
      record.isFinal = true;
    }
    if (options.autoDismissMs && options.autoDismissMs > 0) {
      scheduleDismiss(record, options.autoDismissMs);
    }
    schedulePositionUpdate();
    return true;
  };

  const updateLatestPending = (
    message: string,
    level: StatusToastLevel,
    options: ToastOptions = {},
  ): boolean => {
    const record = [...toasts].reverse().find((item) => !item.isFinal);
    if (!record) return false;
    record.element.textContent = message;
    applyLevelClass(record.element, level);
    if (options.markFinal) {
      record.isFinal = true;
    }
    if (options.autoDismissMs && options.autoDismissMs > 0) {
      scheduleDismiss(record, options.autoDismissMs);
    }
    schedulePositionUpdate();
    return true;
  };

  const setAnchorElement = (element: HTMLElement | null): void => {
    if (!element) return;
    anchorElement = element;
    anchorUpdatedAt = Date.now();
    schedulePositionUpdate();
  };

  const destroy = (): void => {
    for (const toast of [...toasts]) {
      removeToastInternal(toast);
    }
    const container = document.getElementById(containerId);
    if (container) {
      container.remove();
    }
  };

  return {
    addToast,
    removeToast,
    updateToast,
    updateLatestPending,
    setAnchorElement,
    getToastElements: () => toasts.map((item) => item.element),
    destroy,
  };
}
