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
 * Angles are radians. Sizes are logical pixels on the frame (FILM.W × FILM.H, 1080×1920
 * when the timeline sets neither width nor height).
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
    // BEGIN 2.2 — the theme's rows (themes/<id>/palette.js), then the subject palette exactly as
    // docs/art-bible.md section 2.2 publishes it, e.g.
    //     hero: '#D9772B',
    //     heroDeep: '#B55A1C',
    // Scene code reads them as lib.pal.<name>.
    // END 2.2
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
   *   kind 'profile'  : a silhouette symmetric about an axis. Default axis 'y' is the vertical line x = cx,
   *                     half-widths hs at heights ys (ys increasing). axis 'x' is the horizontal line y = cy,
   *                     half-heights hs at stations xs (xs increasing): a shape lying on its side.
   *                     hw(u) is the half-extent at station u. Default interpolation is a monotone cubic
   *                     (Fritsch-Carlson), so every table value is hit exactly and the curve never overshoots.
   *                     interp: 'linear' joins the stations with straight segments.
   *                     x(u, side) / y(u, side) : the edge point (side -1 and +1 are the two sides);
   *                     side(sign, step) : one edge along the axis; outline(step) : the closed silhouette;
   *                     widest : { y, hw } or { x, hw }.
   *   kind 'outline'  : any closed silhouette. pts is one loop already sampled densely (<= 12 px apart) in the
   *                     order it is drawn. parts is several loops; outline() is the outer contour of their
   *                     union, so a bird of wings, body, head and tail does not need a hand-traced silhouette.
   *                     Draw a single loop as it stands (inkPath(ctx, g.outline(), { closed: true, smooth: false })),
   *                     because smoothing control points rounds off every kink and tip the storyboard drew.
   *   at(zoom, about) : the same shape with every point moved to about + zoom * (p - about).
   *                     Calling at() again replaces that zoom; it does not stack. On a profile, hw, x, y
   *                     and side use the same map, and the station argument stays in table space.
   *                     Check 7 uses it for a match cut that lands in the middle of a camera move.
   *   kind 'points'   : named anchors. pt(name) returns [x, y] and throws on a misspelt name.
   *   kind 'polyline' : an ordered point list, pts.
   * Every entry also carries its table fields (cx, ys, hs, pts, shots, cuts, ...) read-only.
   */
  const geoCache = new Map();
  const unionCache = new Map();

  function scanFill(mask, w, h, ox, oy, poly) {
    const n = poly.length;
    if (n < 3) return;
    const buckets = Array.from({ length: h }, () => []);
    for (let i = 0; i < n; i++) {
      let x0 = poly[i][0] - ox;
      let y0 = poly[i][1] - oy;
      const q = poly[(i + 1) % n];
      let x1 = q[0] - ox;
      let y1 = q[1] - oy;
      if (y0 === y1) continue;
      if (y0 > y1) {
        const sx = x0; x0 = x1; x1 = sx;
        const sy = y0; y0 = y1; y1 = sy;
      }
      const yA = Math.ceil(y0 - 1e-9);
      const yB = Math.floor(y1 - 1e-9);
      for (let y = yA; y <= yB; y++) {
        if (y < 0 || y >= h) continue;
        const t = (y + 0.5 - y0) / (y1 - y0);
        if (t < 0 || t >= 1) continue;
        buckets[y].push(x0 + (x1 - x0) * t);
      }
    }
    for (let y = 0; y < h; y++) {
      const xs = buckets[y];
      if (xs.length < 2) continue;
      xs.sort((a, b) => a - b);
      const row = y * w;
      for (let i = 0; i + 1 < xs.length; i += 2) {
        let a = Math.ceil(xs[i] - 1e-9);
        let b = Math.floor(xs[i + 1] - 1e-9);
        if (a < 0) a = 0;
        if (b >= w) b = w - 1;
        for (let x = a; x <= b; x++) mask[row + x] = 1;
      }
    }
  }

  // One circuit of the outer rim. 0 east, 1 south, 2 west, 3 north, fill kept on the right.
  // A one-pixel neck used to close the walk on a wing tip and leave the body behind.
  // Opens heading east on the top-most rim pixel. The circuit is closed when the walk is back
  // on that pixel; a cap that expires first throws instead of returning a short loop.
  function traceOuter(mask, w, h) {
    const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === 1;
    let sx = -1, sy = -1;
    for (let y = 0; y < h && sx < 0; y++) {
      for (let x = 0; x < w; x++) if (on(x, y) && !on(x, y - 1)) { sx = x; sy = y; break; }
    }
    if (sx < 0) return [];
    const step = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    let x = sx, y = sy, dir = 0;
    const loop = [[x, y]];
    // (w + h) * 8 died mid-comb, short of the far tooth. One circuit is well under 4 visits per pixel.
    const limit = w * h * 4;
    let closed = false;
    for (let n = 0; n < limit; n++) {
      let moved = false;
      for (const turn of [1, 0, 3, 2]) {
        const nd = (dir + turn) % 4;
        const nx = x + step[nd][0], ny = y + step[nd][1];
        if (!on(nx, ny)) continue;
        x = nx;
        y = ny;
        dir = nd;
        loop.push([x, y]);
        moved = true;
        break;
      }
      if (!moved) break;
      if (x === sx && y === sy && loop.length > 4) { closed = true; break; }
    }
    if (!closed) throw new Error('union outline walk stopped before it was back at the start heading east');
    return loop;
  }

  // 4-connected islands. The rim walk steps the same way, so a diagonal crack is still two components
  // until the 1px dilation joins it.
  function countComponents(mask, w, h) {
    const seen = new Uint8Array(w * h);
    let count = 0;
    const stack = [];
    for (let i = 0; i < mask.length; i++) {
      if (!mask[i] || seen[i]) continue;
      count++;
      stack.push(i);
      seen[i] = 1;
      while (stack.length) {
        const p = stack.pop();
        const x = p % w;
        const y = (p / w) | 0;
        if (x > 0 && mask[p - 1] && !seen[p - 1]) { seen[p - 1] = 1; stack.push(p - 1); }
        if (x + 1 < w && mask[p + 1] && !seen[p + 1]) { seen[p + 1] = 1; stack.push(p + 1); }
        if (y > 0 && mask[p - w] && !seen[p - w]) { seen[p - w] = 1; stack.push(p - w); }
        if (y + 1 < h && mask[p + w] && !seen[p + w]) { seen[p + w] = 1; stack.push(p + w); }
      }
    }
    return count;
  }

  function resampleLoop(raw, step) {
    if (raw.length < 3) return raw;
    const out = [[raw[0][0], raw[0][1]]];
    let acc = 0;
    for (let i = 1; i < raw.length; i++) {
      acc += Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]);
      if (acc >= step) {
        out.push([raw[i][0], raw[i][1]]);
        acc = 0;
      }
    }
    const last = raw[raw.length - 1];
    const tail = out[out.length - 1];
    if (tail[0] !== last[0] || tail[1] !== last[1]) out.push([last[0], last[1]]);
    const head = out[0];
    if (Math.hypot(head[0] - out[out.length - 1][0], head[1] - out[out.length - 1][1]) > 1.5) out.push([head[0], head[1]]);
    return out;
  }

  function unionOutline(parts, step) {
    const st = step > 0 ? step : 6;
    let key = hash('union', parts.length, st);
    for (let p = 0; p < parts.length; p++) {
      const poly = parts[p];
      key = hash(key, poly.length);
      for (let i = 0; i < poly.length; i++) key = hash(key, poly[i][0], poly[i][1]);
    }
    const hit = unionCache.get(key);
    if (hit) return hit.map((p) => [p[0], p[1]]);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let p = 0; p < parts.length; p++) {
      const poly = parts[p];
      for (let i = 0; i < poly.length; i++) {
        const x = poly[i][0], y = poly[i][1];
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
    }
    const pad = 2;
    const ox = Math.floor(x0) - pad;
    const oy = Math.floor(y0) - pad;
    const w = Math.ceil(x1) - ox + pad + 1;
    const h = Math.ceil(y1) - oy + pad + 1;
    if (!(w > 2 && h > 2) || w * h > 4000000) {
      throw new Error('union outline is ' + w + 'x' + h + ' px, past the raster cap');
    }
    const rawMask = new Uint8Array(w * h);
    for (let p = 0; p < parts.length; p++) scanFill(rawMask, w, h, ox, oy, parts[p]);
    // One pixel of dilation closes cracks where a serrated tip only touches the wing at a corner.
    // Snap the traced rim back onto this undilated fill so the contour does not grow by a pixel.
    const mask = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!rawMask[y * w + x]) continue;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < w && ny < h) mask[ny * w + nx] = 1;
          }
        }
      }
    }
    const components = countComponents(mask, w, h);
    if (components > 1) throw new Error('union outline has ' + components + ' components after a 1px dilation');
    const traced = traceOuter(mask, w, h).map(([x, y]) => {
      if (x >= 0 && y >= 0 && x < w && y < h && rawMask[y * w + x]) return [x, y];
      let best = null;
      let bd = 10;
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h || !rawMask[ny * w + nx]) continue;
          const d = dx * dx + dy * dy;
          if (d < bd) { bd = d; best = [nx, ny]; }
        }
      }
      return best || [x, y];
    });
    const loop = resampleLoop(traced.map((q) => [ox + q[0] + 0.5, oy + q[1] + 0.5]), st);
    unionCache.set(key, loop);
    return loop.map((p) => [p[0], p[1]]);
  }

  function shapedAt(table, zoom, about) {
    const z = zoom == null || !(+zoom > 0) ? 1 : +zoom;
    const ax = about && isFinite(+about[0]) ? +about[0] : 0;
    const ay = about && isFinite(+about[1]) ? +about[1] : 0;
    const map = (p) => [ax + (p[0] - ax) * z, ay + (p[1] - ay) * z];
    const view = {
      id: table.id,
      kind: table.kind,
      axis: table.axis || 'y',
      outline(step) { return table.outline(step).map(map); },
      // Second call replaces from the table. Closing over the view would stack zooms.
      at(nz, na) { return shapedAt(table, nz, na); },
    };
    if (table.cx != null) view.cx = ax + (table.cx - ax) * z;
    if (table.cy != null) view.cy = ay + (table.cy - ay) * z;
    if (typeof table.hw === 'function' && typeof table.x === 'function' && typeof table.y === 'function' && typeof table.side === 'function') {
      view.hw = (u) => table.hw(u) * z;
      view.x = (u, s = 1) => ax + (table.x(u, s) - ax) * z;
      view.y = (u, s = 1) => ay + (table.y(u, s) - ay) * z;
      view.side = (sign, step) => table.side(sign, step).map(map);
    }
    return view;
  }

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
      const horizontal = g.axis === 'x';
      const stations = horizontal ? g.xs : g.ys;
      const hs = g.hs;
      const n = stations.length;
      const origin = horizontal ? g.cy : g.cx;
      const linear = g.interp === 'linear';
      const slopes = linear ? null : monotoneSlopes(stations, hs);
      const hw = (u) => {
        if (u <= stations[0]) return hs[0];
        if (u >= stations[n - 1]) return hs[n - 1];
        let i = 0;
        while (stations[i + 1] < u) i++;
        if (linear) {
          const span = stations[i + 1] - stations[i];
          return hs[i] + ((hs[i + 1] - hs[i]) * (u - stations[i])) / span;
        }
        const h = stations[i + 1] - stations[i];
        const s = (u - stations[i]) / h, s2 = s * s, s3 = s2 * s;
        return (2 * s3 - 3 * s2 + 1) * hs[i] + (s3 - 2 * s2 + s) * h * slopes[i] + (-2 * s3 + 3 * s2) * hs[i + 1] + (s3 - s2) * h * slopes[i + 1];
      };
      const side = (sign, step = 6) => {
        const pts = [];
        const a = stations[0], b = stations[n - 1];
        const st = step > 0 ? step : 6;
        for (let u = a; u < b; u += st) {
          const perp = sign * hw(u);
          pts.push(horizontal ? [u, origin + perp] : [origin + perp, u]);
        }
        const end = sign * hs[n - 1];
        pts.push(horizontal ? [b, origin + end] : [origin + end, b]);
        return pts;
      };
      let wi = 0;
      for (let i = 1; i < n; i++) if (hs[i] > hs[wi]) wi = i;
      out.axis = horizontal ? 'x' : 'y';
      out.hw = hw;
      out.x = (u, s = 1) => (horizontal ? u : origin + s * hw(u));
      out.y = (u, s = 1) => (horizontal ? origin + s * hw(u) : u);
      out.side = side;
      out.outline = (step = 6) => side(-1, step).concat(side(1, step).reverse());
      out.widest = Object.freeze(horizontal ? { x: stations[wi], hw: hs[wi] } : { y: stations[wi], hw: hs[wi] });
    } else if (g.kind === 'outline') {
      if (Array.isArray(g.parts) && g.parts.length) {
        out.outline = (step = 6) => unionOutline(g.parts, step);
      } else {
        out.outline = () => g.pts.map((p) => [p[0], p[1]]);
      }
    } else if (g.kind === 'points') {
      out.pt = (name) => {
        const p = g.pts[name];
        if (!p) throw new Error(`FILM.GEO.${id} has no point '${name}' (it has: ${Object.keys(g.pts).join(', ')})`);
        return [p[0], p[1]];
      };
    }
    out.at = (zoom, about) => shapedAt(out, zoom, about);
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
    const audit = !!window.__cvAudit;
    if (audit) window.__cvNextKey = String(key);
    let v;
    try {
      v = make();
    } finally {
      if (audit) window.__cvNextKey = null;
    }
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
  // Each fills the frame (FILM.W × FILM.H) unless opts give a rectangle.
  // Plate caches include both width and height, so a second format does not reuse a vertical plate.
  // ===========================================================================

  function renderScale() {
    return FILM.S || 1;
  }

  /**
   * paper(ctx, opts) : cream paper with mottling, grain and fibres. Cached by size, seed and options.
   *   x, y, w, h   0, 0, frame width, frame height
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
   *   x, y, w, h   0, 0, frame width, frame height
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
   *   bounds   frame (FILM.W × FILM.H)
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

  /**
   * glow(ctx, pts, opts) : a light line with a soft halo (a glowing vector, a lit contour).
   * Widening halo strokes, then the core, in 'lighter' blending. No shadowBlur, no filter.
   *   color    pal.lineWhite  core colour
   *   halo     color          halo colour
   *   width    2              core width
   *   radius   12             halo reach beyond the core, px each side
   *   layers   3              halo strokes
   *   strength 0.22           alpha of the innermost halo stroke
   *   closed   false
   *   additive true           'lighter' blending (use false on paper)
   *   alpha    1
   */
  function glow(ctx, pts, o = {}) {
    if (!pts || pts.length < 2) return;
    const color = o.color || pal.lineWhite;
    const width = o.width != null ? o.width : 2;
    const radius = o.radius != null ? o.radius : 12;
    const layers = Math.max(0, o.layers != null ? o.layers | 0 : 3);
    const strength = o.strength != null ? o.strength : 0.22;
    ctx.save();
    const base = ctx.globalAlpha * (o.alpha != null ? o.alpha : 1);
    if (o.additive !== false) ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    lib.tracePath(ctx, pts, !!o.closed);
    ctx.strokeStyle = o.halo || color;
    for (let i = layers; i >= 1; i--) {
      const k = i / layers; // 1 is the widest, faintest stroke
      ctx.globalAlpha = base * strength * (1.25 - k);
      ctx.lineWidth = width + 2 * radius * k;
      ctx.stroke();
    }
    ctx.globalAlpha = base;
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.restore();
  }
  lib.glow = glow;

  /**
   * blinkAt(f, seed, opts) : true while a character's eyes are shut on frame f (a global frame).
   * A blink is exactly `frames` frames with no in-between drawing; the gaps are uneven and one in
   * three is short, so blinks often come in pairs. The schedule repeats every `loop` frames and
   * depends on the seed alone.
   *   frames 2     gapMin 7     gapMax 38     loop 192 (8 s at 24 fps)
   */
  const blinkCache = new Map();
  function blinkAt(f, seed, o = {}) {
    const len = Math.max(1, o.frames || 2);
    const g0 = o.gapMin || 7;
    const g1 = Math.max(g0, o.gapMax || 38);
    const loop = Math.max(len + g1, o.loop || 192);
    const s = seedInt(seed === undefined ? 1 : seed);
    const key = s + ':' + len + ':' + g0 + ':' + g1 + ':' + loop;
    let starts = blinkCache.get(key);
    if (!starts) {
      starts = [];
      let at = Math.floor(h3(s, 5, 1) * g1);
      for (let i = 0; at + len <= loop; i++) {
        starts.push(at);
        const short = h3(s, i, 2) < 1 / 3;
        const lo = short ? g0 : Math.min(g1, g0 + 6);
        const hi = short ? Math.min(g1, g0 + 5) : g1;
        at += len + lo + Math.floor(h3(s, i, 3) * (hi - lo + 1));
      }
      blinkCache.set(key, starts);
    }
    const k = ((Math.round(f) % loop) + loop) % loop;
    for (let i = 0; i < starts.length; i++) if (k >= starts[i] && k < starts[i] + len) return true;
    return false;
  }
  lib.blinkAt = blinkAt;

  /**
   * lineIcon(ctx, parts, x, y, size, opts) : a flat line-icon creature. Constant-width round-cap
   * lines, flat colour, no glow; a part with fill knocks out whatever was drawn before it.
   * Parts sit in a unit box centred on (x, y) (-0.5..0.5 each way, y down), drawn in order:
   *   { circle: [cx, cy, r], fill }
   *   { arc: [cx, cy, r, a0, a1] }            radians, clockwise on screen from +x
   *   { eye: [cx, cy, r], pupil }             pupil 'lens' (vertical, 0.17 of the eye wide) or 'dot';
   *                                           shut, the pupil becomes a bar across the eye
   *   { line: [x0, y0, x1, y1] }
   *   { teeth: [x0, y0, x1, y1, n, depth] }   n points hanging depth below the line
   *   { path: [[x, y], ...], closed, fill }
   *   color  pal.lineWhite
   *   bg     pal.navyDeep   knock-out colour: the plate
   *   width  0.035          line width as a fraction of size
   *   shut   false          eyes closed (lib.blinkAt)
   *   alpha  1
   */
  function lineIcon(ctx, parts, x, y, size, o = {}) {
    const color = o.color || pal.lineWhite;
    const bg = o.bg || pal.navyDeep;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size, size);
    ctx.globalAlpha *= o.alpha != null ? o.alpha : 1;
    ctx.lineWidth = o.width != null ? o.width : 0.035;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    const knock = () => {
      ctx.fillStyle = bg;
      ctx.fill();
    };
    for (const p of parts || []) {
      ctx.beginPath();
      if (p.circle) {
        const [cx, cy, r] = p.circle;
        ctx.arc(cx, cy, r, 0, TAU);
        if (p.fill) knock();
        ctx.stroke();
      } else if (p.arc) {
        const [cx, cy, r, a0, a1] = p.arc;
        ctx.arc(cx, cy, r, a0, a1);
        ctx.stroke();
      } else if (p.eye) {
        const [cx, cy, r] = p.eye;
        ctx.arc(cx, cy, r, 0, TAU);
        knock();
        ctx.stroke();
        ctx.beginPath();
        if (o.shut) {
          ctx.moveTo(cx - r, cy);
          ctx.lineTo(cx + r, cy);
          ctx.stroke();
        } else if (p.pupil === 'dot') {
          ctx.arc(cx, cy, r * 0.22, 0, TAU);
          ctx.fillStyle = color;
          ctx.fill();
        } else {
          // two arcs through (cx, cy -+ r) and (cx +- w, cy)
          const w = r * 0.17;
          const R = (r * r + w * w) / (2 * w);
          const a = Math.asin(r / R);
          ctx.arc(cx + w - R, cy, R, -a, a);
          ctx.arc(cx - w + R, cy, R, Math.PI - a, Math.PI + a);
          ctx.closePath();
          knock();
          ctx.stroke();
        }
      } else if (p.line) {
        const [x0, y0, x1, y1] = p.line;
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      } else if (p.teeth) {
        const [x0, y0, x1, y1, n, depth] = p.teeth;
        const m = Math.max(1, n | 0) * 2;
        for (let i = 0; i <= m; i++) {
          const u = i / m;
          const px = x0 + (x1 - x0) * u;
          const py = y0 + (y1 - y0) * u + (i % 2 ? depth : 0);
          if (i) ctx.lineTo(px, py);
          else ctx.moveTo(px, py);
        }
        ctx.stroke();
      } else if (p.path) {
        lib.tracePath(ctx, p.path, !!p.closed);
        if (p.fill) knock();
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  lib.lineIcon = lineIcon;

  /**
   * glowFigure(ctx, parts, opts) : a figure drawn in light: each part a glowing contour whose
   * vertices wobble on the boil clock, a closed part knocking out the plate behind it first,
   * so paths and stars pass behind the figure.
   *   parts   [pts, ...] or [{ pts, closed, fill }, ...]   (a bare pts array is a closed, filled part)
   *   color   pal.lineWhite     halo  color     width 3     radius 10
   *   bg      pal.navyDeep      knock-out colour
   *   knock   0.88              knock-out opacity
   *   wobble  1                 px of boil
   *   seed    31
   *   plus the glow() options (layers, strength, additive, alpha)
   */
  function glowFigure(ctx, parts, o = {}) {
    const seed = seedInt(o.seed === undefined ? 31 : o.seed);
    const bi = boilIndex(o);
    const wob = o.wobble != null ? o.wobble : 1;
    const opts = Object.assign({ width: 3, radius: 10 }, o);
    (parts || []).forEach((part, j) => {
      const q = Array.isArray(part) ? { pts: part, closed: true, fill: true } : part;
      if (!q || !q.pts || q.pts.length < 2) return;
      const pts = wob
        ? q.pts.map((p, i) => {
            const P = XY(p);
            return [P[0] + wob * noise1(i * 0.23 + bi * 3.7, seed + j * 2), P[1] + wob * noise1(i * 0.23 + bi * 3.7, seed + j * 2 + 1)];
          })
        : q.pts;
      if (q.fill && q.closed !== false) {
        ctx.save();
        ctx.globalAlpha *= o.knock != null ? o.knock : 0.88;
        ctx.fillStyle = o.bg || pal.navyDeep;
        ctx.beginPath();
        lib.tracePath(ctx, pts, true);
        ctx.fill();
        ctx.restore();
      }
      opts.closed = q.closed !== false;
      glow(ctx, pts, opts);
    });
  }
  lib.glowFigure = glowFigure;

  /**
   * sprite(ctx, rows, x, y, cell, opts) : pixel art from strings, one string per row. A space or
   * '.' is empty; any other character is a lit cell in opts.color, or opts.colors[char]. Runs of a
   * row merge into one rect, and cells snap to whole device pixels so edges stay crisp.
   *   color pal.lineWhite   colors {}   alpha 1   align 'left' | 'center' | 'right'
   * Returns the drawn width in px.
   */
  function sprite(ctx, rows, x, y, cell, o = {}) {
    const cols = rows.reduce((m, r) => Math.max(m, r.length), 0);
    const width = cols * cell;
    const x0 = o.align === 'center' ? x - width / 2 : o.align === 'right' ? x - width : x;
    ctx.save();
    ctx.globalAlpha *= o.alpha != null ? o.alpha : 1;
    const colors = o.colors || {};
    const snap = (v) => Math.round(v);
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      let c = 0;
      while (c < row.length) {
        const ch = row[c];
        if (ch === ' ' || ch === '.') {
          c++;
          continue;
        }
        let e = c + 1;
        while (e < row.length && row[e] === ch) e++;
        ctx.fillStyle = colors[ch] || o.color || pal.lineWhite;
        const ax = snap(x0 + c * cell), ay = snap(y + r * cell);
        ctx.fillRect(ax, ay, snap(x0 + e * cell) - ax, snap(y + (r + 1) * cell) - ay);
        c = e;
      }
    }
    ctx.restore();
    return width;
  }
  lib.sprite = sprite;

  // 5×7 pixel font: seven rows of five bits per glyph, bit 4 the leftmost column. Upper case only;
  // lower case draws as upper case and an unknown character as '?'.
  const FONT57 = {
    A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14],
    D: [28, 18, 17, 17, 17, 18, 28], E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16],
    G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17], I: [14, 4, 4, 4, 4, 4, 14],
    J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
    M: [17, 27, 21, 21, 17, 17, 17], N: [17, 17, 25, 21, 19, 17, 17], O: [14, 17, 17, 17, 17, 17, 14],
    P: [30, 17, 17, 30, 16, 16, 16], Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17],
    S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4], U: [17, 17, 17, 17, 17, 17, 14],
    V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17],
    Y: [17, 17, 17, 10, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
    0: [14, 17, 19, 21, 25, 17, 14], 1: [4, 12, 4, 4, 4, 4, 14], 2: [14, 17, 1, 2, 4, 8, 31],
    3: [31, 2, 4, 2, 1, 17, 14], 4: [2, 6, 10, 18, 31, 2, 2], 5: [31, 16, 30, 1, 1, 17, 14],
    6: [6, 8, 16, 30, 17, 17, 14], 7: [31, 1, 2, 4, 8, 8, 8], 8: [14, 17, 17, 14, 17, 17, 14],
    9: [14, 17, 17, 15, 1, 2, 12],
    ' ': [0, 0, 0, 0, 0, 0, 0], '.': [0, 0, 0, 0, 0, 12, 12], ',': [0, 0, 0, 0, 12, 4, 8],
    ':': [0, 12, 12, 0, 12, 12, 0], ';': [0, 12, 12, 0, 12, 4, 8], '-': [0, 0, 0, 31, 0, 0, 0],
    _: [0, 0, 0, 0, 0, 0, 31], '/': [0, 1, 2, 4, 8, 16, 0], '!': [4, 4, 4, 4, 4, 0, 4],
    '?': [14, 17, 1, 2, 4, 0, 4], '>': [8, 4, 2, 1, 2, 4, 8], '<': [2, 4, 8, 16, 8, 4, 2],
    '=': [0, 0, 31, 0, 31, 0, 0], '+': [0, 4, 4, 31, 4, 4, 0], '#': [10, 10, 31, 10, 31, 10, 10],
    '%': [24, 25, 2, 4, 8, 19, 3], '(': [2, 4, 8, 8, 8, 4, 2], ')': [8, 4, 2, 2, 2, 4, 8],
    '[': [14, 8, 8, 8, 8, 8, 14], ']': [14, 2, 2, 2, 2, 2, 14], "'": [4, 4, 8, 0, 0, 0, 0],
    '"': [10, 10, 0, 0, 0, 0, 0], '*': [0, 4, 21, 14, 21, 4, 0], '█': [31, 31, 31, 31, 31, 31, 31],
  };
  lib.pixelFont5x7 = FONT57;

  /**
   * pixelText(ctx, str, x, y, cell, opts) : text in the built-in 5×7 pixel font, the same on every
   * machine (the system monospace is not). A glyph is 5×7 cells on a 6-cell advance; a line is
   * 9 cells tall; '\n' starts a new line. (x, y) is the top of the first line at its align point.
   *   color pal.lineWhite   alpha 1   align 'left' | 'center' | 'right'
   *   chars                 how many characters to show (a terminal typing out), default all
   *   cursor false          a full block after the last shown character
   * Returns { width, height } of the whole text in px.
   */
  function pixelText(ctx, str, x, y, cell, o = {}) {
    const lines = String(str).toUpperCase().split('\n');
    let left = o.chars != null ? Math.max(0, Math.floor(o.chars)) : Infinity;
    let width = 0;
    let cursor = !!o.cursor;
    lines.forEach((line, li) => {
      width = Math.max(width, line.length ? (line.length * 6 - 1) * cell : 0);
      const shown = line.slice(0, Math.min(line.length, left));
      const stops = left <= line.length || li === lines.length - 1; // typing ends on this line
      left = Math.max(0, left - line.length - 1); // the newline counts as a character
      let text = shown;
      if (cursor && stops) {
        text += '█';
        cursor = false;
      }
      const w = (line.length * 6 - 1) * cell;
      const x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
      const rows = ['', '', '', '', '', '', ''];
      for (const ch of text) {
        const g = FONT57[ch] || FONT57['?'];
        for (let r = 0; r < 7; r++) {
          let bits = '';
          for (let b = 4; b >= 0; b--) bits += (g[r] >> b) & 1 ? '#' : ' ';
          rows[r] += bits + ' ';
        }
      }
      sprite(ctx, rows, x0, y + li * 9 * cell, cell, { color: o.color, alpha: o.alpha });
    });
    return { width, height: (lines.length * 9 - 2) * cell };
  }
  lib.pixelText = pixelText;

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
   *   The default step is 1/24 s: ceil(|T| / dt) steps, the last one shorter so the
   *   integral lands on T. A long T stays on the same path as a fine step. Pass steps
   *   to divide [0, T] into that many equal steps instead.
   *   One sample of flow at the middle of each step.
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

  const ADVECT_DT = 1 / 24;

  function advect(p0, T, opts, steps) {
    const x0 = Array.isArray(p0) ? p0[0] : p0.x;
    const y0 = Array.isArray(p0) ? p0[1] : p0.y;
    const t1 = typeof T === 'number' ? T : 0;
    if (!(t1 !== 0)) return { x: x0, y: y0 };
    let n;
    let dt;
    if (steps == null) {
      n = Math.ceil(Math.abs(t1) / ADVECT_DT - 1e-9);
      if (n < 1) n = 1;
      dt = t1 < 0 ? -ADVECT_DT : ADVECT_DT;
    } else {
      n = Math.round(steps);
      if (!(n > 0)) return { x: x0, y: y0 };
      dt = t1 / n;
    }
    let x = x0;
    let y = y0;
    let t = 0;
    for (let i = 0; i < n; i++) {
      const step = i === n - 1 ? t1 - t : dt;
      const v = flow(x, y, t + step * 0.5, opts);
      x += v.x * step;
      y += v.y * step;
      t += step;
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
  // Voronoi cells
  // ===========================================================================

  // Bowyer–Watson Delaunay, then the dual: each cell is the clip cut by the
  // perpendicular bisectors of the site's Delaunay neighbours. A tiling check
  // falls back to cutting against every other site when a degenerate mesh
  // would leave a gap. Cached by sites, clip and Lloyd relax (never by time).
  const voronoiCache = new Map();

  function polyArea(poly) {
    let a = 0;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      a += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
    }
    return a * 0.5;
  }

  function cleanRing(poly, eps) {
    if (!poly || poly.length < 3) return [];
    const e = eps == null ? 1e-8 : eps;
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i];
      const q = out[out.length - 1];
      if (q && Math.hypot(p[0] - q[0], p[1] - q[1]) <= e) continue;
      out.push([p[0], p[1]]);
    }
    if (out.length > 2 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) <= e) out.pop();
    if (out.length < 3) return [];
    const slim = [];
    for (let i = 0; i < out.length; i++) {
      const a = out[(i + out.length - 1) % out.length];
      const b = out[i];
      const c = out[(i + 1) % out.length];
      const cr = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      if (Math.abs(cr) > e) slim.push(b);
    }
    return slim.length >= 3 ? slim : out;
  }

  function ensureCCW(poly) {
    const c = cleanRing(poly, 1e-9);
    if (c.length < 3) return [];
    if (polyArea(c) < 0) c.reverse();
    return c;
  }

  function pointInConvex(poly, x, y, eps) {
    const e = eps == null ? 1e-6 : eps;
    const n = poly.length;
    if (n < 3) return false;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const cr = (poly[i][0] - poly[j][0]) * (y - poly[j][1]) - (poly[i][1] - poly[j][1]) * (x - poly[j][0]);
      if (cr < -e) return false;
    }
    return true;
  }

  function ringConvex(poly) {
    const n = poly.length;
    if (n < 3) return false;
    let sign = 0;
    for (let i = 0; i < n; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % n];
      const c = poly[(i + 2) % n];
      const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
      if (Math.abs(cr) <= 1e-7) continue;
      const s = cr > 0 ? 1 : -1;
      if (sign && s !== sign) return false;
      sign = s;
    }
    return true;
  }

  function segCut(a, b, mx, my, dx, dy) {
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const denom = ex * dx + ey * dy;
    if (Math.abs(denom) < 1e-14) return null;
    let t = ((mx - a[0]) * dx + (my - a[1]) * dy) / denom;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
    return [a[0] + ex * t, a[1] + ey * t];
  }

  // Keep the half-plane of points closer to (sx,sy) than to (ox,oy).
  function clipHalf(poly, sx, sy, ox, oy) {
    const mx = (sx + ox) * 0.5;
    const my = (sy + oy) * 0.5;
    const dx = sx - ox;
    const dy = sy - oy;
    const inside = (x, y) => (x - mx) * dx + (y - my) * dy >= -1e-9;
    const out = [];
    const n = poly.length;
    for (let i = 0; i < n; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % n];
      const ain = inside(a[0], a[1]);
      const bin = inside(b[0], b[1]);
      if (ain && bin) out.push([b[0], b[1]]);
      else if (ain && !bin) {
        const hit = segCut(a, b, mx, my, dx, dy);
        if (hit) out.push(hit);
      } else if (!ain && bin) {
        const hit = segCut(a, b, mx, my, dx, dy);
        if (hit) out.push(hit);
        out.push([b[0], b[1]]);
      }
    }
    return cleanRing(out, 1e-8);
  }

  function rectRing(x, y, w, h) {
    return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  }

  function clipToRing(clip, o) {
    if (Array.isArray(clip) && clip.length === 4 && typeof clip[0] === 'number') {
      return ensureCCW(rectRing(clip[0], clip[1], clip[2], clip[3]));
    }
    if (clip && !Array.isArray(clip) && Number.isFinite(clip.x) && Number.isFinite(clip.y) && Number.isFinite(clip.w) && Number.isFinite(clip.h)) {
      return ensureCCW(rectRing(clip.x, clip.y, clip.w, clip.h));
    }
    const polys = toPolys(clip);
    if (polys && polys.length) {
      let best = null;
      let bestA = 0;
      for (let i = 0; i < polys.length; i++) {
        const ring = ensureCCW(polys[i]);
        const a = Math.abs(polyArea(ring));
        if (a > bestA) {
          bestA = a;
          best = ring;
        }
      }
      if (best) return best;
    }
    const b = normBounds(o.bounds);
    return ensureCCW(rectRing(b.x, b.y, b.w, b.h));
  }

  function normalizeSites(sites) {
    const out = [];
    if (!sites || !sites.length) return out;
    for (let i = 0; i < sites.length; i++) {
      const p = XY(sites[i]);
      if (Number.isFinite(p[0]) && Number.isFinite(p[1])) out.push([p[0], p[1]]);
    }
    return out;
  }

  function delaunayNeighbors(points) {
    const n = points.length;
    const nbrs = Array.from({ length: n }, () => []);
    if (n < 2) return nbrs;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < n; i++) {
      const p = points[i];
      if (p[0] < minX) minX = p[0];
      if (p[1] < minY) minY = p[1];
      if (p[0] > maxX) maxX = p[0];
      if (p[1] > maxY) maxY = p[1];
    }
    const span = Math.max(maxX - minX, maxY - minY) || 1;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const P = new Array(n + 3);
    for (let i = 0; i < n; i++) P[i] = [(points[i][0] - cx) / span, (points[i][1] - cy) / span];
    P[n] = [-30, -10];
    P[n + 1] = [30, -10];
    P[n + 2] = [0, 30];
    const orient = (i, j, k) => {
      const ax = P[i][0], ay = P[i][1];
      const bx = P[j][0], by = P[j][1];
      const cxp = P[k][0], cyp = P[k][1];
      return (bx - ax) * (cyp - ay) - (by - ay) * (cxp - ax);
    };
    const inCircle = (i, j, k, p) => {
      const ax = P[i][0] - P[p][0];
      const ay = P[i][1] - P[p][1];
      const bx = P[j][0] - P[p][0];
      const by = P[j][1] - P[p][1];
      const cxp = P[k][0] - P[p][0];
      const cyp = P[k][1] - P[p][1];
      const ab = ax * by - bx * ay;
      const bc = bx * cyp - cxp * by;
      const ca = cxp * ay - ax * cyp;
      return (ax * ax + ay * ay) * bc + (bx * bx + by * by) * ca + (cxp * cxp + cyp * cyp) * ab;
    };
    let tris = [{ a: n, b: n + 1, c: n + 2 }];
    const EPS = 1e-12;
    for (let pi = 0; pi < n; pi++) {
      let dup = false;
      for (let k = 0; k < pi; k++) {
        const dx = P[pi][0] - P[k][0];
        const dy = P[pi][1] - P[k][1];
        if (dx * dx + dy * dy < 1e-20) { dup = true; break; }
      }
      if (dup) continue;
      const bad = [];
      for (let t = 0; t < tris.length; t++) {
        const tr = tris[t];
        const o = orient(tr.a, tr.b, tr.c);
        if (o < 0) {
          const tmp = tr.b;
          tr.b = tr.c;
          tr.c = tmp;
        }
        if (Math.abs(o) < 1e-16) continue;
        if (inCircle(tr.a, tr.b, tr.c, pi) >= -EPS) bad.push(t);
      }
      if (!bad.length) {
        for (let t = 0; t < tris.length; t++) {
          const tr = tris[t];
          if (orient(tr.a, tr.b, pi) >= -EPS && orient(tr.b, tr.c, pi) >= -EPS && orient(tr.c, tr.a, pi) >= -EPS) {
            bad.push(t);
            break;
          }
        }
      }
      if (!bad.length) continue;
      const count = new Map();
      const keyOf = (u, v) => (u < v ? u + ':' + v : v + ':' + u);
      for (let b = 0; b < bad.length; b++) {
        const tr = tris[bad[b]];
        const edges = [[tr.a, tr.b], [tr.b, tr.c], [tr.c, tr.a]];
        for (let e = 0; e < 3; e++) {
          const k = keyOf(edges[e][0], edges[e][1]);
          count.set(k, (count.get(k) || 0) + 1);
        }
      }
      const boundary = [];
      for (let b = 0; b < bad.length; b++) {
        const tr = tris[bad[b]];
        const edges = [[tr.a, tr.b], [tr.b, tr.c], [tr.c, tr.a]];
        for (let e = 0; e < 3; e++) {
          const u = edges[e][0], v = edges[e][1];
          if (count.get(keyOf(u, v)) === 1) boundary.push([u, v]);
        }
      }
      const dead = new Set(bad);
      const next = [];
      for (let t = 0; t < tris.length; t++) if (!dead.has(t)) next.push(tris[t]);
      for (let e = 0; e < boundary.length; e++) {
        const u = boundary[e][0], v = boundary[e][1];
        if (orient(u, v, pi) >= -1e-14) next.push({ a: u, b: v, c: pi });
        else if (orient(v, u, pi) >= -1e-14) next.push({ a: v, b: u, c: pi });
      }
      tris = next;
    }
    const link = (i, j) => {
      if (i >= n || j >= n || i === j) return;
      const a = nbrs[i];
      for (let k = 0; k < a.length; k++) if (a[k] === j) return;
      a.push(j);
    };
    for (let t = 0; t < tris.length; t++) {
      const tr = tris[t];
      link(tr.a, tr.b); link(tr.b, tr.a);
      link(tr.b, tr.c); link(tr.c, tr.b);
      link(tr.c, tr.a); link(tr.a, tr.c);
    }
    return nbrs;
  }

  function cellsFromNeighbors(sites, ring, nbrs) {
    const cells = new Array(sites.length);
    for (let i = 0; i < sites.length; i++) {
      const s = sites[i];
      let poly = ring.map((p) => [p[0], p[1]]);
      const ns = nbrs ? nbrs[i] : null;
      const m = ns ? ns.length : sites.length;
      for (let k = 0; k < m; k++) {
        const j = ns ? ns[k] : k;
        if (j === i) continue;
        const o = sites[j];
        const dx = s[0] - o[0];
        const dy = s[1] - o[1];
        if (dx * dx + dy * dy < 1e-16) {
          // The earlier site keeps the cell. Zeroing both leaves a hole in the clip.
          if (j < i) {
            poly = [];
            break;
          }
          continue;
        }
        poly = clipHalf(poly, s[0], s[1], o[0], o[1]);
        if (poly.length < 3) {
          poly = [];
          break;
        }
      }
      cells[i] = { i, site: [s[0], s[1]], poly };
    }
    return cells;
  }

  function tilingOk(cells, ring, sites) {
    const A = Math.abs(polyArea(ring));
    if (!(A > 0)) return false;
    let sum = 0;
    for (let i = 0; i < cells.length; i++) {
      const poly = cells[i].poly;
      if (!poly.length) {
        if (pointInConvex(ring, sites[i][0], sites[i][1], 1e-4)) return false;
        continue;
      }
      if (!ringConvex(poly)) return false;
      sum += Math.abs(polyArea(poly));
      if (pointInConvex(ring, sites[i][0], sites[i][1], 1e-5) && !pointInConvex(poly, sites[i][0], sites[i][1], 1e-4)) return false;
    }
    return Math.abs(sum - A) / A < 0.005;
  }

  function diagram(sites, ring) {
    if (sites.length >= 3) {
      const cells = cellsFromNeighbors(sites, ring, delaunayNeighbors(sites));
      if (tilingOk(cells, ring, sites)) return cells;
    }
    return cellsFromNeighbors(sites, ring, null);
  }

  function polyCentroid(poly) {
    let a = 0, cx = 0, cy = 0;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const c = poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
      a += c;
      cx += (poly[j][0] + poly[i][0]) * c;
      cy += (poly[j][1] + poly[i][1]) * c;
    }
    if (Math.abs(a) < 1e-12) return [poly[0][0], poly[0][1]];
    return [cx / (3 * a), cy / (3 * a)];
  }

  function geomKey(tag, pts) {
    let h1 = hash(tag, pts.length);
    let h2 = hash('k', tag, pts.length);
    for (let i = 0; i < pts.length; i++) {
      h1 = hash(h1, pts[i][0], i);
      h2 = hash(h2, pts[i][1], i);
    }
    return h1.toString(16) + h2.toString(16);
  }

  function relaxCount(o) {
    let r = o && o.relax != null ? o.relax : 0;
    if (r < 0) r = 0;
    else if (r > 3) r = 3;
    return r | 0;
  }

  /**
   * voronoi(sites, clip, opts) : cells of a Voronoi diagram clipped to a convex clip.
   *   sites   [[x,y], ...] or [{x,y}, ...]
   *   clip    [x,y,w,h], {x,y,w,h}, a polygon [[x,y],...], or null (opts.bounds or the frame)
   *   relax   0..3    Lloyd iterations. 0 leaves the sites where they are.
   * Returns [{ i, site, poly }], one per site, in order. poly is a CCW ring with no
   * repeated close, convex when the clip is convex, empty when the site owns nothing.
   * A later site that repeats an earlier position is empty; the earlier site keeps the cell.
   * site is the position after relaxation (the point the cell contains).
   * clip is one convex ring (a rect or one polygon). A list of polygons uses only the
   * largest ring, so a concave clip is not a union.
   * Cached by the sites, the clip and relax.
   */
  function voronoi(sitesIn, clip, o) {
    const opts = o || {};
    const relax = relaxCount(opts);
    const ring = clipToRing(clip, opts);
    const sites = normalizeSites(sitesIn);
    const key = geomKey('s', sites) + '|' + geomKey('c', ring) + '|' + relax;
    if (voronoiCache.has(key)) {
      const hit = voronoiCache.get(key);
      voronoiCache.delete(key);
      voronoiCache.set(key, hit);
      return hit;
    }
    let cur = sites.map((s) => [s[0], s[1]]);
    let cells = diagram(cur, ring);
    for (let k = 0; k < relax; k++) {
      cur = cells.map((c) => (c.poly.length >= 3 ? polyCentroid(c.poly) : [c.site[0], c.site[1]]));
      cells = diagram(cur, ring);
    }
    voronoiCache.set(key, cells);
    while (voronoiCache.size > 32) voronoiCache.delete(voronoiCache.keys().next().value);
    return cells;
  }
  lib.voronoi = voronoi;

  function distToSeg(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const l2 = dx * dx + dy * dy || 1;
    let t = ((px - ax) * dx + (py - ay) * dy) / l2;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
    return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
  }

  function edgeOnRing(a, b, ring, eps) {
    for (let i = 0; i < ring.length; i++) {
      const c = ring[i];
      const d = ring[(i + 1) % ring.length];
      if (distToSeg(a[0], a[1], c[0], c[1], d[0], d[1]) <= eps && distToSeg(b[0], b[1], c[0], c[1], d[0], d[1]) <= eps) return true;
    }
    return false;
  }

  function pointOnRing(p, ring, eps) {
    for (let i = 0; i < ring.length; i++) {
      const c = ring[i];
      const d = ring[(i + 1) % ring.length];
      if (distToSeg(p[0], p[1], c[0], c[1], d[0], d[1]) <= eps) return true;
    }
    return false;
  }

  function offsetConvex(poly, distOrFn) {
    const n = poly.length;
    if (n < 3) return [];
    const lines = [];
    for (let i = 0; i < n; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % n];
      let dx = b[0] - a[0];
      let dy = b[1] - a[1];
      const len = Math.hypot(dx, dy);
      if (len < 1e-9) continue;
      dx /= len;
      dy /= len;
      const dist = typeof distOrFn === 'function' ? distOrFn(a, b) : distOrFn;
      lines.push({ x: a[0] - dy * dist, y: a[1] + dx * dist, dx, dy });
    }
    if (lines.length < 3) return [];
    const out = [];
    for (let i = 0; i < lines.length; i++) {
      const L1 = lines[(i + lines.length - 1) % lines.length];
      const L2 = lines[i];
      const det = L1.dx * L2.dy - L1.dy * L2.dx;
      if (Math.abs(det) < 1e-12) continue;
      const t = ((L2.x - L1.x) * L2.dy - (L2.y - L1.y) * L2.dx) / det;
      out.push([L1.x + L1.dx * t, L1.y + L1.dy * t]);
    }
    const cleaned = cleanRing(out, 1e-6);
    if (cleaned.length < 3 || polyArea(cleaned) <= 0) return [];
    return cleaned;
  }

  function filletPoly(poly, r, seed, cellIndex, sharp) {
    const n = poly.length;
    const out = [];
    for (let i = 0; i < n; i++) {
      const prev = poly[(i + n - 1) % n];
      const cur = poly[i];
      const next = poly[(i + 1) % n];
      if (sharp && sharp(cur)) {
        out.push([cur[0], cur[1]]);
        continue;
      }
      const v1x = prev[0] - cur[0], v1y = prev[1] - cur[1];
      const v2x = next[0] - cur[0], v2y = next[1] - cur[1];
      const l1 = Math.hypot(v1x, v1y), l2 = Math.hypot(v2x, v2y);
      if (l1 < 1e-6 || l2 < 1e-6) { out.push([cur[0], cur[1]]); continue; }
      const u1x = v1x / l1, u1y = v1y / l1;
      const u2x = v2x / l2, u2y = v2y / l2;
      let dot = u1x * u2x + u1y * u2y;
      if (dot > 0.999) { out.push([cur[0], cur[1]]); continue; }
      dot = dot < -1 ? -1 : dot > 1 ? 1 : dot;
      const ang = Math.acos(dot);
      const half = ang / 2;
      const jitter = 0.75 + 0.5 * h3(cellIndex, i, seed);
      let rad = r * jitter;
      const tanH = Math.tan(half) || 1e-6;
      const maxT = Math.min(l1, l2) * 0.45;
      let t = Math.min(maxT, rad / tanH);
      rad = t * tanH;
      if (t < 0.35 || rad < 0.35) { out.push([cur[0], cur[1]]); continue; }
      const n1x = u1y, n1y = -u1x;
      const n2x = -u2y, n2y = u2x;
      let bx = n1x + n2x, by = n1y + n2y;
      const bl = Math.hypot(bx, by) || 1;
      bx /= bl;
      by /= bl;
      const dist = rad / (Math.sin(half) || 1e-6);
      const ccx = cur[0] + bx * dist, ccy = cur[1] + by * dist;
      const p1x = cur[0] + u1x * t, p1y = cur[1] + u1y * t;
      const p2x = cur[0] + u2x * t, p2y = cur[1] + u2y * t;
      let a1 = Math.atan2(p1y - ccy, p1x - ccx);
      let a2 = Math.atan2(p2y - ccy, p2x - ccx);
      let sweep = a2 - a1;
      while (sweep <= -Math.PI) sweep += TAU;
      while (sweep > Math.PI) sweep -= TAU;
      const steps = Math.max(2, Math.ceil(Math.abs(sweep) / (Math.PI / 7)));
      for (let s = 0; s <= steps; s++) {
        const a = a1 + sweep * (s / steps);
        out.push([ccx + Math.cos(a) * rad, ccy + Math.sin(a) * rad]);
      }
    }
    return cleanRing(out, 1e-4);
  }

  /**
   * cells(ctx, cells, opts) : organic cells, gapped and rounded.
   *   inset    0     px to pull each edge inward (the gap). Edges that lie on opts.clip stay put,
   *                  so the gap does not open a frame around the clip.
   *   round    0     corner radius (px). Corners on opts.clip stay sharp.
   *   fill     null  a colour, or (i, cell) => colour. Falsy skips the fill.
   *   stroke   null  a colour, or true for pal.ink. width (default 1.5), alpha, strokeAlpha.
   *   seed     1     jitters the corner radius
   *   clip     null  rect or polygon the cells were clipped to (see inset / round)
   * A flush cell (no inset, no round) is drawn a hair fat so shared edges do not crack.
   */
  function cells(ctx, list, o = {}) {
    if (!list || !list.length) return;
    const inset = o.inset || 0;
    const round = o.round || 0;
    const seed = seedInt(o.seed === undefined ? 1 : o.seed);
    const width = o.width != null ? o.width : 1.5;
    const ring = o.clip != null ? clipToRing(o.clip, o) : null;
    const seal = !(inset > 0) && !(round > 0);
    ctx.save();
    for (let i = 0; i < list.length; i++) {
      const cell = list[i];
      const src = cell && cell.poly ? cell.poly : Array.isArray(cell) ? cell : null;
      if (!src || src.length < 3) continue;
      let poly = src;
      if (inset > 0) {
        poly = offsetConvex(poly, ring
          ? (a, b) => (edgeOnRing(a, b, ring, 0.75) ? 0 : inset)
          : inset);
      } else if (seal) {
        poly = offsetConvex(poly, -0.65);
      }
      if (!poly || poly.length < 3) continue;
      if (round > 0) {
        poly = filletPoly(poly, round, seed, i, ring ? (p) => pointOnRing(p, ring, 0.75) : null);
      }
      if (!poly || poly.length < 3) continue;
      const fill = typeof o.fill === 'function' ? o.fill(i, cell) : o.fill;
      ctx.save();
      if (o.alpha != null) ctx.globalAlpha *= o.alpha;
      ctx.beginPath();
      lib.tracePath(ctx, poly, true);
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
        if (seal) {
          ctx.lineJoin = 'round';
          ctx.lineWidth = 1.25;
          ctx.strokeStyle = fill;
          ctx.stroke();
        }
      }
      if (o.stroke) {
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = width;
        ctx.strokeStyle = o.stroke === true ? pal.ink : o.stroke;
        if (o.strokeAlpha != null) ctx.globalAlpha *= o.strokeAlpha;
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }
  lib.cells = cells;

  // ===========================================================================
  // Watercolour wash
  // ===========================================================================

  /**
   * wash(ctx, clip, opts) : translucent watercolour inside a clip. The plate is cached by the clip,
   * the options and FILM.S; a frame only blits it. Never keyed by raw time.
   *   color        pal.sage
   *   alpha        0.62     opacity the interior settles to
   *   seed         17
   *   layers       4        noise-deformed contours, each a translucent fill (1..8)
   *   bleed        6        how far a contour may wander, px, outward and inward
   *   edgeDarken   0.35     rim pigment, 0..1 toward pal.ink
   *   granulation  0.3      seeded sediment, modulated by a paper-grain tooth
   *   blooms       0        wet pools: light centre, darker ring
   *   dry          0        0 wet (soft, wide) .. 1 dry (tight, grainier)
   *   boil         false    true keeps 3 variants on the 12 fps clock
   *   bounds                required when clip is a function, a Path2D or null
   *   key                   stable id for a function or Path2D clip. Without it a function is
   *                         keyed by its source text plus bounds, and a Path2D by bounds alone,
   *                         so two closures with the same text and different captured values
   *                         share one plate. Pass key when the shape is not determined by the
   *                         source and the bounds.
   */
  function hashClip(clip, bounds, key) {
    let h;
    if (Array.isArray(clip) && clip.length) {
      const polys = toPolys(clip);
      h = hash('p', polys.length);
      for (let p = 0; p < polys.length; p++) {
        const poly = polys[p];
        h = hash(h, poly.length);
        for (let i = 0; i < poly.length; i++) h = hash(h, poly[i][0], poly[i][1]);
      }
    } else {
      const b = bounds || { x: 0, y: 0, w: 0, h: 0 };
      if (typeof clip === 'function') h = hash('f', String(clip), b.x, b.y, b.w, b.h);
      else if (typeof Path2D !== 'undefined' && clip instanceof Path2D) h = hash('d', b.x, b.y, b.w, b.h);
      else h = hash('n', b.x, b.y, b.w, b.h);
    }
    if (key != null) h = hash(h, 'k', String(key));
    return h >>> 0;
  }

  // Squared Euclidean distance to the nearest feature pixel (feature[i] nonzero). Separable Felzenszwalb.
  function distance2(feature, w, h) {
    const INF = 1e12;
    const N = w * h;
    const horiz = new Float64Array(N);
    const out = new Float64Array(N);
    const len = Math.max(w, h);
    const v = new Int32Array(len);
    const z = new Float64Array(len + 1);
    const f = new Float64Array(len);
    const d = new Float64Array(len);
    const sep = (p, q) => {
      const denom = 2 * (q - p);
      return denom ? (f[q] + q * q - (f[p] + p * p)) / denom : 0;
    };
    const dt = (n) => {
      let k = 0;
      v[0] = 0;
      z[0] = -Infinity;
      z[1] = Infinity;
      for (let q = 1; q < n; q++) {
        let s = sep(v[k], q);
        while (k > 0 && s <= z[k]) {
          k--;
          s = sep(v[k], q);
        }
        k++;
        v[k] = q;
        z[k] = s;
        z[k + 1] = Infinity;
      }
      k = 0;
      for (let q = 0; q < n; q++) {
        while (z[k + 1] < q) k++;
        const p = v[k];
        const dx = q - p;
        d[q] = dx * dx + f[p];
      }
    };
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) f[y] = feature[y * w + x] ? 0 : INF;
      dt(h);
      for (let y = 0; y < h; y++) horiz[y * w + x] = d[y];
    }
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) f[x] = horiz[row + x];
      dt(w);
      for (let x = 0; x < w; x++) out[row + x] = d[x];
    }
    return out;
  }

  function bilerp(grid, gw, gh, x, y) {
    if (x < 0) x = 0;
    else if (x > gw - 1) x = gw - 1;
    if (y < 0) y = 0;
    else if (y > gh - 1) y = gh - 1;
    const i = x | 0;
    const j = y | 0;
    const tx = x - i;
    const ty = y - j;
    const i2 = i + 1 < gw ? i + 1 : i;
    const j2 = j + 1 < gh ? j + 1 : j;
    const jw = j * gw;
    const j2w = j2 * gw;
    const a = grid[jw + i] * (1 - tx) + grid[jw + i2] * tx;
    const b = grid[j2w + i] * (1 - tx) + grid[j2w + i2] * tx;
    return a * (1 - ty) + b * ty;
  }

  function renderWash(clip, shape, S, color, alpha, seed, layers, bleed, edgeDarken, granulation, blooms, dry, variant) {
    const pad = bleed + 4;
    const srcB = shape.polys ? shape.bounds : {
      x: shape.bounds.x - pad,
      y: shape.bounds.y - pad,
      w: shape.bounds.w + pad * 2,
      h: shape.bounds.h + pad * 2,
    };
    const x0 = Math.floor(srcB.x);
    const y0 = Math.floor(srcB.y);
    const lw = Math.max(1, Math.ceil(srcB.x + srcB.w) - x0);
    const lh = Math.max(1, Math.ceil(srcB.y + srcB.h) - y0);
    const cw = Math.max(1, Math.round(lw * S));
    const ch = Math.max(1, Math.round(lh * S));
    const c = newCanvas(cw, ch);
    const g = c.getContext('2d', { willReadFrequently: true });
    g.setTransform(cw / lw, 0, 0, ch / lh, 0, 0);
    g.translate(-x0, -y0);
    g.fillStyle = '#ffffff';
    g.beginPath();
    if (shape.polys) {
      for (let i = 0; i < shape.polys.length; i++) lib.tracePath(g, shape.polys[i], true);
      g.fill('evenodd');
    } else if (typeof clip === 'function') {
      clip(g);
      g.fill();
    } else if (typeof Path2D !== 'undefined' && clip instanceof Path2D) {
      g.fill(clip);
    } else {
      g.fillRect(shape.bounds.x, shape.bounds.y, shape.bounds.w, shape.bounds.h);
    }
    const img = g.getImageData(0, 0, cw, ch);
    const px = img.data;
    const n = cw * ch;
    const inside = new Uint8Array(n);
    const outside = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const on = px[i * 4 + 3] >= 128 ? 1 : 0;
      inside[i] = on;
      outside[i] = on ^ 1;
    }
    const dIn2 = distance2(inside, cw, ch);
    const dOut2 = distance2(outside, cw, ch);

    const wet = 1 - dry;
    const step = 5;
    const gw = Math.ceil(lw / step) + 2;
    const gh = Math.ceil(lh / step) + 2;
    const grids = new Array(layers);
    const gseed = seed + variant * 9176;
    for (let li = 0; li < layers; li++) {
      const grid = new Float32Array(gw * gh);
      const s = gseed + li * 19;
      for (let j = 0; j < gh; j++) {
        for (let i = 0; i < gw; i++) {
          const n = (noise2(i * 0.16, j * 0.16, s) * 0.68 + noise2(i * 0.46, j * 0.46, s + 2) * 0.32) * 1.45;
          grid[j * gw + i] = n < -1 ? -1 : n > 1 ? 1 : n;
        }
      }
      grids[li] = grid;
    }
    const gran = new Float32Array(gw * gh);
    const gs = seed + 400 + variant * 13;
    for (let j = 0; j < gh; j++) {
      for (let i = 0; i < gw; i++) gran[j * gw + i] = noise2(i * 0.38, j * 0.38, gs) * 0.72 + noise2(i * 1.05, j * 1.05, gs + 4) * 0.28;
    }

    const spots = [];
    if (blooms > 0) {
      let sx = 0, sy = 0, sn = 0;
      const stride = Math.max(1, (Math.sqrt(n / 5000) | 0));
      for (let py = 0; py < ch; py += stride) {
        const row = py * cw;
        for (let qx = 0; qx < cw; qx += stride) {
          if (inside[row + qx]) { sx += qx; sy += py; sn++; }
        }
      }
      const rnd = rng(seed + 77);
      const span = Math.min(lw, lh);
      for (let i = 0; i < blooms; i++) {
        let bx = x0 + lw * 0.5;
        let by = y0 + lh * 0.5;
        if (sn) {
          bx = x0 + (sx / sn) * (lw / cw);
          by = y0 + (sy / sn) * (lh / ch);
        }
        let placed = sn > 0;
        for (let k = 0; k < 28; k++) {
          const jx = bx + (rnd() - 0.5) * span * 0.36;
          const jy = by + (rnd() - 0.5) * span * 0.36;
          const mx = Math.round((jx - x0) * (cw / lw));
          const my = Math.round((jy - y0) * (ch / lh));
          if (mx >= 0 && my >= 0 && mx < cw && my < ch && inside[my * cw + mx]) {
            bx = jx;
            by = jy;
            placed = true;
            break;
          }
        }
        if (!placed) continue;
        const rad = Math.max(16, lerp(46, Math.min(110, span * 0.22), rnd()) * lerp(0.82, 1.16, wet));
        spots.push(bx, by, rad);
      }
    }

    const rgb = parseColor(color);
    const ink = parseColor(pal.ink);
    const paperC = parseColor(pal.paper);
    const lim = (bleed + 1.05) * S;
    const lim2 = lim * lim;
    const feather = Math.max(1, S * (1.05 + 0.65 * wet));
    const amp = Math.min(Math.max(0, (bleed + 0.35) * S - feather), bleed * (0.58 + 0.42 * wet) * S);
    const band = (6.4 + 0.7 * wet) * S;
    const granK = granulation * (0.7 + 0.55 * dry);
    const scx = lw / cw;
    const scy = lh / ch;
    const u8 = (v) => (v <= 0 ? 0 : v >= 255 ? 255 : (v + 0.5) | 0);

    for (let py = 0; py < ch; py++) {
      const row = py * cw;
      const ly = y0 + (py + 0.5) * scy;
      const gy = (ly - y0) / step;
      for (let qx = 0; qx < cw; qx++) {
        const i = row + qx;
        const k = i * 4;
        if (!inside[i] && dIn2[i] > lim2) {
          px[k] = px[k + 1] = px[k + 2] = px[k + 3] = 0;
          continue;
        }
        const sdf = inside[i] ? -Math.sqrt(dOut2[i]) : Math.sqrt(dIn2[i]);
        if (sdf > lim) {
          px[k] = px[k + 1] = px[k + 2] = px[k + 3] = 0;
          continue;
        }
        const lx = x0 + (qx + 0.5) * scx;
        const gx = (lx - x0) / step;
        let acc = 0;
        for (let li = 0; li < layers; li++) {
          const dist = sdf + bilerp(grids[li], gw, gh, gx, gy) * amp;
          let cov;
          if (dist <= -feather) cov = 1;
          else if (dist >= feather) cov = 0;
          else {
            const t = (dist + feather) / (feather * 2);
            const u = t * t * (3 - 2 * t);
            cov = 1 - u;
          }
          acc += cov;
        }
        const cov = acc / layers;
        if (cov <= 0) {
          px[k] = px[k + 1] = px[k + 2] = px[k + 3] = 0;
          continue;
        }
        const ad = sdf < 0 ? -sdf : sdf;
        let edge = ad >= band ? 0 : 1 - ad / band;
        edge = edge * edge * (3 - 2 * edge);
        const rim = cov < 0.98 ? cov * (1 - cov) * 4 : 0;
        let dark = (edge * 0.94 + rim * 0.4) * edgeDarken * (0.92 + 0.22 * dry);
        if (dark > 0.8) dark = 0.8;
        const gn = bilerp(gran, gw, gh, gx, gy);
        const tooth = 0.6 + 0.4 * h3(qx, py, seed + 91);
        const fine = h3(qx >> 1, py >> 1, seed + 5) * 2 - 1;
        const spec = (gn * 0.78 + fine * 0.22) * tooth;
        let mul = 1 + spec * granK * 1.15;
        mul -= Math.max(0, -spec) * granK * 0.22 * (0.3 + 0.7 * edge);
        if (edge > 0.45 && mul > 1) mul = 1;
        if (mul < 0.46) mul = 0.46;
        else if (mul > 1.26) mul = 1.26;
        let r = rgb[0] + (ink[0] - rgb[0]) * dark;
        let gc = rgb[1] + (ink[1] - rgb[1]) * dark;
        let bb = rgb[2] + (ink[2] - rgb[2]) * dark;
        for (let s = 0; s < spots.length; s += 3) {
          const dx = lx - spots[s];
          const dy = ly - spots[s + 1];
          const rad = spots[s + 2] * (1 + gn * 0.1);
          const dsq = dx * dx + dy * dy;
          if (dsq >= rad * rad) continue;
          const bd = Math.sqrt(dsq) / rad;
          const pool = 1 - bd * bd;
          const light = pool * (0.55 + 0.45 * pool) * (1 - dry * 0.35);
          const ring = Math.exp(-((bd - 0.58) * (bd - 0.58)) / 0.045);
          r += (paperC[0] - r) * light * 0.8;
          gc += (paperC[1] - gc) * light * 0.8;
          bb += (paperC[2] - bb) * light * 0.8;
          const rd = ring * (0.26 + 0.16 * wet);
          r += (ink[0] - r) * rd;
          gc += (ink[1] - gc) * rd;
          bb += (ink[2] - bb) * rd;
        }
        r *= mul;
        gc *= mul;
        bb *= mul;
        const mot = 0.5 + 0.5 * bilerp(grids[0], gw, gh, gx * 0.37, gy * 0.37);
        let a = cov * alpha * (0.9 + 0.1 * mot);
        a *= 1 + edge * 0.16;
        if (a > 1) a = 1;
        if (a < 0) a = 0;
        px[k] = u8(r);
        px[k + 1] = u8(gc);
        px[k + 2] = u8(bb);
        px[k + 3] = a <= 0 ? 0 : u8(a * 255);
        if (!px[k + 3]) px[k] = px[k + 1] = px[k + 2] = 0;
      }
    }
    g.putImageData(img, 0, 0);
    return { c, x: x0, y: y0, w: lw, h: lh };
  }

  function wash(ctx, clip, o = {}) {
    const S = renderScale();
    const color = o.color || pal.sage;
    const alpha = clamp(o.alpha != null ? o.alpha : 0.62, 0, 1);
    const seed = seedInt(o.seed === undefined ? 17 : o.seed);
    const layers = Math.max(1, Math.min(8, o.layers == null ? 4 : o.layers | 0));
    const bleed = Math.max(0, o.bleed != null ? +o.bleed : 6);
    const edgeDarken = clamp(o.edgeDarken != null ? o.edgeDarken : 0.35, 0, 1);
    const granulation = Math.max(0, o.granulation != null ? +o.granulation : 0.3);
    const blooms = Math.max(0, Math.min(6, o.blooms == null ? 0 : o.blooms | 0));
    const dry = clamp(o.dry == null ? 0 : o.dry, 0, 1);
    let variant = 0;
    if (o.boil === true) variant = lib.boil(lib.T) % 3;
    else if (typeof o.boil === 'number') variant = Math.abs(o.boil | 0) % 3;
    const shape = shapeOf(clip, Object.assign({}, o, { pad: bleed + 4 }));
    const key = ['wash', hashClip(clip, shape.bounds, o.key), S, color, alpha, seed, layers, bleed, edgeDarken, granulation, blooms, dry, variant].join('|');
    const plate = cached(key, () => renderWash(clip, shape, S, color, alpha, seed, layers, bleed, edgeDarken, granulation, blooms, dry, variant));
    if (!plate || !(plate.w > 0) || !(plate.h > 0)) return;
    // A 1:1 blit stays exact (no filter fringe past the bleed). Scaled previews keep smoothing.
    ctx.save();
    if (Math.abs(S - 1) < 1e-6) ctx.imageSmoothingEnabled = false;
    ctx.drawImage(plate.c, plate.x, plate.y, plate.w, plate.h);
    ctx.restore();
  }
  lib.wash = wash;

  // ===========================================================================
  // Light and shadow
  // ===========================================================================

  // dir is where the shadow falls (raw dx,dy for the len·dir offset). The unit
  // vector is for normals; a missing or zero dir casts straight down.
  function lightDir(dir) {
    const dx = dir && isFinite(+dir[0]) ? +dir[0] : 0;
    const dy = dir && isFinite(+dir[1]) ? +dir[1] : dir ? 0 : 1;
    const L = Math.hypot(dx, dy);
    if (L < 1e-8) return { dx: 0, dy: 0, ux: 0, uy: 1 };
    return { dx, dy, ux: dx / L, uy: dy / L };
  }

  function asOutline(outline) {
    let src = outline;
    if (src && typeof src.outline === 'function') src = src.outline();
    const polys = toPolys(src);
    if (!polys || !polys[0] || polys[0].length < 3) return null;
    return polys[0];
  }

  // Drop a repeated closing vertex so the last edge is not zero-length.
  function ringCount(pts) {
    const n = pts.length;
    if (n >= 2 && Math.hypot(pts[0][0] - pts[n - 1][0], pts[0][1] - pts[n - 1][1]) < 1e-4) return n - 1;
    return n;
  }

  // Outward unit normals, one per edge. Canvas y grows downward, so the sign
  // follows the shoelace: clockwise outlines (positive area) face the other way.
  function outwardEdges(pts) {
    const n = ringCount(pts);
    let area = 0;
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      area += p[0] * q[1] - q[0] * p[1];
    }
    const s = area > 0 ? -1 : 1;
    const N = new Array(n);
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      let dx = q[0] - p[0], dy = q[1] - p[1];
      const L = Math.hypot(dx, dy);
      if (L < 1e-8) N[i] = [0, 0];
      else N[i] = [(-dy / L) * s, (dx / L) * s];
    }
    return { n, N };
  }

  // Shift by len·dir about the vertex centroid, with a shear along dir whose
  // mean is zero (the filled centroid still moves by exactly len·dir). len 0
  // is the identity, so a contact shadow sits on the form. A ground y then
  // compresses that shadow in y onto the line.
  function shadowPoints(pts, o, soft) {
    const d = lightDir(o.dir);
    const len = +o.len || 0;
    const ox = len * d.dx, oy = len * d.dy;
    const n = pts.length;
    let cx = 0, cy = 0;
    for (let i = 0; i < n; i++) { cx += pts[i][0]; cy += pts[i][1]; }
    cx /= n; cy /= n;
    const shear = (o.shear != null ? +o.shear : 0.26) * (len === 0 ? 0 : 1);
    const spread = len === 0 ? 1 : 1 + soft * 0.08;
    const vx = -d.uy, vy = d.ux;
    const out = new Array(n);
    for (let i = 0; i < n; i++) {
      const px = pts[i][0], py = pts[i][1];
      const s = ((px - cx) * vx + (py - cy) * vy) * shear;
      out[i] = [cx + ox + (px - cx + d.ux * s) * spread, cy + oy + (py - cy + d.uy * s) * spread];
    }
    // len 0 is the contact shadow under the form, not a projection onto the ground
    if (o.ground == null || len === 0) return out;
    const ground = +o.ground;
    const squash = o.squash != null ? +o.squash : lerp(0.22, 0.4, soft);
    for (let i = 0; i < n; i++) out[i][1] = ground + (out[i][1] - ground) * squash;
    return out;
  }

  function penOpts(o, over) {
    const s = {
      color: o.color || pal.ink,
      seed: o.seed,
      spacing: o.spacing,
      width: o.width,
      angle: o.angle,
      length: o.length,
      gap: o.gap,
      inset: o.inset,
      overshoot: o.overshoot,
      boil: o.boil,
      boilAmp: o.boilAmp,
      bend: o.bend,
      bow: o.bow,
      flow: o.flow,
      edge: o.edge,
      taper: o.taper,
      jitter: o.jitter,
      r: o.r,
      angleJitter: o.angleJitter,
      spacingJitter: o.spacingJitter,
    };
    for (const k of Object.keys(s)) if (s[k] == null) delete s[k];
    if (over) for (const k of Object.keys(over)) if (over[k] != null) s[k] = over[k];
    return s;
  }

  // Radial falloff so a soft shadow thins toward its edge. Null when unused.
  function softDensity(pts, soft, user) {
    if (!(soft > 0) && user == null) return null;
    let cx = 0, cy = 0;
    for (let i = 0; i < pts.length; i++) { cx += pts[i][0]; cy += pts[i][1]; }
    cx /= pts.length; cy /= pts.length;
    let rad = 1;
    for (let i = 0; i < pts.length; i++) {
      const d0 = Math.hypot(pts[i][0] - cx, pts[i][1] - cy);
      if (d0 > rad) rad = d0;
    }
    const edge = lerp(0.98, 0.42, soft || 0);
    return (x, y) => {
      let v = soft > 0 ? smoothstep(1, edge, Math.hypot(x - cx, y - cy) / rad) : 1;
      if (typeof user === 'function') v *= user(x, y);
      else if (user != null) v *= user;
      return clamp(v);
    };
  }

  /**
   * castShadow(ctx, outline, opts) : the silhouette shifted along the light and filled.
   *   dir      [dx, dy]  shadow direction (the light is -dir). The offset is len·dir,
   *                      and dir need not be a unit vector.
   *   len      0         how far the shadow sits from the form. 0 leaves it on the form.
   *   ground   null      horizontal line y. The shifted shape is compressed in y onto it.
   *   squash   0.22..0.4  with ground: fraction of the height kept; the default eases up with soft
   *   shear    0.26      sideways skew along dir; 0 is a pure shift. Forced to 0 at len 0.
   *   soft     0         0..1, opener spacing, lighter ink, faded edge
   *   style    'hatch'   'hatch' | 'stipple' | 'flat'
   *   color    pal.ink
   *   alpha    0.5       (0.34 for a flat tone), scaled down as soft rises
   *   seed     hatch/stipple default
   *   clipOutside false  also clip to the original outline, so len 0 cannot paint outside it
   *   ...spacing, angle, width and the other hatch / stipple options
   */
  function castShadow(ctx, outline, o = {}) {
    const pts = asOutline(outline);
    if (!pts) return;
    const soft = clamp(o.soft == null ? 0 : +o.soft, 0, 1);
    const shadow = shadowPoints(pts, o, soft);
    const style = o.style || 'hatch';
    const baseA = o.alpha != null ? o.alpha : style === 'flat' ? 0.34 : 0.5;
    const alpha = baseA * (1 - soft * 0.5);
    const spacing = (o.spacing || (style === 'stipple' ? 7.5 : 8)) * (1 + soft * 0.85);
    ctx.save();
    if (o.clipOutside) {
      ctx.beginPath();
      lib.tracePath(ctx, pts, true);
      ctx.clip();
    }
    if (style === 'flat') {
      ctx.beginPath();
      lib.tracePath(ctx, shadow, true);
      ctx.fillStyle = o.color || pal.ink;
      ctx.globalAlpha *= alpha;
      ctx.fill();
    } else if (style === 'stipple') {
      const dens = softDensity(shadow, soft, o.density);
      stipple(ctx, shadow, penOpts(o, { alpha, spacing, color: o.color || pal.ink, density: dens || undefined }));
    } else {
      const dens = softDensity(shadow, soft, o.density);
      hatch(ctx, shadow, penOpts(o, {
        alpha, spacing, color: o.color || pal.ink, density: dens || undefined, clip: o.clipOutside ? true : o.clip,
      }));
    }
    ctx.restore();
  }
  lib.castShadow = castShadow;

  /**
   * rimLight(ctx, outline, opts) : a light stroke on the contour where the outward
   * normal faces the light (dot(n, -dir) above a threshold), fading as it turns away.
   *   dir        [dx, dy]  shadow direction
   *   width      8
   *   color      pal.white
   *   alpha      0.85
   *   threshold  0.12      facing test; higher keeps the rim to a narrower crescent
   */
  function rimLight(ctx, outline, o = {}) {
    const pts = asOutline(outline);
    if (!pts) return;
    const d = lightDir(o.dir);
    const edges = outwardEdges(pts);
    const threshold = o.threshold != null ? o.threshold : 0.12;
    const STEPS = 5;
    const paths = [];
    for (let b = 0; b < STEPS; b++) paths.push(new Path2D());
    let prev = -2;
    for (let i = 0; i < edges.n; i++) {
      const N = edges.N[i];
      const face = N[0] * -d.ux + N[1] * -d.uy;
      const p = pts[i], q = pts[(i + 1) % edges.n];
      if (!(face > threshold)) { prev = -1; continue; }
      const f = smoothstep(threshold, 0.9, face);
      let b = Math.floor(f * STEPS);
      if (b >= STEPS) b = STEPS - 1;
      if (b !== prev) paths[b].moveTo(p[0], p[1]);
      paths[b].lineTo(q[0], q[1]);
      prev = b;
    }
    const alpha = o.alpha != null ? o.alpha : 0.85;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = o.width != null ? o.width : 8;
    ctx.strokeStyle = o.color || pal.white;
    const g = ctx.globalAlpha;
    for (let b = 0; b < STEPS; b++) {
      ctx.globalAlpha = g * alpha * ((b + 1) / STEPS);
      ctx.stroke(paths[b]);
    }
    ctx.restore();
  }
  lib.rimLight = rimLight;

  /**
   * shadeSide(ctx, outline, opts) : hatch inside the form on the side facing away
   * from the light — the same normal test as rimLight, inverted, and faded across
   * the terminator. For a convex outline the normal at an interior point is the
   * direction from the centroid. dir, threshold, soft and every hatch option apply.
   *   dir     [dx, dy]
   *   soft    0        opener, lighter hatch
   *   clip    true     hard-clip to the outline
   */
  function shadeSide(ctx, outline, o = {}) {
    const pts = asOutline(outline);
    if (!pts) return;
    const d = lightDir(o.dir);
    const n = ringCount(pts);
    let cx = 0, cy = 0;
    for (let i = 0; i < n; i++) { cx += pts[i][0]; cy += pts[i][1]; }
    cx /= n; cy /= n;
    const threshold = o.threshold != null ? o.threshold : 0.05;
    const user = o.density;
    const side = (x, y) => {
      let nx = x - cx, ny = y - cy;
      const L = Math.hypot(nx, ny);
      const face = L < 1e-3 ? 0 : (nx / L) * -d.ux + (ny / L) * -d.uy;
      let v = smoothstep(threshold + 0.18, threshold - 0.62, face);
      if (typeof user === 'function') v *= user(x, y);
      else if (typeof user === 'number') v *= user;
      return clamp(v);
    };
    const soft = clamp(o.soft == null ? 0 : +o.soft, 0, 1);
    const alpha = (o.alpha != null ? o.alpha : 0.82) * (1 - soft * 0.4);
    hatch(ctx, pts, penOpts(o, {
      density: side,
      alpha,
      clip: o.clip != null ? o.clip : true,
      spacing: (o.spacing || 8) * (1 + soft * 0.6),
      angle: o.angle != null ? o.angle : Math.atan2(d.uy, d.ux) + Math.PI / 2,
      color: o.color || pal.ink,
    }));
  }
  lib.shadeSide = shadeSide;

  // ===========================================================================
  // Motion smear
  // ===========================================================================

  // Scratch bitmaps keyed by pixel size, never by time: a second pass of the same frame reuses them.
  const smearSlot = { tiny: null, full: null };

  /**
   * smear(ctx, draw, opts) : drawn-animation multiples for a pose that jumps between two phases.
   * draw(ctx, u) paints the object at phase u. u runs from `from` to `to` inclusive.
   *   n        5                 copies. draw is called exactly n times.
   *   mode     'ghosts'          fading copies, oldest first (default).
   *            'stretch'         the leading pose, scaled along the centroid shift from `from` to `to`.
   *            'lines'           speed lines off the trailing edge of the leading pose.
   *   alpha    1                 opacity of the leading copy, the stretch, and the lines.
   *   falloff  1                 higher: older ghosts fade faster, stretch and lines run longer.
   *   seed     1                 jitter for speed lines only.
   * n === 1, or from === to, paints exactly one draw(ctx, to) — no fade, no stretch, no lines.
   */
  function smearNum(v, fallback) {
    const x = +v;
    return Number.isFinite(x) ? x : fallback;
  }

  function smearPhase(from, to, n, i) {
    if (n <= 1) return to;
    if (i <= 0) return from;
    if (i >= n - 1) return to;
    return from + ((to - from) * i) / (n - 1);
  }

  // Leading copy stays at `alpha`; older copies fall toward 0. Each copy is clamped to 0..1
  // so a stack composited with source-over cannot blow a pixel out.
  function smearCopyAlpha(i, n, alpha, falloff) {
    const a = clamp(smearNum(alpha, 1), 0, 1);
    if (i >= n - 1) return a;
    const rank = (i + 1) / n;
    return clamp(smearNum(a * Math.pow(rank, smearNum(falloff, 1)), 0), 0, 1);
  }

  function smearCanvas(ctx, full) {
    const w = full ? Math.max(1, ctx.canvas.width | 0) : 1;
    const h = full ? Math.max(1, ctx.canvas.height | 0) : 1;
    const key = full ? 'full' : 'tiny';
    let c = smearSlot[key];
    if (!c || c.width !== w || c.height !== h) c = smearSlot[key] = newCanvas(w, h);
    const g = c.getContext('2d');
    if (typeof g.reset === 'function') g.reset();
    else {
      for (let i = 0; i < 32; i++) g.restore();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      g.filter = 'none';
    }
    g.shadowBlur = 0;
    g.shadowOffsetX = 0;
    g.shadowOffsetY = 0;
    g.clearRect(0, 0, w, h);
    if (typeof ctx.getTransform === 'function') {
      const m = ctx.getTransform();
      g.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    return g;
  }

  function smearDevice(ctx, x, y) {
    if (typeof ctx.getTransform !== 'function') return [x, y];
    const m = ctx.getTransform();
    return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
  }

  // Records path points in device pixels while draw() paints. The proxy forwards every
  // call to the real context, so the pixels (when we keep them) match a direct draw.
  function smearRecord(ctx, u, draw) {
    const pts = [];
    let cx = 0;
    let cy = 0;
    let have = false;
    const push = (x, y) => {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      const d = smearDevice(ctx, x, y);
      pts.push(d[0], d[1]);
    };
    const proxy = new Proxy(ctx, {
      get(target, prop) {
        if (prop === 'moveTo' || prop === 'lineTo') {
          return (x, y) => {
            const r = target[prop].call(target, x, y);
            push(x, y);
            cx = x;
            cy = y;
            have = true;
            return r;
          };
        }
        if (prop === 'quadraticCurveTo') {
          return (cpx, cpy, x, y) => {
            const r = target.quadraticCurveTo(cpx, cpy, x, y);
            const x0 = have ? cx : x;
            const y0 = have ? cy : y;
            for (let k = 1; k <= 4; k++) {
              const t = k / 4;
              const s = 1 - t;
              push(s * s * x0 + 2 * s * t * cpx + t * t * x, s * s * y0 + 2 * s * t * cpy + t * t * y);
            }
            cx = x;
            cy = y;
            have = true;
            return r;
          };
        }
        if (prop === 'bezierCurveTo') {
          return (c1x, c1y, c2x, c2y, x, y) => {
            const r = target.bezierCurveTo(c1x, c1y, c2x, c2y, x, y);
            const x0 = have ? cx : x;
            const y0 = have ? cy : y;
            for (let k = 1; k <= 4; k++) {
              const t = k / 4;
              const s = 1 - t;
              push(
                s * s * s * x0 + 3 * s * s * t * c1x + 3 * s * t * t * c2x + t * t * t * x,
                s * s * s * y0 + 3 * s * s * t * c1y + 3 * s * t * t * c2y + t * t * t * y
              );
            }
            cx = x;
            cy = y;
            have = true;
            return r;
          };
        }
        if (prop === 'rect' || prop === 'fillRect' || prop === 'strokeRect') {
          return (x, y, w, h) => {
            const r = target[prop].call(target, x, y, w, h);
            push(x, y);
            push(x + w, y);
            push(x + w, y + h);
            push(x, y + h);
            return r;
          };
        }
        if (prop === 'arc' || prop === 'ellipse') {
          return (x, y, rx, ry, rot, a0, a1, ccw) => {
            let r;
            let radius = rx;
            let ryUse = ry;
            let rotUse = rot || 0;
            let start = a0;
            let end = a1;
            let anticlock = ccw;
            if (prop === 'arc') {
              r = target.arc(x, y, rx, ry, rot, a0);
              radius = rx;
              ryUse = rx;
              rotUse = 0;
              start = ry;
              end = rot;
              anticlock = !!a0;
            } else r = target.ellipse(x, y, rx, ry, rotUse, a0, a1, ccw);
            let sweep = end - start;
            if (anticlock) {
              if (sweep >= 0) sweep -= TAU;
            } else if (sweep <= 0) sweep += TAU;
            const cr = Math.cos(rotUse);
            const sr = Math.sin(rotUse);
            for (let k = 0; k <= 8; k++) {
              const a = start + (sweep * k) / 8;
              const px = Math.cos(a) * radius;
              const py = Math.sin(a) * ryUse;
              push(x + px * cr - py * sr, y + px * sr + py * cr);
            }
            cx = x + Math.cos(end) * radius;
            cy = y + Math.sin(end) * ryUse;
            have = true;
            return r;
          };
        }
        const v = target[prop];
        return typeof v === 'function' ? v.bind(target) : v;
      },
      set(target, prop, value) {
        target[prop] = value;
        return true;
      },
    });
    draw(proxy, u);
    return pts;
  }

  function smearCentroid(pts) {
    const n = pts.length >> 1;
    if (!n) return null;
    let x = 0;
    let y = 0;
    for (let i = 0; i < pts.length; i += 2) {
      x += pts[i];
      y += pts[i + 1];
    }
    return [x / n, y / n, n];
  }

  function smearRadius(pts, c) {
    let r = 0;
    for (let i = 0; i < pts.length; i += 2) {
      const d = Math.hypot(pts[i] - c[0], pts[i + 1] - c[1]);
      if (d > r) r = d;
    }
    return r;
  }

  function smearGhosts(ctx, draw, from, to, n, alpha, falloff) {
    ctx.save();
    for (let i = 0; i < n; i++) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha *= smearCopyAlpha(i, n, alpha, falloff);
      draw(ctx, smearPhase(from, to, n, i));
      ctx.restore();
    }
    ctx.restore();
  }

  function smearStretch(ctx, draw, from, to, n, alpha, falloff) {
    let fromPts = null;
    for (let i = 0; i < n - 1; i++) {
      const pts = smearRecord(smearCanvas(ctx, false), smearPhase(from, to, n, i), draw);
      if (i === 0) fromPts = pts;
    }
    const pose = smearCanvas(ctx, true);
    const toPts = smearRecord(pose, smearPhase(from, to, n, n - 1), draw);
    const c0 = fromPts ? smearCentroid(fromPts) : null;
    const c1 = smearCentroid(toPts);
    ctx.save();
    const base = ctx.globalAlpha;
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = base * clamp(smearNum(alpha, 1), 0, 1);
    let scaled = false;
    if (c0 && c1) {
      const dx = c1[0] - c0[0];
      const dy = c1[1] - c0[1];
      const dist = Math.hypot(dx, dy);
      const rad = smearRadius(toPts, c1);
      const gain = clamp(smearNum(falloff, 1), 0, 3);
      if (dist > 0.75 && rad > 1 && gain > 0) {
        let s = 1 + (dist / rad) * gain;
        if (s > 4) s = 4;
        const ang = Math.atan2(dy, dx);
        ctx.translate(c1[0], c1[1]);
        ctx.rotate(ang);
        ctx.scale(s, Math.pow(s, -0.25));
        ctx.rotate(-ang);
        ctx.translate(-c1[0], -c1[1]);
        scaled = true;
      }
    }
    ctx.imageSmoothingEnabled = scaled;
    ctx.drawImage(pose.canvas, 0, 0);
    ctx.restore();
  }

  // Rear-most device point in each perpendicular slice, so lines fan across the trailing edge
  // instead of stacking on one vertex.
  function smearTrailing(pts, c, ux, uy, px, py, maxN) {
    const n = pts.length >> 1;
    if (!n || !c) return [];
    const scored = [];
    for (let i = 0; i < pts.length; i += 2) {
      const dx = pts[i] - c[0];
      const dy = pts[i + 1] - c[1];
      scored.push([pts[i], pts[i + 1], dx * ux + dy * uy, dx * px + dy * py]);
    }
    scored.sort((a, b) => a[2] - b[2] || a[3] - b[3]);
    const rear = [];
    for (let i = 0; i < scored.length; i++) if (scored[i][2] < -0.5) rear.push(scored[i]);
    const pool = rear.length >= 2 ? rear : scored.slice(0, Math.min(scored.length, maxN));
    const best = new Map();
    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];
      const k = Math.round(p[3] / 12);
      const prev = best.get(k);
      if (!prev || p[2] < prev[2]) best.set(k, p);
    }
    const keys = [...best.keys()].sort((a, b) => a - b);
    let rows = keys.map((k) => best.get(k));
    if (rows.length > maxN) {
      const slim = [];
      const step = rows.length === 1 ? 0 : (rows.length - 1) / (maxN - 1);
      for (let i = 0; i < maxN; i++) slim.push(rows[Math.round(i * step)]);
      rows = slim;
    }
    return rows;
  }

  function smearLines(ctx, draw, from, to, n, alpha, falloff, seed) {
    let fromPts = null;
    for (let i = 0; i < n - 1; i++) {
      const pts = smearRecord(smearCanvas(ctx, false), smearPhase(from, to, n, i), draw);
      if (i === 0) fromPts = pts;
    }
    const toPts = smearRecord(ctx, smearPhase(from, to, n, n - 1), draw);
    const c0 = fromPts ? smearCentroid(fromPts) : null;
    const c1 = smearCentroid(toPts);
    if (!c0 || !c1) return;
    const vx = c1[0] - c0[0];
    const vy = c1[1] - c0[1];
    const dist = Math.hypot(vx, vy);
    if (dist < 0.75) return;
    const ux = vx / dist;
    const uy = vy / dist;
    const px = -uy;
    const py = ux;
    const rows = smearTrailing(toPts, c1, ux, uy, px, py, 14);
    if (!rows.length) return;
    const m = typeof ctx.getTransform === 'function' ? ctx.getTransform() : null;
    const sc = m ? Math.hypot(m.a, m.b) || 1 : 1;
    const rnd = rng(seed === undefined ? 1 : seed);
    const gain = clamp(smearNum(falloff, 1), 0, 2.5);
    const a = clamp(smearNum(alpha, 1), 0, 1);
    ctx.save();
    const base = ctx.globalAlpha;
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = pal.ink;
    ctx.strokeStyle = pal.ink;
    ctx.lineCap = 'round';
    for (let i = 0; i < rows.length; i++) {
      const p = rows[i];
      const side = rnd.range(-1, 1);
      const len = dist * (0.55 + 0.8 * gain) * rnd.range(0.8, 1.16);
      const hw = (6 + rnd() * 5) * sc;
      const x0 = p[0] - ux * (8 * sc) + px * side * (3 * sc);
      const y0 = p[1] - uy * (8 * sc) + py * side * (3 * sc);
      const x1 = x0 - ux * len + px * side * (2 * sc);
      const y1 = y0 - uy * len + py * side * (2 * sc);
      ctx.globalAlpha = base * a * (0.55 + 0.35 * rnd());
      ctx.beginPath();
      ctx.moveTo(x0 + px * hw, y0 + py * hw);
      ctx.lineTo(x0 - px * hw, y0 - py * hw);
      ctx.lineTo(x1, y1);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  lib.smear = (ctx, draw, o) => {
    if (typeof draw !== 'function') return;
    const opt = o || {};
    const from = smearNum(opt.from, 0);
    const to = smearNum(opt.to, 1);
    let n = opt.n == null ? 5 : opt.n | 0;
    if (!(n >= 1)) n = 1;
    const mode = String(opt.mode || 'ghosts').toLowerCase();
    const alpha = opt.alpha;
    const falloff = opt.falloff;
    // A single copy, or a pose that did not move, is exactly draw(ctx, to). Extra calls still
    // run so the counter stays n, but they paint a scratch bitmap and cannot touch this canvas.
    if (n === 1 || from === to) {
      for (let i = 1; i < n; i++) draw(smearCanvas(ctx, false), to);
      draw(ctx, to);
      return;
    }
    if (mode === 'stretch') smearStretch(ctx, draw, from, to, n, alpha, falloff);
    else if (mode === 'lines') smearLines(ctx, draw, from, to, n, alpha, falloff, opt.seed);
    else smearGhosts(ctx, draw, from, to, n, alpha, falloff);
  };

  // ===========================================================================
  // Parallax layers
  // ===========================================================================

  // One blurred plane is rasterised once per draw function and viewport, then
  // re-projected. The key deliberately ignores the camera and the frame time:
  // a static plate must not allocate another canvas on the next frame.
  const layerIds = new WeakMap();
  let layerSeq = 1;
  const LAYER_PAD = 1;

  function layerZ(plane) {
    const z = plane && plane.z != null ? Number(plane.z) : 1;
    return Number.isFinite(z) && z !== 0 ? z : 1;
  }

  // z = 1 is lib.camera. Farther planes (z > 1) take less zoom and less pan.
  function layerCam(cam, z) {
    if (z === 1) return cam || {};
    const c = cam || {};
    const zoom = c.zoom != null ? c.zoom : 1;
    const x = c.x != null ? c.x : W() / 2;
    const y = c.y != null ? c.y : H() / 2;
    const out = {
      x: W() / 2 + (x - W() / 2) / z,
      y: H() / 2 + (y - H() / 2) / z,
      zoom: 1 + (zoom - 1) / z,
    };
    if (c.rot) out.rot = c.rot;
    return out;
  }

  function drawPlane(ctx, cam, z, draw) {
    lib.camera(ctx, layerCam(cam, z), draw);
  }

  function planeFog(ctx, fog) {
    const amount = fog ? Number(fog.amount) : 0;
    if (!(amount > 0)) return;
    ctx.save();
    ctx.globalAlpha *= amount;
    ctx.fillStyle = fog.color || pal.white;
    ctx.fillRect(0, 0, W(), H());
    ctx.restore();
  }

  // Logical rectangle currently mapped onto ctx.canvas (the frame, under the
  // base transform). Padding keeps blur and a later zoom from sampling emptiness.
  function layerView(ctx) {
    const dw = ctx.canvas.width || W();
    const dh = ctx.canvas.height || H();
    const m = typeof ctx.getTransform === 'function' ? ctx.getTransform() : null;
    const a = m ? m.a : dw / W();
    const b = m ? m.b : 0;
    const c = m ? m.c : 0;
    const d = m ? m.d : dh / H();
    const e = m ? m.e : 0;
    const f = m ? m.f : 0;
    const det = a * d - b * c;
    const inv = (px, py) => {
      const x = px - e;
      const y = py - f;
      if (!det) return { x: px, y: py };
      return { x: (d * x - c * y) / det, y: (-b * x + a * y) / det };
    };
    const pts = [inv(0, 0), inv(dw, 0), inv(0, dh), inv(dw, dh)];
    let minX = pts[0].x, maxX = pts[0].x, minY = pts[0].y, maxY = pts[0].y;
    for (let i = 1; i < pts.length; i++) {
      if (pts[i].x < minX) minX = pts[i].x;
      if (pts[i].x > maxX) maxX = pts[i].x;
      if (pts[i].y < minY) minY = pts[i].y;
      if (pts[i].y > maxY) maxY = pts[i].y;
    }
    const vw = maxX - minX || W();
    const vh = maxY - minY || H();
    return {
      ox: minX - LAYER_PAD * vw,
      oy: minY - LAYER_PAD * vh,
      ww: vw * (1 + 2 * LAYER_PAD),
      hh: vh * (1 + 2 * LAYER_PAD),
      sx: dw / vw,
      sy: dh / vh,
    };
  }

  function cachedBlur(ctx, draw, blur, keyOpt) {
    // An inline closure is a new function every frame. keyOpt keeps one plate;
    // without it the cache key is the draw function's identity.
    let id = keyOpt != null ? 'k:' + keyOpt : layerIds.get(draw);
    if (!id) layerIds.set(draw, (id = layerSeq++));
    const v = layerView(ctx);
    const offW = Math.max(1, Math.round(v.ww * v.sx));
    const offH = Math.max(1, Math.round(v.hh * v.sy));
    const q = (n) => Math.round(n * 1000) / 1000;
    const key = ['plx', id, offW, offH, q(blur), q(v.ox), q(v.oy), q(v.ww), q(v.hh)].join('|');
    const canvas = cached(key, () => {
      const off = newCanvas(offW, offH);
      const g = off.getContext('2d');
      g.setTransform(v.sx, 0, 0, v.sy, -v.ox * v.sx, -v.oy * v.sy);
      g.filter = `blur(${blur}px)`;
      try {
        draw(g);
      } finally {
        g.filter = 'none';
      }
      return off;
    });
    return { canvas, ox: v.ox, oy: v.oy, ww: v.ww, hh: v.hh };
  }

  /**
   * layers(ctx, { x, y, zoom, rot }, planes) : one camera, several depths, painted far to near.
   *   planes   [{ z, draw, blur, key, fog: { color, amount }, static }]
   *   z        1 is the focus plane (same pixels as camera). z > 1 is farther, z < 1 is nearer.
   *            Effective zoom is 1 + (zoom - 1) / z. The pan (x - W/2, y - H/2) is divided by z.
   *   blur     depth-of-field radius in px. Honoured only when static is true: the plane is drawn
   *            once into a cached canvas with ctx.filter. Otherwise the blur is skipped.
   *            The plate is keyed by draw's identity, so the function must be a stable reference.
   *            An inline closure allocates a new plate every frame. Pass key to share one plate
   *            across those calls.
   *   fog      translucent fill over that plane, after it is drawn.
   */
  lib.layers = (ctx, cam, planes) => {
    const list = Array.isArray(planes) ? planes.slice() : [];
    list.sort((a, b) => layerZ(b) - layerZ(a));
    for (let i = 0; i < list.length; i++) {
      const plane = list[i];
      if (!plane || typeof plane.draw !== 'function') continue;
      const z = layerZ(plane);
      const blur = Number(plane.blur);
      if (plane.static && Number.isFinite(blur) && blur > 0) {
        const pic = cachedBlur(ctx, plane.draw, blur, plane.key);
        drawPlane(ctx, cam, z, (g) => g.drawImage(pic.canvas, pic.ox, pic.oy, pic.ww, pic.hh));
      } else {
        drawPlane(ctx, cam, z, plane.draw);
      }
      planeFog(ctx, plane.fog);
    }
  };

  // ===========================================================================
  // Wireframe 3D
  // Mesh space is right-handed: X to the right, Y up, Z toward the viewer.
  // Canvas Y grows downward, so orthographic Y is negated. A full turn is
  // reduced by subtraction (not by scaling the fraction) so 2π is exactly 0
  // and θ+2π is the same angle as θ.
  // ===========================================================================

  function wrapAngle(a) {
    if (!a) return 0;
    const n = Math.floor(a / TAU);
    let b = a - n * TAU;
    if (!(b > 0)) return 0;
    if (b > TAU - 1e-9) return 0;
    return b;
  }

  // Yaw (Y), then pitch (X), then roll (Z). Pitch stays aimed at the camera,
  // so a turntable's floor does not tumble as it spins.
  function rotateYUp(x, y, z, rx, ry, rz) {
    const cy = Math.cos(ry), sy = Math.sin(ry);
    const x1 = x * cy + z * sy;
    const z1 = -x * sy + z * cy;
    const cx = Math.cos(rx), sx = Math.sin(rx);
    const y2 = y * cx - z1 * sx;
    const z2 = y * sx + z1 * cx;
    const cz = Math.cos(rz), sz = Math.sin(rz);
    return [x1 * cz - y2 * sz, x1 * sz + y2 * cz, z2];
  }

  function viewOf(o) {
    const rot = (o && o.rot) || [0, 0, 0];
    const at = (o && o.at) || [W() / 2, H() / 2];
    const persp = o && o.persp > 0 ? +o.persp : 0;
    return {
      rx: wrapAngle(+rot[0] || 0),
      ry: wrapAngle(+rot[1] || 0),
      rz: wrapAngle(+rot[2] || 0),
      ax: at[0],
      ay: at[1],
      scale: o && o.scale != null ? +o.scale : 1,
      persp,
      sx: o && o.shift ? +o.shift[0] || 0 : 0,
      sy: o && o.shift ? +o.shift[1] || 0 : 0,
      sz: o && o.shift ? +o.shift[2] || 0 : 0,
    };
  }

  function projectView(p, v) {
    const r = rotateYUp((+p[0] || 0) + v.sx, (+p[1] || 0) + v.sy, (+p[2] || 0) + v.sz, v.rx, v.ry, v.rz);
    let m = 1;
    if (v.persp) {
      const d = v.persp - r[2];
      m = v.persp / (d > 1e-3 ? d : 1e-3);
    }
    // mesh Y is up; canvas Y is down
    return [v.ax + v.scale * r[0] * m, v.ay - v.scale * r[1] * m, r[2]];
  }

  /**
   * project3d(p, opts) : [x, y, depth] in the same view as wire3d.
   * depth is z after rotation, positive toward the viewer (larger = closer).
   *   at [W/2, H/2], scale 1 (px per mesh unit), rot [rx, ry, rz] radians,
   *   persp 0 (orthographic) or a focal length in mesh units. The camera sits
   *   at z = persp looking toward −Z, so a nearer point (larger z) draws larger.
   *   shift [0, 0, 0] moves the mesh before it turns (a camera flying down a tunnel shifts +z).
   */
  function project3d(p, o) {
    return projectView(p || [0, 0, 0], viewOf(o));
  }
  lib.project3d = project3d;

  function mesh(verts, edges, faces) {
    return faces ? { verts, edges, faces } : { verts, edges };
  }

  /** box(w=2, h=2, d=2) : cuboid centred on the origin. box() is the cube (±1, ±1, ±1). */
  function box(w = 2, h = 2, d = 2) {
    const hx = w / 2, hy = h / 2, hz = d / 2;
    const verts = [
      [-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz],
      [-hx, -hy, -hz], [hx, -hy, -hz], [hx, hy, -hz], [-hx, hy, -hz],
    ];
    const edges = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7],
    ];
    const faces = [[0, 1, 2, 3], [5, 4, 7, 6], [4, 0, 3, 7], [1, 5, 6, 2], [3, 2, 6, 7], [4, 5, 1, 0]];
    return mesh(verts, edges, faces);
  }

  /** sphere(lat=8, lon=12, radius=1) : latitude stacks and longitude slices, poles shared. */
  function sphere(lat = 8, lon = 12, radius = 1) {
    lat = Math.max(2, lat | 0);
    lon = Math.max(3, lon | 0);
    const verts = [[0, radius, 0]];
    for (let i = 1; i < lat; i++) {
      const phi = (i / lat) * Math.PI;
      const y = Math.cos(phi) * radius;
      const rr = Math.sin(phi) * radius;
      for (let j = 0; j < lon; j++) {
        const th = (j / lon) * TAU;
        verts.push([Math.cos(th) * rr, y, Math.sin(th) * rr]);
      }
    }
    const south = verts.length;
    verts.push([0, -radius, 0]);
    const edges = [];
    const ring = (i) => 1 + (i - 1) * lon;
    for (let j = 0; j < lon; j++) {
      edges.push([0, 1 + j]);
      edges.push([ring(lat - 1) + j, south]);
    }
    for (let i = 1; i < lat; i++) {
      const base = ring(i);
      for (let j = 0; j < lon; j++) {
        const a = base + j;
        edges.push([a, base + ((j + 1) % lon)]);
        if (i < lat - 1) edges.push([a, a + lon]);
      }
    }
    return mesh(verts, edges);
  }

  /** cylinder(seg=12, radius=1, height=2) : top and bottom rings plus the verticals. No cap spokes. */
  function cylinder(seg = 12, radius = 1, height = 2) {
    seg = Math.max(3, seg | 0);
    const verts = [];
    const edges = [];
    const faces = [];
    const hy = height / 2;
    for (let j = 0; j < seg; j++) {
      const a = (j / seg) * TAU;
      const x = Math.cos(a) * radius;
      const z = Math.sin(a) * radius;
      verts.push([x, hy, z], [x, -hy, z]);
    }
    for (let j = 0; j < seg; j++) {
      const j2 = (j + 1) % seg;
      const top = j * 2;
      const bot = top + 1;
      edges.push([top, j2 * 2], [bot, j2 * 2 + 1], [top, bot]);
      faces.push([top, j2 * 2, j2 * 2 + 1, bot]);
    }
    return mesh(verts, edges, faces);
  }

  /** torus(major=16, minor=8, R=1, r=0.35) : tube of radius r around a circle of radius R in the XZ plane. */
  function torus(major = 16, minor = 8, R = 1, r = 0.35) {
    major = Math.max(3, major | 0);
    minor = Math.max(3, minor | 0);
    const verts = [];
    const edges = [];
    for (let i = 0; i < major; i++) {
      const a = (i / major) * TAU;
      const ca = Math.cos(a), sa = Math.sin(a);
      for (let j = 0; j < minor; j++) {
        const b = (j / minor) * TAU;
        const cb = Math.cos(b), sb = Math.sin(b);
        verts.push([(R + r * cb) * ca, r * sb, (R + r * cb) * sa]);
      }
    }
    const id = (i, j) => (i % major) * minor + (j % minor);
    for (let i = 0; i < major; i++) {
      for (let j = 0; j < minor; j++) {
        const a = id(i, j);
        edges.push([a, id(i, j + 1)], [a, id(i + 1, j)]);
      }
    }
    return mesh(verts, edges);
  }

  /**
   * helix(turns=2, steps=40, radius=1, height=2, opts)
   *   strands  1     copies spaced evenly around the axis
   *   rungs    0     false/0 off; true connects every second sample; a number connects every nth.
   *                  Rungs are appended after the strand polylines.
   * A leading options object is accepted in place of the numbers.
   */
  function helix(turns = 2, steps = 40, radius = 1, height = 2, o) {
    if (turns && typeof turns === 'object') {
      o = turns;
      turns = o.turns != null ? o.turns : 2;
      steps = o.steps != null ? o.steps : 40;
      radius = o.radius != null ? o.radius : 1;
      height = o.height != null ? o.height : 2;
    }
    o = o || {};
    steps = Math.max(1, steps | 0);
    const strands = Math.max(1, (o.strands | 0) || 1);
    let rungEvery = 0;
    if (o.rungs === true) rungEvery = 2;
    else if (typeof o.rungs === 'number' && o.rungs > 0) rungEvery = Math.max(1, o.rungs | 0);
    const verts = [];
    const edges = [];
    const span = steps + 1;
    for (let s = 0; s < strands; s++) {
      const phase = (s / strands) * TAU;
      const base = s * span;
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const a = phase + u * turns * TAU;
        verts.push([Math.cos(a) * radius, (u - 0.5) * height, Math.sin(a) * radius]);
        if (i) edges.push([base + i - 1, base + i]);
      }
    }
    if (rungEvery && strands > 1) {
      for (let i = 0; i <= steps; i += rungEvery) {
        for (let s = 0; s < strands - 1; s++) edges.push([s * span + i, (s + 1) * span + i]);
        if (strands > 2) edges.push([(strands - 1) * span + i, i]);
      }
    }
    return mesh(verts, edges);
  }

  /**
   * fromPoints(points, edges) : points are [x, y, z]. edges is [[i, j], ...] or
   * { closed } to join the points in order (and close the loop).
   */
  function fromPoints(points, edges) {
    const verts = [];
    const src = points || [];
    for (let i = 0; i < src.length; i++) {
      const p = src[i];
      verts.push([+p[0] || 0, +p[1] || 0, p.length > 2 ? +p[2] || 0 : 0]);
    }
    const out = [];
    if (Array.isArray(edges)) {
      for (let i = 0; i < edges.length; i++) out.push([edges[i][0] | 0, edges[i][1] | 0]);
    } else {
      for (let i = 1; i < verts.length; i++) out.push([i - 1, i]);
      if (edges && edges.closed && verts.length > 2) out.push([verts.length - 1, 0]);
    }
    return mesh(verts, out);
  }

  /**
   * tunnel(seg=8, rings=12, radius=1, length=12) : a polygonal tube from z = 0 down to z = -length,
   * flat side at the bottom, with faces. mesh.ringStep is the distance between rings: shift the
   * mesh by (travel % ringStep) along +z and the flight loops without a seam.
   */
  function tunnel(seg = 8, rings = 12, radius = 1, length = 12) {
    seg = Math.max(3, seg | 0);
    rings = Math.max(2, rings | 0);
    const step = length / (rings - 1);
    const verts = [];
    const edges = [];
    const faces = [];
    const id = (k, j) => k * seg + (j % seg);
    for (let k = 0; k < rings; k++) {
      for (let j = 0; j < seg; j++) {
        const a = ((j + 0.5) / seg) * TAU + Math.PI / 2;
        verts.push([Math.cos(a) * radius, Math.sin(a) * radius, -k * step]);
      }
    }
    for (let k = 0; k < rings; k++) {
      for (let j = 0; j < seg; j++) {
        edges.push([id(k, j), id(k, j + 1)]);
        if (k < rings - 1) {
          edges.push([id(k, j), id(k + 1, j)]);
          faces.push([id(k, j), id(k, j + 1), id(k + 1, j + 1), id(k + 1, j)]);
        }
      }
    }
    const m = mesh(verts, edges, faces);
    m.ringStep = step;
    return m;
  }

  const mesh3d = { box, sphere, cylinder, torus, helix, fromPoints, tunnel };
  for (const key of Object.keys(mesh3d)) Object.freeze(mesh3d[key]);
  lib.mesh3d = Object.freeze(mesh3d);

  /**
   * wire3d(ctx, mesh, opts) : project a { verts, edges } mesh and stroke every edge once.
   * Returns the number of edges stroked.
   *   at [W/2, H/2], scale 1, rot [0, 0, 0], persp 0, depthFade 0,
   *   hidden 'none' | 'dash' (an edge whose midpoint is farther than the mean
   *   vertex — smaller z — is dashed), color pal.lavender, width 1.5, nodes 0
   *   (circle radius in px at each vertex). Far edges thin and fade as depthFade
   *   goes from 0 to 1. Drawn far to near.
   */
  function wire3d(ctx, meshIn, o) {
    o = o || {};
    const verts = (meshIn && meshIn.verts) || [];
    const edges = (meshIn && meshIn.edges) || [];
    if (!verts.length || !edges.length) return 0;
    const v = viewOf(o);
    const proj = new Array(verts.length);
    let zSum = 0;
    let zMin = Infinity;
    let zMax = -Infinity;
    for (let i = 0; i < verts.length; i++) {
      const q = projectView(verts[i], v);
      proj[i] = q;
      zSum += q[2];
      if (q[2] < zMin) zMin = q[2];
      if (q[2] > zMax) zMax = q[2];
    }
    const zMean = zSum / verts.length;
    const zSpan = zMax - zMin;
    const fade = o.depthFade > 0 ? Math.min(1, o.depthFade) : 0;
    const width = o.width != null ? o.width : 1.5;
    const color = o.color || pal.lavender;
    const hidden = o.hidden === 'dash';
    const nodeR = o.nodes > 0 ? o.nodes : 0;
    const shade = (z) => 1 - fade * (1 - (zSpan ? (z - zMin) / zSpan : 1));
    const order = new Array(edges.length);
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];
      const z = (proj[e[0]][2] + proj[e[1]][2]) * 0.5;
      order[i] = { i, z, back: hidden && z < zMean };
    }
    order.sort((a, b) => (a.z - b.z) || (a.i - b.i));
    ctx.save();
    const baseAlpha = ctx.globalAlpha;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    let strokes = 0;
    const drawEdges = width > 0;
    if (drawEdges) {
      for (let k = 0; k < order.length; k++) {
        const item = order[k];
        const e = edges[item.i];
        const a = proj[e[0]];
        const b = proj[e[1]];
        const kFade = shade(item.z);
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.strokeStyle = color;
        ctx.globalAlpha = baseAlpha * kFade;
        ctx.lineWidth = width * kFade;
        ctx.setLineDash(item.back ? [8, 6] : []);
        ctx.stroke();
        strokes++;
      }
    }
    if (nodeR) {
      ctx.setLineDash([]);
      const nodes = new Array(verts.length);
      for (let i = 0; i < verts.length; i++) nodes[i] = i;
      nodes.sort((i, j) => (proj[i][2] - proj[j][2]) || (i - j));
      ctx.fillStyle = color;
      for (let n = 0; n < nodes.length; n++) {
        const q = proj[nodes[n]];
        ctx.globalAlpha = baseAlpha * shade(q[2]);
        ctx.beginPath();
        ctx.arc(q[0], q[1], nodeR, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
    return strokes;
  }
  lib.wire3d = wire3d;

  /**
   * faces3d(ctx, mesh, opts) : fill the faces of a mesh that has them (box, cylinder, tunnel),
   * far to near, each a flat tone from one light and a depth fog. Same view options as wire3d,
   * plus shift. Returns the number of faces drawn.
   *   color   pal.navyLight   a colour, or fill(i) returning one per face
   *   dark    '#000000'       the unlit tone
   *   light   [-0.4, 0.6, 1]  toward the light, in view space; faces are lit on both sides
   *   ambient 0.35
   *   fog 0 (0..1)   fogColor pal.navyDeep   far faces fade toward fogColor
   *   stroke null    edge colour; width 1   strokeAlpha 1
   *   near 0.1       with persp, faces closer to the camera than this are dropped (mesh units)
   */
  function faces3d(ctx, meshIn, o) {
    o = o || {};
    const verts = (meshIn && meshIn.verts) || [];
    const faces = (meshIn && meshIn.faces) || [];
    if (!verts.length || !faces.length) return 0;
    const v = viewOf(o);
    const rot = new Array(verts.length);
    const proj = new Array(verts.length);
    for (let i = 0; i < verts.length; i++) {
      const p = verts[i];
      rot[i] = rotateYUp((+p[0] || 0) + v.sx, (+p[1] || 0) + v.sy, (+p[2] || 0) + v.sz, v.rx, v.ry, v.rz);
      proj[i] = projectView(p, v);
    }
    const near = o.near != null ? +o.near : 0.1;
    const L0 = o.light || [-0.4, 0.6, 1];
    const Ll = Math.hypot(L0[0], L0[1], L0[2]) || 1;
    const L = [L0[0] / Ll, L0[1] / Ll, L0[2] / Ll];
    const ambient = o.ambient != null ? o.ambient : 0.35;
    const fog = o.fog > 0 ? Math.min(1, o.fog) : 0;
    const dark = parseColor(o.dark || '#000000');
    const fogC = parseColor(o.fogColor || pal.navyDeep);
    const list = [];
    let zMin = Infinity, zMax = -Infinity;
    for (let i = 0; i < faces.length; i++) {
      const f = faces[i];
      if (!f || f.length < 3) continue;
      let z = 0;
      let cut = false;
      for (let k = 0; k < f.length; k++) {
        const r = rot[f[k]];
        if (!r) {
          cut = true;
          break;
        }
        if (v.persp && v.persp - r[2] < near) cut = true;
        z += r[2];
      }
      if (cut) continue;
      z /= f.length;
      if (z < zMin) zMin = z;
      if (z > zMax) zMax = z;
      list.push({ i, z });
    }
    list.sort((a, b) => (a.z - b.z) || (a.i - b.i));
    const zSpan = zMax - zMin;
    ctx.save();
    const width = o.width != null ? o.width : 1;
    for (let n = 0; n < list.length; n++) {
      const { i, z } = list[n];
      const f = faces[i];
      const a = rot[f[0]], b = rot[f[1]], c = rot[f[2]];
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
      const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const nl = Math.hypot(nx, ny, nz) || 1;
      const lit = ambient + (1 - ambient) * Math.abs((nx * L[0] + ny * L[1] + nz * L[2]) / nl);
      const base = parseColor(typeof o.color === 'function' ? o.color(i) : o.color || pal.navyLight);
      const far = fog * (zSpan > 0 ? (zMax - z) / zSpan : 0);
      const ch = (k) => {
        const s = dark[k] + (base[k] - dark[k]) * lit;
        return Math.round(s + (fogC[k] - s) * far);
      };
      ctx.beginPath();
      for (let k = 0; k < f.length; k++) {
        const q = proj[f[k]];
        if (k) ctx.lineTo(q[0], q[1]);
        else ctx.moveTo(q[0], q[1]);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgb(' + ch(0) + ',' + ch(1) + ',' + ch(2) + ')';
      ctx.fill();
      if (o.stroke) {
        ctx.globalAlpha = (o.strokeAlpha != null ? o.strokeAlpha : 1) * (1 - far);
        ctx.strokeStyle = o.stroke;
        ctx.lineWidth = width;
        ctx.lineJoin = 'round';
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
    return list.length;
  }
  lib.faces3d = faces3d;

  /**
   * isolines(field, box, level, opts) : contour lines of a scalar field (marching squares).
   * field(x, y) returns a number (values above the level are inside); box is [x, y, w, h]; the
   * field is sampled on a grid of about `cell` px. Returns [{ pts, closed }]: closed loops where
   * the contour stays inside the box, open chains where it leaves it. Saddle cells are decided
   * by the value at the cell's centre. Pass an array of levels to get one list per level from
   * one sampling of the grid.
   *   cell 12
   */
  function isolines(field, box, level, o = {}) {
    const [bx, by, bw, bh] = box;
    const cell = Math.max(1, o.cell || 12);
    const nx = Math.max(1, Math.ceil(bw / cell));
    const ny = Math.max(1, Math.ceil(bh / cell));
    const cx = bw / nx, cy = bh / ny;
    const stride = nx + 1;
    const val = new Float64Array(stride * (ny + 1));
    for (let j = 0; j <= ny; j++) {
      for (let i = 0; i <= nx; i++) {
        const f = +field(bx + i * cx, by + j * cy);
        val[j * stride + i] = Number.isFinite(f) ? f : -Infinity;
      }
    }
    const levels = Array.isArray(level) ? level : [level];
    const out = levels.map((L) => contour(L));
    return Array.isArray(level) ? out : out[0];

    function contour(L) {
      // edge ids: horizontal (i,j)-(i+1,j) is 2k, vertical (i,j)-(i,j+1) is 2k+1, k = j*stride+i
      const pts = new Map();
      const point = (e) => {
        let p = pts.get(e);
        if (p) return p;
        const k = e >> 1;
        const i = k % stride, j = (k - i) / stride;
        const k2 = e & 1 ? k + stride : k + 1;
        const va = val[k], vb = val[k2];
        let t = va === vb ? 0.5 : (L - va) / (vb - va);
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        p = e & 1 ? [bx + i * cx, by + (j + t) * cy] : [bx + (i + t) * cx, by + j * cy];
        pts.set(e, p);
        return p;
      };
      const segs = [];
      const adj = new Map();
      const add = (e1, e2) => {
        const s = segs.length;
        segs.push([e1, e2]);
        for (const e of [e1, e2]) {
          const l = adj.get(e);
          if (l) l.push(s);
          else adj.set(e, [s]);
        }
      };
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const k = j * stride + i;
          const a = val[k], b = val[k + 1], c = val[k + stride + 1], d = val[k + stride];
          const code = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (c > L ? 2 : 0) | (d > L ? 1 : 0);
          if (code === 0 || code === 15) continue;
          const T = 2 * k, R = 2 * (k + 1) + 1, B = 2 * (k + stride), Lf = 2 * k + 1;
          const mid = () => (a + b + c + d) / 4 > L;
          switch (code) {
            case 1: case 14: add(Lf, B); break;
            case 2: case 13: add(B, R); break;
            case 3: case 12: add(Lf, R); break;
            case 4: case 11: add(T, R); break;
            case 6: case 9: add(T, B); break;
            case 7: case 8: add(Lf, T); break;
            case 5: if (mid()) { add(Lf, T); add(R, B); } else { add(T, R); add(Lf, B); } break;
            case 10: if (mid()) { add(T, R); add(Lf, B); } else { add(Lf, T); add(R, B); } break;
          }
        }
      }
      const used = new Uint8Array(segs.length);
      const lines = [];
      const walk = (s0, e0) => {
        const line = [point(e0)];
        let s = s0, from = e0, closed = false;
        for (;;) {
          used[s] = 1;
          const e = segs[s][0] === from ? segs[s][1] : segs[s][0];
          if (e === e0) {
            closed = true;
            break;
          }
          line.push(point(e));
          const next = adj.get(e).find((q) => !used[q]);
          if (next === undefined) break;
          s = next;
          from = e;
        }
        lines.push({ pts: line, closed });
      };
      for (const [e, l] of adj) if (l.length === 1 && !used[l[0]]) walk(l[0], e);
      for (let s = 0; s < segs.length; s++) if (!used[s]) walk(s, segs[s][0]);
      return lines;
    }
  }
  lib.isolines = isolines;

  /** blobField(balls) : metaball field of [[x, y, r], ...], the sum of r²/d². 1 is a lone ball's rim. */
  function blobField(balls) {
    return (x, y) => {
      let s = 0;
      for (let i = 0; i < balls.length; i++) {
        const b = balls[i];
        const dx = x - b[0], dy = y - b[1];
        s += (b[2] * b[2]) / (dx * dx + dy * dy + 1e-6);
      }
      return s;
    };
  }
  lib.blobField = blobField;

  /**
   * blob(ctx, balls, opts) : a liquid body, the rim (level 1) of the metaball field of
   * [[x, y, r], ...]: balls merge where they meet and split as they part. Filled even-odd (so a
   * hole stays a hole), outlined, and optionally marbled with contours at higher levels.
   * Returns the rim loops.
   *   fill pal.white (null for none)   stroke pal.ink (null for none)   width 3
   *   marble 0          inner contours at levels 1.35, 1.9, 2.8, …
   *   marbleColor stroke   marbleWidth width × 0.45   marbleAlpha 0.6
   *   warp 0            px of domain warp (fbm2): the rim flows
   *   phase 0           moves the warp (pass a time, or lib.boil(T) × 0.3 to boil)
   *   seed 7   cell 10   pad 1.8 (the sampled box is the balls ± r × pad, plus warp)
   */
  function blob(ctx, balls, o = {}) {
    if (!balls || !balls.length) return [];
    const pad = o.pad != null ? o.pad : 1.8;
    const warp = o.warp || 0;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const b of balls) {
      const r = b[2] * pad + warp;
      x0 = Math.min(x0, b[0] - r);
      y0 = Math.min(y0, b[1] - r);
      x1 = Math.max(x1, b[0] + r);
      y1 = Math.max(y1, b[1] + r);
    }
    const base = blobField(balls);
    const seed = seedInt(o.seed === undefined ? 7 : o.seed);
    const ph = o.phase || 0;
    const field = warp
      ? (x, y) => base(x + warp * lib.fbm2(x * 0.006 + ph, y * 0.006, seed), y + warp * lib.fbm2(x * 0.006, y * 0.006 - ph, seed + 1))
      : base;
    const marble = Math.max(0, o.marble | 0);
    const levels = [1];
    for (let k = 0; k < marble; k++) levels.push(1 + 0.35 * Math.pow(1.3, k) * (k + 1));
    const sets = isolines(field, [x0, y0, x1 - x0, y1 - y0], levels, { cell: o.cell || 10 });
    const trace = (lines) => {
      ctx.beginPath();
      for (const l of lines) {
        const p = l.closed && l.pts.length > 3 ? lib.smoothPts(l.pts, true, 5) : l.pts;
        lib.tracePath(ctx, p, l.closed);
      }
    };
    const width = o.width != null ? o.width : 3;
    const stroke = o.stroke === undefined ? pal.ink : o.stroke;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    trace(sets[0]);
    if (o.fill !== null) {
      ctx.fillStyle = o.fill || pal.white;
      ctx.fill('evenodd');
    }
    for (let k = 1; k < sets.length; k++) {
      trace(sets[k]);
      ctx.globalAlpha = o.marbleAlpha != null ? o.marbleAlpha : 0.6;
      ctx.strokeStyle = o.marbleColor || stroke || pal.ink;
      ctx.lineWidth = o.marbleWidth != null ? o.marbleWidth : width * 0.45;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (stroke && width > 0) {
      trace(sets[0]);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.stroke();
    }
    ctx.restore();
    return sets[0];
  }
  lib.blob = blob;

  // ===========================================================================
  // Maps and plots
  // ===========================================================================

  const DEG = Math.PI / 180;
  const MERC_LIMIT = 85.0511287798;

  function finite(v, d) {
    return v != null && isFinite(v) ? v : d;
  }

  // px per degree. A number is isotropic; [sx, sy] stretches longitude and latitude apart
  // (the butterfly G6 plate is 27 by 32). Orthographic ignores sy and uses sx as the radius.
  function projScale(scale) {
    if (Array.isArray(scale)) {
      const sx = finite(scale[0], 1);
      return [sx, scale.length > 1 ? finite(scale[1], sx) : sx];
    }
    const s = finite(scale, 1);
    return [s, s];
  }

  function mercNorth(lat) {
    const φ = clamp(lat, -MERC_LIMIT, MERC_LIMIT) * DEG;
    return Math.log(Math.tan(Math.PI / 4 + φ / 2)) / DEG;
  }

  /**
   * projection(opts) → { project(lon, lat) → [x, y] | null, invert(x, y) → [lon, lat] | null }
   *   kind   'equirect' | 'mercator' | 'ortho'   (default equirect)
   *   lon0   0      longitude at `at` (degrees, west negative)
   *   lat0   0      latitude at `at`
   *   scale  1      px per degree, or [sx, sy]. ortho: globe radius in px (a pair uses the first)
   *   at     [0, 0] screen point of (lon0, lat0). y grows south, as on the frame.
   *   rot    0      roll about `at`, radians, clockwise on the screen (same sense as ctx.rotate)
   * ortho returns null on the far side of the limb (the limb itself is kept). mercator returns
   * null past ±85.05°, so a meridian stops instead of running away to infinity.
   */
  function projection(o = {}) {
    const kind = o.kind || 'equirect';
    const lon0 = finite(o.lon0, 0);
    const lat0 = finite(o.lat0, 0);
    const pair = projScale(o.scale);
    const sx = pair[0];
    const sy = pair[1];
    const radius = Array.isArray(o.scale) ? finite(o.scale[0], 1) : finite(o.scale, 1);
    const at = o.at || [0, 0];
    const ax = finite(at[0], 0);
    const ay = finite(at[1], 0);
    const rot = finite(o.rot, 0);
    const cr = Math.cos(rot);
    const sr = Math.sin(rot);
    const ortho = kind === 'ortho';
    const merc = kind === 'mercator';

    // mx east, my north, in px. Screen y is down.
    function toScreen(mx, my) {
      let dx = mx;
      let dy = -my;
      if (rot) {
        const ndx = dx * cr - dy * sr;
        const ndy = dx * sr + dy * cr;
        dx = ndx;
        dy = ndy;
      }
      return [ax + dx, ay + dy];
    }
    function fromScreen(x, y) {
      let dx = x - ax;
      let dy = y - ay;
      if (rot) {
        const ndx = dx * cr + dy * sr;
        const ndy = -dx * sr + dy * cr;
        dx = ndx;
        dy = ndy;
      }
      return [dx, -dy];
    }

    function project(lon, lat) {
      if (!isFinite(lon) || !isFinite(lat)) return null;
      if (ortho) {
        if (!(radius > 0)) return null;
        const λ = (lon - lon0) * DEG;
        const φ = lat * DEG;
        const φ1 = lat0 * DEG;
        const cosc = Math.sin(φ1) * Math.sin(φ) + Math.cos(φ1) * Math.cos(φ) * Math.cos(λ);
        if (!(cosc >= 0)) return null;
        const mx = radius * Math.cos(φ) * Math.sin(λ);
        const my = radius * (Math.cos(φ1) * Math.sin(φ) - Math.sin(φ1) * Math.cos(φ) * Math.cos(λ));
        return toScreen(mx, my);
      }
      if (merc) {
        if (lat <= -MERC_LIMIT || lat >= MERC_LIMIT) return null;
        return toScreen((lon - lon0) * sx, (mercNorth(lat) - mercNorth(lat0)) * sy);
      }
      return toScreen((lon - lon0) * sx, (lat - lat0) * sy);
    }

    function invert(x, y) {
      if (!isFinite(x) || !isFinite(y)) return null;
      const m = fromScreen(x, y);
      const mx = m[0];
      const my = m[1];
      if (ortho) {
        if (!(radius > 0)) return null;
        const ρ = Math.hypot(mx, my);
        if (ρ > radius * (1 + 1e-9)) return null;
        const φ1 = lat0 * DEG;
        if (ρ <= 1e-9 * radius) return [lon0, lat0];
        const c = Math.asin(clamp(ρ / radius, 0, 1));
        const sinC = Math.sin(c);
        const cosC = Math.cos(c);
        const φ = Math.asin(clamp(cosC * Math.sin(φ1) + (my * sinC * Math.cos(φ1)) / ρ, -1, 1));
        const λ = Math.atan2(mx * sinC, ρ * Math.cos(φ1) * cosC - my * Math.sin(φ1) * sinC);
        return [lon0 + λ / DEG, φ / DEG];
      }
      if (merc) {
        const latM = my / (sy || 1) + mercNorth(lat0);
        const φ = 2 * Math.atan(Math.exp(latM * DEG)) - Math.PI / 2;
        return [lon0 + mx / (sx || 1), φ / DEG];
      }
      return [lon0 + mx / (sx || 1), lat0 + my / (sy || 1)];
    }

    return {
      kind: ortho ? 'ortho' : merc ? 'mercator' : 'equirect',
      project,
      invert,
      at: [ax, ay],
      r: ortho ? radius : null,
      lon0,
      lat0,
      rot,
      scale: ortho ? radius : [sx, sy],
    };
  }
  lib.projection = projection;

  function midLonLat(a, b) {
    let dlon = b[0] - a[0];
    if (dlon > 180) dlon -= 360;
    else if (dlon < -180) dlon += 360;
    let lon = a[0] + dlon * 0.5;
    if (lon > 180) lon -= 360;
    else if (lon < -180) lon += 360;
    return [lon, (a[1] + b[1]) * 0.5];
  }

  // Last visible point between a hidden sample and a visible one, so a line ends on the limb
  // instead of stopping a sample early or bridging the far side.
  function limbPoint(project, hidden, visible) {
    let a = hidden;
    let b = visible;
    for (let k = 0; k < 16; k++) {
      const m = midLonLat(a, b);
      if (project(m[0], m[1])) b = m;
      else a = m;
    }
    return project(b[0], b[1]);
  }

  function visibleRuns(project, llPts) {
    const runs = [];
    let run = null;
    let prevLL = null;
    let prevP = null;
    const flush = () => {
      if (run && run.length >= 2) runs.push(run);
      run = null;
    };
    for (let i = 0; i < llPts.length; i++) {
      const ll = llPts[i];
      const p = project(ll[0], ll[1]);
      if (p && prevP) {
        // A dateline wrap (or any sample that teleports across the map) must break the stroke.
        // Limb crossings are already split by a null sample, so this only catches the jump.
        let sudden = false;
        if (run && run.length >= 2) {
          const jump = Math.hypot(p[0] - prevP[0], p[1] - prevP[1]);
          const prevJump = Math.hypot(run[run.length - 1][0] - run[run.length - 2][0], run[run.length - 1][1] - run[run.length - 2][1]);
          sudden = jump > 80 && jump > Math.max(prevJump, 1) * 8;
        }
        if (sudden) {
          flush();
          run = [p];
        } else run.push(p);
      } else if (p && !prevP) {
        const edge = prevLL ? limbPoint(project, prevLL, ll) : null;
        run = edge ? [edge, p] : [p];
      } else if (!p && prevP) {
        const edge = prevLL ? limbPoint(project, ll, prevLL) : null;
        if (edge) run.push(edge);
        flush();
      }
      prevLL = ll;
      prevP = p;
    }
    flush();
    return runs;
  }

  function splitDash(run, on, off) {
    const period = on + off;
    const pieces = [];
    let cur = null;
    let along = 0;
    for (let i = 1; i < run.length; i++) {
      const ax = run[i - 1][0];
      const ay = run[i - 1][1];
      const bx = run[i][0];
      const by = run[i][1];
      const len = Math.hypot(bx - ax, by - ay);
      if (!(len > 0)) continue;
      let consumed = 0;
      let guard = 0;
      while (consumed < len - 1e-4 && guard++ < 20000) {
        const phase = along % period;
        const onNow = phase < on;
        const room = onNow ? on - phase : period - phase;
        const take = Math.min(Math.max(room, 1e-6), len - consumed);
        const t0 = consumed / len;
        const t1 = (consumed + take) / len;
        const x1 = ax + (bx - ax) * t1;
        const y1 = ay + (by - ay) * t1;
        if (onNow) {
          if (!cur) cur = [[ax + (bx - ax) * t0, ay + (by - ay) * t0]];
          cur.push([x1, y1]);
        }
        consumed += take;
        along += take;
        const onNext = along % period < on - 1e-8;
        if (onNow && !onNext) {
          if (cur && cur.length >= 2) pieces.push(cur);
          cur = null;
        }
      }
    }
    if (cur && cur.length >= 2) pieces.push(cur);
    return pieces;
  }

  function inkGeo(ctx, runs, o) {
    const dash = Array.isArray(o.dash) && o.dash[0] > 0 ? o.dash : null;
    const on = dash ? o.dash[0] : 0;
    const off = dash ? (o.dash[1] > 0 ? o.dash[1] : o.dash[0]) : 0;
    const baseSeed = o.seed != null ? o.seed : 1;
    let n = 0;
    for (let r = 0; r < runs.length; r++) {
      const pieces = dash ? splitDash(runs[r], on, off) : [runs[r]];
      for (let p = 0; p < pieces.length; p++) {
        const piece = pieces[p];
        if (piece.length < 2) continue;
        const meet = !dash && piece.length > 3 && Math.hypot(piece[0][0] - piece[piece.length - 1][0], piece[0][1] - piece[piece.length - 1][1]) < 1.5;
        inkPath(ctx, piece, {
          color: o.color,
          width: o.width,
          alpha: o.alpha,
          seed: baseSeed + n * 17,
          smooth: dash ? false : o.smooth,
          step: o.penStep,
          wobble: o.wobble,
          wobbleFreq: o.wobbleFreq,
          tremble: o.tremble,
          rough: o.rough,
          boil: o.boil,
          boilAmp: o.boilAmp,
          taper: o.taper,
          minWidth: o.minWidth,
          swell: o.swell,
          widthJitter: o.widthJitter,
          closed: meet,
        });
        n++;
      }
    }
  }

  function clipDisc(ctx, proj, clipCircle) {
    if (!clipCircle) return 0;
    const radius = clipCircle === true ? proj.r : clipCircle;
    if (!(radius > 0) || !proj.at) return 0;
    ctx.beginPath();
    ctx.arc(proj.at[0], proj.at[1], radius, 0, TAU);
    ctx.clip();
    return radius;
  }

  /**
   * graticule(ctx, proj, opts) : meridians and parallels through inkPath.
   *   step        10     degrees between lines
   *   color       pal.inkFaint
   *   width       1.4
   *   alpha       0.9
   *   dash        null   [on, off] in px; each dash is its own ink stroke
   *   clipCircle  false  true clips to the ortho disc (proj.r); a number is that radius
   *   seed, wobble, smooth, penStep, taper  passed through to the pen
   * Lines stop at the limb. A parallel that goes behind the globe is two strokes, not one
   * line across the back.
   */
  function graticule(ctx, proj, o = {}) {
    if (!ctx || !proj || typeof proj.project !== 'function') return;
    const step = o.step > 0 ? o.step : 10;
    const sample = o.sample > 0 ? o.sample : Math.min(step, 4);
    const ink = {
      color: o.color || pal.inkFaint,
      width: o.width != null ? o.width : 1.4,
      alpha: o.alpha != null ? o.alpha : 0.9,
      seed: o.seed != null ? o.seed : 3,
      smooth: o.smooth !== false,
      penStep: o.penStep || 4,
      wobble: o.wobble != null ? o.wobble : 0.8,
      wobbleFreq: o.wobbleFreq,
      tremble: o.tremble != null ? o.tremble : 0.2,
      rough: o.rough,
      boil: o.boil,
      boilAmp: o.boilAmp,
      taper: o.taper != null ? o.taper : [6, 6],
      minWidth: o.minWidth,
      swell: o.swell != null ? o.swell : 0,
      widthJitter: o.widthJitter != null ? o.widthJitter : 0.22,
      dash: o.dash,
    };
    const lats = [];
    const lons = [];
    const iLat0 = Math.ceil(-90 / step - 1e-9);
    const iLat1 = Math.floor(90 / step + 1e-9);
    for (let i = iLat0; i <= iLat1; i++) {
      const lat = i * step;
      if (lat <= -90 + 1e-6 || lat >= 90 - 1e-6) continue;
      lats.push(Math.abs(lat) < 1e-9 ? 0 : lat);
    }
    const iLon0 = Math.ceil(-180 / step - 1e-9);
    const iLon1 = Math.floor(180 / step + 1e-9);
    for (let i = iLon0; i <= iLon1; i++) {
      const lon = i * step;
      if (lon >= 180 - 1e-6 || lon < -180 - 1e-6) continue;
      lons.push(Math.abs(lon) < 1e-9 ? 0 : lon);
    }
    const nLat = Math.max(1, Math.ceil(180 / sample));
    const nLon = Math.max(1, Math.ceil(360 / sample));
    ctx.save();
    try {
      clipDisc(ctx, proj, o.clipCircle);
      for (let a = 0; a < lons.length; a++) {
        const lon = lons[a];
        const pts = new Array(nLat + 1);
        for (let i = 0; i <= nLat; i++) pts[i] = [lon, -90 + (180 * i) / nLat];
        ink.seed = (o.seed != null ? o.seed : 3) + a * 2;
        inkGeo(ctx, visibleRuns(proj.project, pts), ink);
      }
      for (let b = 0; b < lats.length; b++) {
        const lat = lats[b];
        const pts = new Array(nLon + 1);
        for (let i = 0; i <= nLon; i++) {
          let lon = -180 + (360 * i) / nLon;
          if (lon > 180) lon = 180;
          pts[i] = [Math.abs(lon) < 1e-9 ? 0 : lon, lat];
        }
        ink.seed = (o.seed != null ? o.seed : 3) + 1000 + b * 2;
        inkGeo(ctx, visibleRuns(proj.project, pts), ink);
      }
    } finally {
      ctx.restore();
    }
  }
  lib.graticule = graticule;

  function densifyLonLat(pts, maxDeg) {
    const out = [];
    const push = (lon, lat) => {
      const prev = out[out.length - 1];
      if (prev && Math.abs(prev[0] - lon) < 1e-9 && Math.abs(prev[1] - lat) < 1e-9) return;
      out.push([lon, lat]);
    };
    push(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      let dlon = b[0] - a[0];
      if (dlon > 180) dlon -= 360;
      else if (dlon < -180) dlon += 360;
      const dlat = b[1] - a[1];
      const n = Math.max(1, Math.ceil(Math.hypot(dlon, dlat) / maxDeg));
      for (let k = 1; k <= n; k++) {
        const t = k / n;
        let lon = a[0] + dlon * t;
        if (lon > 180) lon -= 360;
        else if (lon < -180) lon += 360;
        push(lon, a[1] + dlat * t);
      }
    }
    return out;
  }

  /**
   * drawGeoLine(ctx, proj, [[lon, lat], ...], opts) : a geographic polyline.
   * The stroke breaks wherever a segment crosses the far side (or a mercator pole), and each
   * visible run is its own inkPath, so the line cannot bridge the back of a globe.
   * opts are inkPath options, plus dash: [on, off] and sample (max degrees between samples, default 2).
   */
  function drawGeoLine(ctx, proj, pts, o = {}) {
    if (!ctx || !proj || typeof proj.project !== 'function' || !pts || pts.length < 2) return;
    const ll = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (!p || !isFinite(p[0]) || !isFinite(p[1])) continue;
      ll.push([p[0], p[1]]);
    }
    if (ll.length < 2) return;
    const dense = densifyLonLat(ll, o.sample > 0 ? o.sample : 2);
    inkGeo(ctx, visibleRuns(proj.project, dense), {
      color: o.color,
      width: o.width,
      alpha: o.alpha,
      seed: o.seed,
      smooth: o.smooth,
      penStep: o.step,
      wobble: o.wobble,
      wobbleFreq: o.wobbleFreq,
      tremble: o.tremble,
      rough: o.rough,
      boil: o.boil,
      boilAmp: o.boilAmp,
      taper: o.taper,
      minWidth: o.minWidth,
      swell: o.swell,
      widthJitter: o.widthJitter,
      dash: o.dash,
    });
  }
  lib.drawGeoLine = drawGeoLine;

  // Heckbert's "nice number": 1, 2 or 5 times a power of ten.
  function niceStep(span, intervals) {
    const raw = Math.abs(span) / Math.max(1, intervals);
    if (!(raw > 0) || !isFinite(raw)) return 1;
    const exp = Math.floor(Math.log10(raw));
    const base = Math.pow(10, exp);
    const frac = raw / base;
    const mant = frac < 1.5 ? 1 : frac < 3 ? 2 : frac < 7 ? 5 : 10;
    return mant * base;
  }

  function niceTickValues(min, max, intervals) {
    if (!isFinite(min) || !isFinite(max)) return [];
    if (max < min) {
      const swap = min;
      min = max;
      max = swap;
    }
    if (!(max > min)) return [min];
    const step = niceStep(max - min, intervals == null ? 5 : intervals);
    const i0 = Math.ceil(min / step - 1e-6);
    const i1 = Math.floor(max / step + 1e-6);
    const out = [];
    const cap = Math.min(i1, i0 + 40);
    for (let i = i0; i <= cap; i++) {
      const r = i * step;
      const v = Math.abs(r) < Math.abs(step) * 1e-8 ? 0 : Number(r.toPrecision(12));
      if (v < min - Math.abs(step) * 1e-4 || v > max + Math.abs(step) * 1e-4) continue;
      if (!out.length || v !== out[out.length - 1]) out.push(v);
    }
    return out;
  }

  function tickSpec(ticks, axis) {
    if (ticks == null || typeof ticks === 'number' || Array.isArray(ticks)) return ticks == null ? 5 : ticks;
    const s = ticks[axis];
    return s == null ? 5 : s;
  }

  function resolveTicks(min, max, spec) {
    if (Array.isArray(spec)) {
      const out = [];
      for (let i = 0; i < spec.length; i++) if (isFinite(spec[i])) out.push(spec[i]);
      out.sort((a, b) => a - b);
      return out;
    }
    return niceTickValues(min, max, spec);
  }

  function fmtTick(v) {
    if (!isFinite(v)) return '';
    const av = Math.abs(v);
    if (av !== 0 && (av >= 10000 || av < 0.01)) {
      const e = Math.floor(Math.log10(av));
      const m = v / Math.pow(10, e);
      return String(Math.round(m * 100) / 100) + 'e' + e;
    }
    return String(Math.round(v * 1000) / 1000);
  }

  /**
   * plot(ctx, opts) : axes, nice ticks and one or more curves.
   *   box      [x, y, w, h]     data rectangle; y is the top edge
   *   x, y     [min, max]       data ranges
   *   ticks    5                target division count, { x, y } of counts or value arrays, or one value array for both axes
   *   series   [{ pts: [[x, y], ...], color, width, reveal, seed, alpha }]
   *            reveal is 0..1 and is passed to inkPath, so taper and wobble stay on the full curve.
   *   labels   { x, y, title } or [xLabel, yLabel]
   *   color    pal.ink          axes, grid and tick labels
   *   width    1.8
   *   seed     1
   * Returns { x: [tick values], y: [tick values] }. Tick steps are 1, 2 or 5 × 10^k.
   */
  function plot(ctx, o = {}) {
    const box = o.box || [80, 80, 400, 300];
    const xr = o.x || [0, 1];
    const yr = o.y || [0, 1];
    let xMin = finite(xr[0], 0);
    let xMax = finite(xr[1], 1);
    let yMin = finite(yr[0], 0);
    let yMax = finite(yr[1], 1);
    if (xMax === xMin) xMax = xMin + 1;
    if (yMax === yMin) yMax = yMin + 1;
    const xTicks = resolveTicks(xMin, xMax, tickSpec(o.ticks, 'x'));
    const yTicks = resolveTicks(yMin, yMax, tickSpec(o.ticks, 'y'));
    if (ctx) {
      const color = o.color || pal.ink;
      const width = o.width != null ? o.width : 1.8;
      const seed = o.seed != null ? o.seed : 1;
      const xSpan = xMax - xMin;
      const ySpan = yMax - yMin;
      const X = (v) => box[0] + ((v - xMin) / xSpan) * box[2];
      const Y = (v) => box[1] + box[3] - ((v - yMin) / ySpan) * box[3];
      const labs = Array.isArray(o.labels) ? { x: o.labels[0], y: o.labels[1] } : o.labels || {};
      ctx.save();
      ctx.beginPath();
      ctx.rect(box[0], box[1], box[2], box[3]);
      ctx.clip();
      ctx.globalAlpha *= 0.28;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      for (let i = 0; i < xTicks.length; i++) {
        const x = X(xTicks[i]);
        ctx.moveTo(x, box[1]);
        ctx.lineTo(x, box[1] + box[3]);
      }
      for (let i = 0; i < yTicks.length; i++) {
        const y = Y(yTicks[i]);
        ctx.moveTo(box[0], y);
        ctx.lineTo(box[0] + box[2], y);
      }
      ctx.stroke();
      ctx.restore();
      const axis = { color, width, seed, smooth: false, wobble: 0.7, step: 6, taper: [4, 4], swell: 0 };
      inkPath(ctx, [[box[0], box[1] + box[3]], [box[0] + box[2], box[1] + box[3]]], axis);
      inkPath(ctx, [[box[0], box[1] + box[3]], [box[0], box[1]]], Object.assign({}, axis, { seed: seed + 1 }));
      for (let i = 0; i < xTicks.length; i++) {
        const x = X(xTicks[i]);
        const y = box[1] + box[3];
        inkPath(ctx, [[x, y], [x, y + 9]], Object.assign({}, axis, { width: width * 0.8, seed: seed + 20 + i, step: 3 }));
        lib.text(ctx, fmtTick(xTicks[i]), x, y + 28, { size: 18, color, align: 'center', baseline: 'top' });
      }
      for (let i = 0; i < yTicks.length; i++) {
        const y = Y(yTicks[i]);
        inkPath(ctx, [[box[0], y], [box[0] - 9, y]], Object.assign({}, axis, { width: width * 0.8, seed: seed + 40 + i, step: 3 }));
        lib.text(ctx, fmtTick(yTicks[i]), box[0] - 16, y, { size: 18, color, align: 'right', baseline: 'middle' });
      }
      if (labs.x) lib.text(ctx, labs.x, box[0] + box[2] / 2, box[1] + box[3] + 58, { size: 22, color, align: 'center', baseline: 'top' });
      if (labs.y) {
        ctx.save();
        ctx.translate(box[0] - 96, box[1] + box[3] / 2);
        ctx.rotate(-Math.PI / 2);
        lib.text(ctx, labs.y, 0, 0, { size: 22, color, align: 'center', baseline: 'middle' });
        ctx.restore();
      }
      if (labs.title) lib.text(ctx, labs.title, box[0], box[1] - 18, { size: 28, color, align: 'left', baseline: 'bottom' });
      ctx.save();
      ctx.beginPath();
      ctx.rect(box[0], box[1], box[2], box[3]);
      ctx.clip();
      const series = o.series || [];
      for (let s = 0; s < series.length; s++) {
        const ser = series[s] || {};
        const src = ser.pts || [];
        const px = [];
        for (let i = 0; i < src.length; i++) {
          const p = src[i];
          if (!p || !isFinite(p[0]) || !isFinite(p[1])) continue;
          px.push([X(p[0]), Y(p[1])]);
        }
        if (px.length >= 2 && ser.reveal !== 0) {
          inkPath(ctx, px, {
            color: ser.color || color,
            width: ser.width != null ? ser.width : width + 0.6,
            alpha: ser.alpha,
            seed: ser.seed != null ? ser.seed : seed + 80 + s,
            smooth: ser.smooth !== false,
            wobble: ser.wobble != null ? ser.wobble : 1.1,
            step: ser.step || 3.5,
            taper: ser.taper != null ? ser.taper : [10, 16],
            reveal: ser.reveal,
          });
        }
      }
      ctx.restore();
    }
    return { x: xTicks, y: yTicks };
  }
  lib.plot = plot;

  // ===========================================================================
  // Ramp
  // ===========================================================================

  // Colour scales made of lib.pal names, so a false-colour relief, a heat map or a cooling glow
  // stays on the published palette with no hex in scene code. A ramp is a list of stops: a pal
  // name (spaced evenly from 0 to 1) or [at, name] with at in 0..1, never decreasing (two stops at
  // the same at make a hard edge). Colours mix linearly in RGB, like lib.mix.
  //
  // Named ramps live in this table. A theme or a film adds its own rows here, next to the colours
  // its 2.2 rows add to the palette, for example
  //     crater: ['craterDeep', 'crater', 'craterHot', 'yolk'],
  // The rows below use only the 2.1 and 2.3 names, which every film's palette carries.
  const ramps = {
    heat: ['night', 'dusk', 'red', 'orange', 'sun', 'white'],
    terrain: [[0, 'tealDeep'], [0.38, 'teal'], [0.4, 'paperDeep'], [0.62, 'sage'], [0.82, 'wood'], [1, 'white']],
    blueprint: ['navyDeep', 'navy', 'grid', 'paleBlue', 'lineWhite'],
    tone: ['paper', 'tan', 'inkFaint', 'inkSoft', 'ink'],
  };
  for (const k of Object.keys(ramps)) {
    for (const s of ramps[k]) if (Array.isArray(s)) Object.freeze(s);
    Object.freeze(ramps[k]);
  }
  Object.freeze(ramps);

  // Resolved ramps: by name, by list identity, and by the list's text (an inline literal list is
  // a new array every frame, so its text finds the one already built). Never keyed by time.
  const rampByName = new Map();
  const rampByList = new WeakMap();
  const rampByText = new Map();

  function buildRamp(list, label) {
    if (!Array.isArray(list) || list.length < 2) {
      throw new TypeError(`lib.ramp ${label}: a ramp needs at least two stops`);
    }
    const n = list.length;
    const at = new Float64Array(n);
    const rgb = [];
    const stops = [];
    let prev = 0;
    for (let i = 0; i < n; i++) {
      const s = list[i];
      const pos = typeof s === 'string' ? i / (n - 1) : Array.isArray(s) ? s[0] : NaN;
      const name = typeof s === 'string' ? s : Array.isArray(s) ? s[1] : undefined;
      if (!(pos >= 0 && pos <= 1) || pos < prev) {
        throw new TypeError(`lib.ramp ${label}: stop ${i} needs a position in 0..1, not below the stop before it`);
      }
      if (typeof name !== 'string' || typeof pal[name] !== 'string') {
        throw new TypeError(`lib.ramp ${label}: stop ${i} '${String(name)}' is not a lib.pal name`);
      }
      prev = pos;
      at[i] = pos;
      rgb.push(parseColor(pal[name]));
      stops.push(Object.freeze([pos, pal[name]]));
    }
    return { at, rgb, stops: Object.freeze(stops) };
  }

  function rampOf(spec) {
    if (typeof spec === 'string') {
      let R = rampByName.get(spec);
      if (!R) {
        if (!Object.prototype.hasOwnProperty.call(ramps, spec)) {
          throw new TypeError(
            `lib.ramp: no ramp named '${spec}' (named: ${Object.keys(ramps).join(', ')}); ` +
              `add a row to the ramps table in lib.js, or pass a list of lib.pal names`
          );
        }
        R = buildRamp(ramps[spec], `'${spec}'`);
        rampByName.set(spec, R);
      }
      return R;
    }
    if (Array.isArray(spec)) {
      let R = rampByList.get(spec);
      if (!R) {
        const text = JSON.stringify(spec);
        R = rampByText.get(text);
        if (!R) {
          R = buildRamp(spec, text);
          rampByText.set(text, R);
        }
        rampByList.set(spec, R);
      }
      return R;
    }
    throw new TypeError('lib.ramp: pass a ramp name or a list of lib.pal names');
  }

  function rampEval(R, v, out) {
    const at = R.at;
    const x = v > 0 ? (v < 1 ? v : 1) : 0; // NaN reads as 0
    const last = at.length - 1;
    let i = 1;
    while (i < last && x > at[i]) i++;
    const a = at[i - 1];
    const b = at[i];
    const k = b > a ? clamp((x - a) / (b - a)) : x >= b ? 1 : 0;
    const A = R.rgb[i - 1];
    const B = R.rgb[i];
    out[0] = Math.round(A[0] + (B[0] - A[0]) * k);
    out[1] = Math.round(A[1] + (B[1] - A[1]) * k);
    out[2] = Math.round(A[2] + (B[2] - A[2]) * k);
    return out;
  }

  const rampTmp = [0, 0, 0];
  /** ramp(name | stops, v) : css 'rgb(r,g,b)' of the scale at v (clamped to 0..1). */
  lib.ramp = (spec, v) => {
    const c = rampEval(rampOf(spec), v, rampTmp);
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  };
  /** rampRGB(name | stops, v, out?) : [r, g, b] 0..255 integers, written into out when given. */
  lib.rampRGB = (spec, v, out) => rampEval(rampOf(spec), v, out || [0, 0, 0]);
  /** rampStops(name | stops) : frozen [[at, '#hex'], ...], e.g. for CanvasGradient.addColorStop. */
  lib.rampStops = (spec) => rampOf(spec).stops;
  lib.ramps = ramps;

  // ===========================================================================
  // Noise plate
  // ===========================================================================

  /**
   * noisePlate(ctx, opts) : an fbm2 field cut at a threshold, one colour, over a rectangle.
   * Snow overexposure (paper-white blotches over the drawing), stipple (grain, small scale),
   * toner dropouts (paper colour over ink, or 'destination-out'), streaks (scale [sx, sy]).
   * The field is rastered once at `res` of the frame and cached by every option below plus the
   * boil variant (never by raw time), stretched once to the render size; a frame only blits it.
   *   x, y, w, h   0, 0, frame width, frame height
   *   seed         7
   *   scale        60      feature size in frame px; [sx, sy] stretches it (sy ≫ sx: vertical streaks)
   *   threshold    0.7     fraction of the plate left empty: 0.7 covers about 30% (rank, not level)
   *   soft         0.04    rank width of the edge ramp (0 is a hard mask)
   *   grain        0       0..1 white noise mixed into the field before the cut: speckle, stipple
   *                        (1 is pure per-pixel noise, no fbm: the cheapest plate)
   *   octaves      4
   *   color        pal.ink (a lib.pal name or a colour)
   *   alpha        1       applied at the blit
   *   res          0.25    raster size relative to the frame (0.05..1)
   *   boil         false   true: three variants on the 12 fps clock; a number picks a variant
   */
  function noisePlate(ctx, o = {}) {
    const x = o.x || 0, y = o.y || 0;
    const w = o.w || W(), h = o.h || H();
    const S = renderScale();
    const seed = seedInt(o.seed === undefined ? 7 : o.seed);
    const sc = Array.isArray(o.scale) ? o.scale : [o.scale, o.scale];
    const sx = Math.max(0.5, +sc[0] || 60), sy = Math.max(0.5, +(sc[1] != null ? sc[1] : sc[0]) || 60);
    const threshold = clamp(o.threshold != null ? +o.threshold : 0.7, 0, 1);
    const soft = clamp(o.soft != null ? +o.soft : 0.04, 0, 1);
    const grain = clamp(o.grain != null ? +o.grain : 0, 0, 1);
    const oct = Math.max(1, Math.min(6, o.octaves == null ? 4 : o.octaves | 0));
    const color = (typeof o.color === 'string' && pal[o.color]) || o.color || pal.ink;
    const alpha = clamp(o.alpha != null ? +o.alpha : 1, 0, 1);
    const res = clamp(o.res != null ? +o.res : 0.25, 0.05, 1);
    let variant = 0;
    if (o.boil === true) variant = lib.boil(lib.T) % 3;
    else if (typeof o.boil === 'number') variant = Math.abs(o.boil | 0) % 3;
    if (!(alpha > 0) || threshold >= 1 || !(w > 0) || !(h > 0)) return;
    const ow = Math.max(1, Math.round(w * S)), oh = Math.max(1, Math.round(h * S));
    const cw = Math.max(1, Math.round(ow * res)), ch = Math.max(1, Math.round(oh * res));
    const key = ['noisePlate', w, h, ow, oh, cw, ch, seed, sx, sy, threshold, soft, grain, oct, color, variant].join('|');
    const c = cached(key, () => makeNoisePlate(ow, oh, cw, ch, w / cw, h / ch, seed, sx, sy, threshold, soft, grain, oct, color, variant));
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.drawImage(c, x, y, w, h);
    ctx.restore();
  }

  // The field is computed at cw × ch, then stretched once (smoothed) to the render size ow × oh:
  // a 1:1 blit per frame costs a tenth of a stretching one on a software canvas.
  function makeNoisePlate(ow, oh, cw, ch, px, py, seed, sx, sy, threshold, soft, grain, oct, color, variant) {
    const n = cw * ch;
    const f = new Float32Array(n);
    // A boil variant nudges the domain by a third of a feature and reseeds the grain, so the
    // plate shimmers in place instead of jumping to a new pattern.
    const ox = variant * 0.37, oy = variant * 0.29;
    const gs = seed + 131 + variant * 17;
    let lo = Infinity, hi = -Infinity;
    for (let j = 0; j < ch; j++) {
      const ny = ((j + 0.5) * py) / sy + oy;
      for (let i = 0; i < cw; i++) {
        let v = grain < 1 ? lib.fbm2(((i + 0.5) * px) / sx + ox, ny, seed, oct) : 0;
        if (grain > 0) v = v * (1 - grain) + (h3(i, j, gs) * 2 - 1) * 0.6 * grain;
        f[j * cw + i] = v;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
    // Cut by rank: a histogram of the field gives the level below which `threshold` of it lies,
    // so the covered fraction does not depend on the seed, the scale or the octaves.
    const B = 2048;
    const span = hi - lo || 1;
    const hist = new Uint32Array(B);
    for (let k = 0; k < n; k++) hist[Math.min(B - 1, (((f[k] - lo) / span) * B) | 0)]++;
    const level = (q) => {
      if (q <= 0) return lo - 1e-6;
      if (q >= 1) return hi + 1e-6;
      const target = q * n;
      let acc = 0;
      for (let b = 0; b < B; b++) {
        const next = acc + hist[b];
        if (next >= target) return lo + ((b + (hist[b] ? (target - acc) / hist[b] : 0)) / B) * span;
        acc = next;
      }
      return hi;
    };
    const e0 = level(threshold - soft / 2), e1 = level(threshold + soft / 2);
    const c = newCanvas(cw, ch);
    const g = c.getContext('2d');
    const img = g.createImageData(cw, ch);
    const d = img.data;
    const [r, gg, b] = parseColor(color);
    for (let k = 0; k < n; k++) {
      const v = f[k];
      const a = e1 > e0 ? smoothstep(e0, e1, v) : v > e0 ? 1 : 0;
      if (!(a > 0)) continue;
      const q = k * 4;
      d[q] = r;
      d[q + 1] = gg;
      d[q + 2] = b;
      d[q + 3] = Math.round(a * 255);
    }
    g.putImageData(img, 0, 0);
    if (ow === cw && oh === ch) return c;
    const out = newCanvas(ow, oh);
    const og = out.getContext('2d');
    og.imageSmoothingEnabled = true;
    og.imageSmoothingQuality = 'high';
    og.drawImage(c, 0, 0, ow, oh);
    return out;
  }
  lib.noisePlate = noisePlate;

  // ===========================================================================
  // Stick figures
  // ===========================================================================

  // Body proportions in head diameters. 'line' is the jointed stick (characters-reference.md §4–6:
  // torso ≈ 2.5 heads, legs ≈ 3.5); the spring body (§3) has long legs, ≈ 56% of the height, and a
  // head of ≈ 17% of it. A standing figure is head + neck + torso + thigh + shin tall; the foot
  // points forward and adds no height.
  const STICK_BODY = Object.freeze({ head: 1, neck: 0.25, torso: 2.5, upperArm: 1.35, forearm: 1.25, thigh: 1.8, shin: 1.75, foot: 0.3 });
  const SPRING_BODY = Object.freeze({ head: 1, neck: 0.12, torso: 1.35, upperArm: 1.45, forearm: 1.4, thigh: 1.6, shin: 1.6, foot: 0 });
  const POSE_KEYS = ['rot', 'lean', 'neck', 'armL', 'elbowL', 'armR', 'elbowR', 'legL', 'kneeL', 'legR', 'kneeR'];
  const SPRING_KINDS = { spring: 1, zigzag: 1, coil: 1, ladder: 1 };

  /**
   * stickPose(pose, opts) : the joints of a stick figure, without drawing. Pure; stickFigure draws
   * exactly these (plus the boil tremble).
   * pose: joint angles in radians, every one 0 by default (standing straight, arms hanging).
   * A positive angle swings toward the side the figure faces:
   *   rot     the whole figure about the hip (π/2 lies it face down, -π/2 on its back)
   *   lean    the torso at the hip          neck    the head on the torso
   *   armL armR    shoulder, from hanging down (π/2 points forward, π straight up)
   *   elbowL elbowR  forearm folds forward
   *   legL legR    hip, from straight down   kneeL kneeR    shin folds back
   * opts:
   *   x, y     where the figure stands: with anchor 'ground' (default) the lowest point of the
   *            figure sits on y and the hip on x; with anchor 'hip' the hip is at (x, y)
   *   height   0.33 · frame height   standing height, head top to sole
   *   facing   1 (right) or -1 (left)
   *   limb     'line' | 'spring' ('zigzag') | 'coil' | 'ladder'   picks the default body
   *   body     { head, neck, torso, upperArm, forearm, thigh, shin, foot }   overrides, in heads
   * Returns { hip, shoulder, neck, head, headR, elbowL, handL, elbowR, handR, kneeL, ankleL,
   *   toeL, kneeR, ankleR, toeR, D (head diameter), facing, headAngle } in frame pixels.
   */
  function stickPose(pose, o = {}) {
    const p = pose || {};
    const B = Object.assign({}, SPRING_KINDS[o.limb] ? SPRING_BODY : STICK_BODY, o.body);
    const height = o.height != null ? o.height : H() * 0.33;
    const D = height / (B.head + B.neck + B.torso + B.thigh + B.shin);
    const f = o.facing === -1 ? -1 : 1;
    const a = (k) => +p[k] || 0;
    // dir(θ, len): θ = 0 points down the frame, θ > 0 swings toward the facing side
    const dir = (t, len) => [f * Math.sin(t) * len, Math.cos(t) * len];
    const add = (P, v) => [P[0] + v[0], P[1] + v[1]];
    const hip = [0, 0];
    const torso = -a('lean');
    const shoulder = add(hip, dir(torso, -B.torso * D));
    const headAng = torso - a('neck');
    const neck = add(shoulder, dir(headAng, -B.neck * D));
    const head = add(shoulder, dir(headAng, -(B.neck * D + (B.head * D) / 2)));
    const arm = (s, e) => {
      const el = add(shoulder, dir(torso + a(s), B.upperArm * D));
      return [el, add(el, dir(torso + a(s) + a(e), B.forearm * D))];
    };
    const leg = (s, k) => {
      const kn = add(hip, dir(a(s), B.thigh * D));
      const an = add(kn, dir(a(s) - a(k), B.shin * D));
      // the foot points forward, only a third as steep as the shin, so it stays near flat
      return [kn, an, add(an, dir(Math.PI / 2 + 0.35 * (a(s) - a(k)), B.foot * D))];
    };
    const [elbowL, handL] = arm('armL', 'elbowL');
    const [elbowR, handR] = arm('armR', 'elbowR');
    const [kneeL, ankleL, toeL] = leg('legL', 'kneeL');
    const [kneeR, ankleR, toeR] = leg('legR', 'kneeR');
    const J = { hip, shoulder, neck, head, elbowL, handL, elbowR, handR, kneeL, ankleL, toeL, kneeR, ankleR, toeR };
    const r = f * a('rot');
    const c = Math.cos(r), s = Math.sin(r);
    const headR = (B.head * D) / 2;
    let low = -Infinity;
    for (const k in J) {
      const P = J[k];
      J[k] = [P[0] * c - P[1] * s, P[0] * s + P[1] * c];
      const bottom = J[k][1] + (k === 'head' ? headR : 0);
      if (bottom > low) low = bottom;
    }
    const dx = o.x != null ? o.x : W() / 2;
    const dy = (o.y != null ? o.y : H() * 0.8) - (o.anchor === 'hip' ? 0 : low);
    for (const k in J) J[k] = [J[k][0] + dx, J[k][1] + dy];
    J.headR = headR;
    J.D = B.head * D;
    J.facing = f;
    J.headAngle = -f * headAng + r; // screen rotation of the head, clockwise (0 upright)
    return J;
  }
  lib.stickPose = stickPose;

  /** poseMix(a, b, u) : a pose between a (u = 0) and b (u = 1), angle by angle. */
  function poseMix(pa, pb, u) {
    const out = {};
    for (const k of POSE_KEYS) {
      const x = (pa && +pa[k]) || 0, y = (pb && +pb[k]) || 0;
      if (x || y) out[k] = x + (y - x) * u;
    }
    return out;
  }
  lib.poseMix = poseMix;

  // A few poses to start from (facing right; mix them with poseMix, override single joints).
  // walk1..walk4 are the contact and passing drawings of one stride, a quarter of a cycle apart.
  const stickPoses = {
    stand: {},
    walk1: { lean: 0.06, armL: -0.5, elbowL: 0.25, armR: 0.5, elbowR: 0.55, legL: 0.42, kneeL: 0.08, legR: -0.38, kneeR: 0.3 },
    walk2: { lean: 0.08, armL: -0.12, elbowL: 0.3, armR: 0.12, elbowR: 0.4, legL: 0.05, kneeL: 0.3, legR: -0.05, kneeR: 1.05 },
    walk3: { lean: 0.06, armL: 0.5, elbowL: 0.55, armR: -0.5, elbowR: 0.25, legL: -0.38, kneeL: 0.3, legR: 0.42, kneeR: 0.08 },
    walk4: { lean: 0.08, armL: 0.12, elbowL: 0.4, armR: -0.12, elbowR: 0.3, legL: -0.05, kneeL: 1.05, legR: 0.05, kneeR: 0.3 },
    reach: { lean: -0.05, neck: -0.35, armL: 2.75, elbowL: 0.1, armR: 2.95, elbowR: -0.05, legL: 0.06, legR: -0.06 },
    crouch: { lean: 0.5, neck: -0.3, armL: 0.9, elbowL: 0.8, armR: 0.6, elbowR: 1.0, legL: 1.05, kneeL: 1.75, legR: 0.7, kneeR: 1.85 },
    jump: { lean: 0.2, neck: -0.2, armL: 2.3, elbowL: 0.4, armR: 2.0, elbowR: 0.6, legL: 0.9, kneeL: 1.6, legR: 0.3, kneeR: 1.3 },
    sit: { lean: -0.12, neck: 0.1, armL: 1.0, elbowL: 0.35, armR: 0.7, elbowR: 0.5, legL: 2.1, kneeL: 1.07, legR: 1.9, kneeR: 0.85 },
    wave: { armL: 0.12, elbowL: 0.1, armR: 2.3, elbowR: 0.9, legL: 0.1, legR: -0.1, neck: 0.1 },
    fall: { rot: -0.35, lean: -0.2, neck: -0.3, armL: 2.6, elbowL: 0.5, armR: 1.9, elbowR: -0.4, legL: 0.6, kneeL: 0.2, legR: -0.25, kneeR: 0.9 },
    lie: { rot: -Math.PI / 2, neck: 0.15, armL: 0.35, elbowL: 0.3, armR: -0.2, elbowR: 0.5, legL: 0.15, kneeL: 0.4, legR: -0.05, kneeR: 0.1 },
  };
  for (const k of Object.keys(stickPoses)) Object.freeze(stickPoses[k]);
  lib.stickPoses = Object.freeze(stickPoses);

  // a trembling polyline: joints jitter on the boil clock, each segment bows a little
  function trembleChain(ctx, pts, tremble, seed, bi, sub) {
    for (let i = 0; i < pts.length - 1; i++) {
      const A = pts[i], B = pts[i + 1];
      const dx = B[0] - A[0], dy = B[1] - A[1];
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const n = Math.max(2, Math.ceil(len / sub));
      if (i === 0) ctx.moveTo(A[0], A[1]);
      for (let k = 1; k <= n; k++) {
        const u = k / n;
        const d = k === n ? 0 : tremble * (Math.sin(Math.PI * u) * noise1(i * 1.31 + bi * 0.47, seed) + 0.45 * noise1(k * 0.9 + bi * 2.3 + i * 5.1, seed + 3));
        ctx.lineTo(A[0] + dx * u + nx * d, A[1] + dy * u + ny * d);
      }
    }
  }

  // closed wobbly disc path (radius wobbles by `wob` px on the boil clock)
  function discPath(ctx, x, y, r, wob, seed, bi) {
    const n = Math.max(16, Math.min(48, Math.ceil(r * 0.8)));
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU;
      const rr = r + wob * noise1(Math.cos(a) * 1.3 + 3 + bi * 1.9, seed) * (0.6 + 0.4 * Math.sin(a * 2 + seed));
      if (i) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
  }

  /**
   * scribbleBall(ctx, x, y, r, opts) : a dense tangle of scribbled loops inside radius r (the
   * spring figure's head). One continuous line whose centre wanders; it trembles on the boil clock.
   *   color pal.ink   width r·0.07   turns 14   seed 7   wobble r·0.05   alpha 1   boil (like inkPath)
   */
  function scribbleBall(ctx, x, y, r, o = {}) {
    const seed = seedInt(o.seed === undefined ? 7 : o.seed);
    const bi = boilIndex(o);
    const turns = Math.max(1, o.turns || 14);
    const wob = o.wobble != null ? o.wobble : r * 0.05;
    const per = 11;
    const m = Math.ceil(turns * per);
    ctx.save();
    ctx.globalAlpha *= o.alpha != null ? o.alpha : 1;
    ctx.strokeStyle = o.color || pal.ink;
    ctx.lineWidth = o.width != null ? o.width : Math.max(1, r * 0.07);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    let px = 0, py = 0;
    for (let i = 0; i <= m; i++) {
      const cx = 0.42 * r * noise1(i * 0.021, seed + 11);
      const cy = 0.42 * r * noise1(i * 0.021, seed + 12);
      const rho = r * (0.5 + 0.28 * noise1(i * 0.09, seed + 13));
      const ang = (i / per) * TAU * (1 + 0.15 * noise1(i * 0.05, seed + 14));
      let qx = cx + Math.cos(ang) * rho + wob * noise1(i * 0.31 + bi * 3.1, seed + 15);
      let qy = cy + Math.sin(ang) * rho * 0.9 + wob * noise1(i * 0.31 + bi * 3.1, seed + 16);
      const d = Math.hypot(qx, qy);
      if (d > r) (qx *= r / d), (qy *= r / d);
      qx += x;
      qy += y;
      if (i === 0) ctx.moveTo(qx, qy);
      else if (i === 1) ctx.lineTo((px + qx) / 2, (py + qy) / 2);
      else ctx.quadraticCurveTo(px, py, (px + qx) / 2, (py + qy) / 2);
      px = qx;
      py = qy;
    }
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.restore();
  }
  lib.scribbleBall = scribbleBall;

  // Catmull-Rom through pts, sampled about every `gap` px; returns { X, Y, S } arrays
  function smoothLine(pts, gap) {
    const X = [], Y = [];
    const n = pts.length;
    for (let i = 0; i < n - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
      const m = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / gap));
      for (let k = i ? 1 : 0; k <= m; k++) {
        const t = k / m, t2 = t * t, t3 = t2 * t;
        const cr = (a, b, c, d) => 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3);
        X.push(cr(p0[0], p1[0], p2[0], p3[0]));
        Y.push(cr(p0[1], p1[1], p2[1], p3[1]));
      }
    }
    const S = [0];
    for (let i = 1; i < X.length; i++) S.push(S[i - 1] + Math.hypot(X[i] - X[i - 1], Y[i] - Y[i - 1]));
    return { X, Y, S };
  }

  // point and unit normal at arc length s on a smoothLine
  function lineAt(C, s) {
    const { X, Y, S } = C;
    const last = S.length - 1;
    if (s <= 0) s = 0;
    if (s >= S[last]) s = S[last];
    let lo = 0, hi = last;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (S[mid] <= s) lo = mid;
      else hi = mid;
    }
    const seg = S[hi] - S[lo] || 1;
    const u = (s - S[lo]) / seg;
    const tx = (X[hi] - X[lo]) / seg, ty = (Y[hi] - Y[lo]) / seg;
    return [X[lo] + (X[hi] - X[lo]) * u, Y[lo] + (Y[hi] - Y[lo]) * u, -ty, tx];
  }

  /**
   * springLimb(ctx, a, b, opts) : a limb drawn as a spring from point a to point b, through
   * opts.via (a point, or a list of points: the elbow or knee) on a smooth curve.
   *   kind    'zigzag' | 'coil' (looped wire) | 'ladder' (two rails and rungs)
   *   amp     0.014 · frame height   half the width of the spring
   *   step    0.011 · frame height   distance between zigzag corners, coil half-turns or rungs
   *   color pal.ink   width max(1.5, 0.0021 · frame height)   alpha 1
   *   jitter  amp · 0.18   px the corners tremble on the boil clock     seed 5   boil (like inkPath)
   * The spring starts on a and ends on b. Returns the length of the centre curve.
   */
  function springLimb(ctx, a, b, o = {}) {
    const v = o.via;
    const via = !v || !v.length ? [] : Array.isArray(v[0]) || typeof v[0] === 'object' ? v.map(XY) : [XY(v)];
    const C = smoothLine([XY(a)].concat(via, [XY(b)]), 3);
    const L = C.S[C.S.length - 1];
    if (!(L > 0)) return 0;
    const kind = o.kind || 'zigzag';
    const amp = o.amp != null ? o.amp : H() * 0.014;
    const N = Math.max(1, Math.round(L / (o.step != null ? o.step : H() * 0.011)));
    const step = L / N;
    const seed = seedInt(o.seed === undefined ? 5 : o.seed);
    const bi = boilIndex(o);
    const jit = o.jitter != null ? o.jitter : amp * 0.18;
    const env = (s) => Math.min(1, s / step, (L - s) / step);
    const jn = (k, c) => jit * noise1(k * 0.73 + bi * 5.3, seed + c);
    ctx.save();
    ctx.globalAlpha *= o.alpha != null ? o.alpha : 1;
    ctx.strokeStyle = o.color || pal.ink;
    ctx.lineWidth = o.width != null ? o.width : Math.max(1.5, H() * 0.0021);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    if (kind === 'ladder') {
      for (const side of [-1, 1]) {
        const m = Math.max(2, Math.ceil(L / 6));
        for (let i = 0; i <= m; i++) {
          const s = (i / m) * L;
          const q = lineAt(C, s);
          const d = side * amp + jn(i * 0.25, side);
          if (i) ctx.lineTo(q[0] + q[2] * d, q[1] + q[3] * d);
          else ctx.moveTo(q[0] + q[2] * d, q[1] + q[3] * d);
        }
      }
      for (let k = 0; k <= N; k++) {
        const q = lineAt(C, k * step);
        const d0 = -amp + jn(k, 3), d1 = amp + jn(k, 4);
        ctx.moveTo(q[0] + q[2] * d0, q[1] + q[3] * d0);
        ctx.lineTo(q[0] + q[2] * d1, q[1] + q[3] * d1);
      }
    } else if (kind === 'coil') {
      const per = 9;
      const A = amp * 0.9;
      for (let i = 0; i <= N * per; i++) {
        const s = (i / per) * step;
        const ph = (i / per) * Math.PI;
        const e = env(s);
        const q = lineAt(C, s + A * e * Math.cos(ph) - A * e);
        const d = amp * e * Math.sin(ph) + jn(i / per, 1) * e;
        if (i) ctx.lineTo(q[0] + q[2] * d, q[1] + q[3] * d);
        else ctx.moveTo(q[0], q[1]);
      }
    } else {
      for (let k = 0; k <= N; k++) {
        const s = k * step;
        const q = lineAt(C, Math.min(L, Math.max(0, s + (k && k < N ? jn(k, 2) * 0.5 : 0))));
        const d = k === 0 || k === N ? 0 : (k % 2 ? amp : -amp) + jn(k, 1);
        if (k) ctx.lineTo(q[0] + q[2] * d, q[1] + q[3] * d);
        else ctx.moveTo(q[0], q[1]);
      }
    }
    ctx.stroke();
    ctx.restore();
    return L;
  }
  lib.springLimb = springLimb;

  /**
   * stickFigure(ctx, pose, opts) : draws the stick figure stickPose(pose, opts) describes and
   * returns its joints. Thin limbs with a thickening at each joint, a disc head, the joints and the
   * line trembling on the boil clock (hold a pose for two frames with lib.onTwos).
   *   head     'solid' (black disc) | 'scribble' (black disc, light scribbles inside) |
   *            'hatch' (black disc, light diagonal strokes) | 'face' (outlined, two dots and a
   *            mouth) | 'knot' (a scribbleBall; the default for spring limbs)
   *   limb     'line' | 'spring' ('zigzag') | 'coil' | 'ladder'   (springs draw through springLimb)
   *   color    pal.ink       light  pal.white (scribbles, hatching, the face fill)
   *   width    D · 0.075     joint  1.3 (radius of a joint dot, in line widths; 0 for none)
   *   tremble  width · 0.5   px each segment bows         jitter D · 0.03   px each joint shakes
   *   amp, step  2.15% and 1.7% of height (spring limbs)   alpha 1   seed 1   boil (like inkPath)
   *   plus stickPose's x, y, anchor, height, facing, body
   */
  function stickFigure(ctx, pose, o = {}) {
    const J = stickPose(pose, o);
    const limb = o.limb === 'spring' ? 'zigzag' : o.limb || 'line';
    const spring = limb !== 'line';
    const seed = seedInt(o.seed === undefined ? 1 : o.seed);
    const bi = boilIndex(o);
    const D = J.D;
    const color = o.color || pal.ink;
    const light = o.light || pal.white;
    const w = o.width != null ? o.width : Math.max(1.2, D * (spring ? 0.045 : 0.075));
    const jit = o.jitter != null ? o.jitter : D * 0.03;
    const tremble = o.tremble != null ? o.tremble : w * 0.5;
    const names = ['hip', 'shoulder', 'neck', 'head', 'elbowL', 'handL', 'elbowR', 'handR', 'kneeL', 'ankleL', 'toeL', 'kneeR', 'ankleR', 'toeR'];
    const P = {};
    names.forEach((k, i) => {
      const p = J[k];
      P[k] = jit ? [p[0] + jit * noise1(bi * 0.83 + i * 7.1, seed + 21), p[1] + jit * noise1(bi * 0.83 + i * 7.1, seed + 22)] : p;
    });
    ctx.save();
    ctx.globalAlpha *= o.alpha != null ? o.alpha : 1;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const chains = [
      ['hip', 'shoulder', 'neck'],
      ['shoulder', 'elbowL', 'handL'],
      ['shoulder', 'elbowR', 'handR'],
      ['hip', 'kneeL', 'ankleL', 'toeL'],
      ['hip', 'kneeR', 'ankleR', 'toeR'],
    ];
    if (spring) {
      const height = o.height != null ? o.height : H() * 0.33;
      const amp = o.amp != null ? o.amp : height * 0.0215;
      const step = o.step != null ? o.step : height * 0.017;
      chains.forEach((ch, i) => {
        const pts = ch.map((k) => P[k]).filter((p, j) => j < 2 || Math.hypot(p[0] - P[ch[j - 1]][0], p[1] - P[ch[j - 1]][1]) > 1);
        const end = i === 0 ? pts[1] : pts[pts.length - 1];
        const via = i === 0 ? [] : pts.slice(1, -1);
        springLimb(ctx, pts[0], end, { via, kind: limb, amp, step, color, width: w, seed: seed + i, boil: bi });
      });
      // the neck runs on into the knot so the head does not float
      const hx = P.head[0], hy = P.head[1];
      const into = [P.neck[0] + (hx - P.neck[0]) * 0.55, P.neck[1] + (hy - P.neck[1]) * 0.55];
      ctx.beginPath();
      trembleChain(ctx, [P.shoulder, into], tremble, seed, bi, D * 0.4);
      ctx.stroke();
    } else {
      ctx.beginPath();
      chains.forEach((ch, i) => {
        const pts = ch.map((k) => P[k]);
        if (pts.length === 4 && Math.hypot(pts[3][0] - pts[2][0], pts[3][1] - pts[2][1]) < 0.5) pts.pop();
        trembleChain(ctx, pts, tremble, seed + i * 13, bi, D * 0.4);
      });
      ctx.stroke();
      const jr = (o.joint != null ? o.joint : 1.3) * w;
      if (jr > w / 2) {
        ctx.beginPath();
        for (const k of ['hip', 'shoulder', 'elbowL', 'elbowR', 'kneeL', 'kneeR']) {
          const q = P[k];
          ctx.moveTo(q[0] + jr, q[1]);
          ctx.ellipse(q[0], q[1], jr, jr * 0.92, 0, 0, TAU);
        }
        for (const k of ['handL', 'handR']) {
          const q = P[k];
          ctx.moveTo(q[0] + jr * 0.85, q[1]);
          ctx.arc(q[0], q[1], jr * 0.85, 0, TAU);
        }
        ctx.fill();
      }
    }
    // head
    const [hx, hy] = P.head;
    const r = J.headR;
    const head = o.head || (spring ? 'knot' : 'solid');
    if (head === 'knot') {
      scribbleBall(ctx, hx, hy, r, { color, seed: seed + 5, boil: bi, width: Math.max(1, r * 0.075) });
    } else if (head === 'face') {
      ctx.beginPath();
      discPath(ctx, hx, hy, r, r * 0.04, seed + 5, bi);
      ctx.fillStyle = light;
      ctx.fill();
      ctx.lineWidth = w;
      ctx.stroke();
      const f = J.facing, ang = J.headAngle;
      const c = Math.cos(ang), s = Math.sin(ang);
      const at = (u, v) => [hx + (u * c - v * s) * r, hy + (u * s + v * c) * r];
      ctx.fillStyle = color;
      ctx.beginPath();
      for (const u of [0.02, 0.42]) {
        const e = at(f * u, -0.12);
        ctx.moveTo(e[0] + w * 0.9, e[1]);
        ctx.arc(e[0], e[1], w * 0.9, 0, TAU);
      }
      ctx.fill();
      ctx.beginPath();
      const m0 = at(f * 0.02, 0.36), m1 = at(f * 0.4, 0.33);
      ctx.moveTo(m0[0], m0[1]);
      ctx.lineTo(m1[0], m1[1]);
      ctx.lineWidth = w * 0.8;
      ctx.stroke();
    } else {
      ctx.beginPath();
      discPath(ctx, hx, hy, r, r * 0.035, seed + 5, bi);
      ctx.fillStyle = color;
      ctx.fill();
      if (head === 'scribble') {
        scribbleBall(ctx, hx, hy, r * 0.78, { color: light, seed: seed + 9, boil: bi, turns: 5, width: Math.max(1, r * 0.05), wobble: r * 0.08 });
      } else if (head === 'hatch') {
        ctx.save();
        ctx.beginPath();
        ctx.arc(hx, hy, r * 0.8, 0, TAU);
        ctx.clip();
        ctx.beginPath();
        const d = 0.7071;
        for (let k = -2; k <= 2; k++) {
          const o2 = k * r * 0.3 + r * 0.05 * noise1(k + bi * 1.7, seed + 31);
          ctx.moveTo(hx + o2 * d - r * d, hy - o2 * d - r * d);
          ctx.lineTo(hx + o2 * d + r * d, hy - o2 * d + r * d);
        }
        ctx.strokeStyle = light;
        ctx.lineWidth = Math.max(1, r * 0.07);
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();
    return J;
  }
  lib.stickFigure = stickFigure;

  // ===========================================================================
  // Stroke font
  // ===========================================================================

  // A single-line font drawn as strokes, the same on every machine (a system font is not). Glyphs
  // live on a grid 10 units tall: y 0 is the cap line, y 10 the baseline; a glyph is w units wide.
  // Each stroke is a polyline [x, y, x, y, ...]; a stroke of one point is a dot. Strokes are listed
  // stems first: in the stencil style a stroke whose end touches an earlier stroke is cut short
  // there (the bridge), so O is two halves (bridges top and bottom) and E a stem with three bars.
  // The hand style joins strokes that meet end to end back into one pen line. Upper case only:
  // lower case draws as upper case (Latin and Cyrillic), an unknown character as '?'.
  const SF = {};
  function sfArc(cx, cy, rx, ry, a0, a1) {
    const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 12));
    const out = [];
    for (let i = 0; i <= n; i++) {
      const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
      out.push(+(cx + rx * Math.cos(a)).toFixed(3), +(cy + ry * Math.sin(a)).toFixed(3));
    }
    return out;
  }
  const sfG = (chars, w, ...strokes) => {
    for (const ch of chars) SF[ch] = { w, s: strokes };
  };
  {
    const A = sfArc;
    const ring = (cx, rx) => [A(cx, 5, rx, 5, -90, 90), A(cx, 5, rx, 5, 90, 270)];
    // Latin
    sfG('AА', 6, [0, 10, 3, 0], [3, 0, 6, 10], [1.05, 6.5, 4.95, 6.5]);
    sfG('BВ', 6.75, [0, 0, 0, 10], [0, 0, 3.5, 0].concat(A(3.5, 2.25, 2.25, 2.25, -90, 90), [0, 4.5]), [0, 4.5, 4, 4.5].concat(A(4, 7.25, 2.75, 2.75, -90, 90), [0, 10]));
    sfG('CС', 6.3, A(3.4, 5, 3.4, 5, -42, -318));
    sfG('D', 6, [0, 0, 0, 10], [0, 0, 1.5, 0].concat(A(1.5, 5, 4.5, 5, -90, 90), [0, 10]));
    sfG('EЕ', 5, [0, 0, 0, 10], [0, 0, 5, 0], [0, 10, 5, 10], [0, 5, 4, 5]);
    sfG('F', 5, [0, 0, 0, 10], [0, 0, 5, 0], [0, 5, 4, 5]);
    sfG('G', 6.6, A(3.3, 5, 3.3, 5, -40, -360), [3.6, 5, 6.6, 5]);
    sfG('HН', 6, [0, 0, 0, 10], [6, 0, 6, 10], [0, 5, 6, 5]);
    sfG('I', 0, [0, 0, 0, 10]);
    sfG('J', 5, [5, 0, 5, 7].concat(A(2.5, 7, 2.5, 3, 0, 180)));
    sfG('KК', 5.5, [0, 0, 0, 10], [5.5, 0, 0, 6], [1.8, 4.036, 5.5, 10]);
    sfG('L', 5, [0, 0, 0, 10], [0, 10, 5, 10]);
    sfG('MМ', 7.5, [0, 10, 0, 0], [0, 0, 3.75, 7], [3.75, 7, 7.5, 0], [7.5, 0, 7.5, 10]);
    sfG('N', 6, [0, 10, 0, 0], [0, 0, 6, 10], [6, 10, 6, 0]);
    sfG('OО', 6.6, ...ring(3.3, 3.3));
    sfG('PР', 6.25, [0, 0, 0, 10], [0, 0, 3.5, 0].concat(A(3.5, 2.75, 2.75, 2.75, -90, 90), [0, 5.5]));
    sfG('Q', 6.6, ...ring(3.3, 3.3), [4, 7.2, 6.8, 10.6]);
    sfG('R', 6.25, [0, 0, 0, 10], [0, 0, 3.5, 0].concat(A(3.5, 2.75, 2.75, 2.75, -90, 90), [0, 5.5]), [2.8, 5.5, 6.1, 10]);
    sfG('S', 5.8, A(2.9, 2.5, 2.8, 2.5, -25, -270), A(2.9, 7.5, 2.9, 2.5, -90, 155));
    sfG('TТ', 6, [0, 0, 6, 0], [3, 0, 3, 10]);
    sfG('U', 6, [6, 0, 6, 10], [0, 0, 0, 7].concat(A(3, 7, 3, 3, 180, 0)));
    sfG('V', 6, [0, 0, 3, 10], [3, 10, 6, 0]);
    sfG('W', 8.4, [0, 0, 2.1, 10], [2.1, 10, 4.2, 2], [4.2, 2, 6.3, 10], [6.3, 10, 8.4, 0]);
    sfG('XХ', 6, [0, 0, 6, 10], [6, 0, 0, 10]);
    sfG('Y', 6, [0, 0, 3, 5], [6, 0, 3, 5], [3, 5, 3, 10]);
    sfG('Z', 6, [0, 0, 6, 0], [6, 0, 0, 10], [0, 10, 6, 10]);
    // digits
    sfG('0', 5.5, ...ring(2.75, 2.75));
    sfG('1', 3, [0, 2, 3, 0], [3, 0, 3, 10]);
    sfG('2', 5.5, A(2.75, 2.9, 2.75, 2.9, -165, 25).concat([0, 10]), [0, 10, 5.5, 10]);
    sfG('3З', 5.6, A(2.7, 2.5, 2.6, 2.5, -150, 90), A(2.7, 7.5, 2.9, 2.5, -90, 150));
    sfG('4', 6, [4.5, 10, 4.5, 0], [4.5, 0, 0, 7], [0, 7, 6, 7]);
    {
      const bowl5 = A(2.6, 6.9, 2.9, 3.1, -140, 150);
      sfG('5', 5.5, [5.2, 0, 0.6, 0], [0.6, 0, bowl5[0], bowl5[1]], bowl5);
    }
    {
      const stem6 = A(4.5, 7, 4.5, 7, -80, -180);
      sfG('6', 5.5, stem6, A(2.75, 7, 2.75, 3, 180, -180));
      sfG('9', 5.5, A(2.75, 3, 2.75, 3, 0, 360), A(1, 3, 4.5, 7, 0, 80));
    }
    sfG('7', 5.5, [0, 0, 5.5, 0], [5.5, 0, 1.8, 10]);
    sfG('8', 5.5, A(2.75, 2.5, 2.4, 2.5, 90, 450), A(2.75, 7.5, 2.75, 2.5, -90, 270));
    // punctuation
    sfG(' ', 3);
    sfG('.', 0, [0, 9.6]);
    sfG(',', 0.8, [0.8, 9.2, 0.8, 10, 0, 11.6]);
    sfG(':', 0, [0, 3.6], [0, 9.6]);
    sfG(';', 0.8, [0.8, 3.6], [0.8, 9.2, 0.8, 10, 0, 11.6]);
    sfG('!', 0, [0, 0, 0, 7], [0, 9.6]);
    sfG('?', 5, A(2.5, 2.5, 2.5, 2.5, -165, 60).concat([2.5, 5.6, 2.5, 7]), [2.5, 9.6]);
    sfG("'’", 0, [0, 0, 0, 2.8]);
    sfG('"', 2.4, [0, 0, 0, 2.8], [2.4, 0, 2.4, 2.8]);
    sfG('-–—', 3.5, [0, 5.5, 3.5, 5.5]);
    sfG('_', 5, [0, 10, 5, 10]);
    sfG('/', 4, [4, 0, 0, 10]);
    sfG('+', 5, [0, 5, 5, 5], [2.5, 2.5, 2.5, 7.5]);
    sfG('=', 5, [0, 3.8, 5, 3.8], [0, 6.8, 5, 6.8]);
    sfG('(', 2.5, A(5, 5, 5, 6, -120, -240));
    sfG(')', 2.5, A(-2.5, 5, 5, 6, -60, 60));
    // Cyrillic (А В Е К М Н О Р С Т Х З share the Latin and digit shapes above)
    sfG('Б', 6.25, [0, 0, 0, 10], [0, 0, 5.5, 0], [0, 4.5, 3.5, 4.5].concat(A(3.5, 7.25, 2.75, 2.75, -90, 90), [0, 10]));
    sfG('Г', 5, [0, 0, 0, 10], [0, 0, 5, 0]);
    sfG('Д', 6.8, [1.8, 0, 5.8, 0], [1.8, 0, 0.8, 8.2], [5.8, 0, 5.8, 8.2], [0, 8.2, 6.8, 8.2], [0, 8.2, 0, 10], [6.8, 8.2, 6.8, 10]);
    sfG('Ж', 8, [4, 0, 4, 10], [4, 5, 0.3, 0], [4, 5, 7.7, 0], [4, 5, 0, 10], [4, 5, 8, 10]);
    sfG('И', 6, [0, 0, 0, 10], [6, 0, 6, 10], [0, 10, 6, 0]);
    sfG('Й', 6, [0, 0, 0, 10], [6, 0, 6, 10], [0, 10, 6, 0], A(3, -2.2, 1.6, 1, 180, 0));
    sfG('Л', 6, [6, 0, 6, 10], [1.8, 0, 6, 0], [0, 10, 1.8, 0]);
    sfG('П', 6, [0, 0, 0, 10], [6, 0, 6, 10], [0, 0, 6, 0]);
    sfG('У', 6, [6, 0, 1.2, 10], [0, 0, 2.832, 6.6]);
    sfG('Ф', 7, [3.5, 0, 3.5, 10], A(3.5, 4.5, 3.5, 2.8, -90, 90), A(3.5, 4.5, 3.5, 2.8, 90, 270));
    sfG('Ц', 6.8, [0, 0, 0, 8.4], [6, 0, 6, 8.4], [0, 8.4, 6.8, 8.4], [6.8, 8.4, 6.8, 10.8]);
    sfG('Ч', 6, [6, 0, 6, 10], [0, 0, 0, 3.4].concat(A(3, 3.4, 3, 2.1, 180, 90), [6, 5.1]));
    sfG('Ш', 8, [0, 0, 0, 10], [0, 10, 8, 10], [4, 0, 4, 10], [8, 0, 8, 10]);
    sfG('Щ', 8.8, [0, 0, 0, 10], [0, 10, 8.8, 10], [4, 0, 4, 10], [8, 0, 8, 10], [8.8, 10, 8.8, 11.6]);
    sfG('Ъ', 6.8, [1.5, 0, 1.5, 10], [0, 0, 1.5, 0], [1.5, 4.5, 4, 4.5].concat(A(4, 7.25, 2.75, 2.75, -90, 90), [1.5, 10]));
    sfG('Ы', 7.5, [0, 0, 0, 10], [7.5, 0, 7.5, 10], [0, 4.5, 2.5, 4.5].concat(A(2.5, 7.25, 2.75, 2.75, -90, 90), [0, 10]));
    sfG('Ь', 5.25, [0, 0, 0, 10], [0, 4.5, 2.5, 4.5].concat(A(2.5, 7.25, 2.75, 2.75, -90, 90), [0, 10]));
    sfG('Э', 6.2, A(2.9, 5, 3.3, 5, -138, 138), [2, 5, 6.2, 5]);
    sfG('Ю', 8.6, [0, 0, 0, 10], [0, 5, 2.2, 5], ...ring(5.6, 3));
    sfG('Я', 6.25, [6.25, 0, 6.25, 10], [6.25, 0, 2.75, 0].concat(A(2.75, 2.75, 2.75, 2.75, -90, -270), [6.25, 5.5]), [3.3, 5.5, 0, 10]);
    sfG('Ё', 5, [0, 0, 0, 10], [0, 0, 5, 0], [0, 10, 5, 10], [0, 5, 4, 5], [1, -1.8], [4, -1.8]);
  }
  for (const ch of Object.keys(SF)) {
    SF[ch].s.forEach(Object.freeze);
    Object.freeze(SF[ch].s);
    Object.freeze(SF[ch]);
  }
  lib.strokeFont = Object.freeze(SF);

  const sfNear = (ax, ay, bx, by) => Math.abs(ax - bx) < 0.05 && Math.abs(ay - by) < 0.05;
  // distance from (px, py) to a polyline
  function sfDist(px, py, s) {
    if (s.length === 2) return Math.hypot(px - s[0], py - s[1]);
    let best = Infinity;
    for (let i = 0; i + 3 < s.length; i += 2) best = Math.min(best, ptSegDist(px, py, s[i], s[i + 1], s[i + 2], s[i + 3]));
    return best;
  }
  function sfLen(s) {
    let L = 0;
    for (let i = 0; i + 3 < s.length; i += 2) L += Math.hypot(s[i + 2] - s[i], s[i + 3] - s[i + 1]);
    return L;
  }
  function sfReverse(s) {
    const r = [];
    for (let i = s.length - 2; i >= 0; i -= 2) r.push(s[i], s[i + 1]);
    return r;
  }
  // hand style: strokes that meet end to end become one pen line (E is one line and a bar)
  const sfChainCache = new Map();
  function sfChains(ch) {
    let out = sfChainCache.get(ch);
    if (out) return out;
    const left = SF[ch].s.filter((s) => s.length >= 4).map((s) => s.slice());
    const dots = SF[ch].s.filter((s) => s.length === 2);
    out = [];
    while (left.length) {
      let line = left.shift();
      for (let grew = true; grew; ) {
        grew = false;
        for (let j = 0; j < left.length; j++) {
          const s = left[j];
          const n = line.length, m = s.length;
          let add = null;
          if (sfNear(line[n - 2], line[n - 1], s[0], s[1])) add = ['end', s];
          else if (sfNear(line[n - 2], line[n - 1], s[m - 2], s[m - 1])) add = ['end', sfReverse(s)];
          else if (sfNear(line[0], line[1], s[m - 2], s[m - 1])) add = ['start', s];
          else if (sfNear(line[0], line[1], s[0], s[1])) add = ['start', sfReverse(s)];
          if (!add) continue;
          line = add[0] === 'end' ? line.concat(add[1].slice(2)) : add[1].slice(0, -2).concat(line);
          left.splice(j, 1);
          grew = true;
          break;
        }
      }
      out.push(line);
    }
    out = out.concat(dots);
    sfChainCache.set(ch, out);
    return out;
  }
  // cut a polyline back by d units at its start or end
  function sfTrim(s, d, atEnd) {
    const p = atEnd ? sfReverse(s) : s.slice();
    let left = d;
    while (p.length >= 4) {
      const seg = Math.hypot(p[2] - p[0], p[3] - p[1]);
      if (seg > left) {
        const f = left / seg;
        p[0] += (p[2] - p[0]) * f;
        p[1] += (p[3] - p[1]) * f;
        return atEnd ? sfReverse(p) : p;
      }
      left -= seg;
      p.splice(0, 2);
    }
    return null;
  }
  // stencil style, drawn with butt caps and mitred corners, in glyph units. Strokes that meet end
  // to end at a sharp angle (V, M, N, W, the arms of Y) join into one polyline: a bridge there
  // would eat the letter. Any other end that touches an earlier stroke is cut back until its end
  // corners clear that stroke by half a weight plus the bridge, so the gap is the same at any
  // angle; an end that would need more than a weight past that stays joined (K's leg). A free end
  // that runs level or plumb is lengthened by half a weight for a square corner. A stroke too short
  // to lose its ends (A's bar at a heavy weight) keeps them. A dot becomes a square.
  const sfStencilCache = new Map();
  function sfEnd(s, atEnd) {
    const n = s.length;
    const [x, y, px, py] = atEnd ? [s[n - 2], s[n - 1], s[n - 4], s[n - 3]] : [s[0], s[1], s[2], s[3]];
    const L = Math.hypot(x - px, y - py) || 1;
    return { x, y, tx: (x - px) / L, ty: (y - py) / L }; // tangent points out of the stroke
  }
  function sfStencil(ch, wU, bU) {
    const key = ch + '|' + wU.toFixed(3) + '|' + bU.toFixed(3);
    let out = sfStencilCache.get(key);
    if (out) return out;
    const src = SF[ch].s.map((q) => q.slice());
    for (let merged = true; merged; ) {
      merged = false;
      for (let i = 0; i < src.length && !merged; i++) {
        for (let j = i + 1; j < src.length && !merged; j++) {
          const A = src[i], B = src[j];
          if (A.length < 4 || B.length < 4) continue;
          for (const ea of [false, true]) {
            for (const eb of [false, true]) {
              const pa = sfEnd(A, ea), pb = sfEnd(B, eb);
              const dot = pa.tx * pb.tx + pa.ty * pb.ty; // 1: the two run back over each other
              if (merged || !sfNear(pa.x, pa.y, pb.x, pb.y) || dot < 0.26 || dot > 0.97) continue;
              const a2 = ea ? A : sfReverse(A); // runs into the joint
              const b2 = eb ? sfReverse(B) : B; // runs out of it
              src[i] = a2.concat(b2.slice(2));
              src.splice(j, 1);
              merged = true;
            }
          }
        }
      }
    }
    const need = wU / 2 + bU - 1e-3;
    const most = need + wU;
    out = [];
    for (let j = 0; j < src.length; j++) {
      let s = src[j];
      if (s.length === 2) {
        out.push([s[0], s[1] - wU / 2, s[0], s[1] + wU / 2]);
        continue;
      }
      const touches = (x, y) => {
        for (let i = 0; i < j; i++) if (src[i].length >= 4 && sfDist(x, y, src[i]) < 0.25) return true;
        return false;
      };
      const clear = (e) => {
        for (const q of out) {
          if (sfDist(e.x, e.y, q) < need) return false;
          if (sfDist(e.x - (e.ty * wU) / 2, e.y + (e.tx * wU) / 2, q) < need) return false;
          if (sfDist(e.x + (e.ty * wU) / 2, e.y - (e.tx * wU) / 2, q) < need) return false;
        }
        return true;
      };
      // shortest cut from one end that clears, or -1
      const cutFor = (atEnd, room) => {
        for (let d = wU / 2; d <= Math.min(room, most); d += 0.05) {
          const r = sfTrim(s, d, atEnd);
          if (r && r.length >= 4 && clear(sfEnd(r, atEnd))) return d;
        }
        return -1;
      };
      const n = s.length;
      const a = touches(s[0], s[1]), b = touches(s[n - 2], s[n - 1]);
      const room = sfLen(s) - 0.6;
      let ca = a ? Math.max(0, cutFor(false, room)) : 0;
      let cb = b ? Math.max(0, cutFor(true, room)) : 0;
      if (ca + cb > room) ca = cb = 0;
      if (ca > 0) s = sfTrim(s, ca, false);
      if (cb > 0) s = sfTrim(s, cb, true);
      s = s.slice();
      const m = s.length;
      for (const atEnd of [false, true]) {
        if (atEnd ? cb > 0 : ca > 0) continue;
        const e = sfEnd(s, atEnd);
        if (Math.abs(e.tx) < 0.02 || Math.abs(e.ty) < 0.02) {
          const i = atEnd ? m - 2 : 0;
          s[i] += (e.tx * wU) / 2;
          s[i + 1] += (e.ty * wU) / 2;
        }
      }
      out.push(s);
    }
    if (sfStencilCache.size > 512) sfStencilCache.clear();
    sfStencilCache.set(key, out);
    return out;
  }

  /**
   * strokeText(ctx, str, x, y, opts) : text in the built-in stroke font, identical on every machine.
   * Latin, digits, basic punctuation and Cyrillic, upper case (lower case draws as upper case, an
   * unknown character as '?'); '\n' starts a new line. (x, y) is the cap line of the first line at
   * its align point; size is the cap height, a line is 1.6 × size.
   *   style 'hand'            'hand': each pen line through inkPath (tapers, wobble, boil, reveal);
   *                           'stencil': flat bars with bridges cut where strokes meet
   *   size 64   color pal.ink   alpha 1   align 'left' | 'center' | 'right'   tracking 0 (units)
   *   weight                  stroke width in px (hand size × 0.075, stencil size × 0.17)
   *   bridge                  stencil gap in px (weight × 0.45)
   *   slant                   shear, x per unit of height (hand 0.12, stencil 0)
   *   jitter                  hand: per-letter baseline, tilt and scale drift, 0 for none (hand 1, stencil 0)
   *   seed 1   boil          seeds the jitter and the ink; boil as in inkPath (hand only)
   *   reveal                  0..1 of the whole text written in order, the pen tip on the open end (hand only)
   *   ink {}                  extra inkPath options for the hand style (double, rough, wobble, nib...)
   * Returns { width, height } of the whole text in px.
   */
  function strokeText(ctx, str, x, y, o = {}) {
    const stencil = o.style === 'stencil';
    const size = o.size != null ? o.size : 64;
    const u = size / 10;
    const weight = o.weight != null ? o.weight : size * (stencil ? 0.17 : 0.075);
    const bridge = o.bridge != null ? o.bridge : weight * 0.45;
    const slant = o.slant != null ? o.slant : stencil ? 0 : 0.12;
    const jitter = o.jitter != null ? o.jitter : stencil ? 0 : 1;
    const seed = seedInt(o.seed === undefined ? 1 : o.seed);
    const gap = 1.8 * u + weight + (o.tracking || 0) * u;
    const lead = size * 1.6;
    const lines = String(str).toUpperCase().split('\n');
    // layout: every glyph placed as a list of px polylines
    const placed = [];
    let width = 0;
    lines.forEach((line, li) => {
      const chars = Array.from(line).map((ch) => (SF[ch] ? ch : '?'));
      let w = 0;
      chars.forEach((ch, k) => (w += SF[ch].w * u + (k < chars.length - 1 ? gap : 0)));
      if (chars.length) w += weight;
      width = Math.max(width, w);
      let pen = (o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x) + weight / 2;
      const top = y + li * lead;
      chars.forEach((ch, k) => {
        const g = SF[ch];
        const r = rng(hash(seed, li, k, 71));
        const dy = jitter * (r() - 0.5) * 0.5 * u;
        const rot = jitter * (r() - 0.5) * 0.1;
        const sc = 1 + jitter * (r() - 0.5) * 0.08;
        const cs = Math.cos(rot) * sc, sn = Math.sin(rot) * sc;
        const cx = (g.w * u) / 2, cy = 5 * u;
        const map = (s) => {
          const out = [];
          for (let i = 0; i < s.length; i += 2) {
            const lx = s[i] * u - cx, ly = s[i + 1] * u - cy;
            const px = cx + lx * cs - ly * sn, py = cy + lx * sn + ly * cs;
            out.push([pen + px + slant * (10 * u - py), top + py + dy]);
          }
          return out;
        };
        const strokes = stencil ? sfStencil(ch, weight / u, bridge / u) : sfChains(ch);
        strokes.forEach((s, j) => placed.push({ pts: map(s), seed: hash(seed, li, k, j) | 0 }));
        pen += g.w * u + gap;
      });
    });
    const height = lines.length ? (lines.length - 1) * lead + size : 0;
    const color = o.color || pal.ink;
    ctx.save();
    ctx.globalAlpha *= o.alpha != null ? o.alpha : 1;
    if (stencil) {
      ctx.strokeStyle = color;
      ctx.lineWidth = weight;
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
      ctx.miterLimit = 2; // square corners stay square, V's point is cut flat
      ctx.beginPath();
      for (const p of placed) {
        const P = p.pts;
        ctx.moveTo(P[0][0], P[0][1]);
        if (P.length === 1) ctx.lineTo(P[0][0], P[0][1] + 0.01);
        for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]);
      }
      ctx.stroke();
      ctx.restore();
      return { width, height };
    }
    // hand: lengths first, so reveal can write the text in order
    let total = 0;
    for (const p of placed) {
      let L = 0;
      for (let i = 1; i < p.pts.length; i++) L += Math.hypot(p.pts[i][0] - p.pts[i - 1][0], p.pts[i][1] - p.pts[i - 1][1]);
      p.len = p.pts.length === 1 ? weight : L;
      total += p.len;
    }
    const upto = o.reveal != null ? clamp(+o.reveal || 0, 0, 1) * total : Infinity;
    let done = 0;
    ctx.fillStyle = color;
    for (const p of placed) {
      if (done >= upto) break;
      const part = upto >= done + p.len ? null : (upto - done) / p.len;
      done += p.len;
      if (p.pts.length === 1) {
        const r = rng(p.seed);
        ctx.beginPath();
        ctx.arc(p.pts[0][0] + (r() - 0.5) * weight * 0.3, p.pts[0][1], weight * 0.72, 0, TAU);
        ctx.fill();
        continue;
      }
      const t = Math.min(weight * 2.2, p.len * 0.3);
      const q = Object.assign(
        { color, width: weight, seed: p.seed, smooth: false, step: Math.max(1.5, weight * 0.4), wobble: jitter * weight * 0.2, taper: [t * 0.7, t], boil: o.boil },
        o.ink
      );
      if (o.boil === undefined) delete q.boil;
      if (part != null) q.reveal = part;
      inkPath(ctx, p.pts, q);
    }
    ctx.restore();
    return { width, height };
  }
  lib.strokeText = strokeText;

  // ===========================================================================
  // Dry brush
  // ===========================================================================

  /**
   * dryBrush(ctx, pts, opts) : a dry-brush stroke. The hairs leave parallel streaks that break up
   * in clumps as the brush runs dry, the paper tooth skips the ink, the edges are ragged, stray
   * hairs split the tail, and the width follows the pressure. pts is one polyline, or an array of
   * polylines that share one plate (a tree's branches). The plate is rendered once per points,
   * options, seed, boil variant and FILM.S, then blitted; it is never keyed by raw time.
   *   width     28       brush width at full pressure (px)
   *   color     pal.ink
   *   alpha     1
   *   seed      1
   *   dry       0.45     0 loaded (solid, streaks only toward the tail) .. 1 starved (scratchy from the start)
   *   tooth     0.6      how hard the paper grain breaks the ink, 0..1
   *   splay     0.5      stray hairs past the edge and a fanned, split tail, 0..1
   *   pressure  null     fn(u 0..1) => width multiplier; default a blunt landing and a lift-off
   *                      over the last third. Low pressure also lifts the outer hairs off the paper.
   *   bristles  auto     hairs across the width (width / 2.4, 6..64)
   *   wobble    1.5      hand drift of the centreline (px)
   *   smooth    true     Catmull-Rom through the points
   *   boil      true     three drawings on the 12 fps clock; false holds drawing 0, a number picks one
   *   key                stable id for a pressure function whose source text does not determine it
   */
  const DB_LAND = 0.06;
  function dbPressure(u) {
    return (0.74 + 0.26 * smoothstep(0, DB_LAND, u)) * (1 - 0.62 * smoothstep(0.64, 1, u));
  }
  function dbFillPressure(u) {
    return (0.86 + 0.14 * smoothstep(0, DB_LAND, u)) * (1 - 0.4 * smoothstep(0.84, 1, u));
  }

  function dbVariant(o) {
    if (o.boil === false) return 0;
    if (typeof o.boil === 'number') return Math.abs(o.boil | 0) % 3;
    const b = lib.boil(lib.T);
    return isFinite(b) ? ((b % 3) + 3) % 3 : 0;
  }

  // Paper tooth: a 256 px periodic tile per boil variant (never per time), shared by every plate.
  // Fine 2 px value noise, a pixel hash and an 8 px mottle so dry ink breaks in patches, not salt.
  const DB_TILE = 256;
  const dbTeeth = [];
  function dbToothTile(variant) {
    if (dbTeeth[variant]) return dbTeeth[variant];
    const T = new Float32Array(DB_TILE * DB_TILE);
    const s = 7717 + variant * 131;
    const vnoise = (x, y, cell, seed) => {
      const n = DB_TILE / cell;
      const gx = x / cell, gy = y / cell;
      const ix = Math.floor(gx), iy = Math.floor(gy);
      const fx = gx - ix, fy = gy - iy;
      const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
      const x0 = ix % n, y0 = iy % n, x1 = (ix + 1) % n, y1 = (iy + 1) % n;
      const a = h3(x0, y0, seed), b = h3(x1, y0, seed), c = h3(x0, y1, seed), d = h3(x1, y1, seed);
      return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
    };
    for (let y = 0; y < DB_TILE; y++) {
      for (let x = 0; x < DB_TILE; x++) {
        T[y * DB_TILE + x] = 0.46 * vnoise(x, y, 2, s) + 0.3 * h3(x, y, s + 1) + 0.24 * vnoise(x, y, 8, s + 2);
      }
    }
    return (dbTeeth[variant] = T);
  }

  function dbPlate(b, S) {
    const x0 = Math.floor(b.x), y0 = Math.floor(b.y);
    const lw = Math.max(1, Math.ceil(b.x + b.w) - x0);
    const lh = Math.max(1, Math.ceil(b.y + b.h) - y0);
    const cw = Math.max(1, Math.round(lw * S));
    const ch = Math.max(1, Math.round(lh * S));
    return { x0, y0, lw, lh, cw, ch, sx: cw / lw, sy: ch / lh, buf: new Float32Array(cw * ch) };
  }

  // Deposits one stroke's ink into the plate buffer (max, not sum: ink does not pile up).
  // Each hair is walked along the centreline and written as a short span across it.
  function dbStroke(P, pts, q) {
    const C = centreline(pts, false, 3, q.smooth, 0, 0);
    if (C.m < 2) return;
    const L = C.S[C.m - 1];
    if (!(L > 0.5)) return;
    const m = C.m;
    const r = rng(q.seed);
    // per-sample centreline drift, pressure and load
    const D = new Float64Array(m), Pw = new Float64Array(m), Ld = new Float64Array(m);
    const dry = q.dry;
    const load0 = lerp(1.3, 0.66, dry);
    const drain = 0.28 + 0.7 * dry;
    for (let k = 0; k < m; k++) {
      const s = C.S[k], u = s / L;
      D[k] = q.wobble * (0.7 * noise1(s / 170, q.seed + 3) + 0.3 * noise1(s / 45, q.seed + 4));
      Pw[k] = Math.max(0.05, q.pressure(u));
      Ld[k] = load0 - drain * Math.pow(u, 1.5) + 0.08 * noise1(s / 90, q.seed + 5);
    }
    const N = q.bristles;
    const sp = q.width / N;
    const hairR = Math.max(0.55, 0.5 * sp * P.sx * 1.15);
    const land = Math.min(L * 0.3, q.width * 0.45);
    const clumps = Math.max(2, Math.round(N / 5));
    const hairs = [];
    for (let j = 0; j < N; j++) {
      const v = -1 + (2 * (j + 0.5)) / N + (r() - 0.5) * (1.1 / N);
      const av = Math.abs(v);
      hairs.push({
        v,
        cap: 1 - 0.32 * av * av * av - 0.24 * r(),
        thick: 0.72 + 0.6 * r(),
        len: 30 + 120 * r(),
        seed: (hash(q.seed, j) & 0x7fffffff) | 0,
        clump: (hash(q.seed, 'clump', Math.floor((j * clumps) / N)) & 0x7fffffff) | 0,
        a: r() * land * (0.25 + 0.75 * av), // outer hairs touch down later: a ragged landing
        b: L,
      });
    }
    const stray = Math.round(q.splay * N * 0.16);
    for (let j = 0; j < stray; j++) {
      const a = r() * L * 0.85;
      hairs.push({
        v: (r() < 0.5 ? -1 : 1) * (1.04 + 0.24 * r()),
        cap: 0.55 + 0.3 * r(),
        thick: 0.55 + 0.35 * r(),
        len: 18 + 50 * r(),
        seed: (hash(q.seed, 'stray', j) & 0x7fffffff) | 0,
        clump: (hash(q.seed, 'stray-clump', j) & 0x7fffffff) | 0,
        a,
        b: Math.min(L, a + L * (0.06 + 0.26 * r())),
      });
    }
    const streakAmp = 0.16 + 0.34 * dry;
    const clumpAmp = 0.12 + 0.4 * dry;
    const buf = P.buf, cw = P.cw, ch = P.ch, sx = P.sx, sy = P.sy;
    // One grid of spans along the stroke, shared by every hair: centre (device px), normal,
    // pressure, load, half-width with the tail fan, and the landing boost.
    const ds = 1 / sx; // one device pixel between spans: the spans overlap, so a hair has no holes
    const n = Math.max(2, Math.floor(L / ds) + 1);
    const GX = new Float64Array(n), GY = new Float64Array(n), GNX = new Float64Array(n), GNY = new Float64Array(n);
    const GP = new Float64Array(n), GL = new Float64Array(n), GH = new Float64Array(n), GU = new Float64Array(n);
    for (let i = 0, k = 0; i < n; i++) {
      const s = Math.min(L, i * ds);
      while (k < m - 2 && C.S[k + 1] < s) k++;
      const s0 = C.S[k], s1 = C.S[k + 1];
      const f = s1 > s0 ? clamp((s - s0) / (s1 - s0)) : 0;
      const nx = C.NX[k] + (C.NX[k + 1] - C.NX[k]) * f;
      const ny = C.NY[k] + (C.NY[k + 1] - C.NY[k]) * f;
      const nl = Math.hypot(nx, ny) || 1;
      const d = D[k] + (D[k + 1] - D[k]) * f;
      const p = Pw[k] + (Pw[k + 1] - Pw[k]) * f;
      const u = s / L;
      GNX[i] = nx / nl;
      GNY[i] = ny / nl;
      GX[i] = (C.X[k] + (C.X[k + 1] - C.X[k]) * f + GNX[i] * d - P.x0) * sx;
      GY[i] = (C.Y[k] + (C.Y[k + 1] - C.Y[k]) * f + GNY[i] * d - P.y0) * sy;
      GP[i] = p;
      GL[i] = (Ld[k] + (Ld[k + 1] - Ld[k]) * f) + (s < land ? 0.3 * (1 - s / land) : 0);
      GH[i] = (1 + q.splay * 0.5 * smoothstep(0.7, 1, u)) * q.width * 0.5 * p * sx;
      GU[i] = 0.7 + 0.6 * u;
    }
    const NS = 10; // hair noise is evaluated every NS spans and interpolated
    const wander = sp * 0.45 * sx;
    for (let h = 0; h < hairs.length; h++) {
      const hr = hairs[h];
      const hv = hr.v, cap = hr.cap, hseed = hr.seed, hclump = hr.clump;
      const k1 = 1 / hr.len, k2 = 1 / (hr.len * 0.4);
      const inkAt = (s) => (0.62 * noise1(s * k1, hseed) + 0.22 * noise1(s * k2, hseed + 1)) * streakAmp + noise1(s / 70, hclump) * clumpAmp;
      const lift = Math.abs(hv) - 0.3; // touch = (0.78 p - lift) / 0.16 + 0.5
      const rr = hairR * hr.thick;
      const i0 = Math.max(0, Math.ceil(hr.a / ds)), i1 = Math.min(n - 1, Math.floor(hr.b / ds));
      // noise blocks of NS spans from i0; each block starts where the last one ended
      let iA = i0;
      let nA = inkAt(i0 * ds), wA = noise1((i0 * ds) / 26, hseed + 2);
      let nB = inkAt((i0 + NS) * ds), wB = noise1(((i0 + NS) * ds) / 26, hseed + 2);
      for (let i = i0; i <= i1; i++) {
        if (i - iA >= NS) {
          iA += NS;
          nA = nB;
          wA = wB;
          const sB = (iA + NS) * ds;
          nB = inkAt(sB);
          wB = noise1(sB / 26, hseed + 2);
        }
        const p = GP[i];
        // outer hairs lift off first as the pressure drops
        let touch = (0.78 * p - lift) * 6.25 + 0.5;
        if (touch <= 0) continue;
        if (touch > 1) touch = 1;
        const g = (i - iA) / NS;
        const e = (GL[i] * cap + (nA + (nB - nA) * g) * GU[i]) * touch;
        if (e <= 0.03) continue;
        const nx = GNX[i], ny = GNY[i];
        const off = hv * GH[i] + wander * (wA + (wB - wA) * g);
        const px = GX[i] + nx * off;
        const py = GY[i] + ny * off;
        const R = rr * (0.72 + 0.28 * p) + 0.5;
        for (let tt = 0.5 - R; tt < R; tt += 1) {
          const x = px + nx * tt, y = py + ny * tt;
          if (x < 0 || y < 0) continue;
          const xi = x | 0, yi = y | 0;
          if (xi >= cw || yi >= ch) continue;
          const c = R - (tt < 0 ? -tt : tt);
          const v = c >= 1 ? e : e * c;
          const j = yi * cw + xi;
          if (v > buf[j]) buf[j] = v;
        }
      }
    }
  }

  // Ink buffer -> RGBA. The paper tooth sets a threshold per pixel: a loaded brush clears it
  // everywhere, a dry one only on the grain's peaks. keep(i, x, y) (optional) scales the ink.
  function dbFinish(P, img, q, variant, keep) {
    const d = img.data;
    const buf = P.buf, cw = P.cw, ch = P.ch;
    const rgb = parseColor(q.color);
    const T = dbToothTile(variant);
    const tx = q.seed & 255, ty = (q.seed >>> 8) & 255;
    const tooth = q.tooth;
    const A = q.alpha * 255;
    const col = new Int32Array(cw);
    for (let xx = 0; xx < cw; xx++) col[xx] = (Math.floor(P.x0 + (xx + 0.5) / P.sx) + tx) & 255;
    for (let yy = 0; yy < ch; yy++) {
      const row = ((Math.floor(P.y0 + (yy + 0.5) / P.sy) + ty) & 255) * DB_TILE;
      for (let xx = 0; xx < cw; xx++) {
        const i = yy * cw + xx;
        let e = buf[i];
        if (!(e > 0.02)) continue;
        if (keep) {
          e *= keep(i, xx, yy);
          if (!(e > 0.02)) continue;
        }
        const grain = T[row + col[xx]];
        let a = (e - (0.2 + tooth * 0.72 * grain) + 0.07) / 0.14;
        if (a <= 0) continue;
        if (a > 1) a = 1;
        a = a * a * (3 - 2 * a) * (0.8 + 0.2 * (e > 1 ? 1 : e));
        const k = i * 4;
        d[k] = rgb[0];
        d[k + 1] = rgb[1];
        d[k + 2] = rgb[2];
        d[k + 3] = (a * A + 0.5) | 0;
      }
    }
  }

  function dbParams(o, seed, variant, width, defPressure, hairGap) {
    const n = o.bristles != null ? o.bristles | 0 : Math.round(width / hairGap);
    return {
      seed: (hash(seed, variant) & 0x7fffffff) | 0,
      width,
      color: o.color || pal.ink,
      alpha: clamp(o.alpha != null ? +o.alpha : 1, 0, 1),
      dry: clamp(o.dry != null ? +o.dry : 0.45, 0, 1),
      tooth: clamp(o.tooth != null ? +o.tooth : 0.6, 0, 1),
      splay: clamp(o.splay != null ? +o.splay : 0.5, 0, 1),
      pressure: typeof o.pressure === 'function' ? o.pressure : defPressure,
      bristles: Math.max(6, Math.min(64, n)),
      wobble: o.wobble != null ? +o.wobble : 1.5,
      smooth: o.smooth !== false,
    };
  }
  function dbKey(q, o) {
    return [q.seed, q.width, q.color, q.alpha, q.dry, q.tooth, q.splay, q.bristles, q.wobble, q.smooth,
      typeof o.pressure === 'function' ? hash(String(o.pressure)) : 0, o.key != null ? String(o.key) : ''].join('|');
  }
  function dbBlit(ctx, plate) {
    if (!plate || !plate.length) return;
    ctx.save();
    if (Math.abs(renderScale() - 1) < 1e-6) ctx.imageSmoothingEnabled = false;
    for (const p of plate) ctx.drawImage(p.c, p.x, p.y, p.w, p.h);
    ctx.restore();
  }
  // The finished plate as canvases: one per run of inked columns (trunks side by side keep only
  // their own strips, not the empty paper between them), each trimmed to its inked rows.
  function dbCanvas(P, q, variant, keep) {
    const cw = P.cw, ch = P.ch;
    const img = new ImageData(cw, ch);
    dbFinish(P, img, q, variant, keep);
    const d = img.data;
    const top = new Int32Array(cw).fill(ch), bottom = new Int32Array(cw).fill(-1);
    for (let yy = 0; yy < ch; yy++) {
      for (let xx = 0, k = yy * cw * 4 + 3; xx < cw; xx++, k += 4) {
        if (d[k]) {
          if (yy < top[xx]) top[xx] = yy;
          bottom[xx] = yy;
        }
      }
    }
    const parts = [];
    const gap = 4;
    for (let xx = 0; xx < cw; ) {
      if (bottom[xx] < 0) {
        xx++;
        continue;
      }
      let x1 = xx, r0 = top[xx], r1 = bottom[xx];
      for (let e = xx + 1; e < cw && e <= x1 + gap; e++) {
        if (bottom[e] < 0) continue;
        x1 = e;
        if (top[e] < r0) r0 = top[e];
        if (bottom[e] > r1) r1 = bottom[e];
      }
      const w = x1 - xx + 1, h = r1 - r0 + 1;
      const c = newCanvas(w, h);
      c.getContext('2d').putImageData(img, -xx, -r0, xx, r0, w, h);
      parts.push({ c, x: P.x0 + xx / P.sx, y: P.y0 + r0 / P.sy, w: w / P.sx, h: h / P.sy });
      xx = x1 + 1;
    }
    return parts;
  }

  function dryBrush(ctx, pts, o = {}) {
    const lines = toPolys(pts);
    if (!lines) return;
    const strokes = lines.filter((l) => l.length >= 2);
    if (!strokes.length) return;
    const S = renderScale();
    const width = Math.max(1, o.width != null ? +o.width : 28);
    const variant = dbVariant(o);
    const q = dbParams(o, seedInt(o.seed === undefined ? 1 : o.seed), variant, width, dbPressure, 2.4);
    const key = ['dryBrush', hashClip(strokes), S, dbKey(q, o)].join('|');
    const plate = cached(key, () => {
      const b = polysBounds(strokes);
      const pad = width * (0.5 + 0.5 * q.splay) + Math.abs(q.wobble) * 1.5 + 4;
      const P = dbPlate({ x: b.x - pad, y: b.y - pad, w: b.w + 2 * pad, h: b.h + 2 * pad }, S);
      strokes.forEach((line, i) => dbStroke(P, line, Object.assign({}, q, { seed: (hash(q.seed, i) & 0x7fffffff) | 0 })));
      return dbCanvas(P, q, variant, null);
    });
    dbBlit(ctx, plate);
  }
  lib.dryBrush = dryBrush;

  // Even-odd coverage of rings on the plate grid, anti-aliased along each row.
  function dbInside(P, rings) {
    const cw = P.cw, ch = P.ch;
    const M = new Uint8Array(cw * ch);
    const xs = [];
    for (let yy = 0; yy < ch; yy++) {
      const ly = P.y0 + (yy + 0.5) / P.sy;
      xs.length = 0;
      for (const ring of rings) {
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          const a = ring[j], c = ring[i];
          if ((a[1] > ly) === (c[1] > ly)) continue;
          xs.push((a[0] + ((ly - a[1]) * (c[0] - a[0])) / (c[1] - a[1]) - P.x0) * P.sx);
        }
      }
      xs.sort((p, s) => p - s);
      const row = yy * cw;
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const xa = xs[i], xb = xs[i + 1];
        const i0 = Math.max(0, Math.floor(xa)), i1 = Math.min(cw - 1, Math.floor(xb));
        for (let xx = i0; xx <= i1; xx++) {
          const pc = xx + 0.5;
          const cov = clamp(Math.min(pc - xa, xb - pc) + 0.5);
          const v = (cov * 255 + 0.5) | 0;
          if (v > M[row + xx]) M[row + xx] = v;
        }
      }
    }
    return M;
  }

  /**
   * dryBrushFill(ctx, shape, opts) : a silhouette painted in parallel dry-brush strokes (trees,
   * figures). shape is a closed outline, a list of outlines (even-odd, several trunks on one
   * plate) or a lib.geo entry. The core stays dense, the stroke ends dry out and split, and the
   * edge frays into hairs along the stroke direction. Cached like dryBrush.
   *   angle     auto     stroke direction (radians); auto runs along the longer side of the outlines'
   *                      bounds (summed over the outlines), upward when they are tall: strokes
   *                      start loaded at the base
   *   width     26       brush width (px)
   *   spacing   0.7·width  distance between stroke centrelines
   *   reach     460      longest single stroke; longer chords are painted in overlapping reloads
   *   fringe    0.35·width  how far hairs may run past the outline along the strokes (px)
   *   dry       0.3
   *   bristles  auto     width / 3: the core is covered by several strokes, so fewer hairs each
   *   tooth, splay, color, alpha, seed, wobble, pressure, boil, key: as dryBrush
   */
  function dryBrushFill(ctx, shape, o = {}) {
    let src = shape;
    if (src && typeof src.outline === 'function') src = src.outline();
    const polys = toPolys(src);
    if (!polys) return;
    const rings = polys.filter((p) => p.length >= 3);
    if (!rings.length) return;
    const S = renderScale();
    const b = polysBounds(rings);
    const width = Math.max(2, o.width != null ? +o.width : 26);
    const spacing = Math.max(1, o.spacing != null ? +o.spacing : width * 0.7);
    const reach = Math.max(width * 2, o.reach != null ? +o.reach : 460);
    const fringe = Math.max(0, o.fringe != null ? +o.fringe : width * 0.35);
    let tall = 0;
    for (const ring of rings) {
      const rb = polysBounds([ring]);
      tall += rb.h - rb.w;
    }
    const angle = o.angle != null ? +o.angle : tall >= 0 ? -Math.PI / 2 : 0;
    const variant = dbVariant(o);
    const q = dbParams(Object.assign({ dry: 0.3 }, o), seedInt(o.seed === undefined ? 1 : o.seed), variant, width, dbFillPressure, 3);
    const key = ['dryBrushFill', hashClip(rings), S, angle, spacing, reach, fringe, dbKey(q, o)].join('|');
    const plate = cached(key, () => {
      const pad = fringe + width * 0.6 + 4;
      const P = dbPlate({ x: b.x - pad, y: b.y - pad, w: b.w + 2 * pad, h: b.h + 2 * pad }, S);
      const dx = Math.cos(angle), dy = Math.sin(angle);
      const nx = -dy, ny = dx;
      let n0 = Infinity, n1 = -Infinity;
      for (const ring of rings) {
        for (const p of ring) {
          const v = p[0] * nx + p[1] * ny;
          if (v < n0) n0 = v;
          if (v > n1) n1 = v;
        }
      }
      const r = rng(hash(q.seed, 'fill'));
      let si = 0;
      for (let off = n0 + spacing * (0.2 + 0.3 * r()); off < n1 + spacing * 0.3; off += spacing * (0.85 + 0.3 * r())) {
        const cut = Math.min(n1 - 0.5, Math.max(n0 + 0.5, off));
        // where the line {p·n = cut} crosses the outline, as positions along d
        const ts = [];
        for (const ring of rings) {
          for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            const a = ring[j], c = ring[i];
            const va = a[0] * nx + a[1] * ny - cut, vc = c[0] * nx + c[1] * ny - cut;
            if ((va > 0) === (vc > 0)) continue;
            const f = va / (va - vc);
            ts.push((a[0] + (c[0] - a[0]) * f) * dx + (a[1] + (c[1] - a[1]) * f) * dy);
          }
        }
        ts.sort((p, s) => p - s);
        for (let i = 0; i + 1 < ts.length; i += 2) {
          const t0 = ts[i] - width * 0.2 * r(), t1 = ts[i + 1] + fringe * (0.4 + 0.6 * r());
          const len = t1 - t0;
          const n = Math.max(1, Math.ceil(len / reach));
          const seg = len / n;
          const stagger = (r() - 0.5) * seg * 0.5; // reloads do not line up across strokes
          for (let k = 0; k < n; k++) {
            const a = k ? t0 + seg * k + stagger - seg * 0.12 : t0;
            const e = k < n - 1 ? t0 + seg * (k + 1) + stagger + seg * 0.06 : t1;
            const lean = (r() - 0.5) * spacing * 0.4;
            const line = [
              [a * dx + cut * nx, a * dy + cut * ny],
              [e * dx + (cut + lean) * nx, e * dy + (cut + lean) * ny],
            ];
            dbStroke(P, line, Object.assign({}, q, { seed: (hash(q.seed, si++) & 0x7fffffff) | 0 }));
          }
        }
      }
      // Trim to the outline. A pixel outside it survives where a hair ran on past the edge: the
      // outline lies behind it along the stroke (within fringe) or just beside it.
      const M = dbInside(P, rings);
      const cw = P.cw, ch = P.ch;
      const fr = fringe * P.sx;
      const hs = q.seed + 907;
      const at = (x, y) => {
        const xi = Math.floor(x), yi = Math.floor(y);
        return xi < 0 || yi < 0 || xi >= cw || yi >= ch ? 0 : M[yi * cw + xi];
      };
      const keep = (i, xx, yy) => {
        const m = M[i];
        if (m >= 255) return 1;
        const lx = P.x0 + (xx + 0.5) / P.sx, ly = P.y0 + (yy + 0.5) / P.sy;
        const hair = clamp(0.4 + 0.9 * noise2((lx * dx + ly * dy) * 0.025, (lx * nx + ly * ny) * 0.5, hs));
        const f = fr * hair;
        const px = xx + 0.5, py = yy + 0.5;
        let best = m;
        if (f > 0.5) {
          const w = 0.3 * f;
          best = Math.max(best, at(px - dx * f, py - dy * f), at(px + dx * f, py + dy * f),
            at(px - dx * f * 0.5, py - dy * f * 0.5), at(px + dx * f * 0.5, py + dy * f * 0.5),
            at(px + nx * w, py + ny * w), at(px - nx * w, py - ny * w));
        }
        return best / 255;
      };
      return dbCanvas(P, q, variant, keep);
    });
    dbBlit(ctx, plate);
  }
  lib.dryBrushFill = dryBrushFill;

  // ===========================================================================
  // Heightfield
  // ===========================================================================

  // One surface, three pictures: a false-colour map from above (fill), a contour map (contour)
  // and a perspective contour mesh (mesh). The field is sampled on the unit square (u right, v
  // down the map, toward the viewer in the mesh) and laid over one footprint `box`; the mesh
  // stands on that footprint in px, so rot [π/2, 0, 0] with persp 0 looks straight down onto the
  // map and every point lands where the fill put it. A scene cuts between the modes, or turns the
  // mesh down onto the map, and the surface stays put. Pass `range` so the colours hold across a
  // cut and do not breathe with an animated field.
  //
  // Caches are keyed by shape and size (the raster scratch, its ImageData, the ramp LUT) or by
  // the scene's own `key` for a field that does not change (its samples), never by time.

  const hfModes = {
    fill: { res: 96, fill: true, levels: 0, lines: null },
    contour: { res: 96, fill: false, levels: 10, lines: null },
    mesh: { res: 40, fill: true, levels: 0, lines: 'grid' },
  };
  const hfScratch = new Map(); // Float32Array per role and length, reused every frame
  const hfGrids = new Map(); // samples of a keyed (static) field, small LRU
  const hfLuts = new Map(); // ramp × steps → Uint8Array(256 × 3)

  function hfBuf(role, n) {
    const k = role + n;
    let b = hfScratch.get(k);
    if (!b) {
      b = new Float32Array(n);
      hfScratch.set(k, b);
    }
    return b;
  }

  // (u, v) → h for a function or a grid ({ w, h, data } row-major, or an array of rows),
  // bilinear between grid nodes, the grid spanning the unit square corner to corner.
  function hfSource(field) {
    if (typeof field === 'function') return { fn: field, gw: 0, gh: 0 };
    let gw, gh, at;
    if (Array.isArray(field) && Array.isArray(field[0])) {
      gh = field.length;
      gw = field[0].length;
      at = (i, j) => +field[j][i];
    } else if (field && field.data && field.w > 1 && field.h > 1) {
      gw = field.w | 0;
      gh = field.h | 0;
      const d = field.data;
      at = (i, j) => +d[j * gw + i];
    } else {
      throw new TypeError('lib.heightfield: field is a function (u, v) → h, { w, h, data } or an array of rows');
    }
    if (gw < 2 || gh < 2) throw new TypeError('lib.heightfield: a grid needs at least 2 × 2 values');
    const fn = (u, v) => {
      const x = clamp(u) * (gw - 1), y = clamp(v) * (gh - 1);
      const i = Math.min(gw - 2, Math.floor(x)), j = Math.min(gh - 2, Math.floor(y));
      const fx = x - i, fy = y - j;
      const a = at(i, j), b = at(i + 1, j), c = at(i, j + 1), d = at(i + 1, j + 1);
      return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
    };
    return { fn, gw, gh };
  }

  function hfBoxOf(o) {
    const b = o.box || [0, 0, W(), H()];
    return [+b[0] || 0, +b[1] || 0, b[2] > 0 ? +b[2] : W(), b[3] > 0 ? +b[3] : H()];
  }

  // Everything the modes share: the options resolved, the field sampled on (nx+1) × (ny+1)
  // nodes, the height range, the normalised heights and the hillshade per node.
  function hfPrepare(field, o) {
    const mode = o.mode || 'fill';
    const M = hfModes[mode];
    if (!M) throw new TypeError(`lib.heightfield: mode is 'fill', 'contour' or 'mesh', not '${mode}'`);
    const src = hfSource(field);
    const box = hfBoxOf(o);
    const [, , bw, bh] = box;
    const res = o.res > 0 ? o.res | 0 : src.gw ? src.gw - 1 : M.res;
    const nx = Math.max(1, Math.min(512, res));
    const ny = Math.max(1, Math.min(512, o.res > 0 || !src.gh ? Math.round((nx * bh) / bw) : src.gh - 1));
    const stride = nx + 1;
    const n = stride * (ny + 1);
    const sample = (out) => {
      for (let j = 0; j <= ny; j++) {
        for (let i = 0; i <= nx; i++) {
          const h = +src.fn(i / nx, j / ny);
          out[j * stride + i] = Number.isFinite(h) ? h : NaN;
        }
      }
      return out;
    };
    let hs;
    if (o.key != null) {
      const gk = ['hf', String(o.key), nx, ny, src.gw, src.gh].join('|');
      hs = hfGrids.get(gk);
      if (hs) {
        hfGrids.delete(gk);
      } else {
        hs = sample(new Float32Array(n));
        while (hfGrids.size >= 16) hfGrids.delete(hfGrids.keys().next().value);
      }
      hfGrids.set(gk, hs);
    } else {
      hs = sample(hfBuf('h', n));
    }
    let lo, hi;
    if (Array.isArray(o.range) && o.range.length === 2) {
      lo = +o.range[0];
      hi = +o.range[1];
    } else {
      lo = Infinity;
      hi = -Infinity;
      for (let k = 0; k < n; k++) {
        const h = hs[k];
        if (h < lo) lo = h;
        if (h > hi) hi = h;
      }
      if (!(lo <= hi)) lo = hi = 0;
    }
    const span = hi - lo || 1;
    const hn = hfBuf('n', n);
    for (let k = 0; k < n; k++) {
      const h = hs[k];
      hn[k] = h === h ? (h - lo) / span : 0; // NaN reads as the bottom of the range
    }
    const lift = o.lift != null ? +o.lift : bw * 0.2;
    const shadeAmt = o.shade != null ? clamp(+o.shade, 0, 1) : 0.35;
    const sh = hfBuf('s', n);
    if (shadeAmt > 0) {
      const L = o.light || [-0.5, -0.6, 0.62];
      const ll = Math.hypot(L[0], L[1], L[2]) || 1;
      const lx = L[0] / ll, ly = L[1] / ll, lz = L[2] / ll;
      const dx = bw / nx, dy = bh / ny;
      for (let j = 0; j <= ny; j++) {
        for (let i = 0; i <= nx; i++) {
          const k = j * stride + i;
          const i0 = i ? k - 1 : k, i1 = i < nx ? k + 1 : k;
          const j0 = j ? k - stride : k, j1 = j < ny ? k + stride : k;
          const gx = ((hn[i1] - hn[i0]) * lift) / (((i1 - i0) || 1) * dx);
          const gy = ((hn[j1] - hn[j0]) * lift) / ((((j1 - j0) / stride) || 1) * dy);
          const lam = (-gx * lx - gy * ly + lz) / Math.sqrt(gx * gx + gy * gy + 1);
          // flat ground keeps its colour; a slope toward the light brightens, away darkens
          sh[k] = Math.max(0, 1 + shadeAmt * (Math.max(0, lam) / lz - 1));
        }
      }
    } else {
      sh.fill(1);
    }
    const cut = o.cut != null ? (+o.cut - lo) / span : -Infinity;
    const levelsIn = o.levels !== undefined ? o.levels : M.levels;
    let levels = [];
    if (Array.isArray(levelsIn)) levels = levelsIn.map(Number).filter(Number.isFinite);
    else if (levelsIn > 0) for (let k = 1; k <= (levelsIn | 0); k++) levels.push(lo + (span * k) / ((levelsIn | 0) + 1));
    return { mode, M, src, box, nx, ny, stride, n, hs, hn, sh, lo, hi, span, lift, shadeAmt, cut, levels };
  }

  function hfLut(spec, steps) {
    const key = (typeof spec === 'string' ? spec : JSON.stringify(spec)) + '|' + steps;
    let lut = hfLuts.get(key);
    if (lut) return lut;
    const R = rampOf(spec);
    lut = new Uint8Array(256 * 3);
    const c = [0, 0, 0];
    for (let k = 0; k < 256; k++) {
      let v = k / 255;
      if (steps > 1) v = Math.min(steps - 1, Math.floor(v * steps)) / (steps - 1);
      rampEval(R, v, c);
      lut[k * 3] = c[0];
      lut[k * 3 + 1] = c[1];
      lut[k * 3 + 2] = c[2];
    }
    hfLuts.set(key, lut);
    return lut;
  }

  function hfView(G, o) {
    const [bx, by, bw, bh] = G.box;
    return viewOf({
      at: o.at || [bx + bw / 2, by + bh / 2],
      scale: o.scale != null ? o.scale : 1,
      rot: o.rot || [0.85, 0, 0],
      persp: o.persp != null ? o.persp : Math.max(bw, bh) * 2.2,
      shift: o.shift,
    });
  }

  // mesh space: X across the box, Y up (lift px for the whole range), Z toward the viewer, in px
  function hfVert(G, u, v, hn) {
    return [(u - 0.5) * G.box[2], hn * G.lift, (v - 0.5) * G.box[3]];
  }

  function hfFill(ctx, G, o) {
    const [bx, by, bw, bh] = G.box;
    const S = Math.min(1, renderScale());
    const cell = o.cell > 0 ? +o.cell : 3;
    const rw = Math.max(2, Math.min(2048, Math.round((bw * S) / cell)));
    const rh = Math.max(2, Math.min(2048, Math.round((bh * S) / cell)));
    const steps = Math.max(0, o.steps | 0);
    const spec = o.ramp || 'terrain';
    const lut = hfLut(spec, steps);
    const paint = (plate) => {
      const img = plate.img;
      const d = img.data;
      const { nx, ny, stride, hn, sh, cut } = G;
      for (let y = 0; y < rh; y++) {
        const gy = ((y + 0.5) / rh) * ny;
        const j = Math.min(ny - 1, Math.floor(gy));
        const fy = gy - j;
        for (let x = 0; x < rw; x++) {
          const gx = ((x + 0.5) / rw) * nx;
          const i = Math.min(nx - 1, Math.floor(gx));
          const fx = gx - i;
          const k = j * stride + i;
          const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
          const v = hn[k] * w00 + hn[k + 1] * w10 + hn[k + stride] * w01 + hn[k + stride + 1] * w11;
          const p = (y * rw + x) * 4;
          if (v < cut) {
            d[p + 3] = 0;
            continue;
          }
          const s = sh[k] * w00 + sh[k + 1] * w10 + sh[k + stride] * w01 + sh[k + stride + 1] * w11;
          const q = (v <= 0 ? 0 : v >= 1 ? 255 : (v * 255 + 0.5) | 0) * 3;
          const r = lut[q] * s, g = lut[q + 1] * s, b = lut[q + 2] * s;
          d[p] = r > 255 ? 255 : r;
          d[p + 1] = g > 255 ? 255 : g;
          d[p + 2] = b > 255 ? 255 : b;
          d[p + 3] = 255;
        }
      }
      plate.g.putImageData(img, 0, 0);
      return plate;
    };
    const makePlate = () => {
      const c = newCanvas(rw, rh);
      const g = c.getContext('2d');
      return { c, g, img: g.createImageData(rw, rh) };
    };
    // one scratch plate per raster size, repainted every call (a few ms), so light, cut and
    // range may animate without a canvas per frame
    const plate = paint(cached(['hfScratch', rw, rh].join('|'), makePlate));
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(plate.c, bx, by, bw, bh);
    ctx.restore();
    return rw * rh;
  }

  function hfContours(ctx, G, o) {
    if (!G.levels.length) return 0;
    const [bx, by, bw, bh] = G.box;
    const { nx, ny, stride, hs } = G;
    const cw = bw / nx, chh = bh / ny;
    const fieldPx = (x, y) => {
      const gx = clamp((x - bx) / cw, 0, nx), gy = clamp((y - by) / chh, 0, ny);
      const i = Math.min(nx - 1, Math.floor(gx)), j = Math.min(ny - 1, Math.floor(gy));
      const fx = gx - i, fy = gy - j;
      const k = j * stride + i;
      const a = hs[k], b = hs[k + 1], c = hs[k + stride], d = hs[k + stride + 1];
      return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
    };
    const sets = isolines(fieldPx, G.box, G.levels, { cell: cw * (1 + 1e-9) });
    const color = o.color === undefined || o.color === 'ramp' ? null : o.color;
    const spec = o.ramp || 'terrain';
    const width = o.width != null ? +o.width : 2;
    const major = Math.max(0, o.major | 0);
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    let n = 0;
    for (let k = 0; k < sets.length; k++) {
      if (!sets[k].length) continue;
      ctx.beginPath();
      for (const l of sets[k]) lib.tracePath(ctx, l.pts, l.closed);
      ctx.strokeStyle = color || lib.ramp(spec, (G.levels[k] - G.lo) / G.span);
      ctx.lineWidth = major && (k + 1) % major === 0 ? width * 2 : width;
      ctx.stroke();
      n += sets[k].length;
    }
    ctx.restore();
    return n;
  }

  /** heightMesh(field, opts) : the surface as a mesh3d { verts, edges, faces } for wire3d or faces3d. */
  function heightMesh(field, o = {}) {
    const G = hfPrepare(field, Object.assign({ mode: 'mesh', shade: 0 }, o));
    const { nx, ny, stride, hn } = G;
    const verts = [];
    const edges = [];
    const faces = [];
    const lines = o.lines === undefined ? 'grid' : o.lines;
    const every = Math.max(1, o.every | 0 || 1);
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) verts.push(hfVert(G, i / nx, j / ny, hn[j * stride + i]));
    for (let j = 0; j <= ny; j++) {
      for (let i = 0; i <= nx; i++) {
        const k = j * stride + i;
        if (i < nx && lines !== 'cols' && j % every === 0) edges.push([k, k + 1]);
        if (j < ny && lines !== 'rows' && i % every === 0) edges.push([k, k + stride]);
        if (i < nx && j < ny) faces.push([k, k + 1, k + stride + 1, k + stride]);
      }
    }
    return mesh(verts, edges, faces);
  }
  lib.heightMesh = heightMesh;

  function hfMesh(ctx, G, o) {
    const { nx, ny, stride, hn, sh, cut } = G;
    const v = hfView(G, o);
    const fill = o.fill !== undefined ? o.fill : G.M.fill;
    const lines = o.lines !== undefined ? o.lines : G.M.lines;
    const every = Math.max(1, o.every | 0 || 1);
    const width = o.width != null ? +o.width : 1.2;
    const color = o.color || pal.lineWhite;
    const lineAlpha = o.lineAlpha != null ? +o.lineAlpha : 0.55;
    const n = G.n;
    const P = hfBuf('px', n), Q = hfBuf('py', n), Z = hfBuf('pz', n);
    for (let j = 0; j <= ny; j++) {
      for (let i = 0; i <= nx; i++) {
        const k = j * stride + i;
        const p = projectView(hfVert(G, i / nx, j / ny, hn[k]), v);
        P[k] = p[0];
        Q[k] = p[1];
        Z[k] = p[2];
      }
    }
    const cells = nx * ny;
    const order = hfBuf('ord', cells);
    const depth = hfBuf('dep', cells);
    let m = 0;
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const k = j * stride + i;
        if ((hn[k] + hn[k + 1] + hn[k + stride] + hn[k + stride + 1]) * 0.25 < cut) continue;
        depth[m] = (Z[k] + Z[k + 1] + Z[k + stride] + Z[k + stride + 1]) * 0.25;
        order[m] = j * nx + i;
        m++;
      }
    }
    const idx = hfBuf('idx', cells).subarray(0, m);
    for (let q = 0; q < m; q++) idx[q] = q;
    idx.sort((a, b) => depth[a] - depth[b] || order[a] - order[b]);
    const steps = Math.max(0, o.steps | 0);
    const lut = fill === true ? hfLut(o.ramp || 'terrain', steps) : null;
    const rowsOn = lines === 'grid' || lines === 'rows';
    const colsOn = lines === 'grid' || lines === 'cols';
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const base = ctx.globalAlpha;
    for (let q = 0; q < m; q++) {
      const c = order[idx[q]];
      const i = c % nx, j = (c - i) / nx;
      const k = j * stride + i;
      const a = k, b = k + 1, d = k + stride + 1, e = k + stride;
      ctx.beginPath();
      ctx.moveTo(P[a], Q[a]);
      ctx.lineTo(P[b], Q[b]);
      ctx.lineTo(P[d], Q[d]);
      ctx.lineTo(P[e], Q[e]);
      ctx.closePath();
      let style;
      if (lut) {
        const hv = (hn[a] + hn[b] + hn[d] + hn[e]) * 0.25;
        const s = (sh[a] + sh[b] + sh[d] + sh[e]) * 0.25;
        const t = (hv <= 0 ? 0 : hv >= 1 ? 255 : (hv * 255 + 0.5) | 0) * 3;
        style = `rgb(${Math.min(255, Math.round(lut[t] * s))},${Math.min(255, Math.round(lut[t + 1] * s))},${Math.min(255, Math.round(lut[t + 2] * s))})`;
      } else {
        style = fill;
      }
      ctx.globalAlpha = base;
      ctx.fillStyle = style;
      ctx.fill();
      // the quad's own colour over its rim hides the hairline seams between neighbours
      ctx.strokeStyle = style;
      ctx.lineWidth = 1;
      ctx.stroke();
      if (!lines || width <= 0) continue;
      ctx.beginPath();
      if (rowsOn && j % every === 0) {
        ctx.moveTo(P[a], Q[a]);
        ctx.lineTo(P[b], Q[b]);
      }
      if (rowsOn && (j + 1) % every === 0) {
        ctx.moveTo(P[e], Q[e]);
        ctx.lineTo(P[d], Q[d]);
      }
      if (colsOn && i % every === 0) {
        ctx.moveTo(P[a], Q[a]);
        ctx.lineTo(P[e], Q[e]);
      }
      if (colsOn && (i + 1) % every === 0) {
        ctx.moveTo(P[b], Q[b]);
        ctx.lineTo(P[d], Q[d]);
      }
      ctx.globalAlpha = base * lineAlpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.stroke();
    }
    ctx.restore();
    return m;
  }

  /**
   * heightfield(ctx, field, opts) : a height field as a false-colour map, a contour map or a
   * perspective contour mesh. field is a function (u, v) → h over the unit square (u right, v
   * down the map), a grid { w, h, data } (row-major) or an array of rows. Returns
   * { lo, hi, nx, ny, levels, drawn }.
   *   mode 'fill' | 'contour' | 'mesh'   presets of the options below
   *   box [0, 0, W, H]   the map's footprint in px; the mesh stands on it
   *   res 96 (mesh 40)   grid cells across (rows follow the box aspect); a grid field keeps its own
   *   range [lo, hi]     heights mapped to ramp 0..1 (default the sampled min and max)
   *   ramp 'terrain'     a lib.ramps name or a list of pal names; steps 0 (N: N flat bands)
   *   shade 0.35 (0..1)  hillshade from light [-0.5, -0.6, 0.62] (map x, map y, up)
   *   lift 0.2 × box w   px the whole range stands up in the mesh (and steepens the shade)
   *   cut                heights below this are left empty (an island on the ground)
   *   fill               true: ramp colour; a colour: flat (hidden-line wire); false: none
   *                      (fill and mesh default true, contour false)
   *   levels             contour count or an array of heights (contour 10, else 0)
   *   color 'ramp'       contour colour ('ramp' colours each level by height); in the mesh the
   *                      grid colour, pal.lineWhite, at lineAlpha 0.55
   *   width 2 (mesh 1.2) major 0 (every major-th contour twice as wide)
   *   cell 3             px per raster cell of the fill (the plate is smoothed when drawn)
   *   lines 'grid' | 'rows' | 'cols' | null (mesh)   every 1 (a line on every nth node)
   *   rot [0.85, 0, 0]  persp 2.2 × box   at box centre   scale 1   shift   the mesh view
   *                      (wire3d's; rot [π/2, 0, 0] with persp 0 is the map from above)
   *   depthFade, hidden  passed to wire3d when the mesh has fill false
   *   key                a field that never changes: its samples are cached by key, res and box
   *                      aspect (the options may still animate; the field must not)
   */
  function heightfield(ctx, field, o = {}) {
    const G = hfPrepare(field, o);
    let drawn = 0;
    const fill = o.fill !== undefined ? o.fill : G.M.fill;
    if (G.mode === 'mesh') {
      if (fill) {
        drawn = hfMesh(ctx, G, o);
      } else {
        const m = heightMesh(field, o);
        const view = hfView(G, o);
        drawn = wire3d(ctx, m, {
          at: [view.ax, view.ay],
          scale: view.scale,
          rot: [view.rx, view.ry, view.rz],
          persp: view.persp,
          shift: o.shift,
          color: o.color || pal.lineWhite,
          width: o.width != null ? o.width : 1.2,
          depthFade: o.depthFade,
          hidden: o.hidden,
        });
      }
    } else {
      if (fill === true) drawn += hfFill(ctx, G, o);
      else if (typeof fill === 'string') {
        ctx.save();
        ctx.fillStyle = fill;
        ctx.fillRect(G.box[0], G.box[1], G.box[2], G.box[3]);
        ctx.restore();
      }
      drawn += hfContours(ctx, G, o);
    }
    return { lo: G.lo, hi: G.hi, nx: G.nx, ny: G.ny, levels: G.levels.slice(), drawn };
  }
  lib.heightfield = heightfield;

  /**
   * heightPoint(field, u, v, opts) : [x, y, depth] of the surface at (u, v) in the picture
   * heightfield draws with the same field and opts: on the map for fill and contour (depth is the
   * height 0..1 in range), projected for mesh. Pins a label or a marker to the surface in any mode.
   */
  function heightPoint(field, u, v, o = {}) {
    const src = hfSource(field);
    let lo, hi;
    if (Array.isArray(o.range) && o.range.length === 2) {
      lo = +o.range[0];
      hi = +o.range[1];
    } else {
      const G = hfPrepare(field, Object.assign({}, o, { shade: 0, levels: 0 }));
      lo = G.lo;
      hi = G.hi;
    }
    const h = +src.fn(clamp(u), clamp(v));
    const hn = Number.isFinite(h) ? (h - lo) / (hi - lo || 1) : 0;
    const box = hfBoxOf(o);
    if ((o.mode || 'fill') !== 'mesh') return [box[0] + u * box[2], box[1] + v * box[3], hn];
    const G = { box, lift: o.lift != null ? +o.lift : box[2] * 0.2 };
    return projectView(hfVert(G, u, v, hn), hfView(G, o));
  }
  lib.heightPoint = heightPoint;

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
