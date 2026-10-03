import { test, expect } from '../fixtures/test';

test('allows an administrator direct access to every existing workspace', async ({
  page,
  loginAs,
}) => {
  await loginAs('admin');
  for (const [route, heading] of [
    ['/dashboard', 'Security Overview'],
    ['/threats', 'Threats'],
    ['/devices', 'Devices'],
    ['/audit', 'Audit Log'],
    ['/settings', 'Settings'],
  ]) {
    await page.goto(route);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${route}$`));
  }
});
test('allows analyst audit access but rejects settings by direct URL and command', async ({
  page,
  loginAs,
}) => {
  await loginAs('analyst');
  await page.goto('/audit');
  await expect(page.getByRole('heading', { name: 'Audit Log', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open command palette' }).click();
  await expect(page.getByRole('option').filter({ hasText: 'Go to Settings' })).toHaveCount(0);
  await expect(page.getByRole('option').filter({ hasText: 'Go to Audit' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.goto('/settings');
  await expect(page).toHaveURL(/\/forbidden$/);
  await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
});
test('rejects viewer audit and settings direct URLs and hides their commands', async ({
  page,
  loginAs,
}) => {
  await loginAs('viewer');
  await page.getByRole('button', { name: 'Open command palette' }).click();
  await expect(page.getByRole('option').filter({ hasText: 'Go to Audit' })).toHaveCount(0);
  await expect(page.getByRole('option').filter({ hasText: 'Go to Settings' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  for (const path of ['/audit', '/settings']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/forbidden$/);
    await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
  }
});
