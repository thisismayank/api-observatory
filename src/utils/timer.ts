/**
 * High-resolution timer using process.hrtime.bigint().
 * Returns duration in milliseconds with sub-ms precision.
 */

/** Capture the current high-resolution timestamp */
export function startTimer(): bigint {
  return process.hrtime.bigint();
}

/** Compute elapsed duration in milliseconds from a start timestamp */
export function elapsed(start: bigint): number {
  const diff = process.hrtime.bigint() - start;
  // Convert nanoseconds to milliseconds with 2 decimal places
  return Number(diff) / 1_000_000;
}
