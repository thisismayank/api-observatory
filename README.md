# API Observatory

Zero-dependency API traffic metrics, latency percentiles, and auto-generated API documentation for Node.js. Drop-in middleware for Express, Fastify, and Koa.

## Features

- **Real-time metrics dashboard** — request counts, p50/p95/p99 latency, error rates, and throughput per endpoint
- **Auto-generated API docs** — Swagger-like UI showing inferred request/response schemas from live traffic
- **Three frameworks** — Express, Fastify, and Koa adapters with identical feature sets
- **Zero config required** — works out of the box with sensible defaults
- **No external dependencies** — core logic has no runtime dependencies
- **Circular buffer storage** — fixed memory footprint with automatic eviction
- **Off-hot-path recording** — metrics are recorded via `setImmediate()` to avoid blocking responses

## Install

```bash
npm install api-observatory
```

## Quick Start

### Express

```js
import express from 'express';
import { expressObservatory } from 'api-observatory';

const app = express();

// Mount FIRST — before all other middleware
app.use(expressObservatory());

app.use(express.json());
// ... your routes
app.listen(3000);
```

### Fastify

```js
import Fastify from 'fastify';
import { fastifyObservatory } from 'api-observatory';

const app = Fastify();
app.register(fastifyObservatory);

// ... your routes
app.listen({ port: 3000 });
```

### Koa

```js
import Koa from 'koa';
import { koaObservatory } from 'api-observatory';

const app = new Koa();

// Mount FIRST — before all other middleware
app.use(koaObservatory());

// ... your routes
app.listen(3000);
```

Then open **http://localhost:3000/_observatory** in your browser.

## Dashboard

The metrics dashboard is served at `/_observatory` by default. It shows:

| Column | Description |
|--------|-------------|
| Method | HTTP method (color-coded) |
| Pattern | Route pattern with parameter placeholders |
| Count | Total requests in the retention window |
| P50 / P95 / P99 | Latency percentiles in milliseconds |
| Avg | Average latency |
| Err% | Combined 4xx + 5xx error rate |
| Req/s | Requests per second (throughput) |

Latency values are color-coded: green (<100ms), yellow (<500ms), red (>=500ms).

The dashboard auto-refreshes every 10 seconds.

## API Documentation (Schema Capture)

When `captureSchemas` is enabled, API Observatory intercepts request and response bodies to build inferred JSON schemas from live traffic. The result is a Swagger-like "API Docs" tab in the dashboard.

### How it works

1. Request bodies are captured from `req.body` (requires a body parser like `express.json()`)
2. Response bodies are captured by intercepting `res.json()` (Express), the `onSend` hook (Fastify), or `ctx.body` (Koa)
3. Schemas are inferred recursively from each observed body using `inferSchema()`
4. Repeated observations are merged — fields present in every observation are marked `required`, fields missing from some are marked `optional`
5. Type conflicts are widened (e.g., a field seen as both `string` and `number` becomes `string | number`)

### Performance impact

Schema capture adds overhead compared to metrics-only mode:

- **`res.json()` monkey-patch** — wraps the original function to capture the body before sending
- **`inferSchema()`** — recursively traverses every request/response body (CPU proportional to body size)
- **`computeSchemaHash()` + `mergeSchemas()`** — runs on every captured body to detect changes

All schema processing runs in `setImmediate()` (off the hot path), so it does **not** block the response from being sent to the client. However, it does consume background CPU cycles. For high-throughput production APIs with large response bodies, you may want to keep it disabled and only enable it in staging or development.

### Enabling schema capture

There are two ways to enable schema capture:

**Option 1: In code**

```js
app.use(expressObservatory({ captureSchemas: true }));
```

**Option 2: Via environment variable**

```env
# .env
OBSERVATORY_CAPTURE_SCHEMAS=true
```

```js
// No need to pass captureSchemas — it reads from env
app.use(expressObservatory());
```

The code option takes precedence over the environment variable. If `captureSchemas` is explicitly passed, the env var is ignored.

### What the API Docs tab shows

- Endpoints grouped by base path (e.g., `/v1/audits`, `/v1/users`)
- Swagger-style method badges (GET, POST, PUT, PATCH, DELETE)
- Path parameters highlighted and listed with type/required info
- Request and response body schemas displayed side-by-side
- Field-level `required` / `optional` badges based on observation consistency
- Sample counts showing how many requests/responses were observed
- Search/filter to quickly find endpoints

### Important: use a single middleware instance

Mount `expressObservatory()` (or the equivalent for your framework) **once**. Do not create multiple instances — each instance has its own isolated metrics and schema stores, so data will be split across them and the dashboard will only show data from the first instance that handles the `/_observatory` request.

```js
// CORRECT — single instance with all options
app.use(expressObservatory({ captureSchemas: true }));

// WRONG — two separate instances with separate stores
app.use(expressObservatory());
app.use(expressObservatory({ captureSchemas: true }));
```

## Configuration

All options are optional. Defaults are designed to work out of the box.

```js
app.use(expressObservatory({
  // Path where the dashboard is served. Default: '/_observatory'
  mountPath: '/_observatory',

  // Only track these route patterns (glob-style). Default: [] (track all)
  includePaths: ['/api/**'],

  // Skip these route patterns. Default: ['/_observatory', '/_observatory/*']
  excludePaths: ['/health', '/ready'],

  // Time window for metrics retention. Default: 3_600_000 (1 hour)
  retentionMs: 3_600_000,

  // Max records stored per endpoint. Default: 10_000
  maxPerEndpoint: 10_000,

  // Which percentiles to compute. Default: [50, 95, 99]
  percentiles: [50, 95, 99],

  // Serve the HTML dashboard. Set false for JSON-only API. Default: true
  htmlDashboard: true,

  // Capture request/response schemas. Default: false
  captureSchemas: true,

  // Hook called after each record is stored — use for external forwarding
  onRecord: (record) => {
    // Forward to your own metrics system
    console.log(record);
  },
}));
```

