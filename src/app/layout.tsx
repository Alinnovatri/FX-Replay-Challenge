import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { meta, SITE_URL } from '@/content/landing';
import './globals.css';

// Self-hosted from pinned @fontsource packages (OFL-1.1): the build never fetches fonts over the network.
const lato = localFont({
  src: [
    { path: '../../node_modules/@fontsource/lato/files/lato-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../../node_modules/@fontsource/lato/files/lato-latin-700-normal.woff2', weight: '700', style: 'normal' },
    { path: '../../node_modules/@fontsource/lato/files/lato-latin-900-normal.woff2', weight: '900', style: 'normal' },
  ],
  variable: '--font-lato',
  // optional: the h1 (the LCP element) never re-paints when the web font arrives late.
  display: 'optional',
});
const nunito = localFont({
  src: [
    {
      path: '../../node_modules/@fontsource/nunito-sans/files/nunito-sans-latin-400-normal.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../node_modules/@fontsource/nunito-sans/files/nunito-sans-latin-600-normal.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../../node_modules/@fontsource/nunito-sans/files/nunito-sans-latin-700-normal.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-nunito',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: meta.title,
  description: meta.description,
  alternates: { canonical: '/' },
  openGraph: {
    title: meta.title,
    description: meta.description,
    url: '/',
    siteName: 'FX Replay Challenge',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: meta.title, description: meta.description },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${lato.variable} ${nunito.variable}`}>
      <body>{children}</body>
    </html>
  );
}
