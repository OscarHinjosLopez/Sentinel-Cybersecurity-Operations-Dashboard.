import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../../src/app/core/auth/data-access/demo-accounts';
import { UserRole } from '../../src/app/core/auth/auth.models';

export function demoCredentials(role: UserRole) {
  const account = DEMO_ACCOUNTS.find((user) => user.role === role)!;
  return { email: account.email, password: DEMO_PASSWORD };
}
