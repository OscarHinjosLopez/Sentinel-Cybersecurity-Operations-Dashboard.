import { Page, expect } from '@playwright/test';

export async function navigate(
  page: Page,
  destination: 'Dashboard' | 'Threats' | 'Devices' | 'Audit' | 'Settings',
) {
  // Exercise real SPA navigation so local mutations and notifications survive route changes.
  await page.getByRole('button', { name: 'Open command palette', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Command Palette' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('combobox', { name: 'Search commands' }).fill(`Go to ${destination}`);
  await dialog.getByRole('option').click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`/${destination.toLowerCase()}(?:\\?|$)`));
}
