import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { after, afterEach, before, beforeEach, describe, test } from 'node:test';
import { POEMS } from '@gedichtenv2/shared';
import express from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import jwt from 'jsonwebtoken';
import { setStore } from '../firebaseAdmin';
import { createFakeStore } from '../testing/fakeStore';
import { poemsRouter } from './poems';

/**
 * Hiding a poem, and getting it back.
 *
 * Deleting from the admin portal sets `deleted: true`, and GET /api/poems filters those out —
 * so the poem left the public site *and* the portal at the same time, with nothing anywhere
 * that could undo it. For a poem written in the portal the text then existed only in a
 * Firestore document nobody could reach without the Firebase console.
 *
 * GET /api/poems/all is the way back: the same list, unfiltered, for an authenticated admin.
 * The public route must keep filtering exactly as it did.
 */

const SECRET = 'test-secret-for-hidden';

let server: Server;
let base = '';
let fake: ReturnType<typeof createFakeStore>;

before(async () => {
  process.env.JWT_SECRET = SECRET;
  const app = express();
  app.use(express.json());
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

beforeEach(() => {
  fake = createFakeStore();
  setStore(fake as unknown as Firestore);
});
afterEach(() => setStore(null));

const token = () => jwt.sign({ admin: true, epoch: 0 }, SECRET, { algorithm: 'HS256' });
const auth = () => ({ Authorization: `Bearer ${token()}` });

type Row = { id: string; title?: string; deleted?: boolean };

const publicPoems = async (): Promise<Row[]> => {
  const res = await fetch(`${base}/api/poems`);
  assert.equal(res.status, 200);
  return res.json() as Promise<Row[]>;
};

const adminPoems = async (): Promise<Row[]> => {
  const res = await fetch(`${base}/api/poems/all`, { headers: auth() });
  assert.equal(res.status, 200);
  return res.json() as Promise<Row[]>;
};

const setFlags = (id: string, body: Record<string, unknown>, signal?: AbortSignal) =>
  fetch(`${base}/api/poems/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...auth() },
    body: JSON.stringify(body),
    signal,
  });

describe('GET /api/poems/all', () => {
  test('refuses an unauthenticated caller', async () => {
    // The unfiltered list is the admin's view. Hidden poems are hidden from visitors too.
    const res = await fetch(`${base}/api/poems/all`);
    assert.equal(res.status, 401);
  });

  test('keeps a hidden bundled poem that the public route drops', async () => {
    const id = POEMS[0].id;
    assert.equal((await setFlags(id, { deleted: true })).status, 200);

    assert.ok(
      !(await publicPoems()).some((p) => p.id === id),
      'a hidden poem must not reach the site',
    );

    const hidden = (await adminPoems()).find((p) => p.id === id);
    assert.ok(hidden, 'but the portal has to be able to see it, or it cannot offer a way back');
    assert.equal(hidden.deleted, true, 'and has to know it is hidden, to mark the card');
  });

  test('a hidden portal-written poem keeps its title, which is the only copy of it', async () => {
    // A bundled poem's text survives in packages/shared. One written in the portal does not:
    // if the flag or the title fails to reach the admin, hiding it has destroyed it.
    const created = await fetch(`${base}/api/poems`, { method: 'POST', headers: auth() });
    assert.equal(created.status, 200);
    const { id } = (await created.json()) as { id: string };
    await setFlags(id, { title: 'Only Here', deleted: true });

    assert.ok(!(await publicPoems()).some((p) => p.id === id));
    const hidden = (await adminPoems()).find((p) => p.id === id);
    assert.ok(hidden, 'a portal-written poem must not vanish from the portal');
    assert.equal(hidden.title, 'Only Here');
    assert.equal(hidden.deleted, true);
  });

  test('clearing the flag puts the poem back on the site', async () => {
    const id = POEMS[1].id;
    await setFlags(id, { deleted: true });
    await setFlags(id, { deleted: false });
    assert.ok(
      (await publicPoems()).some((p) => p.id === id),
      'restore has to actually restore',
    );
  });

  test('restores into its original position, not onto the end', async () => {
    // Position is the reason to keep hidden poems in the order rather than pull them out of it.
    const ids = POEMS.map((p) => p.id);
    await fetch(`${base}/api/poems/order`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...auth() },
      body: JSON.stringify({ ids }),
    });
    const id = ids[2];
    await setFlags(id, { deleted: true });
    await setFlags(id, { deleted: false });
    assert.deepEqual(
      (await publicPoems()).map((p) => p.id),
      ids,
    );
  });
});

describe('the write routes survive a Firestore failure', () => {
  // Express 4 does not catch a rejected async handler and Node ends the process on an unhandled
  // rejection, so an unwrapped route turns a Firestore blip into an outage. PUT /:id runs on
  // every single save in the portal, which makes it the likeliest one to be hit.
  //
  // Note the timeout: an unwrapped handler does not answer *at all*, so without one of these
  // the test hangs rather than fails, and a hanging test is a test nobody runs.
  const signal = () => AbortSignal.timeout(2000);

  const cases: [string, () => Promise<Response>][] = [
    [
      'POST /',
      () => fetch(`${base}/api/poems`, { method: 'POST', headers: auth(), signal: signal() }),
    ],
    ['PUT /:id', () => setFlags('poem-1', { title: 'x' }, signal())],
    [
      'DELETE /:id',
      () =>
        fetch(`${base}/api/poems/poem-1`, {
          method: 'DELETE',
          headers: auth(),
          signal: signal(),
        }),
    ],
  ];

  for (const [name, call] of cases) {
    test(`${name} answers 500 instead of escaping the handler`, async () => {
      fake.breakWith('firestore unavailable');
      const res = await call().catch((err) => {
        assert.fail(`${name} never answered: ${err instanceof Error ? err.message : err}`);
      });
      assert.equal(res.status, 500);
    });
  }
});
