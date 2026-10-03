import { DOCUMENT } from '@angular/common';
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { API_BASE_PATH } from '../config/api.config';
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const document = inject(DOCUMENT);
  const basePath = inject(API_BASE_PATH);
  const token = auth.session()?.accessToken;
  if (!auth.isAuthenticated() || !token) return next(request);
  try {
    const origin = document.location.origin;
    const url = new URL(request.url, document.baseURI);
    const api = new URL(basePath, origin);
    const path = api.pathname.endsWith('/') ? api.pathname.slice(0, -1) : api.pathname;
    if (
      url.origin !== origin ||
      url.username ||
      url.password ||
      (url.pathname !== path && !url.pathname.startsWith(path + '/'))
    )
      return next(request);
  } catch {
    return next(request);
  }
  return next(request.clone({ setHeaders: { Authorization: 'Bearer ' + token } }));
};
