import { describe, it, expect } from 'vitest';
import { aggregateRecords } from '../../src/core/aggregator.js';
import type { MetricRecord } from '../../src/types.js';

function makeRecord(overrides: Partial<MetricRecord> = {}): MetricRecord {
  return {
    method: 'GET',
    pattern: '/test',
    statusCode: 200,
    durationMs: 50,
    reqSize: 0,
    resSize: 100,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('aggregateRecords', () => {
  it('should return null for empty records', () => {
    expect(aggregateRecords([], [50, 95, 99], 60_000)).toBeNull();
  });

  it('should return null when all records are stale', () => {
    const records = [
      makeRecord({ timestamp: Date.now() - 120_000 }),
      makeRecord({ timestamp: Date.now() - 100_000 }),
    ];
    expect(aggregateRecords(records, [50, 95, 99], 60_000)).toBeNull();
  });

  it('should aggregate a single record', () => {
    const records = [makeRecord({ durationMs: 42, statusCode: 200 })];
    const result = aggregateRecords(records, [50, 95, 99], 60_000);
    expect(result).not.toBeNull();
    expect(result!.count).toBe(1);
    expect(result!.latency.p50).toBe(42);
    expect(result!.latency.min).toBe(42);
    expect(result!.latency.max).toBe(42);
    expect(result!.errorRate.total).toBe(0);
  });

  it('should compute correct error rate fractions', () => {
    const now = Date.now();
    const records = [
      makeRecord({ statusCode: 200, timestamp: now }),
      makeRecord({ statusCode: 200, timestamp: now }),
      makeRecord({ statusCode: 400, timestamp: now }),
      makeRecord({ statusCode: 404, timestamp: now }),
      makeRecord({ statusCode: 500, timestamp: now }),
    ];
    const result = aggregateRecords(records, [50], 60_000)!;
    expect(result.errorRate.client4xx).toBeCloseTo(0.4, 2);
    expect(result.errorRate.server5xx).toBeCloseTo(0.2, 2);
    expect(result.errorRate.total).toBeCloseTo(0.6, 2);
  });

  it('should only include records within retention window', () => {
    const now = Date.now();
    const records = [
      makeRecord({ durationMs: 999, timestamp: now - 120_000 }), // stale
      makeRecord({ durationMs: 10, timestamp: now }),
      makeRecord({ durationMs: 20, timestamp: now }),
    ];
    const result = aggregateRecords(records, [50], 60_000)!;
    expect(result.count).toBe(2);
    expect(result.latency.max).toBe(20);
  });

  it('should compute throughput correctly', () => {
    const now = Date.now();
    // 10 requests spread over 10 seconds
    const records = Array.from({ length: 10 }, (_, i) =>
      makeRecord({ timestamp: now - (10 - i) * 1000 })
    );
    const result = aggregateRecords(records, [50], 60_000)!;
    // ~10 requests / ~10 seconds ≈ ~1 req/s
    expect(result.throughput).toBeGreaterThan(0.5);
    expect(result.throughput).toBeLessThan(2);
  });

  it('should compute average sizes', () => {
    const records = [
      makeRecord({ reqSize: 100, resSize: 500 }),
      makeRecord({ reqSize: 200, resSize: 700 }),
    ];
    const result = aggregateRecords(records, [50], 60_000)!;
    expect(result.avgReqSize).toBe(150);
    expect(result.avgResSize).toBe(600);
  });
});
