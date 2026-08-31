import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Wraps an async route handler so a rejected promise reaches Express instead of the process.
 *
 * Express 4 predates async handlers: it only catches what a handler throws synchronously. A
 * rejection inside `async (req, res) => { await db... }` propagates as an unhandled rejection,
 * so the request is never answered — the caller waits until it gives up — and Node's default
 * is then to end the process. On a free tier that is a cold start for the next visitor because
 * one Firestore call had a bad second.
 *
 * Both halves of that were live here. `POST /api/auth/revoke-all` awaited Firestore with no
 * guard on the route or inside `revokeAllTokens`, and three poem routes were the same until
 * each was found and wrapped by hand. Per-route try/catch works and does not scale: it has to
 * be remembered every time. This has to be forgotten deliberately.
 *
 * Express 5 does this natively; delete this file if you upgrade. Ported from qalor-website,
 * which has had it since its own outage.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
