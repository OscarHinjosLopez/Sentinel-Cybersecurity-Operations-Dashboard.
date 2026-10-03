import { HttpErrorResponse } from '@angular/common/http';

export type HttpFailureKind =
  'unauthorized' | 'forbidden' | 'not-found' | 'rate-limited' | 'server' | 'network' | 'unknown';
export interface HttpFailure {
  readonly kind: HttpFailureKind;
  readonly status: number;
  readonly message: string;
  readonly retryable: boolean;
}

// Status-only contract. Never copies URL, server message, response body or authorization headers.
export function classifyHttpError(error: HttpErrorResponse): HttpFailure {
  const status = error.status;
  if (status === 401)
    return {
      kind: 'unauthorized',
      status,
      message: 'Please sign in to continue.',
      retryable: false,
    };
  if (status === 403)
    return {
      kind: 'forbidden',
      status,
      message: 'You do not have permission to perform this action.',
      retryable: false,
    };
  if (status === 404)
    return {
      kind: 'not-found',
      status,
      message: 'The requested resource was not found.',
      retryable: false,
    };
  if (status === 429)
    return {
      kind: 'rate-limited',
      status,
      message: 'Too many requests. Please try again later.',
      retryable: true,
    };
  if (status >= 500 && status <= 599)
    return {
      kind: 'server',
      status,
      message: 'The service is temporarily unavailable.',
      retryable: true,
    };
  if (status === 0)
    return {
      kind: 'network',
      status,
      message: 'Unable to connect. Check your connection and try again.',
      retryable: true,
    };
  return { kind: 'unknown', status, message: 'Unable to complete this request.', retryable: false };
}
