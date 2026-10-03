import { test, expect } from '../fixtures/test';
import { dashboardScenario, waitForRealtime } from '../helpers/realtime';

test('loads KPIs, changes ranges, refreshes, changes theme and opens threats', async ({
  page,
  loginAs,
}) => {
  await loginAs();
  const dashboard = page.getByRole('region', { name: 'Security dashboard' });
  await expect(dashboard).toHaveAttribute('aria-busy', 'false');
  for (const metric of ['Active Threats', 'Protected Devices', 'Security Score']) {
    await expect(dashboard.getByText(metric, { exact: true })).toBeVisible();
  }
  await waitForRealtime(page);
  await expect(page.getByRole('banner').getByText('Live', { exact: true })).toBeVisible();
  for (const range of ['7d', '30d', '24h']) {
    await page.getByLabel('Time range').selectOption(range);
    await expect(page.getByLabel('Time range')).toHaveValue(range);
    await expect(dashboard).toHaveAttribute('aria-busy', 'false');
    await expect(
      dashboard.getByRole('heading', { name: 'Threat Activity', exact: true }),
    ).toBeVisible();
  }
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page
    .getByRole('navigation', { name: 'Quick actions' })
    .getByRole('button', { name: 'View threats' })
    .click();
  await expect(page).toHaveURL(/\/threats$/);
});
test('shows safe dashboard error feedback and recovers through Retry', async ({
  page,
  loginAs,
}) => {
  await loginAs();
  await dashboardScenario(page, 'error');
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(/Unable to load/);
  await expect(page.getByRole('alert')).not.toContainText('Mock dashboard unavailable');
  await dashboardScenario(page, 'success');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Threat Activity', exact: true })).toBeVisible();
});
