import { test, expect } from '../fixtures/test';
import { assertAccessible } from '../helpers/accessibility';

for (const width of [375, 1440]) {
  test(`${width}px shell, navigation, device list and command palette stay usable`, async ({
    page,
    loginAs,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await loginAs();
    if (width === 375) {
      const trigger = page.getByRole('button', { name: 'Open navigation' });
      await trigger.click();
      await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
      await assertAccessible(page, testInfo);
    }
    await page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Devices', exact: true })
      .click();
    await expect(page).toHaveURL(/\/devices$/);
    await expect(page.getByRole('region', { name: 'Device results' })).toHaveAttribute(
      'aria-busy',
      'false',
    );
    await expect(
      page.getByRole('link', { name: /^[A-Z]{2,3}-(LT|SRV|MOB|VM|WS)-\d{3}/ }).first(),
    ).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (width === 375)
      await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeHidden();
    await page.getByRole('button', { name: 'Open command palette' }).click();
    const dialog = page.getByRole('dialog', { name: 'Command Palette' });
    await expect(dialog.getByRole('combobox', { name: 'Search commands' })).toBeFocused();
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
}
