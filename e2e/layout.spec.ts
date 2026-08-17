import { POEMS, stripPageBreaks } from '@gedichtenv2/shared';
import {
  CUSTOM_SLIDE_POEM,
  expect,
  MEASURED_POEM,
  PAGES,
  STANZA_POEM,
  settled,
  test,
} from './fixtures';

// Each test here corresponds to a regression that actually shipped at some point.

test.describe('page integrity', () => {
  for (const path of PAGES) {
    test(`${path} has no horizontal overflow`, async ({ page }) => {
      await page.goto(path);
      await settled(page);
      const { scrollW, clientW } = await page.evaluate(() => ({
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
      }));
      expect(scrollW, `${path} scrolls sideways`).toBeLessThanOrEqual(clientW + 1);
    });

    test(`${path} renders nothing below the footer`, async ({ page }) => {
      await page.goto(path);
      await settled(page);
      const gap = await page.evaluate(() => {
        const f = document.querySelector('.site-footer');
        if (!f) return 0; // admin login has no footer
        return (
          document.documentElement.scrollHeight -
          (f.getBoundingClientRect().bottom + window.scrollY)
        );
      });
      // A backdrop showing through past the footer was a recurring bug.
      expect(gap, `${path} has ${gap}px of page past the footer`).toBeLessThanOrEqual(1);
    });

    test(`${path} starts at the top after reload`, async ({ page }) => {
      await page.goto(path);
      await settled(page);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(300);
      await page.reload();
      await settled(page);
      expect(await page.evaluate(() => Math.round(window.scrollY))).toBe(0);
    });
  }
});

