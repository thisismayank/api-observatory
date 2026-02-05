import type { Middleware } from 'koa';
import { MetricsStore } from '../core/MetricsStore.js';
import { SchemaStore } from '../core/SchemaStore.js';
import { startTimer, elapsed } from '../utils/timer.js';
import { getContentLength } from '../utils/sizeEstimator.js';
import { shouldTrack } from '../utils/pathMatcher.js';
import { extractKoaRoute } from '../route/koa-extractor.js';
import { handleDashboardRequest } from '../dashboard/handler.js';
import type { ObservatoryOptions, MetricRecord } from '../types.js';
import { resolveOptions } from '../types.js';

/**
 * Koa middleware factory for api-observatory.
 *
 * @example
 * ```ts
 * import { koaObservatory } from 'api-observatory';
 * app.use(koaObservatory({ excludePaths: ['/health'] }));
 * ```
 */
export function koaObservatory(options?: ObservatoryOptions): Middleware {
  const opts = resolveOptions(options);
  const store = new MetricsStore(opts);
  const schemaStore = opts.captureSchemas ? new SchemaStore() : undefined;

  const middleware: Middleware = async (ctx, next) => {
    // Check if this is a dashboard request
    const dashResult = handleDashboardRequest(
      { method: ctx.method, path: ctx.path },
      store,
      opts,
      schemaStore,
    );
    if (dashResult) {
      ctx.status = dashResult.statusCode;
      ctx.type = dashResult.contentType;
      ctx.body = dashResult.body;
      return;
    }

    // Start timing
    const start = startTimer();
    const reqSize = getContentLength(ctx.request.headers);

    // Proceed with downstream middleware
    await next();

    // After response
    const pattern = extractKoaRoute(ctx);
    if (!shouldTrack(pattern, opts.includePaths, opts.excludePaths)) {
      return;
    }

    const durationMs = elapsed(start);
    const resSize = typeof ctx.response.length === 'number' ? ctx.response.length : 0;

    const record: MetricRecord = {
      method: ctx.method,
      pattern,
      statusCode: ctx.status,
      durationMs,
      reqSize,
      resSize,
      timestamp: Date.now(),
    };

    // Capture body refs for schema processing
    const reqBody = schemaStore ? (ctx.request as any).body : undefined;
    const resBody = schemaStore ? ctx.body : undefined;
    const statusCode = ctx.status;

    setImmediate(() => {
      store.record(record);
      opts.onRecord?.(record);

      if (schemaStore) {
        if (reqBody !== undefined && reqBody !== null) {
          schemaStore.recordRequestBody(ctx.method, pattern, reqBody);
        }
        if (statusCode >= 200 && statusCode < 300 && resBody !== undefined && resBody !== null) {
          schemaStore.recordResponseBody(ctx.method, pattern, resBody);
        }
      }
    });
  };

  // Expose the store for testing
  (middleware as any).__observatory_store = store;
  if (schemaStore) {
    (middleware as any).__observatory_schema_store = schemaStore;
  }

  return middleware;
}
