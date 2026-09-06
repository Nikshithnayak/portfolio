const INTRO_SHUFFLE_TRACK_IDS = [
  'youtube-fakemink-essex-girls',
  'youtube-fakemink-burn-it',
  'youtube-fakemink-under-your-skin'
];
const PRODUCTION_TRACK_ID = chooseIntroTrackId(INTRO_SHUFFLE_TRACK_IDS);
const PRODUCTION_TRACK_IDS = [
  'youtube-fakemink-essex-girls',
  'youtube-fakemink-51-ttashpel-pony-ave',
  'youtube-fakemink-playlist',
  'youtube-ragebait',
  'youtube-terrified',
  'youtube-buckshot-fakemink-fever',
  'youtube-fakemink-the-mercer',
  'youtube-fakemink-easter-pink',
  'youtube-fakemink-braces',
  'youtube-fakemink-under-your-skin',
  'youtube-fakemink-burn-it'
];
const INTRO_CLICK_AUDIO_FADE_MS = 6800;
const INTRO_CLICK_AUDIO_TARGET_VOLUME = 100;
const INTRO_PLAYER_READY_TIMEOUT_MS = 12000;

let productionTrackReadyPromise = null;
let introPlaybackStarted = false;

function chooseIntroTrackId(trackIds) {
  const ids = Array.isArray(trackIds) ? trackIds.filter(Boolean) : [];
  if (!ids.length) return '';
  const index = randomIntroTrackIndex(ids.length);
  return ids[index] || ids[0];
}

