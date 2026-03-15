import type {
  NetworkQualityProbeSample,
  NetworkQualitySnapshot,
  NetworkQualitySummary,
  NetworkQualityThresholds,
} from './types';

export const NETWORK_QUALITY_TARGET_HOST = 'gemini.google.com';
export const NETWORK_QUALITY_PROBE_URL = 'https://gemini.google.com/';
export const DEFAULT_NETWORK_QUALITY_ENABLED = true;
export const DEFAULT_NETWORK_QUALITY_INTERVAL_MS = 1000;
export const DEFAULT_NETWORK_QUALITY_TIMEOUT_MS = 3000;
export const DEFAULT_NETWORK_QUALITY_WINDOW_SIZE = 120;
export const NETWORK_QUALITY_SNAPSHOT_SCHEMA_VERSION = 3;
export const NETWORK_QUALITY_ALARM_NAME = 'gm.network-quality.tick';
export const NETWORK_QUALITY_ALARM_PERIOD_MINUTES = 0.5;
export const DEFAULT_NETWORK_QUALITY_THRESHOLDS: NetworkQualityThresholds = {
  latencyGoodMaxMs: 180,
  latencyBadMinMs: 420,
  jitterGoodMaxMs: 20,
  jitterBadMinMs: 80,
  lossGoodMaxPercent: 0,
  lossBadMinPercent: 5,
};

export type NetworkQualityMetricTone = 'good' | 'bad' | 'neutral' | 'off';

type NetworkQualitySnapshotConfig = Partial<
  Pick<
    NetworkQualitySnapshot,
    'enabled' | 'intervalMs' | 'lastUpdatedAt' | 'probeUrl' | 'targetHost' | 'timeoutMs' | 'windowSize'
  >
>;

type NetworkQualityPersistentSummaryState = Pick<
  NetworkQualitySummary,
  | 'consecutiveFailures'
  | 'currentFailureStreakStartedAt'
  | 'lastSuccessAt'
  | 'lastFailureAt'
  | 'lastStatusCode'
>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const normalizePositiveInteger = (value: unknown, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  const next = Math.round(value);
  return next > 0 ? next : fallback;
};

const normalizeNonNegativeInteger = (value: unknown, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  const next = Math.round(value);
  return next >= 0 ? next : fallback;
};

const normalizeNullableNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const roundMetric = (value: number): number => Math.round(value * 10) / 10;

export const resolveNetworkQualityEnabled = (value: unknown): boolean => value !== false;

export const createNetworkQualityThresholds = (
  overrides: Partial<NetworkQualityThresholds> = {},
): NetworkQualityThresholds => ({
  latencyGoodMaxMs: normalizePositiveInteger(
    overrides.latencyGoodMaxMs,
    DEFAULT_NETWORK_QUALITY_THRESHOLDS.latencyGoodMaxMs,
  ),
  latencyBadMinMs: normalizePositiveInteger(
    overrides.latencyBadMinMs,
    DEFAULT_NETWORK_QUALITY_THRESHOLDS.latencyBadMinMs,
  ),
  jitterGoodMaxMs: normalizePositiveInteger(
    overrides.jitterGoodMaxMs,
    DEFAULT_NETWORK_QUALITY_THRESHOLDS.jitterGoodMaxMs,
  ),
  jitterBadMinMs: normalizePositiveInteger(
    overrides.jitterBadMinMs,
    DEFAULT_NETWORK_QUALITY_THRESHOLDS.jitterBadMinMs,
  ),
  lossGoodMaxPercent: normalizeNonNegativeInteger(
    overrides.lossGoodMaxPercent,
    DEFAULT_NETWORK_QUALITY_THRESHOLDS.lossGoodMaxPercent,
  ),
  lossBadMinPercent: normalizeNonNegativeInteger(
    overrides.lossBadMinPercent,
    DEFAULT_NETWORK_QUALITY_THRESHOLDS.lossBadMinPercent,
  ),
});

