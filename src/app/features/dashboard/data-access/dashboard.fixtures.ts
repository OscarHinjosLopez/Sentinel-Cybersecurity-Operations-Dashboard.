import { DashboardSummary, DashboardTimeRange, RecentThreat } from '../models/dashboard.models';

export function createDashboardSummary(range: DashboardTimeRange, now: Date): DashboardSummary {
  const factor = range === '24h' ? 1 : range === '7d' ? 6 : 23;
  const length = range === '24h' ? 24 : range === '7d' ? 7 : 30;
  const step = range === '24h' ? 3600000 : 86400000;
  const end = Math.floor(now.getTime() / step) * step;
  const hourlyVolumes = [
    42, 39, 32, 29, 35, 48, 61, 83, 117, 96, 76, 88, 104, 81, 69, 92, 129, 103, 84, 98, 76, 59, 51,
    43,
  ];
  const dailyVolumes = [
    650, 780, 693, 910, 1084, 937, 862, 1240, 1106, 981, 835, 942, 1028, 1310, 1165, 1052, 874, 959,
    1180, 1037, 895, 772, 986, 1094, 1260, 1123, 978, 864, 1062, 1150,
  ];
  const activity = Array.from({ length }, (_, i) => {
    const detected = range === '24h' ? hourlyVolumes[i] : dailyVolumes[i];
    return {
      timestamp: new Date(end - (length - 1 - i) * step).toISOString(),
      detected,
      blocked: Math.floor(detected * (0.78 + (i % 4) * 0.04)),
    };
  });
  const total = activity.reduce((sum, point) => sum + point.detected, 0);
  const critical = Math.floor(total * 0.04),
    high = Math.floor(total * 0.21),
    medium = Math.floor(total * 0.46);
  const vectorNames = [
    'Credential attacks',
    'Malware',
    'Phishing',
    'Exploit attempts',
    'Suspicious network activity',
    'Other',
  ];
  const weights = [0.31, 0.24, 0.19, 0.13, 0.09];
  const counts = weights.map((weight) => Math.floor(total * weight));
  counts.push(total - counts.reduce((a, b) => a + b, 0));
  const countries = [
    { country: 'United States', longitude: -98, latitude: 38 },
    { country: 'Germany', longitude: 10, latitude: 51 },
    { country: 'Brazil', longitude: -52, latitude: -14 },
    { country: 'China', longitude: 104, latitude: 35 },
    { country: 'Russia', longitude: 100, latitude: 61 },
    { country: 'Netherlands', longitude: 5, latitude: 52 },
    { country: 'Singapore', longitude: 104, latitude: 1 },
  ];
  const originWeights = [0.26, 0.19, 0.16, 0.14, 0.11, 0.08];
  const originCounts = originWeights.map((weight) => Math.floor(total * weight));
  originCounts.push(total - originCounts.reduce((a, b) => a + b, 0));
  const events: Omit<RecentThreat, 'id' | 'timestamp'>[] = [
    {
      severity: 'critical',
      title: 'Credential stuffing detected',
      source: '203.0.113.24',
      target: 'Identity Gateway',
      status: 'investigating',
    },
    {
      severity: 'high',
      title: 'Malware signature detected',
      source: 'ENG-LT-042',
      target: 'Endpoint protection',
      status: 'active',
    },
    {
      severity: 'high',
      title: 'Suspicious privilege escalation',
      source: '192.0.2.18',
      target: 'Production API',
      status: 'investigating',
    },
    {
      severity: 'medium',
      title: 'Phishing link blocked',
      source: 'Mail Gateway',
      target: 'Finance workspace',
      status: 'resolved',
    },
    {
      severity: 'medium',
      title: 'Unusual outbound connection',
      source: 'OPS-SRV-008',
      target: 'Network perimeter',
      status: 'active',
    },
    {
      severity: 'low',
      title: 'Port scan blocked',
      source: '198.51.100.42',
      target: 'Public gateway',
      status: 'resolved',
    },
    {
      severity: 'low',
      title: 'Unrecognized sign-in location',
      source: '192.0.2.76',
      target: 'Identity Gateway',
      status: 'resolved',
    },
  ];
  return {
    range,
    generatedAt: now.toISOString(),
    metrics: [
      {
        id: 'active',
        label: 'Active Threats',
        value: 184 + (factor - 1) * 3,
        detail: 'Open incidents requiring review',
        trend: 12.4,
        improvement: 'decrease',
        icon: 'threats',
      },
      {
        id: 'critical',
        label: 'Critical Threats',
        value: 12 + Math.floor(factor / 6),
        detail: 'Priority response required',
        trend: -8.1,
        improvement: 'decrease',
        icon: 'shield',
      },
      {
        id: 'protected',
        label: 'Protected Devices',
        value: 2418,
        supplementaryValue: 2463,
        detail: '98.2% of fleet protected',
        trend: 2.3,
        improvement: 'increase',
        icon: 'devices',
      },
      {
        id: 'score',
        label: 'Security Score',
        value: 87,
        supplementaryValue: 100,
        detail: 'Good',
        trend: 0,
        improvement: 'increase',
        icon: 'audit',
      },
    ],
    activity,
    severities: [
      { severity: 'critical', count: critical },
      { severity: 'high', count: high },
      { severity: 'medium', count: medium },
      { severity: 'low', count: total - critical - high - medium },
    ],
    vectors: vectorNames.map((name, i) => ({ name, count: counts[i] })),
    origins: countries.map((country, i) => ({ ...country, count: originCounts[i] })),
    recent: events.map((event, i) => ({
      ...event,
      id: `event-${i}`,
      timestamp: new Date(now.getTime() - (2 + i * 7) * 60000).toISOString(),
    })),
  };
}
