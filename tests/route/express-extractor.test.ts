import { describe, it, expect } from 'vitest';
import { extractExpressRoute, normalizePath } from '../../src/route/express-extractor.js';

describe('extractExpressRoute', () => {
  it('should extract route pattern from req.route.path', () => {
    const req = {
      baseUrl: '',
      route: { path: '/users/:id' },
      path: '/users/123',
    };
    expect(extractExpressRoute(req)).toBe('/users/:id');
  });

  it('should prepend baseUrl for nested routers', () => {
    const req = {
      baseUrl: '/v1/api',
      route: { path: '/users/:id' },
      path: '/v1/api/users/123',
    };
    expect(extractExpressRoute(req)).toBe('/v1/api/users/:id');
  });

  it('should normalize MongoDB ObjectIds in fallback path', () => {
    // CORS preflight — no req.route
    const req = {
      path: '/v1/factories/organisations/67857f89eade0aaed3f6587c',
    };
    expect(extractExpressRoute(req)).toBe('/v1/factories/organisations/:id');
  });

  it('should normalize UUIDs in fallback path', () => {
    const req = {
      path: '/v1/users/550e8400-e29b-41d4-a716-446655440000/profile',
    };
    expect(extractExpressRoute(req)).toBe('/v1/users/:id/profile');
  });

  it('should normalize numeric IDs in fallback path', () => {
    const req = {
      path: '/v1/items/42',
    };
    expect(extractExpressRoute(req)).toBe('/v1/items/:id');
  });

  it('should normalize multiple IDs in a single path', () => {
    const req = {
      path: '/v1/organisations/67857f89eade0aaed3f6587c/suppliers/67896eaad9aa64257a7a9b65',
    };
    expect(extractExpressRoute(req)).toBe('/v1/organisations/:id/suppliers/:id');
  });

  it('should not normalize short alpha strings', () => {
    const req = {
      path: '/v1/risk-scores/CHINA/organisations/67857f89eade0aaed3f6587c',
    };
    expect(extractExpressRoute(req)).toBe('/v1/risk-scores/CHINA/organisations/:id');
  });

  it('should fallback to req.url when path is not available', () => {
    const req = {
      url: '/fallback',
    };
    expect(extractExpressRoute(req)).toBe('/fallback');
  });

  it('should return / as last resort', () => {
    const req = {};
    expect(extractExpressRoute(req)).toBe('/');
  });

  it('should handle root route', () => {
    const req = {
      baseUrl: '',
      route: { path: '/' },
      path: '/',
    };
    expect(extractExpressRoute(req)).toBe('/');
  });

  it('should handle deeply nested routers', () => {
    const req = {
      baseUrl: '/v1/audits/organisations',
      route: { path: '/:orgId/suppliers/:supplierId' },
      path: '/v1/audits/organisations/abc/suppliers/xyz',
    };
    expect(extractExpressRoute(req)).toBe('/v1/audits/organisations/:orgId/suppliers/:supplierId');
  });
});

describe('normalizePath', () => {
  it('should replace MongoDB ObjectIds with :id', () => {
    expect(normalizePath('/orgs/67857f89eade0aaed3f6587c')).toBe('/orgs/:id');
  });

  it('should replace UUIDs with :id', () => {
    expect(normalizePath('/users/550e8400-e29b-41d4-a716-446655440000')).toBe('/users/:id');
  });

  it('should replace numeric IDs with :id', () => {
    expect(normalizePath('/items/12345')).toBe('/items/:id');
  });

  it('should replace multiple IDs', () => {
    expect(normalizePath('/a/67857f89eade0aaed3f6587c/b/67896eaad9aa64257a7a9b65')).toBe('/a/:id/b/:id');
  });

  it('should leave non-ID segments alone', () => {
    expect(normalizePath('/v1/risk-scores/CHINA/organisations')).toBe('/v1/risk-scores/CHINA/organisations');
  });

  it('should leave paths with no IDs unchanged', () => {
    expect(normalizePath('/v1/health')).toBe('/v1/health');
  });

  it('should handle capmanagement-style static segments', () => {
    expect(normalizePath('/v1/audits/organisations/67857f89eade0aaed3f6587c/capmanagement'))
      .toBe('/v1/audits/organisations/:id/capmanagement');
  });
});
