(function () {
  'use strict';

  const CONFIG = window.AsciiShaderBackgroundConfig || {};
  const {
    SHADER_AUDIO_REACTIVITY = 0.30,
    LEETCODE_STATS_CARD_SCALE = 0.85,
    LEETCODE_SPLIT_BAR_MAX = 100,
    GITHUB_STATS_CARD_SCALE = 1.15,
    CAREER_CARD_WIDTH_SCALE = 1.56,
    CAREER_CARD_HEIGHT_SCALE = 0.92,
    CAREER_CARD_HEIGHT_TRANSFER = 20,
    TOP_BLANK_CARD_HEIGHT_SCALE = 1.5,
    DEFAULT_ASCII_BRIGHTNESS = 1.48,
    SHADER_ASCII_ALPHA_BOOST = 1.43,
    SHADER_ASCII_TINT_STRENGTH = 0.84,
    SHADER_ASCII_COLOR_SATURATION = 1.34,
    SHADER_ASCII_COLOR_EXPOSURE = 0.96,
    SHADER_ASCII_HIGHLIGHT_ROLLOFF = 0.70,
    SHADER_ASCII_BRIGHTNESS_INFLUENCE = 0.54,
    SHADER_ASCII_MIN_CHANNEL = 30,
    SHADER_ASCII_OUTPUT_CAP = 216,
    PALETTE_CARD_HEIGHT_RATIO = 858 / 1522,
    WEBSITE_PREVIEW_CARD_RATIO = 9 / 16,
    MARKET_QUOTE_CARD_RATIO = 87 / 410,
    MARKET_QUOTE_REFRESH_MS = 60 * 60 * 1000,
    WEBSITE_SLIDESHOW_INTERVAL_MS = 16000,
    PALETTE_UNICORN_PROJECT_ID = 'dW2ls4FU8441G5VS6jLE',
    UNICORN_STUDIO_SDK_URL = 'https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.2.5/dist/unicornStudio.umd.js',
    HERO_QUOTE_INTERVAL_MS = 12000
  } = CONFIG;
  const PALETTE_EFFECT_MODES = Array.isArray(CONFIG.PALETTE_EFFECT_MODES) && CONFIG.PALETTE_EFFECT_MODES.length
    ? CONFIG.PALETTE_EFFECT_MODES
    : ['plain'];
  const HERO_QUOTES = [
    {
      reference: 'Nikshith Nayak',
      source: 'https://github.com/Nikshithnayak',
      arabic: 'Exploring AI · Building Products · Solving Problems',
      translation: 'Building intelligent systems and becoming a better problem solver, one project at a time.'
    },
    {
      reference: 'Nikshith Nayak',
      source: 'https://github.com/Nikshithnayak',
      arabic: 'Aspiring Software Engineer',
      translation: 'Aspiring Software Engineer building with AI, code, and curiosity.'
    },
    {
      reference: 'Nikshith Nayak',
      source: 'https://github.com/Nikshithnayak',
      arabic: 'B.E. in AI & Machine Learning',
      translation: 'Turning ideas into technology through code and artificial intelligence.'
    }
  ];
  const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));
  const mirroredUnit = (value) => {
    const wrapped = ((value % 2) + 2) % 2;
    return wrapped <= 1 ? wrapped : 2 - wrapped;
  };
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const ASCII_THEME_STORAGE_KEY = 'asciiThemeMode';
  const ASCII_VISUALIZER_ONLY_STORAGE_KEY = 'asciiVisualizerOnly';
  const YOUTUBE_PLAYER_INITIAL_AUTO_STOW_MS = 6000;
  const TOP_CARD_SEQUENCE = Object.freeze([
    'hero',
    'intro-card',
    'top-blank-card',
    'stats-github',
    'skills-card',
    'stats-leetcode',
    'certs-card',
    'career-card'
  ]);
  const careerCardHeight = (cardH) => Math.max(168, Math.round(cardH * CAREER_CARD_HEIGHT_SCALE) - CAREER_CARD_HEIGHT_TRANSFER);
  const topBlankCardHeight = (githubH) => Math.round((githubH + CAREER_CARD_HEIGHT_TRANSFER) * TOP_BLANK_CARD_HEIGHT_SCALE);

  function normalizeThemeMode(value) {
    return value === 'light' ? 'light' : 'dark';
  }

  function currentAsciiThemeMode() {
    return document.documentElement?.dataset.asciiTheme === 'light' || document.body?.classList.contains('ascii-theme-light') ? 'light' : 'dark';
  }

  function applyAsciiThemeMode(mode, root) {
    const normalized = normalizeThemeMode(mode);
    document.documentElement.dataset.asciiTheme = normalized;
    if (document.body) {
      document.body.dataset.asciiTheme = normalized;
      document.body.classList.toggle('ascii-theme-light', normalized === 'light');
      document.body.classList.toggle('ascii-theme-dark', normalized !== 'light');
    }
    if (root) {
      root.dataset.asciiTheme = normalized;
      root.classList.toggle('ascii-theme-light', normalized === 'light');
      root.classList.toggle('ascii-theme-dark', normalized !== 'light');
    }
    return normalized;
  }

  function hash01(x, y, seed) {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 1442695041);
    h = (h ^ (h >>> 13)) >>> 0;
    h = Math.imul(h, 1274126177) >>> 0;
    h = (h ^ (h >>> 16)) >>> 0;
    return h / 4294967295;
  }

  function hashStringToSeed(value) {
    const text = String(value || '');
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h || 1;
  }

  function roundedRectPath(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }

  const IDLE = ['.', '.', ':', ':', "'", '`', ',', '-', '_', '|', '/', '\\', '+', '='];
  const GLITCH = ['#', '%', '@', '&', '$', '*', '+', '=', '!', '?', '<', '>', '[', ']', '{', '}', '/', '\\', '|', '~', '^'];
  const BINARY = ['0', '1', 'x', 'X'];
  const BLOCK = ['░', '▒', '▓', '█', '▄', '▀'];
  const FILL_SOFT = IDLE.concat(BINARY);
  const FILL_HARD = GLITCH.concat(BINARY, BLOCK);
  const DUMP_BRIGHTNESS_RAMP = ' .:-=+*#%@';
  const MUSIC_PITCH = ['/', '\\', '|', '^', '~', '+', '=', '>', '<', '0', '1', 'x', 'X', '░', '▒'];
  const MUSIC_DROP = ['#', '%', '+', '=', '!', '?', '0', '1', '░', '▒', '▓', '█'];
  const MUSIC_MOOD = ['.', ':', '-', '_', '/', '\\', '|', '+', '=', '!', '?', '[', ']', '{', '}', '░', '▒'];

  function normalizeMasks(src) {
    const out = {};
    for (const [name, rows] of Object.entries(src)) {
      const width = Math.max(...rows.map((r) => r.length));
      out[name] = { name, width, height: rows.length, mask: rows.map((r) => r.padEnd(width, '.')) };
    }
    return out;
  }

  const SHAPES = normalizeMasks({
    lock: ['...++++...', '..+####+..', '.+##++##+.', '.+##..##+.', '++######++', '+########+', '+###++###+', '+########+', '++######++'],
    bolt: ['.......++++', '......+####', '.....+#####', '....+#####.', '...+#####..', '..+########', '..+########', '.....#####.', '....#####..', '...#####...', '..#####....', '.#####.....', '+####......', '++++.......'],
    cursor: ['++..........', '##+.........', '####+.......', '######+.....', '########+...', '##########+.', '####++++....', '###+........', '##+.........', '+...........'],
    hourglass: ['+########+', '.+######+.', '..+####+..', '...+##+...', '...+##+...', '..+####+..', '.+######+.', '+########+'],
    terminalCaret: ['##+........', '+##+.......', '.+##+......', '..+##+.....', '...+##+....', '..+##+.....', '.+##+......', '+##+.......', '##+........', '...........', '...++++++..', '..+######+.', '..++++++++.']
  });

  const AMBIENT_TYPES = [['lock', .26], ['bolt', .24], ['cursor', .18], ['hourglass', .22], ['terminalCaret', .10]];
  const DOUBLE_TYPES = [['cursor', .34], ['bolt', .26], ['terminalCaret', .20], ['lock', .10], ['hourglass', .10]];
  const SPAM_TYPES = [['bolt', .40], ['cursor', .25], ['terminalCaret', .25], ['lock', .05], ['hourglass', .05]];

  function weightedPick(entries) {
    let t = Math.random() * entries.reduce((sum, entry) => sum + entry[1], 0);
    for (const [value, weight] of entries) {
      t -= weight;
      if (t <= 0) return value;
    }
    return entries[entries.length - 1][0];
  }

  function weightedPickAvailable(entries, activeTypes) {
    const available = entries.filter(([value]) => !activeTypes.has(value));
    return available.length ? weightedPick(available) : null;
  }

  const chooseIdle = () => pick(IDLE);
  function chooseGlitch() { const r = Math.random(); return r < .44 ? pick(GLITCH) : r < .72 ? pick(BINARY) : r < .88 ? pick(IDLE) : pick(BLOCK); }
  function chooseShapeChar() { const r = Math.random(); return r < .34 ? pick(BINARY) : r < .68 ? pick(IDLE) : r < .9 ? pick(GLITCH) : pick(BLOCK); }
  function chooseFill(cell, now, aggressive) { const pool = aggressive ? FILL_HARD : FILL_SOFT; return pool[Math.floor(hash01(cell.col, cell.row, cell.seed + Math.floor(now / (aggressive ? 64 : 98))) * pool.length) % pool.length]; }
  function chooseMusicFill(cell, now, type, aggressive) {
    let pool = type === 'bass-drop' || type === 'drop' ? MUSIC_DROP : type === 'pitch-rise' || type === 'high-spark' ? MUSIC_PITCH : MUSIC_MOOD;
    if (aggressive && type !== 'pitch-rise') pool = pool.concat(['░', '▒', '▓']);
    return pool[Math.floor(hash01(cell.col, cell.row, cell.seed + Math.floor(now / (aggressive ? 58 : 86)) + 31) * pool.length) % pool.length];
  }

  function createInternalDom(root) {
    root.innerHTML = `
      <canvas id="ascii-bg" aria-hidden="true"></canvas>
      <canvas id="shader-source" aria-hidden="true"></canvas>
      <input id="local-audio-input" type="file" accept="audio/*" hidden />
      <input id="local-timeline-input" type="file" accept="application/json,.json" hidden />
      <div id="ui-layer" data-ui-layer>
        <section class="ascii-shader-frame ascii-hero" data-ui-interactive data-placeable data-no-place-persist data-no-card-grid data-top-gradient-card data-id="hero">
          <div class="ascii-black-fill" aria-hidden="true"></div>
          <div class="ascii-content">
            <h1>Nikshith Nayak</h1>
            <div class="ascii-name-aliases" aria-label="Aliases">
              <span class="ascii-name-alias-item">
                <span class="ascii-name-alias" tabindex="0" aria-describedby="ascii-alias-nikku">@Nikku</span>
                <span class="ascii-name-tooltip" id="ascii-alias-nikku" role="tooltip">
                  <span class="ascii-name-tooltip-row">
                    <svg class="ascii-name-tooltip-icon ascii-val-icon" viewBox="0 0 100 100" aria-hidden="true"><path d="M6 12h27.4l26 60.5H35.2L6 38.2V12Z"></path><path d="M94 12v26.2L64.8 72.5H40.6L66.6 12H94Z"></path></svg>
                    <span>Nikshith Nayak</span>
                  </span>
                </span>
              </span>
              <span class="ascii-name-alias-item">
                <span class="ascii-name-alias" tabindex="0" aria-describedby="ascii-alias-nikshith">@Nikshith</span>
                <span class="ascii-name-tooltip ascii-name-tooltip-multi" id="ascii-alias-nikshith" role="tooltip">
                  <a class="ascii-name-tooltip-row" href="https://github.com/Nikshithnayak" target="_blank" rel="noreferrer" data-no-bg-click>
                    <svg class="ascii-name-tooltip-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82A7.54 7.54 0 0 1 8 3.86c.68 0 1.36.09 2 .26 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"></path></svg>
                    <span>Nikshithnayak</span>
                  </a>
                  <a class="ascii-name-tooltip-row" href="https://x.com/NikshithNayak" target="_blank" rel="noreferrer" data-no-bg-click>
                    <svg class="ascii-name-tooltip-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M9.52 6.78 15.47 0h-1.41L8.9 5.88 4.78 0H0l6.24 8.9L0 16h1.41l5.45-6.21L11.22 16H16L9.52 6.78Zm-1.93 2.2-.63-.88L1.93 1.04h2.17l4.06 5.7.63.88 5.28 7.41h-2.17L7.59 8.98Z"></path></svg>
                    <span>@NikshithNayak</span>
                  </a>
                </span>
              </span>
            </div>
            <div class="ascii-name-quote" data-hero-quote aria-live="polite">
              <p class="ascii-name-quote-arabic" lang="en" dir="ltr" data-quote-arabic></p>
              <p class="ascii-name-quote-translation" lang="en" dir="ltr" data-quote-translation></p>
            </div>
            <img class="ascii-name-portrait" src="assets/profile/pf.webp" alt="Nikshith Nayak" decoding="async" />
            <nav class="ascii-name-links" aria-label="Profile links">
              <a class="ascii-name-link" href="https://github.com/Nikshithnayak" target="_blank" rel="noreferrer" data-no-bg-click aria-label="GitHub" title="GitHub">
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82A7.54 7.54 0 0 1 8 3.86c.68 0 1.36.09 2 .26 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"></path></svg>
              </a>
              <a class="ascii-name-link ascii-name-link-linkedin" href="https://www.linkedin.com/in/nikshith-nayak/" target="_blank" rel="noreferrer" data-no-bg-click aria-label="LinkedIn" title="LinkedIn">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.55V9h3.57v11.45ZM22.23 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.23 0Z"></path></svg>
              </a>
              <a class="ascii-name-link" href="https://x.com/NikshithNayak" target="_blank" rel="noreferrer" data-no-bg-click aria-label="X" title="X">
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9.52 6.78 15.47 0h-1.41L8.9 5.88 4.78 0H0l6.24 8.9L0 16h1.41l5.45-6.21L11.22 16H16L9.52 6.78Zm-1.93 2.2-.63-.88L1.93 1.04h2.17l4.06 5.7.63.88 5.28 7.41h-2.17L7.59 8.98Z"></path></svg>
              </a>
              <a class="ascii-name-link" href="https://leetcode.com/u/nikshithnayak/" target="_blank" rel="noreferrer" data-no-bg-click aria-label="LeetCode" title="LeetCode">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0zm-2.866 12.815a1.38 1.38 0 0 0-1.38 1.382 1.38 1.38 0 0 0 1.38 1.382H20.79a1.38 1.38 0 0 0 1.38-1.382 1.38 1.38 0 0 0-1.38-1.382z"/></svg>
              </a>
              <a class="ascii-name-link" href="https://www.instagram.com/_nikshith.nayak_" target="_blank" rel="noreferrer" data-no-bg-click aria-label="Instagram" title="Instagram">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
              </a>
              <a class="ascii-name-link" href="mailto:nikshithnayak6@gmail.com" data-no-bg-click aria-label="Email" title="Email">
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4Zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2Zm13 2.383-4.708 2.825L15 11.105V5.383Zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741ZM1 11.105l4.708-2.897L1 5.383v5.722Z"/></svg>
              </a>
            </nav>
          </div>
        </section>

        <section class="ascii-shader-frame ascii-intro-card" data-ui-interactive data-placeable data-no-place-persist data-no-card-grid data-top-gradient-card data-id="intro-card" aria-labelledby="ascii-intro-title">
          <div class="ascii-black-fill" aria-hidden="true"></div>
          <div class="ascii-intro-linework" aria-hidden="true">
            <span class="ascii-intro-plus ascii-intro-plus-top-right"></span>
            <span class="ascii-intro-joint ascii-intro-joint-bottom-left"></span>
          </div>
          <div class="ascii-content ascii-intro-content">
            <h2 id="ascii-intro-title">AI &amp; ML Student · Aspiring Software Engineer</h2>
            <p>Artificial Intelligence, Machine Learning, AI Agents, Web Dev, DSA</p>
            <p class="ascii-intro-foundation">3rd-year B.E. student in Artificial Intelligence &amp; Machine Learning at Canara Engineering College, Mangalore (VTU). Building AI agents, shipping full-stack projects, and solving DSA problems.</p>
          </div>
        </section>

        <section class="ascii-shader-frame ascii-code-card ascii-leetcode-card" data-ui-interactive data-placeable data-no-place-persist data-no-card-grid data-top-gradient-card data-no-bg-click data-id="stats-leetcode">
          <div class="ascii-black-fill" aria-hidden="true"></div>
          <a class="ascii-code-card-link" href="https://leetcode.com/u/nikshithnayak/" target="_blank" rel="noreferrer" data-no-bg-click aria-label="Open nikshithnayak on LeetCode">
            <span class="ascii-content">
              <span class="ascii-eyebrow">LeetCode</span>
              <span id="leetcode-total" class="ascii-code-total">60+</span>
              <span class="ascii-stat-caption">problems solved</span>
              <span class="ascii-leetcode-split">
                <span class="ascii-leetcode-row"><span>Arrays</span><strong id="leetcode-easy">100%</strong><i style="--solved:80%"></i></span>
                <span class="ascii-leetcode-row"><span>Strings</span><strong id="leetcode-medium">100%</strong><i style="--solved:65%"></i></span>
                <span class="ascii-leetcode-row"><span>Sorting</span><strong id="leetcode-hard">100%</strong><i style="--solved:50%"></i></span>
              </span>
            </span>
          </a>
        </section>

        <section class="ascii-shader-frame ascii-code-card ascii-github-card" data-ui-interactive data-placeable data-no-place-persist data-no-card-grid data-top-gradient-card data-no-bg-click data-id="stats-github">
          <div class="ascii-black-fill" aria-hidden="true"></div>
          <a class="ascii-code-card-link" href="https://github.com/Nikshithnayak" target="_blank" rel="noreferrer" data-no-bg-click aria-label="Open Nikshithnayak on GitHub">
            <span class="ascii-content">
              <span class="ascii-github-summary"><span class="ascii-github-side"><span class="ascii-github-copy" aria-label="GitHub Activity"><svg class="ascii-github-logo" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82A7.54 7.54 0 0 1 8 3.86c.68 0 1.36.09 2 .26 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"></path></svg><span class="ascii-github-activity">Nikshith</span></span></span><span id="github-map" class="ascii-github-map" aria-label="GitHub contribution map"></span><strong id="github-total">Active</strong></span>
            </span>
          </a>
        </section>
        <section class="ascii-shader-frame ascii-code-card ascii-top-blank-card" data-ui-interactive data-placeable data-no-place-persist data-no-card-grid data-top-gradient-card data-no-bg-click data-id="top-blank-card" aria-label="Blank card">
          <div class="ascii-black-fill" aria-hidden="true"></div>
          <div class="ascii-top-blank-heading">
            <span>About Me</span>
          </div>
          <div class="ascii-top-blank-copy" tabindex="0" aria-label="About biography">
            <p><strong>Education:</strong> B.E. student specializing in Artificial Intelligence and Machine Learning at Canara Engineering College, Mangalore (VTU, Batch 2024–2028, 3rd Year / 4th Sem).</p>
            <p><strong>AI &amp; Machine Learning:</strong> Building practical solutions with AI Agents, Generative AI, LLMs, and Gemini API. Won 🥈 2nd Place in the AI Agentics Hackathon as Team Leader.</p>
            <p><strong>Software &amp; Web Development:</strong> Full-stack applications built using React, Vite, Tailwind CSS, Node.js, and Python. Experience developing AI chatbots, medical assistants, and marketplace concepts.</p>
            <p><strong>Problem Solving &amp; DSA:</strong> Actively solving Data Structures &amp; Algorithms problems on LeetCode (60+ solved), focusing on Arrays, Strings, Searching, Sorting, and Recursion.</p>
            <p><strong>Goal:</strong> Becoming a strong software engineer and building meaningful products using modern technologies and artificial intelligence.</p>
            <p>Mangalore, Karnataka, India.</p>
          </div>
          <button class="ascii-top-blank-popout-toggle" type="button" data-about-popout-toggle data-no-bg-click aria-label="Open About popout" aria-expanded="false" aria-controls="ascii-top-blank-popout"></button>
        </section>

      <section class="ascii-shader-frame ascii-project-card ascii-market-quote-card" data-ui-interactive data-placeable data-no-place-persist data-no-card-grid data-top-gradient-card data-no-bg-click data-id="market-spy-card" data-market-quote-card aria-label="SPY and QQQ market quotes">
        <div class="ascii-black-fill" aria-hidden="true"></div>
        <span class="ascii-project-drag-hit ascii-market-quote-drag-hit" data-drag aria-label="Drag market quote card"></span>
        <div class="ascii-market-quote-content" data-no-bg-click>
          <span class="ascii-market-ticker-pane" data-spy-ticker-pane>
            <span class="ascii-market-quote-copy">
              <strong data-spy-symbol>SPY</strong>
              <span data-spy-name>SPDR S&amp;P 500 ETF Trust</span>
              <time class="ascii-market-quote-date" data-spy-date datetime="">As of ---</time>
            </span>
            <svg class="ascii-market-sparkline" viewBox="0 0 72 34" preserveAspectRatio="none" aria-hidden="true">
              <line class="ascii-market-sparkline-base" data-spy-open-line x1="4" y1="17" x2="69" y2="17"></line>
              <path class="ascii-market-sparkline-line" data-spy-sparkline-line d=""></path>
            </svg>
            <span class="ascii-market-quote-value">
              <strong data-spy-price>$---.--</strong>
              <span data-spy-change>--.--</span>
            </span>
          </span>
          <span class="ascii-market-ticker-pane" data-qqq-ticker-pane>
            <span class="ascii-market-quote-copy">
              <strong data-qqq-symbol>QQQ</strong>
              <span data-qqq-name>Invesco QQQ Trust</span>
              <time class="ascii-market-quote-date" data-qqq-date datetime="">As of ---</time>
            </span>
            <svg class="ascii-market-sparkline" viewBox="0 0 72 34" preserveAspectRatio="none" aria-hidden="true">
              <line class="ascii-market-sparkline-base" data-qqq-open-line x1="4" y1="17" x2="69" y2="17"></line>
              <path class="ascii-market-sparkline-line" data-qqq-sparkline-line d=""></path>
            </svg>
            <span class="ascii-market-quote-value">
              <strong data-qqq-price>$---.--</strong>
              <span data-qqq-change>--.--</span>
            </span>
          </span>
        </div>
      </section>
      <section class="ascii-shader-frame ascii-project-card ascii-market-quote-card ascii-market-location-card" data-ui-interactive data-placeable data-no-place-persist data-no-card-grid data-top-gradient-card data-no-bg-click data-id="market-blank-card" data-chicago-location-card aria-label="Mangalore local time" tabindex="0">
        <div class="ascii-black-fill" aria-hidden="true"></div>
        <span class="ascii-project-drag-hit ascii-market-quote-drag-hit" data-drag aria-label="Drag blank market card"></span>
        <div class="ascii-market-location-content" data-no-bg-click>
          <span class="ascii-market-location-pin" aria-hidden="true">📍</span>
          <span class="ascii-market-location-city">Mangalore, India</span>
          <time class="ascii-market-location-time" data-chicago-location-time aria-label="Local time">--:--</time>
        </div>
      </section>
      <section class="ascii-shader-frame ascii-project-card ascii-website-preview-card" data-ui-interactive data-placeable data-no-place-persist data-no-card-grid data-no-bg-click data-id="website-preview-1" aria-label="Website preview placeholder one">
        <div class="ascii-black-fill" aria-hidden="true"></div>
        <span class="ascii-project-drag-hit ascii-website-preview-drag-hit" data-drag aria-label="Drag website preview placeholder one"></span>
        <span class="ascii-website-preview-surface" aria-hidden="true"></span>
      </section>
      <section class="ascii-shader-frame ascii-project-card ascii-website-preview-card" data-ui-interactive data-placeable data-no-place-persist data-no-card-grid data-no-bg-click data-id="website-preview-2" aria-label="Website preview placeholder two">
        <div class="ascii-black-fill" aria-hidden="true"></div>
        <span class="ascii-project-drag-hit ascii-website-preview-drag-hit" data-drag aria-label="Drag website preview placeholder two"></span>
        <span class="ascii-website-preview-surface ascii-website-slideshow" aria-hidden="true">
          <span class="ascii-website-slideshow-slide">
            <img src="assets/website-slideshow/felix-rottmann-DKN9CPK0Rwo-unsplash.jpg?v=opt2" alt="" loading="lazy" decoding="async" />
            <span class="ascii-website-slideshow-credit">By: Felix Rottmann</span>
          </span>
          <span class="ascii-website-slideshow-slide">
            <img src="assets/website-slideshow/wolfgang-hasselmann-wk-mXuQXOPM-unsplash.jpg?v=opt2" alt="" loading="lazy" decoding="async" />
            <span class="ascii-website-slideshow-credit">By: Wolfgang Hasselmann</span>
          </span>
          <span class="ascii-website-slideshow-slide">
            <img src="assets/website-slideshow/simon-lohmann-PGSBWuDDNh4-unsplash.jpg?v=opt2" alt="" loading="lazy" decoding="async" />
            <span class="ascii-website-slideshow-credit">By: Simon Lohmann</span>
          </span>
          <span class="ascii-website-slideshow-slide">
            <img src="assets/website-slideshow/bhautik-patel-yYWM3PLIaS8-unsplash.jpg?v=opt2" alt="" loading="lazy" decoding="async" />
            <span class="ascii-website-slideshow-credit">By: Bhautik Patel</span>
          </span>
          <span class="ascii-website-slideshow-slide">
            <img src="assets/website-slideshow/eugene-golovesov-SuqwElNGgnA-unsplash.jpg?v=opt2" alt="" loading="lazy" decoding="async" />
            <span class="ascii-website-slideshow-credit">By: Eugene Golovesov</span>
          </span>
          <span class="ascii-website-slideshow-slide">
            <img src="assets/website-slideshow/lena-polishko-SQKI5yqlDqs-unsplash.jpg?v=opt2" alt="" loading="lazy" decoding="async" />
            <span class="ascii-website-slideshow-credit">By: Lena Polishko</span>
          </span>
          <span class="ascii-website-slideshow-slide">
            <img src="assets/website-slideshow/henrique-ferreira-QjOiTg459jI-unsplash.jpg?v=opt2" alt="" loading="lazy" decoding="async" />
            <span class="ascii-website-slideshow-credit">By: Henrique Ferreira</span>
          </span>
          <span class="ascii-website-slideshow-slide">
            <img src="assets/website-slideshow/oliver-streit-PZWTWgTLHns-unsplash.jpg?v=opt2" alt="" loading="lazy" decoding="async" />
            <span class="ascii-website-slideshow-credit">By: Oliver Streit</span>
          </span>
          <span class="ascii-website-slideshow-slide">
            <img src="assets/website-slideshow/intricate-explorer-EEop-zcylQE-unsplash.jpg?v=opt2" alt="" loading="lazy" decoding="async" />
            <span class="ascii-website-slideshow-credit">By: Intricate Explorer</span>
          </span>
          <span class="ascii-website-slideshow-slide">
            <img src="assets/website-slideshow/spenser-sembrat-9H6ZPRr7j6Q-unsplash.jpg?v=opt2" alt="" loading="lazy" decoding="async" />
            <span class="ascii-website-slideshow-credit">By: Spenser Sembrat</span>
          </span>
          <span class="ascii-website-slideshow-slide">
            <img src="assets/website-slideshow/dylan-sauerwein-HojE5Rz-pAk-unsplash.jpg?v=opt2" alt="" loading="lazy" decoding="async" />
            <span class="ascii-website-slideshow-credit">By: Dylan Sauerwein</span>
          </span>
          <span class="ascii-website-slideshow-slide">
            <img src="assets/website-slideshow/kir-3WUiwmyoNEw-unsplash-sideways.jpg?v=opt2" alt="" loading="lazy" decoding="async" />
            <span class="ascii-website-slideshow-credit">By: Kir</span>
          </span>
          <span class="ascii-website-slideshow-slide">
            <img src="assets/website-slideshow/vincentiu-solomon-ln5drpv_ImI-unsplash.jpg?v=opt2" alt="" loading="lazy" decoding="async" />
            <span class="ascii-website-slideshow-credit">By: Vincentiu Solomon</span>
          </span>
        </span>
      </section>
      <section class="ascii-shader-frame ascii-project-card ascii-firm-card" data-ui-interactive data-placeable data-no-place-persist data-no-card-grid data-no-bg-click data-id="firm-card" aria-label="Featured projects interactive color card">
        <span class="ascii-project-drag-hit ascii-firm-drag-hit" data-drag aria-label="Drag featured projects card"></span>
        <div class="ascii-firm-strip-stack" data-no-bg-click>
          <button class="ascii-firm-strip ascii-firm-strip-green" type="button" data-no-bg-click aria-label="Open CareConnect project strip">
            <span class="ascii-firm-label"><span class="ascii-firm-title">CARECONNECT</span><span class="ascii-firm-subtext">AI-powered medical assistant for diagnosis support &amp; healthcare interactions.</span></span>
            <span class="ascii-firm-panel">
              <span class="ascii-firm-media"><img src="assets/projects/firm-pattern-diamond-edge.svg" alt="CareConnect preview" loading="lazy" decoding="async" /></span>
              <span class="ascii-firm-copy"><strong>CareConnect</strong><span>An AI-powered healthcare platform designed to assist users with medical interactions, symptoms check, and AI-based diagnosis support using intelligent agents.</span></span>
            </span>
          </button>
          <button class="ascii-firm-strip ascii-firm-strip-cream" type="button" data-no-bg-click aria-label="Open AI Medical Assistant project strip">
            <span class="ascii-firm-label"><span class="ascii-firm-title">AI MEDICAL ASSISTANT</span><span class="ascii-firm-subtext">🥈 2nd Place — AI Agentics Hackathon (Team Leader).</span></span>
            <span class="ascii-firm-panel">
              <span class="ascii-firm-media"><img class="ascii-firm-media-proofline" src="assets/projects/firm-pattern-proofline.svg" alt="AI Medical Assistant preview" loading="lazy" decoding="async" /></span>
              <span class="ascii-firm-copy"><strong>AI Medical Assistant</strong><span>An AI agent system created during the AI Agentics Hackathon focused on healthcare problem-solving and smart user triage. Won 2nd place as team leader.</span></span>
            </span>
          </button>
          <button class="ascii-firm-strip ascii-firm-strip-red" type="button" data-no-bg-click aria-label="Open AI Weather Chatbot project strip">
            <span class="ascii-firm-label"><span class="ascii-firm-title">WEATHER BOT</span><span class="ascii-firm-subtext">Conversational weather app powered by Gemini API.</span></span>
            <span class="ascii-firm-panel">
              <span class="ascii-firm-media"><img src="assets/projects/firm-pattern-keldr.svg" alt="Weather Chatbot preview" loading="lazy" decoding="async" /></span>
              <span class="ascii-firm-copy"><strong>AI Weather Chatbot</strong><span>Interactive web application leveraging Google's Gemini API to deliver natural, accurate weather conversations and forecast insights.</span></span>
            </span>
          </button>
          <button class="ascii-firm-strip ascii-firm-strip-yellow" type="button" data-no-bg-click aria-label="Open SecureBots project strip">
            <span class="ascii-firm-label"><span class="ascii-firm-title">SECUREBOTS</span><span class="ascii-firm-subtext">AI Agent Marketplace &amp; Freelance Hub platform concepts.</span></span>
            <span class="ascii-firm-panel">
              <span class="ascii-firm-media"><img src="assets/projects/firm-pattern-relaybase.svg" alt="SecureBots preview" loading="lazy" decoding="async" /></span>
              <span class="ascii-firm-copy"><strong>SecureBots &amp; Freelance Hub</strong><span>Concepts for discovering and accessing autonomous AI agents and connecting clients with modern AI-driven developer workflows.</span></span>
            </span>
          </button>
        </div>
      </section>
      <section class="ascii-shader-frame ascii-project-card ascii-palette-reference-card" data-ui-interactive data-placeable data-no-place-persist data-no-card-grid data-no-bg-click data-id="palette-reference-card" aria-label="Interactive project palette card">
        <span class="ascii-project-drag-hit ascii-palette-reference-drag-hit" data-drag aria-label="Drag project palette card"></span>
        <div class="ascii-palette-image-background" aria-hidden="true"></div>
        <div class="ascii-palette-project-stage" data-no-bg-click>
          <button class="ascii-palette-project ascii-palette-project-change" type="button" data-no-bg-click aria-label="ML / AI / Agents project">
            <span class="ascii-palette-project-default">
              <span class="ascii-palette-project-name">ML / AI / Agents</span>
              <span class="ascii-palette-project-meta" aria-label="Palette coordinates">
                <span>HEX: #000000</span>
                <span>RGB: 0,0,0</span>
                <span>HSL: 0.00,0.00,0.00</span>
                <span>HSV: 0°,0%,0%</span>
                <span>CMYK: 0.00,0.00,0.00&nbsp;&nbsp;1.00</span>
              </span>
            </span>
            <span class="ascii-palette-project-reveal">
              <span class="ascii-palette-project-media"><img src="assets/projects/ml-ai-agents-collage.png?v=clean-1" alt="ML / AI / Agents preview" loading="lazy" decoding="async" /></span>
              <span class="ascii-palette-project-copy"><strong>ML / AI / Agents</strong><span>A growing collection of machine learning projects and algorithm implementations.</span></span>
            </span>
          </button>
          <button class="ascii-palette-project ascii-palette-project-vision" type="button" data-no-bg-click aria-label="ES trading algorithms project">
            <span class="ascii-palette-project-default">
              <span class="ascii-palette-project-name">Quantitative Trading + Algorithms</span>
              <span class="ascii-palette-project-meta" aria-label="Palette coordinates">
                <span>HEX: #FFFFFF</span>
                <span>RGB: 255,255,255</span>
                <span>HSL: 0.00,0.00,1.00</span>
                <span>HSV: 0°,0%,100%</span>
                <span>CMYK: 0.00,0.00,0.00&nbsp;&nbsp;0.00</span>
              </span>
            </span>
            <span class="ascii-palette-project-reveal ascii-palette-algorithms-reveal">
              <span class="ascii-palette-algorithm-list">
                <span class="ascii-palette-algorithm-entry">
                  <span class="ascii-palette-algorithm-summary">
                    <strong>ES Trading Bot</strong>
                    <span class="ascii-palette-algorithm-description">Custom memory + dedicated agentic harness for trading; a session-aware ES reversal candidate with deterministic risk gates and auditable shadow runs.</span>
                    <span class="ascii-palette-algorithm-strategy"><b>Strategy:</b> ???</span>
                  </span>
                  <span class="ascii-palette-algorithm-stats" aria-label="ES Trading Bot construction statistics">
                    <span><i>PnL*</i><b>~ 2 months / +$2,398</b></span>
                    <span><i>Sharpe</i><b>Pending</b></span>
                    <span><i>PF</i><b>1.20</b></span>
                    <span><i>Created</i><b>Jul 2026</b></span>
                  </span>
                </span>
                <span class="ascii-palette-algorithm-entry">
                  <span class="ascii-palette-algorithm-summary">
                    <strong>ES Breakout Research <em>— WIP</em></strong>
                    <span class="ascii-palette-algorithm-description">A regime-aware ES breakout candidate tested through bar-by-bar replay with realistic fills, commissions, and slippage.</span>
                    <span class="ascii-palette-algorithm-strategy"><b>Strategy:</b> ???</span>
                  </span>
                  <span class="ascii-palette-algorithm-stats" aria-label="ES Breakout Research construction statistics">
                    <span><i>PnL*</i><b>~ 2 weeks / +$790</b></span>
                    <span><i>Sharpe</i><b>Pending</b></span>
                    <span><i>Created</i><b>May 2026</b></span>
                  </span>
                </span>
                <span class="ascii-palette-algorithm-note">*Construction-window results · Unqualified · Shadow only</span>
              </span>
            </span>
          </button>
          <button class="ascii-palette-project ascii-palette-project-foundation" type="button" data-no-bg-click aria-label="Cybersecurity and Data Science project">
            <span class="ascii-palette-project-default">
              <span class="ascii-palette-project-name">Cybersecurity + Data Science</span>
              <span class="ascii-palette-project-meta" aria-label="Palette coordinates">
                <span>HEX: ???</span>
                <span>RGB: ???</span>
                <span>HSL: ???</span>
                <span>HSV: ???</span>
                <span>CMYK: ???</span>
              </span>
            </span>
            <span class="ascii-palette-project-reveal ascii-other-projects-reveal">
              <span class="ascii-other-projects-list" data-cyber-data-projects-list role="region" aria-label="Cybersecurity and data science projects, grouped by category">
                <span class="ascii-other-project-group" role="group" aria-labelledby="ascii-cybersecurity-projects-label">
                  <span class="ascii-other-project-category" id="ascii-cybersecurity-projects-label" role="heading" aria-level="3">Cybersecurity</span>
                  <span class="ascii-other-project-group-list" role="list">
                    <span class="ascii-other-project-item" role="listitem">
                      <span class="ascii-other-project-copy">
                        <strong>cybersec-feeds</strong>
                        <span>SQLite-backed threat intelligence that normalizes vulnerability and IOC feeds, scores priority, tracks source health, and supports guarded LLM triage.</span>
                      </span>
                    </span>
                    <span class="ascii-other-project-item" role="listitem">
                      <span class="ascii-other-project-copy">
                        <strong>Agent-Driven Reverse Engineering</strong>
                        <span>An MCP-driven investigation of a custom anti-debugged, VM-protected Windows crackme. Recovered its nine-opcode virtual machine and produced an emulator-verified keygen and universal-accept patch without executing the target.</span>
                      </span>
                      <span class="ascii-other-project-media">
                        <img src="assets/projects/guardian-re-evidence.svg?v=3" alt="Authentic guardian.exe reverse-engineering evidence from the saved Ghidra project: annotated vm_run dispatch, verified keygen output, and universal-accept patch bytes" loading="lazy" decoding="async" />
                      </span>
                    </span>
                  </span>
                </span>
                <span class="ascii-other-project-group" role="group" aria-labelledby="ascii-data-science-projects-label">
                  <span class="ascii-other-project-category" id="ascii-data-science-projects-label" role="heading" aria-level="3">Data Science</span>
                  <span class="ascii-other-project-group-list" role="list">
                    <span class="ascii-other-project-item" role="listitem">
                      <span class="ascii-other-project-copy">
                        <strong>ratemygithub</strong>
                        <span>Evidence-backed GitHub profile scoring across six rubric dimensions with per-repository analysis and shareable result cards.</span>
                      </span>
                    </span>
                    <span class="ascii-other-project-item" role="listitem">
                      <span class="ascii-other-project-copy">
                        <strong>chicago-parking-map</strong>
                        <span>Interactive curb-rule coverage that merges public Chicago map layers and reconstructs permit zones from street-centerline address ranges.</span>
                      </span>
                    </span>
                    <span class="ascii-other-project-item" role="listitem">
                      <span class="ascii-other-project-copy">
                        <strong>computer-stats</strong>
                        <span>Live HWiNFO telemetry for wall power, energy-cost history, interactive charts, forecasting, and resilient source recovery.</span>
                      </span>
                    </span>
                  </span>
                </span>
              </span>
            </span>
          </button>
          <article class="ascii-palette-project ascii-palette-project-resource" data-other-projects-card data-no-bg-click aria-label="Other Projects" tabindex="0">
            <span class="ascii-palette-project-default">
              <span class="ascii-palette-project-name">Other Projects</span>
              <span class="ascii-palette-project-meta" aria-label="Palette coordinates">
                <span>HEX: #32329D</span>
                <span>RGB: 50,50,157</span>
                <span>HSL: 0.67,0.52,0.41</span>
                <span>HSV: 240°,68%,62%</span>
                <span>CMYK: 0.68,0.68,0.00&nbsp;&nbsp;0.38</span>
              </span>
            </span>
            <span class="ascii-palette-project-reveal ascii-other-projects-reveal">
              <span class="ascii-other-projects-list" data-other-projects-list role="region" aria-label="Other projects, scrollable" tabindex="0">
                <span class="ascii-other-project-item" role="article" aria-labelledby="ascii-other-project-typai-title">
                  <span class="ascii-other-project-copy">
                    <strong id="ascii-other-project-typai-title">Typai</strong>
                    <span>Local-first writing intelligence built around a C++ correction engine compiled through Rust/Wasm, with deterministic correction across browser writing surfaces and optional completion and analysis.</span>
                  </span>
                  <span class="ascii-other-project-media">
                    <img src="assets/projects/other-typai.webp?v=1" alt="Typai browser writing demo with correction scenarios and editor surfaces" loading="lazy" decoding="async" />
                  </span>
                </span>
                <span class="ascii-other-project-item" role="article" aria-labelledby="ascii-other-project-codegraph-title">
                  <span class="ascii-other-project-copy">
                    <strong id="ascii-other-project-codegraph-title">Codegraph</strong>
                    <span>Typed graph and source-span checks turn repo state into compact agent context packets.</span>
                  </span>
                  <span class="ascii-other-project-media">
                    <img src="assets/projects/codegraph-mcp-main-v2.png" alt="Codegraph repository graph and source context preview" loading="lazy" decoding="async" />
                  </span>
                </span>
                <span class="ascii-other-project-item" role="article" aria-labelledby="ascii-other-project-rtx-title">
                  <span class="ascii-other-project-copy">
                    <strong id="ascii-other-project-rtx-title">YouTube RTX Enhancement</strong>
                    <span>A Windows C++ video pipeline combining Media Foundation and D3D11 decoding, RTX Video VSR, NVIDIA Optical Flow frame interpolation, and WASAPI-clocked playback.</span>
                  </span>
                  <span class="ascii-other-project-media">
                    <img src="assets/projects/other-rtx.webp?v=1" alt="Native RTX video enhancement preview with live VSR, frame interpolation, and resource metrics" loading="lazy" decoding="async" />
                  </span>
                </span>
                <span class="ascii-other-project-item" role="article" aria-labelledby="ascii-other-project-cad-title">
                  <span class="ascii-other-project-copy">
                    <strong id="ascii-other-project-cad-title">CAD + Generative Art</strong>
                    <span>Parametric OpenSCAD products, printable mechanical systems, and custom WebGL/ASCII visual experiments spanning functional design and generative interfaces.</span>
                  </span>
                  <span class="ascii-other-project-media ascii-other-project-slideshow" data-other-project-slideshow>
                    <img class="ascii-other-project-slide-current" src="assets/projects/other-cad-coasters.webp?v=1" alt="Five bilingual Arabic virtue coaster designs" loading="lazy" decoding="async" />
                    <img class="ascii-other-project-slide-next" alt="" aria-hidden="true" decoding="async" />
                    <span class="ascii-other-project-slide-count" aria-hidden="true"><span data-other-project-slide-count>1</span> / 5</span>
                    <span hidden data-other-project-slide data-src="assets/projects/other-cad-coasters.webp?v=1" data-alt="Five bilingual Arabic virtue coaster designs"></span>
                    <span hidden data-other-project-slide data-src="assets/projects/other-cad-evidence-tray.webp?v=1" data-alt="Parametric cyber-lab evidence tray"></span>
                    <span hidden data-other-project-slide data-src="assets/projects/other-cad-prayer-dial.webp?v=1" data-alt="Layered prayer-time dial design"></span>
                    <span hidden data-other-project-slide data-src="assets/projects/other-art-glyph-flowers.webp?v=1" data-alt="Flower artwork used in a custom glyph vortex visualizer"></span>
                    <span hidden data-other-project-slide data-src="assets/projects/other-art-torn-paper.webp?v=1" data-alt="Generative torn-paper and carbon-filament interface study"></span>
                  </span>
                </span>
              </span>
            </span>
          </article>
          <button class="ascii-palette-project ascii-palette-project-structure" type="button" data-no-bg-click aria-label="Electrical Engineer and Robotics project">
            <span class="ascii-palette-project-default">
              <span class="ascii-palette-project-name">Electrical Engineer + Robotics</span>
              <span class="ascii-palette-project-meta" aria-label="Palette coordinates">
                <span>HEX: #BFEFFF</span>
                <span>RGB: 191,239,255</span>
                <span>HSL: 0.54,1.00,0.87</span>
                <span>HSV: 195°,25%,100%</span>
                <span>CMYK: 0.25,0.06,0.00&nbsp;&nbsp;0.00</span>
              </span>
            </span>
            <span class="ascii-palette-project-reveal">
              <span class="ascii-palette-project-media"><img src="assets/projects/project-09.svg?v=electrical-robotics-1" alt="Electrical Engineer + Robotics preview" loading="lazy" decoding="async" /></span>
              <span class="ascii-palette-project-copy"><strong>Electrical Engineer + Robotics</strong><span>Low-level electronics, microcontroller workflows, and hardware-adjacent engineering prototypes.</span></span>
            </span>
          </button>
        </div>
      </section>

      <section class="ascii-shader-frame ascii-project-card ascii-skills-card" data-ui-interactive data-placeable data-no-place-persist data-no-card-grid data-top-gradient-card data-no-bg-click data-id="skills-card" data-skills-card aria-labelledby="ascii-skills-title">
        <div class="ascii-black-fill" aria-hidden="true"></div>
        <div class="ascii-skills-stage" data-no-bg-click>
          <canvas class="ascii-skills-canvas" data-skills-canvas aria-label="Interactive 3D skills badges"></canvas>
          <div class="ascii-skills-fallback" data-skills-fallback aria-hidden="true"></div>
          <div class="ascii-skills-tooltip" data-skills-tooltip role="tooltip"></div>
        </div>
        <div class="ascii-content ascii-skills-content">
          <span class="ascii-drag ascii-grip-handle" data-drag aria-label="Drag skill stack card"><span class="ascii-grip" aria-hidden="true"></span></span>
          <span class="ascii-eyebrow" id="ascii-skills-title">Skill Stack</span>
        </div>
        <button class="ascii-skills-reset" type="button" data-skills-reset data-no-bg-click aria-label="Reset skill stack badges" title="Reset badges" aria-hidden="true" tabindex="-1">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 11a8 8 0 0 0-14.5-4.7L4 8"></path>
            <path d="M4 3v5h5"></path>
            <path d="M4 13a8 8 0 0 0 14.5 4.7L20 16"></path>
            <path d="M20 21v-5h-5"></path>
          </svg>
        </button>
      </section>

      <section class="ascii-shader-frame ascii-project-card ascii-certs-card" data-ui-interactive data-placeable data-no-place-persist data-no-card-grid data-top-gradient-card data-no-bg-click data-id="certs-card" aria-labelledby="ascii-certs-title">
              <div class="ascii-content ascii-certs-content">
          <span class="ascii-eyebrow" id="ascii-certs-title">Achievements</span>
        </div>
        <div class="ascii-cert-stack" data-no-bg-click aria-label="Achievements">
          <div class="ascii-cert-card" data-no-bg-click aria-label="2nd Place — AI Agentics Hackathon">
            <span class="ascii-cert-name">🥈 2nd Place</span>
            <span class="ascii-cert-mark" style="font-size:18px;display:flex;align-items:center;justify-content:center;">🏆</span>
          </div>
          <div class="ascii-cert-card" data-no-bg-click aria-label="Hackathon Team Leader">
            <span class="ascii-cert-name">Team Leader</span>
            <span class="ascii-cert-mark" style="font-size:18px;display:flex;align-items:center;justify-content:center;">👨‍💻</span>
          </div>
          <div class="ascii-cert-card" data-no-bg-click aria-label="60+ LeetCode Solved">
            <span class="ascii-cert-name">60+ LeetCode</span>
            <span class="ascii-cert-mark" style="font-size:18px;display:flex;align-items:center;justify-content:center;">🧠</span>
          </div>
          <div class="ascii-cert-card" data-no-bg-click aria-label="B.E. AI &amp; Machine Learning">
            <span class="ascii-cert-name">B.E. AIML</span>
            <span class="ascii-cert-mark" style="font-size:18px;display:flex;align-items:center;justify-content:center;">🎓</span>
          </div>
        </div>
      </section>

      <section class="ascii-shader-frame ascii-project-card ascii-career-card" data-ui-interactive data-placeable data-no-place-persist data-no-card-grid data-top-gradient-card data-no-bg-click data-id="career-card" aria-labelledby="ascii-career-title">
        <div class="ascii-black-fill" aria-hidden="true"></div>
        <div class="ascii-content ascii-career-content">
          <div class="ascii-career-head">
            <span class="ascii-career-title" id="ascii-career-title">Education &amp; Experience</span>
          </div>
          <div class="ascii-career-track" data-career-track data-no-bg-click tabindex="0" role="region" aria-label="Draggable career timeline">
            <ol class="ascii-career-list">
              <li class="ascii-career-item">
                <time class="ascii-career-year">2024 - 2028</time>
                <strong>Bachelor of Engineering (B.E.) — AI &amp; ML</strong>
                <span>Canara Engineering College, Mangalore (VTU)</span>
                <p>3rd Year / 4th Semester. Core focus in AI, Machine Learning, Data Structures &amp; Algorithms, and Full-Stack Development.</p>
              </li>
              <li class="ascii-career-item">
                <time class="ascii-career-year">2025</time>
                <strong>Hackathon Team Leader &amp; 🥈 2nd Place</strong>
                <span>AI Agentics Hackathon</span>
                <p>Led development of an AI-powered healthcare assistant solution and coordinated team project delivery.</p>
              </li>
              <li class="ascii-career-item">
                <time class="ascii-career-year">2024 - Present</time>
                <strong>AI/ML Club Member</strong>
                <span>Canara Engineering College</span>
                <p>Collaborating on Artificial Intelligence and Machine Learning projects, workshops, and open-source explorations.</p>
              </li>
              <li class="ascii-career-item">
                <time class="ascii-career-year">2024 - Present</time>
                <strong>Competitive Programming &amp; DSA</strong>
                <span>LeetCode &amp; Problem Solving</span>
                <p>Solved 60+ algorithmic challenges covering Arrays, Strings, Sorting, Searching, and Recursion.</p>
              </li>
          </ol>
        </div>
        <div class="ascii-career-progress" data-career-progress aria-hidden="true">
          <span class="ascii-career-progress-thumb" data-career-progress-thumb></span>
        </div>
      </div>
    </section>

      <div class="ascii-contact-cta-wrap" data-ui-interactive data-placeable data-no-place-persist data-no-card-grid data-no-bg-click data-id="contact-trigger">
        <button class="ascii-contact-trigger" type="button" data-contact-open aria-haspopup="dialog" aria-controls="ascii-contact-modal">Contact Me</button>
      </div>
      <div class="ascii-contact-modal-shell" data-contact-modal-shell data-ui-interactive aria-hidden="true">
        <div class="ascii-contact-modal-backdrop" data-contact-close aria-hidden="true"></div>
        <section id="ascii-contact-modal" class="ascii-shader-frame ascii-project-card ascii-contact-card ascii-contact-modal" data-id="contact-card" data-no-card-grid data-no-bg-click role="dialog" aria-modal="true" aria-labelledby="ascii-contact-title" tabindex="-1">
          <div class="ascii-contact-scene" data-contact-scene>
            <div class="ascii-contact-copy">
              <h2 id="ascii-contact-title">Leave a message</h2>
            </div>
          </div>
          <div class="ascii-contact-lens-clip" aria-hidden="true">
            <div class="ascii-contact-lens-blur">
              <div class="ascii-contact-refraction" data-contact-refraction>
                <canvas class="ascii-contact-refraction-canvas" data-contact-refraction-canvas></canvas>
                <div class="ascii-contact-backdrop-scene" data-contact-backdrop-scene></div>
                <div class="ascii-contact-refraction-scene" data-contact-refraction-scene></div>
              </div>
            </div>
            <div class="ascii-contact-lens-tint" data-contact-lens-tint></div>
            <div class="ascii-contact-lens-glint"></div>
          </div>
          <button class="ascii-contact-close" type="button" data-contact-close aria-label="Close contact form">×</button>
          <form class="ascii-contact-form" data-contact-form data-no-bg-click data-no-drag>
            <label class="ascii-contact-field">
              <span>Email</span>
              <input type="email" name="email" autocomplete="email" inputmode="email" maxlength="254" placeholder="you@example.com" required />
            </label>
            <label class="ascii-contact-honeypot" aria-hidden="true" inert hidden>
              <span>Website</span>
              <input type="text" name="website" autocomplete="off" tabindex="-1" aria-hidden="true" />
            </label>
            <label class="ascii-contact-field ascii-contact-message-field">
              <span>Message</span>
              <textarea name="message" rows="4" minlength="10" maxlength="1200" placeholder="Tell me what you’re building" required></textarea>
            </label>
            <div class="ascii-contact-form-footer">
              <span class="ascii-contact-form-status" data-contact-form-status aria-live="polite">Saved privately to my inbox.</span>
              <button type="submit">Send</button>
            </div>
          </form>
          <svg class="ascii-contact-filter-housing" data-contact-filter-housing aria-hidden="true"></svg>
        </section>
      </div>`;

    const lowerSectionAnchor = root.querySelector('[data-id="market-spy-card"]');
    if (lowerSectionAnchor) {
      TOP_CARD_SEQUENCE.forEach((id) => {
        const card = root.querySelector(`[data-id="${id}"]`);
        if (card) lowerSectionAnchor.before(card);
      });
    }
  }

  function scrollHeightToPx(value) {
    if (typeof value === 'number') return value;
    const raw = String(value || '240vh').trim();
    if (raw.endsWith('vh')) return window.innerHeight * (parseFloat(raw) || 240) / 100;
    if (raw.endsWith('px')) return parseFloat(raw) || window.innerHeight;
    return parseFloat(raw) || window.innerHeight * 2.4;
  }

  function readScrollY() {
    return Math.max(0, window.scrollY || document.documentElement.scrollTop || 0);
  }

  class RenderPerfProbe {
    constructor(enabled = false, asciiMetricsMode = 'detail') {
      this.enabled = enabled === true;
      this.collectAsciiMetrics = this.enabled && asciiMetricsMode !== 'timing';
      this.collectPresentationMetrics = this.enabled && asciiMetricsMode === 'detail';
      this.frames = [];
      this.current = null;
      this.loafs = [];
      this.measureSerial = 0;
      this.observer = null;
      if (!this.enabled || typeof PerformanceObserver === 'undefined') return;
      const supported = PerformanceObserver.supportedEntryTypes;
      if (!Array.isArray(supported) || !supported.includes('long-animation-frame')) return;
      try {
        this.observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const scripts = Array.isArray(entry.scripts) ? entry.scripts.slice(0, 4).map((script) => ({
              duration: Number(script.duration) || 0,
              forcedStyleAndLayoutDuration: Number(script.forcedStyleAndLayoutDuration) || 0,
              invoker: script.invoker || '',
              sourceFunctionName: script.sourceFunctionName || ''
            })) : [];
            this.loafs.push({
              at: Math.round(entry.startTime || 0),
              duration: Number(entry.duration) || 0,
              blockingDuration: Number(entry.blockingDuration) || 0,
              renderStart: Number(entry.renderStart) || 0,
              styleAndLayoutStart: Number(entry.styleAndLayoutStart) || 0,
              scripts
            });
          }
          if (this.loafs.length > 80) this.loafs.splice(0, this.loafs.length - 80);
        });
        this.observer.observe({ type: 'long-animation-frame', buffered: true });
      } catch (_) {
        this.observer = null;
      }
    }
    beginFrame(now = performance.now()) {
      if (!this.enabled) return;
      this.current = { at: Math.round(now), startedAt: now, sections: {}, counts: {}, ascii: null };
    }
    section(name, callback) {
      if (!this.enabled) return callback();
      const serial = ++this.measureSerial;
      const startMark = `ascii-perf-${serial}-start`;
      const endMark = `ascii-perf-${serial}-end`;
      const measureName = `ascii-perf:${name}`;
      const startedAt = performance.now();
      let marked = false;
      try {
        performance.mark(startMark);
        marked = true;
      } catch (_) {}
      try {
        return callback();
      } finally {
        const elapsed = performance.now() - startedAt;
        if (this.current) this.current.sections[name] = (this.current.sections[name] || 0) + elapsed;
        if (marked) {
          try {
            performance.mark(endMark);
            performance.measure(measureName, startMark, endMark);
            performance.clearMeasures(measureName);
            performance.clearMarks(startMark);
            performance.clearMarks(endMark);
          } catch (_) {}
        }
      }
    }
    increment(name, amount = 1) {
      if (!this.enabled || !this.current) return;
      this.current.counts[name] = (this.current.counts[name] || 0) + amount;
    }
    noteAscii(metrics) {
      if (!this.enabled || !this.current) return;
      this.current.ascii = {
        visibleCells: metrics.visibleCells || 0,
        drawnCells: metrics.drawnCells || 0,
        changedCells: metrics.changedCells || 0,
        mutatedCells: metrics.mutatedCells || 0,
        activeCells: metrics.activeCells || 0,
        visibleRows: metrics.visibleRows || null
      };
    }
    endFrame(now = performance.now()) {
      if (!this.enabled || !this.current) return;
      this.current.duration = now - this.current.startedAt;
      delete this.current.startedAt;
      this.frames.push(this.current);
      if (this.frames.length > 360) this.frames.splice(0, this.frames.length - 360);
      this.current = null;
    }
    percentile(values, ratio) {
      if (!values.length) return 0;
      const ordered = values.slice().sort((a, b) => a - b);
      const index = clamp(Math.ceil(ordered.length * ratio) - 1, 0, ordered.length - 1);
      return Number(ordered[index].toFixed(3));
    }
    snapshot() {
      const frames = this.frames.slice();
      const sectionNames = new Set();
      for (const frame of frames) Object.keys(frame.sections || {}).forEach((name) => sectionNames.add(name));
      const sections = {};
      for (const name of sectionNames) {
        const values = frames.map((frame) => Number(frame.sections?.[name]) || 0);
        sections[name] = { p50: this.percentile(values, .5), p95: this.percentile(values, .95), max: this.percentile(values, 1) };
      }
      const frameDurations = frames.map((frame) => Number(frame.duration) || 0);
      return {
        enabled: this.enabled,
        frameCount: frames.length,
        frameDuration: { p50: this.percentile(frameDurations, .5), p95: this.percentile(frameDurations, .95), max: this.percentile(frameDurations, 1) },
        sections,
        lastFrame: frames[frames.length - 1] || null,
        longAnimationFrames: this.loafs.slice()
      };
    }
    destroy() {
      this.observer?.disconnect?.();
      this.observer = null;
      this.current = null;
    }
  }

  function normalizeAsciiBrightness(value) {
    if (value === null || value === undefined || value === '') return 1;
    const n = Number(value);
    const v = Number.isFinite(n) ? clamp(n, .45, 1.65) : 1;
    return Math.abs(v - 1) <= .035 ? 1 : v;
  }

  function smoothstep(edge0, edge1, value) {
    if (edge0 === edge1) return value < edge0 ? 0 : 1;
    const t = clamp((value - edge0) / (edge1 - edge0));
    return t * t * (3 - 2 * t);
  }

  function gradeShaderAsciiChannel(lum, value, tint, saturation, level, minChannel, cap) {
    const tinted = lerp(lum, value, tint);
    const chroma = lum + (tinted - lum) * saturation;
    return clamp(chroma * level, minChannel, cap);
  }

  function gradeShaderAsciiSample(sample, gray, active, tintStrength, out = {}) {
    const lum = sample.r * .2126 + sample.g * .7152 + sample.b * .0722;
    const tint = clamp(tintStrength, 0, 1.08);
    const saturation = clamp(Number(SHADER_ASCII_COLOR_SATURATION) || 1, .1, 2.4);
    const exposure = clamp(Number(SHADER_ASCII_COLOR_EXPOSURE) || .96, .2, 1.4);
    const rolloffTarget = clamp(Number(SHADER_ASCII_HIGHLIGHT_ROLLOFF) || .70, .35, 1);
    const minChannel = clamp(Number(SHADER_ASCII_MIN_CHANNEL) || 30, 0, 96);
    const bright = clamp(gray / 205, .22, active > .65 ? 1.02 : .88);
    const highlight = smoothstep(112, 224, lum);
    const level = exposure * bright * lerp(1, rolloffTarget, highlight);
    const cap = active > .65 ? 192 : active > .22 ? 174 : 150;
    out.r = gradeShaderAsciiChannel(lum, sample.r, tint, saturation, level, minChannel, cap);
    out.g = gradeShaderAsciiChannel(lum, sample.g, tint, saturation, level, minChannel, cap);
    out.b = gradeShaderAsciiChannel(lum, sample.b, tint, saturation, level, minChannel, cap);
    return out;
  }

  const FIXED_VISUAL_SHARPNESS = .85;
  const DEFAULT_VISUAL_PRESET = Object.freeze({
    sensitivity: .45,
    sharpness: FIXED_VISUAL_SHARPNESS,
    rippleAmount: .55,
    gridBurstAmount: .35
  });

  function normalizeVisualPreset(preset = {}) {
    return {
      sensitivity: clamp(Number.isFinite(Number(preset.sensitivity)) ? Number(preset.sensitivity) : DEFAULT_VISUAL_PRESET.sensitivity),
      sharpness: clamp(Number.isFinite(Number(preset.sharpness)) ? Number(preset.sharpness) : DEFAULT_VISUAL_PRESET.sharpness),
      rippleAmount: clamp(Number.isFinite(Number(preset.rippleAmount)) ? Number(preset.rippleAmount) : DEFAULT_VISUAL_PRESET.rippleAmount),
      gridBurstAmount: clamp(Number.isFinite(Number(preset.gridBurstAmount)) ? Number(preset.gridBurstAmount) : DEFAULT_VISUAL_PRESET.gridBurstAmount)
    };
  }

  function formatTrackTitle(track = {}, fallback = 'Track') {
    const title = typeof track.title === 'string' ? track.title.trim() : '';
    if (title) return title;
    const artist = typeof track.artist === 'string' ? track.artist.trim() : '';
    const name = typeof track.name === 'string' ? track.name.trim() : typeof track.song === 'string' ? track.song.trim() : '';
    if (artist && name) return `${artist} - ${name}`;
    return name || artist || fallback;
  }

  function formatClock(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
    const total = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }

  function formatNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.round(n)).toLocaleString('en-US') : '0';
  }

  function formatStatNumber(value, fallback = '--') {
    if (value === null || value === undefined || value === '') return fallback;
    if (typeof value === 'string' && /^\d[\d,]*\+?$/.test(value.trim())) return value.trim();
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.round(n)).toLocaleString('en-US') : fallback;
  }

  function visualPresetStorageKey(trackId) {
    return `asciiVisualPreset:${trackId || 'unknown'}`;
  }

  function loadSavedVisualPreset(trackId) {
    if (!trackId) return null;
    try {
      const raw = localStorage.getItem(visualPresetStorageKey(trackId));
      if (!raw) return null;
      return normalizeVisualPreset(JSON.parse(raw));
    } catch (_) {
      return null;
    }
  }

  function saveVisualPreset(trackId, preset) {
    if (!trackId) return;
    try {
      localStorage.setItem(visualPresetStorageKey(trackId), JSON.stringify(normalizeVisualPreset(preset)));
    } catch (_) {}
  }

  const TIMELINE_SCHEMA = window.AsciiTimelineSchema || null;
  const TIMELINE_CONTROL_KEYS = TIMELINE_SCHEMA?.CONTROL_KEYS || ['sensitivity', 'rippleAmount', 'gridBurstAmount', 'asciiBrightness'];

  function roundTimeline(value, places = 3) {
    if (TIMELINE_SCHEMA) return TIMELINE_SCHEMA.round(value, places);
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    const scale = 10 ** places;
    return Math.round(n * scale) / scale;
  }

  function normalizeTimelineValue(key, value) {
    if (TIMELINE_SCHEMA) return TIMELINE_SCHEMA.normalizeTimelineValue(key, value);
    if (key === 'asciiBrightness') return normalizeAsciiBrightness(value);
    if (key === 'sharpness') return clamp(Number(value) || 0);
    if (key === 'shaderSpeed') return clamp(Number(value) || .8, .1, 1.8);
    if (key === 'mouseInfluence') return clamp(Number(value) || .7, 0, 1.6);
    return clamp(Number(value) || 0);
  }

  function normalizeTimelineKeyframes(key, frames) {
    if (TIMELINE_SCHEMA) return TIMELINE_SCHEMA.normalizeControlFrames(key, frames);
    if (!Array.isArray(frames)) return [];
    return frames
      .map((frame) => {
        const t = Number(frame?.t ?? frame?.time);
        const raw = Number(frame?.v ?? frame?.value);
        if (!Number.isFinite(t) || !Number.isFinite(raw)) return null;
        return { t: roundTimeline(Math.max(0, t)), v: roundTimeline(normalizeTimelineValue(key, raw)) };
      })
      .filter(Boolean)
      .sort((a, b) => a.t - b.t);
  }

  function normalizeVisualTimeline(raw = {}, track = {}) {
    if (TIMELINE_SCHEMA) {
      const validation = TIMELINE_SCHEMA.validate(raw);
      if (!validation.ok) console.warn('Timeline validation issues.', validation.errors);
      return TIMELINE_SCHEMA.normalize(raw, track, { version: 2 });
    }
    const controls = {};
    for (const key of TIMELINE_CONTROL_KEYS) {
      const frames = normalizeTimelineKeyframes(key, raw.controls?.[key]);
      if (frames.length) controls[key] = frames;
    }
    const events = Array.isArray(raw.events) ? raw.events.map((event) => {
      const t = Number(event?.t ?? event?.time);
      if (!Number.isFinite(t)) return null;
      const type = String(event.type || 'ripple');
      const strength = clamp(Number(event.strength ?? event.value ?? .6) || .6);
      return {
        t: roundTimeline(Math.max(0, t)),
        type,
        strength: roundTimeline(strength),
        gridType: event.gridType || event.grid || event.kind || '',
        frequency: roundTimeline(Number(event.frequency || event.hz || 900) || 900, 1)
      };
    }).filter(Boolean).sort((a, b) => a.t - b.t) : [];
    const sections = Array.isArray(raw.sections) ? raw.sections.map((section) => {
      const start = Number(section?.start ?? section?.t);
      const end = Number(section?.end ?? section?.to);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
      return {
        start: roundTimeline(Math.max(0, start)),
        end: roundTimeline(Math.max(0, end)),
        label: String(section.label || section.name || 'section'),
        intensity: roundTimeline(clamp(Number(section.intensity ?? .5) || .5))
      };
    }).filter(Boolean).sort((a, b) => a.start - b.start) : [];
    return {
      version: Number(raw.version) || 1,
      trackId: raw.trackId || track.id || 'unknown',
      title: raw.title || track.title || '',
      duration: roundTimeline(Number(raw.duration || 0) || 0),
      source: raw.source || 'visual-timeline',
      controls,
      events,
      sections,
      youtube: raw.youtube || raw.youtubeId ? { id: raw.youtubeId || raw.youtube?.id || '', url: raw.youtube?.url || raw.youtubeUrl || '' } : null
    };
  }

  function setupScrollSpace(root, options = {}) {
    if (options.scrollable === false) return null;
    const doc = root.ownerDocument;
    let el = doc.querySelector('[data-ascii-shader-scroll-space]');
    if (!el) {
      el = doc.createElement('div');
      el.className = 'ascii-shader-scroll-space';
      el.setAttribute('data-ascii-shader-scroll-space', '');
      root.insertAdjacentElement('afterend', el);
      el.__asciiOwned = true;
    }
    el.removeAttribute('aria-hidden');
    let worldLayer = el.querySelector('[data-ascii-shader-world-layer]');
    if (!worldLayer) {
      worldLayer = doc.createElement('div');
      worldLayer.className = 'ascii-shader-world-layer';
      worldLayer.setAttribute('data-ascii-shader-world-layer', '');
      el.appendChild(worldLayer);
    }
    el.style.setProperty('--ascii-scroll-height', typeof options.scrollHeight === 'number' ? `${options.scrollHeight}px` : String(options.scrollHeight || '240vh'));
    return el;
  }

  function parseYouTubeId(value = '') {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;
    try {
      const url = new URL(raw, window.location.href);
      if (url.hostname.includes('youtu.be')) return url.pathname.split('/').filter(Boolean)[0] || '';
      if (url.searchParams.get('v')) return url.searchParams.get('v') || '';
      const embed = url.pathname.match(/\/(?:embed|shorts|live)\/([a-zA-Z0-9_-]{11})/);
      if (embed) return embed[1];
    } catch (_) {}
    const match = raw.match(/[?&]v=([a-zA-Z0-9_-]{11})|youtu\.be\/([a-zA-Z0-9_-]{11})|\/(?:embed|shorts|live)\/([a-zA-Z0-9_-]{11})/);
    return match ? match[1] || match[2] || match[3] || '' : '';
  }

  function youtubeStartSecondsForTrack(track = {}) {
    const raw = track.youtubeStartSeconds ?? track.youtube?.startSeconds ?? track.youtube?.start ?? 0;
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  function youtubeCalibrationOffsetMsForTrack(track = {}) {
    const raw = track.youtubeCalibrationOffsetMs ?? track.timelineCalibrationOffsetMs ?? track.calibrationOffsetMs ?? track.youtube?.calibrationOffsetMs ?? track.youtube?.timelineOffsetMs ?? 0;
    const value = Number(raw);
    return Number.isFinite(value) ? clamp(value, -60000, 60000) : 0;
  }

  function toYouTubeSourceTime(track = {}, seconds = 0) {
    return youtubeStartSecondsForTrack(track) + Math.max(0, Number(seconds) || 0);
  }

  function fromYouTubeSourceTime(track = {}, seconds = 0) {
    return Math.max(0, (Number(seconds) || 0) - youtubeStartSecondsForTrack(track));
  }

  function isYouTubeManifestTrack(track = {}) {
    const sourceType = String(track.sourceType || track.type || track.kind || '').toLowerCase();
    return sourceType === 'youtube' || !!(track.youtubeId || track.youtubeUrl || track.youtube?.id || track.youtube?.url) && !track.src;
  }

  function loadYouTubeIframeAPI() {
    if (window.YT?.Player) return Promise.resolve(window.YT);
    if (window.__asciiYouTubeIframeApiPromise) return window.__asciiYouTubeIframeApiPromise;
    window.__asciiYouTubeIframeApiPromise = new Promise((resolve, reject) => {
      const previousReady = window.onYouTubeIframeAPIReady;
      const done = () => {
        if (typeof previousReady === 'function') {
          try { previousReady(); } catch (error) { console.warn('Previous YouTube API ready callback failed.', error); }
        }
        resolve(window.YT);
      };
      window.onYouTubeIframeAPIReady = done;
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.async = true;
        tag.onerror = () => reject(new Error('YouTube IFrame API failed to load.'));
        document.head.appendChild(tag);
      }
      window.setTimeout(() => {
        if (!window.YT?.Player) reject(new Error('YouTube IFrame API load timed out.'));
      }, 12000);
    });
    return window.__asciiYouTubeIframeApiPromise;
  }

  function loadUnicornStudioSDK() {
    if (window.UnicornStudio?.addScene || window.UnicornStudio?.init) return Promise.resolve(window.UnicornStudio);
    if (window.__asciiUnicornStudioPromise) return window.__asciiUnicornStudioPromise;
    window.__asciiUnicornStudioPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${UNICORN_STUDIO_SDK_URL}"]`);
      const done = () => {
        if (window.UnicornStudio?.addScene || window.UnicornStudio?.init) {
          resolve(window.UnicornStudio);
        } else {
          reject(new Error('Unicorn Studio SDK loaded without a usable runtime.'));
        }
      };
      if (existing) {
        existing.addEventListener('load', done, { once: true });
        existing.addEventListener('error', () => reject(new Error('Unicorn Studio SDK failed to load.')), { once: true });
      } else {
        const tag = document.createElement('script');
        tag.src = UNICORN_STUDIO_SDK_URL;
        tag.async = true;
        tag.onload = done;
        tag.onerror = () => reject(new Error('Unicorn Studio SDK failed to load.'));
        document.head.appendChild(tag);
      }
      window.setTimeout(() => {
        if (!window.UnicornStudio?.addScene && !window.UnicornStudio?.init) {
          reject(new Error('Unicorn Studio SDK load timed out.'));
        }
      }, 12000);
    });
    return window.__asciiUnicornStudioPromise;
  }

  async function mountPaletteUnicornScene(element) {
    if (!element) return null;
    if (!element.id) element.id = `ascii-palette-unicorn-${Math.random().toString(36).slice(2)}`;
    element.dataset.unicornState = 'loading';
    element.innerHTML = '';
    try {
      const studio = await loadUnicornStudioSDK();
      if (typeof studio?.addScene === 'function') {
        const scene = await studio.addScene({
          elementId: element.id,
          projectId: PALETTE_UNICORN_PROJECT_ID,
          scale: 1,
          dpi: Math.min(window.devicePixelRatio || 1, 1.5),
          fps: 60,
          lazyLoad: true,
          production: true
        });
        element.dataset.unicornState = 'ready';
        return scene || null;
      }
      if (typeof studio?.init === 'function') {
        await studio.init();
        element.dataset.unicornState = 'ready';
        return null;
      }
      throw new Error('Unicorn Studio runtime is unavailable.');
    } catch (error) {
      element.dataset.unicornState = 'failed';
      element.innerHTML = '';
      console.warn('Palette Unicorn Studio background failed to initialize.', error);
      return null;
    }
  }

  class PlaybackDriver {
    constructor(owner, options = {}) {
      this.owner = owner;
      this.options = options;
      this.offset = 0;
      this.playing = false;
    }
    get type() { return 'base'; }
    get canAnalyze() { return false; }
    get sampleRate() { return 44100; }
    supports() { return false; }
    selectTrack() {}
    currentTime() { return this.offset || 0; }
    duration() { return 0; }
    async preloadDuration() { return 0; }
    async decode() { throw new Error(`${this.type} cannot decode audio.`); }
    async play() { throw new Error(`${this.type} playback is not implemented.`); }
    pause() { this.playing = false; return this.offset || 0; }
    seek(seconds) { this.offset = Math.max(0, Number(seconds) || 0); this.playing = false; return this.offset; }
    stop() { this.playing = false; }
    setVolume() {}
    getVolume() { return Number(this.owner?.state?.volume) || 100; }
    analyserFrame() { return null; }
    destroy() { this.stop(); }
  }

  class LocalAudioDriver extends PlaybackDriver {
    constructor(owner, options = {}) {
      super(owner, options);
      this.context = null;
      this.analyser = null;
      this.fastAnalyser = null;
      this.gain = null;
      this.source = null;
      this.currentBuffer = null;
      this.currentBufferTrackId = null;
      this.startedAt = 0;
      this.freq = null;
      this.fastFreq = null;
      this.prevFast = null;
      this.decoded = new Map();
      this.decodedLimit = Math.max(1, Math.floor(Number(options.decodedCacheLimit) || 4));
    }
    get type() { return 'local-audio'; }
    get canAnalyze() { return true; }
    get sampleRate() { return this.context?.sampleRate || 44100; }
    supports(track = {}) { return track.kind !== 'youtube'; }
    selectTrack(track = {}) {
      if (this.currentBufferTrackId !== track.id) {
        this.currentBuffer = null;
        this.currentBufferTrackId = null;
      }
      this.offset = 0;
    }
    getDecoded(trackId) {
      if (!this.decoded.has(trackId)) return null;
      const decoded = this.decoded.get(trackId);
      this.decoded.delete(trackId);
      this.decoded.set(trackId, decoded);
      return decoded;
    }
    rememberDecoded(trackId, decoded) {
      if (!trackId || !decoded) return;
      if (this.decoded.has(trackId)) this.decoded.delete(trackId);
      this.decoded.set(trackId, decoded);
      while (this.decoded.size > this.decodedLimit) {
        const oldest = this.decoded.keys().next().value;
        this.decoded.delete(oldest);
      }
    }
    async ensureContext({ resume = true } = {}) {
      if (!this.context) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.context = new AudioContextClass();
        this.analyser = this.context.createAnalyser();
        this.analyser.fftSize = 2048;
        this.analyser.smoothingTimeConstant = .82;
        this.analyser.minDecibels = -85;
        this.analyser.maxDecibels = -20;
        this.fastAnalyser = this.context.createAnalyser();
        this.fastAnalyser.fftSize = 1024;
        this.fastAnalyser.smoothingTimeConstant = .18;
        this.fastAnalyser.minDecibels = -88;
        this.fastAnalyser.maxDecibels = -18;
        this.gain = this.context.createGain();
        this.gain.gain.value = clamp((Number(this.owner?.state?.volume) || 100) / 100, 0, 1);
        this.gain.connect(this.context.destination);
        this.freq = new Uint8Array(this.analyser.frequencyBinCount);
        this.fastFreq = new Uint8Array(this.fastAnalyser.frequencyBinCount);
        this.prevFast = new Float32Array(this.fastAnalyser.frequencyBinCount);
      }
      if (resume && this.context.state === 'suspended') await this.context.resume();
    }
    setVolume(value) {
      const volume = clamp(Number(value) || 0, 0, 100);
      if (this.gain) this.gain.gain.value = volume / 100;
    }
    getVolume() {
      if (this.gain) return Math.round(clamp(this.gain.gain.value, 0, 1) * 100);
      return Number(this.owner?.state?.volume) || 100;
    }
    createSynthBuffer() {
      const sr = this.context.sampleRate;
      const duration = 18;
      const buffer = this.context.createBuffer(1, Math.floor(sr * duration), sr);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const beatPhase = t % .5;
        const kickEnv = beatPhase < .32 ? Math.exp(-beatPhase * 18) : 0;
        const kickFreq = 58 + 52 * Math.exp(-beatPhase * 26);
        const kick = Math.sin(2 * Math.PI * kickFreq * t) * kickEnv * .82;
        const snPhase = (t - .5) % 1;
        const snEnv = snPhase >= 0 && snPhase < .18 ? Math.exp(-snPhase * 25) : 0;
        const snare = (Math.sin(2 * Math.PI * 190 * t) + .6 * Math.sin(2 * Math.PI * 340 * t)) * snEnv * .16;
        const bassNote = [82.41, 98, 110, 73.42][Math.floor(t * 2) % 4];
        const bass = Math.sin(2 * Math.PI * bassNote * t) * .20 * (.65 + .35 * Math.sin(2 * Math.PI * .5 * t));
        const midNote = [220, 277.18, 329.63, 392, 440, 392, 329.63, 277.18][Math.floor(t * 4) % 8];
        const mid = Math.sin(2 * Math.PI * midNote * t) * .10;
        const hatPhase = t % .25;
        const hatEnv = hatPhase < .08 ? Math.exp(-hatPhase * 55) : 0;
        const high = (Math.sin(2 * Math.PI * 5600 * t) + .4 * Math.sin(2 * Math.PI * 7200 * t)) * hatEnv * .052;
        data[i] = Math.tanh((kick + snare + bass + mid + high) * 1.12) * .72;
      }
      return buffer;
    }
    async decode(track, { resume = true } = {}) {
      await this.ensureContext({ resume });
      if (track.kind === 'synth') return this.createSynthBuffer();
      const cached = this.getDecoded(track.id);
      if (cached) return cached;
      let arrayBuffer;
      if (track.kind === 'file') arrayBuffer = await track.file.arrayBuffer();
      else {
        const src = /^(blob:|data:|https?:)/i.test(track.src) ? track.src : `${this.options.assetBase || ''}${track.src}`;
        const response = await fetch(src);
        arrayBuffer = await response.arrayBuffer();
      }
      const decoded = await this.context.decodeAudioData(arrayBuffer.slice(0));
      this.rememberDecoded(track.id, decoded);
      this.owner.buildAnalysis(decoded).catch(() => {});
      return decoded;
    }
    duration(track = {}) {
      if (this.currentBuffer && track && this.currentBufferTrackId === track.id) return this.currentBuffer.duration || 0;
      return this.decoded.get(track?.id)?.duration || 0;
    }
    currentTime() {
      const duration = this.currentBuffer?.duration || 0;
      if (this.playing && this.context && this.currentBuffer) {
        return clamp(this.context.currentTime - this.startedAt, 0, duration || this.currentBuffer.duration);
      }
      return clamp(this.offset || 0, 0, duration || Number.MAX_SAFE_INTEGER);
    }
    async preloadDuration(track) {
      if (!track) return 0;
      const cached = this.decoded.get(track.id);
      if (cached) return cached.duration || 0;
      const buffer = await this.decode(track, { resume: false });
      return buffer.duration || 0;
    }
    stopSourceOnly() {
      if (this.source) {
        try { this.source.onended = null; this.source.stop(); } catch (_) {}
        try { this.source.disconnect(); } catch (_) {}
        this.source = null;
      }
    }
    stop() {
      this.stopSourceOnly();
      this.playing = false;
    }
    seek(seconds) {
      const duration = this.currentBuffer?.duration || 0;
      const target = clamp(Number(seconds) || 0, 0, duration || Number.MAX_SAFE_INTEGER);
      this.stop();
      this.offset = target;
      return target;
    }
    pause() {
      if (this.context && this.currentBuffer && this.playing) this.offset = this.currentTime();
      this.stop();
      return this.offset;
    }
    async play(track, { offset = this.offset || 0, isCurrent = () => true, onEnded = null } = {}) {
      await this.ensureContext();
      this.stopSourceOnly();
      const buffer = await this.decode(track);
      if (!isCurrent()) return null;
      this.currentBuffer = buffer;
      this.currentBufferTrackId = track.id;
      this.source = this.context.createBufferSource();
      this.source.buffer = buffer;
      this.source.connect(this.gain);
      this.source.connect(this.analyser);
      this.source.connect(this.fastAnalyser);
      const startOffset = clamp(offset || 0, 0, Math.max(0, buffer.duration - .05));
      this.startedAt = this.context.currentTime - startOffset;
      this.source.onended = () => {
        this.playing = false;
        if (onEnded) onEnded();
      };
      this.source.start(0, startOffset);
      this.playing = true;
      this.offset = startOffset;
      return { buffer, duration: buffer.duration || 0, offset: startOffset };
    }
    analyserFrame() {
      if (!this.analyser || !this.fastAnalyser || !this.freq || !this.fastFreq || !this.prevFast) return null;
      return {
        context: this.context,
        analyser: this.analyser,
        fastAnalyser: this.fastAnalyser,
        freq: this.freq,
        fastFreq: this.fastFreq,
        prevFast: this.prevFast,
        sampleRate: this.sampleRate
      };
    }
    destroy() {
      this.stop();
      this.decoded.clear();
      this.currentBuffer = null;
      this.currentBufferTrackId = null;
      if (this.context && this.context.state !== 'closed') this.context.close().catch(() => {});
      this.context = null;
      this.analyser = null;
      this.fastAnalyser = null;
      this.gain = null;
    }
  }

  class YouTubeIframeDriver extends PlaybackDriver {
    constructor(owner, options = {}) {
      super(owner, options);
      this.shell = document.getElementById('youtube-player-shell');
      this.slot = document.getElementById('youtube-player');
      this.restoreZone = document.getElementById('youtube-player-restore-zone');
      this.minimizeButton = document.getElementById('youtube-player-minimize');
      this.restoreButton = document.getElementById('youtube-player-restore');
      this.player = null;
      this.readyPromise = null;
      this.currentTrackId = '';
      this.currentVideoId = '';
      this.pendingTrack = null;
      this.lastState = -1;
      this.buffering = false;
      this.pendingSeek = null;
      this.durationCache = new Map();
      this.onEnded = null;
      this.error = '';
      this.playAttemptSerial = 0;
      this.selectionSerial = 0;
      this.playAttemptDeadline = 0;
      this.volumeFadeRaf = 0;
      this.volumeFadeToken = 0;
      this.volumeFadePending = null;
      this.warmingUp = false;
      this.warmupGeneration = 0;
      this.warmupPromises = new Map();
      this.warmedTrackIds = new Set();
      this.stowed = false;
      this.initialAutoStowTimer = 0;
      this.initialAutoStowComplete = false;
      this.bindChrome();
    }
    get type() { return 'youtube-iframe'; }
    get canAnalyze() { return false; }
    supports(track = {}) { return track.kind === 'youtube' || (!track.src && !track.file && !!(track.youtubeId || track.youtubeUrl)); }
    videoIdForTrack(track = {}) { return parseYouTubeId(track.youtubeId || track.youtube?.id || track.youtubeUrl || track.youtube?.url || ''); }
    sourceStartSeconds(track = this.pendingTrack || {}) { return youtubeStartSecondsForTrack(track); }
    toSourceTime(track = this.pendingTrack || {}, seconds = 0) { return toYouTubeSourceTime(track, seconds); }
    fromSourceTime(track = this.pendingTrack || {}, seconds = 0) { return fromYouTubeSourceTime(track, seconds); }
    show(visible = true) {
      this.shell?.classList.toggle('is-visible', !!visible);
      this.restoreZone?.classList.toggle('is-active', !!visible && this.stowed);
      this.restoreZone?.setAttribute('aria-hidden', String(!(visible && this.stowed)));
      if (visible && this.player?.setSize) this.player.setSize(Math.max(200, this.slot?.clientWidth || 360), Math.max(200, this.slot?.clientHeight || 220));
      if (visible) this.scheduleInitialAutoStow();
      else this.clearInitialAutoStow();
    }
    scheduleInitialAutoStow() {
      if (this.initialAutoStowComplete || this.initialAutoStowTimer || this.stowed) return;
      this.initialAutoStowTimer = window.setTimeout(() => {
        this.initialAutoStowTimer = 0;
        this.initialAutoStowComplete = true;
        this.setStowed(true);
      }, YOUTUBE_PLAYER_INITIAL_AUTO_STOW_MS);
    }
    clearInitialAutoStow({ complete = false } = {}) {
      if (this.initialAutoStowTimer) {
        window.clearTimeout(this.initialAutoStowTimer);
        this.initialAutoStowTimer = 0;
      }
      if (complete) this.initialAutoStowComplete = true;
    }
    bindChrome() {
      const stop = (event) => event.stopPropagation();
      [this.minimizeButton, this.restoreButton, this.restoreZone, this.shell].forEach((el) => {
        ['pointerdown', 'mousedown', 'click', 'dblclick'].forEach((type) => el?.addEventListener(type, stop));
      });
      this.minimizeButton?.addEventListener('click', () => {
        this.clearInitialAutoStow({ complete: true });
        this.setStowed(true);
      });
      this.restoreButton?.addEventListener('click', () => {
        this.clearInitialAutoStow({ complete: true });
        this.setStowed(false);
      });
      this.restoreZone?.addEventListener('pointerenter', () => this.restoreZone?.classList.add('is-peeking'));
      this.restoreZone?.addEventListener('pointerleave', () => this.restoreZone?.classList.remove('is-peeking'));
      this.restoreZone?.addEventListener('focusin', () => this.restoreZone?.classList.add('is-peeking'));
      this.restoreZone?.addEventListener('focusout', () => this.restoreZone?.classList.remove('is-peeking'));
      this.restoreZone?.addEventListener('click', (event) => {
        if (this.stowed && event.target === this.restoreZone) {
          this.clearInitialAutoStow({ complete: true });
          this.setStowed(false);
        }
      });
    }
    setStowed(stowed) {
      this.stowed = !!stowed;
      this.shell?.classList.toggle('is-stowed', this.stowed);
      this.restoreZone?.classList.toggle('is-active', this.stowed && this.shell?.classList.contains('is-visible'));
      this.restoreZone?.setAttribute('aria-hidden', String(!(this.stowed && this.shell?.classList.contains('is-visible'))));
      if (!this.stowed) this.restoreZone?.classList.remove('is-peeking');
      if (!this.stowed && this.player?.setSize) this.player.setSize(Math.max(200, this.slot?.clientWidth || 360), Math.max(200, this.slot?.clientHeight || 220));
    }
    stateName(state = this.lastState) {
      const YTState = window.YT?.PlayerState || {};
      if (state === YTState.PLAYING || state === 1) return 'playing';
      if (state === YTState.PAUSED || state === 2) return 'paused';
      if (state === YTState.BUFFERING || state === 3) return 'buffering';
      if (state === YTState.ENDED || state === 0) return 'ended';
      if (state === YTState.CUED || state === 5) return 'cued';
      return 'unstarted';
    }
    onStateChange(event = {}) {
      this.lastState = Number(event.data);
      this.playing = !this.warmingUp && this.lastState === (window.YT?.PlayerState?.PLAYING ?? 1);
      this.buffering = !this.warmingUp && this.lastState === (window.YT?.PlayerState?.BUFFERING ?? 3);
      const YTState = window.YT?.PlayerState || {};
      const selectedTrackId = this.owner?.currentTrack?.()?.id || '';
      const shouldResume = !this.warmingUp && this.owner?.playbackIntent && this.currentTrackId === selectedTrackId && (
        this.lastState === (YTState.CUED ?? 5) || this.lastState === (YTState.PAUSED ?? 2)
      );
      if (shouldResume) {
        this.buffering = true;
        try { this.player?.playVideo?.(); } catch (_) {}
      }
      if (this.playing) {
        this.playAttemptDeadline = 0;
        if (this.volumeFadePending) {
          const pending = this.volumeFadePending;
          this.volumeFadePending = null;
          this.startVolumeFade(this.player, pending);
        }
      }
      const duration = this.duration();
      if (duration && this.currentTrackId) this.durationCache.set(this.currentTrackId, duration);
      if (this.lastState === (window.YT?.PlayerState?.ENDED ?? 0)) {
        this.playing = false;
        this.offset = 0;
        const ended = this.onEnded;
        if (ended) ended();
      }
    }
    onError(event = {}) {
      this.playing = false;
      this.buffering = false;
      this.setUnavailable(`YouTube unavailable${event.data ? ` (${event.data})` : ''}`);
      console.warn('YouTube player error.', event.data);
    }
    clearUnavailable() {
      this.error = '';
      this.shell?.classList.remove('has-error');
      const label = this.shell?.querySelector('.ascii-youtube-player-label');
      if (label) label.textContent = 'YouTube source';
      if (this.owner?.state) this.owner.state.mediaError = '';
    }
    setUnavailable(message = 'YouTube unavailable') {
      this.error = message;
      this.playing = false;
      this.buffering = false;
      this.playAttemptDeadline = 0;
      this.shell?.classList.add('has-error');
      const label = this.shell?.querySelector('.ascii-youtube-player-label');
      if (label) label.textContent = message;
      if (this.owner?.state) {
        this.owner.state.mediaError = message;
        this.owner.state.loading = false;
        this.owner.state.playing = false;
      }
    }
    watchPlayAvailability(track = {}, serial = this.playAttemptSerial) {
      window.setTimeout(() => {
        if (serial !== this.playAttemptSerial || this.currentTrackId !== (track.id || '')) return;
        const state = this.getPlayerState();
        const data = this.player?.getVideoData?.();
        const YTState = window.YT?.PlayerState || {};
        const active = state === (YTState.PLAYING ?? 1) || state === (YTState.BUFFERING ?? 3);
        const unresolved = state === -1;
        if (!active && (data?.errorCode || unresolved)) this.setUnavailable('YouTube unavailable or blocked');
      }, 2600);
    }
    ensureSlot() {
      if (!this.shell) this.shell = document.getElementById('youtube-player-shell');
      if (!this.slot || !document.getElementById('youtube-player')) {
        const slot = document.createElement('div');
        slot.id = 'youtube-player';
        this.shell?.appendChild(slot);
        this.slot = slot;
      }
      return this.slot;
    }
    applyIframePermissions() {
      const iframe = this.shell?.querySelector('iframe') || this.slot?.querySelector?.('iframe');
      if (!iframe) return;
      iframe.setAttribute('allow', 'autoplay; encrypted-media; fullscreen; picture-in-picture');
      iframe.setAttribute('playsinline', '1');
    }
    async ensurePlayer(track = this.pendingTrack || {}, { isCurrent = () => true } = {}) {
      const videoId = this.videoIdForTrack(track);
      if (!videoId) throw new Error('YouTube track is missing youtubeId/youtubeUrl.');
      this.pendingTrack = track;
      this.clearUnavailable();
      this.show(true);
      const YT = await loadYouTubeIframeAPI();
      if (!this.player) {
        const slot = this.ensureSlot();
        this.readyPromise = new Promise((resolve, reject) => {
          this.player = new YT.Player(slot.id, {
            width: Math.max(200, this.slot?.clientWidth || 360),
            height: Math.max(200, this.slot?.clientHeight || 220),
            videoId,
            playerVars: {
              controls: 1,
              playsinline: 1,
              autoplay: this.options.youtubeInitialAutoplay === true ? 1 : 0,
              mute: this.options.youtubeFadeStartMuted !== false ? 1 : 0,
              start: Math.floor(this.sourceStartSeconds(track)),
              rel: 0,
              modestbranding: 1,
              origin: window.location.origin
            },
            events: {
              onReady: () => {
                this.currentTrackId = track.id || '';
                this.currentVideoId = videoId;
                this.applyIframePermissions();
                this.clearUnavailable();
                this.offset = Math.max(0, Number(this.pendingSeek ?? this.offset) || 0);
                const sourceOffset = this.toSourceTime(track, this.offset);
                if (sourceOffset > 0) {
                  try { this.player.seekTo(sourceOffset, true); } catch (_) {}
                }
                resolve(this.player);
              },
              onStateChange: (event) => this.onStateChange(event),
              onError: (event) => {
                this.onError(event);
                reject(new Error(`YouTube player error ${event.data || ''}`.trim()));
              }
            }
          });
        });
      }
      await this.readyPromise;
      if (!isCurrent()) return this.player;
      this.show(true);
      this.applyIframePermissions();
      if (this.currentVideoId !== videoId) {
        const startOffset = Math.max(0, Number(this.pendingSeek ?? this.offset) || 0);
        this.player.cueVideoById({ videoId, startSeconds: this.toSourceTime(track, startOffset) });
        this.currentTrackId = track.id || '';
        this.currentVideoId = videoId;
        this.offset = startOffset;
      }
      return this.player;
    }
    async cueTrack(track = {}, { isCurrent = () => true } = {}) {
      const player = await this.ensurePlayer(track, { isCurrent });
      if (!isCurrent()) return 0;
      const videoId = this.videoIdForTrack(track);
      if (this.currentVideoId !== videoId || this.currentTrackId !== track.id) {
        const startOffset = Math.max(0, Number(this.pendingSeek ?? this.offset) || 0);
        player.cueVideoById({ videoId, startSeconds: this.toSourceTime(track, startOffset) });
        this.currentVideoId = videoId;
        this.currentTrackId = track.id || '';
        this.offset = startOffset;
      }
      return this.duration(track);
    }
    selectTrack(track = {}, { cue = true } = {}) {
      const serial = ++this.selectionSerial;
      this.pendingTrack = track;
      this.offset = 0;
      this.pendingSeek = null;
      this.playAttemptSerial += 1;
      this.playAttemptDeadline = 0;
      this.playing = false;
      this.buffering = false;
      this.onEnded = null;
      this.clearUnavailable();
      this.show(this.supports(track));
      const isCurrent = () => serial === this.selectionSerial && this.pendingTrack?.id === track.id;
      if (cue && this.supports(track)) this.cueTrack(track, { isCurrent }).catch((error) => {
        if (!isCurrent()) return;
        this.setUnavailable('YouTube unavailable');
        console.warn('YouTube cue failed.', error);
      });
    }
    getCurrentTime() { return this.currentTime(); }
    currentTime() {
      try {
        const t = this.player?.getCurrentTime?.();
        if (Number.isFinite(t)) {
          const logicalTime = this.fromSourceTime(this.pendingTrack || {}, t);
          const logicalDuration = this.duration(this.pendingTrack || {});
          if (this.playing && logicalDuration && logicalTime >= logicalDuration - .05) {
            this.offset = logicalDuration;
            this.playing = false;
            this.buffering = false;
            try { this.player?.pauseVideo?.(); } catch (_) {}
            const ended = this.onEnded;
            this.onEnded = null;
            if (ended) ended();
            return this.offset;
          }
          this.offset = logicalTime;
          return this.offset;
        }
      } catch (_) {}
      return Math.max(0, this.offset || 0);
    }
    getDuration() { return this.duration(this.pendingTrack || {}); }
    duration(track = this.pendingTrack || {}) {
      const authoredDuration = Number(track?.duration);
      if (Number.isFinite(authoredDuration) && authoredDuration > 0) return authoredDuration;
      try {
        const d = this.player?.getDuration?.();
        if (Number.isFinite(d) && d > 0) {
          const logicalDuration = Math.max(0, d - this.sourceStartSeconds(track));
          if (track?.id) this.durationCache.set(track.id, logicalDuration);
          else if (this.currentTrackId) this.durationCache.set(this.currentTrackId, logicalDuration);
          return logicalDuration;
        }
      } catch (_) {}
      return this.durationCache.get(track?.id) || Number(track?.duration) || 0;
    }
    getPlayerState() {
      try {
        const state = this.player?.getPlayerState?.();
      if (Number.isFinite(state)) {
        this.lastState = state;
        this.playing = !this.warmingUp && state === (window.YT?.PlayerState?.PLAYING ?? 1);
        this.buffering = !this.warmingUp && state === (window.YT?.PlayerState?.BUFFERING ?? 3);
        if (this.playing) this.playAttemptDeadline = 0;
        if (this.playAttemptDeadline && performance.now() > this.playAttemptDeadline && state === -1) {
          this.setUnavailable('YouTube unavailable or blocked');
        }
        return state;
      }
      } catch (_) {}
      return this.lastState;
    }
    warmupKey(track = {}) { return track.id || this.videoIdForTrack(track); }
    isWarmForTrack(track = {}) {
      const key = this.warmupKey(track);
      return !!key && this.warmedTrackIds.has(key);
    }
    rawPlayerState(player = this.player) {
      try {
        const state = player?.getPlayerState?.();
        if (Number.isFinite(state)) {
          this.lastState = state;
          return state;
        }
      } catch (_) {}
      return this.lastState;
    }
    targetVolume() {
      const stateVolume = Number(this.owner?.state?.volume);
      if (Number.isFinite(stateVolume)) return clamp(stateVolume, 0, 100);
      return clamp(Number(this.options.youtubeFadeTargetVolume ?? 100), 0, 100);
    }
    setVolume(value) {
      const volume = clamp(Number(value) || 0, 0, 100);
      this.clearVolumeFade();
      try {
        this.player?.setVolume?.(volume);
        if (volume > 0) this.player?.unMute?.();
      } catch (_) {}
    }
    getVolume() {
      try {
        const volume = this.player?.getVolume?.();
        if (Number.isFinite(volume)) return clamp(volume, 0, 100);
      } catch (_) {}
      return this.targetVolume();
    }
    async waitForWarmupSignal(player, track = {}, timeoutMs = 3200) {
      const YTState = window.YT?.PlayerState || {};
      const activeStates = new Set([
        YTState.PLAYING ?? 1,
        YTState.BUFFERING ?? 3,
        YTState.PAUSED ?? 2
      ]);
      const deadline = performance.now() + timeoutMs;
      while (performance.now() < deadline) {
        const state = this.rawPlayerState(player);
        if (activeStates.has(state)) return true;
        let loaded = 0;
        try { loaded = Number(player?.getVideoLoadedFraction?.() || 0); } catch (_) {}
        if (loaded > .01 || this.duration(track) > 0) return true;
        await new Promise((resolve) => window.setTimeout(resolve, 80));
      }
      return false;
    }
    cancelWarmup() {
      this.warmupGeneration += 1;
      this.warmingUp = false;
      this.warmupPromises.clear();
    }
    async warmupTrack(track = {}, { startOffset = 0, timeoutMs = 7000 } = {}) {
      if (!this.supports(track)) return false;
      const key = this.warmupKey(track);
      if (!key) return false;
      if (this.warmedTrackIds.has(key)) return true;
      if (this.warmupPromises.has(key)) return this.warmupPromises.get(key);
      const generation = ++this.warmupGeneration;
      const warmupPromise = (async () => {
        const player = await this.ensurePlayer(track);
        if (generation !== this.warmupGeneration) return false;
        const videoId = this.videoIdForTrack(track);
        const sourceOffset = this.toSourceTime(track, Math.max(0, Number(startOffset) || 0));
        this.clearVolumeFade();
        this.warmingUp = true;
        this.playAttemptDeadline = 0;
        try {
          player.setVolume?.(0);
          player.mute?.();
          player.loadVideoById({ videoId, startSeconds: sourceOffset });
          this.currentVideoId = videoId;
          this.currentTrackId = track.id || '';
          this.offset = Math.max(0, Number(startOffset) || 0);
          this.pendingSeek = null;
          player.playVideo?.();
          const signaled = await this.waitForWarmupSignal(player, track, Math.min(3600, timeoutMs));
          if (generation !== this.warmupGeneration) return false;
          if (signaled) await new Promise((resolve) => window.setTimeout(resolve, 180));
          if (generation !== this.warmupGeneration) return false;
          try { player.pauseVideo?.(); } catch (_) {}
          await new Promise((resolve) => window.setTimeout(resolve, 80));
          if (generation !== this.warmupGeneration) return false;
          try { player.seekTo?.(sourceOffset, true); } catch (_) {}
          this.playing = false;
          this.buffering = false;
          this.offset = Math.max(0, Number(startOffset) || 0);
          const state = this.rawPlayerState(player);
          let loaded = 0;
          try { loaded = Number(player.getVideoLoadedFraction?.() || 0); } catch (_) {}
          const YTState = window.YT?.PlayerState || {};
          const readyState = state === (YTState.PAUSED ?? 2) || state === (YTState.CUED ?? 5) || state === (YTState.BUFFERING ?? 3) || state === (YTState.PLAYING ?? 1);
          const warmed = !this.error && this.currentVideoId === videoId && (signaled || readyState || loaded > .01 || this.duration(track) > 0);
          if (warmed) this.warmedTrackIds.add(key);
          return warmed;
        } catch (error) {
          if (generation !== this.warmupGeneration) return false;
          console.warn('YouTube warm-up failed.', error);
          return false;
        } finally {
          if (generation === this.warmupGeneration) {
            this.warmingUp = false;
            this.playing = false;
            this.buffering = false;
            this.playAttemptDeadline = 0;
            this.warmupPromises.delete(key);
          }
        }
      })();
      this.warmupPromises.set(key, warmupPromise);
      return warmupPromise;
    }
    clearVolumeFade() {
      this.volumeFadeToken += 1;
      this.volumeFadePending = null;
      if (this.volumeFadeRaf) {
        cancelAnimationFrame(this.volumeFadeRaf);
        this.volumeFadeRaf = 0;
      }
    }
    restoreTargetVolume(player) {
      if (!player?.setVolume) return;
      try {
        player.setVolume(this.targetVolume());
        player.unMute?.();
      } catch (_) {}
    }
    prepareVolumeFade(player, enabled = false) {
      const duration = Number(this.options.youtubeFadeInMs || 0);
      if (!enabled || !(duration > 0) || !player?.setVolume) {
        this.clearVolumeFade();
        this.restoreTargetVolume(player);
        return null;
      }
      const targetVolume = this.targetVolume();
      this.clearVolumeFade();
      try {
        player.setVolume(0);
        if (this.options.youtubeFadeStartMuted !== false) player.mute?.();
      } catch (_) {
        return null;
      }
      return { duration, targetVolume };
    }
    startVolumeFade(player, config) {
      if (!config || !player?.setVolume) return;
      const state = this.getPlayerState();
      const playingState = window.YT?.PlayerState?.PLAYING ?? 1;
      if (state !== playingState) {
        this.volumeFadePending = config;
        return;
      }
      const token = ++this.volumeFadeToken;
      const startedAt = performance.now();
      const step = (now) => {
        if (token !== this.volumeFadeToken || !this.player) return;
        const progress = clamp((now - startedAt) / config.duration, 0, 1);
        const eased = progress * progress * (3 - 2 * progress);
        const volume = Math.round(config.targetVolume * eased);
        try {
          player.unMute?.();
          player.setVolume(volume);
        } catch (_) {
          this.clearVolumeFade();
          return;
        }
        if (progress < 1) this.volumeFadeRaf = requestAnimationFrame(step);
        else this.volumeFadeRaf = 0;
      };
      this.volumeFadeRaf = requestAnimationFrame(step);
    }
    async preloadDuration(track = this.pendingTrack || {}, { isCurrent = () => true } = {}) {
      if (!this.supports(track)) return 0;
      const authoredDuration = Number(track?.duration);
      if (Number.isFinite(authoredDuration) && authoredDuration > 0) return authoredDuration;
      if (this.durationCache.has(track.id)) return this.durationCache.get(track.id);
      await this.cueTrack(track, { isCurrent });
      if (!isCurrent()) return 0;
      return this.duration(track);
    }
    async play(track, { offset = this.offset || 0, isCurrent = () => true, onEnded = null, fadeIn = false } = {}) {
      this.cancelWarmup();
      const player = await this.ensurePlayer(track, { isCurrent });
      if (!isCurrent()) return null;
      const fadeConfig = this.prepareVolumeFade(player, fadeIn);
      const videoId = this.videoIdForTrack(track);
      const startOffset = Math.max(0, Number(offset) || 0);
      this.onEnded = onEnded;
      this.currentTrackId = track.id || '';
      const sourceOffset = this.toSourceTime(track, startOffset);
      if (this.currentVideoId !== videoId || this.getPlayerState() === -1) {
        player.loadVideoById({ videoId, startSeconds: sourceOffset });
        this.currentVideoId = videoId;
      } else if (Math.abs(this.currentTime() - startOffset) > .35) {
        player.seekTo(sourceOffset, true);
      }
      this.pendingSeek = null;
      player.playVideo();
      this.startVolumeFade(player, fadeConfig);
      const serial = ++this.playAttemptSerial;
      this.playing = true;
      this.buffering = false;
      this.clearUnavailable();
      this.playAttemptDeadline = performance.now() + 3000;
      this.offset = startOffset;
      this.watchPlayAvailability(track, serial);
      return { duration: this.duration(track), offset: this.currentTime() || startOffset };
    }
    pause() {
      this.clearVolumeFade();
      this.onEnded = null;
      const pending = Number(this.pendingSeek);
      const measured = this.currentTime();
      const pausedAt = Number.isFinite(pending) && Math.abs(measured - pending) > .35 && !this.playing ? pending : measured;
      try { this.player?.pauseVideo?.(); } catch (_) {}
      this.offset = pausedAt;
      this.playing = false;
      this.buffering = false;
      this.playAttemptDeadline = 0;
      return pausedAt;
    }
    seek(seconds) {
      const duration = this.duration(this.pendingTrack || {});
      const target = clamp(Number(seconds) || 0, 0, duration || Number.MAX_SAFE_INTEGER);
      this.pendingSeek = target;
      try { this.player?.seekTo?.(this.toSourceTime(this.pendingTrack || {}, target), true); } catch (_) {}
      this.offset = target;
      return target;
    }
    stop() {
      this.pause();
      this.show(false);
    }
    destroy() {
      this.clearInitialAutoStow();
      this.clearVolumeFade();
      this.cancelWarmup();
      this.selectionSerial += 1;
      this.playing = false;
      this.buffering = false;
      try { this.player?.destroy?.(); } catch (_) {}
      this.player = null;
      this.readyPromise = null;
      this.show(false);
    }
  }

  class PlaybackClock {
    constructor() {
      this.time = 0;
      this.duration = 0;
      this.state = 'idle';
      this.seeking = false;
      this.buffering = false;
      this.source = 'none';
      this.trackId = '';
      this.driver = null;
    }
    resetForTrack(track = {}, driver = null, duration = 0) {
      this.driver = driver || null;
      this.trackId = track?.id || '';
      this.source = driver?.type || 'none';
      this.duration = Math.max(0, Number(duration) || 0);
      this.time = 0;
      this.state = 'idle';
      this.seeking = false;
      this.buffering = false;
      return this.snapshot();
    }
    onPlay({ driver = this.driver, duration = this.duration, time = null } = {}) {
      this.driver = driver || this.driver;
      this.source = this.driver?.type || this.source || 'none';
      if (Number.isFinite(duration)) this.duration = Math.max(0, Number(duration) || 0);
      this.time = this.clampTime(time ?? this.readDriverTime());
      this.state = 'playing';
      this.seeking = false;
      this.buffering = false;
      return this.snapshot();
    }
    onPause({ driver = this.driver, time = null, duration = this.duration } = {}) {
      this.driver = driver || this.driver;
      this.source = this.driver?.type || this.source || 'none';
      if (Number.isFinite(duration)) this.duration = Math.max(0, Number(duration) || 0);
      this.time = this.clampTime(time ?? this.readDriverTime());
      this.state = 'paused';
      this.seeking = false;
      this.buffering = false;
      return this.snapshot();
    }
    onSeek(seconds, { driver = this.driver, duration = this.duration, resume = false } = {}) {
      this.driver = driver || this.driver;
      this.source = this.driver?.type || this.source || 'none';
      if (Number.isFinite(duration)) this.duration = Math.max(0, Number(duration) || 0);
      this.time = this.clampTime(seconds);
      this.state = resume ? 'playing' : 'paused';
      this.seeking = false;
      this.buffering = false;
      return this.snapshot();
    }
    update({ driver = this.driver, duration = this.duration, playing = false, buffering = false, seeking = false } = {}) {
      this.driver = driver || this.driver;
      this.source = this.driver?.type || this.source || 'none';
      if (Number.isFinite(duration) && duration > 0) this.duration = Math.max(0, Number(duration) || 0);
      this.buffering = !!buffering;
      this.seeking = !!seeking;
      if (this.buffering) {
        this.state = 'buffering';
      } else if (playing) {
        this.state = 'playing';
        this.time = this.clampTime(this.readDriverTime());
      } else if (this.state !== 'idle') {
        this.state = 'paused';
      }
      return this.snapshot();
    }
    setBuffering(buffering, { driver = this.driver, duration = this.duration } = {}) {
      this.driver = driver || this.driver;
      this.source = this.driver?.type || this.source || 'none';
      if (Number.isFinite(duration) && duration > 0) this.duration = Math.max(0, Number(duration) || 0);
      this.buffering = !!buffering;
      if (this.buffering) this.state = 'buffering';
      else if (this.state === 'buffering') this.state = 'paused';
      return this.snapshot();
    }
    setSeeking(seeking, seconds = this.time) {
      this.seeking = !!seeking;
      if (Number.isFinite(seconds)) this.time = this.clampTime(seconds);
      return this.snapshot();
    }
    getTime() {
      if (this.state === 'playing') this.time = this.clampTime(this.readDriverTime());
      return this.time;
    }
    readDriverTime() {
      if (!this.driver || typeof this.driver.currentTime !== 'function') return this.time;
      const time = this.driver.currentTime();
      return Number.isFinite(time) ? time : this.time;
    }
    clampTime(seconds) {
      const time = Math.max(0, Number(seconds) || 0);
      return this.duration ? clamp(time, 0, this.duration) : time;
    }
    snapshot() {
      return {
        time: this.time,
        duration: this.duration,
        state: this.state,
        seeking: this.seeking,
        buffering: this.buffering,
        source: this.source
      };
    }
  }

  class MusicVisualizer {
    constructor(options = {}) {
      this.options = options;
      this.offset = 0;
      this.localAudioDriver = new LocalAudioDriver(this, options);
      this.youtubeDriver = new YouTubeIframeDriver(this, options);
      this.driver = this.localAudioDriver;
      this.playbackDrivers = { localAudio: this.localAudioDriver, youtubeIframe: this.youtubeDriver };
      this.playRequestId = 0;
      this.playbackIntent = false;
      this.durationRequestId = 0;
      this.mediaChangeSerial = 0;
      this.tracks = [{ id: 'synth', title: 'Built-in Synth Pulse', kind: 'synth', visualPreset: DEFAULT_VISUAL_PRESET }];
      this.clock = new PlaybackClock();
      this.clock.resetForTrack(this.tracks[0], this.driver, 0);
      this.selectedIndex = 0;
      this.baseVisualPreset = normalizeVisualPreset(this.tracks[0].visualPreset);
      this.liveModulation = { enabled: false, density: 0, sensitivityBoost: 0, rippleBoost: 0, gridBoost: 0 };
      this.previousDriver = 0;
      this.avg = .12;
      this.peak = .45;
      this.prev = .0;
      this.fluxAvg = .04;
      this.fluxPeak = .18;
      this.lastEnergyPulseAt = -Infinity;
      this.prevBands = null;
      this.prevDom = 0;
      this.prevCentroid = 0;
      this.moodBase = { brightness: 0, warmth: 0, density: 0 };
      this.recentOnsets = [];
      this.analysis = null;
      this.analysisIndex = 0;
      this.analysisToken = 0;
      this.timeline = null;
      this.timelineEventIndex = 0;
      this.timelineLoadToken = 0;
      this.timelineRecording = null;
      this.timelineRecordLog = [];
      this.timelineFiredEventIds = [];
      this.timelineFiredEventCounts = {};
      this.captureReplayFrameIndex = 0;
      this.captureReplayLastTime = -Infinity;
      this.selectedTimelineEventId = '';
      this.state = {
        enabled: true, asciiEnabled: true, shaderEnabled: true, playing: false, loading: false,
        position: 0, duration: 0, seeking: false, seekPreview: 0,
        volume: clamp(Number(options.initialVolume ?? options.youtubeFadeTargetVolume ?? 100) || 100, 0, 100),
        sensitivity: this.baseVisualPreset.sensitivity, sharpness: FIXED_VISUAL_SHARPNESS, rippleAmount: this.baseVisualPreset.rippleAmount, gridBurstAmount: this.baseVisualPreset.gridBurstAmount,
        energy: 0, bass: 0, mid: 0, high: 0, fastEnergy: 0, spectralFlux: 0,
        pitchChange: 0, pitchJump: 0, pitchRise: 0, dominantRise: 0, centroidRise: 0,
        centroidHz: 0, dominantHz: 0, moodShift: 0, tempoShift: 0, gridImpact: 0,
        transientSharp: 0, smoothedEnergy: 0, smoothedBass: 0, smoothedMid: 0, smoothedHigh: 0,
        beat: 0, detailBeat: 0, beatSerial: 0, detailSerial: 0,
        musicGridSerial: 0, musicGridType: '', musicGridStrength: 0, musicGridHz: 0, musicGridBand: 'mid',
        timelineRippleEvent: null, timelineGridEvent: null,
        lastBeatAt: -9999, lastDetailAt: -9999, lastMusicGridAt: -9999,
        trackTitle: 'Built-in Synth Pulse', analysisReady: false, mediaError: '',
        visualDensity: 0, visualPresetId: 'synth', shaderSpeed: .8, mouseInfluence: .7,
        timelineReady: false, timelineStatus: 'No timeline', timelineRecording: false, timelineEventCount: 0, timelineSelectedEventId: '', timelineSelectedEventLabel: '',
        timelineAsciiBrightness: null, timelineShaderSpeed: null, timelineMouseInfluence: null, timelineSection: '',
        timelineCalibrationOffsetMs: 0,
        captureReplay: false, captureFrameCount: 0, captureFrameIndex: 0, captureStatus: ''
      };
      this.loadManifest();
    }

    async loadManifest() {
      if (this.options.disableMusic === true) return;
      try {
        const base = this.options.assetBase || '';
        let list = null;
        for (const file of ['assets/music/manifest.json', 'assets/music/tracks.json']) {
          const response = await fetch(`${base}${file}`, { cache: 'no-store' }).catch(() => null);
          if (!response || !response.ok) continue;
          const json = await response.json();
          list = Array.isArray(json) ? json : Array.isArray(json.tracks) ? json.tracks : null;
          if (list) break;
        }
        if (!Array.isArray(list)) return;
        const tracks = list.filter((t) => t && (t.src || isYouTubeManifestTrack(t))).map((t, i) => {
          const youtube = isYouTubeManifestTrack(t);
          const youtubeId = parseYouTubeId(t.youtubeId || t.youtube?.id || t.youtubeUrl || t.youtube?.url || '');
          const youtubeStartSeconds = youtubeStartSecondsForTrack(t);
          const duration = Number(t.duration);
          return {
            id: t.id || `${youtube ? 'youtube' : 'asset'}-${i}`,
            artist: t.artist || '',
            name: t.name || t.song || '',
            title: formatTrackTitle(t, t.id || `Track ${i + 1}`),
            kind: youtube ? 'youtube' : 'asset',
            sourceType: youtube ? 'youtube' : t.sourceType || 'local',
            src: youtube ? '' : t.src,
            cover: t.cover || t.artwork || t.art || (youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : ''),
            duration: Number.isFinite(duration) && duration > 0 ? duration : 0,
            timeline: t.timeline || t.visualTimeline || '',
            youtubeId,
            youtubeUrl: t.youtubeUrl || t.youtube?.url || (youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : ''),
            youtubeStartSeconds,
            youtubeCalibrationOffsetMs: youtubeCalibrationOffsetMsForTrack(t),
            youtubeVerified: !!(t.youtubeVerified || t.youtube?.verified),
            visualPreset: normalizeVisualPreset(t.visualPreset || t.visualizer || t.preset)
          };
        });
        if (tracks.length) {
          const productionTrackId = String(this.options.productionTrackId || '').trim();
          const productionTrackIds = Array.isArray(this.options.productionTrackIds)
            ? this.options.productionTrackIds.map((id) => String(id || '').trim()).filter(Boolean)
            : [];
          const defaultTrackId = String(this.options.defaultTrackId || productionTrackId || '').trim();
          const byId = new Map(tracks.map((track) => [track.id, track]));
          const nextTracks = productionTrackIds.length
            ? productionTrackIds.map((id) => byId.get(id)).filter(Boolean)
            : productionTrackId ? tracks.filter((track) => track.id === productionTrackId) : tracks;
          if (!nextTracks.length) return;
          const productionScoped = productionTrackIds.length || productionTrackId;
          const fallbackTracks = productionScoped && this.options.includeSynthFallback !== true ? [] : this.tracks;
          this.tracks = nextTracks.concat(fallbackTracks);
          const defaultIndex = defaultTrackId ? this.tracks.findIndex((track) => track.id === defaultTrackId) : 0;
          this.selectTrack(defaultIndex >= 0 ? defaultIndex : 0, { playIfNeeded: false });
        }
      } catch (_) {}
    }

    currentTrack() {
      return this.tracks[this.selectedIndex] || this.tracks[0];
    }

    hasActivePlayback() {
      return !!(
        this.playbackIntent || this.state.playing || this.state.loading ||
        this.driver?.playing || this.driver?.buffering
      );
    }

    hasObservedPlayback() {
      return !!(this.state.playing || this.state.loading || this.driver?.playing || this.driver?.buffering);
    }

    syncStateFromClock({ includePosition = !this.state.seeking } = {}) {
      const time = this.clock.getTime();
      this.offset = time;
      if (includePosition) this.state.position = time;
      this.state.duration = this.clock.duration || this.driver.duration(this.currentTrack()) || this.state.duration || 0;
      this.state.loading = this.clock.buffering;
      this.state.playing = this.clock.state === 'playing';
      this.state.seeking = this.clock.seeking;
      return time;
    }

    driverForTrack(track = this.currentTrack()) {
      if (this.youtubeDriver.supports(track)) return this.youtubeDriver;
      return this.localAudioDriver;
    }

    isYouTubeTrack(track = this.currentTrack()) {
      return track?.kind === 'youtube' || track?.sourceType === 'youtube';
    }

    timelineDurationForTrack(track = this.currentTrack()) {
      if (!track || !this.timeline || this.timeline.trackId !== track.id) return 0;
      const duration = Number(this.timeline.duration);
      return Number.isFinite(duration) && duration > 0 ? duration : 0;
    }

    timelineCalibrationOffsetMs(track = this.currentTrack(), timeline = this.timeline) {
      const raw = timeline?.youtube?.calibrationOffsetMs ?? timeline?.youtubeCalibrationOffsetMs ?? timeline?.timelineCalibrationOffsetMs ?? timeline?.calibrationOffsetMs ?? youtubeCalibrationOffsetMsForTrack(track);
      const value = Number(raw);
      return Number.isFinite(value) ? clamp(value, -60000, 60000) : 0;
    }

    timelineSampleTime(seconds = this.clock.getTime(), track = this.currentTrack(), timeline = this.timeline) {
      const offsetSeconds = this.timelineCalibrationOffsetMs(track, timeline) / 1000;
      const duration = Number(timeline?.duration) || this.effectivePlaybackDuration(track) || this.clock.duration || 0;
      const value = Math.max(0, (Number(seconds) || 0) + offsetSeconds);
      return duration ? clamp(value, 0, duration) : value;
    }

    effectivePlaybackDuration(track = this.currentTrack()) {
      const timelineDuration = this.timelineDurationForTrack(track);
      if (this.isYouTubeTrack(track) && timelineDuration) return timelineDuration;
      return this.driver.duration(track) || this.clock.duration || this.state.duration || timelineDuration || 0;
    }

    setPlaybackDriver(driver) {
      if (!driver || this.driver === driver) return;
      this.driver.stop();
      this.driver = driver;
      this.offset = 0;
      this.clock.resetForTrack(this.currentTrack(), this.driver, this.driver.duration(this.currentTrack()) || 0);
    }

    resetTimeline(status = 'No timeline') {
      this.timeline = null;
      this.timelineEventIndex = 0;
      this.timelineRecording = null;
      this.timelineRecordLog = [];
      this.timelineFiredEventIds = [];
      this.timelineFiredEventCounts = {};
      this.captureReplayFrameIndex = 0;
      this.captureReplayLastTime = -Infinity;
      this.selectedTimelineEventId = '';
      this.state.timelineReady = false;
      this.state.timelineStatus = status;
      this.state.timelineRecording = false;
      this.state.timelineEventCount = 0;
      this.state.timelineSelectedEventId = '';
      this.state.timelineSelectedEventLabel = '';
      this.state.timelineAsciiBrightness = null;
      this.state.timelineShaderSpeed = null;
      this.state.timelineMouseInfluence = null;
      this.state.timelineSection = '';
      this.state.timelineCalibrationOffsetMs = 0;
      this.state.timelineRippleEvent = null;
      this.state.timelineGridEvent = null;
      this.state.captureReplay = false;
      this.state.captureFrameCount = 0;
      this.state.captureFrameIndex = 0;
      this.state.captureStatus = '';
    }

    async loadTimeline(track = this.currentTrack()) {
      const token = ++this.timelineLoadToken;
      this.resetTimeline(track?.timeline ? 'Loading timeline' : this.isYouTubeTrack(track) ? 'No saved choreography' : 'No timeline');
      if (!track?.timeline) return null;
      try {
        const src = /^(blob:|data:|https?:)/i.test(track.timeline) ? track.timeline : `${this.options.assetBase || ''}${track.timeline}`;
        const response = await fetch(src, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Timeline fetch failed: ${response.status}`);
        const timeline = normalizeVisualTimeline(await response.json(), track);
        if (token !== this.timelineLoadToken || this.currentTrack()?.id !== track.id) return null;
        this.timeline = timeline;
        const captureFrameCount = timeline.capture?.frames?.length || 0;
        this.state.timelineReady = true;
        this.state.timelineStatus = captureFrameCount ? `${timeline.events.length} events + ${captureFrameCount} captures` : `${timeline.events.length} events`;
        this.state.timelineEventCount = timeline.events.length;
        this.state.timelineCalibrationOffsetMs = this.timelineCalibrationOffsetMs(track, timeline);
        this.state.captureFrameCount = captureFrameCount;
        this.state.captureReplay = this.captureReplayActive();
        this.state.captureStatus = this.state.captureFrameCount ? `${this.state.captureFrameCount} capture frames` : '';
        if (this.isYouTubeTrack(track) && timeline.duration > 0) {
          this.state.duration = timeline.duration;
          this.clock.duration = timeline.duration;
        }
        this.setTimelineCursor(this.clock.getTime());
        this.mediaChangeSerial += 1;
        this.applyEffectiveVisualSettings(track.id);
        return timeline;
      } catch (error) {
        if (token === this.timelineLoadToken) {
          this.resetTimeline('Timeline unavailable');
          console.warn('Timeline load failed.', error);
        }
        return null;
      }
    }

    timelineSectionAt(seconds) {
      if (!this.timeline?.sections?.length) return null;
      const t = Math.max(0, Number(seconds) || 0);
      return this.timeline.sections.find((section) => t >= section.start && t <= section.end) || null;
    }

    applyTimelineControls(seconds = this.clock.getTime()) {
      this.state.timelineAsciiBrightness = null;
      this.state.timelineShaderSpeed = null;
      this.state.timelineMouseInfluence = null;
      if (!this.timeline) {
        this.state.timelineSection = '';
        return;
      }
      const mediaTime = this.timelineSampleTime(seconds);
      const section = this.timelineSectionAt(mediaTime);
      this.state.timelineSection = section?.label || '';
      if (section) this.state.visualDensity = Math.max(this.state.visualDensity, clamp(section.intensity) * .35);
    }

    applyEffectiveVisualSettings(presetId = this.currentTrack()?.id || 'unknown') {
      const p = this.baseVisualPreset || normalizeVisualPreset();
      const mod = this.liveModulation || {};
      this.state.sensitivity = clamp(p.sensitivity + (mod.sensitivityBoost || 0));
      this.state.sharpness = clamp(p.sharpness);
      this.state.rippleAmount = clamp(p.rippleAmount + (mod.rippleBoost || 0));
      this.state.gridBurstAmount = clamp(p.gridBurstAmount + (mod.gridBoost || 0));
      this.state.visualDensity = clamp(mod.density || 0);
      this.state.visualPresetId = presetId;
      this.applyTimelineControls(this.clock.getTime());
    }

    applyTrackVisualPreset(track = this.currentTrack()) {
      const savedPreset = loadSavedVisualPreset(track?.id);
      this.baseVisualPreset = savedPreset || normalizeVisualPreset(track?.visualPreset);
      if (track) track.visualPreset = this.baseVisualPreset;
      this.liveModulation = { enabled: false, density: 0, sensitivityBoost: 0, rippleBoost: 0, gridBoost: 0 };
      this.applyEffectiveVisualSettings(track?.id || 'unknown');
    }

    setVisualControl(key, value) {
      const preset = { ...(this.baseVisualPreset || normalizeVisualPreset()) };
      if (key === 'sensitivity') preset.sensitivity = clamp(value);
      else if (key === 'sharpness') preset.sharpness = clamp(value);
      else if (key === 'rippleAmount') preset.rippleAmount = clamp(value);
      else if (key === 'gridBurstAmount') preset.gridBurstAmount = clamp(value);
      this.baseVisualPreset = normalizeVisualPreset(preset);
      const track = this.currentTrack();
      if (track) {
        track.visualPreset = this.baseVisualPreset;
        saveVisualPreset(track.id, this.baseVisualPreset);
      }
      this.recordControl(key, this.baseVisualPreset[key]);
      this.applyEffectiveVisualSettings(track?.id || 'manual');
    }

    selectTrack(index, { playIfNeeded = this.hasActivePlayback() } = {}) {
      if (!this.tracks.length) return;
      const previousTrack = this.currentTrack();
      const previousTrackId = this.clock.trackId || previousTrack?.id || '';
      const nextIndex = ((Number(index) || 0) % this.tracks.length + this.tracks.length) % this.tracks.length;
      const track = this.tracks[nextIndex];
      const trackChanged = previousTrackId !== track.id;
      const shouldPlay = playIfNeeded === true || this.hasActivePlayback();
      this.playbackIntent = shouldPlay;
      if (trackChanged) {
        this.playRequestId += 1;
        this.driver.pause();
      }
      this.selectedIndex = nextIndex;
      this.offset = 0;
      const nextDriver = this.driverForTrack(track);
      if (this.driver !== nextDriver) this.setPlaybackDriver(nextDriver);
      if (trackChanged) {
        this.durationRequestId += 1;
        this.driver.selectTrack(track, { cue: !shouldPlay });
        const duration = this.isYouTubeTrack(track) ? 0 : this.driver.duration(track) || 0;
        this.clock.resetForTrack(track, this.driver, duration);
        this.state.seeking = false;
        this.state.seekPreview = 0;
        this.state.position = 0;
        this.state.duration = duration;
        this.state.loading = false;
        this.state.playing = false;
        this.setAnalysisCursor(0);
        this.setTimelineCursor(0);
        this.mediaChangeSerial += 1;
      }
      this.state.trackTitle = track.title;
      this.applyTrackVisualPreset(track);
      this.loadTimeline(track).catch(() => {});
      if (this.onTracksChanged) this.onTracksChanged();
      if (shouldPlay) this.play();
    }

    getDecoded(trackId) {
      return this.localAudioDriver.getDecoded(trackId);
    }

    rememberDecoded(trackId, decoded) {
      this.localAudioDriver.rememberDecoded(trackId, decoded);
    }

    async ensureContext({ resume = true } = {}) {
      return this.localAudioDriver.ensureContext({ resume });
    }

    createSynthBuffer() {
      return this.localAudioDriver.createSynthBuffer();
    }

    async decode(track, { resume = true } = {}) {
      return this.driverForTrack(track).decode(track, { resume });
    }

    async buildAnalysis(buffer) {
      const token = ++this.analysisToken;
      const ch = buffer.getChannelData(0);
      const sr = buffer.sampleRate;
      const hop = 512;
      const win = 1024;
      const events = [];
      let prevRms = 0, prevCentroid = 0, prevWarm = 0, prevBright = 0, prevDense = 0, lastEvent = -999;
      for (let i = 0; i + win < ch.length; i += hop) {
        let sum = 0, zc = 0, bass = 0, mid = 0, high = 0;
        for (let j = 0; j < win; j++) {
          const v = ch[i + j];
          sum += v * v;
          if (j > 0 && Math.sign(v) !== Math.sign(ch[i + j - 1])) zc++;
          const w = j / win;
          if (w < .14) bass += Math.abs(v); else if (w < .55) mid += Math.abs(v); else high += Math.abs(v);
        }
        const rms = Math.sqrt(sum / win);
        const centroid = zc / win * sr * .5;
        const flux = Math.max(0, rms - prevRms);
        const centroidRise = Math.max(0, Math.log2((centroid + 80) / (prevCentroid + 80)));
        const warmth = bass / win;
        const bright = high / win;
        const dense = rms + flux;
        const mood = Math.abs(bright - prevBright) * .45 + Math.abs(warmth - prevWarm) * .30 + Math.abs(dense - prevDense) * .25;
        const t = i / sr;
        const impact = flux * 6 + centroidRise * 2.4 + mood * 5;
        if (impact > .58 && t - lastEvent > .52) {
          const type = centroidRise > .08 ? 'pitch-rise' : warmth > bright * 1.4 ? 'bass-drop' : mood > .08 ? 'mood-shift' : 'tempo-shift';
          events.push({ time: t, type, strength: clamp(impact, .18, 1), frequency: centroid || 900 });
          lastEvent = t;
        }
        prevRms = lerp(prevRms, rms, .25);
        prevCentroid = lerp(prevCentroid, centroid, .25);
        prevWarm = lerp(prevWarm, warmth, .05);
        prevBright = lerp(prevBright, bright, .05);
        prevDense = lerp(prevDense, dense, .05);
        if (token !== this.analysisToken) return;
      }
      this.analysis = { events, consumed: 0 };
      this.analysisIndex = 0;
      this.state.analysisReady = true;
    }

    getCurrentPosition() {
      return this.clock.getTime();
    }

    syncPlaybackPosition() {
      const currentTrack = this.currentTrack();
      if (this.driver.getPlayerState) this.driver.getPlayerState();
      const duration = this.effectivePlaybackDuration(currentTrack);
      const youtubeClock = this.driver.type === 'youtube-iframe';
      this.clock.update({
        driver: this.driver,
        duration,
        playing: youtubeClock ? this.driver.playing : this.state.playing && this.driver.playing,
        buffering: youtubeClock ? this.driver.buffering : this.state.loading,
        seeking: this.state.seeking
      });
      this.syncStateFromClock({ includePosition: !this.state.seeking });
    }

    async preloadDuration(track = this.currentTrack()) {
      if (!track) return 0;
      const driver = this.driverForTrack(track);
      const cachedDuration = driver.duration(track);
      if (cachedDuration && !this.isYouTubeTrack(track)) {
        if (this.currentTrack()?.id === track.id) {
          this.state.duration = cachedDuration;
          if (driver === this.driver) this.clock.duration = cachedDuration;
        }
        return cachedDuration;
      }
      const requestId = ++this.durationRequestId;
      const isCurrent = () => requestId === this.durationRequestId && this.currentTrack()?.id === track.id;
      try {
        const duration = await driver.preloadDuration(track, { isCurrent });
        if (isCurrent()) {
          this.state.duration = duration || 0;
          if (driver === this.driver) this.clock.duration = duration || 0;
        }
        return duration || 0;
      } catch (_) {
        return 0;
      }
    }

    beginSeek() {
      this.syncPlaybackPosition();
      this.clock.setSeeking(true);
      this.state.seeking = true;
      this.state.seekPreview = this.clock.getTime();
    }

    previewSeek(seconds) {
      const duration = this.state.duration || this.driver.duration(this.currentTrack()) || 0;
      const target = clamp(Number(seconds) || 0, 0, duration || Number.MAX_SAFE_INTEGER);
      this.clock.setSeeking(true);
      this.state.seeking = true;
      this.state.seekPreview = target;
      this.state.position = target;
    }

    setAnalysisCursor(seconds) {
      if (!this.analysis?.events?.length) return;
      const target = Math.max(0, (Number(seconds) || 0) - .2);
      let index = 0;
      while (index < this.analysis.events.length && this.analysis.events[index].time < target) index++;
      this.analysisIndex = index;
    }

    setTimelineCursor(seconds, { skipCurrent = false } = {}) {
      this.timelineFiredEventIds = [];
      this.timelineFiredEventCounts = {};
      if (!this.timeline?.events?.length) {
        this.timelineEventIndex = 0;
        return;
      }
      const mediaTime = this.timelineSampleTime(seconds);
      const target = skipCurrent ? mediaTime + .045 : Math.max(0, mediaTime - .08);
      let index = 0;
      while (index < this.timeline.events.length && (skipCurrent ? this.timeline.events[index].t <= target : this.timeline.events[index].t < target)) index++;
      this.timelineEventIndex = index;
    }

    captureReplayActive() {
      return !!(this.timeline?.capture?.frames?.length && this.timeline.capture.replay !== false);
    }

    captureFrames() {
      return Array.isArray(this.timeline?.capture?.frames) ? this.timeline.capture.frames : [];
    }

    captureFramePair(seconds = this.clock.getTime()) {
      const frames = this.captureFrames();
      if (!frames.length) return null;
      const timelineDuration = Number(this.timeline?.duration);
      const t = Number.isFinite(timelineDuration) && timelineDuration > 0
        ? clamp(Number(seconds) || 0, 0, timelineDuration)
        : this.clock.clampTime(seconds);
      if (t <= frames[0].t) return { prev: frames[0], next: frames[0], index: 0, alpha: 0 };
      const lastIndex = frames.length - 1;
      if (t >= frames[lastIndex].t) return { prev: frames[lastIndex], next: frames[lastIndex], index: lastIndex, alpha: 0 };
      let index = clamp(this.captureReplayFrameIndex || 0, 0, lastIndex);
      while (index < lastIndex && frames[index + 1].t <= t) index++;
      while (index > 0 && frames[index].t > t) index--;
      this.captureReplayFrameIndex = index;
      const prev = frames[index];
      const next = frames[Math.min(lastIndex, index + 1)];
      const span = Math.max(.001, next.t - prev.t);
      return { prev, next, index, alpha: clamp((t - prev.t) / span) };
    }

    sampleCaptureTune(pair) {
      if (!pair) return null;
      const tune = {};
      const a = pair.alpha || 0;
      const prev = pair.prev?.tune || {};
      const next = pair.next?.tune || prev;
      for (const key of TIMELINE_CONTROL_KEYS) {
        const p = Number(prev[key]);
        const n = Number(next[key]);
        if (Number.isFinite(p) && Number.isFinite(n)) tune[key] = normalizeTimelineValue(key, lerp(p, n, a));
        else if (Number.isFinite(p)) tune[key] = normalizeTimelineValue(key, p);
        else if (Number.isFinite(n)) tune[key] = normalizeTimelineValue(key, n);
      }
      return Object.keys(tune).length ? tune : null;
    }

    applyCaptureReplay(now = performance.now()) {
      if (!this.captureReplayActive()) {
        this.state.captureReplay = false;
        this.state.captureFrameCount = 0;
        this.state.captureFrameIndex = 0;
        this.state.captureStatus = '';
        return false;
      }
      const mediaTime = this.timelineSampleTime(this.clock.getTime());
      const pair = this.captureFramePair(mediaTime);
      if (!pair) return false;
      const tune = this.sampleCaptureTune(pair);
      if (tune) {
        if (Number.isFinite(tune.sensitivity)) this.state.sensitivity = clamp(tune.sensitivity);
        if (Number.isFinite(tune.sharpness)) this.state.sharpness = clamp(tune.sharpness);
        if (Number.isFinite(tune.rippleAmount)) this.state.rippleAmount = clamp(tune.rippleAmount);
        if (Number.isFinite(tune.gridBurstAmount)) this.state.gridBurstAmount = clamp(tune.gridBurstAmount);
        this.state.timelineAsciiBrightness = Number.isFinite(tune.asciiBrightness) ? normalizeAsciiBrightness(tune.asciiBrightness) : this.state.timelineAsciiBrightness;
        this.state.timelineShaderSpeed = Number.isFinite(tune.shaderSpeed) ? normalizeTimelineValue('shaderSpeed', tune.shaderSpeed) : this.state.timelineShaderSpeed;
        this.state.timelineMouseInfluence = Number.isFinite(tune.mouseInfluence) ? normalizeTimelineValue('mouseInfluence', tune.mouseInfluence) : this.state.timelineMouseInfluence;
        if (Number.isFinite(this.state.timelineShaderSpeed)) this.state.shaderSpeed = this.state.timelineShaderSpeed;
        if (Number.isFinite(this.state.timelineMouseInfluence)) this.state.mouseInfluence = this.state.timelineMouseInfluence;
        this.captureAdapter?.applyTune?.({
          asciiBrightness: this.state.timelineAsciiBrightness,
          shaderSpeed: this.state.timelineShaderSpeed,
          mouseInfluence: this.state.timelineMouseInfluence
        }, { source: 'capture', mediaTime });
      }
      this.captureAdapter?.applyCaptureFrame?.(pair.prev, { mediaTime, now });
      this.state.captureReplay = true;
      this.state.captureFrameCount = this.captureFrames().length;
      this.state.captureFrameIndex = pair.index;
      this.state.captureStatus = `${this.state.captureFrameCount} capture frames`;
      return true;
    }

    createTimelineDraft({ source = 'manual-recorder' } = {}) {
      const track = this.currentTrack();
      const base = this.timeline ? JSON.parse(JSON.stringify(this.timeline)) : normalizeVisualTimeline({
        version: 2,
        trackId: track?.id || 'unknown',
        title: track?.title || '',
        duration: this.clock.duration || this.state.duration || this.driver.duration(track) || 0,
        source,
        controls: {
          sensitivity: [{ t: 0, v: this.state.sensitivity }],
          sharpness: [{ t: 0, v: this.state.sharpness }],
          rippleAmount: [{ t: 0, v: this.state.rippleAmount }],
          gridBurstAmount: [{ t: 0, v: this.state.gridBurstAmount }],
          asciiBrightness: [{ t: 0, v: 1 }],
          shaderSpeed: [{ t: 0, v: this.state.shaderSpeed || .8 }],
          mouseInfluence: [{ t: 0, v: this.state.mouseInfluence || .7 }]
        },
        events: [],
        sections: []
      }, track);
      base.source = source;
      base.duration = roundTimeline(this.clock.duration || this.state.duration || this.driver.duration(track) || base.duration || 0);
      return base;
    }

    upsertTimelineFrame(timeline, key, frame) {
      if (!TIMELINE_CONTROL_KEYS.includes(key)) return;
      timeline.controls[key] = normalizeTimelineKeyframes(key, timeline.controls[key]);
      const frames = timeline.controls[key];
      const last = frames[frames.length - 1];
      if (last && Math.abs(last.t - frame.t) < .18) {
        last.v = frame.v;
      } else {
        frames.push(frame);
      }
      frames.sort((a, b) => a.t - b.t);
    }

    timelineEventLabel(event) {
      if (!event) return '';
      const t = Number(event.t ?? event.time);
      const time = Number.isFinite(t) ? `${roundTimeline(t).toFixed(3)}s` : 'unknown';
      return `${event.type || 'event'} @ ${time}`;
    }

    selectedTimelineEvent(source = this.timelineRecording || this.timeline) {
      if (!this.selectedTimelineEventId || !source?.events?.length) return null;
      return source.events.find((event) => event.id === this.selectedTimelineEventId) || null;
    }

    syncTimelineRecorderState(status = '') {
      const source = this.timelineRecording || this.timeline;
      const count = source?.events?.length || 0;
      const selected = this.selectedTimelineEvent(source);
      this.state.timelineReady = !!source;
      this.state.timelineRecording = !!this.timelineRecording;
      this.state.timelineEventCount = count;
      this.state.timelineSelectedEventId = selected?.id || '';
      this.state.timelineSelectedEventLabel = selected ? this.timelineEventLabel(selected) : '';
      if (status) {
        this.state.timelineStatus = status;
      } else if (this.timelineRecording) {
        this.state.timelineStatus = `Recording ${count} event${count === 1 ? '' : 's'}`;
      } else if (source) {
        this.state.timelineStatus = `${count} event${count === 1 ? '' : 's'}`;
      } else {
        this.state.timelineStatus = 'No timeline';
      }
    }

    ensureTimelineRecording({ source = 'manual-recorder' } = {}) {
      if (!this.timelineRecording) {
        this.timelineRecording = this.createTimelineDraft({ source });
        this.timeline = this.timelineRecording;
        this.timelineRecordLog = [];
      }
      this.state.timelineReady = true;
      this.state.timelineRecording = true;
      this.syncTimelineRecorderState();
      return this.timelineRecording;
    }

    makeTimelineEventSeed(type, seconds, index, payload = {}) {
      const trackId = this.currentTrack()?.id || 'manual';
      return hashStringToSeed(`${trackId}|${type}|${roundTimeline(seconds)}|${index}|${this.timelineRecordLog.length}|${payload.seed ?? ''}`);
    }

    recorderNumber(value, fallback, places = 3) {
      const n = Number(value);
      return roundTimeline(Number.isFinite(n) ? n : fallback, places);
    }

    recorderNormalized(value, fallback = .5) {
      const n = Number(value);
      return roundTimeline(clamp(Number.isFinite(n) ? n : fallback));
    }

    recorderPositive(value, fallback, places = 3) {
      const n = Number(value);
      return roundTimeline(Number.isFinite(n) && n > 0 ? n : fallback, places);
    }

    buildDefaultRipplePayload(seed, payload = {}) {
      return {
        seed,
        xNorm: this.recorderNormalized(payload.xNorm, .5),
        yNorm: this.recorderNormalized(payload.yNorm, .5),
        duration: this.recorderPositive(payload.duration, 1.2),
        radiusNorm: this.recorderNormalized(payload.radiusNorm, .36),
        ringWidth: this.recorderPositive(payload.ringWidth, 38, 1)
      };
    }

    buildDefaultGridPayload(seed, payload = {}) {
      const gridType = payload.gridType || payload.grid || payload.kind || 'mood-shift';
      const bandA = {
        yNorm: this.recorderNormalized(payload.bands?.[0]?.yNorm, .42),
        heightNorm: this.recorderNormalized(payload.bands?.[0]?.heightNorm, gridType === 'bass-drop' ? .16 : .10),
        boost: this.recorderNormalized(payload.bands?.[0]?.boost, gridType === 'bass-drop' ? .30 : .20),
        phase: this.recorderNumber(payload.bands?.[0]?.phase, hash01(seed, 1, 31) * Math.PI * 2),
        driftNorm: this.recorderNumber(payload.bands?.[0]?.driftNorm, (hash01(seed, 2, 31) - .5) * .12)
      };
      const width = this.recorderNormalized(payload.clusters?.[0]?.widthNorm, gridType === 'bass-drop' ? .22 : .16);
      const height = this.recorderNormalized(payload.clusters?.[0]?.heightNorm, gridType === 'bass-drop' ? .18 : .12);
      const xMax = Math.max(0, 1 - width);
      const yMax = Math.max(0, 1 - height);
      const clusterA = {
        xNorm: roundTimeline(clamp(Number.isFinite(Number(payload.clusters?.[0]?.xNorm)) ? Number(payload.clusters[0].xNorm) : hash01(seed, 3, 31) * xMax, 0, xMax)),
        yNorm: roundTimeline(clamp(Number.isFinite(Number(payload.clusters?.[0]?.yNorm)) ? Number(payload.clusters[0].yNorm) : hash01(seed, 4, 31) * yMax, 0, yMax)),
        widthNorm: width,
        heightNorm: height,
        boost: this.recorderNormalized(payload.clusters?.[0]?.boost, gridType === 'bass-drop' ? .34 : .22),
        seed: Math.floor(Number(payload.clusters?.[0]?.seed) || hashStringToSeed(`${seed}|cluster|0`))
      };
      return {
        seed,
        duration: this.recorderPositive(payload.duration, gridType === 'bass-drop' ? .9 : .68),
        gridType,
        frequency: this.recorderPositive(payload.frequency ?? payload.hz, this.state.centroidHz || 900, 1),
        bands: Array.isArray(payload.bands) && payload.bands.length ? payload.bands : [bandA],
        clusters: Array.isArray(payload.clusters) && payload.clusters.length ? payload.clusters : [clusterA]
      };
    }

    buildRecordedEventPayload(type, strength, seconds, index, payload = {}) {
      const seed = Math.floor(Number(payload.seed) || this.makeTimelineEventSeed(type, seconds, index, payload));
      if (type === 'gridBurst' || type === 'grid' || type === 'beatGrid') return this.buildDefaultGridPayload(seed, payload);
      return this.buildDefaultRipplePayload(seed, payload);
    }

    recordControl(key, value, seconds = this.getCurrentPosition()) {
      if (!this.timelineRecording || !TIMELINE_CONTROL_KEYS.includes(key)) return;
      const frame = { t: roundTimeline(seconds), v: roundTimeline(normalizeTimelineValue(key, value)) };
      this.upsertTimelineFrame(this.timelineRecording, key, frame);
      this.timelineRecordLog.push({ kind: 'control', key, t: frame.t });
      this.timeline = normalizeVisualTimeline(this.timelineRecording, this.currentTrack());
      this.timelineRecording = this.timeline;
      this.syncTimelineRecorderState();
      this.applyEffectiveVisualSettings(this.currentTrack()?.id || 'recording');
    }

    recordTimelineEvent(type = 'ripple', strength = .7, seconds = this.getCurrentPosition(), payload = {}) {
      if (seconds && typeof seconds === 'object') {
        payload = seconds;
        seconds = this.getCurrentPosition();
      }
      const draft = this.ensureTimelineRecording();
      const index = this.timelineRecording.events.length;
      const trackId = this.currentTrack()?.id || 'manual';
      const t = roundTimeline(seconds);
      const eventPayload = this.buildRecordedEventPayload(type, strength, t, index, payload || {});
      const eventCore = {
        t,
        type,
        strength: roundTimeline(clamp(strength)),
        ...eventPayload
      };
      const event = {
        id: payload?.id || (TIMELINE_SCHEMA ? TIMELINE_SCHEMA.makeEventId(trackId, eventCore, index) : `${trackId}-${type}-${Math.round(t * 1000)}-${index + 1}`),
        ...eventCore
      };
      draft.events.push(event);
      this.timelineRecording.events.sort((a, b) => a.t - b.t);
      this.timelineRecordLog.push({ kind: 'event-add', id: event.id, t: event.t, type });
      this.selectedTimelineEventId = event.id;
      this.timeline = normalizeVisualTimeline(this.timelineRecording, this.currentTrack());
      this.timelineRecording = this.timeline;
      this.syncTimelineRecorderState();
      this.setTimelineCursor(seconds);
      this.triggerTimelineEvent(this.selectedTimelineEvent() || event, performance.now(), true);
      this.mediaChangeSerial += 1;
      return this.selectedTimelineEvent() || event;
    }

    startTimelineRecording() {
      this.timelineRecording = this.createTimelineDraft({ source: 'manual-recorder' });
      this.timeline = this.timelineRecording;
      this.timelineRecordLog = [];
      this.selectedTimelineEventId = '';
      this.state.timelineReady = true;
      this.state.timelineRecording = true;
      this.syncTimelineRecorderState();
      this.setTimelineCursor(this.getCurrentPosition());
    }

    stopTimelineRecording() {
      if (!this.timelineRecording) return;
      this.timeline = normalizeVisualTimeline(this.timelineRecording, this.currentTrack());
      this.timelineRecording = null;
      this.state.timelineRecording = false;
      this.syncTimelineRecorderState();
      this.setTimelineCursor(this.getCurrentPosition());
    }

    toggleTimelineRecording() {
      if (this.timelineRecording) this.stopTimelineRecording();
      else this.startTimelineRecording();
    }

    undoTimelineStep() {
      if (!this.timelineRecording || !this.timelineRecordLog.length) return;
      const step = this.timelineRecordLog.pop();
      if (step.kind === 'event-add') {
        const index = this.timelineRecording.events.findIndex((event) => event.id === step.id);
        if (index >= 0) this.timelineRecording.events.splice(index, 1);
        if (this.selectedTimelineEventId === step.id) this.selectedTimelineEventId = '';
      } else if (step.kind === 'event-delete') {
        const event = JSON.parse(JSON.stringify(step.event || {}));
        if (event.t != null) {
          const index = clamp(Math.floor(Number(step.index) || 0), 0, this.timelineRecording.events.length);
          this.timelineRecording.events.splice(index, 0, event);
          this.selectedTimelineEventId = event.id || '';
        }
      } else if (step.kind === 'event-nudge') {
        const event = this.timelineRecording.events.find((item) => item.id === step.id);
        if (event) {
          event.t = roundTimeline(step.from);
          this.selectedTimelineEventId = event.id || '';
        }
      } else if (step.kind === 'event') {
        const index = [...this.timelineRecording.events].reverse().findIndex((event) => event.type === step.type && Math.abs(event.t - step.t) < .001);
        if (index >= 0) this.timelineRecording.events.splice(this.timelineRecording.events.length - 1 - index, 1);
      } else if (step.kind === 'control') {
        const frames = this.timelineRecording.controls[step.key] || [];
        const index = [...frames].reverse().findIndex((frame) => Math.abs(frame.t - step.t) < .001);
        if (index >= 0) frames.splice(frames.length - 1 - index, 1);
      }
      this.timelineRecording.events.sort((a, b) => a.t - b.t);
      this.timeline = normalizeVisualTimeline(this.timelineRecording, this.currentTrack());
      this.timelineRecording = this.timeline;
      this.syncTimelineRecorderState();
      this.setTimelineCursor(this.getCurrentPosition());
      this.mediaChangeSerial += 1;
      this.applyEffectiveVisualSettings(this.currentTrack()?.id || 'recording');
      return true;
    }

    findNearestTimelineEvent(seconds = this.getCurrentPosition(), maxDistance = 2, source = this.timelineRecording || this.timeline) {
      if (!source?.events?.length) return null;
      let bestIndex = -1;
      let bestDistance = Infinity;
      for (let i = 0; i < source.events.length; i++) {
        const distance = Math.abs(source.events[i].t - seconds);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = i;
        }
      }
      if (bestIndex < 0 || bestDistance > maxDistance) return null;
      return { event: source.events[bestIndex], index: bestIndex, distance: bestDistance };
    }

    selectNearestTimelineEvent(seconds = this.getCurrentPosition(), maxDistance = 2) {
      const nearest = this.findNearestTimelineEvent(seconds, maxDistance);
      if (!nearest) {
        this.selectedTimelineEventId = '';
        this.state.timelineStatus = 'No nearby event';
        this.state.timelineSelectedEventId = '';
        this.state.timelineSelectedEventLabel = '';
        return false;
      }
      this.selectedTimelineEventId = nearest.event.id || '';
      this.syncTimelineRecorderState(`Selected ${this.timelineEventLabel(nearest.event)}`);
      return nearest.event;
    }

    nudgeSelectedTimelineEvent(deltaSeconds = .1) {
      const draft = this.ensureTimelineRecording();
      let event = this.selectedTimelineEvent(draft);
      if (!event) {
        const selected = this.selectNearestTimelineEvent(this.getCurrentPosition());
        event = selected ? this.selectedTimelineEvent(draft) : null;
      }
      if (!event) return false;
      const from = roundTimeline(event.t);
      const duration = this.clock.duration || this.state.duration || this.driver.duration(this.currentTrack()) || 0;
      const to = roundTimeline(clamp(from + Number(deltaSeconds || 0), 0, duration || Number.MAX_SAFE_INTEGER));
      if (Math.abs(to - from) < .001) return false;
      event.t = to;
      this.timelineRecordLog.push({ kind: 'event-nudge', id: event.id, from, to });
      this.timelineRecording.events.sort((a, b) => a.t - b.t);
      this.timeline = normalizeVisualTimeline(this.timelineRecording, this.currentTrack());
      this.timelineRecording = this.timeline;
      this.selectedTimelineEventId = event.id || this.selectedTimelineEventId;
      this.syncTimelineRecorderState(`Nudged ${this.timelineEventLabel(this.selectedTimelineEvent() || event)}`);
      this.setTimelineCursor(to);
      this.mediaChangeSerial += 1;
      return true;
    }

    deleteNearestTimelineEvent(seconds = this.getCurrentPosition()) {
      const source = this.timelineRecording || this.timeline;
      if (!source?.events?.length) return false;
      const draft = this.ensureTimelineRecording();
      let bestIndex = -1;
      let event = this.selectedTimelineEvent(draft);
      if (event) bestIndex = draft.events.findIndex((item) => item.id === event.id);
      if (bestIndex < 0) {
        const nearest = this.findNearestTimelineEvent(seconds, 2, draft);
        if (!nearest) {
          this.state.timelineStatus = 'No nearby event';
          return false;
        }
        bestIndex = nearest.index;
        event = nearest.event;
      }
      const removed = this.timelineRecording.events.splice(bestIndex, 1)[0];
      this.timelineRecordLog.push({ kind: 'event-delete', event: JSON.parse(JSON.stringify(removed)), index: bestIndex });
      if (this.selectedTimelineEventId === removed.id) this.selectedTimelineEventId = '';
      this.timeline = normalizeVisualTimeline(this.timelineRecording, this.currentTrack());
      this.timelineRecording = this.timeline;
      this.syncTimelineRecorderState(`Deleted ${this.timelineEventLabel(removed)}`);
      this.setTimelineCursor(seconds);
      this.mediaChangeSerial += 1;
      return true;
    }

    buildTimelineFromBuffer(buffer, track = this.currentTrack()) {
      const data = buffer.getChannelData(0);
      const sr = buffer.sampleRate;
      const duration = buffer.duration || 0;
      const hop = Math.max(1024, Math.floor(sr * .046));
      const win = hop * 2;
      const frames = [];
      let prevEnergy = 0;
      for (let i = 0; i + win < data.length; i += hop) {
        let sum = 0, abs = 0, diff = 0, zc = 0;
        for (let j = 0; j < win; j++) {
          const v = data[i + j];
          const p = j ? data[i + j - 1] : v;
          sum += v * v;
          abs += Math.abs(v);
          diff += Math.abs(v - p);
          if (j > 0 && Math.sign(v) !== Math.sign(p)) zc++;
        }
        const energy = Math.sqrt(sum / win);
        const transient = Math.max(0, energy - prevEnergy);
        frames.push({ t: i / sr, energy, transient, brightness: diff / win, zc: zc / win, abs: abs / win });
        prevEnergy = lerp(prevEnergy, energy, .22);
      }
      const sortedEnergy = frames.map((f) => f.energy).sort((a, b) => a - b);
      const sortedTransient = frames.map((f) => f.transient).sort((a, b) => a - b);
      const percentile = (arr, p) => arr.length ? arr[Math.min(arr.length - 1, Math.max(0, Math.floor(arr.length * p)))] : 0;
      const floor = percentile(sortedEnergy, .18);
      const peak = Math.max(percentile(sortedEnergy, .96), floor + .0001);
      const transientPeak = Math.max(percentile(sortedTransient, .97), .0001);
      const normAt = (frame) => clamp((frame.energy - floor) / (peak - floor));
      const keyframes = { sensitivity: [], rippleAmount: [], gridBurstAmount: [], asciiBrightness: [] };
      const step = 1.5;
      for (let t = 0; t <= duration + .01; t += step) {
        const nearby = frames.filter((f) => f.t >= t && f.t < t + step);
        const energy = nearby.length ? nearby.reduce((sum, f) => sum + normAt(f), 0) / nearby.length : 0;
        const transient = nearby.length ? nearby.reduce((sum, f) => sum + clamp(f.transient / transientPeak), 0) / nearby.length : 0;
        keyframes.sensitivity.push({ t: roundTimeline(t), v: roundTimeline(clamp(.48 + energy * .28 + transient * .10, .38, .86)) });
        keyframes.rippleAmount.push({ t: roundTimeline(t), v: roundTimeline(clamp(.48 + energy * .36 + transient * .13, .32, .92)) });
        keyframes.gridBurstAmount.push({ t: roundTimeline(t), v: roundTimeline(clamp(.24 + transient * .38 + energy * .18, .12, .78)) });
        keyframes.asciiBrightness.push({ t: roundTimeline(t), v: roundTimeline(normalizeAsciiBrightness(0.88 + energy * .34 + transient * .10)) });
      }
      const events = [];
      let lastRipple = -999, lastGrid = -999;
      for (const frame of frames) {
        const energy = normAt(frame);
        const snap = clamp(frame.transient / transientPeak);
        const highMotion = clamp(frame.brightness * 45 + frame.zc * 2);
        if (energy > .42 && snap > .42 && frame.t - lastRipple > .42) {
          events.push({ t: roundTimeline(frame.t), type: 'ripple', strength: roundTimeline(clamp(.42 + energy * .36 + snap * .22)), frequency: 900 });
          lastRipple = frame.t;
        }
        if ((snap > .68 || energy > .76 && highMotion > .45) && frame.t - lastGrid > 1.35) {
          const gridType = highMotion > .58 ? 'pitch-rise' : energy > .78 ? 'bass-drop' : 'mood-shift';
          events.push({ t: roundTimeline(frame.t), type: 'gridBurst', strength: roundTimeline(clamp(.42 + snap * .36 + energy * .20)), gridType, frequency: roundTimeline(600 + highMotion * 2600, 1) });
          lastGrid = frame.t;
        }
      }
      const sections = [];
      const sectionStep = 12;
      for (let start = 0; start < duration; start += sectionStep) {
        const end = Math.min(duration, start + sectionStep);
        const slice = frames.filter((f) => f.t >= start && f.t < end);
        const intensity = slice.length ? slice.reduce((sum, f) => sum + normAt(f), 0) / slice.length : 0;
        sections.push({
          start: roundTimeline(start),
          end: roundTimeline(end),
          label: intensity > .72 ? 'drop' : intensity > .52 ? 'dense' : intensity > .30 ? 'groove' : 'quiet',
          intensity: roundTimeline(intensity)
        });
      }
      return normalizeVisualTimeline({
        version: 2,
        trackId: track?.id || 'unknown',
        title: track?.title || '',
        duration,
        source: 'local-web-audio-analysis',
        controls: keyframes,
        events,
        sections
      }, track);
    }

    async generateTimelineFromCurrentTrack() {
      const track = this.currentTrack();
      this.state.timelineStatus = 'Analyzing local audio';
      const buffer = await this.decode(track, { resume: false });
      const timeline = this.buildTimelineFromBuffer(buffer, track);
      this.timeline = timeline;
      this.timelineRecording = null;
      this.state.timelineReady = true;
      this.state.timelineRecording = false;
      this.state.timelineStatus = `${timeline.events.length} generated events`;
      this.state.timelineEventCount = timeline.events.length;
      this.state.duration = this.driver.duration(track) || buffer.duration || timeline.duration || this.state.duration;
      this.clock.duration = this.state.duration || this.clock.duration;
      this.setTimelineCursor(this.getCurrentPosition());
      this.applyEffectiveVisualSettings(track?.id || 'generated');
      return timeline;
    }

    importTimelineObject(raw, label = 'Imported timeline') {
      const validation = TIMELINE_SCHEMA?.validate(raw);
      if (validation && !validation.ok) {
        const first = validation.errors[0];
        this.state.timelineStatus = `Import invalid: ${first?.code || 'schema error'}`;
        console.warn('Timeline import failed validation.', validation.errors);
        return null;
      }
      const track = this.currentTrack();
      const timeline = normalizeVisualTimeline(raw, track);
      this.timelineLoadToken += 1;
      this.timeline = timeline;
      this.timelineRecording = null;
      this.timelineRecordLog = [];
      this.selectedTimelineEventId = '';
      this.state.timelineReady = true;
      this.state.timelineRecording = false;
      const captureFrameCount = timeline.capture?.frames?.length || 0;
      this.state.timelineStatus = captureFrameCount ? `${label}: ${timeline.events.length} events + ${captureFrameCount} captures` : `${label}: ${timeline.events.length} event${timeline.events.length === 1 ? '' : 's'}`;
      this.state.timelineEventCount = timeline.events.length;
      this.state.timelineSelectedEventId = '';
      this.state.timelineSelectedEventLabel = '';
      this.state.timelineCalibrationOffsetMs = this.timelineCalibrationOffsetMs(track, timeline);
      this.state.captureFrameCount = captureFrameCount;
      this.state.captureReplay = this.captureReplayActive();
      this.state.captureStatus = this.state.captureFrameCount ? `${this.state.captureFrameCount} capture frames` : '';
      this.setTimelineCursor(this.getCurrentPosition(), { skipCurrent: true });
      this.mediaChangeSerial += 1;
      this.applyEffectiveVisualSettings(track?.id || 'imported');
      return timeline;
    }

    async importTimelineFile(file) {
      if (!file) return null;
      try {
        const raw = JSON.parse(await file.text());
        return this.importTimelineObject(raw, 'Imported');
      } catch (error) {
        this.state.timelineStatus = 'Import failed';
        console.warn('Timeline import failed.', error);
        return null;
      }
    }

    upsertTemporaryYouTubeTrack(track) {
      const existing = this.tracks.findIndex((item) => item.id === track.id || item.youtubeId && item.youtubeId === track.youtubeId && item.kind === 'youtube');
      if (existing >= 0) {
        this.tracks[existing] = { ...this.tracks[existing], ...track };
        return existing;
      }
      this.tracks.unshift(track);
      return 0;
    }

    bindTimelineToYouTube(payload = {}) {
      const youtubeId = parseYouTubeId(payload.youtubeId || payload.youtubeUrl || payload.url || '');
      if (!youtubeId) {
        this.state.timelineStatus = 'YouTube bind needs a valid ID';
        return null;
      }
      const baseTrack = this.currentTrack();
      const title = String(payload.title || this.timeline?.title || baseTrack?.title || `YouTube ${youtubeId}`).trim();
      const safeTitle = (baseTrack?.id || title || youtubeId).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || youtubeId;
      const trackId = payload.trackId || (baseTrack?.kind === 'youtube' ? baseTrack.id : `youtube-${safeTitle}`);
      const startSeconds = Math.max(0, Number(payload.startSeconds ?? payload.youtubeStartSeconds ?? baseTrack?.youtubeStartSeconds ?? 0) || 0);
      const calibrationOffsetMs = clamp(Number(payload.calibrationOffsetMs ?? payload.youtubeCalibrationOffsetMs ?? this.timelineCalibrationOffsetMs(baseTrack, this.timeline)) || 0, -60000, 60000);
      const youtubeUrl = payload.youtubeUrl || payload.url || `https://www.youtube.com/watch?v=${youtubeId}`;
      const timeline = normalizeVisualTimeline({
        ...(this.timeline || this.createTimelineDraft({ source: 'studio-youtube-bind' })),
        trackId,
        title,
        duration: Number(payload.duration) || this.effectivePlaybackDuration(baseTrack) || this.timeline?.duration || 0,
        youtube: {
          ...(this.timeline?.youtube || {}),
          id: youtubeId,
          url: youtubeUrl,
          startSeconds,
          calibrationOffsetMs,
          verified: !!payload.verified
        }
      }, { id: trackId, title });
      if (timeline.capture) timeline.capture.trackId = trackId;
      const track = {
        id: trackId,
        artist: payload.artist || baseTrack?.artist || '',
        name: payload.name || baseTrack?.name || title,
        title,
        kind: 'youtube',
        sourceType: 'youtube',
        youtubeId,
        youtubeUrl,
        youtubeStartSeconds: startSeconds,
        youtubeCalibrationOffsetMs: calibrationOffsetMs,
        youtubeVerified: !!payload.verified,
        duration: timeline.duration || Number(payload.duration) || 0,
        timeline: '',
        visualPreset: normalizeVisualPreset(payload.visualPreset || baseTrack?.visualPreset || this.baseVisualPreset),
        cover: payload.cover || baseTrack?.cover || `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`
      };
      const index = this.upsertTemporaryYouTubeTrack(track);
      this.selectTrack(index, { playIfNeeded: false });
      const imported = this.importTimelineObject(timeline, 'Mapped YouTube');
      if (this.onTracksChanged) this.onTracksChanged();
      return imported ? { track, timeline: imported } : null;
    }

    addYouTubeSource(payload = {}) {
      const youtubeId = parseYouTubeId(payload.youtubeId || payload.youtubeUrl || payload.url || '');
      if (!youtubeId) {
        this.state.timelineStatus = 'YouTube source needs a valid ID';
        return null;
      }
      const title = String(payload.title || `YouTube ${youtubeId}`).trim();
      const trackId = payload.trackId || `youtube-lab-${youtubeId}`;
      const startSeconds = Math.max(0, Number(payload.startSeconds ?? payload.youtubeStartSeconds ?? 0) || 0);
      const calibrationOffsetMs = clamp(Number(payload.calibrationOffsetMs ?? payload.youtubeCalibrationOffsetMs ?? 0) || 0, -60000, 60000);
      const track = {
        id: trackId,
        title,
        name: title,
        artist: payload.artist || 'YouTube',
        kind: 'youtube',
        sourceType: 'youtube',
        youtubeId,
        youtubeUrl: payload.youtubeUrl || payload.url || `https://www.youtube.com/watch?v=${youtubeId}`,
        youtubeStartSeconds: startSeconds,
        youtubeCalibrationOffsetMs: calibrationOffsetMs,
        duration: Math.max(0, Number(payload.duration) || 0),
        timeline: '',
        visualPreset: normalizeVisualPreset(payload.visualPreset || this.baseVisualPreset),
        cover: payload.cover || `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`
      };
      const index = this.upsertTemporaryYouTubeTrack(track);
      this.selectTrack(index, { playIfNeeded: false });
      this.resetTimeline('No saved choreography');
      if (this.onTracksChanged) this.onTracksChanged();
      return track;
    }

    timelineExportObject() {
      const track = this.currentTrack();
      const timeline = this.timeline || this.createTimelineDraft({ source: 'manual-recorder' });
      const youtube = this.isYouTubeTrack(track) ? {
        ...(timeline.youtube || {}),
        id: track.youtubeId || timeline.youtube?.id || '',
        url: track.youtubeUrl || timeline.youtube?.url || '',
        startSeconds: youtubeStartSecondsForTrack(track),
        calibrationOffsetMs: this.timelineCalibrationOffsetMs(track, timeline),
        verified: !!(track.youtubeVerified || timeline.youtube?.verified)
      } : timeline.youtube;
      return normalizeVisualTimeline({
        ...timeline,
        trackId: track?.id || timeline.trackId,
        title: track?.title || timeline.title,
        duration: this.effectivePlaybackDuration(track) || timeline.duration,
        youtube
      }, track);
    }

    downloadTimelineExport() {
      const track = this.currentTrack();
      const timeline = this.timelineExportObject();
      const json = `${JSON.stringify(timeline, null, 2)}\n`;
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${track?.id || 'track'}.timeline.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return json;
    }

    commitSeek(seconds) {
      this.syncPlaybackPosition();
      const duration = this.effectivePlaybackDuration(this.currentTrack());
      const target = clamp(Number(seconds) || 0, 0, duration || Number.MAX_SAFE_INTEGER);
      const wasPlaying = this.hasActivePlayback();
      this.playRequestId += 1;
      const applied = this.driver.seek(target);
      this.clock.onSeek(applied, { driver: this.driver, duration, resume: false });
      this.state.seeking = false;
      this.state.loading = false;
      this.state.playing = false;
      this.syncStateFromClock({ includePosition: true });
      this.state.seekPreview = applied;
      this.setAnalysisCursor(applied);
      this.setTimelineCursor(applied, { skipCurrent: true });
      this.mediaChangeSerial += 1;
      this.applyEffectiveVisualSettings(this.currentTrack()?.id || 'seek');
      if (wasPlaying) this.play();
    }

    stopSourceOnly() {
      this.driver.stop();
    }

    async play(options = {}) {
      this.playbackIntent = true;
      const requestId = ++this.playRequestId;
      const track = this.currentTrack();
      const driver = this.driverForTrack(track);
      if (driver !== this.driver) this.setPlaybackDriver(driver);
      this.state.loading = true;
      this.state.playing = false;
      this.state.trackTitle = track.title;
      this.clock.setBuffering(true, { driver: this.driver, duration: this.state.duration || this.driver.duration(track) || this.clock.duration || 0 });
      try {
        const result = await this.driver.play(track, {
          offset: this.clock.getTime(),
          fadeIn: options.fadeIn === true,
          isCurrent: () => requestId === this.playRequestId && this.currentTrack()?.id === track.id,
          onEnded: () => {
            if (requestId !== this.playRequestId || !this.playbackIntent) return;
            this.driver.offset = 0;
            this.clock.onSeek(0, { driver: this.driver, duration: this.clock.duration, resume: false });
            this.syncStateFromClock({ includePosition: true });
            this.state.seekPreview = 0;
            this.state.seeking = false;
            this.state.playing = false;
            this.state.loading = false;
            this.setAnalysisCursor(0);
            this.setTimelineCursor(0);
            this.mediaChangeSerial += 1;
            this.decay();
            this.nextTrack({ playIfNeeded: true });
          }
        });
        if (!result) return;
        const offset = result.offset || 0;
        const duration = result.duration || this.driver.duration(track) || this.clock.duration || 0;
        this.clock.onPlay({ driver: this.driver, duration, time: offset });
        this.syncStateFromClock({ includePosition: true });
        this.state.trackTitle = track.title;
        this.state.seekPreview = offset;
      } catch (error) {
        if (requestId !== this.playRequestId) return;
        this.clock.setBuffering(false, { driver: this.driver, duration: this.clock.duration });
        this.state.loading = false;
        if (track.kind === 'youtube') {
          this.state.playing = false;
          this.state.trackTitle = track.title;
          this.driver.setUnavailable?.('YouTube unavailable or blocked');
          this.syncStateFromClock({ includePosition: true });
          console.warn('YouTube playback failed.', error);
          return;
        }
        console.warn('Music playback failed, falling back to synth.', error);
        if (track.kind !== 'synth') {
          const synthIndex = this.tracks.findIndex((t) => t.kind === 'synth');
          this.selectTrack(synthIndex < 0 ? 0 : synthIndex, { playIfNeeded: false });
          await this.play();
        }
      }
    }

    pause() {
      this.playbackIntent = false;
      this.playRequestId += 1;
      const pausedAt = this.driver.pause();
      this.clock.onPause({ driver: this.driver, time: pausedAt, duration: this.clock.duration || this.state.duration });
      this.syncStateFromClock({ includePosition: true });
      this.state.seekPreview = pausedAt;
      this.state.seeking = false;
      this.state.playing = false;
      this.state.loading = false;
    }
    setVolume(value) {
      const volume = clamp(Number(value) || 0, 0, 100);
      this.state.volume = volume;
      this.localAudioDriver.setVolume(volume);
      this.youtubeDriver.setVolume(volume);
      return volume;
    }
    togglePlay() { this.hasObservedPlayback() ? this.pause() : this.play(); }
    addLocalFile(file) { const track = { id: `local-${Date.now()}`, title: file.name.replace(/\.[^.]+$/, ''), kind: 'file', file, visualPreset: DEFAULT_VISUAL_PRESET }; this.tracks.unshift(track); this.selectTrack(0, { playIfNeeded: false }); }
    previousTrack(options) { this.selectTrack(this.selectedIndex + this.tracks.length - 1, options); }
    nextTrack(options) { this.selectTrack(this.selectedIndex + 1, options); }

    destroy() {
      this.playRequestId += 1;
      this.playbackIntent = false;
      this.durationRequestId += 1;
      this.state.loading = false;
      this.state.playing = false;
      this.state.seeking = false;
      this.localAudioDriver.destroy();
      this.youtubeDriver.destroy();
      this.clock.resetForTrack(this.currentTrack(), this.driver, 0);
    }

    avgBand(analyser, data, minHz, maxHz) {
      if (!analyser || !data) return 0;
      const nyquist = this.driver.sampleRate / 2;
      const start = Math.max(0, Math.floor(minHz / nyquist * data.length));
      const end = Math.min(data.length - 1, Math.ceil(maxHz / nyquist * data.length));
      let sum = 0, count = 0;
      for (let i = start; i <= end; i++) { sum += data[i] / 255; count++; }
      return count ? sum / count : 0;
    }

    decay() {
      for (const key of ['energy', 'bass', 'mid', 'high', 'fastEnergy', 'spectralFlux', 'pitchChange', 'pitchRise', 'transientSharp', 'beat', 'detailBeat', 'smoothedEnergy', 'smoothedBass', 'smoothedMid', 'smoothedHigh', 'gridImpact']) this.state[key] *= .92;
    }

    attackRelease(current, target, attack, release) {
      const rate = target > current ? attack : release;
      return current + (target - current) * rate;
    }

    triggerGrid(type, strength, frequency, options = {}) {
      const now = performance.now();
      const amount = this.state.gridBurstAmount;
      if (amount <= .01) return;
      const baseCooldown = type === 'pitch-rise' ? lerp(2200, 900, amount) : type === 'bass-drop' ? lerp(4000, 1400, amount) : lerp(5000, 1800, amount);
      if (!options.force && now - this.state.lastMusicGridAt < baseCooldown) return;
      this.state.lastMusicGridAt = now;
      this.state.musicGridSerial += 1;
      this.state.musicGridType = type;
      this.state.musicGridStrength = clamp(strength, 0, 1);
      this.state.musicGridHz = frequency || this.state.centroidHz || 900;
      this.state.musicGridBand = type === 'bass-drop' ? 'bass' : type === 'pitch-rise' ? 'high' : 'mid';
      this.state.timelineGridEvent = options.event || null;
    }

    triggerTimelineEvent(event, now = performance.now(), force = false) {
      const eventId = event?.id || '';
      if (eventId) this.timelineFiredEventCounts[eventId] = (this.timelineFiredEventCounts[eventId] || 0) + 1;
      if (eventId && !this.timelineFiredEventIds.includes(eventId)) {
        this.timelineFiredEventIds.push(eventId);
        if (this.timelineFiredEventIds.length > 120) this.timelineFiredEventIds.splice(0, this.timelineFiredEventIds.length - 120);
      }
      const strength = clamp(Number(event?.strength) || .65);
      if (event.type === 'gridBurst' || event.type === 'grid' || event.type === 'beatGrid') {
        this.triggerGrid(event.gridType || 'mood-shift', strength, event.frequency || this.state.centroidHz || 900, { force, event });
        return;
      }
      if (event.type === 'detail') {
        this.state.lastDetailAt = now;
        this.state.detailBeat = Math.max(this.state.detailBeat, strength);
        this.state.detailSerial++;
        return;
      }
      this.state.timelineRippleEvent = event;
      this.state.lastBeatAt = now;
      this.state.beat = Math.max(this.state.beat, strength);
      this.state.beatSerial++;
    }

    consumeAnalysisEvents() {
      if (!this.analysis || !this.driver.canAnalyze || !this.state.playing) return;
      const currentTime = this.getCurrentPosition();
      const lookahead = .12;
      while (this.analysisIndex < this.analysis.events.length && this.analysis.events[this.analysisIndex].time <= currentTime + lookahead) {
        const event = this.analysis.events[this.analysisIndex++];
        if (event.time >= currentTime - .08) this.triggerGrid(event.type, event.strength, event.frequency);
      }
    }

    consumeTimelineEvents(now) {
      if (this.captureReplayActive()) return;
      if (!this.timeline?.events?.length || !this.state.playing) return;
      const currentTime = this.timelineSampleTime(this.getCurrentPosition());
      const lookahead = .045;
      while (this.timelineEventIndex < this.timeline.events.length && this.timeline.events[this.timelineEventIndex].t <= currentTime + lookahead) {
        const event = this.timeline.events[this.timelineEventIndex++];
        if (event.t >= currentTime - .10) this.triggerTimelineEvent(event, now, true);
      }
    }

    update(now) {
      this.syncPlaybackPosition();
      this.applyEffectiveVisualSettings(this.currentTrack()?.id || 'unknown');
      const captureReplay = this.applyCaptureReplay(now);
      if (captureReplay) {
        this.decay();
        return;
      }
      const frame = this.driver.analyserFrame();
      if (!this.state.playing || !frame) {
        this.decay();
        if (this.state.playing) this.consumeTimelineEvents(now);
        return;
      }
      const { analyser, fastAnalyser, freq, fastFreq, prevFast, sampleRate } = frame;
      analyser.getByteFrequencyData(freq);
      fastAnalyser.getByteFrequencyData(fastFreq);
      const sub = this.avgBand(analyser, freq, 20, 60);
      const bass = this.avgBand(analyser, freq, 60, 160);
      const low = this.avgBand(analyser, freq, 160, 450);
      const mid = this.avgBand(analyser, freq, 450, 2000);
      const high = this.avgBand(analyser, freq, 2000, 8000);
      const air = this.avgBand(analyser, freq, 8000, 14000);
      const rawEnergy = sub * .10 + bass * .24 + low * .18 + mid * .22 + high * .18 + air * .08;
      const driver = rawEnergy * .45 + bass * .30 + mid * .15 + Math.max(0, rawEnergy - this.previousDriver) * .10;
      this.avg = lerp(this.avg, driver, .012);
      this.peak = Math.max(driver, this.peak * .995);
      const floor = this.avg * .52;
      const denom = Math.max(.05, this.peak - floor);
      const norm = clamp((driver - floor) / denom);
      const sens = this.state.sensitivity;
      const sharp = this.state.sharpness;
      const energy = clamp(Math.pow(norm, .72) * (.65 + sens * .85));
      const bassNorm = clamp(Math.pow(bass, .72) * (.7 + sens * .8));
      const midNorm = clamp(Math.pow(mid, .76) * (.65 + sens * .75));
      const highNorm = clamp(Math.pow(high * .75 + air * .25, .72) * (.62 + sens * .85));
      const onset = driver - this.previousDriver;
      this.previousDriver = lerp(this.previousDriver, driver, .25);
      this.state.energy = energy;
      this.state.bass = bassNorm;
      this.state.mid = midNorm;
      this.state.high = highNorm;
      this.state.smoothedEnergy = lerp(this.state.smoothedEnergy, energy, .17);
      this.state.smoothedBass = lerp(this.state.smoothedBass, bassNorm, .16);
      this.state.smoothedMid = lerp(this.state.smoothedMid, midNorm, .14);
      this.state.smoothedHigh = lerp(this.state.smoothedHigh, highNorm, .14);
      this.state.beat *= .82;
      this.state.detailBeat *= .80;

      let flux = 0, activeBins = 0, ampSum = 0, weightedHz = 0, domAmp = 0, domHz = 0;
      const nyquist = sampleRate / 2;
      for (let i = 1; i < fastFreq.length; i++) {
        const amp = fastFreq[i] / 255;
        const prev = prevFast[i] || 0;
        if (amp > prev) flux += amp - prev;
        prevFast[i] = amp;
        const hz = i / fastFreq.length * nyquist;
        if (amp > .04) { activeBins++; ampSum += amp; weightedHz += hz * amp; }
        if (hz > 80 && hz < 6000 && amp > domAmp) { domAmp = amp; domHz = hz; }
      }
      const fluxRaw = flux / Math.max(16, activeBins || 1);
      this.fluxAvg = lerp(this.fluxAvg, fluxRaw, .025);
      this.fluxPeak = Math.max(fluxRaw, this.fluxPeak * .992);
      const fluxNorm = clamp((fluxRaw - this.fluxAvg * .55) / Math.max(.02, this.fluxPeak - this.fluxAvg * .55));
      const centroid = ampSum > 0 ? weightedHz / ampSum : this.prevCentroid;
      const dominantRise = Math.max(0, Math.log2((domHz + 80) / (this.prevDom + 80)));
      const centroidRise = Math.max(0, Math.log2((centroid + 80) / (this.prevCentroid + 80)));
      const pitchRise = clamp(dominantRise * 2.4 + centroidRise * 1.6, 0, 1);
      const pitchJump = Math.abs(Math.log2((domHz + 80) / (this.prevDom + 80)));
      const warmth = bassNorm + low;
      const brightness = highNorm + air;
      const density = energy + fluxNorm;
      this.moodBase.warmth = lerp(this.moodBase.warmth, warmth, .012);
      this.moodBase.brightness = lerp(this.moodBase.brightness, brightness, .012);
      this.moodBase.density = lerp(this.moodBase.density, density, .012);
      const moodShift = clamp(Math.abs(brightness - this.moodBase.brightness) * .45 + Math.abs(warmth - this.moodBase.warmth) * .30 + Math.abs(density - this.moodBase.density) * .25);
      const nowSec = now / 1000;
      const threshold = lerp(.18, .105, sens);
      const cooldown = lerp(430, 250, sens);
      if (onset > threshold && energy > .16 && now - this.state.lastBeatAt > cooldown) {
        this.state.lastBeatAt = now;
        this.lastEnergyPulseAt = now;
        this.state.beat = clamp(.45 + onset * 3.2 + bassNorm * .28, 0, 1);
        this.state.beatSerial++;
        this.recentOnsets.push(nowSec);
        this.recentOnsets = this.recentOnsets.filter((t) => nowSec - t < 6);
      } else if (this.state.smoothedEnergy > .12 && driver > .18 && now - this.lastEnergyPulseAt > lerp(980, 560, sens)) {
        this.lastEnergyPulseAt = now;
        this.state.lastBeatAt = now;
        this.state.beat = clamp(.28 + this.state.smoothedEnergy * .35 + this.state.smoothedBass * .22, 0, .72);
        this.state.beatSerial++;
      }
      let tempoShift = 0;
      if (this.recentOnsets.length >= 5) {
        const intervals = [];
        for (let i = 1; i < this.recentOnsets.length; i++) intervals.push(this.recentOnsets[i] - this.recentOnsets[i - 1]);
        const last = intervals[intervals.length - 1];
        const avg = intervals.slice(-6).reduce((s, v) => s + v, 0) / Math.min(6, intervals.length);
        tempoShift = clamp(Math.abs(last - avg) / Math.max(.12, avg));
      }
      const transientSharp = this.attackRelease(this.state.transientSharp, clamp(fluxNorm * .55 + pitchRise * .25 + Math.max(0, onset) * 2.1 * .20), .75, .18);
      const pitchChange = this.attackRelease(this.state.pitchChange, clamp(fluxNorm * .45 + pitchRise * .35 + pitchJump * .2), .70, .16);
      this.state.fastEnergy = this.attackRelease(this.state.fastEnergy, fluxNorm, .70, .18);
      this.state.spectralFlux = fluxNorm;
      this.state.pitchChange = pitchChange;
      this.state.pitchJump = pitchJump;
      this.state.pitchRise = pitchRise;
      this.state.dominantRise = dominantRise;
      this.state.centroidRise = centroidRise;
      this.state.dominantHz = domHz;
      this.state.centroidHz = centroid;
      this.state.transientSharp = transientSharp;
      this.state.moodShift = moodShift;
      this.state.tempoShift = tempoShift;
      const detailThreshold = lerp(.58, .28, sharp);
      if ((fluxNorm * .55 + pitchRise * .35 + highNorm * .10) > detailThreshold && now - this.state.lastDetailAt > lerp(180, 70, sharp)) {
        this.state.lastDetailAt = now;
        this.state.detailBeat = clamp(.25 + fluxNorm * .42 + pitchRise * .36, 0, 1);
        this.state.detailSerial++;
      }
      const gridImpact = clamp(fluxNorm * .30 + pitchRise * .28 + transientSharp * .22 + Math.max(0, onset) * 1.4 * .12 + Math.max(0, bassNorm - this.state.smoothedBass) * .08 + moodShift * .16 + tempoShift * .12);
      this.state.gridImpact = gridImpact;
      const gridAmount = this.state.gridBurstAmount;
      const gridThreshold = lerp(.92, .54, gridAmount) * lerp(1.15, .78, sharp);
      if (gridAmount > .01 && gridImpact > gridThreshold) {
        let type = 'mood-shift';
        if (bassNorm > .58 && Math.max(0, bassNorm - this.state.smoothedBass) > .10) type = 'bass-drop';
        else if (pitchRise > .12 || centroidRise > .08) type = 'pitch-rise';
        else if (tempoShift > .32) type = 'tempo-shift';
        this.triggerGrid(type, gridImpact, centroid || domHz || 900);
      }
      this.prevDom = domHz || this.prevDom;
      this.prevCentroid = centroid || this.prevCentroid;
      this.consumeAnalysisEvents();
      this.consumeTimelineEvents(now);
      if (this.options.studio || this.options.debug) {
        window.audioDebug = { fastConnected: !!fastAnalyser, fastBinsActive: activeBins, spectralFlux: fluxNorm, pitchChange, pitchRise, dominantHz: domHz, centroidHz: centroid, detailSerial: this.state.detailSerial, musicGridSerial: this.state.musicGridSerial, lastMusicGridType: this.state.musicGridType, gridImpact, analysisReady: this.state.analysisReady };
      } else if (window.audioDebug) {
        delete window.audioDebug;
      }
    }
  }

  class ShaderEngine {
    constructor(canvas, music) {
      this.canvas = canvas;
      this.music = music;
      this.gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false });
      this.supported = !!this.gl;
      this.fallbackCtx = this.supported ? null : canvas.getContext('2d');
      this.dpr = 1;
      this.program = null;
      this.loc = {};
      this.buffer = null;
      this.sampler = document.createElement('canvas');
      this.sampler.width = 96;
      this.sampler.height = 54;
      this.samplerCtx = this.sampler.getContext('2d', { willReadFrequently: true });
      this.sampleData = null;
      this.sampleFrame = 0;
      this.lastPalette = null;
      this.lastVariation = null;
      this.asciiSamplerContext = {};
      this.destroyed = false;
      this.marketTimers = new Set();
      this.resizeHandler = () => this.resize();
      this.pointerMoveHandler = (event) => {
        this.state.target[0] = event.clientX * this.dpr;
        this.state.target[1] = (window.innerHeight - event.clientY) * this.dpr;
      };
      localStorage.removeItem('asciiBrightness');
      localStorage.removeItem('asciiTone');
      this.state = { shader: 'aurora', palette: 'default', speed: .8, mouseInf: .7, asciiTone: 'shader', asciiBrightness: normalizeAsciiBrightness(DEFAULT_ASCII_BRIGHTNESS), asciiTintStrength: SHADER_ASCII_TINT_STRENGTH, time: 0, mouse: [0, 0], target: [0, 0] };
      this.pctValues = { btc: 2.84, eth: 1.12, spy: -.32, eur: .08 };
      this.volatilityFlash = { color: 'green', k: 0, target: 0, last: performance.now(), trigger: -1e9, delta: 0, ticker: '' };
      this.last = performance.now();
      this.init();
      this.resize();
      window.addEventListener('resize', this.resizeHandler, { passive: true });
      window.addEventListener('pointermove', this.pointerMoveHandler, { passive: true });
      this.scheduleMarket();
    }

    vertexSrc() { return 'attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.0,1.0);}'; }
    fragmentSrc() { return `
precision highp float;
uniform vec2 u_res;
uniform vec2 u_mouse;
uniform float u_time;
uniform float u_mouseInf;
uniform float u_density;
uniform float u_volatility;
uniform float u_contrast;
uniform float u_intensity;
uniform float u_audioEnergy;
uniform float u_audioBass;
uniform float u_audioMid;
uniform float u_audioHigh;
uniform float u_audioBeat;
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_c3;
uniform vec3 u_c4;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);float a=hash(i),b=hash(i+vec2(1,0)),c=hash(i+vec2(0,1)),d=hash(i+vec2(1,1));vec2 u=f*f*(3.0-2.0*f);return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.;a*=.5;}return v;}
vec3 aurora(vec2 uv,vec2 m){float t=u_time*(.22+u_volatility*.25);vec3 col=vec3(.015,.016,.02);vec3 sum=vec3(0.);for(int i=0;i<4;i++){float fi=float(i);float y=-.36+fi*.25;float warp=fbm(vec2(uv.x*(1.1+u_density*1.5)+t*.28+fi,t*.45+fi*2.1))*(.34+u_volatility*.26+u_audioMid*.10);warp+=sin(uv.x*(1.5+u_density*1.4)+t+fi)*.10;warp+=(m.y-uv.y)*.16*u_mouseInf*exp(-abs(uv.y-m.y-y)*1.8);float band=exp(-pow((uv.y-y-warp)*(2.2+u_density*.8+u_audioBass*.30),2.)*1.8);float rib=fbm(vec2(uv.x*(2.2+u_density*2.5)+t*.6+fi*3.,uv.y*4.-t));band*=.50+rib*(.80+u_audioHigh*.18);vec3 bc=mix(u_c1,u_c2,sin(fi*1.3+t)*.5+.5);bc=mix(bc,u_c3,sin(uv.x*2.+fi)*.5+.5);sum+=bc*band;}col+=sum*(.72+u_intensity*.18+u_audioEnergy*.16);col+=u_c4*exp(-length(uv-m)*4.5)*.18*u_mouseInf;return col;}
void main(){vec2 uv=(gl_FragCoord.xy-.5*u_res)/u_res.y;vec2 m=(u_mouse-.5*u_res)/u_res.y;vec3 col=aurora(uv,m);col=pow(max(col,vec3(0.)),vec3(1.08-u_contrast*.18));col*=.54+u_contrast*.28+u_audioBeat*.12;gl_FragColor=vec4(min(col,vec3(.78)),1.);}
`; }

    compile(type, src) { const gl = this.gl, shader = gl.createShader(type); gl.shaderSource(shader, src); gl.compileShader(shader); if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader)); return shader; }
    init() {
      if (!this.supported) return;
      const gl = this.gl;
      this.program = gl.createProgram();
      gl.attachShader(this.program, this.compile(gl.VERTEX_SHADER, this.vertexSrc()));
      gl.attachShader(this.program, this.compile(gl.FRAGMENT_SHADER, this.fragmentSrc()));
      gl.linkProgram(this.program);
      if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(this.program));
      const names = ['res','mouse','time','mouseInf','density','volatility','contrast','intensity','audioEnergy','audioBass','audioMid','audioHigh','audioBeat','c1','c2','c3','c4'];
      this.loc = { pos: gl.getAttribLocation(this.program, 'a_pos') };
      for (const name of names) this.loc[name] = gl.getUniformLocation(this.program, `u_${name}`);
      this.buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    }
    resize() { this.dpr = Math.min(window.devicePixelRatio || 1, 2); this.canvas.width = Math.max(2, Math.floor(window.innerWidth * this.dpr)); this.canvas.height = Math.max(2, Math.floor(window.innerHeight * this.dpr)); if (this.supported) this.gl.viewport(0, 0, this.canvas.width, this.canvas.height); this.state.target = [this.canvas.width * .5, this.canvas.height * .5]; }
    hsl(h, s, l) { h = ((h % 1) + 1) % 1; const a = s * Math.min(l, 1 - l); const f = (n) => { const k = (n + h * 12) % 12; return l - a * Math.max(-1, Math.min(Math.min(k - 3, 9 - k), 1)); }; return [f(0), f(8), f(4)]; }
    mix3(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
    staticPalettes() { return { default:[[1,.25,.55],[.3,.8,1],[1,.8,.2],[.5,.2,.9]], ocean:[[0,.4,.85],[0,.85,.85],[.2,1,.7],[.05,.1,.4]], ember:[[1,.2,.1],[1,.6,0],[1,.9,.4],[.5,0,.2]], toxic:[[.6,1,0],[0,1,.5],[0,.9,.9],[.4,0,.8]], candy:[[1,.4,.8],[.6,.4,1],[1,.8,.95],[.85,.5,.85]], mono:[[.70,.70,.72],[.30,.30,.34],[.58,.58,.62],[.20,.20,.24]] }; }
    scheduleMarket() { for (const ticker of Object.keys(this.pctValues)) { const loop = () => { if (this.destroyed) return; const timer = setTimeout(() => { this.marketTimers.delete(timer); if (this.destroyed) return; const swing = Math.random() < .07; const delta = swing ? (1.5 + Math.random() * 3) * (Math.random() < .5 ? -1 : 1) : (Math.random() - .5) * .12; this.pctValues[ticker] = clamp(this.pctValues[ticker] + delta, -99, 99); if (Math.abs(delta) > 1) this.triggerMarket(delta, ticker); loop(); }, 600 + Math.random() * 1400); this.marketTimers.add(timer); }; loop(); } }
    triggerMarket(delta, ticker) { const strength = Math.min(1, Math.abs(delta) / 3), color = delta >= 0 ? 'green' : 'red'; if (this.volatilityFlash.color === color) this.volatilityFlash.target = Math.max(this.volatilityFlash.target, strength); else if (strength > this.volatilityFlash.k + .15) { this.volatilityFlash.color = color; this.volatilityFlash.target = strength; } this.volatilityFlash.trigger = performance.now(); this.volatilityFlash.delta = delta; this.volatilityFlash.ticker = ticker; }
    updatePulse(now) { const dt = Math.min(.1, (now - this.volatilityFlash.last) / 1000); this.volatilityFlash.last = now; if ((now - this.volatilityFlash.trigger) / 1000 > 1.2) this.volatilityFlash.target *= Math.exp(-dt / 4.2); const diff = this.volatilityFlash.target - this.volatilityFlash.k, tau = diff > 0 ? .85 : 1.7; this.volatilityFlash.k += diff * (1 - Math.exp(-dt / tau)); }
    palette(now) { const t = this.state.time, stat = this.staticPalettes(); if (stat[this.state.palette]) return stat[this.state.palette]; if (this.state.palette === 'rainbow') { const b = t * .07; return [this.hsl(b,.88,.55), this.hsl(b+.25,.88,.55), this.hsl(b+.5,.88,.55), this.hsl(b+.75,.85,.42)]; } if (this.state.palette === 'market') { const avg = Object.values(this.pctValues).reduce((s,v)=>s+v,0)/4, n = clamp((avg+4)/8); const warm = [[1,.18,.08],[1,.55,.1],[1,.85,.3],[.55,.05,.18]], cool = [[.1,.6,1],[.05,.9,.7],[.2,1,.5],[.25,.35,1]]; return [0,1,2,3].map(i => this.mix3(warm[i], cool[i], n)); } if (this.state.palette === 'pulse') { const b = t * .07, out = [this.hsl(b,.88,.55),this.hsl(b+.25,.88,.55),this.hsl(b+.5,.88,.55),this.hsl(b+.75,.85,.42)], k = this.volatilityFlash.k; if (k <= .001) return out; const green = [[0,.95,.35],[.15,1,.5],[.4,1,.45],[0,.45,.2]], red = [[1,.12,.18],[1,.35,.18],[1,.6,.25],[.55,.04,.12]], tint = this.volatilityFlash.color === 'green' ? green : red; return out.map((c,i)=>this.mix3(c,tint[i],k)); } if (this.state.palette === 'audio') { const m = this.music.state, scale = m.shaderEnabled ? SHADER_AUDIO_REACTIVITY : 0, b = m.smoothedBass * scale, mid = m.smoothedMid * scale, h = m.smoothedHigh * scale, e = m.smoothedEnergy * scale, deep = [.12,.12,.13]; return [this.mix3(deep,[.95,.28,.12],b), this.mix3([.28,.28,.32],[.08,.82,.78],mid), this.mix3([.56,.56,.60],[.86,.86,.92],h), this.mix3([.18,.16,.24],[.56,.38,.90],e)]; } return stat.default; }
    variation() { const base = { density:.34, volatility:.36, contrast:.44, intensity:.48 }, m = this.music.state; if (m.shaderEnabled && m.playing) { base.density += m.smoothedBass * .16 * SHADER_AUDIO_REACTIVITY; base.volatility += m.smoothedEnergy * .28 * SHADER_AUDIO_REACTIVITY; base.contrast += m.smoothedHigh * .18 * SHADER_AUDIO_REACTIVITY; base.intensity += m.beat * .20 * SHADER_AUDIO_REACTIVITY; } return base; }
    render(now) {
      const dt = Math.min(.05, (now - this.last) / 1000 || .016);
      this.last = now;
      this.updatePulse(now);
      const m = this.music.state;
      const audioSpeed = m.playing && m.shaderEnabled ? 1 + (m.smoothedEnergy * .75 + m.smoothedBass * .35) * SHADER_AUDIO_REACTIVITY : 1;
      this.state.time += dt * this.state.speed * clamp(audioSpeed, 1, 1.33);
      this.state.mouse[0] += (this.state.target[0] - this.state.mouse[0]) * .12;
      this.state.mouse[1] += (this.state.target[1] - this.state.mouse[1]) * .12;
      if (!this.supported) { this.renderFallback(now); return; }
      const gl = this.gl, pal = this.palette(now), v = this.variation(), a = m.playing && m.shaderEnabled ? SHADER_AUDIO_REACTIVITY : 0;
      this.lastPalette = pal;
      this.lastVariation = v;
      gl.useProgram(this.program);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.enableVertexAttribArray(this.loc.pos);
      gl.vertexAttribPointer(this.loc.pos, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(this.loc.res, this.canvas.width, this.canvas.height);
      gl.uniform2f(this.loc.mouse, this.state.mouse[0], this.state.mouse[1]);
      gl.uniform1f(this.loc.time, this.state.time);
      gl.uniform1f(this.loc.mouseInf, this.state.mouseInf);
      gl.uniform1f(this.loc.density, v.density);
      gl.uniform1f(this.loc.volatility, v.volatility);
      gl.uniform1f(this.loc.contrast, v.contrast);
      gl.uniform1f(this.loc.intensity, v.intensity);
      gl.uniform1f(this.loc.audioEnergy, m.smoothedEnergy * a);
      gl.uniform1f(this.loc.audioBass, m.smoothedBass * a);
      gl.uniform1f(this.loc.audioMid, m.smoothedMid * a);
      gl.uniform1f(this.loc.audioHigh, m.smoothedHigh * a);
      gl.uniform1f(this.loc.audioBeat, m.beat * a);
      gl.uniform3f(this.loc.c1, ...pal[0]);
      gl.uniform3f(this.loc.c2, ...pal[1]);
      gl.uniform3f(this.loc.c3, ...pal[2]);
      gl.uniform3f(this.loc.c4, ...pal[3]);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      this.updateSampler();
    }
    renderFallback(now) { const ctx = this.fallbackCtx, w = this.canvas.width, h = this.canvas.height, rawPal = this.palette(now), pal = rawPal.map(c=>c.map(v=>Math.round(clamp(v,0,1)*255))); this.lastPalette = rawPal; this.lastVariation = this.variation(); ctx.setTransform(1,0,0,1,0,0); const grad = ctx.createRadialGradient(w*.5,h*.3,1,w*.5,h*.5,Math.max(w,h)*.8); grad.addColorStop(0,`rgb(${pal[1][0]},${pal[1][1]},${pal[1][2]})`); grad.addColorStop(.5,`rgb(${pal[2][0]},${pal[2][1]},${pal[2][2]})`); grad.addColorStop(1,`rgb(${pal[3][0]},${pal[3][1]},${pal[3][2]})`); ctx.fillStyle = grad; ctx.fillRect(0,0,w,h); this.updateSampler(); }
    updateSampler() { this.sampleFrame++; this.sampleData = null; }
  prepareAsciiSampler(cameraY = 0) {
    const context = this.asciiSamplerContext;
    const music = this.music.state;
    context.vw = Math.max(1, window.innerWidth);
    context.vh = Math.max(1, window.innerHeight);
    context.cameraY = Math.max(0, Number(cameraY) || 0);
    context.worldLocked = true;
    context.pal = this.lastPalette || this.palette(performance.now());
    context.variation = this.lastVariation || this.variation();
    context.time = this.state.time;
    context.mouseX = clamp(this.state.mouse[0] / Math.max(1, this.canvas.width), 0, 1);
    context.mouseY = clamp(1 - this.state.mouse[1] / Math.max(1, this.canvas.height), 0, 1);
    context.mouseFalloff = 4.8 - clamp(this.state.mouseInf, 0, 1.2) * 1.4;
    context.energy = music.playing && music.shaderEnabled
      ? (music.smoothedEnergy + music.smoothedBass * .45 + music.beat * .55) * SHADER_AUDIO_REACTIVITY
      : 0;
    return context;
  }
  sample(x, y, out = {}, prepared = null) {
    if (this.state.asciiTone !== 'shader') return null;
    const context = prepared || this.prepareAsciiSampler();
    const nx = clamp(x / context.vw, 0, 1);
    const cameraUnit = context.worldLocked ? context.cameraY / context.vh : 0;
    const ny = context.worldLocked
      ? mirroredUnit(y / context.vh + cameraUnit)
      : clamp(y / context.vh, 0, 1);
    const mouseY = context.worldLocked
      ? mirroredUnit(context.mouseY + cameraUnit)
      : context.mouseY;
    const pal = context.pal;
    const v = context.variation;
    const t = context.time;
    const waveA = Math.sin(nx * (4.4 + v.density * 3.2) + t * .92 + Math.sin(ny * 3.2 + t * .38)) * .5 + .5;
    const waveB = Math.sin(ny * (5.1 + v.volatility * 2.4) - t * .64 + Math.cos(nx * 2.8 + t * .31)) * .5 + .5;
    const mouseGlow = Math.exp(-Math.hypot(nx - context.mouseX, ny - mouseY) * context.mouseFalloff);
    const energy = context.energy;
    const vertical = clamp(ny + (waveA - .5) * .24 + (waveB - .5) * .14, 0, 1);
    const baseMix = clamp(waveA * .72 + vertical * .28);
    const altMix = clamp(waveB * .60 + (1 - vertical) * .40);
    const colorMix = clamp(.28 + vertical * .32 + mouseGlow * .20 + energy * .24, 0, 1);
    const baseR = lerp(pal[0][0], pal[1][0], baseMix);
    const baseG = lerp(pal[0][1], pal[1][1], baseMix);
    const baseB = lerp(pal[0][2], pal[1][2], baseMix);
    const altR = lerp(pal[2][0], pal[3][0], altMix);
    const altG = lerp(pal[2][1], pal[3][1], altMix);
    const altB = lerp(pal[2][2], pal[3][2], altMix);
    const colorR = lerp(baseR, altR, colorMix);
    const colorG = lerp(baseG, altG, colorMix);
    const colorB = lerp(baseB, altB, colorMix);
    const shade = clamp(.46 + v.contrast * .20 + v.intensity * .16 + mouseGlow * .10 + energy * .14, .34, .78);
    out.r = Math.round(clamp(colorR * shade, 0, .78) * 255);
    out.g = Math.round(clamp(colorG * shade, 0, .78) * 255);
    out.b = Math.round(clamp(colorB * shade, 0, .78) * 255);
    return out;
  }
  setAsciiTone(tone) {
    this.state.asciiTone = tone === 'shader' ? 'shader' : 'gray';
    localStorage.removeItem('asciiTone');
    this.onToneChanged?.(this.state.asciiTone);
  }
  setAsciiBrightness(value) { this.state.asciiBrightness = normalizeAsciiBrightness(value); }
  toggleAsciiTone() { this.setAsciiTone(this.state.asciiTone === 'shader' ? 'gray' : 'shader'); }
    setShader() { this.state.shader = 'aurora'; }
    setPalette(palette) { this.state.palette = palette; }
    cyclePalette(dir = 1) { const arr = ['default','ocean','ember','toxic','candy','mono','rainbow','market','pulse','audio']; this.setPalette(arr[(arr.indexOf(this.state.palette) + dir + arr.length) % arr.length]); }
    destroy() {
      this.destroyed = true;
      window.removeEventListener('resize', this.resizeHandler);
      window.removeEventListener('pointermove', this.pointerMoveHandler);
      for (const timer of this.marketTimers) clearTimeout(timer);
      this.marketTimers.clear();
      if (this.gl) {
        if (this.buffer) this.gl.deleteBuffer(this.buffer);
        if (this.program) this.gl.deleteProgram(this.program);
      }
      this.buffer = null;
      this.program = null;
      this.sampleData = null;
    }
  }

  class BorderRenderer {
    constructor(engine, root) {
      this.engine = engine;
      this.root = root;
      this.items = [];
      this.ro = new ResizeObserver(() => this.collect());
      this.collect();
    }
    collect() {
      for (const item of this.items) this.ro.unobserve(item.el);
      this.items = Array.from(this.root.querySelectorAll('[data-shader-border]')).map((el) => {
        let canvas = el.querySelector(':scope > .ascii-border-canvas');
        if (!canvas) {
          canvas = document.createElement('canvas');
          canvas.className = 'ascii-border-canvas';
          el.prepend(canvas);
        }
        this.ro.observe(el);
        return { el, canvas, ctx: canvas.getContext('2d'), w: 0, h: 0 };
      });
    }
    draw() {
      if (!this.items.length) return false;
      const source = this.engine.canvas;
      const sw = source.width;
      const sh = source.height;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const styles = getComputedStyle(document.documentElement);
      const border = parseFloat(styles.getPropertyValue('--ascii-border-size')) || 1.6;
      const borderOutset = parseFloat(styles.getPropertyValue('--ascii-border-outset')) || 0;
      const borderInnerInset = parseFloat(styles.getPropertyValue('--ascii-border-inner-inset')) || border;
      const baseRadius = parseFloat(styles.getPropertyValue('--ascii-radius')) || 18;
      for (const item of this.items) {
        const rect = item.el.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0 || rect.bottom < 0 || rect.right < 0 || rect.top > vh || rect.left > vw) continue;
        const canvasWidth = rect.width + borderOutset * 2;
        const canvasHeight = rect.height + borderOutset * 2;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.floor(canvasWidth * dpr);
        const h = Math.floor(canvasHeight * dpr);
        if (item.w !== w || item.h !== h) {
          item.w = w;
          item.h = h;
          item.canvas.width = w;
          item.canvas.height = h;
          item.canvas.style.width = canvasWidth + 'px';
          item.canvas.style.height = canvasHeight + 'px';
        }
        const ctx = item.ctx;
        const elStyle = getComputedStyle(item.el);
        const radius = parseFloat(elStyle.borderTopLeftRadius) || baseRadius;
        const outerRadius = radius + borderOutset;
        const innerInset = borderOutset + borderInnerInset;
        const glassInterior = item.el.hasAttribute('data-shader-glass');
        const hover = item.el.matches(':hover');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        ctx.save();
        ctx.beginPath();
        roundedRectPath(ctx, 0, 0, canvasWidth, canvasHeight, outerRadius);
        ctx.clip();
        const sx = clamp((rect.left - borderOutset) / vw, 0, 1) * sw;
        const sy = clamp((rect.top - borderOutset) / vh, 0, 1) * sh;
        const sW = Math.max(2, Math.min(sw - sx, canvasWidth / vw * sw));
        const sH = Math.max(2, Math.min(sh - sy, canvasHeight / vh * sh));
        const lightTheme = currentAsciiThemeMode() === 'light';
        ctx.globalAlpha = lightTheme ? (glassInterior ? (hover ? .82 : .70) : (hover ? .76 : .60)) : glassInterior ? (hover ? .92 : .74) : (hover ? .98 : .82);
        try {
          ctx.drawImage(source, sx, sy, sW, sH, 0, 0, canvasWidth, canvasHeight);
        } catch (_) {
          ctx.drawImage(source, 0, 0, sw, sh, 0, 0, canvasWidth, canvasHeight);
        }
        ctx.globalAlpha = 1;
        if (!glassInterior) {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.beginPath();
          roundedRectPath(ctx, innerInset, innerInset, Math.max(0, canvasWidth - innerInset * 2), Math.max(0, canvasHeight - innerInset * 2), Math.max(0, outerRadius - innerInset));
          ctx.fillStyle = '#000';
          ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
        }
        ctx.strokeStyle = lightTheme ? glassInterior ? 'rgba(24,34,52,.21)' : 'rgba(24,34,52,.16)' : glassInterior ? 'rgba(205,205,205,.12)' : 'rgba(185,185,185,.09)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        roundedRectPath(ctx, .5, .5, canvasWidth - 1, canvasHeight - 1, Math.max(0, outerRadius - .5));
        ctx.stroke();
        ctx.restore();
      }
      return true;
    }
    destroy() {
      for (const item of this.items) this.ro.unobserve(item.el);
      this.ro.disconnect();
    }
  }

  class CardGridController {
    constructor(root) {
      this.root = root;
      this.items = new Map();
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) this.render(entry.target);
      });
      this.collect();
    }

    collect() {
      const targets = Array.from(this.root.querySelectorAll('.ascii-shader-frame > .ascii-black-fill'))
        .filter((el) => !el.closest('.ascii-shader-button, [data-no-card-grid]'));
      for (const target of targets) {
        if (this.items.has(target)) continue;
        let grid = target.querySelector(':scope > .ascii-card-grid');
        if (!grid) {
          grid = document.createElement('span');
          grid.className = 'ascii-card-grid';
          grid.setAttribute('aria-hidden', 'true');
          target.prepend(grid);
        }
        this.items.set(target, { grid, cols: 0, rows: 0, w: 0, h: 0 });
        this.resizeObserver.observe(target);
        this.render(target);
      }
    }

    render(target) {
      const item = this.items.get(target);
      if (!item) return;
      const rect = target.getBoundingClientRect();
      const styles = getComputedStyle(document.documentElement);
      const square = parseFloat(styles.getPropertyValue('--ascii-card-grid-square')) || 33;
      const gap = parseFloat(styles.getPropertyValue('--ascii-card-grid-gap')) || 2;
      const tile = square + gap;
      const overscan = 72;
      const cols = Math.max(1, Math.ceil((rect.width + overscan * 2) / tile));
      const rows = Math.max(1, Math.ceil((rect.height + overscan * 2) / tile));
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      if (item.cols === cols && item.rows === rows && item.w === w && item.h === h) return;
      item.cols = cols;
      item.rows = rows;
      item.w = w;
      item.h = h;
      item.grid.style.setProperty('--card-grid-cols', cols);
      item.grid.textContent = '';
      const frag = document.createDocumentFragment();
      const salt = Math.max(1, Math.round((w + 13) * (h + 17)));
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const cell = document.createElement('span');
          cell.className = 'ascii-card-grid-cell';
          const a = hash01(col + 1, row + 1, salt);
          const b = hash01(col + 17, row + 31, salt + 911);
          const base = 0.026 + a * 0.034;
          const pulse = b > 0.885;
          cell.style.setProperty('--base', base.toFixed(3));
          cell.style.setProperty('--peak', (0.14 + a * 0.12).toFixed(3));
          if (pulse) {
            cell.classList.add('is-pulsing');
            cell.style.setProperty('--dur', `${(12 + hash01(col, row, salt + 223) * 12).toFixed(2)}s`);
            cell.style.setProperty('--delay', `${(-hash01(col, row, salt + 557) * 19).toFixed(2)}s`);
          }
          frag.appendChild(cell);
        }
      }
      item.grid.appendChild(frag);
    }

    destroy() {
      this.resizeObserver.disconnect();
      for (const { grid } of this.items.values()) grid.remove();
      this.items.clear();
    }
  }

  const THREE_MODULE_PATH = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
  const SKILL_ICON_BASE = 'assets/skills/icons/';
  const SKILL_ICON_VERSION = '20260620-codex-badge-1';
  const skillIcon = (filename) => `${SKILL_ICON_BASE}${filename}?v=${SKILL_ICON_VERSION}`;
  const SKILL_BADGES = [
    { label: 'Java', name: 'Java', icon: skillIcon('java.svg'), color: '#f89820', text: '#ffffff' },
    { label: 'Py', name: 'Python', icon: skillIcon('python.svg'), color: '#3776ab', text: '#ffffff' },
    { label: 'JS', name: 'JavaScript', icon: skillIcon('javascript.svg'), color: '#f7df1e', text: '#141414' },
    { label: 'C++', name: 'C++', icon: skillIcon('cpp.svg'), color: '#00599c', text: '#ffffff' },
    { label: 'C', name: 'C', icon: skillIcon('c.svg'), color: '#a8b9cc', text: '#111111' },
    { label: 'Gemini', name: 'Gemini API', icon: skillIcon('gemini.svg'), color: '#4285f4', text: '#ffffff' },
    { label: 'Agents', name: 'AI Agents', icon: skillIcon('ai-agents.svg'), color: '#7c3aed', text: '#ffffff' },
    { label: 'LLMs', name: 'Large Language Models', icon: skillIcon('llm.svg'), color: '#10b981', text: '#ffffff' },
    { label: 'React', name: 'React', icon: skillIcon('react.svg'), color: '#61dafb', text: '#071014' },
    { label: 'Vite', name: 'Vite', icon: skillIcon('vite.svg'), color: '#646cff', text: '#ffffff' },
    { label: 'TW', name: 'Tailwind CSS', icon: skillIcon('tailwindcss.svg'), color: '#06b6d4', text: '#071014' },
    { label: 'Node', name: 'Node.js', icon: skillIcon('nodejs.svg'), color: '#339933', text: '#ffffff' },
    { label: 'HTML', name: 'HTML5', icon: skillIcon('html5.svg'), color: '#e34f26', text: '#ffffff' },
    { label: 'CSS', name: 'CSS3', icon: skillIcon('css3.svg'), color: '#663399', text: '#ffffff' },
    { label: 'Git', name: 'Git', icon: skillIcon('git.svg'), color: '#f05032', text: '#ffffff' },
    { label: 'GitHub', name: 'GitHub', icon: skillIcon('github.svg'), color: '#24292e', text: '#ffffff' },
    { label: 'Linux', name: 'Linux', icon: skillIcon('linux.svg'), color: '#f3f4f6', text: '#111111' },
    { label: 'Mongo', name: 'MongoDB', icon: skillIcon('mongodb.svg'), color: '#47a248', text: '#ffffff' },
    { label: 'Streamlit', name: 'Streamlit', icon: skillIcon('streamlit.svg'), color: '#ff4b4b', text: '#ffffff' },
    { label: 'DSA', name: 'Data Structures & Algorithms', icon: skillIcon('dsa.svg'), color: '#f59e0b', text: '#111111' },
    { label: 'VS Code', name: 'VS Code', icon: skillIcon('vscode.svg'), color: '#007acc', text: '#ffffff' }
  ];

  class SkillBadgePileController {
    constructor(root, options = {}) {
      this.root = root;
      this.options = options;
      this.card = root.querySelector('[data-skills-card]');
      this.canvas = this.card?.querySelector('[data-skills-canvas]');
      this.tooltip = this.card?.querySelector('[data-skills-tooltip]');
      this.tooltipHome = this.tooltip?.parentNode || null;
      this.tooltipNextSibling = this.tooltip?.nextSibling || null;
      this.fallback = this.card?.querySelector('[data-skills-fallback]');
      this.resetButton = this.card?.querySelector('[data-skills-reset]');
      this.skills = Array.isArray(options.skillBadges) && options.skillBadges.length ? options.skillBadges : SKILL_BADGES;
      this.badges = [];
      this.hitMeshes = [];
      this.iconImages = new Map();
      this.width = 0;
      this.height = 0;
      this.cardDx = 0;
      this.cardDy = 0;
      this.cardVx = 0;
      this.cardVy = 0;
      this.rawCardVx = 0;
      this.rawCardVy = 0;
      this.cardAx = 0;
      this.cardAy = 0;
      this.cardDropLagUntil = -Infinity;
      this.cardDropLagStrength = 0;
      this.lastCardX = null;
      this.lastCardY = null;
      this.lastMotionAt = -Infinity;
      this.badgeDrag = null;
      this.badgeDragActivationDistance = 8;
      this.mode = 'card';
      this.cardMotionActivated = false;
      this.playgroundEscapeDistance = 150;
      this.violentShakeEnergy = 0;
      this.violentShakeReleaseEnergy = 1.8;
      this.playgroundCanvas = null;
      this.playgroundRenderer = null;
      this.playgroundCamera = null;
      this.playgroundWidth = 0;
      this.playgroundHeight = 0;
      this.activated = false;
      this.activationSpeed = 80;
      this.destroyed = false;
      this.ready = false;
      this.cardVisible = true;
      this.staticFrameRendered = false;
      this.needsStaticRender = true;
      this.visibilityObserver = null;
      this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!this.card || !this.canvas) return;
      this.pointerMoveHandler = (event) => this.handlePointerMove(event);
      this.pointerDownHandler = (event) => this.handlePointerDown(event);
      this.pointerUpHandler = (event) => this.handlePointerUp(event);
      this.pointerCancelHandler = (event) => this.cancelBadgeDrag(event);
      this.pointerCaptureLostHandler = (event) => this.cancelBadgeDrag(event);
      this.pointerLeaveHandler = () => {
        this.hideTooltip();
        this.requestStaticRender();
      };
      this.windowPointerDownHandler = (event) => this.handleWindowPointerDown(event);
      this.windowPointerMoveHandler = (event) => this.handleWindowPointerMove(event);
      this.windowPointerUpHandler = (event) => this.handleWindowPointerUp(event);
      this.windowPointerCancelHandler = (event) => this.handleWindowPointerCancel(event);
      this.windowBlurHandler = () => this.cancelBadgeDrag();
      this.visibilityChangeHandler = () => {
        if (document.hidden) this.cancelBadgeDrag();
      };
      this.dockDoubleClickHandler = (event) => this.handleDockDoubleClick(event);
      this.resetButtonStopHandler = (event) => event.stopPropagation();
      this.resetButtonClickHandler = (event) => this.handleResetButtonClick(event);
      this.canvas.addEventListener('pointerdown', this.pointerDownHandler);
      this.canvas.addEventListener('pointermove', this.pointerMoveHandler);
      this.canvas.addEventListener('pointerup', this.pointerUpHandler);
      this.canvas.addEventListener('pointercancel', this.pointerCancelHandler);
      this.canvas.addEventListener('lostpointercapture', this.pointerCaptureLostHandler);
      this.canvas.addEventListener('pointerleave', this.pointerLeaveHandler);
      window.addEventListener('pointerdown', this.windowPointerDownHandler, { capture: true });
      window.addEventListener('pointermove', this.windowPointerMoveHandler);
      window.addEventListener('pointerup', this.windowPointerUpHandler, { capture: true });
      window.addEventListener('pointercancel', this.windowPointerCancelHandler, { capture: true });
      window.addEventListener('blur', this.windowBlurHandler);
      document.addEventListener('visibilitychange', this.visibilityChangeHandler);
      this.card.querySelectorAll('[data-drag]').forEach((handle) => {
        handle.addEventListener('dblclick', this.dockDoubleClickHandler);
      });
      ['pointerdown', 'mousedown', 'dblclick'].forEach((type) => {
        this.resetButton?.addEventListener(type, this.resetButtonStopHandler);
      });
      this.resetButton?.addEventListener('click', this.resetButtonClickHandler);
      this.populateFallback();
      if (!this.reduced) this.loadThree();
    }

    populateFallback() {
      if (!this.fallback) return;
      this.fallback.textContent = '';
      const frag = document.createDocumentFragment();
      this.skills.forEach((skill, index) => {
        const badge = document.createElement('span');
        badge.className = 'ascii-skills-fallback-badge';
        badge.title = skill.name;
        badge.setAttribute('aria-label', skill.name);
        badge.style.setProperty('--badge-color', skill.color || '#777777');
        badge.style.setProperty('--badge-text', skill.text || '#ffffff');
        badge.style.setProperty('--badge-tilt', `${(-10 + hash01(index + 3, index + 29, 601) * 20).toFixed(2)}deg`);
        badge.textContent = skill.label || skill.name;
        badge.dataset.logo = skill.label || skill.name;
        frag.appendChild(badge);
      });
      this.fallback.appendChild(frag);
    }

    async loadThree() {
      try {
        const THREE = window.THREE || await import(this.asset(THREE_MODULE_PATH));
        if (this.destroyed) return;
        this.THREE = THREE;
        await this.loadSkillIcons();
        if (this.destroyed) return;
        this.mountThree();
      } catch (error) {
        console.warn('3D skill badges could not load. Using static badge fallback.', error);
      }
    }

    asset(path) {
      if (/^(blob:|data:|https?:|file:)/i.test(path)) return path;
      return new URL(`${this.options.assetBase || ''}${path}`, document.baseURI).href;
    }

    async loadSkillIcons() {
      return;
    }

    loadSkillIcon(skill) {
      return new Promise((resolve) => {
        const image = new Image();
        image.decoding = 'async';
        image.onload = () => {
          this.iconImages.set(skill.icon, image);
          resolve();
        };
        image.onerror = () => {
          console.warn(`Skill badge icon could not load: ${skill.name}`);
          resolve();
        };
        image.src = this.asset(skill.icon);
      });
    }

    mountThree() {
      const THREE = this.THREE;
      this.scene = new THREE.Scene();
      this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1200);
      this.camera.position.set(0, 0, 520);
      this.camera.lookAt(0, 0, 0);
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      if (THREE.SRGBColorSpace) this.renderer.outputColorSpace = THREE.SRGBColorSpace;

      this.scene.add(new THREE.AmbientLight(0xffffff, 1.45));
      this.keyLight = new THREE.DirectionalLight(0xffffff, 2.35);
      this.keyLight.position.set(-150, 180, 340);
      this.scene.add(this.keyLight);
      this.rimLight = new THREE.PointLight(0x8fdcff, 68, 520);
      this.rimLight.position.set(150, -90, 220);
      this.scene.add(this.rimLight);

      this.raycaster = new THREE.Raycaster();
      this.pointer = new THREE.Vector2(10, 10);
      this.resizeObserver = new ResizeObserver(() => {
        this.resize(true);
        this.requestStaticRender();
      });
      this.resizeObserver.observe(this.card);
      if (typeof IntersectionObserver !== 'undefined') {
        this.visibilityObserver = new IntersectionObserver(([entry]) => {
          const wasVisible = this.cardVisible;
          this.cardVisible = !!entry?.isIntersecting;
          if (this.cardVisible !== wasVisible) this.resetCardMotionSample();
          this.requestStaticRender();
          if (!this.cardVisible) this.hideTooltip();
        }, { threshold: 0 });
        this.visibilityObserver.observe(this.card);
      }
      this.resize(true);
      this.buildBadges();
      this.card.classList.add('is-three-ready');
      this.ready = true;
    }

    currentRenderer() {
      return this.mode === 'playground' ? this.playgroundRenderer : this.renderer;
    }

    currentCamera() {
      return this.mode === 'playground' ? this.playgroundCamera : this.camera;
    }

    requestStaticRender() {
      this.staticFrameRendered = false;
      this.needsStaticRender = true;
    }

    sleep() {
      this.hideTooltip();
      this.requestStaticRender();
    }

    needsFrame() {
      if (!this.ready || !this.renderer || !this.scene || !this.camera) return false;
      if (document.hidden || document.body.classList.contains('visualizer-only')) return false;
      if (!this.cardVisible && !this.hasEscapedBadges()) return false;
      return true;
    }

    hasEscapedBadges() {
      return this.badges.some((badge) => badge.escaped);
    }

    allBadgesEscaped() {
      return this.badges.length > 0 && this.badges.every((badge) => badge.escaped);
    }

    updateResetButtonState() {
      const ready = this.allBadgesEscaped();
      this.card?.classList.toggle('is-skills-reset-ready', ready);
      this.resetButton?.setAttribute('aria-hidden', String(!ready));
      if (this.resetButton) this.resetButton.tabIndex = ready ? 0 : -1;
      return ready;
    }

    syncPlaygroundState() {
      const active = this.hasEscapedBadges();
      this.mode = active ? 'playground' : 'card';
      this.card?.classList.toggle('is-skills-playground', active);
      this.playgroundCanvas?.classList.toggle('is-visible', active);
      this.updateResetButtonState();
      return active;
    }

    setBadgeLayerVisible(escaped) {
      this.badges.forEach((badge) => {
        badge.group.visible = !!badge.escaped === escaped;
      });
    }

    setAllBadgesVisible() {
      this.badges.forEach((badge) => {
        badge.group.visible = true;
      });
    }

    renderBadgeLayers() {
      const hasEscaped = this.syncPlaygroundState();
      if (!hasEscaped) {
        this.setAllBadgesVisible();
        this.renderer?.render(this.scene, this.camera);
        return;
      }
      if (this.cardVisible) {
        this.setBadgeLayerVisible(false);
        this.renderer?.render(this.scene, this.camera);
      }
      this.setBadgeLayerVisible(true);
      this.playgroundRenderer?.render(this.scene, this.playgroundCamera);
      this.setAllBadgesVisible();
    }

    ensurePlaygroundRenderer() {
      if (this.playgroundRenderer) return true;
      const THREE = this.THREE;
      if (!THREE) return false;
      const canvas = document.createElement('canvas');
      canvas.className = 'ascii-skills-playground-canvas';
      canvas.setAttribute('data-skills-playground-canvas', '');
      canvas.setAttribute('aria-hidden', 'true');
      document.body.appendChild(canvas);
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1200);
      camera.position.set(0, 0, 520);
      camera.lookAt(0, 0, 0);
      const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance'
      });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.playgroundCanvas = canvas;
      this.playgroundCamera = camera;
      this.playgroundRenderer = renderer;
      return true;
    }

    buildBadges() {
      const THREE = this.THREE;
      this.clearBadges();
      this.skills.forEach((skill, index) => {
        const width = 30;
        const height = 30;
        const depth = 6.8;
        const shape = this.roundedShape(width, height, 6.8);
        const geometry = new THREE.ExtrudeGeometry(shape, {
          depth,
          bevelEnabled: true,
          bevelSize: 1.75,
          bevelThickness: 1.1,
          bevelSegments: 5,
          curveSegments: 10
        });
        geometry.center();
        const material = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(skill.color || '#777777'),
          metalness: 0.48,
          roughness: 0.18,
          clearcoat: 0.95,
          clearcoatRoughness: 0.14,
          reflectivity: 0.72,
          emissive: new THREE.Color(skill.color || '#777777').multiplyScalar(0.045)
        });
        const group = new THREE.Group();
        const body = new THREE.Mesh(geometry, material);
        body.userData.skill = skill;
        body.castShadow = false;
        body.renderOrder = 1;
        group.add(body);

        const texture = this.badgeTexture(skill, this.iconImages.get(skill.icon));
        const labelMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(width * 0.97, height * 0.97),
          new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            toneMapped: false,
            depthTest: false,
            depthWrite: false
          })
        );
        labelMesh.position.z = depth * 0.5 + 1.2;
        labelMesh.renderOrder = 2;
        labelMesh.userData.skill = skill;
        group.add(labelMesh);

        this.scene.add(group);
        const seed = hashStringToSeed(skill.name || skill.label || index);
        const mass = (0.82 + hash01(index + 5, seed, 137) * 0.55) * 1.15;
        const badge = {
          group,
          body,
          labelMesh,
          texture,
          width,
          height,
          x: 0,
          y: 0,
          z: 0,
          vx: 0,
          vy: 0,
          rx: 0,
          ry: 0,
          rz: 0,
          rvx: 0,
          rvy: 0,
          rvz: 0,
          tx: 0,
          ty: 0,
          tz: 0,
          trx: 0,
          try: 0,
          trz: 0,
          seed,
          mass,
          invMass: 1 / mass,
          grip: 0.74 + hash01(index + 17, seed, 211) * 0.45,
          restitution: 0.08 + hash01(index + 29, seed, 307) * 0.18,
          surfaceFriction: 0.28 + hash01(index + 41, seed, 409) * 0.32,
          linearDrag: 0.942 + hash01(index + 53, seed, 503) * 0.035,
          angularDrag: 0.895 + hash01(index + 67, seed, 601) * 0.04,
          escaped: false,
          dragging: false,
          throwBoostUntil: -Infinity,
          sleeping: false
        };
        body.userData.badge = badge;
        labelMesh.userData.badge = badge;
        this.badges.push(badge);
        this.hitMeshes.push(body, labelMesh);
      });
      this.updateTargets(true);
    }

    clearBadges() {
      for (const badge of this.badges) {
        this.scene?.remove(badge.group);
        badge.group.traverse((object) => {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach((material) => {
              if (material.map) material.map.dispose();
              material.dispose();
            });
          }
        });
      }
      this.badges = [];
      this.hitMeshes = [];
      this.updateResetButtonState();
    }

    roundedShape(width, height, radius) {
      const THREE = this.THREE;
      const x = -width / 2;
      const y = -height / 2;
      const r = Math.min(radius, width / 2, height / 2);
      const shape = new THREE.Shape();
      shape.moveTo(x + r, y);
      shape.lineTo(x + width - r, y);
      shape.quadraticCurveTo(x + width, y, x + width, y + r);
      shape.lineTo(x + width, y + height - r);
      shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
      shape.lineTo(x + r, y + height);
      shape.quadraticCurveTo(x, y + height, x, y + height - r);
      shape.lineTo(x, y + r);
      shape.quadraticCurveTo(x, y, x + r, y);
      return shape;
    }

    badgeTexture(skill, iconImage) {
      const THREE = this.THREE;
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (iconImage) {
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,.24)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 2;
        this.drawContainedImage(ctx, iconImage, 0, 0, 256, 256);
        ctx.restore();
      } else {
        const text = String(skill.label || skill.name || '').toUpperCase();
        ctx.fillStyle = skill.text || '#ffffff';
        const fontSize = text.length > 8 ? 46 : text.length > 5 ? 54 : 66;
        ctx.font = `900 ${fontSize}px ui-monospace, SFMono-Regular, Consolas, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,.42)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 3;
        ctx.lineWidth = 8;
        ctx.strokeStyle = skill.text === '#141414' || skill.text === '#071014' ? 'rgba(255,255,255,.42)' : 'rgba(0,0,0,.36)';
        ctx.strokeText(text, 128, 132, 208);
        ctx.fillText(text, 128, 132, 200);
        ctx.shadowColor = 'transparent';
      }
      const shine = ctx.createLinearGradient(26, 16, 230, 238);
      shine.addColorStop(0, 'rgba(255,255,255,.12)');
      shine.addColorStop(0.34, 'rgba(255,255,255,.03)');
      shine.addColorStop(0.58, 'rgba(255,255,255,.09)');
      shine.addColorStop(1, 'rgba(255,255,255,.02)');
      this.roundedCanvasRect(ctx, 8, 8, 240, 240, 54);
      ctx.fillStyle = shine;
      ctx.fill();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = 'rgba(255,255,255,.08)';
      ctx.fillRect(48, 28, 120, 10);
      ctx.globalCompositeOperation = 'source-over';
      const texture = new THREE.CanvasTexture(canvas);
      if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      return texture;
    }

    drawContainedImage(ctx, image, x, y, width, height) {
      const sourceW = image.naturalWidth || image.width || width;
      const sourceH = image.naturalHeight || image.height || height;
      const scale = Math.min(width / Math.max(1, sourceW), height / Math.max(1, sourceH));
      const drawW = sourceW * scale;
      const drawH = sourceH * scale;
      ctx.drawImage(image, x + (width - drawW) / 2, y + (height - drawH) / 2, drawW, drawH);
    }

    roundedCanvasRect(ctx, x, y, width, height, radius) {
      const r = Math.min(radius, width / 2, height / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + width - r, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + r);
      ctx.lineTo(x + width, y + height - r);
      ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
      ctx.lineTo(x + r, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }

    resize(force = false) {
      if (!this.renderer || !this.camera || !this.canvas) return false;
      const rect = this.canvas.getBoundingClientRect();
      const width = Math.max(2, Math.round(rect.width));
      const height = Math.max(2, Math.round(rect.height));
      const cardChanged = force || width !== this.width || height !== this.height;
      if (cardChanged) {
        this.width = width;
        this.height = height;
        this.renderer.setSize(width, height, false);
        this.camera.left = -width / 2;
        this.camera.right = width / 2;
        this.camera.top = height / 2;
        this.camera.bottom = -height / 2;
        this.camera.updateProjectionMatrix();
        this.updateTargets(!this.activated);
      }
      let playgroundChanged = false;
      if (this.playgroundRenderer && this.playgroundCamera) {
        const playgroundWidth = Math.max(2, Math.round(window.innerWidth || 2));
        const playgroundHeight = Math.max(2, Math.round(window.innerHeight || 2));
        if (force || playgroundWidth !== this.playgroundWidth || playgroundHeight !== this.playgroundHeight) {
          playgroundChanged = true;
          this.playgroundWidth = playgroundWidth;
          this.playgroundHeight = playgroundHeight;
          this.playgroundRenderer.setSize(playgroundWidth, playgroundHeight, false);
          this.playgroundCamera.left = -playgroundWidth / 2;
          this.playgroundCamera.right = playgroundWidth / 2;
          this.playgroundCamera.top = playgroundHeight / 2;
          this.playgroundCamera.bottom = -playgroundHeight / 2;
          this.playgroundCamera.updateProjectionMatrix();
        }
      }
      if (cardChanged || playgroundChanged) this.requestStaticRender();
      return cardChanged || playgroundChanged;
    }

    updateTargets(resetPositions = false) {
      if (!this.badges.length || !this.width || !this.height) return;
      if (!this.activated) {
        this.updateGridTargets(resetPositions);
        return;
      }
      this.updatePileTargets(resetPositions);
    }

    updateGridTargets(resetPositions = false) {
      const count = this.badges.length;
      const usableW = Math.max(140, this.width - 32);
      const usableH = Math.max(112, this.height - 46);
      const maxColumns = Math.max(4, Math.min(9, Math.floor(usableW / 32)));
      const maxRows = Math.max(4, Math.min(6, Math.floor(usableH / 30)));
      const columns = Math.max(4, Math.min(maxColumns, Math.max(Math.ceil(count / maxRows), Math.ceil(Math.sqrt(count * 1.35)))));
      const rows = Math.ceil(count / columns);
      const cellW = usableW / columns;
      const cellH = usableH / rows;
      const startX = -usableW / 2 + cellW / 2;
      const startY = this.height / 2 - 38 - cellH / 2;
      this.badges.forEach((badge, index) => {
        if (badge.escaped) return;
        const col = index % columns;
        const row = Math.floor(index / columns);
        badge.tx = startX + col * cellW;
        badge.ty = startY - row * cellH;
        badge.tz = (index % 5) * 0.35;
        badge.trx = 0;
        badge.try = 0;
        badge.trz = 0;
        this.clampTarget(badge);
        if (resetPositions) {
          badge.x = badge.tx;
          badge.y = badge.ty;
          badge.z = badge.tz;
          badge.rx = 0;
          badge.ry = 0;
          badge.rz = 0;
          badge.vx = 0;
          badge.vy = 0;
          badge.rvx = 0;
          badge.rvy = 0;
          badge.rvz = 0;
          badge.sleeping = false;
          this.applyBadgeTransform(badge);
        }
      });
    }

    updatePileTargets(resetPositions = false) {
      const columns = Math.max(5, Math.min(7, Math.floor(this.width / 40) || 5));
      const stepX = Math.max(34, Math.min(52, (this.width - 72) / Math.max(1, columns - 1)));
      const stepY = Math.max(30, Math.min(38, this.height / 6.2));
      const baseY = -this.height / 2 + Math.max(46, this.height * 0.22);
      this.badges.forEach((badge, index) => {
        if (badge.escaped) return;
        const col = index % columns;
        const row = Math.floor(index / columns);
        const center = (columns - 1) / 2;
        const jitterX = (hash01(index + 11, badge.seed, 4) - 0.5) * 6;
        const jitterY = (hash01(index + 23, badge.seed, 9) - 0.5) * 4;
        badge.tx = (col - center) * stepX + (row % 2 ? stepX * 0.28 : 0) + jitterX;
        badge.ty = baseY + row * stepY + jitterY;
        badge.tz = (index % 9) * 1.2;
        badge.trx = -0.16 + hash01(index, badge.seed, 19) * 0.25;
        badge.try = -0.14 + hash01(index, badge.seed, 31) * 0.28;
        badge.trz = -0.45 + hash01(index, badge.seed, 53) * 0.9;
        this.clampTarget(badge);
        if (resetPositions) {
          badge.x = badge.tx + (hash01(index, badge.seed, 71) - 0.5) * 14;
          badge.y = badge.ty + (hash01(index, badge.seed, 79) - 0.5) * 10;
          badge.z = badge.tz;
          badge.rx = badge.trx;
          badge.ry = badge.try;
          badge.rz = badge.trz;
          badge.vx = 0;
          badge.vy = 0;
          badge.rvx = 0;
          badge.rvy = 0;
          badge.rvz = 0;
          badge.sleeping = false;
          this.applyBadgeTransform(badge);
        }
      });
    }

    clampTarget(badge) {
      const bounds = this.boundsFor(badge);
      badge.tx = clamp(badge.tx, bounds.minX, bounds.maxX);
      badge.ty = clamp(badge.ty, bounds.minY, bounds.maxY);
    }

    boundsFor(badge) {
      const pad = 9;
      if (badge.escaped) {
        const doc = document.documentElement;
        const body = document.body;
        const worldW = Math.max(window.innerWidth || 0, doc?.scrollWidth || 0, body?.scrollWidth || 0);
        const worldH = Math.max(window.innerHeight || 0, doc?.scrollHeight || 0, body?.scrollHeight || 0);
        return {
          minX: badge.width / 2 + pad,
          maxX: Math.max(badge.width / 2 + pad, worldW - badge.width / 2 - pad),
          minY: -Math.max(badge.height / 2 + pad, worldH - badge.height / 2 - pad),
          maxY: -badge.height / 2 - pad
        };
      }
      return {
        minX: -this.width / 2 + badge.width / 2 + pad,
        maxX: this.width / 2 - badge.width / 2 - pad,
        minY: -this.height / 2 + badge.height / 2 + pad,
        maxY: this.height / 2 - badge.height / 2 - pad
      };
    }

    update(now, deltaMs) {
      if (!this.ready || !this.renderer || !this.scene || !this.camera) return;
      if (document.hidden || document.body.classList.contains('visualizer-only')) return;
      if (!this.cardVisible && !this.hasEscapedBadges()) return;
      const resized = this.resize(false);
      const dt = Math.min(0.05, Math.max(0.001, (deltaMs || 16.67) / 1000));
      this.updateCardVelocity(dt);
      const cardSpeed = Math.hypot(this.cardVx, this.cardVy);
      if (!this.activated) {
        if (this.card.__worldDragging && cardSpeed > this.activationSpeed) {
          this.cardMotionActivated = true;
          this.activatePile(now, true);
        } else {
          if (resized || this.needsStaticRender || !this.staticFrameRendered) this.renderStatic(now);
          return;
        }
      }
      this.applyCardDropLag(now);
      this.updateViolentShake(dt, cardSpeed, now);
      if (this.card.__worldDragging || cardSpeed > 28) this.lastMotionAt = now;
      const settling = now - this.lastMotionAt > 380;
      const steps = Math.max(1, Math.min(4, Math.ceil(dt / (1 / 90))));
      const stepDt = dt / steps;
      for (let i = 0; i < steps; i++) this.stepBadgePhysics(stepDt, cardSpeed, settling, now + i * stepDt * 1000);

      const t = now * 0.001;
      if (this.keyLight) {
        this.keyLight.position.x = Math.sin(t * 0.9) * 160 - 80;
        this.keyLight.position.y = 150 + Math.cos(t * 0.7) * 52;
      }
      if (this.rimLight) {
        this.rimLight.position.x = Math.cos(t * 0.65) * 150;
        this.rimLight.position.y = -80 + Math.sin(t * 0.8) * 50;
      }
      this.renderBadgeLayers();
    }

    activatePile(now = performance.now(), gestureImpulse = false) {
      if (this.activated) return;
      this.activated = true;
      this.card?.classList.add('is-skills-activated');
      this.updatePileTargets(false);
      this.requestStaticRender();
      if (gestureImpulse) {
        this.badges.forEach((badge) => {
          this.applyGestureImpulse(badge, 0.048, 1.15);
        });
      }
      this.lastMotionAt = now;
    }

    applyCardDropLag(now = performance.now()) {
      if (!this.card?.__worldDragging || this.badgeDrag || this.cardDy <= 0.75) return;
      const downSpeed = Math.max(0, this.rawCardVy);
      const downAcceleration = Math.max(0, this.cardAy);
      const speedResponse = clamp((downSpeed - 420) / 980, 0, 1);
      const accelerationResponse = clamp((downAcceleration - 1800) / 7600, 0, 1);
      const distanceResponse = clamp((this.cardDy - 1.5) / 34, 0, 1);
      const response = clamp(Math.max(speedResponse, accelerationResponse * 0.85) * distanceResponse, 0, 1);
      if (response <= 0.02) return;
      this.cardDropLagUntil = Math.max(this.cardDropLagUntil, now + lerp(95, 165, response));
      this.cardDropLagStrength = Math.max(this.cardDropLagStrength * 0.55, response);
      const localLift = Math.min(this.cardDy * lerp(0.58, 1.05, response), this.height * 0.68);
      if (localLift <= 0.01) return;
      const localVelocityLift = Math.min(downSpeed * lerp(0.045, 0.105, response), 380);
      for (const badge of this.badges) {
        if (badge.escaped) continue;
        const bounds = this.boundsFor(badge);
        const headroom = bounds.maxY - badge.y - 1.25;
        const lift = Math.min(localLift, Math.max(0, headroom));
        if (lift <= 0) continue;
        badge.y += lift;
        badge.vy = clamp(badge.vy + localVelocityLift * clamp(lift / localLift, 0, 1), -1500, 760);
        badge.sleeping = false;
      }
    }

    cardDropLagHold(now) {
      if (now >= this.cardDropLagUntil) {
        this.cardDropLagStrength *= 0.65;
        return 0;
      }
      return this.cardDropLagStrength * clamp((this.cardDropLagUntil - now) / 150, 0, 1);
    }

    updateViolentShake(dt, cardSpeed, now = performance.now()) {
      const hasDocked = this.badges.some((badge) => !badge.escaped);
      if (!this.cardMotionActivated || !this.card.__worldDragging || !hasDocked || this.badgeDrag) {
        this.violentShakeEnergy = Math.max(0, this.violentShakeEnergy - dt * 0.72);
        return;
      }
      const acceleration = Math.hypot(this.cardAx, this.cardAy);
      const speedScore = clamp((cardSpeed - 760) / 720, 0, 1);
      const accelerationScore = clamp((acceleration - 5400) / 3600, 0, 1);
      const shakeScore = Math.max(accelerationScore, speedScore * 0.45);
      if (shakeScore > 0.08) {
        this.violentShakeEnergy += dt * shakeScore;
      } else {
        this.violentShakeEnergy = Math.max(0, this.violentShakeEnergy - dt * 0.9);
      }
      if (this.violentShakeEnergy >= this.violentShakeReleaseEnergy) {
        const released = this.releaseAllBadges(680);
        if (released > 0) this.lastMotionAt = now;
      }
    }

    stepBadgePhysics(dt, cardSpeed, settling, now = performance.now()) {
      const frameScale = dt * 60;
      const motionGain = clamp(cardSpeed / 720, 0, 1.45);
      const accelerationGain = clamp(Math.hypot(this.cardAx, this.cardAy) / 7600, 0, 1.35);
      const dropLagHold = this.cardDropLagHold(now);
      const badgeDragging = !!this.badgeDrag?.active;
      const activeMotion = this.card.__worldDragging || !settling;
      const released = !this.card.__worldDragging && !badgeDragging;
      const heavySettle = settling || released;
      const gravity = this.card.__worldDragging || badgeDragging ? 390 : settling ? 500 : 760;
      for (const badge of this.badges) {
        const dragged = this.badgeDrag?.active && this.badgeDrag.badge === badge;
        if (activeMotion) {
          const gain = 0.012 + motionGain * 0.012 + accelerationGain * 0.007;
          const dropFollowScale = this.cardDy > 0 ? clamp(1 - dropLagHold * 0.76, 0.24, 1) : 1;
          this.applyGestureImpulse(badge, gain * dropFollowScale, motionGain + accelerationGain, frameScale);
        }

        if (!badge.sleeping) {
          badge.vy -= (dragged ? 120 : gravity) * dt;
        }
        if (dragged) this.applyBadgeDragForce(badge, dt, frameScale);

        const bounds = this.boundsFor(badge);
        const grounded = badge.y <= bounds.minY + 4;
        const throwBoostActive = now < (badge.throwBoostUntil || -Infinity);
        let linearBase = clamp(badge.linearDrag - (heavySettle && !throwBoostActive ? 0.045 : 0), 0.82, 0.985);
        if (badge.escaped && !dragged && !grounded) {
          linearBase = Math.max(linearBase, throwBoostActive ? 0.997 : 0.99);
        }
        const verticalBase = !dragged && !grounded ? (throwBoostActive ? 0.999 : 0.997) : linearBase;
        const angularBase = clamp(badge.angularDrag - (heavySettle && !throwBoostActive ? 0.035 : 0), 0.82, 0.965);
        badge.vx *= Math.pow(linearBase, frameScale);
        badge.vy *= Math.pow(verticalBase, frameScale);
        badge.rvx *= Math.pow(angularBase, frameScale);
        badge.rvy *= Math.pow(angularBase, frameScale);
        badge.rvz *= Math.pow(angularBase, frameScale);

        if (!badge.sleeping) {
          badge.x += badge.vx * dt;
          badge.y += badge.vy * dt;
          badge.rx += badge.rvx * dt;
          badge.ry += badge.rvy * dt;
          badge.rz += badge.rvz * dt;
        }
        this.resolveBounds(badge, heavySettle);
      }

      this.resolveBadgeCollisions(heavySettle, frameScale);
      for (const badge of this.badges) {
        this.resolveBounds(badge, heavySettle);
        const dragged = this.badgeDrag?.active && this.badgeDrag.badge === badge;
        const speed = Math.hypot(badge.vx, badge.vy);
        const spin = Math.abs(badge.rvx) + Math.abs(badge.rvy) + Math.abs(badge.rvz);
        const bounds = this.boundsFor(badge);
        const onFloor = badge.y <= bounds.minY + 1.5;
        const supportRatio = onFloor ? 1 : this.badgeSupportRatio(badge);
        const stableSupport = onFloor || supportRatio > 0.56;
        const throwBoostActive = now < (badge.throwBoostUntil || -Infinity);
        if (dragged) {
          badge.sleeping = false;
        } else if (heavySettle && !throwBoostActive && stableSupport && speed < 14 && spin < 0.24) {
          badge.vx = 0;
          badge.vy = 0;
          badge.rvx = 0;
          badge.rvy = 0;
          badge.rvz = 0;
          badge.sleeping = true;
        } else if (activeMotion || speed > 4 || !onFloor) {
          badge.sleeping = false;
        }
        this.applyBadgeTransform(badge);
      }
    }

    applyGestureImpulse(badge, gain, energy, frameScale = 1) {
      const variance = 0.72 + hash01(badge.seed, Math.floor(energy * 1000), 733) * 0.56;
      const response = badge.grip * badge.invMass * variance * frameScale;
      const ax = clamp(this.cardAx, -9000, 9000);
      const ay = clamp(this.cardAy, -9000, 9000);
      const impulseX = (-this.cardVx * gain - ax * gain * 0.014) * response;
      const impulseY = (-this.cardVy * gain - ay * gain * 0.014) * response;
      const swirl = (hash01(Math.round(badge.x * 3), Math.round(badge.y * 3), badge.seed) - 0.5) * energy * 9 * frameScale;
      badge.vx += clamp(impulseX - this.cardVy * 0.0035 * response + swirl, -96, 96);
      badge.vy += clamp(impulseY + this.cardVx * 0.0028 * response - swirl * 0.45, -96, 96);
      badge.rvx += clamp((impulseY * 0.0045 + this.cardVy * 0.00035 * response) * badge.grip, -0.5, 0.5);
      badge.rvy += clamp((-impulseX * 0.0048 - this.cardVx * 0.00036 * response) * badge.grip, -0.52, 0.52);
      badge.rvz += clamp((impulseX - impulseY) * 0.0032 + swirl * 0.018, -0.46, 0.46);
      badge.sleeping = false;
    }

    applyBadgeDragForce(badge, dt, frameScale = 1) {
      const drag = this.badgeDrag;
      if (!drag || drag.badge !== badge) return;
      const dx = drag.targetX - badge.x;
      const dy = drag.targetY - badge.y;
      const targetSpeed = Math.hypot(drag.velocityX, drag.velocityY);
      const dragLimit = badge.escaped ? 2300 : 1550;
      const bodyLimit = badge.escaped ? 2200 : 1500;
      const desiredVx = clamp(dx / Math.max(0.001, dt) * 0.58 + drag.velocityX * 0.42, -dragLimit, dragLimit);
      const desiredVy = clamp(dy / Math.max(0.001, dt) * 0.58 + drag.velocityY * 0.42, -dragLimit, dragLimit);
      const follow = clamp((targetSpeed > 760 ? 0.66 : 0.52) * frameScale, 0.22, 0.76);
      badge.vx = lerp(badge.vx, desiredVx, follow);
      badge.vy = lerp(badge.vy, desiredVy, follow);
      badge.vx = clamp(badge.vx, -bodyLimit, bodyLimit);
      badge.vy = clamp(badge.vy, -bodyLimit, bodyLimit);
      badge.rvx += clamp((-dy * 0.002 + drag.velocityY * 0.00024) * frameScale, -0.18, 0.18);
      badge.rvy += clamp((dx * 0.002 - drag.velocityX * 0.00024) * frameScale, -0.18, 0.18);
      badge.rvz += clamp((drag.velocityX - drag.velocityY) * 0.00045 * frameScale, -0.24, 0.24);
      badge.sleeping = false;
    }

    recordDragVelocitySample(drag, vx, vy, now = performance.now(), x = null, y = null) {
      if (!drag || !Number.isFinite(vx) || !Number.isFinite(vy)) return;
      const speed = Math.hypot(vx, vy);
      if (speed < 4) return;
      if (!drag.velocitySamples) drag.velocitySamples = [];
      drag.velocitySamples.push({
        vx,
        vy,
        at: now,
        escaped: !!drag.badge?.escaped,
        x: Number.isFinite(x) ? x : null,
        y: Number.isFinite(y) ? y : null
      });
      const cutoff = now - 220;
      drag.velocitySamples = drag.velocitySamples.filter((sample, index, samples) => (
        sample.at >= cutoff || index >= samples.length - 4
      ));
      if (drag.velocitySamples.length > 10) {
        drag.velocitySamples.splice(0, drag.velocitySamples.length - 10);
      }
    }

    sampledDragVelocity(drag, now = performance.now(), escapedOnly = false, maxAge = 170) {
      const samples = (drag?.velocitySamples || []).filter((sample) => (
        now - sample.at <= maxAge && (!escapedOnly || sample.escaped)
      ));
      if (!samples.length) return { vx: 0, vy: 0, speed: 0, count: 0, age: Infinity, netVx: 0, netVy: 0, netSpeed: 0, travel: 0, duration: 0 };
      let total = 0;
      let vx = 0;
      let vy = 0;
      samples.forEach((sample, index) => {
        const ageWeight = clamp(1 - (now - sample.at) / maxAge, 0.24, 1);
        const orderWeight = 1 + index * 0.18;
        const weight = ageWeight * orderWeight;
        vx += sample.vx * weight;
        vy += sample.vy * weight;
        total += weight;
      });
      vx /= Math.max(0.001, total);
      vy /= Math.max(0.001, total);
      const positioned = samples.filter((sample) => Number.isFinite(sample.x) && Number.isFinite(sample.y));
      let netVx = 0;
      let netVy = 0;
      let travel = 0;
      let duration = 0;
      if (positioned.length >= 2) {
        const first = positioned[0];
        const last = positioned[positioned.length - 1];
        duration = Math.max(0.001, (last.at - first.at) / 1000);
        travel = Math.hypot(last.x - first.x, last.y - first.y);
        netVx = clamp((last.x - first.x) / duration, -2600, 2600);
        netVy = clamp((last.y - first.y) / duration, -2600, 2600);
      }
      return {
        vx,
        vy,
        speed: Math.hypot(vx, vy),
        count: samples.length,
        age: now - samples[samples.length - 1].at,
        netVx,
        netVy,
        netSpeed: Math.hypot(netVx, netVy),
        travel,
        duration
      };
    }

    releaseDragVelocity(drag, now = performance.now()) {
      const escaped = this.sampledDragVelocity(drag, now, true, 210);
      const recent = escaped.count ? escaped : this.sampledDragVelocity(drag, now, false, 210);
      let releaseVx = recent.count ? recent.vx : (drag.pointerVelocityX || drag.velocityX || 0);
      let releaseVy = recent.count ? recent.vy : (drag.pointerVelocityY || drag.velocityY || 0);
      if (recent.netSpeed > 80 && recent.travel > 9) {
        const netDot = releaseVx * recent.netVx + releaseVy * recent.netVy;
        if (netDot < 0) {
          releaseVx = recent.netVx;
          releaseVy = recent.netVy;
        } else {
          releaseVx = lerp(releaseVx, recent.netVx, 0.42);
          releaseVy = lerp(releaseVy, recent.netVy, 0.42);
        }
      }
      let releaseSpeed = Math.hypot(releaseVx, releaseVy);
      const preVx = drag.preEscapeVelocityX || 0;
      const preVy = drag.preEscapeVelocityY || 0;
      const preSpeed = Math.hypot(preVx, preVy);
      const postEscapeTravel = escaped.travel || 0;

      if (!escaped.count && releaseSpeed < 120 && preSpeed > 120) {
        releaseVx = preVx;
        releaseVy = preVy;
        releaseSpeed = preSpeed;
      } else if (escaped.count && postEscapeTravel < 26 && preSpeed > 120) {
        const preDot = preVx * releaseVx + preVy * releaseVy;
        if (preDot < 0 || releaseSpeed < preSpeed * 0.55) {
          releaseVx = preVx;
          releaseVy = preVy;
          releaseSpeed = preSpeed;
        }
      } else if (releaseSpeed > 30 && preSpeed > releaseSpeed) {
        const dot = preVx * releaseVx + preVy * releaseVy;
        if (dot > 0) {
          const dirX = releaseVx / releaseSpeed;
          const dirY = releaseVy / releaseSpeed;
          const alignedSpeed = dot / releaseSpeed;
          const boostedSpeed = Math.max(releaseSpeed, Math.min(preSpeed, releaseSpeed * 0.55 + alignedSpeed * 0.45));
          releaseVx = dirX * boostedSpeed;
          releaseVy = dirY * boostedSpeed;
        }
      }

      const normalX = drag.escapeNormalX || 0;
      const normalY = drag.escapeNormalY || 0;
      if (preSpeed > 80 && postEscapeTravel < 24 && (normalX || normalY)) {
        const preOutward = preVx * normalX + preVy * normalY;
        const releaseOutward = releaseVx * normalX + releaseVy * normalY;
        if (preOutward > 80 && releaseOutward < 0) {
          releaseVx -= normalX * releaseOutward;
          releaseVy -= normalY * releaseOutward;
          const restored = Math.min(preOutward, 900);
          releaseVx += normalX * restored;
          releaseVy += normalY * restored;
        }
      }

      const stretchX = (drag.targetX ?? drag.lastTargetX ?? 0) - (drag.badge?.x ?? 0);
      const stretchY = (drag.targetY ?? drag.lastTargetY ?? 0) - (drag.badge?.y ?? 0);
      const stretch = Math.hypot(stretchX, stretchY);
      if (drag.badge?.escaped && stretch > 7) {
        releaseSpeed = Math.hypot(releaseVx, releaseVy);
        const sx = stretchX / stretch;
        const sy = stretchY / stretch;
        const stretchDot = releaseSpeed > 0 ? (releaseVx * sx + releaseVy * sy) / releaseSpeed : 1;
        if (stretchDot > -0.22) {
          const stretchBoost = Math.min(860, (stretch - 7) * 8.5);
          releaseVx += sx * stretchBoost;
          releaseVy += sy * stretchBoost;
        }
      }

      if (drag.badge?.escaped) {
        const limited = this.limitReleaseVelocityForRunway(drag.badge, releaseVx, releaseVy);
        releaseVx = limited.vx;
        releaseVy = limited.vy;
      }

      return {
        vx: clamp(releaseVx, -2400, 2400),
        vy: clamp(releaseVy, -2400, 2400)
      };
    }

    limitReleaseVelocityForRunway(badge, vx, vy) {
      const bounds = this.boundsFor(badge);
      const margin = Math.max(badge.width, badge.height) * 1.15;
      const minFlightTime = 0.48;
      const floorSpeed = 320;
      let nextVx = vx;
      let nextVy = vy;
      if (vx > 0) {
        const runway = Math.max(0, bounds.maxX - badge.x - margin);
        nextVx = Math.min(vx, Math.max(floorSpeed, runway / minFlightTime));
      } else if (vx < 0) {
        const runway = Math.max(0, badge.x - bounds.minX - margin);
        nextVx = Math.max(vx, -Math.max(floorSpeed, runway / minFlightTime));
      }
      if (vy > 0) {
        const runway = Math.max(0, bounds.maxY - badge.y - margin);
        nextVy = Math.min(vy, Math.max(floorSpeed, runway / minFlightTime));
      } else if (vy < 0) {
        const runway = Math.max(0, badge.y - bounds.minY - margin);
        nextVy = Math.max(vy, -Math.max(floorSpeed, runway / minFlightTime));
      }
      return { vx: nextVx, vy: nextVy };
    }

    isBadgeSupported(badge) {
      return this.badgeSupportRatio(badge) > 0;
    }

    badgeSupportRatio(badge) {
      let strongestSupport = 0;
      for (const other of this.badges) {
        if (other === badge) continue;
        if (!!other.escaped !== !!badge.escaped) continue;
        const verticalGap = badge.y - other.y;
        if (verticalGap <= 0 || verticalGap > (badge.height + other.height) * 0.62) continue;
        const horizontalOverlap = (badge.width + other.width) * 0.44 - Math.abs(badge.x - other.x);
        if (horizontalOverlap > 0) {
          strongestSupport = Math.max(strongestSupport, clamp(horizontalOverlap / Math.max(1, badge.width * 0.82), 0, 1));
        }
      }
      return strongestSupport;
    }

    renderStatic(now) {
      this.renderBadgeLayers();
      this.staticFrameRendered = true;
      this.needsStaticRender = false;
    }

    updateCardVelocity(dt) {
      const x = Number(this.card.dataset.worldX);
      const y = Number(this.card.dataset.worldY);
      const rect = this.card.getBoundingClientRect();
      const worldX = Number.isFinite(x) ? x : rect.left + (window.scrollX || 0);
      const worldY = Number.isFinite(y) ? y : rect.top + readScrollY();
      if (this.lastCardX == null || this.lastCardY == null) {
        this.lastCardX = worldX;
        this.lastCardY = worldY;
        this.cardDx = 0;
        this.cardDy = 0;
        this.rawCardVx = 0;
        this.rawCardVy = 0;
        this.cardVx = 0;
        this.cardVy = 0;
        this.cardAx = 0;
        this.cardAy = 0;
        return;
      }
      this.cardDx = worldX - this.lastCardX;
      this.cardDy = worldY - this.lastCardY;
      const nextRawVx = this.cardDx / dt;
      const nextRawVy = this.cardDy / dt;
      this.cardAx = clamp((nextRawVx - this.rawCardVx) / dt, -9000, 9000);
      this.cardAy = clamp((nextRawVy - this.rawCardVy) / dt, -9000, 9000);
      this.rawCardVx = nextRawVx;
      this.rawCardVy = nextRawVy;
      const follow = clamp(dt * 16, 0.12, 0.78);
      this.cardVx = lerp(this.cardVx, nextRawVx, follow);
      this.cardVy = lerp(this.cardVy, nextRawVy, follow);
      this.lastCardX = worldX;
      this.lastCardY = worldY;
    }

    resetCardMotionSample() {
      if (!this.card) return;
      const x = Number(this.card.dataset.worldX);
      const y = Number(this.card.dataset.worldY);
      const rect = this.card.getBoundingClientRect();
      this.lastCardX = Number.isFinite(x) ? x : rect.left + (window.scrollX || 0);
      this.lastCardY = Number.isFinite(y) ? y : rect.top + readScrollY();
      this.cardDx = 0;
      this.cardDy = 0;
      this.rawCardVx = 0;
      this.rawCardVy = 0;
      this.cardVx = 0;
      this.cardVy = 0;
      this.cardAx = 0;
      this.cardAy = 0;
    }

    resolveBadgeCollisions(settling, frameScale) {
      const iterations = settling ? 5 : 4;
      const slop = settling ? 0.9 : 1.8;
      const correctionDamping = settling ? 0.82 : 0.94;
      const spinScale = clamp(frameScale || 1, 0.5, 1.5);
      for (let pass = 0; pass < iterations; pass++) {
        for (let i = 0; i < this.badges.length; i++) {
          const a = this.badges[i];
          for (let j = i + 1; j < this.badges.length; j++) {
            const b = this.badges[j];
            if (!!a.escaped !== !!b.escaped) continue;
            let dx = a.x - b.x;
            let dy = a.y - b.y;
            if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
              const angle = hash01(a.seed, b.seed, pass + 41) * Math.PI * 2;
              dx = Math.cos(angle) * 0.01;
              dy = Math.sin(angle) * 0.01;
            }

            const minX = (a.width + b.width) * 0.5 + slop;
            const minY = (a.height + b.height) * 0.5 + slop;
            const overlapX = minX - Math.abs(dx);
            const overlapY = minY - Math.abs(dy);
            if (overlapX <= 0 || overlapY <= 0) continue;

            const resolveOnX = overlapX < overlapY;
            const nx = resolveOnX ? (dx < 0 ? -1 : 1) : 0;
            const ny = resolveOnX ? 0 : (dy < 0 ? -1 : 1);
            const overlap = resolveOnX ? overlapX : overlapY;
            const totalInvMass = (a.invMass || 1) + (b.invMass || 1);
            const correction = (overlap * correctionDamping) / Math.max(0.001, totalInvMass);
            a.x += nx * correction * (a.invMass || 1);
            a.y += ny * correction * (a.invMass || 1);
            b.x -= nx * correction * (b.invMass || 1);
            b.y -= ny * correction * (b.invMass || 1);

            const relativeVelocity = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
            const tangentX = -ny;
            const tangentY = nx;
            const tangentVelocity = (a.vx - b.vx) * tangentX + (a.vy - b.vy) * tangentY;
            const mixedFriction = Math.sqrt((a.surfaceFriction || 0.4) * (b.surfaceFriction || 0.4));
            if (relativeVelocity < 0) {
              const impact = Math.abs(relativeVelocity);
              const escapedImpact = a.escaped && b.escaped;
              const restitution = settling || impact < 26 ? 0.015 : Math.max(escapedImpact ? 0.24 : 0, a.restitution || 0.08, b.restitution || 0.08);
              const impulse = (-(1 + restitution) * relativeVelocity) / Math.max(0.001, totalInvMass);
              const invA = a.invMass || 1;
              const invB = b.invMass || 1;
              a.vx += nx * impulse * invA;
              a.vy += ny * impulse * invA;
              b.vx -= nx * impulse * invB;
              b.vy -= ny * impulse * invB;

              const maxFriction = Math.abs(impulse) * mixedFriction;
              const frictionImpulse = clamp(-tangentVelocity / Math.max(0.001, totalInvMass), -maxFriction, maxFriction);
              a.vx += tangentX * frictionImpulse * invA;
              a.vy += tangentY * frictionImpulse * invA;
              b.vx -= tangentX * frictionImpulse * invB;
              b.vy -= tangentY * frictionImpulse * invB;

              const spin = clamp((impact / 180 + overlap / Math.max(1, minX + minY)) * 0.22 * spinScale, 0.006, settling ? 0.08 : 0.18);
              a.rvz += (nx || -ny) * spin * invA;
              b.rvz -= (nx || -ny) * spin * invB;
              a.rvx += ny * spin * 0.55 * invA;
              b.rvx -= ny * spin * 0.55 * invB;
            } else if (!settling) {
              const spin = clamp((overlap / Math.max(1, minX + minY)) * 0.12 * spinScale, 0.004, 0.06);
              a.rvz += (nx || -ny) * spin * (a.invMass || 1);
              b.rvz -= (nx || -ny) * spin * (b.invMass || 1);
            }

            if (settling && !resolveOnX) {
              const top = a.y > b.y ? a : b;
              const bottom = top === a ? b : a;
              const offset = top.x - bottom.x;
              const direction = Math.abs(offset) > 0.8 ? Math.sign(offset) : (hash01(top.seed, bottom.seed, pass + 97) > 0.5 ? 1 : -1);
              const offCenter = clamp(Math.abs(offset) / Math.max(1, minX * 0.48), 0, 1);
              if (offCenter > 0.08) {
                const slip = offCenter * clamp(1 - mixedFriction * 0.55, 0.38, 0.9) * 0.68 * spinScale;
                top.vx += direction * slip * (top.invMass || 1);
                bottom.vx -= direction * slip * 0.22 * (bottom.invMass || 1);
                top.rvz -= direction * slip * 0.028;
                top.rvy += direction * slip * 0.015;
                top.sleeping = false;
                bottom.sleeping = false;
              }
            }

            const energeticContact = Math.abs(relativeVelocity) > 2 || Math.abs(tangentVelocity) > 2;
            if (!settling || energeticContact || overlap > 2.2) {
              a.sleeping = false;
              b.sleeping = false;
            }
          }
        }
      }
    }

    resolveBounds(badge, settling = false) {
      const bounds = this.boundsFor(badge);
      const bounce = settling ? Math.min(0.18, badge.restitution || 0.1) : 0.34 + (badge.restitution || 0.1) * 0.45;
      const wallFriction = clamp(1 - (badge.surfaceFriction || 0.4) * (settling ? 0.82 : 0.38), 0.45, 0.92);
      if (badge.x < bounds.minX) {
        badge.x = bounds.minX;
        badge.vx = Math.abs(badge.vx) < 8 && settling ? 0 : Math.abs(badge.vx) * bounce;
        badge.vy *= wallFriction;
        badge.rvz += 0.12 * (badge.invMass || 1);
        badge.sleeping = false;
      } else if (badge.x > bounds.maxX) {
        badge.x = bounds.maxX;
        badge.vx = Math.abs(badge.vx) < 8 && settling ? 0 : -Math.abs(badge.vx) * bounce;
        badge.vy *= wallFriction;
        badge.rvz -= 0.12 * (badge.invMass || 1);
        badge.sleeping = false;
      }
      if (badge.y < bounds.minY) {
        badge.y = bounds.minY;
        badge.vy = Math.abs(badge.vy) < (settling ? 16 : 7) ? 0 : Math.abs(badge.vy) * bounce;
        badge.vx *= clamp(1 - (badge.surfaceFriction || 0.4) * (settling ? 1.05 : 0.5), 0.32, 0.88);
        badge.rvx *= 0.78;
        badge.rvy *= 0.78;
      } else if (badge.y > bounds.maxY) {
        badge.y = bounds.maxY;
        badge.vy = Math.abs(badge.vy) < 8 && settling ? 0 : -Math.abs(badge.vy) * bounce;
        badge.vx *= wallFriction;
        badge.sleeping = false;
      }
    }

    applyBadgeTransform(badge) {
      if (badge.escaped) {
        const scrollX = window.scrollX || 0;
        const scrollY = readScrollY();
        const width = this.playgroundWidth || window.innerWidth || this.width;
        const height = this.playgroundHeight || window.innerHeight || this.height;
        badge.group.position.set(
          badge.x - scrollX - width / 2,
          badge.y + scrollY + height / 2,
          badge.tz + (badge.dragging ? 18 : 0)
        );
      } else {
        badge.group.position.set(badge.x, badge.y, badge.tz + (badge.dragging ? 18 : 0));
      }
      badge.group.rotation.set(badge.rx, badge.ry, badge.rz);
    }

    pointFromEvent(event, space = 'card') {
      if (space === 'playground') {
        const scrollX = window.scrollX || 0;
        const scrollY = readScrollY();
        return {
          localX: event.clientX,
          localY: event.clientY,
          x: event.clientX + scrollX,
          y: -(event.clientY + scrollY)
        };
      }
      const rect = this.canvas.getBoundingClientRect();
      const localX = event.clientX - rect.left;
      const localY = event.clientY - rect.top;
      return {
        localX,
        localY,
        x: localX - this.width / 2,
        y: this.height / 2 - localY
      };
    }

    cameraForSpace(space = 'card') {
      return space === 'playground' ? this.playgroundCamera : this.camera;
    }

    hitBadgeAtEvent(event, space = 'card') {
      const camera = this.cameraForSpace(space);
      if (!this.ready || !this.raycaster || !camera || !this.canvas) return null;
      const point = this.pointFromEvent(event, space);
      const width = space === 'playground' ? (this.playgroundWidth || window.innerWidth || this.width) : this.width;
      const height = space === 'playground' ? (this.playgroundHeight || window.innerHeight || this.height) : this.height;
      this.pointer.x = (point.localX / Math.max(1, width)) * 2 - 1;
      this.pointer.y = -(point.localY / Math.max(1, height)) * 2 + 1;
      this.raycaster.setFromCamera(this.pointer, camera);
      const escaped = space === 'playground';
      const hitMeshes = this.hitMeshes.filter((mesh) => !!mesh.userData?.badge?.escaped === escaped);
      const hit = this.raycaster.intersectObjects(hitMeshes, false)[0];
      return hit?.object?.userData?.badge || null;
    }

    escapeDistance(rawX, rawY, bounds) {
      return this.escapeVector(rawX, rawY, bounds).distance;
    }

    escapeVector(rawX, rawY, bounds) {
      const escapes = [
        { distance: bounds.minX - rawX, x: -1, y: 0 },
        { distance: rawX - bounds.maxX, x: 1, y: 0 },
        { distance: bounds.minY - rawY, x: 0, y: -1 },
        { distance: rawY - bounds.maxY, x: 0, y: 1 },
        { distance: 0, x: 0, y: 0 }
      ];
      return escapes.reduce((best, current) => current.distance > best.distance ? current : best);
    }

    captureEscapeState(drag, rawX, rawY, bounds, now = performance.now()) {
      const escape = this.escapeVector(rawX, rawY, bounds);
      drag.escapeNormalX = escape.x;
      drag.escapeNormalY = escape.y;
      drag.escapeDistance = escape.distance;
      drag.escapeAt = now;
      drag.preEscapeVelocityX = drag.pointerVelocityX;
      drag.preEscapeVelocityY = drag.pointerVelocityY;
      return escape;
    }

    escapeBadge(badge, scatterIndex = 0, scatterStrength = 0) {
      if (!badge || badge.escaped || !this.ensurePlaygroundRenderer()) return false;
      const rect = this.canvas.getBoundingClientRect();
      const scrollX = window.scrollX || 0;
      const scrollY = readScrollY();
      const pageX = rect.left + scrollX + this.width / 2 + badge.x;
      const pageY = rect.top + scrollY + this.height / 2 - badge.y;
      badge.x = pageX;
      badge.y = -pageY;
      badge.tx = badge.x;
      badge.ty = badge.y;
      badge.escaped = true;
      badge.sleeping = false;
      if (scatterStrength > 0) {
        const angle = hash01(badge.seed, scatterIndex + 19, 901) * Math.PI * 2;
        const speed = scatterStrength * (0.72 + hash01(scatterIndex + 3, badge.seed, 811) * 0.55);
        badge.vx += clamp(-this.cardVx * 0.32 + Math.cos(angle) * speed, -1400, 1400);
        badge.vy += clamp(-Math.abs(this.cardVy) * 0.18 + Math.sin(angle) * speed * 0.72 - speed * 0.24, -1200, 900);
        badge.rvx += clamp(Math.sin(angle) * 0.72, -0.9, 0.9);
        badge.rvy += clamp(Math.cos(angle) * 0.72, -0.9, 0.9);
        badge.rvz += clamp((hash01(scatterIndex, badge.seed, 613) - 0.5) * 1.8, -1.2, 1.2);
      }
      this.syncPlaygroundState();
      this.resize(true);
      this.applyBadgeTransform(badge);
      this.lastMotionAt = performance.now();
      return true;
    }

    enterPlayground(event, drag = null) {
      if (!drag?.badge || !this.escapeBadge(drag.badge)) return false;
      if (drag) {
        const point = this.pointFromEvent(event, 'playground');
        const throwVx = clamp(drag.preEscapeVelocityX || drag.pointerVelocityX || drag.velocityX || 0, -2400, 2400);
        const throwVy = clamp(drag.preEscapeVelocityY || drag.pointerVelocityY || drag.velocityY || 0, -2400, 2400);
        const bounds = this.boundsFor(drag.badge);
        const targetX = clamp(point.x + drag.offsetX, bounds.minX, bounds.maxX);
        const targetY = clamp(point.y + drag.offsetY, bounds.minY, bounds.maxY);
        drag.badge.x = targetX;
        drag.badge.y = targetY;
        drag.badge.tx = targetX;
        drag.badge.ty = targetY;
        drag.startTargetX = targetX;
        drag.startTargetY = targetY;
        drag.lastTargetX = targetX;
        drag.lastTargetY = targetY;
        drag.lastRawTargetX = targetX;
        drag.lastRawTargetY = targetY;
        drag.targetX = targetX;
        drag.targetY = targetY;
        drag.velocityX = lerp(drag.velocityX, throwVx, 0.72);
        drag.velocityY = lerp(drag.velocityY, throwVy, 0.72);
        drag.pointerVelocityX = throwVx;
        drag.pointerVelocityY = throwVy;
        this.applyBadgeTransform(drag.badge);
      }
      return true;
    }

    releaseAllBadges(scatterStrength = 620) {
      let released = 0;
      this.badges.forEach((badge, index) => {
        if (this.escapeBadge(badge, index, scatterStrength)) released++;
      });
      if (released > 0) {
        this.violentShakeEnergy = 0;
        this.lastMotionAt = performance.now();
      }
      return released;
    }

    returnToDock() {
      if (this.mode !== 'playground') return;
      this.cancelBadgeDrag();
      this.badges.forEach((badge) => {
        badge.escaped = false;
        badge.throwBoostUntil = -Infinity;
      });
      this.mode = 'card';
      this.violentShakeEnergy = 0;
      this.card?.classList.remove('is-skills-playground');
      this.playgroundCanvas?.classList.remove('is-visible');
      this.updateResetButtonState();
      this.hideTooltip();
      this.moveTooltipToSpace('card');
      this.resize(true);
      this.updatePileTargets(true);
      this.requestStaticRender();
      this.lastMotionAt = performance.now();
    }

    handleResetButtonClick(event) {
      event.preventDefault();
      event.stopPropagation();
      this.returnToDock();
    }

    handlePointerDown(event, space = 'card') {
      if (!this.ready || !this.canvas || this.badgeDrag) return;
      if (event.button != null && event.button !== 0) return;
      const badge = this.hitBadgeAtEvent(event, space);
      if (!badge) return;
      event.preventDefault();
      event.stopPropagation();
      const now = performance.now();
      const point = this.pointFromEvent(event, space);
      const bounds = this.boundsFor(badge);
      const offsetX = badge.x - point.x;
      const offsetY = badge.y - point.y;
      const targetX = clamp(point.x + offsetX, bounds.minX, bounds.maxX);
      const targetY = clamp(point.y + offsetY, bounds.minY, bounds.maxY);
      this.badgeDrag = {
        badge,
        pointerId: event.pointerId,
        active: false,
        offsetX,
        offsetY,
        startTargetX: targetX,
        startTargetY: targetY,
        targetX,
        targetY,
        lastTargetX: targetX,
        lastTargetY: targetY,
        velocityX: badge.vx,
        velocityY: badge.vy,
        pointerVelocityX: 0,
        pointerVelocityY: 0,
        preEscapeVelocityX: 0,
        preEscapeVelocityY: 0,
        escapeNormalX: 0,
        escapeNormalY: 0,
        escapeDistance: 0,
        escapeAt: -Infinity,
        startRawTargetX: point.x + offsetX,
        startRawTargetY: point.y + offsetY,
        lastRawTargetX: point.x + offsetX,
        lastRawTargetY: point.y + offsetY,
        velocitySamples: [],
        wakePileOnDrag: !this.cardMotionActivated && !badge.escaped,
        lastAt: now,
        space
      };
      this.card.__worldSuppressLinkClickUntil = now + 500;
      this.hideTooltip();
      this.requestStaticRender();
      try {
        if (space === 'card') this.canvas.setPointerCapture(event.pointerId);
      } catch (_) {}
    }

    updateBadgeDragTarget(event) {
      const drag = this.badgeDrag;
      if (!drag || event.pointerId !== drag.pointerId) return false;
      const now = performance.now();
      let point = this.pointFromEvent(event, drag.badge.escaped ? 'playground' : 'card');
      const bounds = this.boundsFor(drag.badge);
      let rawTargetX = point.x + drag.offsetX;
      let rawTargetY = point.y + drag.offsetY;
      const dt = Math.max(0.001, Math.min(0.08, (now - drag.lastAt) / 1000));
      const pointerRawVx = clamp((rawTargetX - drag.lastRawTargetX) / dt, -2600, 2600);
      const pointerRawVy = clamp((rawTargetY - drag.lastRawTargetY) / dt, -2600, 2600);
      const pointerFollow = clamp(dt * 26, 0.24, 0.86);
      drag.pointerVelocityX = lerp(drag.pointerVelocityX, pointerRawVx, pointerFollow);
      drag.pointerVelocityY = lerp(drag.pointerVelocityY, pointerRawVy, pointerFollow);
      this.recordDragVelocitySample(drag, pointerRawVx, pointerRawVy, now, rawTargetX, rawTargetY);
      if (
        !drag.badge.escaped &&
        drag.active &&
        this.cardMotionActivated &&
        this.escapeDistance(rawTargetX, rawTargetY, bounds) > this.playgroundEscapeDistance
      ) {
        this.captureEscapeState(drag, rawTargetX, rawTargetY, bounds, now);
        this.enterPlayground(event, drag);
        drag.space = 'playground';
        point = this.pointFromEvent(event, 'playground');
        rawTargetX = point.x + drag.offsetX;
        rawTargetY = point.y + drag.offsetY;
      }
      let nextBounds = this.boundsFor(drag.badge);
      let targetX = clamp(rawTargetX, nextBounds.minX, nextBounds.maxX);
      let targetY = clamp(rawTargetY, nextBounds.minY, nextBounds.maxY);
      let rawVx = clamp((targetX - drag.lastTargetX) / dt, -1400, 1400);
      let rawVy = clamp((targetY - drag.lastTargetY) / dt, -1400, 1400);
      const travel = Math.hypot(rawTargetX - drag.startRawTargetX, rawTargetY - drag.startRawTargetY);
      if (!drag.active) {
        drag.lastTargetX = targetX;
        drag.lastTargetY = targetY;
        drag.lastRawTargetX = rawTargetX;
        drag.lastRawTargetY = rawTargetY;
        drag.targetX = targetX;
        drag.targetY = targetY;
        drag.lastAt = now;
        drag.velocityX = 0;
        drag.velocityY = 0;
        if (travel < this.badgeDragActivationDistance) return true;
        if (drag.wakePileOnDrag && !drag.badge.escaped) {
          this.cardMotionActivated = true;
          this.activatePile(now, true);
          drag.wakePileOnDrag = false;
        }
        drag.active = true;
        drag.badge.dragging = true;
        drag.badge.sleeping = false;
        drag.velocityX = rawVx;
        drag.velocityY = rawVy;
        this.card?.classList.add('is-badge-dragging');
        if (
          !drag.badge.escaped &&
          this.cardMotionActivated &&
          this.escapeDistance(rawTargetX, rawTargetY, bounds) > this.playgroundEscapeDistance
        ) {
          this.captureEscapeState(drag, rawTargetX, rawTargetY, bounds, now);
          this.enterPlayground(event, drag);
          drag.space = 'playground';
          point = this.pointFromEvent(event, 'playground');
          rawTargetX = point.x + drag.offsetX;
          rawTargetY = point.y + drag.offsetY;
          nextBounds = this.boundsFor(drag.badge);
          targetX = clamp(rawTargetX, nextBounds.minX, nextBounds.maxX);
          targetY = clamp(rawTargetY, nextBounds.minY, nextBounds.maxY);
          rawVx = clamp((targetX - drag.lastTargetX) / dt, -1400, 1400);
          rawVy = clamp((targetY - drag.lastTargetY) / dt, -1400, 1400);
          drag.velocityX = lerp(rawVx, drag.preEscapeVelocityX || rawVx, 0.58);
          drag.velocityY = lerp(rawVy, drag.preEscapeVelocityY || rawVy, 0.58);
        }
      } else {
        const follow = clamp(dt * 18, 0.18, 0.78);
        drag.velocityX = lerp(drag.velocityX, rawVx, follow);
        drag.velocityY = lerp(drag.velocityY, rawVy, follow);
      }
      drag.lastTargetX = targetX;
      drag.lastTargetY = targetY;
      drag.lastRawTargetX = rawTargetX;
      drag.lastRawTargetY = rawTargetY;
      drag.targetX = targetX;
      drag.targetY = targetY;
      drag.lastAt = now;
      drag.badge.sleeping = false;
      return true;
    }

    handlePointerUp(event) {
      const drag = this.badgeDrag;
      if (!drag || event.pointerId !== drag.pointerId) return;
      event.preventDefault();
      event.stopPropagation();
      this.finishBadgeDrag(true);
    }

    cancelBadgeDrag(event) {
      const drag = this.badgeDrag;
      if (!drag || (event && event.pointerId !== drag.pointerId)) return;
      this.finishBadgeDrag(false);
    }

    finishBadgeDrag(throwBadge = true) {
      const drag = this.badgeDrag;
      if (!drag) return;
      const badge = drag.badge;
      const wasActive = !!drag.active;
      if (throwBadge && wasActive) {
        let releaseVx = drag.velocityX;
        let releaseVy = drag.velocityY;
        if (badge.escaped) {
          const release = this.releaseDragVelocity(drag, performance.now());
          releaseVx = release.vx;
          releaseVy = release.vy;
          badge.throwBoostUntil = performance.now() + 260;
        }
        const velocityLimit = badge.escaped ? 2400 : 1320;
        const releaseFollow = badge.escaped ? 0.96 : 0.86;
        badge.vx = clamp(lerp(badge.vx, releaseVx, releaseFollow), -velocityLimit, velocityLimit);
        badge.vy = clamp(lerp(badge.vy, releaseVy, releaseFollow), -velocityLimit, velocityLimit);
        badge.rvz += clamp((releaseVx - releaseVy) * 0.0014, -1.35, 1.35);
        badge.rvx += clamp(releaseVy * 0.0009, -0.9, 0.9);
        badge.rvy -= clamp(releaseVx * 0.0009, -0.9, 0.9);
      }
      badge.dragging = false;
      if (wasActive) badge.sleeping = false;
      this.badgeDrag = null;
      this.card?.classList.remove('is-badge-dragging');
      this.card.__worldSuppressLinkClickUntil = performance.now() + 500;
      try {
        if (this.canvas?.hasPointerCapture?.(drag.pointerId)) this.canvas.releasePointerCapture(drag.pointerId);
      } catch (_) {}
      if (wasActive) this.lastMotionAt = performance.now();
      this.requestStaticRender();
    }

    handlePointerMove(event, space = 'card') {
      const camera = this.cameraForSpace(space);
      if (!this.ready || !this.raycaster || !camera || !this.canvas) return;
      if (this.badgeDrag && event.pointerId === this.badgeDrag.pointerId) {
        event.preventDefault();
        event.stopPropagation();
        this.updateBadgeDragTarget(event);
        this.hideTooltip();
        return;
      }
      const point = this.pointFromEvent(event, space);
      const width = space === 'playground' ? (this.playgroundWidth || window.innerWidth || this.width) : this.width;
      const height = space === 'playground' ? (this.playgroundHeight || window.innerHeight || this.height) : this.height;
      this.pointer.x = (point.localX / Math.max(1, width)) * 2 - 1;
      this.pointer.y = -(point.localY / Math.max(1, height)) * 2 + 1;
      this.raycaster.setFromCamera(this.pointer, camera);
      const escaped = space === 'playground';
      const hitMeshes = this.hitMeshes.filter((mesh) => !!mesh.userData?.badge?.escaped === escaped);
      const hit = this.raycaster.intersectObjects(hitMeshes, false)[0];
      const skill = hit?.object?.userData?.skill;
      if (skill) this.showTooltip(skill, point.localX, point.localY, space);
      else this.hideTooltip();
    }

    handleWindowPointerDown(event) {
      if (event.target?.closest?.('[data-skills-reset]')) return;
      if (this.mode !== 'playground' || !this.ready || this.badgeDrag) return;
      if (event.button != null && event.button !== 0) return;
      if (!this.hitBadgeAtEvent(event, 'playground')) return;
      this.handlePointerDown(event, 'playground');
    }

    handleWindowPointerMove(event) {
      if (event.target === this.canvas) return;
      if (this.mode !== 'playground' && !this.badgeDrag) return;
      this.handlePointerMove(event, this.badgeDrag?.badge?.escaped ? 'playground' : 'card');
    }

    handleWindowPointerUp(event) {
      if (!this.badgeDrag) return;
      this.handlePointerUp(event);
    }

    handleWindowPointerCancel(event) {
      if (!this.badgeDrag) return;
      this.cancelBadgeDrag(event);
    }

    handleDockDoubleClick(event) {
      if (this.mode !== 'playground') return;
      event.preventDefault();
      event.stopPropagation();
      this.returnToDock();
    }

    showTooltip(skill, localX, localY, space = 'card') {
      if (!this.tooltip || !this.canvas) return;
      this.moveTooltipToSpace(space);
      this.tooltip.textContent = skill.name || '';
      this.tooltip.classList.toggle('is-playground-tip', space === 'playground');
      const rect = space === 'playground'
        ? { width: window.innerWidth || this.width, height: window.innerHeight || this.height }
        : this.canvas.getBoundingClientRect();
      const approxW = Math.min(rect.width - 24, Math.max(96, String(skill.name || '').length * 8.2 + 20));
      const x = clamp(localX + 12, 8, Math.max(8, rect.width - approxW - 8));
      const y = clamp(localY + 12, 8, Math.max(8, rect.height - 34));
      this.tooltip.style.setProperty('--tip-x', `${x.toFixed(1)}px`);
      this.tooltip.style.setProperty('--tip-y', `${y.toFixed(1)}px`);
      this.tooltip.classList.add('is-visible');
    }

    moveTooltipToSpace(space = 'card') {
      if (!this.tooltip) return;
      const target = space === 'playground' ? document.body : this.tooltipHome;
      if (!target || this.tooltip.parentNode === target) return;
      if (target === this.tooltipHome && this.tooltipNextSibling?.parentNode === target) {
        target.insertBefore(this.tooltip, this.tooltipNextSibling);
      } else {
        target.appendChild(this.tooltip);
      }
    }

    hideTooltip() {
      this.tooltip?.classList.remove('is-playground-tip');
      this.tooltip?.classList.remove('is-visible');
    }

    destroy() {
      this.destroyed = true;
      this.cancelBadgeDrag();
      this.canvas?.removeEventListener('pointerdown', this.pointerDownHandler);
      this.canvas?.removeEventListener('pointermove', this.pointerMoveHandler);
      this.canvas?.removeEventListener('pointerup', this.pointerUpHandler);
      this.canvas?.removeEventListener('pointercancel', this.pointerCancelHandler);
      this.canvas?.removeEventListener('lostpointercapture', this.pointerCaptureLostHandler);
      this.canvas?.removeEventListener('pointerleave', this.pointerLeaveHandler);
      window.removeEventListener('pointerdown', this.windowPointerDownHandler, { capture: true });
      window.removeEventListener('pointermove', this.windowPointerMoveHandler);
      window.removeEventListener('pointerup', this.windowPointerUpHandler, { capture: true });
      window.removeEventListener('pointercancel', this.windowPointerCancelHandler, { capture: true });
      window.removeEventListener('blur', this.windowBlurHandler);
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
      this.card?.querySelectorAll('[data-drag]').forEach((handle) => {
        handle.removeEventListener('dblclick', this.dockDoubleClickHandler);
      });
      this.resizeObserver?.disconnect();
      this.visibilityObserver?.disconnect();
      this.hideTooltip();
      this.moveTooltipToSpace('card');
      this.card?.classList.remove('is-three-ready');
      this.card?.classList.remove('is-skills-activated');
      this.card?.classList.remove('is-badge-dragging');
      this.card?.classList.remove('is-skills-playground');
      this.card?.classList.remove('is-skills-reset-ready');
      ['pointerdown', 'mousedown', 'dblclick'].forEach((type) => {
        this.resetButton?.removeEventListener(type, this.resetButtonStopHandler);
      });
      this.resetButton?.removeEventListener('click', this.resetButtonClickHandler);
      this.clearBadges();
      this.playgroundRenderer?.dispose();
      this.playgroundCanvas?.remove();
      this.playgroundRenderer = null;
      this.playgroundCanvas = null;
      this.playgroundCamera = null;
      this.renderer?.dispose();
      this.renderer = null;
    }
  }

  class AsciiRasterWorker {
    constructor(canvas, options = {}, onFailure = null) {
      if (typeof Worker !== 'function' || typeof OffscreenCanvas !== 'function') {
        throw new Error('Worker canvas rendering is not supported.');
      }
      this.canvas = canvas;
      this.options = options;
      this.onFailure = onFailure;
      this.failed = false;
      this.ready = false;
      this.sequence = 0;
      this.queuedFrames = 0;
      this.completedFrames = 0;
      this.presentedFrames = 0;
      this.lastWorkerDuration = 0;
      this.lastPresentedSequence = 0;
      this.pool = [];
      this.glyphIds = new Map();
      this.glyphs = [];
      this.onPresented = null;
      this.onBitmap = null;
      this.externalPresentation = options.asciiWorkerExternalPresentation === true;
      this.direct = !this.externalPresentation && options.asciiWorkerDirect !== false && typeof canvas.transferControlToOffscreen === 'function';
      this.presentation = this.direct || this.externalPresentation || options.asciiWorkerPresentation === '2d' ? null : canvas.getContext('bitmaprenderer');
      this.presentation2d = this.direct || this.externalPresentation || this.presentation ? null : canvas.getContext('2d', { alpha: false });
      const workerUrl = new URL(`${options.assetBase || ''}assets/ascii-shader-background/ascii-render-worker.js?v=world-layout-1`, document.baseURI);
      this.worker = new Worker(workerUrl, { name: 'ascii-raster-worker' });
      this.worker.onmessage = (event) => this.handleMessage(event);
      this.worker.onerror = (event) => this.fail(event?.message || 'ASCII raster worker failed.');
      this.worker.onmessageerror = () => this.fail('ASCII raster worker message transfer failed.');
      const workerCanvas = this.direct ? canvas.transferControlToOffscreen() : new OffscreenCanvas(1, 1);
      this.worker.postMessage({
        type: 'init',
        canvas: workerCanvas,
        direct: this.direct,
        width: 1,
        height: 1,
        pixelWidth: 1,
        pixelHeight: 1,
        dpr: 1,
        fontSize: 14,
        reduced: false
      }, [workerCanvas]);
    }
    fail(reason) {
      if (this.failed) return;
      this.failed = true;
      try { this.worker?.terminate(); } catch {}
      this.worker = null;
      this.onFailure?.(String(reason || 'ASCII raster worker failed.'));
    }
    handleMessage(event) {
      const message = event.data || {};
      if (message.type === 'ready') {
        this.ready = true;
        return;
      }
      if (message.type !== 'frame') return;
      this.completedFrames++;
      this.lastWorkerDuration = Number(message.workerDuration) || 0;
      if (this.pool.length < 8 && message.positions && message.visuals && message.glyphIds && message.grays) {
        this.pool.push({
          capacity: new Uint16Array(message.glyphIds).length,
          positions: new Float64Array(message.positions),
          visuals: new Float64Array(message.visuals),
          glyphIds: new Uint16Array(message.glyphIds),
          grays: new Uint8Array(message.grays)
        });
      }
      const bitmap = message.bitmap;
      if(this.direct){
        this.lastPresentedSequence=message.sequence;
        this.presentedFrames++;
        this.onPresented?.(message.sequence);
        return;
      }
      if (!bitmap) return;
      if(this.externalPresentation){
        this.lastPresentedSequence=message.sequence;
        this.onBitmap?.(message);
        return;
      }
      if (message.sequence <= this.lastPresentedSequence) {
        bitmap.close?.();
        return;
      }
      this.lastPresentedSequence = message.sequence;
      if (this.presentation) {
        this.presentation.transferFromImageBitmap(bitmap);
      } else if (this.presentation2d) {
        this.presentation2d.setTransform(1, 0, 0, 1, 0, 0);
        this.presentation2d.drawImage(bitmap, 0, 0);
        bitmap.close?.();
      } else {
        bitmap.close?.();
        this.fail('ASCII raster worker lost its presentation context.');
        return;
      }
      this.presentedFrames++;
      this.onPresented?.(message.sequence);
    }
    resize(width, height, dpr, fontSize, reduced) {
      if (this.failed || !this.worker) return;
      const pixelWidth = Math.max(1, Math.floor(width * dpr));
      const pixelHeight = Math.max(1, Math.floor(height * dpr));
      if(!this.direct){
        this.canvas.width = pixelWidth;
        this.canvas.height = pixelHeight;
      }
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
      this.worker.postMessage({ type: 'resize', width, height, pixelWidth, pixelHeight, dpr, fontSize, reduced });
    }
    acquire(capacity) {
      const minimum = Math.max(1, capacity);
      let bestIndex = -1;
      for (let index = 0; index < this.pool.length; index++) {
        if (this.pool[index].capacity < minimum) continue;
        if (bestIndex < 0 || this.pool[index].capacity < this.pool[bestIndex].capacity) bestIndex = index;
      }
      if (bestIndex >= 0) return this.pool.splice(bestIndex, 1)[0];
      let allocation = 256;
      while (allocation < minimum) allocation *= 2;
      return {
        capacity: allocation,
        positions: new Float64Array(allocation * 4),
        visuals: new Float64Array(allocation * 2),
        glyphIds: new Uint16Array(allocation),
        grays: new Uint8Array(allocation)
      };
    }
    glyphId(char, newGlyphs) {
      let id = this.glyphIds.get(char);
      if (id !== undefined) return id;
      id = this.glyphs.length;
      if (id > 65535) throw new Error('ASCII worker glyph table exceeded Uint16 capacity.');
      this.glyphs.push(char);
      this.glyphIds.set(char, id);
      newGlyphs.push([id, char]);
      return id;
    }
    begin(capacity) {
      const providedStyles=this.options.asciiWorkerProvidedStyles?{fills:[],shadowColors:[],shadowBlurs:[]}:null;
      return { packet: this.acquire(capacity), count: 0, newGlyphs: [], providedStyles };
    }
    push(builder, char, x, y, centerX, sampleY, gray, alpha, active, fillStyle='', shadowColor='', shadowBlur=0) {
      const index = builder.count;
      const packet = builder.packet;
      if (index >= packet.capacity) throw new Error('ASCII worker frame packet capacity was exceeded.');
      const positionOffset = index * 4;
      const visualOffset = index * 2;
      packet.positions[positionOffset] = x;
      packet.positions[positionOffset + 1] = y;
      packet.positions[positionOffset + 2] = centerX;
      packet.positions[positionOffset + 3] = sampleY;
      packet.visuals[visualOffset] = alpha;
      packet.visuals[visualOffset + 1] = active;
      packet.glyphIds[index] = this.glyphId(char, builder.newGlyphs);
      packet.grays[index] = gray;
      if(builder.providedStyles){
        builder.providedStyles.fills[index]=fillStyle;
        builder.providedStyles.shadowColors[index]=shadowColor;
        builder.providedStyles.shadowBlurs[index]=shadowBlur;
      }
      builder.count++;
    }
    commit(builder, frame, sequenceOverride = 0) {
      if (this.failed || !this.worker) return 0;
      const packet = builder.packet;
      const sequence = sequenceOverride || ++this.sequence;
      if(sequence>this.sequence)this.sequence=sequence;
      this.queuedFrames++;
      this.worker.postMessage({
        type: 'frame',
        sequence,
        count: builder.count,
        newGlyphs: builder.newGlyphs,
        providedStyles: builder.providedStyles,
        frame,
        positions: packet.positions.buffer,
        visuals: packet.visuals.buffer,
        glyphIds: packet.glyphIds.buffer,
        grays: packet.grays.buffer
      }, [packet.positions.buffer, packet.visuals.buffer, packet.glyphIds.buffer, packet.grays.buffer]);
      return sequence;
    }
    captureImageData() {
      if (!this.presentation2d) return null;
      try {
        return this.presentation2d.getImageData(0, 0, this.canvas.width, this.canvas.height);
      } catch {
        return null;
      }
    }
    diagnostics() {
      return {
        active: !this.failed,
        ready: this.ready,
        queuedFrames: this.queuedFrames,
        completedFrames: this.completedFrames,
        presentedFrames: this.presentedFrames,
        pendingFrames: Math.max(0, this.queuedFrames - this.completedFrames),
        lastWorkerDuration: Number(this.lastWorkerDuration.toFixed(3)),
        bufferPoolSize: this.pool.length,
        glyphCount: this.glyphs.length
      };
    }
    destroy() {
      try { this.worker?.terminate(); } catch {}
      this.worker = null;
      this.pool.length = 0;
      this.glyphIds.clear();
      this.glyphs.length = 0;
    }
  }

  class AsciiRasterWorkerPool {
    constructor(canvas, options = {}, onFailure = null, workerCount = 2) {
      if (typeof Worker !== 'function' || typeof OffscreenCanvas !== 'function') {
        throw new Error('Worker canvas rendering is not supported.');
      }
      this.canvas = canvas;
      this.options = options;
      this.onFailure = onFailure;
      this.failed = false;
      this.sequence = 0;
      this.completedFrames = 0;
      this.presentedFrames = 0;
      this.nextPresentationSequence = 1;
      this.presentationGeneration = 0;
      this.discardedStaleFrames = 0;
      this.pendingBitmaps = new Map();
      this.presentation = options.asciiWorkerPresentation === '2d' ? null : canvas.getContext('bitmaprenderer');
      this.presentation2d = this.presentation ? null : canvas.getContext('2d', { alpha: false });
      if (!this.presentation && !this.presentation2d) {
        throw new Error('ASCII raster worker pool could not acquire a presentation context.');
      }
      const count = Math.max(2, Math.min(3, Math.floor(Number(workerCount) || 2)));
      this.workers = Array.from({ length: count }, () => {
        const workerCanvas = document.createElement('canvas');
        const worker = new AsciiRasterWorker(
          workerCanvas,
          {
            ...options,
            asciiWorkerDirect: false,
            asciiWorkerExternalPresentation: true
          },
          (reason) => this.fail(reason)
        );
        worker.onBitmap = (message) => this.handleBitmap(message);
        return worker;
      });
    }
    fail(reason) {
      if (this.failed) return;
      this.failed = true;
      for (const worker of this.workers || []) worker.destroy();
      for (const bitmap of this.pendingBitmaps.values()) bitmap?.close?.();
      this.pendingBitmaps.clear();
      this.onFailure?.(String(reason || 'ASCII raster worker pool failed.'));
    }
    chooseWorker() {
      let selected = this.workers[0];
      let selectedPending = Infinity;
      for (const worker of this.workers) {
        const pending = Math.max(0, worker.queuedFrames - worker.completedFrames);
        if (pending >= selectedPending) continue;
        selected = worker;
        selectedPending = pending;
      }
      return selected;
    }
    begin(capacity) {
      const owner = this.chooseWorker();
      const builder = owner.begin(capacity);
      return {
        owner,
        builder,
        providedStyles: builder.providedStyles
      };
    }
    push(wrapper, ...args) {
      wrapper.owner.push(wrapper.builder, ...args);
    }
    commit(wrapper, frame) {
      if (this.failed) return 0;
      const sequence = ++this.sequence;
      return wrapper.owner.commit(
        wrapper.builder,
        { ...frame, presentationGeneration: this.presentationGeneration },
        sequence
      );
    }
    handleBitmap(message) {
      const sequence = Number(message.sequence) || 0;
      const bitmap = message.bitmap;
      this.completedFrames++;
      if (!bitmap) {
        this.fail(`ASCII raster worker did not return bitmap frame ${sequence}.`);
        return;
      }
      if ((Number(message.presentationGeneration) || 0) !== this.presentationGeneration) {
        bitmap.close?.();
        return;
      }
      if (sequence < this.nextPresentationSequence || this.pendingBitmaps.has(sequence)) {
        bitmap.close?.();
        return;
      }
      this.pendingBitmaps.set(sequence, bitmap);
      this.presentAvailableFrames();
    }
    presentAvailableFrames() {
      while (this.pendingBitmaps.has(this.nextPresentationSequence)) {
        const bitmap = this.pendingBitmaps.get(this.nextPresentationSequence);
        this.pendingBitmaps.delete(this.nextPresentationSequence);
        if (this.presentation) {
          this.presentation.transferFromImageBitmap(bitmap);
        } else if (this.presentation2d) {
          this.presentation2d.setTransform(1, 0, 0, 1, 0, 0);
          this.presentation2d.drawImage(bitmap, 0, 0);
          bitmap.close?.();
        } else {
          bitmap.close?.();
          this.fail('ASCII raster worker pool lost its presentation context.');
          return;
        }
        this.presentedFrames++;
        this.nextPresentationSequence++;
      }
    }
    resize(width, height, dpr, fontSize, reduced) {
      if (this.failed) return;
      const invalidatedFrames = Math.max(0, this.sequence - this.nextPresentationSequence + 1);
      this.discardedStaleFrames += invalidatedFrames;
      this.nextPresentationSequence = this.sequence + 1;
      this.presentationGeneration++;
      for (const bitmap of this.pendingBitmaps.values()) bitmap?.close?.();
      this.pendingBitmaps.clear();
      const pixelWidth = Math.max(1, Math.floor(width * dpr));
      const pixelHeight = Math.max(1, Math.floor(height * dpr));
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
      for (const worker of this.workers) worker.resize(width, height, dpr, fontSize, reduced);
    }
    captureImageData() {
      if (!this.presentation2d) return null;
      try {
        return this.presentation2d.getImageData(0, 0, this.canvas.width, this.canvas.height);
      } catch {
        return null;
      }
    }
    diagnostics() {
      const workerDiagnostics = this.workers.map((worker) => worker.diagnostics());
      const pendingByWorker = workerDiagnostics.map((worker) => worker.pendingFrames);
      const durations = workerDiagnostics.map((worker) => worker.lastWorkerDuration);
      return {
        active: !this.failed && workerDiagnostics.every((worker) => worker.active),
        ready: workerDiagnostics.every((worker) => worker.ready),
        workerCount: this.workers.length,
        queuedFrames: this.sequence,
        completedFrames: this.completedFrames,
        presentedFrames: this.presentedFrames,
        discardedStaleFrames: this.discardedStaleFrames,
        pendingFrames: Math.max(0, this.sequence - this.presentedFrames - this.discardedStaleFrames),
        pendingBitmapCount: this.pendingBitmaps.size,
        maxWorkerPending: pendingByWorker.length ? Math.max(...pendingByWorker) : 0,
        lastWorkerDuration: durations.length ? Number(Math.max(...durations).toFixed(3)) : 0,
        workerDurations: durations,
        bufferPoolSize: workerDiagnostics.reduce((total, worker) => total + worker.bufferPoolSize, 0),
        glyphCount: workerDiagnostics.reduce((maximum, worker) => Math.max(maximum, worker.glyphCount), 0)
      };
    }
    destroy() {
      for (const worker of this.workers) worker.destroy();
      for (const bitmap of this.pendingBitmaps.values()) bitmap?.close?.();
      this.pendingBitmaps.clear();
      this.workers.length = 0;
    }
  }

  class AsciiBackground {
    constructor(canvas, shader, music, options = {}) {
      this.canvas = canvas;
      this.shader = shader;
      this.music = music;
      this.options = options;
      this.rendererMode = options.asciiRenderer === 'legacy' ? 'legacy' : options.asciiRenderer === 'compare' ? 'compare' : 'worker';
      this.workerRenderer = null;
      this.workerFailureReason = '';
      this.compareCanvas = null;
      this.comparePending = null;
      this.compareResults = [];
      this.compareFrameCounter = 0;
      this.ctx = null;
      if (this.rendererMode === 'compare') {
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.compareCanvas = document.createElement('canvas');
      }
      if (this.rendererMode === 'worker' || this.rendererMode === 'compare') {
        try {
          const workerCanvas = this.compareCanvas || canvas;
          const workerOptions = this.rendererMode === 'compare'
            ? { ...options, asciiWorkerDirect: false, asciiWorkerPresentation: '2d', asciiWorkerProvidedStyles: true }
            : options;
          const workerCount = this.rendererMode === 'worker'
            ? Math.max(1, Math.min(3, Math.floor(Number(options.asciiWorkerCount) || 1)))
            : 1;
          this.workerRenderer = workerCount > 1
            ? new AsciiRasterWorkerPool(workerCanvas, workerOptions, (reason) => this.enableLegacyRenderer(reason), workerCount)
            : new AsciiRasterWorker(workerCanvas, workerOptions, (reason) => this.enableLegacyRenderer(reason));
          if (this.rendererMode === 'compare') this.workerRenderer.onPresented = (sequence) => this.finishRendererComparison(sequence);
        } catch (error) {
          this.workerFailureReason = String(error?.message || error);
          this.rendererMode = 'legacy';
        }
      }
      if (!this.workerRenderer && !this.ctx) this.ctx = canvas.getContext('2d', { alpha: false });
      canvas.dataset.asciiRenderer = this.workerRenderer ? this.rendererMode : 'legacy';
      this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.mobile = window.matchMedia('(max-width:720px),(pointer:coarse)').matches;
      this.cfg = { fontSize:this.mobile?13:14, cellW:this.mobile?11:12, cellH:this.mobile?17:18, visible:this.reduced?.26:.34, hoverRadius:this.mobile?112:150, hoverDecay:this.reduced?.93:.88, dprCap:this.mobile?1.5:2, maxShapes:5 };
      this.w=0; this.h=0; this.worldH=0; this.scrollY=0; this.dpr=1; this.cols=0; this.rows=0;
      this.cells=[]; this.cellRows=[]; this.shapes=[]; this.clickGridFills=[]; this.musicGridFills=[]; this.musicRipples=[]; this.detailRipples=[]; this.clickRipples=[];
      this.lastBeatSerial=0; this.lastDetailSerial=0; this.lastMusicGridSerial=0; this.clicks=[]; this.lastTriple=-Infinity; this.lastSpam=-Infinity; this.lastClickRipple=-Infinity;
      this.lastMediaChangeSerial=-1;
      this.lastFrameMetrics={};
      this.effectScratch={
        shape:{energy:0,shape:null},
        beat:{energy:0,reveal:0,aggressive:false,type:''},
        detail:{energy:0,reveal:0,aggressive:false,type:''},
        clickRipple:{energy:0,reveal:0,aggressive:false,type:''},
        musicGrid:{energy:0,reveal:0,aggressive:false,type:''},
        clickGrid:{energy:0,reveal:0,aggressive:false,type:''}
      };
      this.colorScratch={sample:{r:0,g:0,b:0},graded:{r:0,g:0,b:0}};
      this.lightBackdropCanvas=document.createElement('canvas');
      this.lightBackdropCtx=this.lightBackdropCanvas.getContext('2d',{alpha:false});
      this.lightBackdropW=0;
      this.lightBackdropH=0;
      this.lightBackdropAt=-Infinity;
      this.pointer={x:0,y:0,clientY:0,inside:false,last:-Infinity,samples:[],hasStroke:false,strokeX:0,strokeY:0,strokeTime:-Infinity};
      this.scrollSpace=document.querySelector('[data-ascii-shader-scroll-space]');
      this.worldResizeObserver=this.scrollSpace&&typeof ResizeObserver!=='undefined'
        ? new ResizeObserver(()=>this.syncWorldHeight())
        : null;
      this.resizeHandler = () => this.resize();
      this.moveHandler = (e) => { this.recordPointerMove(e); };
      this.leaveHandler = () => { this.pointer.inside=false; this.resetPointerStroke(); };
      this.downHandler = (e) => this.handleClick(e);
      this.dblHandler = (e) => { this.spawnTemporary(e.clientX,this.toWorldY(e.clientY),'double'); };
      window.addEventListener('resize', this.resizeHandler, {passive:true});
      window.addEventListener('pointermove', this.moveHandler, {passive:true});
      window.addEventListener('pointerleave', this.leaveHandler, {passive:true});
      window.addEventListener('pointerdown', this.downHandler, {passive:true});
      window.addEventListener('dblclick', this.dblHandler, {passive:true});
      this.resize();
      this.worldResizeObserver?.observe(this.scrollSpace);
    }
    destroy() { this.workerRenderer?.destroy(); this.worldResizeObserver?.disconnect(); window.removeEventListener('resize', this.resizeHandler); window.removeEventListener('pointermove', this.moveHandler); window.removeEventListener('pointerleave', this.leaveHandler); window.removeEventListener('pointerdown', this.downHandler); window.removeEventListener('dblclick', this.dblHandler); }
    enableLegacyRenderer(reason='ASCII raster worker failed.') {
      if (!this.workerRenderer || this.rendererMode === 'legacy') return;
      const compareMode=this.rendererMode==='compare';
      this.workerFailureReason = String(reason || 'ASCII raster worker failed.');
      this.workerRenderer.destroy();
      this.workerRenderer = null;
      this.rendererMode = 'legacy';
      this.compareCanvas = null;
      this.comparePending = null;
      if(compareMode){
        this.canvas.dataset.asciiRenderer='legacy-fallback';
        this.canvas.dataset.asciiRendererFallback=this.workerFailureReason.slice(0,180);
        return;
      }
      const previous = this.canvas;
      const replacement = previous.cloneNode(false);
      previous.replaceWith(replacement);
      this.canvas = replacement;
      this.ctx = replacement.getContext('2d', { alpha: false });
      replacement.dataset.asciiRenderer = 'legacy-fallback';
      replacement.dataset.asciiRendererFallback = this.workerFailureReason.slice(0, 180);
      this.configureCanvasSurface();
    }
    configureCanvasSurface() {
      const pixelWidth=Math.max(1,Math.floor(this.w*this.dpr)),pixelHeight=Math.max(1,Math.floor(this.h*this.dpr));
      if(this.workerRenderer)this.workerRenderer.resize(this.w,this.h,this.dpr,this.cfg.fontSize,this.reduced);
      if(!this.ctx)return;
      this.canvas.width=pixelWidth;
      this.canvas.height=pixelHeight;
      this.canvas.style.width=this.w+'px';
      this.canvas.style.height=this.h+'px';
      this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
      this.ctx.textBaseline='top';
    }
    captureRendererComparison(sequence) {
      if(this.rendererMode!=='compare'||!sequence||this.comparePending)return;
      this.compareFrameCounter++;
      if(this.compareFrameCounter%90!==0)return;
      try{
        const image=this.ctx.getImageData(0,0,this.canvas.width,this.canvas.height);
        this.comparePending={sequence,width:image.width,height:image.height,data:image.data};
      }catch(error){
        this.canvas.dataset.asciiRendererComparison=JSON.stringify({exact:false,error:String(error?.message||error)});
      }
    }
    finishRendererComparison(sequence) {
      const pending=this.comparePending;
      if(!pending||pending.sequence!==sequence)return;
      this.comparePending=null;
      const workerImage=this.workerRenderer?.captureImageData?.();
      if(!workerImage||workerImage.width!==pending.width||workerImage.height!==pending.height){
        this.canvas.dataset.asciiRendererComparison=JSON.stringify({sequence,exact:false,error:'Worker comparison image was unavailable or resized.'});
        return;
      }
      const expected=pending.data,actual=workerImage.data;
      let differentBytes=0,differentPixels=0,maxChannelDelta=0,totalChannelDelta=0;
      for(let offset=0;offset<expected.length;offset+=4){
        let pixelDifferent=false;
        for(let channel=0;channel<4;channel++){
          const delta=Math.abs(expected[offset+channel]-actual[offset+channel]);
          totalChannelDelta+=delta;
          if(delta){differentBytes++;pixelDifferent=true;if(delta>maxChannelDelta)maxChannelDelta=delta;}
        }
        if(pixelDifferent)differentPixels++;
      }
      const pixelCount=pending.width*pending.height;
      const result={
        sequence,
        exact:differentPixels===0,
        width:pending.width,
        height:pending.height,
        differentPixels,
        differentPixelRatio:roundTimeline(differentPixels/Math.max(1,pixelCount),6),
        differentBytes,
        maxChannelDelta,
        meanChannelDelta:roundTimeline(totalChannelDelta/Math.max(1,expected.length),6)
      };
      this.compareResults.push(result);
      if(this.compareResults.length>12)this.compareResults.splice(0,this.compareResults.length-12);
      this.canvas.dataset.asciiRendererComparison=JSON.stringify({latest:result,results:this.compareResults});
    }
    measureWorldHeight() { return Math.max(this.h, scrollHeightToPx(this.options.scrollHeight), this.scrollSpace?.scrollHeight || 0, document.documentElement.scrollHeight || 0, document.body?.scrollHeight || 0); }
    syncWorldHeight(force=false) {
      const nextWorldH=this.measureWorldHeight(),nextCols=Math.ceil(this.w/this.cfg.cellW)+1,nextRows=Math.ceil(nextWorldH/this.cfg.cellH)+1;
      if(!force&&Math.abs(nextWorldH-this.worldH)<1&&nextCols===this.cols&&nextRows===this.rows)return false;
      this.worldH=nextWorldH;
      this.cols=nextCols;
      this.rows=nextRows;
      this.canvas.dataset.asciiWorldHeight=String(Math.round(this.worldH));
      this.canvas.dataset.asciiWorldRows=String(this.rows);
      this.updateScroll();
      this.createCells();
      this.shapes=[];
      this.ensureAmbient(performance.now());
      return true;
    }
    resize() { this.w=window.innerWidth; this.h=window.innerHeight; this.dpr=Math.min(window.devicePixelRatio||1,this.cfg.dprCap); this.configureCanvasSurface(); this.lightBackdropAt=-Infinity; this.syncWorldHeight(true); }
    updateScroll(cameraY=readScrollY()){const previous=this.scrollY,max=Math.max(0,this.worldH-this.h);this.scrollY=clamp(cameraY,0,max);if(this.pointer.inside){this.pointer.y=this.toWorldY(this.pointer.clientY||0);if(Math.abs(this.scrollY-previous)>.5)this.resetPointerStroke();}}
    toWorldY(clientY){return clamp(clientY+this.scrollY,0,Math.max(0,this.worldH));}
    resetPointerStroke(){this.pointer.samples=[];this.pointer.hasStroke=false;this.pointer.strokeTime=-Infinity;}
    pointerEventTime(event, fallback=performance.now()) {
      const t=Number(event?.timeStamp);
      return Number.isFinite(t)&&Math.abs(t-fallback)<10000?t:fallback;
    }
    recordPointerMove(event) {
      const now=performance.now(), raw=typeof event?.getCoalescedEvents==='function'?event.getCoalescedEvents():null, events=raw&&raw.length?raw:[event], maxSamples=this.reduced?14:42;
      for(let i=0;i<events.length;i++){
        const sample=events[i]||event, x=Number.isFinite(Number(sample.clientX))?Number(sample.clientX):Number(event.clientX)||0, clientY=Number.isFinite(Number(sample.clientY))?Number(sample.clientY):Number(event.clientY)||0;
        const point={x,y:this.toWorldY(clientY),clientY,t:this.pointerEventTime(sample,now)+i*.001};
        this.pointer.samples.push(point);
        this.pointer.x=point.x;
        this.pointer.y=point.y;
        this.pointer.clientY=clientY;
      }
      if(this.pointer.samples.length>maxSamples)this.pointer.samples.splice(0,this.pointer.samples.length-maxSamples);
      this.pointer.inside=true;
      this.pointer.last=now;
    }
    preparePointerStroke(now) {
      if(!this.pointer.inside||now-this.pointer.last>=1300)return null;
      const samples=this.pointer.samples.splice(0), points=[];
      if(this.pointer.hasStroke&&now-this.pointer.strokeTime<120)points.push({x:this.pointer.strokeX,y:this.pointer.strokeY,t:this.pointer.strokeTime});
      else if(samples.length)points.push(samples[0]);
      points.push(...samples);
      const last=points[points.length-1], needsCurrent=!last||Math.hypot(last.x-this.pointer.x,last.y-this.pointer.y)>.5;
      if(needsCurrent)points.push({x:this.pointer.x,y:this.pointer.y,t:this.pointer.last});
      if(!points.length)points.push({x:this.pointer.x,y:this.pointer.y,t:this.pointer.last});
      this.pointer.hasStroke=true;
      this.pointer.strokeX=this.pointer.x;
      this.pointer.strokeY=this.pointer.y;
      this.pointer.strokeTime=now;
      return {points,radius:this.cfg.hoverRadius,radiusSq:this.cfg.hoverRadius*this.cfg.hoverRadius};
    }
    distanceToSegmentSq(px,py,ax,ay,bx,by){
      const vx=bx-ax,vy=by-ay,wx=px-ax,wy=py-ay,lenSq=vx*vx+vy*vy;
      if(lenSq<=.0001)return wx*wx+wy*wy;
      const t=clamp((wx*vx+wy*vy)/lenSq);
      const dx=px-(ax+vx*t),dy=py-(ay+vy*t);
      return dx*dx+dy*dy;
    }
    pointerHoverEnergy(cell,stroke){
      if(!stroke)return 0;
      const points=stroke.points;
      let best=0;
      if(points.length===1){
        const p=points[0], d2=(cell.centerX-p.x)**2+(cell.centerY-p.y)**2;
        if(d2<stroke.radiusSq)best=(1-Math.sqrt(d2)/stroke.radius)**2;
        return best;
      }
      for(let i=1;i<points.length;i++){
        const a=points[i-1],b=points[i],d2=this.distanceToSegmentSq(cell.centerX,cell.centerY,a.x,a.y,b.x,b.y);
        if(d2<stroke.radiusSq)best=Math.max(best,(1-Math.sqrt(d2)/stroke.radius)**2);
      }
      return best;
    }
    visibleRows(pad=0){const top=clamp(Math.floor(this.scrollY/this.cfg.cellH)-pad,0,this.rows-1),bottom=clamp(Math.ceil((this.scrollY+this.h)/this.cfg.cellH)+pad,0,this.rows-1);return{top,bottom};}
    createCells() {
      this.cells=[];
      this.cellRows=[];
      const now=performance.now();
      for (let row=0;row<this.rows;row++){
        const rowCells=[];
        this.cellRows[row]=rowCells;
        const rowMul=.85+hash01(row,31,9001)*.26;
        for(let col=0;col<this.cols;col++){
          const visible=Math.random()<this.cfg.visible;
          const cell={col,row,x:col*this.cfg.cellW,y:row*this.cfg.cellH,centerX:col*this.cfg.cellW+this.cfg.cellW*.5,centerY:row*this.cfg.cellH+this.cfg.cellH*.5,visible,char:visible?chooseIdle():'',opacity:rand(.13,.32)*rowMul,next:now+rand(700,3800),hover:0,source:'idle',seed:randInt(1,99999999)};
          rowCells.push(cell);
          this.cells.push(cell);
        }
      }
    }
    ignoredClickTarget(target) { const selector = this.options.ignoreClickSelector || '[data-ui-interactive]'; return !!(target && target.closest && target.closest(selector)); }
    handleClick(e) { if (this.ignoredClickTarget(e.target)) return; this.updateScroll(); const now=performance.now(); const worldY=this.toWorldY(e.clientY); if(now-this.lastClickRipple>260){this.lastClickRipple=now;this.addClickRipple(now,e.clientX,worldY);} this.clicks=this.clicks.filter(t=>now-t<=950); this.clicks.push(now); const musicPlaying=this.music.state.playing&&this.music.state.enabled; const spamThreshold=musicPlaying?6:5; if(this.clicks.filter(t=>now-t<=700).length>=3&&now-this.lastTriple>360){this.lastTriple=now;this.addClickGridFill(now,false);} if(this.clicks.length>=spamThreshold&&now-this.lastSpam>420){this.lastSpam=now;this.addClickGridFill(now,true);if(!this.reduced)this.spawnTemporary(e.clientX,worldY,'spam');} }
    shapePadding(shape) { return shape.w > 18 || shape.h > 12 ? 5 : 3; }
    shapeBounds(shape) { const pad = this.shapePadding(shape); return { x: shape.x - pad, y: shape.y - Math.ceil(pad*.65), w: shape.w + pad*2, h: shape.h + Math.ceil(pad*1.3) }; }
    rectsOverlap(a,b) { return !(a.x+a.w<b.x || a.x>b.x+b.w || a.y+a.h<b.y || a.y>b.y+b.h); }
    positionOverlaps(candidate, ignoreShape=null) { const a = this.shapeBounds(candidate); return this.shapes.some(s => s !== ignoreShape && this.rectsOverlap(a, this.shapeBounds(s))); }
    shapePlacementRows(scope='visible', pad=10) {
      if (scope === 'world') return { top: 0, bottom: Math.max(0, this.rows - 1) };
      return this.visibleRows(pad);
    }
    chooseSafePosition(shape, px=null, py=null, ignoreShape=null, scope='visible') { const margin=2, zones=[[.04,.06,.34,.34],[.62,.06,.94,.34],[.04,.60,.34,.92],[.62,.60,.94,.92],[.04,.34,.36,.66],[.64,.34,.96,.66],[.32,.10,.68,.38],[.32,.62,.68,.92]]; const existing=this.shapes.filter(s=>s!==ignoreShape); const tries=[]; const vr=this.shapePlacementRows(scope, 10), span=Math.max(1,vr.bottom-vr.top); if(px!=null&&py!=null){ const cx=px/this.cfg.cellW-shape.w/2, cy=py/this.cfg.cellH-shape.h/2; for(let i=0;i<10;i++)tries.push({x:clamp(cx+rand(-5,5),margin,Math.max(margin,this.cols-shape.w-margin)),y:clamp(cy+rand(-3,3),margin,Math.max(margin,this.rows-shape.h-margin))}); }
      for(let i=0;i<30;i++){ let z=pick(zones); if(existing.length){ const e=existing[0]; const ex=(e.x+e.w/2)/this.cols, ey=clamp(((e.y+e.h/2)-vr.top)/span,0,1); zones.sort((A,B)=>Math.hypot((A[0]+A[2])*.5-ex,(A[1]+A[3])*.5-ey)-Math.hypot((B[0]+B[2])*.5-ex,(B[1]+B[3])*.5-ey)); z=zones[Math.max(0,zones.length-1-(i%3))]; } const minX=Math.floor(this.cols*z[0]), maxX=Math.max(minX,Math.floor(this.cols*z[2]-shape.w)); const minY=Math.floor(vr.top+span*z[1]), maxY=Math.max(minY,Math.min(this.rows-shape.h-margin,Math.floor(vr.top+span*z[3]-shape.h))); tries.push({x:rand(minX,maxX),y:rand(minY,maxY)}); }
      for(const pos of tries){ shape.x=clamp(pos.x,margin,Math.max(margin,this.cols-shape.w-margin)); shape.y=clamp(pos.y,margin,Math.max(margin,this.rows-shape.h-margin)); if(!this.positionOverlaps(shape,ignoreShape))return; }
      if(existing.length){ const e=existing[0], left=e.x>this.cols/2; shape.x=left?margin:Math.max(margin,this.cols-shape.w-margin); shape.y=e.y>vr.top+span/2?vr.top:Math.max(vr.top,Math.min(this.rows-shape.h-margin,vr.bottom-shape.h)); }
    }
    makeShape(type,purpose,now,px=null,py=null,scope='visible') { const def=SHAPES[type], scale=this.mobile?1:((purpose==='ambient'&&this.cols>105&&Math.random()<.34)?2:1), w=def.width*scale, h=def.height*scale; const temp=purpose!=='ambient', life=temp?(purpose==='spam'?rand(420,820):rand(720,1350)):rand(10000,26000); const shape={type,purpose,def,scale,x:2,y:2,w,h,age:0,life,fadeIn:temp?rand(70,170):rand(900,2200),fadeOut:temp?rand(280,740):rand(1200,3200),mutation:type==='hourglass'?rand(340,650):type==='lock'?rand(300,540):type==='bolt'?rand(220,430):rand(200,430),seed:randInt(1,9999999),dx:temp?rand(-.18,.18):rand(-.05,.05),dy:temp?rand(-.10,.10):rand(-.03,.03),born:now}; this.chooseSafePosition(shape,px,py,null,scope); return shape; }
    ensureAmbient(now) { this.shapes=this.shapes.filter(s=>s.age<s.life); let guard=0; while(this.shapes.length<this.cfg.maxShapes&&guard++<this.cfg.maxShapes){const type=weightedPickAvailable(AMBIENT_TYPES,new Set(this.shapes.map(s=>s.type)));if(!type)break;this.shapes.push(this.makeShape(type,'ambient',now,null,null,'world'));} }
    spawnTemporary(px,py,purpose) { const entries=purpose==='spam'?SPAM_TYPES:DOUBLE_TYPES, now=performance.now(); this.shapes=this.shapes.filter(s=>s.age<s.life&&s.purpose!==purpose); if(this.shapes.length>=this.cfg.maxShapes){const i=this.shapes.findIndex(s=>s.purpose==='ambient');this.shapes.splice(i>=0?i:0,1);} const type=weightedPickAvailable(entries,new Set(this.shapes.map(s=>s.type))); if(!type)return; this.shapes.push(this.makeShape(type,purpose,now,px,py)); }
    viewportReachRadius(x,y) { return Math.max(Math.hypot(x,y-this.scrollY),Math.hypot(this.w-x,y-this.scrollY),Math.hypot(x,y-(this.scrollY+this.h)),Math.hypot(this.w-x,y-(this.scrollY+this.h))); }
    addClickRipple(now,x,y) { if(this.options.singleClickRipples===false)return; const reach=this.viewportReachRadius(x,y)+Math.max(90,this.cfg.cellH*5), base=this.reduced?.52:.64; this.clickRipples.push({type:'click-ripple',x,y,start:now,duration:this.reduced?1050:1220,maxRadius:reach,ringWidth:Math.max(78,Math.min(150,reach*.105)),strength:base,aggressive:false,seed:randInt(1,9999999)}); this.clickRipples.push({type:'click-ripple',x,y,start:now+(this.reduced?210:175),duration:this.reduced?1180:1360,maxRadius:reach*1.04,ringWidth:Math.max(96,Math.min(180,reach*.13)),strength:base*.82,aggressive:false,seed:randInt(1,9999999)}); if(this.clickRipples.length>8)this.clickRipples.splice(0,this.clickRipples.length-8); }
    addClickGridFill(now, aggressive) { const musicPlaying=this.music.state.playing&&this.music.state.enabled; const damp=musicPlaying?(aggressive?.82:.64):1; const bands=[],clusters=[],vr=this.visibleRows(4),span=Math.max(1,vr.bottom-vr.top); const bandCount=aggressive?randInt(3,5):randInt(2,4); const clusterCount=musicPlaying&&!aggressive?randInt(0,1):(aggressive?randInt(3,6):randInt(0,2)); for(let i=0;i<bandCount;i++)bands.push({row:rand(vr.top,vr.bottom),h:rand(aggressive?3:2,aggressive?8:5),boost:rand(.08,aggressive?.32:.20)*damp,phase:rand(0,Math.PI*2),drift:rand(-2.4,2.4)}); for(let i=0;i<clusterCount;i++){const cw=randInt(8,Math.max(12,Math.floor(this.cols*(aggressive?.22:.14)))), ch=randInt(3,Math.max(5,Math.floor(span*(aggressive?.16:.10)))); clusters.push({x:randInt(0,Math.max(0,this.cols-cw)),y:randInt(vr.top,Math.max(vr.top,Math.min(this.rows-ch,vr.bottom-ch))),w:cw,h:ch,boost:rand(.10,aggressive?.38:.22)*damp,seed:randInt(1,9999999)});} this.clickGridFills.push({source:'click',start:now,duration:(aggressive?rand(680,1250):rand(420,760))*(musicPlaying?(aggressive?.82:.72):1),strength:(aggressive?rand(.36,.62):rand(.22,.38))*damp,density:(aggressive?rand(.34,.62):rand(.18,.36))*damp,aggressive,type:aggressive?'spam':'triple',seed:randInt(1,99999999),bands,clusters}); if(this.clickGridFills.length>4)this.clickGridFills.splice(0,this.clickGridFills.length-4); }
    effectDurationMs(value, fallback) { const n=Number(value); if(!Number.isFinite(n)||n<=0)return fallback; return n<=20?Math.round(n*1000):Math.round(n); }
    effectSeed(value, fallback) { const n=Number(value); return Number.isFinite(n)?Math.floor(n):fallback; }
    mediaTime() { return this.music?.clock ? this.music.clock.getTime() : (this.music?.getCurrentPosition?.() || 0); }
    mediaNowMs(mediaTime=this.mediaTime()) { return Math.max(0, Number(mediaTime) || 0) * 1000; }
    seededUnit(seed,salt=0) { return hash01(seed, salt, seed ^ Math.imul(salt + 1, 2654435761)); }
    seededRange(seed,salt,min,max) { return lerp(min, max, this.seededUnit(seed, salt)); }
    seededInt(seed,salt,min,max) { return Math.floor(this.seededRange(seed, salt, min, max + 1)); }
    eventSeed(event, fallback=1) { const n=Number(event?.seed); return Number.isFinite(n)?Math.floor(n):hashStringToSeed(`${event?.id||''}|${event?.t??event?.time??''}|${event?.type||''}|${event?.gridType||''}`)||fallback; }
    timelineEffectKey(kind,event) { return event ? `${kind}:${event.id||`${event.type||kind}:${roundTimeline(Number(event.t ?? event.time) || 0)}`}` : ''; }
    hasTimelineEffect(list,key) { return !!key && list.some((fx)=>fx.timelineKey===key); }
    timelineGridType(event) { return event?.gridType || event?.grid || event?.kind || 'mood-shift'; }
    timelineEffectDurationMs(event, kind, type='') {
      const seed=this.eventSeed(event, 1);
      if(kind==='grid'){
        const fallback=type==='pitch-rise'?this.seededRange(seed,11,320,680):type==='bass-drop'?this.seededRange(seed,12,620,1200):this.seededRange(seed,13,520,980);
        return this.effectDurationMs(event?.duration, fallback);
      }
      const fallback=this.seededRange(seed,21,700,1400);
      return this.effectDurationMs(event?.duration, fallback);
    }
    effectStartMediaTime(event=null) { const t=Number(event?.t ?? event?.time); return Number.isFinite(t)?Math.max(0,t):this.mediaTime(); }
    effectProgress(fx, now, mediaTime=this.mediaTime()) {
      if(Number.isFinite(Number(fx.startMediaTime))){
        const dur=Math.max(.001,(Number(fx.duration)||0)/1000);
        return clamp((mediaTime-Number(fx.startMediaTime))/dur);
      }
      return clamp((now-fx.start)/Math.max(1,Number(fx.duration)||1));
    }
    effectElapsedMs(fx, now, mediaTime=this.mediaTime()) {
      if(Number.isFinite(Number(fx.startMediaTime))) return Math.max(0,(mediaTime-Number(fx.startMediaTime))*1000);
      return Math.max(0,now-fx.start);
    }
    isEffectActiveOrPending(fx, now, mediaTime=this.mediaTime()) {
      if(Number.isFinite(Number(fx.startMediaTime))){
        const start=Number(fx.startMediaTime), dur=Math.max(.001,(Number(fx.duration)||0)/1000);
        return mediaTime>=start-.25 && mediaTime<=start+dur;
      }
      return now<=fx.start+fx.duration;
    }
    resetMediaEffectsForTime(mediaTime=this.mediaTime(), now=0) {
      this.musicGridFills=[];
      this.musicRipples=[];
      this.detailRipples=[];
      this.reconstructTimelineEffects(mediaTime, now);
    }
    reconstructTimelineEffects(mediaTime=this.mediaTime(), now=0) {
      const events=this.music?.timeline?.events;
      if(!Array.isArray(events)||!events.length||!this.music.state.enabled||!this.music.state.asciiEnabled)return;
      if(this.music?.clock?.state==='idle'&&mediaTime<=.001)return;
      for(const event of events){
        const t=Number(event?.t ?? event?.time);
        if(!Number.isFinite(t))continue;
        const type=String(event.type||'ripple');
        const isGrid=type==='gridBurst'||type==='grid'||type==='beatGrid';
        const kind=isGrid?'grid':type==='detail'?'detail':'ripple';
        if(kind==='detail')continue;
        const gridType=isGrid?this.timelineGridType(event):'';
        const duration=this.timelineEffectDurationMs(event,kind,gridType)/1000;
        if(mediaTime<t||mediaTime>t+duration)continue;
        if(isGrid)this.addMusicGridFill(now,gridType,Number(event.strength)||.65,event.frequency||this.music.state.centroidHz||900,event);
        else this.spawnMusicRipple(now,Number(event.strength)||this.music.state.beat||.65,event);
      }
    }
    addMusicGridFill(now,type,strength,frequency,event=null) {
      const amount=this.music.state.gridBurstAmount; if(amount<=.01)return;
      const fromTimeline=!!event, seed=fromTimeline?this.eventSeed(event,1):randInt(1,99999999), timelineKey=fromTimeline?this.timelineEffectKey('grid',event):'';
      if(timelineKey&&this.hasTimelineEffect(this.musicGridFills,timelineKey))return;
      const fallbackDuration=fromTimeline?this.timelineEffectDurationMs(event,'grid',type):(type==='pitch-rise'?rand(320,680):type==='bass-drop'?rand(620,1200):rand(520,980));
      const duration=this.effectDurationMs(event?.duration,fallbackDuration);
      const densityBase=fromTimeline?(type==='pitch-rise'?this.seededRange(seed,1,.16,.32):type==='bass-drop'?this.seededRange(seed,2,.30,.58):this.seededRange(seed,3,.24,.46)):(type==='pitch-rise'?rand(.16,.32):type==='bass-drop'?rand(.30,.58):rand(.24,.46));
      const density=densityBase*(.75+amount*.75);
      const bands=[],clusters=[],vr=this.visibleRows(4),span=Math.max(1,vr.bottom-vr.top);
      const customBands=Array.isArray(event?.bands)?event.bands:[], customClusters=Array.isArray(event?.clusters)?event.clusters:[];
      if(customBands.length||customClusters.length){
        for(let i=0;i<customBands.length;i++){
          const band=customBands[i];
          const yNorm=Number.isFinite(Number(band.yNorm))?clamp(Number(band.yNorm)):Number.isFinite(Number(band.rowNorm))?clamp(Number(band.rowNorm)):.5;
          const worldYNorm=Number.isFinite(Number(band.worldYNorm))?clamp(Number(band.worldYNorm)):null;
          const heightNorm=Number.isFinite(Number(band.heightNorm))?clamp(Number(band.heightNorm)):Number.isFinite(Number(band.hNorm))?clamp(Number(band.hNorm)):.08;
          bands.push({row:worldYNorm==null?clamp(vr.top+yNorm*span,vr.top,vr.bottom):clamp(worldYNorm*Math.max(1,this.rows||1),0,Math.max(1,this.rows||1)),h:Math.max(1,heightNorm*span),boost:clamp(Number(band.boost) || .18,0,.6),phase:Number.isFinite(Number(band.phase))?Number(band.phase):0,drift:(Number.isFinite(Number(band.driftNorm))?clamp(Number(band.driftNorm),-1,1):0)*span});
        }
        for(let i=0;i<customClusters.length;i++){
          const cluster=customClusters[i];
          const xNorm=Number.isFinite(Number(cluster.xNorm))?clamp(Number(cluster.xNorm)):0;
          const yNorm=Number.isFinite(Number(cluster.yNorm))?clamp(Number(cluster.yNorm)):0;
          const worldYNorm=Number.isFinite(Number(cluster.worldYNorm))?clamp(Number(cluster.worldYNorm)):null;
          const widthNorm=Number.isFinite(Number(cluster.widthNorm))?clamp(Number(cluster.widthNorm)):Number.isFinite(Number(cluster.wNorm))?clamp(Number(cluster.wNorm)):.14;
          const heightNorm=Number.isFinite(Number(cluster.heightNorm))?clamp(Number(cluster.heightNorm)):Number.isFinite(Number(cluster.hNorm))?clamp(Number(cluster.hNorm)):.10;
          const cw=Math.max(1,Math.floor(widthNorm*this.cols)), ch=Math.max(1,Math.floor(heightNorm*span));
          clusters.push({x:clamp(Math.floor(xNorm*this.cols),0,Math.max(0,this.cols-cw)),y:worldYNorm==null?clamp(Math.floor(vr.top+yNorm*span),vr.top,Math.max(vr.top,Math.min(this.rows-ch,vr.bottom-ch))):clamp(Math.floor(worldYNorm*Math.max(1,this.rows||1)),0,Math.max(0,this.rows-ch)),w:cw,h:ch,boost:clamp(Number(cluster.boost) || .22,0,.7),seed:this.effectSeed(cluster.seed,fromTimeline?this.seededInt(seed,40+i,1,9999999):randInt(1,9999999))});
        }
      } else {
        const bandCount=fromTimeline?(type==='pitch-rise'?this.seededInt(seed,51,2,4):type==='bass-drop'?this.seededInt(seed,52,3,5):this.seededInt(seed,53,2,5)):(type==='pitch-rise'?randInt(2,4):type==='bass-drop'?randInt(3,5):randInt(2,5));
        const clusterCount=fromTimeline?(type==='pitch-rise'?this.seededInt(seed,54,0,2):type==='bass-drop'?this.seededInt(seed,55,2,5):this.seededInt(seed,56,1,4)):(type==='pitch-rise'?randInt(0,2):type==='bass-drop'?randInt(2,5):randInt(1,4));
        const yBase= type==='pitch-rise'?this.freqToVisibleRow(frequency):type==='bass-drop'?vr.top+span*.74:(fromTimeline?this.seededRange(seed,57,vr.top+span*.2,vr.top+span*.8):rand(vr.top+span*.2,vr.top+span*.8));
        for(let i=0;i<bandCount;i++){
          const row=fromTimeline?clamp(yBase+this.seededRange(seed,60+i,-span*.12,span*.12),vr.top,vr.bottom):clamp(yBase+rand(-span*.12,span*.12),vr.top,vr.bottom);
          const h=fromTimeline?this.seededRange(seed,80+i,type==='pitch-rise'?1.5:2.5,type==='bass-drop'?8:5):rand(type==='pitch-rise'?1.5:2.5,type==='bass-drop'?8:5);
          const boost=fromTimeline?this.seededRange(seed,100+i,.10,type==='bass-drop'?.34:.24):rand(.10,type==='bass-drop'?.34:.24);
          const phase=fromTimeline?this.seededRange(seed,120+i,0,Math.PI*2):rand(0,Math.PI*2);
          const drift=fromTimeline?this.seededRange(seed,140+i,-2.2,2.2):rand(-2.2,2.2);
          bands.push({row,h,boost,phase,drift});
        }
        for(let i=0;i<clusterCount;i++){
          const cw=fromTimeline?this.seededInt(seed,160+i,8,Math.max(12,Math.floor(this.cols*(type==='bass-drop'?.24:.16)))):randInt(8,Math.max(12,Math.floor(this.cols*(type==='bass-drop'?.24:.16))));
          const ch=fromTimeline?this.seededInt(seed,180+i,3,Math.max(5,Math.floor(span*(type==='bass-drop'?.18:.11)))):randInt(3,Math.max(5,Math.floor(span*(type==='bass-drop'?.18:.11))));
          const x=fromTimeline?this.seededInt(seed,200+i,0,Math.max(0,this.cols-cw)):randInt(0,Math.max(0,this.cols-cw));
          const y=fromTimeline?this.seededInt(seed,220+i,vr.top,Math.max(vr.top,Math.min(this.rows-ch,vr.bottom-ch))):randInt(vr.top,Math.max(vr.top,Math.min(this.rows-ch,vr.bottom-ch)));
          const boost=fromTimeline?this.seededRange(seed,240+i,.12,type==='bass-drop'?.42:.24):rand(.12,type==='bass-drop'?.42:.24);
          clusters.push({x,y,w:cw,h:ch,boost,seed:fromTimeline?this.seededInt(seed,260+i,1,9999999):randInt(1,9999999)});
        }
      }
      this.musicGridFills.push({source:fromTimeline?'timeline':'music',timelineKey,start:now,startMediaTime:this.effectStartMediaTime(event),duration,strength:clamp(strength*(.75+amount*.75),.12,.82),density,aggressive:type==='bass-drop',type,seed,bands,clusters});
      const maxGridFills=fromTimeline?8:2;
      if(this.musicGridFills.length>maxGridFills)this.musicGridFills.splice(0,this.musicGridFills.length-maxGridFills);
    }
    freqToRow(hz) { const min=Math.log2(80), max=Math.log2(6000), v=clamp((Math.log2(Math.max(80,hz||900))-min)/(max-min)); return lerp(this.rows*.82,this.rows*.16,v); }
    freqToVisibleRow(hz) { const min=Math.log2(80), max=Math.log2(6000), v=clamp((Math.log2(Math.max(80,hz||900))-min)/(max-min)), vr=this.visibleRows(2), span=Math.max(1,vr.bottom-vr.top); return lerp(vr.top+span*.82,vr.top+span*.16,v); }
    recordedPointerNorm() {
      this.updateScroll();
      const x=this.pointer.inside?this.pointer.x:this.w*.5;
      const y=this.pointer.inside?this.pointer.y:this.scrollY+this.h*.5;
      return {
        xNorm:roundTimeline(clamp(x/Math.max(1,this.w))),
        yNorm:roundTimeline(clamp((y-this.scrollY)/Math.max(1,this.h))),
        worldYNorm:roundTimeline(clamp(y/Math.max(1,this.worldH||this.h)))
      };
    }
    createRecordedRipplePayload(options={}) {
      const seed=this.effectSeed(options.seed,hashStringToSeed(`ripple|${this.mediaTime()}|${this.pointer.x}|${this.pointer.y}`));
      const coords=this.recordedPointerNorm();
      const x=coords.xNorm*this.w, y=this.scrollY+coords.yNorm*this.h, diag=Math.max(1,Math.hypot(this.w,this.h));
      const reach=this.viewportReachRadius(x,y)+Math.max(90,this.cfg.cellH*5);
      return {
        seed,
        xNorm:coords.xNorm,
        yNorm:coords.yNorm,
        worldYNorm:coords.worldYNorm,
        duration:roundTimeline(Number.isFinite(Number(options.duration))?Number(options.duration):(this.reduced?1.05:1.22)),
        radiusNorm:roundTimeline(clamp(Number.isFinite(Number(options.radiusNorm))?Number(options.radiusNorm):Math.min(reach,diag*.72)/diag,.05,1)),
        ringWidth:roundTimeline(clamp(Number.isFinite(Number(options.ringWidth))?Number(options.ringWidth):reach*.09,18,140),1)
      };
    }
    recordedClusterNorm(widthNorm,heightNorm,seed,saltX,saltY,source={}) {
      const w=roundTimeline(clamp(widthNorm,.02,1));
      const h=roundTimeline(clamp(heightNorm,.02,1));
      const xMax=Math.max(0,1-w), yMax=Math.max(0,1-h);
      const rawX=Number.isFinite(Number(source.xNorm))?Number(source.xNorm):this.seededRange(seed,saltX,0,xMax);
      const rawY=Number.isFinite(Number(source.yNorm))?Number(source.yNorm):this.seededRange(seed,saltY,0,yMax);
      return { xNorm:roundTimeline(clamp(rawX,0,xMax)), yNorm:roundTimeline(clamp(rawY,0,yMax)), widthNorm:w, heightNorm:h };
    }
    createRecordedGridPayload(options={}) {
      const gridType=options.gridType||options.grid||options.kind||'mood-shift';
      const seed=this.effectSeed(options.seed,hashStringToSeed(`grid|${gridType}|${this.mediaTime()}|${this.scrollY}`));
      const frequency=Number.isFinite(Number(options.frequency??options.hz))?Number(options.frequency??options.hz):(this.music.state.centroidHz||900);
      const eventForDuration={seed,duration:options.duration};
      const duration=roundTimeline(this.timelineEffectDurationMs(eventForDuration,'grid',gridType)/1000);
      const bandCount=gridType==='pitch-rise'?this.seededInt(seed,51,2,4):gridType==='bass-drop'?this.seededInt(seed,52,3,5):this.seededInt(seed,53,2,5);
      const clusterCount=gridType==='pitch-rise'?this.seededInt(seed,54,0,2):gridType==='bass-drop'?this.seededInt(seed,55,2,5):this.seededInt(seed,56,1,4);
      const vr=this.visibleRows(4), span=Math.max(1,vr.bottom-vr.top);
      const pitchBase=clamp((this.freqToVisibleRow(frequency)-vr.top)/span);
      const yBase=gridType==='pitch-rise'?pitchBase:gridType==='bass-drop' ? .74 : this.seededRange(seed,57,.20,.80);
      const bands=[],clusters=[];
      for(let i=0;i<bandCount;i++){
        const yNorm=roundTimeline(clamp(yBase+this.seededRange(seed,60+i,-.12,.12)));
        const heightNorm=roundTimeline(this.seededRange(seed,80+i,gridType==='pitch-rise' ? .035 : .055,gridType==='bass-drop' ? .18 : .12));
        bands.push({
          yNorm,
          worldYNorm:roundTimeline(clamp((vr.top+yNorm*span)/Math.max(1,this.rows||1))),
          heightNorm,
          boost:roundTimeline(this.seededRange(seed,100+i,.10,gridType==='bass-drop' ? .34 : .24)),
          phase:roundTimeline(this.seededRange(seed,120+i,0,Math.PI*2)),
          driftNorm:roundTimeline(this.seededRange(seed,140+i,-.055,.055))
        });
      }
      for(let i=0;i<clusterCount;i++){
        const widthNorm=this.seededRange(seed,160+i,.07,gridType==='bass-drop' ? .24 : .16);
        const heightNorm=this.seededRange(seed,180+i,.055,gridType==='bass-drop' ? .18 : .11);
        const base=this.recordedClusterNorm(widthNorm,heightNorm,seed,200+i,220+i);
        clusters.push({ ...base, worldYNorm:roundTimeline(clamp((vr.top+base.yNorm*span)/Math.max(1,this.rows||1))), boost:roundTimeline(this.seededRange(seed,240+i,.12,gridType==='bass-drop' ? .42 : .24)), seed:this.seededInt(seed,260+i,1,9999999) });
      }
      return { seed, duration, gridType, frequency:roundTimeline(frequency,1), bands, clusters };
    }
    captureDurationMs(effect={}) {
      const duration=Number(effect.duration);
      if(!Number.isFinite(duration)||duration<=0)return 1;
      return duration<=20?duration*1000:duration;
    }
    captureGridDurationMs(effect={}) {
      const gridType=effect.gridType||effect.type||'mood-shift';
      return this.captureDurationMs(effect)+(gridType==='bass-drop'?260:220);
    }
    captureStartMediaTime(effect={}, mediaTime=this.mediaTime()) {
      const start=Number(effect.startMediaTime);
      if(Number.isFinite(start))return Math.max(0,start);
      const durationSeconds=this.captureDurationMs(effect)/1000;
      const progress=clamp(Number(effect.progress)||0);
      return Math.max(0,mediaTime-durationSeconds*progress);
    }
    captureRippleEffect(effect={}, mediaTime=this.mediaTime(), now=performance.now()) {
      const duration=this.captureDurationMs(effect), startMediaTime=this.captureStartMediaTime(effect,mediaTime);
      const diag=Math.max(1,Math.hypot(this.w,this.h));
      const x=clamp(Number(effect.xNorm)||.5)*this.w;
      const viewportY=clamp(Number(effect.yNorm)||.5);
      const worldYNorm=Number.isFinite(Number(effect.worldYNorm))?clamp(Number(effect.worldYNorm)):viewportY;
      const y=clamp(worldYNorm*Math.max(1,this.worldH||this.h),0,Math.max(1,this.worldH||this.h));
      const maxRadius=Math.max(24,clamp(Number(effect.radiusNorm)||.32,.01,1.5)*diag);
      const fx={type:effect.type||'capture-ripple',source:'capture',timelineKey:`capture:${effect.id||effect.timelineKey||effect.seed||startMediaTime}`,x,y,start:now,startMediaTime,duration,maxRadius,ringWidth:clamp(Number(effect.ringWidth)||38,6,240),strength:clamp(Number(effect.strength)||.5),aggressive:(Number(effect.strength)||0)>.56,seed:this.effectSeed(effect.seed,hashStringToSeed(`capture|ripple|${effect.id||startMediaTime}`))};
      return this.isEffectActiveOrPending(fx,now,mediaTime)?fx:null;
    }
    captureGridEffect(effect={}, mediaTime=this.mediaTime(), now=performance.now()) {
      const duration=this.captureGridDurationMs(effect), startMediaTime=this.captureStartMediaTime(effect,mediaTime), seed=this.effectSeed(effect.seed,hashStringToSeed(`capture|grid|${effect.id||startMediaTime}`));
      const vr=this.visibleRows(4), span=Math.max(1,vr.bottom-vr.top), gridType=effect.gridType||effect.type||'mood-shift';
      const bands=[],clusters=[];
      const sourceBands=Array.isArray(effect.bands)?effect.bands:[], sourceClusters=Array.isArray(effect.clusters)?effect.clusters:[];
      for(let i=0;i<sourceBands.length;i++){
        const band=sourceBands[i], yNorm=clamp(Number(band.yNorm)||.5), hNorm=clamp(Number(band.heightNorm)||.08,.01,1);
        const worldYNorm=Number.isFinite(Number(band.worldYNorm))?clamp(Number(band.worldYNorm)):yNorm;
        bands.push({row:clamp(worldYNorm*Math.max(1,this.rows||1),0,Math.max(1,this.rows||1)),h:Math.max(1,hNorm*span),boost:clamp(Number(band.boost)||.18,0,.7),phase:Number.isFinite(Number(band.phase))?Number(band.phase):0,drift:(Number.isFinite(Number(band.driftNorm))?clamp(Number(band.driftNorm),-1,1):0)*span});
      }
      for(let i=0;i<sourceClusters.length;i++){
        const cluster=sourceClusters[i], widthNorm=clamp(Number(cluster.widthNorm)||.14,.01,1), heightNorm=clamp(Number(cluster.heightNorm)||.10,.01,1);
        const cw=Math.max(1,Math.floor(widthNorm*this.cols)), ch=Math.max(1,Math.floor(heightNorm*span));
        const worldYNorm=Number.isFinite(Number(cluster.worldYNorm))?clamp(Number(cluster.worldYNorm)):clamp(Number(cluster.yNorm)||0);
        clusters.push({x:clamp(Math.floor(clamp(Number(cluster.xNorm)||0)*this.cols),0,Math.max(0,this.cols-cw)),y:clamp(Math.floor(worldYNorm*Math.max(1,this.rows||1)),0,Math.max(0,this.rows-ch)),w:cw,h:ch,boost:clamp(Number(cluster.boost)||.22,0,.7),seed:this.effectSeed(cluster.seed,this.seededInt(seed,260+i,1,9999999))});
      }
      const fallbackEvent={seed,duration:duration/1000,gridType,frequency:effect.frequency};
      if(!bands.length&&!clusters.length)return null;
      const fx={source:'capture',timelineKey:`capture:${effect.id||effect.timelineKey||seed}`,start:now,startMediaTime,duration,strength:clamp(Number(effect.strength)||.55,.08,.9),density:clamp((gridType==='bass-drop'?.42:.28)*(1+this.music.state.gridBurstAmount*.35)),aggressive:gridType==='bass-drop',type:gridType,seed:this.eventSeed(fallbackEvent,seed),bands,clusters};
      return this.isEffectActiveOrPending(fx,now,mediaTime)?fx:null;
    }
    applyCaptureFrame(frame={}, mediaTime=this.mediaTime(), now=performance.now()) {
      if(!frame?.effects){
        this.musicRipples=[];
        this.detailRipples=[];
        this.musicGridFills=[];
        return;
      }
      const ripples=Array.isArray(frame.effects.ripples)?frame.effects.ripples:[], grids=Array.isArray(frame.effects.grids)?frame.effects.grids:[];
      this.musicRipples=ripples.map((effect)=>this.captureRippleEffect(effect,mediaTime,now)).filter(Boolean).slice(-10);
      this.detailRipples=[];
      const nextGrids=grids.map((effect)=>this.captureGridEffect(effect,mediaTime,now)).filter(Boolean), nextKeys=new Set(nextGrids.map((fx)=>fx.timelineKey));
      const activeGrids=this.musicGridFills.filter((fx)=>fx.source==='capture'&&!nextKeys.has(fx.timelineKey)&&this.isEffectActiveOrPending(fx,now,mediaTime));
      this.musicGridFills=activeGrids.concat(nextGrids).slice(-10);
    }
    gridInfo(cell,now,effects,protect=0,mediaTime=this.mediaTime(),out={}) { let energy=0,reveal=0,aggressive=false,type=''; for(const fx of effects){const p=this.effectProgress(fx,now,mediaTime); if(p<=0||p>=1)continue; const elapsed=this.effectElapsedMs(fx,now,mediaTime), ease=Math.sin(p*Math.PI), slice=Math.floor(elapsed/(fx.aggressive?78:112)); let dens=fx.density; for(const b of fx.bands){const row=b.row+Math.sin(p*Math.PI*2+b.phase)*b.drift;if(Math.abs(cell.row-row)<=b.h*.5)dens+=b.boost;} for(const c of fx.clusters){if(cell.col>=c.x&&cell.col<=c.x+c.w&&cell.row>=c.y&&cell.row<=c.y+c.h)dens+=c.boost*(.65+hash01(cell.col,cell.row,c.seed+slice)*.55);} dens=clamp(dens,0,fx.aggressive?.86:.58); const n=hash01(cell.col,cell.row,fx.seed+slice), loc=dens*ease*fx.strength*(1-protect*.75); if(n<loc){const e=clamp(fx.strength*ease*(.55+(1-n/Math.max(.001,loc))*.45))*(1-protect*.65); if(e>energy){energy=e;reveal=loc*(fx.aggressive?1.55:1.25);aggressive=fx.aggressive;type=fx.type;}}} out.energy=clamp(energy);out.reveal=clamp(reveal);out.aggressive=aggressive;out.type=type;return out; }
    spawnMusicRipple(now, beat, event=null) {
      if(!this.music.state.enabled||!this.music.state.asciiEnabled)return;
      const fromTimeline=!!event, seed=fromTimeline?this.eventSeed(event,1):randInt(1,9999999), timelineKey=fromTimeline?this.timelineEffectKey('ripple',event):'';
      if(timelineKey&&this.hasTimelineEffect(this.musicRipples,timelineKey))return;
      if(!fromTimeline&&Math.random()>this.music.state.rippleAmount+.35)return;
      const strength=fromTimeline?clamp(Number(event.strength)||beat||.65,.12,1):clamp(.22+beat*.58+this.music.state.smoothedBass*.22,.18,.82);
      let x,y;
      if(Number.isFinite(Number(event?.xNorm))) x=clamp(Number(event.xNorm))*this.w;
      if(Number.isFinite(Number(event?.yNorm))) y=this.scrollY+clamp(Number(event.yNorm))*this.h;
      if(Number.isFinite(Number(event?.worldYNorm))) y=clamp(Number(event.worldYNorm))*Math.max(1,this.worldH||this.h);
      if(!Number.isFinite(x)||!Number.isFinite(y)){
        if(fromTimeline){
          const mode=this.seededUnit(seed,301);
          if(mode<.60){x=this.seededRange(seed,302,0,this.w);y=this.seededRange(seed,303,this.scrollY,this.scrollY+this.h);}
          else if(mode<.85){x=this.w*.5+this.seededRange(seed,304,-this.w*.16,this.w*.16);y=this.scrollY+this.h*.5+this.seededRange(seed,305,-this.h*.16,this.h*.16);}
          else {x=this.seededRange(seed,306,0,this.w);y=this.seededRange(seed,307,this.scrollY,this.scrollY+this.h);}
        } else {
          const mode=Math.random();
          if(mode<.60){x=rand(0,this.w);y=rand(this.scrollY,this.scrollY+this.h);}
          else if(mode<.85){x=this.w*.5+rand(-this.w*.16,this.w*.16);y=this.scrollY+this.h*.5+rand(-this.h*.16,this.h*.16);}
          else {x=this.pointer.inside?this.pointer.x:rand(0,this.w);y=this.pointer.inside?this.pointer.y:rand(this.scrollY,this.scrollY+this.h);}
        }
      }
      const radiusNorm=Number(event?.radiusNorm);
      const radiusFallback=(fromTimeline?this.seededRange(seed,308,180,Math.min(Math.hypot(this.w,this.h)*.55,560)):rand(180,Math.min(Math.hypot(this.w,this.h)*.55,560)))*(.85+beat*.35);
      const maxRadius=Number.isFinite(radiusNorm)?Math.max(48,clamp(radiusNorm)*Math.hypot(this.w,this.h)):radiusFallback;
      const ringWidth=Number.isFinite(Number(event?.ringWidth))?clamp(Number(event.ringWidth),6,240):(fromTimeline?this.seededRange(seed,309,22,68):rand(22,68));
      const duration=fromTimeline?this.timelineEffectDurationMs(event,'ripple'):this.effectDurationMs(event?.duration,rand(700,1400));
      this.musicRipples.push({type:event?.type||'beat',source:fromTimeline?'timeline':'music',timelineKey,x,y,start:now,startMediaTime:this.effectStartMediaTime(event),duration,maxRadius,ringWidth,strength,aggressive:fromTimeline?strength>.56:strength>.56||this.music.state.smoothedBass>.58,seed});
      const maxRipples=fromTimeline?8:(this.reduced?2:5);
      if(this.musicRipples.length>maxRipples)this.musicRipples.splice(0,this.musicRipples.length-maxRipples);
    }
    spawnDetailRipple(now) { const st=this.music.state; if(!st.enabled||!st.asciiEnabled)return; if(Math.random()>st.rippleAmount+.20)return; const hz=st.centroidHz||st.dominantHz||900, y=this.freqToVisibleRow(hz)*this.cfg.cellH, x=rand(this.w*.15,this.w*.85); const type=st.pitchRise>.12?'pitch':'high'; this.detailRipples.push({type,source:'music',x,y,start:now,startMediaTime:this.mediaTime(),duration:type==='pitch'?rand(280,680):rand(180,420),maxRadius:type==='pitch'?rand(120,360):rand(80,220),ringWidth:type==='pitch'?rand(10,28):rand(8,18),strength:clamp(.18+st.detailBeat*.42, .12,.58),aggressive:false,seed:randInt(1,9999999)}); if(this.detailRipples.length>7)this.detailRipples.splice(0,this.detailRipples.length-7); }
    rippleInfo(cell,now,list,mediaTime=this.mediaTime(),out={}) { let energy=0,reveal=0,aggressive=false,type=''; for(const r of list){const p=this.effectProgress(r,now,mediaTime); if(p<=0||p>=1)continue; const dist=Math.hypot(cell.centerX-r.x,cell.centerY-r.y), rad=p*r.maxRadius, ring=clamp(1-Math.abs(dist-rad)/r.ringWidth), e=ring*Math.sin(p*Math.PI)*r.strength; if(e>energy){energy=e;reveal=clamp(e*(r.aggressive?1.35:1));aggressive=r.aggressive;type=r.type;}} out.energy=energy;out.reveal=reveal;out.aggressive=aggressive;out.type=type;return out; }
    shapeAlpha(s){return clamp(s.age/s.fadeIn)*clamp((s.life-s.age)/s.fadeOut)}
    shapeEnergy(cell,now,out={}){let best=0,bestShape=null;for(const s of this.shapes){const lx=cell.col-s.x,ly=cell.row-s.y;if(lx<0||ly<0||lx>=s.w||ly>=s.h)continue;const sx=Math.min(s.def.width-1,Math.floor(lx/s.scale)),sy=Math.min(s.def.height-1,Math.floor(ly/s.scale)),mask=s.def.mask[sy][sx];if(mask!=='#'&&mask!=='+')continue;const core=mask==='#',tick=Math.floor((now+s.seed)/s.mutation),noise=hash01(cell.col,cell.row,s.seed+tick*17);let drop=core?.010:.060;if(s.type==='hourglass'||s.type==='lock')drop*=.55;if(s.type==='bolt')drop*=.75;if(noise<drop)continue;const flicker=.78+hash01(cell.row,cell.col,s.seed+tick*31)*.36,e=this.shapeAlpha(s)*flicker*(core?.96:.58)*(s.purpose==='ambient'?.88:1.08);if(e>best){best=e;bestShape=s}}out.energy=best;out.shape=bestShape;return out}
    musicSpeed(){const st=this.music.state;if(!st.enabled||!st.asciiEnabled||!st.playing)return 1;return clamp(1+st.smoothedEnergy*.78+st.smoothedBass*.42,1,this.reduced?1.35:2.15)}
    themeMode(){return currentAsciiThemeMode();}
    lightColor(h,s,l,a=1){const hue=Math.round(((h%360)+360)%360);return a>=1?`hsl(${hue}, ${s}%, ${l}%)`:`hsla(${hue}, ${s}%, ${l}%, ${a})`;}
    warmAsciiTone(gray,alpha,active,asciiBrightness,lightTheme=false){
      const tone=clamp((gray-66)/144,0,1),lift=clamp(asciiBrightness,.55,1.45);
      if(lightTheme){
        const brightness=clamp(.97+(lift-1)*.12,.90,1.06);
        const r=Math.round(clamp((218+tone*30+active*10)*brightness,188,255));
        const g=Math.round(clamp((210+tone*27+active*8)*brightness,180,248));
        const b=Math.round(clamp((184+tone*24+active*6)*brightness,154,228));
        return`rgba(${r},${g},${b},${clamp(alpha*1.24+active*.08,.14,.92).toFixed(3)})`;
      }
      const brightness=clamp(.88+lift*.22,.76,1.23);
      const r=Math.round(clamp((126+tone*101+active*24)*brightness,88,255));
      const g=Math.round(clamp((113+tone*93+active*20)*brightness,78,246));
      const b=Math.round(clamp((84+tone*74+active*14)*brightness,58,220));
      return`rgba(${r},${g},${b},${clamp(alpha*1.02+active*.045,.045,.92).toFixed(3)})`;
    }
    warmShaderTone(graded,alpha,active,asciiBrightness,lightTheme=false){
      if(lightTheme){
        const amount=clamp(.82+active*.09,.82,.92);
        const baseR=Math.round(clamp(42+graded.r*.12-active*4,34,84));
        const baseG=Math.round(clamp(42+graded.g*.12-active*4,34,84));
        const baseB=Math.round(clamp(42+graded.b*.12-active*4,34,84));
        const r=Math.round(clamp(lerp(baseR,250,amount),0,255));
        const g=Math.round(clamp(lerp(baseG,240,amount),0,255));
        const b=Math.round(clamp(lerp(baseB,216,amount),0,255));
        return`rgba(${r},${g},${b},${clamp(alpha*1.14+active*.09,.14,.92).toFixed(3)})`;
      }
      const brightnessInfluence=clamp(Number(SHADER_ASCII_BRIGHTNESS_INFLUENCE)||.54,0,1);
      const shaderBrightness=1+(asciiBrightness-1)*brightnessInfluence;
      const outputCap=clamp(Number(SHADER_ASCII_OUTPUT_CAP)||216,96,245);
      const r=Math.round(clamp(graded.r*shaderBrightness,0,outputCap));
      const g=Math.round(clamp(graded.g*shaderBrightness,0,outputCap));
      const b=Math.round(clamp(graded.b*shaderBrightness,0,outputCap));
      return`rgba(${r},${g},${b},${clamp(alpha,0,.94).toFixed(3)})`;
    }
    applyGlyphShadow(ctx,active,alpha,lightTheme=false){
      if(lightTheme){
        ctx.shadowColor=`rgba(48,44,37,${clamp(.11+alpha*.16+active*.10,.11,.32).toFixed(3)})`;
        ctx.shadowBlur=active>.16?2.25:1.1;
        return;
      }
      ctx.shadowColor=`rgba(255,232,186,${clamp(.04+alpha*.10+active*.07,.04,.20).toFixed(3)})`;
      ctx.shadowBlur=active>.16?2.2:.9;
    }
    ensureLightBackdropCache(){
      const w=Math.max(1,Math.floor(this.w||1)),h=Math.max(1,Math.floor(this.h||1));
      if(!this.lightBackdropCanvas){
        this.lightBackdropCanvas=document.createElement('canvas');
        this.lightBackdropCtx=this.lightBackdropCanvas.getContext('2d',{alpha:false});
      }
      if(this.lightBackdropW!==w||this.lightBackdropH!==h){
        this.lightBackdropW=w;
        this.lightBackdropH=h;
        this.lightBackdropCanvas.width=w;
        this.lightBackdropCanvas.height=h;
        this.lightBackdropCtx=this.lightBackdropCanvas.getContext('2d',{alpha:false});
        this.lightBackdropAt=-Infinity;
      }
      return this.lightBackdropCtx;
    }
    renderLightBackdrop(ctx,now){
      const w=this.w,h=this.h,t=(now||performance.now())/1000,slow=this.reduced ? 0.22 : 1;
      const h1=194+Math.sin(t*.105*slow)*28,h2=282+Math.sin(t*.082*slow+1.8)*26,h3=22+Math.sin(t*.096*slow+3.1)*22;
      const x1=w*(.18+Math.sin(t*.071*slow)*.16),y1=h*(.18+Math.cos(t*.061*slow)*.11);
      const x2=w*(.74+Math.cos(t*.059*slow)*.14),y2=h*(.36+Math.sin(t*.067*slow)*.14);
      const x3=w*(.52+Math.sin(t*.053*slow+2.3)*.20),y3=h*(.78+Math.cos(t*.049*slow+1.2)*.10);
      const base=ctx.createLinearGradient(x1,0,w-x1,h);
      base.addColorStop(0,this.lightColor(h1,78,74));
      base.addColorStop(.48,this.lightColor(h2,72,76));
      base.addColorStop(1,this.lightColor(h3,78,74));
      ctx.fillStyle=base;
      ctx.fillRect(0,0,w,h);
      const wash=(x,y,r,hue,sat,light,alpha)=>{
        const g=ctx.createRadialGradient(x,y,0,x,y,r);
        g.addColorStop(0,this.lightColor(hue,sat,light,alpha));
        g.addColorStop(.44,this.lightColor(hue,sat,light,alpha*.48));
        g.addColorStop(1,this.lightColor(hue,sat,light,0));
        ctx.fillStyle=g;
        ctx.fillRect(0,0,w,h);
      };
      ctx.save();
      ctx.globalCompositeOperation='source-over';
      wash(x1,y1,Math.max(w,h)*.64,h1,82,67,.70);
      wash(x2,y2,Math.max(w,h)*.72,h2,74,69,.62);
      wash(x3,y3,Math.max(w,h)*.60,h3,82,67,.58);
      const shade=ctx.createLinearGradient(0,0,w,h);
      shade.addColorStop(0,'rgba(22,42,68,.12)');
      shade.addColorStop(.46,'rgba(25,35,55,.045)');
      shade.addColorStop(1,'rgba(74,45,82,.10)');
      ctx.fillStyle=shade;
      ctx.fillRect(0,0,w,h);
      ctx.restore();
    }
    paintBackdrop(ctx,now,lightTheme=false){
      if(lightTheme){
        const cacheCtx=this.ensureLightBackdropCache();
        const interval=this.reduced?160:34;
        if(now-this.lightBackdropAt>=interval){
          this.renderLightBackdrop(cacheCtx,now);
          this.lightBackdropAt=now;
        }
        ctx.drawImage(this.lightBackdropCanvas,0,0,this.w,this.h);
      } else{ctx.fillStyle='#030303';ctx.fillRect(0,0,this.w,this.h);}
    }
  tint(cell,gray,alpha,active,sampleY=cell.centerY,lightTheme=false,asciiBrightness=1,shaderTone=true,tintStrength=this.shader.state.asciiTintStrength,shaderSampler=null){
      if(!shaderTone){
        return this.warmAsciiTone(gray,alpha,active,asciiBrightness,lightTheme);
      }
      const s=this.shader.sample(cell.centerX,sampleY,this.colorScratch.sample,shaderSampler);
      if(!s){
        return this.warmAsciiTone(gray,alpha,active,asciiBrightness,lightTheme);
      }
      const shaderAlpha=clamp(alpha*SHADER_ASCII_ALPHA_BOOST,0,.94);
      const graded=gradeShaderAsciiSample(s,gray,active,tintStrength,this.colorScratch.graded);
      return this.warmShaderTone(graded,shaderAlpha,active,asciiBrightness,lightTheme);
    }
    workerFrameSnapshot(now,lightTheme,asciiBrightness,shaderTone,tintStrength,shaderSampler){
      const sampler=shaderSampler||this.shader.prepareAsciiSampler();
      return {
        now,
        lightTheme,
        asciiBrightness,
        shaderTone,
        tintStrength,
        shaderAlphaBoost:SHADER_ASCII_ALPHA_BOOST,
        brightnessInfluence:clamp(Number(SHADER_ASCII_BRIGHTNESS_INFLUENCE)||.54,0,1),
        outputCap:clamp(Number(SHADER_ASCII_OUTPUT_CAP)||216,96,245),
        grade:{
          saturation:clamp(Number(SHADER_ASCII_COLOR_SATURATION)||1,.1,2.4),
          exposure:clamp(Number(SHADER_ASCII_COLOR_EXPOSURE)||.96,.2,1.4),
          rolloffTarget:clamp(Number(SHADER_ASCII_HIGHLIGHT_ROLLOFF)||.70,.35,1),
          minChannel:clamp(Number(SHADER_ASCII_MIN_CHANNEL)||30,0,96)
        },
        sampler:{
          vw:sampler.vw,
          vh:sampler.vh,
          cameraY:sampler.cameraY,
          worldLocked:sampler.worldLocked,
          palette:sampler.pal.map((color)=>color.slice()),
          variation:{...sampler.variation},
          time:sampler.time,
          mouseX:sampler.mouseX,
          mouseY:sampler.mouseY,
          mouseFalloff:sampler.mouseFalloff,
          energy:sampler.energy
        }
      };
    }
    mutate(cell,source,now,shape=null,energy=0,type='') { const sp=this.musicSpeed(); if(source==='hover'){cell.char=chooseGlitch();cell.next=now+rand(24,150)/sp;} else if(source==='shape'){cell.char=chooseShapeChar();cell.next=now+Math.max(110,(shape?.mutation||240)+rand(-20,120))/sp;} else if(source==='clickFill'){cell.char=chooseFill(cell,now,energy>.45);cell.next=now+(energy>.45?rand(55,120):rand(80,160))/sp;} else if(source==='musicGrid'){cell.char=chooseMusicFill(cell,now,type,energy>.45);cell.next=now+(energy>.45?rand(48,120):rand(75,160))/sp;} else if(source==='music'){cell.char=chooseMusicFill(cell,now,type,energy>.45);cell.next=now+(energy>.45?rand(45,110):rand(70,150))/sp;} else { if(Math.random()<.12){cell.visible=Math.random()<this.cfg.visible;cell.opacity=rand(.13,.32);} cell.char=cell.visible?chooseIdle():'';cell.next=now+rand(900,4200)/sp; } cell.source=source; }
    update(now, delta, cameraY = this.scrollY, perfProbe = null) {
      const simulationStartedAt = perfProbe?.enabled ? performance.now() : 0;
      this.updateScroll(cameraY);
      const mediaTime=this.mediaTime();
      this.ensureAmbient(now);
      for(const s of this.shapes){s.age+=delta;s.x+=s.dx*delta/1000;s.y+=s.dy*delta/1000;if(this.positionOverlaps(s,s)){s.dx*=-1;s.dy*=-1;}}
      this.clickGridFills=this.clickGridFills.filter(f=>now<=f.start+f.duration);
      this.clickRipples=this.clickRipples.filter(r=>now<=r.start+r.duration);
      if(this.music.mediaChangeSerial!==this.lastMediaChangeSerial){
        this.lastMediaChangeSerial=this.music.mediaChangeSerial;
        this.resetMediaEffectsForTime(mediaTime,now);
      } else {
        this.musicGridFills=this.musicGridFills.filter(f=>this.isEffectActiveOrPending(f,now,mediaTime));
        this.musicRipples=this.musicRipples.filter(r=>this.isEffectActiveOrPending(r,now,mediaTime));
        this.detailRipples=this.detailRipples.filter(r=>this.isEffectActiveOrPending(r,now,mediaTime));
        this.reconstructTimelineEffects(mediaTime,now);
      }
      if(this.music.state.beatSerial!==this.lastBeatSerial){this.lastBeatSerial=this.music.state.beatSerial;const event=this.music.state.timelineRippleEvent;this.spawnMusicRipple(now,this.music.state.beat,event);if(event)this.music.state.timelineRippleEvent=null;}
      if(this.music.state.detailSerial!==this.lastDetailSerial){this.lastDetailSerial=this.music.state.detailSerial;this.spawnDetailRipple(now);}
      if(this.music.state.musicGridSerial!==this.lastMusicGridSerial){this.lastMusicGridSerial=this.music.state.musicGridSerial;const event=this.music.state.timelineGridEvent;this.addMusicGridFill(now,this.music.state.musicGridType,this.music.state.musicGridStrength,this.music.state.musicGridHz,event);if(event)this.music.state.timelineGridEvent=null;}
      if (perfProbe?.enabled && perfProbe.current) perfProbe.current.sections['ascii.simulation'] = (perfProbe.current.sections['ascii.simulation'] || 0) + (performance.now() - simulationStartedAt);
      if (perfProbe) perfProbe.section('ascii.raster', () => this.render(delta,now,mediaTime,perfProbe));
      else this.render(delta,now,mediaTime);
    }
    render(delta,now,mediaTime=this.mediaTime(),perfProbe=null){
      const ctx=this.ctx;
      const workerRenderer=this.workerRenderer;
      const mediaNow=this.mediaNowMs(mediaTime);
      const lightTheme=this.themeMode()==='light';
      const timelineBrightness=this.music?.state?.timelineAsciiBrightness;
      const asciiBrightness=normalizeAsciiBrightness(Number.isFinite(timelineBrightness)?timelineBrightness:this.shader.state.asciiBrightness);
      const shaderTone=this.shader.state.asciiTone==='shader';
      const tintStrength=this.shader.state.asciiTintStrength;
      const shaderSampler=shaderTone?this.shader.prepareAsciiSampler(this.scrollY):null;
      const collectFrameMetrics=!!(perfProbe?.collectAsciiMetrics||this.options.studio||this.options.debug);
      const frameMetrics=collectFrameMetrics
        ? {at:Math.round(now),mediaTime:roundTimeline(mediaTime),width:this.w,height:this.h,cols:this.cols,rows:this.rows,scrollY:Math.round(this.scrollY),visibleCells:0,drawnCells:0,activeCells:0,brightnessSum:0,alphaSum:0,sourceCounts:{},brightnessHistogram:Array(10).fill(0)}
        : null;
      if (perfProbe?.collectPresentationMetrics) {
        frameMetrics.changedCells = 0;
        frameMetrics.mutatedCells = 0;
      }
      const decay=Math.pow(this.cfg.hoverDecay,delta/16.67),pointerStroke=this.preparePointerStroke(now),vr=this.visibleRows(1);
      const effectScratch=this.effectScratch;
      const workerBuilder=workerRenderer?.begin((vr.bottom-vr.top+1)*this.cols)||null;
      if(ctx){
        ctx.shadowColor='transparent';
        ctx.shadowBlur=0;
        ctx.shadowOffsetX=0;
        ctx.shadowOffsetY=0;
        this.paintBackdrop(ctx,now,lightTheme);
        ctx.shadowOffsetY=lightTheme?.25:0;
        ctx.font=`${this.cfg.fontSize}px ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace`;
        ctx.textBaseline='top';
      }
      if(frameMetrics){
        frameMetrics.visibleRows={top:vr.top,bottom:vr.bottom};
        frameMetrics.totalCells=this.cells.length;
      }
      for(let row=vr.top;row<=vr.bottom;row++){
      const rowCells=this.cellRows[row];
      if(!rowCells)continue;
      for(const cell of rowCells){
        const screenY=cell.y-this.scrollY;
        if(screenY>this.h||screenY+this.cfg.cellH<0)continue;
        if(frameMetrics)frameMetrics.visibleCells++;
        cell.hover*=decay;
        if(pointerStroke)cell.hover=Math.max(cell.hover,this.pointerHoverEnergy(cell,pointerStroke));
        const shape=this.shapeEnergy(cell,now,effectScratch.shape),beat=this.rippleInfo(cell,now,this.musicRipples,mediaTime,effectScratch.beat),detail=this.rippleInfo(cell,now,this.detailRipples,mediaTime,effectScratch.detail),musicRipple=detail.energy>beat.energy?detail:beat,clickRipple=this.rippleInfo(cell,now,this.clickRipples,mediaTime,effectScratch.clickRipple);
        const musicGrid=this.gridInfo(cell,now,this.musicGridFills,0,mediaTime,effectScratch.musicGrid);
        const protect=(this.music.state.playing&&this.music.state.enabled)?clamp(Math.max(musicRipple.energy*1.2,musicGrid.energy*.8),0,.85):0;
        const clickGrid=this.gridInfo(cell,now,this.clickGridFills,protect,mediaTime,effectScratch.clickGrid);
        const hover=cell.hover;
        let source='idle',srcShape=null,eng=Math.max(hover,clickRipple.energy,musicRipple.energy,musicGrid.energy,shape.energy,clickGrid.energy),type='';
        if(hover>.16)source='hover';
        else if(clickRipple.energy>.12){source='music';type=clickRipple.type;}
        else if(musicRipple.energy>.12){source='music';type=musicRipple.type;}
        else if(musicGrid.energy>.16){source='musicGrid';type=musicGrid.type;}
        else if(shape.energy>.12){source='shape';srcShape=shape.shape;}
        else if(clickGrid.energy>.32)source='clickFill';
        const mediaDriven=source==='musicGrid'||(source==='music'&&musicRipple.energy>=clickRipple.energy);
        const sourceNow=mediaDriven?mediaNow:now;
        if(sourceNow>=cell.next||(source!==cell.source&&source!=='idle')||(source==='idle'&&cell.source!=='idle')){
          this.mutate(cell,source,sourceNow,srcShape,eng,type);
          if (perfProbe?.collectPresentationMetrics) frameMetrics.mutatedCells++;
        }
        else cell.source=source;
        let char=source==='idle'?(cell.visible?cell.char:''):cell.char;
        if(!char&&clickRipple.energy>.032&&hash01(cell.col,cell.row,cell.seed+Math.floor(now/74))<clickRipple.reveal)char=chooseMusicFill(cell,now,clickRipple.type,false);
        if(!char&&musicRipple.energy>.032&&hash01(cell.col,cell.row,cell.seed+Math.floor(mediaNow/70))<musicRipple.reveal)char=chooseMusicFill(cell,mediaNow,musicRipple.type,musicRipple.aggressive);
        if(!char&&musicGrid.energy>.045&&hash01(cell.col,cell.row,cell.seed+Math.floor(mediaNow/82))<musicGrid.reveal)char=chooseMusicFill(cell,mediaNow,musicGrid.type,musicGrid.aggressive);
        if(!char&&clickGrid.energy>.045&&hash01(cell.col,cell.row,cell.seed+Math.floor(now/92))<clickGrid.reveal)char=chooseFill(cell,now,clickGrid.aggressive);
        if(!char){
          cell.lastDrawChar=' ';cell.lastDrawGray=0;cell.lastDrawAlpha=0;cell.lastDrawSource=source;
          if (perfProbe?.collectPresentationMetrics) {
            const presentationKey = ` |0|0|${source}`;
            if (cell.__perfPresentationKey !== presentationKey) frameMetrics.changedCells++;
            cell.__perfPresentationKey = presentationKey;
          }
          continue;
        }
        let alpha=cell.visible?cell.opacity:0;
        if(shape.energy>.01)alpha=Math.max(alpha,.28+shape.energy*.43);
        if(hover>.01)alpha=Math.max(alpha,.19+hover*.68);
        if(clickRipple.energy>.01)alpha=Math.max(alpha,.15+clickRipple.energy*.52);
        if(musicRipple.energy>.01)alpha=Math.max(alpha,.14+musicRipple.energy*(musicRipple.aggressive?.56:.42));
        if(musicGrid.energy>.01)alpha=Math.max(alpha,.13+musicGrid.energy*(musicGrid.aggressive?.58:.44));
        if(clickGrid.energy>.01)alpha=Math.max(alpha,.12+clickGrid.energy*(clickGrid.aggressive?.55:.40));
        const active=eng;
        const activeNow=mediaDriven?mediaNow:now;
        alpha=clamp(alpha+(hash01(cell.col,cell.row,cell.seed+Math.floor(activeNow/64))-.42)*.10*active,0,.88);
        if(alpha<=.025){
          cell.lastDrawChar=' ';cell.lastDrawGray=0;cell.lastDrawAlpha=0;cell.lastDrawSource=source;
          if (perfProbe?.collectPresentationMetrics) {
            const presentationKey = ` |0|0|${source}`;
            if (cell.__perfPresentationKey !== presentationKey) frameMetrics.changedCells++;
            cell.__perfPresentationKey = presentationKey;
          }
          continue;
        }
        const gray=Math.round(clamp(82+active*96+clickGrid.energy*16+musicGrid.energy*18+hover*8+musicRipple.energy*22+clickRipple.energy*24,66,210));
        cell.lastDrawChar=char;
        cell.lastDrawGray=gray;
        cell.lastDrawAlpha=alpha;
        cell.lastDrawSource=source;
        if(frameMetrics){
          frameMetrics.drawnCells++;
          if(active>.08)frameMetrics.activeCells++;
          frameMetrics.brightnessSum+=gray;
          frameMetrics.alphaSum+=alpha;
          frameMetrics.sourceCounts[source]=(frameMetrics.sourceCounts[source]||0)+1;
          frameMetrics.brightnessHistogram[clamp(Math.floor(gray/25),0,9)]++;
        }
        let jx=0,jy=0;
        if(active>.68){
          jx=Math.round((hash01(cell.col,cell.row,cell.seed+Math.floor(activeNow/76))-.5)*2);
          jy=Math.round((hash01(cell.row,cell.col,cell.seed+Math.floor(activeNow/76))-.5)*2);
        }
        const sampleY=cell.centerY-this.scrollY;
        const needsMainThreadStyle=!!ctx||!!perfProbe?.collectPresentationMetrics;
        const fillStyle=needsMainThreadStyle?this.tint(cell,gray,alpha,active,sampleY,lightTheme,asciiBrightness,shaderTone,tintStrength,shaderSampler):'';
        if(needsMainThreadStyle)cell.lastDrawStyle=fillStyle;
        if (perfProbe?.collectPresentationMetrics) {
          const presentationKey = `${char}|${gray}|${alpha.toFixed(5)}|${fillStyle}|${jx}|${jy}|${source}`;
          if (cell.__perfPresentationKey !== presentationKey) frameMetrics.changedCells++;
          cell.__perfPresentationKey = presentationKey;
        }
        if(ctx){
          ctx.fillStyle=fillStyle;
          if(this.rendererMode==='compare'&&this.options.asciiCompareShadows===false){
            ctx.shadowColor='transparent';
            ctx.shadowBlur=0;
          }else{
            this.applyGlyphShadow(ctx,active,alpha,lightTheme);
          }
          ctx.fillText(char,cell.x+jx,screenY+jy);
        }
        if(workerBuilder){
          let workerShadowColor='',workerShadowBlur=0;
          if(workerBuilder.providedStyles){
            if(this.options.asciiCompareShadows===false){
              workerShadowColor='transparent';
              workerShadowBlur=0;
            }else if(lightTheme){
              workerShadowColor=`rgba(48,44,37,${clamp(.11+alpha*.16+active*.10,.11,.32).toFixed(3)})`;
              workerShadowBlur=active>.16?2.25:1.1;
            }else{
              workerShadowColor=`rgba(255,232,186,${clamp(.04+alpha*.10+active*.07,.04,.20).toFixed(3)})`;
              workerShadowBlur=active>.16?2.2:.9;
            }
          }
          workerRenderer.push(workerBuilder,char,cell.x+jx,screenY+jy,cell.centerX,sampleY,gray,alpha,active,fillStyle,workerShadowColor,workerShadowBlur);
        }
      }
      }
      if(ctx){
        ctx.shadowColor='transparent';
        ctx.shadowBlur=0;
        ctx.shadowOffsetX=0;
        ctx.shadowOffsetY=0;
      }
      if(workerBuilder){
        const workerSequence=workerRenderer.commit(workerBuilder,this.workerFrameSnapshot(now,lightTheme,asciiBrightness,shaderTone,tintStrength,shaderSampler));
        this.captureRendererComparison(workerSequence);
        if(perfProbe?.enabled){
          this.workerDiagPublishFrame=(this.workerDiagPublishFrame||0)+1;
          if(this.workerDiagPublishFrame%24===0)this.canvas.dataset.asciiWorkerDiagnostics=JSON.stringify(workerRenderer.diagnostics());
        }
      }
      if(frameMetrics){
        frameMetrics.averageBrightness=frameMetrics.drawnCells?roundTimeline(frameMetrics.brightnessSum/frameMetrics.drawnCells,2):0;
        frameMetrics.averageAlpha=frameMetrics.drawnCells?roundTimeline(frameMetrics.alphaSum/frameMetrics.drawnCells,3):0;
        frameMetrics.density=frameMetrics.visibleCells?roundTimeline(frameMetrics.drawnCells/frameMetrics.visibleCells,4):0;
        if(workerRenderer)frameMetrics.worker=workerRenderer.diagnostics();
        this.lastFrameMetrics=frameMetrics;
        perfProbe?.noteAscii(frameMetrics);
      }
      if (this.options.studio || this.options.debug) {
        window.debugAsciiEffects={musicRipples:this.musicRipples.length,detailRipples:this.detailRipples.length,clickRipples:this.clickRipples.length,clickGridFills:this.clickGridFills.length,musicGridFills:this.musicGridFills.length,shapeCount:this.shapes.length,pitchRise:this.music.state.pitchRise,centroidHz:this.music.state.centroidHz,gridImpact:this.music.state.gridImpact,clickProtection:this.music.state.playing,scrollY:this.scrollY,worldH:this.worldH};
      } else if (window.debugAsciiEffects) {
        delete window.debugAsciiEffects;
      }
    }
    rendererDiagnostics() {
      return {
        mode:this.workerRenderer?this.rendererMode:'legacy',
        fallbackReason:this.workerFailureReason||'',
        worker:this.workerRenderer?.diagnostics?.()||null,
        comparison:this.compareResults.slice()
      };
    }
    canvasFrameStats(maxSamples=6000) {
      const out={safe:false,width:this.canvas.width,height:this.canvas.height,samples:0,hash:'',histogram:Array(16).fill(0),averageBrightness:0};
      if(!this.ctx){out.error='Canvas pixels are owned by the worker renderer.';return out;}
      try{
        const w=this.canvas.width,h=this.canvas.height;
        if(!w||!h)return out;
        const data=this.ctx.getImageData(0,0,w,h).data;
        const step=Math.max(1,Math.floor(Math.sqrt((w*h)/Math.max(1,maxSamples))));
        let sum=0,hash=2166136261,count=0;
        for(let y=0;y<h;y+=step){
          for(let x=0;x<w;x+=step){
            const i=(y*w+x)*4,r=data[i],g=data[i+1],b=data[i+2],lum=Math.round(r*.299+g*.587+b*.114);
            out.histogram[clamp(Math.floor(lum/16),0,15)]++;
            sum+=lum; count++;
            hash^=(lum+((x&255)<<8)+((y&255)<<16)); hash=Math.imul(hash,16777619)>>>0;
          }
        }
        out.safe=true; out.samples=count; out.hash=hash.toString(16).padStart(8,'0'); out.averageBrightness=count?roundTimeline(sum/count,2):0;
      }catch(error){out.error=String(error?.message||error);}
      return out;
    }
    dumpAsciiGrid(options={}) {
      this.updateScroll();
      const maxCols=Math.max(12,Math.min(140,Math.floor(Number(options.maxCols)||96)));
      const maxRows=Math.max(6,Math.min(80,Math.floor(Number(options.maxRows)||42)));
      const vr=this.visibleRows(0);
      const rowSpan=Math.max(1,vr.bottom-vr.top+1);
      const rowStep=Math.max(1,Math.ceil(rowSpan/maxRows));
      const colStep=Math.max(1,Math.ceil(this.cols/maxCols));
      const textRows=[],rawTextRows=[],brightnessRows=[];
      for(let row=vr.top;row<=vr.bottom;row+=rowStep){
        let text='',rawText='',bright='';
        for(let col=0;col<this.cols;col+=colStep){
          const cell=this.cells[row*this.cols+col];
          if(!cell){text+=' ';rawText+=' ';bright+='0';continue;}
          const rawCh=cell.lastDrawChar&&cell.lastDrawChar!==' '?cell.lastDrawChar:(cell.visible?cell.char:' ');
          const gray=Number(cell.lastDrawGray)||0,alpha=Number(cell.lastDrawAlpha)||0;
          const level=clamp(Math.round((gray/245)*9*clamp(alpha*1.35,0,1)),0,9);
          const ch=rawCh&&rawCh!==' '?rawCh:(level>0?DUMP_BRIGHTNESS_RAMP[level]:' ');
          text+=(ch||' ').slice(0,1);
          rawText+=(rawCh||' ').slice(0,1);
          bright+=String(level);
        }
        textRows.push(text.replace(/\s+$/,''));
        rawTextRows.push(rawText.replace(/\s+$/,''));
        brightnessRows.push(bright.replace(/0+$/,''));
      }
      return {mediaTime:roundTimeline(this.mediaTime()),scrollY:Math.round(this.scrollY),cols:this.cols,rows:this.rows,visibleRows:{top:vr.top,bottom:vr.bottom},sample:{colStep,rowStep},text:textRows.join('\n'),rawText:rawTextRows.join('\n'),brightness:brightnessRows.join('\n')};
    }
  }

  class StatsCardsController {
    constructor(app, options = {}) {
      this.app = app;
      this.options = options;
      this.root = app.uiRoot || app.root;
      this.abort = null;
      this.nodes = {
        leetcodeTotal: this.root.querySelector('#leetcode-total'),
        leetcodeEasy: this.root.querySelector('#leetcode-easy'),
        leetcodeMedium: this.root.querySelector('#leetcode-medium'),
        leetcodeHard: this.root.querySelector('#leetcode-hard'),
        githubTotal: this.root.querySelector('#github-total'),
        githubMap: this.root.querySelector('#github-map')
      };
      this.render(this.emptyData('Loading'));
      this.load();
      this.refreshTimer = window.setInterval(() => this.load(), 5 * 60 * 1000);
    }

    asset(path) {
      if (/^(https?:|data:|blob:|\/)/i.test(path)) return path;
      return `${this.options.assetBase || ''}${path}`;
    }

    emptyData(source = 'fallback-unavailable') {
      return {
        source,
        updatedAt: '',
        leetcode: { username: 'nikshithnayak', totalSolved: '60+', easySolved: '35+', mediumSolved: '22+', hardSolved: '3+', source },
        github: { username: 'Nikshithnayak', totalContributions: null, weeks: [], source }
      };
    }

    async fetchJson(url, signal) {
      const response = await fetch(url, { cache: 'no-cache', signal });
      if (!response.ok) throw new Error(`Stats fetch failed: ${response.status}`);
      return response.json();
    }

    async fetchLiveGithub(username, signal) {
      const counts = new Map();
      let total = 0;
      for (let page = 1; page <= 10; page++) {
        const events = await this.fetchJson(`https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=100&page=${page}`, signal);
        if (!Array.isArray(events) || !events.length) break;
        for (const event of events) {
          const date = String(event.created_at || '').slice(0, 10);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
          const amount = event.type === 'PushEvent'
            ? Math.max(1, event.payload?.distinct_size || event.payload?.size || event.payload?.commits?.length || 1)
            : 1;
          counts.set(date, (counts.get(date) || 0) + amount);
          total += amount;
        }
        if (events.length < 100) break;
      }
      const today = new Date();
      const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
      end.setUTCDate(end.getUTCDate() - end.getUTCDay() + 6);
      const start = new Date(end);
      start.setUTCDate(start.getUTCDate() - 52 * 7);
      const weeks = [];
      for (let week = 0; week < 53; week++) {
        const days = [];
        for (let day = 0; day < 7; day++) {
          const date = new Date(start);
          date.setUTCDate(start.getUTCDate() + week * 7 + day);
          const key = date.toISOString().slice(0, 10);
          const count = counts.get(key) || 0;
          days.push({ date: key, count, level: count >= 12 ? 4 : count >= 8 ? 3 : count >= 4 ? 2 : count >= 1 ? 1 : 0 });
        }
        weeks.push({ days });
      }
      return { username, totalContributions: total, weeks, source: 'GitHub public events' };
    }

    async load() {
      this.abort?.abort();
      this.abort = new AbortController();
      const signal = this.abort.signal;
      const apiUrl = this.options.statsApiUrl || '/api/profile-stats';
      let data = this.emptyData('fallback-unavailable');
      const shouldFetchApi = !!this.options.statsApiUrl || window.location.protocol !== 'file:';
      if (shouldFetchApi) {
        try {
          data = await this.fetchJson(apiUrl, signal);
        } catch (_) {}
      } else {
        try { data = await this.fetchJson(this.asset('assets/stats/profile-stats.fallback.json'), signal); } catch (_) {}
      }
      try {
        const username = data.github?.username || this.emptyData().github.username;
        data = { ...data, github: await this.fetchLiveGithub(username, signal) };
      } catch (_) {}
      if (!signal.aborted) this.render(data);
    }

    leetcodeParts(data = {}) {
      const rawTotal = data.totalSolved ?? data.total ?? data.all;
      const rawEasy = data.easySolved ?? data.easy;
      const rawMedium = data.mediumSolved ?? data.medium;
      const rawHard = data.hardSolved ?? data.hard;
      return {
        total: this.statNumber(rawTotal),
        easy: this.statNumber(rawEasy),
        medium: this.statNumber(rawMedium),
        hard: this.statNumber(rawHard),
        totalDisplay: rawTotal,
        easyDisplay: rawEasy,
        mediumDisplay: rawMedium,
        hardDisplay: rawHard
      };
    }

    statNumber(value) {
      if (value === null || value === undefined || value === '') return null;
      const n = Number(typeof value === 'string' ? value.replace(/,/g, '').replace(/\+$/, '') : value);
      return Number.isFinite(n) && n >= 0 ? n : null;
    }

    setSplitRow(id, value, total, displayValue = value) {
      const node = this.nodes[id];
      const row = node?.closest('.ascii-leetcode-row');
      if (node) {
        node.textContent = formatStatNumber(displayValue);
        if (Number.isFinite(value)) node.dataset.value = String(value);
        else delete node.dataset.value;
      }
      if (row) {
        const ratio = Number.isFinite(value) ? clamp(value / LEETCODE_SPLIT_BAR_MAX, 0, 1) : 0;
        row.style.setProperty('--solved', `${ratio * 100}%`);
      }
    }

    weekday(date) {
      const day = new Date(`${date}T00:00:00Z`).getUTCDay();
      return Number.isFinite(day) ? day : 0;
    }

    emptyWeeks() {
      const weeks = [];
      for (let w = 0; w < 53; w++) {
        const days = [];
        for (let d = 0; d < 7; d++) days.push({ date: '', count: 0, level: 0 });
        weeks.push({ days });
      }
      return weeks;
    }

    normalizeWeeks(github = {}) {
      const sourceWeeks = Array.isArray(github.weeks) ? github.weeks : Array.isArray(github.calendar?.weeks) ? github.calendar.weeks : [];
      if (!sourceWeeks.length) return this.emptyWeeks();
      return sourceWeeks.map((week) => {
        const rawDays = Array.isArray(week.days) ? week.days : Array.isArray(week.contributionDays) ? week.contributionDays : [];
        const byDay = new Map();
        for (const day of rawDays) {
          const date = day.date || '';
          byDay.set(Number.isFinite(day.weekday) ? day.weekday : this.weekday(date), {
            date,
            count: Number(day.count ?? day.contributionCount ?? 0) || 0,
            level: this.levelValue(day.level ?? day.contributionLevel)
          });
        }
        const days = [];
        for (let i = 0; i < 7; i++) days.push(byDay.get(i) || { date: '', count: 0, level: 0 });
        return { days };
      }).slice(-53);
    }

    levelValue(level) {
      if (Number.isFinite(Number(level))) return clamp(Number(level), 0, 4);
      const text = String(level || '').toUpperCase();
      if (text.includes('FOURTH')) return 4;
      if (text.includes('THIRD')) return 3;
      if (text.includes('SECOND')) return 2;
      if (text.includes('FIRST')) return 1;
      return 0;
    }

    renderGithubMap(github = {}) {
      const map = this.nodes.githubMap;
      if (!map) return;
      const weeks = this.normalizeWeeks(github);
      map.replaceChildren();
      for (const week of weeks) {
        for (const day of week.days) {
          const cell = document.createElement('span');
          cell.className = 'ascii-github-day';
          cell.dataset.level = String(this.levelValue(day.level));
          cell.title = day.date ? `${formatNumber(day.count)} contributions on ${day.date}` : 'No contribution data';
          map.appendChild(cell);
        }
      }
    }

    render(data = {}) {
      const source = data.source || 'fallback';
      const leetcode = data.leetcode || {};
      const github = data.github || {};
      const parts = this.leetcodeParts(leetcode);
      if (this.nodes.leetcodeTotal) this.nodes.leetcodeTotal.textContent = formatStatNumber(parts.totalDisplay ?? parts.total);
      this.setSplitRow('leetcodeEasy', parts.easy, parts.total, parts.easyDisplay);
      this.setSplitRow('leetcodeMedium', parts.medium, parts.total, parts.mediumDisplay);
      this.setSplitRow('leetcodeHard', parts.hard, parts.total, parts.hardDisplay);
      if (this.nodes.githubTotal) this.nodes.githubTotal.textContent = formatStatNumber(this.statNumber(github.totalContributions ?? github.total));
      this.renderGithubMap(github);
    }

    update() {}

    destroy() {
      this.abort?.abort();
      if (this.refreshTimer) window.clearInterval(this.refreshTimer);
      this.refreshTimer = 0;
    }
  }

  class MarketQuoteController {
    constructor(app, options = {}) {
      this.app = app;
      this.options = options;
      this.root = app.uiRoot || app.root;
      this.abort = null;
      this.timer = null;
      this.card = this.root.querySelector('[data-market-quote-card]');
      this.quotes = [
        this.quoteNodes('spy', 'SPY', 'SPDR S&P 500 ETF Trust', '/api/spy-quote', 'assets/market/spy-quote.fallback.json'),
        this.quoteNodes('qqq', 'QQQ', 'Invesco QQQ Trust', '/api/qqq-quote', 'assets/market/qqq-quote.fallback.json')
      ];
      for (const quote of this.quotes) this.render(quote, this.emptyData('Loading', quote.symbol));
      this.load();
      this.timer = window.setInterval(() => this.load(), this.options.marketQuoteRefreshMs || MARKET_QUOTE_REFRESH_MS);
    }

    asset(path) {
      if (/^(https?:|data:|blob:|\/)/i.test(path)) return path;
      return `${this.options.assetBase || ''}${path}`;
    }

    quoteNodes(prefix, symbol, displayName, apiUrl, fallbackPath) {
      return {
        prefix,
        symbol,
        displayName,
        apiUrl,
        fallbackPath,
        pane: this.root.querySelector(`[data-${prefix}-ticker-pane]`),
        symbolNode: this.root.querySelector(`[data-${prefix}-symbol]`),
        name: this.root.querySelector(`[data-${prefix}-name]`),
        date: this.root.querySelector(`[data-${prefix}-date]`),
        price: this.root.querySelector(`[data-${prefix}-price]`),
        change: this.root.querySelector(`[data-${prefix}-change]`),
        openLine: this.root.querySelector(`[data-${prefix}-open-line]`),
        sparkline: this.root.querySelector(`[data-${prefix}-sparkline-line]`)
      };
    }

    emptyData(source = 'fallback-unavailable', symbol = 'SPY') {
      const instrument = symbol === 'QQQ'
        ? { symbol: 'QQQ', displayName: 'Invesco QQQ Trust' }
        : { symbol: 'SPY', displayName: 'SPDR S&P 500 ETF Trust' };
      return {
        source,
        ...instrument,
        currency: 'USD',
        price: null,
        openPrice: null,
        change: null,
        changePercent: null,
        updatedAt: '',
        points: []
      };
    }

    async fetchJson(url, signal) {
      const response = await fetch(url, { cache: 'no-cache', signal });
      if (!response.ok) throw new Error(`Market quote fetch failed: ${response.status}`);
      return response.json();
    }

    async load() {
      this.abort?.abort();
      this.abort = new AbortController();
      const signal = this.abort.signal;
      await Promise.all(this.quotes.map((quote) => this.loadQuote(quote, signal)));
    }

    async loadQuote(quote, signal) {
      const configuredUrl = quote.symbol === 'SPY'
        ? this.options.marketQuoteApiUrl
        : this.options.qqqMarketQuoteApiUrl;
      const apiUrl = configuredUrl || quote.apiUrl;
      let data = null;
      const shouldFetchApi = !!configuredUrl || window.location.protocol !== 'file:';
      if (shouldFetchApi) {
        try {
          data = await this.fetchJson(apiUrl, signal);
        } catch (_) {
          return;
        }
      } else {
        try {
          data = await this.fetchJson(this.asset(quote.fallbackPath), signal);
        } catch (_) {
          data = this.emptyData('fallback-missing', quote.symbol);
        }
      }
      if (!signal.aborted) this.render(quote, data);
    }

    number(value) {
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    }

    formatPrice(value, currency = 'USD') {
      const n = this.number(value);
      if (n === null) return '$---.--';
      const text = n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return String(currency || 'USD').toUpperCase() === 'USD' ? `$${text}` : text;
    }

    formatChange(value) {
      const n = this.number(value);
      if (n === null) return '--.--';
      const sign = n > 0 ? '+' : '';
      return `${sign}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    chartGeometry(points = [], openPrice = null) {
      const values = points
        .map((point) => this.number(point?.price ?? point?.close ?? point))
        .filter((value) => value !== null);
      if (values.length < 2) return { path: '', openY: null };
      const sampleCount = Math.min(42, values.length);
      const sampled = Array.from({ length: sampleCount }, (_, index) => (
        values[Math.round(index * (values.length - 1) / Math.max(1, sampleCount - 1))]
      ));
      const reference = this.number(openPrice);
      const domain = reference === null ? sampled : [...sampled, reference];
      let min = Math.min(...domain), max = Math.max(...domain);
      if (Math.abs(max - min) < .0001) {
        min -= 1;
        max += 1;
      }
      const padding = (max - min) * .06;
      min -= padding;
      max += padding;
      const w = 65, h = 18, x0 = 4, y0 = 7;
      const yFor = (value) => y0 + (1 - (value - min) / (max - min)) * h;
      const path = sampled.map((value, index) => {
        const x = x0 + (sampled.length === 1 ? 0 : index / (sampled.length - 1) * w);
        const y = yFor(value);
        return `${index ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`;
      }).join(' ');
      return { path, openY: reference === null ? null : yFor(reference) };
    }

    renderSparkline(nodes, points, openPrice, direction) {
      const geometry = this.chartGeometry(points, openPrice);
      nodes.sparkline?.setAttribute('d', geometry.path);
      if (nodes.sparkline) nodes.sparkline.style.opacity = geometry.path ? '1' : '0';
      if (nodes.openLine) {
        const y = geometry.openY === null ? 17 : geometry.openY;
        nodes.openLine.setAttribute('y1', y.toFixed(2));
        nodes.openLine.setAttribute('y2', y.toFixed(2));
        nodes.openLine.style.opacity = geometry.openY === null ? '0' : '1';
        const formattedOpen = this.formatPrice(openPrice);
        nodes.openLine.setAttribute('aria-label', `Open ${formattedOpen}`);
      }
      if (nodes.pane?.dataset) nodes.pane.dataset.marketDirection = direction;
    }

    formatAsOf(value) {
      const date = new Date(value || '');
      if (!Number.isFinite(date.getTime())) return 'As of ---';
      return `As of ${new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Chicago',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(date)}`;
    }

    render(nodes, data = {}) {
      const symbol = String(data.symbol || nodes.symbol).toUpperCase();
      const name = data.displayName || data.shortName || nodes.displayName;
      const price = this.number(data.price ?? data.regularMarketPrice);
      const openPrice = this.number(data.openPrice ?? data.regularMarketOpen);
      const change = this.number(data.change);
      const direction = change === null ? 'flat' : change < 0 ? 'down' : change > 0 ? 'up' : 'flat';
      const asOf = data.providerAsOf || data.updatedAt;
      if (nodes.symbolNode) nodes.symbolNode.textContent = symbol;
      if (nodes.name) nodes.name.textContent = name;
      if (nodes.date) {
        nodes.date.textContent = this.formatAsOf(asOf);
        nodes.date.dateTime = asOf || '';
      }
      if (nodes.price) nodes.price.textContent = this.formatPrice(price, data.currency);
      if (nodes.change) nodes.change.textContent = this.formatChange(change);
      if (nodes.pane && asOf) nodes.pane.title = `${symbol} market data as of ${asOf}`;
      if (this.card?.dataset) this.card.dataset[`${nodes.prefix}MarketSource`] = data.source || 'fallback';
      this.renderSparkline(nodes, Array.isArray(data.points) ? data.points : [], openPrice, direction);
    }

    update() {}

    destroy() {
      this.abort?.abort();
      if (this.timer) window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  class ChicagoLocationCardController {
    constructor(root) {
      this.root = root;
      this.card = root.querySelector('[data-chicago-location-card]');
      this.time = root.querySelector('[data-chicago-location-time]');
      this.timer = null;
      this.formatter = null;
      if (!this.card || !this.time) return;
      try {
        this.formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23'
        });
      } catch (_) {
        this.formatter = null;
      }
      this.update();
      this.timer = window.setInterval(() => this.update(), 1000);
    }

    format(now) {
      if (this.formatter) return this.formatter.format(now);
      return now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    }

    update() {
      if (!this.time) return;
      const now = new Date();
      const timeText = this.format(now);
      this.time.textContent = timeText;
      this.time.dateTime = now.toISOString();
      this.time.setAttribute('aria-label', `Mangalore time ${timeText}`);
      if (this.card) this.card.title = `Mangalore, India ${timeText}`;
    }

    destroy() {
      if (this.timer) window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  class PlayerTrayController {
    constructor(app, options = {}) {
      this.app = app;
      this.options = options;
      this.root = app.root;
      this.zone = this.root.querySelector('#player-tray-zone');
      this.tray = this.root.querySelector('#player-tray');
      this.title = this.root.querySelector('#tray-track-title');
      this.time = this.root.querySelector('#tray-time');
      this.coverWrap = this.root.querySelector('#tray-cover-wrap');
      this.coverImage = this.root.querySelector('#tray-cover');
      this.progressShell = this.root.querySelector('#tray-progress-shell');
      this.progress = this.root.querySelector('#tray-progress');
      this.collapsedFill = this.root.querySelector('#tray-collapsed-progress-fill');
      this.collapsedFill?.style.removeProperty('width');
      this.playButton = this.root.querySelector('#tray-play');
      this.prevButton = this.root.querySelector('#tray-prev');
      this.nextButton = this.root.querySelector('#tray-next');
      this.volumeShell = this.root.querySelector('#tray-volume-shell');
      this.volume = this.root.querySelector('#tray-volume');
      this.expanded = true;
      this.hovering = false;
      this.dragging = false;
      this.volumeDragging = false;
      this.lastRefreshAt = 0;
      this.lastCollapsedProgress = -1;
      this.lastTitle = '';
      this.lastTitleUrl = '';
      this.lastCover = '';
      this.coverToken = 0;
      this.hideTimer = 0;
      this.introTimer = 0;
      this.destroyed = false;
      this.cleanup = [];
      if (!this.tray) return;
      this.bind();
      this.setExpanded(true);
      this.preloadDuration();
      this.introTimer = window.setTimeout(() => this.scheduleHide(0), 4000);
      this.refresh(true);
    }

    listen(target, type, handler, options) {
      target?.addEventListener(type, handler, options);
      this.cleanup.push(() => target?.removeEventListener(type, handler, options));
    }

    bind() {
      const stop = (event) => event.stopPropagation();
      ['pointerdown', 'mousedown', 'click', 'dblclick'].forEach((type) => this.listen(this.zone, type, stop));
      this.listen(this.zone, 'pointerenter', (event) => {
        if (event.pointerType === 'touch') return;
        this.hovering = true;
        this.open();
      });
      this.listen(this.zone, 'pointerleave', (event) => {
        if (event.pointerType === 'touch') return;
        this.hovering = false;
        this.scheduleHide(6600);
      });
      this.listen(this.zone, 'pointerdown', (event) => {
        if (event.pointerType === 'touch') this.open(4000);
      });
      this.listen(this.root.querySelector('#tray-collapsed-hit'), 'click', () => this.open(4000));
      this.listen(this.tray, 'click', (event) => {
        if (!this.expanded && event.target === this.tray) this.open(4000);
      });
      this.listen(this.playButton, 'click', () => {
        this.app.music.togglePlay();
        this.app.ui?.refresh();
        this.open(this.isCoarsePointer() ? 4000 : 1200);
        this.refresh(true);
      });
      this.listen(this.prevButton, 'click', () => {
        this.app.music.previousTrack();
        this.app.ui?.refresh();
        this.open(this.isCoarsePointer() ? 4000 : 1200);
        this.preloadDuration();
        this.refresh(true);
      });
      this.listen(this.nextButton, 'click', () => {
        this.app.music.nextTrack();
        this.app.ui?.refresh();
        this.open(this.isCoarsePointer() ? 4000 : 1200);
        this.preloadDuration();
        this.refresh(true);
      });
      this.listen(this.volume, 'pointerdown', (event) => {
        this.setVolumeDragging(true);
        try { this.volume?.setPointerCapture?.(event.pointerId); } catch {}
        this.open(this.isCoarsePointer() ? 4000 : 1200);
      });
      const endVolumeDrag = (event) => {
        try { this.volume?.releasePointerCapture?.(event.pointerId); } catch {}
        this.setVolumeDragging(false);
      };
      this.listen(this.volume, 'pointerup', endVolumeDrag);
      this.listen(this.volume, 'pointercancel', endVolumeDrag);
      this.listen(this.volume, 'input', () => {
        this.app.music.setVolume(Number(this.volume.value));
        this.open(this.isCoarsePointer() ? 4000 : 1200);
        this.refresh(true);
      });
      this.listen(this.volume, 'change', () => this.setVolumeDragging(false));
      this.listen(this.progress, 'pointerdown', () => {
        if (!this.app.music.state.duration) return;
        this.dragging = true;
        this.setSeeking(true);
        this.app.music.beginSeek();
        this.open();
      });
      this.listen(this.progress, 'input', () => {
        if (!this.app.music.state.duration) return;
        this.dragging = true;
        this.setSeeking(true);
        this.app.music.previewSeek(this.valueToSeconds());
        this.refresh(true);
      });
      this.listen(this.progress, 'change', () => {
        if (!this.app.music.state.duration) return;
        this.commitSeek();
      });
      this.listen(window, 'pointerup', () => {
        if (this.dragging) this.commitSeek();
        if (this.volumeDragging) this.setVolumeDragging(false);
      }, { capture: true });
      this.listen(window, 'pointercancel', () => {
        if (this.dragging) this.commitSeek();
        if (this.volumeDragging) this.setVolumeDragging(false);
      }, { capture: true });
      this.listen(window, 'blur', () => {
        if (this.dragging) this.commitSeek();
        if (this.volumeDragging) this.setVolumeDragging(false);
      });
      this.listen(document, 'visibilitychange', () => {
        if (!document.hidden) return;
        if (this.dragging) this.commitSeek();
        if (this.volumeDragging) this.setVolumeDragging(false);
      });
    }

    isCoarsePointer() {
      return window.matchMedia('(hover: none), (pointer: coarse)').matches;
    }

    preloadDuration() {
      this.app.music.preloadDuration().then(() => {
        if (!this.destroyed) this.refresh(true);
      });
    }

    valueToSeconds() {
      const duration = this.app.music.state.duration || 0;
      return duration * clamp(Number(this.progress.value) / 1000, 0, 1);
    }

    resolveAsset(src) {
      if (!src) return '';
      if (/^(blob:|data:|https?:)/i.test(src)) return src;
      return `${this.options.assetBase || ''}${src}`;
    }

    async loadCover(cover, token) {
      const image = new Image();
      image.decoding = 'async';
      image.loading = 'eager';
      image.src = cover;
      await new Promise((resolve, reject) => {
        if (image.complete) {
          if (image.naturalWidth > 0) resolve();
          else reject(new Error('Cover failed to load.'));
          return;
        }
        image.onload = resolve;
        image.onerror = reject;
      });
      if (image.decode) await image.decode().catch(() => {});
      if (this.destroyed || token !== this.coverToken || cover !== this.lastCover) return false;
      return true;
    }

    setCover(cover) {
      if (cover === this.lastCover) return;
      this.lastCover = cover;
      const token = ++this.coverToken;
      if (!cover) {
        this.coverWrap.classList.remove('has-cover');
        this.coverImage.removeAttribute('src');
        return;
      }
      this.loadCover(cover, token).then((ready) => {
        if (!ready || this.destroyed || token !== this.coverToken || cover !== this.lastCover) return;
        this.coverImage.src = cover;
        this.coverWrap.classList.add('has-cover');
      }).catch(() => {
        if (this.destroyed || token !== this.coverToken) return;
        this.coverWrap.classList.remove('has-cover');
        this.coverImage.removeAttribute('src');
      });
    }

    commitSeek() {
      this.dragging = false;
      this.setSeeking(false);
      this.app.music.commitSeek(this.valueToSeconds());
      this.app.ui?.refresh();
      this.open(this.isCoarsePointer() ? 4000 : 1200);
      this.refresh(true);
    }

    setSeeking(isSeeking) {
      this.tray.classList.toggle('is-seeking', Boolean(isSeeking));
    }

    setVolumeDragging(isDragging) {
      this.volumeDragging = Boolean(isDragging);
      this.tray.classList.toggle('is-volume-dragging', this.volumeDragging);
      if (!this.volumeDragging && document.activeElement === this.volume) this.volume.blur();
    }

    open(autoHideDelay = 0) {
      window.clearTimeout(this.introTimer);
      this.introTimer = 0;
      window.clearTimeout(this.hideTimer);
      this.setExpanded(true);
      this.preloadDuration();
      if (autoHideDelay) this.scheduleHide(autoHideDelay);
    }

    scheduleHide(delay = 800) {
      window.clearTimeout(this.hideTimer);
      this.hideTimer = window.setTimeout(() => {
        if (!this.hovering && !this.dragging && !this.volumeDragging) this.setExpanded(false);
      }, Math.max(0, delay));
    }

    setExpanded(value) {
      this.expanded = !!value;
      this.tray.classList.toggle('is-expanded', this.expanded);
      this.tray.classList.toggle('is-collapsed', !this.expanded);
      this.tray.setAttribute('aria-expanded', String(this.expanded));
      if (!this.expanded) this.updateCollapsedProgress(true);
    }

    updateTitleOverflow() {
      if (!this.title) return;
      this.title.classList.toggle('is-marquee', this.title.scrollWidth > this.title.clientWidth + 4);
    }

    youtubeUrlForTrack(track = {}) {
      const url = String(track?.youtubeUrl || track?.youtube?.url || '').trim();
      if (url) return url;
      const youtubeId = String(track?.youtubeId || track?.youtube?.id || '').trim();
      return youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : '';
    }

    playbackProgressRatio() {
      const m = this.app.music.state;
      const duration = m.duration || 0;
      const position = m.seeking ? m.seekPreview : m.position;
      return duration ? clamp(position / duration, 0, 1) : 0;
    }

    updateCollapsedProgress(force = false, ratio = this.playbackProgressRatio()) {
      if (!this.collapsedFill) return;
      if (!force && this.expanded) return;
      const next = clamp(Number(ratio) || 0, 0, 1);
      if (!force && Math.abs(next - this.lastCollapsedProgress) < 0.000001) return;
      this.lastCollapsedProgress = next;
      this.collapsedFill.style.setProperty('--player-collapsed-progress', next.toFixed(6));
    }

    refresh(force = false) {
      if (!this.tray || !this.title || !this.progressShell || !this.progress || !this.playButton) return;
      const m = this.app.music.state;
      const interval = m.playing || m.seeking ? 64 : 180;
      const now = performance.now();
      if (!force && now - this.lastRefreshAt < interval) return;
      this.lastRefreshAt = now;
      const track = this.app.music.currentTrack();
      const canCycleTracks = this.app.music.tracks.length > 1;
      if (this.prevButton) this.prevButton.disabled = !canCycleTracks;
      if (this.nextButton) this.nextButton.disabled = !canCycleTracks;
      const title = m.mediaError || (m.loading ? 'Loading...' : m.trackTitle || track?.title || 'Track');
      if (title !== this.lastTitle) {
        this.title.classList.remove('is-marquee');
        this.title.textContent = title;
        this.lastTitle = title;
        requestAnimationFrame(() => this.updateTitleOverflow());
      }
      const titleUrl = !m.mediaError && !m.loading ? this.youtubeUrlForTrack(track) : '';
      if (titleUrl !== this.lastTitleUrl) {
        if (titleUrl) {
          this.title.href = titleUrl;
          this.title.removeAttribute('aria-disabled');
          this.title.setAttribute('aria-label', `Open ${title} on YouTube`);
        } else {
          this.title.removeAttribute('href');
          this.title.setAttribute('aria-disabled', 'true');
          this.title.removeAttribute('aria-label');
        }
        this.lastTitleUrl = titleUrl;
      }
      const cover = this.resolveAsset(track?.cover || '');
      this.setCover(cover);
      const duration = m.duration || 0;
      const position = m.seeking ? m.seekPreview : m.position;
      const ratio = duration ? clamp(position / duration, 0, 1) : 0;
      const progressValue = Math.round(ratio * 1000);
      if (!this.dragging || force) this.progress.value = String(progressValue);
      this.progress.disabled = !duration;
      const progressPercent = `${ratio * 100}%`;
      this.progressShell.classList.toggle('is-disabled', !duration);
      this.progressShell.style.setProperty('--progress', progressPercent);
      this.progress.style.setProperty('--progress', progressPercent);
      this.updateCollapsedProgress(true, ratio);
      this.time.textContent = duration ? `${formatClock(position)} / ${formatClock(duration)}` : '0:00 / 0:00';
      const volume = clamp(Number(m.volume ?? 100) || 0, 0, 100);
      if (this.volume && document.activeElement !== this.volume) this.volume.value = String(Math.round(volume));
      this.volumeShell?.style.setProperty('--volume', `${volume}%`);
      this.playButton.classList.toggle('is-playing', m.playing);
      this.playButton.classList.toggle('is-loading', m.loading);
      this.playButton.setAttribute('aria-label', m.playing || m.loading ? 'Pause' : 'Play');
    }

    update(now = performance.now()) {
      this.updateCollapsedProgress(false);
      this.refresh(false);
    }

    destroy() {
      this.destroyed = true;
      this.coverToken += 1;
      window.clearTimeout(this.hideTimer);
      window.clearTimeout(this.introTimer);
      this.cleanup.splice(0).forEach((fn) => fn());
    }
  }

  class CornerToneSwitchController {
    constructor(app, options = {}) {
      this.app = app;
      this.options = options;
      this.root = app.root;
      this.zone = this.root.querySelector('#corner-tone-zone');
      this.themeButton = this.root.querySelector('#corner-theme-switch');
      this.themeMode = applyAsciiThemeMode(options.themeMode || localStorage.getItem(ASCII_THEME_STORAGE_KEY), this.root);
      this.app.themeMode = this.themeMode;
      this.app.midjourneySwirl?.setTheme?.(this.themeMode);
      this.hideTimer = 0;
      this.cleanup = [];
      if (!this.zone && !this.themeButton) return;
      this.bind();
      this.refresh();
    }

    listen(target, type, handler, options) {
      target?.addEventListener(type, handler, options);
      this.cleanup.push(() => target?.removeEventListener(type, handler, options));
    }

    bind() {
      const stop = (event) => event.stopPropagation();
      ['pointerdown', 'mousedown', 'click', 'dblclick'].forEach((type) => this.listen(this.zone, type, stop));
      this.listen(this.zone, 'pointerenter', () => this.open());
      this.listen(this.zone, 'pointermove', () => this.open());
      this.listen(this.zone, 'pointerleave', () => this.scheduleHide(420));
      this.listen(this.zone, 'focusin', () => this.open());
      this.listen(this.zone, 'focusout', () => this.scheduleHide(180));
      this.listen(this.themeButton, 'click', (event) => {
        event.stopPropagation();
        this.setThemeMode(this.themeMode === 'light' ? 'dark' : 'light');
        this.open();
      });
    }

    open() {
      window.clearTimeout(this.hideTimer);
      this.zone.classList.add('is-visible');
    }

    scheduleHide(delay = 420) {
      window.clearTimeout(this.hideTimer);
      this.hideTimer = window.setTimeout(() => {
        if (!this.zone.matches(':hover') && !this.zone.matches(':focus-within')) this.zone.classList.remove('is-visible');
      }, Math.max(0, delay));
    }

    refresh() {
      this.refreshTheme();
    }

    setThemeMode(mode, persist = true) {
      this.themeMode = applyAsciiThemeMode(mode, this.root);
      this.app.themeMode = this.themeMode;
      if (persist) localStorage.setItem(ASCII_THEME_STORAGE_KEY, this.themeMode);
      this.app.midjourneySwirl?.setTheme?.(this.themeMode);
      this.refreshTheme();
      this.app.ui?.refresh();
    }

    refreshTheme(mode = this.themeMode || currentAsciiThemeMode()) {
      if (!this.themeButton) return;
      const normalized = normalizeThemeMode(mode);
      const isLight = normalized === 'light';
      this.themeButton.classList.toggle('is-light', isLight);
      this.themeButton.classList.toggle('is-dark', !isLight);
      this.themeButton.dataset.theme = normalized;
      this.themeButton.setAttribute('aria-pressed', String(isLight));
      this.themeButton.setAttribute('aria-label', isLight ? 'Switch to dark mode' : 'Switch to light mode');
      this.themeButton.title = isLight ? 'Dark mode' : 'Light mode';
    }

    destroy() {
      window.clearTimeout(this.hideTimer);
      this.cleanup.splice(0).forEach((fn) => fn());
    }
  }

  class UIController {
    constructor(app, options = {}) {
      this.app = app;
      this.options = options;
      const stored = localStorage.getItem('asciiShaderUiVisible');
      const storedVisualizerOnly = localStorage.getItem(ASCII_VISUALIZER_ONLY_STORAGE_KEY);
      this.visible = options.forceUiVisible === true ? true : options.forceUiVisible === false ? false : stored !== null ? stored !== 'false' : options.uiVisible !== false;
      this.visualizerOnlyToggleActive = document.body.classList.contains('ascii-production-mode') || options.visualizerOnlyToggle === true;
      this.visualizerOnly = this.visualizerOnlyToggleActive && (options.visualizerOnly === true ? true : options.visualizerOnly === false ? false : storedVisualizerOnly === 'true');
      this.lastCornerTap = -Infinity;
      this.lastRefreshAt = 0;
      this.root = app.uiRoot || app.root;
      this.layer = this.root.querySelector('#ui-layer');
      this.visualizerKeyHandler = (event) => this.handleVisualizerShortcut(event);
      this.bind();
      this.setVisible(this.visible, false);
      this.setVisualizerOnly(this.visualizerOnly, false);
      this.refresh();
    }

    bind() {
      const root = this.root;
      root.querySelector('#ui-toggle-button')?.addEventListener('click', (e) => { e.stopPropagation(); this.toggle(); });
      const on = (sel, fn) => { const el = root.querySelector(sel); if (el) el.onclick = fn; };
      on('#play-btn', (e) => { e.stopPropagation(); this.app.music.togglePlay(); this.refresh(); });
      on('#prev-btn', (e) => { e.stopPropagation(); this.app.music.previousTrack(); this.refresh(); });
      on('#next-btn', (e) => { e.stopPropagation(); this.app.music.nextTrack(); this.refresh(); });
      on('#load-btn', (e) => { e.stopPropagation(); root.querySelector('#local-audio-input')?.click(); });
      on('#music-enabled', (e) => { e.stopPropagation(); this.app.music.state.enabled = !this.app.music.state.enabled; this.refresh(); });
      on('#ascii-fx', (e) => { e.stopPropagation(); this.app.music.state.asciiEnabled = !this.app.music.state.asciiEnabled; this.refresh(); });
      on('#shader-fx', (e) => { e.stopPropagation(); this.app.music.state.shaderEnabled = !this.app.music.state.shaderEnabled; this.refresh(); });
      on('#tone-seg', (e) => { const b = e.target.closest('button[data-tone]'); if (b) { this.app.shader.setAsciiTone(b.dataset.tone); this.refresh(); } });
      on('#shader-seg', (e) => { const b = e.target.closest('button[data-shader]'); if (b) { this.app.shader.setShader(b.dataset.shader); this.refresh(); } });
      on('#palette-grid', (e) => { const b = e.target.closest('button[data-palette]'); if (b) { this.app.shader.setPalette(b.dataset.palette); this.refresh(); } });
      const bindRange = (id, fn) => {
        root.querySelector(id)?.addEventListener('input', (e) => {
          fn(Number(e.target.value) / 100);
          this.refresh();
        });
      };
      bindRange('#sens-range', (v) => this.app.music.setVisualControl('sensitivity', v));
      bindRange('#sharp-range', (v) => this.app.music.setVisualControl('sharpness', v));
      bindRange('#ripple-range', (v) => this.app.music.setVisualControl('rippleAmount', v));
      bindRange('#grid-range', (v) => this.app.music.setVisualControl('gridBurstAmount', v));
      bindRange('#brightness-range', (v) => { this.app.shader.setAsciiBrightness(v); this.app.music.recordControl('asciiBrightness', v); });
      bindRange('#speed-range', (v) => {
        const speed = normalizeTimelineValue('shaderSpeed', v * 1.8);
        this.app.shader.state.speed = speed;
        this.app.music.state.shaderSpeed = speed;
        this.app.music.recordControl('shaderSpeed', speed);
      });
      bindRange('#mouse-range', (v) => {
        const influence = normalizeTimelineValue('mouseInfluence', v * 1.6);
        this.app.shader.state.mouseInf = influence;
        this.app.music.state.mouseInfluence = influence;
        this.app.music.recordControl('mouseInfluence', influence);
      });
      const trackSelect = root.querySelector('#track-select');
      if (trackSelect) trackSelect.onchange = (e) => { this.app.music.selectTrack(Number(e.target.value) || 0); this.refresh(); };
      const timelineInput = root.querySelector('#local-timeline-input');
      if (timelineInput) {
        timelineInput.onchange = async (e) => {
          const file = e.target.files && e.target.files[0];
          if (file) await this.app.music.importTimelineFile(file);
          timelineInput.value = '';
          this.refresh();
        };
      }
      on('#timeline-analyze', async (e) => {
        e.stopPropagation();
        await this.app.music.generateTimelineFromCurrentTrack().catch((error) => {
          this.app.music.state.timelineStatus = 'Analysis failed';
          console.warn('Timeline analysis failed.', error);
        });
        this.refresh();
      });
      on('#timeline-record', (e) => { e.stopPropagation(); this.app.music.toggleTimelineRecording(); this.refresh(); });
      on('#timeline-undo', (e) => { e.stopPropagation(); this.app.music.undoTimelineStep(); this.refresh(); });
      on('#timeline-ripple', (e) => { e.stopPropagation(); this.app.music.recordTimelineEvent('ripple', .75, this.app.music.getCurrentPosition(), this.app.ascii?.createRecordedRipplePayload?.() || {}); this.refresh(); });
      on('#timeline-grid', (e) => { e.stopPropagation(); this.app.music.recordTimelineEvent('gridBurst', .72, this.app.music.getCurrentPosition(), this.app.ascii?.createRecordedGridPayload?.({ gridType: 'mood-shift', strength: .72, frequency: this.app.music.state.centroidHz || 900 }) || {}); this.refresh(); });
      on('#timeline-select', (e) => { e.stopPropagation(); this.app.music.selectNearestTimelineEvent(); this.refresh(); });
      on('#timeline-nudge-back', (e) => { e.stopPropagation(); this.app.music.nudgeSelectedTimelineEvent(-.1); this.refresh(); });
      on('#timeline-nudge-forward', (e) => { e.stopPropagation(); this.app.music.nudgeSelectedTimelineEvent(.1); this.refresh(); });
      on('#timeline-delete', (e) => { e.stopPropagation(); this.app.music.deleteNearestTimelineEvent(); this.refresh(); });
      on('#timeline-import', (e) => { e.stopPropagation(); root.querySelector('#local-timeline-input')?.click(); });
      on('#timeline-export', (e) => { e.stopPropagation(); this.app.music.downloadTimelineExport(); this.refresh(); });
      if (this.layer) ['pointerdown', 'mousedown', 'click', 'dblclick'].forEach((t) => this.layer.addEventListener(t, (e) => e.stopPropagation()));
      this.cornerHandler = (e) => {
        if (e.clientX > 82 || e.clientY > 82) return;
        const now = performance.now();
        if (now - this.lastCornerTap < 420) {
          e.stopPropagation();
          this.toggle();
          this.lastCornerTap = -Infinity;
        } else this.lastCornerTap = now;
      };
      window.addEventListener('pointerdown', this.cornerHandler, { capture: true });
      if (this.visualizerOnlyToggleActive && this.options.visualizerOnlyShortcut !== false) {
        window.addEventListener('keydown', this.visualizerKeyHandler, { capture: true });
      }
    }

    isEditableTarget(target) {
      const tag = target?.tagName;
      return !!(target?.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(tag));
    }

    handleVisualizerShortcut(event) {
      if (event.repeat) return;
      const key = event.key;
      if ((key === 'u' || key === 'U') && !this.isEditableTarget(event.target)) {
        event.preventDefault();
        event.stopPropagation();
        this.toggle();
      } else if (key === 'Escape' && this.visualizerOnly) {
        event.preventDefault();
        event.stopPropagation();
        this.setVisualizerOnly(false);
        this.refresh();
      }
    }

    setVisible(value, persist = true) {
      this.visible = !!value;
      document.body.classList.toggle('ui-hidden', !this.visible);
      if (persist) localStorage.setItem('asciiShaderUiVisible', String(this.visible));
    }

    setVisualizerOnly(value, persist = true) {
      this.visualizerOnly = !!value;
      this.app.visualizerOnly = this.visualizerOnly;
      document.body.classList.toggle('visualizer-only', this.visualizerOnly);
      document.body.dataset.visualizerOnly = String(this.visualizerOnly);
      if (persist) localStorage.setItem(ASCII_VISUALIZER_ONLY_STORAGE_KEY, String(this.visualizerOnly));
      this.refreshVisualizerOnlyToggle();
    }

    toggle(force) {
      if (this.visualizerOnlyToggleActive) {
        this.setVisualizerOnly(typeof force === 'boolean' ? force : !this.visualizerOnly);
        this.refresh();
        return;
      }
      this.setVisible(typeof force === 'boolean' ? force : !this.visible);
      this.refresh();
    }

    refreshVisualizerOnlyToggle() {
      const button = this.root.querySelector('#ui-toggle-button');
      if (!button) return;
      button.textContent = 'U';
      const active = !!this.visualizerOnly;
      button.classList.toggle('is-visualizer-only', active);
      button.setAttribute('aria-pressed', String(active));
      if (this.visualizerOnlyToggleActive) {
        button.setAttribute('aria-label', active ? 'Restore cards' : 'Show visualizer only');
        button.title = active ? 'Restore cards' : 'Show visualizer only with U';
      } else {
        button.setAttribute('aria-label', this.visible ? 'Hide UI' : 'Show UI');
        button.title = 'Toggle UI with U';
      }
    }

    active(selector, fn) {
      this.root.querySelectorAll(selector).forEach((b) => b.classList.toggle('active', fn(b)));
    }

    refresh() {
      this.refreshVisualizerOnlyToggle();
      const root = this.root;
      const select = root.querySelector('#track-select');
      if (!select) return;
      const sig = this.app.music.tracks.map((t, i) => i + t.id).join('|');
      if (select.dataset.sig !== sig) {
        select.dataset.sig = sig;
        select.innerHTML = '';
        this.app.music.tracks.forEach((t, i) => {
          const o = document.createElement('option');
          o.value = i;
          o.textContent = t.title;
          select.appendChild(o);
        });
      }
      select.value = this.app.music.selectedIndex;
      root.querySelector('#play-btn').textContent = m.loading ? 'Loading' : m.playing ? 'Pause' : 'Play';
      root.querySelector('#music-enabled').classList.toggle('active', m.enabled);
      root.querySelector('#ascii-fx').classList.toggle('active', m.asciiEnabled);
      root.querySelector('#shader-fx').classList.toggle('active', m.shaderEnabled);
      root.querySelector('#timeline-record').classList.toggle('active', m.timelineRecording);
      root.querySelector('#timeline-select').classList.toggle('active', !!m.timelineSelectedEventId);
      this.active('#tone-seg button', (b) => b.dataset.tone === s.asciiTone);
      this.active('#shader-seg button', (b) => b.dataset.shader === s.shader);
      this.active('#palette-grid button', (b) => b.dataset.palette === s.palette);
      const setVal = (id, out, val) => {
        const input = root.querySelector(id);
        const output = root.querySelector(out);
        input.value = Math.round(val * 100);
        output.textContent = val.toFixed(2);
      };
      setVal('#sens-range', '#sens-out', m.sensitivity);
      setVal('#sharp-range', '#sharp-out', m.sharpness);
      setVal('#ripple-range', '#ripple-out', m.rippleAmount);
      setVal('#grid-range', '#grid-out', m.gridBurstAmount);
      setVal('#brightness-range', '#brightness-out', normalizeAsciiBrightness(Number.isFinite(m.timelineAsciiBrightness) ? m.timelineAsciiBrightness : s.asciiBrightness));
      setVal('#speed-range', '#speed-out', s.speed / 1.8);
      root.querySelector('#speed-out').textContent = s.speed.toFixed(2);
      setVal('#mouse-range', '#mouse-out', s.mouseInf / 1.6);
      root.querySelector('#mouse-out').textContent = s.mouseInf.toFixed(2);
      root.querySelector('#energy-fill').style.width = Math.round(clamp(m.smoothedEnergy, 0, 1) * 100) + '%';
      root.querySelector('#timeline-status').textContent = m.timelineStatus;
      root.querySelector('#timeline-hint').textContent = m.timelineReady ? `${m.timelineEventCount} visual events${m.captureFrameCount ? ` and ${m.captureFrameCount} capture frames` : ''} loaded. ${m.timelineSelectedEventLabel ? `Selected: ${m.timelineSelectedEventLabel}. ` : ''}${m.timelineSection ? `Section: ${m.timelineSection}. ` : ''}Audio is not stored in timeline JSON.` : this.app.music.isYouTubeTrack?.() ? 'No saved choreography for this YouTube source. Player stays visible; visuals fall back to idle.' : 'Stores visual keyframes only. No YouTube audio is downloaded or cached.';
      root.querySelector('#ui-status').textContent = `${m.mediaError ? 'UNAVAILABLE' : m.loading ? 'LOADING' : m.playing ? 'PLAYING' : 'IDLE'} - ${m.mediaError || m.trackTitle || 'NO TRACK'} - ${s.shader.toUpperCase()} / ${s.palette.toUpperCase()} - ASCII ${s.asciiTone.toUpperCase()}`;
      const energyStat = root.querySelector('#energy-stat');
      const toneStat = root.querySelector('#tone-stat');
      const musicStat = root.querySelector('#music-stat');
      if (energyStat) energyStat.textContent = (m.smoothedEnergy || 0).toFixed(2);
      if (toneStat) toneStat.textContent = s.asciiTone === 'shader' ? 'Shader' : 'Gray';
      if (musicStat) musicStat.textContent = m.loading ? 'Loading' : m.playing ? 'Playing' : 'Idle';
    }

    update(now = performance.now()) {
      if (!this.visible) return;
      const interval = this.app.music.state.playing ? 48 : 160;
      if (now - this.lastRefreshAt < interval) return;
      this.lastRefreshAt = now;
      this.refresh();
    }

    destroy() {
      window.removeEventListener('pointerdown', this.cornerHandler, { capture: true });
      window.removeEventListener('keydown', this.visualizerKeyHandler, { capture: true });
      document.body.classList.remove('visualizer-only');
      delete document.body.dataset.visualizerOnly;
    }
  }

  class KeyboardController {
  constructor(app, options={}) { this.app=app; this.enabled=options.keyboard!==false; this.input=(app.uiRoot || app.root).querySelector('#local-audio-input'); this.input.onchange=(e)=>{const file=e.target.files&&e.target.files[0];if(file){this.app.music.addLocalFile(file);this.app.music.play();this.app.ui.refresh();}this.input.value='';}; this.handler=(e)=>this.handle(e); if(this.enabled)window.addEventListener('keydown',this.handler); }
    handle(e){if(e.repeat)return;const k=e.key;if(k==='u'||k==='U'||k==='Escape'){e.preventDefault();this.app.ui.toggle();return;}const tag=e.target?.tagName;if(['INPUT','SELECT','TEXTAREA','BUTTON'].includes(tag))return;if(k===' '){e.preventDefault();this.app.music.togglePlay();}else if(k==='l'||k==='L'){this.input.click();}else if(k==='t'||k==='T'){this.app.shader.toggleAsciiTone();}else if(k==='g'||k==='G'){this.app.shader.setAsciiTone('gray');}else if(k==='y'||k==='Y'){this.app.shader.setAsciiTone('shader');}else if(k==='r'||k==='R'){this.app.shader.setShader('aurora');}else if(k==='c'){this.app.shader.cyclePalette(1);}else if(k==='C'){this.app.shader.cyclePalette(-1);}else if(k==='m'||k==='M'){this.app.music.state.enabled=!this.app.music.state.enabled;}else if(k==='a'||k==='A'){this.app.music.state.asciiEnabled=!this.app.music.state.asciiEnabled;}else if(k==='d'||k==='D'){this.app.music.state.shaderEnabled=!this.app.music.state.shaderEnabled;}else if(k===','){this.app.music.previousTrack();}else if(k==='.'){this.app.music.nextTrack();}else if(/^[0-9]$/.test(k)){const i=k==='0'?9:Number(k)-1, arr=['default','ocean','ember','toxic','candy','mono','rainbow','market','pulse','audio']; if(arr[i])this.app.shader.setPalette(arr[i]);} this.app.ui?.refresh();}
    destroy(){window.removeEventListener('keydown',this.handler);}
  }

  class CareerTimelineController {
    constructor(root) {
      this.root = root;
      this.cleanups = [];
      this.paused = false;
      this.scrollers = Array.from(root.querySelectorAll('[data-career-track]'));
      this.scrollers.forEach((scroller) => this.bindScroller(scroller));
    }
    bindScroller(scroller) {
      let dragging = false;
      let progressDragging = false;
      let startX = 0;
      let startLeft = 0;
      let raf = 0;
      let settleTimer = 0;
      const progress = scroller.parentElement?.querySelector('[data-career-progress]');
      const thumb = progress?.querySelector('[data-career-progress-thumb]');
      const setProgressActive = (active = true) => {
        if (!progress) return;
        progress.classList.toggle('is-active', active);
        window.clearTimeout(settleTimer);
        if (active && !dragging && !progressDragging) settleTimer = window.setTimeout(() => progress.classList.remove('is-active'), 620);
      };
      const updateProgress = () => {
        if (!progress || !thumb) return;
        const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
        const trackWidth = Math.max(1, progress.clientWidth);
        const visibleRatio = clamp(scroller.clientWidth / Math.max(scroller.scrollWidth, 1), 0.10, 1);
        const thumbWidth = Math.max(28, Math.min(64, trackWidth * visibleRatio * 0.55));
        const progressX = maxScroll > 0 ? (trackWidth - thumbWidth) * clamp(scroller.scrollLeft / maxScroll, 0, 1) : 0;
        progress.style.setProperty('--career-progress-width', `${thumbWidth.toFixed(2)}px`);
        progress.style.setProperty('--career-progress-x', `${progressX.toFixed(2)}px`);
        progress.classList.toggle('is-disabled', maxScroll <= 0);
      };
      const scheduleProgress = (active = false) => {
        if (this.paused) return;
        if (active) setProgressActive(true);
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          updateProgress();
        });
      };
      const setScrollFromProgressPointer = (event) => {
        if (!progress || !thumb) return;
        const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
        if (maxScroll <= 0) return;
        const rect = progress.getBoundingClientRect();
        const thumbWidth = Math.max(1, thumb.getBoundingClientRect().width || Number.parseFloat(getComputedStyle(thumb).width) || 1);
        const range = Math.max(1, rect.width - thumbWidth);
        const pointerX = event.clientX - rect.left - thumbWidth / 2;
        scroller.scrollLeft = clamp(pointerX / range, 0, 1) * maxScroll;
        scheduleProgress(true);
      };
      const endDrag = (event = {}) => {
        if (!dragging) return;
        dragging = false;
        scroller.classList.remove('is-dragging');
        setProgressActive(false);
        try { scroller.releasePointerCapture(event.pointerId); } catch (_) {}
      };
      const onDown = (event) => {
        if (this.paused) return;
        if (event.button !== 0 || event.target?.closest?.('[data-drag], button, a, input, textarea, select')) return;
        event.preventDefault();
        event.stopPropagation();
        dragging = true;
        startX = event.clientX;
        startLeft = scroller.scrollLeft;
        scroller.classList.add('is-dragging');
        setProgressActive(true);
        scroller.setPointerCapture(event.pointerId);
      };
      const onMove = (event) => {
        if (this.paused) return;
        if (!dragging) return;
        event.preventDefault();
        scroller.scrollLeft = startLeft - (event.clientX - startX);
        scheduleProgress(true);
      };
      const endProgressDrag = (event = {}) => {
        if (!progressDragging) return;
        progressDragging = false;
        progress?.classList.remove('is-dragging');
        setProgressActive(false);
        try { progress?.releasePointerCapture(event.pointerId); } catch (_) {}
      };
      const onProgressDown = (event) => {
        if (this.paused) return;
        if (!progress || event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        progressDragging = true;
        progress.classList.add('is-dragging');
        setProgressActive(true);
        try { progress.setPointerCapture(event.pointerId); } catch (_) {}
        setScrollFromProgressPointer(event);
      };
      const onProgressMove = (event) => {
        if (this.paused) return;
        if (!progressDragging) return;
        event.preventDefault();
        setScrollFromProgressPointer(event);
      };
      const onWheel = (event) => {
        if (this.paused) return;
        if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
        scroller.scrollLeft += event.deltaY;
        scheduleProgress(true);
        event.preventDefault();
      };
      const endActiveDrag = (event = {}) => {
        endDrag(event);
        endProgressDrag(event);
      };
      const handleVisibilityChange = () => {
        if (document.hidden) endActiveDrag();
      };
      const onScroll = () => scheduleProgress(true);
      const onResize = () => scheduleProgress();
      const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => scheduleProgress()) : null;
      ro?.observe(scroller);
      scroller.addEventListener('pointerdown', onDown);
      scroller.addEventListener('pointermove', onMove);
      scroller.addEventListener('pointerup', endDrag);
      scroller.addEventListener('pointercancel', endDrag);
      scroller.addEventListener('lostpointercapture', endDrag);
      scroller.addEventListener('scroll', onScroll, { passive: true });
      scroller.addEventListener('wheel', onWheel, { passive: false });
      progress?.addEventListener('pointerdown', onProgressDown);
      progress?.addEventListener('pointermove', onProgressMove);
      progress?.addEventListener('pointerup', endProgressDrag);
      progress?.addEventListener('pointercancel', endProgressDrag);
      progress?.addEventListener('lostpointercapture', endProgressDrag);
      window.addEventListener('blur', endActiveDrag);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('resize', onResize, { passive: true });
      scheduleProgress();
      this.cleanups.push(() => {
        if (raf) cancelAnimationFrame(raf);
        window.clearTimeout(settleTimer);
        ro?.disconnect();
        scroller.removeEventListener('pointerdown', onDown);
        scroller.removeEventListener('pointermove', onMove);
        scroller.removeEventListener('pointerup', endDrag);
        scroller.removeEventListener('pointercancel', endDrag);
        scroller.removeEventListener('lostpointercapture', endDrag);
        scroller.removeEventListener('scroll', onScroll);
        scroller.removeEventListener('wheel', onWheel);
        progress?.removeEventListener('pointerdown', onProgressDown);
        progress?.removeEventListener('pointermove', onProgressMove);
        progress?.removeEventListener('pointerup', endProgressDrag);
        progress?.removeEventListener('pointercancel', endProgressDrag);
        progress?.removeEventListener('lostpointercapture', endProgressDrag);
        window.removeEventListener('blur', endActiveDrag);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('resize', onResize);
      });
    }
    setPaused(value = false) {
      this.paused = !!value;
    }
    destroy() {
      this.cleanups.splice(0).forEach((cleanup) => cleanup());
    }
  }

  class WorldSceneLayout {
    constructor(root, options = {}) {
      this.root = root;
      this.options = options;
      this.scrollSpace = root.closest('[data-ascii-shader-scroll-space]');
      this.items = Array.from(root.querySelectorAll('[data-placeable]'));
      this.compact = window.matchMedia('(max-width:980px),(pointer:coarse)');
      this.cameraY = 0;
      this.dirty = true;
      this.forceDirty = true;
      this.lastLayoutKey = '';
      this.dragAbort = new AbortController();
      this.activeDragCleanups = new Set();
      this.ro = new ResizeObserver(() => this.markDirty(true));
      this.items.forEach((el) => {
        this.ro.observe(el);
        this.load(el);
        this.bindDrag(el);
      });
      this.bindProjectLinks();
      this.resizeHandler = () => this.markDirty(true);
      window.addEventListener('resize', this.resizeHandler, { passive: true });
      root.classList.add('ascii-world-ui');
      this.setCameraY(readScrollY());
      this.update(true);
    }
    itemSize(el, w = 100, h = 60) { return { w: el.offsetWidth || w, h: el.offsetHeight || h }; }
    key(el) { return 'asciiPlace-' + (el.dataset.id || 'item'); }
    isTransientPlace(el) { return el.hasAttribute('data-no-place-persist'); }
    load(el) { if (this.isTransientPlace(el)) { localStorage.removeItem(this.key(el)); return; } try { const p = JSON.parse(localStorage.getItem(this.key(el)) || 'null'); if (p) { el.__worldX = Number.isFinite(p.worldX) ? p.worldX : p.x; el.__worldY = Number.isFinite(p.worldY) ? p.worldY : p.y; el.__customWorldPlace = Number.isFinite(el.__worldX) && Number.isFinite(el.__worldY); } } catch (_) {} }
    githubCardWidth(totalW, leetW, gap, compact) {
      const maxCardW = 566;
      if (compact) return Math.max(220, Math.min(totalW, maxCardW));
      return Math.max(220, Math.min(totalW - leetW - gap, maxCardW));
    }
    githubVisualMetrics(githubW, compact) {
      const dayGap = compact ? 1 : 1.15;
      const daySize = compact ? (githubW < 360 ? 2.3 : 3.45) : 5.05;
      const sideW = compact ? (githubW < 360 ? 44 : 53) : 90;
      const mapW = 53 * daySize + 52 * dayGap;
      const mapH = 7 * daySize + 6 * dayGap;
      const cardH = Math.max(compact ? 74 : 78, Math.round(mapH + (compact ? 32 : 36)));
      return { daySize, dayGap, sideW, mapW, mapH, cardH };
    }
    githubScaledMetrics(totalW, leetW, gap, compact, targetW = null) {
      const baseW = this.githubCardWidth(totalW, leetW, gap, compact);
      const layoutW = Math.round(compact ? Math.min(totalW, baseW * GITHUB_STATS_CARD_SCALE) : baseW * GITHUB_STATS_CARD_SCALE);
      const scaledW = targetW == null ? layoutW : targetW;
      const githubW = Math.round(compact ? Math.min(totalW, scaledW) : scaledW);
      const scale = githubW / baseW;
      const visual = this.githubVisualMetrics(baseW, compact);
      const githubVisual = {
        daySize: visual.daySize * scale,
        dayGap: visual.dayGap * scale,
        sideW: visual.sideW * scale,
        mapW: visual.mapW * scale,
        mapH: visual.mapH * scale,
        cardH: Math.round(visual.cardH * scale)
      };
      return {
        githubW,
        githubH: githubVisual.cardH,
        githubLayoutW: targetW == null ? layoutW : githubW,
        githubVisual
      };
    }
    lowerCardBandMetrics() {
      const w = window.innerWidth, compact = this.compact.matches || w <= 980;
      const minMargin = compact ? 14 : 24, gap = compact ? 12 : 16;
      const availableW = Math.max(220, w - minMargin * 2);
      const sizeCols = compact ? (w < 620 ? 1 : 2) : 4;
      const cols = compact ? sizeCols : 3;
      const minCardW = compact ? 220 : 230;
      const cardW = Math.max(minCardW, (availableW - gap * (sizeCols - 1)) / sizeCols);
      const cardH = Math.round(cardW * 10 / 16);
      let bandW = cols * cardW + gap * (cols - 1);
      let margin = Math.max(minMargin, (w - bandW) / 2);
      if (!compact) {
        const compositionSidePad = 18;
        const leetW = Math.round(cardH * LEETCODE_STATS_CARD_SCALE);
        const bottomRowW = Math.round(cardW + gap + leetW);
        const heroW = Math.round(Math.min(759, w * .667));
        const compositionW = heroW + gap + bottomRowW;
        if (compositionW <= w - compositionSidePad * 2) {
          bandW = compositionW;
          margin = Math.max(compositionSidePad, (w - bandW) / 2);
        }
      }
      return { w, compact, margin, gap, cols, sizeCols, bandW, cardW, cardH };
    }
    certBadgeSize(m = this.lowerCardBandMetrics()) {
      const stackW = Math.max(0, m.cardW - (m.compact ? 18 : 24));
      const gap = m.compact ? 5 : Math.min(10, Math.max(6, stackW * .024));
      return Math.max(34, Math.round((stackW - gap * 4) / 5));
    }
    outerPagePadding(m = this.lowerCardBandMetrics()) {
      return Math.round(clamp(m.w * .04, 28, 48));
    }
    bottomInteractionClearance(m = this.lowerCardBandMetrics()) {
      return Math.max(this.outerPagePadding(m), m.w <= 620 ? 108 : 116);
    }
    lowerFeatureLayout(m = this.lowerCardBandMetrics()) {
      const careerW = Math.round(Math.min(m.w - m.margin * 2, m.cardW * CAREER_CARD_WIDTH_SCALE));
      const careerH = careerCardHeight(m.cardH);
      const topFeatureClearance = careerH + m.gap;
      const quoteUnitW = Math.max(1, (m.bandW - m.gap) / 2);
      const quoteW = quoteUnitW;
      const quoteH = Math.max(72, Math.round(quoteUnitW * MARKET_QUOTE_CARD_RATIO));
      const websiteW = Math.max(1, (m.bandW - m.gap) / 2);
      const websiteH = Math.max(120, Math.round(websiteW * WEBSITE_PREVIEW_CARD_RATIO));
      const firmW = m.bandW;
      const firmH = Math.max(m.cardH, m.compact ? 236 : 302);
      const paletteW = m.bandW;
      const paletteH = Math.max(Math.round(paletteW * PALETTE_CARD_HEIGHT_RATIO), m.w <= 620 ? 650 : 0);
      const contactTriggerW = 156;
      const contactTriggerH = 46;
      const quoteY = topFeatureClearance;
      const websiteY = quoteY + quoteH + m.gap;
      const firmY = websiteY + websiteH + m.gap;
      const paletteY = firmY + firmH + m.gap;
      const contactTriggerY = paletteY + paletteH + m.gap;
      return {
        width: m.bandW,
        height: contactTriggerY + contactTriggerH,
        quoteW,
        quoteH,
        websiteW,
        websiteH,
        firmW,
        firmH,
        paletteW,
        paletteH,
        contactTriggerW,
        contactTriggerH,
        quoteA: { x: m.margin, y: quoteY },
        quoteB: { x: m.margin + quoteW + m.gap, y: quoteY },
        websiteA: { x: m.margin, y: websiteY },
        websiteB: { x: m.margin + websiteW + m.gap, y: websiteY },
        firm: { x: m.margin, y: firmY },
        palette: { x: m.margin, y: paletteY },
        contactTrigger: { x: Math.round((m.w - contactTriggerW) / 2), y: contactTriggerY }
      };
    }
    topFeatureRowLayout(m = this.projectMetrics(), stats = this.statsMetrics()) {
      const puzzle = this.topPuzzleMetrics(stats);
      const careerH = careerCardHeight(m.cardH);
      const careerX = Math.round(Math.min(puzzle.skills.x, puzzle.leetcode.x, puzzle.certs.x));
      const careerRight = Math.round(Math.max(
        puzzle.skills.x + m.cardW,
        puzzle.leetcode.x + stats.leetW,
        puzzle.certs.x + puzzle.certW
      ));
      const careerW = Math.max(1, careerRight - careerX);
      const fallbackBottom = Math.max(
        puzzle.skills.y + m.cardH,
        puzzle.leetcode.y + stats.leetH,
        puzzle.certs.y + puzzle.certH
      );
      const y = Math.round(puzzle.career?.y ?? (fallbackBottom + m.gap));
      return {
        careerW,
        careerH,
        career: { x: Math.round(puzzle.career?.x ?? careerX), y }
      };
    }
    topPuzzleMetrics(m = this.statsMetrics()) {
      const compact = m.compact;
      const gap = m.gap;
      const outerPadding = this.outerPagePadding(m);
      const heroW = Math.round(compact ? Math.max(220, m.w - 28) : Math.min(759, m.w * .667));
      const heroH = 320;
      const introH = compact ? 538 : 469;
      const heroY = outerPadding;
      const introY = heroY + heroH + gap;
      const certW = m.leetW;
      const certBadgeSize = this.certBadgeSize(m);
      const certH = compact ? Math.max(certBadgeSize + 12, Math.round(m.leetH * .48)) : Math.max(1, m.cardH - m.leetH - gap);
      const topBlankH = topBlankCardHeight(m.githubH);
      const bottomRowW = m.cardW + gap + m.leetW;
      const bottomRowH = Math.max(m.cardH, m.leetH);
      const clusterW = Math.max(m.githubLayoutW || m.githubW, bottomRowW);
      const sidePad = compact ? 14 : 18;
      let heroX = compact ? 14 : Math.max(sidePad, Math.round((m.w - heroW) / 2));
      let clusterX = Math.max(sidePad, Math.round((m.w - clusterW) / 2));
      let clusterY = introY + introH + gap;

      if (compact) {
        const stackX = (cardW) => Math.max(14, Math.round((m.w - cardW) / 2));
        const blankY = introY + introH + gap;
        const githubY = blankY + topBlankH + gap;
        const skillsY = githubY + m.githubH + gap;
        const leetcodeY = skillsY + m.cardH + gap;
        const certY = leetcodeY + m.leetH + gap;
        const careerY = certY + certH + gap;
        return {
          hero: { x: heroX, y: heroY },
          intro: { x: heroX, y: introY },
          topBlank: { x: stackX(m.githubW), y: blankY },
          career: { x: stackX(m.cardW), y: careerY },
          github: { x: stackX(m.githubW), y: githubY },
          skills: { x: stackX(m.cardW), y: skillsY },
          leetcode: { x: stackX(m.leetW), y: leetcodeY },
          certs: { x: stackX(certW), y: certY },
          topBlankH,
          certW,
          certH,
          certBadgeSize,
          heroW
        };
      }

      const compositionW = heroW + gap + clusterW;
      const sideBySide = compositionW <= m.w - sidePad * 2;

      if (sideBySide) {
        heroX = Math.round((m.w - compositionW) / 2);
        clusterX = heroX + heroW + gap;
        clusterY = heroY;
      }

      const blankY = clusterY;
      const githubY = blankY + topBlankH + gap;
      const bottomY = githubY + m.githubH + gap;
      const certY = bottomY + m.leetH + gap;
      const lowerStackBottom = Math.max(bottomY + m.cardH, certY + certH);
      const careerY = lowerStackBottom + gap;
      return {
        hero: { x: heroX, y: heroY },
        intro: { x: heroX, y: introY },
        topBlank: { x: clusterX, y: blankY },
        career: { x: clusterX, y: careerY },
        github: { x: clusterX, y: githubY },
        skills: { x: clusterX, y: bottomY },
        leetcode: { x: clusterX + m.cardW + gap, y: bottomY },
        certs: { x: clusterX + m.cardW + gap, y: certY },
        topBlankH,
        certW,
        certH,
        certBadgeSize,
        heroW
      };
    }
    scrollLimit() {
      const documentBase = this.scrollSpace ? 0 : Math.max(document.documentElement.scrollHeight || 0, document.body?.scrollHeight || 0);
      const base = Math.max(documentBase, scrollHeightToPx(this.options.scrollHeight), window.innerHeight);
      const m = this.lowerCardBandMetrics();
      const feature = this.lowerFeatureLayout(m);
      const bottomSafe = this.bottomInteractionClearance(m);
      const projectTop = this.projectSectionTop(m, feature);
      const contentBottom = projectTop + feature.height;
      return Math.max(base, contentBottom + bottomSafe);
    }
    syncScrollHeight() {
      const height = this.scrollLimit();
      if (this.scrollSpace && Number.isFinite(height)) this.scrollSpace.style.setProperty('--ascii-scroll-height', `${Math.ceil(height)}px`);
    }
    projectSectionTop(m, feature) {
      const statsBase = (() => {
        const compact = m.compact, totalW = m.bandW;
        if (compact) {
          const baseLeetW = m.w < 620 ? totalW : Math.min(360, totalW);
          const leetW = Math.round(baseLeetW * LEETCODE_STATS_CARD_SCALE);
          const leetH = Math.round(Math.max(132, Math.round(baseLeetW * .48)) * LEETCODE_STATS_CARD_SCALE);
          const { githubW, githubH, githubLayoutW, githubVisual } = this.githubScaledMetrics(totalW, baseLeetW, m.gap, compact);
          const rowH = leetH + m.gap + githubH;
          const rowW = Math.max(leetW, githubW);
          return { compact, totalW, leetW, leetH, githubW, githubH, githubLayoutW, githubVisual, rowW, rowH };
        }
        const baseLeetW = m.cardH, leetW = Math.round(baseLeetW * LEETCODE_STATS_CARD_SCALE), leetH = Math.round(Math.max(126, Math.round(baseLeetW * .58)) * LEETCODE_STATS_CARD_SCALE);
        const bottomRowW = Math.round(m.cardW + m.gap + leetW);
        const { githubW, githubH, githubLayoutW, githubVisual } = this.githubScaledMetrics(totalW, baseLeetW, m.gap, compact, bottomRowW);
        const rowH = Math.max(leetH, githubH);
        const rowW = Math.max(githubLayoutW, bottomRowW);
        return { compact, totalW, leetW, leetH, githubW, githubH, githubLayoutW, githubVisual, rowW, rowH };
      })();
      const stats = { ...m, ...statsBase };
      const puzzle = this.topPuzzleMetrics(stats);
      const topRow = this.topFeatureRowLayout(m, stats);
      const introH = m.compact ? 538 : 469;
      const topContentBottom = Math.max(puzzle.intro.y + introH, topRow.career.y + topRow.careerH);
      return Math.max(8, Math.round(topContentBottom + m.gap - feature.quoteA.y));
    }
    projectMetrics() {
      const m = this.lowerCardBandMetrics();
      const feature = this.lowerFeatureLayout(m);
      const top = this.projectSectionTop(m, feature);
      return { ...m, top };
    }
    statsMetrics() {
      const m = this.projectMetrics(), compact = m.compact, totalW = m.bandW;
      if (compact) {
        const baseLeetW = m.w < 620 ? totalW : Math.min(360, totalW);
        const leetW = Math.round(baseLeetW * LEETCODE_STATS_CARD_SCALE);
        const leetH = Math.round(Math.max(132, Math.round(baseLeetW * .48)) * LEETCODE_STATS_CARD_SCALE);
        const { githubW, githubH, githubLayoutW, githubVisual } = this.githubScaledMetrics(totalW, baseLeetW, m.gap, compact);
        const rowH = leetH + m.gap + githubH;
        const rowW = Math.max(leetW, githubW);
        return { ...m, compact, totalW, leetW, leetH, githubW, githubH, githubLayoutW, githubVisual, rowW, rowH, top: Math.max(window.innerHeight + 80, m.top - rowH - m.gap) };
      }
      const baseLeetW = m.cardH, leetW = Math.round(baseLeetW * LEETCODE_STATS_CARD_SCALE), leetH = Math.round(Math.max(126, Math.round(baseLeetW * .58)) * LEETCODE_STATS_CARD_SCALE);
      const bottomRowW = Math.round(m.cardW + m.gap + leetW);
      const { githubW, githubH, githubLayoutW, githubVisual } = this.githubScaledMetrics(totalW, baseLeetW, m.gap, compact, bottomRowW);
      const rowH = Math.max(leetH, githubH);
      const rowW = Math.max(githubLayoutW, bottomRowW);
      return { ...m, compact, totalW, leetW, leetH, githubW, githubH, githubLayoutW, githubVisual, rowW, rowH, top: Math.max(window.innerHeight + 80, m.top - rowH - m.gap) };
    }
    statsDefault(el) {
      const id = el.dataset.id || '', m = this.statsMetrics();
      const puzzle = this.topPuzzleMetrics(m);
      if (id === 'stats-leetcode') {
        el.style.setProperty('--ascii-code-card-width', `${m.leetW}px`);
        el.style.setProperty('--ascii-code-card-height', `${m.leetH}px`);
        return puzzle.leetcode;
      }
      if (id === 'stats-github') {
        el.style.setProperty('--ascii-code-card-width', `${m.githubW}px`);
        el.style.setProperty('--ascii-code-card-height', `${m.githubH}px`);
        el.style.setProperty('--ascii-github-day-size', `${m.githubVisual.daySize}px`);
        el.style.setProperty('--ascii-github-day-gap', `${m.githubVisual.dayGap}px`);
        el.style.setProperty('--ascii-github-side-width', `${m.githubVisual.sideW}px`);
        return puzzle.github;
      }
      if (id === 'top-blank-card') {
        el.style.setProperty('--ascii-code-card-width', `${m.githubW}px`);
        el.style.setProperty('--ascii-code-card-height', `${puzzle.topBlankH ?? m.githubH}px`);
        return puzzle.topBlank;
      }
      return null;
    }
    featureDefault(el) {
      const id = el.dataset.id || '';
      if (id === 'skills-card') {
        const m = this.statsMetrics(), puzzle = this.topPuzzleMetrics(m);
        el.style.setProperty('--ascii-project-card-width', `${m.cardW}px`);
        el.style.setProperty('--ascii-project-card-height', `${m.cardH}px`);
        return puzzle.skills;
      }
      if (id === 'career-card') {
        const m = this.projectMetrics();
        const stats = this.statsMetrics();
        const row = this.topFeatureRowLayout(m, stats);
        el.style.setProperty('--ascii-project-card-width', `${row.careerW}px`);
        el.style.setProperty('--ascii-project-card-height', `${row.careerH}px`);
        el.style.width = `${row.careerW}px`;
        el.style.height = `${row.careerH}px`;
        return row.career;
      }
      if (id === 'certs-card') {
        const row = this.topPuzzleMetrics(this.statsMetrics());
        el.style.setProperty('--ascii-project-card-width', `${row.certW}px`);
        el.style.setProperty('--ascii-project-card-height', `${row.certH}px`);
        el.style.setProperty('--ascii-cert-badge-size', `${row.certBadgeSize}px`);
        return row.certs;
      }
      if (id === 'market-spy-card' || id === 'market-blank-card') {
        const m = this.projectMetrics(), feature = this.lowerFeatureLayout(m);
        el.style.setProperty('--ascii-project-card-width', `${feature.quoteW}px`);
        el.style.setProperty('--ascii-project-card-height', `${feature.quoteH}px`);
        return id === 'market-spy-card'
          ? { x: feature.quoteA.x, y: m.top + feature.quoteA.y }
          : { x: feature.quoteB.x, y: m.top + feature.quoteB.y };
      }
      if (id === 'website-preview-1' || id === 'website-preview-2') {
        const m = this.projectMetrics(), feature = this.lowerFeatureLayout(m);
        el.style.setProperty('--ascii-project-card-width', `${feature.websiteW}px`);
        el.style.setProperty('--ascii-project-card-height', `${feature.websiteH}px`);
        return id === 'website-preview-1'
          ? { x: feature.websiteA.x, y: m.top + feature.websiteA.y }
          : { x: feature.websiteB.x, y: m.top + feature.websiteB.y };
      }
      if (id === 'firm-card') {
        const m = this.projectMetrics(), feature = this.lowerFeatureLayout(m);
        el.style.setProperty('--ascii-project-card-width', `${feature.firmW}px`);
        el.style.setProperty('--ascii-project-card-height', `${feature.firmH}px`);
        return { x: feature.firm.x, y: m.top + feature.firm.y };
      }
      if (id === 'palette-reference-card') {
        const m = this.projectMetrics(), feature = this.lowerFeatureLayout(m);
        el.style.setProperty('--ascii-project-card-width', `${feature.paletteW}px`);
        el.style.setProperty('--ascii-project-card-height', `${feature.paletteH}px`);
        return { x: feature.palette.x, y: m.top + feature.palette.y };
      }
      if (id === 'contact-trigger') {
        const m = this.projectMetrics(), feature = this.lowerFeatureLayout(m);
        el.style.setProperty('--ascii-contact-trigger-width', `${feature.contactTriggerW}px`);
        el.style.setProperty('--ascii-contact-trigger-height', `${feature.contactTriggerH}px`);
        return { x: feature.contactTrigger.x, y: m.top + feature.contactTrigger.y };
      }
      return null;
    }
    defaults(el) {
      const id = el.dataset.id, w = window.innerWidth, h = window.innerHeight, compact = this.compact.matches || w <= 980, size = this.itemSize(el), vw = w / 100, vh = h / 100;
      const stats = this.statsDefault(el);
      if (stats) return stats;
      const feature = this.featureDefault(el);
      if (feature) return feature;
      if (id === 'toggle') return compact ? { x: w - 10 - size.w, y: 54 } : { x: w - 18 - size.w, y: 58 };
      if (id === 'hero' || id === 'intro-card') {
        const top = this.topPuzzleMetrics();
        el.style.setProperty('--ascii-top-primary-width', `${top.heroW}px`);
        return id === 'hero' ? top.hero : top.intro;
      }
      if (id === 'actions') return compact ? { x: 34, y: 336 } : { x: w * .05 + 24, y: h * .08 + 276 };
      if (id === 'stat') return compact ? { x: 14, y: 390 } : { x: w - 7 * vw - size.w, y: h * .10 };
      if (id === 'mini') return compact ? { x: 14, y: h - 18 - size.h } : { x: 10 * vw, y: h - 8 * vh - size.h };
      if (id === 'controls') return compact ? { x: w - 14 - size.w, y: h - 18 - size.h } : { x: w - 3 * vw - size.w, y: h - 4 * vh - size.h };
      return { x: 18, y: 18 };
    }
    clampPlace(el, x, y) {
      const size = this.itemSize(el), maxX = Math.max(8, window.innerWidth - size.w - 8), maxY = Math.max(8, this.scrollLimit() - size.h - 8);
      return { x: clamp(x, 8, maxX), y: clamp(y, 8, maxY) };
    }
    place(el, x, y) {
      const p = this.clampPlace(el, x, y);
      el.__worldX = p.x;
      el.__worldY = p.y;
      el.dataset.worldX = p.x.toFixed(2);
      el.dataset.worldY = p.y.toFixed(2);
      el.style.left = `${p.x.toFixed(2)}px`;
      el.style.top = `${p.y.toFixed(2)}px`;
      el.style.transform = '';
    }
    layoutKey() {
      return [
        window.innerWidth || 0,
        window.innerHeight || 0,
        this.compact.matches ? 1 : 0,
        this.items.length
      ].join(':');
    }
    markDirty(force = false) {
      this.dirty = true;
      if (force) this.forceDirty = true;
    }
    needsUpdate() {
      return this.forceDirty || this.dirty || this.layoutKey() !== this.lastLayoutKey;
    }
    setCameraY(cameraY = readScrollY()) {
      const next = Math.max(0, Number(cameraY) || 0);
      if (Math.abs(next - this.cameraY) < .01) return;
      this.cameraY = next;
      this.root.style.setProperty('--ascii-camera-offset-y', `${(-next).toFixed(2)}px`);
      this.root.dataset.cameraY = next.toFixed(2);
    }
    update(force = false) {
      const layoutKey = this.layoutKey();
      const needsLayout = force || this.forceDirty || this.dirty || layoutKey !== this.lastLayoutKey;
      if (!needsLayout) return false;
      this.lastLayoutKey = layoutKey;
      this.dirty = false;
      this.forceDirty = false;
      this.syncScrollHeight();
      for (const el of this.items) {
        if (!el.__customWorldPlace || force && !localStorage.getItem(this.key(el))) {
          const d = this.defaults(el);
          if (!el.__customWorldPlace) { el.__worldX = d.x; el.__worldY = d.y; }
        }
        this.place(el, el.__worldX ?? this.defaults(el).x, el.__worldY ?? this.defaults(el).y);
      }
      return true;
    }
    bindDrag(el) {
      const handles = Array.from(el.querySelectorAll('[data-drag]'));
      if (el.hasAttribute('data-drag-surface')) handles.push(el);
      handles.forEach((handle) => {
        handle.addEventListener('pointerdown', (e) => {
          if (e.button != null && e.button !== 0) return;
          if (e.isPrimary === false || el.__worldDragging) return;
          if (e.target?.closest?.('[data-no-drag]')) return;
          e.preventDefault();
          e.stopPropagation();
          this.update();
          el.__worldDragging = true;
          el.classList.add('is-world-dragging');
          el.__worldSuppressLinkClickUntil = performance.now() + 500;
          const pointerId = e.pointerId;
          const rect = el.getBoundingClientRect();
          const ox = e.clientX - rect.left;
          const oy = e.clientY - rect.top;
          let lastClientX = e.clientX;
          let lastClientY = e.clientY;
          let ended = false;
          const placeFromClient = (clientX, clientY) => {
            const currentScrollY = readScrollY();
            const p = this.clampPlace(el, clientX - ox, clientY - oy + currentScrollY);
            el.__customWorldPlace = true;
            this.place(el, p.x, p.y);
          };
          const move = (ev) => {
            if (ev.pointerId !== pointerId) return;
            if (ev.cancelable) ev.preventDefault();
            ev.stopPropagation();
            lastClientX = ev.clientX;
            lastClientY = ev.clientY;
            placeFromClient(lastClientX, lastClientY);
          };
          const syncAfterScroll = () => placeFromClient(lastClientX, lastClientY);
          const cleanup = (persist = true) => {
            if (ended) return;
            ended = true;
            this.activeDragCleanups.delete(cleanup);
            window.removeEventListener('pointermove', move, { capture: true });
            window.removeEventListener('pointerup', finish, { capture: true });
            window.removeEventListener('pointercancel', finish, { capture: true });
            window.removeEventListener('blur', finish);
            window.removeEventListener('scroll', syncAfterScroll);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            handle.removeEventListener('lostpointercapture', finish);
            try {
              if (handle.hasPointerCapture?.(pointerId)) handle.releasePointerCapture(pointerId);
            } catch (_) {}
            el.__worldDragging = false;
            el.classList.remove('is-world-dragging');
            el.__worldSuppressLinkClickUntil = performance.now() + 500;
            if (persist && !this.isTransientPlace(el)) {
              localStorage.setItem(this.key(el), JSON.stringify({ worldX: Math.round(el.__worldX || 0), worldY: Math.round(el.__worldY || 0) }));
            }
          };
          const finish = (ev) => {
            if (ev?.pointerId != null && ev.pointerId !== pointerId) return;
            cleanup(true);
          };
          const handleVisibilityChange = () => {
            if (document.hidden) cleanup(true);
          };
          this.activeDragCleanups.add(cleanup);
          window.addEventListener('pointermove', move, { capture: true, passive: false });
          window.addEventListener('pointerup', finish, { capture: true });
          window.addEventListener('pointercancel', finish, { capture: true });
          window.addEventListener('blur', finish);
          window.addEventListener('scroll', syncAfterScroll, { passive: true });
          document.addEventListener('visibilitychange', handleVisibilityChange);
          handle.addEventListener('lostpointercapture', finish);
          try { handle.setPointerCapture(pointerId); } catch (_) {}
        }, { signal: this.dragAbort.signal });
      });
    }
    bindProjectLinks() {
      this.root.querySelectorAll('a.ascii-code-card-link, a[data-project-link]').forEach((link) => {
        link.addEventListener('click', (event) => {
          const placeable = link.closest('[data-placeable]');
          const suppressUntil = Number(placeable?.__worldSuppressLinkClickUntil) || 0;
          if (event.target?.closest?.('[data-drag]') || performance.now() < suppressUntil) {
            if (placeable) placeable.__worldSuppressLinkClickUntil = 0;
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          const href = (link.getAttribute('href') || '').trim();
          if (!href || href === '#') event.preventDefault();
        }, { capture: true });
      });
    }
    destroy() {
      this.dragAbort.abort();
      Array.from(this.activeDragCleanups).forEach((cleanup) => cleanup(false));
      this.activeDragCleanups.clear();
      window.removeEventListener('resize', this.resizeHandler);
      this.ro.disconnect();
      this.root.style.removeProperty('--ascii-camera-offset-y');
      delete this.root.dataset.cameraY;
    }
  }

  function initContactModal(root, uiRoot = root) {
    const shell = uiRoot.querySelector('[data-contact-modal-shell]');
    const modal = shell?.querySelector('[role="dialog"]');
    const trigger = uiRoot.querySelector('[data-contact-open]');
    if (!shell || !modal || !trigger) return { isOpen: () => false, destroy() {} };

    const abort = new AbortController();
    const signal = abort.signal;
    let open = false;
    let returnFocus = null;
    shell.dataset.contactModal = 'ready';

    const focusable = () => Array.from(modal.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'))
      .filter((element) => element.getClientRects().length > 0);

    function publish() {
      window.dispatchEvent(new CustomEvent('portfolio:contact-modal-change', { detail: { open } }));
    }

    function show() {
      if (open) return;
      open = true;
      returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : trigger;
      shell.setAttribute('aria-hidden', 'false');
      shell.classList.add('is-open');
      document.body.classList.add('ascii-contact-modal-open');
      publish();
      requestAnimationFrame(() => modal.focus({ preventScroll: true }));
    }

    function hide() {
      if (!open) return;
      open = false;
      shell.setAttribute('aria-hidden', 'true');
      shell.classList.remove('is-open');
      document.body.classList.remove('ascii-contact-modal-open');
      publish();
      requestAnimationFrame(() => (returnFocus?.isConnected ? returnFocus : trigger).focus({ preventScroll: true }));
    }

    trigger.addEventListener('click', show, { signal });
    shell.querySelectorAll('[data-contact-close]').forEach((control) => control.addEventListener('click', hide, { signal }));
    shell.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        hide();
        return;
      }
      if (event.key !== 'Tab') return;
      const controls = focusable();
      if (!controls.length) {
        event.preventDefault();
        modal.focus({ preventScroll: true });
        return;
      }
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === modal)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }, { signal });

    return {
      isOpen: () => open,
      open: show,
      close: hide,
      destroy() {
        abort.abort();
        document.body.classList.remove('ascii-contact-modal-open');
        delete shell.dataset.contactModal;
      }
    };
  }

  function initContactLens(root) {
    const card = root.querySelector('[data-id="contact-card"]');
    const scene = card?.querySelector('[data-contact-scene]');
    const refraction = card?.querySelector('[data-contact-refraction]');
    const snapshot = card?.querySelector('[data-contact-refraction-canvas]');
    const backdropScene = card?.querySelector('[data-contact-backdrop-scene]');
    const sceneClone = card?.querySelector('[data-contact-refraction-scene]');
    const filterHousing = card?.querySelector('[data-contact-filter-housing]');
    const lensClip = card?.querySelector('.ascii-contact-lens-clip');
    const modalShell = card?.closest('[data-contact-modal-shell]');
    if (!card || !scene || !refraction || !snapshot || !backdropScene || !sceneClone || !filterHousing || !lensClip || !modalShell) {
      return { update() {}, destroy() {} };
    }

    const PAD = 20;
    const RADIUS = 16;
    const DEPTH = 60;
    const SPLAY = 2;
    const FEATHER = 24;
    const CURVE = 2;
    const BOOST = .8;
    const FRAME_INTERVAL = 1000 / 45;
    const source = document.getElementById('ascii-bg');
    const context = snapshot.getContext('2d', { alpha: false });
    const mapCache = new Map();
    const backdropClones = new Map();
    const abort = new AbortController();
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
      needsGeometry = true;
      needsPaint = true;
    });
    let width = 0;
    let height = 0;
    let mapWidth = 0;
    let mapHeight = 0;
    let mapUrl = '';
    let version = 0;
    let lastPaintAt = -Infinity;
    let needsGeometry = true;
    let needsPaint = true;
    let destroyed = false;

    const clamp255 = (value) => value < 0 ? 0 : value > 255 ? 255 : value;
    const inViewport = () => {
      const rect = card.getBoundingClientRect();
      return rect.right > 0 && rect.bottom > 0 && rect.left < window.innerWidth && rect.top < window.innerHeight;
    };
    const isOpen = () => modalShell.getAttribute('aria-hidden') === 'false' && modalShell.classList.contains('is-open');

    function syncSceneClone() {
      sceneClone.innerHTML = scene.innerHTML;
      sceneClone.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
    }

    function prepareBackdropClone(sourceElement) {
      const clone = sourceElement.cloneNode(true);
      [clone, ...clone.querySelectorAll('*')].forEach((element) => {
        element.removeAttribute?.('id');
        element.removeAttribute?.('data-placeable');
        element.removeAttribute?.('data-ui-interactive');
        element.removeAttribute?.('data-drag');
        element.removeAttribute?.('data-drag-surface');
        element.removeAttribute?.('tabindex');
        element.removeAttribute?.('aria-describedby');
        if ('inert' in element) element.inert = true;
      });
      clone.setAttribute('aria-hidden', 'true');
      clone.setAttribute('data-contact-backdrop-clone', '');
      clone.style.setProperty('pointer-events', 'none', 'important');
      backdropScene.appendChild(clone);
      return clone;
    }

    function copyLiveCanvases(sourceElement, clone) {
      const sourceCanvases = sourceElement.querySelectorAll('canvas');
      const cloneCanvases = clone.querySelectorAll('canvas');
      const count = Math.min(sourceCanvases.length, cloneCanvases.length);
      for (let index = 0; index < count; index++) {
        const sourceCanvas = sourceCanvases[index];
        const cloneCanvas = cloneCanvases[index];
        if (!sourceCanvas.width || !sourceCanvas.height) continue;
        if (cloneCanvas.width !== sourceCanvas.width) cloneCanvas.width = sourceCanvas.width;
        if (cloneCanvas.height !== sourceCanvas.height) cloneCanvas.height = sourceCanvas.height;
        try {
          const cloneContext = cloneCanvas.getContext('2d');
          cloneContext?.clearRect(0, 0, cloneCanvas.width, cloneCanvas.height);
          cloneContext?.drawImage(sourceCanvas, 0, 0);
        } catch (_) {}
      }
    }

    function syncBackdropScene(cardRect) {
      const left = cardRect.left - PAD;
      const top = cardRect.top - PAD;
      const right = cardRect.right + PAD;
      const bottom = cardRect.bottom + PAD;
      const visible = new Set();
      document.querySelectorAll('[data-placeable]').forEach((element) => {
        if (element.dataset.id === 'contact-trigger' || element.closest('[data-contact-modal-shell]')) return;
        const style = getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return;
        const rect = element.getBoundingClientRect();
        if (rect.right <= left || rect.left >= right || rect.bottom <= top || rect.top >= bottom) return;
        visible.add(element);
        const clone = backdropClones.get(element) || prepareBackdropClone(element);
        backdropClones.set(element, clone);
        clone.style.setProperty('position', 'absolute', 'important');
        clone.style.setProperty('left', `${rect.left - cardRect.left + PAD}px`, 'important');
        clone.style.setProperty('top', `${rect.top - cardRect.top + PAD}px`, 'important');
        clone.style.setProperty('width', `${rect.width}px`, 'important');
        clone.style.setProperty('height', `${rect.height}px`, 'important');
        clone.style.setProperty('margin', '0', 'important');
        clone.style.setProperty('transform', 'none', 'important');
        copyLiveCanvases(element, clone);
      });
      backdropClones.forEach((clone, element) => {
        if (visible.has(element)) return;
        clone.remove();
        backdropClones.delete(element);
      });
    }

    function buildLensMap(mw, mh, winW, winH, radius, rim, curve, feather) {
      const key = `${mw}:${mh}:${winW}:${winH}:${radius}:${rim}:${curve}:${feather}`;
      const hit = mapCache.get(key);
      if (hit) return hit;
      const mapCanvas = document.createElement('canvas');
      mapCanvas.width = mw;
      mapCanvas.height = mh;
      const mapContext = mapCanvas.getContext('2d');
      const image = mapContext.createImageData(mw, mh);
      const pixels = image.data;
      const halfWidth = winW / 2;
      const halfHeight = winH / 2;
      const sdf = (x, y) => {
        const qx = Math.abs(x - mw / 2) - (halfWidth - radius);
        const qy = Math.abs(y - mh / 2) - (halfHeight - radius);
        const ox = Math.max(qx, 0);
        const oy = Math.max(qy, 0);
        return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - radius;
      };
      for (let y = 0; y < mh; y++) {
        for (let x = 0; x < mw; x++) {
          const cx = x + .5;
          const cy = y + .5;
          const distance = sdf(cx, cy);
          const gradientX = sdf(cx + 1, cy) - sdf(cx - 1, cy);
          const gradientY = sdf(cx, cy + 1) - sdf(cx, cy - 1);
          const length = Math.hypot(gradientX, gradientY) || 1;
          const normalX = gradientX / length;
          const normalY = gradientY / length;
          const span = distance < 0 ? rim + feather : rim;
          let amount = Math.max(0, 1 - Math.abs(distance) / span);
          amount = amount * amount * amount * (amount * (amount * 6 - 15) + 10);
          amount = Math.pow(amount, curve);
          const offset = (y * mw + x) * 4;
          pixels[offset] = clamp255(Math.round(127.5 - normalX * amount * 127 * BOOST));
          pixels[offset + 1] = clamp255(Math.round(127.5 - normalY * amount * 127 * BOOST));
          pixels[offset + 2] = 128;
          pixels[offset + 3] = 255;
        }
      }
      mapContext.putImageData(image, 0, 0);
      const url = mapCanvas.toDataURL('image/png');
      if (mapCache.size >= 24) mapCache.delete(mapCache.keys().next().value);
      mapCache.set(key, url);
      return url;
    }

    function applyFilter() {
      if (!mapUrl) return;
      const id = `ascii-contact-lens-v${++version}`;
      filterHousing.innerHTML = `
        <defs>
          <filter id="${id}" x="0" y="0" width="100%" height="100%" filterUnits="objectBoundingBox" color-interpolation-filters="sRGB">
            <feImage href="${mapUrl}" xlink:href="${mapUrl}" x="0" y="0" width="${mapWidth}" height="${mapHeight}" preserveAspectRatio="none" result="map"/>
            <feDisplacementMap in="SourceGraphic" in2="map" scale="${DEPTH}" xChannelSelector="R" yChannelSelector="G"/>
          </filter>
        </defs>`;
      refraction.style.filter = `url(#${id})`;
    }

    function refreshGeometry() {
      const rect = card.getBoundingClientRect();
      const nextWidth = Math.max(1, Math.round(rect.width));
      const nextHeight = Math.max(1, Math.round(rect.height));
      if (!needsGeometry && nextWidth === width && nextHeight === height) return;
      width = nextWidth;
      height = nextHeight;
      mapWidth = width + PAD * 2;
      mapHeight = height + PAD * 2;
      snapshot.width = mapWidth;
      snapshot.height = mapHeight;
      snapshot.style.width = `${mapWidth}px`;
      snapshot.style.height = `${mapHeight}px`;
      refraction.style.width = `${mapWidth}px`;
      refraction.style.height = `${mapHeight}px`;
      refraction.style.left = `${-PAD}px`;
      refraction.style.top = `${-PAD}px`;
      refraction.style.clipPath = `inset(${PAD}px round ${RADIUS}px)`;
      lensClip.style.clipPath = `inset(0 round ${RADIUS}px)`;
      sceneClone.style.left = `${PAD}px`;
      sceneClone.style.top = `${PAD}px`;
      sceneClone.style.width = `${width}px`;
      sceneClone.style.height = `${height}px`;
      backdropScene.style.left = '0';
      backdropScene.style.top = '0';
      backdropScene.style.width = `${mapWidth}px`;
      backdropScene.style.height = `${mapHeight}px`;
      syncSceneClone();
      mapUrl = buildLensMap(mapWidth, mapHeight, width, height, RADIUS, SPLAY, CURVE, FEATHER);
      needsGeometry = false;
      needsPaint = true;
    }

    function snapshotBackdrop() {
      if (!context || !source || !source.width || !source.height) return false;
      const rect = card.getBoundingClientRect();
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, mapWidth, mapHeight);
      context.imageSmoothingEnabled = true;
      try {
        context.drawImage(source, PAD - rect.left, PAD - rect.top, window.innerWidth, window.innerHeight);
        syncBackdropScene(rect);
        return true;
      } catch (_) {
        return false;
      }
    }

    function update(now = performance.now()) {
      if (destroyed || document.hidden || !isOpen() || !inViewport()) return;
      refreshGeometry();
      if (!needsPaint && !card.__worldDragging && now - lastPaintAt < FRAME_INTERVAL) return;
      if (snapshotBackdrop()) {
        applyFilter();
        card.dataset.contactRefraction = 'ready';
      } else {
        card.dataset.contactRefraction = 'unavailable';
      }
      needsPaint = false;
      lastPaintAt = now;
    }

    resizeObserver?.observe(card);
    syncSceneClone();
    window.addEventListener('portfolio:contact-modal-change', (event) => {
      needsGeometry = true;
      needsPaint = true;
      if (event.detail?.open) return;
      backdropClones.forEach((clone) => clone.remove());
      backdropClones.clear();
    }, { signal: abort.signal });

    return {
      update,
      destroy() {
        destroyed = true;
        abort.abort();
        resizeObserver?.disconnect();
        backdropClones.forEach((clone) => clone.remove());
        backdropClones.clear();
        mapCache.clear();
        filterHousing.replaceChildren();
        refraction.style.removeProperty('filter');
      }
    };
  }

  function initContactForm(root) {
    const form = root.querySelector('[data-contact-form]');
    const status = form?.querySelector('[data-contact-form-status]');
    if (!form) return { destroy() {} };

    const abort = new AbortController();
    const signal = abort.signal;
    const idleStatus = 'Saved privately to my inbox.';
    let submissionId = createSubmissionId();
    let busy = false;

    function createSubmissionId() {
      if (window.crypto?.randomUUID) return window.crypto.randomUUID();
      const bytes = new Uint8Array(16);
      if (window.crypto?.getRandomValues) window.crypto.getRandomValues(bytes);
      else bytes.forEach((_, index) => { bytes[index] = Math.floor(Math.random() * 256); });
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }

    function setState(state, message) {
      form.dataset.state = state;
      form.setAttribute('aria-busy', state === 'sending' ? 'true' : 'false');
      const submit = form.querySelector('button[type="submit"]');
      if (submit) {
        submit.disabled = state === 'sending';
        submit.textContent = state === 'sending' ? 'Sending…' : 'Send';
      }
      if (status) status.textContent = message;
    }

    function errorMessage(error, response) {
      if (error === 'email_invalid' || error === 'email_required' || error === 'email_too_long') return 'Enter a valid email address.';
      if (error === 'message_too_short' || error === 'message_too_long') return 'Message must be 10–1,200 characters.';
      if (error === 'rate_limited') {
        const wait = Number(response?.headers?.get?.('retry-after'));
        return Number.isFinite(wait) ? `Too many attempts. Retry in ${wait}s.` : 'Too many attempts. Please retry shortly.';
      }
      if (error === 'contact_inbox_disabled') return 'The inbox is temporarily unavailable.';
      if (error === 'submission_id_conflict') {
        submissionId = createSubmissionId();
        return 'Please retry your message.';
      }
      return 'Could not save this message. Your text is still here—please retry.';
    }

    const stopCardInteraction = (event) => event.stopPropagation();
    ['pointerdown', 'mousedown', 'click', 'dblclick'].forEach((type) => {
      form.addEventListener(type, stopCardInteraction, { signal });
    });
    form.addEventListener('input', () => {
      if (!busy) setState('idle', idleStatus);
    }, { signal });
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (busy || !form.checkValidity()) {
        form.reportValidity();
        return;
      }
      const data = new FormData(form);
      busy = true;
      setState('sending', 'Saving your message…');
      try {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: String(data.get('email') || '').trim(),
            message: String(data.get('message') || '').trim(),
            website: String(data.get('website') || ''),
            submissionId
          }),
          signal
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw Object.assign(new Error(body.error || 'contact_request_failed'), { response });
        form.reset();
        submissionId = createSubmissionId();
        setState('success', 'Message saved. Thank you.');
      } catch (error) {
        if (error?.name === 'AbortError') return;
        setState('error', errorMessage(error?.message, error?.response));
      } finally {
        busy = false;
        if (form.dataset.state === 'sending') setState('idle', idleStatus);
        else setState(form.dataset.state || 'idle', status?.textContent || idleStatus);
      }
    }, { signal });

    return { destroy: () => abort.abort() };
  }

  function initTopBlankScrollHint(root) {
    const card = root.querySelector('[data-id="top-blank-card"]');
    const copy = card?.querySelector('.ascii-top-blank-copy');
    const toggle = card?.querySelector('[data-about-popout-toggle]');
    if (!card || !copy) return { destroy() {} };

    const abort = new AbortController();
    const { signal } = abort;
    let raf = 0;
    let ro = null;
    let backdrop = null;
    let popout = null;
    let closeButton = null;
    let closeTimer = 0;
    let paused = false;

    const update = () => {
      raf = 0;
      if (paused) return;
      const maxScroll = Math.max(0, copy.scrollHeight - copy.clientHeight);
      const atEnd = maxScroll <= 1 || copy.scrollTop >= maxScroll - 1;
      card.classList.toggle('is-copy-scrolled-end', atEnd);
    };
    const schedule = () => {
      if (paused) return;
      if (!raf) raf = requestAnimationFrame(update);
    };
    const getTargetRect = (sourceRect) => {
      const viewportW = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1);
      const viewportH = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);
      const marginX = viewportW <= 520 ? 12 : 16;
      const marginTop = viewportH <= 560 ? 18 : 48;
      const marginBottom = viewportH <= 560 ? 18 : 24;
      const maxW = Math.max(220, viewportW - marginX * 2);
      const maxH = Math.max(220, viewportH - marginTop - marginBottom);
      const width = Math.min(760, maxW);
      const height = Math.min(520, maxH);
      const leftMax = Math.max(marginX, viewportW - width - marginX);
      const topMax = Math.max(marginTop, viewportH - height - marginBottom);
      const left = clamp(sourceRect.left + sourceRect.width / 2 - width / 2, marginX, leftMax);
      const top = clamp(sourceRect.top + sourceRect.height / 2 - height / 2, marginTop, topMax);
      return { left, top, width, height };
    };
    const sourceTransform = (sourceRect, targetRect) => {
      const scaleX = sourceRect.width / targetRect.width;
      const scaleY = sourceRect.height / targetRect.height;
      const dx = sourceRect.left - targetRect.left;
      const dy = sourceRect.top - targetRect.top;
      return `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`;
    };
    const syncToggle = (isOpen) => {
      if (!toggle) return;
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      toggle.setAttribute('aria-label', isOpen ? 'Close About popout' : 'Open About popout');
    };
    const clearPopout = (restoreFocus = false) => {
      if (closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = 0;
      }
      backdrop?.remove();
      popout?.remove();
      backdrop = null;
      popout = null;
      closeButton = null;
      card.classList.remove('is-about-popout-source');
      syncToggle(false);
      if (restoreFocus && toggle) toggle.focus({ preventScroll: true });
    };
    const closePopout = (restoreFocus = true) => {
      if (!popout) return;
      if (closeTimer) return;
      const sourceRect = card.getBoundingClientRect();
      const currentRect = popout.getBoundingClientRect();
      const targetRect = { left: currentRect.left, top: currentRect.top, width: currentRect.width, height: currentRect.height };
      backdrop?.classList.remove('is-open');
      popout.classList.remove('is-open');
      popout.style.transform = sourceTransform(sourceRect, targetRect);
      closeTimer = window.setTimeout(() => clearPopout(restoreFocus), 280);
    };
    const createPopout = () => {
      const sourceRect = card.getBoundingClientRect();
      const targetRect = getTargetRect(sourceRect);
      const panel = document.createElement('section');
      panel.id = 'ascii-top-blank-popout';
      panel.className = 'ascii-shader-frame ascii-top-blank-popout';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-label', 'About biography expanded');
      panel.setAttribute('tabindex', '-1');
      panel.setAttribute('data-top-gradient-card', '');
      panel.setAttribute('data-no-bg-click', '');
      panel.style.left = `${targetRect.left}px`;
      panel.style.top = `${targetRect.top}px`;
      panel.style.width = `${targetRect.width}px`;
      panel.style.height = `${targetRect.height}px`;
      panel.style.transform = sourceTransform(sourceRect, targetRect);

      const fill = document.createElement('div');
      fill.className = 'ascii-black-fill';
      fill.setAttribute('aria-hidden', 'true');
      panel.appendChild(fill);

      const heading = card.querySelector('.ascii-top-blank-heading')?.cloneNode(true);
      if (heading) panel.appendChild(heading);

      const popoutCopy = copy.cloneNode(true);
      popoutCopy.setAttribute('aria-label', 'About biography expanded');
      popoutCopy.scrollTop = 0;
      panel.appendChild(popoutCopy);

      const closer = document.createElement('button');
      closer.className = 'ascii-top-blank-popout-close';
      closer.type = 'button';
      closer.setAttribute('aria-label', 'Close About popout');
      closer.setAttribute('data-no-bg-click', '');
      panel.appendChild(closer);

      const shade = document.createElement('div');
      shade.className = 'ascii-top-blank-popout-backdrop';
      shade.setAttribute('data-no-bg-click', '');
      document.body.appendChild(shade);
      document.body.appendChild(panel);

      backdrop = shade;
      popout = panel;
      closeButton = closer;
      card.classList.add('is-about-popout-source');
      syncToggle(true);

      backdrop.addEventListener('pointerdown', () => closePopout(true), { signal });
      closeButton.addEventListener('click', () => closePopout(true), { signal });
      requestAnimationFrame(() => {
        backdrop?.classList.add('is-open');
        popout?.classList.add('is-open');
        if (popout) popout.style.transform = 'translate(0, 0) scale(1, 1)';
      });
      requestAnimationFrame(() => popout?.focus({ preventScroll: true }));
    };
    const togglePopout = () => {
      if (paused) return;
      if (popout) {
        closePopout(true);
        return;
      }
      createPopout();
    };

    copy.addEventListener('scroll', schedule, { signal, passive: true });
    toggle?.addEventListener('click', togglePopout, { signal });
    window.addEventListener('keydown', (event) => {
      if (!popout || event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      closePopout(true);
    }, { signal, capture: true });
    window.addEventListener('scroll', () => {
      if (popout) closePopout(false);
    }, { signal, passive: true });
    window.addEventListener('resize', () => {
      schedule();
      if (popout) closePopout(false);
    }, { signal, passive: true });
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(schedule);
      ro.observe(card);
      ro.observe(copy);
    }
    update();
    requestAnimationFrame(update);

    return {
      setPaused(value = false) {
        paused = !!value;
        if (paused) {
          clearPopout(false);
          if (raf) {
            cancelAnimationFrame(raf);
            raf = 0;
          }
          return;
        }
        schedule();
      },
      destroy() {
        clearPopout(false);
        abort.abort();
        ro?.disconnect();
        if (raf) cancelAnimationFrame(raf);
        card.classList.remove('is-copy-scrolled-end');
      }
    };
  }

  function initFirmCard(root) {
    const card = root.querySelector('[data-id="firm-card"]');
    const stack = card?.querySelector('.ascii-firm-strip-stack');
    const strips = Array.from(card?.querySelectorAll('.ascii-firm-strip') || []);
    if (!card || !stack || !strips.length) return { destroy() {} };

    const abort = new AbortController();
    const { signal } = abort;
    let activeStrip = null;
    let paused = false;

    const setActive = (strip, force = false) => {
      if (paused && strip && !force) return;
      activeStrip = strip || null;
      card.classList.toggle('is-firm-active', Boolean(activeStrip));
      strips.forEach((item) => item.classList.toggle('is-active', item === activeStrip));
      if (activeStrip) card.dataset.activeFirmStrip = activeStrip.getAttribute('aria-label') || '';
      else delete card.dataset.activeFirmStrip;
      void stack.offsetWidth;
    };
    const clearIfPointerOutside = (event) => {
      if (!activeStrip || (event.pointerType && event.pointerType !== 'mouse')) return;
      const bounds = stack.getBoundingClientRect();
      const outside = event.clientX < bounds.left
        || event.clientX > bounds.right
        || event.clientY < bounds.top
        || event.clientY > bounds.bottom;
      if (outside) setActive(null);
    };

    strips.forEach((strip) => {
      strip.addEventListener('pointerenter', () => setActive(strip), { signal });
      strip.addEventListener('focus', () => setActive(strip), { signal });
      strip.addEventListener('click', () => setActive(strip), { signal });
    });
    stack.addEventListener('pointerleave', () => setActive(null), { signal });
    window.addEventListener('pointermove', clearIfPointerOutside, { signal, passive: true });
    window.addEventListener('blur', () => setActive(null), { signal });
    card.addEventListener('focusout', () => {
      requestAnimationFrame(() => {
        if (!card.contains(document.activeElement)) setActive(null);
      });
    }, { signal });
    card.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      setActive(null);
    }, { signal });
    return {
      setPaused(value = false) {
        paused = !!value;
        if (paused) {
          setActive(null, true);
        }
      },
      destroy() {
        abort.abort();
        setActive(null, true);
      }
    };
  }

  function initPaletteProjectCard(root) {
    const card = root.querySelector('[data-id="palette-reference-card"]');
    const stage = card?.querySelector('.ascii-palette-project-stage');
    const projects = Array.from(card?.querySelectorAll('.ascii-palette-project') || []);
    const glyphVortexBackground = card?.querySelector('[data-palette-glyph-vortex]');
    const unicornBackground = card?.querySelector('[data-palette-unicorn-bg]');
    const effectToggle = card?.querySelector('[data-palette-effect-toggle]');
    const clock = card?.querySelector('[data-chicago-clock]');
    const date = card?.querySelector('[data-chicago-date]');
    if (!card || !stage || !projects.length) return { destroy() {} };

    const abort = new AbortController();
    const { signal } = abort;
    let activeProject = null;
    let chicagoTimer = 0;
    let clockFormatter = null;
    let dateFormatter = null;
    let unicornScene = null;
    let unicornRequest = 0;
    let paletteEffectMode = 'plain';
    let glyphPointerPrimed = false;
    let glyphPointerRelayCount = 0;
    let effectToggleHideTimer = 0;
    let effectToggleScrollHintShown = false;
    let effectToggleCornerActive = false;
    let effectToggleLastScrollY = readScrollY();
    let destroyed = false;
    let paused = false;
    const otherProjectsCard = card.querySelector('[data-other-projects-card]');
    const otherProjectsList = otherProjectsCard?.querySelector('[data-other-projects-list]');
    const otherProjectsSlideshow = otherProjectsCard?.querySelector('[data-other-project-slideshow]');
    const otherProjectSlideCurrent = otherProjectsSlideshow?.querySelector('.ascii-other-project-slide-current');
    const otherProjectSlideNext = otherProjectsSlideshow?.querySelector('.ascii-other-project-slide-next');
    const otherProjectSlideCount = otherProjectsSlideshow?.querySelector('[data-other-project-slide-count]');
    const otherProjectSlides = Array.from(otherProjectsSlideshow?.querySelectorAll('[data-other-project-slide]') || [])
      .map((item) => ({
        src: item.getAttribute('data-src') || '',
        alt: item.getAttribute('data-alt') || ''
      }))
      .filter((item) => item.src);
    const otherProjectReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)') || null;
    let otherProjectSlideIndex = 0;
    let otherProjectSlideTimer = 0;
    let otherProjectTransitionTimer = 0;
    let otherProjectTransitionToken = 0;
    let otherProjectSlideshowInView = typeof IntersectionObserver === 'undefined';
    let otherProjectSlideshowObserver = null;

    const clearOtherProjectSlideshowTimers = () => {
      window.clearTimeout(otherProjectSlideTimer);
      window.clearTimeout(otherProjectTransitionTimer);
      otherProjectSlideTimer = 0;
      otherProjectTransitionTimer = 0;
    };

    const canRunOtherProjectSlideshow = () => (
      !destroyed
      && !paused
      && activeProject === otherProjectsCard
      && otherProjectSlideshowInView
      && document.visibilityState === 'visible'
      && otherProjectSlides.length > 1
      && !!otherProjectSlideCurrent
      && !!otherProjectSlideNext
    );

    const scheduleOtherProjectSlideshow = () => {
      window.clearTimeout(otherProjectSlideTimer);
      otherProjectSlideTimer = 0;
      if (!canRunOtherProjectSlideshow()) return;
      otherProjectSlideTimer = window.setTimeout(() => {
        otherProjectSlideTimer = 0;
        void advanceOtherProjectSlideshow();
      }, 5200);
    };

    const commitOtherProjectSlide = (index) => {
      const slide = otherProjectSlides[index];
      if (!slide || !otherProjectSlideCurrent) return;
      otherProjectSlideIndex = index;
      otherProjectSlideCurrent.src = slide.src;
      otherProjectSlideCurrent.alt = slide.alt;
      if (otherProjectSlideCount) otherProjectSlideCount.textContent = String(index + 1);
    };

    async function advanceOtherProjectSlideshow() {
      if (!canRunOtherProjectSlideshow()) return;
      const nextIndex = (otherProjectSlideIndex + 1) % otherProjectSlides.length;
      const nextSlide = otherProjectSlides[nextIndex];
      const transitionToken = ++otherProjectTransitionToken;
      const preload = new Image();
      preload.decoding = 'async';
      preload.src = nextSlide.src;
      try {
        await preload.decode();
      } catch (_) {
        if (!preload.complete) {
          scheduleOtherProjectSlideshow();
          return;
        }
      }
      if (destroyed || transitionToken !== otherProjectTransitionToken) return;
      if (!canRunOtherProjectSlideshow()) return;
      if (otherProjectReducedMotion?.matches) {
        commitOtherProjectSlide(nextIndex);
        scheduleOtherProjectSlideshow();
        return;
      }
      otherProjectSlideNext.src = nextSlide.src;
      otherProjectSlideNext.classList.add('is-visible');
      if (otherProjectSlideCount) otherProjectSlideCount.textContent = String(nextIndex + 1);
      otherProjectTransitionTimer = window.setTimeout(() => {
        otherProjectTransitionTimer = 0;
        if (destroyed || transitionToken !== otherProjectTransitionToken) return;
        commitOtherProjectSlide(nextIndex);
        otherProjectSlideNext.classList.remove('is-visible');
        otherProjectSlideNext.removeAttribute('src');
        scheduleOtherProjectSlideshow();
      }, 620);
    }

    if (otherProjectsSlideshow && typeof IntersectionObserver !== 'undefined') {
      otherProjectSlideshowObserver = new IntersectionObserver((entries) => {
        otherProjectSlideshowInView = entries.some((entry) => entry.isIntersecting);
        scheduleOtherProjectSlideshow();
      }, { threshold: 0.08 });
      otherProjectSlideshowObserver.observe(otherProjectsSlideshow);
    }
    otherProjectsList?.addEventListener('keydown', (event) => {
      const page = Math.max(1, Math.round(otherProjectsList.clientHeight * 0.84));
      let nextTop = null;
      if (event.key === 'ArrowDown') nextTop = otherProjectsList.scrollTop + 34;
      else if (event.key === 'ArrowUp') nextTop = otherProjectsList.scrollTop - 34;
      else if (event.key === 'PageDown' || (event.key === ' ' && !event.shiftKey)) nextTop = otherProjectsList.scrollTop + page;
      else if (event.key === 'PageUp' || (event.key === ' ' && event.shiftKey)) nextTop = otherProjectsList.scrollTop - page;
      else if (event.key === 'Home') nextTop = 0;
      else if (event.key === 'End') nextTop = otherProjectsList.scrollHeight;
      if (nextTop === null) return;
      event.preventDefault();
      otherProjectsList.scrollTop = Math.max(0, Math.min(nextTop, otherProjectsList.scrollHeight));
    }, { signal });
    document.addEventListener('visibilitychange', scheduleOtherProjectSlideshow, { signal });
    otherProjectReducedMotion?.addEventListener?.('change', scheduleOtherProjectSlideshow, { signal });

    const clearUnicornScene = () => {
      try { unicornScene?.destroy?.(); } catch (_) {}
      unicornScene = null;
      if (unicornBackground) {
        unicornBackground.innerHTML = '';
        unicornBackground.dataset.unicornState = 'idle';
      }
    };

    const labelForPaletteEffectMode = (mode) => {
      if (mode === 'plain') return 'Palette background: plain flower image';
      return 'Palette background: custom glyph vortex';
    };

    const setPaletteEffectMode = (mode) => {
      const nextMode = PALETTE_EFFECT_MODES.includes(mode) ? mode : 'plain';
      paletteEffectMode = nextMode;
      const glyphActive = nextMode === 'glyph';
      const unicornActive = nextMode === 'unicorn';
      card.classList.toggle('is-glyph-vortex-active', glyphActive);
      card.classList.toggle('is-unicorn-active', unicornActive);
      card.classList.toggle('is-plain-image-active', nextMode === 'plain');
      card.dataset.paletteEffectMode = nextMode;
      card.dataset.unicornActive = unicornActive ? 'true' : 'false';
      if (glyphVortexBackground) {
        glyphVortexBackground.toggleAttribute('paused', !glyphActive || paused);
        glyphVortexBackground.dataset.glyphVortexState = glyphActive && !paused ? 'active' : 'idle';
        if (!glyphActive) glyphPointerPrimed = false;
      }
      if (effectToggle) {
        effectToggle.classList.remove('is-mode-glyph', 'is-mode-plain');
        effectToggle.classList.add(`is-mode-${nextMode}`);
        effectToggle.dataset.mode = nextMode;
        const label = labelForPaletteEffectMode(nextMode);
        effectToggle.setAttribute('aria-label', label);
        effectToggle.title = label;
      }
      const requestId = ++unicornRequest;
      if (!unicornActive || !unicornBackground) {
        clearUnicornScene();
        return;
      }
      mountPaletteUnicornScene(unicornBackground).then((scene) => {
        if (destroyed || requestId !== unicornRequest || paletteEffectMode !== 'unicorn') {
          try { scene?.destroy?.(); } catch (_) {}
          if (unicornBackground) {
            unicornBackground.innerHTML = '';
            unicornBackground.dataset.unicornState = 'idle';
          }
          return;
        }
        unicornScene = scene || null;
      });
    };

    if (unicornBackground) unicornBackground.dataset.unicornState = 'idle';
    setPaletteEffectMode('glyph');

    const openEffectToggle = (autoHideDelay = 0) => {
      if (paused) return;
      if (!effectToggle) return;
      window.clearTimeout(effectToggleHideTimer);
      card.classList.add('is-effect-toggle-visible');
      if (autoHideDelay) scheduleEffectToggleHide(autoHideDelay);
    };

    const scheduleEffectToggleHide = (delay = 420) => {
      if (!effectToggle) return;
      if (paused) {
        card.classList.remove('is-effect-toggle-visible');
        return;
      }
      window.clearTimeout(effectToggleHideTimer);
      effectToggleHideTimer = window.setTimeout(() => {
        if (effectToggleCornerActive) return;
        if (effectToggle.matches(':focus') || effectToggle.matches(':focus-within')) return;
        card.classList.remove('is-effect-toggle-visible');
      }, Math.max(0, delay));
    };

    const pointerInEffectToggleCorner = (event) => {
      if (paused) return false;
      if (!effectToggle || !event) return false;
      const rect = card.getBoundingClientRect();
      const zoneW = Math.min(92, Math.max(58, rect.width * .24));
      const zoneH = Math.min(70, Math.max(44, rect.height * .18));
      return event.clientX >= rect.right - zoneW
        && event.clientX <= rect.right
        && event.clientY >= rect.top
        && event.clientY <= rect.top + zoneH;
    };

    const handleEffectTogglePointer = (event) => {
      const inCorner = pointerInEffectToggleCorner(event);
      if (inCorner) {
        effectToggleCornerActive = true;
        openEffectToggle();
        return;
      }
      if (!effectToggleCornerActive) return;
      effectToggleCornerActive = false;
      scheduleEffectToggleHide(420);
    };

    const handleEffectToggleScrollHint = () => {
      if (paused) return;
      const y = readScrollY();
      const movedDown = y > effectToggleLastScrollY + 2;
      effectToggleLastScrollY = y;
      if (!movedDown || effectToggleScrollHintShown || !effectToggle) return;
      const rect = card.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      if (!inView) return;
      effectToggleScrollHintShown = true;
      openEffectToggle(3000);
    };

    card.addEventListener('pointerenter', handleEffectTogglePointer, { signal, passive: true });
    card.addEventListener('pointermove', handleEffectTogglePointer, { signal, passive: true });
    card.addEventListener('pointerleave', () => {
      effectToggleCornerActive = false;
      scheduleEffectToggleHide(420);
    }, { signal, passive: true });
    effectToggle?.addEventListener('focusin', () => openEffectToggle(), { signal });
    effectToggle?.addEventListener('focusout', () => scheduleEffectToggleHide(180), { signal });
    window.addEventListener('scroll', handleEffectToggleScrollHint, { signal, passive: true });

    effectToggle?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const index = PALETTE_EFFECT_MODES.indexOf(paletteEffectMode);
      setPaletteEffectMode(PALETTE_EFFECT_MODES[(index + 1) % PALETTE_EFFECT_MODES.length]);
    }, { signal });

    const glyphVortexCanReceivePointer = (event) => {
      if (paused) return false;
      if (paletteEffectMode !== 'glyph' || !glyphVortexBackground) return false;
      if (glyphVortexBackground.hasAttribute('paused')) return false;
      if (!glyphVortexBackground.hasAttribute('data-ready')) return false;
      if (event?.target?.closest?.('[data-palette-effect-toggle]')) return false;
      return Boolean(glyphVortexBackground._pointer && typeof glyphVortexBackground._pointer.pushEvent === 'function');
    };

    const primeGlyphVortexPointer = (event) => {
      if (!glyphVortexCanReceivePointer(event)) return;
      try {
        glyphVortexBackground._pointer.prime(event);
        glyphPointerPrimed = true;
        card.dataset.glyphPointerRelay = 'prime';
        glyphVortexBackground._syncLoop?.();
      } catch (_) {}
    };

    const pushGlyphVortexPointer = (event) => {
      if (!glyphVortexCanReceivePointer(event)) return;
      try {
        if (!glyphPointerPrimed) {
          glyphVortexBackground._pointer.prime(event);
          glyphPointerPrimed = true;
        }
        glyphVortexBackground._pointer.pushEvent(event);
        glyphPointerRelayCount += 1;
        card.dataset.glyphPointerRelay = 'active';
        card.dataset.glyphPointerRelayCount = String(glyphPointerRelayCount);
        card.dataset.glyphPointerRelayLast = `${Math.round(event.clientX)},${Math.round(event.clientY)}`;
        glyphVortexBackground._syncLoop?.();
      } catch (_) {}
    };

    card.addEventListener('pointerenter', primeGlyphVortexPointer, { signal, passive: true });
    card.addEventListener('pointermove', pushGlyphVortexPointer, { signal, passive: true });
    card.addEventListener('pointerdown', pushGlyphVortexPointer, { signal, passive: true });
    card.addEventListener('pointerleave', () => {
      glyphPointerPrimed = false;
    }, { signal, passive: true });

    try {
      clockFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Chicago',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (_) {
      clockFormatter = null;
    }

    try {
      dateFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Chicago',
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
    } catch (_) {
      dateFormatter = null;
    }

    const updateChicagoDisplay = () => {
      const now = new Date();
      const iso = now.toISOString();
      if (clock) {
        const timeText = clockFormatter
          ? clockFormatter.format(now)
          : now.toLocaleTimeString('en-US', { hour12: true });
        const displayTime = timeText.toLowerCase().replace(/\s+/g, '');
        clock.textContent = displayTime;
        clock.dateTime = iso;
        clock.setAttribute('aria-label', `Chicago time ${displayTime}`);
      }
      if (date) {
        const dateText = dateFormatter
          ? dateFormatter.format(now)
          : now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
        date.textContent = dateText;
        date.dateTime = iso;
        date.setAttribute('aria-label', `Chicago date ${dateText}`);
      }
    };

    const stopChicagoTimer = () => {
      if (!chicagoTimer) return;
      window.clearInterval(chicagoTimer);
      chicagoTimer = 0;
    };

    const startChicagoTimer = () => {
      if (paused || chicagoTimer || !(clock || date)) return;
      updateChicagoDisplay();
      chicagoTimer = window.setInterval(updateChicagoDisplay, 1000);
    };

    if (clock || date) {
      startChicagoTimer();
    }

    const setActive = (project, force = false) => {
      if (paused && project && !force) return;
      activeProject = project || null;
      projects.forEach((item) => item.classList.toggle('is-active', item === activeProject));
      if (activeProject) card.dataset.activePaletteProject = activeProject.getAttribute('aria-label') || '';
      else delete card.dataset.activePaletteProject;
      scheduleOtherProjectSlideshow();
    };

    projects.forEach((project) => {
      project.addEventListener('pointerenter', () => setActive(project), { signal });
      project.addEventListener('focus', () => setActive(project), { signal });
      project.addEventListener('click', () => setActive(project), { signal });
    });
    stage.addEventListener('pointerleave', () => setActive(null), { signal });
    card.addEventListener('focusout', () => {
      requestAnimationFrame(() => {
        if (!card.contains(document.activeElement)) setActive(null);
      });
    }, { signal });

    return {
      setPaused(value = false) {
        const next = !!value;
        if (paused === next) return;
        paused = next;
        if (paused) {
          stopChicagoTimer();
          window.clearTimeout(effectToggleHideTimer);
          card.classList.remove('is-effect-toggle-visible');
          effectToggleCornerActive = false;
          glyphPointerPrimed = false;
          setActive(null, true);
          if (glyphVortexBackground) {
            glyphVortexBackground.setAttribute('paused', '');
            glyphVortexBackground.dataset.glyphVortexState = 'idle';
          }
          return;
        }
        setPaletteEffectMode(paletteEffectMode);
        startChicagoTimer();
      },
      destroy() {
        destroyed = true;
        unicornRequest++;
        otherProjectTransitionToken++;
        abort.abort();
        stopChicagoTimer();
        window.clearTimeout(effectToggleHideTimer);
        clearOtherProjectSlideshowTimers();
        otherProjectSlideshowObserver?.disconnect();
        clearUnicornScene();
        if (glyphVortexBackground) glyphVortexBackground.setAttribute('paused', '');
        setActive(null, true);
      }
    };
  }

  function initWebsiteSlideshow(root, options = {}) {
    const slideshows = Array.from(root.querySelectorAll('.ascii-website-slideshow'));
    if (!slideshows.length) return { destroy() {} };

    const intervalMs = Math.max(1000, Number(options.websiteSlideshowIntervalMs) || WEBSITE_SLIDESHOW_INTERVAL_MS);
    const controllers = slideshows.map((slideshow) => {
      const slides = Array.from(slideshow.querySelectorAll('.ascii-website-slideshow-slide'));
      const images = slides.map((slide) => slide.querySelector('img')).filter(Boolean);
      if (!slides.length || !images.length) return { destroy() {} };
      let activeIndex = 0;
      let nextWarmIndex = slides.length > 1 ? 1 : 0;
      let timer = 0;
      let idleWarmTimer = 0;
      let idleWarmMode = '';
      let idleWarmIndex = 0;
      let destroyed = false;
      let paused = false;
      const decoded = new WeakSet();

      const decodeImage = async (index) => {
        const image = images[(index + images.length) % images.length];
        if (!image || decoded.has(image)) return;
        image.loading = 'eager';
        image.decoding = 'async';
        if ('fetchPriority' in image) image.fetchPriority = index === activeIndex ? 'auto' : 'low';
        try {
          if (typeof image.decode === 'function') await image.decode();
          else if (!image.complete) await new Promise((resolve, reject) => {
            image.addEventListener('load', resolve, { once: true });
            image.addEventListener('error', reject, { once: true });
          });
          decoded.add(image);
          image.closest('.ascii-website-slideshow-slide')?.classList.add('is-decoded');
        } catch (_) {
          decoded.add(image);
        }
      };

      const preloadAround = (index) => {
        [index, index + 1, index + 2].forEach((target) => {
          decodeImage(target).catch(() => {});
        });
      };

      const clearIdleWarm = () => {
        if (!idleWarmTimer) return;
        if (idleWarmMode === 'idle' && typeof window.cancelIdleCallback === 'function') {
          window.cancelIdleCallback(idleWarmTimer);
        } else {
          window.clearTimeout(idleWarmTimer);
        }
        idleWarmTimer = 0;
        idleWarmMode = '';
      };

      const scheduleIdleWarm = () => {
        if (destroyed || paused || idleWarmTimer || idleWarmIndex >= images.length) return;
        const run = () => {
          idleWarmTimer = 0;
          idleWarmMode = '';
          if (destroyed || idleWarmIndex >= images.length) return;
          const targetIndex = idleWarmIndex;
          idleWarmIndex += 1;
          decodeImage(targetIndex)
            .catch(() => {})
            .then(() => {
              if (!destroyed) scheduleIdleWarm();
            });
        };
        if (typeof window.requestIdleCallback === 'function') {
          idleWarmMode = 'idle';
          idleWarmTimer = window.requestIdleCallback(run, { timeout: 1200 });
        } else {
          idleWarmMode = 'timeout';
          idleWarmTimer = window.setTimeout(run, 140);
        }
      };

      const waitForPaint = () => new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });

      const setNextWarm = (index) => {
        const nextIndex = (index + slides.length) % slides.length;
        if (slides[nextWarmIndex] && nextWarmIndex !== activeIndex) slides[nextWarmIndex].classList.remove('is-next');
        nextWarmIndex = nextIndex;
        if (nextWarmIndex !== activeIndex) slides[nextWarmIndex]?.classList.add('is-next');
        slideshow.dataset.nextSlide = String(nextWarmIndex + 1);
      };

      const setActive = (index) => {
        const previousIndex = activeIndex;
        activeIndex = (index + slides.length) % slides.length;
        if (slides[previousIndex] && previousIndex !== activeIndex) slides[previousIndex].classList.remove('is-active');
        slides[activeIndex]?.classList.add('is-active');
        slides[activeIndex]?.classList.remove('is-next');
        slideshow.dataset.activeSlide = String(activeIndex + 1);
        setNextWarm(activeIndex + 1);
      };

      const schedule = () => {
        window.clearTimeout(timer);
        if (destroyed || paused || document.hidden || slides.length < 2) return;
        timer = window.setTimeout(() => {
          const nextIndex = (activeIndex + 1) % slides.length;
          decodeImage(nextIndex)
            .catch(() => {})
            .then(() => waitForPaint())
            .then(() => {
              if (destroyed) return;
              setActive(nextIndex);
              preloadAround(nextIndex);
              schedule();
            });
        }, intervalMs);
      };

      const handleVisibility = () => {
        if (document.hidden) {
          window.clearTimeout(timer);
          clearIdleWarm();
          return;
        }
        if (paused) return;
        preloadAround(activeIndex);
        scheduleIdleWarm();
        schedule();
      };

      images.forEach((image, index) => {
        image.decoding = 'async';
        image.loading = index < 2 ? 'eager' : 'lazy';
        if ('fetchPriority' in image) image.fetchPriority = index < 2 ? 'auto' : 'low';
      });
      slideshow.classList.add('is-js-controlled');
      slides.forEach((slide) => slide.classList.remove('is-active', 'is-next'));
      setActive(0);
      preloadAround(0);
      scheduleIdleWarm();
      schedule();
      document.addEventListener('visibilitychange', handleVisibility);

      return {
        setPaused(value = false) {
          const next = !!value;
          if (paused === next) return;
          paused = next;
          if (paused) {
            window.clearTimeout(timer);
            clearIdleWarm();
            return;
          }
          preloadAround(activeIndex);
          scheduleIdleWarm();
          schedule();
        },
        destroy() {
          destroyed = true;
          window.clearTimeout(timer);
          clearIdleWarm();
          document.removeEventListener('visibilitychange', handleVisibility);
          slideshow.classList.remove('is-js-controlled');
          slides.forEach((slide) => slide.classList.remove('is-active', 'is-next', 'is-decoded'));
        }
      };
    });

    return {
      setPaused(value = false) {
        controllers.forEach((controller) => controller.setPaused?.(value));
      },
      destroy() {
        controllers.forEach((controller) => controller.destroy());
      }
    };
  }

  class HeroQuoteRotator {
    constructor(root) {
      this.root = root;
      this.quotes = HERO_QUOTES;
      this.container = root.querySelector('[data-hero-quote]');
      this.arabic = this.container?.querySelector('[data-quote-arabic]');
      this.translation = this.container?.querySelector('[data-quote-translation]');
      this.index = 0;
      this.rotateTimer = 0;
      this.swapTimer = 0;
      this.enterTimer = 0;
      this.destroyed = false;
      this.paused = false;
      this.abort = new AbortController();
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (!this.container || !this.arabic || !this.translation || !this.quotes.length) return;
      this.render(0);
      document.addEventListener('visibilitychange', () => this.handleVisibility(), { signal: this.abort.signal });
      this.reducedMotion.addEventListener?.('change', () => this.resetAnimationState(), { signal: this.abort.signal });
      this.schedule();
    }

    render(index) {
      const quote = this.quotes[index];
      if (!quote) return;
      this.index = index;
      this.arabic.textContent = quote.arabic;
      this.translation.textContent = `"${quote.translation}"`;
      this.container.dataset.quoteReference = quote.reference;
      this.container.dataset.quoteSource = quote.source;
      this.container.setAttribute('aria-label', `${quote.reference}: ${quote.translation}`);
      this.container.title = quote.reference;
    }

    schedule() {
      window.clearTimeout(this.rotateTimer);
      if (this.destroyed || this.paused || document.hidden || this.quotes.length < 2) return;
      this.rotateTimer = window.setTimeout(() => this.next(), HERO_QUOTE_INTERVAL_MS);
    }

    next() {
      if (this.destroyed || this.paused || document.hidden) return;
      this.show((this.index + 1) % this.quotes.length);
    }

    show(index) {
      if (this.destroyed || index === this.index) {
        this.schedule();
        return;
      }
      this.resetAnimationState();
      if (this.reducedMotion.matches) {
        this.render(index);
        this.schedule();
        return;
      }
      this.container.classList.add('is-switching-out');
      this.swapTimer = window.setTimeout(() => {
        if (this.destroyed || this.paused) return;
        this.render(index);
        this.container.classList.remove('is-switching-out');
        this.container.classList.add('is-switching-in');
        this.enterTimer = window.setTimeout(() => {
          this.resetAnimationState();
          this.schedule();
        }, 650);
      }, 450);
    }

    resetAnimationState() {
      window.clearTimeout(this.swapTimer);
      window.clearTimeout(this.enterTimer);
      this.container?.classList.remove('is-switching-out', 'is-switching-in');
    }

    handleVisibility() {
      if (document.hidden) {
        window.clearTimeout(this.rotateTimer);
        this.resetAnimationState();
      } else {
        this.schedule();
      }
    }

    setPaused(value = false) {
      const next = !!value;
      if (this.paused === next) return;
      this.paused = next;
      if (this.paused) {
        window.clearTimeout(this.rotateTimer);
        this.resetAnimationState();
        return;
      }
      this.schedule();
    }

    destroy() {
      this.destroyed = true;
      window.clearTimeout(this.rotateTimer);
      this.resetAnimationState();
      this.abort.abort();
    }
  }

  // Agent Choreography Lab authoring controller is kept in _agent-choreography-lab-local.
  window.mountAsciiShaderBackground = function mountAsciiShaderBackground(root, options = {}) {
    if (!root) throw new Error('mountAsciiShaderBackground requires a root element.');
    if (window.asciiApp && window.asciiApp.destroy) console.warn('An ASCII shader background is already mounted. Only one instance is supported.');
    const studioQueryRequested = new URLSearchParams(window.location.search).get('studio') === '1';
    const studioRequested = options.studio === true || (options.allowStudioQuery === true && studioQueryRequested);
    const studioEnabled = studioRequested && typeof AsciiStudioController !== 'undefined';
    if (studioRequested && !studioEnabled) console.warn('Agent Choreography Lab controller is not available in the production bundle.');
    createInternalDom(root);
    root.classList.add('ascii-shader-background-root');
    root.classList.toggle('ascii-controls-hidden', options.showControls === false);
    const scrollSpace = setupScrollSpace(root, options);
    const uiRoot = scrollSpace?.querySelector('[data-ascii-shader-world-layer]') || root;
    const localAudioInput = root.querySelector('#local-audio-input');
    const localTimelineInput = root.querySelector('#local-timeline-input');
    const uiLayer = root.querySelector('#ui-layer');
    if (uiRoot !== root) {
      if (localAudioInput) uiRoot.appendChild(localAudioInput);
      if (localTimelineInput) uiRoot.appendChild(localTimelineInput);
      if (uiLayer) uiRoot.appendChild(uiLayer);
    }
    const initialThemeMode = normalizeThemeMode(options.themeMode || localStorage.getItem(ASCII_THEME_STORAGE_KEY) || currentAsciiThemeMode());
    const app = { root, uiRoot, options, scrollSpace, themeMode: initialThemeMode, visualizerOnly: false, cardSubsystemsPaused: null, midjourneySwirlPaused: null, music: null, shader: null, ascii: null, borders: null, cardGrid: null, skillBadges: null, aboutScrollHint: null, firmCard: null, paletteProjects: null, midjourneySwirl: null, websiteSlideshow: null, careerTimeline: null, contactModal: null, contactForm: null, contactLens: null, quoteRotator: null, ui: null, stats: null, marketQuote: null, chicagoLocation: null, cornerTone: null, tray: null, world: null, keyboard: null, studio: null, perf: null, raf: 0, destroyed: false };
    app.perf = new RenderPerfProbe(options.perfProbe === true, options.perfAsciiMetricsMode);
    if (app.perf.enabled) root.dataset.asciiPerfProbe = 'enabled';
    function publishPerfProbe() {
      if (!app.perf.enabled) return;
      const report = app.perf.snapshot();
      root.dataset.asciiPerfReport = JSON.stringify({
        frameCount: report.frameCount,
        frameDuration: report.frameDuration,
        sections: report.sections,
        lastFrame: report.lastFrame,
        longAnimationFrameCount: report.longAnimationFrames.length
      });
    }
    app.music = new MusicVisualizer(options);
    app.shader = new ShaderEngine(root.querySelector('#shader-source'), app.music);
    app.music.captureAdapter = {
      applyTune: (tune = {}) => {
        if (Number.isFinite(tune.shaderSpeed)) app.shader.state.speed = normalizeTimelineValue('shaderSpeed', tune.shaderSpeed);
        if (Number.isFinite(tune.mouseInfluence)) app.shader.state.mouseInf = normalizeTimelineValue('mouseInfluence', tune.mouseInfluence);
        if (Number.isFinite(tune.asciiBrightness)) app.shader.state.asciiBrightness = normalizeAsciiBrightness(tune.asciiBrightness);
      },
      applyCaptureFrame: (frame, context = {}) => app.ascii?.applyCaptureFrame?.(frame, context.mediaTime, context.now)
    };
    app.shader.onToneChanged = () => { app.ui?.refresh(); app.cornerTone?.refresh(); };
    app.world = options.worldUi === false ? null : new WorldSceneLayout(uiRoot, options);
    app.ascii = new AsciiBackground(root.querySelector('#ascii-bg'), app.shader, app.music, options);
    app.borders = new BorderRenderer(app.shader, uiRoot);
    app.cardGrid = new CardGridController(uiRoot);
    app.skillBadges = new SkillBadgePileController(uiRoot, options);
    app.aboutScrollHint = initTopBlankScrollHint(uiRoot);
    app.firmCard = initFirmCard(uiRoot);
    app.paletteProjects = initPaletteProjectCard(uiRoot);
    app.midjourneySwirl = typeof window.mountMidjourneySwirlPane === 'function'
      ? window.mountMidjourneySwirlPane(uiRoot, { words: ['Nikku', 'Nikshith', 'Nayak'], holdMs: 12000, theme: app.themeMode })
      : null;
    app.websiteSlideshow = initWebsiteSlideshow(uiRoot, options);
    app.careerTimeline = new CareerTimelineController(uiRoot);
    app.contactModal = initContactModal(root, uiRoot);
    app.contactForm = initContactForm(root);
    app.contactLens = initContactLens(root);
    app.quoteRotator = new HeroQuoteRotator(uiRoot);
    app.ui = new UIController(app, options);
    app.stats = new StatsCardsController(app, options);
    app.marketQuote = new MarketQuoteController(app, options);
    app.chicagoLocation = new ChicagoLocationCardController(uiRoot);
    app.cornerTone = new CornerToneSwitchController(app, options);
    app.tray = new PlayerTrayController(app, options);
    app.keyboard = new KeyboardController(app, options);
    app.studio = studioEnabled ? new AsciiStudioController(app, options) : null;
    app.music.onTracksChanged = () => { app.ui.refresh(); app.tray?.preloadDuration(); app.tray?.refresh(true); app.studio?.refresh(true); };
    function setCardSubsystemsPaused(paused = false, state = {}) {
      const next = !!paused;
      const swirlNext = !!state.pauseSwirl;
      if (app.cardSubsystemsPaused !== next) {
        app.cardSubsystemsPaused = next;
        app.aboutScrollHint?.setPaused?.(next);
        app.firmCard?.setPaused?.(next);
        app.paletteProjects?.setPaused?.(next);
        app.websiteSlideshow?.setPaused?.(next);
        app.careerTimeline?.setPaused?.(next);
        app.quoteRotator?.setPaused?.(next);
        if (next) {
          app.skillBadges?.sleep?.();
        } else {
          app.world?.markDirty?.(true);
          app.skillBadges?.requestStaticRender?.();
        }
      }
      if (app.midjourneySwirlPaused !== swirlNext) {
        app.midjourneySwirlPaused = swirlNext;
        app.midjourneySwirl?.setPaused?.(swirlNext);
      }
    }
    let last = performance.now();
    function loop(now) {
      if (app.destroyed) return;
      const delta = Math.min(64, now - last || 16.67);
      last = now;
      const cameraY = readScrollY();
      const visualizerOnly = !!app.visualizerOnly;
      setCardSubsystemsPaused(visualizerOnly, { pauseSwirl: visualizerOnly });
      if (app.perf.enabled) {
        app.perf.beginFrame(now);
        app.perf.section('music.update', () => app.music.update(now));
        app.perf.section('shader.render', () => app.shader.render(now));
        app.ascii.update(now, delta, cameraY, app.perf);
        if (!visualizerOnly) {
          app.perf.section('world.camera', () => app.world?.setCameraY(cameraY));
          if (app.world?.needsUpdate?.()) {
            const laidOut = app.perf.section('world.layout', () => app.world.update());
            app.perf.increment(laidOut ? 'world.layoutRuns' : 'world.layoutSkipped');
          } else {
            app.perf.increment('world.layoutSkipped');
          }
          app.perf.section('contactLens.update', () => app.contactLens?.update(now));
          if (app.skillBadges?.needsFrame?.()) app.perf.section('skillBadges.update', () => app.skillBadges.update(now, delta));
          if (!(document.body.classList.contains('ui-hidden') && options.renderBordersWhenUiHidden === false)) app.perf.section('borders.draw', () => app.borders.draw());
        }
        app.perf.section('ui.update', () => app.ui.update(now));
        app.perf.section('stats.update', () => app.stats.update(now));
        app.perf.section('marketQuote.update', () => app.marketQuote.update(now));
        app.perf.section('tray.update', () => app.tray.update(now));
        app.perf.section('studio.update', () => app.studio?.update(now));
        app.perf.endFrame(performance.now());
        if (app.perf.frames.length % 24 === 0) publishPerfProbe();
      } else {
        app.music.update(now);
        app.shader.render(now);
        app.ascii.update(now, delta, cameraY);
        if (!visualizerOnly) {
          app.world?.setCameraY(cameraY);
          if (app.world?.needsUpdate?.()) app.world.update();
          app.contactLens?.update(now);
          if (app.skillBadges?.needsFrame?.()) app.skillBadges.update(now, delta);
          if (!(document.body.classList.contains('ui-hidden') && options.renderBordersWhenUiHidden === false)) app.borders.draw();
        }
        app.ui.update(now);
        app.stats.update(now);
        app.marketQuote.update(now);
        app.tray.update(now);
        app.studio?.update(now);
      }
      app.raf = requestAnimationFrame(loop);
    }
    app.raf = requestAnimationFrame(loop);
    app.destroy = function destroy() {
      app.destroyed = true;
      cancelAnimationFrame(app.raf);
      app.music.destroy();
      app.keyboard.destroy();
      app.ui.destroy();
      app.stats.destroy();
      app.marketQuote.destroy();
      app.chicagoLocation.destroy();
      app.cornerTone.destroy();
      app.tray.destroy();
      app.perf.destroy();
      app.studio?.destroy();
      app.ascii.destroy();
      app.world?.destroy();
      app.skillBadges?.destroy();
      app.aboutScrollHint?.destroy();
      app.firmCard?.destroy();
      app.paletteProjects?.destroy();
      app.midjourneySwirl?.destroy();
      app.websiteSlideshow?.destroy();
      app.careerTimeline?.destroy();
      app.contactModal?.destroy();
      app.contactForm?.destroy();
      app.contactLens?.destroy();
      app.quoteRotator?.destroy();
      app.cardGrid.destroy();
      app.borders.destroy();
      app.shader.destroy();
      if (app.scrollSpace && app.scrollSpace.__asciiOwned) app.scrollSpace.remove();
      root.innerHTML = '';
    if (window.asciiApp === app) delete window.asciiApp;
    if (window.asciiShaderBackgroundApp === app) delete window.asciiShaderBackgroundApp;
  };
  window.asciiApp = app;
    window.asciiShaderBackgroundApp = app;
    window.asciiShaderBackground = app;
    app.getPerfReport = () => app.perf.snapshot();
    app.getRendererDiagnostics = () => app.ascii.rendererDiagnostics();
    window.toggleUI = () => app.ui.toggle();
    window.toggleAsciiShaderUI = () => app.ui.toggle();
    return { app, destroy: app.destroy };
  };
})();
