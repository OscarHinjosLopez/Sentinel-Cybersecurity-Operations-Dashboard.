import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { init } from 'echarts/core';
import { DashboardChart } from './dashboard-chart';
import { createDashboardSummary } from '../data-access/dashboard.fixtures';
import { UserPreferencesService } from '../../../core/preferences/user-preferences.service';
import { ThemeService } from '../../../core/services/theme.service';

vi.mock('echarts/core', () => ({ init: vi.fn(), use: vi.fn() }));
vi.mock('echarts/charts', () => ({ LineChart: 'line', PieChart: 'pie', BarChart: 'bar' }));
vi.mock('echarts/components', () => ({
  GridComponent: 'grid',
  TooltipComponent: 'tooltip',
  LegendComponent: 'legend',
  AriaComponent: 'aria',
}));
vi.mock('echarts/renderers', () => ({ SVGRenderer: 'svg' }));

describe('Dashboard chart lifecycle and rendering', () => {
  const summary = createDashboardSummary('24h', new Date('2026-10-03T12:00:00Z'));
  let resize: ReturnType<typeof vi.fn>;
  let dispose: ReturnType<typeof vi.fn>;
  let setOption: ReturnType<typeof vi.fn>;
  let disconnect: ReturnType<typeof vi.fn>;
  let observed: ResizeObserverCallback;
  const motion = signal(false);
  const theme = signal<'light' | 'dark'>('light');

  beforeEach(() => {
    resize = vi.fn();
    dispose = vi.fn();
    setOption = vi.fn();
    disconnect = vi.fn();
    motion.set(false);
    theme.set('light');
    vi.mocked(init)
      .mockReset()
      .mockReturnValue({ resize, dispose, setOption } as unknown as ReturnType<typeof init>);
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          observed = callback;
        }
        observe = vi.fn();
        disconnect = disconnect;
      },
    );
    TestBed.configureTestingModule({
      imports: [DashboardChart],
      providers: [
        { provide: UserPreferencesService, useValue: { reducedMotion: motion } },
        { provide: ThemeService, useValue: { mode: theme } },
      ],
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  async function render() {
    const fixture = TestBed.createComponent(DashboardChart);
    fixture.componentRef.setInput('summary', summary);
    fixture.componentRef.setInput('kind', 'activity');
    fixture.componentRef.setInput('description', 'Activity data is available below.');
    await fixture.whenStable();
    return fixture;
  }

  it('initializes once, resizes the instance and disposes both observer and chart', async () => {
    const fixture = await render();
    expect(init).toHaveBeenCalledOnce();
    expect(init).toHaveBeenCalledWith(expect.any(HTMLDivElement), undefined, { renderer: 'svg' });
    expect(setOption.mock.lastCall?.[0].aria.label.description).toBe(
      'Activity data is available below.',
    );
    observed([], {} as ResizeObserver);
    expect(resize).toHaveBeenCalledOnce();
    fixture.destroy();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(dispose).toHaveBeenCalledOnce();
  });
  it('does not redraw for KPI-only changes but updates theme and motion on the same instance', async () => {
    const fixture = await render();
    const count = setOption.mock.calls.length;
    fixture.componentRef.setInput('summary', {
      ...summary,
      metrics: summary.metrics.map((metric) => ({ ...metric, value: metric.value + 1 })),
    });
    await fixture.whenStable();
    expect(setOption).toHaveBeenCalledTimes(count);
    theme.set('dark');
    await fixture.whenStable();
    expect(setOption).toHaveBeenCalledTimes(count + 1);
    motion.set(true);
    await fixture.whenStable();
    expect(setOption.mock.lastCall?.[0].animation).toBe(false);
    expect(init).toHaveBeenCalledOnce();
  });
});
