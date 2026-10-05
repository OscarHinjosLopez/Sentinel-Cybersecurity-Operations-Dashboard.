import { test, expect } from '../fixtures/test';
import { assertAccessible } from '../helpers/accessibility';
import { criticalThreatEvent, emitRealtime } from '../helpers/realtime';

for (const theme of ['light', 'dark'] as const) {
  for (const route of ['/threats/THR-00142', '/devices/DEV-00142']) {
    test(`${route} detail context has no accessibility violations in ${theme}`, async ({
      page,
      loginAs,
    }, testInfo) => {
      await page.addInitScript((theme) => localStorage.setItem('sentinel-theme', theme), theme);
      await loginAs();
      await page.goto(route);
      await expect(
        page
          .getByText('Loading endpoint context…')
          .or(page.getByText('Loading investigation context…')),
      ).toHaveCount(0);
      await expect(
        page.getByRole('heading', {
          name: route.startsWith('/devices') ? 'Device information' : 'Detection Overview',
          exact: true,
        }),
      ).toBeVisible();
      await assertAccessible(page, testInfo);
    });
  }
  for (const route of ['/login', '/dashboard', '/threats', '/devices', '/settings']) {
    test(`${route} has no accessibility violations in ${theme}`, async ({
      page,
      loginAs,
    }, testInfo) => {
      await page.addInitScript((theme) => localStorage.setItem('sentinel-theme', theme), theme);
      if (route === '/login') await page.goto(route);
      else {
        await loginAs();
        await page.goto(route);
        await expect(page.getByRole('button', { name: 'Open command palette' })).toBeVisible();
        if (route !== '/settings') {
          await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled();
        }
      }
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await assertAccessible(page, testInfo);
    });
  }
  test(`palette, notification center and confirmation dialog are accessible in ${theme}`, async ({
    page,
    loginAs,
  }, testInfo) => {
    await page.addInitScript((theme) => localStorage.setItem('sentinel-theme', theme), theme);
    await loginAs();
    await page.getByRole('button', { name: 'Open command palette' }).click();
    await expect(page.getByRole('combobox', { name: 'Search commands' })).toBeFocused();
    await assertAccessible(page, testInfo);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await emitRealtime(page, criticalThreatEvent());
    await page.getByRole('button', { name: 'Notifications, 1 unread', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Notification Center' })).toBeVisible();
    await assertAccessible(page, testInfo);
    await page.keyboard.press('Escape');
    await page.goto('/devices/DEV-00142');
    await page.getByRole('button', { name: 'Isolate device', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Isolate device?' });
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
    await assertAccessible(page, testInfo);
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('button', { name: 'Isolate device', exact: true })).toBeFocused();
  });
}
