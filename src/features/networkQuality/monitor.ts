import { debugService } from '@/core/services/DebugService';
import { logger } from '@/core/services/LoggerService';
import { StorageKeys } from '@/core/types/common';

import {
  appendNetworkQualitySample,
  createNetworkQualitySnapshot,
  DEFAULT_NETWORK_QUALITY_ENABLED,
  DEFAULT_NETWORK_QUALITY_INTERVAL_MS,
  DEFAULT_NETWORK_QUALITY_TIMEOUT_MS,
  normalizeNetworkQualitySnapshot,
  NETWORK_QUALITY_ALARM_NAME,
  NETWORK_QUALITY_ALARM_PERIOD_MINUTES,
  NETWORK_QUALITY_PROBE_URL,
  NETWORK_QUALITY_TARGET_HOST,
  pruneStaleNetworkQualitySnapshot,
  resolveNetworkQualityEnabled,
} from './model';
import type { NetworkQualityProbeSample, NetworkQualitySnapshot } from './types';

type ProbeNowResponse =
  | { ok: true; snapshot: NetworkQualitySnapshot }
  | { ok: false; error: string };

const PROBE_SETTLE_DELAY_MS = 50;

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'unknown_error';

export class NetworkQualityMonitor {
  private snapshot: NetworkQualitySnapshot = createNetworkQualitySnapshot();
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private probeTimer: ReturnType<typeof setTimeout> | null = null;
  private probeInFlight = false;

