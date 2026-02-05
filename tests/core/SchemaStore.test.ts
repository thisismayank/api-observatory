import { describe, it, expect, beforeEach } from 'vitest';
import { SchemaStore } from '../../src/core/SchemaStore.js';

describe('SchemaStore', () => {
  let store: SchemaStore;

  beforeEach(() => {
    store = new SchemaStore();
  });

  describe('recordRequestBody', () => {
    it('records a request body schema', () => {
      store.recordRequestBody('POST', '/users', { name: 'john', age: 30 });
      const schema = store.getEndpointSchema('POST', '/users');
      expect(schema).not.toBeNull();
      expect(schema!.requestBody).not.toBeNull();
      expect(schema!.requestBody!.type).toBe('object');
      expect(schema!.requestBody!.properties!.name.type).toBe('string');
      expect(schema!.requestBody!.properties!.age.type).toBe('number');
      expect(schema!.requestSampleCount).toBe(1);
    });

    it('merges multiple request observations', () => {
      store.recordRequestBody('POST', '/users', { name: 'john', age: 30 });
      store.recordRequestBody('POST', '/users', { name: 'jane', email: 'j@t.com' });
      const schema = store.getEndpointSchema('POST', '/users');
      expect(schema!.requestSampleCount).toBe(2);
      expect(schema!.requestBody!.properties!.name.required).toBe(true);
      expect(schema!.requestBody!.properties!.age.required).toBe(false);
      expect(schema!.requestBody!.properties!.email.required).toBe(false);
    });

    it('bumps count on identical structure without merging', () => {
      store.recordRequestBody('POST', '/users', { name: 'john' });
      store.recordRequestBody('POST', '/users', { name: 'jane' });
      const schema = store.getEndpointSchema('POST', '/users');
      expect(schema!.requestSampleCount).toBe(2);
      expect(schema!.requestBody!.properties!.name.required).toBe(true);
    });

    it('ignores null/undefined bodies', () => {
      store.recordRequestBody('GET', '/users', null);
      store.recordRequestBody('GET', '/users', undefined);
      expect(store.getEndpointSchema('GET', '/users')).toBeNull();
    });
  });

  describe('recordResponseBody', () => {
    it('records a response body schema', () => {
      store.recordResponseBody('GET', '/users', [{ id: 1, name: 'john' }]);
      const schema = store.getEndpointSchema('GET', '/users');
      expect(schema).not.toBeNull();
      expect(schema!.responseBody).not.toBeNull();
      expect(schema!.responseBody!.type).toBe('array');
      expect(schema!.responseSampleCount).toBe(1);
    });

    it('merges multiple response observations', () => {
      store.recordResponseBody('GET', '/users/:id', { id: 1, name: 'john' });
      store.recordResponseBody('GET', '/users/:id', { id: 2, name: 'jane', email: 'j@t.com' });
      const schema = store.getEndpointSchema('GET', '/users/:id');
      expect(schema!.responseSampleCount).toBe(2);
      expect(schema!.responseBody!.properties!.email.required).toBe(false);
    });

    it('ignores null/undefined bodies', () => {
      store.recordResponseBody('GET', '/health', null);
      expect(store.getEndpointSchema('GET', '/health')).toBeNull();
    });
  });

  describe('mixed request + response', () => {
    it('stores both request and response schemas for same endpoint', () => {
      store.recordRequestBody('POST', '/users', { name: 'john' });
      store.recordResponseBody('POST', '/users', { id: 1, name: 'john' });
      const schema = store.getEndpointSchema('POST', '/users');
      expect(schema!.requestBody).not.toBeNull();
      expect(schema!.responseBody).not.toBeNull();
      expect(schema!.requestSampleCount).toBe(1);
      expect(schema!.responseSampleCount).toBe(1);
    });
  });

  describe('getSchemas', () => {
    it('returns all schemas', () => {
      store.recordRequestBody('POST', '/users', { name: 'john' });
      store.recordResponseBody('GET', '/users', [{ id: 1 }]);
      const schemas = store.getSchemas();
      expect(schemas).toHaveLength(2);
    });

    it('returns empty array when no schemas', () => {
      expect(store.getSchemas()).toEqual([]);
    });
  });

  describe('getEndpointSchema', () => {
    it('returns null for unknown endpoint', () => {
      expect(store.getEndpointSchema('GET', '/unknown')).toBeNull();
    });

    it('is case-insensitive for method', () => {
      store.recordRequestBody('post', '/users', { name: 'john' });
      expect(store.getEndpointSchema('POST', '/users')).not.toBeNull();
    });
  });

  describe('reset', () => {
    it('clears all schemas', () => {
      store.recordRequestBody('POST', '/users', { name: 'john' });
      store.recordResponseBody('GET', '/users', [{ id: 1 }]);
      store.reset();
      expect(store.getSchemas()).toEqual([]);
    });
  });
});