export const normalizeNetworkQualityThresholds = (value: unknown): NetworkQualityThresholds => {
  if (!isRecord(value)) {
    return createNetworkQualityThresholds();
  }

  const next = createNetworkQualityThresholds({
    latencyGoodMaxMs:
      typeof value.latencyGoodMaxMs === 'number' ? value.latencyGoodMaxMs : undefined,
    latencyBadMinMs:
      typeof value.latencyBadMinMs === 'number' ? value.latencyBadMinMs : undefined,
    jitterGoodMaxMs:
      typeof value.jitterGoodMaxMs === 'number' ? value.jitterGoodMaxMs : undefined,
    jitterBadMinMs:
      typeof value.jitterBadMinMs === 'number' ? value.jitterBadMinMs : undefined,
    lossGoodMaxPercent:
      typeof value.lossGoodMaxPercent === 'number' ? value.lossGoodMaxPercent : undefined,
    lossBadMinPercent:
      typeof value.lossBadMinPercent === 'number' ? value.lossBadMinPercent : undefined,
  });

  return {
    latencyGoodMaxMs: Math.min(next.latencyGoodMaxMs, next.latencyBadMinMs),
    latencyBadMinMs: Math.max(next.latencyGoodMaxMs, next.latencyBadMinMs),
    jitterGoodMaxMs: Math.min(next.jitterGoodMaxMs, next.jitterBadMinMs),
    jitterBadMinMs: Math.max(next.jitterGoodMaxMs, next.jitterBadMinMs),
    lossGoodMaxPercent: Math.min(next.lossGoodMaxPercent, next.lossBadMinPercent),
    lossBadMinPercent: Math.max(next.lossGoodMaxPercent, next.lossBadMinPercent),
  };
};

export const resolveThresholdTone = (
  value: number | null,
  enabled: boolean,
  goodMax: number,
  badMin: number,
): NetworkQualityMetricTone => {
  if (!enabled) return 'off';
  if (value === null) return 'neutral';
  if (value <= goodMax) return 'good';
  if (value >= badMin) return 'bad';
  return 'neutral';
};

export const createEmptyNetworkQualitySummary = (): NetworkQualitySummary => ({
  sampleCount: 0,
  successCount: 0,
  failureCount: 0,
  timeoutCount: 0,
  httpErrorCount: 0,
  networkErrorCount: 0,
  successRate: 0,
  lossRate: 0,
  timeoutRate: 0,
  httpErrorRate: 0,
  networkErrorRate: 0,
  avgLatencyMs: null,
  minLatencyMs: null,
  maxLatencyMs: null,
  jitterMs: null,
  consecutiveFailures: 0,
  currentFailureStreakStartedAt: null,
  lastSuccessAt: null,
  lastFailureAt: null,
  lastStatusCode: null,
});

const pickPersistentSummaryState = (
  summary: NetworkQualitySummary,
): NetworkQualityPersistentSummaryState => ({
  consecutiveFailures: summary.consecutiveFailures,
  currentFailureStreakStartedAt: summary.currentFailureStreakStartedAt,
  lastSuccessAt: summary.lastSuccessAt,
  lastFailureAt: summary.lastFailureAt,
  lastStatusCode: summary.lastStatusCode,
});

const mergeSummaryState = (
  summary: NetworkQualitySummary,
  persistentState: NetworkQualityPersistentSummaryState,
): NetworkQualitySummary => ({
  ...summary,
  ...persistentState,
});

const normalizePersistentSummaryState = (
  value: unknown,
  fallback: NetworkQualitySummary,
): NetworkQualityPersistentSummaryState => {
  if (!isRecord(value)) {
    return pickPersistentSummaryState(fallback);
  }

  const fallbackState = pickPersistentSummaryState(fallback);
  const consecutiveFailures = normalizeNonNegativeInteger(
    value.consecutiveFailures,
    fallbackState.consecutiveFailures,
  );

  return {
    consecutiveFailures,
    currentFailureStreakStartedAt:
      consecutiveFailures > 0
        ? normalizeNullableNumber(value.currentFailureStreakStartedAt) ??
          fallbackState.currentFailureStreakStartedAt
        : null,
    lastSuccessAt: normalizeNullableNumber(value.lastSuccessAt) ?? fallbackState.lastSuccessAt,
    lastFailureAt: normalizeNullableNumber(value.lastFailureAt) ?? fallbackState.lastFailureAt,
    lastStatusCode: normalizeNullableNumber(value.lastStatusCode) ?? fallbackState.lastStatusCode,
  };
};

const derivePersistentSummaryState = (
  previousSummary: NetworkQualitySummary,
  sample: NetworkQualityProbeSample,
): NetworkQualityPersistentSummaryState => {
  if (sample.ok) {
    return {
      consecutiveFailures: 0,
      currentFailureStreakStartedAt: null,
      lastSuccessAt: sample.timestamp,
      lastFailureAt: previousSummary.lastFailureAt,
      lastStatusCode:
        typeof sample.statusCode === 'number' ? sample.statusCode : previousSummary.lastStatusCode,
    };
  }

  return {
    consecutiveFailures: previousSummary.consecutiveFailures + 1,
    currentFailureStreakStartedAt:
      previousSummary.consecutiveFailures > 0 &&
      previousSummary.currentFailureStreakStartedAt !== null
        ? previousSummary.currentFailureStreakStartedAt
        : sample.timestamp,
    lastSuccessAt: previousSummary.lastSuccessAt,
    lastFailureAt: sample.timestamp,
    lastStatusCode:
      typeof sample.statusCode === 'number' ? sample.statusCode : previousSummary.lastStatusCode,
  };
};

