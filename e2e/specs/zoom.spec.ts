import { test, expect, setBrowserZoom } from '../fixtures/zoom-test';
import { LoginPage } from '../pages/login.page';
import { assertAccessible } from '../helpers/accessibility';

for (const factor of [2, 4]) {
  test(`real browser zoom ${factor * 100}% keeps login, workspace and dialogs operable`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(60000);
    await page.goto('/login');
    await setBrowserZoom(page, factor);
    await expect.poll(() => page.evaluate(() => innerWidth)).toBe(1440 / factor);
    await expect(page.getByLabel('Email address', { exact: true })).toBeVisible();
    await new LoginPage(page).signIn();
    for (const route of [
      '/dashboard',
      '/threats',
      '/devices',
      '/settings',
      '/threats/THR-00142',
      '/devices/DEV-00142',
    ]) {
      await page.goto(route);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      if (route.startsWith('/devices/') || route.startsWith('/threats/'))
        await expect(
          page
            .getByText('Loading endpoint context…')
            .or(page.getByText('Loading investigation context…')),
        ).toHaveCount(0);
      expect(
        await page.evaluate(() => {
          const main = document.querySelector('main')!;
          return (
            document.documentElement.scrollWidth <= innerWidth &&
            main.scrollWidth <= main.clientWidth
          );
        }),
        `No two-dimensional page scrolling at ${route}`,
      ).toBe(true);
    }
    const navigation = page.getByRole('button', { name: 'Open navigation' });
    await navigation.click();
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
    await page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Threats', exact: true })
      .click();
    await expect(page.getByRole('main')).toBeFocused();
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeHidden();
    await page.getByRole('searchbox', { name: 'Search threats' }).fill('Credential');
    await expect(page).toHaveURL(/search=Credential/);
    const trigger = page.getByRole('button', { name: 'Open command palette' });
    await trigger.click();
    const palette = page.getByRole('dialog', { name: 'Command Palette' });
    await expect(palette.getByRole('combobox', { name: 'Search commands' })).toBeFocused();
    await palette.getByRole('combobox', { name: 'Search commands' }).fill('Devices');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    const bell = page.getByRole('button', { name: /^Notifications,/ });
    await bell.click();
    const center = page.getByRole('dialog', { name: 'Notification Center' });
    await expect(center.getByRole('button', { name: 'Close notifications' })).toBeFocused();
    const box = await center.boundingBox();
    const viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    const history = await center
      .getByRole('region', { name: 'Recent notifications' })
      .boundingBox();
    expect(
      history!.height,
      'Room for reading and operating the history at high zoom',
    ).toBeGreaterThanOrEqual(80);
    await assertAccessible(page, testInfo);
    await page.keyboard.press('Escape');
    await expect(bell).toBeFocused();
    await page.keyboard.press('?');
    const help = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
    await expect(help.getByRole('button', { name: 'Close', exact: true })).toBeFocused();
    await assertAccessible(page, testInfo);
    await page.keyboard.press('Escape');
    await page.goto('/devices/DEV-00142');
    const isolate = page.getByRole('button', { name: 'Isolate device', exact: true });
    await isolate.click();
    const confirmation = page.getByRole('dialog', { name: 'Isolate device?' });
    await expect(confirmation.getByRole('button', { name: 'Cancel' })).toBeFocused();
    await assertAccessible(page, testInfo);
    await page.keyboard.press('Escape');
    await expect(isolate).toBeFocused();
  });
}
