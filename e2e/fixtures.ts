import { POEMS } from '@gedichtenv2/shared';
import { test as base } from '@playwright/test';

// The app has no offline fallback — on a failed fetch it renders nothing — so the API is
// stubbed with the shared fixtures. Keeps the suite deterministic and independent of the
// Render instance, which sleeps on the free tier.
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route('**/api/poems', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(POEMS) }),
    );
    await use(page);
  },
});

export { expect } from '@playwright/test';

/** A poem whose slides are hand-authored, so it takes the custom-slide layout path. */
export const CUSTOM_SLIDE_POEM =
  POEMS.find((p) => p.customSlidesEnabled && p.customSlides?.length)?.id ?? 'poem-23';

/** A poem whose text is paginated by measurement. */
export const MEASURED_POEM = POEMS.find((p) => !p.customSlidesEnabled)?.id ?? 'poem-1';

export const PAGES = [
  '/',
  '/poems',
  `/poems/${MEASURED_POEM}`,
  `/poems/${CUSTOM_SLIDE_POEM}`,
  '/contact',
];

/** Waits for the poem to be laid out — the reveal is gated on images, so settle first. */
export async function settled(page: import('@playwright/test').Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);
}
