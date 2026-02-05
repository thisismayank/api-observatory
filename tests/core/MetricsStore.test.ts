import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MetricsStore } from '../../src/core/MetricsStore.js';
import type { MetricRecord, ResolvedOptions } from '../../src/types.js';
import { resolveOptions } from '../../src/types.js';

function makeRecord(overrides: Partial<MetricRecord> = {}): MetricRecord {
  return {
    method: 'GET',
    pattern: '/api/test',
    statusCode: 200,
    durationMs: 50,
    reqSize: 0,
    resSize: 100,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('MetricsStore', () => {
  let store: MetricsStore;
  let options: ResolvedOptions;

  beforeEach(() => {
    options = resolveOptions({ retentionMs: 60_000, maxPerEndpoint: 100 });
    store = new MetricsStore(options);
  });

  afterEach(() => {
    store.destroy();
  });

  it('should start with zero endpoints', () => {
    expect(store.endpointCount).toBe(0);
    expect(store.getMetrics()).toEqual([]);
  });

  it('should record a single request', () => {
    store.record(makeRecord());
    expect(store.endpointCount).toBe(1);
    const metrics = store.getMetrics();
    expect(metrics).toHaveLength(1);
    expect(metrics[0].method).toBe('GET');
    expect(metrics[0].pattern).toBe('/api/test');
    expect(metrics[0].count).toBe(1);
  });

  it('should group records by method + pattern', () => {
    store.record(makeRecord({ method: 'GET', pattern: '/a' }));
    store.record(makeRecord({ method: 'POST', pattern: '/a' }));
    store.record(makeRecord({ method: 'GET', pattern: '/b' }));
    expect(store.endpointCount).toBe(3);
  });

  it('should aggregate multiple records for same endpoint', () => {
    for (let i = 0; i < 10; i++) {
      store.record(makeRecord({ durationMs: (i + 1) * 10 }));
    }
    const metrics = store.getMetrics();
    expect(metrics).toHaveLength(1);
    expect(metrics[0].count).toBe(10);
    expect(metrics[0].latency.min).toBe(10);
    expect(metrics[0].latency.max).toBe(100);
    expect(metrics[0].latency.avg).toBeCloseTo(55, 0);
  });

  it('should compute error rates', () => {
    store.record(makeRecord({ statusCode: 200 }));
    store.record(makeRecord({ statusCode: 201 }));
    store.record(makeRecord({ statusCode: 404 }));
    store.record(makeRecord({ statusCode: 500 }));
    store.record(makeRecord({ statusCode: 503 }));

    const metrics = store.getMetrics();
    expect(metrics[0].errorRate.client4xx).toBeCloseTo(0.2, 2);
    expect(metrics[0].errorRate.server5xx).toBeCloseTo(0.4, 2);
    expect(metrics[0].errorRate.total).toBeCloseTo(0.6, 2);
  });

  it('should filter by retention window', () => {
    // Record with an old timestamp
    store.record(makeRecord({ timestamp: Date.now() - 120_000 })); // 2 min ago, outside 60s window
    store.record(makeRecord({ timestamp: Date.now() })); // current

    const metrics = store.getMetrics();
    expect(metrics).toHaveLength(1);
    expect(metrics[0].count).toBe(1);
  });

  it('should return null for empty endpoint query', () => {
    expect(store.getEndpointMetrics('GET', '/nonexistent')).toBeNull();
  });

  it('should get single endpoint metrics', () => {
    store.record(makeRecord({ method: 'GET', pattern: '/users/:id' }));
    const result = store.getEndpointMetrics('GET', '/users/:id');
    expect(result).not.toBeNull();
    expect(result!.method).toBe('GET');
    expect(result!.pattern).toBe('/users/:id');
  });

  it('should reset all metrics', () => {
    store.record(makeRecord());
    store.record(makeRecord({ method: 'POST', pattern: '/b' }));
    store.reset();
    expect(store.endpointCount).toBe(0);
    expect(store.getMetrics()).toEqual([]);
  });

  it('should sort metrics by count descending', () => {
    for (let i = 0; i < 5; i++) store.record(makeRecord({ pattern: '/few' }));
    for (let i = 0; i < 20; i++) store.record(makeRecord({ pattern: '/many' }));
    for (let i = 0; i < 10; i++) store.record(makeRecord({ pattern: '/mid' }));

    const metrics = store.getMetrics();
    expect(metrics[0].pattern).toBe('/many');
    expect(metrics[1].pattern).toBe('/mid');
    expect(metrics[2].pattern).toBe('/few');
  });

  it('should respect maxPerEndpoint buffer limit', () => {
    const smallOpts = resolveOptions({ maxPerEndpoint: 5, retentionMs: 60_000 });
    const smallStore = new MetricsStore(smallOpts);
    try {
      for (let i = 0; i < 20; i++) {
        smallStore.record(makeRecord({ durationMs: i }));
      }
      const metrics = smallStore.getMetrics();
      expect(metrics[0].count).toBe(5); // only last 5 kept
    } finally {
      smallStore.destroy();
    }
  });

  it('should compute throughput', () => {
    const now = Date.now();
    for (let i = 0; i < 100; i++) {
      store.record(makeRecord({ timestamp: now - (100 - i) * 100 })); // 100 records over 10s
    }
    const metrics = store.getMetrics();
    // 100 requests over ~10 seconds = ~10 req/s
    expect(metrics[0].throughput).toBeGreaterThan(5);
    expect(metrics[0].throughput).toBeLessThan(20);
  });

  it('should compute average sizes', () => {
    store.record(makeRecord({ reqSize: 100, resSize: 200 }));
    store.record(makeRecord({ reqSize: 300, resSize: 400 }));
    const metrics = store.getMetrics();
    expect(metrics[0].avgReqSize).toBe(200);
    expect(metrics[0].avgResSize).toBe(300);
  });
});
