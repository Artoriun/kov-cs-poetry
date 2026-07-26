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
const BUDGET_GZIP = { '.js': 120 * 1024, '.css': 12 * 1024 };

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
for (const name of readdirSync(assets)) {
  const ext = extname(name);
  const budget = BUDGET_GZIP[ext];
  if (!budget) continue;
  const size = gzipSync(readFileSync(join(assets, name))).length;
  const kb = (n) => `${(n / 1024).toFixed(1)}KB`;
  if (size > budget) {
    fail(`${name} is ${kb(size)} gzipped, over the ${kb(budget)} budget`);
  } else {
    console.log(`✓ ${name}: ${kb(size)} gzipped (budget ${kb(budget)})`);
  }
}

process.exit(failed ? 1 : 0);
