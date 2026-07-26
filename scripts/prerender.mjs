#!/usr/bin/env node
/**
 * Prerender every public route to a static HTML file.
 *
 * GitHub Pages serves an SPA by falling back to 404.html, which means every URL except /
 * answers with an HTTP 404 status. Crawlers do not index 404s, and the ones that do run
 * JavaScript (essentially Googlebot, on a deferred second pass) were the only ones seeing
 * any content at all — everything else got `<div id="root"></div>`.
 *
 * Booting the built app in a real browser and writing out the resulting DOM fixes both:
 * each route becomes an ordinary file at its own path, so Pages returns 200, and the poem
 * text is in the markup before any script runs. The app still boots on top and takes over
 * with live API data, so admin edits are never more than one deploy from being reflected.
 *
 * Uses Playwright because it is already a dev dependency — no SSR runtime, no new
 * framework, and the API is stubbed exactly as e2e/fixtures.ts does it so a sleeping
 * Render instance can never produce an empty build.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { metaForRoute, POEMS } from '@gedichtenv2/shared';
import { chromium } from '@playwright/test';

const SITE = process.env.SITE_URL ?? 'https://artoriun.github.io/kov-cs-poetry';
const BASE = '/kov-cs-poetry/';
const PORT = 4178;
const DIST = new URL('../packages/web/dist/', import.meta.url).pathname;
const WEB = new URL('../packages/web/', import.meta.url).pathname;

const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

/**
 * Prefer the live API so a rebuild picks up anything edited in the admin portal. Falling
 * back to the bundled poems keeps a sleeping or broken Render instance from publishing an
 * empty site — but the fallback is announced, because silently shipping stale content is
 * the worse failure: visitors would see the edit (the app fetches at runtime) while every
 * crawler kept the old text, with nothing in the build log to explain why.
 */
async function loadPoems() {
  const api = (process.env.VITE_API_URL ?? '').replace(/^http:\/\//, 'https://');
  const bundled = POEMS.filter((p) => !p.deleted);
  if (!api) {
    console.warn('! VITE_API_URL not set — prerendering from bundled poems');
    return bundled;
  }
  try {
    const res = await fetch(`${api}/api/poems`, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('empty or malformed response');
    console.log(`✓ prerendering from the live API (${data.length} poems)`);
    return data.filter((p) => !p.deleted);
  } catch (err) {
    console.warn(`! live API unreachable (${err.message}) — prerendering from bundled poems`);
    return bundled;
  }
}

const live = await loadPoems();

// Titles and descriptions come from the shared helper the running app also uses, so the
// prerendered <title> and the one useRouteMeta sets on navigation cannot drift apart.
const paths = ['/', '/poems', '/contact', ...live.map((p) => `/poems/${p.id}`)];
const routes = paths.map((path) => ({
  path,
  ...metaForRoute(path, live),
  poem: live.find((p) => `/poems/${p.id}` === path),
}));

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Per-route head. Deliberately no <meta name="keywords">: ignored by every major engine
 *  since 2009. The indexable signal is the poem text now sitting in the body. */
function head(route) {
  const url = `${SITE}${route.path === '/' ? '/' : route.path}`;
  const image = route.poem?.image ?? live[0]?.image ?? '';
  const tags = [
    `<title>${esc(route.title)}</title>`,
    `<meta name="description" content="${esc(route.description)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:type" content="${route.poem ? 'article' : 'website'}" />`,
    `<meta property="og:title" content="${esc(route.title)}" />`,
    `<meta property="og:description" content="${esc(route.description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:locale" content="hu_HU" />`,
    image ? `<meta property="og:image" content="${esc(image)}" />` : '',
    `<meta name="twitter:card" content="summary_large_image" />`,
  ].filter(Boolean);

  if (route.poem) {
    // schema.org has no Poem type (schema.org/Poem 404s); CreativeWork carrying
    // genre: Poetry is the idiomatic fit.
    tags.push(
      `<script type="application/ld+json">${JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'CreativeWork',
        genre: 'Poetry',
        name: route.poem.title,
        headline: route.poem.title,
        inLanguage: 'hu',
        author: { '@type': 'Person', name: 'Kovács' },
        url,
        image: route.poem.image,
        text: route.poem.overlay ?? '',
      })}</script>`,
    );
  }
  return tags.join('\n    ');
}

// ---- serve the built app ----------------------------------------------------
const server = spawn(
  'npx',
  ['vite', 'preview', '--port', String(PORT), '--strictPort', '--outDir', 'dist'],
  { cwd: WEB, stdio: 'ignore' },
);
const stop = () => server.kill();
process.on('exit', stop);
process.on('SIGINT', () => {
  stop();
  process.exit(1);
});

const origin = `http://localhost:${PORT}`;
for (let i = 0; i < 60; i++) {
  try {
    const r = await fetch(`${origin}${BASE}`);
    if (r.ok) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 500));
}

// ---- render -----------------------------------------------------------------
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.route('**/api/poems', (r) =>
  r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(live) }),
);
await page.route('**res.cloudinary.com/**', (r) =>
  r.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }),
);

