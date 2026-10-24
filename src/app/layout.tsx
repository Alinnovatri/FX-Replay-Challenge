import type { Metadata } from 'next';
import { Lato, Nunito_Sans } from 'next/font/google';
import './globals.css';

const lato = Lato({ subsets: ['latin'], weight: ['400', '700', '900'], variable: '--font-lato', display: 'swap' });
const nunito = Nunito_Sans({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-nunito',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Try FX Replay Free | FX Replay Challenge',
  description: 'Backtest trading strategies on real historical market data. Free to start, no credit card required.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${lato.variable} ${nunito.variable}`}>
      <body>{children}</body>
    </html>
  );
}
