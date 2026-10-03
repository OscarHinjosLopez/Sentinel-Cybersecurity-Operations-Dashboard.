import { safeReturnUrl } from './return-url';

describe('Device detail return URLs', () => {
  it('allows a supported device detail after login', () =>
    expect(safeReturnUrl('/devices/DEV-00142?risk=high')).toBe('/devices/DEV-00142?risk=high'));
  it.each(['/devices/../../login', '/devices/DEV-00142/extra', '//evil.test/devices/DEV-00142'])(
    'rejects unsupported device destinations %s',
    (value) => expect(safeReturnUrl(value)).toBe('/dashboard'),
  );
});

describe('Threat detail return URLs', () => {
  it('preserves valid internal threat detail destinations after login', () =>
    expect(safeReturnUrl('/threats/THR-00001?status=open')).toBe('/threats/THR-00001?status=open'));
  it.each([
    '/threats/../../login',
    '/threats/THR-00001/extra',
    '/threats/https:evil',
    '//evil.test/threats/THR-00001',
  ])('rejects unsupported detail destination %s', (value) =>
    expect(safeReturnUrl(value)).toBe('/dashboard'),
  );
});
describe('safeReturnUrl', () => {
  it.each(['/devices', '/threats?filter=active#details', '/audit', '/settings', '/dashboard'])(
    'accepts internal feature destination %s',
    (url) => expect(safeReturnUrl(url)).toBe(url),
  );
  it.each([
    null,
    undefined,
    '',
    'https://evil.example/devices',
    '//evil.example/devices',
    '/\\evil.example',
    '/devices\\evil',
    ' /devices',
    '/devices\n',
    'javascript:alert(1)',
    '/login',
    '/forbidden',
    '/unknown',
    '/devices(aux:evil)',
    '/%2f%2fevil.example',
    '/devices/../login',
  ])('rejects unsupported or external destination %s', (url) =>
    expect(safeReturnUrl(url)).toBe('/dashboard'),
  );
});
