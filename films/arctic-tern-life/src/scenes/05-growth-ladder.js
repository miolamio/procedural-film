// 05 growth-ladder : "Thirteen grams to a hundred" (schematic, global T 8.0 to 9.5)
//
// Five blueprint tern chicks, day 0 to day 20, stacked small (top) to large (bottom) on x 560,
// each with a mass bar (5 px per gram, right ends on x 860). Pin feathers glow on days 10 and 15 on
// the 8.5 beat; on the 9.0 beat the day-20 juvenile brightens and settles into shot 06's opening crouch
// (same pixels: bill tip (320, 1215), tail (800, 1335)), so the cut to 06 lands on the same bird.
//
// Layers, back to front:
//   1 blueprint plate (navy, 60 px grid), stipple haze, guide circles r 470 / 400 at (560, 900)
//   2 growth envelope through the bill tips and tail tips, zero line x 860, adult-mass line x 340
//   3 day scale axis x 120 (y 260 to 1500, ticks every 60 px), nodes and leaders to each chick
//   4 per chick: ghost outline (from frame 0), panel tint, lattice, meridians, down stipple and fuzz,
//     double outline, wing (stub, pin quills, vanes, or the juvenile's feathered wing), head, bill, legs
//   5 height brackets, mass bars with lineWhite ticks pulsing on 8ths, growth curve through the bar ends
//   6 network insets: a down feather (free barbules) and a pin feather section (sheath, rolled vane, pulp)
//   7 magenta ring on day 10's wing (8.5), glows, the canonical cycle ring (chick arc lit)
(function () {
  'use strict';

  const ID = 'growth-ladder';
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

  // ===========================================================================
  // CANONICAL cycleRing — copied verbatim by other schematic shots (05, 07, 10, 12, 17). Never edit a copy.
  //   stage    0 egg, 1 chick, 2 flight, 3 migration: the arc being lit now; 4 = all four arcs complete
  //   progress 0..1, how far the lit arc has filled (clockwise from its start)
  //   bi       boil index, L.boil(info.T)
  // Ring radius 44 at (900, 300); four arcs with 10-degree gaps from 12 o'clock clockwise.
  // Base arcs lavender 40 % 2 px, finished arcs lavender 70 %, the lit arc lineWhite 3 px with a glow dot
  // of radius 5 on its leading end. Draws on a navy plate; honours the caller's ctx.globalAlpha for fades.
  // ===========================================================================
  function cycleRing(ctx, L, stage, progress, bi) {
    const P = L.pal;
    const CX = 900, CY = 300, R = 44;
    const D = Math.PI / 180;
    const pr = progress < 0 ? 0 : progress > 1 ? 1 : progress;
    const arcA = (q) => [(-90 + q * 90 + 5) * D, (-90 + (q + 1) * 90 - 5) * D];
    ctx.save();
    const a0 = ctx.globalAlpha;
    ctx.lineCap = 'round';
    // plate, so the grid and anything behind never shows through the arcs
    ctx.beginPath();
    ctx.arc(CX, CY, 64, 0, 2 * Math.PI);
    ctx.fillStyle = P.navy;
    ctx.globalAlpha = a0 * 0.92;
    ctx.fill();
    ctx.fillStyle = P.navyLight;
    ctx.globalAlpha = a0 * 0.35;
    ctx.fill();
    ctx.strokeStyle = P.lavender;
    ctx.lineWidth = 1;
    ctx.globalAlpha = a0 * 0.28;
    ctx.stroke();
    ctx.globalAlpha = a0;
    L.ticks(ctx, CX, CY, { r: 53, n: 48, len: 4, major: 12, majorLen: 8, color: P.lavender, alpha: 0.3, width: 1 });
    // the four stage arcs
    for (let q = 0; q < 4; q++) {
      const [s, e] = arcA(q);
      const done = stage >= 4 || q < stage;
      ctx.beginPath();
      ctx.arc(CX, CY, R, s, e);
      ctx.strokeStyle = P.lavender;
      ctx.lineWidth = 2;
      ctx.globalAlpha = a0 * (done ? 0.7 : 0.4);
      ctx.stroke();
    }
    // radial ticks in the four gaps, so the split into stages reads at phone size
    ctx.beginPath();
    for (let q = 0; q < 4; q++) {
      const a = (-90 + q * 90) * D;
      ctx.moveTo(CX + Math.cos(a) * 39, CY + Math.sin(a) * 39);
      ctx.lineTo(CX + Math.cos(a) * 49, CY + Math.sin(a) * 49);
    }
    ctx.strokeStyle = P.lavender;
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = a0 * 0.5;
    ctx.stroke();
    // the lit arc and its glow dot
    if (stage >= 0 && stage < 4) {
      const [s, e] = arcA(stage);
      const ae = s + (e - s) * pr;
      if (pr > 0) {
        ctx.beginPath();
        ctx.arc(CX, CY, R, s, ae);
        ctx.strokeStyle = P.lineWhite;
        ctx.lineWidth = 3;
        ctx.globalAlpha = a0;
        ctx.stroke();
      }
      ctx.globalAlpha = a0;
      L.glowDot(ctx, CX + Math.cos(ae) * R, CY + Math.sin(ae) * R, 5, { rays: 4, rayLen: 2.6, glow: 4, rot: (bi % 2) * 45 * D, seed: 4401, boil: bi });
    }
    // centre pip
    ctx.beginPath();
    ctx.arc(CX, CY, 3, 0, 2 * Math.PI);
    ctx.fillStyle = P.lavender;
    ctx.globalAlpha = a0 * 0.5;
    ctx.fill();
    ctx.restore();
  }

  // ===========================================================================
  // Layout (docs/storyboard.md, 05 Composition)
  // ===========================================================================

  const CX = 560; // every chick is centred on x 560
  const AXIS_X = 120, AXIS_Y0 = 260, AXIS_Y1 = 1500;
  const BAR_X = 860; // right end of every mass bar
  const PX_PER_G = 5;
  const ADULT_X = BAR_X - 104 * PX_PER_G; // 340, the adult-mass line
  const GUIDE = [560, 900];

  // w: bill tip to tail tip (px); g: mass in grams
  const ROWS = [
    // the day-20 row sits on shot 06's opening crouch (480 px, bill tip (320, 1215), tail (800, 1335)),
    // so the upper rows are lifted from the storyboard's 360/560/800/1080 to keep clear of it
    { day: 0, y: 330, w: 120, g: 13 },
    { day: 5, y: 510, w: 180, g: 30 },
    { day: 10, y: 730, w: 260, g: 60 },
    { day: 15, y: 975, w: 340, g: 90 },
    { day: 20, y: 1255, w: 480, g: 104 },
  ];

  // ---------------------------------------------------------------------------
  // Chick specs in units of the silhouette width, (0, 0) = (560, row y), u toward the tail (right),
  // v down. The bird faces left. Ellipses are [cx, cy, rx, ry, rot]; the head is [cx, cy, r].
  // Art bible 10.5: day 0 a round down ball, head a third of the body, egg tooth, big dark eye;
  // day 5 fluffier, sturdier legs; day 10 pin feathers on wings and scapulars, down on head and belly;
  // day 15 grey mantle and wing feathers unsheathed, down tufts at the tips; day 20 juvenile plumage.
  // ---------------------------------------------------------------------------
  const SPEC = [
    {
      body: [0.12, 0.07, 0.3, 0.29, 0],
      head: [-0.18, -0.13, 0.21],
      neck: [-0.04, -0.04, 0.16, 0.16, 0],
      tail: [0.4, 0.04, 0.08, 0.07, 0],
      k: 0.1,
      bill: [[-0.37, -0.13], [-0.5, -0.1], 0.05],
      eye: [-0.22, -0.17, 0.05],
      legs: [[0.04, 0.33, 0.0, 0.425], [0.15, 0.33, 0.13, 0.425]],
      foot: 0.425,
      wing: [0.21, 0.03, 0.14, 0.1, 0.25],
      fuzzLen: 0.055,
      speck: 0.5,
    },
    {
      body: [0.1, 0.05, 0.31, 0.26, 0],
      head: [-0.22, -0.17, 0.175],
      neck: [-0.1, -0.07, 0.12, 0.12, 0],
      tail: [0.39, 0.0, 0.1, 0.07, -0.1],
      k: 0.08,
      bill: [[-0.37, -0.16], [-0.5, -0.13], 0.042],
      eye: [-0.26, -0.2, 0.035],
      legs: [[0.03, 0.28, 0.01, 0.4], [0.14, 0.28, 0.13, 0.4]],
      foot: 0.4,
      wing: [0.17, 0.02, 0.17, 0.1, 0.18],
      fuzzLen: 0.06,
      speck: 0.36,
    },
    {
      body: [0.09, 0.04, 0.32, 0.22, -0.03],
      head: [-0.26, -0.17, 0.14],
      neck: [-0.14, -0.08, 0.12, 0.11, 0],
      tail: [0.39, -0.01, 0.11, 0.06, -0.12],
      k: 0.07,
      bill: [[-0.39, -0.16], [-0.5, -0.125], 0.034],
      eye: [-0.29, -0.19, 0.025],
      legs: [[0.02, 0.24, 0.0, 0.36], [0.13, 0.24, 0.12, 0.36]],
      foot: 0.36,
      wing: [0.17, -0.01, 0.22, 0.1, 0.1],
      fuzzLen: 0.05,
      speck: 0.22,
    },
    {
      body: [0.09, 0.03, 0.33, 0.19, -0.05],
      head: [-0.28, -0.15, 0.12],
      neck: [-0.16, -0.07, 0.11, 0.1, 0],
      tail: [0.38, -0.02, 0.13, 0.05, -0.12],
      k: 0.06,
      bill: [[-0.39, -0.14], [-0.5, -0.105], 0.028],
      eye: [-0.31, -0.17, 0.02],
      legs: [[0.03, 0.2, 0.01, 0.31], [0.13, 0.2, 0.12, 0.31]],
      foot: 0.31,
      wing: [0.19, -0.02, 0.26, 0.09, 0.08],
      fuzzLen: 0.045,
      speck: 0.1,
    },
    // day 20 before the beat (e 0): alert, head up, a little up on its short legs.
    // JUV_CROUCH (e 1) is shot 06's opening pose, which it settles into on the 9.0 beat.
    // A breast mass up front and a long narrow rump taper the body the way a tern's does.
    {
      body: [0.1, -0.02, 0.27, 0.125, 0.02],
      breast: [-0.2, -0.01, 0.15, 0.125, 0],
      head: [-0.26, -0.16, 0.094],
      neck: [-0.25, -0.08, 0.085, 0.09, 0.6],
      tail: [0.36, 0.03, 0.15, 0.04, 0.05],
      k: 0.05,
      bill: [[-0.35, -0.15], [-0.5, -0.125], 0.02],
      eye: [-0.24, -0.17, 0.015],
      legs: [[0.0, 0.09, -0.01, 0.14], [0.08, 0.1, 0.07, 0.14]],
      foot: 0.14,
      fork: [[0.45, 0.035], [0.51, 0.03], [0.505, 0.06]],
      // folded wing keypoints: shoulder, wrist, tip, then the trailing edge back to the body
      nw: [[-0.19, 0.0], [-0.15, -0.08], [0.5, 0.06], [0.35, 0.06], [0.1, 0.07], [-0.12, 0.05]],
      fuzzLen: 0.03,
      speck: 0,
    },
  ];
  const JUV_CROUCH = {
    body: [0.08, -0.01, 0.28, 0.15, 0.12],
    breast: [-0.2, 0.02, 0.15, 0.13, 0],
    head: [-0.25, -0.125, 0.094],
    neck: [-0.25, -0.06, 0.09, 0.08, 0.3],
    tail: [0.35, 0.11, 0.15, 0.04, 0.3],
    k: 0.05,
    bill: [[-0.344, -0.115], [-0.5, -0.083], 0.02],
    eye: [-0.23, -0.13, 0.015],
    legs: [[0.0, 0.12, -0.01, 0.14], [0.08, 0.12, 0.07, 0.14]],
    foot: 0.14,
    fork: [[0.44, 0.135], [0.505, 0.165], [0.495, 0.185]],
    nw: [[-0.19, 0.02], [-0.14, -0.1], [0.5, 0.16], [0.35, 0.12], [0.1, 0.09], [-0.12, 0.07]],
    fuzzLen: 0.03,
    speck: 0,
  };

  function lerpSpec(a, b, e) {
    if (typeof a === 'number') return lerp(a, b, e);
    if (Array.isArray(a)) return a.map((v, k) => lerpSpec(v, b[k], e));
    if (a && typeof a === 'object') {
      const o = {};
      for (const k in a) o[k] = b && k in b ? lerpSpec(a[k], b[k], e) : a[k];
      return o;
    }
    return a;
  }

  // ===========================================================================
  // Pose: absolute geometry of chick i (e: the juvenile's stand-up amount, 0 crouched, 1 standing)
  // ===========================================================================

  function pose(i, e) {
    const R = ROWS[i];
    const S = i === 4 && e !== 0 ? lerpSpec(SPEC[4], JUV_CROUCH, e) : SPEC[i];
    const W = R.w, oy = R.y;
    const P = (p) => [CX + p[0] * W, oy + p[1] * W];
    const ell = (a) => ({ cx: CX + a[0] * W, cy: oy + a[1] * W, rx: a[2] * W, ry: a[3] * W, rot: a[4] });
    const body = ell(S.body);
    const head = { cx: CX + S.head[0] * W, cy: oy + S.head[1] * W, rx: S.head[2] * W, ry: S.head[2] * W, rot: 0 };
    const neck = ell(S.neck);
    const tail = ell(S.tail);
    const comps = [body, head, neck, tail];
    if (S.breast) comps.push(ell(S.breast));
    const q = {
      i,
      e,
      W,
      y: oy,
      body,
      head,
      neck,
      tail,
      comps,
      k: S.k * W,
      c: [lerp(body.cx, head.cx, 0.28), lerp(body.cy, head.cy, 0.28)],
      bill: { b0: P(S.bill[0]), b1: P(S.bill[1]), d: S.bill[2] * W },
      eye: { x: CX + S.eye[0] * W, y: oy + S.eye[1] * W, r: S.eye[2] * W },
      legs: S.legs.map((l) => [CX + l[0] * W, oy + l[1] * W, CX + l[2] * W, oy + l[3] * W]),
      footY: oy + S.foot * W,
      fuzzLen: S.fuzzLen * W,
      speck: S.speck,
    };
    if (i < 4) q.wing = ell(S.wing);
    else {
      q.nw = S.nw.map(P);
      q.fork = S.fork.map(P);
    }
    return q;
  }

  // ---------------------------------------------------------------------------
  // The silhouette is the smooth union of the four ellipses, traced radially from a point in the chest
  // ---------------------------------------------------------------------------
  function sdEll(x, y, c) {
    const dx = x - c.cx, dy = y - c.cy;
    const cr = Math.cos(c.rot), sr = Math.sin(c.rot);
    const lx = dx * cr + dy * sr, ly = -dx * sr + dy * cr;
    return (Math.hypot(lx / c.rx, ly / c.ry) - 1) * Math.min(c.rx, c.ry);
  }
  function smin(a, b, k) {
    const h = Math.max(k - Math.abs(a - b), 0) / k;
    return Math.min(a, b) - h * h * k * 0.25;
  }
  function field(q, x, y) {
    let d = sdEll(x, y, q.comps[0]);
    for (let n = 1; n < q.comps.length; n++) d = smin(d, sdEll(x, y, q.comps[n]), q.k);
    return d;
  }
  function traceOutline(q, thr, n) {
    const pts = [];
    const cx = q.c[0], cy = q.c[1];
    const step = q.W * 0.008;
    for (let s = 0; s < n; s++) {
      const a = Math.PI + (s / n) * TAU; // from the bill side, over the crown, round the tail, under the belly
      const dx = Math.cos(a), dy = Math.sin(a);
      let r = q.W * 0.85;
      while (r > 0 && field(q, cx + dx * r, cy + dy * r) > thr) r -= step;
      let lo = Math.max(0, r), hi = r + step;
      for (let k = 0; k < 9; k++) {
        const m = (lo + hi) / 2;
        if (field(q, cx + dx * m, cy + dy * m) > thr) hi = m;
        else lo = m;
      }
      pts.push([cx + dx * lo, cy + dy * lo]);
    }
    return pts;
  }

  // ===========================================================================
  // Line helpers (as in 02)
  // ===========================================================================

  function wobPts(L, pts, seed, amp, bi, closed) {
    const n = pts.length;
    const out = new Array(n);
    let s = 0;
    const sdb = (seed + bi * 7919) | 0;
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      if (i > 0) s += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
      const a = pts[i > 0 ? i - 1 : closed ? n - 1 : 0], b = pts[i < n - 1 ? i + 1 : closed ? 0 : n - 1];
      const tx = b[0] - a[0], ty = b[1] - a[1];
      const tl = Math.hypot(tx, ty) || 1;
      const d = amp * L.noise1(s * 0.018, sdb);
      out[i] = [p[0] - (ty / tl) * d, p[1] + (tx / tl) * d];
    }
    return out;
  }
  function addPoly(path, pts, closed) {
    if (pts.length < 2) return;
    path.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) path.lineTo(pts[i][0], pts[i][1]);
    if (closed) path.closePath();
  }
  function polyPath(pts, closed) {
    const p = new Path2D();
    addPoly(p, pts, closed);
    return p;
  }
  function stroke(ctx, path, color, alpha, width, dash) {
    if (alpha <= 0.003) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha *= alpha;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (dash) ctx.setLineDash(dash);
    ctx.stroke(path);
    ctx.restore();
  }
  function fill(ctx, path, color, alpha) {
    if (alpha <= 0.003) return;
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha *= alpha;
    ctx.fill(path);
    ctx.restore();
  }
  // first fraction k of an open polyline
  function partial(pts, k) {
    if (k >= 1) return pts;
    const n = Math.max(2, Math.floor(pts.length * k));
    return pts.slice(0, n);
  }
  function cumLen(pts) {
    const c = [0];
    for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return c;
  }
  // point at arclength fraction f along an open polyline
  function along(pts, cum, f) {
    const L = cum[cum.length - 1] * clamp(f);
    let j = 0;
    while (j < cum.length - 2 && cum[j + 1] < L) j++;
    const u = (L - cum[j]) / (cum[j + 1] - cum[j] || 1);
    return [lerp(pts[j][0], pts[j + 1][0], u), lerp(pts[j][1], pts[j + 1][1], u)];
  }
  function ellPts(c, n, scale = 1) {
    const out = [];
    const cr = Math.cos(c.rot), sr = Math.sin(c.rot);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU;
      const x = Math.cos(a) * c.rx * scale, y = Math.sin(a) * c.ry * scale;
      out.push([c.cx + x * cr - y * sr, c.cy + x * sr + y * cr]);
    }
    return out;
  }
  function ellAt(c, a, scale = 1) {
    const cr = Math.cos(c.rot), sr = Math.sin(c.rot);
    const x = Math.cos(a) * c.rx * scale, y = Math.sin(a) * c.ry * scale;
    return [c.cx + x * cr - y * sr, c.cy + x * sr + y * cr];
  }

  // ===========================================================================
  // Memoized geometry per chick and pose (t-independent; the juvenile has four drawings)
  // ===========================================================================

  const GEO = new Map();
  function geo(L, i, e) {
    const key = i + '|' + e.toFixed(3);
    let g = GEO.get(key);
    if (g) return g;
    const q = pose(i, e);
    const W = q.W;
    const out = traceOutline(q, 0, 220);
    const inset = Math.min(9, W * 0.045);
    const inn = traceOutline(q, -inset, 220);
    let x0 = Infinity, x1 = -Infinity, top = Infinity, bot = -Infinity;
    for (const p of out) {
      x0 = Math.min(x0, p[0]);
      x1 = Math.max(x1, p[0]);
      top = Math.min(top, p[1]);
      bot = Math.max(bot, p[1]);
    }
    x0 = Math.min(x0, q.bill.b1[0]);
    g = { q, out, inn, inset, x0, x1, top, bot, outPath: polyPath(out, true), innPath: polyPath(inn, true) };
    g.dots = makeDots(L, g);
    g.fuzz = makeFuzz(L, g);
    g.merid = makeMeridians(q);
    g.bill = billPoly(q);
    if (i === 2 || i === 3) g.quills = makeQuills(L, q);
    if (i === 3) g.scal = makeMantle(L, q, 0.55);
    if (i === 4) {
      g.near = makeWing(L, q, q.nw, 'n');
      g.scal = makeMantle(L, q, 0.7);
      g.billDots = billDots(L, q, g.bill);
      g.top = Math.min(g.top, ...q.nw.map((p) => p[1]));
    }
    GEO.set(key, g);
    return g;
  }

  // light from the upper left: shadow lower right
  function density(L, q, x, y) {
    const b = q.body;
    const i = q.i;
    const lx = x - b.cx, ly = y - b.cy;
    const sh = sstep(-0.3, 1.0, (lx * 0.55 + ly * 0.85) / (b.ry * 1.5 + 6));
    let d = 0.12 + 0.36 * sh;
    const f = field(q, x, y);
    d += 0.22 * sstep(-q.W * 0.05, 0, f) * (0.35 + 0.65 * sh); // rim tone
    const un = (x - CX) / q.W, vn = (y - q.y) / q.W;
    if (i < 4) {
      // black speckles on the down: patchy, denser on the back
      const n = L.noise2(un * 16, vn * 16, sd('speck', i));
      d += q.speck * sstep(0.18, 0.45, n) * (vn < 0.1 ? 1 : 0.55);
      // the head is a denser down ball than the belly
      const hd = Math.hypot(x - q.head.cx, y - q.head.cy) / q.head.rx;
      if (hd < 1) d += 0.08;
      if (i >= 2 && y < b.cy - b.ry * 0.25 && hd > 1.1) d += i === 3 ? 0.18 : 0.08; // grey mantle coming in
    } else {
      const h = q.head;
      const hx = (x - h.cx) / h.rx, hy = (y - h.cy) / h.ry;
      // smudgy black rear crown; the forehead stays white
      if (hx * hx + hy * hy < 1.25) {
        if (hx > -0.25 && hy < 0.3) d = lerp(0.35, 0.9, sstep(-0.25, 0.25, hx));
        else if (hx <= -0.25) d = Math.min(d, 0.06);
      }
      // grey mantle above, white belly below
      const cr = Math.cos(b.rot), sr = Math.sin(b.rot);
      const bly = -lx * sr + ly * cr;
      if (bly < -b.ry * 0.15) d += 0.22;
      else d *= 0.7;
    }
    return clamp(d);
  }

  function makeDots(L, g) {
    const q = g.q;
    const i = q.i;
    const sp = clamp(q.W * 0.013, 3.2, 5.2);
    const rr = i === 0 ? [0.7, 1.2] : i === 1 ? [0.8, 1.4] : i === 2 ? [0.9, 1.6] : [1.0, 1.9];
    const rowH = sp * 0.866;
    const out = [];
    const r = L.rng(sd('dots', i, Math.round(q.e * 1000)));
    let row = 0;
    for (let y = g.top - sp; y <= g.bot + sp; y += rowH, row++) {
      for (let x = g.x0 - sp + (row & 1 ? sp / 2 : 0); x <= g.x1 + sp; x += sp) {
        const px = x + (r() - 0.5) * sp * 0.8, py = y + (r() - 0.5) * sp * 0.8;
        const c = r(), rad = r();
        if (!L.polyContains(g.out, px, py)) continue;
        const d = density(L, q, px, py);
        if (c >= d) continue;
        out.push(px, py, lerp(rr[0], rr[1], clamp(rad * 0.6 + d * 0.5)), c / Math.max(0.01, d));
      }
    }
    return new Float64Array(out);
  }

  // down filaments along the outline, weighted by where down still grows on this day
  function fuzzWeight(L, q, x, y) {
    const i = q.i;
    if (i <= 1) return 1;
    const b = q.body, h = q.head;
    const hd = Math.hypot(x - h.cx, y - h.cy) / h.rx;
    const belly = y > b.cy + b.ry * 0.25;
    if (i === 2) return hd < 1.35 ? 1 : belly ? 0.9 : 0.12;
    const n = L.noise2((x - CX) * 0.03, (y - q.y) * 0.03, sd('tuft', i));
    if (i === 3) return n > 0.2 ? (belly ? 0.9 : 0.75) : belly ? 0.25 : 0;
    // juvenile: the last tufts on the crown (06 opens with them still there)
    return hd < 1.3 && y < h.cy && n > 0.1 ? 0.8 : 0;
  }
  function makeFuzz(L, g) {
    const q = g.q;
    const pts = L.smoothPts(g.out, true, 3);
    const n = pts.length;
    const r = L.rng(sd('fuzz', q.i, Math.round(q.e * 1000)));
    const fil = [];
    const dots = [];
    for (let k = 0; k < n; k++) {
      const a = pts[(k - 1 + n) % n], b = pts[(k + 1) % n], p = pts[k];
      let tx = b[0] - a[0], ty = b[1] - a[1];
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl;
      ty /= tl;
      const nx = ty, ny = -tx; // outward for this winding
      const w = fuzzWeight(L, q, p[0], p[1]);
      const u = r(), v = r(), s = r(), c = r(), id = (r() * 1e6) | 0;
      // the bill base and the feet stay clean
      if (Math.hypot(p[0] - q.bill.b0[0], p[1] - q.bill.b0[1]) < q.W * 0.05) continue;
      if (u < w * 0.8) {
        const ang = Math.atan2(ny, nx) + (v - 0.5) * 1.1;
        const len = q.fuzzLen * (0.45 + 0.75 * s);
        fil.push(p[0] - nx * 1.5, p[1] - ny * 1.5, Math.cos(ang), Math.sin(ang), len, (c - 0.5) * 0.9, id);
      }
      if (u < w) {
        const dd = q.fuzzLen * (0.2 + 0.9 * v * v);
        dots.push(p[0] + nx * dd + tx * (s - 0.5) * 3, p[1] + ny * dd + ty * (s - 0.5) * 3, 0.6 + 0.6 * c * (1 - v), id);
      }
    }
    return { fil: new Float64Array(fil), dots: new Float64Array(dots) };
  }

  // meridian arcs across the body, bowed toward the light-side (like a sphere seen three-quarter)
  function makeMeridians(q) {
    const b = q.body;
    const p = new Path2D();
    const cr = Math.cos(b.rot), sr = Math.sin(b.rot);
    for (const s of [-0.55, -0.25, 0.05, 0.35, 0.62]) {
      const pts = [];
      for (let k = 0; k <= 20; k++) {
        const a = -Math.PI / 2 + (k / 20) * Math.PI;
        const x = b.rx * (s + 0.16 * (1 - s * s) * Math.cos(a)), y = b.ry * Math.sqrt(1 - s * s) * Math.sin(a) * 1.02;
        pts.push([b.cx + x * cr - y * sr, b.cy + x * sr + y * cr]);
      }
      addPoly(p, pts, false);
    }
    // two latitude lines
    for (const s of [-0.45, 0.4]) {
      const pts = [];
      for (let k = 0; k <= 24; k++) {
        const a = Math.PI + (k / 24) * Math.PI;
        const x = -b.rx * Math.cos(a) * Math.sqrt(1 - s * s), y = b.ry * s + 0.1 * b.ry * Math.sin(a);
        pts.push([b.cx + x * cr - y * sr, b.cy + x * sr + y * cr]);
      }
      addPoly(p, pts, false);
    }
    return p;
  }

  function billPoly(q) {
    const { b0, b1, d } = q.bill;
    const dx = b1[0] - b0[0], dy = b1[1] - b0[1];
    const l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l, ny = dx / l;
    const pts = [];
    for (let k = 0; k <= 8; k++) {
      const u = k / 8;
      const w = d * (1 - u) ** 0.8;
      pts.push([b0[0] + dx * u + nx * w, b0[1] + dy * u + ny * w]);
    }
    for (let k = 7; k >= 0; k--) {
      const u = k / 8;
      const w = d * 0.85 * (1 - u) ** 0.9;
      pts.push([b0[0] + dx * u - nx * w, b0[1] + dy * u - ny * w]);
    }
    return pts;
  }
  function billDots(L, q, poly) {
    const out = [];
    const r = L.rng(sd('bill', Math.round(q.e * 1000)));
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of poly) {
      x0 = Math.min(x0, p[0]);
      x1 = Math.max(x1, p[0]);
      y0 = Math.min(y0, p[1]);
      y1 = Math.max(y1, p[1]);
    }
    for (let y = y0; y <= y1; y += 2.6) {
      for (let x = x0; x <= x1; x += 2.6) {
        const px = x + (r() - 0.5) * 1.6, py = y + (r() - 0.5) * 1.6;
        if (r() > 0.85) continue;
        if (L.polyContains(poly, px, py)) out.push(px, py, 0.8 + r() * 0.5);
      }
    }
    return new Float64Array(out);
  }

  // ---------------------------------------------------------------------------
  // Pin feathers (days 10 and 15): quills from the rear and lower edge of the folded wing, pointing back;
  // day 10 adds a scapular row. Day 15 feathers have broken out of the sheath at the tip, down tufts clinging.
  // ---------------------------------------------------------------------------
  function makeQuills(L, q) {
    const w = q.wing, W = q.W, i = q.i;
    const r = L.rng(sd('quill', i));
    const out = [];
    const n = i === 2 ? 8 : 9;
    const l0 = i === 2 ? 0.05 : 0.11, l1 = i === 2 ? 0.095 : 0.165;
    for (let k = 0; k < n; k++) {
      const f = k / (n - 1);
      const phi = lerp(-28, 105, f) * DEG;
      const base = ellAt(w, phi, 0.86);
      const ang = w.rot + lerp(-6, 40, f) * DEG + (r() - 0.5) * 4 * DEG;
      const len = W * lerp(l1, l0, Math.abs(f - 0.2) / 0.8) * (0.92 + 0.16 * r());
      out.push({ base, ang, len, sheath: i === 2 ? 0.82 : 0.36, vane: i === 3, row: 'wing', k, w: i === 2 ? 2.2 : 2.8 });
    }
    if (i === 2) {
      for (let k = 0; k < 5; k++) {
        const f = k / 4;
        const phi = lerp(-160, -70, f) * DEG;
        const base = ellAt(w, phi, 0.8);
        const ang = w.rot + lerp(-14, -4, f) * DEG;
        out.push({ base, ang, len: W * 0.045 * (0.9 + 0.2 * r()), sheath: 0.85, vane: false, row: 'scap', k: n + k, w: 1.8 });
      }
    }
    // precompute the sheath capsule, rachis and vane shapes
    for (const Q of out) {
      const dx = Math.cos(Q.ang), dy = Math.sin(Q.ang), nx = -dy, ny = dx;
      const tip = [Q.base[0] + dx * Q.len, Q.base[1] + dy * Q.len];
      Q.tip = tip;
      const sl = Q.len * Q.sheath;
      const sh = [];
      for (let s = 0; s <= 6; s++) {
        const a = -Math.PI / 2 + (s / 6) * Math.PI;
        sh.push([Q.base[0] + dx * (sl - Q.w * (1 - Math.cos(a))) + nx * Math.sin(a) * Q.w, Q.base[1] + dy * (sl - Q.w * (1 - Math.cos(a))) + ny * Math.sin(a) * Q.w]);
      }
      sh.push([Q.base[0] - nx * Q.w * 0.7, Q.base[1] - ny * Q.w * 0.7]);
      sh.unshift([Q.base[0] + nx * Q.w * 0.7, Q.base[1] + ny * Q.w * 0.7]);
      Q.sheathPts = sh;
      Q.mid = [Q.base[0] + dx * sl * 0.5, Q.base[1] + dy * sl * 0.5];
      if (Q.vane) {
        // asymmetric vane: narrow leading (upper) side, broad trailing (lower) side
        const vp = [];
        const s0 = sl, vw = Q.len * 0.13;
        for (let s = 0; s <= 8; s++) {
          const u = s / 8;
          const a = s0 + (Q.len - s0) * u;
          const wv = vw * Math.sin(Math.PI * Math.min(1, u * 1.15 + 0.08)) * 0.45;
          vp.push([Q.base[0] + dx * a - nx * wv, Q.base[1] + dy * a - ny * wv]);
        }
        for (let s = 8; s >= 0; s--) {
          const u = s / 8;
          const a = s0 + (Q.len - s0) * u;
          const wv = vw * Math.sin(Math.PI * Math.min(1, u * 1.15 + 0.08));
          vp.push([Q.base[0] + dx * a + nx * wv, Q.base[1] + dy * a + ny * wv]);
        }
        Q.vanePts = vp;
        const barbs = new Path2D();
        for (let s = 1; s < 7; s++) {
          const a = s0 + (Q.len - s0) * (s / 7.5);
          const px = Q.base[0] + dx * a, py = Q.base[1] + dy * a;
          const u = s / 7;
          const wl = vw * Math.sin(Math.PI * Math.min(1, u * 1.15 + 0.08));
          barbs.moveTo(px, py);
          barbs.lineTo(px + nx * wl * 0.9 + dx * wl * 0.5, py + ny * wl * 0.9 + dy * wl * 0.5);
          barbs.moveTo(px, py);
          barbs.lineTo(px - nx * wl * 0.4 + dx * wl * 0.3, py - ny * wl * 0.4 + dy * wl * 0.3);
        }
        Q.barbs = barbs;
        // down tuft clinging at the tip
        const tf = [];
        for (let s = 0; s < 5; s++) {
          const a2 = Q.ang + (s - 2) * 0.42 + (r() - 0.5) * 0.3;
          tf.push([tip[0], tip[1], Math.cos(a2), Math.sin(a2), W * 0.022 * (0.6 + 0.6 * r())]);
        }
        Q.tuft = tf;
      }
    }
    return out;
  }

  // scalloped feather edges over the mantle (grey feathers on day 15, the juvenile's scaly fringes)
  function makeMantle(L, q, reach) {
    const b = q.body;
    const p = new Path2D();
    const cr = Math.cos(b.rot), sr = Math.sin(b.rot);
    const rad = q.W * (q.i === 4 ? 0.022 : 0.02);
    const r = L.rng(sd('mantle', q.i, Math.round(q.e * 1000)));
    let row = 0;
    for (let ly = -0.82; ly <= -0.82 + reach; ly += 0.2, row++) {
      const span = Math.sqrt(Math.max(0, 1 - ly * ly));
      for (let lx = -span * 0.75 + (row & 1 ? 0.06 : 0); lx <= span * 0.85; lx += (rad * 2.1) / b.rx) {
        const x = lx * b.rx + (r() - 0.5) * 2, y = ly * b.ry + (r() - 0.5) * 2;
        const X = b.cx + x * cr - y * sr, Y = b.cy + x * sr + y * cr;
        // arc opening toward the head: each feather tip faces the tail
        const a0 = b.rot - 1.25, a1 = b.rot + 1.25;
        p.moveTo(X + Math.cos(a0) * rad, Y + Math.sin(a0) * rad);
        p.arc(X, Y, rad, a0, a1);
      }
    }
    return p;
  }

  // ---------------------------------------------------------------------------
  // Juvenile wing from its six keypoints: leading edge shoulder-wrist-tip, trailing edge tip back to the body
  // ---------------------------------------------------------------------------
  function makeWing(L, q, K, tag) {
    const [S, Wr, Tp, T1, T2, T3] = K;
    const LE = L.smoothPts([S, Wr, Tp], false, 4);
    const TE = L.smoothPts([T3, T2, T1, Tp], false, 4);
    const cLE = cumLen(LE), cTE = cumLen(TE);
    const at = (a, b) => {
      const p0 = along(LE, cLE, a), p1 = along(TE, cTE, a);
      return [lerp(p0[0], p1[0], b), lerp(p0[1], p1[1], b)];
    };
    const outline = LE.concat(TE.slice().reverse().slice(1));
    const feathers = new Path2D();
    // primaries: 10 from the wrist to the outer trailing edge
    for (let k = 0; k < 10; k++) {
      const p = along(TE, cTE, 0.52 + 0.47 * (k / 9));
      const w0 = at(0.5 + 0.02 * k, 0.05);
      feathers.moveTo(w0[0], w0[1]);
      feathers.quadraticCurveTo((w0[0] + p[0]) / 2 + (T1[0] - Tp[0]) * 0.02, (w0[1] + p[1]) / 2, p[0], p[1]);
    }
    // secondaries along the arm
    for (let k = 0; k < 9; k++) {
      const a = 0.04 + 0.44 * (k / 8);
      const s0 = at(a, 0.42), s1 = along(TE, cTE, a);
      feathers.moveTo(s0[0], s0[1]);
      feathers.lineTo(s1[0], s1[1]);
    }
    // covert rows: scaly fringes
    const cov = new Path2D();
    const rad = q.W * 0.018;
    for (const b of [0.14, 0.26, 0.38]) {
      for (let a = 0.03; a <= 0.5 - b * 0.3; a += 0.055) {
        const c = at(a, b);
        const n = at(a, b + 0.1);
        const dir = Math.atan2(n[1] - c[1], n[0] - c[0]);
        cov.moveTo(c[0] + Math.cos(dir - 1.3) * rad, c[1] + Math.sin(dir - 1.3) * rad);
        cov.arc(c[0], c[1], rad, dir - 1.3, dir + 1.3);
      }
    }
    // carpal bar: dense dots along the inner leading edge
    const r = L.rng(sd('carpal', tag, Math.round(q.e * 1000)));
    const bar = [];
    for (let s = 0; s < 260; s++) {
      const a = r() * 0.42, b = r() * r() * 0.13;
      const p = at(a, b);
      bar.push(p[0], p[1], 0.9 + r() * 0.8);
    }
    return { outline, feathers, cov, bar: new Float64Array(bar), at, S, Wr, Tp };
  }

  // ===========================================================================
  // Drawing a chick
  // ===========================================================================

  function dotPath(arr, stride, bi, seed, amp, thr) {
    const p = new Path2D();
    for (let k = 0; k < arr.length; k += stride) {
      if (thr != null && arr[k + 3] > thr) continue;
      const id = k * 0.37;
      const x = arr[k] + (LIB.h3(id, bi, seed) - 0.5) * amp;
      const y = arr[k + 1] + (LIB.h3(bi, id, seed + 1) - 0.5) * amp;
      const r = arr[k + 2];
      p.moveTo(x + r, y);
      p.arc(x, y, r, 0, TAU);
    }
    return p;
  }

  // the ladder laid in from frame 0: dashed outline, head circle, a dashed bar box and a height bracket,
  // so the pen traces over a drawing already there
  function drawGhost(ctx, L, g, a) {
    if (a <= 0.01) return;
    const P = L.pal;
    const q = g.q, i = q.i;
    stroke(ctx, g.outPath, P.lavender, 0.42 * a, 1.2, [6, 5]);
    if (i >= 1) stroke(ctx, g.innPath, P.lavender, 0.18 * a, 1, [3, 7]);
    const hp = new Path2D();
    hp.arc(q.head.cx, q.head.cy, q.head.rx, 0, TAU);
    hp.moveTo(q.body.cx + q.body.rx * 0.2, q.body.cy);
    hp.arc(q.body.cx, q.body.cy, q.body.rx * 0.2, 0, TAU);
    stroke(ctx, hp, P.lavender, 0.2 * a, 1, [4, 6]);
    const bx = new Path2D();
    const y = barY(i);
    bx.rect(BAR_X - ROWS[i].g * PX_PER_G, y + 4, ROWS[i].g * PX_PER_G, 11);
    stroke(ctx, bx, P.lavender, 0.25 * a, 1, [3, 4]);
    L.bracket(ctx, g.x0 - 24, g.top, g.x0 - 24, q.footY, { style: 'dim', cap: 10, alpha: 0.2 * a, width: 1 });
    const c = new Path2D();
    c.moveTo(AXIS_X + 26, ROWS[i].y);
    c.lineTo(g.x0 - 30, ROWS[i].y);
    stroke(ctx, c, P.lavender, 0.14 * a, 1, [2, 7]);
  }

  // faint shingle section under the ladder (decorative, below the safe area), as in 02
  let SHINGLE = null;
  function drawShingle(ctx, L, bi) {
    const P = L.pal;
    if (!SHINGLE) {
      const r = L.rng(sd('shingle'));
      const peb = [];
      for (let row = 0; row < 7; row++) {
        const y = 1580 + row * 44;
        for (let x = -20 + (row & 1) * 30; x < 1100; x += 58 + r() * 26) {
          peb.push([x + r() * 12, y + r() * 16, 18 + r() * 14, 8 + r() * 7, (r() - 0.5) * 0.5, row]);
        }
      }
      SHINGLE = peb;
    }
    const p = new Path2D();
    for (const [x, y, rx, ry, rot, row] of SHINGLE) {
      const jx = (L.h3(x | 0, bi, 3) - 0.5) * 0.8;
      p.moveTo(x + jx + Math.cos(rot) * rx, y + Math.sin(rot) * rx);
      p.ellipse(x + jx, y, rx, ry, rot, 0, TAU);
    }
    stroke(ctx, p, P.lavender, 0.13, 1);
    const gl = new Path2D();
    gl.moveTo(0, 1556);
    gl.lineTo(1080, 1556);
    gl.moveTo(0, 1564);
    gl.lineTo(1080, 1564);
    stroke(ctx, gl, P.lavender, 0.22, 1);
    L.stipple(ctx, null, { bounds: [0, 1566, 1080, 330], spacing: 9, density: (x, y) => 0.25 * (1 - (y - 1566) / 330), r: [0.7, 1.2], color: P.lavender, alpha: 0.22, seed: sd('shst'), boil: bi });
  }

  // prog: outline draw-on 0..1; fillK: tone, lattice and fuzz; a: row alpha; kW: brighten to lineWhite
  function drawChick(ctx, L, g, st) {
    const P = L.pal;
    const q = g.q;
    const i = q.i;
    const { prog, fillK, a, kW, bi, glow } = st;
    if (prog <= 0 || a <= 0.01) return;
    const lineC = kW > 0 ? L.mix(P.lavender, P.lineWhite, kW) : P.lavender;
    const W = q.W;

    if (prog >= 1) {
      // panel tint and a faint luminous halo
      ctx.save();
      ctx.globalAlpha *= a * 0.7;
      ctx.fillStyle = P.navyLight;
      ctx.fill(g.outPath);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = a * (0.05 + 0.05 * kW);
      ctx.strokeStyle = P.lavender;
      ctx.lineWidth = i >= 3 ? 12 : 8;
      ctx.lineJoin = 'round';
      ctx.stroke(g.outPath);
      ctx.restore();
    }
    if (fillK > 0) {
      const aF = a * fillK;
      // tissue lattice and meridians
      L.hexLattice(ctx, g.inn, { r: clamp(W * 0.034, 6, 14), alpha: (i >= 3 ? 0.2 : 0.16) * aF, width: 1, seed: sd('lat', i), jitter: 0.8, boil: bi });
      ctx.save();
      ctx.clip(g.innPath);
      stroke(ctx, g.merid, P.lavender, 0.2 * aF, 1, [5, 5]);
      ctx.restore();
      // down and plumage tone
      fill(ctx, dotPath(g.dots, 4, bi, 31 + i, 0.8), P.lavender, 0.8 * aF);
      // fuzz
      const F = g.fuzz;
      const fp = new Path2D();
      for (let k = 0; k < F.fil.length; k += 7) {
        const x = F.fil[k], y = F.fil[k + 1], dx = F.fil[k + 2], dy = F.fil[k + 3], len = F.fil[k + 4], curl = F.fil[k + 5], id = F.fil[k + 6];
        const jx = (L.h3(id, bi, 5) - 0.5) * 1.6, jy = (L.h3(bi, id, 6) - 0.5) * 1.6;
        const ex = x + dx * len + jx, ey = y + dy * len + jy;
        fp.moveTo(x, y);
        fp.quadraticCurveTo(x + dx * len * 0.5 - dy * curl * len * 0.5, y + dy * len * 0.5 + dx * curl * len * 0.5, ex, ey);
      }
      stroke(ctx, fp, P.lavender, 0.55 * aF, 1);
      fill(ctx, dotPath(F.dots, 4, bi, 71 + i, 1.2), P.lavender, 0.6 * aF);
    }

    // double outline, drawn on from the bill round the crown
    const wo = wobPts(L, partial(g.out, prog), sd('out', i), i === 4 ? 1.0 : 0.7, bi, prog >= 1);
    const po = polyPath(wo, prog >= 1);
    const wOut = i === 0 ? 2 : 2.5;
    stroke(ctx, po, lineC, 0.85 * a, wOut);
    const kIn = clamp(prog * 1.15 - 0.15);
    if (kIn > 0) {
      const wi = wobPts(L, partial(g.inn, kIn), sd('inn', i), 0.6, bi, kIn >= 1);
      stroke(ctx, polyPath(wi, kIn >= 1), lineC, 0.5 * a, 1.5);
    }
    if (prog < 1) return;

    // wing
    if (i < 4) drawStubWing(ctx, L, g, st, lineC);
    else drawJuvWing(ctx, L, g.near, st, 1, lineC, true);
    if (i === 3 || i === 4) stroke(ctx, g.scal, P.lavender, (i === 4 ? 0.4 : 0.34) * a * fillK, 1);
    if (g.quills) drawQuills(ctx, L, g, st, glow);

    // head: eye, bill, egg tooth
    drawHead(ctx, L, g, st, lineC);
    // legs and feet (short; hidden under the crouched juvenile)
    drawLegs(ctx, L, g, st);
    // the juvenile's short forked tail
    if (i === 4) {
      const f = q.fork;
      const tp = new Path2D();
      const base = [q.tail.cx + Math.cos(q.tail.rot) * q.tail.rx * 0.85, q.tail.cy + Math.sin(q.tail.rot) * q.tail.rx * 0.85];
      tp.moveTo(base[0], base[1] - 4);
      tp.quadraticCurveTo(f[0][0], f[0][1] - 3, f[1][0], f[1][1]);
      tp.moveTo(base[0], base[1] + 4);
      tp.quadraticCurveTo(f[0][0], f[0][1] + 4, f[2][0], f[2][1]);
      tp.moveTo(f[0][0] - 6, f[0][1]);
      tp.lineTo(f[0][0] + 8, (f[1][1] + f[2][1]) / 2);
      stroke(ctx, tp, lineC, 0.8 * a, 1.6);
    }
  }

  function drawStubWing(ctx, L, g, st, lineC) {
    const P = L.pal;
    const q = g.q, w = q.wing;
    const a = st.a;
    const pts = wobPts(L, ellPts(w, 40), sd('wing', q.i), 0.5, st.bi, true);
    const p = polyPath(pts, true);
    stroke(ctx, p, lineC, 0.6 * a, 1.5);
    // feather tracts: a few curved lines along the stub
    const tr = new Path2D();
    for (const s of [-0.4, 0, 0.4]) {
      const p0 = ellAt(w, Math.PI - 0.2 + s * 0.2, 0.7), p1 = ellAt(w, s * 0.5, 0.75);
      const c = ellAt(w, -Math.PI / 2 + s, 0.2);
      tr.moveTo(p0[0], p0[1]);
      tr.quadraticCurveTo(c[0], c[1], p1[0], p1[1]);
    }
    stroke(ctx, tr, P.lavender, 0.3 * a * st.fillK, 1, [3, 4]);
  }

  function drawQuills(ctx, L, g, st, glow) {
    const P = L.pal;
    const a = st.a;
    const qs = g.quills;
    const sheaths = new Path2D(), sheathFill = new Path2D(), rach = new Path2D(), rachLit = new Path2D(), vanes = new Path2D(), barbs = new Path2D(), tufts = new Path2D();
    for (const Q of qs) {
      const lit = glow ? glow(Q.k) : 0;
      const sp = polyPath(Q.sheathPts, true);
      sheaths.addPath(sp);
      sheathFill.addPath(sp);
      (lit > 0 ? rachLit : rach).moveTo(Q.base[0], Q.base[1]);
      (lit > 0 ? rachLit : rach).lineTo(Q.tip[0], Q.tip[1]);
      if (Q.vane) {
        addPoly(vanes, Q.vanePts, true);
        barbs.addPath(Q.barbs);
        for (const tf of Q.tuft) {
          const jx = (L.h3(Q.k, st.bi, tf[4] | 0) - 0.5) * 1.4;
          tufts.moveTo(tf[0], tf[1]);
          tufts.quadraticCurveTo(tf[0] + tf[2] * tf[4] * 0.6 + tf[3] * 2, tf[1] + tf[3] * tf[4] * 0.6 - tf[2] * 2, tf[0] + tf[2] * tf[4] + jx, tf[1] + tf[3] * tf[4] + jx);
        }
      }
    }
    fill(ctx, sheathFill, P.navy, 0.75 * a);
    fill(ctx, vanes, P.navy, 0.7 * a);
    stroke(ctx, vanes, P.lavender, 0.65 * a, 1.1);
    stroke(ctx, barbs, P.lavender, 0.35 * a, 1);
    stroke(ctx, tufts, P.lavender, 0.6 * a, 1);
    stroke(ctx, sheaths, P.lavender, 0.7 * a, 1.1);
    stroke(ctx, rach, P.lavender, 0.55 * a, 1.2);
    stroke(ctx, rachLit, P.lineWhite, 0.95 * a, 1.5);
    // blood-fed cores glowing in the sheaths
    if (glow) {
      for (const Q of qs) {
        const lit = glow(Q.k);
        if (lit <= 0) continue;
        ctx.save();
        ctx.globalAlpha *= a;
        L.glowDot(ctx, Q.mid[0], Q.mid[1], Q.row === 'scap' ? 2.2 : 3, { rays: 4, rayLen: 2.4, glow: 5, intensity: lit, rot: Q.ang, seed: sd('qg', g.q.i, Q.k), boil: st.bi });
        ctx.restore();
      }
    }
  }

  function drawJuvWing(ctx, L, wg, st, alpha, lineC, near) {
    const P = L.pal;
    const a = st.a * alpha;
    if (a <= 0.01) return;
    const pts = wobPts(L, wg.outline, sd('jw', near ? 1 : 2), 0.6, st.bi, true);
    const p = polyPath(pts, true);
    // opaque panel so the body tone reads behind the wing, not through it
    fill(ctx, p, P.navy, (near ? 0.82 : 0.6) * a);
    fill(ctx, p, P.navyLight, 0.45 * a);
    stroke(ctx, wg.feathers, P.lavender, 0.38 * a, 1);
    stroke(ctx, wg.cov, P.lavender, 0.5 * a * st.fillK, 1);
    fill(ctx, dotPath(wg.bar, 3, st.bi, near ? 91 : 92, 0.7), P.lavender, 0.85 * a * st.fillK);
    stroke(ctx, p, lineC, (near ? 0.85 : 0.55) * a, near ? 2 : 1.5);
    if (near) {
      // wrist joint glyph
      const j = new Path2D();
      j.arc(wg.Wr[0], wg.Wr[1], 4, 0, TAU);
      stroke(ctx, j, P.lineWhite, 0.6 * a, 1);
    }
  }

  function drawHead(ctx, L, g, st, lineC) {
    const P = L.pal;
    const q = g.q, a = st.a, i = q.i;
    // bill: chick bills pinkish (the tern tint), the juvenile's black (dense dots)
    const bp = polyPath(wobPts(L, g.bill, sd('bill', i), 0.3, st.bi, true), true);
    fill(ctx, bp, P.navy, 0.9 * a);
    if (i === 4) {
      fill(ctx, dotPath(g.billDots, 3, st.bi, 93, 0.5), P.lavender, 0.8 * a);
      stroke(ctx, bp, lineC, 0.85 * a, 1.5);
    } else {
      stroke(ctx, bp, P.schemBill, 0.85 * a, 1.5);
      // dark tip
      const { b0, b1 } = q.bill;
      const tip = new Path2D();
      tip.moveTo(lerp(b0[0], b1[0], 0.72), lerp(b0[1], b1[1], 0.72));
      tip.lineTo(b1[0], b1[1]);
      stroke(ctx, tip, P.schemBill, 0.9 * a, 2.2);
    }
    // gape line
    const { b0, b1 } = q.bill;
    const gp = new Path2D();
    gp.moveTo(b0[0] + (b0[0] - b1[0]) * 0.1, b0[1] + q.bill.d * 0.1);
    gp.lineTo(lerp(b0[0], b1[0], 0.55), lerp(b0[1], b1[1], 0.55));
    stroke(ctx, gp, i === 4 ? lineC : P.schemBill, 0.6 * a, 1);
    // day 0: the egg tooth on the tip of the upper bill
    if (i === 0) {
      const dx = b1[0] - b0[0], dy = b1[1] - b0[1], l = Math.hypot(dx, dy);
      ctx.save();
      ctx.globalAlpha *= a;
      ctx.fillStyle = P.lineWhite;
      ctx.beginPath();
      ctx.arc(b1[0] - (dx / l) * 3 + (dy / l) * 2.5, b1[1] - (dy / l) * 3 - (dx / l) * 2.5, 2.2, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    // the juvenile's smudgy black rear crown: forehead white, the cap from above the eye back to the nape
    if (i === 4) {
      const h = q.head, e = q.eye;
      const cap = [];
      for (let k = 0; k <= 16; k++) {
        const ang = lerp(-118, 55, k / 16) * DEG;
        cap.push([h.cx + Math.cos(ang) * h.rx * 1.02, h.cy + Math.sin(ang) * h.rx * 1.02]);
      }
      cap.push([e.x + e.r * 2.5, e.y + e.r * 2.2], [e.x - e.r * 1.2, e.y + e.r * 1.4], [e.x - e.r * 2.6, e.y - e.r * 0.6]);
      L.stipple(ctx, cap, { spacing: 3.1, density: (x) => 0.55 + 0.4 * sstep(e.x - e.r * 2, e.x + h.rx * 0.6, x), r: [0.9, 1.6], color: P.lavender, alpha: 0.85 * a, jitter: 0.4, seed: sd('cap'), boil: st.bi });
    }
    // eye: big and dark on the hatchling, small inside the cap on the juvenile
    const e = q.eye;
    const ep = new Path2D();
    ep.arc(e.x, e.y, e.r, 0, TAU);
    fill(ctx, ep, P.navy, 0.9 * a);
    stroke(ctx, ep, lineC, 0.9 * a, i === 0 ? 1.4 : 1.2);
    const pu = new Path2D();
    pu.arc(e.x - e.r * 0.08, e.y + e.r * 0.05, e.r * 0.62, 0, TAU);
    fill(ctx, pu, P.lavender, 0.9 * a);
    const hl = new Path2D();
    hl.arc(e.x - e.r * 0.3, e.y - e.r * 0.3, Math.max(1, e.r * 0.2), 0, TAU);
    fill(ctx, hl, P.lineWhite, 0.9 * a);
    // head construction circle
    const hc = new Path2D();
    hc.arc(q.head.cx, q.head.cy, q.head.rx * 0.55, 0, TAU);
    stroke(ctx, hc, P.lavender, 0.14 * a, 1, [2, 4]);
  }

  function drawLegs(ctx, L, g, st) {
    const P = L.pal;
    const q = g.q, a = st.a;
    const lp = new Path2D(), tp = new Path2D();
    const toe = q.W * (q.i === 4 ? 0.035 : 0.05);
    const show = q.i === 4 ? 1 - 0.7 * clamp(q.e) : 1; // the juvenile sinks onto its belly
    for (let n = 0; n < q.legs.length; n++) {
      const [x0, y0, x1, y1] = q.legs[n];
      const jx = (L.h3(n, st.bi, 3 + q.i) - 0.5) * 0.8;
      lp.moveTo(x0, lerp(y1, y0, show));
      lp.lineTo(x1 + jx, y1);
      // three toes forward (left), one small hind toe
      for (const [dx, dy] of [[-1, 0.12], [-0.8, 0.32], [-0.9, -0.05]]) {
        tp.moveTo(x1, y1);
        tp.lineTo(x1 + dx * toe, y1 + dy * toe * 0.4);
      }
      tp.moveTo(x1, y1);
      tp.lineTo(x1 + toe * 0.35, y1 + toe * 0.1);
    }
    // chick legs pinkish (the tern tint); the juvenile's black (lavender line)
    const lc = q.i === 4 ? P.lavender : P.schemBill;
    stroke(ctx, lp, lc, 0.75 * a, q.i === 0 ? 1.4 : 2);
    stroke(ctx, tp, lc, 0.7 * a, 1.2);
  }

  // ===========================================================================
  // Frame furniture: guides, axis, brackets, bars, insets
  // ===========================================================================

  function drawGuides(ctx, L, bi) {
    const P = L.pal;
    L.stipple(ctx, null, {
      bounds: [90, 430, 940, 940],
      spacing: 8,
      density: (x, y) => {
        const d = Math.hypot(x - GUIDE[0], y - GUIDE[1]);
        return d < 470 ? 0.16 * (1 - sstep(300, 470, d)) + 0.06 : 0;
      },
      r: [0.7, 1.3],
      color: P.lavender,
      alpha: 0.28,
      seed: sd('haze'),
      boil: bi,
    });
    L.guideCircle(ctx, GUIDE[0], GUIDE[1], 470, { alpha: 0.15, width: 1.5, cross: 20 });
    L.guideCircle(ctx, GUIDE[0], GUIDE[1], 400, { alpha: 0.08, width: 1, dash: [2, 8] });
    L.ticks(ctx, GUIDE[0], GUIDE[1], { r: 470, n: 120, len: 7, major: 10, majorLen: 16, inward: true, alpha: 0.2, width: 1, color: P.lavender });
    // diagonals through the ladder
    const d = new Path2D();
    for (const ang of [1.08, Math.PI - 1.08]) {
      d.moveTo(GUIDE[0] - Math.cos(ang) * 1300, GUIDE[1] - Math.sin(ang) * 1300);
      d.lineTo(GUIDE[0] + Math.cos(ang) * 1300, GUIDE[1] + Math.sin(ang) * 1300);
    }
    stroke(ctx, d, P.lavender, 0.1, 1);
    // zero line of the mass bars and the adult-mass line
    const z = new Path2D();
    z.moveTo(BAR_X, 250);
    z.lineTo(BAR_X, 1515);
    stroke(ctx, z, P.lavender, 0.22, 1, [4, 6]);
    const ad = new Path2D();
    ad.moveTo(ADULT_X, 400);
    ad.lineTo(ADULT_X, 1515);
    stroke(ctx, ad, P.lavender, 0.18, 1, [10, 5, 2, 5]);
    const mk = new Path2D();
    for (const [x, y] of [[ADULT_X, 1515], [BAR_X, 1515]]) {
      mk.moveTo(x, y);
      mk.lineTo(x - 6, y + 10);
      mk.lineTo(x + 6, y + 10);
      mk.closePath();
    }
    fill(ctx, mk, P.lavender, 0.5);
  }

  // dashed growth envelope through the bill tips and the tail tips
  function drawEnvelope(ctx, L, G, a) {
    const P = L.pal;
    const env = new Path2D();
    for (const side of [0, 1]) {
      const pts = [[side ? 580 : 540, 190]];
      for (let i = 0; i < 5; i++) pts.push([side ? G[i].x1 : G[i].x0, ROWS[i].y]);
      pts.push([side ? 850 : 250, 1640]);
      addPoly(env, L.smoothPts(pts, false, 8), false);
    }
    stroke(ctx, env, P.lavender, 0.22 * a, 1.2, [6, 8]);
  }

  function drawAxis(ctx, L, progs, alphas, bi) {
    const P = L.pal;
    const x = AXIS_X;
    const line = new Path2D();
    line.moveTo(x, AXIS_Y0);
    line.lineTo(x, AXIS_Y1);
    stroke(ctx, line, P.lavender, 0.6, 1.5);
    const mn = new Path2D(), mj = new Path2D();
    for (let k = 0; AXIS_Y0 + k * 60 <= AXIS_Y1; k++) {
      const y = AXIS_Y0 + k * 60;
      const major = k % 5 === 0;
      (major ? mj : mn).moveTo(x, y);
      (major ? mj : mn).lineTo(x + (major ? 22 : 12), y);
      if (!major) {
        mn.moveTo(x - 3, y);
        mn.lineTo(x - 7, y);
      }
    }
    // half ticks between
    for (let k = 0; AXIS_Y0 + k * 60 + 30 < AXIS_Y1; k++) {
      mn.moveTo(x, AXIS_Y0 + k * 60 + 30);
      mn.lineTo(x + 6, AXIS_Y0 + k * 60 + 30);
    }
    stroke(ctx, mn, P.lineWhite, 0.45, 1);
    stroke(ctx, mj, P.lineWhite, 0.7, 1.5);
    // end caps and a down arrow: time runs down the ladder
    const cap = new Path2D();
    cap.moveTo(x - 10, AXIS_Y0);
    cap.lineTo(x + 10, AXIS_Y0);
    cap.moveTo(x - 7, AXIS_Y1 - 10);
    cap.lineTo(x, AXIS_Y1);
    cap.lineTo(x + 7, AXIS_Y1 - 10);
    stroke(ctx, cap, P.lineWhite, 0.7, 1.5);
    L.bracket(ctx, x, AXIS_Y0, x, AXIS_Y1, { style: 'square', offset: -30, cap: 12, alpha: 0.35 });
  }

  function drawRowFurniture(ctx, L, g, i, pr, a, t) {
    const P = L.pal;
    const R = ROWS[i];
    const y = R.y;
    // node on the axis (ghost ring from frame 0, lit when the chick draws on)
    const gn = new Path2D();
    gn.arc(AXIS_X, y, 8, 0, TAU);
    stroke(ctx, gn, P.lavender, 0.3, 1);
    if (pr <= 0) return;
    stroke(ctx, gn, P.lineWhite, 0.8 * a, 1.5);
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.fillStyle = P.lineWhite;
    ctx.beginPath();
    ctx.arc(AXIS_X, y, 3, 0, TAU);
    ctx.fill();
    ctx.restore();
    // leader to the height bracket
    const bx = g.x0 - 24;
    const ld = new Path2D();
    ld.moveTo(AXIS_X + 26, y);
    ld.lineTo(lerp(AXIS_X + 26, bx - 6, pr), y);
    stroke(ctx, ld, P.lavender, 0.32 * a, 1, [3, 6]);
    // height bracket: crown to feet
    L.bracket(ctx, bx, g.top, bx, g.q.footY, { style: 'dim', cap: 10, alpha: 0.5 * a, p: pr, width: 1.2 });
    // centreline, dash-dot, through the row
    const c = new Path2D();
    c.moveTo(g.x0 - 10, y);
    c.lineTo(lerp(g.x0 - 10, g.x1 + 18, pr), y);
    stroke(ctx, c, P.lavender, 0.2 * a, 1, [14, 4, 2, 4]);
    // foot line
    const fl = new Path2D();
    fl.moveTo(g.x0 + R.w * 0.1, g.q.footY);
    fl.lineTo(lerp(g.x0 + R.w * 0.1, g.x1 - R.w * 0.05, pr), g.q.footY);
    stroke(ctx, fl, P.lavender, 0.3 * a, 1);
  }

  const barY = (i) => ROWS[i].y + SPEC[i].foot * ROWS[i].w + 20;

  // mass bar: a bracket from BAR_X leftward, 5 px per gram, with 5 g cells and lineWhite ticks
  function drawBar(ctx, L, i, k, a, pulse, lit) {
    const P = L.pal;
    if (k <= 0 || a <= 0.01) return;
    const R = ROWS[i];
    const y = barY(i);
    const len = R.g * PX_PER_G * k;
    const x0 = BAR_X - len;
    // cells, 25 px = 5 g
    const cells = new Path2D();
    for (let x = BAR_X; x > x0 + 0.5; x -= 25) {
      const cw = Math.min(25, x - x0) - 3;
      if (cw > 1) cells.rect(x - cw - 1.5, y + 5, cw, 9);
    }
    fill(ctx, cells, i === 4 ? P.lineWhite : P.lavender, (i === 4 ? 0.22 + 0.2 * lit : 0.14) * a);
    stroke(ctx, cells, i === 4 ? P.lineWhite : P.lavender, (i === 4 ? 0.7 : 0.55) * a, 1);
    L.bracket(ctx, x0, y, BAR_X, y, { style: 'square', offset: 0.001, cap: 10, alpha: 0.65 * a, width: 1.5 });
    // ticks every 10 g, pulsing on the 8ths
    const tk = new Path2D();
    for (let x = BAR_X; x >= x0 - 0.5; x -= 50) {
      tk.moveTo(x, y);
      tk.lineTo(x, y - 9);
    }
    stroke(ctx, tk, P.lineWhite, (0.45 + 0.45 * pulse) * a, 1.5);
    // node at the bar's end
    const nd = new Path2D();
    nd.arc(x0, y, 4, 0, TAU);
    fill(ctx, nd, P.navy, a);
    stroke(ctx, nd, P.lineWhite, 0.85 * a, 1.3);
  }

  function drawGrowthCurve(ctx, L, ks, a) {
    const P = L.pal;
    const pts = [];
    for (let i = 0; i < 5; i++) if (ks[i] > 0) pts.push([BAR_X - ROWS[i].g * PX_PER_G * ks[i], barY(i)]);
    if (pts.length < 2) return;
    const sm = L.smoothPts(pts, false, 4);
    stroke(ctx, polyPath(sm, false), P.lavender, 0.45 * a, 1.2, [4, 5]);
    const A = sm[sm.length - 1], B = sm[Math.max(0, sm.length - 4)];
    const ang = Math.atan2(A[1] - B[1], A[0] - B[0]);
    const ah = new Path2D();
    ah.moveTo(A[0] - Math.cos(ang - 0.45) * 10, A[1] - Math.sin(ang - 0.45) * 10);
    ah.lineTo(A[0], A[1]);
    ah.lineTo(A[0] - Math.cos(ang + 0.45) * 10, A[1] - Math.sin(ang + 0.45) * 10);
    stroke(ctx, ah, P.lineWhite, 0.7 * a, 1.5);
  }

  // network inset: a circle glyph linked by a thin curved line to a source point
  function insetFrame(ctx, L, cx, cy, r, src, k, a, bi) {
    const P = L.pal;
    const link = new Path2D();
    const ang = Math.atan2(src[1] - cy, src[0] - cx);
    const ex = cx + Math.cos(ang) * r, ey = cy + Math.sin(ang) * r;
    const mx = (ex + src[0]) / 2, my = (ey + src[1]) / 2 + 40;
    const n = 24;
    const m = Math.max(1, Math.round(n * k));
    for (let s = 0; s <= m; s++) {
      const u = s / n;
      const x = (1 - u) * (1 - u) * src[0] + 2 * (1 - u) * u * mx + u * u * ex;
      const y = (1 - u) * (1 - u) * src[1] + 2 * (1 - u) * u * my + u * u * ey;
      if (s === 0) link.moveTo(x, y);
      else link.lineTo(x, y);
    }
    stroke(ctx, link, P.lavender, 0.45 * a, 1);
    const sn = new Path2D();
    sn.arc(src[0], src[1], 4, 0, TAU);
    stroke(ctx, sn, P.lineWhite, 0.7 * a, 1.2);
    if (k < 0.5) return false;
    const kk = clamp((k - 0.5) * 2);
    ctx.save();
    ctx.globalAlpha *= a * kk;
    const c = new Path2D();
    c.arc(cx, cy, r, 0, TAU);
    fill(ctx, c, P.navy, 0.9);
    fill(ctx, c, P.navyLight, 0.4);
    stroke(ctx, c, P.lavender, 0.75, 1.5);
    const c2 = new Path2D();
    c2.arc(cx, cy, r - 6, 0, TAU);
    stroke(ctx, c2, P.lavender, 0.35, 1);
    L.ticks(ctx, cx, cy, { r: r + 2, n: 36, len: 5, major: 9, majorLen: 9, alpha: 0.4, width: 1, color: P.lavender, boil: bi });
    ctx.restore();
    return true;
  }

  // down feather: a short quill and a soft tuft of barbs whose barbules float free (no hooklets)
  function drawDownInset(ctx, L, k, a, bi) {
    const P = L.pal;
    const cx = 280, cy = 420, r = 54;
    if (!insetFrame(ctx, L, cx, cy, r, [548, ROWS[0].y + 48], k, a, bi)) return;
    const kk = clamp((k - 0.5) * 2) * a;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r - 7, 0, TAU);
    ctx.clip();
    const q = new Path2D(), barbs = new Path2D(), bb = new Path2D();
    const base = [cx + 4, cy + 34], top = [cx + 2, cy + 14];
    q.moveTo(base[0], base[1]);
    q.lineTo(top[0], top[1]);
    for (let n = 0; n < 9; n++) {
      const ang = -Math.PI / 2 + (n - 4) * 0.3;
      const len = 30 + 6 * Math.cos((n - 4) * 0.5);
      const bend = (n - 4) * 0.05 + (L.h3(n, bi, 7) - 0.5) * 0.06;
      let x = top[0], y = top[1];
      barbs.moveTo(x, y);
      for (let s = 1; s <= 6; s++) {
        const u = s / 6;
        const aa = ang + bend * s;
        const nx = x + Math.cos(aa) * len / 6, ny = y + Math.sin(aa) * len / 6;
        barbs.lineTo(nx, ny);
        // free barbules, loose on both sides
        if (s > 1) {
          const bl = 5 * (1 - u * 0.4);
          const j = (L.h3(n, s, bi) - 0.5) * 0.5;
          bb.moveTo(nx, ny);
          bb.lineTo(nx + Math.cos(aa - 0.8 + j) * bl, ny + Math.sin(aa - 0.8 + j) * bl);
          bb.moveTo(nx, ny);
          bb.lineTo(nx + Math.cos(aa + 0.8 - j) * bl, ny + Math.sin(aa + 0.8 - j) * bl);
        }
        x = nx;
        y = ny;
      }
    }
    stroke(ctx, bb, P.lavender, 0.45 * kk, 1);
    stroke(ctx, barbs, P.lavender, 0.8 * kk, 1.2);
    stroke(ctx, q, P.lineWhite, 0.9 * kk, 1.8);
    ctx.restore();
  }

  // pin feather section: waxy sheath ring, the vane rolled inside, the blood-fed pulp at the core
  function drawPinInset(ctx, L, k, a, bi, lit) {
    const P = L.pal;
    const cx = 280, cy = 620, r = 56;
    if (!insetFrame(ctx, L, cx, cy, r, [596, ROWS[2].y - 4], k, a, bi)) return;
    const kk = clamp((k - 0.5) * 2) * a;
    ctx.save();
    const sh = new Path2D();
    sh.arc(cx, cy, 36, 0, TAU);
    sh.moveTo(cx + 31, cy);
    sh.arc(cx, cy, 31, 0, TAU);
    stroke(ctx, sh, P.lavender, 0.8 * kk, 1.5);
    // sheath wall hatching
    const hw = new Path2D();
    for (let n = 0; n < 40; n++) {
      const ang = (n / 40) * TAU + 0.3;
      hw.moveTo(cx + Math.cos(ang) * 31.5, cy + Math.sin(ang) * 31.5);
      hw.lineTo(cx + Math.cos(ang + 0.1) * 35.5, cy + Math.sin(ang + 0.1) * 35.5);
    }
    stroke(ctx, hw, P.lavender, 0.4 * kk, 1);
    // the rolled vane: a spiral from the wall in toward the pulp
    const sp = new Path2D();
    for (let s = 0; s <= 90; s++) {
      const u = s / 90;
      const ang = u * TAU * 2.2 + 0.4;
      const rr = lerp(28, 12, u);
      const x = cx + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr;
      if (s === 0) sp.moveTo(x, y);
      else sp.lineTo(x, y);
    }
    stroke(ctx, sp, P.lineWhite, 0.7 * kk, 1.3);
    // barb ticks along the spiral
    const bt = new Path2D();
    for (let s = 4; s < 90; s += 5) {
      const u = s / 90;
      const ang = u * TAU * 2.2 + 0.4;
      const rr = lerp(28, 12, u);
      bt.moveTo(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr);
      bt.lineTo(cx + Math.cos(ang) * (rr - 3.5), cy + Math.sin(ang) * (rr - 3.5));
    }
    stroke(ctx, bt, P.lavender, 0.45 * kk, 1);
    // pulp and its vessels
    const pu = new Path2D();
    pu.arc(cx, cy, 9, 0, TAU);
    fill(ctx, pu, P.navyLight, 0.8 * kk);
    stroke(ctx, pu, P.lavender, 0.7 * kk, 1.2);
    ctx.globalAlpha *= kk;
    L.glowDot(ctx, cx, cy, 5, { rays: 8, rayLen: 3, glow: 5, intensity: 0.7 + 0.5 * lit, seed: sd('pulp'), boil: bi });
    ctx.restore();
    const vs = new Path2D();
    for (let n = 0; n < 3; n++) {
      const ang = n * 2.1 + 0.5;
      vs.moveTo(cx + Math.cos(ang) * 6.5, cy + Math.sin(ang) * 6.5);
      vs.arc(cx + Math.cos(ang) * 5.5, cy + Math.sin(ang) * 5.5, 1.2, 0, TAU);
    }
    fill(ctx, vs, P.lineWhite, 0.8 * kk);
  }

  // ===========================================================================
  // Scene
  // ===========================================================================

  // beats (shot-local seconds)
  const B_ROW = [0, 0.125, 0.25, 0.375, 0.5]; // T 8.0, 8.125, 8.25, 8.375, 8.5: the ladder draws on in 16ths
  const B_PIN = 0.5; // T 8.5: pin feathers glow, day 10 first
  const B_PIN15 = 0.625; // T 8.625: then day 15
  const B_STAND = 1.0; // T 9.0: the juvenile brightens and settles into 06's opening crouch
  const STAND_E = [0.45, 1.08, 1]; // three drawings on twos from the beat, settling with a small overshoot

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib, P = L.pal, E = L.ease;
      const dur = info.dur;
      let t = clamp(tIn, 0, dur);
      const tFrame = Math.round(t * 24) / 24;
      if (Math.abs(t - tFrame) < 1e-4) t = tFrame + 1e-7;
      const tw = L.onTwos(t);
      const bi = L.boil(info.T);

      const drawing = (a) => Math.floor((t - a) * 12 + 1e-6);
      const hit = (a, frames, e, lead = 1) => {
        if (t < a) return 0;
        const u = clamp((t - a) / (frames * FR) + lead / frames);
        return e ? e(u) : u;
      };

      // ---- timing ----
      const progs = B_ROW.map((a) => hit(a, 3, E.outQuad));
      const fills = B_ROW.map((a) => hit(a + FR, 3, E.outQuad, 0));
      const bars = B_ROW.map((a) => hit(a, 6, E.outBack));
      let e = 0;
      if (t >= B_STAND) {
        const di = Math.floor((tw - B_STAND) * 12 + 1e-6);
        e = di >= STAND_E.length ? 1 : STAND_E[Math.max(0, di)];
      }
      const kW = hit(B_STAND, 3, E.outCubic);
      const low = 1 - 0.42 * hit(B_STAND, 6, E.outCubic);
      const eighth = ((t % 0.25) + 0.25) % 0.25;
      const pulse = Math.exp(-eighth * 24 / 2.2);
      const G = [0, 1, 2, 3].map((i) => geo(L, i, 0));
      G.push(geo(L, 4, e));
      const G4c = geo(L, 4, 0);
      const glowFor = (t0) => (k) => {
        const s = t0 + k * FR * 0.5;
        if (t < s - 1e-6) return 0;
        return 0.55 + 0.9 * Math.exp(-(t - s) * 24 / 3.5);
      };

      // ---- 1 plate and guides ----
      L.blueprint(ctx, { center: [540, 900], circles: 3, diagonals: 3, seed: 505 });
      drawGuides(ctx, L, bi);
      drawShingle(ctx, L, bi);
      drawEnvelope(ctx, L, [G[0], G[1], G[2], G[3], G4c], low);

      // ---- 2 axis ----
      drawAxis(ctx, L, progs, null, bi);

      // ---- 3 ghosts: the whole ladder laid in from frame 0 ----
      for (let i = 0; i < 5; i++) drawGhost(ctx, L, i === 4 ? G4c : G[i], 1 - fills[i] * 0.75);

      // ---- 4 bars, growth curve ----
      for (let i = 0; i < 5; i++) drawBar(ctx, L, i, bars[i], i < 4 ? low : 1, pulse, i === 4 ? kW : 0);
      drawGrowthCurve(ctx, L, bars, low);

      // ---- 5 the chicks ----
      for (let i = 0; i < 5; i++) {
        const g = G[i];
        const a = i < 4 ? low : 1;
        drawRowFurniture(ctx, L, g, i, progs[i], a, t);
        const glow = i === 2 ? glowFor(B_PIN) : i === 3 ? glowFor(B_PIN15) : null;
        drawChick(ctx, L, g, { prog: progs[i], fillK: fills[i], a, kW: i === 4 ? kW : 0, bi, glow });
      }

      // ---- 6 insets ----
      drawDownInset(ctx, L, hit(0, 6, E.outCubic), low, bi);
      const kPin = hit(B_PIN, 6, E.outCubic);
      if (kPin > 0) drawPinInset(ctx, L, kPin, low, bi, Math.exp(-(t - B_PIN) * 24 / 5));

      // ---- 7 magenta: feathers break through on day 10 (8.5), at most 12 frames ----
      const uM = hit(B_PIN, 12);
      if (uM > 0 && uM < 1) {
        const w = G[2].q.wing;
        ctx.save();
        ctx.strokeStyle = P.magenta;
        ctx.lineWidth = 3;
        ctx.globalAlpha = (1 - uM) * (1 - uM * 0.3);
        ctx.beginPath();
        ctx.arc(w.cx + 10, w.cy, 18 + 78 * E.outExpo(uM), 0, TAU);
        ctx.stroke();
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = (1 - uM) * 0.6;
        ctx.beginPath();
        ctx.arc(w.cx + 10, w.cy, 10 + 44 * E.outExpo(uM), 0, TAU);
        ctx.stroke();
        ctx.restore();
      }

      // the juvenile reaches adult mass: a lineWhite target on the bar end at the adult line (9.0)
      if (kW > 0) {
        const y = barY(4);
        ctx.save();
        ctx.globalAlpha = kW;
        L.glowDot(ctx, ADULT_X, y, 5, { rays: 8, rayLen: 3, glow: 5, intensity: 0.6 + 0.8 * Math.exp(-(t - B_STAND) * 24 / 4), seed: sd('adult'), boil: bi });
        ctx.restore();
        const u = hit(B_STAND, 10);
        if (u < 1) {
          const rr = new Path2D();
          rr.arc(ADULT_X, y, 8 + 40 * E.outExpo(u), 0, TAU);
          stroke(ctx, rr, P.lineWhite, 0.8 * (1 - u), 2);
        }
      }

      cycleRing(ctx, L, 1, t / dur, bi);
    },
  });
})();
