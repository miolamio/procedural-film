// 15 pack-ice: "Summer on the Antarctic ice". T 28.0 to 29.5 (36 frames), illustrated, hard cut in and out.
// The Weddell Sea pack-ice edge under a low southern-summer sun. Winter-plumage Arctic terns (white
// forehead, black bill and legs, dark carpal bar, short streamers) rest on floes, 3 to 5 per floe; the
// big foreground bird stretches its near wing and shows a moult gap (P6 missing, P5 half grown).
// Five month circles along y 300 (Dec to Apr) fill on the 8ths; a moulted feather falls on each beat.
// T 29.0: every bird lifts off with wings up, then the flock streams north out of the top of the frame.
//
// Layers, back to front:
//   1  sky stripes (polarSky over stripeCream), drifting 6 px per beat
//   2  the low sun on twos, sinking along its arc
//   3  scenery cache: stratus bands, tabular bergs on the horizon, sea with seaDeep hatching,
//      the far pack band, brash ice (3 boil variants)
//   4  sun glitter on the water, on twos
//   5  moulted feathers floating on the water
//   6  floes back to front (sprite per boil variant, drifting on twos), each with its resting birds
//   7  falling feathers
//   8  the flock after lift-off, on twos
//   9  construction lines (inkFaint)
//   10 overlays: dotted annYellow sun arc, annYellow month tally, annMagenta moult ring, annBlue north arrow
(function () {
  'use strict';

  const ID = 'pack-ice';
  const LIB = FILM.lib;
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const A105 = -105 * DEG; // the art bible's cross-hatch layer
  const LAST = 35; // last frame index (36 frames)
  const LIFT_F = 24; // T 29.0: the birds lift off
  const LIFT_D = LIFT_F >> 1; // drawing index of the lift-off on twos
  const CROUCH_F = 22; // T 28.917: one drawing of anticipation
  const BEAT_F = [0, 12, 24]; // T 28.0, 28.5, 29.0: a feather falls on each beat

  const MONTH_X = [300, 420, 540, 660, 780];
  const MONTH_Y = 300;
  const MONTH_R = 26;
  const MONTH_F = [0, 6, 12, 18, 24]; // Dec (already filled), Jan T 28.25, Feb 28.5, Mar 28.75, Apr 29.0
  const RULER_Y = 352;

  const HORIZON = 900;
  // the sun's dotted arc passes through (100, 900), (540, 640) and (980, 900)
  const SUN_ARC = { cx: 540, cy: 1142.3, r: 502.3 };
  const SUN_R = 44;
  const ARROW = { x: 900, y0: 1060, y1: 500 };

  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, u) => a + (b - a) * u;
  const sstep = (a, b, x) => {
    const u = clamp((x - a) / (b - a));
    return u * u * (3 - 2 * u);
  };
  const sd = (...k) => LIB.hash(ID, ...k) & 0x7fffffff;

  // ---------------------------------------------------------------------------
  // geometry tables (frame px)
  // ---------------------------------------------------------------------------
  // floes: top-face centre, half width, half depth, freeboard, vertex count, drift px per drawing, bob px
  const FLOES = [
    { x: 975, y: 1000, rx: 110, ry: 13, h: 5, n: 10, vx: 0.25, bob: 0.3, w: 1.6 },
    { x: 230, y: 1010, rx: 170, ry: 22, h: 7, n: 13, vx: -0.35, bob: 0.4, w: 1.8 },
    { x: 590, y: 1018, rx: 88, ry: 12, h: 5, n: 10, vx: -0.2, bob: 0.3, w: 1.6 },
    { x: 790, y: 1080, rx: 215, ry: 36, h: 11, n: 14, vx: 0.45, bob: 0.6, w: 2.2 },
    { x: 430, y: 1108, rx: 52, ry: 10, h: 5, n: 9, vx: 0.2, bob: 0.4, w: 1.6 },
    { x: 170, y: 1195, rx: 155, ry: 34, h: 12, n: 13, vx: -0.5, bob: 0.7, w: 2.4 },
    { x: 640, y: 1226, rx: 62, ry: 13, h: 6, n: 9, vx: 0.3, bob: 0.5, w: 1.8 },
    { x: 995, y: 1252, rx: 80, ry: 17, h: 7, n: 9, vx: -0.4, bob: 0.5, w: 1.8 },
    { x: 500, y: 1390, rx: 400, ry: 100, h: 28, n: 18, vx: 0.6, bob: 1.0, w: 3 },
    { x: 975, y: 1500, rx: 50, ry: 14, h: 7, n: 9, vx: -0.6, bob: 0.7, w: 2 },
    { x: 245, y: 1545, rx: 70, ry: 18, h: 9, n: 10, vx: 0.5, bob: 0.8, w: 2 },
    { x: 40, y: 1660, rx: 190, ry: 60, h: 24, n: 14, vx: 0.7, bob: 1.1, w: 3 },
    { x: 850, y: 1772, rx: 330, ry: 95, h: 32, n: 16, vx: -0.8, bob: 1.2, w: 3 },
  ];
  const HERO_FLOE = 8;

  // resting birds: floe index, feet (x, y) at drawing 0, size (1 = 200 px bill tip to wingtip), facing
  // (1 = bill to the left), wing-beat phase after lift-off
  const BIRDS = [
    { f: 1, x: 170, y: 1012, s: 0.3, dir: 1 },
    { f: 1, x: 236, y: 1006, s: 0.28, dir: -1 },
    { f: 1, x: 300, y: 1015, s: 0.31, dir: 1 },
    { f: 3, x: 752, y: 1072, s: 0.41, dir: -1 },
    { f: 3, x: 910, y: 1076, s: 0.42, dir: 1 },
    { f: 3, x: 672, y: 1086, s: 0.44, dir: 1 },
    { f: 3, x: 838, y: 1094, s: 0.45, dir: 1 },
    { f: 5, x: 196, y: 1184, s: 0.52, dir: 1 },
    { f: 5, x: 105, y: 1196, s: 0.55, dir: -1 },
    { f: 5, x: 262, y: 1204, s: 0.56, dir: 1 },
    { f: 8, x: 370, y: 1335, s: 0.82, dir: 1 },
    { f: 8, x: 790, y: 1352, s: 0.86, dir: -1 },
    { f: 8, x: 250, y: 1418, s: 0.95, dir: -1 },
    { f: 8, x: 560, y: 1420, s: 1.3, dir: 1, hero: true },
    { f: 8, x: 700, y: 1478, s: 0.92, dir: -1 },
  ];
  const HERO = BIRDS.findIndex((b) => b.hero);

  // moulted feathers already afloat: x, y, length, rotation, drift px per drawing
  const AFLOAT = [
    [642, 1262, 54, 0.3, 0.3],
    [958, 1340, 46, -0.5, -0.4],
    [470, 1604, 72, 2.8, 0.5],
    [150, 1092, 38, -2.6, -0.3],
    [700, 1648, 64, 0.9, -0.6],
  ];

  // the three feathers that fall on the beats: landing point, length, sway
  const FALLERS = [
    { land: [800, 1600], len: 66, sway: 16, ph: 0.4, onIce: false },
    { land: [872, 1428], len: 58, sway: 14, ph: 2.1, onIce: true },
    { land: [610, 1650], len: 62, sway: 26, ph: 4.0, onIce: false },
  ];

  // stratus bands: centre, length, thickness
  const CLOUDS = [
    { x: 820, y: 560, len: 440, th: 46 },
    { x: 170, y: 622, len: 330, th: 34 },
    { x: 640, y: 452, len: 300, th: 28 },
    { x: 990, y: 716, len: 250, th: 22 },
    { x: 420, y: 760, len: 200, th: 16 },
  ];
  // tabular bergs on the horizon: left, right, top y
  const BERGS = [
    { x0: 598, x1: 872, top: 850 },
    { x0: 958, x1: 1100, top: 874 },
    { x0: -30, x1: 58, top: 884 },
  ];

  // ---------------------------------------------------------------------------
  // colours (resolved once from the palette)
  // ---------------------------------------------------------------------------
  let C = null;
  function colours(L) {
    if (C) return C;
    const P = L.pal;
    C = {
      ink: P.ink,
      inkSoft: P.inkSoft,
      inkFaint: P.inkFaint,
      white: P.white,
      cream: P.stripeCream,
      polarSky: P.polarSky,
      sun: P.sun,
      ochre: P.ochre,
      sea: P.sea,
      seaDeep: P.seaDeep,
      seaDark: L.mix(P.seaDeep, P.ink, 0.25),
      foam: P.foam,
      ice: P.ice,
      iceShade: P.iceShade,
      iceDeep: P.iceDeep,
      iceFoot: L.mix(P.sea, P.ice, 0.38),
      pool: L.mix(P.iceShade, P.sea, 0.35),
      cloud: P.white,
      plume: P.plumeWhite,
      plumeShade: P.plumeShade,
      breast: L.mix(P.plumeWhite, P.breastGrey, 0.35),
      mantle: P.mantleGrey,
      mantleDeep: P.mantleDeep,
      primary: L.mix(P.mantleGrey, P.mantleDeep, 0.42),
      primaryFar: L.mix(P.mantleDeep, P.capBlack, 0.2),
      outerWeb: L.mix(P.mantleGrey, P.mantleDeep, 0.7),
      rachis: L.mix(P.plumeWhite, P.mantleGrey, 0.3),
      primaryGlow: P.primaryGlow,
      carpal: P.carpalBar,
      cap: P.capBlack,
      bill: P.juvBill,
      sheath: L.mix(P.carpalBar, P.mantleDeep, 0.3),
      annYellow: P.annYellow,
      annBlue: P.annBlue,
      annMagenta: P.annMagenta,
    };
    return C;
  }

  // ---------------------------------------------------------------------------
  // small helpers
  // ---------------------------------------------------------------------------
  function pathOf(pts, closed, p) {
    p = p || new Path2D();
    for (let i = 0; i < pts.length; i++) {
      if (i === 0) p.moveTo(pts[i][0], pts[i][1]);
      else p.lineTo(pts[i][0], pts[i][1]);
    }
    if (closed) p.closePath();
    return p;
  }
  function fillPoly(g, pts, col, a = 1) {
    g.save();
    g.globalAlpha *= a;
    g.fillStyle = col;
    g.fill(pathOf(pts, true));
    g.restore();
  }
  function clipTo(g, pts) {
    g.beginPath();
    for (let i = 0; i < pts.length; i++) (i ? g.lineTo : g.moveTo).call(g, pts[i][0], pts[i][1]);
    g.closePath();
    g.clip();
  }
  const shift = (pts, dx, dy) => pts.map((p) => [p[0] + dx, p[1] + dy]);
  // y of a left-to-right polyline at x
  function yAt(pl, x) {
    if (x <= pl[0][0]) return pl[0][1];
    for (let i = 1; i < pl.length; i++) {
      if (x <= pl[i][0]) return lerp(pl[i - 1][1], pl[i][1], (x - pl[i - 1][0]) / (pl[i][0] - pl[i - 1][0] || 1));
    }
    return pl[pl.length - 1][1];
  }
  function quad(a, c, b, u) {
    const v = 1 - u;
    return [v * v * a[0] + 2 * v * u * c[0] + u * u * b[0], v * v * a[1] + 2 * v * u * c[1] + u * u * b[1]];
  }

  // Sprite cache: floes, resting birds and flight poses are inked once per boil variant and render
  // scale into small canvases, then stamped. A pure function of the key.
  const SPR = {};
  function sprite(key, x0, y0, w, h, paint) {
    const S = FILM.S || 1;
    const k = key + '|' + S;
    let sp = SPR[k];
    if (sp) return sp;
    const cw = Math.max(2, Math.ceil(w * S)), ch = Math.max(2, Math.ceil(h * S));
    const cv = FILM.makeCanvas(cw, ch);
    const g = cv.getContext('2d');
    g.setTransform(S, 0, 0, S, -x0 * S, -y0 * S);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    paint(g);
    sp = SPR[k] = { cv, x0, y0, w: cw / S, h: ch / S };
    return sp;
  }
  function blit(ctx, sp, x, y, kx = 1, ky = kx) {
    ctx.drawImage(sp.cv, x + sp.x0 * kx, y + sp.y0 * ky, sp.w * kx, sp.h * ky);
  }

  function timing(t) {
    const f = Math.max(0, Math.min(LAST, Math.floor(Math.max(0, t) * 24 + 1e-6)));
    const d = f >> 1; // drawings on twos
    return { f, d, tw: d / 12, bv: 0, lifted: f >= LIFT_F, ld: f >= LIFT_F ? d - LIFT_D : -1 };
  }

  // ---------------------------------------------------------------------------
  // the resting tern, side view, winter plumage (unit: bill tip to wingtip = 1, feet at the origin,
  // bill to the left; y up is negative)
  // ---------------------------------------------------------------------------
  const R_BODY = [
    [-0.305, -0.3], [-0.292, -0.332], [-0.265, -0.352], [-0.228, -0.355], [-0.197, -0.338], [-0.179, -0.304],
    [-0.162, -0.266], [-0.112, -0.24], [0.0, -0.224], [0.12, -0.203], [0.228, -0.172], [0.262, -0.152],
    [0.232, -0.121], [0.142, -0.083], [0.04, -0.05], [-0.06, -0.048], [-0.14, -0.078], [-0.2, -0.136],
    [-0.24, -0.198], [-0.274, -0.244], [-0.3, -0.27],
  ];
  const R_BILL = [[-0.302, -0.304], [-0.37, -0.293], [-0.438, -0.28], [-0.368, -0.279], [-0.3, -0.268]];
  const R_CAP = [
    [-0.274, -0.3], [-0.272, -0.322], [-0.252, -0.341], [-0.228, -0.353], [-0.205, -0.349], [-0.186, -0.331],
    [-0.175, -0.3], [-0.166, -0.274], [-0.19, -0.281], [-0.226, -0.293], [-0.256, -0.293],
  ];
  const R_EYE = [-0.262, -0.314, 0.013];
  const R_BACK = [
    [-0.186, -0.302], [-0.15, -0.262], [-0.05, -0.243], [0.1, -0.222], [0.24, -0.18], [0.275, -0.15],
    [0.1, -0.17], [-0.1, -0.2], [-0.17, -0.238],
  ];
  const R_WING_UP = [[-0.17, -0.242], [-0.05, -0.237], [0.1, -0.215], [0.3, -0.188], [0.48, -0.169], [0.585, -0.158]];
  const R_WING_LO = [[-0.172, -0.2], [-0.155, -0.155], [-0.09, -0.113], [0.02, -0.1], [0.15, -0.117], [0.3, -0.139], [0.47, -0.15], [0.585, -0.158]];
  const R_TAIL = [[0.222, -0.166], [0.4, -0.172], [0.535, -0.178], [0.47, -0.162], [0.44, -0.154], [0.505, -0.142], [0.4, -0.138], [0.236, -0.126]];
  const R_CARPAL = [[-0.168, -0.241], [-0.05, -0.236], [0.06, -0.222], [0.06, -0.205], [-0.05, -0.217], [-0.16, -0.222]];

  function restWing() {
    const up = R_WING_UP, lo = R_WING_LO;
    return up.concat(lo.slice(0, -1).reverse());
  }

  // paints one resting tern at the origin; U = px per unit, dir 1 = facing left
  function paintRest(g, L, U, dir, bv, seed, opt) {
    opt = opt || {};
    const P = (pts) => pts.map((p) => [p[0] * U * dir, p[1] * U]);
    const k = U / 220;
    const wOut = Math.max(1.1, 4.4 * k);
    const wSec = Math.max(0.9, 2.6 * k);
    const wDet = Math.max(0.7, 1.5 * k);
    const hs = Math.max(2.4, 5.2 * k);
    const ink = (pts, o) => L.inkPath(g, pts, Object.assign({ boil: bv, wobble: 1.2 * k, tremble: 0.3 * k }, o));

    // cast shadow on the ice, down and to the right
    const sh = L.ellipsePts(0.1 * U, 0.006 * U, 0.34 * U, 0.036 * U, 28);
    fillPoly(g, sh, C.iceShade, 0.9);
    L.hatch(g, sh, { angle: 0, spacing: Math.max(2, 3 * k), width: wDet * 0.8, color: C.iceDeep, alpha: 0.55, length: [6 * k + 3, 26 * k + 4], seed: seed + 1, boil: bv, overshoot: 0 });

    // legs: very short and black, toes forward
    const legs = [
      [[-0.022, -0.052], [-0.026, -0.004], [-0.07, 0.0]],
      [[0.03, -0.052], [0.03, -0.002], [-0.012, 0.004]],
    ];
    for (let i = 0; i < 2; i++) ink(P(legs[i]), { width: Math.max(1, 3.4 * k), color: C.bill, seed: seed + 3 + i, smooth: false, taper: [2, 3] });

    // far wingtip, just past the near one
    const farTip = shift(R_WING_UP.slice(2).concat(R_WING_LO.slice(4).reverse()), 0.012, -0.01);
    fillPoly(g, P(farTip), C.primaryFar);
    ink(P(farTip), { closed: true, width: wDet, alpha: 0.8, seed: seed + 5 });

    // tail: white, forked, short in winter
    const tail = P(R_TAIL);
    fillPoly(g, tail, C.plume);
    L.hatch(g, tail, { angle: -Math.PI / 4, spacing: hs, width: wDet * 0.8, color: C.mantleDeep, alpha: 0.5, length: [4, 14 * k + 4], seed: seed + 6, boil: bv, overshoot: 0, density: (x, y) => sstep(-0.16 * U, -0.13 * U, y) });
    ink(tail, { closed: true, width: wSec, seed: seed + 7 });

    // body
    const body = P(R_BODY);
    fillPoly(g, body, C.plume);
    g.save();
    clipTo(g, body);
    fillPoly(g, P(R_BACK), C.mantle);
    // lower flank and belly in flat shade, then hatching on the shadow side
    fillPoly(g, L.ellipsePts(0.03 * U * dir, -0.03 * U, 0.26 * U, 0.068 * U, 24), C.plumeShade);
    L.hatch(g, body, {
      angle: -Math.PI / 4,
      spacing: hs,
      width: wDet,
      color: C.mantleDeep,
      alpha: 0.62,
      length: [5, 22 * k + 5],
      seed: seed + 8,
      boil: bv,
      density: (x, y) => sstep(-0.14 * U, -0.07 * U, y) * (0.55 + 0.45 * sstep(-0.25 * U, 0.2 * U, x)),
    });
    // contour hatching round the breast
    L.hatch(g, body, {
      angle: dir > 0 ? -1.15 : -Math.PI + 1.15,
      spacing: hs * 1.3,
      width: wDet * 0.8,
      color: C.mantleDeep,
      alpha: 0.45,
      length: [4, 12 * k + 4],
      seed: seed + 9,
      boil: bv,
      density: (x, y) => sstep(0.2 * U, 0.1 * U, x * dir) * sstep(-0.22 * U, -0.12 * U, y) * 0.8,
    });
    // winter head: white forehead, black from the eye back over the rear crown
    const cap = P(R_CAP);
    fillPoly(g, cap, C.cap);
    L.stipple(g, cap, { spacing: Math.max(2, 3 * k), r: [0.4, 0.9 * k + 0.4], color: C.plume, alpha: 0.35, density: 0.3, seed: seed + 10, boil: bv });
    g.restore();

    // folded wing
    const wing = P(restWing());
    fillPoly(g, wing, C.mantle);
    const prim = P(R_WING_UP.slice(2).concat(R_WING_LO.slice(4).reverse()));
    fillPoly(g, prim, C.primary);
    fillPoly(g, P(R_CARPAL), C.carpal);
    g.save();
    clipTo(g, wing);
    L.hatch(g, wing, {
      angle: -Math.PI / 4,
      spacing: hs,
      width: wDet,
      color: C.mantleDeep,
      alpha: 0.7,
      length: [4, 18 * k + 4],
      seed: seed + 11,
      boil: bv,
      density: (x, y) => {
        const ux = (x / U) * dir;
        const yu = yAt(R_WING_UP, ux), yl = yAt(R_WING_LO, ux);
        return sstep(0.35, 0.95, (y / U - yu) / Math.max(0.005, yl - yu));
      },
    });
    // feather edges along the primaries and scalloped covert rows
    const edges = new Path2D();
    for (let j = 0; j < 4; j++) {
      const v = 0.28 + 0.17 * j;
      const xa = 0.12 + 0.06 * j, xb = 0.56 - 0.045 * j;
      const pts = [];
      for (let q = 0; q <= 8; q++) {
        const x = lerp(xa, xb, q / 8);
        pts.push([x * U * dir, lerp(yAt(R_WING_UP, x), yAt(R_WING_LO, x), v * (1 - 0.3 * (q / 8))) * U]);
      }
      pathOf(pts, false, edges);
    }
    for (let j = 0; j < 2; j++) {
      const y0 = -0.2 + 0.035 * j;
      for (let q = 0; q < 5; q++) {
        const x = -0.12 + 0.05 * q + 0.02 * j;
        edges.moveTo((x - 0.02) * U * dir, (y0 + 0.004) * U);
        edges.quadraticCurveTo(x * U * dir, (y0 + 0.024) * U, (x + 0.03) * U * dir, (y0 + 0.006) * U);
      }
    }
    g.strokeStyle = C.mantleDeep;
    g.lineWidth = wDet;
    g.globalAlpha = 0.85;
    g.stroke(edges);
    g.globalAlpha = 1;
    // white tips of the scapulars and tertials
    const tips = new Path2D();
    for (let q = 0; q < 4; q++) {
      const x = 0.0 + 0.055 * q;
      const y = yAt(R_WING_LO, x) - 0.012;
      tips.moveTo((x - 0.022) * U * dir, y * U);
      tips.quadraticCurveTo(x * U * dir, (y + 0.012) * U, (x + 0.024) * U * dir, (y - 0.002) * U);
    }
    g.strokeStyle = C.plume;
    g.lineWidth = Math.max(0.8, 2.2 * k);
    g.stroke(tips);
    g.restore();
    ink(wing, { closed: true, width: wSec, seed: seed + 12, smooth: true });

    // bill, eye, outline
    const bill = P(R_BILL);
    fillPoly(g, bill, C.bill);
    ink(P([[-0.305, -0.3], [-0.37, -0.29], [-0.425, -0.281]]), { width: Math.max(0.6, 1.1 * k), color: C.plumeShade, alpha: 0.55, seed: seed + 13, taper: [3, 6] });
    ink(bill, { closed: true, width: Math.max(0.8, 1.8 * k), seed: seed + 14, smooth: false });
    g.fillStyle = C.cap;
    g.beginPath();
    g.arc(R_EYE[0] * U * dir, R_EYE[1] * U, R_EYE[2] * U, 0, TAU);
    g.fill();
    g.fillStyle = C.plume;
    g.beginPath();
    g.arc((R_EYE[0] - 0.004) * U * dir, (R_EYE[1] - 0.004) * U, Math.max(0.5, 0.0035 * U), 0, TAU);
    g.fill();
    ink(body, { closed: true, width: wOut, seed: seed + 15, double: opt.double ? { alpha: 0.4, from: 0.45, to: 0.85 } : false });
  }

  // ---------------------------------------------------------------------------
  // the stretching bird: the same body with the near wing raised and spread, upper surface to camera,
  // P6 missing and P5 half grown (the winter moult)
  // ---------------------------------------------------------------------------
  const W_SHOULDER = [-0.07, -0.242];
  const W_WRIST = 0.32; // wrist along the arm (bird units)
  const W_BEND = 0.42; // the hand swings back at the wrist (radians)
  const W_SCALE = 1.2;
  const N_PRIM = 10;
  const N_SEC = 14;
  const GAP_P = 5; // P6 (index 5) missing
  const GROW_P = 4; // P5 half grown

  // wing geometry in bird units for a raise angle th (radians, 0 = straight back)
  function wingGeo(th) {
    const d = [Math.cos(th), Math.sin(th)];
    const n = [-Math.sin(th), Math.cos(th)]; // trailing side
    const wr = [W_SHOULDER[0] + d[0] * W_WRIST * W_SCALE, W_SHOULDER[1] + d[1] * W_WRIST * W_SCALE];
    const W = (u, v) => {
      const x = W_SHOULDER[0] + (d[0] * u + n[0] * v) * W_SCALE, y = W_SHOULDER[1] + (d[1] * u + n[1] * v) * W_SCALE;
      const a = W_BEND * clamp((u - W_WRIST + 0.04) / 0.24);
      if (a <= 0) return [x, y];
      const ca = Math.cos(a), sa = Math.sin(a);
      const rx = x - wr[0], ry = y - wr[1];
      return [wr[0] + rx * ca - ry * sa, wr[1] + rx * sa + ry * ca];
    };
    const lead = [W(0, -0.035), W(0.14, -0.06), W(0.32, -0.072), W(0.5, -0.052), W(0.75, -0.02), W(0.99, 0.045)];
    const tipP = W(0.99, 0.045);
    const J = W(0.4, 0.25);
    const prims = [];
    for (let i = 0; i < N_PRIM; i++) {
      const u = i / (N_PRIM - 1);
      const base = W(lerp(0.33, 0.6, u), lerp(-0.02, 0.0, u));
      const tip = quad(J, W(0.82, 0.27), tipP, Math.pow(u, 0.9));
      prims.push({ base, tip, w: lerp(0.085, 0.07, u) });
    }
    const secs = [];
    for (let i = 0; i < N_SEC; i++) {
      const u = i / (N_SEC - 1);
      const base = W(lerp(0.32, 0.03, u), lerp(-0.025, 0.0, u));
      const tip = quad(W(0.38, 0.245), W(0.2, 0.27), W(0.04, 0.2), u);
      secs.push({ base, tip, w: 0.06 });
    }
    const coverts = [W(0, -0.035), W(0.14, -0.06), W(0.32, -0.072), W(0.5, -0.052), W(0.66, -0.035), W(0.66, 0.02), W(0.52, 0.085), W(0.34, 0.125), W(0.16, 0.13), W(0.0, 0.1)];
    const carpal = [W(0.0, -0.035), W(0.14, -0.06), W(0.33, -0.072), W(0.36, -0.03), W(0.15, -0.012), W(0.0, 0.005)];
    const rows = [
      [W(0.03, 0.06), W(0.2, 0.08), W(0.36, 0.075), W(0.52, 0.045), W(0.63, 0.0)],
      [W(0.03, 0.02), W(0.2, 0.035), W(0.36, 0.025), W(0.5, 0.0)],
    ];
    const g5 = prims[GAP_P];
    const gap = [lerp(g5.base[0], g5.tip[0], 0.72), lerp(g5.base[1], g5.tip[1], 0.72)];
    return { lead, prims, secs, coverts, carpal, rows, gap, tipP, d, n };
  }

  function featherPoly(base, tip, w, toward, grow) {
    const ex = tip[0] - base[0], ey = tip[1] - base[1];
    const len = Math.hypot(ex, ey) || 1;
    let px = -ey / len, py = ex / len;
    if (px * toward[0] + py * toward[1] < 0) {
      px = -px;
      py = -py;
    }
    const at = (u, v) => [base[0] + ex * u * grow + px * v, base[1] + ey * u * grow + py * v];
    // narrow outer vane on +p, broad inner vane on -p, rounded tip
    return [at(0, 0.012), at(0.3, w * 0.32), at(0.75, w * 0.3), at(0.94, w * 0.16), at(1, 0.0), at(0.97, -w * 0.3), at(0.86, -w * 0.62), at(0.5, -w * 0.66), at(0.18, -w * 0.52), at(0, -0.012)];
  }

  function paintStretch(g, L, U, th, bv, seed) {
    const P = (pts) => pts.map((p) => [p[0] * U, p[1] * U]);
    const k = U / 220;
    const wOut = 4.6 * k;
    const wSec = 2.6 * k;
    const wDet = 1.5 * k;
    const hs = 5 * k;
    const ink = (pts, o) => L.inkPath(g, pts, Object.assign({ boil: bv, wobble: 1.3 * k, tremble: 0.3 * k }, o));

    const sh = L.ellipsePts(0.1 * U, 0.006 * U, 0.36 * U, 0.038 * U, 28);
    fillPoly(g, sh, C.iceShade, 0.9);
    L.hatch(g, sh, { angle: 0, spacing: 3, width: 1.1, color: C.iceDeep, alpha: 0.55, length: [8, 30], seed: seed + 1, boil: bv, overshoot: 0 });
    // the raised wing's shadow thrown across the ice to the right
    const wsh = [[0.1 * U, 0.004 * U], [0.62 * U, -0.02 * U], [0.78 * U, 0.01 * U], [0.3 * U, 0.03 * U]];
    L.hatch(g, wsh, { angle: -Math.PI / 4, spacing: 5, width: 1.2, color: C.iceDeep, alpha: 0.6, length: [6, 16], seed: seed + 2, boil: bv, overshoot: 0 });

    const legs = [
      [[-0.022, -0.052], [-0.026, -0.004], [-0.07, 0.0]],
      [[0.03, -0.052], [0.03, -0.002], [-0.012, 0.004]],
    ];
    for (let i = 0; i < 2; i++) ink(P(legs[i]), { width: 3.4 * k, color: C.bill, seed: seed + 3 + i, smooth: false, taper: [2, 3] });

    // the far wing stays folded: only its primaries show past the rump
    const farTip = R_WING_UP.slice(2).concat(R_WING_LO.slice(4).reverse());
    fillPoly(g, P(farTip), C.primaryFar);
    ink(P(farTip), { closed: true, width: wSec * 0.8, seed: seed + 5 });

    const tail = P(R_TAIL);
    fillPoly(g, tail, C.plume);
    L.hatch(g, tail, { angle: -Math.PI / 4, spacing: hs, width: wDet * 0.8, color: C.mantleDeep, alpha: 0.5, length: [4, 18], seed: seed + 6, boil: bv, overshoot: 0, density: (x, y) => sstep(-0.16 * U, -0.13 * U, y) });
    ink(tail, { closed: true, width: wSec, seed: seed + 7 });

    const body = P(R_BODY);
    fillPoly(g, body, C.plume);
    g.save();
    clipTo(g, body);
    fillPoly(g, P([[-0.186, -0.302], [-0.15, -0.262], [-0.05, -0.243], [0.1, -0.222], [0.2, -0.19], [0.05, -0.205], [-0.1, -0.225], [-0.17, -0.25]]), C.mantle);
    fillPoly(g, L.ellipsePts(0.03 * U, -0.03 * U, 0.26 * U, 0.068 * U, 24), C.plumeShade);
    L.hatch(g, body, {
      angle: -Math.PI / 4,
      spacing: hs,
      width: wDet,
      color: C.mantleDeep,
      alpha: 0.62,
      length: [5, 26],
      seed: seed + 8,
      boil: bv,
      density: (x, y) => sstep(-0.14 * U, -0.07 * U, y) * (0.55 + 0.45 * sstep(-0.25 * U, 0.2 * U, x)),
    });
    L.hatch(g, body, {
      angle: -1.15,
      spacing: hs * 1.3,
      width: wDet * 0.8,
      color: C.mantleDeep,
      alpha: 0.45,
      length: [4, 14],
      seed: seed + 9,
      boil: bv,
      density: (x, y) => sstep(0.2 * U, 0.1 * U, x) * sstep(-0.22 * U, -0.12 * U, y) * 0.8,
    });
    // the flank under the lifted wing: the wing root throws a little shade
    L.hatch(g, body, { angle: A105, spacing: hs * 1.4, width: wDet * 0.8, color: C.mantleDeep, alpha: 0.4, length: [4, 12], seed: seed + 10, boil: bv, density: (x, y) => sstep(0.1 * U, 0.02 * U, Math.hypot(x / U + 0.02, y / U + 0.2)) });
    const cap = P(R_CAP);
    fillPoly(g, cap, C.cap);
    L.stipple(g, cap, { spacing: 3, r: [0.4, 1.1], color: C.plume, alpha: 0.35, density: 0.3, seed: seed + 11, boil: bv });
    g.restore();

    const bill = P(R_BILL);
    fillPoly(g, bill, C.bill);
    ink(P([[-0.305, -0.3], [-0.37, -0.29], [-0.425, -0.281]]), { width: 1.1 * k, color: C.plumeShade, alpha: 0.55, seed: seed + 13, taper: [3, 6] });
    ink(bill, { closed: true, width: 1.8 * k, seed: seed + 14, smooth: false });
    g.fillStyle = C.cap;
    g.beginPath();
    g.arc(R_EYE[0] * U, R_EYE[1] * U, R_EYE[2] * U, 0, TAU);
    g.fill();
    g.fillStyle = C.plume;
    g.beginPath();
    g.arc((R_EYE[0] - 0.004) * U, (R_EYE[1] - 0.004) * U, 0.0035 * U, 0, TAU);
    g.fill();
    ink(body, { closed: true, width: wOut, seed: seed + 15, double: { alpha: 0.4, from: 0.45, to: 0.85 } });

    // the raised near wing
    const G = wingGeo(th);
    const toward = G.d;
    // secondaries: inner first, white-tipped
    const secPolys = [];
    for (let i = N_SEC - 1; i >= 0; i--) {
      const s = G.secs[i];
      const poly = P(featherPoly(s.base, s.tip, s.w, toward, 1));
      secPolys.push(poly);
      fillPoly(g, poly, C.mantle);
      L.hatch(g, poly, { angle: Math.atan2(G.d[1], G.d[0]) + 0.5, spacing: 3.2 * k + 1, width: 0.9 * k, color: C.mantleDeep, alpha: 0.4, length: [4, 10], seed: seed + 20 + i, boil: bv, overshoot: 0, inset: 1 });
      ink(poly, { closed: true, width: 1.3 * k, color: C.ink, alpha: 0.85, seed: seed + 40 + i, smooth: false, taper: [3, 5] });
    }
    // white trailing edge of the secondaries
    const secEdge = G.secs.map((s) => [s.tip[0] * U, s.tip[1] * U]);
    ink(secEdge, { width: 3.2 * k, color: C.plume, seed: seed + 60, taper: [4, 8] });
    // primaries: P1 to P10, the outer one on top; P6 is gone, P5 is still in its sheath
    for (let i = 0; i < N_PRIM; i++) {
      if (i === GAP_P) continue;
      const pr = G.prims[i];
      const grow = i === GROW_P ? 0.45 : 1;
      const poly = P(featherPoly(pr.base, pr.tip, pr.w, toward, grow));
      fillPoly(g, poly, i >= 7 ? C.outerWeb : C.mantle);
      // barbs angled toward the tip
      const ang = Math.atan2(pr.tip[1] - pr.base[1], pr.tip[0] - pr.base[0]);
      L.hatch(g, poly, { angle: ang + 0.55, spacing: 3 * k + 1, width: 0.9 * k, color: C.mantleDeep, alpha: 0.5, length: [4, 12], seed: seed + 70 + i, boil: bv, overshoot: 0, inset: 1 });
      // rachis
      const b = [pr.base[0] * U, pr.base[1] * U];
      const tp = [lerp(pr.base[0], pr.tip[0], 0.97 * grow) * U, lerp(pr.base[1], pr.tip[1], 0.97 * grow) * U];
      ink([b, tp], { width: 1.5 * k, color: C.rachis, seed: seed + 90 + i, smooth: false, taper: [2, 10] });
      // thin dark tip on the trailing side
      const t0 = poly[5], t1 = poly[4], t2 = poly[3];
      ink([poly[6], t0, t1, t2], { width: 2.2 * k, color: C.cap, seed: seed + 100 + i, smooth: true, taper: [6, 4] });
      if (i === GROW_P) {
        // the waxy sheath on the growing feather
        const sh0 = [lerp(pr.base[0], pr.tip[0], 0.05) * U, lerp(pr.base[1], pr.tip[1], 0.05) * U];
        const sh1 = [lerp(pr.base[0], pr.tip[0], 0.3) * U, lerp(pr.base[1], pr.tip[1], 0.3) * U];
        ink([sh0, sh1], { width: 7 * k, color: C.sheath, seed: seed + 110, smooth: false, taper: [2, 5] });
      }
      ink(poly, { closed: true, width: 1.4 * k, color: C.ink, seed: seed + 120 + i, smooth: false, taper: [3, 5] });
    }
    // coverts over the bases, the dark carpal bar along the leading edge of the arm
    const cov = P(G.coverts);
    fillPoly(g, cov, C.mantle);
    L.hatch(g, cov, {
      angle: -Math.PI / 4,
      spacing: hs,
      width: wDet,
      color: C.mantleDeep,
      alpha: 0.55,
      length: [5, 18],
      seed: seed + 130,
      boil: bv,
      density: (x, y) => 0.25 + 0.75 * sstep(-0.04, 0.12, (x / U - W_SHOULDER[0]) * G.n[0] + (y / U - W_SHOULDER[1]) * G.n[1]),
    });
    const rows = new Path2D();
    for (const row of G.rows) {
      const pts = P(row);
      for (let q = 0; q + 1 < pts.length; q++) {
        const a = pts[q], b = pts[q + 1];
        const mx = (a[0] + b[0]) / 2 + G.n[0] * 6 * k, my = (a[1] + b[1]) / 2 + G.n[1] * 6 * k;
        rows.moveTo(a[0], a[1]);
        rows.quadraticCurveTo(mx, my, b[0], b[1]);
      }
    }
    g.strokeStyle = C.mantleDeep;
    g.lineWidth = wDet;
    g.globalAlpha = 0.85;
    g.stroke(rows);
    g.globalAlpha = 1;
    const carpal = P(G.carpal);
    fillPoly(g, carpal, C.carpal);
    L.hatch(g, carpal, { angle: A105, spacing: 3, width: 1, color: C.cap, alpha: 0.5, length: [4, 10], seed: seed + 131, boil: bv, overshoot: 0 });
    ink(P(G.coverts.slice(4).concat([G.coverts[0]])), { width: wDet * 1.2, color: C.inkSoft, alpha: 0.9, seed: seed + 132 });
    // the wing's outline: leading edge heavy, trailing tips lighter
    ink(P(G.lead), { width: wOut, seed: seed + 133, double: { alpha: 0.4, from: 0.1, to: 0.7 } });
    const trail = [G.tipP].concat(G.prims.slice().reverse().filter((_, j) => N_PRIM - 1 - j !== GAP_P).map((p, j) => p.tip)).concat(G.secs.map((s) => s.tip));
    // the trailing outline breaks at the gap: two runs
    const outer = [], inner = [];
    for (let i = N_PRIM - 1; i > GAP_P; i--) outer.push(G.prims[i].tip);
    for (let i = GROW_P - 1; i >= 0; i--) inner.push(G.prims[i].tip);
    for (const s of G.secs) inner.push(s.tip);
    ink(P(outer), { width: wSec, seed: seed + 134, taper: [8, 8] });
    ink(P(inner), { width: wSec, seed: seed + 135, taper: [8, 8] });
    return trail.length;
  }

  // ---------------------------------------------------------------------------
  // the tern in flight, side view, bill to the left (unit: bill tip to tail tip = 1, body centre at
  // the origin). Blitted tilted about 50 degrees nose-up so the rising flock reads three-quarter.
  // ---------------------------------------------------------------------------
  const F_BODY = [
    [-0.4, -0.02], [-0.372, -0.052], [-0.335, -0.064], [-0.295, -0.052], [-0.2, -0.058], [-0.06, -0.062],
    [0.1, -0.048], [0.215, -0.022], [0.205, 0.03], [0.08, 0.058], [-0.06, 0.068], [-0.2, 0.058],
    [-0.3, 0.036], [-0.37, 0.016],
  ];
  const F_BILL = [[-0.398, -0.018], [-0.46, -0.004], [-0.535, 0.01], [-0.46, 0.008], [-0.392, 0.014]];
  const F_CAP = [[-0.362, -0.024], [-0.365, -0.05], [-0.34, -0.064], [-0.31, -0.06], [-0.286, -0.046], [-0.278, -0.018], [-0.31, -0.02]];
  const F_EYE = [-0.36, -0.016, 0.011];
  const F_TAIL = [[0.19, -0.02], [0.34, -0.028], [0.47, -0.04], [0.37, -0.004], [0.45, 0.032], [0.33, 0.026], [0.19, 0.024]];
  const F_SHOULDER = [-0.14, -0.045];
  const F_ROOT = [0.08, -0.03];
  // near wing: wrist and tip per pose; the far wing sits behind, offset toward the tail
  const FLY_POSE = [
    { wr: [-0.2, -0.36], tip: [0.1, -0.86], far: [0.16, 0.08], under: true }, // wings up in a V
    { wr: [-0.24, -0.16], tip: [0.24, -0.4], far: [0.1, -0.06], under: true }, // glide, wings raised a little
    { wr: [-0.2, 0.28], tip: [0.18, 0.7], far: [0.12, -0.16], under: false }, // downstroke
  ];

  function flyWing(ps, off, k) {
    const S = F_SHOULDER, W = [ps.wr[0] + off[0] * 0.5, ps.wr[1] + off[1] * 0.5], T = [ps.tip[0] + off[0], ps.tip[1] + off[1]];
    const sc = (p) => [S[0] + (p[0] - S[0]) * k, S[1] + (p[1] - S[1]) * k];
    const Wk = sc(W), Tk = sc(T);
    // leading edge: shoulder, wrist, tip; trailing edge swept back to the body
    const tx = Tk[0] - Wk[0], ty = Tk[1] - Wk[1];
    const len = Math.hypot(tx, ty) || 1;
    const nx = ty / len, ny = -tx / len; // toward the tail side
    const sgn = nx > 0 ? 1 : -1;
    const mid = [lerp(Wk[0], Tk[0], 0.45) + sgn * nx * 0.11, lerp(Wk[1], Tk[1], 0.45) + sgn * ny * 0.11];
    const inner = [lerp(Wk[0], F_ROOT[0], 0.45) + 0.06, lerp(Wk[1], F_ROOT[1], 0.45)];
    return {
      lead: [S, [lerp(S[0], Wk[0], 0.5) - 0.01, lerp(S[1], Wk[1], 0.5)], Wk, [lerp(Wk[0], Tk[0], 0.5), lerp(Wk[1], Tk[1], 0.5)], Tk],
      trail: [Tk, [lerp(Tk[0], mid[0], 0.5) + sgn * nx * 0.02, lerp(Tk[1], mid[1], 0.5) + sgn * ny * 0.02], mid, inner, F_ROOT],
      W: Wk,
      T: Tk,
      mid,
      inner,
    };
  }

  function paintFly(g, L, U, pose, dir, bv, seed) {
    const ps = FLY_POSE[pose];
    const P = (pts) => pts.map((p) => [p[0] * U * dir, p[1] * U]);
    const PB = (pts) => pts.map((p) => [p[0] * U * dir, p[1] * U * 1.3]); // body drawn a little deeper
    const k = U / 200;
    const wOut = 3.4 * k;
    const wDet = 1.3 * k;
    const ink = (pts, o) => L.inkPath(g, pts, Object.assign({ boil: bv, wobble: 1 * k, tremble: 0.25 * k }, o));

    const paintWing = (w, upper, far, sk) => {
      const poly = P(w.lead.concat(w.trail.slice(1, -1)));
      fillPoly(g, poly, upper ? (far ? C.primary : C.mantle) : C.plume);
      // primaries: lines from the hand to the trailing edge
      const lines = new Path2D();
      for (let i = 0; i < 8; i++) {
        const u = i / 7;
        const a = [lerp(w.W[0], w.T[0], 0.15 + 0.7 * u), lerp(w.W[1], w.T[1], 0.15 + 0.7 * u)];
        const b = quad(w.inner, w.mid, w.T, 0.35 + 0.63 * u);
        pathOf(P([a, b]), false, lines);
      }
      g.strokeStyle = upper ? C.mantleDeep : C.plumeShade;
      g.lineWidth = wDet * 0.8;
      g.globalAlpha = upper ? 0.8 : 1;
      g.stroke(lines);
      g.globalAlpha = 1;
      L.hatch(g, poly, { angle: -Math.PI / 4, spacing: 4.5 * k + 1, width: wDet, color: upper ? C.mantleDeep : C.plumeShade, alpha: upper ? 0.5 : 0.9, length: [4, 14], seed: seed + sk, boil: bv, overshoot: 0 });
      if (upper) {
        // the dark carpal bar along the leading edge of the arm
        const bar = [w.lead[0], w.lead[1], w.W, [lerp(w.W[0], w.inner[0], 0.28), lerp(w.W[1], w.inner[1], 0.28)], [lerp(F_SHOULDER[0], F_ROOT[0], 0.3), lerp(F_SHOULDER[1], F_ROOT[1], 0.3) + 0.01]];
        fillPoly(g, P(bar), C.carpal);
      } else {
        // translucent primaries from below with the thin black trailing edge
        const hand = [w.W, w.T, w.trail[1], w.mid];
        fillPoly(g, P(hand), C.primaryGlow);
      }
      ink(P([w.T, w.trail[1], w.mid]), { width: 2.2 * k, color: C.cap, seed: seed + sk + 1, taper: [3, 6] });
      ink(P(w.lead), { width: wOut, seed: seed + sk + 2, taper: [4, 14] });
      ink(P(w.trail), { width: wOut * 0.55, seed: seed + sk + 3, taper: [6, 6] });
    };

    // far wing behind the body: its upper side shows when both are raised
    paintWing(flyWing(ps, ps.far, 1.05), ps.under, true, 10);
    // tail: white, forked, short in winter
    const tail = P(F_TAIL);
    fillPoly(g, tail, C.plume);
    ink(tail, { closed: true, width: 1.8 * k, seed: seed + 20, smooth: false });
    // body: grey back, white below
    const body = PB(F_BODY);
    fillPoly(g, body, C.plume);
    g.save();
    clipTo(g, body);
    fillPoly(g, PB([[-0.3, -0.07], [0.22, -0.07], [0.22, -0.018], [0.0, -0.02], [-0.28, -0.035]]), C.mantle);
    L.hatch(g, body, { angle: -Math.PI / 4, spacing: 4 * k + 1, width: wDet, color: C.mantleDeep, alpha: 0.55, length: [4, 12], seed: seed + 21, boil: bv, density: (x, y) => sstep(0.01 * U, 0.05 * U, y) });
    fillPoly(g, PB(F_CAP), C.cap);
    g.restore();
    ink(body, { closed: true, width: wOut, seed: seed + 22 });
    const bill = PB(F_BILL);
    fillPoly(g, bill, C.bill);
    ink(bill, { closed: true, width: 1.3 * k, seed: seed + 23, smooth: false });
    g.fillStyle = C.cap;
    g.beginPath();
    g.arc(F_EYE[0] * U * dir, F_EYE[1] * U * 1.3, F_EYE[2] * U, 0, TAU);
    g.fill();
    // near wing on top
    paintWing(flyWing(ps, [0, 0], 1.15), !ps.under, false, 30);
  }

  // ---------------------------------------------------------------------------
  // a single moulted feather: rachis along +x from the quill to the tip
  // ---------------------------------------------------------------------------
  function drawFeather(ctx, L, x, y, len, rot, flat, seed) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    if (flat) ctx.scale(1, 0.42);
    const bend = 0.06 * len;
    const R = (u) => [u * len, -bend * Math.sin(Math.PI * u)];
    const lead = [], trail = [];
    for (let i = 0; i <= 10; i++) {
      const u = 0.14 + (i / 10) * 0.86;
      const p = R(u);
      const taperW = Math.sin(Math.PI * Math.min(1, (u - 0.14) / 0.86) * 0.5 + 0.2);
      lead.push([p[0], p[1] - 0.075 * len * Math.min(1, taperW * 1.4) * (1 - 0.8 * Math.pow(u, 6))]);
      trail.push([p[0], p[1] + 0.16 * len * Math.min(1, taperW * 1.3) * (1 - 0.85 * Math.pow(u, 5))]);
    }
    const vane = lead.concat(trail.slice().reverse());
    fillPoly(ctx, vane, C.mantle);
    // barbs off the rachis, angled toward the tip
    const barbs = new Path2D();
    for (let i = 0; i <= 18; i++) {
      const u = 0.16 + (i / 18) * 0.8;
      const p = R(u);
      const lt = lead[Math.min(10, Math.round(((u - 0.14) / 0.86) * 10))];
      const tt = trail[Math.min(10, Math.round(((u - 0.14) / 0.86) * 10))];
      barbs.moveTo(p[0], p[1]);
      barbs.lineTo(p[0] + 0.05 * len, lt[1] * 0.92 + p[1] * 0.08);
      barbs.moveTo(p[0], p[1]);
      barbs.lineTo(p[0] + 0.09 * len, tt[1] * 0.92 + p[1] * 0.08);
    }
    ctx.strokeStyle = C.mantleDeep;
    ctx.lineWidth = 0.9;
    ctx.globalAlpha = 0.7;
    ctx.stroke(barbs);
    ctx.globalAlpha = 1;
    // dark tip on the broad vane
    L.inkPath(ctx, trail.slice(7).concat([lead[10]]), { width: 2, color: C.cap, seed: seed + 1, taper: [4, 2], wobble: 0.5 });
    L.inkPath(ctx, vane, { closed: true, width: 1.4, seed: seed + 2, wobble: 0.6, taper: [3, 5] });
    const rach = [];
    for (let i = 0; i <= 8; i++) rach.push(R(i / 8));
    L.inkPath(ctx, rach, { width: 1.6, color: C.rachis, seed: seed + 3, wobble: 0.3, taper: [1, 8] });
    L.inkPath(ctx, rach.slice(0, 3), { width: 1.4, color: C.ink, seed: seed + 4, wobble: 0.3, taper: [1, 3] });
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // geometry built once
  // ---------------------------------------------------------------------------
  let GEO = null;
  function build(L) {
    if (GEO) return GEO;
    const floes = FLOES.map((f, i) => buildFloe(L, f, i));
    const r = L.rng(sd('farband'));
    const slabs = [];
    for (let i = 0; i < 90; i++) {
      const y = HORIZON + 4 + Math.pow(r(), 1.3) * 96;
      const w = 10 + (y - HORIZON) * 1.05 * r.range(0.5, 1.4);
      slabs.push({ x: r.range(-20, 1100), y, w, h: Math.max(1.6, w * r.range(0.07, 0.12)) });
    }
    slabs.sort((a, b) => a.y - b.y);
    const brash = [];
    const rb = L.rng(sd('brash'));
    for (let i = 0; i < 70; i++) {
      const y = rb.range(1030, 1900);
      const sz = lerp(4, 16, (y - 1030) / 870) * rb.range(0.6, 1.3);
      brash.push({ x: rb.range(0, 1080), y, w: sz, h: sz * rb.range(0.3, 0.45), a: rb.range(-0.2, 0.2) });
    }
    GEO = { floes, slabs, brash };
    return GEO;
  }

  function buildFloe(L, f, i) {
    const r = L.rng(sd('floe', i));
    const n = f.n;
    const top = [];
    for (let k = 0; k < n; k++) {
      const a = ((k + r.range(-0.32, 0.32)) / n) * TAU;
      const rr = 1 + 0.1 * L.noise1(k * 0.8 + 0.3, sd('floeN', i)) + r.range(-0.06, 0.06);
      top.push([Math.cos(a) * f.rx * rr, Math.sin(a) * f.ry * rr]);
    }
    let iR = 0, iL = 0;
    top.forEach((p, k) => {
      if (p[0] > top[iR][0]) iR = k;
      if (p[0] < top[iL][0]) iL = k;
    });
    const arc = [];
    for (let k = iR; ; k = (k + 1) % n) {
      arc.push(top[k]);
      if (k === iL) break;
    }
    const back = [];
    for (let k = iL; ; k = (k + 1) % n) {
      back.push(top[k]);
      if (k === iR) break;
    }
    const hh = (x) => f.h * (0.85 + 0.3 * L.noise1(x * 0.02, sd('floeH', i)));
    const low = arc.map((p) => [p[0], p[1] + hh(p[0])]);
    const side = arc.concat(low.slice().reverse());
    // melt pools and pressure ridges on the big floes
    const pools = [];
    const ridges = [];
    if (f.rx > 140) {
      const np = f.rx > 300 ? 3 : 1;
      for (let q = 0, tries = 0; q < np && tries < 40; tries++) {
        const cx = r.range(-0.6, 0.6) * f.rx, cy = r.range(-0.45, 0.45) * f.ry;
        const pr = r.range(0.06, 0.13) * f.rx;
        if (!L.polyContains(top, cx - pr, cy) || !L.polyContains(top, cx + pr, cy)) continue;
        // keep the pools out from under the birds
        let clash = false;
        for (const b of BIRDS) if (b.f === i && Math.abs(b.x - f.x - cx) < pr + 60 * b.s && Math.abs(b.y - f.y - cy) < 30) clash = true;
        if (clash) continue;
        const pts = [];
        for (let m = 0; m < 12; m++) {
          const a = (m / 12) * TAU;
          const rr = 1 + 0.2 * L.noise1(m * 0.9, sd('pool', i, q));
          pts.push([cx + Math.cos(a) * pr * rr, cy + Math.sin(a) * pr * 0.3 * rr]);
        }
        pools.push(pts);
        q++;
      }
      const nr = f.rx > 300 ? 3 : 1;
      for (let q = 0; q < nr; q++) {
        const x0 = r.range(-0.8, -0.2) * f.rx, x1 = x0 + r.range(0.4, 0.9) * f.rx;
        const y0 = r.range(-0.6, 0.6) * f.ry;
        const pts = [];
        for (let m = 0; m <= 10; m++) {
          const x = lerp(x0, x1, m / 10);
          pts.push([x, y0 + (m / 10) * r.range(-0.2, 0.2) * f.ry + (m % 2 ? -1 : 1) * r.range(1, 3.5)]);
        }
        if (pts.every((p) => L.polyContains(top, p[0], p[1]))) ridges.push(pts);
      }
    }
    const maxH = f.h * 1.2;
    return {
      def: f,
      i,
      top,
      arc,
      back,
      low,
      side,
      pools,
      ridges,
      bx: -f.rx * 1.2 - 14,
      by: -f.ry * 1.25 - 14,
      bw: f.rx * 2.4 + 28,
      bh: f.ry * 2.5 + maxH * 2.8 + 40,
    };
  }

  // ---------------------------------------------------------------------------
  // painters
  // ---------------------------------------------------------------------------
  function paintFloe(g, L, F, bv) {
    const f = F.def;
    const s = sd('floeInk', F.i);
    const small = f.rx < 120;
    // submerged ice foot, turquoise under the water
    const foot = F.low.map((p) => [p[0] * 1.03, p[1] + f.h * 0.55 + 3]);
    const footPoly = F.low.concat(foot.slice().reverse());
    fillPoly(g, footPoly, C.iceFoot, 0.9);
    // reflection: broken horizontal strokes
    const refl = F.low.map((p) => [p[0] * 0.97, p[1] + f.h * 1.5 + 5]);
    const reflPoly = F.low.concat(refl.slice().reverse());
    L.hatch(g, reflPoly, { angle: 0, spacing: small ? 2.4 : 3.2, width: small ? 1 : 1.3, color: C.ice, alpha: 0.75, length: [5, 26], gap: [3, 11], seed: s + 1, boil: bv, overshoot: 0 });
    // dark water line
    L.inkPath(g, shift(F.low, 0, 2), { width: f.w * 1.2, color: C.seaDark, alpha: 0.85, seed: s + 2, taper: [8, 8], boil: bv });
    // side face: shade, vertical hatching thickening toward the right
    fillPoly(g, F.side, C.iceShade);
    L.hatch(g, F.side, {
      angle: -Math.PI / 2,
      spacing: small ? 3 : 4.2,
      width: small ? 0.9 : 1.3,
      color: C.iceDeep,
      alpha: 0.85,
      length: [3, f.h * 1.3],
      gap: [1, 3],
      seed: s + 3,
      boil: bv,
      overshoot: 0,
      density: (x) => 0.4 + 0.6 * sstep(-f.rx * 0.9, f.rx * 0.7, x),
    });
    if (!small) L.hatch(g, F.side, { angle: A105, spacing: 5, width: 1.2, color: C.iceDeep, alpha: 0.8, length: [4, 14], seed: s + 4, boil: bv, overshoot: 0, density: (x) => sstep(f.rx * 0.2, f.rx * 0.9, x) });
    // top face: flat ice, tone on the lower right
    fillPoly(g, F.top, C.ice);
    L.hatch(g, F.top, {
      angle: -Math.PI / 4,
      spacing: small ? 5 : 7,
      width: small ? 0.9 : 1.2,
      color: C.iceShade,
      alpha: 0.95,
      length: [6, small ? 16 : 40],
      seed: s + 5,
      boil: bv,
      overshoot: 0,
      density: (x, y) => sstep(0.05, 0.9, (x / f.rx) * 0.6 + (y / f.ry) * 0.55),
    });
    L.stipple(g, F.top, { spacing: small ? 6 : 8, r: [0.6, 1.3], color: C.iceDeep, alpha: 0.4, density: 0.1, seed: s + 6, boil: bv });
    for (let q = 0; q < F.pools.length; q++) {
      const pl = F.pools[q];
      fillPoly(g, pl, C.pool);
      L.hatch(g, pl, { angle: 0, spacing: 3, width: 1, color: C.iceDeep, alpha: 0.7, length: [4, 18], seed: s + 10 + q, boil: bv, overshoot: 0 });
      L.inkPath(g, pl, { closed: true, width: 1.4, color: C.inkSoft, alpha: 0.8, seed: s + 20 + q, boil: bv, wobble: 0.8 });
      L.inkPath(g, pl.slice(1, 5), { width: 1.6, color: C.white, alpha: 0.9, seed: s + 30 + q, boil: bv, taper: [3, 3] });
    }
    for (let q = 0; q < F.ridges.length; q++) {
      const rp = F.ridges[q];
      // a hummock of broken blocks: shade under the ridge line
      const under = rp.concat(shift(rp, 3, 7).reverse());
      L.hatch(g, under, { angle: -Math.PI / 4, spacing: 3, width: 1.1, color: C.iceDeep, alpha: 0.8, length: [3, 8], seed: s + 40 + q, boil: bv, overshoot: 0 });
      L.inkPath(g, rp, { width: 1.6, color: C.inkSoft, alpha: 0.9, seed: s + 50 + q, boil: bv, smooth: false, taper: [6, 6] });
    }
    // lit rim along the back edge
    L.inkPath(g, shift(F.back, 1.5, 2.5), { width: small ? 1.2 : 2, color: C.white, alpha: 0.95, seed: s + 60, boil: bv, taper: [10, 10] });
    // outline
    L.inkPath(g, F.top, { closed: true, width: f.w, seed: s + 61, boil: bv, smooth: false, wobble: 1.2 });
    L.inkPath(g, F.low, { width: f.w, seed: s + 62, boil: bv, smooth: false, taper: [4, 4], wobble: 1.2 });
    const a0 = F.arc[0], b0 = F.low[0], a1 = F.arc[F.arc.length - 1], b1 = F.low[F.low.length - 1];
    L.inkPath(g, [a0, b0], { width: f.w * 0.8, seed: s + 63, boil: bv, smooth: false, taper: [1, 1] });
    L.inkPath(g, [a1, b1], { width: f.w * 0.8, seed: s + 64, boil: bv, smooth: false, taper: [1, 1] });
  }

  function paintCloud(g, L, c, i, bv) {
    const s = sd('cloud', i);
    const N = 18;
    const topE = [], botE = [];
    for (let q = 0; q <= N; q++) {
      const u = q / N;
      const x = c.x - c.len / 2 + c.len * u;
      const hump = Math.pow(Math.sin(Math.PI * u), 0.6);
      topE.push([x, c.y - c.th * (0.25 + 0.75 * hump) * (0.8 + 0.35 * L.noise1(u * 5.3, s))]);
      botE.push([x, c.y + c.th * 0.14 * Math.sin(Math.PI * u)]);
    }
    const poly = L.smoothPts(topE.concat(botE.reverse()), true, 6);
    fillPoly(g, poly, C.cloud);
    L.hatch(g, poly, { angle: 0, spacing: 4, width: 1.1, color: C.iceShade, alpha: 0.95, length: [10, 50], gap: [4, 14], seed: s + 1, boil: bv, overshoot: 0, density: (x, y) => sstep(c.y - c.th * 0.35, c.y + c.th * 0.05, y) });
    L.hatch(g, poly, { angle: -Math.PI / 4, spacing: 6, width: 1, color: C.iceDeep, alpha: 0.6, length: [4, 12], seed: s + 2, boil: bv, overshoot: 0, density: (x, y) => sstep(c.y - c.th * 0.1, c.y + c.th * 0.1, y) * sstep(c.x, c.x + c.len * 0.5, x) });
    L.inkPath(g, poly, { closed: true, width: 1.8, color: C.inkSoft, alpha: 0.9, seed: s + 3, boil: bv, wobble: 1.5 });
    // a few inner curls
    const rc = L.rng(s + 4);
    for (let q = 0; q < 3; q++) {
      const x = c.x + rc.range(-0.35, 0.3) * c.len, y = c.y - c.th * rc.range(0.25, 0.5);
      L.inkPath(g, [[x, y], [x + 16, y - 5], [x + 34, y - 2]], { width: 1.2, color: C.inkFaint, alpha: 0.7, seed: s + 5 + q, boil: bv, taper: [6, 8] });
    }
  }

  function paintBerg(g, L, b, i, bv) {
    const s = sd('berg', i);
    const N = 14;
    const topE = [];
    for (let q = 0; q <= N; q++) {
      const u = q / N;
      topE.push([lerp(b.x0 + 4, b.x1 - 6, u), b.top + 2.5 * L.noise1(u * 6, s) + (q === 0 || q === N ? 4 : 0)]);
    }
    const face = topE.concat([[b.x1 + 4, HORIZON], [b.x0 - 2, HORIZON]]);
    fillPoly(g, face, C.ice);
    // right-hand facet in shadow, vertical crevasse lines over the cliff
    const facetX = lerp(b.x0, b.x1, 0.78);
    L.hatch(g, face, { angle: -Math.PI / 2, spacing: 4.5, width: 1.1, color: C.iceShade, alpha: 0.95, length: [6, 40], gap: [2, 6], seed: s + 1, boil: bv, overshoot: 0 });
    L.hatch(g, face, { angle: -Math.PI / 2, spacing: 3, width: 1.2, color: C.iceDeep, alpha: 0.85, length: [6, 40], gap: [1, 4], seed: s + 2, boil: bv, overshoot: 0, density: (x) => sstep(facetX - 10, facetX + 10, x) });
    // snow cap highlight and outline
    L.inkPath(g, shift(topE, 0, 2.5), { width: 1.8, color: C.white, alpha: 1, seed: s + 3, boil: bv, taper: [6, 6] });
    L.inkPath(g, face, { closed: true, width: 2, seed: s + 4, boil: bv, smooth: false, wobble: 0.8 });
    L.inkLine(g, facetX, b.top + 3, facetX + 3, HORIZON - 1, { width: 1.2, color: C.inkSoft, alpha: 0.8, seed: s + 5, boil: bv });
    // reflection on the water below
    const refl = [[b.x0, HORIZON + 1], [b.x1 + 2, HORIZON + 1], [b.x1 - 8, HORIZON + (HORIZON - b.top) * 0.55], [b.x0 + 8, HORIZON + (HORIZON - b.top) * 0.55]];
    L.hatch(g, refl, { angle: 0, spacing: 2.6, width: 1.1, color: C.ice, alpha: 0.7, length: [6, 30], gap: [3, 9], seed: s + 6, boil: bv, overshoot: 0 });
  }

  function paintScenery(g, L, bv) {
    const G = GEO;
    // 1 stratus bands in the sky (the sky itself stays transparent for the live stripes)
    for (let i = 0; i < CLOUDS.length; i++) paintCloud(g, L, CLOUDS[i], i, bv);
    // a faint haze of construction-weight strokes over the horizon
    L.hatch(g, null, { bounds: { x: 0, y: HORIZON - 40, w: 1080, h: 36 }, angle: 0, spacing: 7, width: 1, color: C.inkFaint, alpha: 0.35, length: [20, 90], gap: [20, 60], seed: sd('haze'), boil: bv });
    // 2 sea
    g.fillStyle = C.sea;
    g.fillRect(-10, HORIZON, 1100, 1930 - HORIZON);
    for (let i = 0; i < BERGS.length; i++) paintBerg(g, L, BERGS[i], i, bv);
    L.hatch(g, null, { bounds: { x: 0, y: HORIZON + 3, w: 1080, h: 100 }, angle: 0, spacing: 4.2, width: 1.05, color: C.seaDeep, alpha: 0.55, length: [10, 44], gap: [4, 18], seed: sd('farWater'), boil: bv });
    L.hatch(g, null, {
      bounds: { x: 0, y: 1000, w: 1080, h: 920 },
      angle: 0,
      spacing: 8.5,
      width: 1.5,
      color: C.seaDeep,
      alpha: 0.85,
      length: [24, 110],
      gap: [8, 30],
      seed: sd('water'),
      boil: bv,
      density: (x, y) => 0.5 + 0.35 * L.noise2(x * 0.006, y * 0.012, sd('waterN')) + 0.25 * sstep(1000, 1800, y),
    });
    L.hatch(g, null, {
      bounds: { x: 0, y: 1300, w: 1080, h: 620 },
      angle: 0,
      spacing: 6,
      width: 1.6,
      color: C.seaDark,
      alpha: 0.7,
      length: [20, 80],
      gap: [10, 34],
      seed: sd('waterDeep'),
      boil: bv,
      density: (x, y) => sstep(1350, 1900, y) * (0.6 + 0.4 * L.noise2(x * 0.008, y * 0.01, sd('waterD'))),
    });
    // wind ruffles: short curved strokes
    const rr = L.rng(sd('ruffle'));
    const ruf = new Path2D();
    for (let i = 0; i < 140; i++) {
      const y = lerp(1010, 1900, Math.pow(rr(), 0.8));
      const x = rr.range(0, 1080);
      const l = lerp(6, 26, (y - 1000) / 900);
      ruf.moveTo(x - l, y);
      ruf.quadraticCurveTo(x, y - l * 0.22, x + l, y);
    }
    g.strokeStyle = C.seaDark;
    g.lineWidth = 1.3;
    g.globalAlpha = 0.6;
    g.stroke(ruf);
    g.globalAlpha = 1;
    const glint = new Path2D();
    for (let i = 0; i < 120; i++) {
      const y = lerp(1010, 1900, Math.pow(rr(), 0.9));
      const x = rr.range(0, 1080);
      const l = lerp(4, 18, (y - 1000) / 900);
      glint.moveTo(x - l, y);
      glint.lineTo(x + l, y);
    }
    g.strokeStyle = C.foam;
    g.lineWidth = 1.4;
    g.globalAlpha = 0.7;
    g.stroke(glint);
    g.globalAlpha = 1;
    // 3 the far pack: thin slabs crowding the horizon
    for (let i = 0; i < G.slabs.length; i++) {
      const sb = G.slabs[i];
      const pts = [[sb.x - sb.w / 2, sb.y], [sb.x - sb.w * 0.4, sb.y - sb.h], [sb.x + sb.w * 0.42, sb.y - sb.h * 0.9], [sb.x + sb.w / 2, sb.y]];
      fillPoly(g, pts, C.ice);
      g.fillStyle = C.iceDeep;
      g.fillRect(sb.x - sb.w / 2, sb.y, sb.w, Math.max(1, sb.h * 0.35));
      g.strokeStyle = C.ink;
      g.globalAlpha = 0.55;
      g.lineWidth = 0.9;
      g.beginPath();
      g.moveTo(sb.x - sb.w / 2, sb.y + sb.h * 0.35);
      g.lineTo(sb.x + sb.w / 2, sb.y + sb.h * 0.35);
      g.stroke();
      g.globalAlpha = 1;
    }
    // 4 brash ice
    for (let i = 0; i < G.brash.length; i++) {
      const b = G.brash[i];
      const pts = L.ellipsePts(b.x, b.y, b.w, b.h, 7, b.a);
      fillPoly(g, pts, C.ice);
      fillPoly(g, pts.slice(0, 4).concat(shift(pts.slice(0, 4), 0, b.h * 0.5).reverse()), C.iceShade);
      L.inkPath(g, pts, { closed: true, width: 1.1, color: C.ink, alpha: 0.75, seed: sd('brashInk', i), boil: bv, smooth: false, taper: [2, 2], wobble: 0.4 });
    }
    // 5 the horizon line
    L.inkLine(g, -20, HORIZON, 1100, HORIZON, { width: 2.2, color: C.inkSoft, seed: sd('horizon'), boil: bv, wobble: 0.8, taper: 0 });
  }

  // ---------------------------------------------------------------------------
  // per-frame pieces
  // ---------------------------------------------------------------------------
  function sunPos(st) {
    const x = lerp(252, 206, st.d / 17);
    const y = SUN_ARC.cy - Math.sqrt(SUN_ARC.r * SUN_ARC.r - (x - SUN_ARC.cx) * (x - SUN_ARC.cx));
    return [x, y];
  }

  function drawSun(ctx, L, st, bi) {
    const [x, y] = sunPos(st);
    const s = sd('sun');
    // rays
    const rays = new Path2D();
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * TAU + 0.1;
      const l = k % 2 ? 12 : 22;
      const j = (L.h3(k, bi, s) - 0.5) * 3;
      rays.moveTo(x + Math.cos(a) * (SUN_R + 10), y + Math.sin(a) * (SUN_R + 10));
      rays.lineTo(x + Math.cos(a) * (SUN_R + 10 + l + j), y + Math.sin(a) * (SUN_R + 10 + l + j));
    }
    ctx.save();
    ctx.strokeStyle = C.ochre;
    ctx.lineCap = 'round';
    ctx.lineWidth = 2.4;
    ctx.globalAlpha = 0.85;
    ctx.stroke(rays);
    ctx.restore();
    const disc = L.ellipsePts(x, y, SUN_R, SUN_R, 40);
    fillPoly(ctx, disc, C.sun);
    L.hatch(ctx, disc, { angle: -Math.PI / 4, spacing: 5, width: 1.2, color: C.ochre, alpha: 0.75, length: [6, 18], seed: s + 1, overshoot: 0, density: (px, py) => sstep(-10, 40, px - x + (py - y) * 0.8) });
    L.inkPath(ctx, disc, { closed: true, width: 3, seed: s + 2 });
  }

  function drawGlitter(ctx, L, st) {
    const [sx] = sunPos(st);
    const s = sd('glitter');
    const p = new Path2D();
    const q = new Path2D();
    for (let y = HORIZON + 5, row = 0; y < 1330; y += 5 + (y - HORIZON) * 0.018, row++) {
      const depth = (y - HORIZON) / 430;
      const spread = 16 + depth * 150;
      const n = 1 + (L.h3(row, st.d, s) < 0.6 ? 1 : 0) + (depth > 0.4 ? 1 : 0);
      for (let m = 0; m < n; m++) {
        const cx = sx + (L.h3(row, m + st.d * 7, s + 1) - 0.5) * 2 * spread;
        const l = 5 + depth * 26 * (0.5 + L.h3(m, row + st.d * 3, s + 2));
        (depth < 0.25 ? q : p).moveTo(cx - l, y);
        (depth < 0.25 ? q : p).lineTo(cx + l, y);
      }
    }
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = C.white;
    ctx.lineWidth = 2.2;
    ctx.globalAlpha = 0.95;
    ctx.stroke(p);
    ctx.strokeStyle = C.sun;
    ctx.lineWidth = 1.8;
    ctx.stroke(q);
    ctx.restore();
  }

  function floeOffset(i, d) {
    const f = FLOES[i];
    return [f.vx * d, f.bob * Math.sin(d * 0.85 + i * 1.7)];
  }

  // where a lifted bird is, `dc` drawings after lift-off (fractional values give the trajectory)
  const RISE = [26, 110, 260, 480, 790, 1180, 1640];
  function flightPos(b, dc) {
    // nearer birds climb faster; the far ones trail the stream out of the top
    const kk = ((b.y + 260) / 1300) * lerp(0.6, 1, clamp((b.s - 0.28) / 0.4));
    const i0 = Math.max(0, Math.floor(dc)), i1 = Math.min(RISE.length - 1, i0 + 1);
    const rise = lerp(RISE[i0], RISE[i1], dc - i0) * kk;
    const conv = Math.min(1, dc / 6);
    const xs = 560 + (b.x - 560) * 0.62;
    return [lerp(b.x, xs, conv) + 10 * Math.sin(dc * 1.3 + b.x * 0.01), b.y - 0.2 * 200 * b.s - rise];
  }

  function restSprite(L, dir, bv) {
    const U = 220;
    return sprite('rest|' + dir + '|' + bv, -0.66 * U, -0.42 * U, 1.32 * U, 0.5 * U, (g) => paintRest(g, L, U, dir, bv, sd('rest', dir, bv), { double: false }));
  }
  function flySprite(L, pose, dir, bv) {
    const U = 200;
    return sprite('fly|' + pose + '|' + dir + '|' + bv, -0.62 * U, -1.1 * U, 1.24 * U, 2.0 * U, (g) => paintFly(g, L, U, pose, dir, bv, sd('fly', pose, dir)));
  }
  function floeSprite(L, F, bv) {
    return sprite('floe|' + F.i + '|' + bv, F.bx, F.by, F.bw, F.bh, (g) => paintFloe(g, L, F, bv));
  }

  // the stretching bird's wing angle, on twos; the shake lands on each beat
  const STRETCH = [-70, -65, -61, -59, -60, -63];
  const heroTheta = (d) => STRETCH[d % 6] * DEG;

  function heroGap(d) {
    const b = BIRDS[HERO];
    const U = 200 * b.s;
    const G = wingGeo(heroTheta(d));
    const off = floeOffset(b.f, d);
    return [b.x + off[0] + G.gap[0] * U, b.y + off[1] + G.gap[1] * U];
  }

  function drawBirdsOn(ctx, L, fi, st, bv) {
    if (st.lifted) return;
    const list = [];
    for (let i = 0; i < BIRDS.length; i++) if (BIRDS[i].f === fi) list.push(i);
    list.sort((a, b) => BIRDS[a].y - BIRDS[b].y);
    const off = floeOffset(fi, st.d);
    const crouch = st.f >= CROUCH_F;
    for (const i of list) {
      const b = BIRDS[i];
      const x = b.x + off[0], y = b.y + off[1];
      const U = 200 * b.s;
      if (b.hero) {
        ctx.save();
        ctx.translate(x, y);
        if (crouch) ctx.scale(1.04, 0.9);
        paintStretch(ctx, L, U, heroTheta(st.d), undefined, sd('hero'));
        ctx.restore();
        continue;
      }
      const sp = restSprite(L, b.dir, bv);
      const kx = U / 220;
      if (crouch) blit(ctx, sp, x, y, kx * 1.05, kx * 0.88);
      else blit(ctx, sp, x, y, kx);
    }
  }

  function drawFlock(ctx, L, st, bv) {
    if (!st.lifted) return;
    const fl = [];
    for (let i = 0; i < BIRDS.length; i++) {
      const b = BIRDS[i];
      const dd = st.ld;
      const [x, y] = flightPos(b, dd);
      const ph = (i * 3 + 1) % 4;
      const pose = dd === 0 ? 0 : [2, 1, 0, 1][(dd - 1 + ph) % 4];
      const U = 190 * b.s * (1 - 0.045 * dd);
      const [xn] = flightPos(b, dd + 1);
      // nose up about 50 degrees, bill toward the way the bird faced on the ice
      const rot = b.dir * 50 * DEG + Math.atan2(xn - x, 300) * 0.4;
      fl.push({ x, y, U, pose, dir: b.dir, rot, s: b.s });
    }
    fl.sort((a, b) => a.s - b.s);
    for (const p of fl) {
      if (p.y < -p.U * 0.9) continue;
      const sp = flySprite(L, p.pose, p.dir, bv);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      blit(ctx, sp, 0, 0, p.U / 200);
      ctx.restore();
    }
    // kicked-up snow at the take-off spots
    if (st.ld <= 2) {
      const pp = new Path2D();
      for (let i = 0; i < BIRDS.length; i++) {
        const b = BIRDS[i];
        const off = floeOffset(b.f, st.d);
        for (let m = 0; m < 5; m++) {
          const a = -Math.PI * (0.15 + 0.7 * L.h3(i, m, 5));
          const r = (8 + 14 * st.ld) * b.s * (0.6 + L.h3(m, i, 6));
          const x = b.x + off[0] + Math.cos(a) * r, y = b.y + off[1] + Math.sin(a) * r * 0.6;
          const rad = Math.max(0.8, 2.2 * b.s * (1 - st.ld / 3));
          pp.moveTo(x + rad, y);
          pp.arc(x, y, rad, 0, TAU);
        }
      }
      ctx.save();
      ctx.fillStyle = C.white;
      ctx.fill(pp);
      ctx.restore();
    }
  }

  function drawAfloat(ctx, L, st) {
    for (let i = 0; i < AFLOAT.length; i++) {
      const [x0, y0, len, rot, vx] = AFLOAT[i];
      const x = x0 + vx * st.d, y = y0;
      // ripple ring round the floating feather
      ctx.save();
      ctx.strokeStyle = C.foam;
      ctx.lineWidth = 1.4;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(rot) * len * 0.5, y + Math.sin(rot) * len * 0.2, len * 0.62, len * 0.16, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
      drawFeather(ctx, L, x, y, len, rot, true, sd('afloat', i));
    }
  }

  // the three beat feathers: released from the gap in the stretching wing
  function fallerState(i, st) {
    const f0 = BEAT_F[i];
    if (st.f < f0) return null;
    const fa = FALLERS[i];
    const d = (st.f - f0) >> 1;
    const start = i < 2 ? heroGap(f0 >> 1) : (() => {
      const b = BIRDS[HERO];
      const off = floeOffset(b.f, LIFT_D);
      return [b.x + off[0] + 30, b.y + off[1] - 80];
    })();
    const dur = 11;
    const u = Math.min(1, d / dur);
    const x = lerp(start[0], fa.land[0], Math.sqrt(u)) + fa.sway * Math.sin(d * 1.25 + fa.ph) * (1 - u) + (d > dur ? 0.4 * (d - dur) : 0);
    const y = lerp(start[1], fa.land[1], u * u * 0.4 + u * 0.6) + (d === 0 ? 6 : 0);
    const rot = d >= dur ? fa.ph : fa.ph + 0.7 * Math.sin(d * 1.25 + fa.ph);
    return { x, y, len: fa.len, rot, landed: d >= dur, onIce: fa.onIce };
  }

  function drawFallers(ctx, L, st) {
    for (let i = 0; i < 3; i++) {
      const s = fallerState(i, st);
      if (!s) continue;
      if (s.landed && !s.onIce) {
        ctx.save();
        ctx.strokeStyle = C.foam;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(s.x + Math.cos(s.rot) * s.len * 0.5, s.y, s.len * 0.62, s.len * 0.16, 0, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
      drawFeather(ctx, L, s.x, s.y, s.len, s.rot, s.landed, sd('faller', i));
    }
  }

  // ---------------------------------------------------------------------------
  // overlays
  // ---------------------------------------------------------------------------
  function drawConstruction(ctx, L) {
    const s = sd('construct');
    const b = BIRDS[HERO];
    L.guideCircle(ctx, b.x, b.y - 150, 300, { color: C.inkFaint, alpha: 0.3, width: 1.5, cross: 12 });
    L.inkLine(ctx, 240, MONTH_Y, 840, MONTH_Y, { width: 1.5, color: C.inkFaint, alpha: 0.3, seed: s + 1, wobble: 0.5, taper: 0 });
    L.inkLine(ctx, b.x, 560, b.x, 1060, { width: 1.5, color: C.inkFaint, alpha: 0.2, seed: s + 2, wobble: 0.6, taper: 0 });
  }

  function drawSunArc(ctx, L, st) {
    const a0 = Math.atan2(HORIZON - SUN_ARC.cy, 980 - SUN_ARC.cx);
    const a1 = Math.atan2(HORIZON - SUN_ARC.cy, 100 - SUN_ARC.cx);
    L.arcAnnotation(ctx, SUN_ARC.cx, SUN_ARC.cy, SUN_ARC.r, a0, a1, { color: C.annYellow, width: 2.5, dash: [2, 11], arrow: 16, dot: 4.5, endTicks: 10 });
    // the sun's place on the arc
    const [x, y] = sunPos(st);
    ctx.save();
    ctx.strokeStyle = C.annYellow;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, SUN_R + 40, 0, TAU);
    ctx.globalAlpha = 0.9;
    ctx.setLineDash([10, 8]);
    ctx.stroke();
    ctx.restore();
  }

  function drawTally(ctx, L, st) {
    ctx.save();
    ctx.lineCap = 'round';
    let last = -1;
    for (let i = 0; i < 5; i++) if (st.f >= MONTH_F[i]) last = i;
    // ruler: one tick per week, drawn on to the latest month
    const age = st.f - MONTH_F[last];
    const prevX = last > 0 ? MONTH_X[last - 1] : MONTH_X[0] - 40;
    const xEnd = last === 0 ? MONTH_X[0] + 40 * L.ease.outExpo(clamp((st.f + 1) / 6)) : lerp(prevX, MONTH_X[last], L.ease.outExpo(clamp((age + 1) / 6)));
    ctx.strokeStyle = C.annYellow;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.4;
    ctx.setLineDash([2, 6]);
    ctx.beginPath();
    ctx.moveTo(MONTH_X[0] - 40, RULER_Y);
    ctx.lineTo(MONTH_X[4] + 40, RULER_Y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(MONTH_X[0] - 40, RULER_Y);
    ctx.lineTo(Math.max(MONTH_X[0] - 40, xEnd), RULER_Y);
    const step = (MONTH_X[4] - MONTH_X[0]) / 21; // 149 days, about 21 weeks
    for (let w = 0; w <= 21; w++) {
      const x = MONTH_X[0] + w * step;
      if (x > xEnd + 0.5) break;
      ctx.moveTo(x, RULER_Y);
      ctx.lineTo(x, RULER_Y - (w % 4 === 0 ? 12 : 6));
    }
    for (let i = 0; i <= last; i++) {
      if (MONTH_X[i] > xEnd + 0.5) break;
      ctx.moveTo(MONTH_X[i], RULER_Y);
      ctx.lineTo(MONTH_X[i], MONTH_Y + MONTH_R + 6);
    }
    ctx.moveTo(MONTH_X[0] - 40, RULER_Y - 12);
    ctx.lineTo(MONTH_X[0] - 40, RULER_Y + 12);
    ctx.stroke();
    // the five month circles: dashed slots, filled with a pop on their 8th
    for (let i = 0; i < 5; i++) {
      const x = MONTH_X[i];
      const a = st.f - MONTH_F[i];
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 6]);
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(x, MONTH_Y, MONTH_R, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      if (a < 0) continue;
      const pop = i === 0 ? 1 : L.ease.outBack(clamp((a + 1) / 3));
      ctx.fillStyle = C.annYellow;
      ctx.beginPath();
      ctx.arc(x, MONTH_Y, MONTH_R * pop, 0, TAU);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, MONTH_Y, MONTH_R * pop + 7, 0, TAU);
      ctx.stroke();
      if (i > 0 && a < 9) {
        const u = L.ease.outExpo((a + 1) / 9);
        ctx.globalAlpha = Math.max(0, 1 - a / 9);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, MONTH_Y, MONTH_R + 8 + 34 * u, 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
  }

  // the missing P6 as a dashed ghost in the gap, in frame px
  function heroGhost(d) {
    const b = BIRDS[HERO];
    const U = 200 * b.s;
    const G = wingGeo(heroTheta(d));
    const off = floeOffset(b.f, d);
    const pr = G.prims[GAP_P];
    return featherPoly(pr.base, pr.tip, pr.w, G.d, 1).map((p) => [b.x + off[0] + p[0] * U, b.y + off[1] + p[1] * U]);
  }

  function drawMoultRing(ctx, L, st) {
    // the ring holds on the gap while the bird rests, pulses on each beat, and lets go at lift-off
    let x, y, a = 1, r = 34;
    if (!st.lifted) {
      [x, y] = heroGap(st.d);
    } else {
      [x, y] = heroGap(LIFT_D);
      const age = st.f - LIFT_F;
      if (age >= 3) return;
      a = 0.6 * (1 - age / 3);
      r = 34 + 30 * L.ease.outExpo((age + 1) / 3);
    }
    ctx.save();
    ctx.strokeStyle = C.annMagenta;
    ctx.lineCap = 'round';
    ctx.globalAlpha = a;
    if (!st.lifted) {
      const gh = heroGhost(st.d);
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      L.tracePath(ctx, gh.slice(2, 9), false);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.stroke();
    // four short ticks
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      const an = (k * Math.PI) / 2 + Math.PI / 4;
      ctx.moveTo(x + Math.cos(an) * (r + 5), y + Math.sin(an) * (r + 5));
      ctx.lineTo(x + Math.cos(an) * (r + 15), y + Math.sin(an) * (r + 15));
    }
    ctx.stroke();
    // beat pulse
    if (!st.lifted) {
      for (const bf of BEAT_F) {
        const age = st.f - bf;
        if (age < 0 || age >= 9) continue;
        const u = L.ease.outExpo((age + 1) / 9);
        ctx.globalAlpha = 1 - age / 9;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, r + 6 + 36 * u, 0, TAU);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawNorth(ctx, L, st) {
    if (!st.lifted) return;
    const age = st.f - LIFT_F;
    const u = L.ease.outExpo(clamp((age + 1) / 6));
    const yTip = lerp(ARROW.y0, ARROW.y1, u);
    ctx.save();
    ctx.strokeStyle = C.annBlue;
    ctx.fillStyle = C.annBlue;
    ctx.lineCap = 'round';
    ctx.lineWidth = age < 2 ? 4.5 : 3;
    ctx.beginPath();
    ctx.moveTo(ARROW.x, ARROW.y0);
    ctx.lineTo(ARROW.x, yTip + 12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ARROW.x, yTip - 10);
    ctx.lineTo(ARROW.x - 13, yTip + 18);
    ctx.lineTo(ARROW.x, yTip + 11);
    ctx.lineTo(ARROW.x + 13, yTip + 18);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ARROW.x, ARROW.y0, 5, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ARROW.x - 14, ARROW.y0);
    ctx.lineTo(ARROW.x + 14, ARROW.y0);
    ctx.stroke();
    // dashed trajectories behind three of the flock, drawn on at 24 fps
    const dc = (st.f - LIFT_F) / 2;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([14, 10]);
    for (const i of [HERO, 11, 5]) {
      const b = BIRDS[i];
      const pts = [];
      for (let q = 0; q <= 24; q++) {
        const p = flightPos(b, (q / 24) * dc);
        pts.push(p);
      }
      ctx.beginPath();
      L.tracePath(ctx, pts, false);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // the shot
  // ---------------------------------------------------------------------------
  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib;
      const t = clamp(tIn, 0, info.dur);
      colours(L);
      build(L);
      const st = timing(t);
      const bi = L.boil(info.T);
      const bv = ((bi % 3) + 3) % 3;
      st.bv = bv;

      // 1 sky stripes, drifting 6 px per beat
      L.stripes(ctx, { colors: [C.cream, C.polarSky], width: 140, angle: -0.52, offset: 12 * info.T });
      // 2 the low sun
      drawSun(ctx, L, st, bi);
      // 3 clouds, bergs, sea, far pack, brash
      const sc = sprite('scenery|' + bv, 0, 0, 1080, 1920, (g) => paintScenery(g, L, bv));
      blit(ctx, sc, 0, 0);
      // 4 glitter under the sun
      drawGlitter(ctx, L, st);
      // 5 old feathers afloat
      drawAfloat(ctx, L, st);
      // 6 floes back to front, each with its birds
      for (let i = 0; i < GEO.floes.length; i++) {
        const F = GEO.floes[i];
        const off = floeOffset(i, st.d);
        blit(ctx, floeSprite(L, F, bv), F.def.x + off[0], F.def.y + off[1]);
        drawBirdsOn(ctx, L, i, st, bv);
      }
      // 7 the beat feathers
      drawFallers(ctx, L, st);
      // 8 the flock streams north
      drawFlock(ctx, L, st, bv);
      // 9, 10 construction and overlays
      drawConstruction(ctx, L);
      drawSunArc(ctx, L, st);
      drawTally(ctx, L, st);
      drawMoultRing(ctx, L, st);
      drawNorth(ctx, L, st);
    },
  });
})();