  public init(): Promise<void> {
    if (this.initialized) {
      return Promise.resolve();
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.loadSnapshot()
      .then(() => {
        this.initialized = true;
        this.ensureAlarm();
        this.ensureFreshProbe('init');
      })
      .finally(() => {
        this.initPromise = null;
      });

    return this.initPromise;
  }

  public handleAlarm(alarm: chrome.alarms.Alarm): void {
    if (alarm.name !== NETWORK_QUALITY_ALARM_NAME) {
      return;
    }

    void this.ensureInitialized().then(() => {
      this.ensureFreshProbe('alarm');
    });
  }

  public handleStorageChanged(
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ): void {
    if (areaName !== 'local') {
      return;
    }

    const enabledChange = changes[StorageKeys.NETWORK_QUALITY_ENABLED];
    if (!enabledChange) {
      return;
    }

    const enabled = resolveNetworkQualityEnabled(enabledChange.newValue);
    void this.ensureInitialized().then(async () => {
      await this.setEnabled(enabled);
    });
  }

  public handleStartup(): void {
    void this.ensureInitialized().then(() => {
      this.ensureFreshProbe('startup');
    });
  }

  public requestProbeNow(sendResponse: (response: ProbeNowResponse) => void): true {
    void this.ensureInitialized()
      .then(() => this.runProbe('manual'))
      .then((snapshot) => {
        sendResponse({ ok: true, snapshot });
      })
      .catch((error: unknown) => {
        sendResponse({ ok: false, error: getErrorMessage(error) });
      });

    return true;
  }

  private ensureInitialized(): Promise<void> {
    return this.initialized ? Promise.resolve() : this.init();
  }

  private async loadSnapshot(): Promise<void> {
    const stored = await chrome.storage.local.get([
      StorageKeys.NETWORK_QUALITY_ENABLED,
      StorageKeys.NETWORK_QUALITY_SNAPSHOT,
    ]);

    const enabled = resolveNetworkQualityEnabled(
      stored[StorageKeys.NETWORK_QUALITY_ENABLED] ?? DEFAULT_NETWORK_QUALITY_ENABLED,
    );
    const normalizedSnapshot = normalizeNetworkQualitySnapshot(
      stored[StorageKeys.NETWORK_QUALITY_SNAPSHOT], {
        enabled,
        intervalMs: DEFAULT_NETWORK_QUALITY_INTERVAL_MS,
        probeUrl: NETWORK_QUALITY_PROBE_URL,
        targetHost: NETWORK_QUALITY_TARGET_HOST,
        timeoutMs: DEFAULT_NETWORK_QUALITY_TIMEOUT_MS,
      });
    this.snapshot = pruneStaleNetworkQualitySnapshot(normalizedSnapshot);

    if (this.snapshot.recentSamples.length !== normalizedSnapshot.recentSamples.length) {
      console.error('[DEBUG_SKILL_TRACE] network-quality-stale-snapshot-pruned', {
        source: 'NetworkQualityMonitor.loadSnapshot',
        beforeSampleCount: normalizedSnapshot.recentSamples.length,
        afterSampleCount: this.snapshot.recentSamples.length,
        beforeLastUpdatedAt: normalizedSnapshot.lastUpdatedAt,
        afterLastUpdatedAt: this.snapshot.lastUpdatedAt,
        intervalMs: this.snapshot.intervalMs,
        windowSize: this.snapshot.windowSize,
      });
    }

    await chrome.storage.local.set({
      [StorageKeys.NETWORK_QUALITY_ENABLED]: enabled,
      [StorageKeys.NETWORK_QUALITY_SNAPSHOT]: this.snapshot,
    });
  }

  private ensureAlarm(): void {
    if (!chrome.alarms?.create) {
      return;
    }

    chrome.alarms.create(NETWORK_QUALITY_ALARM_NAME, {
      delayInMinutes: NETWORK_QUALITY_ALARM_PERIOD_MINUTES,
      periodInMinutes: NETWORK_QUALITY_ALARM_PERIOD_MINUTES,
    });
  }

  private clearProbeTimer(): void {
    if (this.probeTimer === null) {
      return;
    }
    clearTimeout(this.probeTimer);
    this.probeTimer = null;
  }

  private scheduleProbe(delayMs: number, trigger: string): void {
    if (!this.snapshot.enabled) {
      return;
    }

    this.clearProbeTimer();
    this.probeTimer = setTimeout(() => {
      this.probeTimer = null;
      void this.runProbe(trigger);
    }, delayMs);
  }

  private ensureFreshProbe(trigger: string): void {
    if (!this.snapshot.enabled) {
      this.clearProbeTimer();
      return;
    }

    const now = Date.now();
    const lastUpdatedAt = this.snapshot.lastUpdatedAt ?? 0;
    const staleForMs = lastUpdatedAt > 0 ? now - lastUpdatedAt : Number.POSITIVE_INFINITY;
    if (staleForMs >= this.snapshot.intervalMs * 2) {
      this.scheduleProbe(PROBE_SETTLE_DELAY_MS, `${trigger}:stale`);
      return;
    }

    const remainingDelayMs = Math.max(this.snapshot.intervalMs - staleForMs, PROBE_SETTLE_DELAY_MS);
    this.scheduleProbe(remainingDelayMs, `${trigger}:resume`);
  }

  private async setEnabled(enabled: boolean): Promise<void> {
    if (enabled === this.snapshot.enabled) {
      if (enabled) {
        this.ensureFreshProbe('enabled-noop');
      }
      return;
    }

    this.snapshot = {
      ...this.snapshot,
      enabled,
    };

    await this.persistSnapshot();

    if (!enabled) {
      this.clearProbeTimer();
      debugService.log('network-quality', 'monitor-disabled');
      return;
    }

    debugService.log('network-quality', 'monitor-enabled');
    this.ensureAlarm();
    this.scheduleProbe(PROBE_SETTLE_DELAY_MS, 'enabled');
  }

  private async persistSnapshot(): Promise<void> {
    await chrome.storage.local.set({
      [StorageKeys.NETWORK_QUALITY_SNAPSHOT]: this.snapshot,
    });
  }

  private async runProbe(trigger: string): Promise<NetworkQualitySnapshot> {
    if (!this.snapshot.enabled) {
      return this.snapshot;
    }

    if (this.probeInFlight) {
      return this.snapshot;
    }

    this.probeInFlight = true;
    const startedAt = Date.now();
    const startedPerf = performance.now();
    let sample: NetworkQualityProbeSample;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.snapshot.timeoutMs);

      try {
        const response = await fetch(this.snapshot.probeUrl, {
          method: 'GET',
          cache: 'no-store',
          credentials: 'omit',
          redirect: 'follow',
          signal: controller.signal,
        });
        const latencyMs = Math.round(performance.now() - startedPerf);
        sample = {
          timestamp: startedAt,
          latencyMs,
          ok: response.ok,
          statusCode: response.status,
          failureKind: response.ok ? null : 'http_error',
          errorMessage: response.ok ? null : `http_${response.status}`,
        };

        if (!response.ok) {
          console.error('[VIBE_DEBUG_TRACE][NETWORK_QUALITY_HTTP_ERROR]', {
            trigger,
            sample,
          });
        }
      } catch (error) {
        const latencyMs = Math.round(performance.now() - startedPerf);
        console.error('[DEBUG_SKILL_TRACE] network-quality-probe-fetch-threw', {
          source: 'NetworkQualityMonitor.runProbe',
          trigger,
          url: this.snapshot.probeUrl,
          method: 'GET',
          credentials: 'omit',
          redirect: 'follow',
          errorName: error instanceof Error ? error.name : typeof error,
          errorMessage: getErrorMessage(error),
        });
        if (error instanceof DOMException && error.name === 'AbortError') {
          sample = {
            timestamp: startedAt,
            latencyMs,
            ok: false,
            statusCode: null,
            failureKind: 'timeout',
            errorMessage: 'timeout',
          };
        } else {
          sample = {
            timestamp: startedAt,
            latencyMs,
            ok: false,
            statusCode: null,
            failureKind: 'network_error',
            errorMessage: getErrorMessage(error),
          };
        }

        console.error('[VIBE_DEBUG_TRACE][NETWORK_QUALITY_PROBE_FAILED]', {
          trigger,
          sample,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      this.snapshot = appendNetworkQualitySample(this.snapshot, sample);
      await this.persistSnapshot();

      debugService.log('network-quality', sample.ok ? 'probe-success' : 'probe-failed', {
        trigger,
        latencyMs: sample.latencyMs,
        statusCode: sample.statusCode,
        failureKind: sample.failureKind,
        lossRate: this.snapshot.summary.lossRate,
        jitterMs: this.snapshot.summary.jitterMs,
      });

      if (!sample.ok) {
        logger.warn('Network quality probe failed', {
          trigger,
          sample,
        });
      }

      return this.snapshot;
    } finally {
      this.probeInFlight = false;
      this.ensureFreshProbe(`${trigger}:loop`);
    }
  }
}

export const networkQualityMonitor = new NetworkQualityMonitor();
