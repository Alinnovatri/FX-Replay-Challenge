// Quality gates (owner decision; never loosened without the owner): median of 3 runs, devtools throttling.
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'node node_modules/next/dist/bin/next start -p 3300',
      startServerReadyPattern: 'Ready',
      url: ['http://127.0.0.1:3300/', 'http://127.0.0.1:3300/variants/quiz', 'http://127.0.0.1:3300/variants/control'],
      numberOfRuns: 3,
      settings: { throttlingMethod: 'devtools', extraHeaders: JSON.stringify({ 'x-fxr-test': '1' }) }, // default mobile form factor: the stricter profile
    },
    assert: {
      aggregationMethod: 'median',
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 200 }],
        'resource-summary:document:size': ['error', { maxNumericValue: 14000 }],
        'resource-summary:script:size': ['error', { maxNumericValue: 200000 }],
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci' },
  },
};
