#!/usr/bin/env node
// Copies brand marks from brand/logos/ (the delivered source) to where the app serves them. Never edit the
// copies: change the source and rerun. `--check` exits 1 if a copy is missing or differs from its source.
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const COPIES = [
  ['brand/logos/FXReplayLogo.svg', 'public/brand/fx-replay-logo.svg'],
  ['brand/logos/isotypeWhite.svg', 'public/brand/fx-replay-isotype.svg'],
  ['brand/logos/isotypeWhite.svg', 'src/app/icon.svg'], // Next.js serves it as the favicon
];

const check = process.argv.includes('--check');
const stale = [];
for (const [from, to] of COPIES) {
  const source = join(ROOT, from);
  const target = join(ROOT, to);
  if (!existsSync(source)) throw new Error(`sync-assets: missing source ${from}`);
  if (check) {
    if (!existsSync(target) || !readFileSync(source).equals(readFileSync(target))) stale.push(to);
  } else {
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(source, target);
  }
}
if (stale.length) {
  console.error(`Stale brand assets: ${stale.join(', ')}. Run: node scripts/brand/sync-assets.mjs`);
  process.exit(1);
}
console.log(check ? 'Brand assets are up to date.' : `Copied ${COPIES.length} brand assets.`);
