/**
 * Snap-scroll between .chapter sections on wheel/key events.
 * Filters trackpad inertia by detecting when deltaY is decreasing
 * (the tail of a swipe gesture) vs increasing (a new intentional scroll).
 */
export function initSnapScroll() {
  const sections = Array.from(document.querySelectorAll('.chapter'));
  if (!sections.length) return;

  let currentIndex = 0;
  let locked = false;
  let prevAbsDelta = 0;
  let prevTime = 0;

  function scrollTo(index) {
    if (index < 0 || index >= sections.length || locked) return;
    currentIndex = index;
    locked = true;

    if (index === 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      sections[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    setTimeout(() => { locked = false; }, 600);
  }

  // Detect current section on load
  function detectCurrent() {
    const vc = window.scrollY + window.innerHeight / 2;
    let closest = 0;
    let minDist = Infinity;
    sections.forEach((s, i) => {
      const r = s.getBoundingClientRect();
      const center = window.scrollY + r.top + r.height / 2;
      const d = Math.abs(center - vc);
      if (d < minDist) { minDist = d; closest = i; }
    });
    currentIndex = closest;
  }

  detectCurrent();

  window.addEventListener('wheel', (e) => {
    if (window.innerWidth <= 768) return;
    e.preventDefault();
    if (locked) return;

    const now = Date.now();
    const absDelta = Math.abs(e.deltaY);

    // If delta is shrinking, it's trackpad inertia — ignore
    if (absDelta <= prevAbsDelta && now - prevTime < 200) {
      prevAbsDelta = absDelta;
      prevTime = now;
      return;
    }

    prevAbsDelta = absDelta;
    prevTime = now;

    // Ignore tiny deltas (resting fingers on trackpad)
    if (absDelta < 5) return;

    // Re-detect current section in case rail nav or other scroll changed position
    detectCurrent();

    scrollTo(currentIndex + (e.deltaY > 0 ? 1 : -1));
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (window.innerWidth <= 768) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      e.preventDefault();
      scrollTo(currentIndex + 1);
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      scrollTo(currentIndex - 1);
    }
  });
}