function randomIntroTrackIndex(count) {
  if (count <= 1) return 0;
  const cryptoObject = globalThis.crypto;
  if (cryptoObject?.getRandomValues) {
    const values = new Uint32Array(1);
    cryptoObject.getRandomValues(values);
    return values[0] % count;
  }
  return Math.floor(Math.random() * count);
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function emitIntroEvent(name, detail = {}) {
  window.__portfolioIntroState = {
    ...(window.__portfolioIntroState || {}),
    [name]: { detail, at: performance.now() }
  };
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function withTimeout(promise, timeoutMs, fallback = false) {
  let timer = 0;
  return Promise.race([
    Promise.resolve(promise),
    new Promise((resolve) => {
      timer = window.setTimeout(() => resolve(fallback), timeoutMs);
    })
  ]).finally(() => window.clearTimeout(timer));
}

function selectProductionTrack(app) {
  const tracks = app?.music?.tracks || [];
  const index = tracks.findIndex((track) => track.id === PRODUCTION_TRACK_ID);
  if (index < 0) return false;
  if (app.music.selectedIndex !== index) app.music.selectTrack(index, { playIfNeeded: false });
  return true;
}

function isProductionTrackReady(app) {
  const track = app?.music?.currentTrack?.();
  const driver = app?.music?.driverForTrack?.(track) || app?.music?.driver;
  return !!(
    track?.id === PRODUCTION_TRACK_ID &&
    !app?.music?.state?.mediaError &&
    (driver?.isWarmForTrack ? driver.isWarmForTrack(track) : (driver?.currentTrackId === track.id || driver?.currentVideoId))
  );
}

function preloadProductionTrack(app) {
  if (introPlaybackStarted) return isProductionTrackReady(app);
  if (app?.music?.playbackIntent || app?.music?.state?.playing || app?.music?.state?.loading) return isProductionTrackReady(app);
  if (!selectProductionTrack(app)) return false;
  if (isProductionTrackReady(app)) return true;
  if (!productionTrackReadyPromise) {
    const track = app.music.currentTrack();
    const driver = app.music.driverForTrack?.(track) || app.music.driver;
    productionTrackReadyPromise = withTimeout(
      app.music.preloadDuration(track).then(() => {
        if (app.music.playbackIntent || app.music.state.playing || app.music.state.loading || app.music.currentTrack()?.id !== track.id) return false;
        return driver?.warmupTrack ? driver.warmupTrack(track, { startOffset: 0 }) : true;
      }),
      10000,
      false
    )
      .then(() => isProductionTrackReady(app))
      .catch((error) => {
        console.warn('Production preload failed.', error);
        return false;
      })
      .finally(() => {
        if (!isProductionTrackReady(app)) productionTrackReadyPromise = null;
      });
  }
  app.tray?.refresh?.(true);
  return productionTrackReadyPromise;
}

async function waitForProductionTrack(app, timeoutMs = INTRO_PLAYER_READY_TIMEOUT_MS) {
  const startedAt = performance.now();
  while (performance.now() - startedAt < timeoutMs) {
    const preload = preloadProductionTrack(app);
    if (preload === true) return true;
    if (preload !== false) {
      const remainingMs = Math.max(1, timeoutMs - (performance.now() - startedAt));
      return !!(await withTimeout(preload, remainingMs, false));
    }
    await delay(140);
  }
  return false;
}

function bindIntroPlaybackGate(app) {
  let started = false;
  let pending = false;
  const signalReady = () => {
    waitForProductionTrack(app).then((ready) => {
      if (ready) {
        emitIntroEvent('portfolio:intro-player-ready', { trackId: PRODUCTION_TRACK_ID });
      } else {
        console.warn(`Production track ${PRODUCTION_TRACK_ID} did not finish loading for the intro prompt.`);
      }
    }).catch((error) => console.warn('Production preload failed.', error));
  };

  const startPlayback = (source = 'intro-entered', playbackOptions = {}) => {
    if (started || pending) return;

    const play = () => {
      if (!selectProductionTrack(app)) {
        console.warn(`Production track ${PRODUCTION_TRACK_ID} is not available.`);
        return;
      }
      pending = true;
      introPlaybackStarted = true;
      app.tray?.open?.(4000);
      const playResult = app.music.play({
        fadeIn: playbackOptions.fadeIn === true
      });
      app.ui?.refresh?.();
      app.tray?.refresh?.(true);
      Promise.resolve(playResult).then(() => {
        pending = false;
        started = app.music.state.playing || app.music.state.loading;
        emitIntroEvent('portfolio:intro-playback-started', { source, trackId: PRODUCTION_TRACK_ID });
      }).catch((error) => {
        pending = false;
        started = false;
        introPlaybackStarted = false;
        emitIntroEvent('portfolio:intro-playback-error', { source, trackId: PRODUCTION_TRACK_ID });
        console.warn('Production playback failed.', error);
      });
    };

    if (selectProductionTrack(app)) {
      play();
      return;
    }

    waitForProductionTrack(app, 2400).then((ready) => {
      if (ready) play();
      else console.warn(`Production track ${PRODUCTION_TRACK_ID} did not load before entry.`);
    });
  };

  window.addEventListener('portfolio:intro-activate', () => startPlayback('intro-activate', { fadeIn: true }), { once: true });
  window.addEventListener('portfolio:intro-entered', () => startPlayback('intro-entered', { fadeIn: false }), { once: true });
  signalReady();
}

function localPerfProbeConfig() {
  const host = window.location.hostname;
  const localHost = host === '127.0.0.1' || host === 'localhost' || host === '::1';
  const mode = new URLSearchParams(window.location.search).get('perf');
  const enabled = localHost && (mode === '1' || mode === 'basic' || mode === 'timing');
  return { enabled, asciiMetricsMode: mode === 'timing' ? 'timing' : mode === 'basic' ? 'basic' : 'detail' };
}

function asciiRendererMode() {
  const requested = new URLSearchParams(window.location.search).get('asciiRenderer');
  const localHost = ['127.0.0.1', 'localhost', '::1'].includes(window.location.hostname);
  if (requested === 'legacy') return 'legacy';
  if (requested === 'compare' && localHost) return 'compare';
  // Worker file (ascii-render-worker.js) is not present;
  // forcing legacy avoids the failed-load + fallback overhead.
  return 'legacy';
}

function isMobilePerformanceMode() {
  return window.matchMedia?.('(max-width: 720px), (pointer: coarse)').matches === true;
}

function initFlowerParticleInteraction() {
  const card = document.querySelector('[data-id="palette-reference-card"]');
  const imageLayer = card?.querySelector('.ascii-palette-image-background');
  if (!card || !imageLayer || isMobilePerformanceMode()) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'ascii-flower-particle-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  card.appendChild(canvas);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return;

  const image = new Image();
  const particles = [];
  let active = false;
  let pointerInsideFlower = false;
  let animationFrame = 0;
  let width = 0;
  let height = 0;
  let parallaxY = 0;
  let sourcePixels = null;

  const resize = () => {
    const rect = card.getBoundingClientRect();
    const scale = Math.min(window.devicePixelRatio || 1, 1.5);
    width = Math.max(1, Math.round(rect.width * scale));
    height = Math.max(1, Math.round(rect.height * scale));
    canvas.width = width;
    canvas.height = height;
    canvas.style.transform = `translate3d(0, ${parallaxY}px, 0)`;
    if (!image.complete || !image.naturalWidth) return;
    const imageScale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const drawWidth = image.naturalWidth * imageScale;
    const drawHeight = image.naturalHeight * imageScale;
    const drawX = (width - drawWidth) / 2;
    const drawY = (height - drawHeight) / 2;
    context.clearRect(0, 0, width, height);
    context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    const pixels = context.getImageData(0, 0, width, height).data;
    sourcePixels = pixels;
    particles.length = 0;
    const step = Math.max(4, Math.round(Math.min(width, height) / 130));
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const index = (y * width + x) * 4;
        const red = pixels[index];
        const green = pixels[index + 1];
        const blue = pixels[index + 2];
        if (Math.max(red, green, blue) < 8) continue;
        particles.push({
          x, y, homeX: x, homeY: y,
          vx: 0, vy: 0,
          size: 0.8 + Math.random() * 1.6,
          color: `rgb(${red}, ${green}, ${blue})`,
          drift: (Math.random() - 0.5) * 0.45
        });
      }
    }
    context.clearRect(0, 0, width, height);
  };

  const setActive = (next) => {
    if (active === next) return;
    active = next;
    imageLayer.classList.toggle('is-flower-dissolving', active);
    if (!animationFrame) animationFrame = requestAnimationFrame(animate);
  };

  const animate = () => {
    animationFrame = 0;
    context.clearRect(0, 0, width, height);
    let moving = active;
    for (const particle of particles) {
      const targetX = active ? particle.homeX + (particle.homeX - width / 2) * 0.16 : particle.homeX;
      const targetY = active ? particle.homeY + (particle.homeY - height / 2) * 0.16 : particle.homeY;
      particle.vx += (targetX - particle.x) * (active ? 0.012 : 0.026) + particle.drift * 0.018;
      particle.vy += (targetY - particle.y) * (active ? 0.012 : 0.026) + 0.008;
      particle.vx *= 0.91;
      particle.vy *= 0.91;
      particle.x += particle.vx;
      particle.y += particle.vy;
      const distance = Math.hypot(particle.x - particle.homeX, particle.y - particle.homeY);
      const alpha = active ? Math.min(0.78, distance / 16) : Math.max(0, 1 - distance / 18);
      if (active || distance > 0.7) moving = true;
      if (alpha > 0.01) {
        context.globalAlpha = alpha;
        context.fillStyle = particle.color;
        context.fillRect(particle.x, particle.y, particle.size, particle.size);
      }
    }
    context.globalAlpha = 1;
    if (moving) animationFrame = requestAnimationFrame(animate);
  };

  const pointerMove = (event) => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.floor((event.clientX - rect.left) / rect.width * width);
    const y = Math.floor((event.clientY - rect.top) / rect.height * height);
    if (x < 0 || y < 0 || x >= width || y >= height) return setActive(false);
    const pixelIndex = (y * width + x) * 4;
    pointerInsideFlower = sourcePixels
      ? Math.max(sourcePixels[pixelIndex], sourcePixels[pixelIndex + 1], sourcePixels[pixelIndex + 2]) >= 8
      : false;
    setActive(pointerInsideFlower);
  };

  const updateParallax = () => {
    parallaxY = Math.max(-8, Math.min(8, window.scrollY * -0.012));
    canvas.style.transform = `translate3d(0, ${parallaxY}px, 0)`;
    imageLayer.style.transform = `translate3d(0, ${parallaxY}px, 0)`;
  };

  image.addEventListener('load', resize, { once: true });
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('pointermove', pointerMove, { passive: true });
  document.addEventListener('mousemove', pointerMove, { passive: true });
  window.addEventListener('scroll', updateParallax, { passive: true });
  image.src = 'assets/palette/glyph-project-flowers.webp';
  if (image.complete) resize();
  updateParallax();
}