### Option reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mountPath` | `string` | `'/_observatory'` | URL path for the dashboard and API endpoints |
| `includePaths` | `string[]` | `[]` | Glob patterns of routes to track. Empty = track all |
| `excludePaths` | `string[]` | `[mountPath, mountPath/*]` | Glob patterns of routes to skip |
| `retentionMs` | `number` | `3_600_000` | Time window (ms) for keeping metrics. Older records are evicted |
| `maxPerEndpoint` | `number` | `10_000` | Max records per endpoint (circular buffer capacity) |
| `percentiles` | `number[]` | `[50, 95, 99]` | Which percentiles to compute (appear as p50, p95, p99 columns) |
| `htmlDashboard` | `boolean` | `true` | Serve the HTML dashboard. When false, `mountPath` returns JSON |
| `captureSchemas` | `boolean` | `false` | Capture and infer request/response JSON schemas |
| `onRecord` | `function` | `undefined` | Callback invoked after each metric record is stored |

### Environment variables

| Variable | Description |
|----------|-------------|
| `OBSERVATORY_CAPTURE_SCHEMAS` | Set to `true` to enable schema capture without code changes |

## API Endpoints

The middleware exposes these JSON API endpoints under the mount path:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/_observatory` | HTML dashboard (or JSON metrics if `htmlDashboard: false`) |
| `GET` | `/_observatory/metrics` | All endpoint metrics as JSON |
| `GET` | `/_observatory/metrics/:method/*` | Single endpoint metrics |
| `GET` | `/_observatory/schemas` | All captured schemas as JSON (requires `captureSchemas`) |
| `GET` | `/_observatory/schemas/:method/*` | Single endpoint schema |
| `POST` | `/_observatory/reset` | Clear all metrics and schemas |

### Metrics response format

```json
{
  "timestamp": "2025-01-15T12:00:00.000Z",
  "endpointCount": 5,
  "endpoints": [
    {
      "method": "GET",
      "pattern": "/v1/users/:id",
      "count": 150,
      "latency": { "min": 2.1, "max": 450.3, "avg": 45.2, "p50": 32.1, "p95": 120.5, "p99": 350.2 },
      "errorRate": { "client4xx": 0.02, "server5xx": 0.0, "total": 0.02 },
      "throughput": 2.5,
      "avgReqSize": 0,
      "avgResSize": 1024,
      "lastSeen": 1705312800000
    }
  ]
}
```

### Schemas response format

```json
{
  "timestamp": "2025-01-15T12:00:00.000Z",
  "endpointCount": 3,
  "endpoints": [
    {
      "method": "GET",
      "pattern": "/v1/users/:id",
      "requestBody": null,
      "responseBody": {
        "type": "object",
        "properties": {
          "success": { "type": "boolean", "required": true },
          "data": {
            "type": "object",
            "required": true,
            "properties": {
              "id": { "type": "string", "required": true },
              "name": { "type": "string", "required": true },
              "email": { "type": "string", "required": false }
            }
          }
        }
      },
      "requestSampleCount": 0,
      "responseSampleCount": 42
    }
  ]
}
```

## Path Matching

Include and exclude patterns support glob-style matching:

| Pattern | Matches |
|---------|---------|
| `/health` | Exact match |
| `/api/*` | One segment under `/api/` (e.g., `/api/users`) |
| `/api/**` | Everything under `/api/` (e.g., `/api/users/123/posts`) |

Exclude patterns are checked first. If a path matches any exclude pattern, it is skipped regardless of include patterns.

## Route Extraction

API Observatory automatically extracts parameterized route patterns instead of raw URLs:

| Framework | Source |
|-----------|--------|
| Express | `req.baseUrl + req.route.path` (e.g., `/v1/users/:id`) |
| Fastify | `request.routeOptions.url` or `request.routerPath` |
| Koa | `ctx._matchedRoute` (set by `@koa/router` or `koa-router`) |

If route info is unavailable (e.g., no matching route), the middleware normalizes the raw path by replacing ID-like segments (UUIDs, MongoDB ObjectIds, numeric IDs) with `:id`.

## Graceful Degradation

| Scenario | Behavior |
|----------|----------|
| No routes matched | Raw paths are normalized with `:id` placeholders |
| Schema capture disabled | Dashboard shows metrics only, no API Docs tab |
| Body parser not mounted | Request schemas will be empty (`null`), response schemas still captured |
| Non-JSON responses | Response schemas are only captured from `res.json()` calls |
| High cardinality endpoints | Circular buffer caps memory at `maxPerEndpoint` records per endpoint |
| Stale endpoints | Background cleanup evicts endpoints with no traffic in the retention window |

## Development

```bash
npm install
npm run build
npm test
npm run test:coverage
```

## Project Structure

```
src/
├── adapters/           # Express, Fastify, Koa middleware
├── core/               # MetricsStore, SchemaStore, CircularBuffer, aggregator, percentiles
├── dashboard/          # HTML template, API response builders, request handler
├── route/              # Framework-specific route extractors
├── utils/              # Timer, size estimator, path matcher
├── index.ts            # Public API exports
└── types.ts            # TypeScript interfaces and option resolver
```

## Requirements

- Node.js >= 18
- Express >= 4, Fastify >= 4, or Koa >= 2 (peer dependencies, all optional)

## License

MIT
