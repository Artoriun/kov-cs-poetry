import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { CUSTOM_SLIDE_POEM, expect, MEASURED_POEM, settled, signInAsAdmin, test } from './fixtures';

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/**
 * Waits for every running animation to finish before sampling.
 *
 * Without this the sweep is neither deterministic nor honest: axe computes contrast from the
 * *current* rendered colour, so an element caught mid-fade reports a ratio that neither its
 * start nor its end state has. The admin form animates opacity over 0.4s and produced four
 * phantom contrast violations that way — alongside one real one, which is exactly the mix
 * that trains people to ignore a check.
 */
async function animationsSettled(page: Page) {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        // A decorative loop never finishes, so awaiting it waits forever rather than settling.
        // The featured-poem border is one — `border-flow`, five seconds, infinite alternate —
        // and it is on screen throughout the admin portal, which is why sweeping that screen
        // timed out instead of reporting anything. Skipping them is safe for the reason this
        // helper exists: it is here so contrast is not read mid-fade, and a loop that runs
        // forever has no settled state to wait for in the first place.
        .filter((a) => a.effect?.getTiming().iterations !== Number.POSITIVE_INFINITY)
        .map((a) => a.finished.catch(() => {})),
    ),
  );
}

async function assertNoViolations(page: Page) {
  await animationsSettled(page);
  const { violations } = await new AxeBuilder({ page })
    .withTags(AXE_TAGS)
    // Everything inside the reader's image container — title, poem lines, the back button —
    // is white with a text-shadow, laid over a photograph. axe cannot evaluate contrast
    // against an image, and the fixture makes it actively wrong: every Cloudinary request is
    // stubbed with a 1×1 transparent pixel, so axe measures white text against the *page*
    // background and reports violations no visitor has. Whether the text reads over a given
    // photo is a judgement about that photo, made by eye when it is chosen.
    //
    // Scoped to this container rather than the whole route, so the header, footer and
    // everything outside the image are still swept — including in the reader.
    .exclude('.detail-image-container')
    .analyze();
  // Named rather than counted, so a failure says what broke and where instead of
  // "expected 0, got 1".
  expect(
    violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
  ).toEqual([]);
}

/**
 * Pins the theme before the app boots, rather than clicking the toggle and assuming which way
 * it went.
 *
 * ThemeProvider defaults to **dark** and reads `localStorage.theme` on mount, so a sweep that
 * clicked its way to "dark mode" was in fact switching to light — and every plain sweep had
 * been auditing dark all along. Seeding the value makes each test say what it audits. The
 * toggle itself is covered by its own test below, so nothing is lost by not using it here.
 */
function pinTheme(page: Page, theme: 'light' | 'dark') {
  return page.addInitScript((t) => localStorage.setItem('theme', t), theme);
}

/**
 * Accessibility in a real browser, not only via Lighthouse.
 *
 * Lighthouse audits one page at one width. This runs at every viewport in the matrix, which
 * is where a viewport-specific violation lives — a control that only becomes too small once
 * the layout reflows, or a menu desktop never renders. It also covers the poem reader, which
 * Lighthouse's route list deliberately excludes because individual poems come and go.
 *
 * Both themes, because the palettes are independent: a contrast pair that passes in one can
 * fail in the other, and nothing but a sweep would say so.
 */
const ROUTES = [
  ['the home page', '/'],
  ['the poems grid', '/poems'],
  ['a measured poem', `/poems/${MEASURED_POEM}`],
  ['a custom-slide poem', `/poems/${CUSTOM_SLIDE_POEM}`],
  ['the contact page', '/contact'],
] as const;

for (const [name, path] of ROUTES) {
  for (const theme of ['dark', 'light'] as const) {
    test(`${name} has no accessibility violations in ${theme} mode`, async ({ page }) => {
      await pinTheme(page, theme);
      await page.goto(path);
      await settled(page);
      await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /dark-mode/ : /^$/);
      await assertNoViolations(page);
    });
  }
}

for (const theme of ['dark', 'light'] as const) {
  test(`the admin sign-in has no accessibility violations in ${theme} mode`, async ({ page }) => {
    // A form, which is where label and focus violations live.
    await pinTheme(page, theme);
    await page.goto('/admin');
    await expect(page.locator('#admin-password')).toBeVisible();
    await assertNoViolations(page);
  });

  test(`the admin dashboard has no accessibility violations in ${theme} mode`, async ({ page }) => {
    // This used to say the portal needed a token and only the sign-in was reachable. It is
    // reachable now — the gate reads the `exp` claim and leaves the signature to the server —
    // and the screen behind it is by far the largest in the app: every poem as an editable
    // card, a drag-reorderable grid, a contents sidebar, tabs. It had never been swept, in a
    // repository that gates its deploys on accessibility everywhere else.
    await pinTheme(page, theme);
    await signInAsAdmin(page);
    await page.goto('/admin');
    await expect(page.locator('.admin-card-wrapper').first()).toBeVisible();
    await settled(page);
    await assertNoViolations(page);
  });

  test(`the admin Order view has no accessibility violations in ${theme} mode`, async ({
    page,
  }) => {
    // Swept separately because it is a different screen, not a variation on the one above:
    // its own grid, its own sidebar, and controls the List view does not have.
    await pinTheme(page, theme);
    await signInAsAdmin(page);
    await page.goto('/admin');
    await page.getByRole('button', { name: 'Order', exact: true }).click();
    await expect(page.locator('.admin-grid-item').first()).toBeVisible();
    await settled(page);
    await assertNoViolations(page);
  });
}

test('the theme toggle actually switches themes', async ({ page }) => {
  // Kept because the sweeps above no longer touch the toggle: without this, the control that
  // every visitor uses to change theme would be exercised by nothing at all.
  await page.goto('/');
  await settled(page);
  await animationsSettled(page);
  await expect(page.locator('html')).toHaveClass(/dark-mode/);

  await page.locator('.theme-toggle').first().click();
  await expect(page.locator('html')).not.toHaveClass(/dark-mode/);

  await page.locator('.theme-toggle').first().click();
  await expect(page.locator('html')).toHaveClass(/dark-mode/);
});