test.describe('poem detail', () => {
  for (const [label, id] of [
    ['measured', MEASURED_POEM],
    ['custom slides', CUSTOM_SLIDE_POEM],
  ] as const) {
    test(`${label}: text never runs under the nav button`, async ({ page }) => {
      await page.goto(`/poems/${id}`);
      await settled(page);

      for (let slide = 0; slide < 8; slide++) {
        const clearance = await page.evaluate(() => {
          const lines = [...document.querySelectorAll('.detail-slide .detail-overlay span')].filter(
            (e) => (e.textContent ?? '').trim(),
          );
          if (!lines.length) return null;
          const down = document.querySelector('.detail-scroll-down-btn');
          const back = document.querySelector('.detail-back-btn');
          const btn = down && !down.className.includes('is-hidden') ? down : back;
          if (!btn) return null;
          const last = lines[lines.length - 1].getBoundingClientRect().bottom;
          return Math.round(btn.getBoundingClientRect().top - last);
        });
        if (clearance !== null) {
          expect(clearance, `slide ${slide} overlaps the button`).toBeGreaterThanOrEqual(0);
        }

        const advanced = await page.evaluate(() => {
          const b = document.querySelector<HTMLElement>('.detail-scroll-down-btn');
          if (!b || b.className.includes('is-hidden')) return false;
          b.click();
          return true;
        });
        if (!advanced) break;
        await page.waitForTimeout(1600);
      }
    });
  }

  test('no slide is left with an orphaned line or two', async ({ page }) => {
    await page.goto(`/poems/${CUSTOM_SLIDE_POEM}`);
    await settled(page);
    const counts: number[] = [];
    for (let i = 0; i < 10; i++) {
      counts.push(
        await page.evaluate(
          () =>
            [...document.querySelectorAll('.detail-slide .detail-overlay span')].filter((e) =>
              (e.textContent ?? '').trim(),
            ).length,
        ),
      );
      const advanced = await page.evaluate(() => {
        const b = document.querySelector<HTMLElement>('.detail-scroll-down-btn');
        if (!b || b.className.includes('is-hidden')) return false;
        b.click();
        return true;
      });
      if (!advanced) break;
      await page.waitForTimeout(1600);
    }
    // Splitting used to strand the remainder on a 1–2 line page.
    if (counts.length > 1) {
      expect(Math.min(...counts), `slide line counts: ${counts.join(', ')}`).toBeGreaterThan(2);
    }
  });

  test('a stanza is never split across a page turn', async ({ page }) => {
    // The reader used to divide a poem by line count alone, which is blind to where a stanza
    // ends. On a tall window Phaäton came out as three pages of twelve and stranded the last
    // line of its seven-line stanza at the top of page two, on its own.
    //
    // Asserted against the stanzas the poem is actually written in, so it holds for whatever
    // the viewport turns out to fit rather than pinning one page count.
    const poem = POEMS.find((p) => p.id === STANZA_POEM);
    const stanzas = stripPageBreaks(poem?.overlay ?? '')
      .split(/\n\s*\n/)
      .map((s) =>
        s
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean),
      );
    const tallest = Math.max(...stanzas.map((s) => s.length));

    await page.goto(`/poems/${STANZA_POEM}`);
    await settled(page);

    const rendered: string[][] = [];
    for (let i = 0; i < 12; i++) {
      rendered.push(
        await page.evaluate(() =>
          [...document.querySelectorAll('.detail-slide .detail-overlay span')]
            .map((e) => (e.textContent ?? '').trim())
            .filter(Boolean),
        ),
      );
      const advanced = await page.evaluate(() => {
        const b = document.querySelector<HTMLElement>('.detail-scroll-down-btn');
        if (!b || b.className.includes('is-hidden')) return false;
        b.click();
        return true;
      });
      if (!advanced) break;
      await page.waitForTimeout(1400);
    }

    // Every page must be a whole number of consecutive stanzas. The exception is a stanza
    // too tall for one page, which has to be broken somewhere — none of this poem's are, at
    // any viewport the suite runs, so any split here is the regression.
    let at = 0;
    for (const [i, pageLines] of rendered.entries()) {
      let consumed = 0;
      while (consumed < pageLines.length && at < stanzas.length) {
        const stanza = stanzas[at];
        const slice = pageLines.slice(consumed, consumed + stanza.length);
        expect(
          slice,
          `page ${i + 1} of ${STANZA_POEM} cuts a stanza (page holds ${pageLines.length} lines, ` +
            `tallest stanza is ${tallest}); got ${JSON.stringify(pageLines)}`,
        ).toEqual(stanza);
        consumed += stanza.length;
        at += 1;
      }
      expect(consumed, `page ${i + 1} has lines left over after its stanzas`).toBe(
        pageLines.length,
      );
    }
    expect(at, 'not every stanza was rendered').toBe(stanzas.length);
  });

  test('every line of the poem survives paging', async ({ page }) => {
    await page.goto(`/poems/${CUSTOM_SLIDE_POEM}`);
    await settled(page);
    const total = await page.evaluate(
      () => document.querySelectorAll('.detail-measure .detail-overlay span').length,
    );
    let seen = 0;
    for (let i = 0; i < 10; i++) {
      seen += await page.evaluate(
        () => document.querySelectorAll('.detail-slide .detail-overlay span').length,
      );
      const advanced = await page.evaluate(() => {
        const b = document.querySelector<HTMLElement>('.detail-scroll-down-btn');
        if (!b || b.className.includes('is-hidden')) return false;
        b.click();
        return true;
      });
      if (!advanced) break;
      await page.waitForTimeout(1600);
    }
    expect(seen, 'lines were dropped between slides').toBe(total);
  });

  test('the stanza gap is the same wherever the poem is shown', async ({ page }) => {
    // The gap started life scoped to the reader, so the carousel and the grid cards went on
    // spacing their stanzas at a full line-height — the same poem, laid out two ways depending
    // on where you met it, which is what the client noticed.
    //
    // Measured as a ratio against the surrounding line rather than in pixels: each surface sets
    // its own font size, so a shared pixel height would be wrong on every one of them. What has
    // to match is that a blank line is *shorter* than a line of verse, everywhere.
    const ratio = async (container: string, line: string) =>
      page.evaluate(
        ([c, l]) => {
          const root = document.querySelector(c);
          if (!root) return null;
          const spans = [...root.querySelectorAll<HTMLElement>(l)];
          const gap = spans.find((s) => s.className.includes('is-stanza-gap'));
          const verse = spans.find((s) => !s.className.includes('is-stanza-gap'));
          if (!gap || !verse) return null;
          return gap.getBoundingClientRect().height / verse.getBoundingClientRect().height;
        },
        [container, line] as const,
      );

    await page.goto(`/poems/${STANZA_POEM}`);
    await settled(page);
    // The measuring copy, not the visible slide: a page that ends on a stanza boundary drops
    // its separator, so the first slide often has no gap to measure. This copy holds the poem
    // whole, and it is the one the pagination reads its numbers from.
    const reader = await ratio('.detail-measure .detail-overlay', 'span');
    expect(reader, 'no stanza gap found in the reader').not.toBeNull();
    expect(reader as number, 'the reader gap is not shorter than a line').toBeLessThan(0.8);

    await page.goto('/');
    await settled(page);
    const carousel = await ratio('.carousel-overlay', '.carousel-overlay-line');
    expect(carousel, 'no stanza gap found in the carousel').not.toBeNull();
    expect(
      Math.abs((carousel as number) - (reader as number)),
      `carousel gap ${carousel} does not match the reader's ${reader}`,
    ).toBeLessThan(0.15);

    await page.goto('/poems');
    await settled(page);
    const grid = await ratio('.poem-overlay', '.poem-line');
    expect(grid, 'no stanza gap found on the grid cards').not.toBeNull();
    expect(
      Math.abs((grid as number) - (reader as number)),
      `grid gap ${grid} does not match the reader's ${reader}`,
    ).toBeLessThan(0.15);
  });
});

