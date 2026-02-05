import { describe, it, expect, afterEach } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { fastifyObservatory } from '../../src/adapters/fastify.js';

describe('Fastify Adapter', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) await app.close();
  });

  async function setup(options?: any) {
    app = Fastify();
    await app.register(fastifyObservatory, options || {});
    return app;
  }

  it('should track basic GET requests', async () => {
    await setup();
    app.get('/api/test', async () => ({ ok: true }));
    await app.ready();

    await app.inject({ method: 'GET', url: '/api/test' });

    // Wait for setImmediate
    await new Promise((r) => setTimeout(r, 50));

    const store = (app as any).__observatory_store;
    const metrics = store.getMetrics();
    expect(metrics.length).toBeGreaterThanOrEqual(1);
    const endpoint = metrics.find((m: any) => m.pattern === '/api/test');
    expect(endpoint).toBeDefined();
    expect(endpoint.method).toBe('GET');
    expect(endpoint.count).toBe(1);
  });

  it('should track parameterized routes', async () => {
    await setup();
    app.get('/users/:id', async (req) => ({ id: (req.params as any).id }));
    await app.ready();

    await app.inject({ method: 'GET', url: '/users/123' });
    await app.inject({ method: 'GET', url: '/users/456' });

    await new Promise((r) => setTimeout(r, 50));

    const store = (app as any).__observatory_store;
    const metrics = store.getMetrics();
    const endpoint = metrics.find((m: any) => m.pattern === '/users/:id');
    expect(endpoint).toBeDefined();
    expect(endpoint.count).toBe(2);
  });

  it('should track error status codes', async () => {
    await setup();
    app.get('/fail', async (_req, reply) => {
      reply.status(500);
      return { error: 'fail' };
    });
    await app.ready();

    await app.inject({ method: 'GET', url: '/fail' });

    await new Promise((r) => setTimeout(r, 50));

    const store = (app as any).__observatory_store;
    const metrics = store.getMetrics();
    const endpoint = metrics.find((m: any) => m.pattern === '/fail');
    expect(endpoint).toBeDefined();
    expect(endpoint.errorRate.server5xx).toBe(1);
  });

  it('should serve the HTML dashboard', async () => {
    await setup();
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/_observatory' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.body).toContain('API Observatory');
  });

  it('should serve JSON metrics endpoint', async () => {
    await setup();
    app.get('/api/test', async () => ({ ok: true }));
    await app.ready();

    await app.inject({ method: 'GET', url: '/api/test' });
    await new Promise((r) => setTimeout(r, 50));

    const res = await app.inject({ method: 'GET', url: '/_observatory/metrics' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('endpointCount');
    expect(body).toHaveProperty('endpoints');
  });

  it('should reset metrics via POST', async () => {
    await setup();
    app.get('/api/test', async () => ({ ok: true }));
    await app.ready();

    await app.inject({ method: 'GET', url: '/api/test' });
    await new Promise((r) => setTimeout(r, 50));

    await app.inject({ method: 'POST', url: '/_observatory/reset' });

    const res = await app.inject({ method: 'GET', url: '/_observatory/metrics' });
    const body = JSON.parse(res.body);
    expect(body.endpointCount).toBe(0);
  });

  it('should call onRecord hook', async () => {
    const records: any[] = [];
    await setup({ onRecord: (rec: any) => records.push(rec) });
    app.get('/api/test', async () => ({ ok: true }));
    await app.ready();

    await app.inject({ method: 'GET', url: '/api/test' });
    await new Promise((r) => setTimeout(r, 50));

    expect(records.length).toBe(1);
    expect(records[0].method).toBe('GET');
  });

  it('should query single endpoint metrics', async () => {
    await setup();
    app.get('/api/items', async () => []);
    await app.ready();

    await app.inject({ method: 'GET', url: '/api/items' });
    await new Promise((r) => setTimeout(r, 50));

    const res = await app.inject({
      method: 'GET',
      url: '/_observatory/metrics/GET/api/items',
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.endpoint).toBeDefined();
    expect(body.endpoint.method).toBe('GET');
  });

  it('should return 404 for unknown endpoint query', async () => {
    await setup();
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/_observatory/metrics/GET/nonexistent',
    });
    expect(res.statusCode).toBe(404);
  });
});