export const createNetworkQualitySnapshot = (
  config: NetworkQualitySnapshotConfig = {},
): NetworkQualitySnapshot => ({
  schemaVersion: NETWORK_QUALITY_SNAPSHOT_SCHEMA_VERSION,
  enabled: config.enabled ?? DEFAULT_NETWORK_QUALITY_ENABLED,
  targetHost: typeof config.targetHost === 'string' ? config.targetHost : NETWORK_QUALITY_TARGET_HOST,
  probeUrl: typeof config.probeUrl === 'string' ? config.probeUrl : NETWORK_QUALITY_PROBE_URL,
  intervalMs: normalizePositiveInteger(config.intervalMs, DEFAULT_NETWORK_QUALITY_INTERVAL_MS),
  timeoutMs: normalizePositiveInteger(config.timeoutMs, DEFAULT_NETWORK_QUALITY_TIMEOUT_MS),
  windowSize: normalizePositiveInteger(config.windowSize, DEFAULT_NETWORK_QUALITY_WINDOW_SIZE),
  lastUpdatedAt: normalizeNullableNumber(config.lastUpdatedAt),
  lastSample: null,
  recentSamples: [],
  summary: createEmptyNetworkQualitySummary(),
});

export const summarizeNetworkQualitySamples = (
  samples: readonly NetworkQualityProbeSample[],
): NetworkQualitySummary => {
  if (samples.length === 0) {
    return createEmptyNetworkQualitySummary();
  }

  const successfulSamples = samples.filter(
    (sample) => sample.ok && typeof sample.latencyMs === 'number',
  );
  const latencies = successfulSamples
    .map((sample) => sample.latencyMs)
    .filter((latency): latency is number => typeof latency === 'number');

  const sampleCount = samples.length;
  const successCount = successfulSamples.length;
  const failureCount = sampleCount - successCount;
  const timeoutCount = samples.filter((sample) => sample.failureKind === 'timeout').length;
  const httpErrorCount = samples.filter((sample) => sample.failureKind === 'http_error').length;
  const networkErrorCount = samples.filter((sample) => sample.failureKind === 'network_error').length;
  const successRate = sampleCount > 0 ? roundMetric((successCount / sampleCount) * 100) : 0;
  const lossRate = sampleCount > 0 ? roundMetric((failureCount / sampleCount) * 100) : 0;
  const timeoutRate = sampleCount > 0 ? roundMetric((timeoutCount / sampleCount) * 100) : 0;
  const httpErrorRate = sampleCount > 0 ? roundMetric((httpErrorCount / sampleCount) * 100) : 0;
  const networkErrorRate = sampleCount > 0 ? roundMetric((networkErrorCount / sampleCount) * 100) : 0;
  const avgLatencyMs =
    latencies.length > 0
      ? roundMetric(latencies.reduce((sum, latency) => sum + latency, 0) / latencies.length)
      : null;
  const minLatencyMs = latencies.length > 0 ? Math.min(...latencies) : null;
  const maxLatencyMs = latencies.length > 0 ? Math.max(...latencies) : null;

  let jitterMs: number | null = null;
  if (latencies.length > 1) {
    const deltas = latencies.slice(1).map((latency, index) => Math.abs(latency - latencies[index]));
    jitterMs = roundMetric(deltas.reduce((sum, latency) => sum + latency, 0) / deltas.length);
  }

  let consecutiveFailures = 0;
  let currentFailureStreakStartedAt: number | null = null;
  for (let index = samples.length - 1; index >= 0; index -= 1) {
    if (samples[index]?.ok) {
      break;
    }
    consecutiveFailures += 1;
    currentFailureStreakStartedAt = samples[index]?.timestamp ?? currentFailureStreakStartedAt;
  }

  let lastSuccessAt: number | null = null;
  let lastFailureAt: number | null = null;
  let lastStatusCode: number | null = null;
  for (let index = samples.length - 1; index >= 0; index -= 1) {
    const sample = samples[index];
    if (lastSuccessAt === null && sample?.ok) {
      lastSuccessAt = sample.timestamp;
    }
    if (lastFailureAt === null && !sample?.ok) {
      lastFailureAt = sample.timestamp;
    }
    if (lastStatusCode === null && typeof sample?.statusCode === 'number') {
      lastStatusCode = sample.statusCode;
    }
    if (lastSuccessAt !== null && lastFailureAt !== null && lastStatusCode !== null) {
      break;
    }
  }

  return {
    sampleCount,
    successCount,
    failureCount,
    timeoutCount,
    httpErrorCount,
    networkErrorCount,
    successRate,
    lossRate,
    timeoutRate,
    httpErrorRate,
    networkErrorRate,
    avgLatencyMs,
    minLatencyMs,
    maxLatencyMs,
    jitterMs,
    consecutiveFailures,
    currentFailureStreakStartedAt,
    lastSuccessAt,
    lastFailureAt,
    lastStatusCode,
  };
};

