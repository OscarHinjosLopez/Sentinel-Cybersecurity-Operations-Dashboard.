import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Logger } from '../errors/logger';
import { httpErrorInterceptor, REPORT_HTTP_FAILURE } from './http-error.interceptor';

describe('HTTP error foundation', () => {
  let http: HttpClient;
  let requests: HttpTestingController;
  let report: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    report = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: Logger, useValue: { report } },
      ],
    });
    http = TestBed.inject(HttpClient);
    requests = TestBed.inject(HttpTestingController);
  });
  afterEach(() => requests.verify());
  it('passes a successful response through without producing diagnostics', () => {
    const received = vi.fn();
    http.get('/api/resource').subscribe(received);
    requests.expectOne('/api/resource').flush({ ok: true });
    expect(received).toHaveBeenCalledWith({ ok: true });
    expect(report).not.toHaveBeenCalled();
  });
  it('preserves the original HTTP error for local handling without retries or default logging', () => {
    const failed = vi.fn();
    http.get('/api/resource').subscribe({ error: failed });
    requests
      .expectOne('/api/resource')
      .flush({ private: 'secret' }, { status: 403, statusText: 'Forbidden' });
    expect(failed.mock.calls[0][0].status).toBe(403);
    expect(failed.mock.calls[0][0].error).toEqual({ private: 'secret' });
    expect(report).not.toHaveBeenCalled();
    requests.expectNone('/api/resource');
  });
  it('reports opt-in safe status metadata without URL, headers or response body', () => {
    const failed = vi.fn();
    http
      .get('/api/private?token=secret', {
        context: new HttpContext().set(REPORT_HTTP_FAILURE, true),
      })
      .subscribe({ error: failed });
    requests
      .expectOne('/api/private?token=secret')
      .flush({ message: 'Private server failure' }, { status: 429, statusText: 'Rate limited' });
    expect(report).toHaveBeenCalledWith({
      source: 'http',
      category: 'recoverable',
      name: 'rate-limited',
      status: 429,
    });
    expect(JSON.stringify(report.mock.calls)).not.toMatch(/private|secret/i);
    expect(failed.mock.calls[0][0].status).toBe(429);
  });
  it('retains the original error even if diagnostic reporting fails', () => {
    report.mockImplementation(() => {
      throw new Error('Logger failed');
    });
    const failed = vi.fn();
    http
      .get('/api/resource', { context: new HttpContext().set(REPORT_HTTP_FAILURE, true) })
      .subscribe({ error: failed });
    requests.expectOne('/api/resource').flush(null, { status: 500, statusText: 'Server error' });
    expect(failed.mock.calls[0][0].status).toBe(500);
  });
});
