import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from '../auth/auth.service';
import { SessionStorage } from '../auth/session-storage';
import { AUTH_API } from '../auth/data-access/auth-api';
import { MOCK_AUTH_LATENCY, MockAuthApi } from '../auth/data-access/mock-auth-api';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../auth/data-access/demo-accounts';
import { MockRealtimeTransport, MOCK_REALTIME_CONFIG } from './mock-realtime.transport';
import { REALTIME_TRANSPORT } from './realtime.transport';
import { RealtimeService } from './realtime.service';
describe('Realtime with the real AuthService lifecycle', () => {
  let auth: AuthService;
  let service: RealtimeService;
  let transport: MockRealtimeTransport;
  let connect: ReturnType<typeof vi.spyOn>;
  let token: string | null;
  beforeEach(() => {
    vi.useFakeTimers();
    token = null;
    TestBed.configureTestingModule({
      providers: [
        RealtimeService,
        MockRealtimeTransport,
        { provide: REALTIME_TRANSPORT, useExisting: MockRealtimeTransport },
        { provide: MOCK_REALTIME_CONFIG, useValue: { connectDelay: 150, interval: 8000 } },
        { provide: AUTH_API, useExisting: MockAuthApi },
        { provide: MOCK_AUTH_LATENCY, useValue: 0 },
        {
          provide: SessionStorage,
          useValue: {
            readToken: () => token,
            writeToken: (value: string) => (token = value),
            clear: () => (token = null),
          },
        },
        { provide: Router, useValue: { navigateByUrl: vi.fn().mockResolvedValue(true) } },
      ],
    });
    auth = TestBed.inject(AuthService);
    service = TestBed.inject(RealtimeService);
    transport = TestBed.inject(MockRealtimeTransport);
    connect = vi.spyOn(transport, 'connect');
    transport.pause();
    TestBed.tick();
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });
  it('successful login connects, logout cancels a pending retry and a second login connects once', async () => {
    const credentials = { email: DEMO_ACCOUNTS[0].email, password: DEMO_PASSWORD };
    const first = auth.login(credentials);
    await vi.advanceTimersByTimeAsync(0);
    expect((await first).success).toBe(true);
    TestBed.tick();
    vi.advanceTimersByTime(150);
    expect(service.connectionState()).toBe('connected');
    expect(connect).toHaveBeenCalledTimes(1);
    transport.simulateDrop();
    await auth.logout();
    TestBed.tick();
    vi.advanceTimersByTime(60000);
    expect(service.connectionState()).toBe('disconnected');
    expect(connect).toHaveBeenCalledTimes(1);
    const second = auth.login(credentials);
    await vi.advanceTimersByTimeAsync(0);
    await second;
    TestBed.tick();
    vi.advanceTimersByTime(150);
    expect(service.connectionState()).toBe('connected');
    expect(connect).toHaveBeenCalledTimes(2);
  });
  it('concurrent session restoration connects only once after authentication', async () => {
    token = `sentinel-demo-token-${DEMO_ACCOUNTS[0].id}`;
    const first = auth.restoreSession();
    const second = auth.restoreSession();
    expect(service.connectionState()).toBe('disconnected');
    await vi.advanceTimersByTimeAsync(0);
    await Promise.all([first, second]);
    TestBed.tick();
    vi.advanceTimersByTime(150);
    expect(connect).toHaveBeenCalledTimes(1);
    expect(service.connectionState()).toBe('connected');
  });
  it('invalid restored session and failed login never open a connection', async () => {
    token = 'invalid-token';
    const restore = auth.restoreSession();
    await vi.advanceTimersByTimeAsync(0);
    await restore;
    TestBed.tick();
    const login = auth.login({ email: DEMO_ACCOUNTS[0].email, password: 'wrong' });
    await vi.advanceTimersByTimeAsync(0);
    await login;
    TestBed.tick();
    expect(connect).not.toHaveBeenCalled();
    expect(service.connectionState()).toBe('disconnected');
  });
});
