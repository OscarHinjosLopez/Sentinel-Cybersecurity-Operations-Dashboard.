import { HttpErrorResponse } from '@angular/common/http';
import { classifyHttpError } from './http-error';

describe('HTTP failure contract', () => {
  it.each([
    [401, 'unauthorized', false],
    [403, 'forbidden', false],
    [404, 'not-found', false],
    [429, 'rate-limited', true],
    [500, 'server', true],
    [503, 'server', true],
    [599, 'server', true],
    [0, 'network', true],
    [400, 'unknown', false],
  ])(
    'classifies status %i while retaining recovery ownership in the feature',
    (status, kind, retryable) => {
      const result = classifyHttpError(
        new HttpErrorResponse({
          status: status as number,
          url: '/api/private?token=secret',
          error: { message: 'Private internal failure' },
        }),
      );
      expect(result).toMatchObject({ status, kind, retryable });
      expect(JSON.stringify(result)).not.toMatch(/secret|private|internal/i);
    },
  );
});
