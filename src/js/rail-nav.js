/**
 * Right-rail navigation – smooth scroll + active-section highlighting.
 * Uses scroll-position-based detection for reliable section tracking.
 */

const MENU_ALIGNMENT_OFFSET = 250; // Align sections with menu position

export function initRailNav() {
  const rail = document.getElementById('railNav');
  if (!rail) return;

  const items = Array.from(rail.querySelectorAll('.rail-pill'));

  // Smooth-scroll on click with offset to align with menu (or center for delivery cycle)
  items.forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const id = a.getAttribute('data-target');
      const el = document.getElementById(id);
      if (el) {
        let targetPosition;
        if (id === 'section-cycle') {
          // Center the middle of the Delivery Cycle element with viewport center
          const elementCenter = el.offsetTop + (el.offsetHeight / 2);
          const viewportCenter = window.innerHeight / 2;
          targetPosition = elementCenter - viewportCenter;
        } else {
          // Align other sections with menu position
          targetPosition = el.offsetTop - MENU_ALIGNMENT_OFFSET;
        }
        window.scrollTo({ 
          top: targetPosition, 
          behavior: 'smooth' 
        });
      }
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

  // Scroll-spy: find which section is currently in the viewport
  function onScroll() {
    const scrollY = window.scrollY;
    const viewportHeight = window.innerHeight;
    const docHeight = document.documentElement.scrollHeight;

    // At bottom of page, activate last section
    if (scrollY + viewportHeight >= docHeight - 50) {
      setActive(sections[sections.length - 1].id);
      return;
    }

    let currentId = sections[0].id;

    // Check each section with its appropriate trigger offset
    for (const { id, el } of sections) {
      let trigger;
      if (id === 'section-cycle') {
        // For Delivery Cycle, activate when element center aligns with viewport center
        const elementCenter = el.offsetTop + (el.offsetHeight / 2);
        const viewportCenter = scrollY + (viewportHeight / 2);
        trigger = elementCenter;
        if (viewportCenter >= trigger) {
          currentId = id;
        }
      } else {
        // For other sections, use standard menu alignment
        trigger = scrollY + MENU_ALIGNMENT_OFFSET;
        if (el.offsetTop <= trigger) {
          currentId = id;
        } else {
          break;
        }
      }
    }

    setActive(currentId);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // Initial check
}
