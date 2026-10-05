import { createRequire } from 'node:module';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { delimiter, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

// Lighthouse is an optional pinned audit tool, supplied by npm exec (not shipped with the app).
let lighthouseEntry;
for (const bin of (process.env.PATH ?? '').split(delimiter)) {
  const candidate = resolve(bin, '../lighthouse/core/index.js');
  try {
    await access(candidate);
    lighthouseEntry = candidate;
    break;
  } catch {
    /* Next PATH entry. */
  }
}
if (!lighthouseEntry)
  throw new Error(
    'Run: npm exec --yes --package=lighthouse@13.5.0 -- node scripts/lighthouse-audit.mjs after',
  );
const require = createRequire(lighthouseEntry);
const { default: puppeteer } = await import(pathToFileURL(require.resolve('puppeteer-core')));
const { startFlow } = await import(pathToFileURL(lighthouseEntry));
const { default: desktop } = await import(
  pathToFileURL(resolve(dirname(lighthouseEntry), 'config/desktop-config.js'))
);
const tag = process.argv[2] ?? 'after';
if (!/^[a-z0-9-]+$/i.test(tag)) throw new Error('Use a simple audit label.');
const directory = 'performance-reports';
await mkdir(directory, { recursive: true });
const runs = [];
for (let run = 1; run <= 3; run++) {
  const browser = await puppeteer.launch({
    executablePath: chromium.executablePath(),
    headless: true,
    args: ['--no-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    const config = {
      ...desktop,
      settings: {
        ...desktop.settings,
        screenEmulation: {
          mobile: false,
          width: 1440,
          height: 900,
          deviceScaleFactor: 1,
          disabled: false,
        },
        disableStorageReset: true,
        onlyCategories: ['performance', 'accessibility', 'best-practices'],
      },
    };
    const flow = await startFlow(page, { name: `Sentinel ${tag} ${run}`, config });
    await flow.navigate('http://127.0.0.1:4400/login');
    await page.type('#login-email', 'admin@sentinel.dev');
    await page.type('#login-password', 'Sentinel123!');
    await page.locator('button[type="submit"]').click();
    await page.waitForFunction(() => location.pathname === '/dashboard');
    // A full navigation measures authenticated bootstrap, not an SPA click or a login redirect.
    await flow.navigate('http://127.0.0.1:4400/dashboard');
    const result = await flow.createFlowResult();
    await writeFile(`${directory}/${tag}-${run}.json`, JSON.stringify(result));
    await writeFile(`${directory}/${tag}-${run}.html`, await flow.generateReport());
    for (const { lhr } of result.steps) {
      const record = {
        run,
        route: new URL(lhr.finalDisplayedUrl).pathname,
        browser: await browser.version(),
        lighthouseVersion: lhr.lighthouseVersion,
        fetchTime: lhr.fetchTime,
        settings: lhr.configSettings,
        scores: Object.fromEntries(
          Object.entries(lhr.categories).map(([key, value]) => [key, value.score * 100]),
        ),
        metrics: Object.fromEntries(
          [
            'first-contentful-paint',
            'largest-contentful-paint',
            'cumulative-layout-shift',
            'total-blocking-time',
          ].map((key) => [key, lhr.audits[key].numericValue]),
        ),
        warnings: lhr.runWarnings,
      };
      runs.push(record);
      console.info(
        JSON.stringify({
          tag,
          run,
          route: record.route,
          scores: record.scores,
          metrics: record.metrics,
        }),
      );
    }
  } finally {
    await browser.close();
  }
}
await writeFile(`${directory}/${tag}-summary.json`, JSON.stringify(runs, null, 2));
