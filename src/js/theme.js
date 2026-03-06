/**
 * Theme toggle – light / dark mode switching.
 *
 * The FOUC-prevention snippet lives as an inline <script> in index.html
 * so the theme attribute is set before first paint. This module wires
 * up the toggle button and listens for system preference changes.
 */

export function initTheme() {
  const toggle = document.getElementById('themeToggle');
  if (!toggle) return;

  const options = toggle.querySelectorAll('.theme-toggle-option');
  const stored = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initial = stored || (prefersDark ? 'dark' : 'light');

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    options.forEach(opt =>
      opt.classList.toggle('active', opt.dataset.themeValue === theme),
    );
    localStorage.setItem('theme', theme);
  }

  applyTheme(initial);

  toggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    applyTheme(current === 'light' ? 'dark' : 'light');
  });

  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', (e) => {
      if (!localStorage.getItem('theme')) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });
}
