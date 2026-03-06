/**
 * Animated noise canvas overlay
 * Creates a subtle film grain effect that animates
 */

export function initAnimatedNoise() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = `
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    opacity: 0.03;
    z-index: 1000;
    mix-blend-mode: overlay;
  `;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let animationId;
  let frame = 0;

  const resize = () => {
    // Use half resolution for performance
    canvas.width = window.innerWidth / 2;
    canvas.height = window.innerHeight / 2;
  };

  const generateNoise = () => {
    if (!ctx) return;
    
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const data = imageData.data;

    // Fill with random grayscale noise
    for (let i = 0; i < data.length; i += 4) {
      const value = Math.random() * 255;
      data[i] = value;     // R
      data[i + 1] = value; // G
      data[i + 2] = value; // B
      data[i + 3] = 255;   // A
    }

    ctx.putImageData(imageData, 0, 0);
  };

  const animate = () => {
    frame++;
    // Update every 2 frames for performance while maintaining animated feel
    if (frame % 2 === 0) {
      generateNoise();
    }
    animationId = requestAnimationFrame(animate);
  };

  resize();
  window.addEventListener('resize', resize);
  animate();

  // Return cleanup function
  return () => {
    window.removeEventListener('resize', resize);
    cancelAnimationFrame(animationId);
    canvas.remove();
  };
}
