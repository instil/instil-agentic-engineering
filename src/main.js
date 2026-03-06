/**
 * Application entry point.
 * Imports all styles and initialises every interactive module.
 */

// ── Styles ──
import './styles/variables.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components/progress-bar.css';
import './styles/components/theme-toggle.css';
import './styles/components/rail.css';
import './styles/components/timeline.css';
import './styles/components/agents.css';
import './styles/components/artifacts.css';
import './styles/components/crosscut.css';
import './styles/components/cards.css';
import './styles/components/drawer.css';
import './styles/responsive.css';

// ── Modules ──
import { initTheme } from './js/theme.js';
import { initTimeline } from './js/timeline.js';
import { initRailNav } from './js/rail-nav.js';
import { initDrawer } from './js/drawer.js';
import { initProgress } from './js/progress.js';
import { initReveal } from './js/reveal.js';
import { initAnimatedNoise } from './js/animated-noise.js';
import { initSplitFlapTitle } from './js/split-flap-title.js';

// ── Boot ──
initTheme();
initTimeline();
initRailNav();
initDrawer();
initProgress();
initReveal();
initAnimatedNoise();
initSplitFlapTitle();
