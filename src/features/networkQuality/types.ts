export type NetworkProbeFailureKind = 'http_error' | 'network_error' | 'timeout';

export interface NetworkQualityProbeSample {
  timestamp: number;
  latencyMs: number | null;
  ok: boolean;
  statusCode: number | null;
  failureKind: NetworkProbeFailureKind | null;
  errorMessage: string | null;
}

export interface NetworkQualitySummary {
  sampleCount: number;
  successCount: number;
  failureCount: number;
  timeoutCount: number;
  httpErrorCount: number;
  networkErrorCount: number;
  successRate: number;
  lossRate: number;
  timeoutRate: number;
  httpErrorRate: number;
  networkErrorRate: number;
  avgLatencyMs: number | null;
  minLatencyMs: number | null;
  maxLatencyMs: number | null;
  jitterMs: number | null;
  consecutiveFailures: number;
  currentFailureStreakStartedAt: number | null;
  lastSuccessAt: number | null;
  lastFailureAt: number | null;
  lastStatusCode: number | null;
}

export interface NetworkQualityThresholds {
  latencyGoodMaxMs: number;
  latencyBadMinMs: number;
  jitterGoodMaxMs: number;
  jitterBadMinMs: number;
  lossGoodMaxPercent: number;
  lossBadMinPercent: number;
}

export interface NetworkQualitySnapshot {
  schemaVersion: number;
  enabled: boolean;
  targetHost: string;
  probeUrl: string;
  intervalMs: number;
  timeoutMs: number;
  windowSize: number;
  lastUpdatedAt: number | null;
  lastSample: NetworkQualityProbeSample | null;
  recentSamples: NetworkQualityProbeSample[];
  summary: NetworkQualitySummary;
}
