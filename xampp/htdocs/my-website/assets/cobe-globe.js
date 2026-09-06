const MOVEMENT_DAMPING = 1400;
const GLOBE_CONFIG = {
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.3,
  dark: 0,
  diffuse: 0.4,
  mapSamples: 16000,
  mapBrightness: 1.2,
  baseColor: [1, 1, 1],
  markerColor: [251 / 255, 100 / 255, 21 / 255],
  glowColor: [1, 1, 1],
  markers: [
    { location: [14.5995, 120.9842], size: 0.03 },
    { location: [19.076, 72.8777], size: 0.1 },
    { location: [23.8103, 90.4125], size: 0.05 },
    { location: [30.0444, 31.2357], size: 0.07 },
    { location: [39.9042, 116.4074], size: 0.08 },
    { location: [-23.5505, -46.6333], size: 0.1 },
    { location: [19.4326, -99.1332], size: 0.1 },
    { location: [40.7128, -74.006], size: 0.1 },
    { location: [34.6937, 135.5022], size: 0.05 },
    { location: [41.0082, 28.9784], size: 0.06 }
  ]
};

function loadCobe() {
  return import('https://esm.sh/cobe@0.6.4');
}

function mountGlobe(canvas, createGlobe) {
  let width = 0;
  let phi = 0;
  let pointerX = null;
  let rotation = 0;

  const resize = () => {
    const surface = canvas.parentElement;
    width = Math.min(surface?.clientWidth || canvas.clientWidth || 1, surface?.clientHeight || canvas.clientHeight || 1);
  };
  const setPointer = (value) => {
    pointerX = value;
    canvas.style.cursor = value === null ? 'grab' : 'grabbing';
  };
  const updatePointer = (clientX) => {
    if (pointerX === null) return;
    rotation += (clientX - pointerX) / MOVEMENT_DAMPING;
    pointerX = clientX;
  };

  resize();
  window.addEventListener('resize', resize, { passive: true });
  const globe = createGlobe(canvas, {
    ...GLOBE_CONFIG,
    width: width * 2,
    height: width * 2,
    onRender: (state) => {
      if (pointerX === null) phi += 0.005;
      state.phi = phi + rotation;
      state.width = width * 2;
      state.height = width * 2;
    }
  });
  canvas.classList.add('is-ready');
  canvas.addEventListener('pointerdown', (event) => {
    canvas.setPointerCapture?.(event.pointerId);
    setPointer(event.clientX);
  });
  canvas.addEventListener('pointermove', (event) => updatePointer(event.clientX));
  canvas.addEventListener('pointerup', () => setPointer(null));
  canvas.addEventListener('pointercancel', () => setPointer(null));
}

let cobePromise;

const mountAvailableGlobes = () => {
  const canvases = [...document.querySelectorAll('[data-cobe-globe]:not(.is-ready)')];
  if (!canvases.length) return false;
  cobePromise ||= loadCobe();
  cobePromise
    .then(({ default: createGlobe }) => {
      canvases.forEach((canvas) => mountGlobe(canvas, createGlobe));
    })
    .catch((error) => console.warn('Globe failed to load.', error));
  return true;
};

const observeForGlobes = () => {
  if (mountAvailableGlobes()) return;
  const observer = new MutationObserver(() => {
    if (mountAvailableGlobes()) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });
};

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', observeForGlobes, { once: true });
} else {
  observeForGlobes();
}