// Only current feature destinations are accepted. Never accept schemes, hosts or router outlets.
const DESTINATIONS = new Set(['/dashboard', '/threats', '/devices', '/audit', '/settings']);
export function safeReturnUrl(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\s\\]/.test(value))
    return '/dashboard';
  const path = value.split(/[?#]/, 1)[0];
  return path && (DESTINATIONS.has(path) || /^\/threats\/THR-\d{5}$/.test(path))
    ? value
    : '/dashboard';
}
