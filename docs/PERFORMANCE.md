# Performance review

Measured numbers only. Lab data comes from Lighthouse CI (`pnpm lhci`: mobile form factor, devtools throttling,
median of 3 runs, both pages), re-run after every change to the page shell; field data does not exist yet.

## Core Web Vitals (lab, latest run in Stage 6)

| Metric | Budget | `/` | `/variants/quiz` |
| --- | --- | --- | --- |
| Performance score | ≥ 0.90 | 0.99 | 0.99 |
| Accessibility score | ≥ 0.95 | 1.00 | 1.00 |
| SEO score | ≥ 0.90 | 1.00 | 1.00 |
| Largest Contentful Paint | ≤ 2,500 ms | 1,560 ms | 1,557 ms |
| Cumulative Layout Shift | ≤ 0.10 | 0 | 0 |
| Total Blocking Time | ≤ 200 ms | 16 ms | 17 ms |
| HTML (transfer) | ≤ 14,000 B | 7,187 B | 7,505 B |
| Scripts (transfer) | ≤ 200,000 B | 163,694 B | 165,956 B |
| Third-party bytes | none | 0 | 0 |

Production, measured with `curl` from the developer machine (one sample, not a benchmark): `/` returned
6,383 B compressed with a time to first byte of 0.25 s; static assets are served from the Vercel CDN (`x-vercel-cache: HIT`).

How the numbers moved: Stage 2 skeleton LCP 1,656 ms; Stage 4 signup 1,465 ms; Stage 5 landing 1,540 ms;
Stage 6 analytics 1,560 ms. INP is not measured in the lab; TBT stays under 20 ms.

## Performance decisions

- **Rendering:** both arms are statically prerendered; the only dynamic routes are the API and the relay.
  The experiment is assigned in `proxy.ts` and served by a rewrite, so there is no client-side flash or swap.
- **LCP element:** the `h1` (text, in all Lighthouse runs). It is never animated and uses Lato with
  `display: 'optional'`: with `swap`, a late font load re-painted it and produced a bimodal LCP (1,415 or
  2,665 ms) that failed the gate in the clean-clone test; with `optional`, 9 of 9 runs measured about 1,414 ms.
- **Fonts:** self-hosted from pinned `@fontsource` files through `next/font/local` (the first production build
  failed while fetching from Google Fonts).
- **JavaScript:** React plus the two signup components; analytics is a 1 KB `fetch` helper. No third-party
  scripts, no animation library.
- **Motion:** CSS only, `transform` and `opacity`; scroll-driven sections animate transform only (opacity failed
  axe contrast mid-animation); all off under `prefers-reduced-motion`.
- **Assets:** the logo is an SVG with explicit dimensions; the Open Graph image is generated at build time.

## SEO

Title, description, canonical, Open Graph and Twitter cards, `SoftwareApplication` JSON-LD with the free
offer, `robots.txt` and `sitemap.xml` (E2E asserts all of them). The quiz arm has a canonical to `/` and no
`noindex`, because it is served at `/` to half of visitors.

## Accessibility

axe reports 0 violations in every tested state on desktop and 360 px (E2E, 48 tests), including validation,
409, server error, timeout, success, profile and every quiz step. Keyboard-only flows, visible focus rings,
focus moved to errors and success, `aria-live` and `role="alert"` messages with icon and text, a skip link,
44 px targets (inline links excepted, WCAG 2.5.8), and `prefers-reduced-motion` honoured. Brand colors that miss
WCAG AA are replaced with existing primitives (ADR-005, [brand/CONTRAST.md](brand/CONTRAST.md)).

## Caching and CDN

- Static HTML and hashed assets are served from Vercel's CDN.
- `/` passes through `proxy.ts`, which sets `cache-control: private, no-store`, so the assignment is never
  shared between visitors; the page body itself is prerendered (`x-vercel-cache: PRERENDER`).
- API and relay responses are `no-store`.

## Important production risks

- **Field performance is unknown:** lab numbers come from one machine with devtools throttling. Next step:
  Vercel Speed Insights or PostHog web vitals.
- **The proxy runs on every landing request**, adding function latency before the prerendered page; an
  edge-cached page per arm would remove it.
- **Fonts:** six weights are preloaded (about 113 KB) and compete with CSS on the critical path; LCP is all render
  delay. Preloading only the `h1` weight is a cheap next step.
- **About 55 KiB of unused JavaScript** reported by Lighthouse in two chunks; a modern browserslist would drop
  polyfills.
- **Single region** (`iad1`) for functions and the database: higher latency outside North America.
