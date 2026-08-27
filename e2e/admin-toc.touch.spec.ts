import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * Reordering the admin contents sidebar with a finger.
 *
 * This had no test anywhere, which is why it kept coming back. The touch project is 412×915
 * portrait and the sidebar is display:none below 600px, so nothing in the suite could even see
 * it; the admin dashboard was never rendered by any spec either. It was verified by hand on a
 * Pixel 8a, failed there twice, and each fix was a guess about a device the suite could not
 * reach.
 *
 * The viewport below is that phone in landscape — the configuration it was reported failing in.
 */

// Pixel 8a, landscape. Wide enough that the sidebar is not hidden.
test.use({ viewport: { width: 915, height: 412 } });

/**
 * A token the portal will accept without a server.
 *
 * The gate is `if (!token) return <LoginPage>`, and readToken only reads the `exp` claim —
 * verification is the server's job on every request, which is the right split but also means
 * a well-formed unsigned token is enough to render the dashboard. apiRefreshToken returns
 * early unless the token is near expiry and swallows failures, so nothing signs us back out.
 */
function fakeToken(): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ admin: true, epoch: 0, exp })}.not-verified-here`;
}

/**
 * A real drag, by the grip.
 *
 * Same reasoning as e2e/touch.spec.ts: TouchEvents built through dispatchEvent do not carry
 * usable Touch objects, so CDP's Input domain is the only way to produce the genuine article
 * the hook listens for.
 */
async function dragGrip(page: Page, from: { x: number; y: number }, toY: number) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: from.x, y: from.y }],
  });
  // The lift is scheduled rather than immediate, so give it a turn of the loop before moving.
  await page.waitForTimeout(60);
  for (let i = 1; i <= 10; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: from.x, y: from.y + ((toY - from.y) * i) / 10 }],
    });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

const titles = (page: Page) => page.locator('.admin-toc .poems-toc li button').allTextContents();

test.beforeEach(async ({ page }) => {
  const token = fakeToken();
  await page.addInitScript((t) => localStorage.setItem('admin_token', t), token);
  // The reorder is optimistic and reverts if the write fails, so without this the list would
  // snap back and the assertion would be testing the revert.
  await page.route('**/api/poems/order', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }),
  );
  await page.goto('/admin');
  // The sidebar lives on the Order tab; the dashboard opens on List.
  await page.getByRole('button', { name: 'Order', exact: true }).click();
  await expect(page.locator('.admin-toc')).toBeVisible();
});

test('the sidebar renders with a grip on every entry', async ({ page }) => {
  // Not a formality: this sidebar once shipped fully invisible behind an inherited
  // opacity: 0, with the DOM assertions and CI both green.
  const rows = page.locator('.admin-toc .poems-toc li');
  await expect(rows.first()).toBeVisible();
  const count = await rows.count();
  expect(count).toBeGreaterThan(1);
  await expect(page.locator('.admin-toc .toc-grip')).toHaveCount(count);

  const grip = page.locator('.admin-toc .toc-grip').first();
  const box = await grip.boundingBox();
  expect(box, 'the grip must have a box to aim at').not.toBeNull();
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(20);
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(20);
});

test('the grip opts out of the browser gesture, or Android eats the drag', async ({ page }) => {
  // The regression guard, and the reason this file exists. Reordering and scrolling are both
  // vertical here, so with the default touch-action Chrome on Android claims the gesture as a
  // scroll, fires touchcancel and tears the drag down mid-move. A mouse never goes through
  // that arbitration, so a desktop-only suite would keep saying this works.
  const touchAction = await page
    .locator('.admin-toc .toc-grip')
    .first()
    .evaluate((el) => getComputedStyle(el).touchAction);
  expect(touchAction).toBe('none');

  // And the row around it must NOT, or the sidebar can no longer be scrolled with a finger.
  const rowTouchAction = await page
    .locator('.admin-toc .poems-toc li')
    .first()
    .evaluate((el) => getComputedStyle(el).touchAction);
  expect(rowTouchAction).not.toBe('none');
});

test('dragging a grip downwards reorders the list', async ({ page }) => {
  const before = await titles(page);
  const rows = page.locator('.admin-toc .poems-toc li');

  const grip = await rows.nth(0).locator('.toc-grip').boundingBox();
  const third = await rows.nth(2).boundingBox();
  expect(grip && third).toBeTruthy();
  if (!grip || !third) return;

  await dragGrip(
    page,
    { x: grip.x + grip.width / 2, y: grip.y + grip.height / 2 },
    third.y + third.height / 2,
  );

  await expect
    .poll(async () => (await titles(page))[0], {
      message: 'the first entry should no longer be first',
    })
    .not.toBe(before[0]);

  const after = await titles(page);
  expect(after).toHaveLength(before.length);
  expect([...after].sort()).toEqual([...before].sort());
  expect(after.indexOf(before[0] as string)).toBeGreaterThan(0);
});
