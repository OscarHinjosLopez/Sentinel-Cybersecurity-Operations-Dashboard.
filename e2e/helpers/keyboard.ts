import { expect, Locator, Page } from '@playwright/test';

/** Exercise the real tab order instead of programmatically moving focus. */
export async function tabTo(page: Page, target: Locator, limit = 80) {
  for (let index = 0; index < limit; index++) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  await expect(target, `Target was unreachable after ${limit} Tabs`).toBeFocused();
}
