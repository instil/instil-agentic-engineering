/**
 * verb-cycle.js
 * Cycles a single inline word through a list using a simple split-flap reveal,
 * mirroring the style of split-flap-title.js but lightweight and self-contained.
 */

import gsap from 'gsap';

const WORDS   = ['deliver', 'build', 'engineer', 'ship', 'create'];
const CHARSET = '?:+-*/=<>!&|^~._\\'.split('');
const HOLD    = 2800;   // ms each word is shown
const FLIPS   = 2;      // random char flips before settling
const FLIP_MS = 20;     // ms per flip frame

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function animateWord(el, word, onDone) {
  // Fade out current text first
  gsap.to(el, {
    opacity: 0, duration: 0.18, ease: 'power2.in',
    onComplete: () => {
      el.textContent = '';
      el.style.opacity = 1;

      // Reveal character by character
      const chars = word.split('');
      let i = 0;

      function nextChar() {
        if (i >= chars.length) {
          // Hold then call done
          setTimeout(onDone, HOLD);
          return;
        }
        const ch = chars[i++];
        let flips = 0;

        // Flash white-box briefly
        const span = document.createElement('span');
        span.textContent = ch;
        span.style.cssText = `
          display: inline-block;
          background: var(--text-primary);
          color: transparent;
          border-radius: 2px;
        `;
        el.appendChild(span);

        setTimeout(() => {
          span.style.background = 'var(--neutral-pill-bg)';
          span.style.color = 'var(--text-secondary)';

          const iv = setInterval(() => {
            flips++;
            if (flips >= FLIPS) {
              clearInterval(iv);
              span.textContent = ch;
              gsap.to(span, {
                background: 'transparent',
                color: 'var(--text-primary)',
                duration: 0.12,
                ease: 'power2.out',
                onComplete: nextChar,
              });
            } else {
              span.textContent = rand(CHARSET);
            }
          }, FLIP_MS);
        }, 18);
      }

      nextChar();
    },
  });
}

export function initVerbCycle() {
  const el = document.getElementById('verbCycle');
  if (!el) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let idx = 0;

  function showNext() {
    idx = (idx + 1) % WORDS.length;
    animateWord(el, WORDS[idx], showNext);
  }

  // Start cycling after initial hold
  setTimeout(showNext, HOLD);
}
