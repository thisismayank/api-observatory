import type { FastifyPluginCallback, FastifyRequest, FastifyReply } from 'fastify';
import { MetricsStore } from '../core/MetricsStore.js';
import { SchemaStore } from '../core/SchemaStore.js';
import { startTimer, elapsed } from '../utils/timer.js';
import { getContentLength } from '../utils/sizeEstimator.js';
import { shouldTrack } from '../utils/pathMatcher.js';
import { extractFastifyRoute } from '../route/fastify-extractor.js';
import { handleDashboardRequest } from '../dashboard/handler.js';
import { buildMetricsResponse, buildEndpointResponse, buildResetResponse, buildSchemasResponse, buildEndpointSchemaResponse } from '../dashboard/api.js';
import type { ObservatoryOptions, MetricRecord } from '../types.js';
import { resolveOptions } from '../types.js';

declare module 'fastify' {
  interface FastifyRequest {
    __observatory_start?: bigint;
    __observatory_reqSize?: number;
    __observatory_resBody?: unknown;
  }
}

/**
 * Fastify plugin for api-observatory.
 *
 * @example
 * ```ts
 * import { fastifyObservatory } from 'api-observatory';
 * fastify.register(fastifyObservatory, { excludePaths: ['/health'] });
 * ```
 */
export const fastifyObservatory: FastifyPluginCallback<ObservatoryOptions> = (fastify, options, done) => {
  const opts = resolveOptions(options);
  const store = new MetricsStore(opts);
  const schemaStore = opts.captureSchemas ? new SchemaStore() : undefined;

  // Register dashboard routes
  const mount = opts.mountPath;

  fastify.get(mount, (_req, reply) => {
    const result = handleDashboardRequest({ method: 'GET', path: mount }, store, opts, schemaStore);
    if (result) {
      reply.status(result.statusCode).type(result.contentType).send(result.body);
    }
  });

  fastify.get(`${mount}/metrics`, (_req, reply) => {
    reply.send(buildMetricsResponse(store.getMetrics()));
  });

  fastify.get(`${mount}/metrics/:method/*`, (req, reply) => {
    const params = req.params as { method: string; '*': string };
    const method = params.method.toUpperCase();
    const pattern = '/' + params['*'];
    const metrics = store.getEndpointMetrics(method, pattern);
    const response = buildEndpointResponse(metrics);
    if (!response) {
      reply.status(404).send({ error: 'Endpoint not found' });
      return;
    }
    reply.send(response);
  });

  // Schema routes (only when captureSchemas is enabled)
  if (schemaStore) {
    fastify.get(`${mount}/schemas`, (_req, reply) => {
      reply.send(buildSchemasResponse(schemaStore.getSchemas()));
    });

    fastify.get(`${mount}/schemas/:method/*`, (req, reply) => {
      const params = req.params as { method: string; '*': string };
      const method = params.method.toUpperCase();
      const pattern = '/' + params['*'];
      const schema = schemaStore.getEndpointSchema(method, pattern);
      const response = buildEndpointSchemaResponse(schema);
      if (!response) {
        reply.status(404).send({ error: 'Endpoint schema not found' });
        return;
      }
      reply.send(response);
    });
  }

  fastify.post(`${mount}/reset`, (_req, reply) => {
    store.reset();
    schemaStore?.reset();
    reply.send(buildResetResponse());
  });

  // Hook: capture start time on every request
  fastify.addHook('onRequest', (request: FastifyRequest, _reply: FastifyReply, hookDone: () => void) => {
    request.__observatory_start = startTimer();
    request.__observatory_reqSize = getContentLength(request.headers);
    hookDone();
  });

  // Hook: capture response body for schema inference (JSON content types only)
  if (schemaStore) {
    fastify.addHook('onSend', (request: FastifyRequest, reply: FastifyReply, payload: unknown, hookDone: (err?: Error | null, value?: unknown) => void) => {
      const ct = reply.getHeader('content-type');
      const contentType = typeof ct === 'string' ? ct : '';
      if (contentType.includes('application/json') && typeof payload === 'string') {
        try {
          request.__observatory_resBody = JSON.parse(payload);
        } catch {
          // Not valid JSON, skip
        }
      }
      hookDone(null, payload);
    });
  }

  // Hook: record metrics on response
  fastify.addHook('onResponse', (request: FastifyRequest, reply: FastifyReply, hookDone: () => void) => {
    const start = request.__observatory_start;
    if (!start) {
      hookDone();
      return;
    }

    const pattern = extractFastifyRoute(request);
    if (!shouldTrack(pattern, opts.includePaths, opts.excludePaths)) {
      hookDone();
      return;
    }

    const durationMs = elapsed(start);
    const resSize = getContentLength(reply.getHeaders() as Record<string, any>);

    const record: MetricRecord = {
      method: request.method,
      pattern,
      statusCode: reply.statusCode,
      durationMs,
      reqSize: request.__observatory_reqSize || 0,
      resSize,
      timestamp: Date.now(),
    };

    // Capture for schema processing
    const reqBody = schemaStore ? request.body : undefined;
    const resBody = request.__observatory_resBody;
    const statusCode = reply.statusCode;

    setImmediate(() => {
      store.record(record);
      opts.onRecord?.(record);

      if (schemaStore) {
        if (reqBody !== undefined && reqBody !== null) {
          schemaStore.recordRequestBody(request.method, pattern, reqBody);
        }
        if (statusCode >= 200 && statusCode < 300 && resBody !== undefined) {
          schemaStore.recordResponseBody(request.method, pattern, resBody);
        }
      }
    });

    hookDone();
  });

  // Expose store for testing
  fastify.decorate('__observatory_store', store);
  if (schemaStore) {
    fastify.decorate('__observatory_schema_store', schemaStore);
  }

  done();
};

// Skip Fastify's encapsulation so hooks and decorators are visible on the parent instance.
// This is the same mechanism fastify-plugin uses internally.
(fastifyObservatory as any)[Symbol.for('skip-override')] = true;