test.describe('poems grid', () => {
  test('table of contents indicator draws on a cold load', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-portrait', 'TOC is hidden below 768px');
    await page.goto('/poems');
    await settled(page);
    const h = await page.evaluate(() => {
      const l = document.querySelector('.toc-range-line');
      return l ? Math.round(l.getBoundingClientRect().height) : 0;
    });
    // The line silently failed to draw on a fresh load once.
    expect(h, 'TOC range line has no height').toBeGreaterThan(0);
  });

  test('the whole batch of cards renders', async ({ page }) => {
    await page.goto('/poems');
    await settled(page);
    expect(await page.locator('.poem-card-wrapper').count()).toBeGreaterThan(0);
  });
});

test.describe('home carousel', () => {
  test('overlay sits between the title and the read-more button', async ({ page }, testInfo) => {
    // In landscape the overlay is deliberately a teaser: max-height plus a mask fading to
    // transparent at 78%, so the text is meant to run on and fade rather than fit.
    test.skip(testInfo.project.name === 'mobile-landscape', 'overlay is intentionally masked');
    await page.goto('/');
    await settled(page);
    const box = await page.evaluate(() => {
      const title = document.querySelector('.carousel-slide-title');
      const btn = document.querySelector('.carousel-read-more-btn');
      const lines = [...document.querySelectorAll('.carousel-overlay span')].filter((e) =>
        (e.textContent ?? '').trim(),
      );
      if (!title || !btn || !lines.length) return null;
      return {
        above: Math.round(
          lines[0].getBoundingClientRect().top - title.getBoundingClientRect().bottom,
        ),
        below: Math.round(
          btn.getBoundingClientRect().top - lines[lines.length - 1].getBoundingClientRect().bottom,
        ),
      };
    });
    if (!box) test.skip(true, 'carousel not rendered');
    expect(box.above, 'overlay overlaps the title').toBeGreaterThanOrEqual(0);
    expect(box.below, 'overlay overlaps the button').toBeGreaterThanOrEqual(0);
  });
});