function markPaletteProjectRevealsUpdating() {
  document.querySelectorAll('.ascii-palette-reference-card .ascii-palette-project-reveal').forEach((reveal) => {
    reveal.replaceChildren(document.createTextNode('UPDATING SOON'));
    reveal.classList.add('ascii-project-updating-soon');
    reveal.setAttribute('aria-label', 'Updating soon');
  });
}

window.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('ascii-shader-background-root');
  const perfProbe = localPerfProbeConfig();
  document.body.classList.add('ascii-production-mode');
  const mounted = window.mountAsciiShaderBackground(root, {
    scrollable: true,
    scrollHeight: '100vh',
    worldUi: true,
    uiVisible: true,
    forceUiVisible: true,
    studio: false,
    allowStudioQuery: false,
    asciiRenderer: asciiRendererMode(),
    asciiWorkerCount: 1,
    asciiCompareShadows: new URLSearchParams(window.location.search).get('compareShadows') !== '0',
    perfProbe: perfProbe.enabled,
    perfAsciiMetricsMode: perfProbe.asciiMetricsMode,
    showControls: false,
    mobilePerformance: isMobilePerformanceMode(),
    visualizerOnly: false,
    productionTrackId: '',
    productionTrackIds: [],
    defaultTrackId: '',
    includeSynthFallback: false,
    youtubeInitialAutoplay: false,
    disableMusic: true,
    disableWebsiteSlideshow: true,
    assetBase: '',
    keyboard: false,
    ignoreClickSelector: '[data-ui-interactive], [data-no-bg-click], button, a, input, textarea, select'
  });
  const app = mounted?.app || window.asciiApp;
  document.body.classList.remove('visualizer-only');
  document.body.removeAttribute('data-visualizer-only');
  if (app?.world) {
    app.world.setCameraY(window.scrollY || document.documentElement.scrollTop || 0);
    app.world.markDirty(true);
    app.world.update(true);
  }

  document.querySelectorAll('[data-id="website-preview-1"], [data-id="website-preview-2"]').forEach((card) => {
    const surface = card.querySelector('.ascii-website-preview-surface');
    if (card.dataset.id === 'website-preview-1') return;
    if (card.querySelector('[data-cobe-globe]')) return;
    if (surface) {
      surface.replaceChildren();
      surface.classList.remove('ascii-website-slideshow', 'ascii-website-preview-updating');
      surface.classList.add('ascii-website-globe-surface');
      surface.setAttribute('aria-label', 'Interactive globe');
      const canvas = document.createElement('canvas');
      canvas.className = 'ascii-website-globe';
      canvas.dataset.cobeGlobe = '';
      canvas.setAttribute('aria-label', 'Interactive globe');
      surface.appendChild(canvas);
    }
    card.setAttribute('aria-label', 'Interactive globe');
  });
  markPaletteProjectRevealsUpdating();

  // Remove music player and toggle switch elements completely
  document.getElementById('player-tray-zone')?.remove();
  document.getElementById('youtube-player-shell')?.remove();
  document.getElementById('youtube-player-restore-zone')?.remove();
  document.getElementById('corner-tone-zone')?.remove();
  document.querySelector('.ascii-palette-effect-toggle')?.remove();
  document.querySelector('.ascii-market-location-card')?.remove();
  document.querySelectorAll('.ascii-palette-project-meta').forEach((element) => element.remove());

  // Remove slideshow slides whose images are missing (entire directory absent)
  // to eliminate ~13 404 requests per page load.
  document.querySelectorAll('.ascii-website-slideshow-slide img').forEach((img) => {
    if (img.src && img.src.includes('website-slideshow/')) {
      img.closest('.ascii-website-slideshow-slide')?.remove();
    }
  });

  // Gracefully hide containers of any missing images that fail to load
  document.addEventListener('error', (event) => {
    if (event.target && event.target.tagName === 'IMG') {
      const media = event.target.closest('.ascii-other-project-media, .ascii-firm-media, .ascii-palette-project-media');
      if (media && !media.classList.contains('ascii-other-project-slideshow')) {
        media.style.display = 'none';
      }
    }
  }, true);

  // Pause the render loop when the tab is not visible to save CPU/GPU.
  if (app) {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (app.raf) { cancelAnimationFrame(app.raf); app.raf = 0; }
      } else if (!app.raf && !app.destroyed) {
        // Restart the loop — the app stores its own loop function internally,
        // but we can nudge it by dispatching a resize which forces a re-render.
        window.dispatchEvent(new Event('resize'));
      }
    });
  }
  initFlowerParticleInteraction();
});
