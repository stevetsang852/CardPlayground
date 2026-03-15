/**
 * card-tilt.ts
 * Drives CSS custom properties on .drawn-card / .inv-card elements.
 * Ported math from simeydotme/pokemon-cards-css (MIT).
 * Spring physics approach from simeydotme/hover-tilt (MIT).
 *
 * Variables set per-card:
 *   --pointer-x / --pointer-y        mouse % within card (0–100%)
 *   --background-x / --background-y  remapped to 37–63% / 33–67%
 *   --pointer-from-center            0 (centre) → 1 (corner)
 *   --pointer-from-top               0 → 1
 *   --pointer-from-left              0 → 1
 *   --rotate-x / --rotate-y          tilt degrees
 *   --card-opacity                   0 idle → 1 hover (spring)
 *   --card-scale                     1 idle → 1.06 hover (spring)
 */

// ── Spring physics (hover-tilt approach) ──────────────────────────────────────

interface SpringState {
  value: number;
  velocity: number;
  target: number;
  stiffness: number;
  damping: number;
}

function makeSpring(initial: number, stiffness = 0.2, damping = 0.8): SpringState {
  return { value: initial, velocity: 0, target: initial, stiffness, damping };
}

/** Tick one spring step. Returns true if still moving. */
function tickSpring(s: SpringState): boolean {
  const force = (s.target - s.value) * s.stiffness;
  s.velocity = (s.velocity + force) * s.damping;
  s.value += s.velocity;
  return Math.abs(s.velocity) > 0.0001 || Math.abs(s.target - s.value) > 0.0001;
}

// ── Math helpers ──────────────────────────────────────────────────────────────

/** Re-map value from one range to another (pokemon-cards-css Math.js) */
function adjust(value: number, fromMin: number, fromMax: number, toMin: number, toMax: number): number {
  return parseFloat((toMin + (toMax - toMin) * (value - fromMin) / (fromMax - fromMin)).toFixed(3));
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(Math.max(value, min), max);
}

function round(value: number, precision = 3): number {
  return parseFloat(value.toFixed(precision));
}

// ── Per-card state ────────────────────────────────────────────────────────────

interface CardState {
  /** Normalized pointer position 0–1 */
  px: number;
  py: number;
  /** Spring for activation (opacity + scale) */
  activation: SpringState;
  /** Springs for tilt position */
  posX: SpringState;
  posY: SpringState;
  rafId: number | null;
  enterTimeout: ReturnType<typeof setTimeout> | null;
  exitTimeout: ReturnType<typeof setTimeout> | null;
  isActive: boolean;
}

const ENTER_DELAY = 0;
const EXIT_DELAY  = 200;
const TILT_DEG    = 10; // base rotation degrees (× tiltFactor)
const SCALE_HOVER = 1.06;

// ── CSS variable application ──────────────────────────────────────────────────

function applyVars(card: HTMLElement, state: CardState) {
  const nx = state.posX.value; // 0–1
  const ny = state.posY.value; // 0–1
  const px = nx * 100;
  const py = ny * 100;

  const background = {
    x: adjust(px, 0, 100, 37, 63),
    y: adjust(py, 0, 100, 33, 67),
  };

  // hover-tilt rotation formula: rotateX = (y*2-1)*deg, rotateY = (1-x*2)*deg
  const rotX = round((ny * 2 - 1) * TILT_DEG);
  const rotY = round((1 - nx * 2) * TILT_DEG);

  const fromCenter = clamp(
    Math.sqrt((py - 50) ** 2 + (px - 50) ** 2) / 50,
    0, 1
  );

  const opacity = clamp(state.activation.value, 0, 1);
  const scale   = 1 + (SCALE_HOVER - 1) * opacity;

  card.style.setProperty('--pointer-x',          `${round(px)}%`);
  card.style.setProperty('--pointer-y',          `${round(py)}%`);
  card.style.setProperty('--background-x',       `${background.x}%`);
  card.style.setProperty('--background-y',       `${background.y}%`);
  card.style.setProperty('--pointer-from-center', fromCenter.toFixed(3));
  card.style.setProperty('--pointer-from-top',   ny.toFixed(3));
  card.style.setProperty('--pointer-from-left',  nx.toFixed(3));
  card.style.setProperty('--rotate-x',           `${rotX}deg`);
  card.style.setProperty('--rotate-y',           `${rotY}deg`);
  card.style.setProperty('--card-opacity',       opacity.toFixed(3));
  card.style.setProperty('--card-scale',         scale.toFixed(4));

  card.style.transform =
    `perspective(600px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${scale.toFixed(4)})`;
}

// ── Animation loop ────────────────────────────────────────────────────────────

function startLoop(card: HTMLElement, state: CardState) {
  if (state.rafId !== null) return;

  function loop() {
    const aMoving  = tickSpring(state.activation);
    const xMoving  = tickSpring(state.posX);
    const yMoving  = tickSpring(state.posY);

    applyVars(card, state);

    if (aMoving || xMoving || yMoving) {
      state.rafId = requestAnimationFrame(loop);
    } else {
      state.rafId = null;
    }
  }

  state.rafId = requestAnimationFrame(loop);
}

