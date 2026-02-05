/**
 * Extract content size from headers.
 * Reads the Content-Length header value; returns 0 if absent or invalid.
 */

/** Parse Content-Length from a headers object or getter function */
export function getContentLength(
  headers: Record<string, string | string[] | number | undefined> | { get?: (name: string) => string | undefined },
): number {
  let raw: string | string[] | number | undefined;

  if (typeof (headers as any).get === 'function') {
    raw = (headers as any).get('content-length');
  } else {
    raw = (headers as Record<string, any>)['content-length'];
  }

  if (raw === undefined || raw === null) return 0;
  const num = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  return isNaN(num) || num < 0 ? 0 : num;
}
