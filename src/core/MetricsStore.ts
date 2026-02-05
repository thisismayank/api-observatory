import { CircularBuffer } from './CircularBuffer.js';
import { aggregateRecords } from './aggregator.js';
import type { MetricRecord, EndpointMetrics, ResolvedOptions } from '../types.js';

/**
 * In-memory metrics store. One CircularBuffer per endpoint key ("METHOD /pattern").
 * Background cleanup timer evicts fully-stale endpoint keys every 60s.
 */
export class MetricsStore {
  private buffers = new Map<string, CircularBuffer<MetricRecord>>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private readonly options: ResolvedOptions;

  constructor(options: ResolvedOptions) {
    this.options = options;
    this.startCleanup();
  }

  /** Build the map key for a metric record */
  private key(method: string, pattern: string): string {
    return `${method} ${pattern}`;
  }

  /** Record a single request metric. O(1). */
  record(rec: MetricRecord): void {
    const k = this.key(rec.method, rec.pattern);
    let buf = this.buffers.get(k);
    if (!buf) {
      buf = new CircularBuffer<MetricRecord>(this.options.maxPerEndpoint);
      this.buffers.set(k, buf);
    }
    buf.push(rec);
  }

  /** Get aggregated metrics for all endpoints within the retention window. */
  getMetrics(): EndpointMetrics[] {
    const results: EndpointMetrics[] = [];

    for (const buf of this.buffers.values()) {
      const records = buf.toArray();
      const agg = aggregateRecords(records, this.options.percentiles, this.options.retentionMs);
      if (agg) {
        results.push(agg);
      }
    }

    // Sort by count descending
    results.sort((a, b) => b.count - a.count);
    return results;
  }

  /** Get aggregated metrics for a single endpoint. */
  getEndpointMetrics(method: string, pattern: string): EndpointMetrics | null {
    const k = this.key(method, pattern);
    const buf = this.buffers.get(k);
    if (!buf) return null;
    return aggregateRecords(buf.toArray(), this.options.percentiles, this.options.retentionMs);
  }

  /** Clear all stored metrics. */
  reset(): void {
    this.buffers.clear();
  }

  /** Number of tracked endpoints */
  get endpointCount(): number {
    return this.buffers.size;
  }

  /** Start the background cleanup timer (evicts stale endpoint keys) */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.evictStale();
    }, 60_000);
    // .unref() so this timer doesn't prevent process exit
    if (this.cleanupTimer && typeof this.cleanupTimer === 'object' && 'unref' in this.cleanupTimer) {
      this.cleanupTimer.unref();
    }
  }

  /** Remove endpoints whose newest record is older than the retention window */
  private evictStale(): void {
    const cutoff = Date.now() - this.options.retentionMs;
    for (const [key, buf] of this.buffers) {
      const records = buf.toArray();
      if (records.length === 0) {
        this.buffers.delete(key);
        continue;
      }
      // Check if the newest record is stale
      const newest = records.reduce((max, r) => (r.timestamp > max ? r.timestamp : max), records[0].timestamp);
      if (newest < cutoff) {
        this.buffers.delete(key);
      }
    }
  }

  /** Stop background cleanup (for graceful shutdown / testing) */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}
