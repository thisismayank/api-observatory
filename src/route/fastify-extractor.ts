/**
 * Extract the route pattern from a Fastify request.
 * Fastify provides the route URL natively on the request object.
 */
export function extractFastifyRoute(request: any): string {
  // Fastify v4+: request.routeOptions.url
  if (request.routeOptions && request.routeOptions.url) {
    return request.routeOptions.url;
  }
  // Fastify v3 fallback: request.routerPath
  if (request.routerPath) {
    return request.routerPath;
  }
  // Last resort
  return request.url || '/';
}
