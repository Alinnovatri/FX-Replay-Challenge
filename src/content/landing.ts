// Landing copy, drafted with the vendored copywriting skill (Situation A) from docs/PRODUCT_CONTEXT.md.
// Every claim maps to docs/ASSUMPTIONS.md A-003; sources noted per line. No testimonials, no performance claims.

export const hero = {
  eyebrow: 'Backtesting and trading practice',
  // Adapted from "Test it before you trust it." (fxreplay.com)
  title: 'Test your strategy on real market data before you trust it',
  // PRODUCT_CONTEXT "What it does": replay real historical data, practise execution, review every trade,
  // without risking real money (fxreplay.com FAQ and meta description)
  subtitle:
    'Replay historical price action, practise your entries and exits, and review every trade with no real money at stake.',
  // "Over 1 million traders have used it" (fxreplay.com FAQ)
  proof: 'Over 1 million traders have used FX Replay.',
};

export const problem = {
  // PRODUCT_CONTEXT "Core problem": traders go live on a strategy they have not tested (gut feeling vs real data)
  title: 'Going live on a gut feeling is the risk',
  body: 'Replay it on real historical data, see how it behaved, and keep a record of every decision before you put money behind it.',
};

export const plan = {
  title: 'Three steps to your first backtest',
  steps: [
    { title: 'Create your free account', body: 'Email only. The free plan needs no credit card.' },
    { title: 'Replay a market', body: 'Pick an asset and a date, then trade price action as it unfolded.' },
    { title: 'Review every trade', body: 'Check entries, exits and outcomes before you trade live.' },
  ],
};

export const features = {
  // PRODUCT_CONTEXT "Key differentiators": replay, journal and prop firm simulation in one product
  title: 'Replay, journal and prop firm rules in one place',
  // "120+ assets across 6 markets with real historical data" (fxreplay.com)
  coverage: '120+ assets across 6 markets, with real historical data.',
  items: [
    { title: 'Replay mode', body: 'Jump to any date and experience price action as it unfolded.' },
    {
      title: 'FXR Journal',
      body: 'Entries, exits, notes, tags and outcomes stay tied to each session, so reviews rest on what you did.',
    },
    {
      title: 'Prop Firm Simulator',
      body: 'Run your strategy under challenge rules and track drawdown before the real challenge.',
    },
  ],
};

export const faq = {
  title: 'Questions before you start',
  items: [
    {
      q: 'Is FX Replay really free?',
      // fxreplay.com/pricing FAQ
      a: 'Yes. The free plan has no end date and needs no credit card. It includes core backtesting features.',
    },
    {
      q: 'Do I need to know how to code?',
      // fxreplay.com FAQ
      a: 'No. FX Replay is built for manual traders: you replay markets and log trades through the interface.',
    },
    {
      q: 'What happens when I sign up on this page?',
      // ASSUMPTIONS A-004: our users don't exist in the FX Replay app
      a: 'This page was built for the FX Replay Growth Engineer challenge. Signing up creates an account in this project, not in the FX Replay app.',
    },
  ],
};

export const finalCta = {
  title: 'Start with the free plan',
  body: 'Test your next idea on real historical data.',
};

export const footer = {
  // Paraphrased from the risk and educational disclosure in the fxreplay.com footer (A-003), and linked below
  disclosure:
    'FX Replay is a backtesting and educational platform. It is not a broker and does not execute real trades. Trading involves substantial risk, and past performance of any strategy or backtest does not guarantee future results.',
  note: 'Built for the FX Replay Growth Engineer challenge.',
};

export const meta = {
  title: 'Try FX Replay Free | Backtest on real market data',
  description:
    'Replay real historical price data, practise execution and review every trade without risking real money. Free plan, no credit card required.',
};

export const CTA_LABEL = 'Try FX Replay Free';
export const SITE_URL = 'https://fx-replay-challenge.vercel.app';
