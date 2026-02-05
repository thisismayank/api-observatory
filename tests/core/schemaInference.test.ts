import { describe, it, expect } from 'vitest';
import { inferSchema, mergeSchemas, computeSchemaHash } from '../../src/core/schemaInference.js';

describe('inferSchema', () => {
  it('infers string type', () => {
    expect(inferSchema('hello')).toEqual({ type: 'string' });
  });

  it('infers number type', () => {
    expect(inferSchema(42)).toEqual({ type: 'number' });
  });

  it('infers boolean type', () => {
    expect(inferSchema(true)).toEqual({ type: 'boolean' });
  });

  it('infers null type', () => {
    expect(inferSchema(null)).toEqual({ type: 'null' });
  });

  it('infers undefined as null', () => {
    expect(inferSchema(undefined)).toEqual({ type: 'null' });
  });

  it('infers flat object', () => {
    const result = inferSchema({ name: 'john', age: 30 });
    expect(result).toEqual({
      type: 'object',
      properties: {
        name: { type: 'string', required: true },
        age: { type: 'number', required: true },
      },
    });
  });

  it('infers nested object', () => {
    const result = inferSchema({ user: { name: 'john', active: true } });
    expect(result).toEqual({
      type: 'object',
      properties: {
        user: {
          type: 'object',
          required: true,
          properties: {
            name: { type: 'string', required: true },
            active: { type: 'boolean', required: true },
          },
        },
      },
    });
  });

  it('infers array with items', () => {
    const result = inferSchema([1, 2, 3]);
    expect(result).toEqual({
      type: 'array',
      items: { type: 'number' },
    });
  });

  it('infers empty array without items', () => {
    const result = inferSchema([]);
    expect(result).toEqual({ type: 'array' });
  });

  it('infers array of objects', () => {
    const result = inferSchema([{ id: 1, name: 'test' }]);
    expect(result).toEqual({
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number', required: true },
          name: { type: 'string', required: true },
        },
      },
    });
  });

  it('infers object with null field', () => {
    const result = inferSchema({ name: 'john', nickname: null });
    expect(result).toEqual({
      type: 'object',
      properties: {
        name: { type: 'string', required: true },
        nickname: { type: 'null', required: true },
      },
    });
  });
});

describe('mergeSchemas', () => {
  it('merges identical flat objects', () => {
    const a = inferSchema({ name: 'john', age: 30 });
    const b = inferSchema({ name: 'jane', age: 25 });
    const merged = mergeSchemas(a, b);
    expect(merged.type).toBe('object');
    expect(merged.properties!.name).toEqual({ type: 'string', required: true });
    expect(merged.properties!.age).toEqual({ type: 'number', required: true });
  });

  it('marks fields present in only one side as optional', () => {
    const a = inferSchema({ name: 'john', age: 30 });
    const b = inferSchema({ name: 'jane', email: 'jane@test.com' });
    const merged = mergeSchemas(a, b);
    expect(merged.properties!.name.required).toBe(true);
    expect(merged.properties!.age.required).toBe(false);
    expect(merged.properties!.email.required).toBe(false);
  });

  it('widens type conflicts', () => {
    const a = inferSchema({ value: 'hello' });
    const b = inferSchema({ value: 42 });
    const merged = mergeSchemas(a, b);
    expect(merged.properties!.value.type).toBe('number | string');
  });

  it('merges null with a real type', () => {
    const a = inferSchema('hello');
    const b = inferSchema(null);
    const merged = mergeSchemas(a, b);
    expect(merged.type).toContain('string');
    expect(merged.type).toContain('null');
  });

  it('merges null with existing schema preserving structure', () => {
    const a = inferSchema(null);
    const b = inferSchema({ name: 'john' });
    const merged = mergeSchemas(a, b);
    expect(merged.type).toContain('object');
    expect(merged.type).toContain('null');
    expect(merged.properties!.name.type).toBe('string');
  });

  it('merges nested objects recursively', () => {
    const a = inferSchema({ user: { name: 'john', age: 30 } });
    const b = inferSchema({ user: { name: 'jane', email: 'j@t.com' } });
    const merged = mergeSchemas(a, b);
    const user = merged.properties!.user;
    expect(user.properties!.name.required).toBe(true);
    expect(user.properties!.age.required).toBe(false);
    expect(user.properties!.email.required).toBe(false);
  });

  it('merges arrays with compatible items', () => {
    const a = inferSchema([{ id: 1 }]);
    const b = inferSchema([{ id: 2, name: 'x' }]);
    const merged = mergeSchemas(a, b);
    expect(merged.type).toBe('array');
    expect(merged.items!.properties!.id.required).toBe(true);
    expect(merged.items!.properties!.name.required).toBe(false);
  });

  it('merges primitive types symmetrically', () => {
    const a = { type: 'string', required: true } as const;
    const b = { type: 'string', required: true } as const;
    const merged = mergeSchemas(a, b);
    expect(merged.type).toBe('string');
    expect(merged.required).toBe(true);
  });
});

describe('computeSchemaHash', () => {
  it('returns same hash for identical schemas', () => {
    const a = inferSchema({ name: 'john', age: 30 });
    const b = inferSchema({ name: 'jane', age: 25 });
    expect(computeSchemaHash(a)).toBe(computeSchemaHash(b));
  });

  it('returns different hash when structure differs', () => {
    const a = inferSchema({ name: 'john' });
    const b = inferSchema({ name: 'john', age: 30 });
    expect(computeSchemaHash(a)).not.toBe(computeSchemaHash(b));
  });

  it('returns different hash for different types', () => {
    const a = inferSchema({ value: 'hello' });
    const b = inferSchema({ value: 42 });
    expect(computeSchemaHash(a)).not.toBe(computeSchemaHash(b));
  });

  it('handles arrays consistently', () => {
    const a = inferSchema([1, 2, 3]);
    const b = inferSchema([4, 5, 6]);
    expect(computeSchemaHash(a)).toBe(computeSchemaHash(b));
  });

  it('handles nested objects consistently', () => {
    const a = inferSchema({ user: { name: 'a' } });
    const b = inferSchema({ user: { name: 'b' } });
    expect(computeSchemaHash(a)).toBe(computeSchemaHash(b));
  });

  it('is stable regardless of property insertion order', () => {
    const a = inferSchema({ z: 1, a: 2 });
    const b = inferSchema({ a: 3, z: 4 });
    expect(computeSchemaHash(a)).toBe(computeSchemaHash(b));
  });
});
