/**
 * Extract the route pattern from a Koa context.
 * Uses ctx._matchedRoute set by @koa/router or koa-router.
 */
export function extractKoaRoute(ctx: any): string {
  // koa-router / @koa/router sets _matchedRoute
  if (ctx._matchedRoute) {
    return ctx._matchedRoute;
  }
  // Fallback: use the raw path
  return ctx.path || ctx.url || '/';
}
