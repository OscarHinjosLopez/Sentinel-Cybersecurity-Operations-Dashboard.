import { test, expect } from '../fixtures/test';
import { navigate } from '../helpers/navigation';

test('filters high-risk devices and completes scan, isolation and restoration as admin', async ({
  page,
  loginAs,
}) => {
  await loginAs();
  await navigate(page, 'Devices');
  await page.getByLabel('Protection', { exact: true }).selectOption('at-risk');
  await page.getByLabel('Risk', { exact: true }).selectOption('high');
  await page.getByLabel('Status', { exact: true }).selectOption('online');
  await expect(page.getByRole('region', { name: 'Device results' })).toHaveAttribute(
    'aria-busy',
    'false',
  );
  await page.getByRole('table').getByRole('link').first().click();
  await expect(page.getByRole('heading', { name: 'Device information' })).toBeVisible();
  await page.getByRole('button', { name: 'Run security scan', exact: true }).click();
  await expect(page.getByText('Mock security scan completed.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Isolate device', exact: true }).click();
  const isolate = page.getByRole('dialog', { name: 'Isolate device?' });
  await expect(isolate.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await isolate.getByRole('button', { name: 'Isolate device', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Restore device', exact: true })).toBeVisible();
  await expect(page.getByText('Device status updated locally.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Restore device', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Restore device?' })
    .getByRole('button', { name: 'Restore device', exact: true })
    .click();
  await expect(page.getByRole('button', { name: 'Isolate device', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Restore device', exact: true })).toHaveCount(0);
});
for (const role of ['analyst', 'viewer'] as const) {
  test(`allows ${role} device inspection without administrative actions`, async ({
    page,
    loginAs,
  }) => {
    await loginAs(role);
    await page.goto('/devices/DEV-00142');
    await expect(page.getByRole('heading', { name: 'Device information' })).toBeVisible();
    await expect(page.getByText(/Read-only access/)).toBeVisible();
    for (const name of ['Run security scan', 'Isolate device', 'Restore device']) {
      await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
    }
  });
}