// Captured before anything is written. Output must be built from this rather than from
// the live DOM: the preview server serves out of the same dist we are writing into, so
// once index.html has the home page's tags, every later route is served that as the SPA
// fallback and the injected head stacks up. Taking only #root from the browser also
// leaves out the inline styles Motion parks on elements mid-animation.
const template = readFileSync(join(DIST, 'index.html'), 'utf8');
if (!template.includes('<div id="root"></div>')) {
  // Almost always means dist already holds a previous prerender: the template has to be
  // the untouched vite output, so run a fresh build first.
  console.error('✗ dist/index.html is not a clean build shell — run `npm run build` first');
  process.exit(1);
}

let written = 0;
let failures = 0;
const seenTitles = new Map();
for (const route of routes) {
  // A warning, not a failure: two poems really are both called "Kaposszentbenedek", so
  // this is the poet's content rather than a bug. Duplicate titles do dilute search
  // results, but disambiguating them is an editorial decision.
  if (seenTitles.has(route.title)) {
    console.warn(`! ${route.path} shares a title with ${seenTitles.get(route.title)}`);
  }
  seenTitles.set(route.title, route.path);
  if (!route.description) {
    console.error(`✗ ${route.path} has no description`);
    failures++;
  }
  await page.goto(`${origin}${BASE}${route.path.replace(/^\//, '')}`, {
    waitUntil: 'networkidle',
  });
  // The reveal animations gate on image load; the stub resolves instantly, but Motion
  // still needs a frame or two to commit the text into the DOM.
  await page.waitForTimeout(900);

  const root = await page.evaluate(() => document.getElementById('root').innerHTML);

  // Fail the build rather than publish an empty shell. A route that renders nothing —
  // because a selector moved, an animation never settled, or the stub stopped matching —
  // would otherwise ship silently and look exactly like the problem prerendering exists
  // to solve.
  const visible = root
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (route.poem) {
    // Stronger than a length check: the page must contain this poem's own opening, so a
    // route rendering the wrong poem (or just the chrome) is caught too.
    const opening = (route.poem.overlay ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
    if (opening && !visible.includes(opening)) {
      console.error(`✗ ${route.path} does not contain its own poem text`);
      failures++;
    }
  } else if (visible.length < 100) {
    // /contact is a form, so it is legitimately short — 147 chars of labels and buttons.
    console.error(`✗ ${route.path} rendered only ${visible.length} chars of text`);
    failures++;
  }

  const html = template
    .replace(/<title>.*?<\/title>/s, head(route))
    .replace('<div id="root"></div>', `<div id="root">${root}</div>`);

  const out =
    route.path === '/' ? join(DIST, 'index.html') : join(DIST, route.path.slice(1), 'index.html');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  written++;
}

// ---- sitemap + robots -------------------------------------------------------
const today = new Date().toISOString().slice(0, 10);
writeFileSync(
  join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes
    .map(
      (r) =>
        `  <url><loc>${SITE}${r.path === '/' ? '/' : r.path}</loc><lastmod>${today}</lastmod></url>`,
    )
    .join('\n')}\n</urlset>\n`,
);
writeFileSync(
  join(DIST, 'robots.txt'),
  // /admin is never prerendered, so it is only reachable through the SPA fallback and has
  // no crawlable content — but it should not be requested at all.
  `User-agent: *\nAllow: /\nDisallow: /kov-cs-poetry/admin\n\nSitemap: ${SITE}/sitemap.xml\n`,
);

await browser.close();
stop();
if (failures) {
  console.error(`✗ prerender produced ${failures} problem(s); not publishing this build`);
  process.exit(1);
}
console.log(`✓ prerendered ${written} routes, sitemap (${routes.length} urls) and robots.txt`);
