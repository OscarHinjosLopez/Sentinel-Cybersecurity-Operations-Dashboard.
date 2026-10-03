import { test, expect } from '../fixtures/test';
import { navigate } from '../helpers/navigation';
import { criticalThreatEvent, emitRealtime } from '../helpers/realtime';

test('searches, filters, sorts, investigates and resolves a threat as an analyst', async ({
  page,
  loginAs,
}) => {
  await loginAs('analyst');
  await emitRealtime(page, criticalThreatEvent());
  await navigate(page, 'Threats');
  await page.getByRole('searchbox', { name: 'Search threats' }).fill('E2E critical detection');
  await expect(page).toHaveURL(/search=E2E/);
  await page.getByLabel('Severity', { exact: true }).selectOption('critical');
  await page.getByLabel('Status', { exact: true }).selectOption('open');
  await page
    .getByRole('table')
    .getByRole('button', { name: /^Confidence/ })
    .click();
  await expect(page).toHaveURL(/sort=confidence/);
  await page
    .getByRole('table')
    .getByRole('link', { name: /E2E critical detection/ })
    .click();
  await expect(page).toHaveURL(/\/threats\/THR-22001/);
  await page.getByRole('button', { name: 'Start investigation', exact: true }).click();
  await expect(page.getByText('Threat status updated locally.', { exact: true })).toBeVisible();
  await expect(page.getByText('Investigating', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Resolve threat', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Resolve threat?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Resolve threat', exact: true }).click();
  await expect(page.getByText('This investigation is closed.', { exact: true })).toBeVisible();
  await expect(page.getByText('Resolved', { exact: true }).first()).toBeVisible();
});
test('restores threat query filters and preserves them after refresh and reload', async ({
  page,
  loginAs,
}) => {
  await loginAs();
  await page.goto('/threats?severity=critical&status=investigating');
  await expect(page.getByLabel('Severity', { exact: true })).toHaveValue('critical');
  await expect(page.getByLabel('Status', { exact: true })).toHaveValue('investigating');
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled();
  await expect(page).toHaveURL(/severity=critical&status=investigating/);
  await page.reload();
  await expect(page.getByLabel('Status', { exact: true })).toHaveValue('investigating');
  await expect(page.getByLabel('Severity', { exact: true })).toHaveValue('critical');
});
test('lets a viewer search and filter threats but offers no mutations', async ({
  page,
  loginAs,
}) => {
  await loginAs('viewer');
  await emitRealtime(page, criticalThreatEvent());
  await navigate(page, 'Threats');
  await page.getByRole('searchbox', { name: 'Search threats' }).fill('E2E critical detection');
  await page.getByLabel('Severity', { exact: true }).selectOption('critical');
  await page
    .getByRole('table')
    .getByRole('link', { name: /E2E critical detection/ })
    .click();
  await expect(page.getByText(/Read-only access/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start investigation' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Resolve threat', exact: true })).toHaveCount(0);
});
