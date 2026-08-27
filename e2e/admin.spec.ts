import { POEMS } from '@gedichtenv2/shared';
import { expect, settled, signInAsAdmin, test } from './fixtures';

/**
 * The admin dashboard, rendered.
 *
 * Until now nothing in this suite had ever got past the sign-in form — a11y.spec.ts said so in
 * as many words, that the portal "needs a token, but the sign-in is the part reachable without
 * one". It turns out a token is not much of a barrier from a test's point of view, because the
 * gate reads only the `exp` claim and leaves the signature to the server.
 *
 * So the largest screen in the app — every poem card, the grid, the contents sidebar, the tab
 * switch — was covered by nothing at all, in a repository whose CI otherwise gates deploys on
 * layout, accessibility and bundle size. The sidebar has already shipped invisible once behind
 * an inherited `opacity: 0`, with unit assertions and CI both green, and only a screenshot
 * caught it.
 *
 * This runs at every viewport in the matrix, so it also covers the portal at phone widths,
 * where the layout is genuinely different rather than merely narrower.
 */

const wide = (width: number | undefined) => (width ?? 0) >= 600;

test.beforeEach(async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto('/admin');
  await settled(page);
});

/**
 * Signing out, by the route a person actually takes.
 *
 * The header renders two of these — one in the nav, one beside it — and on a narrow screen the
 * nav one sits behind the hamburger. Playwright reports it visible either way, but the closed
 * `.main-nav` intercepts the click, which is exactly what a person would find. So open the menu
 * when there is a menu to open, rather than reaching past it for whichever button the DOM
 * happens to list first.
 */
async function signOut(page: import('@playwright/test').Page) {
  const hamburger = page.locator('.hamburger');
  if (await hamburger.isVisible()) await hamburger.click();
  await page.getByRole('button', { name: 'Log out' }).filter({ visible: true }).first().click();
}

const logOut = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: 'Log out' }).filter({ visible: true }).first();

test('the dashboard renders instead of the sign-in form', async ({ page }) => {
  await expect(page.locator('#admin-password')).toHaveCount(0);
  await expect(logOut(page)).toBeVisible();
});

test('every poem has a card', async ({ page }) => {
  // A count rather than titles: the point is that none are dropped on the way to the portal,
  // and the API fixture serves the same bundled poems the page falls back to.
  await expect(page.locator('.admin-card-wrapper')).toHaveCount(POEMS.length);
});

test('the Order tab shows the grid, and List comes back', async ({ page }) => {
  await page.getByRole('button', { name: 'Order', exact: true }).click();
  await expect(page.locator('.admin-grid-item').first()).toBeVisible();

  await page.getByRole('button', { name: 'List', exact: true }).click();
  await expect(page.locator('.admin-card-wrapper').first()).toBeVisible();
});

test('the contents sidebar lists the same poems as the grid, in the same order', async ({
  page,
  viewport,
}) => {
  // The sidebar is display:none below 600px — deliberately, since the cards carry their own
  // drag there — so this is the one assertion that cannot hold at every width.
  test.skip(!wide(viewport?.width), 'the sidebar is hidden below 600px');

  await page.getByRole('button', { name: 'Order', exact: true }).click();
  await expect(page.locator('.admin-toc')).toBeVisible();

  // Two views of one array, which is the whole claim the sidebar makes. If they can drift,
  // dragging one of them silently stops meaning what the other shows.
  const sidebar = await page.locator('.admin-toc .poems-toc li button').allTextContents();
  const grid = await page.locator('.admin-grid-item .admin-grid-card-title').allTextContents();
  expect(sidebar.length).toBe(POEMS.length);
  expect(sidebar.map((s) => s.trim())).toEqual(grid.map((s) => s.trim()));
});

test('logging out returns the sign-in form and forgets the token', async ({ page }) => {
  await signOut(page);
  await expect(page.locator('#admin-password')).toBeVisible();
  // The token has to actually go: a form that reappears while the credential survives in
  // storage would put the session back on the next navigation.
  expect(await page.evaluate(() => localStorage.getItem('admin_token'))).toBeNull();
});
