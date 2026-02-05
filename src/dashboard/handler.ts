import { MetricsStore } from '../core/MetricsStore.js';
import type { SchemaStore } from '../core/SchemaStore.js';
import { buildMetricsResponse, buildEndpointResponse, buildResetResponse, buildSchemasResponse, buildEndpointSchemaResponse } from './api.js';
import { buildHtmlDashboard } from './html.js';
import type { ResolvedOptions } from '../types.js';

export interface DashboardRequest {
  method: string;
  /** The full request path (e.g. /_observatory/metrics) */
  path: string;
}

export interface DashboardResponse {
  statusCode: number;
  contentType: string;
  body: string;
}

/**
 * Framework-agnostic dashboard handler.
 * Returns null if the request path doesn't match a dashboard route.
 */
export function handleDashboardRequest(
  req: DashboardRequest,
  store: MetricsStore,
  options: ResolvedOptions,
  schemaStore?: SchemaStore,
): DashboardResponse | null {
  const mount = options.mountPath;

  // Normalize path: remove trailing slash
  const path = req.path.endsWith('/') && req.path.length > 1 ? req.path.slice(0, -1) : req.path;
  const method = req.method.toUpperCase();

  // POST /_observatory/reset
  if (method === 'POST' && path === `${mount}/reset`) {
    store.reset();
    schemaStore?.reset();
    return {
      statusCode: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildResetResponse()),
    };
  }

  // Only GET from here on
  if (method !== 'GET') return null;

  // GET /_observatory/schemas/:method/*pattern
  if (schemaStore && path.startsWith(`${mount}/schemas/`)) {
    const rest = path.slice(`${mount}/schemas/`.length);
    const slashIdx = rest.indexOf('/');
    if (slashIdx > 0) {
      const reqMethod = rest.slice(0, slashIdx).toUpperCase();
      const pattern = rest.slice(slashIdx);
      const schema = schemaStore.getEndpointSchema(reqMethod, pattern);
      const response = buildEndpointSchemaResponse(schema);
      if (!response) {
        return {
          statusCode: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Endpoint schema not found' }),
        };
      }
      return {
        statusCode: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      };
    }
  }

  // GET /_observatory/schemas
  if (schemaStore && path === `${mount}/schemas`) {
    const schemas = schemaStore.getSchemas();
    return {
      statusCode: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildSchemasResponse(schemas)),
    };
  }

  // GET /_observatory/metrics/:method/*pattern
  if (path.startsWith(`${mount}/metrics/`)) {
    const rest = path.slice(`${mount}/metrics/`.length);
    const slashIdx = rest.indexOf('/');
    if (slashIdx > 0) {
      const reqMethod = rest.slice(0, slashIdx).toUpperCase();
      const pattern = rest.slice(slashIdx);
      const metrics = store.getEndpointMetrics(reqMethod, pattern);
      const response = buildEndpointResponse(metrics);
      if (!response) {
        return {
          statusCode: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Endpoint not found' }),
        };
      }
      return {
        statusCode: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      };
    }
  }

  // GET /_observatory/metrics
  if (path === `${mount}/metrics`) {
    const metrics = store.getMetrics();
    return {
      statusCode: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildMetricsResponse(metrics)),
    };
  }

  // GET /_observatory (HTML dashboard)
  if (path === mount) {
    if (!options.htmlDashboard) {
      // Redirect to JSON metrics if HTML is disabled
      return {
        statusCode: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildMetricsResponse(store.getMetrics())),
      };
    }
    return {
      statusCode: 200,
      contentType: 'text/html',
      body: buildHtmlDashboard(mount, !!schemaStore),
    };
  }

  return null;
}