function stopLoop(state: CardState) {
  if (state.rafId !== null) {
    cancelAnimationFrame(state.rafId);
    state.rafId = null;
  }
}

// ── Enter / leave handlers ────────────────────────────────────────────────────

function onEnter(card: HTMLElement, state: CardState, nx: number, ny: number) {
  if (state.exitTimeout !== null) { clearTimeout(state.exitTimeout); state.exitTimeout = null; }
  if (state.enterTimeout !== null) { clearTimeout(state.enterTimeout); state.enterTimeout = null; }

  state.px = nx;
  state.py = ny;

  const activate = () => {
    // Restore normal spring stiffness on re-enter
    state.activation.stiffness = 0.2;
    state.activation.damping   = 0.8;
    state.posX.stiffness = 0.2;
    state.posX.damping   = 0.8;
    state.posY.stiffness = 0.2;
    state.posY.damping   = 0.8;

    state.activation.target = 1;
    state.posX.target = nx;
    state.posY.target = ny;
    state.isActive = true;
    startLoop(card, state);
  };

  if (ENTER_DELAY > 0) {
    state.enterTimeout = setTimeout(activate, ENTER_DELAY);
  } else {
    activate();
  }
}

function onMove(card: HTMLElement, state: CardState, nx: number, ny: number) {
  state.px = nx;
  state.py = ny;
  if (!state.isActive) return;
  state.posX.target = nx;
  state.posY.target = ny;
  startLoop(card, state);
}

function onLeave(card: HTMLElement, state: CardState) {
  if (state.enterTimeout !== null) { clearTimeout(state.enterTimeout); state.enterTimeout = null; }

  state.exitTimeout = setTimeout(() => {
    state.exitTimeout = null;
    // Slow spring on exit (hover-tilt: stiffness*0.2, damping*0.5)
    state.activation.stiffness = 0.2 * 0.2;
    state.activation.damping   = 0.8 * 0.5;
    state.posX.stiffness = 0.2 * 0.2;
    state.posX.damping   = 0.8 * 0.5;
    state.posY.stiffness = 0.2 * 0.2;
    state.posY.damping   = 0.8 * 0.5;

    state.activation.target = 0;
    state.posX.target = 0.5;
    state.posY.target = 0.5;
    state.isActive = false;
    startLoop(card, state);
  }, EXIT_DELAY);
}

// ── Pointer normalisation ─────────────────────────────────────────────────────

function normalizePointer(card: HTMLElement, clientX: number, clientY: number): [number, number] {
  const rect = card.getBoundingClientRect();
  const nx = clamp((clientX - rect.left) / (rect.width  || 1), 0, 1);
  const ny = clamp((clientY - rect.top)  / (rect.height || 1), 0, 1);
  return [nx, ny];
}

// ── Layer injection ───────────────────────────────────────────────────────────

function injectLayers(card: HTMLElement) {
  if (!card.querySelector('.card__shine')) {
    const shine = document.createElement('div');
    shine.className = 'card__shine';
    card.appendChild(shine);
  }
  if (!card.querySelector('.card__glare')) {
    const glare = document.createElement('div');
    glare.className = 'card__glare';
    card.appendChild(glare);
  }
}

// ── Attach ────────────────────────────────────────────────────────────────────

function attachTilt(card: HTMLElement) {
  if (card.dataset.tiltBound) return;
  card.dataset.tiltBound = '1';

  injectLayers(card);

  const state: CardState = {
    px: 0.5, py: 0.5,
    activation: makeSpring(0),
    posX:       makeSpring(0.5),
    posY:       makeSpring(0.5),
    rafId: null,
    enterTimeout: null,
    exitTimeout: null,
    isActive: false,
  };

  card.addEventListener('mouseenter', (e) => {
    const [nx, ny] = normalizePointer(card, e.clientX, e.clientY);
    onEnter(card, state, nx, ny);
  });

  card.addEventListener('mousemove', (e) => {
    const [nx, ny] = normalizePointer(card, e.clientX, e.clientY);
    onMove(card, state, nx, ny);
  });

  card.addEventListener('mouseleave', () => {
    onLeave(card, state);
  });

  card.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    const [nx, ny] = normalizePointer(card, t.clientX, t.clientY);
    onMove(card, state, nx, ny);
    e.preventDefault();
  }, { passive: false });

  card.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    const [nx, ny] = normalizePointer(card, t.clientX, t.clientY);
    onEnter(card, state, nx, ny);
  }, { passive: true });

  card.addEventListener('touchend', () => {
    onLeave(card, state);
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────

const CARD_SELECTOR = '.drawn-card, .inv-card, .cat-card.owned, .detail-card';

function bindAllCards() {
  document.querySelectorAll<HTMLElement>(CARD_SELECTOR).forEach(attachTilt);
}

/** Auto-bind cards injected dynamically */
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!(node instanceof HTMLElement)) continue;
      if (node.matches(CARD_SELECTOR)) attachTilt(node);
      node.querySelectorAll<HTMLElement>(CARD_SELECTOR).forEach(attachTilt);
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });
bindAllCards();
