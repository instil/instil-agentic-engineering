/**
 * Split-flap display animation for the main title
 * Characters flip through random letters before settling on the target
 */

import gsap from 'gsap';

const CHARSET = '?:+-*/%=<>!&|^~.,:;{}[]()@#$_\\'.split('');
const WORDS = ['Engineering', 'Delivery', 'Planning', 'Security', 'Operations'];
const WORD_HOLD_DURATION = 600; // ms to show completed word
const WHITE_BOX_DURATION = 20; // ms to show white box
const TERNARY_FLIPS = 2; // number of ternary character flips
const FLIP_SPEED = 20; // ms per flip

let wordRotationRunning = false;

function createCharSpan(char) {
  const span = document.createElement('span');
  span.className = 'split-flap-char';
  span.textContent = char;
  span.style.cssText = `
    display: inline-block;
    border-radius: 2px;
    background: transparent;
    border: 1px solid transparent;
    box-sizing: border-box;
  `;
  return span;
}

function revealCharacter(titleElement, char, callback) {
  const span = createCharSpan(char);
  titleElement.appendChild(span);

  // Lock width based on character
  requestAnimationFrame(() => {
    const width = span.getBoundingClientRect().width;
    span.style.width = `${width}px`;
    span.style.textAlign = 'center';
  });

  // Start with white box
  gsap.set(span, {
    background: 'var(--text-primary)',
    borderColor: 'var(--text-primary)',
    color: 'transparent'
  });

  // After white box duration, start ternary animation
  setTimeout(() => {
    gsap.set(span, {
      background: 'var(--neutral-pill-bg)',
      borderColor: 'var(--text-muted)',
      color: 'var(--text-secondary)'
    });

    let flipCount = 0;
    const flipInterval = setInterval(() => {
      flipCount++;

      if (flipCount >= TERNARY_FLIPS) {
        clearInterval(flipInterval);
        // Reveal final character
        span.textContent = char;
        gsap.to(span, {
          background: 'transparent',
          borderColor: 'transparent',
          color: 'var(--text-primary)',
          duration: 0.15,
          ease: 'power2.out',
          onComplete: callback
        });
      } else {
        // Show random ternary character
        span.textContent = CHARSET[Math.floor(Math.random() * CHARSET.length)];
      }
    }, FLIP_SPEED);
  }, WHITE_BOX_DURATION);
}

function revealWord(titleElement, word, callback) {
  const chars = word.split('');
  let currentIndex = 0;

  function revealNext() {
    if (currentIndex >= chars.length) {
      // Word complete, show cursor
      const cursorSpan = document.createElement('span');
      cursorSpan.className = 'split-flap-cursor';
      cursorSpan.style.cssText = `
        display: inline-block;
        width: 2px;
        height: 1em;
        background: var(--text-primary);
        margin-left: 0.15em;
        vertical-align: baseline;
      `;
      titleElement.appendChild(cursorSpan);
      
      // Blink cursor at standard text cursor pace (530ms cycle)
      gsap.to(cursorSpan, {
        opacity: 0,
        duration: 0.53,
        repeat: -1,
        yoyo: true,
        ease: 'steps(1)'
      });
      
      // Hold cursor, then move to next word
      gsap.delayedCall(0.5, () => {
        gsap.delayedCall(WORD_HOLD_DURATION / 1000, callback);
      });
      return;
    }

    const char = chars[currentIndex];
    currentIndex++;
    
    revealCharacter(titleElement, char, revealNext);
  }

  revealNext();
}

function clearWord(titleElement) {
  titleElement.textContent = '';
}

function runWordRotation(titleElement) {
  if (wordRotationRunning) return;
  wordRotationRunning = true;

  let currentIndex = 0;

  function showNextWord() {
    // Loop infinitely through words
    const word = WORDS[currentIndex % WORDS.length];
    currentIndex++;

    revealWord(titleElement, word, () => {
      // After word is shown and held, clear it and show next
      clearWord(titleElement);
      showNextWord();
    });
  }

  showNextWord();
}

export function initSplitFlapTitle() {
  const titleElement = document.getElementById('splitFlapTitle');
  const wrapperElement = document.getElementById('titleWrapper');
  if (!titleElement) return;

  // Set inline-flex for proper layout
  titleElement.style.display = 'inline-flex';
  titleElement.style.minWidth = '240px';

  // Check for reduced motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  
  if (prefersReducedMotion.matches) {
    titleElement.textContent = 'Engineering';
    return;
  }

  // Run initial sequence after delay
  gsap.delayedCall(0.5, () => {
    runWordRotation(titleElement);
  });

  // Hover interaction removed since animation loops continuously
}
