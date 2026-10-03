import { TestBed } from '@angular/core/testing';
import { KpiCard } from './kpi-card';
import { createDashboardSummary } from '../data-access/dashboard.fixtures';
describe('KPI semantic trends', () => {
  it.each([
    { trend: 10, improvement: 'decrease', expected: 'danger' },
    { trend: -10, improvement: 'decrease', expected: 'success' },
    { trend: 10, improvement: 'increase', expected: 'success' },
    { trend: -10, improvement: 'increase', expected: 'danger' },
    { trend: 0, improvement: 'increase', expected: 'neutral' },
  ] as const)('interprets $trend with $improvement correctly', (item) => {
    const fixture = TestBed.createComponent(KpiCard);
    fixture.componentRef.setInput('metric', {
      ...createDashboardSummary('24h', new Date()).metrics[0],
      trend: item.trend,
      improvement: item.improvement,
    });
    expect(fixture.componentInstance.tone()).toBe(item.expected);
  });
  it.each([
    { value: 95, label: 'Excellent' },
    { value: 87, label: 'Good' },
    { value: 60, label: 'Needs attention' },
    { value: 30, label: 'Critical' },
  ])('provides score status $label without relying on color', ({ value, label }) => {
    const fixture = TestBed.createComponent(KpiCard);
    fixture.componentRef.setInput('metric', {
      ...createDashboardSummary('24h', new Date()).metrics[3],
      value,
    });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(label);
  });
});
