// 03 egg-hatch : "Pipping on the shingle". Illustrated, global T 4.0 to 5.5.
// Match cut from the blueprint egg (G1) to the inked olive-buff egg lying in its shingle scrape.
// The egg rocks, a star crack opens at the pip point, a ring crack runs round the blunt end on the
// beat and the egg tooth pokes through; the camera pulls back to zoom 0.45 to show the scrape and the
// sibling egg; the cap tips onto the shingle and the wet chick spills out, shoves free and fluffs.
//
// Layers, back to front:
//   1. stripes (screen space, stripeCream / stripeYellow, 6 px drift per beat)
//   2. world, under the camera: shingle ground and ridge, gravel stipple, moss tufts
//   3. construction: the blueprint's guide circles and the egg axis, inkFaint
//   4. the scrape hollow, back pebbles (behind the eggs), egg cast shadows
//   5. the sibling egg (world 1180, 980, 85 percent), then the G1 egg (drawInkedEgg) or the opened shell
//   6. the chick (clipped by the shell's front wall while it is still half inside), the tipped cap, shards
//   7. front pebbles, grass stems and a feather on the rim
//   8. overlays (constant screen weight): annYellow pip ring and burst ticks, annBlue arc of the cap
(function () {
  'use strict';
  const ID = 'egg-hatch';
  const REF = 'egg-blueprint'; // the G1 blotches are seeded from shot 02 so they land on its outlines
  const LIB = FILM.lib;
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const FR = 1 / 24;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const sstep = (a, b, x) => {
    const u = clamp((x - a) / (b - a));
    return u * u * (3 - 2 * u);
  };
  const sd = (...k) => LIB.hash(ID, ...k) & 0x7fffffff;

  // beats (shot-local seconds)
  const B_HOLD = 2 / 24; // T 4.083 the match frame has held two frames
  const B_STAR = 0.25; // T 4.25 star crack at the pip point
  const B_RING = 0.5; // T 4.5 ring crack, egg tooth through, camera starts back
  const B_CAP = 1.0; // T 5.0 cap tips off, chick spills out
  const B_FREE = 1.25; // T 5.25 chick shoves free and fluffs
  // the pull-back stops at 0.6 (critic wave 1: the storyboard's 0.45 left the subject a thin band)
  const END_ZOOM = 0.6;
  const DRIFT_ZOOM = 0.58;
  const END_C = [578, 950];

  // ===========================================================================
  // G1 geometry (docs/storyboard.md, Shared geometry G1), exact numbers
  // ===========================================================================
  const G1_TABLE = [[160, 0], [175, 120], [200, 175], [240, 222], [300, 257], [380, 274], [460, 278], [540, 275], [620, 264], [700, 242], [780, 205], [840, 160], [880, 112], [905, 62], [920, 0]];
  const AXIS_Y = 900;
  const PIP = [240, 800];
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
  // The crack: a jagged ring round the blunt end at x 250, seen as a narrow ellipse
  // ===========================================================================
  const RING_X = 250;
  const RING_RX = 30;
  const RING_RY = halfH(RING_X); // 227.8: the ring meets the outline at y 672 and 1128
  function jag(y, k) {
    const u = (y - 600) / 13;
    const i = Math.floor(u);
    const f = u - i;
    const v = (j) => (j & 1 ? 1 : -1) * (2 + 4.5 * LIB.h3(j, k, 3031));
    return v(i) + (v(i + 1) - v(i)) * f;
  }
  // the near half of the ring (bulging toward the narrow end): the crack line, later the near lip
  const crackX = (y) => RING_X + RING_RX * Math.sqrt(Math.max(0, 1 - Math.pow((y - AXIS_Y) / RING_RY, 2))) + jag(y, 1);
  // the far half (bulging toward the blunt end): the far lip once the cap is off
  const farX = (y) => RING_X - RING_RX * Math.sqrt(Math.max(0, 1 - Math.pow((y - AXIS_Y) / RING_RY, 2))) + jag(y, 2) * 0.7;
  const RING_Y0 = AXIS_Y - RING_RY, RING_Y1 = AXIS_Y + RING_RY;
  const CRACK_PTS = (() => {
    const out = [];
    for (let y = RING_Y0; y <= RING_Y1 + 0.01; y += 6) out.push([crackX(y), y]);
    return out;
  })();
  const FAR_PTS = (() => {
    const out = [];
    for (let y = RING_Y1; y >= RING_Y0 - 0.01; y -= 6) out.push([farX(y), y]);
    return out;
  })();
  // the cap: the blunt end left of the crack
  const CAP_POLY = (() => {
    const up = G1_OUTLINE.filter((p) => p[1] <= AXIS_Y && p[0] < RING_X);
    const lo = G1_OUTLINE.filter((p) => p[1] > AXIS_Y && p[0] < RING_X);
    return up.concat(CRACK_PTS, lo);
  })();
  const CAP_C = [224, 900];
  // the shell left behind: right of the far lip
  const SHELL_POLY = (() => {
    const up = G1_OUTLINE.filter((p) => p[1] <= AXIS_Y && p[0] > RING_X + 2);
    const lo = G1_OUTLINE.filter((p) => p[1] > AXIS_Y && p[0] > RING_X + 2);
    return up.concat(lo, FAR_PTS);
  })();
  const HOLLOW = FAR_PTS.concat(CRACK_PTS);

  // ===========================================================================
  // Scenery tables (world px)
  // ===========================================================================
  const RIDGE_Y = 1100;
  const WX0 = -1000, WX1 = 2100, WY1 = 3350; // the world is drawn this far for the pull-back
  const ridgeY = (x) => RIDGE_Y + 5 * LIB.noise1(x / 160, 71) + 3 * LIB.noise1(x / 41, 72);
  const SCRAPE = { x: 810, y: 1195, rx: 770, ry: 70 };
  const SIB = { x: 1180, y: 980, s: 0.85, rot: -3 * DEG }; // the sibling egg: G1 centre (540, 900) maps here
  const CLEAR = { x: -90, y: 1200, rx: 390, ry: 175 }; // where the chick lies and the cap lands
  const inEll = (x, y, e, k = 1) => Math.pow((x - e.x) / (e.rx * k), 2) + Math.pow((y - e.y) / (e.ry * k), 2) < 1;
  const pebSize = (y) => clamp(18 + 122 * Math.pow(clamp((y - RIDGE_Y) / 800, 0, 2), 1.6), 16, 150);
  const MOSS_X = [-760, -470, -130, 330, 690, 1030, 1390, 1720, 1990];

  // ===========================================================================
  // Memoised geometry (t-independent)
  // ===========================================================================
  let GEO = null;
  function geo(L) {
    if (GEO) return GEO;
    const P = L.pal;
    const G = {};
    G.egg = { outline: G1_OUTLINE, path: polyPath(G1_OUTLINE), blot: blotchSet(L, L.hash(REF, 'blotch')), seed: sd('egg') };
    G.sib = { outline: G1_OUTLINE, path: G.egg.path, blot: blotchSet(L, L.hash(ID, 'sibling')), seed: sd('sibling') };
    for (const E of [G.egg, G.sib]) E.shapes = blotchShapes(L, E);
    G.capPath = polyPath(CAP_POLY);
    G.shellPath = polyPath(SHELL_POLY);
    G.hollowPath = polyPath(HOLLOW);
    // colours mixed once
    G.c = {
      pebDark: L.mix(P.shingle, P.shingleDeep, 0.45),
      scrape: L.mix(P.shingle, P.shingleDeep, 0.28),
      hollow: L.mix(P.eggSpot, P.ink, 0.45),
      wet: L.mix(P.downGrey, P.ink, 0.3),
      bill: L.mix(P.downTan, P.legRed, 0.6),
      lining: L.mix(P.white, P.eggPale, 0.35),
      wingWet: L.mix(P.downGrey, P.ink, 0.42),
    };
    // the zoom-1 plate keeps the match-frame shingle; the pulled-back plate adds the raised scrape rim
    G.pebNear = buildPebbles(L, false);
    G.peb = buildPebbles(L, true);
    G.chick = buildChick(L);
    G.star = buildStar(L);
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

  function buildPebbles(L, rim) {
    const r = L.rng(sd('pebbles'));
    const list = [];
    let y = RIDGE_Y - 6;
    let row = 0;
    while (y < WY1) {
      const s = pebSize(y);
      let x = WX0 + r() * s;
      while (x < WX1) {
        const sz = s * r.range(0.66, 1.2);
        let rx = sz * 0.5;
        let ry = rx * r.range(0.44, 0.64);
        const px = x;
        const py = y + (r() - 0.5) * s * 0.18;
        const rot = r.range(-0.3, 0.3);
        const tone = r() < 0.5 ? 0 : r() < 0.6 ? 1 : 2;
        const lich = r() < 0.045 && s > 30 && tone !== 1;
        const la = r.range(0, TAU), lr = r.range(0.32, 0.58);
        x += sz * r.range(0.9, 1.12);
        // the scrape hollow and the clearing where the chick lies hold only grit; patches of finer gravel elsewhere
        const inScrape = inEll(px, py, SCRAPE, 0.94);
        const inClear = inEll(px, py, CLEAR);
        let grit = false;
        if (inClear || (inScrape && !rim)) {
          rx *= 0.24;
          ry *= 0.24;
          grit = true;
        } else if (inScrape) {
          rx *= 0.42;
          ry *= 0.42;
        } else if (L.noise2(px / 420, py / 260, 404) > 0.28) {
          rx *= 0.5;
          ry *= 0.5;
        }
        const n = 12;
        const V = [];
        for (let j = 0; j < n; j++) {
          const a = (j / n) * TAU;
          const k = 1 + 0.14 * (L.h3(list.length, j, 881) - 0.5) + 0.06 * Math.cos(2 * a + la);
          const lx = Math.cos(a) * rx * k, ly = Math.sin(a) * ry * k;
          V.push([px + lx * Math.cos(rot) - ly * Math.sin(rot), py + lx * Math.sin(rot) + ly * Math.cos(rot)]);
        }
        list.push({ id: list.length, x: px, y: py, rx, ry, rot, tone, lich: lich && rx > 12, la, lr, V, row, s, grit, under: grit && inClear });
      }
      y += s * r.range(0.34, 0.44);
      row++;
    }
    // the scrape's raised rim: two staggered rings of larger pebbles round both eggs, open on the left
    // where the chick has crawled over it
    const rr = L.rng(sd('rim'));
    for (const [, rs] of rim ? [[0, 1.0], [1, 1.1]] : []) {
      let a = rr() * 0.2;
      while (a < TAU) {
        const px = SCRAPE.x + Math.cos(a) * SCRAPE.rx * rs, py = SCRAPE.y + Math.sin(a) * SCRAPE.ry * rs;
        const sz = pebSize(py) * rr.range(1.5, 2.1);
        const rx = sz * 0.5, ry = rx * rr.range(0.5, 0.66);
        const rot = rr.range(-0.25, 0.25);
        const tone = rr() < 0.45 ? 1 : rr() < 0.5 ? 0 : 2;
        // step along the ellipse by about one pebble width
        const dl = Math.hypot(SCRAPE.rx * rs * Math.sin(a), SCRAPE.ry * rs * Math.cos(a)) || 1;
        a += (sz * rr.range(0.85, 1.05)) / dl;
        if (px < 170) continue;
        const V = [];
        for (let j = 0; j < 12; j++) {
          const aa = (j / 12) * TAU;
          const q = 1 + 0.14 * (L.h3(list.length, j, 882) - 0.5);
          const lx = Math.cos(aa) * rx * q, ly = Math.sin(aa) * ry * q;
          V.push([px + lx * Math.cos(rot) - ly * Math.sin(rot), py + lx * Math.sin(rot) + ly * Math.cos(rot)]);
        }
        list.push({ id: list.length, x: px, y: py, rx, ry, rot, tone, lich: false, la: 0, lr: 0, V, row: 100000 + list.length, s: sz, grit: false, under: false });
      }
    }
    list.sort((a, b) => a.y - b.y);
    return list;
  }

  // wet strands and dry speckles on the chick, in unit body coordinates
  function buildChick(L) {
    const r = L.rng(sd('chick'));
    const strands = [];
    for (let i = 0; i < 46; i++) {
      const a = r.range(0, TAU), d = Math.sqrt(r()) * 0.86;
      strands.push({ u: Math.cos(a) * d, v: Math.sin(a) * d, len: r.range(0.18, 0.38), bend: r.range(-0.12, 0.12), dir: r.range(-0.35, 0.35) });
    }
    const specks = [];
    for (let i = 0; i < 120; i++) {
      const a = r.range(0, TAU), d = Math.sqrt(r()) * 0.92;
      specks.push({ u: Math.cos(a) * d, v: Math.sin(a) * d, r: r.range(0.012, 0.03), rot: r.range(0, TAU), el: r.range(1.2, 2.2) });
    }
    return { strands, specks };
  }

  // six star-crack rays round the pip point (T 4.25)
  function buildStar(L) {
    const r = L.rng(sd('star'));
    const rays = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + r.range(-0.3, 0.3) + 0.4;
      const len = r.range(20, 40);
      const kink = r.range(-0.4, 0.4);
      const m = [PIP[0] + Math.cos(a + kink * 0.5) * len * 0.5, PIP[1] + Math.sin(a + kink * 0.5) * len * 0.5];
      const e = [PIP[0] + Math.cos(a - kink * 0.3) * len, PIP[1] + Math.sin(a - kink * 0.3) * len];
      const b = r() < 0.5 ? [m[0] + Math.cos(a + 0.9) * len * 0.35, m[1] + Math.sin(a + 0.9) * len * 0.35] : null;
      rays.push({ a, len, m, e, b });
    }
    const hole = [];
    for (let j = 0; j < 9; j++) {
      const a = (j / 9) * TAU;
      const rr = (j & 1 ? 9 : 15) + r.range(-2, 3);
      hole.push([PIP[0] + Math.cos(a) * rr, PIP[1] + Math.sin(a) * rr * 0.9]);
    }
    return { rays, hole };
  }

  // ===========================================================================
  // The inked egg. Shot 16 copies drawInkedEgg (and paintEgg, blotchShapes, halfH, G1_OUTLINE,
  // blotchSet) to land on G1 for the loop.
  //   opts.pen   world px per screen px for pen widths (1 / zoom), default 1
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

  // the pip: star rays (stage 1), the dark hole (stage 2), in G1 coordinates
  function drawPip(ctx, L, stage, bi, pen) {
    if (stage < 1) return;
    const P = L.pal;
    const S = geo(L).star;
    for (let i = 0; i < S.rays.length; i++) {
      const R = S.rays[i];
      const pts = [PIP, R.m, R.e];
      L.inkPath(ctx, pts, { width: 2.4 * pen, color: P.ink, seed: sd('ray', i), boil: bi, smooth: false, taper: [2, 10], wobble: 0.4 });
      if (R.b) L.inkPath(ctx, [R.m, R.b], { width: 1.4 * pen, color: P.ink, seed: sd('rayb', i), boil: bi, smooth: false, taper: [1, 6], wobble: 0.3 });
    }
    // lifted flakes round the star: pale edges catching the light
    const flakes = S.rays.map((R) => [R.m[0] - 3, R.m[1] - 3, R.e[0] - 3, R.e[1] - 3]);
    strokeBatch(ctx, flakes, 1.4 * pen, P.eggPale, 0.9);
    if (stage >= 2) L.inkPath(ctx, S.hole, { closed: true, width: 2 * pen, color: P.ink, fill: geo(L).c.hollow, seed: sd('hole'), boil: bi, smooth: false, taper: [2, 2], wobble: 0.3 });
  }

  // the ring crack round the blunt end (T 4.5), with two short branch cracks
  function drawRingCrack(ctx, L, bi, pen) {
    const P = L.pal;
    // a lifted lit edge on the blunt-end side, the dark gap, a thin shadow on the far side
    L.inkPath(ctx, CRACK_PTS.map((p) => [p[0] - 4, p[1]]), { width: 3 * pen, color: P.white, alpha: 0.9, seed: sd('ringlit'), boil: bi, smooth: false, taper: [10, 10] });
    L.inkPath(ctx, CRACK_PTS, { width: 4 * pen, color: P.ink, seed: sd('ring'), boil: bi, smooth: false, taper: [6, 6], widthJitter: 0.4 });
    L.inkPath(ctx, CRACK_PTS.map((p) => [p[0] + 4, p[1] + 1]), { width: 1.4 * pen, color: P.inkSoft, alpha: 0.7, seed: sd('ringsh'), boil: bi, smooth: false, taper: [10, 10] });
    for (const [y, dir, len, k] of [[760, 1, 30, 0], [1000, 1, 24, 1], [880, -1, 18, 2]]) {
      const a = [crackX(y), y];
      const b = [a[0] + dir * len * 0.55, a[1] + len * 0.3];
      const c = [a[0] + dir * len, a[1] + len * 0.2 - 6];
      L.inkPath(ctx, [a, b, c], { width: 1.6 * pen, color: P.ink, seed: sd('branch', k), boil: bi, smooth: false, taper: [2, 10], wobble: 0.3 });
    }
  }

  // the inside of the opening: dark hollow, pale membrane lining, wet sheen
  function drawHollow(ctx, L, bi, pen, lod, pale) {
    const P = L.pal;
    const G = geo(L);
    ctx.fillStyle = pale ? G.c.lining : G.c.hollow;
    ctx.fill(G.hollowPath);
    L.hatch(ctx, HOLLOW, { angle: -1.35, spacing: (pale ? 7 : 5) * lod, width: 1.3 * pen, color: pale ? P.inkSoft : P.ink, alpha: pale ? 0.5 : 0.6, density: pale ? (x) => sstep(RING_X - 10, RING_X + 30, x) : 1, length: [14 * lod, 40 * lod], seed: sd('hollow'), boil: bi, clip: true });
    const lining = [];
    for (let y = RING_Y0 + 30; y <= RING_Y1 - 30; y += 10) lining.push([farX(y) + 7, y]);
    L.inkPath(ctx, lining, { width: 3 * pen, color: P.white, alpha: 0.7, seed: sd('lining'), boil: bi, taper: [40, 40], wobble: 1 });
  }

  // ===========================================================================
  // Ground: fill, ridge, gravel, moss
  // ===========================================================================
  function drawGround(ctx, L, VR, pen, lod, bi) {
    const P = L.pal;
    const x0 = Math.max(WX0, VR.x0 - 60), x1 = Math.min(WX1, VR.x1 + 60);
    const ridge = [];
    for (let x = x0; x <= x1 + 30; x += 30) ridge.push([x, ridgeY(x)]);
    const body = ridge.concat([[x1 + 30, WY1], [x0, WY1]]);
    ctx.fillStyle = P.shingle;
    ctx.beginPath();
    L.tracePath(ctx, body, true);
    ctx.fill();
    const y1 = Math.min(WY1, VR.y1 + 20);
    const rect = [[x0, RIDGE_Y - 10], [x1, RIDGE_Y - 10], [x1, y1], [x0, y1]];
    ctx.save();
    ctx.beginPath();
    L.tracePath(ctx, body, true);
    ctx.clip();
    // gravel: dark and pale grains, finer toward the ridge
    L.stipple(ctx, rect, { color: P.shingleDeep, alpha: 0.75, spacing: 9 * lod, r: [0.9 * pen, 2.1 * pen], seed: sd('grit1'), boil: bi, density: (x, y) => 0.55 + 0.3 * L.noise2(x / 90, y / 60, 5) });
    L.stipple(ctx, rect, { color: P.shinglePale, alpha: 0.9, spacing: 10 * lod, r: [1 * pen, 2.4 * pen], seed: sd('grit2'), boil: bi, density: (x, y) => 0.45 + 0.3 * L.noise2(x / 70, y / 80, 6) });
    // the far band just under the ridge sits in a little shade
    L.hatch(ctx, [[x0, RIDGE_Y - 12], [x1, RIDGE_Y - 12], [x1, RIDGE_Y + 34], [x0, RIDGE_Y + 34]], {
      angle: -0.08, spacing: 5 * lod, width: 1.1 * pen, color: P.shingleDeep, alpha: 0.7, length: [20 * lod, 60 * lod], seed: sd('farband'), boil: bi,
      density: (x, y) => sstep(RIDGE_Y + 34, RIDGE_Y, y) * 0.9,
    });
    ctx.restore();
    // the ridge line against the sky
    L.inkPath(ctx, ridge, { width: 2.6 * pen, color: P.inkSoft, seed: sd('ridge'), boil: bi, taper: 0, wobble: 1.5 });
    // tundra moss clumps along the ridge
    for (let i = 0; i < MOSS_X.length; i++) {
      const mx = MOSS_X[i];
      if (mx < x0 - 200 || mx > x1 + 200) continue;
      const my = ridgeY(mx) + 6;
      const w = 90 + 60 * L.h3(i, 1, 55), h = 26 + 14 * L.h3(i, 2, 55);
      const pts = [];
      for (let j = 0; j <= 14; j++) {
        const a = Math.PI + (j / 14) * Math.PI;
        const bump = 1 + 0.18 * Math.sin(j * 2.3 + i);
        pts.push([mx + Math.cos(a) * w * 0.5, my + Math.sin(a) * h * bump]);
      }
      pts.push([mx + w * 0.5, my + 8], [mx - w * 0.5, my + 8]);
      L.inkPath(ctx, pts, { closed: true, width: 2.2 * pen, color: P.ink, fill: P.moss, seed: sd('moss', i), boil: bi, wobble: 0.8, smooth: false });
      L.hatch(ctx, pts, { angle: -0.7, spacing: 5 * lod, width: 1.2 * pen, color: P.mossDeep, alpha: 0.85, length: [8 * lod, 20 * lod], seed: sd('mossh', i), boil: bi, density: (x) => sstep(mx - w * 0.2, mx + w * 0.5, x), clip: true });
      const blades = [];
      for (let j = 0; j < 7; j++) {
        const bx = mx - w * 0.4 + (j / 6) * w * 0.8;
        const bh = 18 + 20 * L.h3(i, j, 56);
        const lean = (L.h3(j, i, 57) - 0.5) * 14;
        blades.push([bx, my - h * 0.6, bx + lean * 0.4, my - h * 0.6 - bh * 0.6, bx + lean, my - h * 0.6 - bh]);
      }
      strokeBatch(ctx, blades, 1.4 * pen, P.mossDeep, 0.9);
    }
  }

  // the scrape: a shallow hollow round both eggs, its far wall shaded
  function drawScrape(ctx, L, pen, lod, bi) {
    const P = L.pal;
    const G = geo(L);
    const pts = L.ellipsePts(SCRAPE.x, SCRAPE.y, SCRAPE.rx, SCRAPE.ry, 72);
    ctx.fillStyle = G.c.scrape;
    ctx.beginPath();
    L.tracePath(ctx, pts, true);
    ctx.fill();
    L.hatch(ctx, pts, {
      angle: -0.12, spacing: 6 * lod, width: 1.2 * pen, color: P.shingleDeep, alpha: 0.85, length: [18 * lod, 60 * lod], seed: sd('scrapeh'), boil: bi,
      density: (x, y) => 0.25 + 0.6 * sstep(SCRAPE.y + 20, SCRAPE.y - SCRAPE.ry, y), clip: true,
    });
    // the near lip catches light, the far lip is a soft line
    const near = pts.filter((p) => p[1] > SCRAPE.y + 10);
    near.sort((a, b) => a[0] - b[0]);
    L.inkPath(ctx, near, { width: 1.6 * pen, color: P.shinglePale, alpha: 0.9, seed: sd('lipn'), boil: bi, taper: [80, 80] });
    const far = pts.filter((p) => p[1] < SCRAPE.y - 20);
    far.sort((a, b) => a[0] - b[0]);
    L.inkPath(ctx, far, { width: 1.6 * pen, color: P.inkSoft, alpha: 0.6, seed: sd('lipf'), boil: bi, taper: [80, 80] });
  }

  // a cast shadow on the scrape floor, down and to the right of a resting form
  function castShadow(ctx, L, cx, cy, rx, ry, pen, lod, bi, k) {
    const P = L.pal;
    const pts = L.ellipsePts(cx, cy, rx, ry, 40);
    L.crossHatch(ctx, pts, { tone: 1, layers: 2, spacing: 5 * lod, crossSpacing: 7 * lod, width: 1.3 * pen, color: P.ink, alpha: 0.7, length: [10 * lod, 30 * lod], seed: sd('shadow', k), boil: bi, density: (x, y) => sstep(1.05, 0.35, Math.hypot((x - cx) / rx, (y - cy) / ry)) });
  }

  // ===========================================================================
  // Pebbles, batched per row, back to front
  // ===========================================================================
  function drawPebbles(ctx, L, list, keep, VR, zoom, pen, bi) {
    const P = L.pal;
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
        if (!keep(q)) continue;
        if (q.x + q.rx < VR.x0 || q.x - q.rx > VR.x1 || q.y + q.ry < VR.y0 || q.y - q.ry > VR.y1) continue;
        any = true;
        sMax = Math.max(sMax, q.rx);
        const onScreen = q.rx * zoom;
        const jj = onScreen > 5 ? 0.6 * pen : 0;
        if (q.grit) {
          grit.moveTo(q.x + q.rx, q.y);
          grit.ellipse(q.x, q.y, q.rx, q.ry, q.rot, 0, TAU);
          any = true;
          continue;
        }
        const V = q.V.map((p, j) => [p[0] + (L.h3(q.id, j, bi) - 0.5) * jj, p[1] + (L.h3(j, q.id, bi + 7) - 0.5) * jj]);
        // cast shadow down-right
        shade.ellipse(q.x + q.rx * 0.22, q.y + q.ry * 0.5, q.rx * 1.02, q.ry * 0.8, q.rot, 0, TAU);
        shade.closePath();
        blobInto(F[q.tone], V);
        blobInto(out, V);
        if (onScreen < 3.5) continue;
        // lit top: a smaller copy nudged up-left
        const LV = V.map((p) => [q.x + (p[0] - q.x) * 0.58 - q.rx * 0.16, q.y + (p[1] - q.y) * 0.5 - q.ry * 0.3]);
        blobInto(q.tone === 1 ? litW : lit, LV);
        if (onScreen < 7) continue;
        // underside hatch: 45 degree chords across the lower right of the ellipse
        const a = q.rx, b = q.ry;
        const cr = Math.cos(q.rot), sr = Math.sin(q.rot);
        const dx = 0.7071, dy = -0.7071, nx = 0.7071, ny = 0.7071;
        const A = (dx * dx) / (a * a) + (dy * dy) / (b * b);
        const Bk = 2 * ((nx * dx) / (a * a) + (ny * dy) / (b * b));
        const Ck = (nx * nx) / (a * a) + (ny * ny) / (b * b);
        const sp = Math.max(3, 4.2 * pen);
        const cm = 1 / Math.sqrt(Ck - (Bk * Bk) / (4 * A));
        let k = 0;
        for (let c = cm * 0.18 + (L.h3(q.id, 3, 9) * sp) * 0.5; c < cm * 0.97; c += sp, k++) {
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
          target.moveTo(q.x + lx0 * cr - ly0 * sr, q.y + lx0 * sr + ly0 * cr);
          target.lineTo(q.x + lx1 * cr - ly1 * sr, q.y + lx1 * sr + ly1 * cr);
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
      if (lichDots.length || true) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = P.lichen;
        ctx.fill(lich);
        if (lichDots.length) {
          const d = new Path2D();
          for (const p of lichDots) {
            d.moveTo(p[0] + 1.6 * pen, p[1]);
            d.arc(p[0], p[1], 1.6 * pen, 0, TAU);
          }
          ctx.fillStyle = P.ochre;
          ctx.fill(d);
          ctx.strokeStyle = P.ochre;
          ctx.lineWidth = 1 * pen;
          ctx.stroke(lich);
        }
      }
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = P.inkSoft;
      ctx.lineJoin = 'round';
      ctx.lineWidth = clamp(0.8 + (sMax * 2 * zoom) / 60, 1, 2.2) * pen;
      ctx.stroke(out);
      ctx.strokeStyle = P.white;
      ctx.lineWidth = 1.8 * pen;
      ctx.globalAlpha = 0.75;
      ctx.stroke(hi);
      ctx.globalAlpha = 1;
    }
  }

  // grass stems, shell bits and a dropped feather on the scrape rim (art bible 10.3)
  function drawRimBits(ctx, L, pen, lod, bi) {
    const P = L.pal;
    const stems = [];
    const tufts = [[-300, 1250], [700, 1292], [1540, 1215], [1330, 1270], [-560, 1180], [1880, 1300]];
    tufts.forEach(([x, y], i) => {
      for (let j = 0; j < 6; j++) {
        const h = 40 + 50 * L.h3(i, j, 91);
        const lean = (L.h3(j, i, 92) - 0.5) * 60 + (L.h3(i, j, 93 + bi) - 0.5) * 3;
        stems.push([x + j * 5 - 12, y, x + j * 5 - 12 + lean * 0.3, y - h * 0.6, x + j * 5 - 12 + lean, y - h]);
      }
    });
    strokeBatch(ctx, stems, 3 * pen, P.inkSoft, 0.9);
    strokeBatch(ctx, stems, 1.4 * pen, P.tan, 1);
    // a small white feather on the far rim
    const fx = 1560, fy = 1150;
    const rach = [[fx - 70, fy + 14], [fx - 10, fy - 2], [fx + 60, fy - 20]];
    const vane = [[fx - 60, fy + 10], [fx - 20, fy - 22], [fx + 30, fy - 34], [fx + 62, fy - 22], [fx + 30, fy + 2], [fx - 20, fy + 14]];
    L.inkPath(ctx, vane, { closed: true, width: 2.2 * pen, color: P.ink, fill: P.plumeWhite, seed: sd('feather'), boil: bi, wobble: 0.6 });
    L.hatch(ctx, vane, { angle: -1.1, spacing: 5 * lod, width: 1 * pen, color: P.plumeShade, alpha: 1, length: [8 * lod, 16 * lod], seed: sd('featherh'), boil: bi, clip: true });
    L.inkPath(ctx, rach, { width: 1.8 * pen, color: P.inkSoft, seed: sd('rachis'), boil: bi, taper: [4, 20] });
  }

  // ===========================================================================
  // The chick
  // ===========================================================================
  // drawings on twos from T 5.0: head and shoulders spill out, then it shoves free (T 5.25) and settles
  const CHICK_POSES = [
    { b: [330, 1012], rot: 0.55, h: [124, 1110], ba: 2.2 },
    { b: [238, 1040], rot: 0.4, h: [52, 1134], ba: 2.35 },
    { b: [160, 1066], rot: 0.25, h: [-18, 1150], ba: 2.48 },
    { b: [62, 1086], rot: 0.06, h: [-112, 1140], ba: 2.6, free: 1 },
    { b: [80, 1082], rot: 0.1, h: [-92, 1136], ba: 2.5, free: 1 },
    { b: [78, 1080], rot: 0.1, h: [-90, 1134], ba: 2.44, free: 1 },
  ];
  const BODY_RX = 185, BODY_RY = 128, HEAD_R = 92;

  function chickPose(tw) {
    if (tw < B_CAP - 1e-6) return null;
    const d = Math.floor((tw - B_CAP) * 12 + 1e-6);
    const P0 = CHICK_POSES[Math.min(CHICK_POSES.length - 1, d)];
    const dry = tw >= B_FREE - 1e-6 ? clamp(((tw - B_FREE) / (2 / 12)) * 0.8 + 0.2) : 0;
    return Object.assign({ dry, fluff: dry, d }, P0);
  }

  // a spiky down outline round an ellipse: clumped when wet, fluffier as it dries
  function downRing(L, cx, cy, rx, ry, rot, n, seed, fl, wet, bi) {
    const pts = [];
    const cr = Math.cos(rot), sr = Math.sin(rot);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      let k = 1 + 0.05 * L.noise1(a * 2.1, seed);
      // tufts: uneven, in soft groups, longer on the back than the belly
      const grp = 0.5 + 0.5 * L.noise1(a * 5.3, seed + 4);
      const spike = i & 1 ? 0.3 + 1.2 * L.h3(i, 3, seed) * grp : -0.3 * L.h3(i, 6, seed);
      k += (spike * (2 + 13 * fl)) / Math.max(rx, ry);
      if (wet > 0 && i % 5 === 0) k += (wet * 7 * L.h3(i, 4, seed)) / Math.max(rx, ry);
      k += ((L.h3(i, bi, seed + 9) - 0.5) * 1.2) / Math.max(rx, ry);
      const lx = Math.cos(a) * rx * k, ly = Math.sin(a) * ry * k;
      pts.push([cx + lx * cr - ly * sr, cy + lx * sr + ly * cr]);
    }
    return pts;
  }

  function drawChick(ctx, L, pose, bi, pen, lod) {
    const P = L.pal;
    const G = geo(L);
    const C = G.chick;
    const wet = 1 - pose.dry;
    const col = L.mix(G.c.wet, P.downGrey, pose.dry);
    const [bx, by] = pose.b;
    const rx = BODY_RX * (1 + 0.05 * pose.fluff), ry = BODY_RY * (0.9 + 0.14 * pose.fluff);
    const rot = pose.rot;
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const U = (u, v) => [bx + u * rx * cr - v * ry * sr, by + u * rx * sr + v * ry * cr];
    const seed = sd('chickbody');

    // feet once it lies free: two pink feet tucked under the front of the belly
    if (pose.free) {
      for (const [fu, k] of [[-0.35, 0], [0.05, 1]]) {
        const base = U(fu, 0.82);
        const toes = [];
        for (let j = 0; j < 3; j++) {
          const a = 2.2 + j * 0.35;
          toes.push([base[0] + Math.cos(a) * 34, base[1] + Math.sin(a) * 18 + 14]);
        }
        const foot = [base, toes[0], [base[0] - 10, base[1] + 18], toes[1], [base[0] - 4, base[1] + 18], toes[2]];
        L.inkPath(ctx, foot, { closed: true, width: 2 * pen, color: P.ink, fill: G.c.bill, seed: sd('foot', k), boil: bi, smooth: false, wobble: 0.3, taper: [2, 2] });
      }
    }

    // body
    const body = downRing(L, bx, by, rx, ry, rot, 130, seed, pose.fluff, wet, bi);
    ctx.fillStyle = col;
    ctx.beginPath();
    L.tracePath(ctx, body, true);
    ctx.fill();
    const shadeB = (x, y) => {
      const lx = ((x - bx) * cr + (y - by) * sr) / rx, ly = (-(x - bx) * sr + (y - by) * cr) / ry;
      return sstep(-0.15, 0.85, 0.65 * ly + 0.4 * lx);
    };
    L.crossHatch(ctx, body, { density: shadeB, tone: 0.8, layers: 3, spacing: 6 * lod, crossSpacing: 7 * lod, width: 1.4 * pen, color: wet > 0.5 ? P.ink : P.downSpeck, alpha: 0.6 + 0.2 * wet, length: [10 * lod, 30 * lod], seed: seed + 3, boil: bi, clip: true });
    // wet: clumped strands of down lying back from the head; dry: speckles and radiating tufts
    if (wet > 0) {
      const segs = [];
      const back = [-Math.cos(pose.ba - rot), -Math.sin(pose.ba - rot)];
      for (const s of C.strands) {
        const a = U(s.u, s.v);
        const dx = back[0] * Math.cos(s.dir) - back[1] * Math.sin(s.dir), dy = back[0] * Math.sin(s.dir) + back[1] * Math.cos(s.dir);
        const e = U(s.u + dx * s.len, s.v + dy * s.len);
        const m = [(a[0] + e[0]) / 2 + s.bend * ry, (a[1] + e[1]) / 2 - s.bend * rx * 0.3];
        segs.push([a[0], a[1], m[0], m[1], e[0], e[1]]);
      }
      strokeBatch(ctx, segs, 2 * pen, P.inkSoft, 0.85 * wet);
      strokeBatch(ctx, segs.map((s) => [s[0] - 3, s[1] - 3, s[2] - 3, s[3] - 3, s[4] - 3, s[5] - 3]), 1.4 * pen, P.white, 0.45 * wet);
    }
    const sp = new Path2D();
    const nS = Math.round(C.specks.length * (0.35 + 0.65 * pose.dry));
    for (let i = 0; i < nS; i++) {
      const s = C.specks[i];
      const [x, y] = U(s.u, s.v);
      sp.moveTo(x + s.r * rx * s.el, y);
      sp.ellipse(x, y, s.r * rx * s.el, s.r * rx, s.rot, 0, TAU);
    }
    ctx.fillStyle = P.downSpeck;
    ctx.globalAlpha = 0.5 + 0.4 * pose.dry;
    ctx.fill(sp);
    ctx.globalAlpha = 1;
    if (pose.fluff > 0) {
      const tufts = [];
      for (let i = 0; i < body.length; i += 2) {
        const p = body[i];
        const d = [p[0] - bx, p[1] - by];
        const l = Math.hypot(d[0], d[1]) || 1;
        const len = (8 + 10 * L.h3(i, 5, seed)) * pose.fluff;
        tufts.push([p[0] - (d[0] / l) * len * 1.4, p[1] - (d[1] / l) * len * 1.4, p[0] + (d[0] / l) * len * 0.3, p[1] + (d[1] / l) * len * 0.3]);
      }
      strokeBatch(ctx, tufts, 1.3 * pen, P.inkSoft, 0.8);
    }
    // wing stub
    L.inkPath(ctx, body, { closed: true, width: 5 * pen, color: P.ink, seed: seed + 1, boil: bi, smooth: false, wobble: 0.8, double: { alpha: 0.4, width: 0.3, offset: 3 * pen } });

    // head, resting down on the pebbles
    const [hx, hy] = pose.h;
    const hr = HEAD_R * (1 + 0.06 * pose.fluff);
    const f = [Math.cos(pose.ba), Math.sin(pose.ba)];
    let up = [f[1], -f[0]];
    if (up[1] > 0) up = [-up[0], -up[1]];
    const H = (a, b) => [hx + f[0] * a * hr + up[0] * b * hr, hy + f[1] * a * hr + up[1] * b * hr];
    const hs = sd('chickhead');
    const head = downRing(L, hx, hy, hr, hr * 0.94, pose.ba, 90, hs, pose.fluff, wet, bi);
    ctx.fillStyle = col;
    ctx.beginPath();
    L.tracePath(ctx, head, true);
    ctx.fill();
    L.crossHatch(ctx, head, {
      density: (x, y) => sstep(-0.1, 0.9, (0.65 * (y - hy) + 0.4 * (x - hx)) / hr), tone: 0.8, layers: 3, spacing: 6 * lod, crossSpacing: 7 * lod, width: 1.4 * pen,
      color: wet > 0.5 ? P.ink : P.downSpeck, alpha: 0.6 + 0.2 * wet, length: [8 * lod, 24 * lod], seed: hs + 3, boil: bi, clip: true,
    });
    // dense speckles on the crown
    const hsp = new Path2D();
    for (let i = 0; i < 40; i++) {
      const s = C.specks[i];
      const [x, y] = H(s.u * 0.8 - 0.1, Math.abs(s.v) * 0.8 + 0.05);
      hsp.moveTo(x + s.r * hr * 1.6, y);
      hsp.ellipse(x, y, s.r * hr * 1.6, s.r * hr * 1.1, s.rot, 0, TAU);
    }
    ctx.fillStyle = P.downSpeck;
    ctx.globalAlpha = 0.55 + 0.4 * pose.dry;
    ctx.fill(hsp);
    ctx.globalAlpha = 1;
    if (wet > 0) {
      const segs = [];
      for (let i = 0; i < 12; i++) {
        const a = H(0.3 - 0.9 * L.h3(i, 1, hs), (L.h3(i, 2, hs) - 0.4) * 1.3);
        const e = [a[0] - f[0] * hr * 0.35, a[1] - f[1] * hr * 0.35];
        segs.push([a[0], a[1], (a[0] + e[0]) / 2 + up[0] * 5, (a[1] + e[1]) / 2 + up[1] * 5, e[0], e[1]]);
      }
      strokeBatch(ctx, segs, 1.8 * pen, P.inkSoft, 0.85 * wet);
    }
    L.inkPath(ctx, head, { closed: true, width: 5 * pen, color: P.ink, seed: hs + 1, boil: bi, smooth: false, wobble: 0.8 });
    // bill: pinkish, a gape line, the white egg tooth on the tip of the upper bill
    const base = H(0.82, 0.02);
    const tip = [base[0] + f[0] * 64, base[1] + f[1] * 64];
    const bill = [[base[0] + up[0] * 17, base[1] + up[1] * 17], tip, [base[0] - up[0] * 14, base[1] - up[1] * 14]];
    L.inkPath(ctx, bill, { closed: true, width: 2.6 * pen, color: P.ink, fill: G.c.bill, seed: sd('bill'), boil: bi, smooth: false, wobble: 0.3, taper: [2, 2] });
    L.inkPath(ctx, [[base[0] + up[0] * 1, base[1] + up[1] * 1], [tip[0] - f[0] * 14, tip[1] - f[1] * 14]], { width: 1.6 * pen, color: P.billDeep, seed: sd('gape'), boil: bi, taper: [2, 8], smooth: false });
    const tooth = [[tip[0] - f[0] * 2, tip[1] - f[1] * 2], [tip[0] - f[0] * 13 + up[0] * 7, tip[1] - f[1] * 13 + up[1] * 7], [tip[0] - f[0] * 13, tip[1] - f[1] * 13]];
    ctx.fillStyle = P.white;
    ctx.beginPath();
    L.tracePath(ctx, tooth, true);
    ctx.fill();
    // big dark eye with a glint, lid line above it
    const eye = H(0.3, 0.2);
    ctx.fillStyle = P.capBlack;
    ctx.beginPath();
    ctx.ellipse(eye[0], eye[1], 17, 19, pose.ba, 0, TAU);
    ctx.fill();
    ctx.fillStyle = P.white;
    ctx.beginPath();
    ctx.arc(eye[0] - 5, eye[1] - 6, 5, 0, TAU);
    ctx.fill();
    const lid = [H(0.12, 0.4), H(0.3, 0.46), H(0.5, 0.36)];
    L.inkPath(ctx, lid, { width: 1.8 * pen, color: P.inkSoft, seed: sd('lid'), boil: bi, taper: [4, 4] });
  }

  // the egg tooth poking through the pip hole, T 4.5 to 5.0
  function drawBillTip(ctx, L, tw, bi, pen) {
    const P = L.pal;
    const G = geo(L);
    const d = Math.floor((tw - B_RING) * 12 + 1e-6);
    const ext = [0.45, 0.75, 1, 0.8, 1, 0.9][Math.min(5, Math.max(0, d))];
    const dir = [-0.75, -0.66];
    const wig = (d & 1 ? 1 : -1) * 2;
    const tip = [PIP[0] + dir[0] * (10 + 34 * ext) + wig, PIP[1] + dir[1] * (10 + 34 * ext)];
    const bill = [[PIP[0] + 11, PIP[1] - 8], tip, [PIP[0] - 4, PIP[1] + 12]];
    L.inkPath(ctx, bill, { closed: true, width: 2 * pen, color: P.ink, fill: G.c.bill, seed: sd('billtip'), boil: bi, smooth: false, wobble: 0.2, taper: [1, 1] });
    ctx.fillStyle = P.white;
    ctx.beginPath();
    ctx.arc(tip[0] + 3, tip[1] + 2, 4.5, 0, TAU);
    ctx.fill();
  }

  // ===========================================================================
  // The cap: pushed off on T 5.0, arcs up and over, tips open-face-up onto the shingle
  // ===========================================================================
  // centroid positions per drawing on twos from T 5.0: pushed off left, lifted over the chick's head,
  // then dropped in front of it, open face up (it lands with a small bounce)
  const CAP_POSES = [
    { x: 196, y: 876, rot: -0.25 },
    { x: 118, y: 758, rot: -0.8 },
    { x: 36, y: 772, rot: -1.3 },
    { x: -4, y: 1432, rot: -1.76 },
    { x: 0, y: 1416, rot: -1.58 },
    { x: 0, y: 1420, rot: -1.62 },
  ];
  const CAP_REST = [0, 1420];
  // the path the overlay traces: through every pose, smoothed
  // (only the lift is traced: the drop in front of the chick would cross it)
  const CAP_PATH = [CAP_C, [196, 876], [118, 758], [36, 772], [-6, 850]];
  function capPose(tw) {
    const d = Math.floor((tw - B_CAP) * 12 + 1e-6);
    return Object.assign({ d }, CAP_POSES[Math.min(CAP_POSES.length - 1, d)]);
  }
  function drawCap(ctx, L, tw, bi, pen, lod) {
    const G = geo(L);
    const q = capPose(tw);
    if (q.d >= 3) castShadow(ctx, L, CAP_REST[0] + 50, CAP_REST[1] + 44, 240, 22, pen, lod, bi, 3);
    ctx.save();
    ctx.translate(q.x, q.y);
    ctx.rotate(q.rot);
    ctx.translate(-CAP_C[0], -CAP_C[1]);
    drawInkedEgg(ctx, L, bi, { pen, lod, clip: G.capPath, outline: true });
    ctx.save();
    ctx.clip(G.capPath);
    drawPip(ctx, L, 2, bi, pen);
    ctx.restore();
    // the open face, dark inside, its jagged lip
    drawHollow(ctx, L, bi, pen, lod, true);
    L.inkPath(ctx, HOLLOW, { closed: true, width: 3 * pen, color: L.pal.ink, seed: sd('caplip'), boil: bi, smooth: false, wobble: 0.5 });
    ctx.restore();
  }

  // shell shards that fly with the cap and land on the shingle
  const SHARDS = [[150, 1190, 18, 0.4], [32, 1250, 13, 1.9], [226, 1236, 11, 2.6], [-190, 1330, 15, 0.9], [330, 1226, 9, 1.2], [270, 1400, 10, 2.2]];
  function drawShards(ctx, L, bi, pen) {
    const P = L.pal;
    SHARDS.forEach(([x, y, r, a], i) => {
      const V = [];
      for (let j = 0; j < 5; j++) {
        const aa = a + (j / 5) * TAU;
        const rr = r * (j & 1 ? 0.55 : 1);
        V.push([x + Math.cos(aa) * rr, y + Math.sin(aa) * rr * 0.6]);
      }
      L.inkPath(ctx, V, { closed: true, width: 1.8 * pen, color: P.ink, fill: i & 1 ? P.eggPale : P.egg, seed: sd('shard', i), boil: bi, smooth: false, wobble: 0.3, taper: [2, 2] });
    });
  }

  // the annBlue trajectory of the cap, drawn on with an origin dot and an arrowhead
  let CAP_TRACE = null;
  function drawCapTrace(ctx, L, p, w) {
    if (p <= 0) return;
    if (!CAP_TRACE) {
      const pts = L.smoothPts(CAP_PATH.map((q) => [q[0] - 30, q[1] - 90]), false, 6);
      const S = [0];
      for (let i = 1; i < pts.length; i++) S.push(S[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      CAP_TRACE = { pts, S };
    }
    const { pts, S } = CAP_TRACE;
    const want = S[S.length - 1] * clamp(p);
    const P = L.pal;
    ctx.save();
    ctx.strokeStyle = P.annBlue;
    ctx.fillStyle = P.annBlue;
    ctx.lineWidth = 2.5 * w;
    ctx.lineCap = 'round';
    ctx.beginPath();
    let k = 0;
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (k = 1; k < pts.length && S[k] <= want; k++) ctx.lineTo(pts[k][0], pts[k][1]);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(pts[0][0], pts[0][1], 5 * w, 0, TAU);
    ctx.fill();
    const e = pts[Math.max(1, k - 1)], d = pts[Math.max(0, k - 3)];
    const a = Math.atan2(e[1] - d[1], e[0] - d[0]);
    const ah = 16 * w;
    ctx.beginPath();
    ctx.moveTo(e[0] + Math.cos(a) * ah * 0.4, e[1] + Math.sin(a) * ah * 0.4);
    ctx.lineTo(e[0] + Math.cos(a + 2.6) * ah, e[1] + Math.sin(a + 2.6) * ah);
    ctx.lineTo(e[0] + Math.cos(a - 2.6) * ah, e[1] + Math.sin(a - 2.6) * ah);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ===========================================================================
  // Beyond the ridge (pulled-back plate only): Young Sound and its far shore, as in shot 04
  // ===========================================================================
  const HORIZON = 1000; // far shore base; the sound runs from here down behind the ridge at 1100
  const bump = (x, c, w, h) => h * Math.exp(-Math.pow((x - c) / w, 2));
  const nearHill = (x) => 14 + bump(x, -120, 160, 70) + bump(x, 380, 120, 44) + bump(x, 820, 190, 96) + bump(x, 1320, 140, 62) + 8 * LIB.noise1(x / 70, 611);
  const farHill = (x) => 40 + bump(x, 180, 300, 90) + bump(x, 1100, 260, 120) + 10 * LIB.noise1(x / 120, 612);
  function drawHorizon(ctx, L, VR, pen, lod, bi) {
    const P = L.pal;
    const x0 = VR.x0 - 40, x1 = VR.x1 + 40;
    const far = [], near = [];
    for (let x = x0; x <= x1 + 20; x += 20) {
      far.push([x, HORIZON - farHill(x)]);
      near.push([x, HORIZON - nearHill(x)]);
    }
    // the sound: flat sea with engraved horizontal hatching, denser toward the far shore
    const sea = [[x0, HORIZON - 4], [x1, HORIZON - 4], [x1, RIDGE_Y + 20], [x0, RIDGE_Y + 20]];
    ctx.fillStyle = P.sea;
    ctx.beginPath();
    L.tracePath(ctx, sea, true);
    ctx.fill();
    L.hatch(ctx, sea, { angle: 0, spacing: 5 * lod, width: 1.3 * pen, color: P.seaDeep, alpha: 0.8, length: [30 * lod, 110 * lod], gap: [8 * lod, 30 * lod], seed: sd('sea'), boil: bi, flow: 0, angleJitter: 0.01, density: (x, y) => 0.95 - 0.5 * sstep(HORIZON, RIDGE_Y, y), clip: true });
    const foam = [];
    for (let i = 0; i < 18; i++) {
      const fx = x0 + ((i * 0.618) % 1) * (x1 - x0), fy = HORIZON + 30 + 50 * LIB.h3(i, 2, 613);
      const len = 40 + 80 * LIB.h3(i, 3, 613);
      foam.push([fx, fy, fx + len, fy + (LIB.h3(i, bi, 614) - 0.5) * 1.5]);
    }
    strokeBatch(ctx, foam, 2 * pen, P.foam, 0.9);
    // far range, faint, then the near hills of the far shore with snow patches
    const farPoly = far.concat([[x1 + 20, HORIZON + 2], [x0, HORIZON + 2]]);
    ctx.fillStyle = L.mix(P.shinglePale, P.stripeCream, 0.4);
    ctx.beginPath();
    L.tracePath(ctx, farPoly, true);
    ctx.fill();
    L.inkPath(ctx, far, { width: 1.8 * pen, color: P.inkFaint, alpha: 0.8, seed: sd('farhill'), boil: bi, taper: 0, wobble: 1.2 });
    const nearPoly = near.concat([[x1 + 20, HORIZON + 2], [x0, HORIZON + 2]]);
    ctx.fillStyle = P.shingle;
    ctx.beginPath();
    L.tracePath(ctx, nearPoly, true);
    ctx.fill();
    L.hatch(ctx, nearPoly, { angle: -1.2, spacing: 5 * lod, width: 1.2 * pen, color: P.shingleDeep, alpha: 0.85, length: [8 * lod, 22 * lod], seed: sd('hillh'), boil: bi, clip: true, density: (x, y) => 0.25 + 0.6 * sstep(HORIZON - 30, HORIZON, y) + 0.4 * sstep(0, 1, (LIB.noise1(x / 60, 615) + 0.2)) });
    const snow = [];
    for (let i = 0; i < 26; i++) {
      const sx = x0 + LIB.h3(i, 1, 616) * (x1 - x0);
      const top = HORIZON - nearHill(sx);
      if (nearHill(sx) < 40) continue;
      const sy = top + 6 + 20 * LIB.h3(i, 2, 616);
      snow.push([sx, sy, sx + 14 + 26 * LIB.h3(i, 3, 616), sy + 6]);
    }
    strokeBatch(ctx, snow, 5 * pen, P.ice, 1);
    L.inkPath(ctx, near, { width: 2.4 * pen, color: P.inkSoft, seed: sd('nearhill'), boil: bi, taper: 0, wobble: 1.2 });
    L.inkPath(ctx, [[x0, HORIZON + 1], [x1, HORIZON + 1]], { width: 1.6 * pen, color: P.seaDeep, seed: sd('shoreline'), boil: bi, taper: 0, wobble: 0.8 });
  }

  // ===========================================================================
  // Adult terns overhead: small, flapping on twos, drifting left, red bills and black caps
  // ===========================================================================
  const TERNS = [
    { x: 880, y: -140, span: 230, ph: 0.0, vx: -150, vy: 20 },
    { x: 240, y: 60, span: 170, ph: 0.4, vx: -110, vy: -10 },
    { x: 1330, y: 170, span: 140, ph: 0.75, vx: -130, vy: 10 },
  ];
  function drawTerns(ctx, L, t, tw, bi, pen) {
    const P = L.pal;
    TERNS.forEach((B, i) => {
      const cx = B.x + B.vx * t, cy = B.y + B.vy * t + 10 * Math.sin(tw * 5 + i);
      const sp = B.span;
      const flap = Math.sin(tw * TAU * 2.4 + B.ph * TAU); // deep rowing strokes, on twos
      const Pt = (u, v) => [cx + u * sp, cy + v * sp];
      const seed = sd('tern', i);
      // far wing, behind the body
      const fTip = Pt(0.05, -0.36 * flap - 0.04), fWr = Pt(-0.02, -0.16 * flap);
      const farWing = [Pt(-0.06, -0.01), fWr, fTip, Pt(0.1, -0.1 * flap + 0.02), Pt(0.06, 0.01)];
      L.inkPath(ctx, farWing, { closed: true, width: 1.8 * pen, color: P.ink, fill: P.mantleDeep, seed: seed + 1, boil: bi, smooth: false, wobble: 0.3, taper: [2, 2] });
      // tail: forked, streamers trailing right
      const tail = [Pt(0.14, -0.005), Pt(0.36, -0.03), Pt(0.24, 0.005), Pt(0.36, 0.035), Pt(0.14, 0.02)];
      L.inkPath(ctx, tail, { closed: true, width: 1.6 * pen, color: P.ink, fill: P.plumeWhite, seed: seed + 2, boil: bi, smooth: false, wobble: 0.2, taper: [1, 1] });
      // body and head
      const body = L.ellipsePts(cx, cy, 0.17 * sp, 0.045 * sp, 22, 0.04);
      L.inkPath(ctx, body, { closed: true, width: 2 * pen, color: P.ink, fill: P.breastGrey, seed: seed + 3, boil: bi, wobble: 0.3, taper: [2, 2] });
      const hc = Pt(-0.19, -0.02);
      L.inkPath(ctx, L.ellipsePts(hc[0], hc[1], 0.042 * sp, 0.038 * sp, 16), { closed: true, width: 1.8 * pen, color: P.ink, fill: P.plumeWhite, seed: seed + 4, boil: bi, wobble: 0.2, taper: [1, 1] });
      // black cap over the crown to the nape
      const cap = [Pt(-0.225, -0.028), Pt(-0.2, -0.058), Pt(-0.165, -0.05), Pt(-0.15, -0.025), Pt(-0.19, -0.022)];
      ctx.fillStyle = P.capBlack;
      ctx.beginPath();
      L.tracePath(ctx, cap, true);
      ctx.fill();
      // blood-red bill, straight, to the tip
      const bill = [Pt(-0.228, -0.028), Pt(-0.3, -0.012), Pt(-0.226, -0.01)];
      ctx.fillStyle = P.billRed;
      ctx.beginPath();
      L.tracePath(ctx, bill, true);
      ctx.fill();
      // near wing: grey upperwing, translucent primaries with a thin black trailing edge
      const nTip = Pt(0.08, -0.44 * flap + 0.02), nWr = Pt(-0.03, -0.2 * flap + 0.01);
      const nearWing = [Pt(-0.07, 0.0), nWr, nTip, Pt(0.13, -0.12 * flap + 0.03), Pt(0.07, 0.02)];
      L.inkPath(ctx, nearWing, { closed: true, width: 2 * pen, color: P.ink, fill: flap > 0 ? P.mantleGrey : P.primaryGlow, seed: seed + 5, boil: bi, smooth: false, wobble: 0.3, taper: [2, 2] });
      L.inkPath(ctx, [nTip, Pt(0.13, -0.12 * flap + 0.03)], { width: 1.8 * pen, color: P.capBlack, seed: seed + 6, boil: bi, smooth: false, taper: [1, 3], wobble: 0.1 });
    });
  }

  // ===========================================================================
  // Scenery plates. The shingle is t-independent, so it is drawn once per boil variant into a sprite:
  // a 1:1 plate for the locked zoom-1 frames and a 0.7-scale plate of the whole world for the pull-back
  // (its pens drawn for zoom 0.45). Two boil drawings alternate on the 12 fps boil clock.
  // ===========================================================================
  const PLATES = {
    near: { x0: -20, y0: 700, x1: 1100, y1: 1940, s: 1, zoom: 1, lod: 1 },
    far: { x0: -400, y0: 700, x1: 1640, y1: 2680, s: 0.7, zoom: 0.6, lod: 2 },
  };
  function plate(L, which, far, bv) {
    return L.cached(ID + ':plate:' + which + ':' + (far ? 'far' : 'near') + ':' + bv, () => {
      const R = far ? PLATES.far : PLATES.near;
      const w = Math.ceil((R.x1 - R.x0) * R.s), h = Math.ceil((R.y1 - R.y0) * R.s);
      const c = FILM.makeCanvas(w, h);
      const g = c.getContext('2d');
      g.scale(R.s, R.s);
      g.translate(-R.x0, -R.y0);
      const G = geo(L);
      const VR = { x0: R.x0, y0: R.y0, x1: R.x1, y1: R.y1 };
      const pen = 1 / R.zoom, lod = R.lod, bi = 1000 + bv;
      if (which === 'back') {
        if (far) drawHorizon(g, L, VR, pen, lod, bi);
        drawGround(g, L, VR, pen, lod, bi);
        drawScrape(g, L, pen, lod, bi);
        drawPebbles(g, L, far ? G.peb : G.pebNear, (q) => q.y < 1185 || q.under, VR, R.zoom, pen, bi);
        castShadow(g, L, 640, 1188, 360, 30, pen, lod, bi, 0);
        castShadow(g, L, SIB.x + 80, SIB.y + 0.85 * 278 + 8, 300, 26, pen, lod, bi, 1);
        g.save();
        g.translate(SIB.x, SIB.y);
        g.rotate(SIB.rot);
        g.scale(SIB.s, SIB.s);
        g.translate(-540, -AXIS_Y);
        paintEgg(g, L, bi, G.sib, { pen: pen / SIB.s, lod });
        g.restore();
      } else {
        drawPebbles(g, L, far ? G.peb : G.pebNear, (q) => q.y >= 1185 && !q.under, VR, R.zoom, pen, bi);
        drawRimBits(g, L, pen, lod, bi);
      }
      return { c, R, w, h };
    });
  }
  function drawPlate(ctx, L, which, far, bi) {
    const S = plate(L, which, far, bi & 1);
    ctx.drawImage(S.c, S.R.x0, S.R.y0, S.w / S.R.s, S.h / S.R.s);
  }

  // ===========================================================================
  // Timing helpers
  // ===========================================================================
  function camAt(t) {
    let z = 1, x = 540, y = 960;
    if (t >= B_RING) {
      const e = LIB.seg(t, B_RING, B_CAP, 'outExpo');
      z = lerp(1, END_ZOOM, e);
      x = lerp(540, END_C[0], e);
      y = lerp(960, END_C[1], e);
    }
    if (t >= B_CAP) z = lerp(END_ZOOM, DRIFT_ZOOM, LIB.seg(t, B_CAP, 1.5, 'inOutSine'));
    return { x, y, zoom: z };
  }

  // ===========================================================================
  // Scene
  // ===========================================================================
  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib;
      const P = L.pal;
      const t = clamp(tIn, 0, info.dur);
      const tw = L.onTwos(t);
      const bi = L.boil(info.T);
      const G = geo(L);
      const hit = (a, frames, e, lead = 1) => (t < a - 1e-6 ? 0 : (e || ((u) => u))(clamp((t - a) / (frames * FR) + lead / frames)));

      const cam = camAt(t);
      const zoom = cam.zoom;
      const pen = 1 / zoom;
      const lod = zoom > 0.8 ? 1 : 2;
      const VR = { x0: cam.x - 540 / zoom, x1: cam.x + 540 / zoom, y0: cam.y - 960 / zoom, y1: cam.y + 960 / zoom };

      // 1. stripes in screen space, drifting 6 px per beat
      L.stripes(ctx, { colors: [P.stripeCream, P.stripeYellow], width: 140, angle: -0.52, offset: 12 * info.T, seed: 303 });

      // egg state
      const star = t >= B_STAR - 1e-6;
      const ring = t >= B_RING - 1e-6;
      const capOff = t >= B_CAP - 1e-6;
      // rock 1 degree left and right on twos after the held match frames, settle after the ring crack
      let rock = 0;
      if (t >= B_HOLD - 1e-6 && t < B_RING - 1e-6) rock = (Math.floor(tw * 12 + 1e-6) & 1 ? 1 : -1) * DEG;
      else if (ring && !capOff) rock = [-0.5, 0.25, 0, 0, 0, 0][Math.min(5, Math.floor((tw - B_RING) * 12 + 1e-6))] * DEG;
      const pose = chickPose(tw);

      L.camera(ctx, cam, () => {
        // 2 and 4. ground, scrape, back pebbles, cast shadows and the sibling egg: one cached plate
        drawPlate(ctx, L, 'back', zoom < 1, bi);
        // 3. construction: the blueprint's guide circles and the egg axis carried into the ink
        ctx.save();
        ctx.strokeStyle = P.inkFaint;
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = 1.5 * pen;
        ctx.beginPath();
        ctx.arc(540, 900, 470, 0, TAU);
        ctx.moveTo(540 + 640, 900);
        ctx.arc(540, 900, 640, 0, TAU);
        ctx.moveTo(60, AXIS_Y);
        ctx.lineTo(1020, AXIS_Y);
        ctx.moveTo(CONTACT[0], 560);
        ctx.lineTo(CONTACT[0], 1240);
        ctx.moveTo(-900, CONTACT[1]);
        ctx.lineTo(2000, CONTACT[1]);
        ctx.stroke();
        ctx.setLineDash([6 * pen, 8 * pen]);
        ctx.beginPath();
        ctx.moveTo(RING_X, 600);
        ctx.lineTo(RING_X, 1200);
        ctx.stroke();
        ctx.restore();

        if (capOff) castShadow(ctx, L, 120, 1205, 230, 24, pen, lod, bi, 2);

        // 5. the G1 egg
        ctx.save();
        if (rock) {
          ctx.translate(CONTACT[0], CONTACT[1]);
          ctx.rotate(rock);
          ctx.translate(-CONTACT[0], -CONTACT[1]);
        }
        if (!capOff) {
          drawInkedEgg(ctx, L, bi, { pen, lod });
          drawPip(ctx, L, ring ? 2 : star ? 1 : 0, bi, pen);
          if (ring) {
            drawRingCrack(ctx, L, bi, pen);
            drawBillTip(ctx, L, tw, bi, pen);
          }
        } else {
          drawInkedEgg(ctx, L, bi, { pen, lod, clip: G.shellPath });
          drawHollow(ctx, L, bi, pen, lod);
          L.inkPath(ctx, FAR_PTS, { width: 2.4 * pen, color: P.ink, seed: sd('farlip'), boil: bi, smooth: false, wobble: 0.5, taper: [4, 4] });
        }
        ctx.restore();

        // 6. the chick, the cap, shards
        if (pose) {
          ctx.save();
          if (pose.d < 3) {
            // still half inside: hidden by the shell's front wall except through the opening
            const m = new Path2D();
            m.rect(-3000, -3000, 8000, 8000);
            m.addPath(G.shellPath);
            m.addPath(G.hollowPath);
            ctx.clip(m, 'evenodd');
          }
          drawChick(ctx, L, pose, bi, pen, lod);
          ctx.restore();
          // the near lip in front of the chick
          L.inkPath(ctx, CRACK_PTS, { width: 3.4 * pen, color: P.ink, seed: sd('nearlip'), boil: bi, smooth: false, wobble: 0.5, taper: [4, 4] });
          L.inkPath(ctx, CRACK_PTS.map((p) => [p[0] + 4, p[1]]), { width: 3 * pen, color: P.eggPale, alpha: 0.9, seed: sd('nearlipcut'), boil: bi, smooth: false, taper: [20, 20] });
          drawShards(ctx, L, bi, pen);
        }

        // 7. front pebbles and rim bits; the cap lands on top of them
        drawPlate(ctx, L, 'front', zoom < 1, bi);
        if (pose) drawCap(ctx, L, tw, bi, pen, lod);
        // adult terns overhead, only in the pulled-back frames (world y < 0 is off the zoom-1 frame)
        if (zoom < 1) drawTerns(ctx, L, t, tw, bi, pen);

        // 8. overlays at constant screen weight, 24 fps
        const w = pen;
        const ringR = 90 * Math.pow(pen, 0.6);
        if (t >= B_HOLD - 1e-6 && t < B_CAP + 5 * FR) {
          const a = 1 - LIB.seg(t, B_CAP, B_CAP + 5 * FR);
          L.guideCircle(ctx, PIP[0], PIP[1], ringR, { color: P.annYellow, alpha: a, width: 3 * w, p: hit(B_HOLD, 6, L.ease.outExpo), start: -Math.PI / 2 });
        }
        if (ring && t < B_RING + 7 * FR) {
          const e = hit(B_RING, 6, L.ease.outExpo);
          const a = 1 - LIB.seg(t, B_RING + 2 * FR, B_RING + 7 * FR);
          L.ticks(ctx, PIP[0], PIP[1], { r: ringR + (18 + 26 * e) * w, n: 8, len: 22 * w, color: P.annYellow, alpha: a, width: 3 * w, start: 0.2 });
        }
        if (capOff) {
          drawCapTrace(ctx, L, hit(B_CAP, 6, L.ease.outExpo), w);
        }
      });
    },
  });
})();
