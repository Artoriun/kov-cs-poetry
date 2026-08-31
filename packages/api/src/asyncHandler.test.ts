import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { after, before, describe, test } from 'node:test';
import express from 'express';
import { asyncHandler } from './asyncHandler';

/**
 * The net under every async route.
 *
 * Express 4 predates async handlers: it catches only what a handler throws synchronously. A
 * rejection inside `async (req, res) => { await db... }` never reaches Express, so the request
 * is never answered — the caller waits until it gives up — and Node's default for an unhandled
 * rejection is to end the process.
 *
 * Both halves were live here. `POST /api/auth/revoke-all` awaited Firestore with no guard on
 * the route or inside `revokeAllTokens`; three poem routes were the same until each was found
 * and wrapped by hand. The unwrapped behaviour was confirmed directly while writing this — the
 * request hangs to the abort deadline and the rejection surfaces as `unhandledRejection` — but
 * that case is not kept as a test: leaving a rejection in flight makes `node:test` fail the
 * whole file for "asynchronous activity after the test ended", whatever it is asserting.
 *
 * So this pins the half that guards the code, and the paragraph above records the half it
 * cannot hold still.
 */

let server: Server;
let base = '';

before(async () => {
  const app = express();
  // Deliberately unguarded inside: the wrapper is the only thing between this and the process.
  app.get(
    '/wrapped',
    asyncHandler(async () => {
      throw new Error('firestore unavailable');
    }),
  );
  app.use((err: Error, _req: express.Request, res: express.Response, _n: express.NextFunction) => {
    res.status(500).json({ error: 'Internal error', detail: err.message });
  });
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
      resolve();
    });
  });
});
after(() => server?.close());

describe('asyncHandler', () => {
  test('a rejecting handler answers 500 instead of hanging', async () => {
    // The deadline is the assertion as much as the status is: an unwrapped handler fails this
    // by never replying, not by replying wrongly.
    const res = await fetch(`${base}/wrapped`, { signal: AbortSignal.timeout(2000) });
    assert.equal(res.status, 500);
    assert.equal(((await res.json()) as { detail: string }).detail, 'firestore unavailable');
  });
});
