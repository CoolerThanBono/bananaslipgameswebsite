/* ============================================================
   BananaSlipGames — script.js
   Maximum Banana Chaos Edition 🍌
   ============================================================ */

(function () {
  'use strict';

  /* ── Config ── */
  const BANANA        = '🍌';
  const SPAWN_RATE_MS = 280;   // how often a new banana spawns
  const MIN_SPEED     = 4;     // seconds
  const MAX_SPEED     = 9;
  const MIN_SIZE      = 1.0;   // rem
  const MAX_SIZE      = 2.8;
  const TRAIL_THROTTLE= 60;    // ms between trail bananas

  /* ── Banana Rain ── */
  const rainContainer = document.getElementById('banana-rain');

  function spawnFallingBanana() {
    const el = document.createElement('span');
    el.className = 'falling-banana';
    el.textContent = BANANA;

    const size  = rand(MIN_SIZE, MAX_SIZE);
    const speed = rand(MIN_SPEED, MAX_SPEED);
    const left  = rand(0, 98); // % across screen

    el.style.cssText = `
      left: ${left}%;
      font-size: ${size}rem;
      animation-duration: ${speed}s;
      opacity: ${rand(0.5, 1)};
    `;

    rainContainer.appendChild(el);

    // Remove element once the animation completes to avoid DOM bloat
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }

  // Kick off banana rain
  setInterval(spawnFallingBanana, SPAWN_RATE_MS);
  // Spawn a first wave immediately so the screen isn't empty on load
  for (let i = 0; i < 8; i++) {
    setTimeout(spawnFallingBanana, i * 80);
  }

  /* ── Custom Banana Cursor ── */
  const cursor = document.createElement('div');
  cursor.className = 'cursor-banana';
  cursor.textContent = BANANA;
  document.body.appendChild(cursor);

  let mouseX = -999, mouseY = -999;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursor.style.left = mouseX + 'px';
    cursor.style.top  = mouseY + 'px';
  });

  /* ── Cursor Trail ── */
  let lastTrail = 0;

  document.addEventListener('mousemove', (e) => {
    const now = Date.now();
    if (now - lastTrail < TRAIL_THROTTLE) return;
    lastTrail = now;

    const trail = document.createElement('div');
    trail.className = 'cursor-trail';
    trail.textContent = BANANA;
    trail.style.left = e.clientX + 'px';
    trail.style.top  = e.clientY + 'px';
    trail.style.fontSize = rand(0.5, 1.1) + 'rem';

    document.body.appendChild(trail);
    trail.addEventListener('animationend', () => trail.remove(), { once: true });
  });

  /* ── Cursor leaves screen ── */
  document.addEventListener('mouseleave', () => {
    cursor.style.left = '-100px';
  });

  /* ── Click burst ── */
  document.addEventListener('click', (e) => {
    const count = 6;
    for (let i = 0; i < count; i++) {
      const burst = document.createElement('div');
      burst.className = 'cursor-trail';
      burst.textContent = BANANA;
      burst.style.left     = e.clientX + 'px';
      burst.style.top      = e.clientY + 'px';
      burst.style.fontSize = rand(0.8, 1.8) + 'rem';
      // Spread out from click point
      const angle  = (i / count) * 360;
      const dist   = rand(30, 80);
      const dx     = Math.cos(angle * Math.PI / 180) * dist;
      const dy     = Math.sin(angle * Math.PI / 180) * dist;
      burst.style.setProperty('--dx', dx + 'px');
      burst.style.setProperty('--dy', dy + 'px');
      burst.style.animation = 'burstFade 0.7s ease forwards';
      document.body.appendChild(burst);
      burst.addEventListener('animationend', () => burst.remove(), { once: true });
    }
  });

  /* ── Utility ── */
  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

})();
