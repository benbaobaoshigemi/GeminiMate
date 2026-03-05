import { StorageKeys } from '../types/common';

const MAX_DEBUG_LOGS = 2000;
const DEBUG_LOG_KEY_PREFIX = `${StorageKeys.DEBUG_LOGS}:`;

export interface DebugLogEntry {
  readonly id: string;
  readonly ts: string;
  readonly source: string;
  readonly action: string;
  readonly context: string;
  readonly detail?: unknown;
}

const toSerializable = (value: unknown): unknown => {
  if (value === undefined) return undefined;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
};

export class DebugService {
  private static instance: DebugService;
  private enabled = false;
  private initialized = false;
  private context = 'unknown';
  private logsStorageKey = `${DEBUG_LOG_KEY_PREFIX}unknown`;
  private logs: DebugLogEntry[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private storageListener:
    | ((changes: Record<string, chrome.storage.StorageChange>, areaName: string) => void)
    | null = null;

  static getInstance(): DebugService {
    if (!DebugService.instance) {
      DebugService.instance = new DebugService();
    }
    return DebugService.instance;
  }

  async init(context: string): Promise<void> {
    this.context = context;
    this.logsStorageKey = `${DEBUG_LOG_KEY_PREFIX}${this.normalizeContext(context)}`;
    if (this.initialized) return;
    this.initialized = true;

    try {
      const result = await chrome.storage.local.get([
        StorageKeys.DEBUG_MODE,
        this.logsStorageKey,
        StorageKeys.DEBUG_LOGS,
      ]);
      this.enabled = result[StorageKeys.DEBUG_MODE] === true;
      const rawLogs = result[this.logsStorageKey] ?? result[StorageKeys.DEBUG_LOGS];
      this.logs = Array.isArray(rawLogs)
        ? rawLogs.slice(-MAX_DEBUG_LOGS).map((item) => toSerializable(item) as DebugLogEntry)
        : [];
    } catch (error) {
      console.warn('[GeminiMate][Debug] Failed to initialize debug service from storage', error);
      this.enabled = false;
      this.logs = [];
    }

    this.storageListener = (changes, areaName) => {
      if (areaName !== 'local') return;
      const change = changes[StorageKeys.DEBUG_MODE];
      if (!change) return;
      this.enabled = change.newValue === true;
      console.info('[GeminiMate][Debug] Debug mode changed', { enabled: this.enabled });
      if (this.enabled) {
        this.log('debug', 'mode-enabled', { context: this.context });
      }
    };
    chrome.storage.onChanged.addListener(this.storageListener);
    console.info('[GeminiMate][Debug] Debug service initialized', {
      context: this.context,
      enabled: this.enabled,
    });
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  log(source: string, action: string, detail?: unknown): void {
    if (!this.enabled) return;

    const entry: DebugLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ts: new Date().toISOString(),
      source,
      action,
      context: this.context,
      detail: toSerializable(detail),
    };
    this.logs.push(entry);
    if (this.logs.length > MAX_DEBUG_LOGS) {
      this.logs = this.logs.slice(-MAX_DEBUG_LOGS);
    }

    this.scheduleFlush();
  }

  async clearLogs(): Promise<void> {
    this.logs = [];
    try {
      const allData = await chrome.storage.local.get(null);
      const removeKeys = Object.keys(allData).filter((key) => key.startsWith(DEBUG_LOG_KEY_PREFIX));
      if (removeKeys.length > 0) {
        await chrome.storage.local.remove(removeKeys);
      }
      await chrome.storage.local.set({ [StorageKeys.DEBUG_LOGS]: [] });
    } catch (error) {
      console.warn('[GeminiMate][Debug] Failed to clear debug logs', error);
    }
  }

  private scheduleFlush(): void {
    if (this.flushTimer !== null) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flush();
    }, 250);
  }

  private async flush(): Promise<void> {
    try {
      await chrome.storage.local.set({ [this.logsStorageKey]: this.logs });
    } catch (error) {
      console.warn('[GeminiMate][Debug] Failed to flush debug logs', error);
    }
  }

  private normalizeContext(context: string): string {
    const normalized = context.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
    return normalized.length > 0 ? normalized : 'unknown';
  }
}

export const debugService = DebugService.getInstance();
