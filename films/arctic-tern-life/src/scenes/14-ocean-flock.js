// 14 ocean-flock : Riding the winds south.
// T 26.5 to 28.0, illustrated, hard cut in.
// Open ocean from a low angle. Four loose groups of autumn terns (5, 6, 7 and 8 birds, never a V) fly
// from the upper right toward the lower left, small and far near the sun, large and near at the frame
// centre, over long open-ocean swells. The birds are non-breeding adults and juveniles: black bills,
// white foreheads, dark carpal bars, the juveniles with scaly brown-fringed mantles and short tails.
// T 27.0 the flock banks and drops with the wind lines; T 27.5 a gust surges and the flock glides with
// wings set. The camera drifts 20 px left and tilts 2 degrees across the shot.
//
// Layers, back to front:
//   1 sky: stripeCream / polarSky stripes drifting 6 px per beat, engraved sky hatching, horizon haze
//   2 construction: the sun arc's guide circle and crosshair, perspective rails and depth ticks from
//     the far flock, a ruler along the horizon
//   3 the sun at the right end of the arc, low stratus banks on the horizon
//   4 the sea from the horizon y 1200 down: long swells hatched in seaDeep, foam on the crests,
//     ripples, the sun's glitter path; the whole sea rolls left 6 px per beat
//   5 the flock, far to near; the lead bird inside the near group
//   6 overlays: curved annBlue wind lines, the dotted annYellow sun arc, the annYellow ring on the lead
(function () {
  'use strict';

  const ID = 'ocean-flock';
  const LIB = FILM.lib;
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const FR = 1 / 24;
  const P = {};
  for (const k of Object.keys(LIB.pal)) P[k] = LIB.pal[k];
  const E = LIB.ease;

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
  const sstep = (a, b, x) => {
    const t = clamp((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  const sd = (...k) => LIB.hash(ID, ...k) & 0x7fffffff;

  const B_BANK = 0.5; // T 27.0: the flock banks and drops with the wind lines
  const B_GUST = 1.0; // T 27.5: the gust, wings set
  const BEATS = [0, 0.5, 1.0]; // local beat times (T 26.5, 27.0, 27.5)
  const HORIZON = 1200;
  const ROLL_PX_PER_S = 12; // the swells roll left 6 px per beat

  // the dotted sun arc through (60, 520), (540, 220) and (1020, 520): centre (540, 754), radius 534
  const ARC_CX = 540, ARC_CY = 754, ARC_R = 534;
  const ARC_A0 = Math.atan2(520 - ARC_CY, 60 - ARC_CX);
  const ARC_A1 = Math.atan2(520 - ARC_CY, 1020 - ARC_CX);
  const SUN = [1020, 520];
  const SUN_R = 58;

  function makeCanvas(w, h) {
    if (FILM.makeCanvas) return FILM.makeCanvas(w, h);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  function trace(g, pts, closed = true) {
    for (let i = 0; i < pts.length; i++) {
      if (i === 0) g.moveTo(pts[i][0], pts[i][1]);
      else g.lineTo(pts[i][0], pts[i][1]);
    }
    if (closed) g.closePath();
  }

  function fillPoly(g, pts, color, alpha = 1) {
    g.save();
    g.globalAlpha *= alpha;
    g.fillStyle = color;
    g.beginPath();
    trace(g, pts, true);
    g.fill();
    g.restore();
  }

  function strokePoly(g, pts, color, width, alpha = 1, closed = true) {
    g.save();
    g.globalAlpha *= alpha;
    g.strokeStyle = color;
    g.lineWidth = width;
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.beginPath();
    trace(g, pts, closed);
    g.stroke();
    g.restore();
  }

  // a long engraved line (a swell crest, a construction circle): a plain stroke through the points
  // with a slow hand-drawn drift and a small per-drawing boil, far cheaper than inkPath over 1000+ px
  function engrave(g, pts, o) {
    const amp = o.wobble != null ? o.wobble : 1;
    const bamp = o.boilAmp != null ? o.boilAmp : 0.6;
    const p = new Path2D();
    let sLen = 0;
    for (let i = 0; i < pts.length; i++) {
      if (i) sLen += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      const dN = amp * LIB.noise1(sLen / 150, o.seed) + bamp * LIB.noise1(sLen / 60 + 0.37, o.seed + 7 + o.boil * 131);
      const x = pts[i][0], y = pts[i][1] + dN;
      if (i === 0) p.moveTo(x, y);
      else p.lineTo(x, y);
    }
    if (o.closed) p.closePath();
    g.save();
    g.strokeStyle = o.color;
    g.globalAlpha *= o.alpha != null ? o.alpha : 1;
    g.lineWidth = o.width;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.stroke(p);
    g.restore();
  }

  // ===========================================================================
  // The tern, as a small 3D model in millimetres
  // x runs along the body toward the tail (the head at -x), y is up, z runs out along the near wing.
  // Winter adult: length about 350 mm, span 790 mm (art bible 10.1, 10.11); juvenile: shorter tail.
  // ===========================================================================

  // body centreline: x, y, radius
  const BODY = [
    [-114, 5, 13],
    [-98, 3, 15.5],
    [-80, 1.5, 20.5],
    [-56, 0, 24.5],
    [-28, -1.5, 26],
    [2, -2, 24],
    [32, -1, 18],
    [58, 1, 11],
    [82, 2, 6],
  ];
  // the head: longer than deep, a flat crown and a steep forehead, set a little above the body axis
  const HEAD = { x: -120, y: 7, rx: 17.5, ry: 13.5, r: 14.5 };
  const BILL = { base: -136, tip: -168, half: 3.8 };
  // tail planform (x, z) from the base, forked: T1 notch and the T6 streamers
  const TAIL = {
    adult: { notch: 132, tip: 190, spread: 34, root: 78 },
    juv: { notch: 122, tip: 152, spread: 28, root: 78 },
  };

  // near wing planform (x, z): leading edge shoulder to tip, trailing edge tip back to the body
  // (long, narrow and pointed: mean chord about 65 mm for aspect ratio 12.2, the hand swept back)
  const WING_LE = [[-34, 14], [-44, 60], [-52, 105], [-56, 148], [-40, 200], [-18, 256], [10, 312], [36, 360], [60, 400]];
  const WING_TE = [[60, 400], [63, 372], [61, 332], [55, 286], [45, 236], [31, 186], [23, 140], [20, 95], [18, 55], [14, 16]];
  const WRIST = 3; // index of the wrist on the leading edge
  const P1 = 5; // index on the trailing edge where the primaries meet the secondaries
  const ZW = 148, WX = -56; // the wrist
  const SHOULDER_Y = 5;

  // arm and hand flap about the body axis; the whole wing sweeps back from the shoulder (more on the
  // downstroke) and the hand sweeps back from the wrist on the upstroke
  function flapPt(x0, z, pose) {
    const x = x0 + z * pose.bk;
    if (z <= ZW) return [x, z * Math.sin(pose.a1) + SHOULDER_Y, z * Math.cos(pose.a1)];
    const dx = x - (WX + ZW * pose.bk), dz = z - ZW;
    const sw = pose.sw * clamp(dz / 70);
    const c = Math.cos(sw), s = Math.sin(sw);
    const hx = dx * c + dz * s, hz = -dx * s + dz * c;
    return [WX + ZW * pose.bk + hx, ZW * Math.sin(pose.a1) + hz * Math.sin(pose.a2) + SHOULDER_Y, ZW * Math.cos(pose.a1) + hz * Math.cos(pose.a2)];
  }

  // a flapping pose: phase 0 wings up, 0.5 wings down (deep rowing strokes), hand flexed on the way up
  function flapPose(ph) {
    const c = Math.cos(TAU * ph);
    const a1 = 0.16 + 0.5 * c;
    return { a1, a2: a1 + 0.26 * Math.cos(TAU * ph - 0.9), sw: 0.46 * Math.max(0, -Math.sin(TAU * ph)), bk: 0.14 + 0.3 * Math.max(0, -c) };
  }
  const GLIDE = { a1: 0.1, a2: -0.05, sw: 0.22, bk: 0.2 };
  const mixPose = (a, b, k) => ({ a1: lerp(a.a1, b.a1, k), a2: lerp(a.a2, b.a2, k), sw: lerp(a.sw, b.sw, k), bk: lerp(a.bk, b.bk, k) });

  // a view: roll about the body axis, yaw (head toward the viewer), elevation (seen from below),
  // then a flat rotation on screen (the descending heading) and a scale in px per mm
  function makeView(x, y, s, roll, yaw, elev, gamma) {
    return {
      x, y, s,
      cr: Math.cos(roll), sr: Math.sin(roll),
      cy: Math.cos(yaw), sy: Math.sin(yaw),
      ce: Math.cos(elev), se: Math.sin(elev),
      cg: Math.cos(gamma), sg: Math.sin(gamma),
    };
  }
  function proj(V, x, y, z) {
    const y1 = y * V.cr - z * V.sr, z1 = y * V.sr + z * V.cr;
    const X = x * V.cy + z1 * V.sy, Z = -x * V.sy + z1 * V.cy;
    const Y = y1 * V.ce + Z * V.se, D = -y1 * V.se + Z * V.ce;
    const u = X * V.s, v = -Y * V.s;
    return [V.x + u * V.cg - v * V.sg, V.y + u * V.sg + v * V.cg, D];
  }
  // screen direction (per mm, unscaled) and depth of a model direction
  function dirOf(V, x, y, z) {
    const y1 = y * V.cr - z * V.sr, z1 = y * V.sr + z * V.cr;
    const X = x * V.cy + z1 * V.sy, Z = -x * V.sy + z1 * V.cy;
    const Y = y1 * V.ce + Z * V.se, D = -y1 * V.se + Z * V.ce;
    const u = X, v = -Y;
    return [u * V.cg - v * V.sg, u * V.sg + v * V.cg, D];
  }

  // ===========================================================================
  // Tern drawing
  // detail 0: silhouette, 1: wings, cap and bill, 2: plus feather lines, hatching, carpal bar,
  // 3: plus doubled outline, juvenile fringes, eye glint, stipple
  // ===========================================================================

  function wingGeom(V, pose, side) {
    const wp = (x, z) => {
      const q = flapPt(x, z, pose);
      return proj(V, q[0], q[1], side * q[2]);
    };
    const le = WING_LE.map(([x, z]) => wp(x, z));
    const te = WING_TE.map(([x, z]) => wp(x, z));
    const outline = le.concat(te.slice(1));
    const hand = le.slice(WRIST).concat(te.slice(1, P1 + 1));
    const arm = le.slice(0, WRIST + 1).concat(te.slice(P1));
    // upper-surface normals of arm and hand; positive depth = the upper side faces the viewer
    const nArm = dirOf(V, 0, Math.cos(pose.a1), -side * Math.sin(pose.a1));
    const nHand = dirOf(V, 0, Math.cos(pose.a2), -side * Math.sin(pose.a2));
    const tip = le[le.length - 1];
    return { wp, le, te, outline, hand, arm, upArm: nArm[2] > 0, upHand: nHand[2] > 0, depth: tip[2], side };
  }

  function centroid(pts) {
    let x = 0, y = 0;
    for (const p of pts) {
      x += p[0];
      y += p[1];
    }
    return [x / pts.length, y / pts.length];
  }

  // shadow falls on the lower right: 0 on the lit upper-left side of a form, 1 on its lower-right edge
  const fallFn = (c, R) => (px, py) => ((px - c[0]) * 0.6 + (py - c[1]) * 0.8) / R;

  function drawWing(ctx, B, W, st) {
    const d = st.detail;
    const V = st.V;
    const s = V.s;
    const lw = st.lw;
    const seed = sd('wing', B.id, W.side);
    const bi = st.bi;
    const upper = W.upArm;
    if (d === 0) {
      fillPoly(ctx, W.outline, upper ? P.mantleGrey : P.plumeShade);
      if (!W.upHand) fillPoly(ctx, W.hand, P.primaryGlow);
      strokePoly(ctx, W.outline, P.inkSoft, Math.max(0.7, lw * 0.8), 0.9);
      if (!W.upHand) strokePoly(ctx, W.te.slice(0, P1 + 1), P.capBlack, 0.9, 0.8, false);
      return;
    }
    // base colours
    fillPoly(ctx, W.outline, upper ? P.mantleGrey : P.plumeWhite);
    if (W.upHand) fillPoly(ctx, W.hand, P.mantleGrey);
    else fillPoly(ctx, W.hand, P.primaryGlow);
    const R = Math.max(12, 170 * s);
    const c = centroid(W.outline);
    const fall = fallFn(c, R);

    if (upper) {
      // carpal bar: a dark band along the leading edge of the arm, shoulder to wrist
      const bar = [];
      for (let i = 0; i <= WRIST; i++) bar.push(W.wp(WING_LE[i][0], WING_LE[i][1]));
      for (let i = WRIST; i >= 0; i--) bar.push(W.wp(WING_LE[i][0] + (i === 0 ? 10 : 17), WING_LE[i][1] + (i === WRIST ? -6 : 0)));
      fillPoly(ctx, bar, P.carpalBar, 0.95);
      if (d >= 2) {
        LIB.hatch(ctx, bar, { angle: -Math.PI / 4, spacing: 3.5, width: 1, color: P.capBlack, alpha: 0.6, length: [4, 12], gap: [1, 3], seed: seed + 1, boil: bi });
      }
      // juveniles: whitish secondaries along the trailing edge of the arm
      if (B.plum === 'juv') {
        const strip = [];
        for (let i = P1; i < WING_TE.length; i++) strip.push(W.wp(WING_TE[i][0], WING_TE[i][1]));
        for (let i = WING_TE.length - 1; i >= P1; i--) strip.push(W.wp(WING_TE[i][0] - 16, WING_TE[i][1]));
        fillPoly(ctx, strip, P.plumeWhite, 0.9);
      }
    }
    if (!W.upArm && d >= 1) {
      // the underwing: a pale grey wash along the leading edge of the hand
      const lead = [];
      for (let i = WRIST; i < WING_LE.length; i++) lead.push(W.wp(WING_LE[i][0], WING_LE[i][1]));
      for (let i = WING_LE.length - 1; i >= WRIST; i--) lead.push(W.wp(WING_LE[i][0] + 12, WING_LE[i][1] - (i === WING_LE.length - 1 ? 8 : 0)));
      if (!W.upHand) fillPoly(ctx, lead, P.plumeShade, 0.9);
    }

    if (d >= 2) {
      // feather lines: 10 primaries fanned from the hand, 14 secondaries along the arm
      const fp = new Path2D();
      const fpDark = new Path2D();
      for (let i = 0; i < 10; i++) {
        const u = i / 9;
        const tz = lerp(WING_TE[0][1] - 4, WING_TE[P1][1] + 6, u);
        const tx = teXAt(tz) - 1;
        const rx = lerp(8, WX + 40, u), rz = lerp(300, ZW + 14, u);
        const a = W.wp(rx, rz), b = W.wp(tx, tz);
        const jig = (LIB.h3(i, bi, seed) - 0.5) * 0.8;
        (i < 3 && W.upHand ? fpDark : fp).moveTo(a[0] + jig, a[1]);
        (i < 3 && W.upHand ? fpDark : fp).lineTo(b[0], b[1] + jig);
      }
      for (let i = 0; i < 14; i++) {
        const z = lerp(ZW - 4, 22, i / 13);
        const tx = teXAt(z);
        const a = W.wp(tx - 34, z - 3), b = W.wp(tx - 1, z + 2);
        fp.moveTo(a[0], a[1]);
        fp.lineTo(b[0], b[1]);
      }
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = P.mantleDeep;
      ctx.lineWidth = Math.max(0.6, 2.4 * s);
      ctx.globalAlpha = upper ? 0.62 : 0.4;
      ctx.stroke(fp);
      ctx.globalAlpha = 0.75;
      ctx.stroke(fpDark);
      ctx.restore();
      // tone: the underwing is in shadow, the upper wing only toward its trailing edge
      const tone = upper
        ? (px, py) => sstep(0.1, 0.9, fall(px, py)) * 0.8
        : (px, py) => 0.35 + 0.65 * sstep(-0.3, 0.8, fall(px, py));
      LIB.hatch(ctx, W.arm, {
        angle: -Math.PI / 4,
        spacing: lerp(5, 9, clamp(s / 0.5)),
        width: lerp(0.8, 1.4, clamp(s / 0.5)),
        color: P.mantleDeep,
        alpha: upper ? 0.7 : 0.55,
        length: [6 + 20 * s, 14 + 60 * s],
        density: tone,
        seed: seed + 3,
        boil: bi,
      });
      if (W.upHand) {
        LIB.hatch(ctx, W.hand, { angle: -Math.PI / 4, spacing: lerp(6, 10, clamp(s / 0.5)), width: lerp(0.8, 1.3, clamp(s / 0.5)), color: P.mantleDeep, alpha: 0.6, length: [6 + 20 * s, 14 + 50 * s], density: (px, py) => sstep(0.2, 1, fall(px, py)) * 0.7, seed: seed + 4, boil: bi });
      } else if (d >= 3) {
        // translucent primaries against the light: only the faintest shadow near the body
        LIB.hatch(ctx, W.hand, { angle: -Math.PI / 4, spacing: 12, width: 1, color: P.mantleDeep, alpha: 0.3, length: [10, 30], density: (px, py) => sstep(0.4, 1.2, fall(px, py)) * 0.6, seed: seed + 5, boil: bi });
      }
      if (upper && B.plum === 'juv' && d >= 3) {
        // scaly coverts: pale orangey-brown fringes in rows across the arm
        const sc = new Path2D();
        const rr = LIB.rng(seed + 9);
        for (let row = 0; row < 3; row++) {
          for (let k = 0; k < 7; k++) {
            const z = lerp(28, ZW - 6, (k + (row % 2) * 0.5) / 7);
            const x = lerp(-34, 4, row / 2) + rr.range(-3, 3);
            const a = W.wp(x - 7, z - 9), m = W.wp(x + 4, z), b = W.wp(x - 7, z + 9);
            sc.moveTo(a[0], a[1]);
            sc.quadraticCurveTo(m[0], m[1], b[0], b[1]);
          }
        }
        ctx.save();
        ctx.strokeStyle = P.juvFringe;
        ctx.lineWidth = Math.max(1, 3.2 * s);
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.9;
        ctx.stroke(sc);
        ctx.restore();
      }
    }

    // the thin black trailing edge of the primaries, seen from below
    if (!W.upHand) {
      // a band along the rear edge of the hand, inside the outline, narrowing toward the body
      const band = [];
      for (let i = 0; i <= P1; i++) band.push(W.te[i]);
      for (let i = P1; i >= 0; i--) {
        const w = lerp(7, 3.5, i / P1) + st.lw / s * 0.5;
        band.push(W.wp(WING_TE[i][0] - w, WING_TE[i][1] - (i === 0 ? 6 : 0)));
      }
      fillPoly(ctx, band, P.capBlack, 0.9);
    }
    // outline
    LIB.inkPath(ctx, W.outline, {
      closed: true,
      width: lw,
      seed: seed + 7,
      taper: [4, 10],
      wobble: 0.5 + s,
      tremble: 0.2,
      boil: bi,
      double: d >= 3 ? { width: 0.32, alpha: 0.4, from: 0.1, to: 0.45 } : false,
    });
  }

  // trailing-edge x at span z (planform), by linear interpolation of WING_TE
  function teXAt(z) {
    for (let i = 0; i < WING_TE.length - 1; i++) {
      const a = WING_TE[i], b = WING_TE[i + 1];
      if ((z <= a[1] && z >= b[1]) || (z >= a[1] && z <= b[1])) {
        const u = (z - a[1]) / (b[1] - a[1] || 1);
        return lerp(a[0], b[0], u);
      }
    }
    return WING_TE[WING_TE.length - 1][0];
  }

  function tailGeom(V, B) {
    const T = TAIL[B.plum];
    const tp = (x, z) => proj(V, x, 2 + (x - T.root) * 0.06 + z * 0.6, z);
    const outline = [
      tp(T.root - 4, -8),
      tp(lerp(T.root, T.notch, 0.6), -14),
      tp(T.tip, -T.spread),
      tp(T.tip - 10, -T.spread + 5),
      tp(T.notch, -3),
      tp(T.notch, 3),
      tp(T.tip - 10, T.spread - 5),
      tp(T.tip, T.spread),
      tp(lerp(T.root, T.notch, 0.6), 14),
      tp(T.root - 4, 8),
    ];
    const webs = [
      [tp(lerp(T.root, T.notch, 0.6), -13), tp(T.tip - 2, -T.spread + 1)],
      [tp(lerp(T.root, T.notch, 0.6), 13), tp(T.tip - 2, T.spread - 1)],
    ];
    return { outline, webs };
  }

  function drawTail(ctx, B, st) {
    const tg = tailGeom(st.V, B);
    const seed = sd('tail', B.id);
    if (st.detail === 0) {
      fillPoly(ctx, tg.outline, P.plumeWhite);
      strokePoly(ctx, tg.outline, P.inkSoft, Math.max(0.6, st.lw * 0.7), 0.9);
      return;
    }
    LIB.inkPath(ctx, tg.outline, { closed: true, smooth: false, width: st.lw * 0.8, fill: P.plumeWhite, seed, taper: [3, 6], wobble: 0.4, tremble: 0.15, boil: st.bi });
    if (st.detail >= 2) {
      // grey outer webs on the outer tail feathers
      for (const w of tg.webs) {
        LIB.inkPath(ctx, w, { width: Math.max(0.8, 4 * st.V.s), color: P.mantleGrey, seed: seed + 3, taper: [2, 8], wobble: 0.3, boil: st.bi });
      }
    }
  }

  function bodyGeom(V, inset = 0) {
    const C = BODY.map(([x, y, r]) => {
      const p = proj(V, x, y, 0);
      return [p[0], p[1], Math.max(0.3, r * V.s - inset)];
    });
    const up = dirOf(V, 0, 1, 0);
    const left = [], right = [];
    const backSide = [];
    for (let i = 0; i < C.length; i++) {
      const a = C[Math.max(0, i - 1)], b = C[Math.min(C.length - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1];
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl;
      ty /= tl;
      const nx = -ty, ny = tx;
      left.push([C[i][0] + nx * C[i][2], C[i][1] + ny * C[i][2]]);
      right.push([C[i][0] - nx * C[i][2], C[i][1] - ny * C[i][2]]);
      backSide.push(nx * up[0] + ny * up[1] > 0 ? 1 : -1);
    }
    // a rounded cap at the vent end
    const last = C[C.length - 1];
    const prev = C[C.length - 2];
    const ang = Math.atan2(last[1] - prev[1], last[0] - prev[0]);
    const cap = [];
    for (let k = 1; k < 6; k++) {
      const a = ang - Math.PI / 2 + (k / 6) * Math.PI;
      cap.push([last[0] + Math.cos(a) * last[2], last[1] + Math.sin(a) * last[2]]);
    }
    const outline = left.concat(cap.reverse(), right.slice().reverse());
    const back = backSide[3] > 0 ? left : right;
    return { C, left, right, outline, up, back };
  }

  function drawBody(ctx, B, st) {
    const V = st.V;
    const s = V.s;
    const G = bodyGeom(V);
    const seed = sd('body', B.id);
    if (st.detail === 0) {
      fillPoly(ctx, G.outline, P.plumeWhite);
      strokePoly(ctx, G.outline, P.inkSoft, Math.max(0.6, st.lw * 0.8), 0.9);
      return G;
    }
    LIB.inkPath(ctx, G.outline, { closed: true, width: st.lw, fill: P.plumeWhite, seed, taper: [4, 10], wobble: 0.5, tremble: 0.2, boil: st.bi });
    // the grey mantle along the back, wider when the back turns toward the viewer
    const f = clamp(0.55 + G.up[2] * 1.2, 0.45, 0.9);
    if (f > 0.06) {
      const strip = [];
      for (let i = 1; i < G.C.length - 1; i++) strip.push(G.back[i]);
      for (let i = G.C.length - 2; i >= 1; i--) {
        const c = G.C[i], b = G.back[i];
        strip.push([lerp(b[0], c[0], f), lerp(b[1], c[1], f)]);
      }
      fillPoly(ctx, strip, P.mantleGrey, 0.95);
      if (B.plum === 'juv' && st.detail >= 3) {
        // scaly juvenile mantle
        const sc = new Path2D();
        for (let i = 2; i < G.C.length - 2; i++) {
          const c = G.C[i], b = G.back[i];
          const mx = lerp(b[0], c[0], f * 0.5), my = lerp(b[1], c[1], f * 0.5);
          const r = Math.max(2, 7 * s);
          sc.moveTo(mx - r, my);
          sc.quadraticCurveTo(mx, my + r * 1.1, mx + r, my);
        }
        ctx.save();
        ctx.strokeStyle = P.juvFringe;
        ctx.lineWidth = Math.max(1, 3 * s);
        ctx.lineCap = 'round';
        ctx.stroke(sc);
        ctx.restore();
      }
    }
    if (st.detail >= 2) {
      const c = centroid(G.outline);
      const fall = fallFn(c, Math.max(8, 26 * s));
      LIB.hatch(ctx, G.outline, {
        angle: -Math.PI / 4,
        spacing: lerp(4, 7, clamp(s / 0.5)),
        width: lerp(0.8, 1.4, clamp(s / 0.5)),
        color: P.mantleDeep,
        alpha: 0.7,
        length: [5 + 14 * s, 10 + 40 * s],
        density: (px, py) => sstep(-0.1, 0.9, fall(px, py)),
        seed: seed + 2,
        boil: st.bi,
      });
      if (st.detail >= 3) {
        // contour strokes across the belly, on the shadow half only
        const cp = new Path2D();
        for (let i = 2; i < G.C.length - 1; i++) {
          const c0 = G.C[i];
          const l = G.left[i], r = G.right[i];
          const shade = G.back === G.left ? r : l;
          cp.moveTo(lerp(c0[0], shade[0], 0.35), lerp(c0[1], shade[1], 0.35));
          cp.quadraticCurveTo(lerp(c0[0], shade[0], 0.8) + 2, lerp(c0[1], shade[1], 0.8) + 2, lerp(c0[0], shade[0], 0.95), lerp(c0[1], shade[1], 0.95));
        }
        ctx.save();
        ctx.strokeStyle = P.mantleDeep;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 1.2;
        ctx.lineCap = 'round';
        ctx.stroke(cp);
        ctx.restore();
      }
    }
    return G;
  }

  // the winter mask: black from the eye back over the rear crown to the nape (model x, y on the midplane);
  // the forehead and the front of the crown stay white
  const CAP = [[-131.5, 8.5], [-129.5, 13.5], [-123, 18.5], [-116, 22], [-108, 21], [-100, 17.5], [-95, 12], [-100, 8], [-110, 6], [-121, 4.5], [-129, 5]];
  const EYE = { x: -126, y: 9.5, r: 2.6 };

  function headPts(V, inset) {
    const k = inset / V.s;
    const rx = Math.max(0.5, HEAD.rx - k), ry = Math.max(0.5, HEAD.ry - k);
    const out = [];
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * TAU;
      // flatten the crown: the upper half is a little lower and longer
      const up = Math.sin(a) > 0 ? 0.9 : 1;
      out.push(proj(V, HEAD.x + Math.cos(a) * rx, HEAD.y + Math.sin(a) * ry * up, 0));
    }
    return out;
  }

  function drawHead(ctx, B, st, G) {
    const V = st.V;
    const s = V.s;
    const seed = sd('head', B.id);
    const hc = proj(V, HEAD.x, HEAD.y, 0);
    const hr = HEAD.r * s;
    // bill: a slim straight wedge, black in autumn
    const b0 = proj(V, BILL.base, 5, 0), b1 = proj(V, BILL.tip, 3.5, 0);
    const bx = b1[0] - b0[0], by = b1[1] - b0[1];
    const bl = Math.hypot(bx, by) || 1;
    const nx = -by / bl, ny = bx / bl;
    const w = BILL.half * s;
    const bill = [
      [b0[0] + nx * w, b0[1] + ny * w],
      [lerp(b0[0], b1[0], 0.6) + nx * w * 0.55, lerp(b0[1], b1[1], 0.6) + ny * w * 0.55],
      [b1[0], b1[1]],
      [lerp(b0[0], b1[0], 0.6) - nx * w * 0.5, lerp(b0[1], b1[1], 0.6) - ny * w * 0.5],
      [b0[0] - nx * w, b0[1] - ny * w],
    ];
    // the mask, flattened onto the side of the head facing the viewer
    const side = dirOf(V, 0, 0, 1)[2] >= 0 ? 1 : -1;
    const cap = CAP.map(([x, y]) => proj(V, x, y, side * 4));
    const eye = proj(V, EYE.x, EYE.y, side * 8);
    const headOut = headPts(V, 0);
    const clipHead = () => {
      ctx.beginPath();
      trace(ctx, headPts(V, st.detail ? st.lw * 0.35 : 0), true);
      trace(ctx, G.outline, true);
      ctx.clip('nonzero');
    };
    if (st.detail === 0) {
      fillPoly(ctx, bill, P.juvBill);
      ctx.save();
      fillPoly(ctx, headOut, P.plumeWhite);
      clipHead();
      fillPoly(ctx, cap, P.capBlack);
      ctx.restore();
      return;
    }
    LIB.inkPath(ctx, bill, { closed: true, smooth: false, width: Math.max(0.7, st.lw * 0.55), fill: P.juvBill, seed: seed + 1, taper: [2, 4], wobble: 0.2, tremble: 0.1, boil: st.bi });
    LIB.inkPath(ctx, headOut, { closed: true, width: st.lw * 0.9, fill: P.plumeWhite, seed: seed + 2, taper: [3, 8], wobble: 0.3, tremble: 0.12, boil: st.bi });
    // one silhouette: paint out the head's line inside the neck and the neck's line inside the head
    ctx.save();
    ctx.beginPath();
    trace(ctx, bodyGeom(V, st.lw * 0.75).outline, true);
    ctx.clip();
    fillPoly(ctx, headPts(V, -st.lw), P.plumeWhite);
    ctx.restore();
    fillPoly(ctx, headPts(V, st.lw * 0.6), P.plumeWhite);
    ctx.save();
    clipHead();
    fillPoly(ctx, cap, P.capBlack, B.plum === 'juv' ? 0.85 : 1);
    if (st.detail >= 2) {
      // the white forehead flecked where it meets the mask (smudgier on the juvenile)
      const front = CAP.slice(0, 4).map(([x, y]) => proj(V, x - 5, y - 1, side * 4));
      const fl = front.concat(CAP.slice(0, 4).reverse().map(([x, y]) => proj(V, x + 3, y, side * 4)));
      LIB.stipple(ctx, fl, {
        spacing: Math.max(1.8, hr * 0.16),
        r: [0.5, Math.max(0.8, hr * 0.06)],
        color: P.capBlack,
        alpha: 0.85,
        density: B.plum === 'juv' ? 0.8 : 0.5,
        seed: seed + 3,
        boil: st.bi,
      });
    }
    ctx.restore();
    // the eye sits in the front edge of the mask; a pale lower eye-ring fleck at the largest sizes
    ctx.save();
    ctx.fillStyle = P.capBlack;
    ctx.beginPath();
    ctx.arc(eye[0], eye[1], Math.max(0.8, EYE.r * s), 0, TAU);
    ctx.fill();
    ctx.restore();
    if (st.detail >= 3) {
      // gape line
      LIB.inkLine(ctx, b0[0], b0[1], lerp(b0[0], b1[0], 0.55), lerp(b0[1], b1[1], 0.55), { width: 1, color: P.inkSoft, seed: seed + 4, taper: [1, 4], wobble: 0.2, boil: st.bi });
    }
  }
  function drawTern(ctx, B, st) {
    const nearW = wingGeom(st.V, st.pose, 1);
    const farW = wingGeom(st.V, st.pose, -1);
    const [w0, w1] = nearW.depth >= farW.depth ? [farW, nearW] : [nearW, farW];
    drawWing(ctx, B, w0, st);
    drawTail(ctx, B, st);
    const G = drawBody(ctx, B, st);
    drawHead(ctx, B, st, G);
    drawWing(ctx, B, w1, st);
    // the visual centre of the drawn bird: the body centre pulled halfway to the middle of its bounds
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const poly of [nearW.outline, farW.outline, G.outline]) {
      for (const q of poly) {
        if (q[0] < x0) x0 = q[0];
        if (q[0] > x1) x1 = q[0];
        if (q[1] < y0) y0 = q[1];
        if (q[1] > y1) y1 = q[1];
      }
    }
    const bc = centroid(G.C);
    return [lerp(bc[0], (x0 + x1) / 2, 0.5), lerp(bc[1], (y0 + y1) / 2, 0.5)];
  }

  // ===========================================================================
  // The flock: four loose groups (world pixels at t = 0), never a V
  // span = wingspan on screen in px; gamma = the descending heading on screen
  // ===========================================================================

  const GROUPS = [
    // far: 5 small birds under the top of the sun arc
    { c: [790, 350], yaw: 0.1, elev: 0.36, birds: [[-72, -4, 50], [-22, -38, 44], [28, 8, 56], [76, -26, 42], [2, 40, 48]] },
    // 6 birds upper left
    { c: [250, 500], yaw: 0.16, elev: 0.32, birds: [[-122, -18, 92], [-46, -72, 82], [24, 0, 110], [112, -52, 86], [72, 56, 100], [-64, 62, 96]] },
    // 7 birds middle right
    { c: [790, 745], yaw: 0.2, elev: 0.3, birds: [[-190, -20, 168], [-95, -112, 150], [0, -10, 204], [115, -98, 158], [150, 50, 190], [36, 112, 178], [-140, 96, 160]] },
    // near: 8 birds around the frame centre, the lead first
    { c: [540, 1150], yaw: 0.22, elev: 0.26, birds: [[20, -50, 640], [-330, -230, 330], [340, -260, 300], [380, 180, 430], [-320, 220, 460], [0, 410, 520], [-470, -30, 290], [-170, -400, 270]] },
  ];



  const FLOCK = (() => {
    const out = [];
    let id = 0;
    GROUPS.forEach((G, gi) => {
      G.birds.forEach((b, bi) => {
        const r = LIB.rng(sd('bird', gi, bi));
        const lead = gi === 3 && bi === 0;
        const span = b[2];
        out.push({
          id: id++,
          g: gi,
          lead,
          x0: G.c[0] + b[0],
          y0: G.c[1] + b[1],
          span,
          s: span / 790,
          gamma: (-17 + r.range(-6, 5)) * DEG,
          yaw: G.yaw + r.range(-0.12, 0.12),
          elev: G.elev + r.range(-0.08, 0.08),
          roll: r.range(-0.3, 0.3),
          freq: r.range(1.8, 2.3),
          ph: r(),
          plum: lead ? 'adult' : r() < 0.42 ? 'juv' : 'adult',
          glide: r.range(-0.08, 0.1),
          speed: 0.2 * span + [55, 45, 30, 10][gi],
          bob: 0.022 * span,
        });
      });
    });
    // far to near
    return out.sort((a, b) => a.span - b.span);
  })();

  const detailFor = (s) => (s < 0.075 ? 0 : s < 0.14 ? 1 : s < 0.3 ? 2 : 3);

  // the bank on T 27.0: in over three drawings with a little overshoot, easing back to 55 percent
  function bankAt(tq) {
    const u = tq - B_BANK;
    if (u < -1e-6) return 0;
    const n = Math.floor(u * 12 + 1e-6);
    const pop = [0.62, 1.06, 1][Math.min(2, n)];
    return pop * (1 - 0.45 * sstep(0.25, 0.5, u));
  }
  const dropAt = (tq) => (tq < B_BANK - 1e-6 ? 0 : E.outCubic(clamp((tq - B_BANK + 1 / 12) / 0.25)));
  // wings set on T 27.5, visible on the beat frame
  function glideAt(tq) {
    const u = tq - B_GUST;
    if (u < -1e-6) return 0;
    return [0.7, 0.95, 1][Math.min(2, Math.floor(u * 12 + 1e-6))];
  }

  function birdState(B, tq, bi) {
    const bank = bankAt(tq);
    const gl = glideAt(tq);
    const ph = (B.ph + B.freq * Math.min(tq, B_GUST)) % 1;
    const pose = mixPose(flapPose(ph), { a1: GLIDE.a1 + B.glide, a2: GLIDE.a2 + B.glide * 0.5, sw: GLIDE.sw, bk: GLIDE.bk }, gl);
    const dist = B.speed * tq + B.speed * 0.25 * Math.max(0, tq - B_GUST);
    const gamma = B.gamma - 0.07 * bank;
    const dirx = -Math.cos(B.gamma), diry = -Math.sin(B.gamma);
    const bob = -Math.sin(TAU * ph) * B.bob * (1 - gl);
    const x = B.x0 + dirx * dist;
    const y = B.y0 + diry * dist + bob + dropAt(tq) * 0.1 * B.span;
    const V = makeView(x, y, B.s, B.roll + 0.34 * bank + 0.5 * gl, B.yaw, B.elev + 0.12 * gl, gamma);
    const detail = detailFor(B.s);
    const lw = clamp(B.s * 7.2, 0.9, 3.8);
    return { V, pose, detail, lw, bi, x, y };
  }

  // ===========================================================================
  // Sea: swell rows from the horizon down, tabulated every 6 px
  // ===========================================================================

  const SEA_BOX = { x: -150, y: HORIZON - 6, w: 1380, h: 830 };
  const ROWS = 22;
  const SWELLS = (() => {
    const rows = [];
    for (let k = 0; k < ROWS; k++) {
      const d = (k + 1) / ROWS;
      const y = HORIZON + 5 + 770 * Math.pow(d, 1.75);
      const r = LIB.rng(sd('swell', k));
      const amp = 1 + 40 * Math.pow(d, 2.2);
      const lam = 200 + 1300 * d;
      const ph1 = r() * TAU, ph2 = r() * TAU;
      const tab = [];
      const hgt = [];
      for (let x = SEA_BOX.x; x <= SEA_BOX.x + SEA_BOX.w; x += 6) {
        const w = 0.62 * Math.sin((TAU * x) / lam + ph1) + 0.38 * Math.sin((TAU * x) / (lam * 0.43) + ph2);
        const n = LIB.noise1(x * 0.01 + k * 3.1, sd('swn', k));
        tab.push([x, y - amp * w + n * amp * 0.25]);
        hgt.push(w + n * 0.2);
      }
      rows.push({ k, d, y, amp, tab, hgt });
    }
    for (let k = 0; k < ROWS; k++) rows[k].gapNext = (k + 1 < ROWS ? rows[k + 1].y : rows[k].y + 130) - rows[k].y;
    return rows;
  })();

  // engraved contour strokes that follow a swell's crest line down its face: dense and dark under the
  // crest where the swell stands high, thinning out over the lit face toward the next crest
  function contourStrokes(g, row, v) {
    const d = row.d;
    const sp = lerp(2.4, 7.5, d);
    const hShade = row.gapNext * lerp(0.5, 0.72, d);
    const m = Math.max(1, Math.floor(hShade / sp));
    const mAll = Math.max(m + 1, Math.floor((row.gapNext * 0.95) / sp));
    const r = LIB.rng(sd('contour', row.k, v));
    const paths = [new Path2D(), new Path2D(), new Path2D()];
    const n = row.tab.length;
    for (let j = 1; j < mAll; j++) {
      const shade = j <= m;
      const dens = shade ? Math.pow(1 - j / (m + 1), 0.8) : 0.09;
      const bucket = shade ? (j < m * 0.4 ? 0 : 1) : 2;
      let i = Math.floor(r() * 4);
      while (i < n - 1) {
        const segLen = Math.max(2, Math.round((lerp(18, 110, d) * r.range(0.4, 1.3)) / 6));
        const gap = Math.max(1, Math.round((lerp(4, 22, d) * r.range(0.5, 1.6)) / 6));
        const i1 = Math.min(n - 1, i + segLen);
        const hmid = row.hgt[(i + i1) >> 1];
        const want = dens * (shade ? 0.5 + 0.5 * clamp(0.5 + hmid * 0.7) : 1);
        if (r() < want) {
          const p = paths[bucket];
          const sag = j * sp;
          for (let q = i; q <= i1; q++) {
            const x = row.tab[q][0];
            const y = row.tab[q][1] + sag * (0.8 + 0.35 * clamp(0.5 + row.hgt[q] * 0.5)) + (LIB.h3(q, j, row.k + v * 97) - 0.5) * 0.7;
            if (q === i) p.moveTo(x, y);
            else p.lineTo(x, y);
          }
        }
        i = i1 + gap;
      }
    }
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.strokeStyle = P.tealDeep;
    g.globalAlpha = 0.85;
    g.lineWidth = lerp(0.9, 2.1, d);
    g.stroke(paths[0]);
    g.strokeStyle = P.seaDeep;
    g.globalAlpha = 0.9;
    g.lineWidth = lerp(0.8, 1.6, d);
    g.stroke(paths[1]);
    g.globalAlpha = 0.6;
    g.lineWidth = lerp(0.7, 1.3, d);
    g.stroke(paths[2]);
    g.restore();
  }

  function drawSea(g, v) {
    const bx = SEA_BOX;
    g.fillStyle = P.sea;
    g.fillRect(bx.x, HORIZON, bx.w, bx.h);
    // far water: dense engraved lines under the horizon, thinning downward
    LIB.hatch(g, null, {
      bounds: { x: bx.x, y: HORIZON, w: bx.w, h: 70 },
      angle: 0,
      spacing: 2.6,
      width: 1.1,
      color: P.seaDeep,
      alpha: 0.85,
      length: [30, 120],
      gap: [3, 14],
      density: (x, y) => 1 - sstep(HORIZON, HORIZON + 70, y) * 0.7,
      seed: sd('farwater'),
      boil: v,
    });
    for (let k = 0; k < ROWS; k++) {
      const row = SWELLS[k];
      const d = row.d;
      contourStrokes(g, row, v);
      if (d > 0.35) {
        // cross layer in the deepest part of the near troughs
        const h = row.gapNext * 0.32;
        const band = row.tab.map(([x, y]) => [x, y + 2]);
        for (let i = row.tab.length - 1; i >= 0; i--) band.push([row.tab[i][0], row.tab[i][1] + h * (0.6 + 0.4 * clamp(0.5 + row.hgt[i] * 0.6))]);
        LIB.hatch(g, band, {
          angle: -0.5,
          spacing: lerp(5, 8, d),
          width: 1.2,
          color: P.tealDeep,
          alpha: 0.55,
          length: [10, 40],
          density: (x) => sstep(0.1, 0.8, row.hgt[clamp(Math.round((x - bx.x) / 6), 0, row.hgt.length - 1)]),
          seed: sd('swellx', k),
          boil: v,
        });
      }
      // the crest line
      engrave(g, row.tab, { width: lerp(0.8, 2.8, d), color: P.tealDeep, alpha: lerp(0.45, 0.95, d), seed: sd('crest', k), wobble: 0.6 + 1.4 * d, boil: v });
      if (d > 0.4) engrave(g, row.tab.map(([x, y]) => [x, y + 2.5]), { width: 1, color: P.tealDeep, alpha: 0.5, seed: sd('crest2', k), wobble: 1.4, boil: v });
      // foam: runs along the crests where the swell stands highest, with spray above them
      let run = [];
      const flush = () => {
        if (run.length > 3) {
          LIB.inkPath(g, run, { width: lerp(1.4, 6.5, d), color: P.foam, seed: sd('foam', k, run[0][0] | 0), taper: [6, 18], wobble: 0.8, boil: v });
        }
        run = [];
      };
      for (let i = 0; i < row.tab.length; i++) {
        if (row.hgt[i] > 0.5 + 0.2 * LIB.noise1(i * 0.21, sd('foamn', k))) run.push([row.tab[i][0], row.tab[i][1] - lerp(1, 3, d)]);
        else flush();
      }
      flush();
      if (d > 0.25) {
        const cap = row.tab.map(([x, y]) => [x, y - lerp(3, 14, d)]);
        for (let i = row.tab.length - 1; i >= 0; i--) cap.push([row.tab[i][0], row.tab[i][1] + lerp(2, 6, d)]);
        LIB.stipple(g, cap, {
          spacing: lerp(4.5, 6.5, d),
          r: [0.8, lerp(1.4, 2.4, d)],
          color: P.foam,
          alpha: 0.95,
          density: (x) => sstep(0.35, 0.85, row.hgt[clamp(Math.round((x - bx.x) / 6), 0, row.hgt.length - 1)]),
          seed: sd('foamdots', k),
          boil: v,
        });
      }
    }
    // the sun's glitter path under the sun
    const gr = LIB.rng(sd('glitter', v));
    const gp = new Path2D();
    for (let i = 0; i < 110; i++) {
      const u = Math.pow(gr(), 1.3);
      const y = HORIZON + 4 + u * 600;
      const half = 16 + u * 150;
      const x = SUN[0] - 30 * u + gr.range(-half, half);
      const len = 6 + u * 34 * gr.range(0.4, 1);
      const th = 1 + u * 2.2;
      gp.moveTo(x - len / 2, y);
      gp.lineTo(x + len / 2, y);
      gp.lineTo(x + len / 2 - 2, y + th);
      gp.lineTo(x - len / 2 + 2, y + th);
      gp.closePath();
    }
    g.save();
    g.fillStyle = P.foam;
    g.globalAlpha = 0.9;
    g.fill(gp);
    g.restore();
    // the horizon line
    LIB.inkLine(g, bx.x, HORIZON, bx.x + bx.w, HORIZON, { width: 2.2, color: P.inkSoft, seed: sd('horizon'), taper: [0, 0], wobble: 0.6, boil: v });
  }

  // ===========================================================================
  // Sky: engraved hatching, haze, construction, sun and stratus (no stripes: they drift per frame)
  // ===========================================================================

  const SKY_BOX = { x: -150, y: -120, w: 1380, h: HORIZON + 126 };

  const CLOUDS = [
    { x0: -140, x1: 360, yb: 1192, h: 30, seed: 1 },
    { x0: 250, x1: 560, yb: 1170, h: 14, seed: 2 },
    { x0: 600, x1: 1240, yb: 1190, h: 44, seed: 3 },
    { x0: 820, x1: 1100, yb: 1128, h: 16, seed: 4 },
  ];
  function cloudPoly(c) {
    const pts = [];
    const n = Math.ceil((c.x1 - c.x0) / 10);
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const x = lerp(c.x0, c.x1, u);
      const env = Math.pow(Math.sin(Math.PI * u), 0.55);
      const bump = 0.65 + 0.35 * Math.abs(Math.sin(u * 7.3 + c.seed)) + 0.15 * LIB.noise1(u * 9, sd('cl', c.seed));
      pts.push([x, c.yb - c.h * env * bump]);
    }
    for (let i = n; i >= 0; i--) pts.push([lerp(c.x0, c.x1, i / n), c.yb + 2 * Math.sin(i * 0.9)]);
    return pts;
  }
  const CLOUD_POLYS = CLOUDS.map(cloudPoly);

  // mares' tails: high cirrus combed out by the wind, hooked at the upwind (right) end
  const CIRRUS = [
    { x0: 120, x1: 520, y: 150, sag: 26, hook: 22 },
    { x0: 560, x1: 1060, y: 118, sag: 18, hook: 30 },
    { x0: -60, x1: 300, y: 330, sag: 20, hook: 16 },
    { x0: 380, x1: 760, y: 610, sag: 16, hook: 18 },
    { x0: 40, x1: 360, y: 880, sag: 14, hook: 14 },
    { x0: 620, x1: 1100, y: 1010, sag: 12, hook: 16 },
  ];
  function drawCirrus(g, v) {
    CIRRUS.forEach((c, ci) => {
      const r = LIB.rng(sd('cirrus', ci));
      const strands = 3 + (ci % 3);
      for (let k = 0; k < strands; k++) {
        const pts = [];
        const off = (k - strands / 2) * 5 + r.range(-2, 2);
        const x0 = c.x0 + r.range(0, 60), x1 = c.x1 - r.range(0, 50);
        for (let i = 0; i <= 20; i++) {
          const u = i / 20;
          const x = lerp(x0, x1, u);
          // the strand dips through the middle and curls up into a hook at its right end
          const y = c.y + off + c.sag * Math.sin(Math.PI * u) - c.hook * Math.pow(sstep(0.75, 1, u), 1.5);
          pts.push([x, y]);
        }
        LIB.inkPath(g, pts, { width: r.range(3, 7), color: P.white, alpha: 0.9, seed: sd('cir', ci, k), taper: [60, 20], wobble: 1.5, boil: v });
        if (k % 2 === 0) LIB.inkPath(g, pts.map(([x, y]) => [x, y + 4]), { width: 1.1, color: P.inkFaint, alpha: 0.5, seed: sd('cirl', ci, k), taper: [50, 16], wobble: 1.5, boil: v });
      }
    });
  }

  // perspective: the flock comes from a vanishing point beyond the far group
  const VP = [900, 250];
  const RAILS = [[-150, 980], [-150, 1560], [180, 1960]];

  function drawSkyStatic(g, v) {
    const bx = SKY_BOX;
    // engraved sky: horizontal lines deepening toward the top
    LIB.hatch(g, null, {
      bounds: { x: bx.x, y: bx.y, w: bx.w, h: 620 },
      angle: 0,
      spacing: 6,
      width: 1.1,
      color: P.inkFaint,
      alpha: 0.32,
      length: [40, 150],
      gap: [5, 18],
      density: (x, y) => 1 - sstep(-60, 480, y),
      seed: sd('skyhatch'),
      boil: v,
    });
    // cool haze near the horizon
    LIB.hatch(g, null, {
      bounds: { x: bx.x, y: 1000, w: bx.w, h: HORIZON - 1000 },
      angle: 0,
      spacing: 6,
      width: 1.3,
      color: P.plumeWhite,
      alpha: 0.6,
      length: [30, 120],
      gap: [6, 20],
      density: (x, y) => sstep(1020, 1195, y) * 0.9,
      seed: sd('haze'),
      boil: v,
    });
    drawCirrus(g, v);
    // construction: the sun arc's guide circle over the sky, crosshair on the sun, rails and ticks
    g.save();
    g.beginPath();
    g.rect(bx.x, bx.y, bx.w, HORIZON - bx.y);
    g.clip();
    engrave(g, LIB.ellipsePts(ARC_CX, ARC_CY, ARC_R, ARC_R, 220), { closed: true, width: 1.5, color: P.inkFaint, alpha: 0.16, seed: sd('guide'), wobble: 1.2, boil: v });
    LIB.guideCircle(g, ARC_CX, ARC_CY, 0.01, { color: P.inkFaint, alpha: 0.3, width: 1.5, cross: 16 });
    LIB.guideCircle(g, ARC_CX, ARC_CY, ARC_R - 60, { color: P.inkFaint, alpha: 0.18, width: 1.2, dash: [6, 10] });
    g.restore();
    const cst = { width: 1.5, color: P.inkFaint, alpha: 0.3, wobble: 0.6, taper: [10, 20], boil: v };
    LIB.inkLine(g, SUN[0] - 110, SUN[1], SUN[0] + 110, SUN[1], Object.assign({ seed: sd('sx') }, cst));
    LIB.inkLine(g, SUN[0], SUN[1] - 110, SUN[0], SUN[1] + 110, Object.assign({ seed: sd('sy') }, cst));
    LIB.inkLine(g, ARC_CX, ARC_CY, SUN[0], SUN[1], Object.assign({ seed: sd('radius') }, cst, { alpha: 0.22 }));
    RAILS.forEach((r, i) => {
      // stopped at the horizon so they never cross the sea
      const u = (HORIZON - 4 - VP[1]) / (r[1] - VP[1]);
      LIB.inkLine(g, VP[0], VP[1], lerp(VP[0], r[0], u), lerp(VP[1], r[1], u), Object.assign({ seed: sd('rail', i) }, cst, { alpha: 0.1 }));
    });
    // depth ticks down the lower rail, opening up toward the camera
    const tk = new Path2D();
    const r0 = RAILS[1];
    for (let i = 1; i < 12; i++) {
      const u = Math.pow(i / 12, 1.6);
      const x = lerp(VP[0], r0[0], u), y = lerp(VP[1], r0[1], u);
      if (y > HORIZON - 4) break;
      const L = 6 + 16 * u;
      tk.moveTo(x - L * 0.5, y - L * 0.35);
      tk.lineTo(x + L * 0.5, y + L * 0.35);
    }
    g.save();
    g.strokeStyle = P.inkFaint;
    g.globalAlpha = 0.25;
    g.lineWidth = 1.5;
    g.lineCap = 'round';
    g.stroke(tk);
    g.restore();
    // the vanishing point
    LIB.guideCircle(g, VP[0], VP[1], 10, { color: P.inkFaint, alpha: 0.4, width: 1.2, cross: 18 });
    // a ruler along the horizon: 7 px ticks every 30 px, 16 px every 150 px
    const rt = new Path2D();
    for (let x = -120; x <= 1200; x += 30) {
      const L = x % 150 === 0 ? 16 : 7;
      rt.moveTo(x, HORIZON - 3);
      rt.lineTo(x, HORIZON - 3 - L);
    }
    g.save();
    g.strokeStyle = P.inkFaint;
    g.globalAlpha = 0.45;
    g.lineWidth = 1.4;
    g.stroke(rt);
    g.restore();

    drawSun(g, v);

    // low stratus on the horizon: white banks, hatched undersides
    CLOUDS.forEach((c, i) => {
      const poly = CLOUD_POLYS[i];
      LIB.inkPath(g, poly, { closed: true, width: 1.8, color: P.inkSoft, fill: P.white, seed: sd('cloud', i), taper: [6, 14], wobble: 1, boil: v });
      LIB.hatch(g, poly, {
        angle: 0,
        spacing: 4,
        width: 1,
        color: P.iceDeep,
        alpha: 0.75,
        length: [14, 50],
        density: (x, y) => sstep(c.yb - c.h * 0.55, c.yb, y),
        seed: sd('cloudh', i),
        boil: v,
      });
    });
  }

  function drawSun(g, v) {
    const [x, y] = SUN;
    const R = SUN_R;
    const seed = sd('sun');
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU + 0.11;
      const r0 = R + 14, r1 = R + (i % 2 ? 30 : 46);
      LIB.inkLine(g, x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * r1, y + Math.sin(a) * r1, { width: 3.4, seed: seed + i, taper: [2, 9], wobble: 0.4, boil: v });
    }
    const disc = LIB.ellipsePts(x, y, R, R, 48);
    LIB.inkPath(g, disc, { closed: true, fill: P.sun, width: 3.8, seed: seed + 20, boil: v, double: { offset: 5, width: 0.3, alpha: 0.35, from: 0.3, to: 0.62 } });
    const fall = (px, py) => ((px - x) * 0.6 + (py - y) * 0.8) / R;
    LIB.hatch(g, disc, { spacing: 5, width: 1.3, color: P.ochre, alpha: 0.85, seed: seed + 21, length: [8, 30], density: (px, py) => sstep(0.0, 0.75, fall(px, py)), boil: v });
    LIB.hatch(g, disc, { angle: -Math.PI / 4 - Math.PI / 3, spacing: 7, width: 1.2, color: P.ochre, alpha: 0.8, seed: seed + 23, length: [6, 20], density: (px, py) => sstep(0.35, 0.8, fall(px, py)), boil: v });
  }

  // each boil drawing of the static sky and sea is rendered once (a pure function of the drawing
  // index and the render scale) and reused
  const VARIANTS = 3;
  const LAYERS = new Map();
  function layer(kind, v, S) {
    const key = kind + '|' + v + '|' + S;
    let c = LAYERS.get(key);
    if (c) return c;
    const box = kind === 'sea' ? SEA_BOX : SKY_BOX;
    c = makeCanvas(Math.ceil(box.w * S), Math.ceil(box.h * S));
    const g = c.getContext('2d');
    g.scale(S, S);
    g.translate(-box.x, -box.y);
    if (kind === 'sea') drawSea(g, v);
    else drawSkyStatic(g, v);
    LAYERS.set(key, c);
    return c;
  }

  // ===========================================================================
  // Overlays
  // ===========================================================================

  // wind lines: long curves sweeping right to left, sampled from control points (world px)
  const WIND = [
    { pts: [[1180, 250], [900, 236], [640, 268], [400, 330], [170, 420], [-140, 560]], u0: 0.62, len: 0.58 },
    { pts: [[1180, 470], [940, 440], [690, 470], [450, 545], [230, 650], [-140, 830]], u0: 0.15, len: 0.5 },
    { pts: [[1180, 640], [960, 600], [700, 620], [470, 700], [250, 820], [-140, 1010]], u0: 0.9, len: 0.62 },
    { pts: [[1180, 930], [980, 890], [760, 910], [520, 980], [300, 1090], [-140, 1280]], u0: 0.45, len: 0.6 },
    { pts: [[1180, 1330], [940, 1290], [700, 1320], [460, 1400], [220, 1500], [-140, 1640]], u0: 0.3, len: 0.64 },
  ];
  // extra lines that break in with the gust
  const GUST = [
    { pts: [[1180, 420], [930, 380], [680, 410], [420, 480], [180, 590], [-140, 740]], len: 0.6 },
    { pts: [[1180, 1110], [950, 1060], [700, 1080], [460, 1160], [230, 1270], [-140, 1440]], len: 0.6 },
    { pts: [[1180, 740], [980, 700], [740, 720], [500, 790], [280, 900], [-140, 1080]], len: 0.55 },
  ];

  function catmull(pts, n) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        out.push([
          0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
        ]);
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  const WIND_S = WIND.map((w) => catmull(w.pts, 16));
  const GUST_S = GUST.map((w) => catmull(w.pts, 16));

  // the visible stretch [a, b] (0..1 of the curve), dipped by `dip` px through its middle
  function windPiece(S, a, b, dip) {
    const n = S.length - 1;
    const out = [];
    const i0 = Math.max(0, Math.floor(a * n)), i1 = Math.min(n, Math.ceil(b * n));
    for (let i = i0; i <= i1; i++) {
      const u = i / n;
      if (u < a - 1e-9 || u > b + 1e-9) continue;
      out.push([S[i][0], S[i][1] + dip * Math.sin(Math.PI * u)]);
    }
    return out;
  }

  function arrowHead(ctx, pts, size, color) {
    if (pts.length < 3) return;
    const e = pts[pts.length - 1], q = pts[pts.length - 3];
    let tx = e[0] - q[0], ty = e[1] - q[1];
    const l = Math.hypot(tx, ty) || 1;
    tx /= l;
    ty /= l;
    const nx = -ty, ny = tx;
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(e[0] + tx * size * 0.4, e[1] + ty * size * 0.4);
    ctx.lineTo(e[0] - tx * size * 0.75 + nx * size * 0.45, e[1] - ty * size * 0.75 + ny * size * 0.45);
    ctx.lineTo(e[0] - tx * size * 0.45, e[1] - ty * size * 0.45);
    ctx.lineTo(e[0] - tx * size * 0.75 - nx * size * 0.45, e[1] - ty * size * 0.75 - ny * size * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function strokeLine(ctx, pts, color, width) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    trace(ctx, pts, false);
    ctx.stroke();
    ctx.restore();
  }

  function drawWind(ctx, t, hole) {
    const blue = P.annBlue;
    // the lines pass behind the lead's ring: a clean window around the lead
    ctx.save();
    if (hole) {
      ctx.beginPath();
      ctx.rect(-200, -200, 1480, 2400);
      ctx.arc(hole[0], hole[1], hole[2], 0, TAU, true);
      ctx.clip('evenodd');
    }
    // head travels along the curve; the gust doubles its speed and stretches the streak
    const surge = t < B_GUST - 1e-6 ? 0 : E.outExpo(clamp((t - B_GUST + FR) / (6 * FR)));
    const dip = 34 * (t < B_BANK - 1e-6 ? 0 : E.outCubic(clamp((t - B_BANK + FR) / (6 * FR)))) * (1 - 0.4 * sstep(0.5, 1.0, t));
    const width = 2.5 + 1 * surge;
    WIND.forEach((w, i) => {
      const S = WIND_S[i];
      const head = w.u0 + 0.5 * t + 0.9 * Math.max(0, t - B_GUST);
      const len = w.len * (1 + 0.5 * surge);
      const period = 1 + len;
      const h = ((head % period) + period) % period;
      const a = clamp(h - len), b = clamp(h);
      if (b - a < 0.01) return;
      const pts = windPiece(S, a, b, dip * (0.6 + 0.2 * i));
      strokeLine(ctx, pts, blue, width);
      if (h <= 1) arrowHead(ctx, pts, 20 + 6 * surge, blue);
      // short parallel streak riding just behind the head
      if (b - a > 0.12) {
        const tail = windPiece(S, Math.max(a, b - 0.12), b - 0.02, dip * (0.6 + 0.2 * i)).map(([x, y]) => [x + 10, y + 16]);
        strokeLine(ctx, tail, blue, 2);
      }
    });
    // the gust: three more lines break in from the right edge on T 27.5
    if (t >= B_GUST - 1e-6) {
      GUST.forEach((w, i) => {
        const u = t - B_GUST + FR;
        const b = clamp(E.outExpo(clamp(u / (6 * FR))) * 0.55 + u * 0.5);
        const a = clamp(b - w.len);
        const pts = windPiece(GUST_S[i], Math.max(0, a), b, 0);
        if (pts.length < 2) return;
        strokeLine(ctx, pts, blue, 2.5 + surge);
        arrowHead(ctx, pts, 22, blue);
      });
    }
    ctx.restore();
  }

  function drawSunArc(ctx) {
    ctx.save();
    ctx.strokeStyle = P.annYellow;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.setLineDash([0.01, 9]);
    ctx.beginPath();
    ctx.arc(ARC_CX, ARC_CY, ARC_R, ARC_A0, ARC_A1);
    ctx.stroke();
    ctx.setLineDash([]);
    // end ticks at both feet of the arc
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const a of [ARC_A0, ARC_A1]) {
      ctx.moveTo(ARC_CX + Math.cos(a) * (ARC_R - 10), ARC_CY + Math.sin(a) * (ARC_R - 10));
      ctx.lineTo(ARC_CX + Math.cos(a) * (ARC_R + 10), ARC_CY + Math.sin(a) * (ARC_R + 10));
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawLeadRing(ctx, st, B, t) {
    const R = B.span * 0.32;
    const x = st.cx, y = st.cy;
    ctx.save();
    ctx.strokeStyle = P.annYellow;
    ctx.lineWidth = 3;
    // the ring pulses on each beat: a quick squeeze-and-open and an echo that expands and fades
    let beat = 0;
    for (const tb of BEATS) if (t >= tb - 1e-6) beat = tb;
    const u = t - beat;
    const pulse = E.outExpo(clamp((u + FR) / (5 * FR)));
    ctx.beginPath();
    ctx.arc(x, y, R * lerp(0.9, 1, pulse), 0, TAU);
    ctx.stroke();
    const e = clamp((u + FR) / (10 * FR));
    if (e < 1) {
      ctx.globalAlpha = 1 - e;
      ctx.beginPath();
      ctx.arc(x, y, R * lerp(1.0, 1.3, E.outExpo(e)), 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
    // four short ticks on the ring
    const tk = new Path2D();
    for (let k = 0; k < 4; k++) {
      const a = k * (Math.PI / 2) + Math.PI / 4;
      tk.moveTo(x + Math.cos(a) * (R - 8), y + Math.sin(a) * (R - 8));
      tk.lineTo(x + Math.cos(a) * (R + 12), y + Math.sin(a) * (R + 12));
    }
    ctx.save();
    ctx.strokeStyle = P.annYellow;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke(tk);
    ctx.restore();
  }

  // ===========================================================================
  // Scene
  // ===========================================================================

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const dur = info.dur;
      const t = clamp(tIn, 0, dur);
      const tq = Math.min(LIB.onTwos(t), dur);
      const p = t / dur;
      const S = info.S || FILM.S || 1;
      const bi = LIB.boil(info.T);
      const v = bi % VARIANTS;
      const cam = { x: 540 - 20 * p, y: 960, rot: -2 * DEG * p };
      LIB.camera(ctx, cam, () => {
        // 1 sky stripes, drifting 6 px per beat on the global clock
        LIB.stripes(ctx, { colors: [P.stripeCream, P.polarSky], width: 140, angle: -0.52, offset: (info.T / 0.5) * 6, bounds: { x: -150, y: -120, w: 1380, h: HORIZON + 130 }, seed: sd('stripes') });
        // 2, 3 static sky
        ctx.drawImage(layer('sky', v, S), SKY_BOX.x, SKY_BOX.y, SKY_BOX.w, SKY_BOX.h);
        // 4 sea, rolling left
        const roll = -ROLL_PX_PER_S * tq;
        ctx.drawImage(layer('sea', v, S), SEA_BOX.x + roll, SEA_BOX.y, SEA_BOX.w, SEA_BOX.h);
        // 5 the flock, far to near
        let leadSt = null, lead = null;
        for (const B of FLOCK) {
          const st = birdState(B, tq, bi);
          const c = drawTern(ctx, B, st);
          if (B.lead) {
            st.cx = c[0];
            st.cy = c[1];
            leadSt = st;
            lead = B;
          }
        }
        // 6 overlays
        drawSunArc(ctx);
        drawWind(ctx, t, leadSt ? [leadSt.cx, leadSt.cy, lead.span * 0.32 - 6] : null);
        if (leadSt) drawLeadRing(ctx, leadSt, lead, t);
      });
    },
  });
})();
