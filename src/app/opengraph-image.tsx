import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import tokens from '../../brand/generated/tokens.json';
import { hero } from '@/content/landing';

// Open Graph card built at build time. Colors come from the generated semantic tokens (ADR-005 for the link
// color) and the heading font from the pinned @fontsource package, never hard-coded.
export const alt = 'Try FX Replay Free: test your strategy on real market data';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

type Primitive = keyof typeof tokens.color.primitive;
type Semantic = keyof typeof tokens.color.semantic;

function semantic(name: Semantic): string {
  const ref = tokens.color.semantic[name].$value.match(/^\{color\.primitive\.([a-z0-9-]+)\}$/)?.[1] as
    Primitive | undefined;
  if (!ref) throw new Error(`opengraph-image: cannot resolve token ${name}`);
  return tokens.color.primitive[ref].$value;
}
// ADR-005: links and accents on dark surfaces use blue-400 instead of text-brand.
const link = tokens.color.primitive['blue-400'].$value;

export default async function OpenGraphImage() {
  const lato = await readFile(join(process.cwd(), 'node_modules/@fontsource/lato/files/lato-latin-900-normal.woff'));
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 80,
        background: semantic('bg-primary'),
        color: semantic('text-primary'),
        fontFamily: 'Lato',
      }}
    >
      <div style={{ fontSize: 28, color: link, letterSpacing: 2 }}>TRY FX REPLAY FREE</div>
      <div style={{ fontSize: 68, fontWeight: 900, marginTop: 24, lineHeight: 1.1 }}>{hero.title}</div>
      <div style={{ fontSize: 30, marginTop: 32, color: semantic('text-secondary') }}>
        Free plan. No credit card required.
      </div>
    </div>,
    { ...size, fonts: [{ name: 'Lato', data: lato, weight: 900, style: 'normal' }] },
  );
}
