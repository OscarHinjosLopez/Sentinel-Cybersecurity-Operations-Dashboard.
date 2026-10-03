import { bootstrapApplication } from '@angular/platform-browser';
import { App } from '../app/app';
import { appConfig } from '../app/app.config';
import {
  MOCK_REALTIME_CONFIG,
  MockRealtimeTransport,
} from '../app/core/realtime/mock-realtime.transport';
import { RealtimeService } from '../app/core/realtime/realtime.service';
import { DASHBOARD_MOCK_CONFIG } from '../app/features/dashboard/data-access/dashboard.repository';
import { THREAT_MOCK_CONFIG } from '../app/features/threats/data-access/threat.repository';
import { DEVICE_MOCK_CONFIG } from '../app/features/devices/data-access/device.repository';

// Replaces main.ts only in the e2e build. No bridge or test providers enter production.
const dashboard = { latency: 25, scenario: 'success' as 'success' | 'error' | 'empty' };
bootstrapApplication(App, {
  providers: [
    ...appConfig.providers,
    { provide: MOCK_REALTIME_CONFIG, useValue: { connectDelay: 1, interval: 3600000 } },
    { provide: DASHBOARD_MOCK_CONFIG, useValue: dashboard },
    { provide: THREAT_MOCK_CONFIG, useValue: { latency: 25, scenario: 'success' } },
    { provide: DEVICE_MOCK_CONFIG, useValue: { latency: 25, scenario: 'success' } },
  ],
}).then((app) => {
  const transport = app.injector.get(MockRealtimeTransport);
  transport.pause();
  Object.defineProperty(window, '__sentinelTest', {
    value: Object.freeze({
      emitRealtime: (event: unknown) => transport.emitForTesting(event),
      connectionState: () => app.injector.get(RealtimeService).connectionState(),
      setDashboardScenario: (scenario: typeof dashboard.scenario) => {
        dashboard.scenario = scenario;
      },
    }),
  });
});
