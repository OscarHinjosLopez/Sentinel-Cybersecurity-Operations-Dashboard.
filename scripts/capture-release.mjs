import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';

// Uses the actual production entry point and demo login, without the E2E bridge.
await readFile('dist/sentinel/browser/index.html');
const baseURL = 'http://127.0.0.1:4401';
const directory = 'docs/screenshots';
await mkdir(directory, { recursive: true });
const server = spawn(process.execPath, ['scripts/serve-production.mjs'], {
  env: { ...process.env, PORT: '4401' },
  stdio: ['ignore', 'pipe', 'inherit'],
});
let browser;
try {
  await Promise.race([
    once(server.stdout, 'data'),
    once(server, 'exit').then(() => {
      throw new Error('Production preview failed to start.');
    }),
  ]);
  const index = await (await fetch(`${baseURL}/index.html`)).text();
  for (const route of [
    '/',
    '/login',
    '/dashboard',
    '/threats',
    '/threats/THR-00042',
    '/devices/DEV-00142',
    '/settings',
  ]) {
    const response = await fetch(baseURL + route);
    assert.equal(response.status, 200, route);
    assert.equal(await response.text(), index, `SPA fallback: ${route}`);
  }
  assert.equal((await fetch(`${baseURL}/missing.js`)).status, 404);
  browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    colorScheme: 'dark',
    timezoneId: 'Europe/Madrid',
    baseURL,
  });
  const page = await context.newPage();
  const failures = [];
  page.on('pageerror', (error) => failures.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 400) failures.push(`${response.status()}: ${response.url()}`);
  });
  // Freeze browser time so normal mock records remain consistent; no app providers changed.
  await page.clock.setFixedTime(new Date('2026-10-05T10:00:00Z'));
  const capture = async (name) => {
    if (name !== 'command-palette') {
      await page.evaluate(() => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      });
    }
    await page.mouse.move(1439, 899);
    await page.screenshot({ path: `${directory}/${name}.png`, animations: 'disabled' });
  };
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  await capture('login');
  await page.getByLabel('Email address', { exact: true }).fill('admin@sentinel.dev');
  await page.getByLabel('Password', { exact: true }).fill('Sentinel123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('region', { name: 'Security dashboard' })).toHaveAttribute(
    'aria-busy',
    'false',
  );
  await expect(page.locator('app-dashboard-chart svg').first()).toBeVisible();
  await capture('dashboard-dark');
  await page.evaluate(() => localStorage.setItem('sentinel-theme', 'light'));
  await page.reload();
  await expect(page.locator('app-dashboard-chart svg').first()).toBeVisible();
  await capture('dashboard-light');
  await page.evaluate(() => localStorage.setItem('sentinel-theme', 'dark'));
  await page.goto('/threats');
  await expect(page.getByRole('region', { name: 'Threat results' })).toHaveAttribute(
    'aria-busy',
    'false',
  );
  await capture('threats');
  await page.goto('/threats/THR-00042');
  await expect(page.getByRole('heading', { name: 'Detection Overview' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Detection Overview' })).toBeVisible();
  await capture('threat-detail');
  await page.goto('/devices');
  await expect(page.getByRole('region', { name: 'Device results' })).toHaveAttribute(
    'aria-busy',
    'false',
  );
  await capture('devices');
  await page.goto('/devices/DEV-00142');
  await expect(page.getByRole('heading', { name: 'Device information' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Device information' })).toBeVisible();
  await capture('device-detail');
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog')).toBeVisible();
  await capture('command-palette');
  assert.deepEqual(failures, [], 'Production browser diagnostics');
  const result = {
    viewport: '1440x900',
    entry: 'src/main.ts (production)',
    screenshots: 8,
    login: 'PASS',
    dashboard: 'PASS',
    deepRouteReload: 'PASS',
    spaFallback: 'PASS',
    missingAsset: 404,
    browserErrors: failures,
  };
  await writeFile('docs/production-smoke.json', JSON.stringify(result, null, 2) + '\n');
  console.info(result);
} finally {
  await browser?.close();
  server.kill();
}