const normalizeProbeSample = (value: unknown): NetworkQualityProbeSample | null => {
  if (!isRecord(value)) {
    return null;
  }

  const timestamp = normalizeNullableNumber(value.timestamp);
  const latencyMs = normalizeNullableNumber(value.latencyMs);
  const ok = value.ok === true;
  const statusCode = normalizeNullableNumber(value.statusCode);
  const failureKind =
    value.failureKind === 'http_error' ||
    value.failureKind === 'network_error' ||
    value.failureKind === 'timeout'
      ? value.failureKind
      : null;
  const errorMessage = typeof value.errorMessage === 'string' ? value.errorMessage : null;

  if (timestamp === null) {
    return null;
  }

  return {
    timestamp,
    latencyMs,
    ok,
    statusCode,
    failureKind,
    errorMessage,
  };
};

export const appendNetworkQualitySample = (
  snapshot: NetworkQualitySnapshot,
  sample: NetworkQualityProbeSample,
): NetworkQualitySnapshot => {
  const recentSamples = [...snapshot.recentSamples, sample].slice(-snapshot.windowSize);
  const windowSummary = summarizeNetworkQualitySamples(recentSamples);
  const persistentState = derivePersistentSummaryState(snapshot.summary, sample);

  return {
    ...snapshot,
    lastUpdatedAt: sample.timestamp,
    lastSample: sample,
    recentSamples,
    summary: mergeSummaryState(windowSummary, persistentState),
  };
};

export const normalizeNetworkQualitySnapshot = (
  value: unknown,
  config: NetworkQualitySnapshotConfig = {},
): NetworkQualitySnapshot => {
  const base = createNetworkQualitySnapshot(config);
  if (!isRecord(value)) {
    return base;
  }

  if (value.schemaVersion !== NETWORK_QUALITY_SNAPSHOT_SCHEMA_VERSION) {
    return base;
  }

  const recentSamples = Array.isArray(value.recentSamples)
    ? value.recentSamples
        .map((sample) => normalizeProbeSample(sample))
        .filter((sample): sample is NetworkQualityProbeSample => sample !== null)
        .slice(-base.windowSize)
    : [];

  const lastSample = normalizeProbeSample(value.lastSample);
  const lastUpdatedAt = normalizeNullableNumber(value.lastUpdatedAt);
  const next = {
    ...base,
    recentSamples,
    lastSample:
      lastSample ?? (recentSamples.length > 0 ? recentSamples[recentSamples.length - 1] : null),
    lastUpdatedAt:
      lastUpdatedAt ?? lastSample?.timestamp ?? recentSamples[recentSamples.length - 1]?.timestamp ?? null,
  };
  const windowSummary = summarizeNetworkQualitySamples(next.recentSamples);
  const persistentState = normalizePersistentSummaryState(value.summary, windowSummary);

  return {
    ...next,
    summary: mergeSummaryState(windowSummary, persistentState),
  };
};

export const pruneStaleNetworkQualitySnapshot = (
  snapshot: NetworkQualitySnapshot,
  now = Date.now(),
): NetworkQualitySnapshot => {
  const retentionMs = snapshot.intervalMs * snapshot.windowSize * 2;
  const cutoff = now - retentionMs;
  const recentSamples = snapshot.recentSamples.filter((sample) => sample.timestamp >= cutoff);

  if (recentSamples.length === snapshot.recentSamples.length) {
    return snapshot;
  }

  const lastSample = recentSamples.length > 0 ? recentSamples[recentSamples.length - 1] : null;
  const lastUpdatedAt = lastSample?.timestamp ?? null;
  const windowSummary = summarizeNetworkQualitySamples(recentSamples);
  const persistentState =
    recentSamples.length > 0
      ? normalizePersistentSummaryState(snapshot.summary, windowSummary)
      : pickPersistentSummaryState(windowSummary);

  return {
    ...snapshot,
    recentSamples,
    lastSample,
    lastUpdatedAt,
    summary: mergeSummaryState(windowSummary, persistentState),
  };
};
