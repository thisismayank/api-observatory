/** Record of a single API request/response cycle */
export interface MetricRecord {
  /** HTTP method: GET, POST, PUT, DELETE, etc. */
  method: string;
  /** Route pattern (e.g. /v1/users/:id), NOT the actual URL */
  pattern: string;
  /** HTTP status code */
  statusCode: number;
  /** Request duration in milliseconds (high-resolution) */
  durationMs: number;
  /** Request body size in bytes (from Content-Length header) */
  reqSize: number;
  /** Response body size in bytes (from Content-Length header) */
  resSize: number;
  /** Timestamp when the request was recorded (Date.now()) */
  timestamp: number;
}

/** Latency breakdown with dynamic percentile keys (p50, p95, p99, etc.) plus min/max/avg */
export interface LatencyMetrics {
  min: number;
  max: number;
  avg: number;
  [key: string]: number;
}

/** Aggregated metrics for a single endpoint */
export interface EndpointMetrics {
  method: string;
  pattern: string;
  count: number;
  latency: LatencyMetrics;
  errorRate: {
    client4xx: number;
    server5xx: number;
    total: number;
  };
  throughput: number;
  avgReqSize: number;
  avgResSize: number;
  lastSeen: number;
}

/** Inferred JSON schema for a single value */
export interface SchemaField {
  /** Inferred type(s), e.g. "string", "number", "object", "array", "null", or widened like "string | number" */
  type: string;
  /** Properties when type is "object" */
  properties?: Record<string, SchemaField>;
  /** Item schema when type is "array" */
  items?: SchemaField;
  /** Whether this field is present in every observation */
  required?: boolean;
}

/** Captured request/response schemas for a single endpoint */
export interface EndpointSchema {
  method: string;
  pattern: string;
  requestBody: SchemaField | null;
  responseBody: SchemaField | null;
  requestSampleCount: number;
  responseSampleCount: number;
  requestHash: string | null;
  responseHash: string | null;
}

/** Configuration options for api-observatory */
export interface ObservatoryOptions {
  /** Dashboard mount path. Default: '/_observatory' */
  mountPath?: string;
  /** Only track these route patterns (glob-style). Default: all */
  includePaths?: string[];
  /** Skip these route patterns (glob-style). Default: [mountPath] */
  excludePaths?: string[];
  /** Time window for metrics in ms. Default: 3_600_000 (1 hour) */
  retentionMs?: number;
  /** Max records per endpoint buffer. Default: 10_000 */
  maxPerEndpoint?: number;
  /** Which percentiles to compute. Default: [50, 95, 99] */
  percentiles?: number[];
  /** Serve HTML dashboard at mountPath. Default: true */
  htmlDashboard?: boolean;
  /** Capture request/response JSON schemas. Default: false */
  captureSchemas?: boolean;
  /** Hook called after each record is stored — use for external forwarding */
  onRecord?: (rec: MetricRecord) => void;
}

/** Resolved options with all defaults applied */
export interface ResolvedOptions {
  mountPath: string;
  includePaths: string[];
  excludePaths: string[];
  retentionMs: number;
  maxPerEndpoint: number;
  percentiles: number[];
  htmlDashboard: boolean;
  captureSchemas: boolean;
  onRecord?: (rec: MetricRecord) => void;
}

/** Resolves user-provided options into fully-populated options */
export function resolveOptions(opts?: ObservatoryOptions): ResolvedOptions {
  const mountPath = opts?.mountPath ?? '/_observatory';
  return {
    mountPath,
    includePaths: opts?.includePaths ?? [],
    excludePaths: opts?.excludePaths ?? [mountPath + '/*', mountPath],
    retentionMs: opts?.retentionMs ?? 3_600_000,
    maxPerEndpoint: opts?.maxPerEndpoint ?? 10_000,
    percentiles: opts?.percentiles ?? [50, 95, 99],
    htmlDashboard: opts?.htmlDashboard ?? true,
    captureSchemas: opts?.captureSchemas ?? false,
    onRecord: opts?.onRecord,
  };
}
