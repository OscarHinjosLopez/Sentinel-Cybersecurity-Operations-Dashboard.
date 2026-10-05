import { resolve } from 'node:path';
import { test as base, expect } from './test';
import { Page } from '@playwright/test';

interface ZoomApi {
  tabs: {
    query(options: object): Promise<{ id: number; url?: string }[]>;
    setZoom(id: number, factor: number): Promise<void>;
    getZoom(id: number): Promise<number>;
  };
}

export const test = base.extend({
  context: async ({ playwright, baseURL }, use) => {
    const extension = resolve('e2e/fixtures/zoom-extension');
    // The full Chromium channel supports extensions in headless mode; shell does not.
    const context = await playwright.chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless: true,
      baseURL,
      viewport: { width: 1440, height: 900 },
      reducedMotion: 'reduce',
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
    });
    try {
      await use(context);
    } finally {
      await context.close();
    }
  },
});

export async function setBrowserZoom(page: Page, factor: number): Promise<void> {
  const context = page.context();
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  const actual = await worker.evaluate(
    async ({ url, factor }) => {
      const { chrome } = globalThis as unknown as { chrome: ZoomApi };
      const tab = (await chrome.tabs.query({})).find((tab) => tab.url === url);
      if (!tab) throw new Error('Zoom test tab not found');
      await chrome.tabs.setZoom(tab.id, factor);
      return chrome.tabs.getZoom(tab.id);
    },
    { url: page.url(), factor },
  );
  expect(actual).toBeCloseTo(factor);
  await expect.poll(() => page.evaluate(() => devicePixelRatio)).toBeCloseTo(factor);
}
export { expect };
