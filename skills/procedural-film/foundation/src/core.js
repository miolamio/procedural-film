/*
 * core.js : the FILM runtime.
 *
 * Load order everywhere: core.js, lib.js, timeline.js, scenes (sorted), music.js, player.js.
 *
 * Defines window.FILM: the scene registry, the timeline reader, renderFrame(T),
 * transitions between shots, an optional per-shot grade, and the global post-processing (boiling grain).
 *
 * Rules for scene code (see docs/CONTRACT.md):
 *   - Draw only from (t, info). No state carried between frames.
 *   - Use ctx.save()/ctx.restore(). Never call ctx.setTransform/resetTransform with
 *     absolute values: the base transform carries the render scale (FILM.S).
 *     If you really need the base transform back, call FILM.baseTransform(ctx).
 *   - Randomness only from FILM.lib.rng(seed) / FILM.lib.hash(...).
 *   - FILM.lib, FILM.lib.pal and FILM.lib.ease are frozen. Copy before changing anything.
 */
(function () {
  'use strict';

  const root = typeof window !== 'undefined' ? window : globalThis;
  const FILM = (root.FILM = root.FILM || {});

  const DEFAULT_W = 1080;
  const DEFAULT_H = 1920;

  function frameDim(v, fallback) {
    const n = Number(v);
    return n > 0 && isFinite(n) ? n : fallback;
  }

  // Read at use time: core.js loads before timeline.js.
  function frameSize() {
    const tl = FILM.TIMELINE;
    return {
      w: frameDim(tl && tl.width, DEFAULT_W),
      h: frameDim(tl && tl.height, DEFAULT_H),
    };
  }

  Object.defineProperty(FILM, 'W', {
    get() { return frameSize().w; },
    enumerable: true,
    configurable: true,
  });
  Object.defineProperty(FILM, 'H', {
    get() { return frameSize().h; },
    enumerable: true,
    configurable: true,
  });

  // Title-safe rectangle in frame pixels. Keep in step with tools/common.cjs safeArea.
  // 1080×1920 keeps the Shorts/Reels box. 16:9, 1:1 and any other size use 90% of the frame, centred.
  FILM.safeArea = function safeArea(w, h) {
    const f = frameSize();
    const fw = frameDim(w == null ? f.w : w, DEFAULT_W);
    const fh = frameDim(h == null ? f.h : h, DEFAULT_H);
    if (fw === DEFAULT_W && fh === DEFAULT_H) return { x0: 60, y0: 220, x1: 940, y1: 1540 };
    return { x0: fw * 0.05, y0: fh * 0.05, x1: fw * 0.95, y1: fh * 0.95 };
  };

  FILM.FPS = 24;
  FILM.BOIL_FPS = 12;
  FILM.S = 1; // render scale: device pixels per logical pixel
  FILM.registry = {}; // id -> scene definition
  FILM.registered = []; // [{ id, file }] in registration order
  FILM.errors = []; // drawing errors collected by renderFrame (tools clear and read this)
  FILM.strict = false; // when true, renderFrame rethrows scene errors after recording them
  FILM.only = null; // shot id when a tool loaded only that shot's file (snap --only); transitions from an unloaded shot are skipped
  FILM.canvas = null;
  FILM.ctx = null;

  // Global time of the frame being drawn. Read-only for scenes (FILM.lib.T reads it); core sets it before each draw.
  let frameT = 0;
  Object.defineProperty(FILM, 'frameT', { get: () => frameT, enumerable: true, configurable: false });

  const EPS = 1e-6;
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const easeInOutCubic = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

  // Small self-contained hash so core never depends on lib being healthy.
  function ihash(a, b, c) {
    let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b1);
    h ^= h >>> 15;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  // ---------------------------------------------------------------------------
  // Scene registry
  // ---------------------------------------------------------------------------

  FILM.scene = function scene(def) {
    const doc = typeof document !== 'undefined' ? document : null;
    const src = doc && doc.currentScript && doc.currentScript.src ? doc.currentScript.src : '';
    const file = src ? decodeURIComponent(src.split('?')[0].split('/').pop()) : '';
    if (!def || typeof def.id !== 'string' || !def.id || typeof def.draw !== 'function') {
      const msg = `FILM.scene() needs { id: string, draw: function }${file ? ' (in ' + file + ')' : ''}`;
      FILM.errors.push({ T: null, shot: def && def.id, message: msg, file });
      if (typeof console !== 'undefined') console.error(msg);
      return def;
    }
    if (FILM.registry[def.id]) {
      const prev = FILM.registry[def.id].__file || '?';
      const msg = `duplicate scene id '${def.id}' registered by ${file || '?'} (already registered by ${prev})`;
      FILM.errors.push({ T: null, shot: def.id, message: msg, file });
      if (typeof console !== 'undefined') console.error(msg);
    }
    def.__file = file;
    FILM.registry[def.id] = def;
    FILM.registered.push({ id: def.id, file });
    return def;
  };

  // ---------------------------------------------------------------------------
  // Timeline
  // ---------------------------------------------------------------------------

  function modeOf(shot) {
    const m = String((shot && shot.mode) || 'illustrated').toLowerCase();
    if (m === 'none' || m === 'raw') return 'none';
    if (m.indexOf('schem') >= 0 || m.indexOf('blue') >= 0) return 'schematic';
    return 'illustrated';
  }
  FILM.modeOf = modeOf;

  function normTransition(tr) {
    if (!tr) return null;
    if (typeof tr === 'string') tr = { kind: tr };
    const kind = String(tr.kind || tr.type || 'cut').toLowerCase();
    const dur = Number(tr.dur != null ? tr.dur : tr.duration != null ? tr.duration : 0.25);
    return Object.assign({}, tr, { kind, dur: Math.max(0, dur) });
  }

  // Accepts start/end, start/dur, t0/t1, from/to; shots with only a dur chain after the previous one.
  // Writes normalised start, end and dur back onto each shot entry.
  let prepared = null;
  function prepare() {
    const tl = FILM.TIMELINE;
    if (!tl) throw new Error('FILM.TIMELINE is not defined: src/timeline.js did not load');
    const shots = tl.shots || [];
    if (prepared && prepared.tl === tl && prepared.src === shots && prepared.n === shots.length) return prepared;
    let cursor = 0;
    const out = [];
    for (let i = 0; i < shots.length; i++) {
      const s = shots[i];
      const pick = (...keys) => {
        for (const k of keys) if (s[k] != null && isFinite(Number(s[k]))) return Number(s[k]);
        return null;
      };
      let start = pick('start', 't0', 'from', 'in');
      if (start == null) start = cursor;
      let end = pick('end', 't1', 'to', 'out');
      if (end == null) {
        const d = pick('dur', 'duration', 'length');
        end = d != null ? start + d : start;
      }
      s.start = start;
      s.end = end;
      s.dur = end - start;
      s.index = i;
      s.transitionIn = normTransition(s.transitionIn);
      cursor = end;
      out.push(s);
    }
    const duration = tl.duration != null ? Number(tl.duration) : out.length ? out[out.length - 1].end : 0;
    prepared = { tl, src: shots, n: shots.length, shots: out, duration };
    return prepared;
  }
  FILM.prepare = prepare;

  Object.defineProperty(FILM, 'DURATION', {
    get() { return FILM.TIMELINE ? prepare().duration : 0; },
    enumerable: true,
    configurable: true,
  });
  Object.defineProperty(FILM, 'FRAMES', {
    get() { return Math.round(FILM.DURATION * FILM.FPS); },
    enumerable: true,
    configurable: true,
  });
  Object.defineProperty(FILM, 'shots', {
    get() { return FILM.TIMELINE ? prepare().shots : []; },
    enumerable: true,
    configurable: true,
  });

  function shotIndexAt(T) {
    const { shots } = prepare();
    if (!shots.length) return -1;
    for (let i = 0; i < shots.length; i++) {
      if (T < shots[i].end - EPS) return i;
    }
    return shots.length - 1;
  }
  FILM.shotIndexAt = shotIndexAt;
  FILM.activeShot = function activeShot(T) {
    const i = shotIndexAt(T);
    return i < 0 ? null : prepare().shots[i];
  };
  FILM.frameTime = (i) => i / FILM.FPS;
  FILM.shotById = (id) => prepare().shots.find((s) => s.id === id) || null;

  // ---------------------------------------------------------------------------
  // Canvas
  // ---------------------------------------------------------------------------

  function makeCanvas(w, h) {
    if (typeof document !== 'undefined') {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      return c;
    }
    return new OffscreenCanvas(w, h);
  }
  FILM.makeCanvas = makeCanvas;

  let ctxAttrs = {};
  FILM.mount = function mount(canvas, opts) {
    opts = opts || {};
    const S = opts.scale && opts.scale > 0 ? opts.scale : 1;
    FILM.S = S;
    canvas.width = Math.max(2, Math.round((FILM.W * S) / 2) * 2);
    canvas.height = Math.max(2, Math.round((FILM.H * S) / 2) * 2);
    ctxAttrs = { alpha: false };
    if (opts.readback) ctxAttrs.willReadFrequently = true;
    FILM.canvas = canvas;
    FILM.ctx = canvas.getContext('2d', ctxAttrs);
    layers.length = 0;
    return FILM.ctx;
  };

  FILM.baseTransform = function baseTransform(ctx) {
    const c = ctx.canvas;
    ctx.setTransform(c.width / FILM.W, 0, 0, c.height / FILM.H, 0, 0);
  };

  const layers = [];
  function layer(i) {
    const w = FILM.canvas.width;
    const h = FILM.canvas.height;
    let L = layers[i];
    if (!L || L.canvas.width !== w || L.canvas.height !== h) {
      if (window.__cvAudit) window.__cvNextKey = 'layer-' + i;
      const canvas = makeCanvas(w, h);
      if (window.__cvAudit) window.__cvNextKey = null;
      L = layers[i] = { canvas, ctx: canvas.getContext('2d', ctxAttrs) };
    }
    return L;
  }

  // clear=true wipes the bitmap as well (ctx.reset where available).
  // clear=false unwinds any save() a scene left open and restores default state, keeping pixels.
  function resetCtx(ctx, clear) {
    if (clear && typeof ctx.reset === 'function') {
      ctx.reset();
    } else {
      for (let i = 0; i < 64; i++) ctx.restore();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.filter = 'none';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.shadowColor = 'rgba(0,0,0,0)';
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
      ctx.lineWidth = 1;
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
      ctx.miterLimit = 10;
      ctx.fillStyle = '#000';
      ctx.strokeStyle = '#000';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'start';
      ctx.textBaseline = 'alphabetic';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      ctx.beginPath();
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }

  // ---------------------------------------------------------------------------
  // Global post: boiling grain
  // ---------------------------------------------------------------------------

  const TILE = 512;
  const VARIANTS = 4;
  const grainCache = {};

  function grainTile(mode, v) {
    const key = mode + v;
    if (grainCache[key]) return grainCache[key];
    const c = makeCanvas(TILE, TILE);
    const g = c.getContext('2d');
    const img = g.createImageData(TILE, TILE);
    const d = img.data;
    const seed = (mode === 'schematic' ? 9001 : 4242) + v * 131;
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const i = (y * TILE + x) * 4;
        const n = ihash(x, y, seed);
        // paper tooth: soft 2-3 px clumps from a wrapped coarse cell, plus a little per-pixel noise
        const cx0 = (x >> 2) % (TILE >> 2), cy0 = (y >> 2) % (TILE >> 2);
        const fx = ((x & 3) + 0.5) / 4, fy = ((y & 3) + 0.5) / 4;
        const q = TILE >> 2;
        const c00 = ihash(cx0, cy0, seed + 7), c10 = ihash((cx0 + 1) % q, cy0, seed + 7);
        const c01 = ihash(cx0, (cy0 + 1) % q, seed + 7), c11 = ihash((cx0 + 1) % q, (cy0 + 1) % q, seed + 7);
        const cn = (c00 * (1 - fx) + c10 * fx) * (1 - fy) + (c01 * (1 - fx) + c11 * fx) * fy;
        if (mode === 'schematic') {
          const v2 = n * 0.7 + cn * 0.3;
          if (v2 > 0.62) {
            d[i] = 214; d[i + 1] = 220; d[i + 2] = 255;
            d[i + 3] = Math.min(255, (v2 - 0.62) * 2.6 * 50);
          } else if (v2 < 0.3) {
            d[i] = 2; d[i + 1] = 3; d[i + 2] = 12;
            d[i + 3] = (0.3 - v2) * 3.3 * 60;
          }
        } else {
          const v2 = n * 0.35 + cn * 0.65;
          if (v2 > 0.56) {
            d[i] = 58; d[i + 1] = 38; d[i + 2] = 22;
            d[i + 3] = Math.min(255, (v2 - 0.56) * 2.27 * 34);
          } else if (v2 < 0.36) {
            d[i] = 255; d[i + 1] = 250; d[i + 2] = 236;
            d[i + 3] = (0.36 - v2) * 2.8 * 30;
          }
          // rare dark specks
          if (n > 0.99965) { d[i] = 40; d[i + 1] = 26; d[i + 2] = 16; d[i + 3] = 120; }
        }
      }
    }
    g.putImageData(img, 0, 0);
    grainCache[key] = c;
    return c;
  }

  function postShot(ctx, shot, def, T) {
    const mode = modeOf(shot);
    if (mode === 'none') return;
    if (FILM.post === false) return; // tools measure a bare frame; never set in the shipped player
    let cfg = def && def.post !== undefined ? def.post : shot.post;
    if (cfg === false) return;
    let amount = 1;
    if (typeof cfg === 'number') amount = cfg;
    else if (cfg && typeof cfg === 'object' && cfg.grain != null) amount = Number(cfg.grain);
    if (!(amount > 0)) return;
    const b = Math.floor(T * FILM.BOIL_FPS + EPS);
    const v = Math.floor(ihash(b, 17, 3) * VARIANTS);
    const tile = grainTile(mode, v);
    const ox = Math.floor(ihash(b, 29, 5) * TILE);
    const oy = Math.floor(ihash(b, 31, 7) * TILE);
    const c = ctx.canvas;
    // the tile is authored in logical pixels: scale it with the render so previews keep the grain size
    const S = c.width / FILM.W;
    const pattern = ctx.createPattern(tile, 'repeat');
    if (Math.abs(S - 1) > EPS && typeof pattern.setTransform === 'function' && typeof DOMMatrix !== 'undefined') {
      pattern.setTransform(new DOMMatrix([S, 0, 0, S, 0, 0]));
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(1, amount);
    ctx.fillStyle = pattern;
    ctx.translate(-ox * S, -oy * S);
    ctx.fillRect(0, 0, c.width + ox * S, c.height + oy * S);
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Shot grade: after the drawing, before the grain. multiply / screen / overlay
  // and one radial gradient — never getImageData on the frame. A neutral grade
  // returns before touching the context, so an ungraded shot stays byte-identical.
  // ---------------------------------------------------------------------------

  function gradeNum(g, key, lo, hi) {
    if (!g || g[key] == null) return 0;
    const n = Number(g[key]);
    if (!isFinite(n)) return 0;
    return n < lo ? lo : n > hi ? hi : n;
  }

  function gradeActive(g) {
    if (!g || typeof g !== 'object') return false;
    if (g._mixed) return !!(g.warmth || g.fade || g.vignette || g.paperAge || (g.tints && g.tints.length));
    return !!(g.warmth || g.fade || g.vignette || g.paperAge || (g.tint && g.tintAmount));
  }

  function tintEntries(g) {
    const out = [];
    if (!g || typeof g !== 'object') return out;
    if (g._mixed && Array.isArray(g.tints)) {
      for (const t of g.tints) {
        if (t && typeof t.name === 'string' && t.amount > 0) out.push({ name: t.name, amount: t.amount > 1 ? 1 : t.amount });
      }
      return out;
    }
    const amount = gradeNum(g, 'tintAmount', 0, 1);
    if (typeof g.tint === 'string' && amount > 0) out.push({ name: g.tint, amount });
    return out;
  }

  // p is 0 on the outgoing grade and 1 on the incoming one. Two tint names crossfade
  // as two overlays so the colour does not pop at the midpoint.
  function lerpGrade(a, b, p) {
    if (!gradeActive(a) && !gradeActive(b)) return null;
    const q = 1 - p;
    const warmth = gradeNum(a, 'warmth', -1, 1) * q + gradeNum(b, 'warmth', -1, 1) * p;
    const fade = gradeNum(a, 'fade', 0, 1) * q + gradeNum(b, 'fade', 0, 1) * p;
    const vignette = gradeNum(a, 'vignette', 0, 1) * q + gradeNum(b, 'vignette', 0, 1) * p;
    const paperAge = gradeNum(a, 'paperAge', 0, 1) * q + gradeNum(b, 'paperAge', 0, 1) * p;
    const byName = new Map();
    for (const t of tintEntries(a)) byName.set(t.name, (byName.get(t.name) || 0) + t.amount * q);
    for (const t of tintEntries(b)) byName.set(t.name, (byName.get(t.name) || 0) + t.amount * p);
    const tints = [];
    for (const [name, amount] of byName) if (amount > 0) tints.push({ name, amount });
    if (!warmth && !fade && !vignette && !paperAge && !tints.length) return null;
    return { _mixed: true, warmth, fade, vignette, paperAge, tints };
  }

  // Same p the picture uses, so the grade tracks the dissolve.
  // fade, iris and wipe ease (k + 1) / (n + 1). whip, inkwash and morph step by interior frame.
  function transitionMix(tr, inT) {
    const k = Math.max(0, inT * FILM.FPS);
    const n = tr.dur * FILM.FPS;
    if (!(n > 0)) return 1;
    if (tr.kind === 'flash') return clamp01(k / n);
    if (tr.kind === 'whip' || tr.kind === 'inkwash' || tr.kind === 'morph') {
      return clamp01(k / Math.max(1, interiorFrames(tr.dur)));
    }
    return easeInOutCubic(clamp01((k + 1) / (n + 1)));
  }

  function gradeForShot(shot, T, outgoing) {
    const shots = prepare().shots;
    let prev = null;
    let next = null;
    let tr = null;
    let inT = 0;
    if (outgoing) {
      next = shots[shot.index + 1];
      if (!next) return shot.grade;
      prev = shot;
      tr = next.transitionIn;
      inT = T - next.start;
    } else if (shot.index > 0 && shot.transitionIn && shot.transitionIn.kind !== 'cut' && shot.transitionIn.dur > 0) {
      inT = T - shot.start;
      if (inT < shot.transitionIn.dur - EPS) {
        prev = shots[shot.index - 1];
        next = shot;
        tr = shot.transitionIn;
      }
    }
    if (prev && next && tr && tr.kind !== 'cut' && KINDS[tr.kind] && tr.dur > 0 && inT > -EPS && inT < tr.dur - EPS) {
      return lerpGrade(prev.grade, next.grade, transitionMix(tr, inT));
    }
    return shot.grade;
  }

  function palColor(name) {
    const pal = FILM.lib && FILM.lib.pal;
    const c = pal && name ? pal[name] : null;
    return typeof c === 'string' ? c : null;
  }

  function parseHex(hex) {
    if (!hex || hex[0] !== '#') return null;
    let h = hex.slice(1);
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h.slice(0, 6), 16);
    if (!isFinite(n)) return null;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  // Straight-colour source-over, so several uniform washes become one fill.
  function washOver(dst, rgb, srcA) {
    if (!rgb || !(srcA > 0)) return dst;
    if (srcA > 1) srcA = 1;
    if (!dst) return { rgb: rgb, a: srcA };
    const outA = srcA + dst.a * (1 - srcA);
    const k = dst.a * (1 - srcA);
    return {
      rgb: [
        (rgb[0] * srcA + dst.rgb[0] * k) / outA,
        (rgb[1] * srcA + dst.rgb[1] * k) / outA,
        (rgb[2] * srcA + dst.rgb[2] * k) / outA,
      ],
      a: outA,
    };
  }

  function cssRgb(rgb) {
    return 'rgb(' + ((rgb[0] + 0.5) | 0) + ',' + ((rgb[1] + 0.5) | 0) + ',' + ((rgb[2] + 0.5) | 0) + ')';
  }

  const GRADE_WARM = [227, 106, 42];
  const GRADE_COOL = [46, 111, 190];
  const GRADE_CREAM = [247, 241, 228];
  const GRADE_AGE = [228, 196, 138];
  const GRADE_SEPIA = [166, 124, 82];

  // One composite for every uniform control. A second full-frame fill per control
  // costs more than the frame budget; the vignette is a separate cached blit.
  function uniformGrade(warmth, fade, paperAge, tints) {
    let wash = null;
    if (warmth > 0) wash = washOver(wash, GRADE_WARM, warmth * 0.72);
    else if (warmth < 0) wash = washOver(wash, GRADE_COOL, -warmth * 0.72);
    for (let i = 0; i < tints.length; i++) wash = washOver(wash, parseHex(palColor(tints[i].name)), tints[i].amount);
    if (!(fade > 0)) {
      if (paperAge > 0 && !wash) return { op: 'multiply', color: cssRgb(GRADE_SEPIA), alpha: paperAge * 0.85 };
      if (paperAge > 0) wash = washOver(wash, GRADE_SEPIA, paperAge * 0.75);
      if (!wash || !(wash.a > 0)) return null;
      return { op: 'overlay', color: cssRgb(wash.rgb), alpha: wash.a };
    }
    const cream = paperAge > 0 ? GRADE_AGE : GRADE_CREAM;
    const a = paperAge > 0 ? Math.min(1, fade * 0.7 + paperAge * 0.85) : fade * 0.75;
    if (!wash) return { op: 'screen', color: cssRgb(cream), alpha: a };
    wash = washOver(wash, cream, a);
    return { op: 'screen', color: cssRgb(wash.rgb), alpha: wash.a };
  }

  function gradeFill(ctx, w, h, op, color, alpha) {
    if (!(alpha > 0) || !color) return;
    ctx.globalCompositeOperation = op;
    ctx.globalAlpha = alpha > 1 ? 1 : alpha;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
  }

  // White through the subject is a multiply no-op; black at the corner is the falloff.
  // Cached by size: a radial gradient built every frame is several times over budget.
  const vignetteCache = {};
  function vignetteMask(w, h) {
    const key = w + 'x' + h;
    const hit = vignetteCache[key];
    if (hit) return hit;
    const c = makeCanvas(w, h);
    const g = c.getContext('2d');
    const cx = w * 0.5;
    const cy = h * 0.5;
    const r = Math.hypot(cx, cy);
    const grad = g.createRadialGradient(cx, cy, r * 0.28, cx, cy, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, '#ffffff');
    grad.addColorStop(1, '#000000');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    vignetteCache[key] = c;
    return c;
  }

  function applyGrade(ctx, grade) {
    if (!gradeActive(grade)) return;
    const mixed = grade._mixed ? grade : null;
    const warmth = mixed ? grade.warmth : gradeNum(grade, 'warmth', -1, 1);
    const fade = mixed ? grade.fade : gradeNum(grade, 'fade', 0, 1);
    const vignette = mixed ? grade.vignette : gradeNum(grade, 'vignette', 0, 1);
    const paperAge = mixed ? grade.paperAge : gradeNum(grade, 'paperAge', 0, 1);
    const tints = tintEntries(grade);
    if (!warmth && !fade && !vignette && !paperAge && !tints.length) return;
    const c = ctx.canvas;
    const w = c.width;
    const h = c.height;
    const wash = uniformGrade(warmth, fade, paperAge, tints);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.filter = 'none';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowColor = 'rgba(0,0,0,0)';
    if (wash) gradeFill(ctx, w, h, wash.op, wash.color, wash.alpha);
    if (vignette > 0) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = vignette > 1 ? 1 : vignette;
      ctx.drawImage(vignetteMask(w, h), 0, 0);
    }
    ctx.restore();
  }
  FILM.applyGrade = applyGrade;

  // ---------------------------------------------------------------------------
  // Drawing
  // ---------------------------------------------------------------------------

  function drawCard(ctx, title, lines, bg) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, FILM.W, FILM.H);
    ctx.fillStyle = '#fff';
    ctx.font = '600 44px ui-monospace, Menlo, monospace';
    ctx.fillText(title, 60, 200);
    ctx.font = '28px ui-monospace, Menlo, monospace';
    let y = 270;
    for (const line of lines) {
      for (let k = 0; k < line.length; k += 56) {
        ctx.fillText(line.slice(k, k + 56), 60, y);
        y += 40;
      }
    }
  }

  function drawShot(ctx, shot, T, outgoing) {
    resetCtx(ctx, true);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const def = FILM.registry[shot.id];
    let t = Math.max(0, T - shot.start);
    if (outgoing) t = Math.min(t, shot.dur);
    const info = {
      dur: shot.dur,
      p: shot.dur > 0 ? clamp01(t / shot.dur) : 0,
      T,
      frame: Math.floor(T * FILM.FPS + EPS),
      W: FILM.W,
      H: FILM.H,
      S: FILM.S,
      lib: FILM.lib,
      shot,
      mode: modeOf(shot),
      outgoing: !!outgoing,
    };
    frameT = T;
    FILM.baseTransform(ctx);
    if (!def) {
      const msg = `no scene registered for shot '${shot.id}' (expected in ${shot.file || 'src/scenes/?'})`;
      FILM.errors.push({ T, shot: shot.id, message: msg, missing: true });
      drawCard(ctx, 'missing scene', [shot.id, String(shot.file || '')], '#2a2a2a');
    } else {
      try {
        ctx.save();
        def.draw(ctx, t, info);
      } catch (e) {
        FILM.errors.push({ T, shot: shot.id, message: String((e && e.message) || e), stack: e && e.stack });
        resetCtx(ctx, false);
        FILM.baseTransform(ctx);
        drawCard(ctx, 'scene error', [shot.id, String((e && e.message) || e)], '#5a1010');
        if (FILM.strict) throw e;
      }
      resetCtx(ctx, false);
    }
    applyGrade(ctx, gradeForShot(shot, T, outgoing));
    postShot(ctx, shot, def, T);
  }

  // How many frame starts fall strictly inside dur. Whip, inkwash and morph map the first of
  // those to the outgoing shot (p = 0) and stay short of 1, so the frame at `dur` is the incoming shot.
  function interiorFrames(dur) {
    const span = (dur - EPS) * FILM.FPS;
    if (!(span > 0)) return 0;
    const f = Math.floor(span);
    return span - f < 1e-9 ? f : f + 1;
  }

  const WHIP_DIR = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };

  function transitionColor(c, fallback) {
    const pal = FILM.lib && FILM.lib.pal;
    if (typeof c === 'string' && pal && pal[c]) return pal[c];
    if (typeof c === 'string' && c.charAt(0) === '#') return c;
    return fallback;
  }

  function hexRGB(hex) {
    let h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
    const n = parseInt(h.slice(0, 6), 16);
    if (!(n >= 0)) return [42, 28, 19];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  // Outgoing leaves along dir, incoming enters from the opposite side. Ease-in keeps the
  // crossing readable late in the window; ghosts (lib.smear) and speed lines sit on the seam.
  function whipComposite(ctx, A, B, tr, p, w, h) {
    const d = WHIP_DIR[tr.dir];
    if (!d) {
      FILM.errors.push({ T: frameT, message: `whip dir '${tr.dir}' is not one of left, right, up, down` });
      ctx.drawImage(B, 0, 0);
      return;
    }
    const dx = d[0];
    const dy = d[1];
    const e = p * p * p;
    let ox = 0, oy = 0, ix = 0, iy = 0;
    if (dx !== 0) {
      ox = Math.round(dx * w * e);
      ix = dx > 0 ? ox - w : ox + w;
    } else {
      oy = Math.round(dy * h * e);
      iy = dy > 0 ? oy - h : oy + h;
    }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(A, ox, oy);
    ctx.drawImage(B, ix, iy);
    const along = dx !== 0 ? w : h;
    const band = Math.max(12, Math.round(along * 0.16));
    const seam = dx !== 0 ? (dx > 0 ? ox : ix) : (dy > 0 ? oy : iy);
    const lib = FILM.lib;
    if (lib && typeof lib.smear === 'function') {
      ctx.save();
      ctx.beginPath();
      if (dx !== 0) ctx.rect(seam - band, 0, band * 2, h);
      else ctx.rect(0, seam - band, w, band * 2);
      ctx.clip();
      const smearAt = (img, x, y, sign) => {
        lib.smear(ctx, (g, u) => {
          const s = Math.round((u - 0.5) * band * 2.4);
          g.drawImage(img, x + dx * s * sign, y + dy * s * sign);
        }, { from: 0, to: 1, n: 4, mode: 'ghosts', alpha: 0.5, falloff: 1.4 });
      };
      smearAt(A, ox, oy, 1);
      smearAt(B, ix, iy, -1);
      ctx.restore();
    }
    const pal = lib && lib.pal;
    const light = pal && pal.white ? pal.white : '#FBF6EA';
    const dark = pal && pal.ink ? pal.ink : '#2A1C13';
    const gain = Math.pow(Math.max(0.001, Math.sin(Math.PI * p)), 0.4);
    const crossMax = dx !== 0 ? h : w;
    const px = -dy;
    const py = dx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 22; i++) {
      const cross = ihash(i, 3, 9) * crossMax;
      const len = along * (0.22 + 0.48 * ihash(i, 5, 9)) * (0.4 + 0.6 * gain);
      const half = len * 0.5;
      const slide = (ihash(i, 7, 9) - 0.5) * along * 0.06;
      const x1 = dx !== 0 ? seam - dx * half + slide : cross;
      const y1 = dy !== 0 ? seam - dy * half + slide : cross;
      const x2 = dx !== 0 ? seam + dx * half + slide : cross;
      const y2 = dy !== 0 ? seam + dy * half + slide : cross;
      const hw = (4 + ihash(i, 11, 9) * 9) * (0.55 + gain);
      ctx.globalAlpha = (i % 4 === 0 ? 0.72 : 0.4) * (0.5 + 0.5 * gain);
      ctx.fillStyle = i % 5 === 0 ? dark : light;
      ctx.beginPath();
      ctx.moveTo(x1 + px * hw, y1 + py * hw);
      ctx.lineTo(x1 - px * hw, y1 - py * hw);
      ctx.lineTo(x2, y2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // Threshold field cached by size and seed, never by time. A pixel turns on once its
  // threshold is passed, so the mask only grows. Blots first, then distance outside them,
  // ranked so a cut of 233 — round((11/12) * 254), the last interior frame of a 0.5s seam —
  // covers at least 95%. Shorter seams never reach p = 11/12; inkwashComposite scales them.
  const inkFields = new Map();
  let inkStore = null;

  function inkClose(thr, w, h) {
    const nPix = w * h;
    const dist = new Uint16Array(nPix);
    const qx = new Int32Array(nPix);
    const qy = new Int32Array(nPix);
    let qe = 0;
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) {
        const i = row + x;
        if (thr[i] !== 255) continue;
        dist[i] = 65535;
      }
    }
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) {
        if (thr[row + x] === 255) continue;
        qx[qe] = x;
        qy[qe] = y;
        qe++;
      }
    }
    let qs = 0;
    while (qs < qe) {
      const x = qx[qs];
      const y = qy[qs];
      const base = dist[y * w + x] + 1;
      qs++;
      if (x > 0) {
        const j = y * w + (x - 1);
        if (dist[j] > base) { dist[j] = base; qx[qe] = x - 1; qy[qe] = y; qe++; }
      }
      if (x + 1 < w) {
        const j = y * w + (x + 1);
        if (dist[j] > base) { dist[j] = base; qx[qe] = x + 1; qy[qe] = y; qe++; }
      }
      if (y > 0) {
        const j = (y - 1) * w + x;
        if (dist[j] > base) { dist[j] = base; qx[qe] = x; qy[qe] = y - 1; qe++; }
      }
      if (y + 1 < h) {
        const j = (y + 1) * w + x;
        if (dist[j] > base) { dist[j] = base; qx[qe] = x; qy[qe] = y + 1; qe++; }
      }
    }
    const HIST = 4096;
    const hist = new Uint32Array(HIST);
    const keyOf = (i) => {
      if (thr[i] !== 255) return thr[i];
      const d = dist[i] > 3000 ? 3000 : dist[i];
      return 1000 + d;
    };
    for (let i = 0; i < nPix; i++) hist[keyOf(i)]++;
    const cursor = new Uint32Array(HIST);
    let acc = 0;
    for (let k = 0; k < HIST; k++) {
      cursor[k] = acc;
      acc += hist[k];
    }
    const last = nPix > 1 ? nPix - 1 : 1;
    for (let i = 0; i < nPix; i++) {
      const rank = cursor[keyOf(i)]++;
      const f = rank / last;
      let t;
      if (f <= 0.95) {
        t = Math.round((f / 0.95) * 233);
        if (t < 1) t = 1;
      } else {
        t = 234 + Math.round(((f - 0.95) / 0.05) * 20);
        if (t > 254) t = 254;
      }
      thr[i] = t;
    }
  }

  function inkField(w, h, seed) {
    const key = w + 'x' + h + ':' + seed;
    const hit = inkFields.get(key);
    if (hit) return hit;
    const thr = new Uint8Array(w * h);
    thr.fill(255);
    const blobs = 8;
    const diag = Math.hypot(w, h);
    const base = Math.min(w, h);
    for (let b = 0; b < blobs; b++) {
      const cx = (b === 0 ? 0.5 : 0.08 + 0.84 * ihash(b, seed, 1)) * w;
      const cy = (b === 0 ? 0.48 : 0.07 + 0.86 * ihash(b, seed, 2)) * h;
      const rad = (b === 0 ? 0.5 * diag : (0.13 + 0.12 * ihash(b, seed, 3)) * base);
      const ph = ihash(b, seed, 4) * Math.PI * 2;
      const aspect = b === 0 ? 0.86 : 0.7 + 0.55 * ihash(b, seed, 5);
      const cph = Math.cos(ph);
      const sph = Math.sin(ph);
      const R = rad * 1.34;
      const x0 = Math.max(0, cx - R) | 0;
      const y0 = Math.max(0, cy - R) | 0;
      const x1 = Math.min(w - 1, Math.ceil(cx + R));
      const y1 = Math.min(h - 1, Math.ceil(cy + R));
      const step = 2;
      for (let y = y0; y <= y1; y += step) {
        const dy = y - cy;
        for (let x = x0; x <= x1; x += step) {
          const dx = x - cx;
          if (dx * dx + dy * dy > R * R) continue;
          const d = Math.hypot(dx, dy) || 1;
          const c = dx / d;
          const s = dy / d;
          const harm = (c * c - s * s) * cph + 2 * c * s * sph;
          const ry = rad * (1 + 0.3 * harm);
          const rx = ry * aspect;
          const e = Math.hypot(dx / rx, dy / (ry * 0.9));
          const t = e >= 1 ? 255 : Math.max(1, Math.min(254, Math.ceil(e * 254)));
          for (let oy = 0; oy < step && y + oy < h; oy++) {
            for (let ox = 0; ox < step && x + ox < w; ox++) {
              const i = (y + oy) * w + (x + ox);
              if (t < thr[i]) thr[i] = t;
            }
          }
        }
      }
    }
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const c0 = thr[i];
        if (c0 === 255) continue;
        let t = c0 + ((ihash(x, y, seed + 17) - 0.5) * 28) | 0;
        if (t < 1) t = 1;
        else if (t > 254) t = 254;
        thr[i] = t;
      }
    }
    inkClose(thr, w, h);
    inkFields.set(key, thr);
    return thr;
  }

  function inkPack(w, h) {
    const cw = Math.max(1, w >> 1);
    const ch = Math.max(1, h >> 1);
    if (inkStore && inkStore.w === w && inkStore.h === h) return inkStore;
    const mk = () => {
      const c = makeCanvas(cw, ch);
      const g = c.getContext('2d', { alpha: true, willReadFrequently: true });
      return { c, g, img: g.createImageData(cw, ch) };
    };
    const mask = mk();
    const rim = mk();
    const hold = makeCanvas(w, h);
    const bytes = new Uint8Array(4);
    const word = (r, g, b, a) => {
      bytes[0] = r;
      bytes[1] = g;
      bytes[2] = b;
      bytes[3] = a;
      return new Uint32Array(bytes.buffer)[0];
    };
    inkStore = {
      w: w,
      h: h,
      cw: cw,
      ch: ch,
      mc: mask.c,
      mg: mask.g,
      mask: mask.img,
      rc: rim.c,
      rg: rim.g,
      rim: rim.img,
      hold: hold,
      hg: hold.getContext('2d', { alpha: true, willReadFrequently: true }),
      word: word,
    };
    return inkStore;
  }

  function inkwashComposite(ctx, A, B, tr, p, w, h) {
    const seed = Number.isFinite(+tr.seed) ? (+tr.seed) | 0 : 1;
    // Half the device grid: the stipple is already noisy, and a nearest upscale stays binary.
    const cw = Math.max(1, w >> 1);
    const ch = Math.max(1, h >> 1);
    const thr = inkField(cw, ch, seed);
    // p = k/n on interior frames and stays below 1, so round(p * 254) only hits the
    // rank field's closing cut on a 0.5s seam (last p = 11/12). A pure quantile of p
    // stops at (n-1)/n — about 83% at dur 0.25, not closed. Scale a shorter seam's p
    // up to that same cut; a longer one already passes it. p = 0 stays cut 0, and the
    // cut only rises, so the mask only grows.
    const tuned = interiorFrames(0.5);
    const refP = tuned > 1 ? (tuned - 1) / tuned : 1;
    const n = interiorFrames(tr.dur);
    const pLast = n > 1 ? (n - 1) / n : 1;
    const gain = pLast < refP ? refP / pLast : 1;
    const cut = Math.max(0, Math.min(254, Math.round(Math.min(1, p * gain) * 254)));
    const pack = inkPack(w, h);
    const md = pack.mask.data;
    const rd = pack.rim.data;
    const m32 = new Uint32Array(md.buffer, md.byteOffset, md.length >> 2);
    const r32 = new Uint32Array(rd.buffer, rd.byteOffset, rd.length >> 2);
    const rgb = hexRGB(transitionColor(tr.color, '#2A1C13'));
    const onWord = pack.word(0, 0, 0, 255);
    const rimWord = pack.word(rgb[0], rgb[1], rgb[2], 255);
    const band = 18;
    for (let i = 0; i < thr.length; i++) {
      const t = thr[i];
      if (t <= cut) {
        m32[i] = onWord;
        r32[i] = 0;
      } else if (t !== 255 && t <= cut + band) {
        m32[i] = 0;
        r32[i] = rimWord;
      } else {
        m32[i] = 0;
        r32[i] = 0;
      }
    }
    pack.mg.putImageData(pack.mask, 0, 0);
    pack.rg.putImageData(pack.rim, 0, 0);
    const hg = pack.hg;
    hg.setTransform(1, 0, 0, 1, 0, 0);
    hg.globalAlpha = 1;
    hg.globalCompositeOperation = 'source-over';
    hg.clearRect(0, 0, w, h);
    hg.imageSmoothingEnabled = false;
    hg.drawImage(B, 0, 0);
    hg.globalCompositeOperation = 'destination-in';
    hg.drawImage(pack.mc, 0, 0, w, h);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(A, 0, 0);
    ctx.drawImage(pack.hold, 0, 0);
    ctx.drawImage(pack.rc, 0, 0, w, h);
  }

  function morphComposite(ctx, A, B, tr, p, w, h) {
    const lib = FILM.lib;
    let pts;
    try {
      if (!lib || typeof lib.morph !== 'function' || typeof lib.geo !== 'function') throw new Error('lib.morph is not available');
      pts = lib.morph(lib.geo(tr.from).outline(), lib.geo(tr.to).outline(), p, { n: 160 });
    } catch (err) {
      FILM.errors.push({ T: frameT, message: `morph transition: ${err && err.message ? err.message : err}` });
      ctx.drawImage(B, 0, 0);
      return;
    }
    const open = 1 - Math.pow(1 - p, 1.6);
    const s = 0.12 + 0.88 * open;
    let cx = 0, cy = 0;
    for (let i = 0; i < pts.length; i++) {
      cx += pts[i][0];
      cy += pts[i][1];
    }
    cx /= pts.length;
    cy /= pts.length;
    const Sx = w / FILM.W;
    const Sy = h / FILM.H;
    const path = new Path2D();
    for (let i = 0; i < pts.length; i++) {
      const x = (cx + (pts[i][0] - cx) * s) * Sx;
      const y = (cy + (pts[i][1] - cy) * s) * Sy;
      if (i === 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    }
    path.closePath();
    ctx.drawImage(A, 0, 0);
    ctx.save();
    ctx.clip(path);
    ctx.drawImage(B, 0, 0);
    ctx.restore();
    ctx.lineWidth = Math.max(2, 6 * Sx);
    ctx.strokeStyle = (lib.pal && lib.pal.ink) || '#2A1C13';
    ctx.lineJoin = 'round';
    ctx.stroke(path);
  }

  // fade, iris and wipe: A is the outgoing shot, B the incoming one, p in (0, 1) exclusive.
  // whip, inkwash and morph include p = 0 (outgoing alone). Their p stays below 1 inside the window.
  function composite(ctx, A, B, tr, p) {
    resetCtx(ctx, true);
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    if (tr.kind === 'whip') whipComposite(ctx, A, B, tr, p, w, h);
    else if (tr.kind === 'inkwash') inkwashComposite(ctx, A, B, tr, p, w, h);
    else if (tr.kind === 'morph') morphComposite(ctx, A, B, tr, p, w, h);
    else {
      const e = easeInOutCubic(p);
      ctx.drawImage(A, 0, 0);
      switch (tr.kind) {
        case 'fade':
          ctx.globalAlpha = e;
          ctx.drawImage(B, 0, 0);
          break;
        case 'iris': {
          const S = w / FILM.W;
          const cx = (tr.x != null ? tr.x : FILM.W / 2) * S;
          const cy = (tr.y != null ? tr.y : FILM.H / 2) * S;
          const R = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy));
          ctx.beginPath();
          ctx.arc(cx, cy, Math.max(0.001, e * R), 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(B, 0, 0);
          break;
        }
        case 'wipe': {
          const dir = tr.dir || 'down';
          ctx.beginPath();
          if (dir === 'up') ctx.rect(0, h * (1 - e), w, h * e);
          else if (dir === 'left') ctx.rect(w * (1 - e), 0, w * e, h);
          else if (dir === 'right') ctx.rect(0, 0, w * e, h);
          else ctx.rect(0, 0, w, h * e);
          ctx.clip();
          ctx.drawImage(B, 0, 0);
          break;
        }
        default:
          ctx.drawImage(B, 0, 0);
      }
    }
    resetCtx(ctx, false);
  }

  const KINDS = { cut: 1, fade: 1, flash: 1, iris: 1, wipe: 1, whip: 1, inkwash: 1, morph: 1 };
  FILM.TRANSITION_KINDS = Object.keys(KINDS);

  /** Draws global time T (seconds) to FILM.canvas. Returns the active shot entry. */
  FILM.renderFrame = function renderFrame(T) {
    const P = prepare();
    if (!FILM.ctx) throw new Error('FILM.renderFrame: call FILM.mount(canvas) first');
    T = Number(T) || 0;
    if (T < 0) T = 0;
    if (P.duration > 0 && T > P.duration) T = P.duration;
    const idx = shotIndexAt(T);
    const ctx = FILM.ctx;
    if (idx < 0) {
      resetCtx(ctx, true);
      FILM.baseTransform(ctx);
      drawCard(ctx, 'empty timeline', ['FILM.TIMELINE.shots is empty'], '#222');
      return null;
    }
    const shot = P.shots[idx];
    const tr = shot.transitionIn;
    const inT = T - shot.start;
    if (!(idx > 0 && tr && tr.kind !== 'cut' && tr.dur > 0 && inT < tr.dur - EPS)) {
      drawShot(ctx, shot, T, false);
      return shot;
    }
    if (!KINDS[tr.kind]) {
      FILM.errors.push({ T, shot: shot.id, message: `unknown transition kind '${tr.kind}'` });
      drawShot(ctx, shot, T, false);
      return shot;
    }
    // Frames are sampled at their start, so frame k of an n-frame transition sits at inT = k / FPS.
    const k = Math.max(0, inT * FILM.FPS);
    const n = tr.dur * FILM.FPS;
    if (tr.kind === 'flash') {
      // The flash peaks on the cut frame (full colour over the incoming shot) and clears by the
      // end of the transition, so a hit on the cut lands on the white frame.
      drawShot(ctx, shot, T, false);
      const q = clamp01(k / n);
      resetCtx(ctx, false);
      ctx.globalAlpha = (1 - q) * (1 - q);
      ctx.fillStyle = tr.color || '#fff8ea';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      resetCtx(ctx, false);
      return shot;
    }
    const prev = P.shots[idx - 1];
    if (FILM.only && !FILM.registry[prev.id]) {
      // a tool loaded only this shot's file: the outgoing shot is not here, so show the incoming shot alone
      drawShot(ctx, shot, T, false);
      return shot;
    }
    // fade, iris and wipe: frame 0 is already 1/(n+1) of the way in, the last transition frame
    // (n-1) is n/(n+1), so neither shot's own frame is repeated.
    // whip, inkwash and morph: p = 0 on the first frame (outgoing shot alone). p stays below 1
    // until dur has elapsed, and that next frame is the incoming shot alone.
    const fresh = tr.kind === 'whip' || tr.kind === 'inkwash' || tr.kind === 'morph';
    const p = fresh
      ? clamp01(k / Math.max(1, interiorFrames(tr.dur)))
      : clamp01((k + 1) / (n + 1));
    if (fresh && !(p > 0)) {
      drawShot(ctx, prev, T, true);
      return shot;
    }
    const A = layer(0);
    const B = layer(1);
    drawShot(A.ctx, prev, T, true);
    drawShot(B.ctx, shot, T, false);
    composite(ctx, A.canvas, B.canvas, tr, p);
    return shot;
  };
})();
