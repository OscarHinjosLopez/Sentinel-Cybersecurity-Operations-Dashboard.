import { test, expect } from '../fixtures/test';
import { demoCredentials } from '../fixtures/accounts';
import { tabTo } from '../helpers/keyboard';
import { criticalThreatEvent, emitRealtime } from '../helpers/realtime';
import { assertAccessible } from '../helpers/accessibility';

for (const theme of ['light', 'dark'] as const) {
  test(`device descriptions retain AA contrast during background refresh in ${theme}`, async ({
    page,
    loginAs,
  }) => {
    await page.addInitScript((theme) => localStorage.setItem('sentinel-theme', theme), theme);
    await loginAs();
    await page.goto('/devices');
    await expect(page.locator('.device-display').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled();
    const now = new Date();
    await page.clock.install({ time: now });
    await page.clock.pauseAt(new Date(now.getTime() + 1000));
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    // Advance a render frame while keeping the deterministic 25 ms repository request pending.
    await page.clock.runFor(20);
    const table = page.locator('.table-scroll.refreshing');
    await expect(table).toBeVisible();
    const contrast = await table.evaluate((element) => {
      const rgb = (value: string) =>
        value
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map(Number);
      const background = rgb(getComputedStyle(element.closest('.results')!).backgroundColor);
      const foreground = rgb(getComputedStyle(element.querySelector('.device-display')!).color);
      const opacity = Number(getComputedStyle(element).opacity);
      const rendered = foreground.map(
        (channel, index) => channel * opacity + background[index] * (1 - opacity),
      );
      const luminance = (color: number[]) =>
        color
          .map((channel) => channel / 255)
          .map((channel) =>
            channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
          )
          .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
      const a = luminance(rendered),
        b = luminance(background);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    });
    expect(contrast).toBeGreaterThanOrEqual(4.5);
    await page.clock.runFor(30);
    await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled();
  });
}

test('mobile charts render when their reserved space enters the viewport', async ({
  page,
  loginAs,
}) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await loginAs();
  await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled();
  const activity = page.getByRole('img', { name: /^Threat activity: solid/ });
  const vectors = page.getByRole('img', { name: /^Attack vectors ranked/ });
  await expect(activity).toHaveCount(0);
  await expect(vectors).toHaveCount(0);
  await page.getByText('View activity data', { exact: true }).scrollIntoViewIfNeeded();
  await expect(activity.locator('svg')).toHaveCount(1);
  await expect(vectors).toHaveCount(0);
  await page.getByText('View vector data', { exact: true }).scrollIntoViewIfNeeded();
  await expect(vectors.locator('svg')).toHaveCount(1);
});

test('keyboard-only workflow keeps route context, preserves filter focus and restores dialogs', async ({
  page,
}) => {
  await page.goto('/login');
  const credentials = demoCredentials('admin');
  await tabTo(page, page.getByLabel('Email address', { exact: true }));
  await page.keyboard.type(credentials.email);
  await page.keyboard.press('Tab');
  await page.keyboard.type(credentials.password);
  await tabTo(page, page.getByRole('button', { name: 'Sign in', exact: true }));
  await page.keyboard.press('Enter');
  const main = page.getByRole('main');
  await expect(main).toBeFocused();
  // Shift+Tab reaches the shell controls and sidebar without a mouse or locator.focus().
  await page.keyboard.press('Shift+Tab');
  await tabTo(
    page,
    page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Threats', exact: true }),
  );
  await page.keyboard.press('Enter');
  await expect(main).toBeFocused();
  const search = page.getByRole('searchbox', { name: 'Search threats' });
  await tabTo(page, search);
  await page.keyboard.type('Credential');
  await expect(page).toHaveURL(/search=Credential/);
  await expect(search).toBeFocused();
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Backspace');
  await expect(page).not.toHaveURL(/search=/);
  const severity = page.getByLabel('Severity', { exact: true });
  await tabTo(page, severity);
  await page.keyboard.press('c');
  await page.keyboard.press('Tab');
  await expect(page).toHaveURL(/severity=critical/);
  await expect(main).not.toBeFocused();
  const detail = page.getByRole('link', { name: /THR-\d+/ }).first();
  await tabTo(page, detail);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/threats\/THR-/);
  await expect(main).toBeFocused();
  await page.keyboard.press('Control+k');
  const palette = page.getByRole('dialog', { name: 'Command Palette' });
  const commandSearch = palette.getByRole('combobox', { name: 'Search commands' });
  await expect(commandSearch).toBeFocused();
  await page.keyboard.type('Settings');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/settings$/);
  await expect(main).toBeFocused();
  await tabTo(page, page.getByLabel('Theme', { exact: true }));
  await page.keyboard.press('d');
  await page.keyboard.press('Tab');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await emitRealtime(page, criticalThreatEvent());
  const bell = page.getByRole('button', { name: 'Notifications, 1 unread', exact: true });
  await tabTo(page, bell);
  await page.keyboard.press('Enter');
  const center = page.getByRole('dialog', { name: 'Notification Center' });
  await expect(center.getByRole('button', { name: 'Close notifications' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(bell).toBeFocused();
  await tabTo(page, page.getByRole('button', { name: /user menu/ }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menu')).toBeVisible();
  await page.keyboard.press('ArrowUp');
  await expect(page.getByRole('menuitem', { name: 'Sign out', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/login$/);
});

test('system reduced motion, explicit override and deferred charts remain accessible', async ({
  page,
  loginAs,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await loginAs();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'system');
  await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'true');
  const activity = page.getByRole('img', { name: /^Threat activity: solid/ });
  await expect(activity).toBeVisible();
  await expect(activity.locator('svg')).toHaveCount(1);
  await expect(page.getByText('View activity data', { exact: true })).toBeVisible();
  await assertAccessible(page, testInfo);
  await page.keyboard.press('Control+k');
  const dialog = page.getByRole('dialog', { name: 'Command Palette' });
  await expect(dialog).toBeVisible();
  const durations = await dialog.evaluate((element) => {
    const style = getComputedStyle(element.querySelector('.mat-mdc-dialog-surface')!);
    return { animation: style.animationDuration, transition: style.transitionDuration };
  });
  expect(durations.animation).toBe('1e-05s');
  expect(durations.transition).toBe('1e-05s');
  await page.keyboard.press('Escape');
  await page.goto('/settings');
  await page.getByLabel('Reduced motion', { exact: true }).selectOption('full');
  await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'false');
  await page.reload();
  await expect(page.getByLabel('Reduced motion', { exact: true })).toHaveValue('full');
  await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'false');
  await page.getByLabel('Reduced motion', { exact: true }).selectOption('system');
  await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'true');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'false');
});
