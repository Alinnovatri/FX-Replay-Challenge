import { ImageResponse } from 'next/og';
import tokens from '../../brand/generated/tokens.json';
import { hero } from '@/content/landing';

// Open Graph card built at build time. Colors are read from the generated brand tokens, never hard-coded.
export const alt = 'Try FX Replay Free: test your strategy on real market data';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const color = (name: keyof typeof tokens.color.primitive) => tokens.color.primitive[name].$value;

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 80,
        background: color('dark-900'),
        color: color('neutral-50'),
      }}
    >
      <div style={{ fontSize: 28, color: color('blue-400'), letterSpacing: 2 }}>TRY FX REPLAY FREE</div>
      <div style={{ fontSize: 68, fontWeight: 800, marginTop: 24, lineHeight: 1.1 }}>{hero.title}</div>
      <div style={{ fontSize: 30, marginTop: 32, color: color('neutral-200') }}>
        Free plan. No credit card required.
      </div>
    </div>,
    size,
  );
}
