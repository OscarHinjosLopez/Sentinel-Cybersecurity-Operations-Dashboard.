import { expect, Page } from '@playwright/test';
import { UserRole } from '../../src/app/core/auth/auth.models';
import { demoCredentials } from '../fixtures/accounts';

export class LoginPage {
  constructor(readonly page: Page) {}
  async signIn(role: UserRole = 'admin') {
    const credentials = demoCredentials(role);
    await this.page.getByLabel('Email address', { exact: true }).fill(credentials.email);
    await this.page.getByLabel('Password', { exact: true }).fill(credentials.password);
    await this.page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(this.page).not.toHaveURL(/\/login(?:\?|$)/);
  }
}
