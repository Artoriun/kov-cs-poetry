import { POEMS } from '@gedichtenv2/shared';
import { expect, settled, signInAsAdmin, test } from './fixtures';

/**
 * Hiding a poem, and getting it back.
 *
 * The portal used to drop the card the moment you deleted a poem, and the list it loaded from
 * filtered hidden poems out — so a poem left the site and the portal together, and for one
 * written in the portal the text survived only in a database row nobody could reach. The
 * regression to guard is precise: after hiding, the card must still be there.
 */

const hiddenAtStart = POEMS[2];
const live = POEMS[3];

/** Which poems the stand-in API currently considers hidden, and every PUT it was sent. */
let hidden = new Set<string>();
let puts: { id: string; body: { deleted?: boolean } }[] = [];

const json = (body: unknown) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

test.beforeEach(async ({ page }) => {
  hidden = new Set([hiddenAtStart.id]);
  puts = [];
  await signInAsAdmin(page);

  // The public list has to filter `deleted` exactly as the real route does. Without that the
  // refresh which follows every change hands the portal back the poem it has just hidden, and
  // the test would pass against an implementation that does not work.
  await page.route('**/api/poems', (route) =>
    route.fulfill(json(POEMS.filter((p) => !hidden.has(p.id)))),
  );
  await page.route('**/api/poems/all', (route) =>
    route.fulfill(json(POEMS.map((p) => ({ ...p, deleted: hidden.has(p.id) })))),
  );
  await page.route('**/api/poems/*', async (route) => {
    if (route.request().method() !== 'PUT') return route.fallback();
    const id = new URL(route.request().url()).pathname.split('/').pop() as string;
    const body = (route.request().postDataJSON() ?? {}) as { deleted?: boolean };
    puts.push({ id, body });
    if (body.deleted === true) hidden.add(id);
    if (body.deleted === false) hidden.delete(id);
    await route.fulfill(json({ ok: true }));
  });

  await page.goto('/admin');
  await settled(page);
});

const cardFor = (page: import('@playwright/test').Page, id: string) =>
  page.locator(`#admin-poem-${id} .admin-poem-card`);

test('a hidden poem is still in the portal, marked, with a way back', async ({ page }) => {
  const card = cardFor(page, hiddenAtStart.id);
  await expect(card).toHaveClass(/admin-poem-card--hidden/);
  await expect(card.getByText('Hidden', { exact: true })).toBeVisible();
  await expect(card.getByTitle('Restore poem')).toBeVisible();
  // Every poem still has a card: hidden ones are marked, not removed.
  await expect(page.locator('.admin-card-wrapper')).toHaveCount(POEMS.length);
});

test('hiding a poem marks its card instead of taking it away', async ({ page }) => {
  const card = cardFor(page, live.id);
  await card.getByTitle('Hide poem').click();
  await page.getByRole('button', { name: 'Hide', exact: true }).click();

  await expect(card).toHaveClass(/admin-poem-card--hidden/);
  await expect(page.locator('.admin-card-wrapper')).toHaveCount(POEMS.length);
  expect(puts.at(-1)).toEqual({ id: live.id, body: { deleted: true } });
});

test('restoring puts the poem back, in its own place in the order', async ({ page }) => {
  const before = await page
    .locator('.admin-card-wrapper')
    .evaluateAll((els) => els.map((el) => el.querySelector('[id^="admin-poem-"]')?.id ?? ''));

  const card = cardFor(page, hiddenAtStart.id);
  await card.getByTitle('Restore poem').click();

  await expect(card).not.toHaveClass(/admin-poem-card--hidden/);
  await expect(card.getByTitle('Hide poem')).toBeVisible();
  expect(puts.at(-1)).toEqual({ id: hiddenAtStart.id, body: { deleted: false } });

  // Position is the reason hidden poems keep their slot rather than being pulled out of the
  // list: a restored poem has to come back where it was, not on the end.
  const after = await page
    .locator('.admin-card-wrapper')
    .evaluateAll((els) => els.map((el) => el.querySelector('[id^="admin-poem-"]')?.id ?? ''));
  expect(after).toEqual(before);
});
