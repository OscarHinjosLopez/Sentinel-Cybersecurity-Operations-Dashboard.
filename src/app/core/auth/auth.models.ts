export const USER_ROLES = { ADMIN: 'admin', ANALYST: 'analyst', VIEWER: 'viewer' } as const;
export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
export const ROLE_LABELS: Readonly<Record<UserRole, string>> = {
  admin: 'Administrator',
  analyst: 'Security Analyst',
  viewer: 'Viewer',
};
export const PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard:view',
  THREATS_VIEW: 'threats:view',
  THREATS_INVESTIGATE: 'threats:investigate',
  DEVICES_VIEW: 'devices:view',
  DEVICES_MANAGE: 'devices:manage',
  AUDIT_VIEW: 'audit:view',
  SETTINGS_VIEW: 'settings:view',
} as const;
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
export interface User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: UserRole;
}
export interface AuthSession {
  readonly user: User;
  readonly accessToken: string;
}
export interface LoginCredentials {
  readonly email: string;
  readonly password: string;
}
export type AuthResult =
  | { readonly success: true; readonly session: AuthSession }
  | {
      readonly success: false;
      readonly error:
        'invalid-credentials' | 'invalid-session' | 'unavailable' | 'cancelled' | 'busy';
    };
