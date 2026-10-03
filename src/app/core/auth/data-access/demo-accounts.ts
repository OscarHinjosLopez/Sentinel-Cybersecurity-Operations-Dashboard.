import { User, USER_ROLES } from '../auth.models';
// Public fixtures exclusively for the portfolio demo. These are not real credentials.
export const DEMO_PASSWORD = 'Sentinel123!';
export const DEMO_ACCOUNTS: readonly User[] = [
  { id: 'demo-admin', name: 'Alex Morgan', email: 'admin@sentinel.dev', role: USER_ROLES.ADMIN },
  {
    id: 'demo-analyst',
    name: 'Jordan Lee',
    email: 'analyst@sentinel.dev',
    role: USER_ROLES.ANALYST,
  },
  { id: 'demo-viewer', name: 'Taylor Reed', email: 'viewer@sentinel.dev', role: USER_ROLES.VIEWER },
];
