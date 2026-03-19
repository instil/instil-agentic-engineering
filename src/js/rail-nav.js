/**
 * Right-rail navigation – smooth scroll + active-section highlighting.
 * Centers sections in viewport based on geometry, not hardcoded offsets.
 */

export function initRailNav() {
  const rail = document.getElementById('railNav');
  if (!rail) return;

  const items = Array.from(rail.querySelectorAll('.rail-pill'));

  // Smooth-scroll on click: scroll section to top of viewport
  items.forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const id = a.getAttribute('data-target');
      const el = document.getElementById(id);
      if (!el) return;

      // Calculate position to place section at top of viewport
      const rect = el.getBoundingClientRect();
      const absoluteTop = window.scrollY + rect.top;
      
      // Scroll to position section at top
      window.scrollTo({ 
        top: absoluteTop, 
        behavior: 'smooth' 
      });
    });
  });

  // Build ordered list of sections
  const sections = items
    .map((i) => {
      const id = i.getAttribute('data-target');
      const el = document.getElementById(id);
      return el ? { id, el } : null;
    })
    .filter(Boolean);

  function setActive(id) {
    items.forEach((i) =>
      i.classList.toggle('active', i.getAttribute('data-target') === id),
    );
  }

  // Scroll-spy: activate section nearest to viewport center
  function onScroll() {
    const scrollY = window.scrollY;
    const viewportCenter = scrollY + (window.innerHeight / 2);

    // Special case: if near top of page, activate intro
    if (scrollY < window.innerHeight / 3) {
      setActive('section-intro');
      return;
    }

    let closestSection = sections[0];
    let closestDistance = Infinity;

    for (const section of sections) {
      const rect = section.el.getBoundingClientRect();
      const absoluteTop = scrollY + rect.top;
      const sectionCenter = absoluteTop + (rect.height / 2);
      const distance = Math.abs(sectionCenter - viewportCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestSection = section;
      }
    }

    setActive(closestSection.id);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // Initial check
}
