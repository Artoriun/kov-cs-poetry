import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { after, before, describe, test } from 'node:test';
import { POEMS } from '@gedichtenv2/shared';
import express from 'express';

/**
 * The API is documented as still answering without Firestore, falling back to the poems
 * bundled in packages/shared. That fallback is written (the catch in GET /) but was
 * unreachable: firebaseAdmin calls initializeApp at import, which throws when the
 * service-account variables are missing, so the process died at startup instead of
 * degrading. authState deferred its own import for exactly this reason; the two eager
 * imports elsewhere cancelled it for the process as a whole.
 *
 * node --test runs each file in its own process, so clearing these here cannot leak.
 */
for (const key of [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_STORAGE_BUCKET',
]) {
  delete process.env[key];
}

let server: Server;
let base = '';

before(async () => {
  const { poemsRouter } = await import('./poems');
  const app = express();
  app.use('/api/poems', poemsRouter);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
      resolve();
    });
  });
});
after(() => server?.close());

describe('GET /api/poems without Firestore credentials', () => {
  test('serves the bundled poems rather than failing', async () => {
    const res = await fetch(`${base}/api/poems`);
    assert.equal(res.status, 200);
    const poems = (await res.json()) as { id: string }[];
    assert.equal(poems.length, POEMS.length);
    assert.deepEqual(
      poems.map((p) => p.id),
      POEMS.map((p) => p.id),
    );
  });
});
