import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
  viewChild,
  untracked,
} from '@angular/core';
import { init, use, EChartsType } from 'echarts/core';
import { LineChart, PieChart, BarChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  AriaComponent,
} from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import type { EChartsOption } from 'echarts';
import { ThemeService } from '../../../core/services/theme.service';
import { DashboardSummary } from '../models/dashboard.models';
use([
  LineChart,
  PieChart,
  BarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  AriaComponent,
  SVGRenderer,
]);
@Component({
  selector: 'app-dashboard-chart',
  template: '<div #container class="chart" role="img" [attr.aria-label]="description()"></div>',
  styles: ':host{display:block;min-width:0}.chart{height:19rem;width:100%}',
})
export class DashboardChart implements OnDestroy {
  readonly summary = input.required<DashboardSummary>();
  readonly kind = input.required<'activity' | 'severity' | 'vectors'>();
  readonly description = input.required<string>();
  private readonly container = viewChild.required<ElementRef<HTMLDivElement>>('container');
  private readonly theme = inject(ThemeService);
  private readonly document = inject(DOCUMENT);
  private chart?: EChartsType;
  private readonly dataset = computed(() =>
    this.kind() === 'activity'
      ? this.summary().activity
      : this.kind() === 'severity'
        ? this.summary().severities
        : this.summary().vectors,
  );
  private readonly range = computed(() => this.summary().range);
  private observer?: ResizeObserver;
  constructor() {
    afterNextRender(() => {
      this.chart = init(this.container().nativeElement, undefined, { renderer: 'svg' });
      this.observer = new ResizeObserver(() => this.chart?.resize());
      this.observer.observe(this.container().nativeElement);
      this.render();
    });
    effect(() => {
      this.dataset();
      this.range();
      this.kind();
      this.theme.mode();
      untracked(() => this.render());
    });
  }
  private render(): void {
    if (!this.chart) return;
    const probe = this.document.createElement('span');
    this.document.body.append(probe);
    const color = (token: string): string => {
      probe.style.color = `var(--sentinel-${token})`;
      return getComputedStyle(probe).color;
    };
    const primary = color('primary'),
      success = color('success'),
      text = color('text-secondary'),
      border = color('border'),
      surface = color('surface');
    const colors = ['critical', 'high', 'medium', 'low'].map(color);
    probe.remove();
    const data = this.summary();
    const option: EChartsOption = {
      animation: !this.document.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches,
      textStyle: { color: text, fontFamily: 'Segoe UI, Arial, sans-serif' },
      tooltip: {
        trigger: this.kind() === 'activity' ? 'axis' : 'item',
        renderMode: 'richText',
        backgroundColor: surface,
        borderColor: border,
        textStyle: { color: text },
        confine: true,
      },
      aria: { enabled: true, decal: { show: true } },
    };
    if (this.kind() === 'activity')
      Object.assign(option, {
        color: [primary, success],
        legend: { bottom: 0, textStyle: { color: text }, selectedMode: false },
        grid: { left: 45, right: 16, top: 20, bottom: 65 },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: data.activity.map((point) =>
            new Intl.DateTimeFormat(
              'en',
              data.range === '24h'
                ? { hour: '2-digit', hour12: false }
                : { month: 'short', day: 'numeric' },
            ).format(new Date(point.timestamp)),
          ),
          axisLine: { lineStyle: { color: border } },
          axisLabel: { color: text, hideOverlap: true },
          axisTick: { show: false },
        },
        yAxis: {
          type: 'value',
          min: 0,
          axisLabel: { color: text },
          splitLine: { lineStyle: { color: border, type: 'dashed' } },
        },
        series: [
          {
            name: 'Detected',
            type: 'line',
            showSymbol: false,
            data: data.activity.map((point) => point.detected),
            lineStyle: { width: 2.5 },
            areaStyle: { opacity: 0.07 },
          },
          {
            name: 'Blocked',
            type: 'line',
            showSymbol: false,
            data: data.activity.map((point) => point.blocked),
            lineStyle: { width: 2, type: 'dashed' },
          },
        ],
      });
    else if (this.kind() === 'severity')
      Object.assign(option, {
        color: colors,
        series: [
          {
            type: 'pie',
            radius: ['48%', '72%'],
            center: ['50%', '48%'],
            label: { show: false },
            data: data.severities.map((item) => ({ name: item.severity, value: item.count })),
            emphasis: { scale: false },
          },
        ],
      });
    else {
      const vectors = [...data.vectors].sort((a, b) => b.count - a.count);
      Object.assign(option, {
        grid: { left: 8, right: 50, top: 10, bottom: 30, containLabel: true },
        xAxis: {
          type: 'value',
          axisLabel: { color: text },
          splitLine: { lineStyle: { color: border, type: 'dashed' } },
        },
        yAxis: {
          type: 'category',
          inverse: true,
          data: vectors.map((vector) =>
            vector.name === 'Suspicious network activity' ? 'Network activity' : vector.name,
          ),
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: text, fontSize: 11 },
        },
        series: [
          {
            type: 'bar',
            data: vectors.map((vector) => vector.count),
            barMaxWidth: 16,
            itemStyle: { color: primary, borderRadius: [0, 3, 3, 0] },
            label: { show: true, position: 'right', color: text },
          },
        ],
      });
    }
    this.chart.setOption(option, { notMerge: true });
  }
  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.chart?.dispose();
  }
}
