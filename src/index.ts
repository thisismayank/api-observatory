// Core
export { MetricsStore } from './core/MetricsStore.js';
export { CircularBuffer } from './core/CircularBuffer.js';
export { computePercentiles, computeMin, computeMax, computeAvg } from './core/percentiles.js';
export { aggregateRecords } from './core/aggregator.js';
export { SchemaStore } from './core/SchemaStore.js';
export { inferSchema, mergeSchemas, computeSchemaHash } from './core/schemaInference.js';

// Types
export type { MetricRecord, EndpointMetrics, ObservatoryOptions, ResolvedOptions, SchemaField, EndpointSchema } from './types.js';
export { resolveOptions } from './types.js';

// Adapters
export { expressObservatory } from './adapters/express.js';
export { fastifyObservatory } from './adapters/fastify.js';
export { koaObservatory } from './adapters/koa.js';

// Route extractors
export { extractExpressRoute } from './route/express-extractor.js';
export { extractFastifyRoute } from './route/fastify-extractor.js';
export { extractKoaRoute } from './route/koa-extractor.js';

// Dashboard
export { handleDashboardRequest } from './dashboard/handler.js';
export { buildHtmlDashboard } from './dashboard/html.js';
export { buildMetricsResponse, buildEndpointResponse, buildResetResponse, buildSchemasResponse, buildEndpointSchemaResponse } from './dashboard/api.js';

// Utils
export { startTimer, elapsed } from './utils/timer.js';
export { getContentLength } from './utils/sizeEstimator.js';
export { shouldTrack, matchesAny } from './utils/pathMatcher.js';
