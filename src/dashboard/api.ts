import type { EndpointMetrics, EndpointSchema } from '../types.js';

/** Build the JSON response for all metrics */
export function buildMetricsResponse(metrics: EndpointMetrics[]): object {
  return {
    timestamp: new Date().toISOString(),
    endpointCount: metrics.length,
    endpoints: metrics,
  };
}

/** Build the JSON response for a single endpoint */
export function buildEndpointResponse(metrics: EndpointMetrics | null): object | null {
  if (!metrics) return null;
  return {
    timestamp: new Date().toISOString(),
    endpoint: metrics,
  };
}

/** Build the JSON response for a reset action */
export function buildResetResponse(): object {
  return {
    timestamp: new Date().toISOString(),
    message: 'All metrics have been reset',
  };
}

/** Build the JSON response for all endpoint schemas */
export function buildSchemasResponse(schemas: EndpointSchema[]): object {
  return {
    timestamp: new Date().toISOString(),
    endpointCount: schemas.length,
    endpoints: schemas,
  };
}

/** Build the JSON response for a single endpoint schema */
export function buildEndpointSchemaResponse(schema: EndpointSchema | null): object | null {
  if (!schema) return null;
  return {
    timestamp: new Date().toISOString(),
    endpoint: schema,
  };
}
