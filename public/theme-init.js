// Runs before styles/Angular. Keep the preference key aligned with ThemeService.
(() => {
  let saved;
  try {
    saved = localStorage.getItem('sentinel-theme');
  } catch {
    /* Storage may be unavailable. */
  }
  const mode =
    saved === 'light' || saved === 'dark'
      ? saved
      : matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
  document.documentElement.dataset.theme = mode;
})();
