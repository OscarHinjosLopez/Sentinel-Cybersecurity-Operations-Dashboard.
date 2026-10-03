import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { isPermission } from '../auth/permissions';
export const permissionGuard: CanActivateChildFn = async (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.restoreSession();
  if (!auth.isAuthenticated())
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  const permission: unknown = route.data['permission'];
  return permission === undefined || (isPermission(permission) && auth.hasPermission(permission))
    ? true
    : router.createUrlTree(['/forbidden']);
};
