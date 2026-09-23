// 17 egg-loop : "Back to the egg" (schematic, global T 30.5 to 32.0)
//
// Shot 02's blueprint egg on G1, fully built on frame 0, closing the loop. Enters on the match cut from
// 16's inked egg and hands to 01 by a hard cut.
// Everything below the scene section is copied verbatim from src/scenes/02-egg-blueprint.js (cycleRing,
// eggGeo, blotchOutline, drawEggOutline, drawEggShade, drawPoreLattice, drawBlotchOutlines, drawAirCell,
// drawYolk, drawNucleus and the scenery), and every seed derives from 02's id ('egg-blueprint') so the
// lattice, blotches and boil are the same drawing. If 02's egg changes, re-copy it here.
//
// Layers, back to front (frame px):
//   1 navy blueprint plate, 60 px grid centred (540, 900)
//   2 guide geometry: circles r 470 / 640 at (540, 900) turned 6 degrees (02's end) and still turning,
//     corner diagonals, construction lines, registration crosses; the shingle section below y 1566
//   3 shell-wall section band y 432 to 556, ground band y 1178 to 1220
//   4 measurement: length bracket y 1260, height bracket x 100, tick scale x 1020
//   5 the G1 egg: grid calm and blastodisc light, shade, yolk, pore lattice, air cell, blotch outlines, outline
//   6 the single nucleus at the blastodisc home (520, 760): glass ping rings on the cut, one pulse on T 31.5
//   7 network insets at y 1430 (blotch pigment left, pore net right), receding as the wordmark enters
//   8 division counter plate (resets to one on T 31.0) and the cycle ring: all four arcs complete,
//     a lineWhite flash round the whole circle on T 31.0, then only the egg arc relights
//   9 wordmark 'arctic tern' centred on x 540, baseline y 1470, fading in on T 31.0 over 6 frames
(function () {
  'use strict';

  const ID = 'egg-loop';
  const REF = 'egg-blueprint'; // shot 02: every seed shared so the plate and its boil match
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
  const sd = (...k) => LIB.hash(REF, ...k) & 0x7fffffff;

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
  // G1 egg (docs/storyboard.md, Shared geometry G1): lying on its side on y 900, blunt end left
  // ===========================================================================

  const G1 = [[160, 0], [175, 120], [200, 175], [240, 222], [300, 257], [380, 274], [460, 278], [540, 275],
    [620, 264], [700, 242], [780, 205], [840, 160], [880, 112], [905, 62], [920, 0]];
  const AXIS_Y = 900;
  const AIR = [[205, 720], [250, 900], [205, 1080]]; // air cell arc through three points
  const PIP = [240, 800];
  const HOME = [520, 760]; // blastodisc, the nucleus home
  const YOLK = [500, 900, 200];
  const TOOTH = [250, 860]; // the embryo's egg tooth

  // shared recipe: linear interpolation of the G1 table
  function halfH(x) {
    if (x <= 160 || x >= 920) return 0;
    let i = 0;
    while (G1[i + 1][0] < x) i++;
    const [x0, h0] = G1[i], [x1, h1] = G1[i + 1];
    return h0 + ((h1 - h0) * (x - x0)) / (x1 - x0);
  }
  const hSlope = (x) => (halfH(x + 2) - halfH(x - 2)) / 4;

  // the surface seen very slightly from the narrow end: rings bow right in the middle
  const TILT = 0.05;
  function surf(x, phi) {
    const h = halfH(x);
    return [x + TILT * h * Math.cos(phi), AXIS_Y - h * Math.sin(phi)];
  }

  // light from the upper left and the front; 0 lit, 1 turned fully away
  const LV = (() => {
    const v = [-0.5, 0.62, 0.6];
    const l = Math.hypot(v[0], v[1], v[2]);
    return [v[0] / l, v[1] / l, v[2] / l];
  })();
  function shadeAt(x, y) {
    const h = halfH(x);
    if (h < 1) return 1;
    const sy = clamp((AXIS_Y - y) / h, -1, 1);
    const cz = Math.sqrt(Math.max(0, 1 - sy * sy));
    const nx = -hSlope(x), nl = Math.hypot(nx, sy, cz) || 1;
    return 1 - clamp((nx * LV[0] + sy * LV[1] + cz * LV[2]) / nl);
  }

  function offsetPts(pts, d, sideSign) {
    const n = pts.length, out = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1];
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl;
      ty /= tl;
      out.push([pts[i][0] - ty * d * sideSign, pts[i][1] + tx * d * sideSign]);
    }
    return out;
  }

  function cumLen(pts) {
    const c = new Float64Array(pts.length);
    for (let i = 1; i < pts.length; i++) c[i] = c[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    return c;
  }

  function slicePts(pts, cum, frac) {
    if (frac >= 1) return pts;
    const target = cum[cum.length - 1] * clamp(frac);
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      if (cum[i] <= target) out.push(pts[i]);
      else {
        const a = pts[i - 1], u = (target - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
        out.push([lerp(a[0], pts[i][0], u), lerp(a[1], pts[i][1], u)]);
        break;
      }
    }
    return out;
  }

  // shared recipe: 22 large blotches then 70 small spots, seeded from 'egg-blueprint', call order x, y, rad
  function blotchTable(L) {
    const r = L.rng(L.hash('egg-blueprint', 'blotch'));
    const out = [];
    for (let i = 0; i < 22; i++) {
      const x = 220 + r() * 180;
      const y = 900 + (r() * 2 - 1) * 0.85 * halfH(x);
      const rad = 14 + r() * 20;
      out.push({ x, y, rad, large: true, i });
    }
    for (let i = 0; i < 70; i++) {
      const x = 180 + r() * 720;
      const y = 900 + (r() * 2 - 1) * 0.9 * halfH(x);
      const rad = 3 + r() * 6;
      out.push({ x, y, rad, large: false, i: 22 + i });
    }
    return out;
  }

  // the irregular outline of one blotch: a pure function of the blotch, so 03 and 17 can reuse it
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

  // ===========================================================================
  // Geometry, built once (pure functions of constants)
  // ===========================================================================

  let EGG = null;
  function eggGeo(L) {
    if (EGG) return EGG;
    const g = {};
    // shared recipe: samples every 4 px from x 160 to 920
    g.upper = [];
    g.lower = [];
    for (let x = 160; x <= 920; x += 4) {
      const h = halfH(x);
      g.upper.push([x, AXIS_Y - h]);
      g.lower.push([x, AXIS_Y + h]);
    }
    g.cum = cumLen(g.upper);
    g.poly = g.upper.concat(g.lower.slice(1, -1).reverse());
    // inner outline 9 px inside; points that fold over at the tips are dropped
    const inside = (p, d) => halfH(p[0]) - Math.abs(p[1] - AXIS_Y) >= d - 0.5;
    g.inU = offsetPts(g.upper, 9, 1).filter((p) => inside(p, 7));
    g.inL = offsetPts(g.lower, 9, -1).filter((p) => inside(p, 7));
    g.cumIn = cumLen(g.inU);
    g.innerPoly = g.inU.concat(g.inL.slice().reverse());
    g.clipPoly = offsetPts(g.upper, 4, 1).filter((p) => inside(p, 3)).concat(offsetPts(g.lower, 4, -1).filter((p) => inside(p, 3)).reverse());
    g.eggPath = new Path2D();
    L.tracePath(g.eggPath, g.poly, true);
    g.clipPath = new Path2D();
    L.tracePath(g.clipPath, g.clipPoly, true);

    // ---- pore lattice: a rectangular cell net of 24 px cells wrapped over the shell ----
    const S0 = sd('lattice');
    const LX = [];
    for (let x = 172; x <= 910; x += 24) LX.push(x);
    const LP = [];
    for (let k = -17; k <= 17; k++) LP.push(k * 5 * DEG);
    const edgeA = (phi, m) => {
      const e = Math.pow(Math.max(0.02, Math.cos(phi)), 0.6);
      return Math.round(0.3 * (0.4 + 0.6 * e) * (1 - 0.35 * shadeAt(m[0], m[1])) * 50) / 50;
    };
    const segOf = (p0, m, p2) => {
      const dx = p2[0] - p0[0], dy = p2[1] - p0[1], dl = Math.hypot(dx, dy);
      if (dl < 6) return null;
      const gap = Math.min(3, dl * 0.18);
      const a = [p0[0] + (dx / dl) * gap, p0[1] + (dy / dl) * gap];
      const b = [p2[0] - (dx / dl) * gap, p2[1] - (dy / dl) * gap];
      return { a, c: [2 * m[0] - (p0[0] + p2[0]) / 2, 2 * m[1] - (p0[1] + p2[1]) / 2], b };
    };
    g.lat = [];
    for (let j = 0; j < LX.length; j++) {
      for (let k = 0; k < LP.length - 1; k++) {
        const pa = LP[k], pb = LP[k + 1];
        const m = surf(LX[j], (pa + pb) / 2);
        if (!L.polyContains(g.clipPoly, m[0], m[1])) continue;
        if (L.h3(j, k, S0) < 0.03) continue; // a few broken walls
        const s = segOf(surf(LX[j], pa), m, surf(LX[j], pb));
        if (!s) continue;
        s.key = m[0];
        s.al = edgeA((pa + pb) / 2, m);
        g.lat.push(s);
      }
    }
    for (let k = 0; k < LP.length; k++) {
      for (let j = 0; j < LX.length - 1; j++) {
        const xa = LX[j], xb = LX[j + 1];
        const m = surf((xa + xb) / 2, LP[k]);
        if (!L.polyContains(g.clipPoly, m[0], m[1])) continue;
        if (L.h3(k + 40, j, S0 + 1) < 0.03) continue;
        const s = segOf(surf(xa, LP[k]), m, surf(xb, LP[k]));
        if (!s) continue;
        s.key = m[0];
        s.al = edgeA(LP[k], m);
        g.lat.push(s);
      }
    }
    g.lat.sort((u, v) => u.key - v.key);
    // pores at the nodes: most a fine dot, a few an open funnel with a ring
    g.pores = [];
    for (let j = 0; j < LX.length; j++) {
      for (let k = 0; k < LP.length; k++) {
        const p = surf(LX[j], LP[k]);
        if (!L.polyContains(g.clipPoly, p[0], p[1])) continue;
        const h = L.h3(j, k, S0 + 2);
        if (h > 0.42) continue;
        g.pores.push({ x: p[0], y: p[1], big: h < 0.05, a: Math.round((0.25 + 0.3 * Math.cos(LP[k])) * 20) / 20 });
      }
    }

    // ---- shade: contour hatching across the long axis on the side turned from the light ----
    g.shadeHatch = [];
    for (let x = 176, ci = 0; x <= 912; x += 7, ci++) {
      let run = [];
      const flush = () => {
        if (run.length > 2) g.shadeHatch.push(run);
        run = [];
      };
      for (let d = -88; d <= 88; d += 3) {
        const phi = d * DEG;
        const p = surf(x + (L.h3(ci, d + 100, S0 + 5) - 0.5) * 2, phi);
        const thr = 0.56 + 0.1 * L.h3(ci, Math.floor(d / 12), S0 + 6);
        if (shadeAt(p[0], p[1]) > thr && L.polyContains(g.clipPoly, p[0], p[1])) run.push(p);
        else flush();
      }
      flush();
    }
    // rim light just inside the lit upper-left edge
    g.rim = offsetPts(g.upper, 17, 1).filter((p) => p[0] > 172 && p[0] < 470 && inside(p, 15));

    // ---- albumen, chalazae, yolk ----
    g.albumen = g.poly.filter((_, i) => i % 3 === 0).map((p) => [520 + (p[0] - 520) * 0.86, AXIS_Y + (p[1] - AXIS_Y) * 0.84]);
    const twist = (x0, y0, x1, y1, amp0, amp1, turns, ph) => {
      const out = [];
      for (let i = 0; i <= 40; i++) {
        const u = i / 40;
        const amp = lerp(amp0, amp1, u);
        out.push([lerp(x0, x1, u), lerp(y0, y1, u) + amp * Math.sin(u * turns * TAU + ph)]);
      }
      return out;
    };
    g.chalazae = [
      twist(700, 902, 862, 896, 6, 2, 3.5, 0), twist(700, 902, 862, 896, 6, 2, 3.5, Math.PI),
      twist(300, 904, 262, 906, 5, 2, 1.5, 0), twist(300, 904, 262, 906, 5, 2, 1.5, Math.PI),
    ];
    g.yolkPts = L.ellipsePts(YOLK[0], YOLK[1], YOLK[2], YOLK[2], 120);
    // latebra: a flask from the yolk centre up to the blastodisc
    g.latebra = [[494, 872], [496, 820], [506, 790], [512, 778]];
    g.latebra2 = [[508, 872], [506, 822], [516, 792], [528, 780]];

    // ---- blotches ----
    g.blotches = blotchTable(L);
    const large = g.blotches.filter((b) => b.large).sort((u, v) => u.x - v.x);
    large.forEach((b, r) => (b.grp = Math.min(3, Math.floor((r * 4) / large.length))));
    for (const b of g.blotches) {
      if (!b.large) b.grp = Math.min(3, Math.floor((b.x - 180) / 180));
      b.pts = blotchOutline(L, b);
      b.under = !b.large && L.h3(b.i, 7, 9011) < 0.3; // under-blotches, deeper in the shell: dashed
      if (b.large) {
        b.gran = [];
        const n = 3 + Math.floor(L.h3(b.i, 8, 9011) * 5);
        for (let q = 0; q < n; q++) {
          const a = L.h3(b.i, 20 + q, 9011) * TAU, rr = b.rad * 0.55 * Math.sqrt(L.h3(b.i, 40 + q, 9011));
          b.gran.push([b.x + Math.cos(a) * rr, b.y + Math.sin(a) * rr * 0.8, 1.1 + 0.8 * L.h3(b.i, 60 + q, 9011)]);
        }
      }
    }

    // ---- embryo: a curled body along the yolk rim, the head at the air cell ----
    const spine = L.smoothPts([[336, 826], [352, 796], [382, 771], [422, 757], [464, 758], [500, 776], [520, 806], [516, 838], [496, 858], [472, 864]], false, 5);
    const N = spine.length;
    const sc = cumLen(spine);
    const sLen = sc[N - 1];
    const CURL_C = [440, 818]; // the centre the body curls round; ventral faces it
    const nrm = spine.map((p, i) => {
      const a = spine[Math.max(0, i - 2)], b = spine[Math.min(N - 1, i + 2)];
      const tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1;
      let nx = -ty / tl, ny = tx / tl;
      if (nx * (CURL_C[0] - p[0]) + ny * (CURL_C[1] - p[1]) < 0) {
        nx = -nx;
        ny = -ny;
      }
      return [nx, ny, tx / tl, ty / tl];
    });
    const width = (s) => {
      const u = s / sLen;
      return u < 0.25 ? lerp(18, 30, sstep(0, 1, u / 0.25)) : lerp(30, 5, Math.pow((u - 0.25) / 0.75, 1.1));
    };
    const at = (s) => {
      let i = 0;
      while (i < N - 2 && sc[i + 1] < s) i++;
      const u = clamp((s - sc[i]) / (sc[i + 1] - sc[i] || 1));
      return { p: [lerp(spine[i][0], spine[i + 1][0], u), lerp(spine[i][1], spine[i + 1][1], u)], n: nrm[i] };
    };
    const ven = [], dor = [];
    for (let i = 0; i < N; i++) {
      const w = width(sc[i]);
      ven.push([spine[i][0] + nrm[i][0] * w, spine[i][1] + nrm[i][1] * w]);
      dor.push([spine[i][0] - nrm[i][0] * w, spine[i][1] - nrm[i][1] * w]);
    }
    const em = { spine, sc, sLen, at, width, nrm };
    // round the tail tip
    const tq = nrm[N - 1], tp = spine[N - 1], tw0 = width(sLen);
    const tip = [];
    for (let i = 1; i < 8; i++) {
      const a = (i / 8) * Math.PI;
      tip.push([tp[0] - tq[0] * tw0 * Math.cos(a) + tq[2] * tw0 * Math.sin(a), tp[1] - tq[1] * tw0 * Math.cos(a) + tq[3] * tw0 * Math.sin(a)]);
    }
    em.body = dor.concat(tip, ven.slice().reverse());
    em.head = [306, 848, 46];
    em.eye = [315, 837, 19];
    em.bill = [[268, 832], [255, 850], [TOOTH[0], TOOTH[1]], [258, 868], [272, 874]];
    // paired somite blocks along the back
    em.somites = [];
    for (let s = sLen * 0.2; s < sLen * 0.9; s += 10) {
      const q = at(s);
      em.somites.push({ p: q.p, n: q.n, w: width(s) });
    }
    // limb buds: short paddles on the flank
    const bud = (s, side, len, wd) => {
      const q = at(s);
      const w = width(s);
      const bx = q.p[0] + side * q.n[0] * w * 0.9, by = q.p[1] + side * q.n[1] * w * 0.9;
      const dx = side * q.n[0], dy = side * q.n[1];
      const out = [];
      for (let i = 0; i <= 12; i++) {
        const a = (i / 12) * Math.PI;
        const c = Math.cos(a), sn = Math.sin(a);
        out.push([bx + q.n[2] * wd * c + dx * len * sn, by + q.n[3] * wd * c + dy * len * sn]);
      }
      return out;
    };
    em.wing = bud(sLen * 0.36, 1, 20, 12);
    em.leg = bud(sLen * 0.68, 1, 18, 10);
    em.heart = at(sLen * 0.14).p.map((v, i) => v + at(sLen * 0.14).n[i] * 26);
    // eight somite slots the nuclei settle onto
    em.slots = [];
    for (let k = 0; k < 8; k++) em.slots.push(at(sLen * (0.2 + 0.09 * k)).p);
    // vitelline vessels: trunks from the body fanning out over the yolk, forking twice
    const rv = L.rng(sd('vessels'));
    em.vessels = [];
    const grow = (x, y, a, len, depth) => {
      const pts = [[x, y]];
      let cx = x, cy = y, ca = a;
      const n = Math.max(3, Math.round(len / 9));
      for (let i = 0; i < n; i++) {
        ca += rv.range(-0.22, 0.22);
        cx += Math.cos(ca) * (len / n);
        cy += Math.sin(ca) * (len / n);
        pts.push([cx, cy]);
      }
      em.vessels.push({ pts, d: depth });
      if (depth < 2) {
        const f = 1 + rv.int(0, 1);
        for (let k = 0; k < f; k++) {
          const p = pts[Math.floor(pts.length * rv.range(0.5, 0.95))];
          grow(p[0], p[1], ca + rv.sign() * rv.range(0.35, 0.8), len * rv.range(0.45, 0.65), depth + 1);
        }
      }
    };
    // trunks leave the flanks and spread over the yolk, most outward from the curl, two across it
    for (const [u, side] of [[0.22, -1], [0.36, -1], [0.5, -1], [0.62, -1], [0.74, -1], [0.44, 1], [0.6, 1]]) {
      const q = at(sLen * u);
      const w = width(sLen * u);
      const x = q.p[0] + side * q.n[0] * w, y = q.p[1] + side * q.n[1] * w;
      const a = Math.atan2(side * q.n[1], side * q.n[0]);
      grow(x + Math.cos(a) * 2, y + Math.sin(a) * 2, a + rv.range(-0.3, 0.3), side > 0 ? rv.range(60, 80) : rv.range(80, 120), 0);
    }
    g.em = em;

    // ---- ground band pebble cells, y 1178 to 1220 ----
    const rg = L.rng(sd('pebbles'));
    g.pebbles = [];
    for (let x = -12; x < 1096;) {
      const w = rg.range(20, 36), h = rg.range(15, Math.min(32, w));
      const cx = x + w / 2, cy = 1199 + rg.range(-3, 3);
      g.pebbles.push({ cx, cy, pts: lumpy(L, cx, cy, w / 2 - 1.5, h / 2, rg() * TAU, sd('peb', g.pebbles.length)), w });
      x += w + rg.range(2, 6);
    }
    // a faint shingle section deep below, y 1570 to 1920
    g.strata = [];
    for (let row = 0; row < 7; row++) {
      const y0 = 1590 + row * 50;
      for (let x = -20 + rg.range(0, 30); x < 1100;) {
        const w = rg.range(28, 70) * (1 + row * 0.08), h = rg.range(18, 34);
        g.strata.push({ pts: lumpy(L, x + w / 2, y0 + rg.range(-8, 8), w / 2, h / 2, rg.range(-0.3, 0.3), sd('str', row, Math.round(x))), row });
        x += w + rg.range(6, 20);
      }
    }

    // ---- shell-wall section band ----
    g.band = bandGeo(L);
    EGG = g;
    return g;
  }

  // a rounded pebble / cell: an ellipse with seeded lumps
  function lumpy(L, cx, cy, rx, ry, rot, seed) {
    const n = 11, out = [];
    const cr = Math.cos(rot), sr = Math.sin(rot);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU;
      const f = 0.86 + 0.24 * L.h3(k, 3, seed);
      const x = Math.cos(a) * rx * f, y = Math.sin(a) * ry * f;
      out.push([cx + x * cr - y * sr, cy + x * sr + y * cr]);
    }
    return out;
  }

  // the section through the top of the shell, laid flat across the frame: x maps to the egg's x
  const BAND = { x0: 140, x1: 940, cut: 440, pal0: 446, pal1: 500, mam: 522, mem0: 528, mem1: 552 };
  const PORE_X = [214, 470, 688, 874];
  function bandGeo(L) {
    const b = {};
    const r = L.rng(sd('band'));
    b.cols = [];
    for (let x = BAND.x0; x < BAND.x1;) {
      const w = r.range(14, 22);
      const x1 = Math.min(BAND.x1, x + w);
      const pore = PORE_X.some((px) => Math.abs((x + x1) / 2 - px) < 9);
      b.cols.push({ x0: x, x1, pore, lines: [r.range(458, 468), r.range(474, 484), r.range(488, 496)] });
      x = x1;
    }
    b.cuticle = [];
    for (let x = BAND.x0 + 1, i = 0; x < BAND.x1; x += 3, i++) b.cuticle.push([x, 2.2 + 1.8 * L.h3(i, 1, sd('cut'))]);
    b.pigment = [];
    for (let i = 0; i < 260; i++) {
      const x = r.range(BAND.x0, BAND.x1);
      const dens = x > 214 && x < 406 ? 1 : 0.16;
      if (r() > dens) continue;
      b.pigment.push([x, r.range(BAND.cut + 1, BAND.cut + 14), r.range(1.0, 1.9)]);
    }
    b.fibres = [];
    for (let k = 0; k < 7; k++) {
      const pts = [];
      const y0 = BAND.mem0 + 2 + k * 3.4, sdk = sd('fibre', k);
      for (let x = BAND.x0; x <= BAND.x1; x += 8) pts.push([x, y0 + 2.2 * L.noise1(x * 0.03, sdk)]);
      b.fibres.push(pts);
    }
    return b;
  }

  // ===========================================================================
  // Line helpers
  // ===========================================================================

  function wobPts(L, pts, seed, amp, bi) {
    const n = pts.length;
    const out = new Array(n);
    let s = 0;
    const sdb = (seed + bi * 7919) | 0;
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      if (i > 0) s += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
      const a = pts[i > 0 ? i - 1 : 0], b = pts[i < n - 1 ? i + 1 : n - 1];
      const tx = b[0] - a[0], ty = b[1] - a[1];
      const tl = Math.hypot(tx, ty) || 1;
      const d = amp * L.noise1(s * 0.018, sdb);
      out[i] = [p[0] - (ty / tl) * d, p[1] + (tx / tl) * d];
    }
    return out;
  }

  function addPoly(path, pts, closed, dx = 0, dy = 0) {
    if (pts.length < 2) return;
    path.moveTo(pts[0][0] + dx, pts[0][1] + dy);
    for (let i = 1; i < pts.length; i++) path.lineTo(pts[i][0] + dx, pts[i][1] + dy);
    if (closed) path.closePath();
  }

  function wob(L, path, pts, seed, amp, bi, closed) {
    if (pts.length < 2) return;
    addPoly(path, wobPts(L, pts, seed, amp, bi), closed);
  }

  function stroke(ctx, path, color, alpha, width, dash) {
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
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha *= alpha;
    ctx.fill(path);
    ctx.restore();
  }

  function bucket(map, a) {
    let p = map.get(a);
    if (!p) {
      p = new Path2D();
      map.set(a, p);
    }
    return p;
  }
  function strokeBuckets(ctx, map, color, width, mul = 1) {
    for (const [a, p] of map) if (a * mul > 0.004) stroke(ctx, p, color, a * mul, width);
  }

  // closed smooth blob through points (quadratic through the edge midpoints)
  function blob(path, pts) {
    const n = pts.length;
    const m = (i) => [(pts[i % n][0] + pts[(i + 1) % n][0]) / 2, (pts[i % n][1] + pts[(i + 1) % n][1]) / 2];
    const s = m(n - 1);
    path.moveTo(s[0], s[1]);
    for (let i = 0; i < n; i++) {
      const e = m(i);
      path.quadraticCurveTo(pts[i][0], pts[i][1], e[0], e[1]);
    }
    path.closePath();
  }

  function scalePts(pts, cx, cy, s) {
    return pts.map((p) => [cx + (p[0] - cx) * s, cy + (p[1] - cy) * s]);
  }

  // ===========================================================================
  // The egg, in named pieces (shot 17 redraws the final state with these)
  // ===========================================================================

  // double outline from the blunt end round both sides to the narrow end; k 0..1 draw-on, kIn the inner line
  function drawEggOutline(ctx, L, g, k, kIn, bi) {
    const P = L.pal, lav = P.lavender;
    const SEED = sd('outline');
    if (k > 0) {
      const po = new Path2D();
      wob(L, po, slicePts(g.upper, g.cum, k), SEED + 1, 0.6, bi, false);
      wob(L, po, slicePts(g.lower, g.cum, k), SEED + 2, 0.6, bi, false);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      stroke(ctx, po, lav, 0.05, 16);
      stroke(ctx, po, lav, 0.08, 7);
      ctx.restore();
      stroke(ctx, po, lav, 0.85, 2.5);
    }
    if (kIn > 0) {
      const pi = new Path2D();
      wob(L, pi, slicePts(g.inU, g.cumIn, kIn), SEED + 11, 0.5, bi, false);
      wob(L, pi, slicePts(g.inL, g.cumIn, kIn), SEED + 12, 0.5, bi, false);
      if (kIn >= 1) {
        const a = g.inU[0], b = g.inL[0], c = g.inU[g.inU.length - 1], d = g.inL[g.inL.length - 1];
        pi.moveTo(a[0], a[1]);
        pi.quadraticCurveTo(a[0] - 3, AXIS_Y, b[0], b[1]);
        pi.moveTo(c[0], c[1]);
        pi.quadraticCurveTo(c[0] + 3, AXIS_Y, d[0], d[1]);
      }
      stroke(ctx, pi, lav, 0.5, 1.5);
    }
  }

  // shade stipple, contour hatching and the rim light; yS limits the sweep (x front)
  function drawEggShade(ctx, L, g, front, bi) {
    const P = L.pal, lav = P.lavender;
    ctx.save();
    ctx.clip(g.clipPath);
    L.stipple(ctx, g.clipPoly, {
      spacing: 7,
      r: [1.0, 2.0],
      color: lav,
      alpha: 0.3,
      seed: sd('shade-st'),
      density: (x, y) => (x > front ? 0 : 0.9 * sstep(0.42, 0.95, shadeAt(x, y))),
    });
    const hp = new Path2D();
    for (let i = 0; i < g.shadeHatch.length; i++) {
      const run = g.shadeHatch[i];
      if (run[0][0] > front) continue;
      wob(L, hp, run, sd('sh', i), 0.5, bi, false);
    }
    stroke(ctx, hp, lav, 0.17, 1);
    ctx.restore();
    const rim = new Path2D();
    wob(L, rim, g.rim.filter((p) => p[0] <= front), sd('rim'), 0.5, bi, false);
    stroke(ctx, rim, P.lineWhite, 0.3, 1.4);
  }

  // the pore lattice: short lavender ticks on a 24 px rectangular net, swept in to x = front
  function drawPoreLattice(ctx, L, g, front, bi) {
    const P = L.pal, lav = P.lavender;
    const SEED = sd('lat-boil');
    const map = new Map();
    for (let i = 0; i < g.lat.length; i++) {
      const s = g.lat[i];
      if (s.key > front) break;
      const p = bucket(map, s.al);
      const jx = (L.h3(i, bi, SEED) - 0.5) * 0.8, jy = (L.h3(bi, i, SEED + 1) - 0.5) * 0.8;
      p.moveTo(s.a[0], s.a[1]);
      p.quadraticCurveTo(s.c[0] + jx, s.c[1] + jy, s.b[0], s.b[1]);
    }
    ctx.save();
    ctx.clip(g.clipPath);
    strokeBuckets(ctx, map, lav, 1);
    const dots = new Path2D(), rings = new Path2D();
    for (const q of g.pores) {
      if (q.x > front) continue;
      dots.moveTo(q.x + 1.3, q.y);
      dots.arc(q.x, q.y, 1.3, 0, TAU);
      if (q.big) {
        rings.moveTo(q.x + 3.6, q.y);
        rings.arc(q.x, q.y, 3.6, 0, TAU);
      }
    }
    fill(ctx, dots, lav, 0.42);
    stroke(ctx, rings, P.lineWhite, 0.45, 1);
    ctx.restore();
  }

  // blotches as schemEgg outlines only; grpK[g] is the pop scale of group g (0 = not yet)
  function drawBlotchOutlines(ctx, L, g, grpK, bi) {
    const P = L.pal;
    const main = new Path2D(), inner = new Path2D(), under = new Path2D(), gran = new Path2D();
    for (const b of g.blotches) {
      const k = grpK[b.grp];
      if (!(k > 0)) continue;
      const pts = wobPts(L, scalePts(b.pts, b.x, b.y, k), sd('bl', b.i), b.large ? 0.6 : 0.3, bi);
      if (b.under) blob(under, pts);
      else blob(main, pts);
      if (b.large) {
        blob(inner, scalePts(pts, b.x, b.y, 0.55));
        for (const q of b.gran) {
          const x = b.x + (q[0] - b.x) * k, y = b.y + (q[1] - b.y) * k;
          gran.moveTo(x + q[2], y);
          gran.arc(x, y, q[2], 0, TAU);
        }
      }
    }
    ctx.save();
    ctx.clip(g.clipPath);
    // a navy knock-out under each blotch keeps its outline clean over the lattice
    fill(ctx, main, P.navy, 0.35);
    stroke(ctx, main, P.schemEgg, 0.85, 1.5);
    stroke(ctx, inner, P.schemEgg, 0.35, 1);
    stroke(ctx, under, P.schemEgg, 0.5, 1.1, [3, 3]);
    fill(ctx, gran, P.schemEgg, 0.6);
    ctx.restore();
  }

  // the air cell inside the blunt end: arc (205, 720) through (250, 900) to (205, 1080), k draw-on
  function drawAirCell(ctx, L, g, k, bi) {
    const P = L.pal;
    if (k <= 0) return;
    const pts = [];
    const [p0, pm, p2] = AIR;
    const c = [2 * pm[0] - (p0[0] + p2[0]) / 2, 2 * pm[1] - (p0[1] + p2[1]) / 2];
    for (let i = 0; i <= 36; i++) {
      const u = i / 36, v = 1 - u;
      pts.push([v * v * p0[0] + 2 * v * u * c[0] + u * u * p2[0], v * v * p0[1] + 2 * v * u * c[1] + u * u * p2[1]]);
    }
    // the gas space: a navyLight tint between the membrane and the shell
    const space = new Path2D();
    addPoly(space, pts, false);
    for (let y = 1080; y >= 720; y -= 8) space.lineTo(150, y);
    space.closePath();
    ctx.save();
    ctx.clip(g.clipPath);
    fill(ctx, space, P.navyLight, 0.55 * k);
    // the inner shell membrane, dashed, a few px inside the arc
    const mem = new Path2D();
    addPoly(mem, pts.map((p) => [p[0] + 7, p[1]]), false);
    stroke(ctx, mem, P.lavender, 0.35 * k, 1, [5, 5]);
    ctx.restore();
    const line = new Path2D();
    wob(L, line, slicePts(pts, cumLen(pts), k), sd('air'), 0.5, bi, false);
    stroke(ctx, line, P.lineWhite, 0.9, 1.8);
  }

  // yolk circle (500, 900) r 200 in lavender 50 % with sparse stipple, its layers, latebra and chalazae
  function drawYolk(ctx, L, g, k, bi) {
    const P = L.pal, lav = P.lavender;
    if (k <= 0) return;
    const [cx, cy, R] = YOLK;
    ctx.save();
    ctx.globalAlpha *= clamp(k * 1.5);
    const ch = new Path2D();
    g.chalazae.forEach((pts, i) => wob(L, ch, pts, sd('chal', i), 0.4, bi, false));
    stroke(ctx, ch, lav, 0.34, 1.1);
    const alb = new Path2D();
    wob(L, alb, g.albumen, sd('alb'), 0.8, bi, true);
    stroke(ctx, alb, lav, 0.18, 1, [8, 7]);
    const disc = new Path2D();
    disc.arc(cx, cy, R, 0, TAU);
    fill(ctx, disc, P.navyLight, 0.28);
    L.stipple(ctx, g.yolkPts, { spacing: 11, r: [1.0, 1.7], density: 0.34, color: lav, alpha: 0.32, seed: sd('yolk-st') });
    const rings = new Path2D();
    for (const rr of [52, 96, 138, 174]) {
      rings.moveTo(cx + rr, cy);
      rings.arc(cx, cy, rr, 0, TAU);
    }
    stroke(ctx, rings, lav, 0.12, 1, [2, 6]);
    const lat = new Path2D();
    wob(L, lat, g.latebra, sd('lb1'), 0.4, bi, false);
    wob(L, lat, g.latebra2, sd('lb2'), 0.4, bi, false);
    lat.moveTo(cx + 22, cy - 10);
    lat.arc(cx + 1, cy - 10, 21, 0, TAU);
    stroke(ctx, lat, lav, 0.26, 1, [4, 4]);
    ctx.restore();
    const out = new Path2D();
    const pts = [];
    for (let i = 0; i <= 120; i++) {
      const a = -Math.PI / 2 + (i / 120) * TAU * clamp(k);
      pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]);
    }
    wob(L, out, pts, sd('yolk'), 0.6, bi, false);
    stroke(ctx, out, lav, 0.5, 1.5);
  }

  // a nucleus: glow core r 9 (times s), halo to 40 px, a lavender ring and 12 radial ticks
  function drawNucleus(ctx, L, x, y, s, o) {
    const P = L.pal;
    const bi = o.bi || 0;
    const n = o.ticks != null ? o.ticks : 12;
    L.glowDot(ctx, x, y, 9 * s, { rays: 0, glow: 40 / 9, intensity: o.intensity != null ? o.intensity : 1.25, seed: o.seed || 61, boil: bi, twinkle: 0.12 });
    const ta = o.tickAlpha != null ? o.tickAlpha : 0.7;
    if (ta <= 0) return;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 19 * s, 0, TAU);
    ctx.strokeStyle = P.lavender;
    ctx.globalAlpha *= 0.45 * ta;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
    L.ticks(ctx, x, y, { r: 23 * s, n, len: 14 * s, major: 2, majorLen: 22 * s, rot: (bi % 4) * 7.5 * DEG + (o.rot || 0), alpha: ta, color: P.lineWhite, width: 1.5 });
  }


  // ===========================================================================
  // Scenery: guide geometry, shell section band, ground, measurement, insets
  // ===========================================================================

  function drawGuides(ctx, L, t, dur, bi) {
    const P = L.pal, lav = P.lavender;
    const rot = 6 * DEG * clamp(t / dur);
    ctx.save();
    ctx.translate(540, 900);
    ctx.rotate(rot);
    L.guideCircle(ctx, 0, 0, 470, { alpha: 0.14, width: 1.5 });
    L.ticks(ctx, 0, 0, { r: 470, n: 120, len: 6, major: 10, majorLen: 15, inward: true, color: lav, alpha: 0.2, width: 1 });
    L.guideCircle(ctx, 0, 0, 640, { alpha: 0.08, width: 1.5 });
    L.guideCircle(ctx, 0, 0, 652, { alpha: 0.1, width: 1, dash: [2, 9] });
    for (let k = 0; k < 4; k++) {
      const a = k * 90 * DEG + 24 * DEG;
      L.arcAnnotation(ctx, 0, 0, 486, a, a + 30 * DEG, { color: lav, alpha: 0.2, width: 1.2, endTicks: 10 });
    }
    ctx.restore();
    const diag = new Path2D();
    diag.moveTo(0, 0);
    diag.lineTo(1080, 1920);
    diag.moveTo(1080, 0);
    diag.lineTo(0, 1920);
    stroke(ctx, diag, lav, 0.12, 1);
    // construction: the long axis, the widest section, the yolk centre line
    const cons = new Path2D();
    cons.moveTo(110, 900);
    cons.lineTo(970, 900);
    stroke(ctx, cons, lav, 0.18, 1, [10, 8]);
    const cons2 = new Path2D();
    cons2.moveTo(460, 596);
    cons2.lineTo(460, 1240);
    cons2.moveTo(500, 680);
    cons2.lineTo(500, 1120);
    stroke(ctx, cons2, lav, 0.12, 1, [3, 6]);
    // registration crosses where the r 470 circle meets the axes
    const reg = new Path2D();
    for (const [x, y] of [[540, 430], [540, 1370], [70, 900], [1010, 900]]) {
      reg.moveTo(x - 9, y);
      reg.lineTo(x + 9, y);
      reg.moveTo(x, y - 9);
      reg.lineTo(x, y + 9);
    }
    stroke(ctx, reg, lav, 0.4, 1.2);
    // section arrows at the frame edges on the axis
    const sec = new Path2D();
    for (const sgn of [1, -1]) {
      const x0 = sgn > 0 ? 10 : 1070;
      sec.moveTo(x0, 892);
      sec.lineTo(x0 + sgn * 16, 900);
      sec.lineTo(x0, 908);
      sec.closePath();
    }
    fill(ctx, sec, lav, 0.5);
  }

  // shell wall in section, x 140 to 940: cuticle, palisade columns, pore canals, mammillary cones, membranes
  function drawShellSection(ctx, L, g, k, bi) {
    if (k <= 0) return;
    const P = L.pal, lav = P.lavender, white = P.lineWhite;
    const b = g.band;
    const xr = lerp(BAND.x0, BAND.x1 + 20, k);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 400, xr, 180);
    ctx.clip();
    const plate = new Path2D();
    plate.rect(BAND.x0, BAND.cut, BAND.x1 - BAND.x0, BAND.mem1 - BAND.cut);
    fill(ctx, plate, P.navy, 0.75);
    fill(ctx, plate, P.navyLight, 0.25);
    // cuticle: a fine layer of ticks over the outer surface, with pigment granules above the blotch band
    const cut = new Path2D();
    b.cuticle.forEach(([x, l], i) => {
      const lean = (L.h3(i, bi, 311) - 0.5) * 0.8;
      cut.moveTo(x, BAND.cut + 0.5);
      cut.lineTo(x + lean, BAND.cut - l);
    });
    stroke(ctx, cut, lav, 0.3, 0.8);
    const top = new Path2D();
    wob(L, top, [[BAND.x0, BAND.cut], [540, BAND.cut], [BAND.x1, BAND.cut]], sd('bt'), 0.5, bi, false);
    wob(L, top, [[BAND.x0, BAND.pal0], [540, BAND.pal0], [BAND.x1, BAND.pal0]], sd('bt2'), 0.4, bi, false);
    stroke(ctx, top, lav, 0.6, 1.4);
    const pg = new Path2D();
    for (const [x, y, r] of b.pigment) {
      pg.moveTo(x + r, y);
      pg.arc(x, y, r, 0, TAU);
    }
    fill(ctx, pg, P.schemEgg, 0.55);
    // palisade columns with growth lines, each ending in a mammillary cone
    const walls = new Path2D(), growth = new Path2D(), cones = new Path2D();
    b.cols.forEach((c, i) => {
      if (c.pore) return;
      const j = (L.h3(i, bi, 313) - 0.5) * 0.6;
      walls.moveTo(c.x0 + j, BAND.pal0);
      walls.lineTo(c.x0 + j * 0.5, BAND.pal1);
      for (const y of c.lines) {
        growth.moveTo(c.x0 + 3, y);
        growth.lineTo(c.x1 - 3, y + (L.h3(i, 7, 317) - 0.5) * 2);
      }
      const xm = (c.x0 + c.x1) / 2;
      cones.moveTo(c.x0, BAND.pal1);
      cones.quadraticCurveTo(c.x0 + 1, BAND.mam - 4, xm, BAND.mam + (L.h3(i, 3, 319) - 0.5) * 3);
      cones.quadraticCurveTo(c.x1 - 1, BAND.mam - 4, c.x1, BAND.pal1);
    });
    stroke(ctx, walls, lav, 0.34, 1);
    stroke(ctx, growth, lav, 0.16, 1, [3, 4]);
    stroke(ctx, cones, lav, 0.45, 1.2);
    const pl = new Path2D();
    wob(L, pl, [[BAND.x0, BAND.pal1], [540, BAND.pal1], [BAND.x1, BAND.pal1]], sd('bp'), 0.4, bi, false);
    stroke(ctx, pl, lav, 0.22, 1, [2, 5]);
    // pore canals: funnels through the palisade, open to the air at the cuticle
    const pore = new Path2D(), poreHi = new Path2D();
    for (const px of PORE_X) {
      pore.moveTo(px - 6, BAND.cut);
      pore.quadraticCurveTo(px - 2, BAND.pal0 + 24, px - 2.2, BAND.mam);
      pore.moveTo(px + 6, BAND.cut);
      pore.quadraticCurveTo(px + 2, BAND.pal0 + 24, px + 2.2, BAND.mam);
      poreHi.moveTo(px, BAND.cut + 4);
      poreHi.lineTo(px, BAND.mam - 2);
    }
    fill(ctx, (() => {
      const p = new Path2D();
      for (const px of PORE_X) {
        p.moveTo(px - 6, BAND.cut);
        p.quadraticCurveTo(px - 2, BAND.pal0 + 24, px - 2.2, BAND.mam);
        p.lineTo(px + 2.2, BAND.mam);
        p.quadraticCurveTo(px + 2, BAND.pal0 + 24, px + 6, BAND.cut);
        p.closePath();
      }
      return p;
    })(), P.navyDeep, 0.9);
    stroke(ctx, pore, lav, 0.75, 1.3);
    stroke(ctx, poreHi, white, 0.35, 1, [2, 4]);
    // shell membranes: two sheets of interlaced fibres
    const fb = new Path2D();
    b.fibres.forEach((pts, i) => wob(L, fb, pts, sd('fb', i), 0.6, bi, false));
    stroke(ctx, fb, lav, 0.26, 1);
    const mm = new Path2D();
    wob(L, mm, [[BAND.x0, BAND.mem0], [540, BAND.mem0], [BAND.x1, BAND.mem0]], sd('mm0'), 0.4, bi, false);
    wob(L, mm, [[BAND.x0, BAND.mem1], [540, BAND.mem1], [BAND.x1, BAND.mem1]], sd('mm1'), 0.4, bi, false);
    stroke(ctx, mm, lav, 0.55, 1.3);
    const mid = new Path2D();
    wob(L, mid, [[BAND.x0, 540], [540, 540], [BAND.x1, 540]], sd('mmm'), 0.5, bi, false);
    stroke(ctx, mid, lav, 0.3, 1, [7, 4]);
    // break lines at both ends
    const br = new Path2D();
    for (const x of [BAND.x0, BAND.x1]) {
      br.moveTo(x, BAND.cut - 8);
      for (let y = BAND.cut, i = 0; y <= BAND.mem1 + 8; y += 12, i++) br.lineTo(x + (i % 2 ? 5 : -5), y);
    }
    stroke(ctx, br, lav, 0.55, 1.2);
    // bracket on the shell thickness, left of the band
    L.bracket(ctx, 118, BAND.cut, 118, BAND.mem1, { alpha: 0.5, cap: 10, width: 1.2 });
    ctx.restore();
    // the section cut: a leader from the band down to the shell top at the widest point
    if (k >= 1) {
      const ld = new Path2D();
      ld.moveTo(460, BAND.mem1 + 6);
      ld.lineTo(460, 612);
      stroke(ctx, ld, lav, 0.4, 1, [3, 4]);
      const mk = new Path2D();
      mk.moveTo(452, 604);
      mk.lineTo(460, 614);
      mk.lineTo(468, 604);
      stroke(ctx, mk, lav, 0.55, 1.2);
    }
  }

  function drawGround(ctx, L, g, k, bi) {
    if (k <= 0) return;
    const P = L.pal, lav = P.lavender;
    const xr = k * 1100 - 10;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 1150, xr, 100);
    ctx.clip();
    const band = new Path2D();
    band.rect(-5, 1178, 1090, 42);
    fill(ctx, band, P.navy, 0.6);
    const cells = new Path2D(), sh = new Path2D();
    g.pebbles.forEach((pb, i) => {
      blob(cells, wobPts(L, pb.pts, sd('pc', i), 0.4, bi));
      // shadow arc on the lower right of each pebble
      sh.moveTo(pb.cx + pb.w * 0.36, pb.cy - 2);
      sh.quadraticCurveTo(pb.cx + pb.w * 0.3, pb.cy + 8, pb.cx, pb.cy + 9);
    });
    fill(ctx, cells, P.navyLight, 0.45);
    stroke(ctx, cells, lav, 0.4, 1);
    stroke(ctx, sh, lav, 0.25, 1);
    const lines = new Path2D();
    wob(L, lines, [[-10, 1178], [360, 1178], [720, 1178], [1090, 1178]], sd('gl1'), 0.5, bi, false);
    wob(L, lines, [[-10, 1220], [360, 1220], [720, 1220], [1090, 1220]], sd('gl2'), 0.5, bi, false);
    stroke(ctx, lines, lav, 0.7, 1.5);
    // ground hatching just under the band
    const gh = new Path2D();
    for (let x = -10, i = 0; x < 1090; x += 14, i++) {
      gh.moveTo(x, 1226);
      gh.lineTo(x - 10, 1238 + 4 * L.h3(i, 1, 331));
    }
    stroke(ctx, gh, lav, 0.14, 1);
    ctx.restore();
  }

  function drawStrata(ctx, L, g, a, bi) {
    if (a <= 0) return;
    const P = L.pal;
    const byRow = [new Path2D(), new Path2D(), new Path2D()];
    g.strata.forEach((s, i) => blob(byRow[Math.min(2, s.row >> 1)], wobPts(L, s.pts, sd('st', i), 0.5, bi)));
    ctx.save();
    ctx.globalAlpha *= a;
    const hz = new Path2D();
    wob(L, hz, [[-10, 1566], [540, 1566], [1090, 1566]], sd('hz'), 0.5, bi, false);
    stroke(ctx, hz, P.lavender, 0.3, 1.2, [12, 6]);
    stroke(ctx, byRow[0], P.lavender, 0.24, 1);
    stroke(ctx, byRow[1], P.lavender, 0.17, 1);
    stroke(ctx, byRow[2], P.lavender, 0.11, 1);
    ctx.restore();
  }

  // ===========================================================================
  // Scene
  // ===========================================================================

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib, P = L.pal, E = L.ease;
      const dur = info.dur;
      // snap near-frame times onto the frame grid (plus a hair) so beat comparisons never miss by one ulp
      let t = clamp(tIn, 0, dur);
      const tFrame = Math.round(t * 24) / 24;
      if (Math.abs(t - tFrame) < 1e-4) t = tFrame + 1e-7;
      const bi = L.boil(info.T);
      const g = eggGeo(L);
      const lav = P.lavender, white = P.lineWhite;

      // beats (shot-local seconds)
      const B_CLOSE = 0.5; // T 31.0: the ring closes and flashes, the wordmark fades in
      const B_PULSE = 1.0; // T 31.5: the nucleus pulses once, then the frame settles for the loop

      const drawing = (a) => Math.floor((t - a) * 12 + 1e-6);
      const hit = (a, frames, e, lead = 1) => {
        if (t < a) return 0;
        const u = clamp((t - a) / (frames * FR) + lead / frames);
        return e ? e(u) : u;
      };

      // ---- 1 base, 2 guide geometry (02's built plate: guides at their final 6 degrees) --------
      ctx.fillStyle = P.navyDeep;
      ctx.fillRect(0, 0, 1080, 1920);
      L.blueprint(ctx, { center: [540, 900], circles: 0, diagonals: 0, seed: 202 });
      drawGuides(ctx, L, 1, 1, bi);
      drawStrata(ctx, L, g, 1, bi);

      // ---- 3 shell-wall section band, ground band ----
      drawShellSection(ctx, L, g, 1, bi);
      drawGround(ctx, L, g, 1, bi);

      // ---- 4 measurement ----
      L.ticks(ctx, 1020, 120, { length: 1680, angle: Math.PI / 2, n: 42, len: 10, major: 5, majorLen: 22, side: 1, alpha: 0.5, width: 1.5, color: lav });
      L.bracket(ctx, 160, 1260, 920, 1260, { alpha: 0.6, cap: 16 });
      L.ticks(ctx, 160, 1260, { length: 760, angle: 0, n: 10, len: 12, side: -1, baseline: false, alpha: 0.6, width: 1.5, color: lav });
      {
        const ext = new Path2D();
        ext.moveTo(160, 912);
        ext.lineTo(160, 1274);
        ext.moveTo(920, 912);
        ext.lineTo(920, 1274);
        stroke(ctx, ext, lav, 0.26, 1, [4, 6]);
      }
      L.bracket(ctx, 100, 622, 100, 1178, { alpha: 0.6, cap: 16 });
      L.ticks(ctx, 100, 622, { length: 556, angle: Math.PI / 2, n: 8, len: 10, side: -1, baseline: false, alpha: 0.55, width: 1.5, color: lav });
      {
        const ext = new Path2D();
        ext.moveTo(86, 622);
        ext.lineTo(452, 622);
        ext.moveTo(86, 1178);
        ext.lineTo(300, 1178);
        stroke(ctx, ext, lav, 0.24, 1, [4, 6]);
      }

      // ---- 5 the egg, fully built ------------------------------------------------------------
      // calm the grid inside the shell, then a soft light round the blastodisc; the light swells with the pulse
      const kPulse = t < B_PULSE ? 0 : Math.max(0, 1 - (t - B_PULSE) / (8 * FR));
      ctx.save();
      ctx.fillStyle = P.navy;
      ctx.globalAlpha = 0.5;
      ctx.fill(g.eggPath);
      ctx.clip(g.eggPath);
      ctx.globalCompositeOperation = 'lighter';
      const gl = ctx.createRadialGradient(430, 780, 20, 500, 860, 430);
      gl.addColorStop(0, L.rgba(lav, 0.1));
      gl.addColorStop(0.55, L.rgba(lav, 0.035));
      gl.addColorStop(1, L.rgba(lav, 0));
      ctx.globalAlpha = 1 + 0.8 * kPulse;
      ctx.fillStyle = gl;
      ctx.fillRect(150, 610, 780, 580);
      ctx.restore();
      drawEggShade(ctx, L, g, 940, bi);
      drawYolk(ctx, L, g, 1, bi);
      drawPoreLattice(ctx, L, g, 940, bi);
      drawAirCell(ctx, L, g, 1, bi);
      drawBlotchOutlines(ctx, L, g, [1, 1, 1, 1], bi);
      drawEggOutline(ctx, L, g, 1, 1, bi);

      // ---- 6 the single nucleus at the blastodisc home ------------------------------------------
      // glassy ping rings round the nucleus on the cut (the E6 glass ping)
      for (let k = 0; k < 2; k++) {
        const u = clamp((t - k * 3 * FR + FR) / 0.5);
        if (u <= 0 || u >= 1) continue;
        ctx.save();
        ctx.beginPath();
        ctx.arc(HOME[0], HOME[1], 22 + (k ? 170 : 300) * E.outExpo(u), 0, TAU);
        ctx.strokeStyle = lav;
        ctx.globalAlpha = (k ? 0.2 : 0.34) * (1 - u) * (1 - u);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }
      // one pulse on T 31.5, on twos (the nucleus is an object): swell, overshoot back, settle
      const pS = t < B_PULSE ? 1 : [1.34, 1.16, 1.05, 1][Math.min(3, drawing(B_PULSE))];
      drawNucleus(ctx, L, HOME[0], HOME[1], pS, { bi, seed: 60, ticks: 12, tickAlpha: 0.7, intensity: 1.25 + 0.5 * (pS - 1) / 0.34 });
      // the pulse ring, an overlay at 24 fps
      if (t >= B_PULSE && t < B_PULSE + 8 * FR) {
        const u = (t - B_PULSE + FR) / (8 * FR);
        ctx.save();
        ctx.beginPath();
        ctx.arc(HOME[0], HOME[1], lerp(24, 92, E.outExpo(u)), 0, TAU);
        ctx.strokeStyle = white;
        ctx.globalAlpha = 0.6 * (1 - u) * (1 - u);
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(HOME[0], HOME[1], lerp(20, 58, E.outExpo(u)), 0, TAU);
        ctx.strokeStyle = lav;
        ctx.globalAlpha = 0.4 * (1 - u);
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 5]);
        ctx.stroke();
        ctx.restore();
      }

      // ---- 7 network insets: blotch pigment (left) and the pore net (right), as built in 02 -----
      const nodeRot = 1.0 + t * 0.4; // 02 ends its tick rotation at 2.5 x 0.4
      const nodeGlyph = (cx, cy, sx, sy, sr, seed, content) => {
        const dx = cx - sx, dy = cy - sy, dl = Math.hypot(dx, dy);
        const ux = dx / dl, uy = dy / dl;
        const ax = sx + ux * sr, ay = sy + uy * sr;
        const bx = cx - ux * 62, by = cy - uy * 62;
        const bend = cx < 540 ? 1 : -1;
        const mx = (ax + bx) / 2 + uy * 40 * bend, my = (ay + by) / 2 - ux * 40 * bend;
        const lead = [];
        for (let i = 0; i <= 24; i++) {
          const u = i / 24, v = 1 - u;
          lead.push([v * v * ax + 2 * v * u * mx + u * u * bx, v * v * ay + 2 * v * u * my + u * u * by]);
        }
        const lp = new Path2D();
        wob(L, lp, lead, seed, 0.5, bi, false);
        stroke(ctx, lp, lav, 0.5, 1.2);
        const a0 = ctx.globalAlpha;
        ctx.save();
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, TAU);
        ctx.strokeStyle = lav;
        ctx.globalAlpha = a0 * 0.55;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.restore();
        ctx.save();
        ctx.translate(cx, cy);
        ctx.beginPath();
        ctx.arc(0, 0, 58, 0, TAU);
        ctx.fillStyle = P.navyLight;
        ctx.globalAlpha = a0 * 0.94;
        ctx.fill();
        ctx.globalAlpha = a0;
        const rp = new Path2D();
        wob(L, rp, L.ellipsePts(0, 0, 58, 58, 64), seed + 1, 0.4, bi, true);
        stroke(ctx, rp, lav, 0.85, 2);
        const rp2 = new Path2D();
        rp2.arc(0, 0, 51, 0, TAU);
        stroke(ctx, rp2, lav, 0.35, 1);
        L.ticks(ctx, 0, 0, { r: 60, n: 36, len: 5, major: 9, majorLen: 10, color: lav, alpha: 0.4, width: 1, rot: nodeRot });
        ctx.beginPath();
        ctx.arc(0, 0, 50, 0, TAU);
        ctx.clip();
        content();
        ctx.restore();
      };

      // the insets recede while the wordmark enters, so the sign-off reads as one word, not icon, word, icon
      const kWord = hit(B_CLOSE, 6);
      ctx.save();
      ctx.globalAlpha = lerp(1, 0.4, kWord);
      // left: a large blotch on the lower blunt end, magnified: pigment granules in the cuticle
      const bl = g.blotches.filter((b) => b.large).reduce((best, b) => (Math.hypot(b.x - 300, b.y - 1060) < Math.hypot(best.x - 300, best.y - 1060) ? b : best));
      nodeGlyph(190, 1430, bl.x, bl.y, bl.rad + 10, sd('node-l'), () => {
        const net = new Path2D();
        for (let x = -60; x <= 60; x += 26) {
          net.moveTo(x, -60);
          net.lineTo(x + 4, 60);
        }
        for (let y = -60; y <= 60; y += 26) {
          net.moveTo(-60, y);
          net.lineTo(60, y + 3);
        }
        stroke(ctx, net, lav, 0.3, 1);
        const big = new Path2D();
        blob(big, blotchOutline(L, { x: -6, y: 4, rad: 36, large: true, i: bl.i }));
        fill(ctx, big, P.navy, 0.5);
        stroke(ctx, big, P.schemEgg, 0.9, 2);
        const inner = new Path2D();
        blob(inner, blotchOutline(L, { x: -6, y: 4, rad: 20, large: true, i: bl.i }));
        stroke(ctx, inner, P.schemEgg, 0.4, 1.2);
        L.stipple(ctx, blotchOutline(L, { x: -6, y: 4, rad: 34, large: true, i: bl.i }), {
          spacing: 5,
          r: [1.0, 2.0],
          color: P.schemEgg,
          alpha: 0.7,
          seed: sd('gran'),
          density: 0.6,
          boil: bi,
        });
        const sm = new Path2D();
        for (const [x, y, r] of [[34, -30, 7], [40, 28, 5], [-40, -38, 6]]) blob(sm, blotchOutline(L, { x, y, rad: r, large: false, i: 22 + Math.abs(x) }));
        stroke(ctx, sm, P.schemEgg, 0.6, 1.2, [3, 3]);
      });

      // right: the pore net on the narrow end, magnified: cells, pore funnels, a glint in each
      const px = 800, py = 900 + halfH(800) * 0.62;
      nodeGlyph(868, 1430, px, py, 22, sd('node-r'), () => {
        ctx.rotate(-0.1);
        L.stipple(ctx, null, {
          bounds: [-60, -60, 120, 120],
          spacing: 5.5,
          r: [1.0, 1.5],
          color: lav,
          alpha: 0.35,
          seed: sd('node-r-st'),
          density: (x, y) => sstep(-10, 50, x * 0.8 + y * 0.5),
          boil: bi,
        });
        const cells = new Path2D();
        for (let x = -72, ci = 0; x <= 60; x += 30, ci++) {
          for (let y = -72, ri = 0; y <= 60; y += 30, ri++) {
            const j = (L.h3(ci, ri, 341) - 0.5) * 3;
            cells.moveTo(x + 4, y + j);
            cells.lineTo(x + 26, y + j + 1);
            cells.moveTo(x + j, y + 4);
            cells.lineTo(x + j + 1, y + 26);
          }
        }
        stroke(ctx, cells, lav, 0.55, 1.4);
        const pr = new Path2D(), pd = new Path2D();
        for (let x = -72, ci = 0; x <= 60; x += 30, ci++) {
          for (let y = -72, ri = 0; y <= 60; y += 30, ri++) {
            if (L.h3(ci, ri, 343) > 0.55) continue;
            const cx = x + 15, cy = y + 15;
            pr.moveTo(cx + 6, cy);
            pr.arc(cx, cy, 6, 0, TAU);
            pr.moveTo(cx + 3, cy);
            pr.arc(cx, cy, 3, 0, TAU);
            pd.moveTo(cx - 1 + 1.4, cy - 1);
            pd.arc(cx - 1, cy - 1, 1.4, 0, TAU);
          }
        }
        stroke(ctx, pr, white, 0.6, 1);
        fill(ctx, pd, white, 0.9);
      });
      ctx.restore();

      // ---- 8 glyphs: division counter plate (top left) and the cycle ring (top right) ----------
      const kReset = hit(B_CLOSE, 4, E.outCubic);
      {
        const plate = new Path2D();
        plate.moveTo(206, 238);
        plate.arcTo(214, 238, 214, 246, 8);
        plate.arcTo(214, 370, 206, 370, 8);
        plate.arcTo(94, 370, 94, 362, 8);
        plate.arcTo(94, 238, 102, 238, 8);
        plate.closePath();
        fill(ctx, plate, P.navyLight, 0.6);
        stroke(ctx, plate, lav, 0.25, 1);
        ctx.save();
        for (let c = 0; c < 4; c++) {
          const n = 1 << c;
          // the full count 1, 2, 4, 8 carried round the cycle; on the close only the single cell stays lit
          const k = c === 0 ? 1 : 1 - kReset;
          for (let j = 0; j < n; j++) {
            const x = 112 + c * 22, y = 352 - (j + 1) * 12;
            ctx.globalAlpha = 0.3;
            ctx.strokeStyle = lav;
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, 10, 9);
            if (k > 0.01) {
              ctx.globalAlpha = k * 0.9;
              ctx.fillStyle = white;
              const sz = 10 * lerp(0.6, 1, k);
              ctx.fillRect(x + 5 - sz / 2, y + 4.5 - (sz * 0.9) / 2, sz, sz * 0.9);
            }
          }
        }
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(104, 356);
        ctx.lineTo(196, 356);
        ctx.strokeStyle = lav;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }
      // the cycle ring: all four arcs complete, then on the close only the egg arc relights and refills
      if (t < B_CLOSE) cycleRing(ctx, L, 4, 1, bi);
      else cycleRing(ctx, L, 0, hit(B_CLOSE, 6, E.outExpo), bi);
      // the closing flash: lineWhite round the whole circle, and a ring breathing out from it
      if (t >= B_CLOSE && t < B_CLOSE + 8 * FR) {
        const u = (t - B_CLOSE + FR) / (8 * FR);
        const fl = 1 - u;
        ctx.save();
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(900, 300, 44, 0, TAU);
        ctx.strokeStyle = white;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.18 * fl;
        ctx.lineWidth = 16;
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = fl;
        ctx.lineWidth = lerp(5, 2, u);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(900, 300, lerp(48, 84, E.outExpo(u)), 0, TAU);
        ctx.globalAlpha = 0.6 * fl * fl;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      // ---- 9 wordmark (art bible 9) -------------------------------------------------------------
      if (kWord > 0) {
        // letter-spacing adds a trailing gap after the last letter, so shift right by half of it to centre the ink
        // weight 200: in headless Chromium the system stack resolves 300 to the regular face; 200 is the one that renders light
        L.text(ctx, 'arctic tern', 540 + 0.06 * 44, 1470, { size: 44, weight: 200, tracking: '0.12em', color: lav, alpha: 0.85 * kWord, align: 'center' });
      }
    },
  });
})();
