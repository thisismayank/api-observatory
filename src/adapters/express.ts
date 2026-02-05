import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { MetricsStore } from '../core/MetricsStore.js';
import { SchemaStore } from '../core/SchemaStore.js';
import { startTimer, elapsed } from '../utils/timer.js';
import { getContentLength } from '../utils/sizeEstimator.js';
import { shouldTrack } from '../utils/pathMatcher.js';
import { extractExpressRoute } from '../route/express-extractor.js';
import { handleDashboardRequest } from '../dashboard/handler.js';
import type { ObservatoryOptions, MetricRecord } from '../types.js';
import { resolveOptions } from '../types.js';

/**
 * Express middleware factory.
 * Mount FIRST — before all other middleware — to capture the full request lifecycle.
 *
 * @example
 * ```ts
 * import { expressObservatory } from 'api-observatory';
 * app.use(expressObservatory({ excludePaths: ['/health'] }));
 * ```
 */
export function expressObservatory(options?: ObservatoryOptions): RequestHandler {
  const opts = resolveOptions(options);
  const store = new MetricsStore(opts);
  const schemaStore = opts.captureSchemas ? new SchemaStore() : undefined;

  const middleware: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
    // Check if this is a dashboard request
    const dashResult = handleDashboardRequest(
      { method: req.method, path: req.path },
      store,
      opts,
      schemaStore,
    );
    if (dashResult) {
      res.status(dashResult.statusCode).type(dashResult.contentType).send(dashResult.body);
      return;
    }

    // Start timing
    const start = startTimer();
    const reqSize = getContentLength(req.headers);

    // Capture response body via res.json() monkey-patch
    let capturedResBody: unknown = undefined;
    if (schemaStore) {
      const origJson = res.json.bind(res);
      res.json = function patchedJson(body?: any) {
        capturedResBody = body;
        return origJson(body);
      };
    }

    // Hook into response finish
    res.on('finish', () => {
      const pattern = extractExpressRoute(req);

      // Check include/exclude filters
      if (!shouldTrack(pattern, opts.includePaths, opts.excludePaths)) {
        return;
      }

      const durationMs = elapsed(start);
      const resSize = getContentLength(res.getHeaders() as Record<string, any>);

      const record: MetricRecord = {
        method: req.method,
        pattern,
        statusCode: res.statusCode,
        durationMs,
        reqSize,
        resSize,
        timestamp: Date.now(),
      };

      // Capture schema data for off-hot-path processing
      const reqBody = schemaStore ? req.body : undefined;
      const resBody = capturedResBody;
      const statusCode = res.statusCode;

      // Record off the hot path
      setImmediate(() => {
        store.record(record);
        opts.onRecord?.(record);

        if (schemaStore) {
          if (reqBody !== undefined && reqBody !== null) {
            schemaStore.recordRequestBody(req.method, pattern, reqBody);
          }
          if (statusCode >= 200 && statusCode < 300 && resBody !== undefined) {
            schemaStore.recordResponseBody(req.method, pattern, resBody);
          }
        }
      });
    });

    next();
  };

  // Expose the store for testing/external access
  (middleware as any).__observatory_store = store;
  if (schemaStore) {
    (middleware as any).__observatory_schema_store = schemaStore;
  }

  return middleware;
}
