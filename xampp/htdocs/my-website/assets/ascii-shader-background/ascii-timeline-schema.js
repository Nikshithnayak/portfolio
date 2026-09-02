(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.AsciiTimelineSchema = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  const VERSION = 2;
  const CONTROL_KEYS = ['sensitivity', 'sharpness', 'rippleAmount', 'gridBurstAmount', 'asciiBrightness', 'shaderSpeed', 'mouseInfluence'];
  const CONTROL_BOUNDS = {
    sensitivity: [0, 1],
    sharpness: [0, 1],
    rippleAmount: [0, 1],
    gridBurstAmount: [0, 1],
    asciiBrightness: [0.45, 1.65],
    shaderSpeed: [0.1, 1.8],
    mouseInfluence: [0, 1.6]
  };

  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const isObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);

  function round(value, places = 3) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    const scale = 10 ** places;
    return Math.round(n * scale) / scale;
  }

  function cleanString(value, fallback = '') {
    const text = typeof value === 'string' ? value.trim() : '';
    return text || fallback;
  }

  function numberOrNull(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function issue(code, path, message) {
    return { code, path, message };
  }

  function timelineVersion(raw) {
    const version = Number(raw?.version ?? raw?.schemaVersion);
    return Number.isFinite(version) && version > 0 ? Math.floor(version) : 1;
  }

  function normalizeTimelineValue(key, value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return key === 'asciiBrightness' ? 1 : 0;
    const bounds = CONTROL_BOUNDS[key] || [0, 1];
    return clamp(n, bounds[0], bounds[1]);
  }

  function normalizeControlFrames(key, frames) {
    if (!Array.isArray(frames)) return [];
    return frames
      .map((frame) => {
        const t = numberOrNull(frame?.t ?? frame?.time);
        const value = numberOrNull(frame?.v ?? frame?.value);
        if (t == null || value == null) return null;
        return { t: round(Math.max(0, t)), v: round(normalizeTimelineValue(key, value)) };
      })
      .filter(Boolean)
      .sort((a, b) => a.t - b.t);
  }

  function normalizeControls(rawControls = {}) {
    const controls = {};
    for (const key of CONTROL_KEYS) {
      const frames = normalizeControlFrames(key, rawControls?.[key]);
      if (frames.length) controls[key] = frames;
    }
    return controls;
  }

  function makeEventId(trackId, event = {}, index = 0) {
    const existing = cleanString(event.id);
    if (existing) return existing;
    const safeTrack = cleanString(trackId, 'timeline').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'timeline';
    const safeType = cleanString(event.type, 'event').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'event';
    const ms = Math.max(0, Math.round((Number(event.t ?? event.time) || 0) * 1000));
    return `${safeTrack}-${safeType}-${String(ms).padStart(6, '0')}-${String(index + 1).padStart(3, '0')}`;
  }

  function maybeNormalized(value) {
    const n = numberOrNull(value);
    return n == null ? null : round(clamp(n));
  }

  function maybePositive(value, fallback = null, places = 3) {
    const n = numberOrNull(value);
    return n == null || n <= 0 ? fallback : round(n, places);
  }

  function normalizeBand(raw = {}) {
    if (!isObject(raw)) return null;
    const band = {};
    const y = maybeNormalized(raw.yNorm ?? raw.rowNorm ?? raw.y);
    const worldY = maybeNormalized(raw.worldYNorm ?? raw.yWorldNorm);
    const h = maybeNormalized(raw.heightNorm ?? raw.hNorm ?? raw.height);
    if (y != null) band.yNorm = y;
    if (worldY != null) band.worldYNorm = worldY;
    if (h != null) band.heightNorm = h;
    const boost = numberOrNull(raw.boost);
    if (boost != null) band.boost = round(clamp(boost));
    const phase = numberOrNull(raw.phase);
    if (phase != null) band.phase = round(phase);
    const drift = numberOrNull(raw.driftNorm ?? raw.drift);
    if (drift != null) band.driftNorm = round(clamp(drift, -1, 1));
    const seed = numberOrNull(raw.seed);
    if (seed != null) band.seed = Math.floor(seed);
    return Object.keys(band).length ? band : null;
  }

  function normalizeCluster(raw = {}) {
    if (!isObject(raw)) return null;
    const cluster = {};
    const x = maybeNormalized(raw.xNorm ?? raw.x);
    const y = maybeNormalized(raw.yNorm ?? raw.y);
    const worldY = maybeNormalized(raw.worldYNorm ?? raw.yWorldNorm);
    const w = maybeNormalized(raw.widthNorm ?? raw.wNorm ?? raw.width ?? raw.w);
    const h = maybeNormalized(raw.heightNorm ?? raw.hNorm ?? raw.height ?? raw.h);
    if (x != null) cluster.xNorm = x;
    if (y != null) cluster.yNorm = y;
    if (worldY != null) cluster.worldYNorm = worldY;
    if (w != null) cluster.widthNorm = w;
    if (h != null) cluster.heightNorm = h;
    const boost = numberOrNull(raw.boost);
    if (boost != null) cluster.boost = round(clamp(boost));
    const seed = numberOrNull(raw.seed);
    if (seed != null) cluster.seed = Math.floor(seed);
    return Object.keys(cluster).length ? cluster : null;
  }

  function normalizeBands(rawBands) {
    return Array.isArray(rawBands) ? rawBands.map(normalizeBand).filter(Boolean) : [];
  }

  function normalizeClusters(rawClusters) {
    return Array.isArray(rawClusters) ? rawClusters.map(normalizeCluster).filter(Boolean) : [];
  }

  function normalizeEvent(rawEvent = {}, index = 0, context = {}) {
    if (!isObject(rawEvent)) return null;
    const t = numberOrNull(rawEvent.t ?? rawEvent.time);
    if (t == null) return null;
    const type = cleanString(rawEvent.type, 'ripple');
    const strength = numberOrNull(rawEvent.strength ?? rawEvent.value);
    const event = {
      id: makeEventId(context.trackId, rawEvent, index),
      t: round(Math.max(0, t)),
      type,
      strength: round(clamp(strength == null ? 0.6 : strength))
    };

    if (type === 'gridBurst' || type === 'grid' || type === 'beatGrid') {
      event.gridType = cleanString(rawEvent.gridType ?? rawEvent.grid ?? rawEvent.kind, 'mood-shift');
      event.frequency = round(Math.max(1, Number(rawEvent.frequency ?? rawEvent.hz ?? 900) || 900), 1);
      const duration = maybePositive(rawEvent.duration);
      if (duration != null) event.duration = duration;
      const seed = numberOrNull(rawEvent.seed);
      if (seed != null) event.seed = Math.floor(seed);
      const bands = normalizeBands(rawEvent.bands);
      const clusters = normalizeClusters(rawEvent.clusters);
      if (bands.length) event.bands = bands;
      if (clusters.length) event.clusters = clusters;
      return event;
    }

    const xNorm = maybeNormalized(rawEvent.xNorm);
    const yNorm = maybeNormalized(rawEvent.yNorm);
    const worldYNorm = maybeNormalized(rawEvent.worldYNorm ?? rawEvent.yWorldNorm);
    const duration = maybePositive(rawEvent.duration);
    const radiusNorm = maybeNormalized(rawEvent.radiusNorm);
    const ringWidth = maybePositive(rawEvent.ringWidth, null, 1);
    const seed = numberOrNull(rawEvent.seed);
    if (xNorm != null) event.xNorm = xNorm;
    if (yNorm != null) event.yNorm = yNorm;
    if (worldYNorm != null) event.worldYNorm = worldYNorm;
    if (duration != null) event.duration = duration;
    if (radiusNorm != null) event.radiusNorm = radiusNorm;
    if (ringWidth != null) event.ringWidth = ringWidth;
    if (seed != null) event.seed = Math.floor(seed);
    return event;
  }

  function normalizeSections(rawSections) {
    if (!Array.isArray(rawSections)) return [];
    return rawSections
      .map((section) => {
        const start = numberOrNull(section?.start ?? section?.t);
        const end = numberOrNull(section?.end ?? section?.to);
        if (start == null || end == null || end <= start) return null;
        return {
          start: round(Math.max(0, start)),
          end: round(Math.max(0, end)),
          label: cleanString(section.label ?? section.name, 'section'),
          intensity: round(clamp(Number(section.intensity ?? 0.5) || 0.5))
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.start - b.start);
  }

  function normalizeYoutube(raw = {}) {
    const youtube = isObject(raw.youtube) ? { ...raw.youtube } : {};
    const id = cleanString(raw.youtubeId ?? raw.youtube?.id ?? raw.youtube?.videoId);
    const url = cleanString(raw.youtubeUrl ?? raw.youtube?.url);
    const startSeconds = numberOrNull(raw.youtubeStartSeconds ?? raw.youtube?.startSeconds ?? raw.youtube?.start);
    const calibrationOffsetMs = numberOrNull(raw.youtubeCalibrationOffsetMs ?? raw.timelineCalibrationOffsetMs ?? raw.calibrationOffsetMs ?? raw.youtube?.calibrationOffsetMs ?? raw.youtube?.timelineOffsetMs);
    if (id) youtube.id = id;
    if (url) youtube.url = url;
    if (startSeconds != null) youtube.startSeconds = round(Math.max(0, startSeconds));
    if (calibrationOffsetMs != null) youtube.calibrationOffsetMs = round(calibrationOffsetMs, 1);
    return Object.keys(youtube).length ? youtube : null;
  }

  function normalizeCaptureTune(rawTune = {}) {
    if (!isObject(rawTune)) return {};
    const tune = {};
    for (const key of CONTROL_KEYS) {
      const value = numberOrNull(rawTune[key]);
      if (value != null) tune[key] = round(normalizeTimelineValue(key, value));
    }
    return tune;
  }

  function normalizeCaptureEffect(raw = {}, index = 0) {
    if (!isObject(raw)) return null;
    const duration = maybePositive(raw.duration);
    const progress = numberOrNull(raw.progress);
    const strength = numberOrNull(raw.strength);
    const effect = {
      id: cleanString(raw.id, cleanString(raw.timelineKey, `capture-effect-${index + 1}`)),
      kind: cleanString(raw.kind, 'effect'),
      timelineKey: cleanString(raw.timelineKey),
      type: cleanString(raw.type),
      duration: duration == null ? 0 : duration,
      progress: progress == null ? 0 : round(clamp(progress), 4),
      strength: strength == null ? 0 : round(clamp(strength))
    };
    const startMediaTime = numberOrNull(raw.startMediaTime);
    if (startMediaTime != null) effect.startMediaTime = round(Math.max(0, startMediaTime));
    const seed = numberOrNull(raw.seed);
    if (seed != null) effect.seed = Math.floor(seed);
    for (const key of ['xNorm', 'yNorm', 'radiusNorm']) {
      const value = maybeNormalized(raw[key]);
      if (value != null) effect[key] = value;
    }
    const worldYNorm = maybeNormalized(raw.worldYNorm ?? raw.yWorldNorm);
    if (worldYNorm != null) effect.worldYNorm = worldYNorm;
    const ringWidth = maybePositive(raw.ringWidth, null, 1);
    if (ringWidth != null) effect.ringWidth = ringWidth;
    const frequency = numberOrNull(raw.frequency);
    if (frequency != null) effect.frequency = round(Math.max(1, frequency), 1);
    const gridType = cleanString(raw.gridType);
    if (gridType) effect.gridType = gridType;
    const bands = normalizeBands(raw.bands);
    const clusters = normalizeClusters(raw.clusters);
    if (bands.length) effect.bands = bands;
    if (clusters.length) effect.clusters = clusters;
    return effect;
  }

  function normalizeCaptureFrame(raw = {}, index = 0) {
    if (!isObject(raw)) return null;
    const t = numberOrNull(raw.t ?? raw.time);
    if (t == null) return null;
    const frame = {
      t: round(Math.max(0, t)),
      state: cleanString(raw.state, 'playing'),
      tune: normalizeCaptureTune(raw.tune || raw.controls || {})
    };
    const effects = isObject(raw.effects) ? raw.effects : {};
    const ripples = Array.isArray(effects.ripples) ? effects.ripples : Array.isArray(raw.ripples) ? raw.ripples : [];
    const grids = Array.isArray(effects.grids) ? effects.grids : Array.isArray(raw.grids) ? raw.grids : [];
    const normalizedRipples = ripples.map((effect, effectIndex) => normalizeCaptureEffect(effect, effectIndex)).filter(Boolean);
    const normalizedGrids = grids.map((effect, effectIndex) => normalizeCaptureEffect(effect, effectIndex)).filter(Boolean);
    if (normalizedRipples.length || normalizedGrids.length) frame.effects = { ripples: normalizedRipples, grids: normalizedGrids };
    const metrics = isObject(raw.metrics) ? raw.metrics : {};
    const canvasHash = cleanString(metrics.canvasHash ?? raw.canvasHash);
    const density = numberOrNull(metrics.density ?? raw.density);
    const averageBrightness = numberOrNull(metrics.averageBrightness ?? raw.averageBrightness);
    if (canvasHash || density != null || averageBrightness != null) {
      frame.metrics = {};
      if (canvasHash) frame.metrics.canvasHash = canvasHash;
      if (density != null) frame.metrics.density = round(clamp(density), 4);
      if (averageBrightness != null) frame.metrics.averageBrightness = round(Math.max(0, averageBrightness), 2);
    }
    return frame;
  }

  function normalizeCapture(rawCapture = {}, context = {}) {
    if (!isObject(rawCapture)) return null;
    const frames = Array.isArray(rawCapture.frames)
      ? rawCapture.frames.map(normalizeCaptureFrame).filter(Boolean).sort((a, b) => a.t - b.t)
      : [];
    if (!frames.length) return null;
    const fps = numberOrNull(rawCapture.fps);
    return {
      version: Math.max(1, Math.floor(Number(rawCapture.version) || 1)),
      source: cleanString(rawCapture.source, 'inspector-snapshot'),
      fps: fps == null ? 8 : round(clamp(fps, 1, 30), 3),
      frameCount: frames.length,
      trackId: cleanString(rawCapture.trackId, context.trackId || ''),
      replay: rawCapture.replay === false ? false : true,
      frames
    };
  }

  function normalize(raw = {}, track = {}, options = {}) {
    const inputVersion = timelineVersion(raw);
    const trackId = cleanString(raw.trackId, cleanString(track.id, 'unknown'));
    const events = Array.isArray(raw.events)
      ? raw.events.map((event, index) => normalizeEvent(event, index, { trackId })).filter(Boolean).sort((a, b) => a.t - b.t)
      : [];
    return {
      version: Number(options.version || VERSION),
      inputVersion,
      trackId,
      title: cleanString(raw.title, cleanString(track.title)),
      duration: round(Math.max(0, Number(raw.duration || 0) || 0)),
      source: cleanString(raw.source, 'visual-timeline'),
      controls: normalizeControls(raw.controls || {}),
      events,
      sections: normalizeSections(raw.sections),
      youtube: normalizeYoutube(raw),
      capture: normalizeCapture(raw.capture, { trackId })
    };
  }

  function validateTimeRanges(raw = {}) {
    const errors = [];
    const duration = numberOrNull(raw.duration);
    if (raw.duration != null && (duration == null || duration < 0)) errors.push(issue('duration.invalid', 'duration', 'duration must be a non-negative number'));
    const hasDuration = duration != null && duration > 0;
    const events = Array.isArray(raw.events) ? raw.events : [];
    events.forEach((event, index) => {
      const path = `events[${index}]`;
      const t = numberOrNull(event?.t ?? event?.time);
      if (t == null || t < 0) errors.push(issue('event.time.invalid', `${path}.t`, 'event time must be a non-negative number'));
      else if (hasDuration && t > duration) errors.push(issue('event.time.range', `${path}.t`, 'event time must be within timeline duration'));
      const eventDuration = numberOrNull(event?.duration);
      if (event?.duration != null && (eventDuration == null || eventDuration <= 0)) errors.push(issue('event.duration.invalid', `${path}.duration`, 'event duration must be positive when provided'));
    });
    for (const key of CONTROL_KEYS) {
      const frames = raw.controls?.[key];
      if (!Array.isArray(frames)) continue;
      frames.forEach((frame, index) => {
        const t = numberOrNull(frame?.t ?? frame?.time);
        if (t == null || t < 0) errors.push(issue('control.time.invalid', `controls.${key}[${index}].t`, 'control frame time must be a non-negative number'));
        else if (hasDuration && t > duration) errors.push(issue('control.time.range', `controls.${key}[${index}].t`, 'control frame time must be within timeline duration'));
      });
    }
    const sections = Array.isArray(raw.sections) ? raw.sections : [];
    sections.forEach((section, index) => {
      const start = numberOrNull(section?.start ?? section?.t);
      const end = numberOrNull(section?.end ?? section?.to);
      if (start == null || start < 0) errors.push(issue('section.start.invalid', `sections[${index}].start`, 'section start must be a non-negative number'));
      if (end == null || end <= (start ?? -Infinity)) errors.push(issue('section.end.invalid', `sections[${index}].end`, 'section end must be greater than section start'));
      else if (hasDuration && end > duration) errors.push(issue('section.end.range', `sections[${index}].end`, 'section end must be within timeline duration'));
    });
    return errors;
  }

  function validateEventIds(raw = {}) {
    const errors = [];
    const seen = new Map();
    const requireIds = timelineVersion(raw) >= 2;
    const events = Array.isArray(raw.events) ? raw.events : [];
    events.forEach((event, index) => {
      const id = cleanString(event?.id);
      if (!id) {
        if (requireIds) errors.push(issue('event.id.missing', `events[${index}].id`, 'V2 events must have a non-empty id'));
        return;
      }
      if (seen.has(id)) errors.push(issue('event.id.duplicate', `events[${index}].id`, `event id duplicates events[${seen.get(id)}].id`));
      else seen.set(id, index);
    });
    return errors;
  }

  function validateSortedEvents(raw = {}) {
    const errors = [];
    const events = Array.isArray(raw.events) ? raw.events : [];
    let previous = -Infinity;
    events.forEach((event, index) => {
      const t = numberOrNull(event?.t ?? event?.time);
      if (t == null) return;
      if (t < previous) errors.push(issue('events.unsorted', `events[${index}].t`, 'events must be sorted by ascending time'));
      previous = t;
    });
    return errors;
  }

  function validateNormField(value, path, errors) {
    const n = numberOrNull(value);
    if (n == null || n < 0 || n > 1) errors.push(issue('normalized.range', path, 'normalized values must be between 0 and 1'));
    return n;
  }

  function validateNormalizedCoords(raw = {}) {
    const errors = [];
    const events = Array.isArray(raw.events) ? raw.events : [];
    events.forEach((event, index) => {
      const base = `events[${index}]`;
      for (const key of ['xNorm', 'yNorm', 'worldYNorm', 'radiusNorm']) {
        if (event?.[key] != null) validateNormField(event[key], `${base}.${key}`, errors);
      }
      const bands = Array.isArray(event?.bands) ? event.bands : [];
      bands.forEach((band, bandIndex) => {
        for (const key of ['yNorm', 'worldYNorm', 'rowNorm', 'heightNorm', 'hNorm']) {
          if (band?.[key] != null) validateNormField(band[key], `${base}.bands[${bandIndex}].${key}`, errors);
        }
      });
      const clusters = Array.isArray(event?.clusters) ? event.clusters : [];
      clusters.forEach((cluster, clusterIndex) => {
        const path = `${base}.clusters[${clusterIndex}]`;
        const x = cluster?.xNorm != null ? validateNormField(cluster.xNorm, `${path}.xNorm`, errors) : null;
        const y = cluster?.yNorm != null ? validateNormField(cluster.yNorm, `${path}.yNorm`, errors) : null;
        if (cluster?.worldYNorm != null) validateNormField(cluster.worldYNorm, `${path}.worldYNorm`, errors);
        const w = cluster?.widthNorm != null ? validateNormField(cluster.widthNorm, `${path}.widthNorm`, errors) : cluster?.wNorm != null ? validateNormField(cluster.wNorm, `${path}.wNorm`, errors) : null;
        const h = cluster?.heightNorm != null ? validateNormField(cluster.heightNorm, `${path}.heightNorm`, errors) : cluster?.hNorm != null ? validateNormField(cluster.hNorm, `${path}.hNorm`, errors) : null;
        if (x != null && w != null && x + w > 1) errors.push(issue('cluster.x.overflow', path, 'cluster xNorm + widthNorm must not exceed 1'));
        if (y != null && h != null && y + h > 1) errors.push(issue('cluster.y.overflow', path, 'cluster yNorm + heightNorm must not exceed 1'));
      });
    });
    return errors;
  }

  function validateControlBounds(raw = {}) {
    const errors = [];
    const controls = isObject(raw.controls) ? raw.controls : {};
    for (const key of CONTROL_KEYS) {
      const frames = controls[key];
      if (!Array.isArray(frames)) continue;
      const [min, max] = CONTROL_BOUNDS[key];
      frames.forEach((frame, index) => {
        const value = numberOrNull(frame?.v ?? frame?.value);
        if (value == null || value < min || value > max) {
          errors.push(issue('control.value.range', `controls.${key}[${index}].v`, `${key} must be between ${min} and ${max}`));
        }
      });
    }
    return errors;
  }

  function validateYoutubeMetadata(raw = {}) {
    const errors = [];
    const hasYoutube = raw.youtube != null || raw.youtubeId != null || raw.youtubeUrl != null || raw.youtubeStartSeconds != null || raw.youtubeCalibrationOffsetMs != null || raw.timelineCalibrationOffsetMs != null || raw.calibrationOffsetMs != null;
    if (!hasYoutube) return errors;
    if (raw.youtube != null && !isObject(raw.youtube)) errors.push(issue('youtube.invalid', 'youtube', 'youtube metadata must be an object when provided'));
    const id = cleanString(raw.youtubeId ?? raw.youtube?.id ?? raw.youtube?.videoId);
    const url = cleanString(raw.youtubeUrl ?? raw.youtube?.url);
    if (!id && !url) errors.push(issue('youtube.id.missing', 'youtube.id', 'youtube metadata must include an id or url'));
    const startSeconds = numberOrNull(raw.youtubeStartSeconds ?? raw.youtube?.startSeconds ?? raw.youtube?.start);
    if ((raw.youtubeStartSeconds != null || raw.youtube?.startSeconds != null || raw.youtube?.start != null) && (startSeconds == null || startSeconds < 0)) {
      errors.push(issue('youtube.start.invalid', 'youtube.startSeconds', 'youtube startSeconds must be a non-negative number'));
    }
    const calibrationOffsetMs = numberOrNull(raw.youtubeCalibrationOffsetMs ?? raw.timelineCalibrationOffsetMs ?? raw.calibrationOffsetMs ?? raw.youtube?.calibrationOffsetMs ?? raw.youtube?.timelineOffsetMs);
    if ((raw.youtubeCalibrationOffsetMs != null || raw.timelineCalibrationOffsetMs != null || raw.calibrationOffsetMs != null || raw.youtube?.calibrationOffsetMs != null || raw.youtube?.timelineOffsetMs != null) && (calibrationOffsetMs == null || Math.abs(calibrationOffsetMs) > 60000)) {
      errors.push(issue('youtube.calibration.range', 'youtube.calibrationOffsetMs', 'youtube calibrationOffsetMs must be between -60000 and 60000'));
    }
    return errors;
  }

  function validateCapture(raw = {}) {
    const errors = [];
    if (raw.capture == null) return errors;
    if (!isObject(raw.capture)) return [issue('capture.invalid', 'capture', 'capture must be an object when provided')];
    const fps = numberOrNull(raw.capture.fps);
    if (raw.capture.fps != null && (fps == null || fps < 1 || fps > 30)) errors.push(issue('capture.fps.range', 'capture.fps', 'capture fps must be between 1 and 30'));
    const frames = Array.isArray(raw.capture.frames) ? raw.capture.frames : [];
    if (!frames.length) return errors;
    const duration = numberOrNull(raw.duration);
    const hasDuration = duration != null && duration > 0;
    let previous = -Infinity;
    frames.forEach((frame, index) => {
      const path = `capture.frames[${index}]`;
      const t = numberOrNull(frame?.t ?? frame?.time);
      if (t == null || t < 0) errors.push(issue('capture.time.invalid', `${path}.t`, 'capture frame time must be a non-negative number'));
      else {
        if (t < previous) errors.push(issue('capture.unsorted', `${path}.t`, 'capture frames must be sorted by ascending time'));
        if (hasDuration && t > duration) errors.push(issue('capture.time.range', `${path}.t`, 'capture frame time must be within timeline duration'));
        previous = t;
      }
      const tune = isObject(frame?.tune) ? frame.tune : isObject(frame?.controls) ? frame.controls : {};
      for (const [key, value] of Object.entries(tune)) {
        if (!CONTROL_BOUNDS[key]) continue;
        const n = numberOrNull(value);
        const [min, max] = CONTROL_BOUNDS[key];
        if (n == null || n < min || n > max) errors.push(issue('capture.tune.range', `${path}.tune.${key}`, `${key} must be between ${min} and ${max}`));
      }
      const effects = isObject(frame?.effects) ? frame.effects : {};
      for (const group of ['ripples', 'grids']) {
        const list = Array.isArray(effects[group]) ? effects[group] : [];
        list.forEach((effect, effectIndex) => {
          const base = `${path}.effects.${group}[${effectIndex}]`;
          if (effect?.duration != null && (numberOrNull(effect.duration) == null || numberOrNull(effect.duration) <= 0)) errors.push(issue('capture.effect.duration.invalid', `${base}.duration`, 'capture effect duration must be positive'));
          for (const key of ['xNorm', 'yNorm', 'worldYNorm', 'radiusNorm']) {
            if (effect?.[key] != null) validateNormField(effect[key], `${base}.${key}`, errors);
          }
          const bands = Array.isArray(effect?.bands) ? effect.bands : [];
          bands.forEach((band, bandIndex) => {
            for (const key of ['yNorm', 'worldYNorm', 'heightNorm']) {
              if (band?.[key] != null) validateNormField(band[key], `${base}.bands[${bandIndex}].${key}`, errors);
            }
          });
          const clusters = Array.isArray(effect?.clusters) ? effect.clusters : [];
          clusters.forEach((cluster, clusterIndex) => {
            const clusterPath = `${base}.clusters[${clusterIndex}]`;
            const x = cluster?.xNorm != null ? validateNormField(cluster.xNorm, `${clusterPath}.xNorm`, errors) : null;
            const y = cluster?.yNorm != null ? validateNormField(cluster.yNorm, `${clusterPath}.yNorm`, errors) : null;
            if (cluster?.worldYNorm != null) validateNormField(cluster.worldYNorm, `${clusterPath}.worldYNorm`, errors);
            const w = cluster?.widthNorm != null ? validateNormField(cluster.widthNorm, `${clusterPath}.widthNorm`, errors) : null;
            const h = cluster?.heightNorm != null ? validateNormField(cluster.heightNorm, `${clusterPath}.heightNorm`, errors) : null;
            if (x != null && w != null && x + w > 1) errors.push(issue('capture.cluster.x.overflow', clusterPath, 'capture cluster xNorm + widthNorm must not exceed 1'));
            if (y != null && h != null && y + h > 1) errors.push(issue('capture.cluster.y.overflow', clusterPath, 'capture cluster yNorm + heightNorm must not exceed 1'));
          });
        });
      }
    });
    return errors;
  }

  function validate(raw = {}) {
    const errors = [
      ...validateTimeRanges(raw),
      ...validateEventIds(raw),
      ...validateSortedEvents(raw),
      ...validateNormalizedCoords(raw),
      ...validateControlBounds(raw),
      ...validateYoutubeMetadata(raw),
      ...validateCapture(raw)
    ];
    return { ok: errors.length === 0, errors };
  }

  return {
    VERSION,
    CONTROL_KEYS,
    CONTROL_BOUNDS,
    round,
    normalizeTimelineValue,
    normalizeControlFrames,
    normalize,
    validate,
    validateTimeRanges,
    validateEventIds,
    validateSortedEvents,
    validateNormalizedCoords,
    validateControlBounds,
    validateYoutubeMetadata,
    validateCapture,
    makeEventId
  };
});
