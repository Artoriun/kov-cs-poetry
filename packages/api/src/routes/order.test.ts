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
 * PUT /api/poems/order — the endpoint every drag in the admin portal writes through.
 *
 * It had no test at all. The Table of Contents sidebar, the grid reordering and the list
 * reordering all end in a call to this, and the only thing standing between a reorder and the
 * client's live site was that nobody had broken it yet.
 *
 * The ordering assertions matter more than they look: the route stores only a list of ids, and
 * GET /api/poems has to apply it while still returning poems the list has never heard of —
 * anything newly added would otherwise vanish from the site the moment someone reordered.
 */

const SECRET = 'test-secret-for-order';

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

const putOrder = (body: unknown, auth = true) =>
  fetch(`${base}/api/poems/order`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { Authorization: `Bearer ${token()}` } : {}),
    },
    body: JSON.stringify(body),
  });

const getPoems = async () => {
  const res = await fetch(`${base}/api/poems`);
  assert.equal(res.status, 200);
  return (await res.json()) as { id: string }[];
};

describe('PUT /api/poems/order', () => {
  test('refuses an unauthenticated caller', async () => {
    assert.equal((await putOrder({ ids: ['poem-1'] }, false)).status, 401);
    assert.deepEqual(fake.dump(), {}, 'and writes nothing');
  });

  test('rejects a body that is not an array rather than storing it', async () => {
    for (const bad of [{ ids: 'poem-1' }, { ids: { 0: 'poem-1' } }, {}]) {
      assert.equal((await putOrder(bad)).status, 400, `should refuse ${JSON.stringify(bad)}`);
    }
    assert.deepEqual(fake.dump(), {}, 'nothing should have been written');
  });

  test('stores the id list where the poems route reads it', async () => {
    const ids = POEMS.slice(0, 3).map((p) => p.id);
    assert.equal((await putOrder({ ids })).status, 200);
    assert.deepEqual(fake.dump()['config/poemOrder'], { ids });
  });

  test('GET /api/poems comes back in the stored order', async () => {
    // Reversed, so a route that ignored the list entirely would still have to be wrong.
    const ids = POEMS.map((p) => p.id).reverse();
    await putOrder({ ids });
    assert.deepEqual(
      (await getPoems()).map((p) => p.id),
      ids,
    );
  });

  test('a poem missing from the list is kept, not dropped', async () => {
    // The failure this guards is silent and destructive: add a poem, reorder without it, and
    // an unforgiving implementation would remove it from the public site.
    const all = POEMS.map((p) => p.id);
    const partial = all.slice(0, 2);
    await putOrder({ ids: partial });

    const got = (await getPoems()).map((p) => p.id);
    assert.deepEqual(got.slice(0, 2), partial, 'the listed ones lead, in order');
    assert.deepEqual([...got].sort(), [...all].sort(), 'and every poem is still present');
  });

  test('a Firestore failure answers 500 instead of escaping the handler', async () => {
    // Express 4 does not catch a rejected async handler, and Node's default for an unhandled
    // rejection is to end the process — so a Firestore blip mid-reorder could take the API
    // down rather than failing one request. Every other route here is wrapped; this one was
    // not.
    fake.breakWith('firestore unavailable');
    const res = await putOrder({ ids: ['poem-5'] });
    assert.equal(res.status, 500);
  });

  test('an id in the list that no longer exists is ignored', async () => {
    const ids = ['poem-that-was-deleted', ...POEMS.map((p) => p.id)];
    await putOrder({ ids });
    const got = (await getPoems()).map((p) => p.id);
    assert.ok(!got.includes('poem-that-was-deleted'), 'a stale id must not become a blank card');
    assert.equal(got.length, POEMS.length);
  });
});
