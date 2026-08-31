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

test('the corner buttons are opaque, and only hiding looks destructive', async ({ page }) => {
  // The portal defaults to dark, where these two used to be frosted glass over the corner of a
  // card — the card edge showed through and they read as unfinished next to every solid control
  // around them. A translucent element that still passes every other check has shipped here
  // before, so the alpha is asserted rather than eyeballed.
  const opacityOf = (l: import('@playwright/test').Locator) =>
    l.evaluate((el) => {
      // `rgb(34, 34, 34)` is opaque; only the four-component form carries an alpha. Reading
      // the last number either way would call a solid #222 "34".
      const parts = getComputedStyle(el)
        .backgroundColor.match(/^rgba?\(([^)]+)\)$/)?.[1]
        .split(',')
        .map((v) => Number(v.trim()));
      return parts && parts.length === 4 ? parts[3] : 1;
    });

  const hideBtn = cardFor(page, live.id).getByTitle('Hide poem');
  const restoreBtn = cardFor(page, hiddenAtStart.id).getByTitle('Restore poem');

  expect(await opacityOf(hideBtn)).toBe(1);
  expect(await opacityOf(restoreBtn)).toBe(1);

  // Restoring is not a destructive act and must not borrow the red the hide button hovers to.
  await restoreBtn.hover();
  const hovered = await restoreBtn.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(hovered).not.toMatch(/192,\s*57,\s*43/);
});

test('the restore icon is drawn symmetric about its own centre', async ({ page }) => {
  // It was a character (↩) whose position depended on which font the stack resolved to —
  // measurably high in Chromium, reported low elsewhere. Drawing it removed the font from the
  // question, but a drawn shape can be lopsided in its own box just as easily, which is what
  // this measures: the path geometry's centre against the viewBox centre, in user units, where
  // there is no pixel grid to round it away.
  const btn = cardFor(page, hiddenAtStart.id).getByTitle('Restore poem');
  await expect(btn.locator('svg')).toHaveCount(1, 'the icon must be drawn, not typed');

  const box = await btn.evaluate((el) => {
    const svg = el.querySelector('svg');
    if (!svg) return null;
    const vb = svg.getAttribute('viewBox')?.split(/\s+/).map(Number);
    // Union of the paths' geometry, which is what "centred" has to be true of.
    let x1 = Infinity;
    let y1 = Infinity;
    let x2 = -Infinity;
    let y2 = -Infinity;
    for (const path of svg.querySelectorAll('path')) {
      const b = (path as SVGGraphicsElement).getBBox();
      x1 = Math.min(x1, b.x);
      y1 = Math.min(y1, b.y);
      x2 = Math.max(x2, b.x + b.width);
      y2 = Math.max(y2, b.y + b.height);
    }
    return { vb, cx: (x1 + x2) / 2, cy: (y1 + y2) / 2 };
  });
  if (!box || !box.vb) throw new Error('no icon geometry');

  const [, , vw, vh] = box.vb;
  expect(Math.abs(box.cy - vh / 2)).toBeLessThanOrEqual(0.01);
  expect(Math.abs(box.cx - vw / 2)).toBeLessThanOrEqual(0.01);
});
