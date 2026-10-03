import { test as base, expect } from '@playwright/test';
import { UserRole } from '../../src/app/core/auth/auth.models';
import { LoginPage } from '../pages/login.page';

export const test = base.extend<{
  loginAs: (role?: UserRole) => Promise<void>;
  consoleGuard: void;
}>({
  loginAs: async ({ page }, use) => {
    await use(async (role = 'admin') => {
      await page.goto('/login');
      await new LoginPage(page).signIn(role);
      await expect(
        page.getByRole('heading', { name: 'Security Overview', exact: true }),
      ).toBeVisible();
    });
  },
  consoleGuard: [
    async ({ page }, use, testInfo) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      // E2E has no external runtime dependencies; fail unexpected network escapes as well.
      await page.context().route('**/*', (route) => {
        const url = new URL(route.request().url());
        if (url.protocol === 'http:' || url.protocol === 'https:') {
          if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
            errors.push(`Unexpected external request: ${url.origin}`);
            return route.abort();
          }
        }
        return route.continue();
      });
      await use();
      if (errors.length)
        await testInfo.attach('browser-errors', {
          body: JSON.stringify(errors),
          contentType: 'application/json',
        });
      expect(errors, 'Browser must have no uncaught or console errors').toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };
