import { Threat } from '../models/threat.models';
import { SEVERITIES, STATUSES, VECTORS } from '../utils/threat-rules';
const titles = [
  'Credential stuffing detected',
  'Malware signature detected',
  'Phishing message intercepted',
  'Exploit attempt against public service',
  'Unusual outbound network traffic',
  'Sensitive data access anomaly',
  'Suspicious execution chain',
];
export function createThreats(now = new Date()): Threat[] {
  const anchor = Math.floor(now.getTime() / 86400000) * 86400000;
  return Array.from({ length: 200 }, (_, i) => {
    const detectedAt = new Date(anchor - i * 3 * 3600000).toISOString();
    const vector = VECTORS[i % 7];
    const source =
      i % 2 ? `ENG-LT-${String(i + 1).padStart(3, '0')}` : `203.0.113.${(i % 254) + 1}`;
    const target = [
      'Identity Gateway',
      'Production API',
      'Finance workspace',
      'Network perimeter',
      'Endpoint protection',
    ][i % 5];
    return {
      id: `THR-${String(i + 1).padStart(5, '0')}`,
      title: titles[i % 7],
      description: `Sentinel detected activity consistent with ${titles[i % 7].toLowerCase()} affecting ${target}. Correlated telemetry from ${source} exceeded the configured detection threshold. Review the indicators and validate the affected asset before closing this incident. This detection is fictitious.`,
      severity: SEVERITIES[Math.floor(i / 4) % 4],
      status: STATUSES[i % 4],
      vector,
      source,
      target,
      detectedAt,
      updatedAt: new Date(Date.parse(detectedAt) + 60000).toISOString(),
      confidence: 58 + ((i * 17) % 43),
      indicators: [
        { type: 'ip', value: `203.0.113.${(i % 254) + 1}` },
        { type: 'domain', value: `signal-${i + 1}.example.test` },
        {
          type: 'process',
          value: i % 2 ? 'powershell.exe -EncodedCommand [redacted]' : 'auth-gateway /login',
        },
      ],
      timeline: [
        {
          timestamp: detectedAt,
          type: 'detected',
          label: 'Detected',
          description: 'Detection rule triggered by correlated telemetry.',
          actor: 'Detection engine',
        },
        {
          timestamp: new Date(Date.parse(detectedAt) + 60000).toISOString(),
          type: 'enriched',
          label: 'Enriched',
          description: 'Source and target context attached.',
          actor: 'Sentinel enrichment',
        },
      ],
    };
  });
}
