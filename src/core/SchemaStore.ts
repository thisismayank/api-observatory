import type { SchemaField, EndpointSchema } from '../types.js';
import { inferSchema, mergeSchemas, computeSchemaHash } from './schemaInference.js';

/**
 * Stores inferred request/response schemas per endpoint.
 * Keyed by "METHOD /pattern". Merges schemas on write, with
 * a hash-based fast path to skip merges when structure is unchanged.
 */
export class SchemaStore {
  private schemas = new Map<string, EndpointSchema>();

  private key(method: string, pattern: string): string {
    return `${method.toUpperCase()} ${pattern}`;
  }

  /** Record a request body observation, inferring and merging its schema. */
  recordRequestBody(method: string, pattern: string, body: unknown): void {
    if (body === undefined || body === null) return;
    if (typeof body !== 'object' && typeof body !== 'string' && typeof body !== 'number' && typeof body !== 'boolean') return;

    const k = this.key(method, pattern);
    const incoming = inferSchema(body);
    const hash = computeSchemaHash(incoming);

    const existing = this.schemas.get(k);
    if (!existing) {
      this.schemas.set(k, {
        method: method.toUpperCase(),
        pattern,
        requestBody: incoming,
        responseBody: null,
        requestSampleCount: 1,
        responseSampleCount: 0,
        requestHash: hash,
        responseHash: null,
      });
      return;
    }

    // Hash fast path: identical structure, just bump count
    if (existing.requestHash === hash) {
      existing.requestSampleCount++;
      return;
    }

    // Merge schemas
    existing.requestBody = existing.requestBody
      ? mergeSchemas(existing.requestBody, incoming)
      : incoming;
    existing.requestSampleCount++;
    existing.requestHash = computeSchemaHash(existing.requestBody);
  }

  /** Record a response body observation (only call for 2xx). */
  recordResponseBody(method: string, pattern: string, body: unknown): void {
    if (body === undefined || body === null) return;
    if (typeof body !== 'object' && typeof body !== 'string' && typeof body !== 'number' && typeof body !== 'boolean') return;

    const k = this.key(method, pattern);
    const incoming = inferSchema(body);
    const hash = computeSchemaHash(incoming);

    const existing = this.schemas.get(k);
    if (!existing) {
      this.schemas.set(k, {
        method: method.toUpperCase(),
        pattern,
        requestBody: null,
        responseBody: incoming,
        requestSampleCount: 0,
        responseSampleCount: 1,
        requestHash: null,
        responseHash: hash,
      });
      return;
    }

    // Hash fast path
    if (existing.responseHash === hash) {
      existing.responseSampleCount++;
      return;
    }

    existing.responseBody = existing.responseBody
      ? mergeSchemas(existing.responseBody, incoming)
      : incoming;
    existing.responseSampleCount++;
    existing.responseHash = computeSchemaHash(existing.responseBody);
  }

  /** Get all captured schemas. */
  getSchemas(): EndpointSchema[] {
    return [...this.schemas.values()];
  }

  /** Get schema for a specific endpoint. */
  getEndpointSchema(method: string, pattern: string): EndpointSchema | null {
    return this.schemas.get(this.key(method, pattern)) ?? null;
  }

  /** Clear all schemas. */
  reset(): void {
    this.schemas.clear();
  }
}
