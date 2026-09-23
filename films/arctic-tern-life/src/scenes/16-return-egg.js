// 16 return-egg : "Home: a new egg". Illustrated, global T 29.5 to 30.5 (1.0 s).
// Back on the Sand Island shingle. An adult in breeding plumage broods two eggs in a shallow scrape;
// its mate lands from the upper left with a sand eel (3 drawings) and offers it in courtship; on
// T 29.75 the sitter rises and steps off the clutch; on the 30.0 beat the camera snap-zooms 1x to 20x
// about the fixed point that carries the first egg (world (470, 1320), 38 px, blunt end left) onto
// G1, landing by T 30.417 and holding, so 17 match-cuts to the lavender egg on the same pixels.
//
// Coordinates: world = frame px at zoom 1. The zoom holds world point FIX = (466.3, 1342.1) still,
// screen = FIX + z (world - FIX), which puts the egg's world centre on screen (540, 900) at z = 20.
// The eggs are drawn in G1 coordinates (shot 03's inked egg, copied verbatim) scaled by z / 20 about
// the egg's screen centre, so on the landing frames the transform is the identity and the egg sits
// exactly on G1.
//
// Layers, back to front:
//   1  stripes (screen, stripeCream / stripeYellow, 6 px drift per beat)
//   -- world, under the zoom --
//   2  far range and the near hills of Young Sound, the sound (engraved hatching, drift ice), surf
//   3  shingle: base, grit, moss, a few thousand pebbles back to front, the scrape (cached at zoom 1)
//   4  the colony overhead (distant terns, zoom 1 only), construction lines (inkFaint 30 percent)
//   5  cast shadows, the mate (lands, offers the eel), the sitter (broods, rises, steps off, reaches)
//   -- G1 frame (egg coordinates scaled by z / 20) --
//   6  construction circles r 470 / 640 and the egg axis (17's guide geometry), egg shadows,
//      the sibling egg (03's placement), the G1 egg (drawInkedEgg)
//   -- overlays, screen space --
//   7  annBlue dashed descent of the mate, annYellow target ring on the egg (tightens with the snap,
//      lands on r 470) with 8 ticks on the beat, inkFaint radial snap guides
(function () {
  'use strict';
  const ID = 'return-egg';
  const REF = 'egg-blueprint'; // the G1 blotches are seeded from shot 02 so they land on its outlines
  const LIB = FILM.lib;
  const P = LIB.pal;
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const FR = 1 / 24;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const sstep = (a, b, x) => {
    const u = clamp((x - a) / (b - a));
    return u * u * (3 - 2 * u);
  };
  // shot 03's seed factory, copied with its inked egg so the egg is the same drawing
  const sd = (...k) => LIB.hash('egg-hatch', ...k) & 0x7fffffff;
  // this shot's own seeds
  const sm = (...k) => LIB.hash(ID, ...k) & 0x7fffffff;

  // beats (shot-local seconds); the mate lands on T 29.5 (t 0): wings high, wings half, folded
    const B_RISE = 0.25; // T 29.75 the sitter rises off the eggs
  const B_SNAP = 0.5; // T 30.0 the snap zoom starts, the target ring on the egg
  const ZOOM_SPAN = 11 * FR; // with a one-frame lead the zoom lands on T 30.417 and holds two frames
  const Z_END = 20;

  // ===========================================================================
  // World layout (frame px at zoom 1)
  // ===========================================================================
  const EGG = [470, 1320]; // the first egg's world centre, 38 px long
  const FIX = [(540 - Z_END * EGG[0]) / (1 - Z_END), (900 - Z_END * EGG[1]) / (1 - Z_END)]; // (466.3, 1342.1)
  const HORIZON = 800; // foot of the far shore, top of the sound
  const SHORE = 950; // the sound meets the shingle
  const SCRAPE = { x: 492, y: 1326, rx: 58, ry: 20 };
  const K = 0.68; // bird drawing scale: 04's 2.0 px per mm drawing at 1.36 px per mm
  const TD_B = [321, 1298]; // the mate's touch-down (feet), facing right
  const SIT = [500, 1360]; // the sitter's feet origin while brooding (legs hidden, belly on the eggs), facing left
  const STAND = [662, 1302]; // the sitter standing off the clutch
  const FISH = [486, 1200]; // where the eel is offered, above the eggs between the two bills
  const DESC = [[110, 400], [190, 900]]; // the mate's descent from the upper left: start, control (Bezier into TD_B)

  // ===========================================================================
  // G1 geometry (docs/storyboard.md, Shared geometry G1), exact numbers. Copied from 03.
  // ===========================================================================
  const G1_TABLE = [[160, 0], [175, 120], [200, 175], [240, 222], [300, 257], [380, 274], [460, 278], [540, 275], [620, 264], [700, 242], [780, 205], [840, 160], [880, 112], [905, 62], [920, 0]];
  const AXIS_Y = 900;
  const CONTACT = [460, 1178];
  function halfH(x) {
    if (x <= 160 || x >= 920) return 0;
    for (let i = 0; i < G1_TABLE.length - 1; i++) {
      const a = G1_TABLE[i], b = G1_TABLE[i + 1];
      if (x <= b[0]) return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]);
    }
    return 0;
  }
  // closed outline: upper side left to right, lower side back (no repeated end points)
  const G1_OUTLINE = (() => {
    const out = [];
    for (let x = 160; x <= 920; x += 4) out.push([x, AXIS_Y - halfH(x)]);
    for (let x = 916; x >= 164; x -= 4) out.push([x, AXIS_Y + halfH(x)]);
    return out;
  })();

  // the shared blotch recipe, call order exactly as in the brief (x, y, rad per blotch)
  function blotchSet(L, seed) {
    const r = L.rng(seed);
    const large = [];
    const small = [];
    for (let i = 0; i < 22; i++) {
      const x = 220 + r() * 180;
      const y = 900 + (r() * 2 - 1) * 0.85 * halfH(x);
      const rad = 14 + r() * 20;
      large.push([x, y, rad]);
    }
    for (let i = 0; i < 70; i++) {
      const x = 180 + r() * 720;
      const y = 900 + (r() * 2 - 1) * 0.9 * halfH(x);
      const rad = 3 + r() * 6;
      small.push([x, y, rad]);
    }
    return { large, small };
  }

  // polygon helpers
  function polyPath(pts, closed = true) {
    const p = new Path2D();
    for (let i = 0; i < pts.length; i++) (i ? p.lineTo : p.moveTo).call(p, pts[i][0], pts[i][1]);
    if (closed) p.closePath();
    return p;
  }
  // a rounded closed blob through the midpoints of a vertex ring
  function blobInto(p, V) {
    const n = V.length;
    const m0 = [(V[n - 1][0] + V[0][0]) / 2, (V[n - 1][1] + V[0][1]) / 2];
    p.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++) {
      const a = V[i], b = V[(i + 1) % n];
      p.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    }
    p.closePath();
  }
  function strokeBatch(ctx, segs, width, color, alpha) {
    if (!segs.length) return;
    const p = new Path2D();
    for (const s of segs) {
      p.moveTo(s[0], s[1]);
      if (s.length >= 6) p.quadraticCurveTo(s[2], s[3], s[4], s[5]);
      else p.lineTo(s[2], s[3]);
    }
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.globalAlpha *= alpha;
    ctx.stroke(p);
    ctx.restore();
  }

  // ===========================================================================
  // Memoised geometry (t-independent)
  // ===========================================================================
  let GEO = null;
  function geo(L) {
    if (GEO) return GEO;
    const G = {};
    // shot 03's egg entries, seeds kept: the G1 egg and the sibling
    G.egg = { outline: G1_OUTLINE, path: polyPath(G1_OUTLINE), blot: blotchSet(L, L.hash(REF, 'blotch')), seed: sd('egg') };
    G.sib = { outline: G1_OUTLINE, path: G.egg.path, blot: blotchSet(L, L.hash('egg-hatch', 'sibling')), seed: sd('sibling') };
    for (const E of [G.egg, G.sib]) E.shapes = blotchShapes(L, E);
    G.c = {
      pebDark: L.mix(P.shingle, P.shingleDeep, 0.45),
      scrape: L.mix(P.shingle, P.shingleDeep, 0.28),
      ground: L.mix(P.shingle, P.shingleDeep, 0.35),
    };
    buildShore(L, G);
    G.peb = buildPebbles(L);
    G.moss = buildMoss(L);
    GEO = G;
    return G;
  }

  // the irregular outline of one blotch, copied verbatim from 02 (blotchOutline) so the inked
  // pigment fills exactly the schemEgg outlines it matches on the cut
  function blotchOutline(L, b) {
    const n = b.large ? 14 : 8;
    const rot = L.h3(b.i, 1, 9011) * TAU;
    const ecc = 0.72 + 0.28 * L.h3(b.i, 2, 9011);
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const pts = [];
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU;
      const rr = b.rad * (0.76 + 0.36 * L.h3(b.i, k + 3, 9011));
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr * ecc;
      pts.push([b.x + x * cr - y * sr, b.y + x * sr + y * cr]);
    }
    return pts;
  }
  function blotchShapes(L, E) {
    return {
      large: E.blot.large.map(([x, y, rad], i) => blotchOutline(L, { x, y, rad, large: true, i })),
      small: E.blot.small.map(([x, y, rad], i) => blotchOutline(L, { x, y, rad, large: false, i: 22 + i })),
    };
  }

  // ===========================================================================
  // The inked egg, copied verbatim from 03 (drawInkedEgg, eggShade, paintEgg).
  //   opts.pen   G1 px per screen px for pen widths, default 1
  //   opts.lod   texture spacing multiplier (1 at zoom 1), default 1
  //   opts.clip  optional Path2D: draw only inside it (the cap, the opened shell)
  //   opts.outline  false to skip the 5 px hero outline
  // ===========================================================================
  function drawInkedEgg(ctx, L, bi, opts = {}) {
    const G = geo(L);
    paintEgg(ctx, L, bi, G.egg, opts);
  }

  // shade tone on an egg in G1 coordinates: lower right third, a touch under the whole belly
  function eggShade(x, y) {
    const u = (x - 540) / 380;
    const v = (y - AXIS_Y) / Math.max(18, halfH(x));
    return sstep(0.08, 0.95, 0.62 * v + 0.42 * u + 0.12);
  }

  function paintEgg(ctx, L, bi, E, o = {}) {
    const P = L.pal;
    const G = geo(L);
    const pen = o.pen || 1;
    const lod = o.lod || 1;
    const s = E.seed;
    ctx.save();
    if (o.clip) ctx.clip(o.clip);
    // ground colour
    ctx.fillStyle = P.egg;
    ctx.fill(E.path);
    ctx.save();
    ctx.clip(E.path);
    // lit side: flat eggPale on the upper left, its edge broken into stipple
    ctx.fillStyle = P.eggPale;
    ctx.beginPath();
    L.tracePath(ctx, L.ellipsePts(385, 790, 255, 165, 48, -0.12), true);
    ctx.fill();
    L.stipple(ctx, E.outline, {
      color: P.eggPale, alpha: 0.95, spacing: 6 * lod, r: [1.2 * pen, 2.4 * pen], seed: s + 5, boil: bi,
      density: (x, y) => {
        const d = Math.hypot((x - 385) / 255, (y - 790) / 165);
        return sstep(1.45, 1.0, d) * 0.8;
      },
    });
    // fine shell speckle, densest toward the blunt end
    L.stipple(ctx, E.outline, { color: P.eggSpot, alpha: 0.55, spacing: 11 * lod, r: [0.9 * pen, 1.8 * pen], seed: s + 6, boil: bi, density: (x) => 0.18 + 0.4 * sstep(620, 220, x) });

    // under-blotches: paler, spread pigment beneath the large blotches
    const jit = (V, k) =>
      V.map((p, j) => [p[0] + (L.h3(k * 17 + j, bi, s + 7) - 0.5) * 1.1 * pen, p[1] + (L.h3(j, k * 13 + bi, s + 8) - 0.5) * 1.1 * pen]);
    const under = new Path2D();
    E.shapes.large.forEach((V, i) => {
      const [cx, cy] = E.blot.large[i];
      blobInto(under, jit(V.map((p) => [cx + (p[0] - cx) * 1.2 + 1.5, cy + (p[1] - cy) * 1.2 + 2.5]), i + 200));
    });
    ctx.fillStyle = P.eggSpot;
    ctx.globalAlpha = 0.38;
    ctx.fill(under);
    ctx.globalAlpha = 1;
    // small spots, then the large dark blotches crowded toward the blunt end
    const small = new Path2D();
    E.shapes.small.forEach((V, i) => blobInto(small, jit(V, i + 400)));
    ctx.fillStyle = P.eggSpot;
    ctx.fill(small);
    const large = new Path2D();
    E.shapes.large.forEach((V, i) => blobInto(large, jit(V, i)));
    ctx.fillStyle = P.eggBlotch;
    ctx.fill(large);
    ctx.lineWidth = 1.1 * pen;
    ctx.strokeStyle = P.ink;
    ctx.globalAlpha = 0.45;
    ctx.stroke(large);
    ctx.globalAlpha = 1;

    // tone: cross-hatched shade on the lower right third, stipple in the deepest part
    L.crossHatch(ctx, E.outline, {
      density: eggShade, tone: 0.95, layers: 3, spacing: 7 * lod, crossSpacing: 7 * lod, width: 1.4 * pen,
      color: P.inkSoft, alpha: 0.85, seed: s + 11, boil: bi, length: [14 * lod, 44 * lod], gap: [2 * lod, 6 * lod],
      inset: 4 * lod, overshoot: 2 * lod, bow: 0.7 * lod,
    });
    L.stipple(ctx, E.outline, { color: P.ink, alpha: 0.5, spacing: 8 * lod, r: [0.9 * pen, 1.9 * pen], seed: s + 12, boil: bi, density: (x, y) => eggShade(x, y) * 1.1 - 0.55 });
    // contour lines round the belly, following the form
    const contours = [];
    for (let k = 0; k < 9; k++) {
      const x = 470 + k * 48;
      const h = halfH(x);
      const y0 = AXIS_Y + h * 0.35, y1 = AXIS_Y + h * 0.97;
      contours.push([x - 2, y0, x + 16 + (x - 540) * 0.05, (y0 + y1) / 2, x + 4, y1]);
    }
    strokeBatch(ctx, contours, 1.3 * pen, P.inkSoft, 0.45);
    // reflected light along the lower right edge
    const refl = [];
    for (let x = 520; x <= 880; x += 12) refl.push([x, AXIS_Y + halfH(x) - 9 * pen]);
    L.inkPath(ctx, refl, { width: 2.6 * pen, color: P.eggPale, alpha: 0.7, seed: s + 13, boil: bi, taper: [60, 60], wobble: 1 });
    // gloss on the lit shoulder
    const gloss = [[300, 712, 332, 690, 372, 681], [262, 760, 272, 740, 292, 726], [420, 668, 452, 662, 480, 662]];
    strokeBatch(ctx, gloss, 4 * pen, P.white, 0.85);
    ctx.restore();

    // hero outline, 5 px ink with an occasional second pass
    if (o.outline !== false) L.inkPath(ctx, E.outline, { closed: true, width: 5 * pen, color: P.ink, seed: s + 1, boil: bi, double: { alpha: 0.4, width: 0.3, offset: 3 * pen } });
    ctx.restore();
  }

  // a cast shadow on the scrape floor, down and to the right of a resting form (03, G1 coordinates)
  function castShadow(ctx, L, cx, cy, rx, ry, pen, lod, bi, k) {
    const P = L.pal;
    const pts = L.ellipsePts(cx, cy, rx, ry, 40);
    L.crossHatch(ctx, pts, { tone: 1, layers: 2, spacing: 5 * lod, crossSpacing: 7 * lod, width: 1.3 * pen, color: P.ink, alpha: 0.7, length: [10 * lod, 30 * lod], seed: sd('shadow', k), boil: bi, density: (x, y) => sstep(1.05, 0.35, Math.hypot((x - cx) / rx, (y - cy) / ry)) });
  }

  // ===========================================================================
  // Small vector helpers (from 04)
  // ===========================================================================
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const mul = (a, k) => [a[0] * k, a[1] * k];
  const dir = (a) => [Math.cos(a), Math.sin(a)];
  const mix2 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
  const bez = (p0, p1, p2, u) => {
    const v = 1 - u;
    return [v * v * p0[0] + 2 * v * u * p1[0] + u * u * p2[0], v * v * p0[1] + 2 * v * u * p1[1] + u * u * p2[1]];
  };
  const inEll = (x, y, e, k = 1) => Math.pow((x - e.x) / (e.rx * k), 2) + Math.pow((y - e.y) / (e.ry * k), 2) < 1;

  // uniform Catmull-Rom resample (for fills and hatch clips that follow the inked curve)
  function cr(pts, closed, per = 6) {
    const n = pts.length;
    if (n < 3) return pts.slice();
    const out = [];
    const get = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
      for (let j = 0; j < per; j++) {
        const s = j / per, s2 = s * s, s3 = s2 * s;
        out.push([
          0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * s + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * s2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * s3),
          0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * s + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * s2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * s3),
        ]);
      }
    }
    if (!closed) out.push(pts[n - 1]);
    return out;
  }
  function fillPoly(ctx, pts, color, alpha = 1) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    LIB.tracePath(ctx, pts, true);
    ctx.fill();
    ctx.restore();
  }
  function clipInside(ctx, poly) {
    ctx.beginPath();
    LIB.tracePath(ctx, poly, true);
    ctx.clip();
  }
  // a tapered pen stroke appended to a Path2D
  function taperStroke(path, pts, w0, w1) {
    const n = pts.length;
    if (n < 2) return;
    const lx = [], ly = [], rx = [], ry = [];
    for (let i = 0; i < n; i++) {
      const a = pts[i > 0 ? i - 1 : 0], b = pts[i < n - 1 ? i + 1 : n - 1];
      let tx = b[0] - a[0], ty = b[1] - a[1];
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl;
      ty /= tl;
      const hw = lerp(w0, w1, i / (n - 1)) / 2;
      lx.push(pts[i][0] - ty * hw);
      ly.push(pts[i][1] + tx * hw);
      rx.push(pts[i][0] + ty * hw);
      ry.push(pts[i][1] - tx * hw);
    }
    path.moveTo(lx[0], ly[0]);
    for (let i = 1; i < n; i++) path.lineTo(lx[i], ly[i]);
    for (let i = n - 1; i >= 0; i--) path.lineTo(rx[i], ry[i]);
    path.closePath();
  }
  function fillPath(ctx, path, color, alpha = 1) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = color;
    ctx.fill(path);
    ctx.restore();
  }
  function strokePath(ctx, path, color, width, alpha = 1, dash) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (dash) ctx.setLineDash(dash);
    ctx.stroke(path);
    ctx.restore();
  }
  // a small hand wobble for plain strokes, per boil drawing
  const jig = (i, k, bi, amp) => (LIB.h3(i, k, bi * 7 + 3) - 0.5) * 2 * amp;
  // irregular closed blob round an ellipse
  function blob(cx, cy, rx, ry, rot, n, rough, seed) {
    const out = [];
    const c = Math.cos(rot), s = Math.sin(rot);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const k = 1 + rough * LIB.noise1(i * 0.9 + 0.3, seed) + rough * 0.5 * LIB.noise1(i * 2.3, seed + 5);
      const x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k;
      out.push([cx + x * c - y * s, cy + x * s + y * c]);
    }
    return out;
  }
  // an inked line in world units under the zoom: every px option scaled by pen (screen weight held)
  function inkW(ctx, pts, o, pen) {
    const q = Object.assign({}, o);
    q.width = (o.width != null ? o.width : 3) * pen;
    q.wobble = (o.wobble != null ? o.wobble : 2) * pen;
    q.step = (o.step || 2.5) * pen;
    q.tremble = (o.tremble != null ? o.tremble : 0.4) * pen;
    if (o.taper) q.taper = Array.isArray(o.taper) ? o.taper.map((v) => v * pen) : o.taper * pen;
    if (o.double) q.double = Object.assign({}, o.double, { offset: (o.double.offset || 3) * pen });
    LIB.inkPath(ctx, pts, q);
  }

  // ===========================================================================
  // Far shore and the sound (world px; adapted from 04 for this horizon, drawn at any zoom)
  // ===========================================================================
  function buildShore(L, G) {
    const bump = (x, c, w, h) => h * Math.exp(-((x - c) * (x - c)) / (2 * w * w));
    const nearH = (x) => 14 + bump(x, 90, 150, 70) + bump(x, 420, 120, 44) + bump(x, 800, 180, 96) + bump(x, 1090, 90, 52) + 10 * L.fbm1(x * 0.014, sm('hill'), 3);
    const farH = (x) => 52 + bump(x, 260, 150, 92) + bump(x, 640, 130, 136) + bump(x, 980, 150, 84) + 18 * L.fbm1(x * 0.01, sm('far'), 3);
    G.nearH = nearH;
    G.near = [];
    G.far = [];
    for (let x = -140; x <= 1220; x += 10) {
      G.near.push([x, HORIZON - nearH(x)]);
      G.far.push([x, HORIZON - farH(x)]);
    }
    G.nearPoly = G.near.concat([[1220, HORIZON + 4], [-140, HORIZON + 4]]);
    G.farPoly = G.far.concat([[1220, HORIZON + 4], [-140, HORIZON + 4]]);
    const slope = (H, x) => (H(x + 5) - H(x - 5)) / 10;
    const keep = (H, segs, k, base, seed) => {
      const r = L.rng(seed);
      return segs.filter((q) => {
        const x = (q[0] + q[2]) / 2, y = (q[1] + q[3]) / 2;
        const depth = (y - (HORIZON - H(x))) / Math.max(20, H(x));
        return clamp(-slope(H, x) * k + base + 0.35 * depth) > r();
      });
    };
    G.hillHatch = keep(nearH, hatchSegs(G.nearPoly, 4.5, -1.2, sm('hillH'), [6, 16], [2, 5]), 2.2, 0.12, sm('hillK'));
    G.hillCross = keep(nearH, hatchSegs(G.nearPoly, 6, -0.35, sm('hillC'), [5, 12], [3, 8]), 2.0, -0.35, sm('hillK2'));
    G.farHatch = keep(farH, hatchSegs(G.farPoly, 6, -1.2, sm('farH'), [6, 18], [3, 7]), 1.8, -0.1, sm('farK'));
    // snow patches on the near hills and snow caps on the far range
    G.snow = [];
    {
      const r = L.rng(sm('snow'));
      for (let i = 0; i < 18; i++) {
        const x = r.range(-60, 1160);
        const h = nearH(x);
        if (h < 34) continue;
        const y = HORIZON - h + r.range(5, Math.min(28, h * 0.5));
        const w = r.range(9, 30), hh = r.range(2.5, 6);
        G.snow.push(blob(x, y, w, hh, r.range(-0.4, 0.2), 10, 0.25, sm('snow', i)));
      }
      G.farSnow = [];
      for (const c of [260, 640, 980]) {
        const top = HORIZON - farH(c);
        const pts = [];
        for (let x = c - 60; x <= c + 60; x += 8) pts.push([x, HORIZON - farH(x) + 1]);
        for (let x = c + 60; x >= c - 60; x -= 12) pts.push([x, Math.max(HORIZON - farH(x) + 2, top + 20 + 6 * Math.sin(x * 0.2))]);
        G.farSnow.push(pts);
      }
    }
    // the sound: engraved horizontal hatching, denser toward the far shore
    G.seaLines = [];
    {
      const r = L.rng(sm('sea'));
      let y = HORIZON + 5;
      let row = 0;
      while (y < SHORE - 6) {
        const u = (y - HORIZON) / (SHORE - HORIZON);
        let x = -160 + r() * 40;
        while (x < 1240) {
          const len = lerp(50, 130, r()) * lerp(0.7, 1.1, u);
          const dens = lerp(0.95, 0.5, u) + 0.2 * L.noise1(x * 0.01 + row, sm('seaN'));
          if (r() < dens) G.seaLines.push({ x0: x, x1: x + len, y: y + r.range(-0.8, 0.8), w: lerp(1.0, 1.5, r()), a: lerp(0.45, 0.8, r()), row });
          x += len + lerp(6, 28, r());
        }
        y += lerp(3.6, 9, Math.pow(u, 0.9)) * lerp(0.85, 1.15, r());
        row++;
      }
      G.ice = [];
      const iceAt = [[120, 820, 22], [176, 827, 10], [560, 836, 26], [612, 828, 9], [900, 850, 18], [990, 820, 12], [330, 868, 14], [760, 890, 11]];
      iceAt.forEach(([x, y, w], i) => G.ice.push({ top: blob(x, y, w, w * 0.22, 0, 12, 0.18, sm('ice', i)), x, y, w }));
    }
  }

  // precomputed hatch strokes over a polygon: [x0, y0, x1, y1] per stroke (from 04)
  function hatchSegs(poly, spacing, angle, seed, len = [6, 18], gap = [2, 5]) {
    const r = LIB.rng(seed);
    const dx = Math.cos(angle), dy = Math.sin(angle), nx = -dy, ny = dx;
    const U = poly.map((p) => p[0] * dx + p[1] * dy), V = poly.map((p) => p[0] * nx + p[1] * ny);
    let vmin = Infinity, vmax = -Infinity;
    for (const v of V) {
      if (v < vmin) vmin = v;
      if (v > vmax) vmax = v;
    }
    const out = [];
    for (let v = vmin + spacing * r(); v < vmax; v += spacing * (0.85 + 0.3 * r())) {
      const xs = [];
      for (let i = 0, j = V.length - 1; i < V.length; j = i++) {
        if (V[i] > v !== V[j] > v) xs.push(U[i] + ((v - V[i]) / (V[j] - V[i])) * (U[j] - U[i]));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const b = xs[k + 1];
        let u = xs[k] + r() * 2;
        while (u < b - 2) {
          const e = Math.min(b - r() * 1.5, u + lerp(len[0], len[1], r()));
          if (e - u > 2) out.push([u * dx + v * nx, u * dy + v * ny, e * dx + v * nx, e * dy + v * ny]);
          u = e + lerp(gap[0], gap[1], r());
        }
      }
    }
    return out;
  }
  function segPath(path, segs, bv, amp, w0, w1, key = 0) {
    segs.forEach((s, i) => {
      taperStroke(path, [[s[0] + jig(i, key, bv, amp), s[1] + jig(key, i, bv, amp)], [s[2] + jig(i, key + 1, bv, amp), s[3] + jig(key + 1, i, bv, amp)]], w0, w1);
    });
  }

  function drawFarShore(ctx, G, pen, bv) {
    fillPoly(ctx, G.farPoly, P.iceShade, 0.55);
    G.farSnow.forEach((s) => fillPoly(ctx, s, P.ice, 0.85));
    {
      const p = new Path2D();
      segPath(p, G.farHatch, bv, 0.4, 1.1 * pen, 0.4 * pen, 1);
      fillPath(ctx, p, P.iceDeep, 0.55);
    }
    inkW(ctx, G.far, { width: 1.6, color: P.inkFaint, alpha: 0.7, seed: sm('farL'), wobble: 1.2, taper: [30, 30], boil: bv }, pen);
    fillPoly(ctx, G.nearPoly, P.shingle);
    {
      const p = new Path2D();
      segPath(p, G.hillHatch, bv, 0.45, 1.3 * pen, 0.45 * pen, 2);
      fillPath(ctx, p, P.shingleDeep, 0.9);
      const q = new Path2D();
      segPath(q, G.hillCross, bv, 0.45, 1.1 * pen, 0.4 * pen, 3);
      fillPath(ctx, q, P.inkSoft, 0.55);
    }
    G.snow.forEach((s, i) => inkW(ctx, s, { closed: true, width: 1.2, color: P.inkSoft, alpha: 0.6, fill: P.ice, seed: sm('snowL', i), wobble: 0.4, taper: [3, 3], boil: bv }, pen));
    inkW(ctx, G.near, { width: 3, seed: sm('ridge'), wobble: 1.4, taper: [30, 30], boil: bv, double: { offset: 3, width: 0.3, alpha: 0.35, from: 0.2, to: 0.55 } }, pen);
    inkW(ctx, [[-60, HORIZON + 2], [1140, HORIZON + 2]], { width: 1.8, color: P.inkSoft, seed: sm('foot'), wobble: 1, taper: [40, 40], boil: bv, smooth: false }, pen);
  }

  function drawSea(ctx, G, pen, bv) {
    ctx.save();
    ctx.fillStyle = P.sea;
    ctx.fillRect(-200, HORIZON + 1, 1500, SHORE - HORIZON + 4);
    ctx.restore();
    // reflection of the near hills: short vertical strokes
    {
      const p = new Path2D();
      for (let x = -120; x < 1200; x += 6) {
        const h = G.nearH(x) * 0.4;
        if (h < 10) continue;
        const l = h * (0.5 + 0.5 * LIB.h3(x | 0, 3, 5));
        taperStroke(p, [[x + jig(x, 1, bv, 0.4), HORIZON + 4], [x + jig(x, 2, bv, 0.4), HORIZON + 4 + l]], 1.6 * pen, 0.4 * pen);
      }
      fillPath(ctx, p, P.seaDeep, 0.45);
    }
    const paths = [new Path2D(), new Path2D()];
    G.seaLines.forEach((s, i) => {
      const yy = s.y + jig(i, 1, bv, 0.35);
      const p = paths[s.a > 0.62 ? 1 : 0];
      taperStroke(p, [[s.x0, yy], [(s.x0 + s.x1) / 2, yy + jig(i, 2, bv, 0.4)], [s.x1, yy + jig(i, 3, bv, 0.3)]], s.w * pen, s.w * 0.4 * pen);
    });
    fillPath(ctx, paths[0], P.seaDeep, 0.55);
    fillPath(ctx, paths[1], P.seaDeep, 0.85);
    G.ice.forEach((f, i) => {
      const side = [[f.x - f.w, f.y], [f.x + f.w, f.y], [f.x + f.w * 0.92, f.y + 4], [f.x - f.w * 0.9, f.y + 4]];
      fillPoly(ctx, side, P.iceShade);
      inkW(ctx, f.top, { closed: true, width: 1.4, fill: P.ice, seed: sm('iceL', i), wobble: 0.3, taper: [2, 2], boil: bv }, pen);
      const r = new Path2D();
      taperStroke(r, [[f.x - f.w * 0.8, f.y + 7], [f.x + f.w * 0.6, f.y + 7]], 1.2 * pen, 0.3 * pen);
      fillPath(ctx, r, P.foam, 0.8);
    });
    fillPoly(ctx, [[-200, SHORE - 4], [1300, SHORE - 4], [1300, SHORE + 5], [-200, SHORE + 5]], P.shingleDeep, 0.5);
  }

  // surf lines at the shore, sliding 4 px per beat (live, 24 fps)
  function drawSurf(ctx, T, bi, pen) {
    const slide = (T * 8) % 400;
    for (let k = 0; k < 3; k++) {
      const y = SHORE - 18 + k * 7;
      const p = new Path2D();
      const r = LIB.rng(sm('surf', k));
      let x = -400 - slide * (k % 2 ? -1 : 1);
      while (x < 1300) {
        const len = r.range(40, 140);
        const pts = [];
        for (let j = 0; j <= 6; j++) {
          const xx = x + (len * j) / 6;
          pts.push([xx, y + 1.6 * Math.sin(xx * 0.06 + k) + jig(j, k, bi, 0.4)]);
        }
        taperStroke(p, pts, (3 - k * 0.6) * pen, 1 * pen);
        x += len + r.range(14, 60);
      }
      fillPath(ctx, p, P.foam, 0.95);
      strokePath(ctx, p, P.seaDeep, 0.8 * pen, 0.5);
    }
  }

  // ===========================================================================
  // Shingle: pebbles in rows that grow toward the viewer (built like 03's), grit, moss, the scrape
  // ===========================================================================
  const pebSize = (y) => 7 + 110 * Math.pow(clamp((y - SHORE) / 970, 0, 1.2), 2.4);
  const PEB_Y0 = SHORE + 26; // nearer the sound the shingle is fine gravel: grit and a shaded band only
  function buildPebbles(L) {
    const r = L.rng(sm('pebbles'));
    const list = [];
    let y = PEB_Y0;
    let row = 0, grp = 0;
    while (y < 1990) {
      const s = pebSize(y);
      let x = -40 + r() * s;
      while (x < 1120) {
        const sz = s * r.range(0.66, 1.2);
        let rx = sz * 0.5;
        let ry = rx * r.range(0.44, 0.64);
        const px = x;
        const py = y + (r() - 0.5) * s * 0.18;
        const rot = r.range(-0.3, 0.3);
        const tone = r() < 0.5 ? 0 : r() < 0.6 ? 1 : 2;
        const lich = r() < 0.05 && s > 22 && tone !== 1;
        const la = r.range(0, TAU), lr = r.range(0.32, 0.58);
        x += sz * r.range(0.9, 1.12);
        // the scrape holds only grit; patches of finer gravel elsewhere
        let grit = false;
        if (inEll(px, py, SCRAPE, 1.04)) {
          rx *= 0.24;
          ry *= 0.24;
          grit = true;
        } else if (inEll(px, py, SCRAPE, 1.9) || L.noise2(px / 300, py / 160, 404) > 0.3) {
          rx *= 0.55;
          ry *= 0.55;
        }
        const n = 12;
        const V = [];
        for (let j = 0; j < n; j++) {
          const a = (j / n) * TAU;
          const k = 1 + 0.14 * (L.h3(list.length, j, 881) - 0.5) + 0.06 * Math.cos(2 * a + la);
          const lx = Math.cos(a) * rx * k, ly = Math.sin(a) * ry * k;
          V.push([px + lx * Math.cos(rot) - ly * Math.sin(rot), py + lx * Math.sin(rot) + ly * Math.cos(rot)]);
        }
        list.push({ id: list.length, x: px, y: py, rx, ry, rot, tone, lich: lich && rx > 6, la, lr, V, row: grp, s, grit });
      }
      y += s * (s < 14 ? r.range(0.5, 0.6) : r.range(0.34, 0.44));
      row++;
      // rows stay in build order (back to front); the small far rows are batched three at a time
      grp++;
    }
    return list;
  }

  function buildMoss(L) {
    const at = [[60, 1236, 60, 9], [990, 1226, 70, 8], [300, 1450, 46, 10], [880, 1560, 80, 16], [60, 1700, 90, 22], [620, 1790, 110, 26], [700, 1330, 30, 5]];
    return at.map(([x, y, w, h], i) => {
      const r = L.rng(sm('moss', i));
      const tufts = [];
      const n = Math.round(w * 0.9);
      for (let k = 0; k < n; k++) {
        const a = r() * TAU, d = Math.sqrt(r());
        const tx = x + Math.cos(a) * w * d, ty = y + Math.sin(a) * h * d;
        const len = lerp(3, 12, r()) * (h / 18 + 0.4);
        tufts.push([tx, ty, tx + r.range(-3, 3), ty - len]);
      }
      return { pts: blob(x, y, w, h, 0, 18, 0.22, sm('mossB', i)), tufts, x, y, w, h };
    });
  }

  // pebbles, batched per row, back to front (03's drawPebbles, pens held at screen weight under zoom)
  function drawPebbles(ctx, L, list, VR, zoom, pen, bi) {
    const G = geo(L);
    const fills = [P.shingle, P.shinglePale, G.c.pebDark];
    let i = 0;
    while (i < list.length) {
      const row = list[i].row;
      const F = [new Path2D(), new Path2D(), new Path2D()];
      const lit = new Path2D(), litW = new Path2D(), shade = new Path2D(), out = new Path2D(), hat = new Path2D(), deep = new Path2D(), lich = new Path2D(), hi = new Path2D();
      let any = false, sMax = 0;
      const lichDots = [];
      const grit = new Path2D();
      for (; i < list.length && list[i].row === row; i++) {
        const q = list[i];
        if (q.x + q.rx < VR.x0 || q.x - q.rx > VR.x1 || q.y + q.ry < VR.y0 || q.y - q.ry > VR.y1) continue;
        any = true;
        const onScreen = q.rx * zoom;
        const jj = onScreen > 5 ? 0.6 * pen : 0;
        if (q.grit && onScreen < 12) {
          grit.moveTo(q.x + q.rx, q.y);
          grit.ellipse(q.x, q.y, q.rx, q.ry, q.rot, 0, TAU);
          continue;
        }
        sMax = Math.max(sMax, q.rx);
        const V = q.V.map((p, j) => [p[0] + (L.h3(q.id, j, bi) - 0.5) * jj, p[1] + (L.h3(j, q.id, bi + 7) - 0.5) * jj]);
        // cast shadow down-right (lost in the grit on the smallest stones)
        if (onScreen >= 9) {
          shade.ellipse(q.x + q.rx * 0.22, q.y + q.ry * 0.5, q.rx * 1.02, q.ry * 0.8, q.rot, 0, TAU);
          shade.closePath();
        }
        blobInto(F[q.tone], V);
        blobInto(out, V);
        if (onScreen < 3.5) continue;
        // lit top: a smaller copy nudged up-left
        const LV = V.map((p) => [q.x + (p[0] - q.x) * 0.58 - q.rx * 0.16, q.y + (p[1] - q.y) * 0.5 - q.ry * 0.3]);
        blobInto(q.tone === 1 ? litW : lit, LV);
        if (onScreen < 7) continue;
        // underside hatch: 45 degree chords across the lower right of the ellipse
        const a = q.rx, b = q.ry;
        const cr_ = Math.cos(q.rot), sr = Math.sin(q.rot);
        const dx = 0.7071, dy = -0.7071, nx = 0.7071, ny = 0.7071;
        const A = (dx * dx) / (a * a) + (dy * dy) / (b * b);
        const Bk = 2 * ((nx * dx) / (a * a) + (ny * dy) / (b * b));
        const Ck = (nx * nx) / (a * a) + (ny * ny) / (b * b);
        const sp = 4.2 * pen;
        const cm = 1 / Math.sqrt(Ck - (Bk * Bk) / (4 * A));
        let k = 0;
        for (let c = cm * 0.18 + L.h3(q.id, 3, 9) * sp * 0.5; c < cm * 0.97; c += sp, k++) {
          const Bc = Bk * c, Cc = Ck * c * c - 1;
          const disc = Bc * Bc - 4 * A * Cc;
          if (disc <= 0) break;
          const sq = Math.sqrt(disc);
          let s0 = (-Bc - sq) / (2 * A), s1 = (-Bc + sq) / (2 * A);
          const sh = (s1 - s0) * 0.12;
          s0 += sh * (0.5 + L.h3(q.id, k, bi + 3));
          s1 -= sh * (0.5 + L.h3(k, q.id, bi + 4));
          const lx0 = c * nx + s0 * dx, ly0 = c * ny + s0 * dy, lx1 = c * nx + s1 * dx, ly1 = c * ny + s1 * dy;
          const target = c > cm * 0.62 && onScreen > 14 ? deep : hat;
          target.moveTo(q.x + lx0 * cr_ - ly0 * sr, q.y + lx0 * sr + ly0 * cr_);
          target.lineTo(q.x + lx1 * cr_ - ly1 * sr, q.y + lx1 * sr + ly1 * cr_);
        }
        // a glint on the lit shoulder
        if (onScreen > 16) {
          const ga = -2.3, gb = -1.6;
          hi.moveTo(q.x + Math.cos(ga) * a * 0.72, q.y + Math.sin(ga) * b * 0.62);
          hi.quadraticCurveTo(q.x + Math.cos((ga + gb) / 2) * a * 0.8, q.y + Math.sin((ga + gb) / 2) * b * 0.72, q.x + Math.cos(gb) * a * 0.7, q.y + Math.sin(gb) * b * 0.6);
        }
        // orange lichen crust on a few tops
        if (q.lich) {
          const lx = q.x - q.rx * 0.15 + Math.cos(q.la) * q.rx * 0.2, ly = q.y - q.ry * 0.35;
          const LVc = [];
          for (let j = 0; j < 14; j++) {
            const aa = (j / 14) * TAU;
            const rr = q.rx * q.lr * (j & 1 ? 0.55 + 0.3 * L.h3(q.id, j, 77) : 0.85 + 0.35 * L.h3(q.id, j, 77));
            LVc.push([lx + Math.cos(aa) * rr, ly + Math.sin(aa) * rr * 0.55]);
          }
          blobInto(lich, LVc);
          for (let j = 0; j < 7; j++) {
            const aa = L.h3(q.id, j, 78) * TAU;
            const rr = q.rx * q.lr * 1.1 * Math.sqrt(L.h3(j, q.id, 79));
            lichDots.push([lx + Math.cos(aa) * rr, ly + Math.sin(aa) * rr * 0.55]);
          }
        }
      }
      if (!any) continue;
      ctx.fillStyle = P.shingleDeep;
      ctx.globalAlpha = 0.85;
      ctx.fill(grit);
      ctx.globalAlpha = 0.6;
      ctx.fill(shade);
      ctx.globalAlpha = 1;
      for (let k = 0; k < 3; k++) {
        ctx.fillStyle = fills[k];
        ctx.fill(F[k]);
      }
      ctx.fillStyle = P.shinglePale;
      ctx.fill(lit);
      ctx.fillStyle = P.white;
      ctx.globalAlpha = 0.6;
      ctx.fill(litW);
      ctx.globalAlpha = 1;
      ctx.lineCap = 'round';
      ctx.strokeStyle = P.shingleDeep;
      ctx.lineWidth = 1.3 * pen;
      ctx.globalAlpha = 0.9;
      ctx.stroke(hat);
      ctx.stroke(deep);
      ctx.strokeStyle = P.ink;
      ctx.lineWidth = 1.1 * pen;
      ctx.globalAlpha = 0.55;
      ctx.stroke(deep);
      ctx.globalAlpha = 1;
      ctx.fillStyle = P.lichen;
      ctx.fill(lich);
      if (lichDots.length) {
        const d = new Path2D();
        for (const p of lichDots) {
          d.moveTo(p[0] + 1.4 * pen, p[1]);
          d.arc(p[0], p[1], 1.4 * pen, 0, TAU);
        }
        ctx.fillStyle = P.ochre;
        ctx.fill(d);
        ctx.strokeStyle = P.ochre;
        ctx.lineWidth = 1 * pen;
        ctx.stroke(lich);
      }
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = P.inkSoft;
      ctx.lineJoin = 'round';
      ctx.lineWidth = clamp(0.7 + (sMax * 2 * zoom) / 60, 0.9, 2.2) * pen;
      ctx.stroke(out);
      ctx.strokeStyle = P.white;
      ctx.lineWidth = 1.8 * pen;
      ctx.globalAlpha = 0.75;
      ctx.stroke(hi);
      ctx.globalAlpha = 1;
    }
  }

  // grit between the stones: dots on a power-of-two world grid, a constant screen density at any zoom
  function drawGrit(ctx, L, VR, zoom, pen, bv) {
    const cell = Math.pow(2, Math.round(Math.log2(10 / zoom)));
    const x0 = Math.floor(Math.max(VR.x0, -40) / cell), x1 = Math.ceil(Math.min(VR.x1, 1120) / cell);
    const y0 = Math.floor(Math.max(VR.y0, SHORE + 2) / cell), y1 = Math.ceil(Math.min(VR.y1, 1990) / cell);
    const rs = (1 + 0.09 * (zoom - 1)) * pen;
    const dark = new Path2D(), pale = new Path2D();
    for (let j = y0; j <= y1; j++) {
      for (let i = x0; i <= x1; i++) {
        const h = L.h3(i, j, 4241);
        if (h > 0.52) continue;
        const x = (i + L.h3(i, j, 4242) + (L.h3(i, j, bv + 4250) - 0.5) * 0.12) * cell;
        const y = (j + L.h3(j, i, 4243)) * cell;
        const r = (0.8 + 1.3 * L.h3(j, i, 4244)) * rs;
        const p = h < 0.28 ? dark : pale;
        p.moveTo(x + r, y);
        p.arc(x, y, r, 0, TAU);
      }
    }
    ctx.save();
    ctx.fillStyle = P.shingleDeep;
    ctx.globalAlpha = 0.75;
    ctx.fill(dark);
    ctx.fillStyle = P.shinglePale;
    ctx.globalAlpha = 0.9;
    ctx.fill(pale);
    ctx.restore();
  }

  // the fine gravel between the sound and the first pebble rows: short engraved dashes, denser far off
  function drawFineBand(ctx, L, VR, pen, bv) {
    const p = new Path2D(), q = new Path2D();
    let k = 0;
    for (let y = SHORE + 5; y < PEB_Y0 + 14; y += 2.6 + 0.03 * (y - SHORE), k++) {
      const u = (y - SHORE) / (PEB_Y0 - SHORE);
      let x = -40 + L.h3(k, 1, 731) * 12;
      let m = 0;
      while (x < 1120) {
        const len = (3 + 9 * L.h3(k, m, 732)) * (0.6 + 0.6 * u);
        if (x + len > VR.x0 && x < VR.x1 && L.h3(m, k, 733) < 0.8 - 0.35 * u) {
          const yy = y + (L.h3(k, m, bv + 740) - 0.5) * 0.5;
          (L.h3(m, k, 734) < 0.6 ? p : q).moveTo(x, yy);
          (L.h3(m, k, 734) < 0.6 ? p : q).lineTo(x + len, yy + 0.2);
        }
        x += len + (2 + 7 * L.h3(m, k, 735)) * (0.7 + 0.8 * u);
        m++;
      }
    }
    strokePath(ctx, p, P.shingleDeep, 1.3 * pen, 0.85);
    strokePath(ctx, q, P.shinglePale, 1.5 * pen, 0.9);
  }

  // the scrape: a shallow hollow round both eggs, its far wall shaded, the near lip lit
  function drawScrape(ctx, L, VR, pen, bv) {
    const G = geo(L);
    const S = SCRAPE;
    if (S.x + S.rx < VR.x0 || S.x - S.rx > VR.x1 || S.y + S.ry < VR.y0 || S.y - S.ry > VR.y1) return;
    const pts = L.ellipsePts(S.x, S.y, S.rx, S.ry, 96);
    fillPoly(ctx, pts, G.c.scrape);
    // hand-rolled hatch, 6 screen px apart at any zoom, heavier on the far (upper) wall
    const sp = 6 * pen;
    const p = new Path2D();
    const ya = Math.max(S.y - S.ry, VR.y0), yb = Math.min(S.y + S.ry, VR.y1);
    let k = Math.floor((ya - (S.y - S.ry)) / sp);
    for (let y = S.y - S.ry + k * sp; y < yb; y += sp, k++) {
      const v = (y - S.y) / S.ry;
      const half = S.rx * Math.sqrt(Math.max(0, 1 - v * v));
      const dens = 0.25 + 0.6 * sstep(0.35, -1, v);
      let x = S.x - half + L.h3(k, 1, 611) * 10 * pen;
      let m = 0;
      while (x < S.x + half) {
        const len = (18 + 40 * L.h3(k, m, 612)) * pen;
        const e = Math.min(S.x + half - 2 * pen, x + len);
        if (L.h3(m, k, 613) < dens && e > VR.x0 && x < VR.x1) {
          const yy = y + (L.h3(k, m, bv + 620) - 0.5) * 0.8 * pen;
          p.moveTo(x, yy + (x - S.x) * 0.02);
          p.lineTo(e, yy + (e - S.x) * 0.02);
        }
        x = e + (4 + 10 * L.h3(m, k, 614)) * pen;
        m++;
      }
    }
    strokePath(ctx, p, P.shingleDeep, 1.2 * pen, 0.85);
    // the near lip catches light, the far lip is a soft line
    const near = pts.filter((q) => q[1] > S.y + 3).sort((a, b) => a[0] - b[0]);
    inkW(ctx, near, { width: 1.8, color: P.shinglePale, alpha: 0.95, seed: sm('lipn'), boil: bv, taper: [40, 40], wobble: 0.6 }, pen);
    const far = pts.filter((q) => q[1] < S.y - 5).sort((a, b) => a[0] - b[0]);
    inkW(ctx, far, { width: 1.6, color: P.inkSoft, alpha: 0.7, seed: sm('lipf'), boil: bv, taper: [40, 40], wobble: 0.6 }, pen);
    // a few shell bits and grass stems on the rim (art bible 10.3)
    const stems = [];
    [[S.x - S.rx - 6, S.y - 2], [S.x + S.rx + 4, S.y - 4], [S.x + 18, S.y - S.ry - 1]].forEach(([x, y], i) => {
      for (let j = 0; j < 5; j++) {
        const h = 7 + 8 * L.h3(i, j, 91);
        const lean = (L.h3(j, i, 92) - 0.5) * 10 + (L.h3(i, j, 93 + bv) - 0.5) * 0.4;
        stems.push([x + j * 1.1 - 2, y, x + j * 1.1 - 2 + lean * 0.3, y - h * 0.6, x + j * 1.1 - 2 + lean, y - h]);
      }
    });
    strokeBatch(ctx, stems, 2.4 * pen, P.inkSoft, 0.9);
    strokeBatch(ctx, stems, 1.1 * pen, P.tan, 1);
  }

  function drawMoss(ctx, L, VR, pen, bv) {
    const G = geo(L);
    G.moss.forEach((m, i) => {
      if (m.x + m.w < VR.x0 || m.x - m.w > VR.x1 || m.y + m.h < VR.y0 || m.y - m.h - 14 > VR.y1) return;
      inkW(ctx, m.pts, { closed: true, width: 1.4, color: P.mossDeep, alpha: 0.8, fill: P.moss, seed: sm('mossL', i), wobble: 0.6, taper: [4, 4], boil: bv }, pen);
      const p = new Path2D();
      m.tufts.forEach((q, k) => {
        p.moveTo(q[0], q[1]);
        p.lineTo(q[2] + jig(k, i, bv, 0.3), q[3]);
      });
      strokePath(ctx, p, P.mossDeep, 1.2 * pen, 0.85);
    });
  }

  // the whole world backdrop at one zoom, culled to the view rectangle
  function drawBackdrop(ctx, L, VR, zoom, bv) {
    const G = geo(L);
    const pen = 1 / zoom;
    if (VR.y0 < HORIZON + 4) drawFarShore(ctx, G, pen, bv);
    if (VR.y0 < SHORE + 6) drawSea(ctx, G, pen, bv);
    // shingle base
    ctx.save();
    ctx.fillStyle = G.c.ground;
    ctx.fillRect(Math.max(-200, VR.x0 - 10), Math.max(SHORE, VR.y0 - 10), Math.min(1500, VR.x1 - VR.x0 + 20), Math.min(1100, VR.y1 - VR.y0 + 20));
    ctx.restore();
    drawGrit(ctx, L, VR, zoom, pen, bv);
    if (VR.y0 < PEB_Y0) drawFineBand(ctx, L, VR, pen, bv);
    drawMoss(ctx, L, VR, pen, bv);
    drawScrape(ctx, L, VR, pen, bv);
    drawPebbles(ctx, L, G.peb, VR, zoom, pen, bv);
  }

  // the zoom-1 backdrop is t-independent: two boil drawings cached at the render scale
  const PLATE = { x0: -20, y0: 580, x1: 1100, y1: 1940 };
  function drawPlate(ctx, L, bi) {
    const S = FILM.S || 1;
    const bv = bi & 1;
    const pl = L.cached(ID + ':plate:' + bv + ':' + S, () => {
      const w = Math.ceil((PLATE.x1 - PLATE.x0) * S), h = Math.ceil((PLATE.y1 - PLATE.y0) * S);
      const c = FILM.makeCanvas(w, h);
      const g = c.getContext('2d');
      g.setTransform(S, 0, 0, S, -PLATE.x0 * S, -PLATE.y0 * S);
      drawBackdrop(g, L, PLATE, 1, 1000 + bv);
      return c;
    });
    ctx.drawImage(pl, PLATE.x0, PLATE.y0, PLATE.x1 - PLATE.x0, PLATE.y1 - PLATE.y0);
  }

  // ===========================================================================
  // The adults, copied from 04 (side view facing left, 2.0 px per mm, origin at the feet) and drawn
  // here at K. LW scales every pen width and SPC every hatch spacing so the screen weight holds.
  // ===========================================================================
  let LW = 1, SPC = 1;
  const tS = (path, pts, w0, w1) => taperStroke(path, pts, w0 * LW, w1 * LW);
  const hs = (o) => {
    const q = Object.assign({}, o);
    q.spacing = (o.spacing || 8) * SPC;
    if (o.crossSpacing) q.crossSpacing = o.crossSpacing * SPC;
    if (o.length) q.length = o.length.map((v) => v * SPC);
    q.width = (o.width != null ? o.width : 1.4) * LW;
    return q;
  };
  const HEAD_R = 36;
  const BILL_LEN = 62; // 31 mm
  const BILL_D = 16;
  const EEL_LEN = 80; // 1.3 x the bill
  const BODY_L = [
    [-148, -116], [-140, -96], [-120, -75], [-86, -57], [-42, -45], [8, -42], [48, -47], [80, -59], [102, -74], [112, -87],
    [116, -106], [80, -121], [22, -134], [-44, -142], [-94, -149], [-120, -151],
  ];
  const HEAD_L = [-162, -170]; // default head centre
  const SHOULDER_N = [-40, -132], SHOULDER_F = [-62, -140];
  const REAR = -0.66; // angle of tail and folded wingtips while standing
  // wing poses in body-relative angles (arm from shoulder, hand from wrist), projected half-span in px
  const WING = {
    up: { near: [-1.75, -1.22, 720, 150], far: [-1.97, -1.55, 630, 140] },
    half: { near: [-1.05, -0.4, 560, 145], far: [-1.3, -0.78, 500, 135] },
    mid: { near: [-0.5, -0.1, 430, 130], far: [-0.78, -0.4, 380, 120] },
  };

  function xfPt(ps, p) {
    const c = Math.cos(ps.th), s = Math.sin(ps.th);
    return [ps.x + p[0] * c - p[1] * s, ps.y + p[0] * s + p[1] * c];
  }
  // head centre (bird-local) that puts the bill tip on tip with the bill at angle phi
  function headFor(tip, phi) {
    const f = dir(phi), up = [-f[1], f[0]];
    return add(sub(tip, mul(f, BILL_LEN + HEAD_R * 0.82)), mul(up, HEAD_R * 0.12));
  }

  function drawEel(ctx, c, ang, alpha, seed, bi) {
    const f = dir(ang), n = [-f[1], f[0]];
    const Lh = EEL_LEN / 2;
    const at = (u, v) => [c[0] + f[0] * u + n[0] * v, c[1] + f[1] * u + n[1] * v];
    const top = [], bot = [];
    for (let i = 0; i <= 12; i++) {
      const s = i / 12;
      const u = lerp(Lh, -Lh + 9, s);
      const w = 8 * Math.sin(Math.min(1, s * 1.25) * Math.PI * 0.5) * (1 - 0.55 * s) + 0.6;
      top.push(at(u, -w));
      bot.push(at(u, w * 0.95));
    }
    const snout = at(Lh + 2.5, 1.2); // the lower jaw juts forward
    const tailA = at(-Lh - 3, -4.5), tailM = at(-Lh + 2, 0), tailB = at(-Lh - 3, 4.5);
    const outline = [snout].concat(top, [tailA, tailM, tailB], bot.slice().reverse());
    ctx.save();
    ctx.globalAlpha *= alpha;
    fillPoly(ctx, outline, P.sandEel);
    const back = [snout].concat(top, bot.slice().reverse().map((p, i, arr) => mix2(p, top[arr.length - 1 - i], 0.62)));
    fillPoly(ctx, back, P.sandEelBack);
    const fin = [];
    for (let i = 0; i <= 8; i++) fin.push(at(lerp(Lh * 0.45, -Lh + 10, i / 8), -3.6 - 1.4 * Math.sin((i / 8) * Math.PI)));
    const fp = new Path2D();
    tS(fp, fin, 1.3, 0.5);
    fillPath(ctx, fp, P.sandEelBack);
    LIB.inkPath(ctx, outline, { closed: true, width: 1.6 * LW, seed, taper: [2, 2], wobble: 0.3, tremble: 0.15, boilAmp: 0.4, smooth: false });
    const e = at(Lh - 6, -1.3);
    ctx.fillStyle = P.ink;
    ctx.beginPath();
    ctx.arc(e[0], e[1], 1.5, 0, TAU);
    ctx.fill();
    const g = new Path2D();
    tS(g, [at(Lh - 11, -3), at(Lh - 12.5, 0), at(Lh - 11, 3)], 0.9, 0.5);
    fillPath(ctx, g, P.inkSoft);
    const gl = new Path2D();
    tS(gl, [at(Lh - 14, 1.2 + jig(1, 2, bi, 0.2)), at(0, 1.6), at(-Lh + 14, 1.0)], 1.1, 0.4);
    fillPath(ctx, gl, P.foam, 0.9);
    ctx.restore();
  }

  // spread wing geometry in bird px
  function wingGeom(sh, arm, hand, span, chord) {
    const a = dir(arm), h = dir(hand);
    let na = [-a[1], a[0]];
    if (na[0] < 0 || (Math.abs(na[0]) < 0.05 && na[1] < 0)) na = mul(na, -1);
    let nh = [-h[1], h[0]];
    if (nh[0] * na[0] + nh[1] * na[1] < 0) nh = mul(nh, -1);
    const W = add(sh, mul(a, 0.4 * span));
    const N = 30;
    const le = [], te = [], cv = [], nrm = [], ch = [];
    for (let i = 0; i <= N; i++) {
      const s = i / N;
      const p = s <= 0.4 ? add(sh, mul(a, s * span)) : add(W, mul(h, (s - 0.4) * span));
      const bowF = Math.sin(clamp(s / 0.7) * Math.PI) * 0.04 * span;
      const bl = clamp((s - 0.34) / 0.12);
      let n = [lerp(na[0], nh[0], bl), lerp(na[1], nh[1], bl)];
      const nl = Math.hypot(n[0], n[1]);
      n = mul(n, 1 / nl);
      const pp = add(p, mul(n, -bowF));
      const c = s <= 0.4 ? chord * lerp(1, 0.94, s / 0.4) : chord * 0.94 * (1 - Math.pow((s - 0.4) / 0.6, 1.7)) + (s < 1 ? 2 : 0);
      le.push(pp);
      te.push(add(pp, mul(n, c)));
      cv.push(add(pp, mul(n, c * 0.42)));
      nrm.push(n);
      ch.push(c);
    }
    return { le, te, cv, nrm, ch, N, W, sh };
  }

  function drawSpreadWing(ctx, g, side, seed) {
    const outline = g.le.concat(g.te.slice().reverse());
    if (side === 'far') {
      // upper surface (04's far wing): grey coverts in scalloped rows, 10 fanned primaries and 14
      // secondaries in mantleDeep edges, a white trailing edge on the secondaries, a thin dark edge on the primaries
      LIB.inkPath(ctx, outline, { closed: true, width: 3 * LW, alpha: 0.85, fill: P.mantleGrey, seed, wobble: 1.2, taper: [6, 10] });
      const i0 = Math.round(g.N * 0.42);
      // shadow on the trailing half, lighter than a slab
      const shade = g.cv.concat(g.te.slice().reverse());
      LIB.hatch(ctx, shade, hs({ spacing: 8, width: 1.2, color: P.mantleDeep, alpha: 0.5, seed: seed + 1, length: [12, 30] }));
      const p = new Path2D();
      for (let row = 0; row < 3; row++) {
        const f0 = [0.18, 0.32, 0.46][row];
        for (let i = 1; i < g.N * (row === 2 ? 0.45 : 0.8); i++) {
          const a = add(g.le[i], mul(g.nrm[i], g.ch[i] * f0));
          const b = add(g.le[i + 1], mul(g.nrm[i + 1], g.ch[i + 1] * f0));
          tS(p, [a, add(mix2(a, b, 0.5), mul(g.nrm[i], 3)), b], 1.1, 0.5);
        }
      }
      for (let j = 0; j < 10; j++) {
        const u = j / 9;
        const it = Math.min(g.N - 1, Math.round(lerp(i0, g.N - 1, u)));
        const ib = Math.round(lerp(i0 - 2, g.N * 0.78, u));
        const a = add(g.le[ib], mul(g.nrm[ib], g.ch[ib] * 0.3));
        tS(p, [a, mix2(a, g.te[it], 0.6), g.te[it]], 1.6, 0.7);
      }
      for (let j = 0; j < 14; j++) {
        const i = Math.round(lerp(0.03, 0.4, j / 13) * g.N);
        tS(p, [add(g.le[i], mul(g.nrm[i], g.ch[i] * 0.46)), add(g.te[i], mul(g.nrm[i], -1))], 1.4, 0.8);
      }
      fillPath(ctx, p, P.mantleDeep, 0.95);
      const w = new Path2D();
      tS(w, g.le.slice(1, Math.round(g.N * 0.7)).map((q, i) => add(q, mul(g.nrm[i + 1], 4))), 3, 1);
      tS(w, g.te.slice(0, i0 + 1).map((q, i) => add(q, mul(g.nrm[i], -3))), 4, 3);
      fillPath(ctx, w, P.plumeWhite, 0.9);
      const e = new Path2D();
      tS(e, g.te.slice(i0), 1.2, 2.6);
      fillPath(ctx, e, P.capBlack, 0.7);
      return;
    }
    // under surface: white coverts, translucent primaries and secondaries, thin black trailing edge
    LIB.inkPath(ctx, outline, { closed: true, width: 3.2 * LW, fill: P.primaryGlow, seed, wobble: 1.2, taper: [6, 10] });
    const cvPoly = g.le.slice(0, Math.round(g.N * 0.9)).concat(g.cv.slice(0, Math.round(g.N * 0.9)).reverse());
    fillPoly(ctx, cr(cvPoly, true, 2), P.plumeWhite);
    {
      const p = new Path2D();
      for (let row = 0; row < 2; row++) {
        for (let i = 1; i < g.N * 0.85; i += 1) {
          const f0 = row === 0 ? 0.42 : 0.24;
          const a = add(g.le[i], mul(g.nrm[i], g.ch[i] * f0));
          const b = add(g.le[i + 1], mul(g.nrm[i + 1], g.ch[i + 1] * f0));
          const m = add(mix2(a, b, 0.5), mul(g.nrm[i], 3.5));
          tS(p, [a, m, b], 1.2, 0.5);
        }
      }
      fillPath(ctx, p, P.inkSoft, 0.55);
    }
    {
      const shade = g.cv.slice(0, Math.round(g.N * 0.5)).concat(g.te.slice(0, Math.round(g.N * 0.5)).reverse());
      fillPoly(ctx, shade, P.plumeShade, 0.55);
      LIB.hatch(ctx, shade, hs({ spacing: 9, width: 1.2, color: P.mantleDeep, alpha: 0.55, seed: seed + 3, length: [12, 34] }));
    }
    {
      const p = new Path2D();
      const i0 = Math.round(g.N * 0.42);
      for (let j = 0; j < 10; j++) {
        const u = j / 9;
        const it = Math.min(g.N - 1, Math.round(lerp(i0, g.N - 1, u)));
        const ib = Math.round(lerp(i0 - 2, g.N * 0.78, u));
        const a = add(g.le[ib], mul(g.nrm[ib], g.ch[ib] * 0.35));
        tS(p, [a, mix2(a, g.te[it], 0.6), g.te[it]], 1.5, 0.7);
      }
      for (let j = 0; j < 14; j++) {
        const s = lerp(0.03, 0.4, j / 13);
        const i = Math.round(s * g.N);
        tS(p, [g.cv[i], add(g.te[i], mul(g.nrm[i], -1))], 1.3, 0.8);
      }
      fillPath(ctx, p, P.mantleDeep, 0.8);
      const q = new Path2D();
      for (let j = 0; j < 10; j += 2) {
        const u = j / 9;
        const it = Math.min(g.N - 1, Math.round(lerp(i0, g.N - 1, u)));
        const ib = Math.round(lerp(i0 - 2, g.N * 0.78, u));
        const a = add(g.le[ib], mul(g.nrm[ib], g.ch[ib] * 0.45));
        tS(q, [a, mix2(a, g.te[it], 0.92)], 0.9, 0.3);
      }
      fillPath(ctx, q, P.plumeWhite, 0.9);
    }
    // thin neat black trailing edge on the primaries
    LIB.inkPath(ctx, g.te.slice(Math.round(g.N * 0.42)), { width: 4 * LW, color: P.capBlack, seed: seed + 5, taper: [10, 20], wobble: 0.6 });
    LIB.inkPath(ctx, g.le, { width: 5 * LW, seed: seed + 6, wobble: 1.2, taper: [8, 18], double: { offset: 3.5 * LW, width: 0.3, alpha: 0.4, from: 0.15, to: 0.6 } });
  }

  // one adult in bird-local px (origin at the feet, facing left). ps: th, rear, wing, legs
  // ('stand' | 'land' | 'none'), spread, flying, fish, head { c, bAng } or null, crouch (px the body
  // sinks toward the ground when brooding)
  function drawParent(ctx, ps, seedP, bi) {
    // the tarsus is shorter than the middle toe: the body sits low, belly just clear of the shingle
    const lift = ps.flying || ps.legs === 'none' ? 0 : ps.legs === 'land' ? -2 : 21; // 04: sits on its belly, a stub of tarsus
    const psB = Object.assign({}, ps, { y: ps.y + lift + (ps.crouch || 0) });
    const XB = (p) => xfPt(psB, p);
    const spread = ps.wing !== 'fold' ? WING[ps.wing] : null;

    // --- far wing (behind everything)
    if (spread) {
      const [arm, hand, span, chord] = spread.far;
      drawSpreadWing(ctx, wingGeom(XB(SHOULDER_F), arm + ps.th, hand + ps.th, span, chord), 'far', seedP + 100);
    }

    // --- legs: very short, red; the far one first
    const drawLeg = (dx, far) => {
      if (ps.legs === 'none') return;
      const hip = XB([dx - 6, -44]);
      const foot = [ps.x + dx - 4, ps.y];
      const land = ps.legs === 'land';
      const knee = land ? mix2(hip, foot, 0.5) : add(mix2(hip, foot, 0.5), [3, 0]);
      const p = new Path2D();
      tS(p, [hip, knee, foot], 7.5 / LW, 5.5 / LW); // leg thickness is anatomy, not pen
      const toes = [[-34, 1], [-30, -3], [-26, 3]];
      for (const [tx, ty] of toes) tS(p, [foot, add(foot, [tx * 0.5, ty * 0.5]), add(foot, [tx, ty])], 5 / LW, 2 / LW);
      tS(p, [foot, add(foot, [9, -2])], 4 / LW, 1.5 / LW);
      const web = [foot, add(foot, [-33, 1]), add(foot, [-27, 3]), add(foot, [-29, -2])];
      ctx.save();
      if (far) ctx.globalAlpha *= 0.8;
      fillPoly(ctx, web, P.legRed);
      fillPath(ctx, p, far ? P.billDeep : P.legRed);
      strokePath(ctx, p, P.ink, 1.5 * LW, 0.9);
      ctx.restore();
    };
    drawLeg(16, true);

    // --- tail: white, deeply forked, grey outer webs, streamers past the folded wingtips
    const TBt = XB([116, -106]), TBb = XB([110, -84]);
    const TB = mix2(TBt, TBb, 0.5);
    const dr = dir(ps.rear), nr = [-dr[1], dr[0]];
    const T = (a, b) => add(TB, add(mul(dr, a), mul(nr, b)));
    const sp = ps.spread;
    const up = T(276, -6 - 34 * sp), lo = T(258 - 10 * sp, 9 + 34 * sp);
    const tail = [
      TBt, T(70, -15 - 6 * sp), T(160, -12 - 20 * sp), up, T(200, -5 - 22 * sp), T(140, 0 - 8 * sp), T(146, 2 + 6 * sp), T(190, 4 + 22 * sp), lo, T(150, 12 + 20 * sp), T(70, 15 + 6 * sp), TBb,
    ];
    LIB.inkPath(ctx, tail, { closed: true, width: 3 * LW, fill: P.plumeWhite, seed: seedP + 10, wobble: 0.8, taper: [4, 8], smooth: false });
    {
      const p = new Path2D();
      tS(p, [T(90, -13 - 8 * sp), T(180, -10 - 22 * sp), mix2(T(200, -9 - 24 * sp), up, 0.6)], 3.2 / LW, 0.8 / LW);
      tS(p, [T(96, 13 + 8 * sp), T(180, 7 + 22 * sp), mix2(T(185, 8 + 24 * sp), lo, 0.6)], 2.6 / LW, 0.8 / LW);
      fillPath(ctx, p, P.mantleGrey);
      const q = new Path2D();
      for (let i = 0; i < 5; i++) tS(q, [T(18, lerp(-10, 10, i / 4)), T(lerp(128, 150, Math.abs(i - 2) / 2), lerp(-8, 8, i / 4) * (1 + sp))], 1.1, 0.4);
      fillPath(ctx, q, P.plumeShade);
      strokePath(ctx, q, P.inkFaint, 0.5 * LW, 0.6);
    }

    // --- body: breastGrey underparts, grey mantle, white vent and throat
    const bodyPts = BODY_L.map(XB);
    const bodyClosed = cr(bodyPts, true, 3);
    fillPoly(ctx, bodyClosed, P.breastGrey);
    ctx.save();
    clipInside(ctx, bodyClosed);
    fillPoly(ctx, LIB.ellipsePts(...XB([98, -76]), 22, 12, 20, ps.th + 0.6), P.plumeWhite, 0.8);
    fillPoly(ctx, LIB.ellipsePts(...XB([-140, -118]), 26, 30, 20, ps.th), P.plumeWhite);
    fillPoly(ctx, [XB([-120, -160]), XB([116, -130]), XB([116, -108]), XB([30, -118]), XB([-50, -126]), XB([-112, -134])], P.mantleGrey);
    LIB.crossHatch(ctx, bodyClosed, hs({
      spacing: 7, crossSpacing: 7, width: 1.3, color: P.mantleDeep, alpha: 0.7, tone: 0.55, layers: 2, seed: seedP + 20, length: [12, 36],
      angle: -Math.PI / 4, density: (x, y) => { const q = sub([x, y], XB([0, -60])); const c = Math.cos(ps.th), s = Math.sin(ps.th); return clamp(((-q[0] * s + q[1] * c) + 8) / 34); },
    }));
    {
      const p = new Path2D();
      for (let i = 0; i < 12; i++) {
        const x = lerp(-110, 90, i / 11);
        const a = XB([x + 4, -60 + Math.abs(x) * 0.06]), m = XB([x - 2, -53]), b = XB([x - 6, -46 + Math.abs(x) * 0.02]);
        tS(p, [a, m, b], 1.3, 0.4);
      }
      fillPath(ctx, p, P.mantleDeep, 0.6);
    }
    ctx.restore();
    LIB.inkPath(ctx, bodyPts, { width: 5 * LW, seed: seedP + 21, wobble: 1.2, taper: [10, 14], double: { offset: 3.5 * LW, width: 0.3, alpha: 0.4, from: 0.08, to: 0.4 } });

    // --- folded wing along the back, wingtips short of the streamers
    if (!spread) {
      const S0 = XB([-84, -128]);
      const wt = T(222, -12);
      const upperE = [S0, XB([-30, -146]), XB([60, -142]), XB([118, -126]), T(90, -18), T(170, -16), wt];
      const lowerE = [T(190, -6), T(120, 4), T(40, 14), XB([60, -96]), XB([-10, -94]), XB([-66, -106])];
      const wing = cr(upperE.concat(lowerE), true, 4);
      LIB.inkPath(ctx, wing, { closed: true, width: 4 * LW, fill: P.mantleGrey, seed: seedP + 30, wobble: 1.0, taper: [8, 12] });
      ctx.save();
      clipInside(ctx, wing);
      const pr = [T(20, 10), T(120, 0), wt];
      fillPoly(ctx, cr([T(0, -14), T(150, -12), wt, T(170, 0), T(40, 18)], true, 3), P.mantleDeep, 0.35);
      const p = new Path2D();
      for (let i = 0; i < 5; i++) {
        const o = i * 4.2 - 6;
        tS(p, [add(pr[0], mul(nr, o)), add(pr[1], mul(nr, o * 0.7)), add(mix2(pr[1], wt, 0.9), mul(nr, o * 0.3))], 1.4, 0.5);
      }
      for (let i = 0; i < 9; i++) {
        const x = lerp(-60, 90, i / 8);
        tS(p, [XB([x, -120]), XB([x + 10, -106]), XB([x + 12, -97])], 1.3, 0.6);
      }
      fillPath(ctx, p, P.mantleDeep, 0.9);
      LIB.hatch(ctx, wing, hs({
        spacing: 6, width: 1.3, color: P.mantleDeep, alpha: 0.7, seed: seedP + 31, length: [12, 34],
        density: (x, y) => { const q = sub([x, y], XB([40, -120])); const c = Math.cos(ps.th), s = Math.sin(ps.th); return clamp(((-q[0] * s + q[1] * c)) / 22); },
      }));
      const w = new Path2D();
      for (let i = 0; i < 4; i++) {
        const a = XB([lerp(-20, 80, i / 3), -100 + i * 1.5]);
        const b = XB([lerp(-2, 100, i / 3), -97 + i * 1.5]);
        tS(w, [a, add(mix2(a, b, 0.5), [0, 3]), b], 3.2 / LW, 1.2 / LW);
      }
      for (let i = 0; i < 5; i++) {
        const a = XB([lerp(-70, 20, i / 4), -130]);
        tS(w, [a, add(a, [14, 4])], 2.4 / LW, 0.8 / LW);
      }
      fillPath(ctx, w, P.plumeWhite, 0.95);
      ctx.restore();
    }

    // --- neck and head
    const head = ps.head || { c: XB(HEAD_L), bAng: Math.PI + 0.08 + ps.th };
    const hc = head.c;
    const fh = dir(head.bAng), uph = [-fh[1], fh[0]];
    const HP = (u, v) => add(hc, add(mul(fh, u * HEAD_R), mul(uph, v * HEAD_R)));
    const nape = XB([-120, -151]), throat = XB([-148, -116]);
    const dors = HP(-0.9, 0.3), vent = HP(-0.05, -0.99);
    const neckPoly = cr([nape, mix2(nape, dors, 0.5), dors, hc, vent, mix2(throat, vent, 0.5), throat, XB([-110, -120])], true, 3);
    fillPoly(ctx, neckPoly, P.plumeWhite);
    const nshade = [mix2(throat, vent, 0.1), mix2(throat, vent, 0.9), HP(0.1, -0.7), XB([-128, -126])];
    LIB.hatch(ctx, nshade, hs({ spacing: 8, width: 1.2, color: P.mantleDeep, alpha: 0.5, seed: seedP + 40, length: [8, 20] }));
    LIB.inkPath(ctx, [nape, add(mix2(nape, dors, 0.5), mul(uph, 3)), dors], { width: 4 * LW, seed: seedP + 41, wobble: 0.6, taper: [6, 6] });
    LIB.inkPath(ctx, [vent, add(mix2(throat, vent, 0.5), mul(uph, -3)), throat], { width: 4 * LW, seed: seedP + 42, wobble: 0.6, taper: [6, 6] });
    const headPts = [];
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * TAU;
      headPts.push(HP(Math.cos(a), Math.sin(a)));
    }
    fillPoly(ctx, headPts, P.plumeWhite);
    // black cap from the bill base over the crown to the nape; the eye sits in its lower edge
    // (inside the head outline, running low down the nape, its lower edge dipping under the eye)
    const cap = [];
    for (let i = 0; i <= 22; i++) {
      const a = lerp(4, 206, i / 22) * DEG;
      cap.push(HP(Math.cos(a) * 0.99, Math.sin(a) * 0.99));
    }
    cap.push(HP(-1.08, -0.52), HP(-0.7, -0.34), HP(-0.2, -0.22), HP(0.4, -0.16), HP(0.75, -0.08), HP(0.97, -0.02));
    fillPoly(ctx, cr(cap, true, 2), P.capBlack);
    {
      const p = new Path2D();
      tS(p, [HP(-0.4, 0.75), HP(0.05, 0.86), HP(0.45, 0.7)], 2.6, 0.8);
      fillPath(ctx, p, P.mantleDeep, 0.6);
    }
    LIB.hatch(ctx, [HP(-0.8, -0.2), HP(0.2, -0.1), HP(0.4, -0.7), HP(-0.3, -0.95)], hs({ spacing: 7, width: 1.1, color: P.mantleDeep, alpha: 0.45, seed: seedP + 43, length: [8, 16] }));
    const ec = HP(0.42, 0.0);
    ctx.save();
    ctx.fillStyle = P.capBlack;
    ctx.beginPath();
    ctx.arc(ec[0], ec[1], 5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = P.plumeWhite;
    ctx.beginPath();
    ctx.arc(ec[0] - 1.4, ec[1] - 1.6, 1.6, 0, TAU);
    ctx.fill();
    ctx.restore();
    {
      const arc = [];
      for (let i = 0; i <= 30; i++) {
        const a = lerp(-96, 163, i / 30) * DEG;
        arc.push(HP(Math.cos(a), Math.sin(a)));
      }
      LIB.inkPath(ctx, arc, { width: 4.5 * LW, seed: seedP + 44, wobble: 0.8, taper: [6, 8] });
    }

    // --- bill: blood red to the tip, straight and slim, a gape line
    const bb = HP(0.82, -0.12);
    const tip = add(bb, mul(fh, BILL_LEN));
    const bill = [add(bb, mul(uph, BILL_D * 0.5)), add(add(bb, mul(fh, BILL_LEN * 0.5)), mul(uph, BILL_D * 0.28)), tip, add(add(bb, mul(fh, BILL_LEN * 0.62)), mul(uph, -BILL_D * 0.3)), add(add(bb, mul(fh, BILL_LEN * 0.3)), mul(uph, -BILL_D * 0.44)), add(bb, mul(uph, -BILL_D * 0.5))];
    LIB.inkPath(ctx, bill, { closed: true, width: 2.6 * LW, fill: P.billRed, seed: seedP + 50, wobble: 0.4, tremble: 0.2, taper: [3, 3], smooth: false });
    {
      const lower = [add(bb, mul(uph, -BILL_D * 0.1)), add(add(bb, mul(fh, BILL_LEN * 0.62)), mul(uph, -BILL_D * 0.2)), mix2(tip, bb, 0.04), add(add(bb, mul(fh, BILL_LEN * 0.3)), mul(uph, -BILL_D * 0.4)), add(bb, mul(uph, -BILL_D * 0.45))];
      LIB.hatch(ctx, lower, hs({ spacing: 3.2, width: 1.1, color: P.billDeep, alpha: 0.85, seed: seedP + 51, length: [6, 16], clip: true }));
      const g = new Path2D();
      tS(g, [add(bb, mul(uph, -BILL_D * 0.05)), add(add(bb, mul(fh, BILL_LEN * 0.45)), mul(uph, -BILL_D * 0.02)), add(add(bb, mul(fh, BILL_LEN * 0.8)), mul(uph, -BILL_D * 0.02))], 1.6, 0.6);
      fillPath(ctx, g, P.billDeep);
      const hl = new Path2D();
      tS(hl, [add(add(bb, mul(fh, 8)), mul(uph, BILL_D * 0.3)), add(add(bb, mul(fh, BILL_LEN * 0.5)), mul(uph, BILL_D * 0.16))], 1.8, 0.4);
      fillPath(ctx, hl, P.rose, 0.8);
    }
    // the sand eel held crosswise in the bill tip, hanging both sides
    // (recorded here, drawn by drawBirdEel over both birds so the sitter never hides it)
    if (ps.fish) ps.eel = { c: add(tip, mul(fh, -5)), ang: head.bAng + Math.PI / 2 + 0.22 };

    drawLeg(0, false);

    // --- near wing (in front)
    if (spread) {
      const [arm, hand, span, chord] = spread.near;
      drawSpreadWing(ctx, wingGeom(XB(SHOULDER_N), arm + ps.th, hand + ps.th, span, chord), 'near', seedP + 200);
    }
  }

  // bird-local point for a world point, for a bird with its feet at o, mirrored by m (1 left, -1 right)
  const toLocal = (w, o, m) => [(w[0] - o[0]) / (K * m), (w[1] - o[1]) / K];

  // the mate: lands from the upper right with the eel (three drawings), then offers it
  const PHI_B = Math.PI - 0.2; // bill pointing left, a touch down
  const HEAD_B = headFor(toLocal(FISH, TD_B, -1), PHI_B);
  function mateState(t) {
    const d = Math.floor(LIB.onTwos(t) * 12 + 1e-6);
    const base = { o: TD_B, m: -1, x: 0, y: 0, fish: true, flying: false, spread: 0, th: 0.02, rear: REAR, wing: 'fold', legs: 'stand', head: null };
    if (d === 0) {
      const at = bez(DESC[0], DESC[1], TD_B, 0.8);
      return Object.assign(base, { o: at, th: 0.16, rear: 0.3, wing: 'up', legs: 'land', spread: 1, flying: true });
    }
    if (d === 1) return Object.assign(base, { th: 0.12, rear: 0.12, wing: 'half', legs: 'land', spread: 0.7 });
    if (d === 2) return Object.assign(base, { th: 0.06, rear: REAR * 0.7, legs: 'stand', head: { c: mix2(HEAD_L, HEAD_B, 0.5), bAng: lerp(Math.PI + 0.1, PHI_B, 0.5) } });
    // offering: neck stretched, the eel held out; a small bob on twos
    const bob = d & 1 ? 2 : -1;
    return Object.assign(base, { th: 0.1, head: { c: add(HEAD_B, [0, bob]), bAng: PHI_B + (d & 1 ? 0.03 : 0) } });
  }

  // the sitter: broods, bill up at the incoming mate; rises on T 29.75, steps off the clutch, reaches
  const PHI_A = Math.PI + 0.1; // local: left and a touch up (mirrored: right, up)
  const HEAD_A = headFor(toLocal([FISH[0] + 11, FISH[1] + 3], STAND, 1), PHI_A);
  function sitterState(t) {
    const base = { m: 1, x: 0, y: 0, fish: false, flying: false, spread: 0, rear: REAR + 0.1, wing: 'fold' };
    if (t < B_RISE - 1e-6) {
      const d = Math.floor(LIB.onTwos(t) * 12 + 1e-6);
      return Object.assign(base, { o: SIT, th: -0.06, legs: 'none', crouch: 6, rear: REAR + 0.26, head: { c: add(HEAD_L, [-8, d === 0 ? 6 : -4]), bAng: Math.PI + (d === 0 ? 0.2 : 0.42) } });
    }
    const d = Math.floor((LIB.onTwos(t) - B_RISE) * 12 + 1e-6);
    if (d === 0) return Object.assign(base, { o: [620, 1328], th: 0.08, legs: 'land', rear: REAR + 0.2, head: { c: add(HEAD_L, [34, -14]), bAng: Math.PI + 0.5 } });
    if (d === 1) return Object.assign(base, { o: [636, 1312], th: 0.03, legs: 'land', wing: 'mid', spread: 0.3, rear: REAR + 0.1, head: { c: add(HEAD_L, [-12, -6]), bAng: Math.PI + 0.24 } });
    if (d === 2) return Object.assign(base, { o: STAND, th: 0.0, legs: 'stand', head: { c: mix2(HEAD_L, HEAD_A, 0.6), bAng: lerp(Math.PI + 0.24, PHI_A, 0.6) } });
    return Object.assign(base, { o: STAND, th: -0.02, legs: 'stand', head: { c: add(HEAD_A, [d & 1 ? 1 : 0, 0]), bAng: PHI_A } });
  }

  // a bird under the world transform: feet at ps.o, mirrored by ps.m, pens held to screen weight
  function drawBird(ctx, ps, seedP, bi, zoom) {
    const zk = Math.min(zoom, 1.8) / zoom;
    LW = (1.3 / K) * zk;
    SPC = (1.45) * zk;
    ctx.save();
    ctx.translate(ps.o[0], ps.o[1]);
    ctx.scale(K * ps.m, K);
    drawParent(ctx, ps, seedP, bi);
    ctx.restore();
    LW = 1;
    SPC = 1;
  }

  // the eel a bird holds, drawn after both birds under the same transform
  function drawBirdEel(ctx, ps, seedP, bi, zoom) {
    if (!ps.eel) return;
    const zk = Math.min(zoom, 1.8) / zoom;
    LW = (1.3 / K) * zk;
    ctx.save();
    ctx.translate(ps.o[0], ps.o[1]);
    ctx.scale(K * ps.m, K);
    drawEel(ctx, ps.eel.c, ps.eel.ang, 1, seedP + 60, bi);
    ctx.restore();
    LW = 1;
  }

  function drawBirdShadow(ctx, L, x, y, rx, ry, seed, alpha, pen) {
    const pts = L.ellipsePts(x, y, rx, ry, 36);
    fillPoly(ctx, pts, P.inkSoft, 0.28 * alpha);
    L.hatch(ctx, pts, { spacing: 4 * pen, width: 1.2 * pen, color: P.ink, alpha: 0.6 * alpha, seed, length: [8 * pen, 24 * pen] });
  }

  // ===========================================================================
  // The colony overhead (from 04): distant terns flapping on twos, zoom 1 only
  // ===========================================================================
  const COLONY = [
    { x: 700, y: 470, s: 1.5, face: -1, vx: -60, vy: -10, ph: 0 },
    { x: 440, y: 300, s: 1.05, face: 1, vx: 44, vy: 6, ph: 2 },
    { x: 900, y: 560, s: 0.85, face: -1, vx: -40, vy: -6, ph: 1 },
    { x: 150, y: 250, s: 0.8, face: 1, vx: 30, vy: -4, ph: 3 },
    { x: 860, y: 250, s: 1.2, face: -1, vx: -50, vy: 8, ph: 1 },
  ];
  function drawSkyTern(ctx, x, y, s, face, pose, seed) {
    const sy = [1, 0.25, -0.75, 0.25][pose];
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(-face * s, s);
    const w = 1 / s;
    const wing = (dx, k) => [[-8 + dx, -3], [-5 + dx, -22 * sy * k - 3], [22 + dx, -46 * sy * k], [5 + dx, -20 * sy * k + 2], [3 + dx, -1]];
    LIB.inkPath(ctx, wing(6, 0.82), { closed: true, width: 1.6 * w, fill: P.mantleGrey, color: P.inkSoft, seed: seed + 1, wobble: 0.3, taper: [2, 2], smooth: false });
    const tail = new Path2D();
    taperStroke(tail, [[18, 1], [34, -1], [50, -5]], 3.4, 0.6);
    taperStroke(tail, [[18, 3], [34, 4], [48, 6]], 3.2, 0.6);
    fillPath(ctx, tail, P.plumeWhite);
    strokePath(ctx, tail, P.inkSoft, 1.1 * w, 0.9);
    LIB.inkPath(ctx, LIB.ellipsePts(-4, 0, 25, 6.5, 18), { closed: true, width: 1.8 * w, fill: P.breastGrey, seed: seed + 2, wobble: 0.3, taper: [2, 2] });
    LIB.inkPath(ctx, LIB.ellipsePts(-30, -2, 7, 7, 14), { closed: true, width: 1.6 * w, fill: P.plumeWhite, seed: seed + 3, wobble: 0.2, taper: [2, 2] });
    fillPoly(ctx, [[-37, -3], [-30, -9.5], [-23, -6], [-24, -2]], P.capBlack);
    const bill = new Path2D();
    taperStroke(bill, [[-36, -1], [-47, 1]], 3.4, 0.8);
    fillPath(ctx, bill, P.billRed);
    LIB.inkPath(ctx, wing(0, 1), { closed: true, width: 1.8 * w, fill: P.plumeWhite, seed: seed + 4, wobble: 0.3, taper: [2, 2], smooth: false });
    const edge = new Path2D();
    taperStroke(edge, [[22, -46 * sy], [5, -20 * sy + 2]], 2 * w, 0.8 * w);
    fillPath(ctx, edge, P.capBlack, 0.85);
    ctx.restore();
  }
  function drawColony(ctx, t) {
    const tw = LIB.onTwos(t);
    COLONY.forEach((b, i) => {
      const pose = (Math.floor(tw * 12 + 1e-6) + b.ph) % 4;
      const x = b.x + b.vx * tw, y = b.y + b.vy * tw + 5 * Math.sin(tw * 5 + i);
      drawSkyTern(ctx, x, y, b.s, b.face, pose, sm('colony', i));
    });
  }

  // ===========================================================================
  // Camera: a pure zoom about FIX, log-linear with an outExpo arrival
  // ===========================================================================
  function zoomAt(t) {
    if (t < B_SNAP - 1e-6) return 1;
    const u = (t - B_SNAP) / ZOOM_SPAN + 1 / 11; // one-frame lead: the snap is visible on the beat frame
    if (u >= 1 - 1e-3) return Z_END; // the landing frames sit exactly on 20x despite float time
    return Math.exp(Math.log(Z_END) * LIB.ease.outExpo(u));
  }

  // ===========================================================================
  // Scene
  // ===========================================================================
  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib;
      const t = clamp(tIn, 0, info.dur);
      const bi = L.boil(info.T);
      const G = geo(L);
      const hit = (a, frames, e, lead = 1) => (t < a - 1e-6 ? 0 : (e || ((u) => u))(clamp((t - a) / (frames * FR) + lead / frames)));

      const z = zoomAt(t);
      const pen = 1 / z;
      const VR = { x0: FIX[0] - FIX[0] / z, x1: FIX[0] + (1080 - FIX[0]) / z, y0: FIX[1] - FIX[1] / z, y1: FIX[1] + (1920 - FIX[1]) / z };
      const world = (fn) => {
        ctx.save();
        if (z !== 1) {
          ctx.translate(FIX[0] * (1 - z), FIX[1] * (1 - z));
          ctx.scale(z, z);
        }
        fn();
        ctx.restore();
      };
      // the egg's screen centre; on the landing frames exactly (540, 900), so the G1 frame is the identity
      const EX = z === Z_END ? 540 : FIX[0] + z * (EGG[0] - FIX[0]);
      const EY = z === Z_END ? 900 : FIX[1] + z * (EGG[1] - FIX[1]);
      const gk = z / Z_END;
      const g1 = (fn) => {
        ctx.save();
        if (z !== Z_END) {
          ctx.translate(EX, EY);
          ctx.scale(gk, gk);
          ctx.translate(-540, -900);
        }
        fn();
        ctx.restore();
      };

      const mate = mateState(t);
      const sitter = sitterState(t);
      const brooding = t < B_RISE - 1e-6;
      const birdsOn = z < 14;

      // 1. stripes in screen space, drifting 6 px per beat (hidden behind the shore once the zoom is in)
      if (VR.y0 < HORIZON) L.stripes(ctx, { colors: [P.stripeCream, P.stripeYellow], width: 140, angle: -0.52, offset: 12 * info.T, seed: 303 });

      world(() => {
        // 2-3. far shore, the sound, the shingle and the scrape
        if (z === 1) drawPlate(ctx, L, bi);
        else drawBackdrop(ctx, L, VR, z, bi);
        if (VR.y0 < SHORE) drawSurf(ctx, info.T, bi, pen);
        // 4. the colony overhead and construction lines
        if (z < 2) drawColony(ctx, t);
        ctx.save();
        ctx.strokeStyle = P.inkFaint;
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = 1.5 * pen;
        ctx.beginPath();
        ctx.moveTo(-100, HORIZON);
        ctx.lineTo(1200, HORIZON);
        ctx.moveTo(-100, TD_B[1]);
        ctx.lineTo(1200, TD_B[1]);
        ctx.moveTo(EGG[0], 1040);
        ctx.lineTo(EGG[0], 1560);
        ctx.stroke();
        ctx.setLineDash([6 * pen, 8 * pen]);
        ctx.beginPath();
        ctx.arc(TD_B[0], TD_B[1] - 90, 200, 0, TAU);
        ctx.stroke();
        ctx.restore();
        // 5. shadows and the adults (off frame once the zoom passes 14x)
        if (birdsOn) {
          const md = Math.floor(L.onTwos(t) * 12 + 1e-6);
          drawBirdShadow(ctx, L, TD_B[0] - 6, TD_B[1] + 3, md === 0 ? 50 : 72, md === 0 ? 6 : 9, sm('shadowB'), md === 0 ? 0.6 : 1, pen);
          drawBirdShadow(ctx, L, sitter.o[0] + 8, sitter.o[1] + 2, 74, 9, sm('shadowA'), 1, pen);
          drawBird(ctx, mate, sm('mate'), bi, z);
          if (!brooding) drawBird(ctx, sitter, sm('sitter'), bi, z);
          if (!brooding) drawBirdEel(ctx, mate, sm('mate'), bi, z);
        }
      });

      // 6. the eggs, in G1 coordinates: construction that 17 inherits, shadows, the sibling, the G1 egg
      const ePen = (Z_END / z) * (0.45 + 0.55 * clamp((z - 1) / 8));
      const eLod = Math.max(1, (Z_END / z) * 0.5);
      g1(() => {
        const w = Z_END / z; // one screen px in G1 units
        ctx.save();
        ctx.strokeStyle = P.inkFaint;
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = 1.5 * w;
        ctx.beginPath();
        ctx.arc(540, 900, 470, 0, TAU);
        ctx.moveTo(540 + 640, 900);
        ctx.arc(540, 900, 640, 0, TAU);
        ctx.moveTo(60, AXIS_Y);
        ctx.lineTo(1020, AXIS_Y);
        ctx.moveTo(CONTACT[0], 560);
        ctx.lineTo(CONTACT[0], 1240);
        ctx.stroke();
        ctx.restore();
        castShadow(ctx, L, 1180 + 80, 980 + 0.85 * 278 + 8, 300, 26, ePen, eLod, bi, 1);
        ctx.save();
        ctx.translate(1180, 980);
        ctx.rotate(-3 * DEG);
        ctx.scale(0.85, 0.85);
        ctx.translate(-540, -AXIS_Y);
        paintEgg(ctx, L, bi, G.sib, { pen: ePen / 0.85, lod: eLod });
        ctx.restore();
        castShadow(ctx, L, 640, 1188, 360, 30, ePen, eLod, bi, 0);
        drawInkedEgg(ctx, L, bi, { pen: ePen, lod: eLod });
      });

      // the brooding bird sits over the clutch
      if (brooding)
        world(() => {
          drawBird(ctx, sitter, sm('sitter'), bi, z);
          drawBirdEel(ctx, mate, sm('mate'), bi, z);
        });

      // 7. overlays, screen space, 24 fps
      // the mate's descent, drawn on behind it, clearing once it has landed
      if (t < B_SNAP) {
        const a = 1 - L.seg(t, 2 * FR, 5 * FR); // aimed at the landing, cleared once the mate is down
        if (a > 0) {
          const pts = [];
          const uEnd = t < 1 / 12 - 1e-6 ? 0.8 : 1; // up to the mate's body: in the air, then at the touch-down
          for (let i = 0; i <= 24; i++) pts.push(bez(DESC[0], DESC[1], TD_B, (i / 24) * uEnd));
          const p = new Path2D();
          pts.forEach((q, i) => (i ? p.lineTo(q[0] + 10, q[1] - 66) : p.moveTo(q[0] + 10, q[1] - 66)));
          strokePath(ctx, p, P.annBlue, 2.5, a, [14, 10]);
          // a landing ring at the touch-down, on the landing drawing
          const e = hit(1 / 12, 8, L.ease.outExpo, 0);
          if (e > 0 && t < 1 / 12 + 8 * FR) {
            ctx.save();
            ctx.strokeStyle = P.annBlue;
            ctx.globalAlpha = 1 - e;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(TD_B[0], TD_B[1] + 2, 30 + 60 * e, 6 + 12 * e, 0, 0, TAU);
            ctx.stroke();
            ctx.restore();
          }
        }
      }
      // the target ring on the egg: lands on r 470, 17's guide circle, as the camera arrives
      if (t >= B_SNAP - 1e-6) {
        const zf = Math.log(z) / Math.log(Z_END);
        const r = z * lerp(40, 23.5, zf);
        const d = hit(B_SNAP, 6, L.ease.outExpo);
        ctx.save();
        ctx.strokeStyle = P.annYellow;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(EX, EY, r, -Math.PI / 2, -Math.PI / 2 + TAU * d);
        ctx.stroke();
        if (d > 0.9) {
          ctx.beginPath();
          for (let q = 0; q < 4; q++) {
            const a = (q * Math.PI) / 2;
            ctx.moveTo(EX + Math.cos(a) * (r - 10), EY + Math.sin(a) * (r - 10));
            ctx.lineTo(EX + Math.cos(a) * (r + 10), EY + Math.sin(a) * (r + 10));
          }
          ctx.stroke();
        }
        ctx.restore();
        // eight ticks burst on the beat, for four frames
        const fi = Math.round((t - B_SNAP) / FR);
        if (fi >= 0 && fi < 4) {
          const segs = [];
          const r0 = r + 14 + 10 * fi, r1 = r + 40 + 18 * fi;
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * TAU + Math.PI / 8;
            segs.push([EX + Math.cos(a) * r0, EY + Math.sin(a) * r0, EX + Math.cos(a) * r1, EY + Math.sin(a) * r1]);
          }
          strokeBatch(ctx, segs, 3, P.annYellow, 1 - 0.2 * fi);
        }
        // snap-zoom guides: construction strokes rushing out from the egg
        const zu = (t - B_SNAP) / (7 * FR);
        if (zu >= 0 && zu <= 1) {
          const segs = [];
          for (let i = 0; i < 36; i++) {
            const a = (i / 36) * TAU + L.h3(i, 1, sm('zg')) * 0.12;
            const r0 = r + 40 + 900 * L.ease.outCubic(zu) * (0.6 + 0.4 * L.h3(i, 2, sm('zg')));
            const r1 = r0 + 90 + 160 * L.h3(i, 3, sm('zg'));
            segs.push([EX + Math.cos(a) * r0, EY + Math.sin(a) * r0, EX + Math.cos(a) * r1, EY + Math.sin(a) * r1]);
          }
          strokeBatch(ctx, segs, 1.5, P.inkFaint, 0.5 * (1 - zu));
        }
      }
    },
  });
})();
