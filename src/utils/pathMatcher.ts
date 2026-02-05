/**
 * Simple glob-style path matching for includePaths/excludePaths.
 * Supports:
 *   - '*' matches any single path segment
 *   - '**' is not explicitly supported but '*' at the end matches remainder
 *   - Exact matches
 *   - Trailing '/*' matches anything under that prefix
 */

/** Convert a simple glob pattern to a RegExp */
function globToRegex(pattern: string): RegExp {
  // Escape regex special chars except *
  let escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  // Replace ** with a full wildcard
  escaped = escaped.replace(/\*\*/g, '___DOUBLE_STAR___');
  // Replace remaining * with single-segment wildcard
  escaped = escaped.replace(/\*/g, '[^/]*');
  // Replace double-star placeholder with "match everything"
  escaped = escaped.replace(/___DOUBLE_STAR___/g, '.*');
  return new RegExp(`^${escaped}$`);
}

/** Check if a path matches any pattern in the list */
export function matchesAny(path: string, patterns: string[]): boolean {
  if (patterns.length === 0) return false;
  for (const pattern of patterns) {
    if (pattern === path) return true;
    if (globToRegex(pattern).test(path)) return true;
  }
  return false;
}

/** Determine whether a request path should be tracked given include/exclude lists */
export function shouldTrack(
  path: string,
  includePaths: string[],
  excludePaths: string[],
): boolean {
  // If excluded, skip
  if (matchesAny(path, excludePaths)) return false;
  // If include list is specified, only track if it matches
  if (includePaths.length > 0) return matchesAny(path, includePaths);
  // Default: track everything
  return true;
}
