/**
 * Signal flow animation — crosscut section (v2)
 *
 * Narrative:
 *   ENTRY    → particles spawn at scattered Y positions (disparate, unprocessed input)
 *   REVIEW   → particles smoothly converge back onto the rail (alignment / sorting)
 *   QUALITY  → particles scale up and back at the node centre (measurement / validation)
 *   SECURITY → a double-ring shell pops around each particle (encapsulation / protection)
 *
 * Tweak the constants block to adjust feel without touching logic.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────
const RAIL_Y         = 24;   // px: y of the main flow line — aligns with top border of pillars
const CANVAS_H       = 48;   // px: canvas height — 24px above rail + 24px below
const BASE_SPEED     = 1.2;  // px/frame at 60 fps
const PARTICLE_R     = 1.8;  // px: base particle radius
const TRAIL_LEN      = 28;   // positions kept in trail history

const ENTRY_SCATTER  = 16;   // px: max Y offset on spawn (±) — the "disparate" feel
const REVIEW_SPEED   = 0.82; // speed multiplier inside Review zone
const QUALITY_SPEED  = 0.60; // speed multiplier inside Quality zone
const QUALITY_SCALE  = 2.4;  // peak display-radius multiplier at node centre
const SHELL_MAX_R    = 13;   // px: outer shell radius at full size
const SHELL_LIFE     = 72;   // frames the shell lives
const SHELL_EXPAND   = 16;   // frames for shell to reach full radius
const SHELL_FADE_IN  = 20;   // frames for shell to fade out at end

const SPAWN_MS       = 720;  // ms between spawns at rest
const SPAWN_MS_HOV   = 360;  // ms between spawns when a column is hovered
const MAX_ACTIVE     = 7;

// ─────────────────────────────────────────────────────────────────────────────
// Colour — gradient: #7a3cff → #3a7bff → #2ec7c9
// ─────────────────────────────────────────────────────────────────────────────────
const GRAD_STOPS = [
  { t: 0,   r: 0x7a, g: 0x3c, b: 0xff },
  { t: 0.5, r: 0x3a, g: 0x7b, b: 0xff },
  { t: 1,   r: 0x2e, g: 0xc7, b: 0xc9 },
];

function lerpColor(t) {
  t = Math.max(0, Math.min(1, t));
  let i = 0;
  while (i < GRAD_STOPS.length - 2 && GRAD_STOPS[i + 1].t <= t) i++;
  const a = GRAD_STOPS[i], b = GRAD_STOPS[i + 1];
  const s = (t - a.t) / (b.t - a.t);
  return {
    r: Math.round(a.r + (b.r - a.r) * s),
    g: Math.round(a.g + (b.g - a.g) * s),
    b: Math.round(a.b + (b.b - a.b) * s),
  };
}

function rgba(c, a) {
  return `rgba(${c.r},${c.g},${c.b},${Math.max(0, a).toFixed(3)})`;
}

// Smooth ease-in-out (cubic Hermite)
function easeInOut(t) {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
}

// ─────────────────────────────────────────────────────────────────────────────
// Particle
// ─────────────────────────────────────────────────────────────────────────────
class Particle {
  constructor(totalW, isMobile = false, startX = 0) {
    this.totalW   = totalW;
    this.isMobile = isMobile;
    this.x        = startX;
    this.spawnY   = RAIL_Y + (Math.random() * 2 - 1) * ENTRY_SCATTER;
    this.y        = this.spawnY;
    this.trail    = [];
    this.done     = false;

    // Speed jitter: each particle has a unique pace through the pre-convergence zone
    this.speedJitter = 0.55 + Math.random() * 0.9;

    // Quality: current displayed radius (animated)
    this.r = PARTICLE_R;

    // Security shell — spawned once and stays until particle exits the zone
    this.shell         = null;
    this._shellSpawned = false;
  }

  // ── Zone-aware speed ───────────────────────────────────────────────────────
  _speed(colBounds, hoveredCol) {
    let speed = BASE_SPEED;
    const x   = this.x;
    const col0Mid = colBounds[0].start + (colBounds[0].end - colBounds[0].start) * 0.5;

    // Pre-convergence zone: apply per-particle jitter so they feel irregular
    if (x < col0Mid) speed *= this.speedJitter;

    if (x > colBounds[0].start && x < colBounds[0].end) speed *= REVIEW_SPEED;
    if (x > colBounds[1].start && x < colBounds[1].end) speed *= QUALITY_SPEED;
    if (hoveredCol >= 0
      && x > colBounds[hoveredCol].start
      && x < colBounds[hoveredCol].end) speed *= 0.72;
    return speed;
  }

  update(colBounds, hoveredCol) {
    if (this.done) {
      // Drain the trail one position per frame so it fully disappears
      if (this.trail.length > 0) this.trail.shift();
      return;
    }

    // Track trail before this frame's position is committed
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > TRAIL_LEN) this.trail.shift();

      const [col0, col1, col2] = colBounds;

      // ── REVIEW: wave fades & convergence completes by midpoint ────────────
      if (this.x >= col0.start && this.x <= col0.end) {
        const t = (this.x - col0.start) / (col0.end - col0.start);
        const phase = this.speedJitter * Math.PI * 3;
        const freq  = 0.045;
        const baseAmp = Math.abs(this.spawnY - RAIL_Y) * 0.6 + 4;

        if (t < 0.5) {
          // Remap 0–0.5 to 0–1 for this zone
          const zt = t * 2; // 0 → 1 over the first half

          // Wave amplitude fades: full at zt=0, zero by zt=1
          const waveFade = 1 - easeInOut(zt);
          const waveY    = Math.sin(this.x * freq + phase) * baseAmp * waveFade;

          // Convergence: spawnY → RAIL_Y over same window
          const convY = this.spawnY + (RAIL_Y - this.spawnY) * easeInOut(zt);

          this.y = convY + waveY;
        } else {
          // Locked on rail for the second half
          this.y = RAIL_Y;
        }
      } else if (this.x > col0.end) {
        this.y = RAIL_Y;
      }

      // ── QUALITY: radius swells at node centre via sin envelope ─────────────
      if (this.x >= col1.start && this.x <= col1.end) {
        const t   = (this.x - col1.start) / (col1.end - col1.start);
        const env = Math.sin(t * Math.PI);
        this.r    = PARTICLE_R * (1 + (QUALITY_SCALE - 1) * env);
      } else {
        this.r = PARTICLE_R;
      }

      // ── SECURITY: shell on from 25% in, persists for remainder of run ──────
      if (!this._shellSpawned
          && this.x >= col2.start + (col2.end - col2.start) * 0.25) {
        this._shellSpawned = true;
        this.shell = { age: 0 };
      }
      if (this.shell) {
        this.shell.age++;
      }

    // Advance X — start fading out trail-length before the edge
    this.x += this._speed(colBounds, hoveredCol);
    if (this.x >= this.totalW) this.done = true;
  }

  draw(ctx) {
    // Keep drawing until trail has fully drained, then stop
    if (this.trail.length === 0) return;

    const tNorm = Math.min(this.x / this.totalW, 1);
    const c     = lerpColor(tNorm);

    // ── Trail ─────────────────────────────────────────────────────────────────
    for (let i = 0; i < this.trail.length; i++) {
      const frac = (i + 1) / this.trail.length;
      const pt   = this.trail[i];
      const tc   = lerpColor(pt.x / this.totalW);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, PARTICLE_R * frac * 0.65, 0, Math.PI * 2);
      ctx.fillStyle = rgba(tc, frac * 0.26);
      ctx.fill();
    }

    if (this.done) return;

    // ── Soft glow (scales with current radius) ────────────────────────────────
    const glowR = this.r * 5.5;
    const glow  = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, glowR);
    glow.addColorStop(0, rgba(c, 0.38));
    glow.addColorStop(1, rgba(c, 0));
    ctx.beginPath();
    ctx.arc(this.x, this.y, glowR, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    // ── SECURITY shell rings (always) ──────────────────────────────────────────
    if (this.shell) {
      const { age } = this.shell;
      const fadeStart = SHELL_LIFE - SHELL_FADE_IN;

      // Outer ring: expands quickly, then holds, then fades
      const outerR = SHELL_MAX_R * easeInOut(Math.min(age / SHELL_EXPAND, 1));
      let   outerA = 0.55;
      if (age < SHELL_EXPAND) outerA *= age / SHELL_EXPAND;
      if (age > fadeStart)    outerA *= 1 - (age - fadeStart) / SHELL_FADE_IN;

      ctx.beginPath();
      ctx.arc(this.x, this.y, outerR, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(c, outerA);
      ctx.lineWidth   = 1;
      ctx.stroke();

      // Inner ring: slightly smaller, slightly dimmer, slight delay
      const innerDelay = 8;
      if (age > innerDelay) {
        const innerAge = age - innerDelay;
        const innerR   = SHELL_MAX_R * 0.55
          * easeInOut(Math.min(innerAge / SHELL_EXPAND, 1));
        let   innerA   = outerA * 0.6;
        ctx.beginPath();
        ctx.arc(this.x, this.y, innerR, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(c, innerA);
        ctx.lineWidth   = 0.5;
        ctx.stroke();
      }
    }

    // ── Core dot ──────────────────────────────────────────────────────────────
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = rgba(c, 0.92);
    ctx.fill();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Rail
// ─────────────────────────────────────────────────────────────────────────────
function drawRail(ctx, w) {
  const grd = ctx.createLinearGradient(0, 0, w, 0);
  grd.addColorStop(0,   'rgba(122,60,255,0.45)');
  grd.addColorStop(0.5, 'rgba(58,123,255,0.45)');
  grd.addColorStop(1,   'rgba(46,199,201,0.45)');
  ctx.beginPath();
  ctx.moveTo(0, RAIL_Y);
  ctx.lineTo(w, RAIL_Y);
  ctx.strokeStyle = grd;
  ctx.lineWidth   = 1;
  ctx.stroke();
}

// ─────────────────────────────────────────────────────────────────────────────
// Column bounds — on mobile use virtual thirds of canvas width
// ───────────────────────────────────────────────────────────────────────────────
function getColBounds(pillarsEl, pillars, isMobile) {
  if (isMobile) {
    const w = pillarsEl.offsetWidth;
    const t = w / 3;
    return [
      { start: 0, end: t },
      { start: t, end: t * 2 },
      { start: t * 2, end: w },
    ];
  }
  const cr = pillarsEl.getBoundingClientRect();
  return pillars.map(p => {
    const r = p.getBoundingClientRect();
    return { start: r.left - cr.left, end: r.right - cr.left };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────
export function initSignalFlow() {
  const pillarsEl = document.querySelector('.crosscut-pillars');
  if (!pillarsEl) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const pillars = [...pillarsEl.querySelectorAll('.crosscut-pillar')];

  const canvas = document.createElement('canvas');
  canvas.className = 'signal-rail-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  pillarsEl.prepend(canvas);

  const ctx = canvas.getContext('2d');

  let particles  = [];
  let lastSpawn  = 0;
  let hoveredCol = -1;
  let mobile     = pillarsEl.offsetWidth < 1024;
  let raf;

  // ── Pre-seed ─────────────────────────────────────────────────────────────────
  // Spread MAX_ACTIVE particles evenly across the full width so all zones
  // are populated from the first frame — no empty ramp-up period.
  function preSeed(w) {
    const step = w / MAX_ACTIVE;
    for (let i = 0; i < MAX_ACTIVE; i++) {
      const p = new Particle(w, mobile, step * i + step * 0.1);
      particles.push(p);
    }
  }

  // ── Resize ──────────────────────────────────────────────────────────────────
  function resize() {
    canvas.width  = pillarsEl.offsetWidth;
    canvas.height = CANVAS_H;
    mobile        = pillarsEl.offsetWidth < 1024;
    particles     = [];
    preSeed(canvas.width);
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(pillarsEl);

  // ── Hover ───────────────────────────────────────────────────────────────────
  pillarsEl.addEventListener('mousemove', e => {
    const rect   = pillarsEl.getBoundingClientRect();
    const mx     = e.clientX - rect.left;
    const bounds = getColBounds(pillarsEl, pillars, mobile);
    hoveredCol   = bounds.findIndex(b => mx >= b.start && mx <= b.end);
  });
  pillarsEl.addEventListener('mouseleave', () => { hoveredCol = -1; });

  // ── Spawn ───────────────────────────────────────────────────────────────────
  function maybeSpawn(now) {
    const interval = hoveredCol >= 0 ? SPAWN_MS_HOV : SPAWN_MS;
    const active   = particles.filter(p => !p.done).length;
    if (now - lastSpawn > interval && active < MAX_ACTIVE) {
      particles.push(new Particle(canvas.width, mobile));
      lastSpawn = now;
    }
    // Prune particles whose trail has fully drained
    particles = particles.filter(p => p.trail.length > 0 || !p.done);
  }

  // ── Frame loop ──────────────────────────────────────────────────────────────
  function frame(now) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const bounds = getColBounds(pillarsEl, pillars, mobile);

    drawRail(ctx, canvas.width);
    maybeSpawn(now);

    for (const p of particles) {
      p.totalW = canvas.width;
      p.update(bounds, hoveredCol);
      p.draw(ctx);
    }

    raf = requestAnimationFrame(frame);
  }

  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    canvas.remove();
  };
}
