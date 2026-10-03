import { Page, expect } from '@playwright/test';
import { RealtimeEvent } from '../../src/app/core/realtime/realtime.models';
import { createdEvent, liveThreat } from '../../src/app/core/realtime/realtime.test-fixtures';

interface TestBridge {
  emitRealtime(event: RealtimeEvent): void;
  connectionState(): string;
  setDashboardScenario(scenario: 'success' | 'error' | 'empty'): void;
}
declare global {
  interface Window {
    readonly __sentinelTest?: TestBridge;
  }
}

export async function waitForRealtime(page: Page) {
  await expect
    .poll(() => page.evaluate(() => window.__sentinelTest?.connectionState()))
    .toBe('connected');
}
export async function emitRealtime(page: Page, event: RealtimeEvent) {
  await waitForRealtime(page);
  await page.evaluate((event) => window.__sentinelTest!.emitRealtime(event), event);
}
export async function dashboardScenario(page: Page, scenario: 'success' | 'error' | 'empty') {
  await page.evaluate(
    (scenario) => window.__sentinelTest!.setDashboardScenario(scenario),
    scenario,
  );
}
export function criticalThreatEvent(id = 'THR-22001'): RealtimeEvent {
  const timestamp = new Date().toISOString();
  return createdEvent(
    `e2e-created-${id}`,
    liveThreat(id, {
      title: `E2E critical detection ${id}`,
      detectedAt: timestamp,
      updatedAt: timestamp,
      timeline: [{ timestamp, type: 'detected', label: 'Detected' }],
    }),
  );
}
