/**
 * Extract the route pattern from an Express request.
 * Uses req.route.path combined with req.baseUrl for nested routers.
 * Falls back to req.path with ID normalization if route info is unavailable
 * (e.g. CORS preflight OPTIONS requests that bypass Express routing).
 */
export function extractExpressRoute(req: any): string {
  // req.route is populated by Express after route matching
  if (req.route && req.route.path) {
    const base = req.baseUrl || '';
    return base + req.route.path;
  }
  // Fallback: normalize raw path by replacing common ID-like segments
  const raw = req.path || req.url || '/';
  return normalizePath(raw);
}

// Patterns that look like dynamic IDs in URL segments:
// - MongoDB ObjectIds (24 hex chars)
// - UUIDs (8-4-4-4-12 hex with dashes)
// - Numeric IDs (pure digits)
// - Generic hex strings (12+ hex chars)
const ID_PATTERNS = [
  /^[0-9a-fA-F]{24}$/,           // MongoDB ObjectId
  /^[0-9a-fA-F-]{36}$/,          // UUID
  /^\d+$/,                        // Numeric ID
  /^[0-9a-fA-F]{12,}$/,          // Long hex string
];

/** Replace ID-like path segments with :id placeholder */
export function normalizePath(path: string): string {
  return path
    .split('/')
    .map((segment) => {
      if (!segment) return segment;
      for (const pattern of ID_PATTERNS) {
        if (pattern.test(segment)) return ':id';
      }
      return segment;
    })
    .join('/');
}
