import type { SchemaField } from '../types.js';

/**
 * Recursively infer a JSON schema from a runtime value.
 */
export function inferSchema(value: unknown): SchemaField {
  if (value === null || value === undefined) {
    return { type: 'null' };
  }

  if (Array.isArray(value)) {
    const items = value.length > 0 ? inferSchema(value[0]) : undefined;
    return { type: 'array', ...(items ? { items } : {}) };
  }

  const t = typeof value;

  if (t === 'object') {
    const obj = value as Record<string, unknown>;
    const properties: Record<string, SchemaField> = {};
    for (const key of Object.keys(obj)) {
      const field = inferSchema(obj[key]);
      field.required = true;
      properties[key] = field;
    }
    return { type: 'object', properties };
  }

  if (t === 'string') return { type: 'string' };
  if (t === 'number') return { type: 'number' };
  if (t === 'boolean') return { type: 'boolean' };

  return { type: 'string' };
}

/**
 * Merge two schemas together. Fields in both retain `required: true`;
 * fields in only one side become `required: false`.
 * Type conflicts widen to "type1 | type2".
 */
export function mergeSchemas(existing: SchemaField, incoming: SchemaField): SchemaField {
  // If either is null type, adopt the other (but mark optional)
  if (existing.type === 'null' && incoming.type !== 'null') {
    const merged = { ...incoming };
    merged.type = incoming.type + ' | null';
    merged.required = false;
    return merged;
  }
  if (incoming.type === 'null' && existing.type !== 'null') {
    const merged = { ...existing };
    if (!existing.type.includes('null')) {
      merged.type = existing.type + ' | null';
    }
    merged.required = false;
    return merged;
  }

  // Both are the same base type
  const existingBase = existing.type.split(' | ').sort().join(' | ');
  const incomingBase = incoming.type.split(' | ').sort().join(' | ');

  if (existingBase === incomingBase) {
    // Same type — merge deeper
    if (existing.type.includes('object') && existing.properties && incoming.properties) {
      return mergeObjectSchemas(existing, incoming);
    }
    if (existing.type.includes('array')) {
      return mergeArraySchemas(existing, incoming);
    }
    return {
      type: existing.type,
      required: existing.required !== false && incoming.required !== false,
    };
  }

  // Different types — widen
  const allTypes = new Set([
    ...existing.type.split(' | '),
    ...incoming.type.split(' | '),
  ]);
  return {
    type: [...allTypes].sort().join(' | '),
    required: existing.required !== false && incoming.required !== false,
  };
}

function mergeObjectSchemas(existing: SchemaField, incoming: SchemaField): SchemaField {
  const existingProps = existing.properties || {};
  const incomingProps = incoming.properties || {};
  const allKeys = new Set([...Object.keys(existingProps), ...Object.keys(incomingProps)]);
  const properties: Record<string, SchemaField> = {};

  for (const key of allKeys) {
    const inExisting = key in existingProps;
    const inIncoming = key in incomingProps;

    if (inExisting && inIncoming) {
      properties[key] = mergeSchemas(existingProps[key], incomingProps[key]);
    } else if (inExisting) {
      properties[key] = { ...existingProps[key], required: false };
    } else {
      properties[key] = { ...incomingProps[key], required: false };
    }
  }

  return {
    type: existing.type,
    properties,
    required: existing.required !== false && incoming.required !== false,
  };
}

function mergeArraySchemas(existing: SchemaField, incoming: SchemaField): SchemaField {
  let items: SchemaField | undefined;
  if (existing.items && incoming.items) {
    items = mergeSchemas(existing.items, incoming.items);
  } else {
    items = existing.items || incoming.items;
  }

  return {
    type: existing.type,
    ...(items ? { items } : {}),
    required: existing.required !== false && incoming.required !== false,
  };
}

/**
 * Compute a structural hash of a schema for fast equality checks.
 * Uses a simple deterministic string representation.
 */
export function computeSchemaHash(schema: SchemaField): string {
  return hashField(schema);
}

function hashField(field: SchemaField): string {
  if (field.properties) {
    const keys = Object.keys(field.properties).sort();
    const propHashes = keys.map(k => `${k}:${hashField(field.properties![k])}`).join(',');
    return `{${propHashes}}`;
  }
  if (field.items) {
    return `[${hashField(field.items)}]`;
  }
  return field.type;
}
