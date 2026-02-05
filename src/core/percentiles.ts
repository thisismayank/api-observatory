/**
 * Compute percentiles from an array of numeric values.
 * Uses sorting + linear interpolation (nearest-rank method).
 * O(n log n) — acceptable for n ≤ 10,000.
 */
export function computePercentiles(
  values: number[],
  percentiles: number[],
): Record<string, number> {
  const result: Record<string, number> = {};

  if (values.length === 0) {
    for (const p of percentiles) {
      result[`p${p}`] = 0;
    }
    return result;
  }

  // Sort ascending — we sort a copy to avoid mutating the input
  const sorted = values.slice().sort((a, b) => a - b);
  const n = sorted.length;

  for (const p of percentiles) {
    if (p <= 0) {
      result[`p${p}`] = sorted[0];
    } else if (p >= 100) {
      result[`p${p}`] = sorted[n - 1];
    } else {
      // Nearest-rank method
      const rank = (p / 100) * (n - 1);
      const lower = Math.floor(rank);
      const upper = Math.ceil(rank);
      const fraction = rank - lower;
      result[`p${p}`] = sorted[lower] + fraction * (sorted[upper] - sorted[lower]);
    }
  }

  return result;
}

/** Compute min from a sorted or unsorted array */
export function computeMin(values: number[]): number {
  if (values.length === 0) return 0;
  let min = values[0];
  for (let i = 1; i < values.length; i++) {
    if (values[i] < min) min = values[i];
  }
  return min;
}

/** Compute max from a sorted or unsorted array */
export function computeMax(values: number[]): number {
  if (values.length === 0) return 0;
  let max = values[0];
  for (let i = 1; i < values.length; i++) {
    if (values[i] > max) max = values[i];
  }
  return max;
}

/** Compute average from an array */
export function computeAvg(values: number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
  }
  return sum / values.length;
}
