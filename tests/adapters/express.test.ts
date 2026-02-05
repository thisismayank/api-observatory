import { describe, it, expect, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { expressObservatory } from '../../src/adapters/express.js';

describe('Express Adapter', () => {
  let app: express.Express;
  let store: any;

  function setup(options?: any) {
    app = express();
    const middleware = expressObservatory(options);
    store = (middleware as any).__observatory_store;
    app.use(middleware);
    return app;
  }

  afterEach(() => {
    if (store) store.destroy();
  });

  it('should track basic GET requests', async () => {
    setup();
    app.get('/api/test', (_req, res) => res.json({ ok: true }));

    await request(app).get('/api/test').expect(200);

    // Wait for setImmediate to fire
    await new Promise((r) => setTimeout(r, 50));

    const metrics = store.getMetrics();
    expect(metrics.length).toBeGreaterThanOrEqual(1);
    const endpoint = metrics.find((m: any) => m.pattern === '/api/test');
    expect(endpoint).toBeDefined();
    expect(endpoint.method).toBe('GET');
    expect(endpoint.count).toBe(1);
    expect(endpoint.latency.p50).toBeGreaterThan(0);
  });

  it('should track parameterized routes', async () => {
    setup();
    app.get('/users/:id', (_req, res) => res.json({ id: _req.params.id }));

    await request(app).get('/users/123').expect(200);
    await request(app).get('/users/456').expect(200);

    await new Promise((r) => setTimeout(r, 50));

    const metrics = store.getMetrics();
    const endpoint = metrics.find((m: any) => m.pattern === '/users/:id');
    expect(endpoint).toBeDefined();
    expect(endpoint.count).toBe(2);
  });

  it('should track nested router routes', async () => {
    setup();
    const router = express.Router();
    router.get('/:orgId/suppliers/:supplierId', (req, res) => {
      res.json({ org: req.params.orgId, supplier: req.params.supplierId });
    });
    app.use('/v1/audits/organisations', router);

    await request(app).get('/v1/audits/organisations/abc/suppliers/xyz').expect(200);

    await new Promise((r) => setTimeout(r, 50));

    const metrics = store.getMetrics();
    const endpoint = metrics.find(
      (m: any) => m.pattern === '/v1/audits/organisations/:orgId/suppliers/:supplierId',
    );
    expect(endpoint).toBeDefined();
    expect(endpoint.count).toBe(1);
  });

  it('should track error status codes', async () => {
    setup();
    app.get('/fail', (_req, res) => res.status(500).json({ error: 'fail' }));

    await request(app).get('/fail').expect(500);

    await new Promise((r) => setTimeout(r, 50));

    const metrics = store.getMetrics();
    const endpoint = metrics.find((m: any) => m.pattern === '/fail');
    expect(endpoint).toBeDefined();
    expect(endpoint.errorRate.server5xx).toBe(1);
  });

  it('should serve the HTML dashboard', async () => {
    setup();
    const res = await request(app).get('/_observatory').expect(200);
    expect(res.type).toContain('html');
    expect(res.text).toContain('API Observatory');
  });

  it('should serve JSON metrics endpoint', async () => {
    setup();
    app.get('/api/test', (_req, res) => res.json({ ok: true }));

    // Make a request first
    await request(app).get('/api/test').expect(200);
    await new Promise((r) => setTimeout(r, 50));

    const res = await request(app).get('/_observatory/metrics').expect(200);
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('endpointCount');
    expect(res.body).toHaveProperty('endpoints');
    expect(Array.isArray(res.body.endpoints)).toBe(true);
  });

  it('should reset metrics via POST', async () => {
    setup();
    app.get('/api/test', (_req, res) => res.json({ ok: true }));

    await request(app).get('/api/test').expect(200);
    await new Promise((r) => setTimeout(r, 50));

    await request(app).post('/_observatory/reset').expect(200);

    const res = await request(app).get('/_observatory/metrics').expect(200);
    expect(res.body.endpointCount).toBe(0);
  });

  it('should exclude observatory paths from metrics', async () => {
    setup();
    app.get('/api/test', (_req, res) => res.json({ ok: true }));

    await request(app).get('/_observatory/metrics').expect(200);
    await new Promise((r) => setTimeout(r, 50));

    const metrics = store.getMetrics();
    const observatoryEntry = metrics.find((m: any) => m.pattern.includes('_observatory'));
    expect(observatoryEntry).toBeUndefined();
  });

  it('should respect excludePaths option', async () => {
    setup({ excludePaths: ['/health', '/_observatory', '/_observatory/*'] });
    app.get('/health', (_req, res) => res.json({ status: 'ok' }));
    app.get('/api/data', (_req, res) => res.json({ data: 1 }));

    await request(app).get('/health').expect(200);
    await request(app).get('/api/data').expect(200);
    await new Promise((r) => setTimeout(r, 50));

    const metrics = store.getMetrics();
    expect(metrics.find((m: any) => m.pattern === '/health')).toBeUndefined();
    expect(metrics.find((m: any) => m.pattern === '/api/data')).toBeDefined();
  });

  it('should call onRecord hook', async () => {
    const records: any[] = [];
    setup({ onRecord: (rec: any) => records.push(rec) });
    app.get('/api/test', (_req, res) => res.json({ ok: true }));

    await request(app).get('/api/test').expect(200);
    await new Promise((r) => setTimeout(r, 50));

    expect(records.length).toBe(1);
    expect(records[0].method).toBe('GET');
    expect(records[0].pattern).toBe('/api/test');
  });

  it('should track multiple HTTP methods', async () => {
    setup();
    app.get('/api/items', (_req, res) => res.json([]));
    app.post('/api/items', (_req, res) => res.status(201).json({ id: 1 }));

    await request(app).get('/api/items').expect(200);
    await request(app).post('/api/items').expect(201);
    await new Promise((r) => setTimeout(r, 50));

    const metrics = store.getMetrics();
    expect(metrics.length).toBe(2);
    expect(metrics.find((m: any) => m.method === 'GET')).toBeDefined();
    expect(metrics.find((m: any) => m.method === 'POST')).toBeDefined();
  });
});
