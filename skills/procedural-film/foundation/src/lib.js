/*
 * lib.js : FILM.lib, the shared drawing library.
 *
 * Everything here is a pure function of its arguments plus FILM.lib.T (the global time
 * core sets before each shot draws, used only for the 12 fps line boil).
 * Randomness comes from rng(seed) and hash(...). Caches are keyed by every input.
 *
 * Shape inputs ("clip") accepted by hatch, crossHatch, stipple and hexLattice:
 *   - an array of points [[x,y], ...] or [{x,y}, ...]      (fast: exact spans, natural ends)
 *   - an array of polygons [[[x,y],...], [[x,y],...]]      (even-odd, so inner polygons are holes)
 *   - a function (ctx) => { ctx.moveTo...; ctx.arc... }     (hard clip; pass opts.bounds for speed)
 *   - a Path2D                                             (hard clip; pass opts.bounds for speed)
 *   - null                                                 (no clip; opts.bounds or the whole frame)
 * Bounds are { x, y, w, h } or [x, y, w, h] in the current (logical) coordinates.
 *
 * Angles are radians. Sizes are logical pixels on the 1080x1920 frame.
 */
(function () {
  'use strict';

  const FILM = (window.FILM = window.FILM || {});
  const lib = (FILM.lib = {});
  const W = () => FILM.W || 1080;
  const H = () => FILM.H || 1920;
  const TAU = Math.PI * 2;

  lib.TAU = TAU;
  // global time of the frame being drawn; core sets it before each shot draws, scenes can only read it
  Object.defineProperty(lib, 'T', { get: () => FILM.frameT || 0, enumerable: true });

  // ===========================================================================
  // Numbers
  // ===========================================================================

  const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const invLerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
  const smoothstep = (e0, e1, x) => {
    const t = clamp(invLerp(e0, e1, x));
    return t * t * (3 - 2 * t);
  };
  lib.clamp = clamp;
  lib.lerp = lerp;
  lib.invLerp = invLerp;
  lib.smoothstep = smoothstep;

  // ===========================================================================
  // Easing (inputs are clamped to 0..1)
  // ===========================================================================

  const c01 = (p) => (p < 0 ? 0 : p > 1 ? 1 : p);
  const B1 = 1.70158;
  const B2 = B1 * 1.525;
  const ease = {
    linear: (p) => c01(p),
    inQuad: (p) => ((p = c01(p)), p * p),
    outQuad: (p) => ((p = c01(p)), 1 - (1 - p) * (1 - p)),
    inOutQuad: (p) => ((p = c01(p)), p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2),
    inCubic: (p) => ((p = c01(p)), p * p * p),
    outCubic: (p) => ((p = c01(p)), 1 - Math.pow(1 - p, 3)),
    inOutCubic: (p) => ((p = c01(p)), p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    inQuart: (p) => ((p = c01(p)), p * p * p * p),
    outQuart: (p) => ((p = c01(p)), 1 - Math.pow(1 - p, 4)),
    inOutQuart: (p) => ((p = c01(p)), p < 0.5 ? 8 * p * p * p * p : 1 - Math.pow(-2 * p + 2, 4) / 2),
    inQuint: (p) => ((p = c01(p)), p * p * p * p * p),
    outQuint: (p) => ((p = c01(p)), 1 - Math.pow(1 - p, 5)),
    inOutQuint: (p) => ((p = c01(p)), p < 0.5 ? 16 * p * p * p * p * p : 1 - Math.pow(-2 * p + 2, 5) / 2),
    inSine: (p) => ((p = c01(p)), 1 - Math.cos((p * Math.PI) / 2)),
    outSine: (p) => ((p = c01(p)), Math.sin((p * Math.PI) / 2)),
    inOutSine: (p) => ((p = c01(p)), -(Math.cos(Math.PI * p) - 1) / 2),
    inExpo: (p) => ((p = c01(p)), p === 0 ? 0 : Math.pow(2, 10 * p - 10)),
    outExpo: (p) => ((p = c01(p)), p === 1 ? 1 : 1 - Math.pow(2, -10 * p)),
    inOutExpo: (p) => ((p = c01(p)), p === 0 ? 0 : p === 1 ? 1 : p < 0.5 ? Math.pow(2, 20 * p - 10) / 2 : (2 - Math.pow(2, -20 * p + 10)) / 2),
    inCirc: (p) => ((p = c01(p)), 1 - Math.sqrt(1 - p * p)),
    outCirc: (p) => ((p = c01(p)), Math.sqrt(1 - Math.pow(p - 1, 2))),
    inOutCirc: (p) => ((p = c01(p)), p < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * p, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * p + 2, 2)) + 1) / 2),
    inBack: (p) => ((p = c01(p)), (B1 + 1) * p * p * p - B1 * p * p),
    outBack: (p) => ((p = c01(p)), 1 + (B1 + 1) * Math.pow(p - 1, 3) + B1 * Math.pow(p - 1, 2)),
    inOutBack: (p) => ((p = c01(p)), p < 0.5 ? (Math.pow(2 * p, 2) * ((B2 + 1) * 2 * p - B2)) / 2 : (Math.pow(2 * p - 2, 2) * ((B2 + 1) * (p * 2 - 2) + B2) + 2) / 2),
    outElastic: (p) => ((p = c01(p)), p === 0 ? 0 : p === 1 ? 1 : Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * (TAU / 3)) + 1),
    outBounce: (p) => {
      p = c01(p);
      const n = 7.5625, d = 2.75;
      if (p < 1 / d) return n * p * p;
      if (p < 2 / d) return n * (p -= 1.5 / d) * p + 0.75;
      if (p < 2.5 / d) return n * (p -= 2.25 / d) * p + 0.9375;
      return n * (p -= 2.625 / d) * p + 0.984375;
    },
    /** Snappy settle used for drawn-animation poses: fast out, tiny overshoot. */
    snap: (p) => ((p = c01(p)), 1 + 2.2 * Math.pow(p - 1, 3) + 1.2 * Math.pow(p - 1, 2)),
    /** Factory: hold-and-jump in n steps. */
    steps: (n) => (p) => Math.min(1, Math.floor(c01(p) * n) / n),
  };
  lib.ease = ease;

  const easeFn = (e) => (typeof e === 'function' ? e : typeof e === 'string' && ease[e] ? ease[e] : ease.linear);

  /** mapRange(x, a0, a1, b0, b1, easing?) clamps x into [a0,a1] and maps to [b0,b1]. */
  lib.mapRange = (x, a0, a1, b0, b1, e) => b0 + (b1 - b0) * easeFn(e)(clamp(invLerp(a0, a1, x)));
  /** seg(t, t0, t1, easing?) : 0..1 progress of t through [t0,t1]. */
  lib.seg = (t, t0, t1, e) => easeFn(e)(clamp(invLerp(t0, t1, t)));

  // ===========================================================================
  // Hash, rng, noise
  // ===========================================================================

  const F64 = new Float64Array(1);
  const U32 = new Uint32Array(F64.buffer);
  function mix32(h) {
    h ^= h >>> 16;
    h = Math.imul(h, 0x7feb352d);
    h ^= h >>> 15;
    h = Math.imul(h, 0x846ca68b);
    h ^= h >>> 16;
    return h >>> 0;
  }
  /** hash(...values) : stable unsigned 32-bit int from numbers and strings. */
  function hash() {
    let h = 0x811c9dc5 ^ arguments.length;
    for (let a = 0; a < arguments.length; a++) {
      const v = arguments[a];
      if (typeof v === 'number') {
        if ((v | 0) === v) {
          h = mix32(h ^ Math.imul(v, 0x9e3779b1));
        } else {
          F64[0] = v;
          h = mix32(h ^ U32[0]);
          h = mix32(h ^ U32[1]);
        }
      } else {
        const s = String(v);
        for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
        h = mix32(h ^ s.length);
      }
    }
    return h >>> 0;
  }
  lib.hash = hash;

  const seedInt = (s) => (typeof s === 'number' && (s | 0) === s ? s : hash(s) | 0);

  /** Fast stateless 3-int hash to [0,1). */
  function h3(a, b, c) {
    let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b1);
    h ^= h >>> 15;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  lib.h3 = h3;

  /** rng(seed) : function returning [0,1). Has .range(a,b) .int(a,b) .pick(arr) .sign() .chance(p) .gauss(). */
  function rng(seed) {
    let a = hash(seed === undefined ? 1 : seed) || 0x9e3779b9;
    const r = function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.range = (lo, hi) => lo + (hi - lo) * r();
    r.int = (lo, hi) => lo + Math.floor((hi - lo + 1) * r());
    r.pick = (arr) => arr[Math.floor(r() * arr.length)];
    r.sign = () => (r() < 0.5 ? -1 : 1);
    r.chance = (p) => r() < p;
    r.gauss = () => {
      const u = 1 - r();
      const v = r();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
    };
    return r;
  }
  lib.rng = rng;

  const fade5 = (f) => f * f * f * (f * (f * 6 - 15) + 10);

  /** noise1(x, seed) : smooth 1D gradient noise in [-1,1]. */
  function noise1(x, seed) {
    const s = seed === undefined ? 0 : seedInt(seed);
    const i = Math.floor(x);
    const f = x - i;
    const g0 = h3(i, 71, s) * 2 - 1;
    const g1 = h3(i + 1, 71, s) * 2 - 1;
    const v = lerp(g0 * f, g1 * (f - 1), fade5(f)) * 2;
    return v < -1 ? -1 : v > 1 ? 1 : v;
  }
  lib.noise1 = noise1;

  const GX = [1, -1, 1, -1, 1.4142, -1.4142, 0, 0];
  const GY = [1, 1, -1, -1, 0, 0, 1.4142, -1.4142];
  function grad(ix, iy, s, x, y) {
    const k = (h3(ix, iy, s) * 8) | 0;
    return GX[k] * x + GY[k] * y;
  }
  /** noise2(x, y, seed) : smooth 2D gradient noise in [-1,1]. */
  function noise2(x, y, seed) {
    const s = seed === undefined ? 0 : seedInt(seed);
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const u = fade5(fx);
    const v = fade5(fy);
    const n00 = grad(ix, iy, s, fx, fy);
    const n10 = grad(ix + 1, iy, s, fx - 1, fy);
    const n01 = grad(ix, iy + 1, s, fx, fy - 1);
    const n11 = grad(ix + 1, iy + 1, s, fx - 1, fy - 1);
    const r = lerp(lerp(n00, n10, u), lerp(n01, n11, u), v) * 1.1;
    return r < -1 ? -1 : r > 1 ? 1 : r;
  }
  lib.noise2 = noise2;

  lib.fbm1 = (x, seed, oct = 3) => {
    const s = seed === undefined ? 0 : seedInt(seed);
    let a = 0.5, f = 1, sum = 0, norm = 0;
    for (let o = 0; o < oct; o++) {
      sum += a * noise1(x * f, s + o * 101);
      norm += a;
      a *= 0.5;
      f *= 2.03;
    }
    return sum / norm;
  };
  lib.fbm2 = (x, y, seed, oct = 3) => {
    const s = seed === undefined ? 0 : seedInt(seed);
    let a = 0.5, f = 1, sum = 0, norm = 0;
    for (let o = 0; o < oct; o++) {
      sum += a * noise2(x * f, y * f, s + o * 101);
      norm += a;
      a *= 0.5;
      f *= 2.03;
    }
    return sum / norm;
  };

  // ===========================================================================
  // Animation clocks
  // ===========================================================================

  /** boil(T, fps=12) : index of the held drawing at global time T. Lines re-wobble when it changes. */
  lib.boil = (T, fps = 12) => Math.floor(T * fps + 1e-6);
  /** onTwos(t) : quantise time to 1/12 s so motion steps like drawn animation. */
  lib.onTwos = (t) => Math.floor(t * 12 + 1e-6) / 12;

  function boilIndex(o) {
    if (o.boil === false) return 0;
    if (typeof o.boil === 'number') return o.boil;
    return lib.boil(lib.T);
  }

  // ===========================================================================
  // Colour
  // ===========================================================================

  // Keys and values follow docs/art-bible.md section 2 (the published palette).
  const pal = {
    // 2.1 warm illustrated palette (paper plate)
    paper: '#EFE3C9',
    paperShade: '#E2D1B0',
    paperDeep: '#CDB58C',
    stripeCream: '#F2E7CF',
    stripeYellow: '#EFDCA3',
    stripeApricot: '#F0D9B5',
    stripeSage: '#DCE3CC',
    stripeSpring: '#E4EDD0',
    stripeSky: '#C9D3D2',
    ink: '#2A1C13',
    inkSoft: '#5B4331',
    inkFaint: '#8A735C',
    tan: '#C8A47A',
    ochre: '#C38F2E',
    rose: '#C88C86',
    duskRose: '#E3B1A1',
    sage: '#94A47F',
    teal: '#3C8783',
    tealDeep: '#285F5D',
    sun: '#F1BF4A',
    nightSky: '#4E3F6E',
    night: '#2F2748',
    white: '#FBF6EA',
    orange: '#D8742B',
    leaf: '#6E8F4F',
    wood: '#A8784C',
    sunset: '#E79D8F',
    dusk: '#5A4878',
    red: '#BF3F2C',
    // 2.2 subject palette, warm — filled per film from docs/art-bible.md section 2.2.
    // Add the subject's named colours here exactly as the art bible publishes them:
    //     hero: '#D9772B',
    //     heroDeep: '#B55A1C',
    // Scene code reads them as lib.pal.<name>.
    // 2.3 cool schematic palette (blueprint plate)
    navy: '#0B1230',
    navyDeep: '#060A1C',
    navyLight: '#18234D',
    grid: '#3A4A86',
    lavender: '#C8C1EF',
    lineWhite: '#EEF0FF',
    paleBlue: '#9CC2EA',
    glow: '#FFF3DC',
    magenta: '#FF3D98',
    // Subject identity tints — 1 to 3 per film, from art-bible 2.3, e.g. schemHero: '#F2A66A'.
    // Line or dot colours only, never fills; a schematic shot uses at most one besides magenta.
    // 2.4 overlay colours on illustrations
    annMagenta: '#E43D8C',
    annBlue: '#3B8EE0',
    annYellow: '#EAB530',
  };
  // earlier names kept as aliases
  pal.stripeA = pal.stripeCream;
  pal.stripeB = pal.stripeYellow;
  lib.pal = pal;

  const rgbCache = {};
  function parseColor(c) {
    if (rgbCache[c]) return rgbCache[c];
    let r = 0, g = 0, b = 0;
    if (c[0] === '#') {
      let h = c.slice(1);
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      const n = parseInt(h.slice(0, 6), 16);
      r = (n >> 16) & 255;
      g = (n >> 8) & 255;
      b = n & 255;
    } else {
      const m = c.match(/[\d.]+/g) || [0, 0, 0];
      r = +m[0];
      g = +m[1];
      b = +m[2];
    }
    return (rgbCache[c] = [r, g, b]);
  }
  lib.rgb = parseColor;
  /** rgba('#hex' or pal colour, alpha) : css string. */
  lib.rgba = (c, a = 1) => {
    const [r, g, b] = parseColor(c);
    return `rgba(${r},${g},${b},${a})`;
  };
  /** mix(colorA, colorB, t) : css string between two colours. */
  lib.mix = (a, b, t) => {
    const A = parseColor(a);
    const B = parseColor(b);
    return `rgb(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))})`;
  };

  // ===========================================================================
  // Geometry helpers
  // ===========================================================================

  const XY = (p) => (Array.isArray(p) ? p : [p.x, p.y]);

  lib.ellipsePts = (cx, cy, rx, ry = rx, n = 64, rot = 0) => {
    const out = [];
    const cr = Math.cos(rot), sr = Math.sin(rot);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
      out.push([cx + x * cr - y * sr, cy + x * sr + y * cr]);
    }
    return out;
  };
  lib.rectPts = (x, y, w, h, stepPx = 24) => {
    const out = [];
    const edge = (x0, y0, x1, y1) => {
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / stepPx));
      for (let i = 0; i < n; i++) out.push([lerp(x0, x1, i / n), lerp(y0, y1, i / n)]);
    };
    edge(x, y, x + w, y);
    edge(x + w, y, x + w, y + h);
    edge(x + w, y + h, x, y + h);
    edge(x, y + h, x, y);
    return out;
  };
  lib.rrectPts = (x, y, w, h, r, stepPx = 24) => {
    r = Math.min(r, w / 2, h / 2);
    const out = [];
    const line = (x0, y0, x1, y1) => {
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / stepPx));
      for (let i = 0; i < n; i++) out.push([lerp(x0, x1, i / n), lerp(y0, y1, i / n)]);
    };
    const corner = (cx, cy, a0) => {
      const n = Math.max(2, Math.ceil((r * Math.PI) / 2 / (stepPx * 0.5)));
      for (let i = 0; i < n; i++) {
        const a = a0 + (i / n) * (Math.PI / 2);
        out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
    };
    line(x + r, y, x + w - r, y);
    corner(x + w - r, y + r, -Math.PI / 2);
    line(x + w, y + r, x + w, y + h - r);
    corner(x + w - r, y + h - r, 0);
    line(x + w - r, y + h, x + r, y + h);
    corner(x + r, y + h - r, Math.PI / 2);
    line(x, y + h - r, x, y + r);
    corner(x + r, y + r, Math.PI);
    return out;
  };
  /** capsulePts(cx, cy, length, radius, rot, n) : a stadium shape along its rotated long axis. */
  lib.capsulePts = (cx, cy, len, r, rot = 0, n = 72) => {
    const out = [];
    const half = Math.max(0, len / 2 - r);
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const k = Math.floor(n / 2);
    for (let i = 0; i <= k; i++) {
      const a = -Math.PI / 2 + (i / k) * Math.PI;
      const x = half + Math.cos(a) * r, y = Math.sin(a) * r;
      out.push([cx + x * cr - y * sr, cy + x * sr + y * cr]);
    }
    for (let i = 0; i <= k; i++) {
      const a = Math.PI / 2 + (i / k) * Math.PI;
      const x = -half + Math.cos(a) * r, y = Math.sin(a) * r;
      out.push([cx + x * cr - y * sr, cy + x * sr + y * cr]);
    }
    return out;
  };

  /**
   * geo(id) : a shared-geometry entry from FILM.GEO (src/geo.js), the machine-readable copy of the
   * storyboard's Shared geometry tables. Scenes that share a shape across a match cut read it here
   * instead of copying numbers, and tools/check.cjs measures the drawn frames against it.
   *   kind 'profile'  : a silhouette symmetric about x = cx, half-widths hs at heights ys (ys increasing).
   *                     hw(y) interpolates with a monotone cubic (Fritsch-Carlson), so every table value
   *                     is hit exactly and the curve never overshoots between them.
   *                     x(y, side) : edge x (side -1 left, +1 right); side(sign, step) : one edge, top to
   *                     bottom; outline(step) : the closed silhouette, clockwise from the top left;
   *                     widest : { y, hw }.
   *   kind 'outline'  : any closed silhouette, pts already sampled densely (<= 12 px apart) in the order it is
   *                     drawn. It is the drawn outline, not control points: draw it as it stands
   *                     (inkPath(ctx, g.outline(), { closed: true, smooth: false })), because smoothing
   *                     control points rounds off every kink and tip the storyboard drew.
   *   kind 'points'   : named anchors. pt(name) returns [x, y] and throws on a misspelt name.
   *   kind 'polyline' : an ordered point list, pts.
   * Every entry also carries its table fields (cx, ys, hs, pts, shots, cuts, ...) read-only.
   */
  const geoCache = new Map();
  function monotoneSlopes(ys, hs) {
    const n = ys.length;
    const d = [];
    const m = new Array(n).fill(0);
    for (let i = 0; i < n - 1; i++) d.push((hs[i + 1] - hs[i]) / (ys[i + 1] - ys[i]));
    m[0] = d[0];
    m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) {
      if (d[i - 1] * d[i] <= 0) continue;
      const h0 = ys[i] - ys[i - 1], h1 = ys[i + 1] - ys[i];
      const w1 = 2 * h1 + h0, w2 = h1 + 2 * h0;
      m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
    }
    return m;
  }
  function makeGeo(id, g) {
    const deep = (v) => (Array.isArray(v) ? Object.freeze(v.map(deep)) : v && typeof v === 'object' ? Object.freeze(Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deep(x)]))) : v);
    const out = Object.assign({ id }, deep(g));
    if (g.kind === 'profile') {
      const ys = g.ys, hs = g.hs, n = ys.length, cx = g.cx;
      const m = monotoneSlopes(ys, hs);
      const hw = (y) => {
        if (y <= ys[0]) return hs[0];
        if (y >= ys[n - 1]) return hs[n - 1];
        let i = 0;
        while (ys[i + 1] < y) i++;
        const h = ys[i + 1] - ys[i];
        const s = (y - ys[i]) / h, s2 = s * s, s3 = s2 * s;
        return (2 * s3 - 3 * s2 + 1) * hs[i] + (s3 - 2 * s2 + s) * h * m[i] + (-2 * s3 + 3 * s2) * hs[i + 1] + (s3 - s2) * h * m[i + 1];
      };
      const side = (sign, step = 6) => {
        const pts = [];
        for (let y = ys[0]; y < ys[n - 1]; y += step) pts.push([cx + sign * hw(y), y]);
        pts.push([cx + sign * hs[n - 1], ys[n - 1]]);
        return pts;
      };
      let wi = 0;
      for (let i = 1; i < n; i++) if (hs[i] > hs[wi]) wi = i;
      out.hw = hw;
      out.x = (y, s = 1) => cx + s * hw(y);
      out.side = side;
      out.outline = (step = 6) => side(-1, step).concat(side(1, step).reverse());
      out.widest = Object.freeze({ y: ys[wi], hw: hs[wi] });
    } else if (g.kind === 'outline') {
      out.outline = () => g.pts.map((p) => [p[0], p[1]]);
    } else if (g.kind === 'points') {
      out.pt = (name) => {
        const p = g.pts[name];
        if (!p) throw new Error(`FILM.GEO.${id} has no point '${name}' (it has: ${Object.keys(g.pts).join(', ')})`);
        return [p[0], p[1]];
      };
    }
    return Object.freeze(out);
  }
  lib.geo = (id) => {
    const table = FILM.GEO;
    const g = table && table[id];
    if (!g) throw new Error(`FILM.GEO has no entry '${id}' (src/geo.js${table ? `; it has: ${Object.keys(table).join(', ')}` : ' is not loaded'})`);
    let v = geoCache.get(id);
    if (!v || v.src !== g) {
      v = { src: g, geo: makeGeo(id, g) };
      geoCache.set(id, v);
    }
    return v.geo;
  };

  /** tracePath(ctx, pts, closed=true) : adds the polyline to the current path (no beginPath). */
  lib.tracePath = (ctx, pts, closed = true) => {
    for (let i = 0; i < pts.length; i++) {
      const p = XY(pts[i]);
      if (i === 0) ctx.moveTo(p[0], p[1]);
      else ctx.lineTo(p[0], p[1]);
    }
    if (closed) ctx.closePath();
  };

  /**
   * Centripetal Catmull-Rom resample (no overshoot or cusps where long and short segments meet).
   * Returns a flat [x0,y0,x1,y1,...] array (closed: no duplicate end).
   */
  function sampleFlat(P, closed, step, smooth) {
    const n = P.length;
    const out = [];
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const p1 = P[i];
      const p2 = P[(i + 1) % n];
      const d = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      const k = Math.max(1, Math.ceil(d / step));
      if (!smooth || n < 3) {
        for (let j = 0; j < k; j++) out.push(lerp(p1[0], p2[0], j / k), lerp(p1[1], p2[1], j / k));
        continue;
      }
      let p0, p3;
      if (closed) {
        p0 = P[(i - 1 + n) % n];
        p3 = P[(i + 2) % n];
      } else {
        p0 = i > 0 ? P[i - 1] : [2 * p1[0] - p2[0], 2 * p1[1] - p2[1]];
        p3 = i + 2 < n ? P[i + 2] : [2 * p2[0] - p1[0], 2 * p2[1] - p1[1]];
      }
      const t1 = Math.sqrt(Math.hypot(p1[0] - p0[0], p1[1] - p0[1])) || 1e-4;
      const t2 = t1 + (Math.sqrt(d) || 1e-4);
      const t3 = t2 + (Math.sqrt(Math.hypot(p3[0] - p2[0], p3[1] - p2[1])) || 1e-4);
      for (let j = 0; j < k; j++) {
        const t = t1 + (t2 - t1) * (j / k);
        const a1x = ((t1 - t) / t1) * p0[0] + (t / t1) * p1[0];
        const a1y = ((t1 - t) / t1) * p0[1] + (t / t1) * p1[1];
        const a2x = ((t2 - t) / (t2 - t1)) * p1[0] + ((t - t1) / (t2 - t1)) * p2[0];
        const a2y = ((t2 - t) / (t2 - t1)) * p1[1] + ((t - t1) / (t2 - t1)) * p2[1];
        const a3x = ((t3 - t) / (t3 - t2)) * p2[0] + ((t - t2) / (t3 - t2)) * p3[0];
        const a3y = ((t3 - t) / (t3 - t2)) * p2[1] + ((t - t2) / (t3 - t2)) * p3[1];
        const b1x = ((t2 - t) / t2) * a1x + (t / t2) * a2x;
        const b1y = ((t2 - t) / t2) * a1y + (t / t2) * a2y;
        const b2x = ((t3 - t) / (t3 - t1)) * a2x + ((t - t1) / (t3 - t1)) * a3x;
        const b2y = ((t3 - t) / (t3 - t1)) * a2y + ((t - t1) / (t3 - t1)) * a3y;
        out.push(((t2 - t) / (t2 - t1)) * b1x + ((t - t1) / (t2 - t1)) * b2x, ((t2 - t) / (t2 - t1)) * b1y + ((t - t1) / (t2 - t1)) * b2y);
      }
    }
    if (!closed) out.push(P[n - 1][0], P[n - 1][1]);
    return out;
  }

  /** smoothPts(pts, closed, step=6) : Catmull-Rom resampled points as [[x,y],...]. */
  lib.smoothPts = (pts, closed = true, step = 6) => {
    const f = sampleFlat(pts.map(XY), closed, step, true);
    const out = [];
    for (let i = 0; i < f.length; i += 2) out.push([f[i], f[i + 1]]);
    return out;
  };

  function toPolys(clip) {
    if (!Array.isArray(clip) || !clip.length) return null;
    const first = clip[0];
    if (Array.isArray(first) && typeof first[0] === 'number') return [clip];
    if (first && typeof first.x === 'number') return [clip.map(XY)];
    return clip.map((poly) => poly.map(XY));
  }

  /** polyContains(pointsOrPolys, x, y) : even-odd point-in-polygon. */
  function polysContain(polys, x, y) {
    let inside = false;
    for (let p = 0; p < polys.length; p++) {
      const poly = polys[p];
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
    }
    return inside;
  }
  lib.polyContains = (clip, x, y) => polysContain(toPolys(clip), x, y);

  function polysBounds(polys) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const poly of polys) {
      for (const p of poly) {
        if (p[0] < x0) x0 = p[0];
        if (p[1] < y0) y0 = p[1];
        if (p[0] > x1) x1 = p[0];
        if (p[1] > y1) y1 = p[1];
      }
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  lib.bounds = (pts) => polysBounds(toPolys(pts));

  function normBounds(b) {
    if (!b) return { x: 0, y: 0, w: W(), h: H() };
    if (Array.isArray(b)) return { x: b[0], y: b[1], w: b[2], h: b[3] };
    return b;
  }

  /** Resolves a clip argument into { polys, bounds, hard(ctx) }. */
  function shapeOf(clip, o) {
    const polys = toPolys(clip);
    if (polys) {
      const b = polysBounds(polys);
      const pad = o.pad != null ? o.pad : 0;
      return {
        polys,
        bounds: { x: b.x - pad, y: b.y - pad, w: b.w + 2 * pad, h: b.h + 2 * pad },
        apply(ctx) {
          ctx.beginPath();
          for (const poly of polys) lib.tracePath(ctx, poly, true);
          ctx.clip('evenodd');
        },
      };
    }
    const bounds = normBounds(o.bounds);
    if (typeof clip === 'function') {
      return { polys: null, bounds, apply(ctx) { ctx.beginPath(); clip(ctx); ctx.clip(o.fillRule || 'nonzero'); } };
    }
    if (typeof Path2D !== 'undefined' && clip instanceof Path2D) {
      return { polys: null, bounds, apply(ctx) { ctx.clip(clip, o.fillRule || 'nonzero'); } };
    }
    return { polys: null, bounds, apply: null };
  }

  // ===========================================================================
  // Canvas cache (pure: keyed by every input, LRU)
  // ===========================================================================

  // Sized from the timeline (read lazily: lib loads before timeline.js) so a looping player keeps
  // every shot's paper or blueprint plate warm and does not rebuild one at each shot change.
  const cache = new Map();
  function cacheMax() {
    const tl = FILM.TIMELINE;
    const shots = tl && Array.isArray(tl.shots) ? tl.shots.length : 0;
    return Math.max(24, shots * 2 + 8);
  }
  function cached(key, make) {
    if (cache.has(key)) {
      const v = cache.get(key);
      cache.delete(key);
      cache.set(key, v);
      return v;
    }
    const v = make();
    cache.set(key, v);
    const max = cacheMax();
    while (cache.size > max) cache.delete(cache.keys().next().value);
    return v;
  }
  function newCanvas(w, h) {
    if (FILM.makeCanvas) return FILM.makeCanvas(w, h);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }
  lib.cached = cached;

  // ===========================================================================
  // Ink lines
  // ===========================================================================

  /*
   * One stroke pass over a resampled centreline (flat arrays X, Y with normals NX, NY and
   * arc length S). Builds a pressure-width ribbon out of quads so every overlap unions cleanly,
   * and fills it in one call.
   */
  function ribbon(ctx, X, Y, NX, NY, S, i0, i1, q) {
    const n = i1 - i0 + 1;
    if (n < 2) return null;
    const s0 = S[i0];
    const L = Math.max(1e-6, S[i1] - s0);
    const DX = new Float64Array(n);
    const DY = new Float64Array(n);
    const bs = q.boilSeed;
    const wf = q.wobbleFreq;
    for (let k = 0; k < n; k++) {
      const i = i0 + k;
      const s = S[i] - s0 + q.phase;
      let d =
        q.wobble * (0.72 * noise1(s * wf, q.seed) + 0.28 * noise1(s * wf * 3.3, q.seed + 1)) +
        q.tremble * noise1(s / 7.5, q.seed + 2) +
        q.boilAmp * noise1(s * wf * 2.2 + 0.37, bs) +
        q.tremble * 0.7 * noise1(s / 6.3, bs + 5) +
        q.offset;
      if (q.closeBlend > 0 && S[i1] - S[i] < q.closeBlend) {
        // pen returning to the start: pull toward the start's displacement, not all the way
        const u = 1 - (S[i1] - S[i]) / q.closeBlend;
        const s2 = s - q.loopLen;
        const d0 =
          q.wobble * (0.72 * noise1(s2 * wf, q.seed) + 0.28 * noise1(s2 * wf * 3.3, q.seed + 1)) +
          q.boilAmp * noise1(s2 * wf * 2.2 + 0.37, bs) +
          q.offset;
        d = lerp(d, d0, u * u * (3 - 2 * u) * 0.8);
      }
      DX[k] = X[i] + NX[i] * d;
      DY[k] = Y[i] + NY[i] * d;
    }
    // width profile
    const Wd = new Float64Array(n);
    const tIn = Math.min(q.taperIn, L * 0.45);
    const tOut = Math.min(q.taperOut, L * 0.45);
    for (let k = 0; k < n; k++) {
      const s = S[i0 + k] - s0;
      let w = q.width;
      if (tIn > 0 && s < tIn) w *= q.minW + (1 - q.minW) * Math.pow(s / tIn, 0.55);
      if (tOut > 0 && L - s < tOut) w *= q.minW + (1 - q.minW) * Math.pow((L - s) / tOut, 0.7);
      w *= 1 + q.widthJitter * (0.6 * noise1(s * 0.012 + 3.1, q.seed + 3) + 0.4 * noise1(s * 0.045, q.seed + 4));
      if (q.swell) w *= 1 + q.swell * Math.sin(Math.PI * clamp(s / L));
      if (q.pressure) w *= q.pressure(s / L);
      Wd[k] = Math.max(0.05, w) * 0.5;
    }
    // offset normals from the displaced line
    const LX = new Float64Array(n), LY = new Float64Array(n), RX = new Float64Array(n), RY = new Float64Array(n);
    for (let k = 0; k < n; k++) {
      const a = k > 0 ? k - 1 : k;
      const b = k < n - 1 ? k + 1 : k;
      let tx = DX[b] - DX[a], ty = DY[b] - DY[a];
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl;
      ty /= tl;
      const s = S[i0 + k];
      const wl = Math.max(0.03, Wd[k] + q.rough * noise1(s / 3.1, q.seed + 20));
      const wr = Math.max(0.03, Wd[k] + q.rough * noise1(s / 3.1, q.seed + 21));
      LX[k] = DX[k] - ty * wl;
      LY[k] = DY[k] + tx * wl;
      RX[k] = DX[k] + ty * wr;
      RY[k] = DY[k] - tx * wr;
    }
    // reveal window: same ribbon, only the quads inside the arc-length span. Absent => today's fill.
    if (q.part) return paintSpan(ctx, DX, DY, LX, LY, RX, RY, Wd, S, i0, n, q.part);
    ctx.beginPath();
    for (let k = 0; k < n - 1; k++) {
      ctx.moveTo(LX[k], LY[k]);
      ctx.lineTo(LX[k + 1], LY[k + 1]);
      ctx.lineTo(RX[k + 1], RY[k + 1]);
      ctx.lineTo(RX[k], RY[k]);
      ctx.closePath();
    }
    // soft round ends
    ctx.moveTo(DX[0] + Wd[0], DY[0]);
    ctx.arc(DX[0], DY[0], Wd[0], 0, TAU);
    ctx.moveTo(DX[n - 1] + Wd[n - 1], DY[n - 1]);
    ctx.arc(DX[n - 1], DY[n - 1], Wd[n - 1], 0, TAU);
    ctx.fill('nonzero');
    return { DX, DY };
  }

  function centreline(pts, closed, step, smooth, startFrac, overlapPx) {
    const P = pts.map(XY);
    let F = sampleFlat(P, closed, step, smooth);
    let m = F.length / 2;
    let loopLen = 0;
    if (closed && m > 2) {
      // rotate so the pen starts at a seeded place, then run past the start
      const st = Math.floor(startFrac * m) % m;
      const R = new Array(F.length);
      for (let k = 0; k < m; k++) {
        R[2 * k] = F[2 * ((k + st) % m)];
        R[2 * k + 1] = F[2 * ((k + st) % m) + 1];
      }
      for (let k = 0; k < m; k++) loopLen += Math.hypot(R[(2 * (k + 1)) % R.length] - R[2 * k], R[((2 * (k + 1)) % R.length) + 1] - R[2 * k + 1]);
      R.push(R[0], R[1]);
      let acc = 0;
      for (let k = 1; k <= m && acc < overlapPx; k++) {
        const x = R[2 * (k % m)], y = R[2 * (k % m) + 1];
        acc += Math.hypot(x - R[R.length - 2], y - R[R.length - 1]);
        R.push(x, y);
      }
      F = R;
      m = F.length / 2;
    }
    const X = new Float64Array(m), Y = new Float64Array(m), S = new Float64Array(m);
    for (let k = 0; k < m; k++) {
      X[k] = F[2 * k];
      Y[k] = F[2 * k + 1];
      if (k > 0) S[k] = S[k - 1] + Math.hypot(X[k] - X[k - 1], Y[k] - Y[k - 1]);
    }
    const NX = new Float64Array(m), NY = new Float64Array(m);
    for (let k = 0; k < m; k++) {
      const a = Math.max(0, k - 2), b = Math.min(m - 1, k + 2);
      let tx = X[b] - X[a], ty = Y[b] - Y[a];
      const tl = Math.hypot(tx, ty) || 1;
      NX[k] = -ty / tl;
      NY[k] = tx / tl;
    }
    return { X, Y, S, NX, NY, m, loopLen };
  }

  /**
   * inkPath(ctx, points, opts) : a hand-inked line or closed shape.
   *   closed      false
   *   width       3        nominal pen width (art bible: hero 5, secondary 3, detail 1.8)
   *   color       pal.ink
   *   alpha       1
   *   seed        1        give each drawn object its own seed so their wobbles differ
   *   smooth      true     Catmull-Rom through the points (false = straight segments)
   *   step        2.5      resample spacing in px
   *   wobble      2        low-frequency drift amplitude (px)
   *   wobbleFreq  1/150    drift frequency (cycles per px)
   *   tremble     0.4      high-frequency hand tremble (px)
   *   rough       0.22+0.07*width  ragged ink edge (px), each side independent
   *   boil        auto     drawing index (default lib.boil(lib.T)); false freezes the line
   *   boilAmp     0.7      how far the line moves between boil drawings (px)
   *   taper       [18,34]  px of taper at start and end (number = both)
   *   minWidth    0.14     width fraction at the very tips
   *   swell       0.2      extra width through the middle of an open stroke
   *   widthJitter 0.34     pressure variation (slow plus a faster drag)
   *   pressure    null     fn(u 0..1) => width multiplier
   *   overlap     14       closed shapes: how far the pen runs past its start (px)
   *   fill        null     closed shapes: fill colour under the line (uses the wobbled outline)
   *   fillAlpha   1
   *   double      false    true or { offset, width, alpha, from, to, seed }: a second quick retrace
   *                        (defaults: 30 percent of the width, min 1.5 px at 5 px, 3 px clear of the line, alpha 0.4)
   *   reveal      null     0..1 draws that fraction of the arc length from the start, double included.
   *                        [from, to] draws the segment (a running dash). Omit, or pass 1 / [0, 1], for the whole line.
   *   nib         null     { r, color, blot } ink drop and highlight on the moving tip while the span is unfinished
   */
  // null => draw the whole line (today's pixels). Otherwise absolute arc-length window on S, nib on the open tip.
  function revealOf(reveal, L) {
    if (reveal == null) return null;
    let a, b;
    if (Array.isArray(reveal)) {
      a = +reveal[0];
      b = +reveal[1];
      if (!isFinite(a) || !isFinite(b)) return null;
      if (b < a) {
        const s = a;
        a = b;
        b = s;
      }
    } else {
      a = 0;
      b = +reveal;
      if (!isFinite(b)) return null;
    }
    a = clamp(a, 0, 1);
    b = clamp(b, 0, 1);
    if (a <= 0 && b >= 1) return null;
    return { sFrom: a * L, sTo: b * L, nib: b > a && b < 1 };
  }

  function spanPoint(DX, DY, Wd, S, i0, n, s) {
    const last = n - 1;
    let k = 0;
    if (s >= S[i0 + last]) k = Math.max(0, last - 1);
    else if (s > S[i0]) while (k < last - 1 && S[i0 + k + 1] < s) k++;
    const a = S[i0 + k], b = S[i0 + k + 1];
    let u = b > a ? (s - a) / (b - a) : 0;
    if (u < 0) u = 0;
    else if (u > 1) u = 1;
    const hw = Wd[k] + (Wd[k + 1] - Wd[k]) * u;
    return {
      x: DX[k] + (DX[k + 1] - DX[k]) * u,
      y: DY[k] + (DY[k + 1] - DY[k]) * u,
      hw: hw > 0.05 ? hw : 0.05,
      w: hw * 2,
    };
  }

  // Quads whose both ends sit inside the window use the same vertices as the full ribbon.
  function paintSpan(ctx, DX, DY, LX, LY, RX, RY, Wd, S, i0, n, part) {
    const sFrom = part.sFrom, sTo = part.sTo;
    if (!(n >= 2) || !(sTo > sFrom)) return null;
    const sLo = S[i0], sHi = S[i0 + n - 1];
    if (!(sTo > sLo) || !(sFrom < sHi)) return null;
    ctx.beginPath();
    let drew = false;
    for (let k = 0; k < n - 1; k++) {
      const a = S[i0 + k], b = S[i0 + k + 1];
      if (!(b > a)) {
        if (a >= sFrom && a <= sTo) {
          ctx.moveTo(LX[k], LY[k]);
          ctx.lineTo(LX[k + 1], LY[k + 1]);
          ctx.lineTo(RX[k + 1], RY[k + 1]);
          ctx.lineTo(RX[k], RY[k]);
          ctx.closePath();
          drew = true;
        }
        continue;
      }
      if (b <= sFrom || a >= sTo) continue;
      let t0 = 0, t1 = 1;
      if (a < sFrom) t0 = (sFrom - a) / (b - a);
      if (b > sTo) t1 = (sTo - a) / (b - a);
      if (!(t1 > t0)) continue;
      const at = (A, B, t) => (t <= 0 ? A : t >= 1 ? B : A + (B - A) * t);
      ctx.moveTo(at(LX[k], LX[k + 1], t0), at(LY[k], LY[k + 1], t0));
      ctx.lineTo(at(LX[k], LX[k + 1], t1), at(LY[k], LY[k + 1], t1));
      ctx.lineTo(at(RX[k], RX[k + 1], t1), at(RY[k], RY[k + 1], t1));
      ctx.lineTo(at(RX[k], RX[k + 1], t0), at(RY[k], RY[k + 1], t0));
      ctx.closePath();
      drew = true;
    }
    if (sFrom <= sLo && sTo > sLo) {
      ctx.moveTo(DX[0] + Wd[0], DY[0]);
      ctx.arc(DX[0], DY[0], Wd[0], 0, TAU);
      drew = true;
    }
    if (sTo >= sHi && sFrom < sHi) {
      ctx.moveTo(DX[n - 1] + Wd[n - 1], DY[n - 1]);
      ctx.arc(DX[n - 1], DY[n - 1], Wd[n - 1], 0, TAU);
      drew = true;
    }
    // Running dash: round the trailing cut. The leading tip is the nib, not a second cap.
    if (sFrom > sLo && sFrom < sHi) {
      const tail = spanPoint(DX, DY, Wd, S, i0, n, sFrom);
      ctx.moveTo(tail.x + tail.hw, tail.y);
      ctx.arc(tail.x, tail.y, tail.hw, 0, TAU);
      drew = true;
    }
    if (drew) ctx.fill('nonzero');
    if (sTo > sLo && sTo < sHi) return spanPoint(DX, DY, Wd, S, i0, n, sTo);
    return null;
  }

  function paintDouble(ctx, C, q, o, b, width, tIn, tOut, seed, closed, span) {
    if (!o.double) return;
    const d = o.double === true ? {} : o.double;
    const ds = seedInt(d.seed != null ? d.seed : seed + 977);
    const r = rng(ds);
    const L = C.S[C.m - 1];
    let f0 = d.from != null ? d.from : closed ? r.range(0, 0.35) : r.range(0.03, 0.18);
    let f1 = d.to != null ? d.to : closed ? f0 + r.range(0.45, 0.75) : r.range(0.72, 0.95);
    f1 = Math.min(1, f1);
    let i0 = 0, i1 = C.m - 1;
    while (i0 < C.m - 1 && C.S[i0] < f0 * L) i0++;
    while (i1 > i0 && C.S[i1] > f1 * L) i1--;
    const dw = d.width != null ? width * d.width : Math.max(1.2, width * 0.3);
    const q2 = Object.assign({}, q, {
      seed: ds,
      width: dw,
      rough: 0.15 + dw * 0.07,
      offset: d.offset != null ? d.offset : (width / 2 + 3) * (r() < 0.5 ? -1 : 1),
      wobble: q.wobble * 1.3,
      boilSeed: (hash(ds, b) | 0) & 0x7fffffff,
      taperIn: Math.max(tIn, 26),
      taperOut: Math.max(tOut, 40),
      closeBlend: 0,
      swell: 0.35,
    });
    if (span) q2.part = span;
    ctx.globalAlpha *= d.alpha != null ? d.alpha : 0.4;
    ribbon(ctx, C.X, C.Y, C.NX, C.NY, C.S, i0, i1, q2);
  }

  function inkNib(ctx, tip, nib, color, seed) {
    const r = nib.r != null ? nib.r : Math.max(1.8, tip.w * 0.62);
    const blot = nib.blot;
    const br = blot === true ? r * 1.7 : blot ? Math.abs(+blot) || 0 : 0;
    if (!(r > 0) && !(br > 0)) return;
    ctx.save();
    ctx.fillStyle = nib.color || color;
    if (br > 0) {
      const ang = h3(seed, 23, 9) * TAU;
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, br, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(tip.x + Math.cos(ang) * br * 0.34, tip.y + Math.sin(ang) * br * 0.34, br * 0.55, 0, TAU);
      ctx.fill();
    }
    if (r > 0) {
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, r, 0, TAU);
      ctx.fill();
      ctx.globalAlpha *= 0.85;
      ctx.fillStyle = pal.white;
      ctx.beginPath();
      ctx.arc(tip.x - r * 0.28, tip.y - r * 0.32, Math.max(1.2, r * 0.4), 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function inkPath(ctx, pts, o = {}) {
    if (!pts || pts.length < 2) return;
    const closed = !!o.closed;
    const seed = seedInt(o.seed === undefined ? 1 : o.seed);
    const width = o.width != null ? o.width : 3;
    const step = o.step || 2.5;
    const smooth = o.smooth !== false;
    const taper = o.taper != null ? o.taper : closed ? [10, 22] : [18, 34];
    const tIn = Array.isArray(taper) ? taper[0] : taper;
    const tOut = Array.isArray(taper) ? taper[1] : taper;
    const overlap = closed ? (o.overlap != null ? o.overlap : 14) : 0;
    const C = centreline(pts, closed, step, smooth, closed ? h3(seed, 11, 3) : 0, overlap);
    if (C.m < 2) return;
    const b = boilIndex(o);
    const q = {
      seed,
      width,
      wobble: o.wobble != null ? o.wobble : 2,
      wobbleFreq: o.wobbleFreq || 1 / 150,
      tremble: o.tremble != null ? o.tremble : 0.4,
      rough: o.rough != null ? o.rough : 0.22 + width * 0.07,
      boilAmp: o.boil === false ? 0 : o.boilAmp != null ? o.boilAmp : 0.7,
      boilSeed: (hash(seed, b) | 0) & 0x7fffffff,
      taperIn: tIn,
      taperOut: tOut,
      minW: o.minWidth != null ? o.minWidth : 0.14,
      swell: closed ? 0 : o.swell != null ? o.swell : 0.2,
      widthJitter: o.widthJitter != null ? o.widthJitter : 0.34,
      pressure: o.pressure || null,
      offset: 0,
      phase: 0,
      closeBlend: closed ? Math.min(60, C.loopLen * 0.25) + overlap : 0,
      loopLen: C.loopLen,
    };
    const span = revealOf(o.reveal, C.S[C.m - 1]);
    ctx.save();
    const color = o.color || pal.ink;
    const alpha = o.alpha != null ? o.alpha : 1;
    if (closed && o.fill && !span) {
      // fill follows the wobbled outline (without the overlap run)
      const F = ribbonLine(C, q, 0, Math.max(1, C.m - 1));
      ctx.beginPath();
      for (let k = 0; k < F.n; k++) {
        if (C.S[k] > C.loopLen) break;
        if (k === 0) ctx.moveTo(F.DX[k], F.DY[k]);
        else ctx.lineTo(F.DX[k], F.DY[k]);
      }
      ctx.closePath();
      ctx.globalAlpha *= o.fillAlpha != null ? o.fillAlpha : 1;
      ctx.fillStyle = o.fill;
      ctx.fill();
      ctx.restore();
      ctx.save();
    }
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = color;
    if (!span) {
      ribbon(ctx, C.X, C.Y, C.NX, C.NY, C.S, 0, C.m - 1, q);
      paintDouble(ctx, C, q, o, b, width, tIn, tOut, seed, closed, null);
    } else {
      const tip = ribbon(ctx, C.X, C.Y, C.NX, C.NY, C.S, 0, C.m - 1, Object.assign({}, q, { part: span }));
      const inkA = ctx.globalAlpha;
      paintDouble(ctx, C, q, o, b, width, tIn, tOut, seed, closed, span);
      ctx.globalAlpha = inkA;
      if (span.nib && o.nib && tip) inkNib(ctx, tip, o.nib, color, seed);
    }
    ctx.restore();
  }

  // displaced centreline only (for fills)
  function ribbonLine(C, q, i0, i1) {
    const n = i1 - i0 + 1;
    const DX = new Float64Array(n), DY = new Float64Array(n);
    const wf = q.wobbleFreq;
    for (let k = 0; k < n; k++) {
      const i = i0 + k;
      const s = C.S[i];
      const d =
        q.wobble * (0.72 * noise1(s * wf, q.seed) + 0.28 * noise1(s * wf * 3.3, q.seed + 1)) +
        q.boilAmp * noise1(s * wf * 2.2 + 0.37, q.boilSeed);
      DX[k] = C.X[i] + C.NX[i] * d;
      DY[k] = C.Y[i] + C.NY[i] * d;
    }
    return { DX, DY, n };
  }

  lib.inkPath = inkPath;
  lib.inkLine = (ctx, x1, y1, x2, y2, o = {}) => inkPath(ctx, [[x1, y1], [x2, y2]], Object.assign({ smooth: false }, o));
  lib.inkCircle = (ctx, cx, cy, r, o = {}) =>
    inkPath(ctx, lib.ellipsePts(cx, cy, r, o.ry != null ? o.ry : r, Math.max(24, Math.ceil(r * 0.6)), o.rot || 0), Object.assign({ closed: true }, o));

  // ===========================================================================
  // Hatching
  // ===========================================================================

  /**
   * hatch(ctx, clip, opts) : parallel pen strokes that build tone inside a shape.
   *   angle        -PI/4    stroke direction (radians): 45 degrees rising left to right
   *   spacing      8        px between rows at full density (art bible: 12 light, 8 mid, 5 dark)
   *   width        1.4      pen width (art bible: 1.2 to 1.8)
   *   color        pal.ink
   *   alpha        0.9
   *   density      1        0..1, or fn(x, y) => 0..1. Rows drop out evenly as density falls and
   *                         stroke ends stagger along the tone edge, like a hand building shade.
   *   length       [16,64]  stroke length range (px)
   *   gap          [2,7]    px between strokes along a row
   *   inset        6        polygons: how far a stroke may stop short of the edge
   *   overshoot    3        polygons: how far a stroke may cross the edge
   *   angleJitter  0.052    per stroke (+-3 degrees)
   *   spacingJitter 0.3     fraction of spacing (+-15 percent)
   *   flow         0.05     slow angle drift across the rows (radians)
   *   bow          0.7      random sideways bow per stroke (px)
   *   bend         0        consistent bow (px), follows a rounded form
   *   taper        0.3      width at the flick end (fraction)
   *   edge         0.12     how ragged the tone edge is (threshold noise)
   *   boilAmp      0.45     endpoint shimmer per boil drawing (px)
   *   clip         false    polygons: also hard-clip to the polygon
   *   bounds       frame    area to fill when clip is a function, Path2D or null
   *   seed         7
   */
  const PHI = 0.6180339887498949;
  function hatch(ctx, clip, o = {}) {
    const shape = shapeOf(clip, o);
    const seed = seedInt(o.seed === undefined ? 7 : o.seed);
    const r = rng(seed);
    const angle = o.angle != null ? o.angle : -Math.PI / 4;
    const spacing = Math.max(0.8, o.spacing || 8);
    const width = o.width != null ? o.width : 1.4;
    const density = o.density != null ? o.density : 1;
    const densFn = typeof density === 'function' ? density : null;
    const len = o.length || [16, 64];
    const gap = o.gap || [2, 7];
    const inset = o.inset != null ? o.inset : 6;
    const over = o.overshoot != null ? o.overshoot : 3;
    const aJ = o.angleJitter != null ? o.angleJitter : 0.052;
    const sJ = o.spacingJitter != null ? o.spacingJitter : 0.3;
    const flow = o.flow != null ? o.flow : 0.05;
    const bow = o.bow != null ? o.bow : 0.7;
    const bend = o.bend || 0;
    const taper = o.taper != null ? o.taper : 0.3;
    const edgeN = o.edge != null ? o.edge : 0.12;
    const boilAmp = o.boil === false ? 0 : o.boilAmp != null ? o.boilAmp : 0.45;
    const bi = boilIndex(o);
    const minLen = Math.max(2, Math.min(len[0] * 0.35, 6));
    const probe = Math.max(3, Math.min(8, len[0] * 0.4));
    const phase = h3(seed, 3, 9);

    const dx = Math.cos(angle), dy = Math.sin(angle);
    const nx = -dy, ny = dx;
    const B = shape.bounds;
    const corners = [[B.x, B.y], [B.x + B.w, B.y], [B.x, B.y + B.h], [B.x + B.w, B.y + B.h]];
    let umin = Infinity, umax = -Infinity, vmin = Infinity, vmax = -Infinity;
    for (const c of corners) {
      const u = c[0] * dx + c[1] * dy, v = c[0] * nx + c[1] * ny;
      if (u < umin) umin = u;
      if (u > umax) umax = u;
      if (v < vmin) vmin = v;
      if (v > vmax) vmax = v;
    }

    let edges = null;
    if (shape.polys) {
      edges = [];
      for (const poly of shape.polys) {
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
          const a = poly[j], b = poly[i];
          edges.push(a[0] * dx + a[1] * dy, a[0] * nx + a[1] * ny, b[0] * dx + b[1] * dy, b[0] * nx + b[1] * ny);
        }
      }
    }

    const paths = [new Path2D(), new Path2D(), new Path2D()];
    const spans = [];
    const on = [];
    const xs = [];
    let strokeId = 0;

    const emit = (u, ue, v, row, dAt) => {
      const sl = ue - u;
      const um = (u + ue) / 2;
      const mx = um * dx + v * nx, my = um * dy + v * ny;
      const ja = aJ * (r() * 2 - 1) + (flow ? flow * noise1(row * 0.09, seed + 5) : 0);
      const bw = bend + bow * (r() * 2 - 1);
      const wv = width * lerp(0.78, 1.18, r()) * lerp(0.72, 1, dAt);
      const p = paths[(r() * 3) | 0];
      const sid = strokeId++;
      const ca = Math.cos(angle + ja), sa = Math.sin(angle + ja);
      const half = sl / 2;
      const jb0 = boilAmp ? (h3(sid, row, bi + seed) - 0.5) * 2 * boilAmp : 0;
      const jb1 = boilAmp ? (h3(row, sid, bi + seed + 9) - 0.5) * 2 * boilAmp : 0;
      const pnx = -sa, pny = ca;
      const x0 = mx - ca * half + pnx * jb0, y0 = my - sa * half + pny * jb0;
      const x1 = mx + ca * (half + jb1 * 0.6) + pnx * jb1, y1 = my + sa * (half + jb1 * 0.6) + pny * jb1;
      const w0 = wv * 0.42, w1 = wv * taper * 0.5, wm = wv * 0.5;
      const k = (w0 + w1) * 0.5;
      const cx = mx + pnx * bw * 2, cy = my + pny * bw * 2;
      p.moveTo(x0 + pnx * w0, y0 + pny * w0);
      p.quadraticCurveTo(cx + pnx * (wm * 2 - k), cy + pny * (wm * 2 - k), x1 + pnx * w1, y1 + pny * w1);
      p.lineTo(x1 - pnx * w1, y1 - pny * w1);
      p.quadraticCurveTo(cx - pnx * (wm * 2 - k), cy - pny * (wm * 2 - k), x0 - pnx * w0, y0 - pny * w0);
      p.closePath();
    };

    const breakUp = (a, b, v, row, dAt) => {
      let u = a;
      while (u < b - minLen) {
        let ue = Math.min(u + lerp(len[0], len[1], r()), b);
        if (b - ue < minLen) ue = b;
        if (ue - u >= minLen) emit(u, ue, v, row, dAt);
        u = ue + lerp(gap[0], gap[1], r());
      }
    };

    let row = 0;
    for (let v0 = vmin + spacing * r(); v0 <= vmax; v0 += spacing, row++) {
      const v = v0 + (r() - 0.5) * spacing * sJ;
      // evenly distributed per-row threshold: rows vanish uniformly as density falls
      const rowTh = ((row * PHI + phase) % 1) * 0.94 + 0.03;
      spans.length = 0;
      if (edges) {
        xs.length = 0;
        for (let e = 0; e < edges.length; e += 4) {
          const va = edges[e + 1], vb = edges[e + 3];
          if ((va > v) !== (vb > v)) xs.push(edges[e] + ((v - va) / (vb - va)) * (edges[e + 2] - edges[e]));
        }
        if (xs.length < 2) continue;
        xs.sort((p, q) => p - q);
        for (let k = 0; k + 1 < xs.length; k += 2) spans.push(xs[k], xs[k + 1]);
      } else {
        spans.push(umin, umax);
      }
      if (!densFn && density < rowTh) continue;
      const dConst = densFn ? 1 : clamp(density);
      for (let sp = 0; sp < spans.length; sp += 2) {
        let u0 = spans[sp], u1 = spans[sp + 1];
        if (edges) {
          u0 += lerp(-over, inset, r() * r());
          u1 -= lerp(-over, inset, r() * r());
        } else {
          u0 -= r() * len[1];
        }
        if (u1 - u0 < minLen) continue;
        if (!densFn) {
          breakUp(u0, u1, v, row, dConst);
          continue;
        }
        // walk the row; strokes live where density beats the (slightly noisy) row threshold
        on.length = 0;
        let start = null;
        let dSum = 0, dN = 0;
        for (let u = u0; ; u += probe) {
          const uu = Math.min(u, u1);
          const d = clamp(densFn(uu * dx + v * nx, uu * dy + v * ny));
          const th = rowTh + edgeN * noise1(uu * 0.02 + row * 7.31, seed + 11);
          if (d > th) {
            if (start === null) start = uu;
            dSum += d;
            dN++;
          } else if (start !== null) {
            on.push(start, uu, dSum / dN);
            start = null;
            dSum = dN = 0;
          }
          if (uu >= u1) break;
        }
        if (start !== null) on.push(start, u1, dSum / Math.max(1, dN));
        for (let k = 0; k < on.length; k += 3) {
          // soften where the tone edge cuts a stroke
          const a = on[k] === u0 ? on[k] : on[k] + (r() - 0.5) * probe;
          const b = on[k + 1] === u1 ? on[k + 1] : on[k + 1] + (r() - 0.5) * probe;
          breakUp(a, b, v, row, on[k + 2]);
        }
      }
    }

    ctx.save();
    if (shape.apply && (!shape.polys || o.clip)) shape.apply(ctx);
    ctx.fillStyle = o.color || pal.ink;
    const alpha = o.alpha != null ? o.alpha : 0.9;
    const A = [0.74, 0.88, 1];
    const base = ctx.globalAlpha;
    for (let k = 0; k < 3; k++) {
      ctx.globalAlpha = base * alpha * A[k];
      ctx.fill(paths[k]);
    }
    ctx.restore();
  }
  lib.hatch = hatch;

  /**
   * crossHatch(ctx, clip, opts) : layered hatching where each extra layer only covers darker tone.
   *   tone     1       0..1 overall darkness (with no density, 0.25 = one layer, 1 = four)
   *   layers   2 (4 when tone is given)  maximum layer count
   *   density  1 or fn(x,y) => 0..1: local darkness; layer i appears where density*tone*layers > i
   *   angle    -PI/4   first layer angle (45 degrees); later layers turn by opts.turn
   *   turn     [-PI/3, 0.3, -1.35]  offsets for layers 2..4: layer 2 at 105 degrees, 3 and 4 thicken 1 and 2
   *   crossSpacing  spacing*1.4  spacing of layers 2..4 (art bible: 5 px base, 7 px cross)
   *   ...all hatch options
   */
  function crossHatch(ctx, clip, o = {}) {
    const layers = o.layers || (o.tone != null ? 4 : 2);
    const tone = o.tone != null ? clamp(o.tone) : 1;
    const d = o.density != null ? o.density : 1;
    const base = o.angle != null ? o.angle : -Math.PI / 4;
    const turn = o.turn || [-Math.PI / 3, 0.3, -1.35];
    const seed = seedInt(o.seed === undefined ? 11 : o.seed);
    for (let i = 0; i < layers; i++) {
      let dens;
      if (typeof d === 'function') {
        dens = (x, y) => clamp(d(x, y) * tone * layers - i);
      } else {
        dens = clamp(d * tone * layers - i);
        if (dens <= 0) break;
      }
      hatch(
        ctx,
        clip,
        Object.assign({}, o, {
          angle: base + (i === 0 ? 0 : turn[(i - 1) % turn.length]),
          seed: seed + i * 7919,
          density: dens,
          spacing: i === 0 ? o.spacing || 8 : o.crossSpacing || (o.spacing || 8) * 1.4,
        })
      );
    }
  }
  lib.crossHatch = crossHatch;

  // ===========================================================================
  // Stipple
  // ===========================================================================

  /**
   * stipple(ctx, clip, opts) : seeded dots on a jittered hex grid.
   *   spacing  7.5      mean px between dots at density 1 (about 0.02 dots per px2)
   *   r        [1.0, 2.2] dot radius range (bigger where density is higher)
   *   density  1 or fn(x,y) => 0..1
   *   jitter   0.45     fraction of spacing
   *   color    pal.ink
   *   alpha    0.9
   *   boilAmp  0.35     px shimmer per boil drawing
   *   clip     true     polygons: skip dots outside; functions/Path2D always hard-clip
   *   seed     13
   */
  function stipple(ctx, clip, o = {}) {
    const shape = shapeOf(clip, o);
    const seed = seedInt(o.seed === undefined ? 13 : o.seed);
    const sp = Math.max(1, o.spacing || 7.5);
    const rr = o.r || [1.0, 2.2];
    const density = o.density != null ? o.density : 1;
    const densFn = typeof density === 'function' ? density : null;
    const jit = (o.jitter != null ? o.jitter : 0.45) * sp;
    const boilAmp = o.boil === false ? 0 : o.boilAmp != null ? o.boilAmp : 0.35;
    const bi = boilIndex(o);
    const B = shape.bounds;
    const rowH = sp * 0.866;
    const p = new Path2D();
    const i0 = Math.floor(B.y / rowH) - 1, i1 = Math.ceil((B.y + B.h) / rowH) + 1;
    const j0 = Math.floor(B.x / sp) - 1, j1 = Math.ceil((B.x + B.w) / sp) + 1;
    for (let i = i0; i <= i1; i++) {
      const off = i & 1 ? sp * 0.5 : 0;
      for (let j = j0; j <= j1; j++) {
        const a = h3(i, j, seed);
        const b = h3(j, i, seed + 1);
        const c = h3(i + 7, j - 3, seed + 2);
        let x = j * sp + off + (a - 0.5) * 2 * jit;
        let y = i * rowH + (b - 0.5) * 2 * jit;
        if (x < B.x || x > B.x + B.w || y < B.y || y > B.y + B.h) continue;
        const dAt = densFn ? clamp(densFn(x, y)) : density;
        if (c >= dAt) continue;
        if (shape.polys && !polysContain(shape.polys, x, y)) continue;
        if (boilAmp) {
          x += (h3(i, j, seed + bi * 31 + 5) - 0.5) * 2 * boilAmp;
          y += (h3(j, i, seed + bi * 37 + 6) - 0.5) * 2 * boilAmp;
        }
        const rad = lerp(rr[0], rr[1], clamp(h3(j, i, seed + 3) * 0.55 + dAt * 0.45));
        p.moveTo(x + rad, y);
        p.arc(x, y, rad, 0, TAU);
      }
    }
    ctx.save();
    if (shape.apply && !shape.polys) shape.apply(ctx);
    ctx.globalAlpha *= o.alpha != null ? o.alpha : 0.9;
    ctx.fillStyle = o.color || pal.ink;
    ctx.fill(p);
    ctx.restore();
  }
  lib.stipple = stipple;

  // ===========================================================================
  // Backgrounds: paper, blueprint, stripes
  // ===========================================================================

  function renderScale() {
    return FILM.S || 1;
  }

  /**
   * paper(ctx, opts) : cream paper with mottling, grain and fibres. Cached by size, seed and options.
   *   x, y, w, h   0, 0, 1080, 1920
   *   color        pal.paper
   *   seed         3
   *   grain        1      fine grain strength
   *   fibres       1      fibre count multiplier
   *   mottle       1      large soft blotches
   *   vignette     0.35   darkened edges
   */
  function paper(ctx, o = {}) {
    const x = o.x || 0, y = o.y || 0;
    const w = o.w || W(), h = o.h || H();
    const S = renderScale();
    const color = o.color || pal.paper;
    const seed = seedInt(o.seed === undefined ? 3 : o.seed);
    const grain = o.grain != null ? o.grain : 1;
    const fibres = o.fibres != null ? o.fibres : 1;
    const mottle = o.mottle != null ? o.mottle : 1;
    const vignette = o.vignette != null ? o.vignette : 0.35;
    const key = ['paper', w, h, S, color, seed, grain, fibres, mottle, vignette].join('|');
    const c = cached(key, () => makePaper(Math.max(1, Math.round(w * S)), Math.max(1, Math.round(h * S)), S, color, seed, grain, fibres, mottle, vignette));
    ctx.drawImage(c, x, y, w, h);
  }

  function makePaper(cw, ch, S, color, seed, grain, fibres, mottle, vignette) {
    const c = newCanvas(cw, ch);
    const g = c.getContext('2d');
    const [br, bg, bb] = parseColor(color);
    // mottling from a low-resolution noise field, upscaled smooth
    const mw = Math.max(4, Math.ceil(cw / 18)), mh = Math.max(4, Math.ceil(ch / 18));
    const mf = new Float32Array(mw * mh);
    for (let j = 0; j < mh; j++) {
      for (let i = 0; i < mw; i++) {
        mf[j * mw + i] = lib.fbm2(i * 0.11, j * 0.11, seed, 4) * 0.8 + noise2(i * 0.5, j * 0.5, seed + 9) * 0.2;
      }
    }
    const img = g.createImageData(cw, ch);
    const d = img.data;
    const fx = (mw - 1) / cw, fy = (mh - 1) / ch;
    const cxv = cw / 2, cyv = ch / 2;
    const vr = Math.hypot(cxv, cyv);
    for (let py = 0; py < ch; py++) {
      const my = py * fy;
      const jy = Math.floor(my), ty = my - jy;
      const jy1 = Math.min(mh - 1, jy + 1);
      for (let px = 0; px < cw; px++) {
        const mx = px * fx;
        const ix = Math.floor(mx), tx = mx - ix;
        const ix1 = Math.min(mw - 1, ix + 1);
        const m =
          lerp(lerp(mf[jy * mw + ix], mf[jy * mw + ix1], tx), lerp(mf[jy1 * mw + ix], mf[jy1 * mw + ix1], tx), ty);
        const n = h3(px, py, seed + 77);
        const n2 = h3(px >> 1, py >> 1, seed + 78);
        const gr = ((n - 0.5) * 0.6 + (n2 - 0.5) * 0.4) * 0.07 * grain;
        const dxv = (px - cxv) / vr, dyv = (py - cyv) / vr;
        const vig = vignette * Math.max(0, dxv * dxv + dyv * dyv - 0.35) * 0.18;
        const k = 1 + m * 0.055 * mottle + gr - vig;
        const i = (py * cw + px) * 4;
        // darker areas go slightly warmer, like aged paper
        d[i] = br * k;
        d[i + 1] = bg * (k - (1 - k) * 0.12);
        d[i + 2] = bb * (k - (1 - k) * 0.35);
        d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    // fibres
    const r = rng(seed + 5);
    const count = Math.round(((cw * ch) / (S * S)) / 1500 * fibres);
    const dark = new Path2D(), light = new Path2D();
    for (let i = 0; i < count; i++) {
      const x = r() * cw, y = r() * ch;
      const L = r.range(5, 26) * S * (r() < 0.08 ? 2.5 : 1);
      const a = r() * TAU;
      const bend = r.range(-0.5, 0.5) * L;
      const p = r() < 0.55 ? dark : light;
      const ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L;
      p.moveTo(x, y);
      p.quadraticCurveTo((x + ex) / 2 - Math.sin(a) * bend, (y + ey) / 2 + Math.cos(a) * bend, ex, ey);
    }
    g.lineCap = 'round';
    g.lineWidth = 0.7 * S;
    g.strokeStyle = lib.rgba(pal.inkSoft, 0.07);
    g.stroke(dark);
    g.lineWidth = 1.1 * S;
    g.strokeStyle = 'rgba(255,252,242,0.22)';
    g.stroke(light);
    // specks and faint foxing spots
    const specks = new Path2D();
    for (let i = 0; i < count * 0.08; i++) {
      const x = r() * cw, y = r() * ch, rad = r.range(0.3, 1.1) * S;
      specks.moveTo(x + rad, y);
      specks.arc(x, y, rad, 0, TAU);
    }
    g.fillStyle = lib.rgba(pal.inkSoft, 0.22);
    g.fill(specks);
    for (let i = 0; i < 6 * mottle; i++) {
      const x = r() * cw, y = r() * ch, rad = r.range(30, 120) * S;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, lib.rgba(pal.paperDeep, 0.07));
      gr.addColorStop(1, lib.rgba(pal.paperDeep, 0));
      g.fillStyle = gr;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    return c;
  }
  lib.paper = paper;

  /**
   * blueprint(ctx, opts) : navy plate with faint grid, big guide circles, long diagonals and noise.
   * Cached by size, seed and options.
   *   x, y, w, h   0, 0, 1080, 1920
   *   color        pal.navy
   *   seed         5
   *   grid         60      grid pitch (px); 0 turns the grid off
   *   major        5       every Nth grid line is stronger
   *   center       [0.5w, 0.44h]  centre of the guide circles
   *   circles      4
   *   diagonals    5
   *   noise        1
   *   marks        true    corner registration marks
   */
  function blueprint(ctx, o = {}) {
    const x = o.x || 0, y = o.y || 0;
    const w = o.w || W(), h = o.h || H();
    const S = renderScale();
    const opt = {
      color: o.color || pal.navy,
      seed: seedInt(o.seed === undefined ? 5 : o.seed),
      grid: o.grid != null ? o.grid : 60,
      major: o.major || 5,
      center: o.center || [w * 0.5, h * 0.44],
      circles: o.circles != null ? o.circles : 4,
      diagonals: o.diagonals != null ? o.diagonals : 5,
      noise: o.noise != null ? o.noise : 1,
      marks: o.marks !== false,
      line: o.line || pal.lavender,
    };
    const key = ['blueprint', w, h, S, JSON.stringify(opt)].join('|');
    const c = cached(key, () => makeBlueprint(w, h, S, opt));
    ctx.drawImage(c, x, y, w, h);
  }

  function makeBlueprint(w, h, S, o) {
    const cw = Math.max(1, Math.round(w * S)), ch = Math.max(1, Math.round(h * S));
    const c = newCanvas(cw, ch);
    const g = c.getContext('2d');
    const [br, bgc, bb] = parseColor(o.color);
    const [dr, dg, db] = parseColor(pal.navyDeep);
    const [lr, lg, lb] = parseColor(pal.navyLight);
    const img = g.createImageData(cw, ch);
    const d = img.data;
    const ccx = o.center[0] * S, ccy = o.center[1] * S;
    const R = Math.hypot(cw, ch) * 0.62;
    for (let py = 0; py < ch; py++) {
      for (let px = 0; px < cw; px++) {
        const rd = Math.min(1, Math.hypot(px - ccx, py - ccy) / R);
        // light centre falling to deep edges
        const t = rd * rd;
        let r = rd < 0.35 ? lerp(lr, br, rd / 0.35) : lerp(br, dr, (t - 0.1225) / 0.8775);
        let gg = rd < 0.35 ? lerp(lg, bgc, rd / 0.35) : lerp(bgc, dg, (t - 0.1225) / 0.8775);
        let b = rd < 0.35 ? lerp(lb, bb, rd / 0.35) : lerp(bb, db, (t - 0.1225) / 0.8775);
        const n = (h3(px, py, o.seed + 3) - 0.5) * 9 * o.noise + (h3(px >> 2, py >> 2, o.seed + 4) - 0.5) * 5 * o.noise;
        const i = (py * cw + px) * 4;
        d[i] = r + n * 0.8;
        d[i + 1] = gg + n * 0.85;
        d[i + 2] = b + n;
        d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    g.scale(S, S);
    const r = rng(o.seed);
    const line = o.line;
    // grid
    if (o.grid > 0) {
      const minor = new Path2D(), major = new Path2D();
      let k = 0;
      for (let gx = (w / 2) % o.grid; gx <= w; gx += o.grid, k++) {
        const p = Math.round((gx - w / 2) / o.grid) % o.major === 0 ? major : minor;
        p.moveTo(gx, 0);
        p.lineTo(gx, h);
      }
      for (let gy = (h / 2) % o.grid; gy <= h; gy += o.grid) {
        const p = Math.round((gy - h / 2) / o.grid) % o.major === 0 ? major : minor;
        p.moveTo(0, gy);
        p.lineTo(w, gy);
      }
      g.lineWidth = 1;
      g.strokeStyle = lib.rgba(pal.grid, 0.3);
      g.stroke(minor);
      g.strokeStyle = lib.rgba(pal.grid, 0.5);
      g.stroke(major);
    }
    // long diagonals
    const [cx, cy] = o.center;
    for (let i = 0; i < o.diagonals; i++) {
      const a = r.range(0, Math.PI);
      const ox = cx + r.range(-0.35, 0.35) * w, oy = cy + r.range(-0.3, 0.3) * h;
      const L = Math.hypot(w, h);
      g.beginPath();
      g.moveTo(ox - Math.cos(a) * L, oy - Math.sin(a) * L);
      g.lineTo(ox + Math.cos(a) * L, oy + Math.sin(a) * L);
      g.lineWidth = r.range(0.8, 1.3);
      g.strokeStyle = lib.rgba(line, r.range(0.07, 0.14));
      if (r() < 0.35) g.setLineDash([r.range(6, 14), r.range(6, 12)]);
      else g.setLineDash([]);
      g.stroke();
    }
    g.setLineDash([]);
    // guide circles
    const minDim = Math.min(w, h);
    for (let i = 0; i < o.circles; i++) {
      const rad = minDim * (0.2 + i * 0.17) * r.range(0.95, 1.05);
      g.beginPath();
      g.arc(cx, cy, rad, 0, TAU);
      g.lineWidth = i === o.circles - 1 ? 1.4 : 1;
      g.strokeStyle = lib.rgba(line, i % 2 ? 0.1 : 0.16);
      if (i === 1) g.setLineDash([2, 7]);
      else g.setLineDash([]);
      g.stroke();
    }
    g.setLineDash([]);
    if (o.circles > 0) {
      const rad = minDim * (0.2 + (o.circles - 1) * 0.17);
      ticksImpl(g, cx, cy, { r: rad, n: 120, len: 7, major: 10, majorLen: 16, color: line, alpha: 0.2, width: 1 });
      // off-centre satellite circle
      const a = r.range(0, TAU);
      const sr = minDim * r.range(0.07, 0.12);
      g.beginPath();
      g.arc(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, sr, 0, TAU);
      g.lineWidth = 1;
      g.strokeStyle = lib.rgba(line, 0.14);
      g.stroke();
      // centre crosshair
      g.beginPath();
      g.moveTo(cx - 18, cy);
      g.lineTo(cx + 18, cy);
      g.moveTo(cx, cy - 18);
      g.lineTo(cx, cy + 18);
      g.strokeStyle = lib.rgba(line, 0.22);
      g.stroke();
    }
    // corner registration marks
    if (o.marks) {
      g.strokeStyle = lib.rgba(line, 0.32);
      g.lineWidth = 1.2;
      const m = 34, s = 22;
      for (const [mx, my, sx, sy] of [[m, m, 1, 1], [w - m, m, -1, 1], [m, h - m, 1, -1], [w - m, h - m, -1, -1]]) {
        g.beginPath();
        g.moveTo(mx, my + sy * s);
        g.lineTo(mx, my);
        g.lineTo(mx + sx * s, my);
        g.stroke();
      }
    }
    // faint scattered star specks
    const sp = new Path2D();
    for (let i = 0; i < (w * h) / 5000 * o.noise; i++) {
      const x = r() * w, y = r() * h, rad = r.range(0.4, 1.1);
      sp.moveTo(x + rad, y);
      sp.arc(x, y, rad, 0, TAU);
    }
    g.fillStyle = lib.rgba(pal.lineWhite, 0.22);
    g.fill(sp);
    return c;
  }
  lib.blueprint = blueprint;

  /**
   * stripes(ctx, opts) : the wide diagonal stripe background with softly irregular edges.
   *   colors   [pal.stripeCream, pal.stripeYellow]
   *   width    140     band width (px); both colours use it
   *   angle    -0.52   stripe direction (radians): 30 degrees rising left to right
   *   offset   0       scroll along the normal (animate this)
   *   wobble   1.4     edge irregularity (px)
   *   bounds   frame
   *   seed     21
   */
  function stripes(ctx, o = {}) {
    const B = normBounds(o.bounds);
    const cols = o.colors || [pal.stripeCream, pal.stripeYellow];
    const sw = o.width || 140;
    const angle = o.angle != null ? o.angle : -0.52;
    const offset = o.offset || 0;
    const wobble = o.wobble != null ? o.wobble : 1.4;
    const seed = seedInt(o.seed === undefined ? 21 : o.seed);
    const dx = Math.cos(angle), dy = Math.sin(angle);
    const nx = -dy, ny = dx;
    const cx = B.x + B.w / 2, cy = B.y + B.h / 2;
    const half = Math.hypot(B.w, B.h) / 2 + sw * 2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(B.x, B.y, B.w, B.h);
    ctx.clip();
    ctx.fillStyle = cols[0];
    ctx.fillRect(B.x, B.y, B.w, B.h);
    const period = sw * cols.length;
    const shift = ((offset % period) + period) % period;
    const edge = (v, k, forward) => {
      const pts = [];
      const n = Math.ceil((half * 2) / 40);
      for (let i = 0; i <= n; i++) {
        const u = -half + (i / n) * half * 2;
        const vv = v + wobble * noise1(u * 0.012 + k * 3.7, seed) + wobble * 0.3 * noise1(u * 0.05, seed + k);
        pts.push([cx + dx * u + nx * vv, cy + dy * u + ny * vv]);
      }
      if (!forward) pts.reverse();
      return pts;
    };
    for (let ci = 1; ci < cols.length; ci++) {
      const p = new Path2D();
      const first = Math.floor((-half - shift) / period) - 1;
      const last = Math.ceil((half - shift) / period) + 1;
      for (let k = first; k <= last; k++) {
        const v0 = k * period + shift + sw * ci - half * 0;
        const a = edge(v0, k * 2 + ci, true);
        const b = edge(v0 + sw, k * 2 + ci + 1, false);
        a.forEach((pt, i) => (i === 0 ? p.moveTo(pt[0], pt[1]) : p.lineTo(pt[0], pt[1])));
        b.forEach((pt) => p.lineTo(pt[0], pt[1]));
        p.closePath();
      }
      ctx.fillStyle = cols[ci];
      ctx.fill(p);
    }
    ctx.restore();
  }
  lib.stripes = stripes;

  // ===========================================================================
  // Schematic helpers
  // ===========================================================================

  /**
   * hexLattice(ctx, clip, opts) : hexagonal cell lattice with shared, slightly irregular vertices.
   *   r         16       cell circumradius (px)
   *   pointy    true     pointy-top cells (false = flat-top)
   *   width     1
   *   color     pal.lavender
   *   alpha     0.35
   *   jitter    1.0      vertex irregularity (px), shared by neighbouring cells
   *   inset     0        >0 draws each cell as its own hexagon shrunk by this many px
   *   cellFn    null     fn(cx, cy, i, j) => false (skip) | true | { fill, alpha, stroke }
   *   dots      0        radius of a dot at each cell centre (0 = none)
   *   boilAmp   0.35
   *   clip      true     hard-clip to the shape
   *   bounds    frame    when clip is a function, Path2D or null
   *   seed      17
   */
  function hexLattice(ctx, clip, o = {}) {
    const shape = shapeOf(clip, Object.assign({ pad: (o.r || 16) * 2 }, o));
    const R = o.r || 16;
    const pointy = o.pointy !== false;
    const seed = seedInt(o.seed === undefined ? 17 : o.seed);
    const jitter = o.jitter != null ? o.jitter : 1.0;
    const boilAmp = o.boil === false ? 0 : o.boilAmp != null ? o.boilAmp : 0.35;
    const bi = boilIndex(o);
    const inset = o.inset || 0;
    const B = shape.bounds;
    const sq3 = Math.sqrt(3);
    const colW = pointy ? sq3 * R : 1.5 * R;
    const rowH = pointy ? 1.5 * R : sq3 * R;
    const vtx = (x, y) => {
      const kx = Math.round(x * 4), ky = Math.round(y * 4);
      const jx = (h3(kx, ky, seed) - 0.5) * 2 * jitter + (boilAmp ? (h3(kx, ky, seed + bi * 13 + 1) - 0.5) * 2 * boilAmp : 0);
      const jy = (h3(ky, kx, seed + 2) - 0.5) * 2 * jitter + (boilAmp ? (h3(ky, kx, seed + bi * 17 + 3) - 0.5) * 2 * boilAmp : 0);
      return [x + jx, y + jy];
    };
    const edges = new Path2D();
    const dots = new Path2D();
    const fills = [];
    const i0 = Math.floor(B.y / rowH) - 1, i1 = Math.ceil((B.y + B.h) / rowH) + 1;
    const j0 = Math.floor(B.x / colW) - 1, j1 = Math.ceil((B.x + B.w) / colW) + 1;
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        let cx, cy;
        if (pointy) {
          cx = j * colW + (i & 1 ? colW / 2 : 0);
          cy = i * rowH;
        } else {
          cx = j * colW;
          cy = i * rowH + (j & 1 ? rowH / 2 : 0);
        }
        if (shape.polys && !polysContain(shape.polys, cx, cy)) {
          // keep cells that straddle the edge so the hard clip cuts them cleanly
          let near = false;
          for (let k = 0; k < 6 && !near; k++) {
            const a = (k / 6) * TAU + (pointy ? Math.PI / 6 : 0);
            near = polysContain(shape.polys, cx + Math.cos(a) * R, cy + Math.sin(a) * R);
          }
          if (!near) continue;
        }
        let cell = true;
        if (o.cellFn) {
          cell = o.cellFn(cx, cy, i, j);
          if (!cell) continue;
        }
        const V = [];
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * TAU + (pointy ? Math.PI / 6 : 0);
          V.push(vtx(cx + Math.cos(a) * R, cy + Math.sin(a) * R));
        }
        if (typeof cell === 'object' && cell.fill) fills.push([V, cell]);
        if (inset > 0) {
          for (let k = 0; k < 6; k++) {
            const v = V[k];
            const f = Math.max(0, 1 - inset / R);
            const x = cx + (v[0] - cx) * f, y = cy + (v[1] - cy) * f;
            if (k === 0) edges.moveTo(x, y);
            else edges.lineTo(x, y);
          }
          edges.closePath();
        } else {
          // three edges per cell so shared edges are drawn once
          const ks = pointy ? [5, 0, 1] : [0, 1, 2];
          for (const k of ks) {
            edges.moveTo(V[k][0], V[k][1]);
            edges.lineTo(V[(k + 1) % 6][0], V[(k + 1) % 6][1]);
          }
          // cells on the left/top border of the drawn set need their other edges
          if (o.cellFn || shape.polys) {
            for (const k of pointy ? [2, 3, 4] : [3, 4, 5]) {
              edges.moveTo(V[k][0], V[k][1]);
              edges.lineTo(V[(k + 1) % 6][0], V[(k + 1) % 6][1]);
            }
          }
        }
        if (o.dots) {
          dots.moveTo(cx + o.dots, cy);
          dots.arc(cx, cy, o.dots, 0, TAU);
        }
      }
    }
    ctx.save();
    if (shape.apply && o.clip !== false) shape.apply(ctx);
    const color = o.color || pal.lavender;
    const alpha = o.alpha != null ? o.alpha : 0.35;
    for (const [V, cell] of fills) {
      ctx.beginPath();
      lib.tracePath(ctx, V, true);
      ctx.globalAlpha = cell.alpha != null ? cell.alpha : 0.35;
      ctx.fillStyle = cell.fill;
      ctx.fill();
    }
    ctx.globalAlpha = alpha;
    ctx.lineWidth = o.width != null ? o.width : 1;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    ctx.stroke(edges);
    if (o.dots) {
      ctx.fillStyle = color;
      ctx.fill(dots);
    }
    ctx.restore();
  }
  lib.hexLattice = hexLattice;

  function needle(p, x0, y0, x1, y1, w0, w1) {
    const dx = x1 - x0, dy = y1 - y0;
    const L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L;
    p.moveTo(x0 + nx * w0, y0 + ny * w0);
    p.lineTo(x1 + nx * w1, y1 + ny * w1);
    p.lineTo(x1 - nx * w1, y1 - ny * w1);
    p.lineTo(x0 - nx * w0, y0 - ny * w0);
    p.closePath();
  }

  /**
   * glowDot(ctx, x, y, r, opts) : soft glow, hot core and star rays (a nucleus, a spark, a star).
   *   color     pal.glow    glow colour
   *   core      '#ffffff'
   *   rays      8           ray count (0 = none); long and short alternate
   *   rayLen    3.4         ray length as a multiple of r
   *   rayWidth  0.22        ray base width as a multiple of r
   *   rot       0
   *   glow      4.5         glow radius as a multiple of r
   *   intensity 1
   *   twinkle   0.18        per boil drawing flicker
   *   additive  true        'lighter' blending (use false on paper)
   *   seed      19
   */
  function glowDot(ctx, x, y, r, o = {}) {
    const seed = seedInt(o.seed === undefined ? 19 : o.seed);
    const bi = boilIndex(o);
    const tw = o.twinkle != null ? o.twinkle : 0.18;
    const k = (o.intensity != null ? o.intensity : 1) * (1 - tw + tw * 2 * h3(bi, seed, 23));
    const color = o.color || pal.glow;
    const glowR = r * (o.glow != null ? o.glow : 4.5);
    ctx.save();
    if (o.additive !== false) ctx.globalCompositeOperation = 'lighter';
    const base = ctx.globalAlpha;
    const g = ctx.createRadialGradient(x, y, 0, x, y, glowR);
    g.addColorStop(0, lib.rgba(color, 0.55 * k));
    g.addColorStop(0.18, lib.rgba(color, 0.22 * k));
    g.addColorStop(0.5, lib.rgba(color, 0.06 * k));
    g.addColorStop(1, lib.rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - glowR, y - glowR, glowR * 2, glowR * 2);
    const rays = o.rays != null ? o.rays : 8;
    if (rays > 0) {
      const p = new Path2D();
      const rot = o.rot || 0;
      const rl = r * (o.rayLen != null ? o.rayLen : 3.4);
      const rw = r * (o.rayWidth != null ? o.rayWidth : 0.22);
      for (let i = 0; i < rays; i++) {
        const a = rot + (i / rays) * TAU;
        const L = (i % 2 ? 0.52 : 1) * rl * (0.9 + 0.2 * h3(i, bi, seed));
        needle(p, x, y, x + Math.cos(a) * L, y + Math.sin(a) * L, rw, 0.05);
      }
      ctx.globalAlpha = base * Math.min(1, 0.85 * k);
      ctx.fillStyle = o.core || '#ffffff';
      ctx.fill(p);
    }
    ctx.globalAlpha = base * Math.min(1, k);
    const cg = ctx.createRadialGradient(x, y, 0, x, y, r);
    cg.addColorStop(0, o.core || '#ffffff');
    cg.addColorStop(0.55, lib.rgba(o.core || '#ffffff', 0.9));
    cg.addColorStop(1, lib.rgba(color, 0));
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  lib.glowDot = glowDot;

  function ticksImpl(ctx, x, y, o) {
    const p = new Path2D();
    const pm = new Path2D();
    const n = o.n || 24;
    const len = o.len != null ? o.len : 12;
    const major = o.major || 0;
    const majorLen = o.majorLen != null ? o.majorLen : len * 1.8;
    const prog = o.p != null ? clamp(o.p) : 1;
    const count = Math.round(n * prog);
    if (o.kind === 'linear' || (o.r == null && o.length != null)) {
      const L = o.length || 300;
      const a = o.angle || 0;
      const dx = Math.cos(a), dy = Math.sin(a);
      const side = o.side || 1;
      const nx = -dy * side, ny = dx * side;
      for (let i = 0; i <= Math.round(n * prog); i++) {
        const u = (i / n) * L;
        const isMajor = major && i % major === 0;
        const l = isMajor ? majorLen : len;
        const tgt = isMajor ? pm : p;
        tgt.moveTo(x + dx * u, y + dy * u);
        tgt.lineTo(x + dx * u + nx * l, y + dy * u + ny * l);
      }
      if (o.baseline !== false) {
        pm.moveTo(x, y);
        pm.lineTo(x + dx * L * prog, y + dy * L * prog);
      }
    } else {
      const r = o.r != null ? o.r : 40;
      const a0 = (o.start || 0) + (o.rot || 0);
      const span = o.span != null ? o.span : TAU;
      const full = Math.abs(span - TAU) < 1e-6;
      const dir = o.inward ? -1 : 1;
      for (let i = 0; i < count; i++) {
        const a = a0 + (i / (full ? n : Math.max(1, n - 1))) * span;
        const isMajor = major && i % major === 0;
        const l = (isMajor ? majorLen : len) * dir;
        const tgt = isMajor ? pm : p;
        const c = Math.cos(a), s = Math.sin(a);
        tgt.moveTo(x + c * r, y + s * r);
        tgt.lineTo(x + c * (r + l), y + s * (r + l));
      }
    }
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = o.color || pal.lineWhite;
    ctx.globalAlpha *= o.alpha != null ? o.alpha : 0.6;
    ctx.lineWidth = o.width != null ? o.width : 1.5;
    ctx.stroke(p);
    ctx.lineWidth = (o.width != null ? o.width : 1.5) * 1.35;
    ctx.stroke(pm);
    ctx.restore();
  }

  /**
   * ticks(ctx, x, y, opts) : radial ticks around a circle, or a linear ruler.
   * Radial (default):  r 40, n 24, len 12, start 0, span TAU, major 0, majorLen len*1.8, inward false, rot 0
   * Linear (kind 'linear' or length given): length 300, angle 0, n 24, len 12, major 0, side 1, baseline true
   * Both: color pal.lineWhite, alpha 0.6, width 1.5, p 1 (draw-on progress)
   */
  lib.ticks = (ctx, x, y, o = {}) => ticksImpl(ctx, x, y, o);

  function labelAt(ctx, str, x, y, o) {
    lib.text(ctx, str, x, y, {
      size: o.labelSize || 22,
      color: o.labelColor || o.color,
      alpha: o.alpha != null ? o.alpha : 0.9,
      align: o.labelAlign || 'center',
      baseline: 'middle',
      weight: 400,
      tracking: 1,
    });
  }

  /**
   * bracket(ctx, x1, y1, x2, y2, opts) : a measurement bracket between two points.
   *   style    'dim'    'dim' = dimension line with end bars and arrow ticks, 'square' = [ shape
   *   offset   0        perpendicular offset of the bracket from the measured points (px)
   *   cap      16       end bar length
   *   color    pal.lavender
   *   alpha    0.6
   *   width    1.5
   *   label    null     text at the middle
   *   p        1        draw-on progress
   */
  lib.bracket = (ctx, x1, y1, x2, y2, o = {}) => {
    const dx = x2 - x1, dy = y2 - y1;
    const L = Math.hypot(dx, dy) || 1;
    const ux = dx / L, uy = dy / L;
    const nx = -uy, ny = ux;
    const off = o.offset || 0;
    const cap = o.cap != null ? o.cap : 16;
    const prog = o.p != null ? clamp(o.p) : 1;
    const ax = x1 + nx * off, ay = y1 + ny * off;
    const bx = x2 + nx * off, by = y2 + ny * off;
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    const h = (L / 2) * prog;
    const p = new Path2D();
    const style = o.style || 'dim';
    const labelGap = o.label ? Math.min(h * 0.9, (String(o.label).length * (o.labelSize || 22)) * 0.34 + 10) : 0;
    const sx = mx - ux * h, sy = my - uy * h, ex = mx + ux * h, ey = my + uy * h;
    if (style === 'square') {
      const sgn = off >= 0 ? -1 : 1;
      p.moveTo(sx + nx * cap * sgn, sy + ny * cap * sgn);
      p.lineTo(sx, sy);
      p.lineTo(mx - ux * labelGap, my - uy * labelGap);
      p.moveTo(mx + ux * labelGap, my + uy * labelGap);
      p.lineTo(ex, ey);
      p.lineTo(ex + nx * cap * sgn, ey + ny * cap * sgn);
    } else {
      p.moveTo(sx, sy);
      p.lineTo(mx - ux * labelGap, my - uy * labelGap);
      p.moveTo(mx + ux * labelGap, my + uy * labelGap);
      p.lineTo(ex, ey);
      p.moveTo(sx - nx * cap * 0.5, sy - ny * cap * 0.5);
      p.lineTo(sx + nx * cap * 0.5, sy + ny * cap * 0.5);
      p.moveTo(ex - nx * cap * 0.5, ey - ny * cap * 0.5);
      p.lineTo(ex + nx * cap * 0.5, ey + ny * cap * 0.5);
      const ah = Math.min(9, h * 0.3);
      p.moveTo(sx + ux * ah + nx * ah * 0.5, sy + uy * ah + ny * ah * 0.5);
      p.lineTo(sx, sy);
      p.lineTo(sx + ux * ah - nx * ah * 0.5, sy + uy * ah - ny * ah * 0.5);
      p.moveTo(ex - ux * ah + nx * ah * 0.5, ey - uy * ah + ny * ah * 0.5);
      p.lineTo(ex, ey);
      p.lineTo(ex - ux * ah - nx * ah * 0.5, ey - uy * ah - ny * ah * 0.5);
      if (off) {
        // extension lines back to the measured points
        p.moveTo(x1 + nx * Math.sign(off) * 4, y1 + ny * Math.sign(off) * 4);
        p.lineTo(ax + nx * Math.sign(off) * cap * 0.6, ay + ny * Math.sign(off) * cap * 0.6);
        p.moveTo(x2 + nx * Math.sign(off) * 4, y2 + ny * Math.sign(off) * 4);
        p.lineTo(bx + nx * Math.sign(off) * cap * 0.6, by + ny * Math.sign(off) * cap * 0.6);
      }
    }
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = o.color || pal.lavender;
    ctx.globalAlpha *= o.alpha != null ? o.alpha : 0.6;
    ctx.lineWidth = o.width != null ? o.width : 1.5;
    ctx.stroke(p);
    ctx.restore();
    if (o.label && prog > 0.6) {
      ctx.save();
      ctx.translate(mx, my);
      let a = Math.atan2(uy, ux);
      if (a > Math.PI / 2 || a < -Math.PI / 2) a += Math.PI;
      ctx.rotate(a);
      ctx.globalAlpha *= clamp((prog - 0.6) / 0.4);
      labelAt(ctx, o.label, 0, 0, Object.assign({ color: o.color || pal.lavender }, o));
      ctx.restore();
    }
  };

  /**
   * guideCircle(ctx, cx, cy, r, opts) : a faint construction circle.
   *   color pal.lavender, alpha 0.15, width 1.5, dash null ([on, off]),
   *   p 1 (draw-on progress), start -PI/2, cross 0 (centre crosshair half-size),
   *   quadrants 0 (tick length at the four quadrant points), ink false (hand-drawn via inkPath), seed
   */
  lib.guideCircle = (ctx, cx, cy, r, o = {}) => {
    const prog = o.p != null ? clamp(o.p) : 1;
    if (prog <= 0) return;
    const start = o.start != null ? o.start : -Math.PI / 2;
    const color = o.color || pal.lavender;
    const alpha = o.alpha != null ? o.alpha : 0.15;
    const width = o.width != null ? o.width : 1.5;
    ctx.save();
    if (o.ink) {
      const n = Math.max(12, Math.ceil(r * TAU * prog / 10));
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const a = start + (i / n) * TAU * prog;
        pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
      inkPath(ctx, pts, { closed: prog >= 1, width: width * 1.4, color, alpha, seed: o.seed, taper: [6, 12], wobble: 1.2 });
    } else {
      ctx.beginPath();
      ctx.arc(cx, cy, r, start, start + TAU * prog);
      ctx.strokeStyle = color;
      ctx.globalAlpha *= alpha;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      if (o.dash) ctx.setLineDash(o.dash);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (o.cross || o.quadrants) {
      const p = new Path2D();
      if (o.cross) {
        p.moveTo(cx - o.cross, cy);
        p.lineTo(cx + o.cross, cy);
        p.moveTo(cx, cy - o.cross);
        p.lineTo(cx, cy + o.cross);
      }
      if (o.quadrants) {
        for (let k = 0; k < 4; k++) {
          const a = (k * Math.PI) / 2;
          const c = Math.cos(a), s = Math.sin(a);
          p.moveTo(cx + c * (r - o.quadrants), cy + s * (r - o.quadrants));
          p.lineTo(cx + c * (r + o.quadrants), cy + s * (r + o.quadrants));
        }
      }
      if (o.ink) {
        ctx.strokeStyle = color;
        ctx.globalAlpha *= alpha;
      }
      ctx.lineWidth = width;
      ctx.stroke(p);
    }
    ctx.restore();
  };

  /**
   * arcAnnotation(ctx, cx, cy, r, a0, a1, opts) : a thin coloured arc over an illustration
   * (flight paths, sound, attention), with an arrowhead and an origin dot.
   *   color pal.annMagenta, width 2, alpha 1, p 1 (draw-on progress), endTicks 8 (0 = none),
   *   arrow 0 (arrowhead size), dot 0 (origin dot radius), dash null, label null, labelOffset 26
   */
  lib.arcAnnotation = (ctx, cx, cy, r, a0, a1, o = {}) => {
    const prog = o.p != null ? clamp(o.p) : 1;
    if (prog <= 0) return;
    const color = o.color || pal.annMagenta;
    const width = o.width != null ? o.width : 2;
    const ae = a0 + (a1 - a0) * prog;
    const ccw = a1 < a0;
    ctx.save();
    ctx.globalAlpha *= o.alpha != null ? o.alpha : 1;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    if (o.dash) ctx.setLineDash(o.dash);
    ctx.beginPath();
    ctx.arc(cx, cy, r, a0, ae, ccw);
    ctx.stroke();
    ctx.setLineDash([]);
    const et = o.endTicks != null ? o.endTicks : 8;
    if (et) {
      ctx.beginPath();
      for (const a of prog >= 1 ? [a0, ae] : [a0]) {
        ctx.moveTo(cx + Math.cos(a) * (r - et / 2), cy + Math.sin(a) * (r - et / 2));
        ctx.lineTo(cx + Math.cos(a) * (r + et / 2), cy + Math.sin(a) * (r + et / 2));
      }
      ctx.stroke();
    }
    const dot = o.dot != null ? o.dot : 0;
    if (dot) {
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r, dot, 0, TAU);
      ctx.fill();
    }
    const ah = o.arrow != null ? o.arrow : 0;
    if (ah) {
      const ex = cx + Math.cos(ae) * r, ey = cy + Math.sin(ae) * r;
      const tdir = ae + (ccw ? -Math.PI / 2 : Math.PI / 2);
      const tx = Math.cos(tdir), ty = Math.sin(tdir);
      const nx = -ty, ny = tx;
      ctx.beginPath();
      ctx.moveTo(ex + tx * ah * 0.35, ey + ty * ah * 0.35);
      ctx.lineTo(ex - tx * ah * 0.75 + nx * ah * 0.45, ey - ty * ah * 0.75 + ny * ah * 0.45);
      ctx.lineTo(ex - tx * ah * 0.45, ey - ty * ah * 0.45);
      ctx.lineTo(ex - tx * ah * 0.75 - nx * ah * 0.45, ey - ty * ah * 0.75 - ny * ah * 0.45);
      ctx.closePath();
      ctx.fill();
    }
    if (o.label) {
      const am = (a0 + ae) / 2;
      const lo = o.labelOffset != null ? o.labelOffset : 26;
      lib.text(ctx, o.label, cx + Math.cos(am) * (r + lo), cy + Math.sin(am) * (r + lo), {
        size: o.labelSize || 24,
        color,
        align: 'center',
        baseline: 'middle',
        weight: 500,
      });
    }
    ctx.restore();
  };

  // ===========================================================================
  // Camera and text
  // ===========================================================================

  /**
   * camera(ctx, { x, y, zoom, rot }, fn) : draws fn(ctx) with world point (x, y) at the frame centre,
   * scaled by zoom and rotated by rot. Defaults: the frame centre, zoom 1, rot 0.
   */
  lib.camera = (ctx, cam, fn) => {
    const c = cam || {};
    const x = c.x != null ? c.x : W() / 2;
    const y = c.y != null ? c.y : H() / 2;
    ctx.save();
    ctx.translate(W() / 2, H() / 2);
    if (c.rot) ctx.rotate(c.rot);
    if (c.zoom != null && c.zoom !== 1) ctx.scale(c.zoom, c.zoom);
    ctx.translate(-x, -y);
    let out;
    try {
      out = fn(ctx);
    } finally {
      ctx.restore();
    }
    return out;
  };

  const FONT_STACK = '"SF Pro Rounded", ui-rounded, "Helvetica Neue", system-ui, -apple-system, "Segoe UI", Arial, sans-serif';

  /**
   * text(ctx, str, x, y, opts) : a thin single-line wordmark in the system sans-serif (no font files).
   *   size 42, weight 300, color pal.ink, alpha 1, align 'left', baseline 'alphabetic',
   *   tracking 0 (px number, or a css length such as '0.12em'; letterSpacing is an alias),
   *   family (system stack), p 1 (typewriter reveal fraction), italic false
   */
  lib.text = (ctx, str, x, y, o = {}) => {
    let s = String(str);
    if (o.p != null) s = s.slice(0, Math.round(s.length * clamp(o.p)));
    if (!s) return;
    ctx.save();
    ctx.font = `${o.italic ? 'italic ' : ''}${o.weight || 300} ${o.size || 42}px ${o.family || FONT_STACK}`;
    ctx.fillStyle = o.color || pal.ink;
    ctx.globalAlpha *= o.alpha != null ? o.alpha : 1;
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.baseline || 'alphabetic';
    if ('letterSpacing' in ctx) {
      const tr = o.letterSpacing != null ? o.letterSpacing : o.tracking;
      ctx.letterSpacing = typeof tr === 'string' ? tr : `${tr || 0}px`;
    }
    ctx.fillText(s, x, y);
    ctx.restore();
  };

  // ===========================================================================
  // Rhythm
  // ===========================================================================

  // bpm and cues come from FILM.TIMELINE, read at call time (this file loads before timeline.js).
  // A bar is four quarters. drawing / hit / popTwos are the clocks from reference/scene-anatomy.md,
  // one copy so scenes stop drifting on `lead` and the 12 Hz grid.

  function filmBpm() {
    const b = FILM.TIMELINE && Number(FILM.TIMELINE.bpm);
    return b > 0 && isFinite(b) ? b : 120;
  }

  /** beat(T) : { n, frac, bar, beatInBar } of global time T. n is the quarter that has started (0 at T = 0). */
  lib.beat = (T) => {
    const spb = 60 / filmBpm();
    let n = Math.floor(T / spb + 1e-6);
    let into = T - n * spb;
    if (!(into > 0)) into = 0;
    const bar = Math.floor(n / 4);
    return { n, frac: into / spb, bar, beatInBar: n - bar * 4 };
  };

  /** onBeat(T, div=1) : seconds since the last division. 1 = quarter, 2 = eighth, 4 = sixteenth. */
  lib.onBeat = (T, div = 1) => {
    const d = div > 0 ? div : 1;
    const step = 60 / filmBpm() / d;
    const k = Math.floor(T / step + 1e-6);
    const since = T - k * step;
    return since > 0 ? since : 0;
  };

  /** drawing(t, a) : drawings since beat a at 12 Hz. Negative before a. floor((t-a)*12+1e-6). */
  lib.drawing = (t, a) => Math.floor((t - a) * 12 + 1e-6);

  /**
   * hit(t, a, frames, ease?, lead=1) : 0 before a, else an ease across `frames` film frames (1/24 s).
   * lead 1 is already > 0 at t = a, so the hit reads on the beat frame rather than one frame late.
   */
  lib.hit = (t, a, frames, e, lead = 1) => {
    if (t < a) return 0;
    const u = clamp((t - a) / (frames / 24) + lead / frames);
    return easeFn(e)(u);
  };

  /** popTwos(t, a) : 0 before a, else the three drawings [0.72, 1.08, 1] — overshoot, then settle. */
  lib.popTwos = (t, a) => (t < a ? 0 : [0.72, 1.08, 1][Math.min(2, lib.drawing(t, a))]);

  function cueRows(kind) {
    const list = (FILM.TIMELINE && FILM.TIMELINE.cues) || [];
    const out = [];
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      if (!c || typeof c.t !== 'number' || !isFinite(c.t)) continue;
      if (kind != null && c.kind !== kind) continue;
      out.push(c);
    }
    return out;
  }

  /** cue(T, kind?) : { since, cue } of the latest cue at or before T. since is Infinity before the first. */
  lib.cue = (T, kind) => {
    const list = cueRows(kind);
    let best = null;
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      if (c.t > T + 1e-9) continue;
      if (!best || c.t >= best.t) best = c;
    }
    if (!best) return { since: Infinity, cue: null };
    const since = T - best.t;
    return { since: since > 0 ? since : 0, cue: best };
  };

  /** nextCue(T, kind?) : { until, cue } of the first cue strictly after T. until is Infinity when none remain. */
  lib.nextCue = (T, kind) => {
    const list = cueRows(kind);
    let best = null;
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      if (c.t <= T + 1e-9) continue;
      if (!best || c.t < best.t) best = c;
    }
    if (!best) return { until: Infinity, cue: null };
    const until = best.t - T;
    return { until: until > 0 ? until : 0, cue: best };
  };

  /**
   * pulse(T, kind, { decay, shape }) : 0..1 fall from the latest cue of that kind (any kind when omitted).
   * 1 on the cue frame. decay is seconds from 1 down to 0 (default one beat); shape is an ease name or function.
   */
  lib.pulse = (T, kind, o) => {
    const opts = o || {};
    const since = lib.cue(T, kind).since;
    if (!isFinite(since)) return 0;
    const decay = opts.decay != null ? opts.decay : 60 / filmBpm();
    if (!(decay > 0)) return since <= 1e-9 ? 1 : 0;
    return clamp(1 - easeFn(opts.shape)(clamp(since / decay)));
  };

  // ===========================================================================
  // Silhouette morph
  // ===========================================================================

  // Closed rings from profile.outline() repeat the first point; that duplicate is not an edge.
  function ringPoints(pts, dropDup) {
    if (!pts || typeof pts.length !== 'number') throw new Error('lib.resample: expected a list of points');
    const src = [];
    for (let i = 0; i < pts.length; i++) {
      const p = XY(pts[i]);
      const x = +p[0], y = +p[1];
      if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error(`lib.resample: point ${i} is not a finite [x, y]`);
      src.push([x, y]);
    }
    if (dropDup && src.length > 1) {
      const a = src[0], b = src[src.length - 1];
      if (Math.hypot(a[0] - b[0], a[1] - b[1]) <= 1e-9) src.pop();
    }
    return src;
  }

  function arcCum(ring, closed) {
    const m = ring.length;
    const segs = closed ? m : Math.max(0, m - 1);
    const cum = new Float64Array(segs + 1);
    for (let i = 0; i < segs; i++) {
      const a = ring[i], b = ring[(i + 1) % m];
      cum[i + 1] = cum[i] + Math.hypot(b[0] - a[0], b[1] - a[1]);
    }
    return cum;
  }

  function pointAlong(ring, cum, dist, closed) {
    const m = ring.length;
    const segs = closed ? m : m - 1;
    const total = cum[segs];
    if (!(total > 0)) return [ring[0][0], ring[0][1]];
    let d = dist;
    if (!closed) {
      if (d <= 0) return [ring[0][0], ring[0][1]];
      if (d >= total) return [ring[m - 1][0], ring[m - 1][1]];
    } else if (d <= 0 || d >= total) {
      return [ring[0][0], ring[0][1]];
    }
    let lo = 0, hi = segs - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cum[mid + 1] <= d) lo = mid + 1;
      else hi = mid;
    }
    const span = cum[lo + 1] - cum[lo];
    let u = span > 0 ? (d - cum[lo]) / span : 0;
    if (u < 0) u = 0;
    else if (u > 1) u = 1;
    const a = ring[lo], b = ring[(lo + 1) % m];
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  }

  /**
   * resample(pts, n, closed=false) : n points spaced evenly by arc length.
   * Closed contours include the edge back to the start and do not repeat it.
   * Open polylines keep both endpoints. A closing point equal to the start is
   * dropped only when closed is true.
   */
  lib.resample = (pts, n, closed = false) => {
    const count = Math.round(Number(n));
    if (!Number.isFinite(count) || count < 1) throw new Error('lib.resample: n must be a positive number');
    const isClosed = !!closed;
    const ring = ringPoints(pts, isClosed);
    if (!ring.length) throw new Error('lib.resample: no points');
    const out = new Array(count);
    if (ring.length === 1 || (isClosed && ring.length < 2)) {
      for (let i = 0; i < count; i++) out[i] = [ring[0][0], ring[0][1]];
      return out;
    }
    const cum = arcCum(ring, isClosed);
    const total = cum[isClosed ? ring.length : ring.length - 1];
    if (!isClosed) {
      for (let i = 0; i < count; i++) out[i] = pointAlong(ring, cum, count === 1 ? 0 : (total * i) / (count - 1), false);
      return out;
    }
    for (let i = 0; i < count; i++) out[i] = pointAlong(ring, cum, (total * i) / count, true);
    return out;
  };

  function copyRing(pts) {
    const out = new Array(pts.length);
    for (let i = 0; i < pts.length; i++) out[i] = [pts[i][0], pts[i][1]];
    return out;
  }

  // Opposite traversal, same start point. Cyclic shifts then try every other start.
  function reverseClosed(pts) {
    const n = pts.length;
    const out = new Array(n);
    out[0] = pts[0];
    for (let i = 1; i < n; i++) out[i] = pts[n - i];
    return out;
  }

  function twiceArea(pts) {
    let a = 0;
    for (let i = 0, n = pts.length; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      a += p[0] * q[1] - q[0] * p[1];
    }
    return a;
  }

  function topIndex(pts) {
    let k = 0;
    for (let i = 1; i < pts.length; i++) {
      const y = pts[i][1], x = pts[i][0];
      if (y < pts[k][1] || (y === pts[k][1] && x < pts[k][0])) k = i;
    }
    return k;
  }

  function shiftRing(pts, s) {
    const n = pts.length;
    const k = ((s % n) + n) % n;
    if (k === 0) return pts;
    const out = new Array(n);
    for (let i = 0; i < n; i++) out[i] = pts[(i + k) % n];
    return out;
  }

  // A stays in resample order so p = 0 is exactly resample(a). Only B is realigned.
  function alignClosed(A, B, mode) {
    const n = A.length;
    if (mode === 'index') return B;
    if (mode === 'top') {
      let R = B;
      if (twiceArea(A) * twiceArea(B) < 0) R = reverseClosed(B);
      return shiftRing(R, (topIndex(R) - topIndex(A) + n) % n);
    }
    if (mode !== 'auto') throw new Error(`lib.morph: align '${mode}' is not auto, top or index`);
    const dirs = [B, reverseClosed(B)];
    let best = Infinity, bestShift = 0, bestRev = 0;
    for (let rev = 0; rev < 2; rev++) {
      const R = dirs[rev];
      for (let s = 0; s < n; s++) {
        let sum = 0, worse = false;
        for (let i = 0; i < n; i++) {
          const p = R[(i + s) % n], q = A[i];
          sum += Math.hypot(p[0] - q[0], p[1] - q[1]);
          if (sum >= best) { worse = true; break; }
        }
        // A hair of slack keeps a symmetric tie (a circle, either direction) on the
        // earlier candidate: forward, then the smallest shift. Real alignments differ by pixels.
        if (!worse && sum + 1e-4 < best) {
          best = sum;
          bestShift = s;
          bestRev = rev;
        }
      }
    }
    return shiftRing(dirs[bestRev], bestShift);
  }

  /**
   * morph(a, b, p, opts) : blend of two closed contours. Both are resampled to n
   * points by arc length; B is realigned; corresponding points are interpolated.
   *   n      256      samples on each outline
   *   align  'auto'   'auto'  least sum of distances over cyclic shifts and both
   *                    traversal directions (ties keep the earlier shift, forward first)
   *                    'top'   uppermost point of B paired with uppermost of A,
   *                    reversing B when the windings disagree
   *                    'index' pair the resampled points in order
   *   ease   linear   lib.ease name or function, applied to p (clamped 0..1)
   * p = 0 is resample(a, n, true). p = 1 is resample(b) only when alignment does
   * not have to move B (same direction, start already optimal, or align 'index').
   * Accepts lib.geo(id).outline() for every geometry kind that has one.
   */
  lib.morph = (a, b, p, opts) => {
    const o = opts || {};
    const n = o.n == null ? 256 : Math.round(Number(o.n));
    if (!Number.isFinite(n) || n < 1) throw new Error('lib.morph: n must be a positive number');
    const A = lib.resample(a, n, true);
    const B = alignClosed(A, lib.resample(b, n, true), o.align || 'auto');
    const t = easeFn(o.ease)(Number.isFinite(+p) ? +p : 0);
    if (t === 0) return copyRing(A);
    if (t === 1) return copyRing(B);
    const out = new Array(n);
    for (let i = 0; i < n; i++) {
      const pa = A[i], pb = B[i];
      out[i] = [pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t];
    }
    return out;
  };

  // ===========================================================================
  // Particles (stateless: position is a closed function of seed, index and time)
  // ===========================================================================

  /**
   * Sparks, dust, pollen and smoke with no per-frame state.
   * Particle i is born at t_i = i / rate plus a seeded jitter in [0, 1/rate), and lives `life`.
   * While it is alive its position is analytic: exponential drag, constant gravity, and a wind
   * displacement wind * noise1(age) * age. Nothing is alive for T < 0. Because births are spaced
   * about 1/rate apart, the number alive at any T is at most ceil(rate * life) + 1.
   *
   * Gravity is px/s^2 toward +y, and canvas +y points down, so gravity > 0 pulls downward
   * (smoke that should rise wants an upward angle and, if it must keep rising, a negative gravity).
   * After the apex of an upward throw with wind 0, y increases monotonically.
   *
   *   seed, n, emitter { x, y, r } or { pts }   pts are absolute; otherwise a disk of radius r
   *   rate, life, v0 [min, max], angle, spread  spread is the full cone width in radians
   *   gravity, drag, wind, size, color, fade    fade is the exponent on (1 - age/life); 0 or false holds
   *   kind   'spark' | 'dust' | 'smoke' | 'pollen'
   *   additive   'lighter' composite, for sparks on a dark plate
   *   loop       period in seconds. State at T equals state at T+period for T >= 0.
   *              Only floor(rate * period - 1) + 1 births fit in one period; later indices stay dead
   *              so a loop cannot exceed the birth rate.
   *   onTwos     quantise T onto the 12 fps grid before simulating (drawing holds on twos)
   *
   * particleAt(i, T, opts) → { x, y, age, alive } for the same options.
   */
  function normParticles(o) {
    const s = o || {};
    const v0 = Array.isArray(s.v0) && s.v0.length ? s.v0 : [40, 140];
    const vMin = Number(v0[0]);
    const vMax = v0.length > 1 ? Number(v0[1]) : vMin;
    const e = s.emitter;
    let emitter;
    if (!e) emitter = { x: W() / 2, y: H() / 2, r: 0, pts: null };
    else {
      emitter = {
        x: e.x != null ? e.x : 0,
        y: e.y != null ? e.y : 0,
        r: e.r > 0 ? e.r : 0,
        pts: e.pts && e.pts.length ? e.pts : null,
      };
    }
    const rate = s.rate > 0 ? s.rate : 24;
    const life = s.life > 0 ? s.life : 1;
    const loop = s.loop > 0 ? s.loop : 0;
    let slots = s.n == null ? 48 : s.n;
    slots = slots > 0 ? slots | 0 : 0;
    if (loop > 0) {
      const fit = Math.floor(rate * loop - 1) + 1;
      slots = fit > 0 ? Math.min(slots, fit) : 0;
    }
    let fade = 1;
    if (s.fade === false || s.fade === 0) fade = 0;
    else if (typeof s.fade === 'number' && s.fade > 0) fade = s.fade;
    return {
      seedN: hash(s.seed === undefined ? 1 : s.seed) | 0,
      n: slots,
      emitter,
      rate,
      life,
      vMin,
      vMax,
      angle: s.angle != null ? s.angle : -Math.PI / 2,
      spread: s.spread != null ? s.spread : 0.8,
      gravity: s.gravity != null ? s.gravity : 480,
      drag: s.drag != null ? s.drag : 1,
      wind: s.wind || 0,
      size: s.size > 0 ? s.size : 3,
      color: s.color || pal.ink,
      fade,
      kind: String(s.kind || 'dust').toLowerCase(),
      additive: !!s.additive,
      onTwos: !!s.onTwos,
      loop,
    };
  }

  // Simulation clock. onTwos quantises first, then loop folds T into one period.
  function particleTime(T, o) {
    if (!(T >= 0) || T !== T) return -1;
    let t = o.onTwos ? lib.onTwos(T) : T;
    if (!(t >= 0)) return -1;
    const p = o.loop;
    if (p > 0) {
      let x = t - Math.floor(t / p) * p;
      if (x < 0) x += p;
      else if (x >= p) x -= p;
      t = x;
    }
    return t;
  }

  function emitXY(i, e, seedN, out) {
    const pts = e.pts;
    if (pts) {
      const n = pts.length;
      const p0 = XY(pts[0]);
      if (n === 1) {
        out.x0 = p0[0];
        out.y0 = p0[1];
        return;
      }
      let total = 0;
      for (let k = 1; k < n; k++) {
        const a = XY(pts[k - 1]);
        const b = XY(pts[k]);
        total += Math.hypot(b[0] - a[0], b[1] - a[1]);
      }
      let d = total > 0 ? h3(i, seedN, 3) * total : 0;
      for (let k = 1; k < n; k++) {
        const a = XY(pts[k - 1]);
        const b = XY(pts[k]);
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (d <= len || k === n - 1) {
          const u = len > 0 ? d / len : 0;
          out.x0 = a[0] + (b[0] - a[0]) * u;
          out.y0 = a[1] + (b[1] - a[1]) * u;
          return;
        }
        d -= len;
      }
      out.x0 = p0[0];
      out.y0 = p0[1];
      return;
    }
    const r = e.r;
    if (!(r > 0)) {
      out.x0 = e.x;
      out.y0 = e.y;
      return;
    }
    const a = h3(i, seedN, 4) * TAU;
    const rad = Math.sqrt(h3(i, seedN, 5)) * r;
    out.x0 = e.x + Math.cos(a) * rad;
    out.y0 = e.y + Math.sin(a) * rad;
  }

  // Integrate drag + gravity from the birth pose. Wind is a displacement, so wind 0 leaves y ballistic.
  function placeParticle(age, o, wSeed, out) {
    const g = o.gravity;
    const k = o.drag;
    const vx = out.vx0;
    const vy = out.vy0;
    let x;
    let y;
    if (k > 1e-3 || k < -1e-3) {
      const e = Math.exp(-k * age);
      const inv = 1 / k;
      const gk = g * inv;
      const grow = (1 - e) * inv;
      x = out.x0 + vx * grow;
      y = out.y0 + gk * age + (vy - gk) * grow;
      out.vx = vx * e;
      out.vy = gk + (vy - gk) * e;
    } else {
      x = out.x0 + vx * age;
      y = out.y0 + vy * age + 0.5 * g * age * age;
      out.vx = vx;
      out.vy = vy + g * age;
    }
    if (o.wind) {
      const n1 = noise1(age * 0.85, wSeed);
      const n2 = noise1(age * 0.85 + 3.7, wSeed + 17);
      x += o.wind * n1 * age;
      y += o.wind * 0.25 * n2 * age;
    }
    out.x = x;
    out.y = y;
  }

  // `t` is already the simulation clock (see particleTime). Fills `out`.
  function evalParticle(i, t, o, out) {
    out.x = 0;
    out.y = 0;
    out.age = -1;
    out.alive = false;
    out.vx = 0;
    out.vy = 0;
    if (i < 0 || i >= o.n || !(o.rate > 0) || !(o.life > 0)) return out;
    const seedN = o.seedN;
    const gap = 1 / o.rate;
    // Jitter stays strictly under one gap so births cannot bunch enough to break the live-count bound.
    const t0 = (i + h3(i, seedN, 1) * 0.999) * gap;
    let age = t - t0;
    if (o.loop > 0 && age < 0) age += o.loop;
    out.age = age;
    out.alive = age >= 0 && age < o.life;
    emitXY(i, o.emitter, seedN, out);
    const speed = o.vMin + (o.vMax - o.vMin) * h3(i, seedN, 6);
    const ang = o.angle + (h3(i, seedN, 7) - 0.5) * o.spread;
    out.vx0 = Math.cos(ang) * speed;
    out.vy0 = Math.sin(ang) * speed;
    out.sizeK = 0.72 + 0.56 * h3(i, seedN, 8);
    const wSeed = (seedN ^ Math.imul(i + 1, 0x9e3779b1)) | 0;
    const at = age > 0 ? age : 0;
    placeParticle(at, o, wSeed, out);
    return out;
  }

  function particleAt(i, T, opts) {
    const o = normParticles(opts);
    const out = { x: 0, y: 0, age: -1, alive: false };
    const t = particleTime(T, o);
    if (!(t >= 0)) return out;
    evalParticle(i | 0, t, o, out);
    return { x: out.x, y: out.y, age: out.age, alive: out.alive };
  }

  const PARTICLE_STEPS = 8;

  function particleBucket(paths, alphas, a) {
    if (!(a > 0.025)) return null;
    if (a > 1) a = 1;
    const bi = Math.min(PARTICLE_STEPS - 1, (a * PARTICLE_STEPS * 0.999999) | 0);
    let p = paths[bi];
    if (!p) {
      p = paths[bi] = new Path2D();
      alphas[bi] = (bi + 1) / PARTICLE_STEPS;
    }
    return p;
  }

  function addDot(path, x, y, r) {
    if (!(r > 0.3)) return;
    // Diamonds, not arcs: a few hundred arc fills blew the frame budget. Smoke uses addDisc.
    path.moveTo(x, y - r);
    path.lineTo(x + r * 0.72, y);
    path.lineTo(x, y + r);
    path.lineTo(x - r * 0.72, y);
    path.closePath();
  }

  function addDisc(path, x, y, r) {
    if (!(r > 0.4)) return;
    path.moveTo(x + r, y);
    path.arc(x, y, r, 0, TAU);
  }

  function addSpark(path, x, y, vx, vy, size) {
    const sp = Math.hypot(vx, vy);
    const len = Math.min(size * 8, Math.max(size * 2.2, sp * 0.05));
    const inv = sp > 1 ? 1 / sp : 0;
    const ux = inv ? vx * inv : 1;
    const uy = inv ? vy * inv : 0;
    const nx = -uy;
    const ny = ux;
    const w = size * 0.42;
    path.moveTo(x + ux * size * 0.85, y + uy * size * 0.85);
    path.lineTo(x - ux * len + nx * w, y - uy * len + ny * w);
    path.lineTo(x - ux * (len * 0.55), y - uy * (len * 0.55));
    path.lineTo(x - ux * len - nx * w, y - uy * len - ny * w);
    path.closePath();
  }

  function particles(ctx, T, opts) {
    const o = normParticles(opts);
    const t = particleTime(T, o);
    if (!(t >= 0) || !(o.n > 0)) return;
    let i0 = 0;
    let i1 = o.n - 1;
    if (!(o.loop > 0)) {
      i1 = Math.min(i1, Math.floor(o.rate * t));
      i0 = Math.max(0, Math.floor(o.rate * (t - o.life) - 1));
    }
    if (i1 < i0) return;
    const paths = new Array(PARTICLE_STEPS);
    const alphas = new Array(PARTICLE_STEPS);
    const rec = {};
    const smoke = o.kind === 'smoke';
    const spark = o.kind === 'spark';
    const pollen = o.kind === 'pollen';
    for (let i = i0; i <= i1; i++) {
      evalParticle(i, t, o, rec);
      if (!rec.alive) continue;
      const u = rec.age / o.life;
      let a = o.fade > 0 ? Math.pow(1 - u, o.fade) : 1;
      const sz = o.size * rec.sizeK;
      if (smoke) {
        // One disc. A second circle, or a diamond the size of a puff, read as a brick.
        const R = Math.min(40, sz * (0.55 + u));
        const p = particleBucket(paths, alphas, a * 0.62);
        if (p) addDisc(p, rec.x, rec.y, R);
      } else if (spark) {
        const p = particleBucket(paths, alphas, a);
        if (p) addSpark(p, rec.x, rec.y, rec.vx, rec.vy, sz);
      } else if (pollen) {
        const p = particleBucket(paths, alphas, a * 0.92);
        if (p) addDot(p, rec.x, rec.y, sz);
      } else {
        const p = particleBucket(paths, alphas, a * 0.7);
        if (p) addDot(p, rec.x, rec.y, sz * 0.65);
      }
    }
    ctx.save();
    try {
      if (o.additive) ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = o.color;
      const base = ctx.globalAlpha;
      for (let b = 0; b < PARTICLE_STEPS; b++) {
        if (!paths[b]) continue;
        ctx.globalAlpha = base * alphas[b];
        ctx.fill(paths[b]);
      }
    } finally {
      ctx.restore();
    }
  }

  lib.particleAt = particleAt;
  lib.particles = particles;

  // ===========================================================================
  // Scatter and flow
  // ===========================================================================

  /*
   * scatter(clip, opts) : Bridson Poisson-disk points inside a clip (any format from the
   * file header), then a seeded volley of uniform darts so the gaps Bridson leaves still fill.
   * Returns [{x, y}, ...]. Do not mutate it: the same array comes back on a later call.
   *
   *   r        exclusion radius in px. Pairs are at least r apart when density is absent or 1.
   *   seed     rng seed (number or string)
   *   max      stop after this many points (default 1000000)
   *   density  optional (x, y) => 0..1. Local exclusion radius is r / sqrt(density).
   *            0 (and anything under 0.04) rejects the spot; values above 1 clamp to 1,
   *            so points are never closer than r.
   *   bounds   {x,y,w,h} or [x,y,w,h] when clip is a function, a Path2D or null.
   *            A polygon uses its own bounds (same rule as hatch).
   *
   * Cache key: clip hash, bounds, r, seed, max, and an 8×8 sampling of density over the
   * bounds. The density function's identity is not the key. Absent density is its own
   * signature, not the signature of a function that returns 1. Two pure functions that
   * agree on that grid share an entry even if they differ between the samples; a density
   * or a clip that is not a pure function of its arguments (one that reads the clock,
   * for example) is not cached correctly. A function clip is hashed from its source plus
   * a 16×16 inside-test, a Path2D from that test alone, so a closure's captured shape
   * participates.
   *
   * flow(x, y, T, opts) : velocity {x, y} in px per second.
   *   seed, scale (eddy size in px, default 240), speed (px/s, default 1),
   *   curl (default true). curl is taken from the smooth, unclamped field noise2 clamps
   *   into [-1, 1], so the velocity stays differentiable where noise2 would flatten.
   *   The pattern also translates by `speed` px/s. T is the only time (not lib.T).
   *   curl: false returns the gradient of that field instead.
   *
   * advect(p0, T, opts, steps) : where p0 ({x,y} or [x,y]) lands after time T.
   *   Fixed step count (default 8), one sample of flow at the middle of each step.
   *   A pure function of p0, T, opts and steps: the order of calls does not matter.
   *
   * instances(ctx, pts, fn) : fn(ctx, p, i, rnd) for each point. ctx is saved and
   *   restored. rnd is rng(hash of the index), so instance i keeps its seed when p moves.
   */
  const scatterCache = new Map();
  const SCATTER_CAP = 48;
  const BRIDSON_K = 90;
  let scatterScratch = null;

  function scatterCtx() {
    if (scatterScratch) return scatterScratch;
    const c = newCanvas(Math.max(2, W()), Math.max(2, H()));
    scatterScratch = c.getContext('2d');
    return scatterScratch;
  }

  function hashAll(parts) {
    let h = 0;
    for (let i = 0; i < parts.length; i += 24) {
      const args = [h];
      const end = i + 24 < parts.length ? i + 24 : parts.length;
      for (let j = i; j < end; j++) args.push(parts[j]);
      h = hash.apply(null, args);
    }
    return h >>> 0;
  }

  function hardInside(clip, x, y, fillRule) {
    const ctx = scatterCtx();
    const rule = fillRule || 'nonzero';
    if (typeof Path2D !== 'undefined' && clip instanceof Path2D) return ctx.isPointInPath(clip, x, y, rule);
    ctx.beginPath();
    clip(ctx);
    return ctx.isPointInPath(x, y, rule);
  }

  function mask16(clip, b, fillRule) {
    const ctx = scatterCtx();
    const rule = fillRule || 'nonzero';
    const path = typeof Path2D !== 'undefined' && clip instanceof Path2D;
    if (!path) {
      ctx.beginPath();
      clip(ctx);
    }
    const bits = [];
    for (let j = 0; j < 16; j++) {
      for (let i = 0; i < 16; i++) {
        const x = b.x + ((i + 0.5) / 16) * b.w;
        const y = b.y + ((j + 0.5) / 16) * b.h;
        const hit = path ? ctx.isPointInPath(clip, x, y, rule) : ctx.isPointInPath(x, y, rule);
        bits.push(hit ? 1 : 0);
      }
    }
    return bits;
  }

  function walkClip(clip, parts) {
    if (clip == null) {
      parts.push(0);
      return;
    }
    if (typeof clip === 'number' || typeof clip === 'string') {
      parts.push(clip);
      return;
    }
    if (Array.isArray(clip)) {
      parts.push(clip.length);
      for (let i = 0; i < clip.length; i++) walkClip(clip[i], parts);
      return;
    }
    if (typeof clip.x === 'number' && typeof clip.y === 'number') {
      parts.push(clip.x, clip.y);
      return;
    }
    parts.push(String(clip));
  }

  function clipHash(clip, b, fillRule) {
    const parts = ['clip', b.x, b.y, b.w, b.h, fillRule || ''];
    if (typeof clip === 'function') {
      parts.push('fn', String(clip));
      const bits = mask16(clip, b, fillRule);
      for (let i = 0; i < bits.length; i++) parts.push(bits[i]);
    } else if (typeof Path2D !== 'undefined' && clip instanceof Path2D) {
      parts.push('path');
      const bits = mask16(clip, b, fillRule);
      for (let i = 0; i < bits.length; i++) parts.push(bits[i]);
    } else {
      parts.push('poly');
      walkClip(clip, parts);
    }
    return hashAll(parts);
  }

  function densityHash(density, b) {
    if (typeof density !== 'function') return hash('dens', 0);
    const s = ['dens', 1];
    for (let j = 0; j < 8; j++) {
      for (let i = 0; i < 8; i++) {
        const x = b.x + ((i + 0.5) / 8) * b.w;
        const y = b.y + ((j + 0.5) / 8) * b.h;
        const d = density(x, y);
        s.push(typeof d === 'number' ? d : String(d));
      }
    }
    return hash.apply(null, s);
  }

  function scatter(clip, o) {
    o = o || {};
    const r = o.r;
    const seed = o.seed === undefined ? 1 : o.seed;
    const max = o.max == null ? 1000000 : Math.max(0, Math.floor(Number(o.max)));
    const shape = shapeOf(clip, { bounds: o.bounds, fillRule: o.fillRule });
    const b = shape.bounds;
    const key = hash('scatter', clipHash(clip, b, o.fillRule), r, seed, max, densityHash(o.density, b));
    if (scatterCache.has(key)) {
      const hit = scatterCache.get(key);
      scatterCache.delete(key);
      scatterCache.set(key, hit);
      return hit;
    }
    const out = [];
    const remember = () => {
      Object.freeze(out);
      if (scatterCache.has(key)) scatterCache.delete(key);
      scatterCache.set(key, out);
      while (scatterCache.size > SCATTER_CAP) scatterCache.delete(scatterCache.keys().next().value);
      return out;
    };
    if (!(r > 0) || !(b.w > 0) || !(b.h > 0) || !(max > 0)) return remember();

    const density = typeof o.density === 'function' ? o.density : null;
    const rand = rng(seed);
    const hard = typeof clip === 'function' || (typeof Path2D !== 'undefined' && clip instanceof Path2D);
    function localR(x, y) {
      if (!density) return r;
      let d = density(x, y);
      if (!(d > 0)) return Infinity;
      if (d > 1) d = 1;
      if (d < 0.04) return Infinity;
      return r / Math.sqrt(d);
    }
    function inside(x, y) {
      // Half-open bounds so a point on the far edge cannot fall outside the grid.
      if (x < b.x || y < b.y || x >= b.x + b.w || y >= b.y + b.h) return false;
      if (shape.polys) return polysContain(shape.polys, x, y);
      if (hard) return hardInside(clip, x, y, o.fillRule);
      return true;
    }

    const cell = r / Math.SQRT2;
    const cols = Math.max(1, Math.ceil(b.w / cell));
    const rows = Math.max(1, Math.ceil(b.h / cell));
    const grid = new Int32Array(cols * rows);
    grid.fill(-1);
    const xs = [];
    const ys = [];
    const lrs = [];
    let maxLr = r;

    function cellOf(x, y) {
      const c = Math.floor((x - b.x) / cell);
      const rr = Math.floor((y - b.y) / cell);
      if (c < 0 || rr < 0 || c >= cols || rr >= rows) return -1;
      return rr * cols + c;
    }
    function fits(x, y, lr) {
      if (!(lr < Infinity) || !inside(x, y)) return false;
      const here = cellOf(x, y);
      if (here < 0 || grid[here] >= 0) return false;
      const reach = lr > maxLr ? lr : maxLr;
      const rad = Math.floor(reach / cell) + 1;
      const c0 = Math.floor((x - b.x) / cell);
      const r0 = Math.floor((y - b.y) / cell);
      for (let j = r0 - rad; j <= r0 + rad; j++) {
        if (j < 0 || j >= rows) continue;
        const row = j * cols;
        for (let i = c0 - rad; i <= c0 + rad; i++) {
          if (i < 0 || i >= cols) continue;
          const idx = grid[row + i];
          if (idx < 0) continue;
          const dx = xs[idx] - x;
          const dy = ys[idx] - y;
          const need = lr > lrs[idx] ? lr : lrs[idx];
          if (dx * dx + dy * dy < need * need) return false;
        }
      }
      return true;
    }
    function place(x, y, lr) {
      const idx = xs.length;
      xs.push(x);
      ys.push(y);
      lrs.push(lr);
      if (lr > maxLr) maxLr = lr;
      const g = cellOf(x, y);
      if (g >= 0) grid[g] = idx;
      out.push(Object.freeze({ x: x, y: y }));
    }

    for (let n = 0; n < 64 && xs.length < max; n++) {
      const x = b.x + rand() * b.w;
      const y = b.y + rand() * b.h;
      const lr = localR(x, y);
      if (lr < Infinity && inside(x, y)) {
        place(x, y, lr);
        break;
      }
    }
    if (!xs.length) return remember();

    const active = [0];
    // Each point is retired after one barren batch, so this is at most a few times `max`.
    const spinCap = max * 8 + 64;
    let spins = 0;
    while (active.length && xs.length < max && spins < spinCap) {
      spins++;
      const ai = Math.floor(rand() * active.length);
      const pi = active[ai];
      const px = xs[pi];
      const py = ys[pi];
      const plr = lrs[pi];
      let grew = false;
      for (let k = 0; k < BRIDSON_K && xs.length < max; k++) {
        const ang = rand() * TAU;
        const rad = plr * (1 + rand());
        const x = px + Math.cos(ang) * rad;
        const y = py + Math.sin(ang) * rad;
        const lr = localR(x, y);
        if (!(lr < Infinity) || !fits(x, y, lr)) continue;
        place(x, y, lr);
        active.push(xs.length - 1);
        grew = true;
      }
      if (!grew) {
        active[ai] = active[active.length - 1];
        active.pop();
      }
    }
    // Bridson deactivates a point after K misses and leaves holes. A fixed volley of
    // uniform darts from the same rng fills those holes without breaking the radius.
    const darts = Math.min(12000, cols * rows * 4);
    for (let n = 0; n < darts && xs.length < max; n++) {
      const x = b.x + rand() * b.w;
      const y = b.y + rand() * b.h;
      const lr = localR(x, y);
      if (!(lr < Infinity) || !fits(x, y, lr)) continue;
      place(x, y, lr);
    }
    return remember();
  }

  function noiseGrad2(x, y, seed) {
    const s = seed === undefined ? 0 : seedInt(seed);
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const u = fade5(fx);
    const v = fade5(fy);
    const du = 30 * fx * fx * (fx - 1) * (fx - 1);
    const dv = 30 * fy * fy * (fy - 1) * (fy - 1);
    function gxy(gx, gy) {
      const k = (h3(gx, gy, s) * 8) | 0;
      return [GX[k], GY[k]];
    }
    const g00 = gxy(ix, iy);
    const g10 = gxy(ix + 1, iy);
    const g01 = gxy(ix, iy + 1);
    const g11 = gxy(ix + 1, iy + 1);
    const n00 = g00[0] * fx + g00[1] * fy;
    const n10 = g10[0] * (fx - 1) + g10[1] * fy;
    const n01 = g01[0] * fx + g01[1] * (fy - 1);
    const n11 = g11[0] * (fx - 1) + g11[1] * (fy - 1);
    const nx0 = n00 + u * (n10 - n00);
    const nx1 = n01 + u * (n11 - n01);
    const dnx0x = g00[0] + du * (n10 - n00) + u * (g10[0] - g00[0]);
    const dnx1x = g01[0] + du * (n11 - n01) + u * (g11[0] - g01[0]);
    const dnx0y = g00[1] + u * (g10[1] - g00[1]);
    const dnx1y = g01[1] + u * (g11[1] - g01[1]);
    const n = nx0 + v * (nx1 - nx0);
    const dndx = dnx0x + v * (dnx1x - dnx0x);
    const dndy = dnx0y + dv * (nx1 - nx0) + v * (dnx1y - dnx0y);
    return { dx: dndx * 1.1, dy: dndy * 1.1 };
  }

  function flow(x, y, T, o) {
    o = o || {};
    const scale = o.scale > 0 ? o.scale : 240;
    const speed = o.speed != null ? o.speed : 1;
    const t = typeof T === 'number' ? T : 0;
    const inv = 1 / scale;
    const g = noiseGrad2(x * inv - t * speed * inv, y * inv, o.seed === undefined ? 0 : o.seed);
    if (o.curl === false) return { x: g.dx * speed, y: g.dy * speed };
    return { x: g.dy * speed, y: -g.dx * speed };
  }

  function advect(p0, T, opts, steps) {
    const x0 = Array.isArray(p0) ? p0[0] : p0.x;
    const y0 = Array.isArray(p0) ? p0[1] : p0.y;
    const t1 = typeof T === 'number' ? T : 0;
    const n = steps == null ? 8 : Math.round(steps);
    if (!(t1 !== 0) || !(n > 0)) return { x: x0, y: y0 };
    const dt = t1 / n;
    let x = x0;
    let y = y0;
    for (let i = 0; i < n; i++) {
      const v = flow(x, y, (i + 0.5) * dt, opts);
      x += v.x * dt;
      y += v.y * dt;
    }
    return { x: x, y: y };
  }

  function instances(ctx, pts, draw) {
    if (!pts || !pts.length || typeof draw !== 'function') return;
    for (let i = 0; i < pts.length; i++) {
      const rnd = rng(hash(0x51a7, i));
      ctx.save();
      try {
        draw(ctx, pts[i], i, rnd);
      } finally {
        ctx.restore();
      }
    }
  }

  lib.scatter = scatter;
  lib.flow = flow;
  lib.advect = advect;
  lib.instances = instances;

  // ===========================================================================
  // Branching: space colonization (Runions 2007)
  // ===========================================================================

  /**
   * branch(opts) : a tree grown by space colonization inside a clip, cached by its parameters (never by t).
   *   seed        1
   *   root        [x, y], or a polyline whose first point is the root and each later point is already
   *               grown as the child of the one before it (a trunk)
   *   clip        a polygon [[x, y], ...] or a list of polygons (even-odd), same point shapes as hatch.
   *               Nodes stay inside the clip. Omit it and the tree fills the frame.
   *   attractors  n or [[x, y], ...]   n points are seeded inside the clip; points outside it are dropped
   *   step        16      px between a node and the child grown from it
   *   killDist    step*1.55   an attractor this close to a node is used up
   *   influence   step*4.5    an attractor pulls only the nearest node within this radius
   *   maxNodes    400     including the root
   * Returns { nodes, paths(minLen) }. Each node is { x, y, parent, depth, thickness }: parent is null on the
   * root and a node index otherwise, depth is 0 at the root, and thickness follows da Vinci (thickness^2.5
   * of a node is the sum of its children's, terminals are 1), so a parent is at least as thick as any child.
   * paths(minLen) returns the polylines between junctions, root first, dropping any shorter than minLen pixels.
   *
   * drawBranch(ctx, tree, opts) inks the tree through inkPath, one segment at a time, in growth order.
   *   width   1.8    pen width at thickness 1; a thicker node is wider by its thickness
   *   taper   0      px of tip taper on the last segment of each path (a number, or [in, out]); 0 leaves the
   *                  da Vinci width alone
   *   reveal  1      0 draws nothing, 1 draws every path; in between, segments appear in the order grown
   *   color   pal.ink
   *   alpha   1
   *   minLen  0      passed to paths
   */
  const branchCache = new Map();
  const BRANCH_CACHE_MAX = 32;

  function branchCached(key, make) {
    const hit = branchCache.get(key);
    if (hit) {
      branchCache.delete(key);
      branchCache.set(key, hit);
      return hit;
    }
    const tree = make();
    branchCache.set(key, tree);
    while (branchCache.size > BRANCH_CACHE_MAX) branchCache.delete(branchCache.keys().next().value);
    return tree;
  }

  function asPoint(p) {
    if (Array.isArray(p) && typeof p[0] === 'number') return [+p[0], +p[1]];
    if (p && typeof p.x === 'number' && typeof p.y === 'number') return [+p.x, +p.y];
    return null;
  }
  function asPointList(list) {
    const out = [];
    if (!Array.isArray(list)) return out;
    for (let i = 0; i < list.length; i++) {
      const p = asPoint(list[i]);
      if (p) out.push(p);
    }
    return out;
  }
  function asRoot(root) {
    const one = asPoint(root);
    if (one) return [one];
    return asPointList(root);
  }
  function framePoly() {
    const w = W(), h = H();
    return [[[0, 0], [w, 0], [w, h], [0, h]]];
  }
  function halton(index, base) {
    let f = 1, r = 0, i = index + 1;
    while (i > 0) {
      f /= base;
      r += f * (i % base);
      i = Math.floor(i / base);
    }
    return r;
  }
  function sampleIn(polys, n, seed) {
    if (!(n > 0)) return [];
    const b = polysBounds(polys);
    if (!(b.w > 0) || !(b.h > 0)) return [];
    const s = seedInt(seed);
    const sx = h3(s, 2, 3);
    const sy = h3(s, 5, 7);
    const out = [];
    const limit = Math.max(n * 40, 80);
    for (let i = 0; i < limit && out.length < n; i++) {
      const x = b.x + ((halton(i, 2) + sx) % 1) * b.w;
      const y = b.y + ((halton(i, 3) + sy) % 1) * b.h;
      if (polysContain(polys, x, y)) out.push([x, y]);
    }
    return out;
  }
  function segmentIn(polys, x0, y0, x1, y1) {
    for (let s = 1; s <= 4; s++) {
      const t = s / 4;
      if (!polysContain(polys, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
    }
    return true;
  }
  function clipStep(polys, x, y, dx, dy, step) {
    const at = (d) => [x + dx * d, y + dy * d];
    const ok = (d) => {
      const p = at(d);
      return segmentIn(polys, x, y, p[0], p[1]);
    };
    if (ok(step)) return at(step);
    if (!ok(step * 0.34)) return null;
    let lo = step * 0.34, hi = step;
    for (let k = 0; k < 7; k++) {
      const mid = (lo + hi) * 0.5;
      if (ok(mid)) lo = mid;
      else hi = mid;
    }
    return lo >= step * 0.5 ? at(lo) : null;
  }
  function gridOf(nodes, cell) {
    const grid = new Map();
    const inv = 1 / cell;
    for (let i = 0; i < nodes.length; i++) {
      const key = Math.floor(nodes[i].x * inv) + ',' + Math.floor(nodes[i].y * inv);
      let bucket = grid.get(key);
      if (!bucket) grid.set(key, (bucket = []));
      bucket.push(i);
    }
    return grid;
  }
  function nearestNode(grid, nodes, x, y, cell, rad) {
    const inv = 1 / cell;
    const cx = Math.floor(x * inv);
    const cy = Math.floor(y * inv);
    const r = Math.ceil(rad * inv);
    const rad2 = rad * rad;
    let best = -1;
    let bestD = rad2;
    for (let iy = cy - r; iy <= cy + r; iy++) {
      for (let ix = cx - r; ix <= cx + r; ix++) {
        const bucket = grid.get(ix + ',' + iy);
        if (!bucket) continue;
        for (let k = 0; k < bucket.length; k++) {
          const i = bucket[k];
          const dx = nodes[i].x - x;
          const dy = nodes[i].y - y;
          const d = dx * dx + dy * dy;
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        }
      }
    }
    return best;
  }
  function orient(ax, ay, bx, by, cx, cy) {
    return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  }
  function properIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
    const o1 = orient(ax, ay, bx, by, cx, cy);
    const o2 = orient(ax, ay, bx, by, dx, dy);
    const o3 = orient(cx, cy, dx, dy, ax, ay);
    const o4 = orient(cx, cy, dx, dy, bx, by);
    return o1 * o2 < 0 && o3 * o4 < 0;
  }
  function ptSegDist(px, py, ax, ay, bx, by) {
    const abx = bx - ax, aby = by - ay;
    const ab2 = abx * abx + aby * aby;
    let t = ab2 > 1e-12 ? ((px - ax) * abx + (py - ay) * aby) / ab2 : 0;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
    return Math.hypot(ax + abx * t - px, ay + aby * t - py);
  }
  function segDist(ax, ay, bx, by, cx, cy, dx, dy) {
    if (properIntersect(ax, ay, bx, by, cx, cy, dx, dy)) return 0;
    return Math.min(
      ptSegDist(ax, ay, cx, cy, dx, dy),
      ptSegDist(bx, by, cx, cy, dx, dy),
      ptSegDist(cx, cy, ax, ay, bx, by),
      ptSegDist(dx, dy, ax, ay, bx, by)
    );
  }
  function segmentBlocked(nodes, segs, parent, nx, ny, clear) {
    const ax = nodes[parent].x, ay = nodes[parent].y;
    for (let s = 0; s < segs.length; s++) {
      const ia = segs[s][0], ib = segs[s][1];
      const bx = nodes[ia].x, by = nodes[ia].y, cx = nodes[ib].x, cy = nodes[ib].y;
      if (ia === parent || ib === parent) {
        if (ptSegDist(nx, ny, bx, by, cx, cy) < clear) return true;
        continue;
      }
      if (segDist(ax, ay, nx, ny, bx, by, cx, cy) < clear) return true;
    }
    return false;
  }
  function pruneAttractors(attr, nodes, kill) {
    if (!attr.length || !nodes.length) return;
    const cell = Math.max(kill, 1e-3);
    const grid = gridOf(nodes, cell);
    const kill2 = kill * kill;
    let w = 0;
    for (let a = 0; a < attr.length; a++) {
      const x = attr[a][0], y = attr[a][1];
      const ni = nearestNode(grid, nodes, x, y, cell, kill);
      if (ni >= 0) {
        const dx = nodes[ni].x - x, dy = nodes[ni].y - y;
        if (dx * dx + dy * dy <= kill2) continue;
      }
      attr[w++] = attr[a];
    }
    attr.length = w;
  }
  function applyThickness(nodes) {
    const n = nodes.length;
    if (!n) return;
    const kids = new Array(n);
    for (let i = 0; i < n; i++) kids[i] = [];
    const roots = [];
    for (let i = 0; i < n; i++) {
      const p = nodes[i].parent;
      if (p == null) roots.push(i);
      else kids[p].push(i);
    }
    const order = [];
    const seen = new Uint8Array(n);
    const st = [];
    for (let r = 0; r < roots.length; r++) st.push(roots[r], 0);
    while (st.length) {
      const phase = st.pop();
      const i = st.pop();
      if (phase === 0) {
        if (seen[i]) continue;
        seen[i] = 1;
        st.push(i, 1);
        const ch = kids[i];
        for (let c = ch.length - 1; c >= 0; c--) st.push(ch[c], 0);
      } else order.push(i);
    }
    for (let k = 0; k < order.length; k++) {
      const i = order[k];
      const ch = kids[i];
      if (!ch.length) nodes[i].thickness = 1;
      else if (ch.length === 1) nodes[i].thickness = nodes[ch[0]].thickness;
      else {
        let sum = 0, m = 0;
        for (let c = 0; c < ch.length; c++) {
          const t = nodes[ch[c]].thickness;
          sum += Math.pow(t, 2.5);
          if (t > m) m = t;
        }
        const combined = Math.pow(sum, 0.4);
        nodes[i].thickness = combined > m ? combined : m;
      }
    }
  }
  function colonize(polys, rootPts, attrIn, step, kill, influence, maxNodes, seed) {
    const nodes = [];
    const segs = [];
    let parent = null;
    let depth = 0;
    for (let r = 0; r < rootPts.length && nodes.length < maxNodes; r++) {
      const x = rootPts[r][0], y = rootPts[r][1];
      if (!polysContain(polys, x, y)) continue;
      if (parent != null && !segmentIn(polys, nodes[parent].x, nodes[parent].y, x, y)) continue;
      const i = nodes.length;
      nodes.push({ x, y, parent, depth, thickness: 1 });
      if (parent != null) segs.push([parent, i]);
      parent = i;
      depth += 1;
    }
    if (!nodes.length) {
      const one = sampleIn(polys, 1, seed);
      if (one.length) nodes.push({ x: one[0][0], y: one[0][1], parent: null, depth: 0, thickness: 1 });
    }
    const attr = [];
    for (let i = 0; i < attrIn.length; i++) {
      const p = attrIn[i];
      if (polysContain(polys, p[0], p[1])) attr.push(p);
    }
    // wide enough that a stroke cannot lie along another and read as a crossing; joints still meet at the parent
    const clear = Math.max(3.5, Math.min(7.5, step * 0.45));
    const s = seedInt(seed);
    pruneAttractors(attr, nodes, kill);
    let guard = 0;
    while (nodes.length < maxNodes && attr.length && guard++ < maxNodes) {
      const n0 = nodes.length;
      const cell = Math.max(influence, 1e-3);
      const grid = gridOf(nodes, cell);
      const accX = new Float64Array(n0);
      const accY = new Float64Array(n0);
      const accN = new Uint32Array(n0);
      for (let a = 0; a < attr.length; a++) {
        const ni = nearestNode(grid, nodes, attr[a][0], attr[a][1], cell, influence);
        if (ni < 0) continue;
        let dx = attr[a][0] - nodes[ni].x;
        let dy = attr[a][1] - nodes[ni].y;
        const d = Math.hypot(dx, dy);
        if (d < 1e-6) continue;
        accX[ni] += dx / d;
        accY[ni] += dy / d;
        accN[ni]++;
      }
      let added = 0;
      for (let i = 0; i < n0 && nodes.length < maxNodes; i++) {
        if (!accN[i]) continue;
        let sx = accX[i], sy = accY[i];
        const ip = nodes[i].parent;
        if (ip != null) {
          let vx = nodes[i].x - nodes[ip].x;
          let vy = nodes[i].y - nodes[ip].y;
          const vd = Math.hypot(vx, vy);
          if (vd > 1e-6) {
            sx += (vx / vd) * 0.45;
            sy += (vy / vd) * 0.45;
          }
        }
        const L = Math.hypot(sx, sy);
        if (L < 1e-6) continue;
        const dx = sx / L, dy = sy / L;
        const pt = clipStep(polys, nodes[i].x, nodes[i].y, dx, dy, step);
        if (!pt) continue;
        let x = pt[0], y = pt[1];
        const j = (h3(s, nodes.length + 1, 9) - 0.5) * 2.2;
        const jx = x - dy * j, jy = y + dx * j;
        if (segmentIn(polys, nodes[i].x, nodes[i].y, jx, jy) && !segmentBlocked(nodes, segs, i, jx, jy, clear)) {
          x = jx;
          y = jy;
        } else if (segmentBlocked(nodes, segs, i, x, y, clear)) continue;
        const ni = nodes.length;
        nodes.push({ x, y, parent: i, depth: nodes[i].depth + 1, thickness: 1 });
        segs.push([i, ni]);
        added++;
      }
      pruneAttractors(attr, nodes, kill);
      if (!added) break;
    }
    applyThickness(nodes);
    return nodes;
  }
  function branchRuns(nodes, minLen) {
    const n = nodes.length;
    const kids = new Array(n);
    for (let i = 0; i < n; i++) kids[i] = [];
    for (let i = 0; i < n; i++) {
      const p = nodes[i].parent;
      if (p != null) kids[p].push(i);
    }
    const min = minLen > 0 ? minLen : 0;
    const runs = [];
    for (let i = 0; i < n; i++) {
      if (nodes[i].parent != null && kids[i].length === 1) continue;
      const ch = kids[i];
      for (let c = 0; c < ch.length; c++) {
        const idx = [i];
        let cur = ch[c];
        while (true) {
          idx.push(cur);
          if (kids[cur].length !== 1) break;
          cur = kids[cur][0];
        }
        const pts = new Array(idx.length);
        let len = 0;
        for (let k = 0; k < idx.length; k++) {
          const nd = nodes[idx[k]];
          pts[k] = [nd.x, nd.y];
          if (k) len += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
        }
        if (len + 1e-9 >= min) runs.push({ idx, pts, len });
      }
    }
    return runs;
  }
  function makeTree(nodes) {
    const frozen = Object.freeze(nodes.map((nd) => Object.freeze({
      x: nd.x,
      y: nd.y,
      parent: nd.parent,
      depth: nd.depth,
      thickness: nd.thickness,
    })));
    return Object.freeze({
      nodes: frozen,
      paths(minLen) {
        const runs = branchRuns(frozen, minLen);
        const out = new Array(runs.length);
        for (let i = 0; i < runs.length; i++) out[i] = runs[i].pts;
        return out;
      },
    });
  }
  function branch(o) {
    o = o || {};
    const seed = o.seed === undefined ? 1 : o.seed;
    const step = o.step > 0 ? +o.step : 16;
    const kill = o.killDist > 0 ? +o.killDist : step * 1.55;
    const influence = o.influence > 0 ? +o.influence : Math.max(kill * 2, step * 4.5);
    const maxNodes = Math.max(1, Math.floor(o.maxNodes > 0 ? +o.maxNodes : 400));
    const polys = toPolys(o.clip) || framePoly();
    let rootPts = asRoot(o.root);
    if (!rootPts.length) {
      const b = polysBounds(polys);
      rootPts = [[b.x + b.w * 0.5, b.y + b.h * 0.5]];
    }
    let attrSpec;
    if (typeof o.attractors === 'number') attrSpec = Math.max(0, Math.floor(o.attractors));
    else if (Array.isArray(o.attractors)) attrSpec = asPointList(o.attractors);
    else attrSpec = 160;
    const key = JSON.stringify([seed, rootPts, polys, attrSpec, step, kill, influence, maxNodes]);
    return branchCached(key, () => {
      const attrPts = typeof attrSpec === 'number' ? sampleIn(polys, attrSpec, seed) : attrSpec;
      return makeTree(colonize(polys, rootPts, attrPts, step, kill, influence, maxNodes, seed));
    });
  }

  function tipTaperOf(taper) {
    if (taper == null || taper === false || taper === 0) return null;
    if (Array.isArray(taper)) return taper;
    return [0, taper];
  }
  function drawBranch(ctx, tree, o) {
    o = o || {};
    if (!tree || !tree.nodes || tree.nodes.length < 2) return;
    let reveal = o.reveal == null ? 1 : +o.reveal;
    if (!(reveal > 0)) return;
    if (reveal > 1) reveal = 1;
    const nodes = tree.nodes;
    const n = nodes.length;
    const grown = reveal >= 1 ? n - 1 : reveal * (n - 1);
    const next = Math.floor(grown) + 1;
    const frac = grown - Math.floor(grown);
    const runs = branchRuns(nodes, o.minLen);
    const unit = o.width != null ? o.width : 1.8;
    const color = o.color || pal.ink;
    const alpha = o.alpha != null ? o.alpha : 1;
    const seed0 = o.seed == null ? 1 : o.seed;
    const wobble = o.wobble != null ? o.wobble : 0;
    const tipTaper = tipTaperOf(o.taper);
    for (let r = 0; r < runs.length; r++) {
      const idx = runs[r].idx;
      for (let k = 1; k < idx.length; k++) {
        const i = idx[k];
        const p = nodes[idx[k - 1]];
        const c = nodes[i];
        let x1 = c.x, y1 = c.y, t1 = c.thickness;
        if (i <= grown + 1e-9) {
          /* full segment */
        } else if (frac > 1e-8 && i === next) {
          x1 = p.x + (c.x - p.x) * frac;
          y1 = p.y + (c.y - p.y) * frac;
          t1 = p.thickness + (c.thickness - p.thickness) * frac;
        } else break;
        const maxT = p.thickness > t1 ? p.thickness : t1;
        const t0 = p.thickness;
        const tip = k === idx.length - 1;
        inkPath(ctx, [[p.x, p.y], [x1, y1]], {
          smooth: false,
          width: unit * maxT,
          color,
          alpha,
          seed: (hash(seed0, idx[0], i) & 0x7fffffff) || 1,
          step: 4,
          swell: 0,
          taper: tip && tipTaper ? tipTaper : 0,
          wobble,
          tremble: o.tremble != null ? o.tremble : 0,
          rough: o.rough != null ? o.rough : 0,
          widthJitter: o.widthJitter != null ? o.widthJitter : 0,
          boil: o.boil != null ? o.boil : false,
          pressure(u) { return (t0 + (t1 - t0) * u) / maxT; },
        });
        if (i > grown + 1e-9) break;
      }
    }
  }

  lib.branch = branch;
  lib.drawBranch = drawBranch;

  // ===========================================================================
  // Read-only
  // ===========================================================================

  // A scene that changed lib, lib.pal or lib.ease would leak into every shot drawn after it, in
  // whatever order frames happen to be drawn (and differently in each render worker). So all of
  // it is frozen:
  //   - lib itself is a plain frozen object: a write throws in strict code and is ignored in
  //     non-strict code, so nothing leaks, and reading lib.fn in a hot loop stays at full speed.
  //   - pal and ease are also wrapped so a write throws even from non-strict scene code (core
  //     records it as a draw error, tools/check.cjs reports it). The wrapper makes each read about
  //     20 ns slower, so hoist colours out of per-point loops (const ink = P.ink). Code inside lib
  //     uses the raw objects and pays nothing.
  function readOnly(target, name) {
    const fail = (verb, prop) => {
      throw new TypeError(
        `${name} is read-only: a scene cannot ${verb} '${String(prop)}' (it would leak into other shots). ` +
          `Make a local copy instead, for example const P = Object.assign({}, FILM.lib.pal, { ink: '#000' }).`
      );
    };
    return new Proxy(Object.freeze(target), {
      set: (t, prop) => fail('set', prop),
      defineProperty: (t, prop) => fail('define', prop),
      deleteProperty: (t, prop) => fail('delete', prop),
      setPrototypeOf: () => fail('change the prototype of', name),
    });
  }
  for (const key of Object.keys(ease)) Object.freeze(ease[key]);
  lib.pal = readOnly(pal, 'FILM.lib.pal');
  lib.ease = readOnly(ease, 'FILM.lib.ease');
  for (const key of Object.keys(lib)) {
    const v = Object.getOwnPropertyDescriptor(lib, key).value;
    if (typeof v === 'function') Object.freeze(v);
  }
  Object.defineProperty(FILM, 'lib', { value: Object.freeze(lib), writable: false, enumerable: true, configurable: false });
})();
