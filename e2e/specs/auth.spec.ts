import { test, expect } from '../fixtures/test';
import { LoginPage } from '../pages/login.page';
import { demoCredentials } from '../fixtures/accounts';
import { navigate } from '../helpers/navigation';

test('redirects an anonymous dashboard visit to login', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login\?returnUrl=/);
  await expect(page.getByRole('heading', { name: 'Sign in to Sentinel' })).toBeVisible();
});
test('signs an administrator into the dashboard', async ({ page, loginAs }) => {
  await loginAs();
  await expect(page).toHaveURL(/\/dashboard$/);
});
test('shows a safe error for invalid credentials and stays anonymous', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(demoCredentials('admin').email);
  await page.getByLabel('Password', { exact: true }).fill('Wrong-password!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(/email|password|credentials/i);
  await expect(page).toHaveURL(/\/login$/);
});
test('returns to the originally requested devices route after login', async ({ page }) => {
  await page.goto('/devices');
  await expect(page).toHaveURL(/\/login\?returnUrl=/);
  await new LoginPage(page).signIn();
  await expect(page).toHaveURL(/\/devices$/);
  await expect(page.getByRole('heading', { name: 'Devices', exact: true })).toBeVisible();
});
test('logout and browser Back cannot restore authenticated access', async ({ page, loginAs }) => {
  await loginAs();
  await navigate(page, 'Threats');
  await page.getByRole('button', { name: /, user menu$/ }).click();
  await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login\?returnUrl=/);
  await expect(page.getByRole('button', { name: /, user menu$/ })).toHaveCount(0);
});
test('rejects an external return URL rather than redirecting out of Sentinel', async ({ page }) => {
  await page.goto('/login?returnUrl=https%3A%2F%2Fexample.invalid%2Fcollect');
  await new LoginPage(page).signIn();
  await expect(page).toHaveURL('http://127.0.0.1:4300/dashboard');
});
