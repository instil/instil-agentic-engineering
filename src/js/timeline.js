/**
 * Delivery cycle – stage selector with directional slide transitions.
 */

export function initTimeline() {
  const timeline = document.getElementById('deliveryTimeline');
  if (!timeline) return;

  const tabs = Array.from(timeline.querySelectorAll('.timeline-tab'));
  const panels = Array.from(timeline.querySelectorAll('.timeline-panel'));
  const stageContent = timeline.querySelector('.stage-content');

  const stageOrder = { plan: 0, build: 1, ship: 2 };
  let currentStage = 'plan';

  function setStage(stage) {
    if (stage === currentStage) return;

    const currentIndex = stageOrder[currentStage];
    const nextIndex = stageOrder[stage];
    const direction = nextIndex > currentIndex ? 'forward' : 'backward';

    // Apply direction class
    stageContent.setAttribute('data-direction', direction);

    // Update tabs
    tabs.forEach(t => {
      const match = t.dataset.stage === stage;
      t.classList.toggle('active', match);
      t.setAttribute('aria-selected', match ? 'true' : 'false');
    });

    // Update panels
    panels.forEach(p => {
      p.classList.toggle('active', p.dataset.stage === stage);
    });

    currentStage = stage;
  }

  tabs.forEach(t => {
    t.addEventListener('click', () => setStage(t.dataset.stage));
    t.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setStage(t.dataset.stage);
      }
    });
  });

  // Show Plan by default
  setStage('plan');
}
