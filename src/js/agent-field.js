/**
 * Agent field — hero right-hand ambient node network.
 *
 * A sparse set of light-points that drift gently and respond to the
 * split-flap word cycle. Rendered with SVG + GSAP for crisp control.
 *
 * ─── Easy-tweak knobs ────────────────────────────────────────────────────────
 *
 *  NODE_COUNT      How many nodes in the field.
 *  CONNECT_DIST    Max distance (% of field diagonal) for a line to appear.
 *  DRIFT_RANGE     Max px a node drifts from its home position.
 *  DRIFT_DUR_MIN/MAX  Duration of each drift cycle per node.
 *
 * ─── Word-state behaviours ────────────────────────────────────────────────────
 *  Each word maps to a function at the bottom of this file.
 *  They receive the live node/line arrays and the gsap instance.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import gsap from 'gsap';

// ── Config ───────────────────────────────────────────────────────────────────
const NODE_COUNT     = 8;
const CONNECT_DIST   = 0.38;   // fraction of field diagonal
const DRIFT_RANGE    = 14;     // px from home position
const DRIFT_DUR_MIN  = 5;      // seconds
const DRIFT_DUR_MAX  = 11;

// Node base sizes (r) and glow radii — varied per node for organic feel
const NODE_SIZES = [1.6, 2.2, 1.4, 2.6, 1.8, 1.2, 2.0, 1.5];
const GLOW_SIZES = [8,   12,  7,   16,  10,  6,   11,  8  ];

// Opacity band: resting nodes sit between these values
const NODE_OPACITY_MIN = 0.30;
const NODE_OPACITY_MAX = 0.70;

// Line base opacity when connecting
const LINE_OPACITY     = 0.08;

// Colour palette (matches signal-flow gradient)
const COLOURS = {
  primary : '#3a7bff',
  accent  : '#7a3cff',
  teal    : '#2ec7c9',
  white   : '#e8eaf0',
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function rand(min, max) { return min + Math.random() * (max - min); }
function dist2(a, b) { return (a.hx - b.hx) ** 2 + (a.hy - b.hy) ** 2; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ── SVG helpers ──────────────────────────────────────────────────────────────
function svgEl(tag, attrs = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

// ── Build field ──────────────────────────────────────────────────────────────
export function initAgentField(onWordChange) {
  const section = document.getElementById('section-intro');
  if (!section) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // ── SVG container ─────────────────────────────────────────────────────────
  const svg = svgEl('svg', {
    class              : 'agent-field-svg',
    'aria-hidden'      : 'true',
    preserveAspectRatio: 'xMidYMid meet',
  });

  // Defs: reusable glow filter
  const defs   = svgEl('defs');
  const filter = svgEl('filter', { id: 'node-glow', x: '-100%', y: '-100%', width: '300%', height: '300%' });
  const blur   = svgEl('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: '3', result: 'blur' });
  const merge  = svgEl('feMerge');
  const mNode1 = svgEl('feMergeNode', { in: 'blur' });
  const mNode2 = svgEl('feMergeNode', { in: 'SourceGraphic' });
  merge.append(mNode1, mNode2);
  filter.append(blur, merge);
  defs.append(filter);
  svg.append(defs);

  // Layer groups (z-order: nodes behind travellers)
  const nodeGroup     = svgEl('g', { class: 'af-nodes', filter: 'url(#node-glow)' });
  const travelGroup   = svgEl('g', { class: 'af-travellers' });
  svg.append(nodeGroup, travelGroup);

  section.appendChild(svg);

  // ── Dimensions ────────────────────────────────────────────────────────────
  let W = svg.clientWidth;
  let H = svg.clientHeight;

  function updateDimensions() {
    W = svg.clientWidth;
    H = svg.clientHeight;
  }
  window.addEventListener('resize', updateDimensions, { passive: true });

  // ── Home positions — distributed across the full width, vertically centred
  // On mobile (<768) reduce to 4 nodes, spread across full width
  function buildHomePositions(w, h, n) {
    const mobile  = w < 768;
    const xStart  = 0.05;
    const xEnd    = 0.95;
    const yStart  = 0.05;
    const yEnd    = 0.95;
    const pos     = [];
    // Simple Poisson-lite: reject if too close to existing
    let attempts  = 0;
    while (pos.length < n && attempts < n * 40) {
      attempts++;
      const x = rand(xStart, xEnd) * w;
      const y = rand(yStart, yEnd) * h;
      const tooClose = pos.some(p => Math.hypot(p.hx - x, p.hy - y) < w * 0.10);
      if (!tooClose) pos.push({ hx: x, hy: y, x, y });
    }
    return pos;
  }

  // ── Nodes ─────────────────────────────────────────────────────────────────
  let nodes = [];

  function buildNodes() {
    nodeGroup.innerHTML = '';
    const count = W < 768 ? 4 : NODE_COUNT;
    const homes = buildHomePositions(W, H, count);

    nodes = homes.map((pos, i) => {
      const r    = NODE_SIZES[i % NODE_SIZES.length];
      const glow = GLOW_SIZES[i % GLOW_SIZES.length];
      const op   = rand(NODE_OPACITY_MIN, NODE_OPACITY_MAX);

      // Glow disc (larger, very faint)
      const disc = svgEl('circle', {
        r     : glow,
        fill  : COLOURS.primary,
        opacity: op * 0.18,
      });
      // Core dot
      const core = svgEl('circle', {
        r     : r,
        fill  : COLOURS.white,
        opacity: op,
      });
      const g = svgEl('g');
      g.append(disc, core);
      nodeGroup.appendChild(g);

      const node = { ...pos, r, glow, op, el: g, disc, core, driftTween: null };
      return node;
    });

    positionNodes();
    startDrift();
  }

  function positionNodes() {
    nodes.forEach(n => {
      gsap.set(n.el, { x: n.x, y: n.y });
    });
  }

  // ── Drift — each node wanders slowly around its home position ────────────
  function startDrift() {
    nodes.forEach(n => driftNode(n));
  }

  function driftNode(n) {
    const tx  = n.hx + rand(-DRIFT_RANGE, DRIFT_RANGE);
    const ty  = n.hy + rand(-DRIFT_RANGE, DRIFT_RANGE);
    const dur = rand(DRIFT_DUR_MIN, DRIFT_DUR_MAX);

    n.driftTween = gsap.to(n, {
      x: tx, y: ty,
      duration: dur,
      ease    : 'sine.inOut',
      onUpdate: () => {
        gsap.set(n.el, { x: n.x, y: n.y });
      },
      onComplete: () => driftNode(n),
    });
  }

  // ── Travelling light — small dot moves from node A to node B ─────────────
  function sendSignal(fromNode, toNode, opts = {}) {
    // Outer glow halo
    const halo = svgEl('circle', {
      r      : 6,
      fill   : opts.colour || COLOURS.primary,
      opacity: 0,
      filter : 'url(#node-glow)',
    });
    // Core bright dot
    const dot = svgEl('circle', {
      r      : 3,
      fill   : COLOURS.white,
      opacity: 0,
    });
    travelGroup.appendChild(halo);
    travelGroup.appendChild(dot);

    gsap.set(halo, { x: fromNode.x, y: fromNode.y });
    gsap.set(dot,  { x: fromNode.x, y: fromNode.y });

    const dur  = opts.dur  || rand(1.2, 2.2);
    const ease = opts.ease || 'power1.inOut';
    const col  = opts.colour || COLOURS.primary;

    const tl = gsap.timeline({
      onComplete: () => { dot.remove(); halo.remove(); },
    });

    tl.to(halo, { opacity: (opts.opacity || 0.75) * 0.45, duration: 0.15, ease: 'power2.out' })
      .to(dot,  { opacity: opts.opacity || 0.95, duration: 0.15, ease: 'power2.out' }, '<')
      .to(halo, { x: toNode.x, y: toNode.y, duration: dur, ease }, '<')
      .to(dot,  { x: toNode.x, y: toNode.y, duration: dur, ease }, '<')
      .call(() => {
        flashNode(toNode, { peak: 1, dur: 0.45, colour: col });
        ringPulse(toNode, { colour: col, scale: 2.2, opacity: 0.5 });
      }, [], `-=${0.05}`)
      .to(dot,  { opacity: 0, duration: 0.2, ease: 'power2.in' }, `-=${0.2}`)
      .to(halo, { opacity: 0, duration: 0.2, ease: 'power2.in' }, '<');

    return tl;
  }

  // Flash a node briefly (opacity spike then back)
  function flashNode(n, opts = {}) {
    const col  = opts.colour || COLOURS.white;
    const peak = opts.peak   || 1;
    const dur  = opts.dur    || 0.6;
    gsap.to(n.core, { opacity: peak, fill: col, duration: dur * 0.2, ease: 'power2.out',
      onComplete: () => {
        gsap.to(n.core, { opacity: n.op, fill: COLOURS.white, duration: dur * 0.8, ease: 'power2.inOut' });
      }
    });
  }

  // Brief ring pulse that expands and fades from a node
  function ringPulse(n, opts = {}) {
    const ring = svgEl('circle', {
      r      : n.r + 2,
      fill   : 'none',
      stroke : opts.colour || COLOURS.teal,
      'stroke-width': 1,
      opacity: 0,
    });
    svg.appendChild(ring);
    gsap.set(ring, { x: n.x, y: n.y });

    gsap.timeline({ onComplete: () => ring.remove() })
      .to(ring, { attr: { r: opts.radius ?? n.glow * (opts.scale || 2.5) }, opacity: opts.opacity || 0.5, duration: 0.5, ease: 'power1.out' })
      .to(ring, { attr: { r: (opts.radius ?? n.glow * (opts.scale || 2.5)) * 1.15 }, opacity: 0, duration: 1.1, ease: 'power1.out' });
  }

  // ── Ambient chatter — occasional quiet signals between random nodes ────────
  let ambientTimer;
  function scheduleAmbient() {
    clearTimeout(ambientTimer);
    const delay = rand(4000, 9000);
    ambientTimer = setTimeout(() => {
      if (nodes.length >= 2) {
        const a = pick(nodes);
        let b = pick(nodes);
        if (b === a) b = nodes[(nodes.indexOf(a) + 1) % nodes.length];
        sendSignal(a, b);
        if (Math.random() < 0.33) {
          setTimeout(() => sendSignal(b, a, { opacity: 0.4, dur: rand(1.5, 2.5) }), rand(600, 1400));
        }
      }
      scheduleAmbient();
    }, delay);
  }

  // ── Formation engine ──────────────────────────────────────────────────────
  // Moves ALL nodes to target positions then runs the effect.  The formation
  // stays locked until the next word. Participants: full opacity. Bystanders: dimmed.

  let effectTimers = [];

  function runFormation(targets, effect) {
    effectTimers.forEach(t => t.kill());
    effectTimers = [];
    nodes.forEach(n => {
      n.driftTween?.kill();
      n.driftTween = null;
      gsap.killTweensOf(n);
      // Sync visual element to current data position so no jump occurs
      gsap.set(n.el, { x: n.x, y: n.y });
    });

    const participating = new Set(targets.map(t => t.node));
    nodes.forEach(n => {
      gsap.to(n.el, { opacity: participating.has(n) ? 1 : 0.05, duration: 0.45, ease: 'power2.out' });
    });

    let moved = 0;
    targets.forEach(({ node: n, tx, ty }) => {
      gsap.to(n, {
        x: tx, y: ty,
        duration: 0.9,
        ease: 'power2.inOut',
        onUpdate: () => { gsap.set(n.el, { x: n.x, y: n.y }); },
        onComplete: () => {
          moved++;
          if (moved === targets.length) {
            effect(targets.map(t => t.node));
          }
        },
      });
    });
  }

  // Field centre (centred behind both title rows)
  function fieldCentre() {
    return { cx: W * 0.50, cy: H * 0.44 };
  }

  // ── Engineering — equilateral triangle ────────────────────────────────────
  function onEngineering() {
    if (nodes.length < 3) return;
    const { cx, cy } = fieldCentre();
    const r = Math.min(W * 0.30, 300);
    const trio = nodes.slice(0, 3);
    const angles = [-Math.PI / 2, Math.PI / 6, 5 * Math.PI / 6];

    const targets = trio.map((node, i) => ({
      node,
      tx: cx + r * Math.cos(angles[i]),
      ty: cy + r * Math.sin(angles[i]),
    }));

    runFormation(targets, ([a, b, c]) => {
      sendSignal(a, b, { dur: 0.52, colour: COLOURS.primary, opacity: 0.95 });
      sendSignal(b, c, { dur: 0.52, colour: COLOURS.primary, opacity: 0.95 });
      sendSignal(c, a, { dur: 0.52, colour: COLOURS.primary, opacity: 0.95 });
      gsap.delayedCall(0.48, () => {
        sendSignal(a, c, { dur: 0.42, colour: COLOURS.accent, opacity: 0.80 });
        sendSignal(c, b, { dur: 0.42, colour: COLOURS.accent, opacity: 0.80 });
        sendSignal(b, a, { dur: 0.42, colour: COLOURS.accent, opacity: 0.80 });
      });
      gsap.delayedCall(0.95, () => {
        [a, b, c].forEach(n => flashNode(n, { peak: 1, dur: 0.55, colour: COLOURS.white }));
      });
      effectTimers.push(gsap.delayedCall(1.7, () => {
        sendSignal(a, b, { dur: 0.48, colour: COLOURS.primary, opacity: 0.75 });
        sendSignal(b, c, { dur: 0.48, colour: COLOURS.primary, opacity: 0.75 });
        sendSignal(c, a, { dur: 0.48, colour: COLOURS.primary, opacity: 0.75 });
      }));
    });
  }

  // ── Delivery — horizontal pipeline ────────────────────────────────────────
  function onDelivery() {
    const { cx, cy } = fieldCentre();
    const xStart = W * 0.05, xEnd = W * 0.95;
    const n = nodes.length;
    const sorted = [...nodes].sort((a, b) => a.hx - b.hx);
    const targets = sorted.map((node, i) => ({
      node,
      tx: xStart + i * (xEnd - xStart) / Math.max(n - 1, 1),
      ty: cy + (i % 2 === 0 ? -28 : 28),
    }));

    runFormation(targets, (formed) => {
      const hop = 0.34;
      formed.forEach((node, i) => {
        if (i >= formed.length - 1) return;
        gsap.delayedCall(i * hop * 0.88, () => {
          sendSignal(formed[i], formed[i + 1], { dur: hop, colour: COLOURS.primary, opacity: 0.92, ease: 'power1.in' });
          flashNode(formed[i], { peak: 0.75, dur: 0.28, colour: COLOURS.teal });
        });
      });
      gsap.delayedCall((formed.length - 1) * hop * 0.88, () => {
        flashNode(formed[formed.length - 1], { peak: 1, dur: 0.7, colour: COLOURS.white });
        ringPulse(formed[formed.length - 1], { colour: COLOURS.teal, scale: 2.4, opacity: 0.55 });
      });
    });
  }

  // ── Planning — 2-column grid ───────────────────────────────────────────────
  function onPlanning() {
    const { cx, cy } = fieldCentre();
    const cols = 2, cellW = Math.min(W * 0.42, 380), cellH = Math.min(H * 0.32, 160);
    const rows = Math.ceil(nodes.length / cols);
    const gridX = cx - cellW / 2;
    const gridY = cy - ((rows - 1) * cellH) / 2;

    const targets = nodes.map((node, i) => ({
      node,
      tx: gridX + (i % cols) * cellW,
      ty: gridY + Math.floor(i / cols) * cellH,
    }));

    runFormation(targets, (formed) => {
      formed.forEach((n, i) => {
        gsap.delayedCall(i * 0.13, () => {
          flashNode(n, { peak: 0.92, dur: 0.42, colour: COLOURS.white });
          const partner = (i % cols === 0) ? formed[i + 1] : null;
          if (partner) {
            gsap.delayedCall(0.06, () =>
              sendSignal(n, partner, { dur: 0.28, colour: COLOURS.primary, opacity: 0.58 })
            );
          }
        });
      });
    });
  }

  // ── Security — hub + perimeter ring ───────────────────────────────────────
  function onSecurity() {
    const { cx, cy } = fieldCentre();
    const ringR = Math.min(W * 0.34, 340);
    const hub = nodes[0];
    const rim = nodes.slice(1);
    const aStep = (2 * Math.PI) / rim.length;

    const targets = [
      { node: hub, tx: cx, ty: cy },
      ...rim.map((node, i) => ({
        node,
        tx: cx + ringR * Math.cos(i * aStep - Math.PI / 2),
        ty: cy + ringR * Math.sin(i * aStep - Math.PI / 2),
      })),
    ];

    runFormation(targets, (formed) => {
      const centre = formed[0];
      flashNode(centre, { peak: 1, dur: 0.3, colour: COLOURS.teal });
      [0, 0.45, 0.9].forEach((delay, wi) => {
        gsap.delayedCall(delay, () =>
          ringPulse(centre, { colour: COLOURS.teal, radius: ringR * (0.3 + wi * 0.18), opacity: 0.38 - wi * 0.08 })
        );
      });
      formed.slice(1).forEach((n, i) => {
        gsap.delayedCall(0.42 + i * 0.07, () =>
          flashNode(n, { peak: 0.68, dur: 0.38, colour: COLOURS.teal })
        );
      });
      effectTimers.push(gsap.delayedCall(1.8, () => {
        ringPulse(centre, { colour: COLOURS.teal, radius: ringR * 0.5, opacity: 0.18 });
      }));
    });
  }

  // ── Operations — elliptical orbit ─────────────────────────────────────────
  function onOperations() {
    const { cx, cy } = fieldCentre();
    const rx = Math.min(W * 0.46, 440);
    const ry = Math.min(H * 0.42, 200);
    const n  = nodes.length;

    const targets = nodes.map((node, i) => {
      const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
      return { node, tx: cx + rx * Math.cos(angle), ty: cy + ry * Math.sin(angle) };
    });

    runFormation(targets, (formed) => {
      const hop = 0.26;
      formed.forEach((node, i) => {
        const next = formed[(i + 1) % formed.length];
        gsap.delayedCall(i * hop, () => {
          sendSignal(node, next, { dur: hop * 1.15, colour: COLOURS.accent, opacity: 0.88, ease: 'none' });
          flashNode(node, { peak: 0.85, dur: 0.32, colour: COLOURS.accent });
        });
      });
      effectTimers.push(gsap.delayedCall(formed.length * hop + 0.4, () => {
        formed.forEach((node, i) => {
          const next = formed[(i + 1) % formed.length];
          effectTimers.push(gsap.delayedCall(i * hop, () => {
            sendSignal(node, next, { dur: hop * 1.1, colour: COLOURS.accent, opacity: 0.65, ease: 'none' });
          }));
        });
      }));
    });
  }

  // ── Word handler map ──────────────────────────────────────────────────────
  const WORD_HANDLERS = {
    Engineering: onEngineering,
    Delivery   : onDelivery,
    Planning   : onPlanning,
    Security   : onSecurity,
    Operations : onOperations,
  };

  function handleWordChange(word) {
    const handler = WORD_HANDLERS[word];
    if (handler) handler();
  }

  // ── Init ─────────────────────────────────────────────────────────────────
  buildNodes();
  scheduleAmbient();

  // Expose the word-start callback — formations trigger as the word begins animating in
  if (typeof onWordChange === 'function') {
    onWordChange(handleWordChange);
  }

  // Handle resize
  const ro = new ResizeObserver(() => {
    updateDimensions();
    buildNodes();
  });
  ro.observe(section);

  return () => {
    clearTimeout(ambientTimer);
    ro.disconnect();
    window.removeEventListener('resize', updateDimensions);
    svg.remove();
  };
}
