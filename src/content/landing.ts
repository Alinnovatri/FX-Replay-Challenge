// Landing copy. Drafted with the vendored copywriting skill (Stage 5) and rewritten in the redesign from the
// sections of fxreplay.com recorded in docs/ASSUMPTIONS.md A-003. Every claim maps to a sourced row there.
// No testimonials, no performance claims, no prices beyond the free plan.

export const hero = {
  eyebrow: 'Backtesting and trading practice',
  // Adapted from "Test it before you trust it." (fxreplay.com)
  title: 'Test your strategy on real market data before you trust it',
  // PRODUCT_CONTEXT "What it does": replay real historical data, practise execution, review every trade,
  // without risking real money (fxreplay.com FAQ and meta description)
  subtitle:
    'Replay historical price action, practise your entries and exits, and review every trade with no real money at stake.',
  secondaryCta: 'See how it works',
};

// A-003: "Over 1 million traders have used it"; "120+ assets across 6 markets"; free plan without a card.
export const trust = [
  { value: '1M+', label: 'traders have used FX Replay' },
  { value: '120+', label: 'assets across 6 markets' },
  { value: '$0', label: 'free plan, no credit card' },
];

export const showcase = {
  title: 'One workspace for every rep',
  body: 'Pick a date, replay the chart candle by candle, place trades and keep the economic calendar and your journal one click away.',
  // Visible in the screenshot: replay controls, Journal, Analytics, Economic Calendar (brand/screenshots/hero-poster.webp)
  alt: 'FX Replay replay workspace: a futures chart paused mid-session with replay controls, journal, analytics and economic calendar buttons',
  chips: ['Replay mode', 'Economic calendar', 'Journal', 'Analytics'],
};

export const benefits = {
  title: 'Practise the whole loop, not just the chart',
  intro:
    'Replay, journal and prop firm rules live in one product, so every session ends with something you can review.',
  items: [
    {
      id: 'replay',
      title: 'Test it before you trust it',
      // A-003: replay real historical data and review every trade
      body: 'Replay a strategy on real historical data, review every trade, and go live knowing how it behaved.',
    },
    {
      id: 'journal',
      title: 'A record you can review',
      // A-003: FXR Journal; the journal compares the plan with what happened, privately
      body: 'Entries, exits, notes, tags and outcomes stay tied to each session, so you can compare the plan with what actually happened.',
      // brand/screenshots/backtest.webp (sample data on fxreplay.com)
      alt: 'FX Replay journal table of trades next to an analytics panel, showing sample data',
    },
    {
      id: 'prop',
      title: 'Rehearse the challenge',
      // A-003: prop firm simulator, sizing, drawdown and execution under challenge rules
      body: 'Run your strategy under prop firm rules and see whether sizing, drawdown control and execution hold.',
    },
    {
      id: 'mentor',
      title: 'Find the pattern behind mistakes',
      // A-003: Mentor AI across sessions
      body: 'Mentor AI looks across your sessions to surface recurring execution issues for the next review.',
    },
    {
      id: 'script',
      title: 'Turn a setup into an indicator',
      // A-003: FXR Script, optional
      body: 'FXR Script turns a tested setup into your own indicator. Optional: no coding needed to backtest.',
    },
  ],
};

export const plan = {
  title: 'From signup to your first replay',
  steps: [
    { title: 'Create your free account', body: 'Your name and email. The free plan needs no credit card.' },
    {
      title: 'Pick a market and a date',
      body: 'Choose an asset, jump to a day and press play.',
      alt: 'FX Replay replay controls: speed and play buttons',
    },
    { title: 'Trade it and review it', body: 'Place trades as price unfolds, then check entries, exits and outcomes.' },
  ],
};

export const audience = {
  title: 'Built for the questions traders ask',
  // A-003: fxreplay.com use-case questions
  items: [
    {
      who: 'If you are learning',
      q: 'Is my edge real, or a lucky streak?',
      a: 'Run a strategy across different conditions and a real sample of trades, so confidence comes from data instead of a few good days.',
    },
    {
      who: 'If you are refining a strategy',
      q: 'Is the strategy failing, or is execution drifting?',
      a: 'Compare the plan with what actually happened across sessions, privately, without relying on memory.',
    },
    {
      who: 'If you are preparing for a prop firm challenge',
      q: 'Does my risk process hold under pressure?',
      a: 'See whether position sizing, drawdown control and execution stay consistent when the rules leave less room for error.',
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
      a: 'No. FX Replay is built for manual traders: you replay markets and log trades through the interface. FXR Script is optional.',
    },
    {
      q: 'Which markets can I practise?',
      // A-003: markets listed in the fxreplay.com FAQ
      a: 'Futures, forex, indices, metals, energy, stocks, crypto and agricultural markets, with real historical data.',
    },
    {
      q: 'What happens when I sign up on this page?',
      // ASSUMPTIONS A-004: our users don't exist in the FX Replay app
      a: 'This page was built for the FX Replay Growth Engineer challenge. Signing up creates an account in this project, not in the FX Replay app.',
    },
  ],
};

export const finalCta = {
  title: 'Your next idea deserves a real test',
  body: 'Start on the free plan and replay it on real historical data.',
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
