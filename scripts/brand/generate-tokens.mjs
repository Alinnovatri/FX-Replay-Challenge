#!/usr/bin/env node
// Generates brand design tokens from brand/brand-kit.html (the only delivered source).
// Never edit the outputs by hand: change the source or this script and regenerate.
//
//   node scripts/brand/generate-tokens.mjs          write brand/generated/tokens.{json,css}
//   node scripts/brand/generate-tokens.mjs --check  exit 1 if the committed outputs are stale
//
// Fails loudly on anything it cannot resolve; it never falls back to a default value.

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SOURCE = join(ROOT, 'brand', 'brand-kit.html');
const README = join(ROOT, 'brand', 'README.md');
const OUT_DIR = join(ROOT, 'brand', 'generated');
const OUT_JSON = join(OUT_DIR, 'tokens.json');
const OUT_CSS = join(OUT_DIR, 'tokens.css');

export class TokenError extends Error {}

function fail(message) {
  throw new TokenError(message);
}

/** Extracts a `const NAME = {...};` object literal and parses it as JSON. */
export function extractLiteral(html, name) {
  const match = html.match(new RegExp(`const ${name} = (\\{[\\s\\S]*?\\n\\});`));
  if (!match) fail(`brand-kit.html: could not find "const ${name} = {...};"`);
  try {
    return JSON.parse(match[1]);
  } catch (error) {
    fail(`brand-kit.html: ${name} is not JSON-compatible (${error.message})`);
  }
}

/** Explicit RESOLVE["x"]="y" overrides the kit adds on top of the primitives. */
export function extractOverrides(html) {
  const overrides = {};
  for (const [, key, value] of html.matchAll(/RESOLVE\["([^"]+)"\]="([^"]+)";/g)) {
    overrides[key] = value;
  }
  return overrides;
}

/** Reads a CSS custom property (e.g. --display) from the kit's :root block. */
export function extractFontStack(html, varName) {
  const match = html.match(new RegExp(`--${varName}:([^;]+);`));
  if (!match) fail(`brand-kit.html: font variable --${varName} not found`);
  return match[1].split(',').map((family) => family.trim().replace(/^'|'$/g, ''));
}

/** Weights per family from the Google Fonts URL, e.g. Lato:wght@400;700;900. */
export function extractFontWeights(html) {
  const href = html.match(/href="(https:\/\/fonts\.googleapis\.com\/css2\?[^"]+)"/);
  if (!href) fail('brand-kit.html: Google Fonts stylesheet link not found');
  const weights = {};
  for (const param of new URL(href[1].replaceAll('&amp;', '&')).searchParams.getAll('family')) {
    const [family, axes] = param.split(':');
    const values = axes
      ?.split('@')[1]
      ?.split(';')
      .map((v) => Number(v.split(',').at(-1)));
    if (!values?.length || values.some(Number.isNaN)) fail(`brand-kit.html: cannot parse weights for ${family}`);
    weights[family.replaceAll('+', ' ')] = values;
  }
  return weights;
}

export const slug = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const HEX = /^#[0-9A-F]{6}$/i;

