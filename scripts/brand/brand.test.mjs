// Run with: node --test scripts/brand/brand.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildTokens, generate, TokenError } from './generate-tokens.mjs';
import { contrast, textVerdict, renderReport } from './contrast.mjs';

const html = readFileSync(new URL('../../brand/brand-kit.html', import.meta.url), 'utf8');
const readme = readFileSync(new URL('../../brand/README.md', import.meta.url), 'utf8');

test('parses the counts the brand README declares', () => {
  const tokens = buildTokens(html, readme);
  assert.equal(Object.values(tokens.primitives).filter((p) => !p.unconfirmed).length, 44);
  assert.equal(Object.keys(tokens.semantic).length, 60);
  assert.equal(tokens.fonts.display.family, 'Lato');
  assert.equal(tokens.fonts.body.family, 'Nunito Sans');
});

test('flags blue-950 as an unconfirmed kit fallback', () => {
  const tokens = buildTokens(html, readme);
  assert.equal(tokens.semantic['btn-bg-primary-disabled'].unconfirmed, true);
  assert.equal(tokens.unconfirmed.length, 1);
});

test('fails loudly on a reference that resolves to nothing', () => {
  const broken = html.replace('["bg-primary","dark-900"]', '["bg-primary","dark-999"]');
  assert.throws(() => buildTokens(broken, readme), TokenError);
});

test('fails when the parsed count disagrees with the README', () => {
  assert.throws(() => buildTokens(html, readme.replace('**Semantic** (60)', '**Semantic** (61)')), /README declares 61/);
});

test('fails when the translucent override does not match its primitive', () => {
  const broken = html.replace('rgba(3,3,3,0.6)', 'rgba(4,4,4,0.6)');
  assert.throws(() => buildTokens(broken, readme), /does not match primitive/);
});

test('committed outputs match a fresh generation', () => {
  for (const [path, content] of Object.entries(generate().outputs)) {
    assert.equal(readFileSync(path, 'utf8'), content, `${path} is stale`);
  }
});

test('contrast math matches WCAG reference values', () => {
  assert.equal(contrast('#FFFFFF', '#000000').toFixed(2), '21.00');
  assert.equal(contrast('#777777', '#FFFFFF').toFixed(2), '4.48');
  assert.equal(textVerdict(4.49), 'AA large only');
  assert.equal(textVerdict(4.5), 'AA');
});

test('the report never renders a bare pipe inside a table cell', () => {
  const tokens = JSON.parse(readFileSync(new URL('../../brand/generated/tokens.json', import.meta.url), 'utf8'));
  for (const row of renderReport(tokens).split('\n').filter((l) => l.startsWith('|'))) {
    const cells = row.split('|').length;
    assert.ok(cells === 5 || cells === 6, `unexpected column count in: ${row}`);
  }
});
