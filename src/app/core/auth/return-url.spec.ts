import { safeReturnUrl } from './return-url';
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
