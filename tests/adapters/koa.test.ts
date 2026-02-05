import { describe, it, expect, afterEach } from 'vitest';
import Koa from 'koa';
import Router from '@koa/router';
import request from 'supertest';
import { koaObservatory } from '../../src/adapters/koa.js';

describe('Koa Adapter', () => {
  let server: any;

  afterEach(() => {
    if (server) server.close();
  });

  function setup(options?: any) {
    const app = new Koa();
    const middleware = koaObservatory(options);
    const store = (middleware as any).__observatory_store;
    app.use(middleware);
    return { app, store };
  }

  it('should track basic GET requests', async () => {
    const { app, store } = setup();
    const router = new Router();
    router.get('/api/test', (ctx) => {
      ctx.body = { ok: true };
    });
    app.use(router.routes());

    await request(app.callback()).get('/api/test').expect(200);
    await new Promise((r) => setTimeout(r, 50));

    const metrics = store.getMetrics();
    expect(metrics.length).toBeGreaterThanOrEqual(1);
    const endpoint = metrics.find((m: any) => m.pattern === '/api/test');
    expect(endpoint).toBeDefined();
    expect(endpoint.method).toBe('GET');
    expect(endpoint.count).toBe(1);
  });

  it('should track parameterized routes via koa-router', async () => {
    const { app, store } = setup();
    const router = new Router();
    router.get('/users/:id', (ctx) => {
      ctx.body = { id: ctx.params.id };
    });
    app.use(router.routes());

    await request(app.callback()).get('/users/123').expect(200);
    await request(app.callback()).get('/users/456').expect(200);
    await new Promise((r) => setTimeout(r, 50));

    const metrics = store.getMetrics();
    const endpoint = metrics.find((m: any) => m.pattern === '/users/:id');
    expect(endpoint).toBeDefined();
    expect(endpoint.count).toBe(2);
  });

  it('should track error status codes', async () => {
    const { app, store } = setup();
    const router = new Router();
    router.get('/fail', (ctx) => {
      ctx.status = 500;
      ctx.body = { error: 'fail' };
    });
    app.use(router.routes());

    await request(app.callback()).get('/fail').expect(500);
    await new Promise((r) => setTimeout(r, 50));

    const metrics = store.getMetrics();
    const endpoint = metrics.find((m: any) => m.pattern === '/fail');
    expect(endpoint).toBeDefined();
    expect(endpoint.errorRate.server5xx).toBe(1);
  });

  it('should serve the HTML dashboard', async () => {
    const { app } = setup();
    const res = await request(app.callback()).get('/_observatory').expect(200);
    expect(res.type).toContain('html');
    expect(res.text).toContain('API Observatory');
  });

  it('should serve JSON metrics endpoint', async () => {
    const { app, store } = setup();
    const router = new Router();
    router.get('/api/test', (ctx) => {
      ctx.body = { ok: true };
    });
    app.use(router.routes());

    await request(app.callback()).get('/api/test').expect(200);
    await new Promise((r) => setTimeout(r, 50));

    const res = await request(app.callback()).get('/_observatory/metrics').expect(200);
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('endpointCount');
    expect(res.body).toHaveProperty('endpoints');
  });

  it('should reset metrics via POST', async () => {
    const { app, store } = setup();
    const router = new Router();
    router.get('/api/test', (ctx) => {
      ctx.body = { ok: true };
    });
    app.use(router.routes());

    await request(app.callback()).get('/api/test').expect(200);
    await new Promise((r) => setTimeout(r, 50));

    await request(app.callback()).post('/_observatory/reset').expect(200);

    const res = await request(app.callback()).get('/_observatory/metrics').expect(200);
    expect(res.body.endpointCount).toBe(0);
  });

  it('should call onRecord hook', async () => {
    const records: any[] = [];
    const { app } = setup({ onRecord: (rec: any) => records.push(rec) });
    const router = new Router();
    router.get('/api/test', (ctx) => {
      ctx.body = { ok: true };
    });
    app.use(router.routes());

    await request(app.callback()).get('/api/test').expect(200);
    await new Promise((r) => setTimeout(r, 50));

    expect(records.length).toBe(1);
    expect(records[0].method).toBe('GET');
  });
});
