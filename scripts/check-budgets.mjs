#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
/**
 * Two build-time guards, run from CI's `verify` job.
 *
 * 1. Poem image URLs must go through optimizeUrl()/gridThumb(). The home carousel shipped
 *    untransformed originals for months — 1.2MB PNGs on the largest-contentful-paint
 *    element — purely because optimizeUrl was module-local to Poems.tsx and the carousel
 *    never imported it. Nothing failed; the images just arrived slowly.
 *
 * 2. Bundle budgets on the gzipped output, which is what actually crosses the wire.
 *    Deliberately close to current size so growth surfaces as a failure to think about
 *    rather than a number nobody reads.
 */
import { gzipSync } from 'node:zlib';

const WEB = new URL('../packages/web/', import.meta.url).pathname;
// `.js`/`.css` mark which extensions count toward the payload; `initial` is the budget
// that actually gates. Raised from 118KB when PoemsContext began seeding from POEMS:
// importing the poems as a value rather than a type puts all 34 of them in the entry
// chunk, +11.2KB gzipped. That buys a page that still renders when the API is down and
// stops React blanking the prerendered HTML on mount, which is worth it on a site whose
// content is the product. ~7KB of headroom left above the current 120.8KB.
const BUDGET_GZIP = { '.js': true, '.css': true, initial: 128 * 1024 };

let failed = false;
const fail = (msg) => {
  console.error(`✗ ${msg}`);
  failed = true;
};

// ---- 1. raw poem image URLs -------------------------------------------------
const SAFE = /optimizeUrl\(|gridThumb\(|imagePreview|PLACEHOLDER_IMAGE/;
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : walk(p);
    return ['.ts', '.tsx'].includes(extname(e.name)) ? [p] : [];
  });

let scanned = 0;
for (const file of walk(join(WEB, 'src'))) {
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      // an image URL flowing into a <img src> or Image().src
      if (!/(src=\{|\.src\s*=)/.test(line)) return;
      if (!/\.image\b/.test(line)) return;
      scanned++;
      if (!SAFE.test(line)) {
        fail(
          `${file.replace(WEB, 'packages/web/')}:${i + 1} uses a poem image URL without optimizeUrl(): ${line.trim()}`,
        );
      }
    });
}
console.log(`✓ image URLs: ${scanned} image assignment(s) all transformed`);

// ---- 2. bundle budgets ------------------------------------------------------
const assets = join(WEB, 'dist/assets');
try {
  statSync(assets);
} catch {
  console.error('✗ no dist/assets — run the build first');
  process.exit(1);
}
// Budget the initial payload — the entry chunks every visitor downloads — rather than
// each file. Per-file budgets get weaker every time a route is split out: the numbers all
// drop, nothing fails, and a lazy chunk could grow unnoticed. Route chunks (Admin) are
// deliberately not budgeted; they cost only the person who opens that route.
const kb = (n) => `${(n / 1024).toFixed(1)}KB`;
const entry = readdirSync(assets).filter((n) => n.startsWith('index-'));
const lazy = readdirSync(assets).filter((n) => !n.startsWith('index-') && BUDGET_GZIP[extname(n)]);

let initial = 0;
for (const name of entry) {
  const ext = extname(name);
  if (!BUDGET_GZIP[ext]) continue;
  const size = gzipSync(readFileSync(join(assets, name))).length;
  initial += size;
  console.log(`  entry ${name}: ${kb(size)} gzipped`);
}
if (initial > BUDGET_GZIP.initial) {
  fail(`initial payload is ${kb(initial)} gzipped, over the ${kb(BUDGET_GZIP.initial)} budget`);
} else {
  console.log(`✓ initial payload: ${kb(initial)} gzipped (budget ${kb(BUDGET_GZIP.initial)})`);
}
for (const name of lazy) {
  console.log(
    `  lazy  ${name}: ${kb(gzipSync(readFileSync(join(assets, name))).length)} gzipped (not budgeted)`,
  );
}

process.exit(failed ? 1 : 0);
