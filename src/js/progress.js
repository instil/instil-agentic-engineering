/**
 * Scroll progress bar.
 */

export function initProgress() {
  const fill = document.getElementById('progressFill');
  if (!fill) return;

  const onScroll = () => {
    const doc = document.documentElement;
    const scrollTop = doc.scrollTop || document.body.scrollTop;
    const scrollHeight = doc.scrollHeight - doc.clientHeight;
    const p = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    fill.style.width = `${Math.min(100, Math.max(0, p))}%`;
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}
