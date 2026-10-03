import AxeBuilder from '@axe-core/playwright';
import { Page, expect, TestInfo } from '@playwright/test';

export async function assertAccessible(page: Page, testInfo: TestInfo) {
  const report = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  if (report.violations.length) {
    await testInfo.attach('axe-violations', {
      body: JSON.stringify(report.violations, null, 2),
      contentType: 'application/json',
    });
  }
  expect(report.violations, 'No WCAG A/AA violations; no blanket exclusions').toEqual([]);
}
