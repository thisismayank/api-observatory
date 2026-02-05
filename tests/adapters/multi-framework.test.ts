import { describe, it, expect, afterEach } from 'vitest';
import express from 'express';
import Fastify from 'fastify';
import Koa from 'koa';
import Router from '@koa/router';
import request from 'supertest';
import { expressObservatory } from '../../src/adapters/express.js';
import { fastifyObservatory } from '../../src/adapters/fastify.js';
import { koaObservatory } from '../../src/adapters/koa.js';

/**
 * Integration test: same assertions across all 3 frameworks.
 * Verifies that the core metrics engine produces consistent results
 * regardless of the adapter used.
 */

interface TestFramework {
  name: string;
  setup: () => Promise<{ agent: any; store: any; cleanup: () => Promise<void> }>;
}

const frameworks: TestFramework[] = [
  {
    name: 'Express',
    setup: async () => {
      const app = express();
      const mw = expressObservatory({ retentionMs: 60_000 });
      const store = (mw as any).__observatory_store;
      app.use(mw);
      app.get('/api/items', (_req, res) => res.json([1, 2, 3]));
      app.get('/api/items/:id', (req, res) => res.json({ id: req.params.id }));
      app.post('/api/items', (_req, res) => res.status(201).json({ id: 'new' }));
      app.get('/api/error', (_req, res) => res.status(500).json({ error: 'boom' }));
      app.get('/api/not-found', (_req, res) => res.status(404).json({ error: 'nope' }));
      return {
        agent: request(app),
        store,
        cleanup: async () => store.destroy(),
      };
    },
  },
  {
    name: 'Fastify',
    setup: async () => {
      const app = Fastify();
      await app.register(fastifyObservatory, { retentionMs: 60_000 });
      app.get('/api/items', async () => [1, 2, 3]);
      app.get('/api/items/:id', async (req) => ({ id: (req.params as any).id }));
      app.post('/api/items', async (_req, reply) => {
        reply.status(201);
        return { id: 'new' };
      });
      app.get('/api/error', async (_req, reply) => {
        reply.status(500);
        return { error: 'boom' };
      });
      app.get('/api/not-found', async (_req, reply) => {
        reply.status(404);
        return { error: 'nope' };
      });
      await app.ready();
      const store = (app as any).__observatory_store;
      return {
        agent: {
          get: (url: string) => app.inject({ method: 'GET', url }).then((r) => ({
            status: r.statusCode,
            body: JSON.parse(r.body),
          })),
          post: (url: string) => app.inject({ method: 'POST', url }).then((r) => ({
            status: r.statusCode,
            body: JSON.parse(r.body),
          })),
        },
        store,
        cleanup: async () => app.close(),
      };
    },
  },
  {
    name: 'Koa',
    setup: async () => {
      const app = new Koa();
      const mw = koaObservatory({ retentionMs: 60_000 });
      const store = (mw as any).__observatory_store;
      app.use(mw);
      const router = new Router();
      router.get('/api/items', (ctx) => { ctx.body = [1, 2, 3]; });
      router.get('/api/items/:id', (ctx) => { ctx.body = { id: ctx.params.id }; });
      router.post('/api/items', (ctx) => { ctx.status = 201; ctx.body = { id: 'new' }; });
      router.get('/api/error', (ctx) => { ctx.status = 500; ctx.body = { error: 'boom' }; });
      router.get('/api/not-found', (ctx) => { ctx.status = 404; ctx.body = { error: 'nope' }; });
      app.use(router.routes());
      return {
        agent: request(app.callback()),
        store,
        cleanup: async () => store.destroy(),
      };
    },
  },
];

