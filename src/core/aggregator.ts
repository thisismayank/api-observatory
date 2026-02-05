import type { MetricRecord, EndpointMetrics } from '../types.js';
import { computePercentiles, computeMin, computeMax, computeAvg } from './percentiles.js';

/**
 * Aggregate an array of MetricRecords for a single endpoint into EndpointMetrics.
 */
export function aggregateRecords(
  records: MetricRecord[],
  percentiles: number[],
  retentionMs: number,
): EndpointMetrics | null {
  if (records.length === 0) return null;

  const now = Date.now();
  const cutoff = now - retentionMs;

  // Filter to retention window
  const active = records.filter((r) => r.timestamp >= cutoff);
  if (active.length === 0) return null;

  const durations = active.map((r) => r.durationMs);
  const pctResult = computePercentiles(durations, percentiles);

  // Error counts
  let client4xx = 0;
  let server5xx = 0;
  let totalReqSize = 0;
  let totalResSize = 0;

  for (const r of active) {
    if (r.statusCode >= 400 && r.statusCode < 500) client4xx++;
    if (r.statusCode >= 500) server5xx++;
    totalReqSize += r.reqSize;
    totalResSize += r.resSize;
  }

  const errorCount = client4xx + server5xx;
  const count = active.length;

  // Throughput: requests per second over the actual time span of the records
  const oldest = active.reduce((min, r) => (r.timestamp < min ? r.timestamp : min), active[0].timestamp);
  const spanMs = Math.max(now - oldest, 1); // avoid division by zero
  const throughput = count / (spanMs / 1000);

  const lastSeen = active.reduce((max, r) => (r.timestamp > max ? r.timestamp : max), active[0].timestamp);

  return {
    method: active[0].method,
    pattern: active[0].pattern,
    count,
    latency: {
      min: computeMin(durations),
      max: computeMax(durations),
      avg: Math.round(computeAvg(durations) * 100) / 100,
      ...pctResult,
    },
    errorRate: {
      client4xx: count > 0 ? Math.round((client4xx / count) * 10000) / 10000 : 0,
      server5xx: count > 0 ? Math.round((server5xx / count) * 10000) / 10000 : 0,
      total: count > 0 ? Math.round((errorCount / count) * 10000) / 10000 : 0,
    },
    throughput: Math.round(throughput * 100) / 100,
    avgReqSize: count > 0 ? Math.round(totalReqSize / count) : 0,
    avgResSize: count > 0 ? Math.round(totalResSize / count) : 0,
    lastSeen,
  };
}
