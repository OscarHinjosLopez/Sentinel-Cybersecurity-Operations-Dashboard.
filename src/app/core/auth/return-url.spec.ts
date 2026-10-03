import { safeReturnUrl } from './return-url';

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