/** Parses "rgba(r,g,b,a)" and returns the matching primitive plus alpha, or fails. */
function resolveAlpha(value, primitives, key) {
  const match = value.match(/^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/);
  if (!match) fail(`override "${key}" has an unsupported value "${value}"`);
  const hex =
    '#' +
    match
      .slice(1, 4)
      .map((n) => Number(n).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  const base = key.replace(/-\d+$/, '');
  if (primitives[base]?.hex !== hex) fail(`override "${key}" (${hex}) does not match primitive "${base}"`);
  return { base, alpha: Number(match[4]) };
}

export function buildTokens(html, readme) {
  const prim = extractLiteral(html, 'PRIM');
  const sem = extractLiteral(html, 'SEM');
  const overrides = extractOverrides(html);

  const primitives = {};
  for (const [group, entries] of Object.entries(prim)) {
    for (const [name, hex, star] of entries) {
      const key = slug(name);
      if (!HEX.test(hex)) fail(`primitive "${name}" has an invalid hex "${hex}"`);
      if (primitives[key]) fail(`duplicate primitive "${key}"`);
      primitives[key] = { group, name, hex: hex.toUpperCase(), ...(star ? { brand: true } : {}) };
    }
  }

  const semantic = {};
  const unconfirmed = [];
  for (const [group, entries] of Object.entries(sem)) {
    for (const [token, ref] of entries) {
      if (semantic[token]) fail(`duplicate semantic token "${token}"`);
      if (primitives[ref]) {
        semantic[token] = { group, ref };
      } else if (ref in overrides && HEX.test(overrides[ref])) {
        // The kit patches a primitive its scale does not define (e.g. blue-950).
        primitives[ref] ??= { group: 'Kit fallback', name: ref, hex: overrides[ref].toUpperCase(), unconfirmed: true };
        semantic[token] = { group, ref, unconfirmed: true };
        unconfirmed.push(
          `${token} -> ${ref} (${overrides[ref]}): not in the primitive scale; value is the kit's own fallback`,
        );
      } else if (ref in overrides) {
        semantic[token] = { group, ref, ...resolveAlpha(overrides[ref], primitives, ref) };
      } else {
        fail(`semantic token "${token}" references "${ref}", which is neither a primitive nor a kit override`);
      }
    }
  }

  // The README states the expected counts; a mismatch means the parse went wrong.
  const declared = (label) => Number(readme.match(new RegExp(`\\*\\*${label}\\*\\* \\((\\d+)\\)`))?.[1]);
  const primCount = Object.values(primitives).filter((p) => !p.unconfirmed).length;
  const semCount = Object.keys(semantic).length;
  if (primCount !== declared('Primitives'))
    fail(`parsed ${primCount} primitives, README declares ${declared('Primitives')}`);
  if (semCount !== declared('Semantic'))
    fail(`parsed ${semCount} semantic tokens, README declares ${declared('Semantic')}`);

  const weights = extractFontWeights(html);
  const fonts = {};
  for (const [role, cssVar] of [
    ['display', 'display'],
    ['body', 'sans'],
  ]) {
    const stack = extractFontStack(html, cssVar);
    if (!weights[stack[0]]) fail(`font "${stack[0]}" (--${cssVar}) is not loaded by the kit's Google Fonts link`);
    fonts[role] = { family: stack[0], stack, weights: weights[stack[0]] };
  }

  return { primitives, semantic, fonts, unconfirmed };
}

export function renderJson(tokens, sourceHash) {
  const color = { primitive: {}, semantic: {} };
  for (const [key, p] of Object.entries(tokens.primitives)) {
    color.primitive[key] = {
      $type: 'color',
      $value: p.hex,
      $extensions: {
        group: p.group,
        ...(p.brand ? { brand: true } : {}),
        ...(p.unconfirmed ? { status: 'unconfirmed' } : {}),
      },
    };
  }
  for (const [key, s] of Object.entries(tokens.semantic)) {
    color.semantic[key] = {
      $type: 'color',
      $value: `{color.primitive.${s.base ?? s.ref}}`,
      $extensions: {
        group: s.group,
        ...(s.alpha !== undefined ? { alpha: s.alpha } : {}),
        ...(s.unconfirmed ? { status: 'unconfirmed' } : {}),
      },
    };
  }
  const font = {};
  for (const [role, f] of Object.entries(tokens.fonts)) {
    font[role] = { $type: 'fontFamily', $value: f.stack, $extensions: { weights: f.weights } };
  }
  const doc = {
    $description: 'Generated by scripts/brand/generate-tokens.mjs from brand/brand-kit.html. Do not edit by hand.',
    $extensions: { sourceSha256: sourceHash, unconfirmed: tokens.unconfirmed },
    color,
    font,
  };
  return JSON.stringify(doc, null, 2) + '\n';
}

export function renderCss(tokens, sourceHash) {
  const lines = [
    '/* Generated by scripts/brand/generate-tokens.mjs from brand/brand-kit.html. Do not edit by hand. */',
    `/* source sha256: ${sourceHash} */`,
    ':root {',
    '  /* Primitives: the only place literal colors live. */',
  ];
  for (const [key, p] of Object.entries(tokens.primitives)) {
    lines.push(`  --color-${key}: ${p.hex};${p.unconfirmed ? ' /* unconfirmed: kit fallback */' : ''}`);
  }
  lines.push('', '  /* Semantic: build with these. */');
  for (const [key, s] of Object.entries(tokens.semantic)) {
    const value =
      s.alpha !== undefined
        ? `color-mix(in srgb, var(--color-${s.base}) ${Math.round(s.alpha * 100)}%, transparent)`
        : `var(--color-${s.ref})`;
    lines.push(`  --${key}: ${value};${s.unconfirmed ? ' /* unconfirmed */' : ''}`);
  }
  lines.push('', '  /* Typography */');
  for (const [role, f] of Object.entries(tokens.fonts)) {
    lines.push(
      `  --font-${role}: ${f.stack.map((family) => (/\s/.test(family) ? `'${family}'` : family)).join(', ')};`,
    );
  }
  lines.push('}', '');
  return lines.join('\n');
}

export function generate() {
  const html = readFileSync(SOURCE, 'utf8');
  const readme = readFileSync(README, 'utf8');
  const hash = createHash('sha256').update(html).digest('hex');
  const tokens = buildTokens(html, readme);
  return { tokens, outputs: { [OUT_JSON]: renderJson(tokens, hash), [OUT_CSS]: renderCss(tokens, hash) } };
}

function main(argv) {
  const { tokens, outputs } = generate();
  if (argv.includes('--check')) {
    const stale = Object.entries(outputs).filter(
      ([path, content]) => !existsSync(path) || readFileSync(path, 'utf8') !== content,
    );
    if (stale.length) {
      console.error(
        `Stale brand tokens: ${stale.map(([p]) => relative(ROOT, p)).join(', ')}. Run: node scripts/brand/generate-tokens.mjs`,
      );
      process.exit(1);
    }
    console.log('Brand tokens are up to date.');
    return;
  }
  mkdirSync(OUT_DIR, { recursive: true });
  for (const [path, content] of Object.entries(outputs)) writeFileSync(path, content);
  console.log(
    `Wrote ${Object.keys(tokens.primitives).length} primitives, ${Object.keys(tokens.semantic).length} semantic tokens, ${Object.keys(tokens.fonts).length} font roles.`,
  );
  for (const note of tokens.unconfirmed) console.warn(`UNCONFIRMED ${note}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    if (!(error instanceof TokenError)) throw error;
    console.error(`generate-tokens: ${error.message}`);
    process.exit(1);
  }
}
