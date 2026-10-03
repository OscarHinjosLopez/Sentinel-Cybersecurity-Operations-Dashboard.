import { test, expect } from '../fixtures/test';
import { demoCredentials } from '../fixtures/accounts';
import { navigate } from '../helpers/navigation';
import { criticalThreatEvent, emitRealtime } from '../helpers/realtime';

for (const shortcut of ['Control+k', 'Meta+k']) {
  test(`${shortcut} searches commands and navigates to threats with the keyboard`, async ({
    page,
    loginAs,
  }) => {
    await loginAs();
    await page.keyboard.press(shortcut);
    const dialog = page.getByRole('dialog', { name: 'Command Palette' });
    const search = dialog.getByRole('combobox', { name: 'Search commands' });
    await expect(search).toBeFocused();
    await search.fill('Threats');
    await search.press('ArrowDown');
    await expect(dialog.getByRole('option').first()).toHaveAttribute('aria-selected', 'true');
    await search.press('Enter');
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/threats$/);
  });
}
test('keyboard login, G sequences and help preserve typing and restore dialog focus', async ({
  page,
}) => {
  await page.goto('/login');
  const credentials = demoCredentials('admin');
  const email = page.getByLabel('Email address');
  const password = page.getByLabel('Password', { exact: true });
  await email.fill(credentials.email);
  await email.press('Tab');
  await expect(password).toBeFocused();
  await password.fill(credentials.password);
  await password.press('Tab');
  await expect(page.getByRole('button', { name: 'Show password' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Security Overview' })).toBeVisible();
  const trigger = page.getByRole('button', { name: 'Open command palette' });
  await trigger.focus();
  await page.keyboard.press('g');
  await page.keyboard.press('t');
  await expect(page).toHaveURL(/\/threats$/);
  const search = page.getByRole('searchbox', { name: 'Search threats' });
  await search.focus();
  await page.keyboard.type('gtd?');
  await expect(search).toHaveValue('gtd?');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(/\/threats(?:\?|$)/);
  await trigger.focus();
  await page.keyboard.press('g');
  await page.keyboard.press('d');
  await expect(page).toHaveURL(/\/dashboard$/);
  await trigger.focus();
  await page.keyboard.press('?');
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await trigger.press('Control+k');
  await expect(page.getByRole('combobox', { name: 'Search commands' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('option').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
test('reads notifications, deduplicates events and navigates to their entity', async ({
  page,
  loginAs,
}) => {
  await loginAs();
  const event = criticalThreatEvent();
  await emitRealtime(page, event);
  await emitRealtime(page, event);
  await emitRealtime(page, criticalThreatEvent('THR-22002'));
  const bell = page.getByRole('button', { name: 'Notifications, 2 unread', exact: true });
  await expect(bell).toBeVisible();
  await bell.click();
  const dialog = page.getByRole('dialog', { name: 'Notification Center' });
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole('button', { name: 'Mark as read: Critical threat detected' })
    .first()
    .click();
  await expect(dialog.getByText('1 unread', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Mark all as read', exact: true }).click();
  await expect(dialog.getByText('0 unread', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Close notifications' }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: 'Notifications, 0 unread', exact: true }).click();
  await dialog.getByRole('button', { name: 'View threat', exact: true }).first().click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/threats\/THR-2200[12]/);
  await expect(page.getByRole('heading', { name: /E2E critical detection/ })).toBeVisible();
});
test('persists preferences and applies default page size without overriding explicit URL state', async ({
  page,
  loginAs,
}) => {
  await loginAs();
  await navigate(page, 'Settings');
  await page.getByRole('switch', { name: 'Compact mode', exact: true }).click();
  await page.getByLabel('Default page size', { exact: true }).selectOption('50');
  await page.getByRole('switch', { name: 'Realtime notifications', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('switch', { name: 'Compact mode', exact: true })).toBeChecked();
  await expect(page.getByLabel('Default page size', { exact: true })).toHaveValue('50');
  await expect(
    page.getByRole('switch', { name: 'Realtime notifications', exact: true }),
  ).not.toBeChecked();
  await expect(page.locator('html')).toHaveAttribute('data-density', 'compact');
  await emitRealtime(page, criticalThreatEvent());
  await expect(
    page.getByRole('button', { name: 'Notifications, 0 unread', exact: true }),
  ).toBeVisible();
  await navigate(page, 'Threats');
  await expect(page.getByRole('link', { name: /E2E critical detection/ })).toBeVisible();
  await expect(page.getByLabel('Rows per page', { exact: true })).toHaveValue('50');
  await page.goto('/devices');
  await expect(page.getByLabel('Rows per page', { exact: true })).toHaveValue('50');
  await page.goto('/devices?pageSize=25');
  await expect(page.getByLabel('Rows per page', { exact: true })).toHaveValue('25');
});
