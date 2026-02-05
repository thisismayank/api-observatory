import { describe, it, expect } from 'vitest';
import { computePercentiles, computeMin, computeMax, computeAvg } from '../../src/core/percentiles.js';

describe('computePercentiles', () => {
  it('should return 0 for empty arrays', () => {
    const result = computePercentiles([], [50, 95, 99]);
    expect(result.p50).toBe(0);
    expect(result.p95).toBe(0);
    expect(result.p99).toBe(0);
  });

  it('should handle single value', () => {
    const result = computePercentiles([42], [50, 95, 99]);
    expect(result.p50).toBe(42);
    expect(result.p95).toBe(42);
    expect(result.p99).toBe(42);
  });

  it('should compute correct percentiles for known distribution', () => {
    // 1 to 100 inclusive
    const values = Array.from({ length: 100 }, (_, i) => i + 1);
    const result = computePercentiles(values, [50, 95, 99]);
    // p50 of 1..100 = 50.5 (interpolated)
    expect(result.p50).toBeCloseTo(50.5, 1);
    // p95 ~= 95.05
    expect(result.p95).toBeGreaterThanOrEqual(94);
    expect(result.p95).toBeLessThanOrEqual(96);
    // p99 ~= 99.01
    expect(result.p99).toBeGreaterThanOrEqual(98);
    expect(result.p99).toBeLessThanOrEqual(100);
  });

  it('should compute correct percentiles for unsorted input', () => {
    const values = [50, 10, 90, 30, 70, 20, 80, 40, 60, 100];
    const result = computePercentiles(values, [50]);
    // Sorted: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
    // p50 = median = interpolation between 50 and 60 = 55
    expect(result.p50).toBeCloseTo(55, 1);
  });

  it('should handle p0 and p100', () => {
    const values = [5, 10, 15, 20, 25];
    const result = computePercentiles(values, [0, 100]);
    expect(result.p0).toBe(5);
    expect(result.p100).toBe(25);
  });

  it('should not mutate input array', () => {
    const values = [30, 10, 20];
    const copy = [...values];
    computePercentiles(values, [50]);
    expect(values).toEqual(copy);
  });

  it('should compute custom percentiles', () => {
    const values = Array.from({ length: 1000 }, (_, i) => i + 1);
    const result = computePercentiles(values, [25, 75, 90]);
    expect(result.p25).toBeGreaterThan(240);
    expect(result.p25).toBeLessThan(260);
    expect(result.p75).toBeGreaterThan(740);
    expect(result.p75).toBeLessThan(760);
    expect(result.p90).toBeGreaterThan(890);
    expect(result.p90).toBeLessThan(910);
  });
});

describe('computeMin', () => {
  it('should return 0 for empty array', () => {
    expect(computeMin([])).toBe(0);
  });

  it('should find the minimum', () => {
    expect(computeMin([5, 3, 8, 1, 9])).toBe(1);
  });

  it('should handle single value', () => {
    expect(computeMin([42])).toBe(42);
  });
});

describe('computeMax', () => {
  it('should return 0 for empty array', () => {
    expect(computeMax([])).toBe(0);
  });

  it('should find the maximum', () => {
    expect(computeMax([5, 3, 8, 1, 9])).toBe(9);
  });

  it('should handle single value', () => {
    expect(computeMax([42])).toBe(42);
  });
});

describe('computeAvg', () => {
  it('should return 0 for empty array', () => {
    expect(computeAvg([])).toBe(0);
  });

  it('should compute average', () => {
    expect(computeAvg([10, 20, 30])).toBe(20);
  });

  it('should handle single value', () => {
    expect(computeAvg([42])).toBe(42);
  });
});