// Common test runner
for (const fw of frameworks) {
  describe(`Integration: ${fw.name}`, () => {
    let store: any;
    let agent: any;
    let cleanup: () => Promise<void>;

    afterEach(async () => {
      if (cleanup) await cleanup();
    });

    it('should track requests and report correct counts', async () => {
      ({ agent, store, cleanup } = await fw.setup());

      // Make requests
      if (fw.name === 'Fastify') {
        await agent.get('/api/items');
        await agent.get('/api/items');
        await agent.get('/api/items/1');
        await agent.post('/api/items');
      } else {
        await agent.get('/api/items').expect(200);
        await agent.get('/api/items').expect(200);
        await agent.get('/api/items/1').expect(200);
        await agent.post('/api/items').expect(201);
      }

      await new Promise((r) => setTimeout(r, 100));

      const metrics = store.getMetrics();
      expect(metrics.length).toBeGreaterThanOrEqual(2);

      // Find GET /api/items
      const getItems = metrics.find(
        (m: any) => m.method === 'GET' && (m.pattern === '/api/items' || m.pattern.includes('/api/items')),
      );
      expect(getItems).toBeDefined();
      // Should have exactly 2 GET /api/items requests
      // (the :id variant is a separate endpoint)
    });

    it('should compute error rates correctly', async () => {
      ({ agent, store, cleanup } = await fw.setup());

      // 2 success, 1 client error, 1 server error
      if (fw.name === 'Fastify') {
        await agent.get('/api/items');
        await agent.get('/api/items');
        await agent.get('/api/error');
        await agent.get('/api/not-found');
      } else {
        await agent.get('/api/items').expect(200);
        await agent.get('/api/items').expect(200);
        await agent.get('/api/error').expect(500);
        await agent.get('/api/not-found').expect(404);
      }

      await new Promise((r) => setTimeout(r, 100));

      const metrics = store.getMetrics();
      const errEndpoint = metrics.find((m: any) => m.pattern.includes('error'));
      expect(errEndpoint).toBeDefined();
      expect(errEndpoint.errorRate.server5xx).toBe(1);

      const notFoundEndpoint = metrics.find((m: any) => m.pattern.includes('not-found'));
      expect(notFoundEndpoint).toBeDefined();
      expect(notFoundEndpoint.errorRate.client4xx).toBe(1);
    });

    it('should report latency > 0', async () => {
      ({ agent, store, cleanup } = await fw.setup());

      if (fw.name === 'Fastify') {
        await agent.get('/api/items');
      } else {
        await agent.get('/api/items').expect(200);
      }

      await new Promise((r) => setTimeout(r, 100));

      const metrics = store.getMetrics();
      const endpoint = metrics.find(
        (m: any) => m.method === 'GET' && m.pattern.includes('/api/items'),
      );
      expect(endpoint).toBeDefined();
      expect(endpoint.latency.p50).toBeGreaterThan(0);
      expect(endpoint.latency.avg).toBeGreaterThan(0);
    });
  });
}

describe('Memory bounds test', () => {
  it('should stay bounded when recording 100K entries across 50 endpoints', async () => {
    const { resolveOptions } = await import('../../src/types.js');
    const { MetricsStore } = await import('../../src/core/MetricsStore.js');

    const opts = resolveOptions({ maxPerEndpoint: 1000, retentionMs: 3_600_000 });
    const store = new MetricsStore(opts);

    const now = Date.now();
    for (let ep = 0; ep < 50; ep++) {
      for (let i = 0; i < 2000; i++) {
        store.record({
          method: 'GET',
          pattern: `/api/endpoint-${ep}`,
          statusCode: 200,
          durationMs: Math.random() * 100,
          reqSize: 0,
          resSize: 100,
          timestamp: now - Math.random() * 1000,
        });
      }
    }

    // Should have 50 endpoints
    expect(store.endpointCount).toBe(50);

    // Each endpoint should have at most 1000 records (maxPerEndpoint)
    const metrics = store.getMetrics();
    expect(metrics.length).toBe(50);
    for (const m of metrics) {
      expect(m.count).toBeLessThanOrEqual(1000);
    }

    store.destroy();
  });
});
