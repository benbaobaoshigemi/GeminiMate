import { describe, expect, it } from 'vitest';

import {
  appendNetworkQualitySample,
  createNetworkQualitySnapshot,
  DEFAULT_NETWORK_QUALITY_THRESHOLDS,
  normalizeNetworkQualitySnapshot,
  normalizeNetworkQualityThresholds,
  pruneStaleNetworkQualitySnapshot,
  resolveThresholdTone,
  summarizeNetworkQualitySamples,
} from './model';
import type { NetworkQualityProbeSample } from './types';

const createSample = (
  timestamp: number,
  latencyMs: number | null,
  ok: boolean,
  failureKind: NetworkQualityProbeSample['failureKind'] = ok ? null : 'network_error',
  statusCode: number | null = ok ? 200 : null,
): NetworkQualityProbeSample => ({
  timestamp,
  latencyMs,
  ok,
  statusCode,
  failureKind,
  errorMessage: ok ? null : failureKind,
});

describe('network quality model', () => {
  it('calculates rates, error categories and streaks from mixed samples', () => {
    const summary = summarizeNetworkQualitySamples([
      createSample(1, 100, true),
      createSample(2, 110, true),
      createSample(3, null, false, 'timeout'),
      createSample(4, 90, true),
      createSample(5, null, false, 'http_error', 502),
      createSample(6, null, false, 'network_error'),
    ]);

    expect(summary.sampleCount).toBe(6);
    expect(summary.successCount).toBe(3);
    expect(summary.failureCount).toBe(3);
    expect(summary.timeoutCount).toBe(1);
    expect(summary.httpErrorCount).toBe(1);
    expect(summary.networkErrorCount).toBe(1);
    expect(summary.successRate).toBe(50);
    expect(summary.lossRate).toBe(50);
    expect(summary.timeoutRate).toBe(16.7);
    expect(summary.httpErrorRate).toBe(16.7);
    expect(summary.networkErrorRate).toBe(16.7);
    expect(summary.avgLatencyMs).toBe(100);
    expect(summary.minLatencyMs).toBe(90);
    expect(summary.maxLatencyMs).toBe(110);
    expect(summary.jitterMs).toBe(15);
    expect(summary.consecutiveFailures).toBe(2);
    expect(summary.currentFailureStreakStartedAt).toBe(5);
    expect(summary.lastSuccessAt).toBe(4);
    expect(summary.lastFailureAt).toBe(6);
    expect(summary.lastStatusCode).toBe(502);
  });

  it('trims old samples when the rolling window is full', () => {
    const base = createNetworkQualitySnapshot({ windowSize: 3 });

    const result = [
      createSample(1, 100, true),
      createSample(2, 105, true),
      createSample(3, null, false),
      createSample(4, 95, true),
    ].reduce(appendNetworkQualitySample, base);

    expect(result.recentSamples.map((sample) => sample.timestamp)).toEqual([2, 3, 4]);
    expect(result.summary.sampleCount).toBe(3);
    expect(result.lastUpdatedAt).toBe(4);
    expect(result.lastSample?.timestamp).toBe(4);
  });

  it('drops stale persisted samples from older sessions', () => {
    const staleSnapshot = {
      ...createNetworkQualitySnapshot({ intervalMs: 1000, windowSize: 5 }),
      recentSamples: [
        createSample(1_000, 120, true),
        createSample(2_000, 130, true),
      ],
      lastSample: createSample(2_000, 130, true),
      lastUpdatedAt: 2_000,
    };

    const pruned = pruneStaleNetworkQualitySnapshot(staleSnapshot, 20_000);

    expect(pruned.recentSamples).toEqual([]);
    expect(pruned.lastSample).toBeNull();
    expect(pruned.lastUpdatedAt).toBeNull();
    expect(pruned.summary.sampleCount).toBe(0);
    expect(pruned.summary.lastSuccessAt).toBeNull();
  });

  it('preserves active failure streak and last success beyond the rolling window', () => {
    const base = createNetworkQualitySnapshot({ windowSize: 3 });

    const result = [
      createSample(1_000, 120, true),
      createSample(2_000, null, false),
      createSample(3_000, null, false),
      createSample(4_000, null, false),
      createSample(5_000, null, false),
    ].reduce(appendNetworkQualitySample, base);

    expect(result.recentSamples.map((sample) => sample.timestamp)).toEqual([3_000, 4_000, 5_000]);
    expect(result.summary.sampleCount).toBe(3);
    expect(result.summary.consecutiveFailures).toBe(4);
    expect(result.summary.currentFailureStreakStartedAt).toBe(2_000);
    expect(result.summary.lastSuccessAt).toBe(1_000);
    expect(result.summary.lastFailureAt).toBe(5_000);
  });

  it('keeps persisted streak metadata when reloading a normalized snapshot', () => {
    const base = createNetworkQualitySnapshot({ windowSize: 3 });
    const appended = [
      createSample(1_000, 120, true),
      createSample(2_000, null, false),
      createSample(3_000, null, false),
      createSample(4_000, null, false),
      createSample(5_000, null, false),
    ].reduce(appendNetworkQualitySample, base);

    const normalized = normalizeNetworkQualitySnapshot(appended, { windowSize: 3 });

    expect(normalized.summary.consecutiveFailures).toBe(4);
    expect(normalized.summary.currentFailureStreakStartedAt).toBe(2_000);
    expect(normalized.summary.lastSuccessAt).toBe(1_000);
    expect(normalized.summary.lastFailureAt).toBe(5_000);
  });

  it('drops legacy persisted streak metadata and rebuilds from the visible window', () => {
    const legacySnapshot = {
      ...createNetworkQualitySnapshot({ windowSize: 3 }),
      schemaVersion: 1,
      recentSamples: [
        createSample(3_000, null, false),
        createSample(4_000, null, false),
        createSample(5_000, null, false),
      ],
      lastSample: createSample(5_000, null, false),
      lastUpdatedAt: 5_000,
      summary: {
        ...createNetworkQualitySnapshot().summary,
        consecutiveFailures: 99,
        currentFailureStreakStartedAt: 1_000,
        lastSuccessAt: 500,
        lastFailureAt: 5_000,
        lastStatusCode: 200,
      },
    };

    const normalized = normalizeNetworkQualitySnapshot(legacySnapshot, { windowSize: 3 });

    expect(normalized.summary.consecutiveFailures).toBe(3);
    expect(normalized.summary.currentFailureStreakStartedAt).toBe(3_000);
    expect(normalized.summary.lastSuccessAt).toBeNull();
    expect(normalized.summary.lastFailureAt).toBe(5_000);
  });

  it('normalizes threshold settings and preserves ascending ranges', () => {
    const thresholds = normalizeNetworkQualityThresholds({
      latencyGoodMaxMs: 500,
      latencyBadMinMs: 200,
      jitterGoodMaxMs: -1,
      jitterBadMinMs: 90,
      lossGoodMaxPercent: 7,
      lossBadMinPercent: 3,
    });

    expect(thresholds.latencyGoodMaxMs).toBe(200);
    expect(thresholds.latencyBadMinMs).toBe(500);
    expect(thresholds.jitterGoodMaxMs).toBe(DEFAULT_NETWORK_QUALITY_THRESHOLDS.jitterGoodMaxMs);
    expect(thresholds.jitterBadMinMs).toBe(90);
    expect(thresholds.lossGoodMaxPercent).toBe(3);
    expect(thresholds.lossBadMinPercent).toBe(7);
  });

  it('resolves tones from configured thresholds', () => {
    expect(resolveThresholdTone(120, true, 180, 420)).toBe('good');
    expect(resolveThresholdTone(260, true, 180, 420)).toBe('neutral');
    expect(resolveThresholdTone(500, true, 180, 420)).toBe('bad');
    expect(resolveThresholdTone(null, true, 180, 420)).toBe('neutral');
    expect(resolveThresholdTone(120, false, 180, 420)).toBe('off');
  });
});
