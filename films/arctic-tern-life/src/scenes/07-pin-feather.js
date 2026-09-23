// 07 pin-feather: A feather unrolls from its sheath. Schematic, global T 11.5 to 13.0 (1.5 s at 120 bpm).
//
// Match cut on G2 (docs/storyboard.md): the juvenile with its wings raised in a tall V, now a lavender
// blueprint on the same pixels. The near wing's primaries show as pin feathers, each vane still rolled
// in its waxy sheath. P7 lights, a glow climbs its blood core, the sheath splits at the tip (magenta),
// the vane unrolls from tip to base and the pulp's blood fades; then the other nine unroll in a ripple.
//
// Layers, back to front (frame px, camera locked at zoom 1, everything screen-fixed):
//   1  blueprint plate (navy, 60 px grid, guide circles and diagonals), centred on the shoulders
//   2  construction: shoulder vertical x 540, the r 855 circle about the shoulders through both tips,
//      dashed rays shoulder -> tip, the rock-top level y 1324 and the ground line y 1420, tick rules
//   3  ground section below y 1420: rectangular shingle cells; the rock as a secondary outline with strata
//   4  far wing: secondary outline, bones, 10 primaries and 14 secondaries as thin lines, covert lattice
//   5  tail, legs and feet, body (double outline, hex tissue, feather tracts), head, eye, bill
//   6  near wing: occluding fill, bones and joints, covert rows, secondaries, 10 pin-feather primaries
//      (sheath, pulp core, rolled vane, dashed ghost of the vane to come), double outline
//   7  P7: lineWhite highlight, follicle glow, the glow climbing the core (T 11.583), section mark A-A,
//      growth ruler, the split flash (T 12.0), sheath flakes, the unrolling vane (T 12.5)
//   8  network: curved connectors P7 -> the three node insets, drawn on at T 12.0
//      (180, 1330) r 110 cross-section cutaway, (870, 1080) r 60 sheath tip, (870, 1400) r 60 vane
//   9  the canonical cycle ring, flight arc (stage 2) lit from 0 to half; 10 finishes it
//
// Timing (shot-local t, global T in the comments):
//   0 .. 2f   T 11.500  hold the match frame (the G2 wings, feathers still in their sheaths)
//   2f        T 11.583  P7 lights; a glow dot climbs its core, skin to tip over 6 frames
//   0.5       T 12.000  the sheath splits at P7's tip: magenta flash 8 frames; insets draw on (outExpo, 6 f)
//   1.0       T 12.500  P7's vane unrolls tip to base over 6 frames; cutaway ridges separate and flatten;
//                        the blood dot fades (the feather becomes dead keratin)
//   1.25      T 12.750  the other nine primaries unroll in a ripple out from P7
(function () {
  'use strict';

  const ID = 'pin-feather';
  const LIB = FILM.lib;
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const FR = 1 / 24;

  const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const lerp2 = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  const sstep = (a, b, x) => {
    const u = clamp((x - a) / (b - a));
    return u * u * (3 - 2 * u);
  };
  const sd = (...k) => LIB.hash(ID, ...k) & 0x7fffffff;

  // ---- beats (shot-local t, global T in the comments) ----
  const B_CORE = 2 * FR; // T 11.583
  const B_SPLIT = 0.5; // T 12.0
  const B_UNROLL = 1.0; // T 12.5
  const B_RIPPLE = 1.25; // T 12.75

  // ---- shared geometry G2 (docs/storyboard.md, current revision), copied exactly ----
  const G2_BODY = { cx: 540, cy: 1230, rx: 150, ry: 75, rot: 15 * DEG };
  const G2_HEAD = [400, 1140];
  const G2_HR = 52;
  const G2_BILL = [[352, 1150], [290, 1172]];
  const G2_TAIL_TIP = [720, 1330];
  const G2_STREAMER = [760, 1350];
  const G2_HIPS = [[520, 1300], [570, 1300]];
  // each wing: shoulder, wrist, tip, then the trailing edge from the tip back to the body
  const G2_NEAR = { S: [580, 1180], W: [720, 900], T: [900, 380], TE: [[930, 540], [900, 760], [820, 1000], [640, 1240]] };
  const G2_FAR = { S: [500, 1170], W: [380, 900], T: [200, 420], TE: [[150, 560], [170, 780], [250, 1000], [460, 1230]] };
  const ROCK_TOP = 1324;
  const GROUND = 1420;

  // ---- node insets ----
  const CUT = { x: 180, y: 1330, r: 110 };
  const SHE = { x: 870, y: 1080, r: 60 };
  const VAN = { x: 870, y: 1400, r: 60 };

  const P7 = 7; // the primary that grows on camera (P1 innermost, P10 outermost)
  const SEC_S = 0.45; // where section A-A cuts P7 (fraction base -> tip)

  // =====================================================================================
  // geometry helpers
  // =====================================================================================

  function rot2(x, y, a) {
    const c = Math.cos(a), s = Math.sin(a);
    return [x * c - y * s, x * s + y * c];
  }
  function toWorld(B, lx, ly) {
    const r = rot2(lx, ly, B.rot);
    return [B.cx + r[0], B.cy + r[1]];
  }
  function toLocal(B, x, y) {
    return rot2(x - B.cx, y - B.cy, -B.rot);
  }

  // uniform Catmull-Rom, tension 0.5, 8 samples per span, closed (sample i*8 is point i exactly).
  // Same construction as 06, so the wing silhouettes land on the same pixels across the cut.
  function crClosed(P, seg = 8) {
    const n = P.length;
    const out = [];
    for (let i = 0; i < n; i++) {
      const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
      for (let k = 0; k < seg; k++) {
        const t = k / seg, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    return out;
  }

  // polyline sampler by arc-length fraction
  function sampler(pts) {
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const len = cum[cum.length - 1] || 1;
    const at = (f) => {
      const s = clamp(f) * len;
      let i = 1;
      while (i < cum.length - 1 && cum[i] < s) i++;
      const a = cum[i - 1], b = cum[i];
      const u = b > a ? (s - a) / (b - a) : 0;
      return lerp2(pts[i - 1], pts[i], u);
    };
    at.len = len;
    return at;
  }

  function circlePts(cx, cy, r, n = 48, a0 = 0, span = TAU) {
    const out = [];
    const full = Math.abs(span - TAU) < 1e-6;
    const m = full ? n : n + 1;
    for (let i = 0; i < m; i++) {
      const a = a0 + (span * i) / n;
      out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return out;
  }

  function cubic(p0, p1, p2, p3, n) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = 1 - t;
      out.push([
        u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
      ]);
    }
    return out;
  }

  // open Catmull-Rom through waypoints (end points duplicated as phantoms)
  function crOpen(P, seg = 8) {
    const n = P.length;
    const out = [];
    for (let i = 0; i < n - 1; i++) {
      const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(n - 1, i + 2)];
      for (let k = 0; k < seg; k++) {
        const t = k / seg, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    out.push(P[n - 1].slice());
    return out;
  }

  // ---- the open-wing outline, copied from 06 for the match cut ----
  // Corners stay sharp at the wrist and at the tip: the outline is built from pieces, not one smoothed loop.
  //   1 arm leading edge S -> W: a quadratic bulging 10 px outward (away from the wing), 8 samples
  //   2 hand leading edge W -> T: a quadratic bulging 8 px outward, 8 samples
  //   3 primaries T -> TE[0] -> TE[1]: base curve crOpen([T, TE0, TE1], 8); 10 feather tips at arc-length
  //     fractions k/9 (tip 0 is T, tip 9 is TE1), with a notch between tips k and k+1 at fraction (k+0.5)/9
  //     pulled toward the wrist by 14 px x handLength/550
  //   4 secondaries TE[1] -> TE[2] -> TE[3]: crOpen, 8 samples per span
  //   5 root TE[3] -> S: closes straight (hidden in the body)
  const BULGE_ARM = 10, BULGE_HAND = 8, NOTCH = 14;
  function quadPts(a, b, bulge, out, n = 8) {
    const c = [(a[0] + b[0]) / 2 + out[0] * bulge, (a[1] + b[1]) / 2 + out[1] * bulge];
    const pts = [];
    for (let k = 0; k <= n; k++) {
      const u = k / n, v = 1 - u;
      pts.push([v * v * a[0] + 2 * u * v * c[0] + u * u * b[0], v * v * a[1] + 2 * u * v * c[1] + u * u * b[1]]);
    }
    return pts;
  }
  function wingOutline(w) {
    const { S, W, T, TE } = w;
    // which side the wing lies on: the sign of TE[1] across the hand line
    const hx = T[0] - W[0], hy = T[1] - W[1];
    const sgn = (TE[1][0] - W[0]) * -hy + (TE[1][1] - W[1]) * hx > 0 ? 1 : -1;
    const outward = (a, b) => {
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const l = Math.hypot(dx, dy) || 1;
      return [(dy / l) * sgn, (-dx / l) * sgn];
    };
    const arm = quadPts(S, W, BULGE_ARM, outward(S, W));
    const hand = quadPts(W, T, BULGE_HAND, outward(W, T));
    const base = crOpen([T, TE[0], TE[1]], 8);
    const at = sampler(base);
    const handL = Math.hypot(hx, hy);
    const depth = (NOTCH * handL) / 550;
    const tips = [], notches = [];
    for (let k = 0; k <= 9; k++) tips.push(k === 0 ? T.slice() : k === 9 ? TE[1].slice() : at(k / 9));
    for (let k = 0; k < 9; k++) {
      const p = at((k + 0.5) / 9);
      const dx = W[0] - p[0], dy = W[1] - p[1];
      const l = Math.hypot(dx, dy) || 1;
      notches.push([p[0] + (dx / l) * depth, p[1] + (dy / l) * depth]);
    }
    const serr = [];
    for (let k = 0; k < 9; k++) serr.push(tips[k], notches[k]);
    serr.push(tips[9]);
    const sec = crOpen([TE[1], TE[2], TE[3]], 8);
    const outline = arm.slice(0, -1).concat(hand.slice(0, -1), serr.slice(0, -1), sec);
    const lead = arm.slice(0, -1).concat(hand);
    return { outline, lead, base, sec, tips, notches };
  }

  // the first fraction p of a polyline, by arc length
  function partial(pts, p) {
    if (p >= 1) return pts;
    if (p <= 0) return [pts[0]];
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const target = cum[cum.length - 1] * p;
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      if (cum[i] <= target) out.push(pts[i]);
      else {
        const u = (target - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
        out.push(lerp2(pts[i - 1], pts[i], u));
        break;
      }
    }
    return out;
  }

  // offset a closed polyline along its normals (positive = to the left of travel)
  function offsetClosed(pts, d) {
    const n = pts.length;
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
      const tx = b[0] - a[0], ty = b[1] - a[1];
      const tl = Math.hypot(tx, ty) || 1;
      out.push([pts[i][0] - (ty / tl) * d, pts[i][1] + (tx / tl) * d]);
    }
    return out;
  }
  function signedArea(pts) {
    let s = 0;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) s += (pts[j][0] - pts[i][0]) * (pts[j][1] + pts[i][1]);
    return s / 2;
  }

  // =====================================================================================
  // geometry, built once (t-independent)
  // =====================================================================================

  let GEO = null;
  function geo(L) {
    if (GEO) return GEO;

    function wing(G, near) {
      const O = wingOutline(G);
      const outline = O.outline;
      // inner line of the double outline: 9 px inside the un-notched loop (lead, hand trailing curve, secondaries)
      const smooth = O.lead.concat(O.base.slice().reverse().slice(1), O.sec.slice().reverse().slice(1, -1));
      const inward = signedArea(smooth) > 0 ? -1 : 1;
      const inner = offsetClosed(smooth, -9 * inward);
      // along the serrated hand, pull the inner line in past the notches so it never cuts the feather tips
      const nb = O.base.length;
      const depth = (14 * Math.hypot(G.T[0] - G.W[0], G.T[1] - G.W[1])) / 550;
      for (let j = 0; j < nb; j++) {
        const i = O.lead.length - 1 + j;
        const q = inner[i];
        const dx = G.W[0] - q[0], dy = G.W[1] - q[1];
        const l = Math.hypot(dx, dy) || 1;
        const k = j === 0 || j === nb - 1 ? 0 : depth + 2;
        inner[i] = [q[0] + (dx / l) * k, q[1] + (dy / l) * k];
      }
      // hand trailing edge (tip -> TE0 -> TE1) and arm trailing edge (TE1 -> TE2 -> TE3), un-notched
      const handTE = sampler(O.base);
      const armTE = sampler(O.sec);
      const lead = sampler(O.lead);
      const hand = [G.T[0] - G.W[0], G.T[1] - G.W[1]];
      const hl = Math.hypot(hand[0], hand[1]);
      const hd = [hand[0] / hl, hand[1] / hl];
      // normal of the hand pointing into the wing (toward the trailing edge)
      let hn = [-hd[1], hd[0]];
      const mid = handTE(0.5);
      if ((mid[0] - G.W[0]) * hn[0] + (mid[1] - G.W[1]) * hn[1] < 0) hn = [-hn[0], -hn[1]];
      const arm = [G.W[0] - G.S[0], G.W[1] - G.S[1]];
      const al = Math.hypot(arm[0], arm[1]);
      const ad = [arm[0] / al, arm[1] / al];
      let an = [-ad[1], ad[0]];
      const amid = armTE(0.5);
      if ((amid[0] - G.S[0]) * an[0] + (amid[1] - G.S[1]) * an[1] < 0) an = [-an[0], -an[1]];

      // primaries P1 (k = 1, innermost, tip at TE2) to P10 (outermost, tip at the wingtip)
      const prim = [];
      // 06's fan: 10 feathers radiating from the wrist to the serrated tips (tips[0] is the wingtip = P10),
      // shafts from 25 % of the way out, as 06 draws them on the match frame
      for (let k = 1; k <= 10; k++) {
        const tipE = O.tips[10 - k];
        const base = lerp2(G.W, tipE, 0.25);
        const tip = lerp2(G.W, tipE, 0.97);
        const len = Math.hypot(tip[0] - base[0], tip[1] - base[1]);
        prim.push({ k, base, tip, len, w: 20 + k * 0.6 });
      }
      // the inner web opens toward P1 (the body side of the fan)
      for (const p of prim) {
        const dx = p.tip[0] - p.base[0], dy = p.tip[1] - p.base[1];
        const l = Math.hypot(dx, dy);
        p.d = [dx / l, dy / l];
        let n = [-p.d[1], p.d[0]];
        const ref = [prim[0].tip[0] - prim[9].tip[0], prim[0].tip[1] - prim[9].tip[1]];
        if (n[0] * ref[0] + n[1] * ref[1] < 0) n = [-n[0], -n[1]];
        p.n = n;
      }
      // secondaries: 14 from the arm to the arm's trailing edge
      const sec = [];
      for (let k = 0; k < 14; k++) {
        const f = (k + 0.5) / 14;
        const tipE = armTE(f);
        const a = lerp(0.96, 0.12, f);
        const base = [G.S[0] + arm[0] * a + an[0] * 26, G.S[1] + arm[1] * a + an[1] * 26];
        sec.push({ base, tip: lerp2(tipE, base, 0.03) });
      }
      // covert rows: scallops parallel to the leading edge
      const rows = [];
      for (let r = 0; r < 3; r++) {
        const row = [];
        const depth = 34 + r * 30;
        const n = 12 - r * 2;
        for (let j = 0; j <= n; j++) {
          const f = 0.06 + (j / n) * 0.62;
          const p = lead(f);
          const q = lead(Math.min(1, f + 0.01));
          const tx = q[0] - p[0], ty = q[1] - p[1];
          const tl = Math.hypot(tx, ty) || 1;
          let nx = -ty / tl, ny = tx / tl;
          // into the wing
          const c = lerp2(G.S, G.T, 0.5);
          if ((c[0] - p[0]) * nx + (c[1] - p[1]) * ny < 0) (nx = -nx), (ny = -ny);
          row.push([p[0] + nx * depth, p[1] + ny * depth]);
        }
        rows.push(row);
      }
      return { G, outline, inner, notches: O.notches, tips: O.tips, handTE, armTE, lead, hand, hd, hn, arm, ad, an, prim, sec, rows, near };
    }

    const near = wing(G2_NEAR, true);
    const far = wing(G2_FAR, false);

    // body, head, tail and legs at the G2 pose (the same constructions as 06)
    const body = L.ellipsePts(G2_BODY.cx, G2_BODY.cy, G2_BODY.rx, G2_BODY.ry, 64, G2_BODY.rot);
    const bodyIn = L.ellipsePts(G2_BODY.cx, G2_BODY.cy, G2_BODY.rx - 9, G2_BODY.ry - 9, 64, G2_BODY.rot);
    const tt = toLocal(G2_BODY, G2_TAIL_TIP[0], G2_TAIL_TIP[1]);
    const s1 = toLocal(G2_BODY, G2_STREAMER[0], G2_STREAMER[1]);
    const s2 = [s1[0] - 14, s1[1] + 12];
    const B = G2_BODY;
    const tail = [
      toWorld(B, 92, -44), toWorld(B, 170, -8), toWorld(B, s1[0], s1[1]), toWorld(B, tt[0] + 6, tt[1] - 2), toWorld(B, tt[0], tt[1]),
      toWorld(B, s2[0], s2[1]), toWorld(B, tt[0] - 16, tt[1] + 10), toWorld(B, 118, 46),
    ];
    // neck bridge, as 06
    const front = toWorld(B, -B.rx * 0.72, -B.ry * 0.1);
    const hx = G2_HEAD[0], hy = G2_HEAD[1], hr = G2_HR;
    const dx = front[0] - hx, dy = front[1] - hy;
    const dl = Math.hypot(dx, dy) || 1;
    const nx = -dy / dl, ny = dx / dl;
    const hw = hr * 0.78, bw = B.ry * 0.78;
    const hc = [hx + (dx / dl) * hr * 0.3, hy + (dy / dl) * hr * 0.3];
    const neck = [
      [hc[0] + nx * hw, hc[1] + ny * hw], [front[0] + nx * bw, front[1] + ny * bw],
      [front[0] - nx * bw, front[1] - ny * bw], [hc[0] - nx * hw, hc[1] - ny * hw],
    ];
    const na = Math.atan2(dy, dx);
    const headArc = [];
    for (let j = 0; j <= 36; j++) {
      const a = na + 0.95 + (j / 36) * (TAU - 1.9);
      headArc.push([hx + Math.cos(a) * hr, hy + Math.sin(a) * hr]);
    }
    // bill, as 06 at the G2 pose
    const base = G2_BILL[0], tip = G2_BILL[1];
    const bdx = tip[0] - base[0], bdy = tip[1] - base[1];
    const bl = Math.hypot(bdx, bdy);
    const bnx = -bdy / bl, bny = bdx / bl;
    const bill = [
      [base[0] - bnx * 9 + (bdx / bl) * 10, base[1] - bny * 9 + (bdy / bl) * 10],
      [lerp(base[0], tip[0], 0.55) - bnx * 5.5, lerp(base[1], tip[1], 0.55) - bny * 5.5],
      tip,
      [lerp(base[0], tip[0], 0.6) + bnx * 4, lerp(base[1], tip[1], 0.6) + bny * 4],
      [base[0] + bnx * 9 + (bdx / bl) * 8, base[1] + bny * 9 + (bdy / bl) * 8],
    ];
    const cap = [];
    for (let j = 0; j <= 16; j++) {
      const a = -80 * DEG + (j / 16) * 110 * DEG;
      cap.push([hx + Math.cos(a) * hr * 0.96, hy + Math.sin(a) * hr * 0.96]);
    }
    cap.push([hx + hr * 0.62, hy + hr * 0.42], [hx + hr * 0.2, hy + hr * 0.2], [hx - hr * 0.2, hy + hr * 0.08], [hx - hr * 0.42, hy - hr * 0.05], [hx - hr * 0.32, hy - hr * 0.25], [hx - hr * 0.08, hy - hr * 0.62]);

    // the rock (same silhouette as 06)
    const rock = [
      [236, GROUND + 18], [222, 1396], [238, 1362], [270, 1338], [320, 1326], [420, 1320], [540, 1318], [660, 1320], [760, 1324],
      [812, 1334], [846, 1356], [866, 1390], [872, GROUND + 22], [720, GROUND + 34], [520, GROUND + 38], [340, GROUND + 32],
    ];
    const rockTop = [[270, 1338], [320, 1322], [420, 1314], [540, 1312], [660, 1314], [760, 1318], [812, 1334], [700, 1340], [540, 1342], [380, 1342]];
    // strata and section cells in the rock
    const rr = L.rng(sd('rock'));
    const strata = [];
    for (let k = 0; k < 7; k++) {
      const y = 1352 + k * 11 + rr() * 4;
      const x0 = 240 + rr() * 60 + k * 2, x1 = 850 - rr() * 50 - k * 3;
      const row = [];
      for (let j = 0; j <= 10; j++) row.push([lerp(x0, x1, j / 10), y + Math.sin(j * 0.9 + k) * 2.2]);
      strata.push(row);
    }
    // ground section: rectangular shingle cells in rows below the ground line
    const cells = [];
    const cr = L.rng(sd('cells'));
    for (let row = 0; row < 7; row++) {
      const y0 = GROUND + 36 + row * 26;
      let x = -20 + cr() * 30;
      while (x < 1100) {
        const w = 28 + cr() * 46;
        const h = 14 + cr() * 8;
        if (!(y0 < GROUND + 40 && x > 210 && x < 880)) cells.push([x, y0 + cr() * 5, w - 4, h, 0.2 + cr() * 0.2]);
        x += w;
      }
    }
    // pebble ellipses along the ground line (the shingle, seen in section)
    const pebbles = [];
    const pr = L.rng(sd('peb'));
    for (let x = -10; x < 1100;) {
      const rx = 10 + pr() * 18, ry = 5 + pr() * 6;
      if (x + rx < 215 || x - rx > 880) pebbles.push([x + rx, GROUND + 16 + (pr() - 0.5) * 6, rx, ry, (pr() - 0.5) * 0.5]);
      x += rx * 2 + 2 + pr() * 8;
    }

    // body tissue: feather tracts as rows of small arcs
    const tracts = [];
    const tr = L.rng(sd('tract'));
    for (let row = 0; row < 6; row++) {
      const ly = -B.ry * 0.62 + row * 22;
      for (let k = 0; k < 11; k++) {
        const lx = -B.rx * 0.78 + (k + (row % 2) * 0.5) * 27 + (tr() - 0.5) * 4;
        if ((lx / (B.rx - 14)) ** 2 + (ly / (B.ry - 14)) ** 2 > 0.92) continue;
        tracts.push([lx, ly]);
      }
    }

    // P7 flakes: slivers of sheath shed at the tip on the split, then along the unrolling front
    const fr = L.rng(sd('flakes'));
    const flakes = [];
    for (let i = 0; i < 26; i++) {
      const s = i < 8 ? 0.86 + fr() * 0.13 : 0.14 + fr() * 0.72;
      flakes.push({ s, side: fr() < 0.5 ? -1 : 1, v: 40 + fr() * 70, sp: (fr() - 0.5) * 9, len: 5 + fr() * 7, early: i < 8, j: fr() });
    }
    // ripple flakes (3 per other primary)
    const rflakes = [];
    for (let k = 1; k <= 10; k++) {
      if (k === P7) continue;
      for (let i = 0; i < 3; i++) rflakes.push({ k, s: 0.3 + fr() * 0.65, side: fr() < 0.5 ? -1 : 1, v: 40 + fr() * 50, sp: (fr() - 0.5) * 8, len: 4 + fr() * 5 });
    }

    // cutaway: 16 barb ridge cells in a ring, index 0 is the rachis ridge
    const ridges = [];
    for (let i = 0; i < 16; i++) {
      const a = -Math.PI / 2 + (i / 16) * TAU;
      ridges.push({ a, fx: CUT.x - 84 + (i / 15) * 168 });
    }
    // order the flat row so the rachis sits in the middle, barbs out to both vanes
    const order = [];
    for (let i = 0; i < 16; i++) order.push(i);
    // ring index i -> flat slot: walk both ways from the rachis
    const slot = new Array(16);
    slot[0] = 7;
    for (let j = 1; j <= 8; j++) {
      if (j < 8) slot[j] = 7 + j;
      slot[16 - j] = 7 - j;
    }
    slot[8] = 15;
    for (let i = 0; i < 16; i++) ridges[i].fx = CUT.x - 84 + (slot[i] / 15) * 168;

    // P7 section point and connectors
    const p7 = near.prim[P7 - 1];
    const secPt = lerp2(p7.base, p7.tip, SEC_S);
    const tipPt = lerp2(p7.base, p7.tip, 0.95);
    const vanePt = lerp2(p7.base, p7.tip, 0.7);
    // routed over the far wingtip and down outside its trailing edge, so it never crosses the far wing
    const conCut = crOpen([secPt, [600, 520], [330, 340], [150, 360], [96, 520], [92, 820], [112, 1080], [CUT.x - 20, CUT.y - CUT.r - 3]], 10);
    const conShe = cubic(tipPt, [1000, 520], [1004, 900], [SHE.x + 36, SHE.y - SHE.r + 8], 50);
    const conVan = cubic(vanePt, [1052, 700], [1060, 1250], [VAN.x + 44, VAN.y - VAN.r + 20], 60);

    GEO = { near, far, body, bodyIn, tail, neck, headArc, bill, cap, rock, rockTop, strata, cells, pebbles, tracts, flakes, rflakes, ridges, secPt, conCut, conShe, conVan };
    return GEO;
  }

  // =====================================================================================
  // drawing helpers
  // =====================================================================================

  // a thin schematic polyline that boils on the 12 fps clock
  function sline(ctx, L, pts, o) {
    if (!pts || pts.length < 2) return;
    const amp = o.amp != null ? o.amp : 0.6;
    const seed = (o.seed | 0) + (o.bi | 0) * 131;
    const closed = !!o.closed;
    ctx.save();
    ctx.globalAlpha *= o.alpha != null ? o.alpha : 1;
    ctx.strokeStyle = o.color || L.pal.lavender;
    ctx.lineWidth = o.width || 1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (o.dash) ctx.setLineDash(o.dash);
    ctx.beginPath();
    let s = 0;
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      if (i > 0) s += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      const tx = b[0] - a[0], ty = b[1] - a[1];
      const tl = Math.hypot(tx, ty) || 1;
      const dd = amp ? amp * L.noise1(s * 0.02, seed) : 0;
      const x = p[0] - (ty / tl) * dd, y = p[1] + (tx / tl) * dd;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    if (closed) ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  // many short segments in one stroke: segs = [[x0,y0,x1,y1], ...]
  function segs(ctx, list, color, alpha, width, bi, seed, amp = 0.5) {
    if (!list.length) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha *= alpha;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      const j0 = amp ? (FILM.lib.hash(seed, i, bi) / 4294967296 - 0.5) * 2 * amp : 0;
      const j1 = amp ? (FILM.lib.hash(seed, i, bi, 7) / 4294967296 - 0.5) * 2 * amp : 0;
      ctx.moveTo(s[0] + j0, s[1] - j1);
      ctx.lineTo(s[2] - j1, s[3] + j0);
    }
    ctx.stroke();
    ctx.restore();
  }

  function dots(ctx, list, color, alpha) {
    const p = new Path2D();
    for (const d of list) {
      p.moveTo(d[0] + d[2], d[1]);
      p.arc(d[0], d[1], d[2], 0, TAU);
    }
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = color;
    ctx.fill(p);
    ctx.restore();
  }

  // solid: an occluding fill that ignores the caller's dimming (so dimmed lines never show through)
  function fillPts(ctx, pts, color, alpha, solid) {
    ctx.save();
    if (solid) ctx.globalAlpha = alpha;
    else ctx.globalAlpha *= alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    FILM.lib.tracePath(ctx, pts, true);
    ctx.fill();
    ctx.restore();
  }

  // the primary double outline (art bible 3.2): outer 2.5 px lavender 85 %, inner 1.5 px 9 px inside at 50 %
  function doubleOutline(ctx, L, outer, inner, seed, bi, alpha = 1) {
    const P = L.pal;
    sline(ctx, L, outer, { closed: true, color: P.lavender, alpha: 0.85 * alpha, width: 2.5, seed, bi, amp: 0.7 });
    sline(ctx, L, inner, { closed: true, color: P.lavender, alpha: 0.5 * alpha, width: 1.5, seed: seed + 1, bi, amp: 0.6 });
  }

  // =====================================================================================
  // backdrop and construction
  // =====================================================================================

  function drawBackdrop(ctx, L, g, t, bi) {
    const P = L.pal;
    L.blueprint(ctx, { center: [540, 1000], circles: 3, diagonals: 2, seed: 707 });
    // the circle about the shoulders through both wingtips (as 06's construction circle)
    const cx = 540, cy = 1175;
    const rT = Math.hypot(G2_NEAR.T[0] - cx, G2_NEAR.T[1] - cy);
    L.guideCircle(ctx, cx, cy, rT, { alpha: 0.14, width: 1.5 });
    L.guideCircle(ctx, cx, cy, rT + 14, { alpha: 0.1, width: 1, dash: [2, 9] });
    L.guideCircle(ctx, cx, cy, 330, { alpha: 0.1, width: 1.2 });
    // the fan arc of the hands, ticked
    L.ticks(ctx, cx, cy, { r: rT - 6, n: 72, len: 6, major: 6, majorLen: 12, start: -Math.PI, span: Math.PI, color: P.lavender, alpha: 0.22, width: 1 });
    // shoulder vertical, rock-top level, ground line
    sline(ctx, L, [[540, 150], [540, 1780]], { alpha: 0.2, width: 1, amp: 0, dash: [3, 6] });
    sline(ctx, L, [[0, ROCK_TOP], [1080, ROCK_TOP]], { alpha: 0.16, width: 1, amp: 0, dash: [10, 8] });
    sline(ctx, L, [[0, GROUND], [1080, GROUND]], { color: P.lavender, alpha: 0.55, width: 1.5, seed: sd('gl'), bi, amp: 0.5 });
    sline(ctx, L, [[0, GROUND + 6], [1080, GROUND + 6]], { alpha: 0.2, width: 1, amp: 0 });
    L.ticks(ctx, 0, GROUND, { kind: 'linear', length: 1080, angle: 0, n: 54, len: 5, major: 6, majorLen: 11, side: 1, color: P.lavender, alpha: 0.3, width: 1, baseline: false });
    // dashed rays from the shoulders to the wingtips
    for (const G of [G2_NEAR, G2_FAR]) sline(ctx, L, [G.S, G.T], { alpha: 0.18, width: 1, amp: 0, dash: [6, 7] });
    // corner diagonals
    sline(ctx, L, [[0, 180], [540, 1175]], { alpha: 0.08, width: 1, amp: 0 });
    sline(ctx, L, [[1080, 180], [540, 1175]], { alpha: 0.08, width: 1, amp: 0 });
    // side tick scales
    L.ticks(ctx, 40, 220, { kind: 'linear', length: 1320, angle: Math.PI / 2, n: 66, len: 5, major: 5, majorLen: 12, side: -1, color: P.lavender, alpha: 0.28, width: 1 });
    L.ticks(ctx, 1040, 220, { kind: 'linear', length: 1320, angle: Math.PI / 2, n: 66, len: 5, major: 5, majorLen: 12, side: 1, color: P.lavender, alpha: 0.28, width: 1 });
  }

  function drawGround(ctx, L, g, bi) {
    const P = L.pal;
    // pebbles in section along the ground line
    ctx.save();
    ctx.strokeStyle = P.lavender;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.34;
    ctx.beginPath();
    for (const p of g.pebbles) {
      ctx.moveTo(p[0] + p[2], p[1]);
      ctx.ellipse(p[0], p[1], p[2], p[3], p[4], 0, TAU);
    }
    ctx.stroke();
    ctx.restore();
    // rectangular shingle cells below, fading downward
    ctx.save();
    ctx.strokeStyle = P.lavender;
    ctx.lineWidth = 1;
    for (let a = 0; a < 3; a++) {
      ctx.beginPath();
      for (const c of g.cells) {
        const fade = 1 - clamp((c[1] - GROUND) / 220);
        const band = c[4] * fade;
        if ((band > 0.26 ? 2 : band > 0.14 ? 1 : 0) !== a) continue;
        ctx.rect(c[0], c[1], c[2], c[3]);
      }
      ctx.globalAlpha = [0.1, 0.18, 0.28][a];
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawRock(ctx, L, g, bi) {
    const P = L.pal;
    fillPts(ctx, g.rock, P.navy, 0.55);
    // strata
    for (let k = 0; k < g.strata.length; k++) sline(ctx, L, g.strata[k], { alpha: 0.22, width: 1, seed: sd('str', k), bi, amp: 0.5 });
    // small section cells in the rock face
    ctx.save();
    ctx.beginPath();
    L.tracePath(ctx, g.rock, true);
    ctx.clip();
    L.hexLattice(ctx, null, { r: 11, alpha: 0.12, width: 1, seed: sd('rockhex'), bounds: [220, 1340, 660, 120], boil: bi });
    ctx.restore();
    sline(ctx, L, g.rockTop, { closed: true, alpha: 0.4, width: 1.2, seed: sd('rtop'), bi });
    sline(ctx, L, g.rock, { closed: true, color: P.lavender, alpha: 0.6, width: 1.5, seed: sd('rock'), bi, amp: 0.7 });
  }

  // =====================================================================================
  // the bird
  // =====================================================================================

  // stipple the trailing (shadow) half of a wing: density rises with distance from the shoulder-tip line
  function wingStipple(ctx, L, w, alpha, seed, bi) {
    const G = w.G;
    const dx = G.T[0] - G.S[0], dy = G.T[1] - G.S[1];
    const dl = Math.hypot(dx, dy);
    const ux = -dy / dl, uy = dx / dl;
    const sgn = (w.handTE(0.5)[0] - G.S[0]) * ux + (w.handTE(0.5)[1] - G.S[1]) * uy > 0 ? 1 : -1;
    L.stipple(ctx, w.outline, {
      spacing: 7, r: [0.6, 1.2], color: L.pal.lavender, alpha, seed, boil: bi,
      density: (x, y) => sstep(20, 150, ((x - G.S[0]) * ux + (y - G.S[1]) * uy) * sgn),
    });
  }

  function drawFarWing(ctx, L, w, bi) {
    const P = L.pal;
    const G = w.G;
    fillPts(ctx, w.outline, P.navy, 0.5, true);
    ctx.save();
    ctx.beginPath();
    L.tracePath(ctx, w.outline, true);
    ctx.clip();
    // bones
    sline(ctx, L, [G.S, G.W, lerp2(G.W, G.T, 0.42)], { alpha: 0.3, width: 1.2, dash: [4, 5], amp: 0 });
    // secondaries and primaries as thin lines
    segs(ctx, w.sec.map((s) => [s.base[0], s.base[1], s.tip[0], s.tip[1]]), P.lavender, 0.3, 1, bi, sd('fsec'));
    segs(ctx, w.prim.map((p) => [p.base[0], p.base[1], p.tip[0], p.tip[1]]), P.lavender, 0.38, 1, bi, sd('fpri'));
    // feather edges: each primary's inner web, a faint second line
    segs(ctx, w.prim.map((p) => [p.base[0] + p.n[0] * 8, p.base[1] + p.n[1] * 8, p.tip[0] + p.n[0] * 3, p.tip[1] + p.n[1] * 3]), P.lavender, 0.16, 1, bi, sd('fpri2'));
    for (let r = 0; r < w.rows.length; r++) sline(ctx, L, w.rows[r], { alpha: 0.22, width: 1, seed: sd('frow', r), bi });
    L.hexLattice(ctx, null, { r: 9, alpha: 0.1, width: 1, seed: sd('fhex'), bounds: [140, 400, 380, 840], boil: bi });
    wingStipple(ctx, L, w, 0.4, sd('fst'), bi);
    ctx.restore();
    sline(ctx, L, w.outline, { closed: true, color: P.lavender, alpha: 0.6, width: 1.5, seed: sd('fo'), bi, amp: 0.7 });
    sline(ctx, L, w.inner, { closed: true, color: P.lavender, alpha: 0.25, width: 1, seed: sd('fi'), bi, amp: 0.5 });
  }

  function drawTailLegs(ctx, L, g, bi) {
    const P = L.pal;
    fillPts(ctx, g.tail, P.navy, 0.6, true);
    const B = G2_BODY;
    const lines = [];
    for (let k = 1; k < 6; k++) {
      const a = toWorld(B, 100 + k * 3, -34 + k * 13);
      const b = lerp2(g.tail[3], g.tail[6], k / 6);
      lines.push([a[0], a[1], b[0], b[1]]);
    }
    segs(ctx, lines, P.lavender, 0.35, 1, bi, sd('tl'));
    sline(ctx, L, g.tail, { closed: true, color: P.lavender, alpha: 0.75, width: 2, seed: sd('tail'), bi });
    // legs: very short, 24 px from the belly to the rock top, three toes forward
    for (let k = 0; k < 2; k++) {
      const hx = G2_HIPS[k][0], hy = G2_HIPS[k][1];
      sline(ctx, L, [[hx, hy], [hx - 2, ROCK_TOP - 3]], { color: P.lavender, alpha: 0.8, width: 2.5, amp: 0 });
      const fx = hx - 2, fy = ROCK_TOP - 2;
      const toes = [[fx - 26, fy + 1], [fx - 21, fy + 4], [fx - 14, fy - 2]];
      segs(ctx, toes.map((tp) => [fx, fy, tp[0], tp[1]]).concat([[fx + 1, fy, fx + 8, fy + 1]]), P.lavender, 0.8, 1.6, bi, sd('toe', k), 0.3);
      dots(ctx, [[hx - 1, hy + 11, 2.2]], P.lineWhite, 0.6);
    }
  }

  function drawBody(ctx, L, g, bi) {
    const P = L.pal;
    const B = G2_BODY;
    fillPts(ctx, g.body, P.navy, 0.72, true);
    fillPts(ctx, g.neck, P.navy, 0.72, true);
    ctx.save();
    ctx.beginPath();
    L.tracePath(ctx, g.body, true);
    ctx.clip();
    L.hexLattice(ctx, null, { r: 8, alpha: 0.13, width: 1, seed: sd('bodyhex'), bounds: [380, 1140, 320, 180], boil: bi });
    // feather tracts: small scallops
    const p = new Path2D();
    for (let i = 0; i < g.tracts.length; i++) {
      const [lx, ly] = g.tracts[i];
      const a = toWorld(B, lx, ly), b = toWorld(B, lx + 20, ly), m = toWorld(B, lx + 10, ly + 9);
      const j = (L.hash(sd('tr'), i, bi) / 4294967296 - 0.5) * 0.8;
      p.moveTo(a[0] + j, a[1]);
      p.quadraticCurveTo(m[0], m[1] + j, b[0], b[1]);
    }
    ctx.strokeStyle = P.lavender;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 1;
    ctx.stroke(p);
    ctx.globalAlpha = 1;
    // fine tissue stipple, denser on the lower-right shadow side
    L.stipple(ctx, g.body, {
      spacing: 6, r: [0.6, 1.2], color: P.lavender, alpha: 0.45, seed: sd('bst'), boil: bi,
      density: (x, y) => {
        const l = toLocal(B, x, y);
        return sstep(0.1, 1.0, (l[0] / B.rx) * 0.4 + (l[1] / B.ry) * 0.9);
      },
    });
    // the keel and the body axis
    ctx.globalAlpha = 1;
    ctx.restore();
    const ax0 = toWorld(B, -B.rx + 12, 0), ax1 = toWorld(B, B.rx - 12, 0);
    sline(ctx, L, [ax0, ax1], { alpha: 0.25, width: 1, amp: 0, dash: [8, 6] });
    const keel = [];
    for (let k = 0; k <= 20; k++) {
      const a = 0.35 + (k / 20) * 1.9;
      keel.push(toWorld(B, Math.cos(a) * B.rx * 0.8, Math.sin(a) * B.ry * 0.66));
    }
    sline(ctx, L, keel, { alpha: 0.3, width: 1, seed: sd('keel'), bi });
    doubleOutline(ctx, L, g.body, g.bodyIn, sd('body'), bi);
  }

  function drawHead(ctx, L, g, bi) {
    const P = L.pal;
    const hx = G2_HEAD[0], hy = G2_HEAD[1], hr = G2_HR;
    const disc = L.ellipsePts(hx, hy, hr, hr, 40, 0);
    fillPts(ctx, disc, P.navy, 0.8, true);
    // bill (the juvenile's is black: drawn as plain lavender line work, no tint)
    fillPts(ctx, g.bill, P.navy, 0.8, true);
    sline(ctx, L, g.bill, { closed: true, color: P.lavender, alpha: 0.85, width: 2, seed: sd('bill'), bi, amp: 0.3 });
    sline(ctx, L, [lerp2(G2_BILL[0], G2_BILL[1], 0.05), lerp2(G2_BILL[0], G2_BILL[1], 0.6)], { alpha: 0.5, width: 1, amp: 0 });
    // skull construction: the smudgy rear crown as a stippled lattice region
    ctx.save();
    ctx.beginPath();
    L.tracePath(ctx, g.cap, true);
    ctx.clip();
    L.hexLattice(ctx, null, { r: 5, alpha: 0.28, width: 1, seed: sd('caphex'), bounds: [340, 1080, 120, 110], boil: bi });
    ctx.restore();
    sline(ctx, L, g.cap, { closed: true, alpha: 0.4, width: 1, seed: sd('cap'), bi, dash: [3, 3] });
    // eye
    const ex = hx - hr * 0.3, ey = hy - hr * 0.08;
    sline(ctx, L, circlePts(ex, ey, 7.5, 20), { closed: true, color: P.lineWhite, alpha: 0.85, width: 1.5, amp: 0 });
    dots(ctx, [[ex, ey, 2.6]], P.lineWhite, 0.8);
    L.guideCircle(ctx, ex, ey, 16, { alpha: 0.25, width: 1, dash: [2, 3] });
    // head outline, double, open where it meets the neck; nape and throat strokes
    const inner = g.headArc.map((p) => [hx + (p[0] - hx) * (hr - 9) / hr, hy + (p[1] - hy) * (hr - 9) / hr]);
    sline(ctx, L, g.headArc, { color: P.lavender, alpha: 0.85, width: 2.5, seed: sd('head'), bi, amp: 0.6 });
    sline(ctx, L, inner, { color: P.lavender, alpha: 0.5, width: 1.5, seed: sd('head2'), bi, amp: 0.5 });
    const n = g.neck;
    sline(ctx, L, [n[3], lerp2(n[3], n[2], 0.5), n[2]], { color: P.lavender, alpha: 0.85, width: 2.5, seed: sd('nape'), bi });
    sline(ctx, L, [n[0], lerp2(n[0], n[1], 0.6)], { color: P.lavender, alpha: 0.85, width: 2.5, seed: sd('throat'), bi });
  }

  // ---- a primary: rachis, rolled or unrolled vane, sheath ----
  // st: { open 0..1 (unroll progress, tip to base), hi 0..1 (P7 highlight), split 0..1, blood 0..1, alpha }
  // sc: width scale (P7 grows to 1.5x while it is the focus)
  function vaneHalf(p, s, open, side, sc = 1) {
    // envelope of a primary: bare calamus near the base, full width from 0.3, a pointed tip
    const env = sstep(0.05, 0.3, s) * (s > 0.8 ? Math.sqrt(Math.max(0, 1 - ((s - 0.8) / 0.2) ** 2)) : 1);
    const full = side > 0 ? p.w * env : p.w * 0.38 * env;
    const rolled = 4.2 * sstep(0.02, 0.1, s) * (s > 0.94 ? Math.max(0, 1 - (s - 0.94) / 0.06) : 1);
    return lerp(rolled, full, open) * sc;
  }
  function featherPt(p, s, off) {
    const bow = 0;
    const x = p.base[0] + (p.tip[0] - p.base[0]) * s + p.n[0] * (bow + off);
    const y = p.base[1] + (p.tip[1] - p.base[1]) * s + p.n[1] * (bow + off);
    return [x, y];
  }
  // how far the vane has opened at s, for an unroll progress u (the front runs tip -> 0.12)
  function openAt(s, u) {
    if (u <= 0) return 0;
    const f = 1 - u * 0.88;
    return sstep(f - 0.02, f + 0.1, s);
  }

  // a peeled strip of sheath hanging off the peel front: a double wall curling outward and back down
  function peelStrip(ctx, L, p, s0, side, r, curl, col, alpha, width, seed, bi) {
    const base = featherPt(p, s0, side * r);
    const n = [p.n[0] * side, p.n[1] * side];
    const outer = [base], inner = [featherPt(p, s0, side * (r - 3))];
    let x = base[0], y = base[1];
    let xi = inner[0][0], yi = inner[0][1];
    const step = 4.2;
    for (let j = 0; j < 9; j++) {
      const phi = 0.2 + (j / 8) * curl;
      const dx = p.d[0] * Math.cos(phi) + n[0] * Math.sin(phi), dy = p.d[1] * Math.cos(phi) + n[1] * Math.sin(phi);
      x += dx * step;
      y += dy * step;
      xi += dx * step * 0.9;
      yi += dy * step * 0.9;
      outer.push([x, y]);
      inner.push([xi + n[0] * 0.2, yi + n[1] * 0.2]);
    }
    sline(ctx, L, outer, { color: col, alpha, width, seed, bi, amp: 0.3 });
    sline(ctx, L, inner, { color: col, alpha: alpha * 0.6, width: width * 0.6, seed: seed + 1, bi, amp: 0.3 });
  }

  // st: { open 0..1 (unroll, tip to base), hi 0..1 (P7 focus), split 0..1, blood 0..1, ping 0..1, alpha }
  // P7 in focus: 1.5x wide, lineWhite, barbs, a double-walled sheath peeling from the tip.
  // The others: thin lavender outlines only, so P7 stays the brightest thing on the wing.
  function drawPrimary(ctx, L, p, st, bi) {
    const P = L.pal;
    const hi = st.hi || 0;
    const focus = hi > 0.5;
    const sc = 1 + 0.5 * hi;
    const col = focus ? P.lineWhite : P.lavender;
    const lw = focus ? 1.5 : 1; // line width multiplier
    const N = 44;
    const outerE = [], innerE = [];
    const sheathL = [], sheathR = [], sheathLi = [], sheathRi = [];
    const front = st.open > 0 ? 1 - st.open * 0.88 : 1.01;
    const sheathTop = Math.min(front, lerp(0.985, 0.9, st.split || 0));
    for (let i = 0; i <= N; i++) {
      const s = i / N;
      const o = openAt(s, st.open);
      outerE.push(featherPt(p, s, -vaneHalf(p, s, o, -1, sc)));
      innerE.push(featherPt(p, s, vaneHalf(p, s, o, 1, sc)));
      if (s <= sheathTop) {
        const r = vaneHalf(p, s, 0, 1, sc) + 1.5 * sc;
        sheathL.push(featherPt(p, s, -r));
        sheathR.push(featherPt(p, s, r));
        sheathLi.push(featherPt(p, s, -(r - 3)));
        sheathRi.push(featherPt(p, s, r - 3));
      }
    }
    const ping = st.ping || 0;
    const baseA = st.alpha * (focus ? 1 : 0.6 + 0.35 * ping);
    // ghost of the vane to come (dashed), fading as the real vane opens
    const ghostA = (1 - st.open) * (focus ? 0.5 : 0.35);
    if (ghostA > 0.01) {
      const ghost = [];
      for (let i = 0; i <= N; i++) ghost.push(featherPt(p, i / N, vaneHalf(p, i / N, 1, 1, sc)));
      for (let i = N; i >= 0; i--) ghost.push(featherPt(p, i / N, -vaneHalf(p, i / N, 1, -1, sc)));
      sline(ctx, L, ghost, { closed: true, color: col, alpha: ghostA * st.alpha, width: 1, amp: 0, dash: [3, 4] });
    }
    // opened vane
    if (st.open > 0) {
      const poly = outerE.concat(innerE.slice().reverse());
      fillPts(ctx, poly, focus ? P.navyLight : P.navy, (focus ? 0.8 : 0.5) * st.alpha);
      sline(ctx, L, poly, { closed: true, color: col, alpha: (focus ? 0.95 : 0.8) * baseA, width: focus ? 2.4 : 1, seed: sd('vane', p.k), bi, amp: 0.4 });
      if (focus) {
        // barbs: angled toward the tip, spaced along the rachis
        const list = [];
        for (let s = 0.08; s < 0.99; s += 1 / 80) {
          const o = openAt(s, st.open);
          if (o < 0.3) continue;
          for (const side of [-1, 1]) {
            const w = vaneHalf(p, s, o, side, sc);
            if (w < 2.5) continue;
            const a = featherPt(p, s, side * 1.5);
            const ds = (w / p.len) * 0.9; // barbs sweep toward the tip
            const b = featherPt(p, Math.min(1, s + ds), side * (w - 1.5));
            list.push([a[0], a[1], b[0], b[1]]);
          }
        }
        segs(ctx, list, col, 0.6 * st.alpha, 1.1, bi, sd('barb', p.k), 0.3);
      }
    }
    // sheath: a double-walled tube with waxy annuli (single thin walls on the others)
    if (sheathL.length > 1) {
      const wa = (focus ? 0.95 : 0.7) * baseA;
      sline(ctx, L, sheathL, { color: col, alpha: wa, width: 1.3 * lw, seed: sd('shl', p.k), bi, amp: 0.35 });
      sline(ctx, L, sheathR, { color: col, alpha: wa, width: 1.3 * lw, seed: sd('shr', p.k), bi, amp: 0.35 });
      if (focus) {
        sline(ctx, L, sheathLi, { color: P.lavender, alpha: 0.7 * st.alpha, width: 1.1, seed: sd('shli', p.k), bi, amp: 0.3 });
        sline(ctx, L, sheathRi, { color: P.lavender, alpha: 0.7 * st.alpha, width: 1.1, seed: sd('shri', p.k), bi, amp: 0.3 });
      }
      const rings = [];
      const n = sheathL.length;
      for (let i = 3; i < n - 1; i += focus ? 2 : 3) rings.push([sheathL[i][0], sheathL[i][1], sheathR[i][0], sheathR[i][1]]);
      segs(ctx, rings, col, (focus ? 0.5 : 0.3) * st.alpha, 1, bi, sd('ann', p.k), 0.2);
      if (sheathTop >= 0.97) {
        // intact: a closed pointed cap
        const tp = featherPt(p, 1, 0);
        sline(ctx, L, [sheathL[n - 1], tp, sheathR[n - 1]], { color: col, alpha: wa, width: 1.3 * lw, amp: 0 });
      } else if (focus) {
        // split: the two halves peel back from the front, curling further the longer they have been open
        const r = vaneHalf(p, sheathTop, 0, 1, sc) + 1.5 * sc;
        const curl = 1.2 + 1.3 * clamp((st.split || 0) * 0.5 + st.open);
        for (const side of [-1, 1]) peelStrip(ctx, L, p, sheathTop, side, r, curl, col, 0.95 * st.alpha, 1.8, sd('peel', side), bi);
      }
    }
    // rachis (shaft) and pulp core
    const shaft = [];
    for (let i = 0; i <= 20; i++) shaft.push(featherPt(p, (i / 20) * 0.99, 0));
    sline(ctx, L, shaft, { color: col, alpha: (focus ? 1 : 0.75) * baseA, width: focus ? 2.6 : 1.1, seed: sd('shaft', p.k), bi, amp: 0.3 });
    if (st.blood > 0.01) {
      const core = [];
      const top = Math.min(0.92, front);
      for (let i = 0; i <= 16; i++) core.push(featherPt(p, 0.02 + (i / 16) * (top - 0.02), 3.2));
      sline(ctx, L, core, { color: P.schemBill, alpha: 0.9 * st.blood * st.alpha, width: 2, amp: 0, dash: [6, 3] });
    }
    // calamus in the skin: a short socket
    const b0 = featherPt(p, -0.03, -5 * sc), b1 = featherPt(p, -0.03, 5 * sc);
    segs(ctx, [[b0[0], b0[1], b1[0], b1[1]]], col, 0.6 * st.alpha, 1.2 * lw, bi, sd('sock', p.k));
  }

  function drawNearWing(ctx, L, g, w, S, t, tq, bi) {
    const P = L.pal;
    const G = w.G;
    fillPts(ctx, w.outline, P.navy, 0.82);
    ctx.save();
    ctx.beginPath();
    L.tracePath(ctx, w.outline, true);
    ctx.clip();
    const a0 = ctx.globalAlpha;
    ctx.globalAlpha = a0 * S.dim;
    // covert tissue lattice along the leading edge
    ctx.save();
    ctx.beginPath();
    const band = [];
    for (let i = 0; i <= 20; i++) band.push(w.lead(i / 20 * 0.7));
    for (let i = 20; i >= 0; i--) band.push(w.rows[2][Math.round((i / 20) * (w.rows[2].length - 1))]);
    L.tracePath(ctx, band, true);
    ctx.clip();
    L.hexLattice(ctx, null, { r: 8, alpha: 0.2, width: 1, seed: sd('nhex'), bounds: [560, 560, 260, 700], boil: bi });
    ctx.restore();
    // bones: humerus-ulna to the wrist, the hand to the tip; joints as small rings
    sline(ctx, L, [lerp2(G.S, G.W, 0.02), G.W], { alpha: 0.45, width: 1.4, seed: sd('arm'), bi, dash: [6, 4] });
    sline(ctx, L, [G.W, lerp2(G.W, G.T, 0.36)], { alpha: 0.45, width: 1.4, seed: sd('hand'), bi, dash: [6, 4] });
    for (const q of [G.S, G.W, lerp2(G.W, G.T, 0.36)]) sline(ctx, L, circlePts(q[0], q[1], 7, 18), { closed: true, alpha: 0.5, width: 1.2, amp: 0 });
    // covert rows
    for (let r = 0; r < w.rows.length; r++) {
      const row = w.rows[r];
      const pth = [];
      for (let j = 0; j < row.length - 1; j++) {
        const a = row[j], b = row[j + 1];
        const m = [(a[0] + b[0]) / 2 + w.hn[0] * 7, (a[1] + b[1]) / 2 + w.hn[1] * 7];
        for (let k = 0; k <= 4; k++) {
          const u = k / 4;
          pth.push([(1 - u) * (1 - u) * a[0] + 2 * u * (1 - u) * m[0] + u * u * b[0], (1 - u) * (1 - u) * a[1] + 2 * u * (1 - u) * m[1] + u * u * b[1]]);
        }
      }
      sline(ctx, L, pth, { alpha: 0.45 - r * 0.08, width: 1.1, seed: sd('nrow', r), bi, amp: 0.4 });
    }
    // secondaries: shafts, feather edges and blunt tips
    const shafts = [], edges = [];
    for (let k = 0; k < w.sec.length; k++) {
      const s = w.sec[k];
      shafts.push([s.base[0], s.base[1], s.tip[0], s.tip[1]]);
      const nx = w.ad[0] * 11, ny = w.ad[1] * 11;
      edges.push([s.base[0] + nx, s.base[1] + ny, s.tip[0] + nx * 0.9, s.tip[1] + ny * 0.9]);
    }
    segs(ctx, shafts, P.lavender, 0.5, 1.1, bi, sd('ssh'));
    segs(ctx, edges, P.lavender, 0.22, 1, bi, sd('sed'));
    wingStipple(ctx, L, w, 0.45, sd('nst'), bi);
    // primaries: the other nine first, P7 on top
    for (const p of w.prim) if (p.k !== P7) drawPrimary(ctx, L, p, S.prim[p.k], bi);
    // P7 at full strength over the dimmed wing
    ctx.globalAlpha = a0;
    drawPrimary(ctx, L, w.prim[P7 - 1], S.prim[P7], bi);
    ctx.restore();
    // the G2 silhouette stays readable while the interior dims
    doubleOutline(ctx, L, w.outline, w.inner, sd('near'), bi, lerp(1, 0.6, S.hi));
    ctx.save();
    ctx.globalAlpha *= S.dim;
    // the black trailing edge of the juvenile hand is not shown in the blueprint; the feather tips notch the edge
    // the feather separations, from the notches in toward the wrist (as 06)
    const notches = w.notches.map((n) => {
      const a = lerp2(G.W, n, 0.22);
      return [a[0], a[1], n[0], n[1]];
    });
    segs(ctx, notches, P.lavender, 0.7, 1.4, bi, sd('notch'));
    // the fan of the hand: an arc about the wrist from P10 to P1, ticked per feather
    const aT = Math.atan2(w.prim[9].tip[1] - G.W[1], w.prim[9].tip[0] - G.W[0]);
    const a1 = Math.atan2(w.prim[0].tip[1] - G.W[1], w.prim[0].tip[0] - G.W[0]);
    L.arcAnnotation(ctx, G.W[0], G.W[1], 132, aT, a1, { color: P.lineWhite, width: 1.5, alpha: 0.7, endTicks: 8 });
    L.ticks(ctx, G.W[0], G.W[1], { r: 126, n: 10, len: 6, start: aT, span: a1 - aT, color: P.lavender, alpha: 0.5, width: 1 });
    ctx.restore();
  }

  // ---- P7 overlays: follicle glow, climbing glow, section mark, ruler, split flash, flakes ----
  function drawP7Marks(ctx, L, g, S, t, tq, bi) {
    const P = L.pal;
    const p = g.near.prim[P7 - 1];
    const on = S.hi;
    if (on <= 0) return;
    // follicle in the skin: the growth point, glowing while blood flows
    const fol = featherPt(p, 0, 0);
    L.glowDot(ctx, fol[0], fol[1], 5, { rays: 8, rayLen: 3, glow: 6, intensity: 0.9 * on * (0.35 + 0.65 * S.blood), seed: sd('fol'), boil: bi, color: P.glow });
    L.guideCircle(ctx, fol[0], fol[1], 16, { alpha: 0.4 * on, width: 1, dash: [2, 3] });
    // blood dots down the core
    if (S.blood > 0.02) {
      const list = [];
      for (let i = 0; i < 5; i++) {
        const s = 0.08 + i * 0.12 + ((tq * 1.5) % 0.12);
        if (s > Math.min(0.9, 1 - S.prim[P7].open * 0.88)) continue;
        const q = featherPt(p, s, 3.2);
        list.push([q[0], q[1], 2]);
      }
      dots(ctx, list, P.schemBill, 0.85 * S.blood);
    }
    // the glow climbing the core, skin to tip over 6 frames (T 11.583)
    if (S.climb > 0 && S.climb < 1.2) {
      const u = Math.min(1, S.climb);
      const q = featherPt(p, 0.02 + u * 0.95, 0);
      const fade = S.climb > 1 ? 1 - (S.climb - 1) / 0.2 : 1;
      L.glowDot(ctx, q[0], q[1], 7, { rays: 8, rayLen: 3.2, glow: 5.5, intensity: 1.2 * fade, seed: sd('climb'), boil: bi, rot: t * 4 });
      // the trail it leaves
      const trail = [];
      for (let i = 0; i <= 12; i++) trail.push(featherPt(p, 0.02 + (i / 12) * u * 0.95, 0));
      sline(ctx, L, trail, { color: P.glow, alpha: 0.6 * fade, width: 2.2, amp: 0 });
    }
    // section mark A-A where the cutaway is taken
    const a = featherPt(p, SEC_S, -42), b = featherPt(p, SEC_S, 42);
    sline(ctx, L, [a, b], { color: P.lineWhite, alpha: 0.75 * on, width: 1.5, amp: 0, dash: [7, 4] });
    const d = [p.d[0] * 9, p.d[1] * 9];
    segs(ctx, [[a[0], a[1], a[0] - d[0], a[1] - d[1]], [b[0], b[1], b[0] - d[0], b[1] - d[1]]], P.lineWhite, 0.8 * on, 1.5, bi, sd('aa'), 0);
    // growth ruler along P7's leading side, filling with the glow
    const r0 = featherPt(p, 0, -46), r1 = featherPt(p, 1, -46);
    const ang = Math.atan2(r1[1] - r0[1], r1[0] - r0[0]);
    const rl = Math.hypot(r1[0] - r0[0], r1[1] - r0[1]);
    L.ticks(ctx, r0[0], r0[1], { kind: 'linear', length: rl, angle: ang, n: 20, len: 5, major: 5, majorLen: 10, side: 1, color: P.lavender, alpha: 0.5 * on, width: 1, baseline: true });
    const fill = clamp(S.climb);
    if (fill > 0) L.bracket(ctx, r0[0], r0[1], lerp(r0[0], r1[0], fill), lerp(r0[1], r1[1], fill), { style: 'square', offset: -8, cap: 8, color: P.lineWhite, alpha: 0.85, width: 1.5 });
  }

  function drawSplit(ctx, L, g, S, t, bi) {
    const P = L.pal;
    const p = g.near.prim[P7 - 1];
    if (t < B_SPLIT) return;
    const tipP = featherPt(p, 0.97, 0);
    // magenta flash, 8 frames, expanding with outExpo
    const f = (t - B_SPLIT) / FR;
    if (f < 8) {
      const u = L.ease.outExpo(clamp((f + 1) / 8));
      const fade = 1 - clamp(f / 8);
      ctx.save();
      ctx.globalAlpha = fade;
      sline(ctx, L, circlePts(tipP[0], tipP[1], lerp(10, 52, u), 40), { closed: true, color: P.magenta, width: 3, amp: 0 });
      L.ticks(ctx, tipP[0], tipP[1], { r: lerp(14, 60, u), n: 12, len: 12, rot: 0.2, color: P.magenta, alpha: 1, width: 3 });
      // the crack along the sheath
      const c0 = featherPt(p, 0.99, 0), c1 = featherPt(p, 0.86, 1.5);
      sline(ctx, L, [c0, featherPt(p, 0.93, -1.2), c1], { color: P.magenta, width: 3, amp: 0 });
      ctx.restore();
    }
  }

  function drawFlakes(ctx, L, g, S, t, bi) {
    const P = L.pal;
    const p7 = g.near.prim[P7 - 1];
    const list = [];
    const put = (p, fl, born) => {
      const age = t - born;
      if (age < 0 || age > 0.5) return;
      const a = Math.min(1, 1 - age / 0.5);
      const o = featherPt(p, fl.s, fl.side * (7 + fl.v * age));
      const x = o[0] + p.d[0] * fl.v * 0.25 * age;
      const y = o[1] + 120 * age * age;
      const rot = Math.atan2(p.d[1], p.d[0]) + fl.sp * age;
      list.push([x, y, rot, fl.len, a]);
    };
    for (const fl of g.flakes) {
      const born = fl.early ? B_SPLIT + fl.j * 2 * FR : B_UNROLL + ((1 - fl.s) / 0.88) * 6 * FR;
      put(p7, fl, born);
    }
    for (const fl of g.rflakes) {
      const born = S.rippleOn[fl.k] + ((1 - fl.s) / 0.88) * 2 * FR;
      put(g.near.prim[fl.k - 1], fl, born);
    }
    if (!list.length) return;
    ctx.save();
    ctx.strokeStyle = P.lavender;
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.3;
    for (const f of list) {
      ctx.globalAlpha = 0.8 * f[4];
      const c = Math.cos(f[2]), s = Math.sin(f[2]);
      ctx.beginPath();
      ctx.moveTo(f[0] - c * f[3] / 2, f[1] - s * f[3] / 2);
      ctx.quadraticCurveTo(f[0] - s * 3, f[1] + c * 3, f[0] + c * f[3] / 2, f[1] + s * f[3] / 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // =====================================================================================
  // network and node insets
  // =====================================================================================

  function nodeFrame(ctx, L, N, p, bi, seed, hot) {
    const P = L.pal;
    // empty slot (planned), fading as the node draws on
    if (p < 1) {
      sline(ctx, L, circlePts(N.x, N.y, N.r, 64), { closed: true, alpha: 0.35 * (1 - p), width: 1.2, amp: 0, dash: [4, 6] });
      L.ticks(ctx, N.x, N.y, { r: N.r + 4, n: 4, len: 7, rot: Math.PI / 4, color: P.lavender, alpha: 0.4 * (1 - p), width: 1.2 });
    }
    if (p <= 0) return;
    ctx.save();
    ctx.beginPath();
    ctx.arc(N.x, N.y, (N.r - 1) * (0.6 + 0.4 * p), 0, TAU);
    ctx.fillStyle = P.navyLight;
    ctx.globalAlpha = 0.9 * p;
    ctx.fill();
    ctx.restore();
    sline(ctx, L, circlePts(N.x, N.y, N.r, 72, -Math.PI / 2, TAU * p), { closed: p >= 1, color: P.lavender, alpha: 0.92, width: 2.5, seed, bi, amp: 0.4 });
    sline(ctx, L, circlePts(N.x, N.y, N.r - 9, 64, -Math.PI / 2, -TAU * p), { closed: p >= 1, alpha: 0.5, width: 1.5, seed: seed + 1, bi, amp: 0.3 });
    L.ticks(ctx, N.x, N.y, { r: N.r + 5, n: 36, len: 4, major: 9, majorLen: 8, rot: -Math.PI / 2, color: P.lavender, alpha: 0.45 * p, width: 1, p });
    if (hot > 0) sline(ctx, L, circlePts(N.x, N.y, N.r + 2, 72), { closed: true, color: P.magenta, alpha: hot, width: 3, amp: 0 });
  }

  function clipNode(ctx, N, r) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(N.x, N.y, r, 0, TAU);
    ctx.clip();
  }

  // main cutaway: cross-section of a growing feather
  function drawCutaway(ctx, L, g, S, p, t, bi) {
    const P = L.pal;
    const N = CUT;
    nodeFrame(ctx, L, N, p, bi, sd('cutN'), 0);
    if (p <= 0) return;
    const u = S.flat; // 0 rolled, 1 flattened
    clipNode(ctx, N, N.r - 10);
    ctx.globalAlpha *= p;
    const cx = N.x, cy = N.y;
    // sheath: outer ring pair with keratin stipple, breaking into arcs that drift away as the vane opens
    const brk = u;
    for (let k = 0; k < 8; k++) {
      const a0 = (k / 8) * TAU + 0.05, a1 = ((k + 1) / 8) * TAU - 0.05 * (1 + brk * 3);
      const off = brk * (10 + (k % 3) * 8);
      const am = (a0 + a1) / 2;
      const ox = Math.cos(am) * off, oy = Math.sin(am) * off;
      const al = 1 - brk;
      if (al <= 0.02) continue;
      sline(ctx, L, circlePts(cx + ox, cy + oy, 90, 24, a0, a1 - a0), { color: P.lavender, alpha: 0.85 * al, width: 2, seed: sd('shA', k), bi, amp: 0.3 });
      sline(ctx, L, circlePts(cx + ox, cy + oy, 82, 24, a0, a1 - a0), { color: P.lavender, alpha: 0.5 * al, width: 1.2, seed: sd('shB', k), bi, amp: 0.3 });
    }
    if (brk < 0.98) {
      L.stipple(ctx, (c) => {
        c.arc(cx, cy, 89, 0, TAU);
        c.arc(cx, cy, 83, 0, TAU, true);
      }, { spacing: 3.2, r: [0.5, 1], color: P.lavender, alpha: 0.6 * (1 - brk), seed: sd('kst'), bounds: [cx - 92, cy - 92, 184, 184], boil: bi });
    }
    // pulp core: a lattice of living cells with the blood vessel in the centre, resorbed as the vane opens
    const coreA = 1 - u;
    if (coreA > 0.02) {
      const rc = lerp(44, 20, u);
      ctx.save();
      ctx.globalAlpha *= coreA;
      L.hexLattice(ctx, L.ellipsePts(cx, cy, rc, rc, 32), { r: 6, alpha: 0.4, width: 1, seed: sd('pulp'), boil: bi });
      sline(ctx, L, circlePts(cx, cy, rc, 40), { closed: true, color: P.lavender, alpha: 0.7, width: 1.5, seed: sd('pulpO'), bi });
      ctx.restore();
    }
    if (S.blood > 0.02) {
      L.glowDot(ctx, cx, cy, 8, { rays: 0, glow: 4, intensity: S.blood * p, color: P.schemBill, core: P.schemBill, seed: sd('vessel'), boil: bi });
      sline(ctx, L, circlePts(cx, cy, 12, 20), { closed: true, color: P.schemBill, alpha: 0.8 * S.blood, width: 1.5, amp: 0 });
      // capillaries out to the ridges
      const cap = [];
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + 0.2;
        cap.push([cx + Math.cos(a) * 13, cy + Math.sin(a) * 13, cx + Math.cos(a + 0.15) * 40, cy + Math.sin(a + 0.15) * 40]);
      }
      segs(ctx, cap, P.schemBill, 0.5 * S.blood, 1, bi, sd('capl'), 0.4);
    }
    // the 16 barb ridges: a ring between pulp and sheath, separating and flattening into a vane
    const cellsList = [];
    for (let i = 0; i < 16; i++) {
      const rg = g.ridges[i];
      const rx = cx + Math.cos(rg.a) * 64, ry = cy + Math.sin(rg.a) * 64;
      const fx = rg.fx, fy = cy + 8;
      const x = lerp(rx, fx, u), y = lerp(ry, fy, u);
      const rot = lerp(rg.a, Math.PI / 2, u);
      const lenR = i === 0 ? 24 : 18; // radial length (rachis ridge a little bigger)
      const wid = i === 0 ? 16 : 11;
      const l = lerp(lenR, i === 0 ? 20 : 26, u), wd = lerp(wid, i === 0 ? 14 : 6, u);
      cellsList.push([x, y, rot, l, wd, i]);
    }
    ctx.save();
    ctx.strokeStyle = P.lavender;
    for (const c of cellsList) {
      const [x, y, rot, l, wd, i] = c;
      const cs = Math.cos(rot), sn = Math.sin(rot);
      const corners = [[-l / 2, -wd / 2], [l / 2, -wd / 2], [l / 2, wd / 2], [-l / 2, wd / 2]].map((q) => [x + q[0] * cs - q[1] * sn, y + q[0] * sn + q[1] * cs]);
      const hot = i === 0;
      sline(ctx, L, corners, { closed: true, color: hot ? P.lineWhite : P.lavender, alpha: hot ? 0.9 : 0.75, width: hot ? 1.6 : 1.2, seed: sd('ridge', i), bi, amp: 0.25 });
      // barbule ticks inside each ridge
      const ticks = [];
      for (let k = -1; k <= 1; k++) {
        const a = [x + (k * l / 4) * cs - (-wd / 3) * sn, y + (k * l / 4) * sn + (-wd / 3) * cs];
        const b = [x + (k * l / 4) * cs - (wd / 3) * sn, y + (k * l / 4) * sn + (wd / 3) * cs];
        ticks.push([a[0], a[1], b[0], b[1]]);
      }
      segs(ctx, ticks, P.lavender, 0.35, 1, bi, sd('rt', i), 0.2);
    }
    ctx.restore();
    // once flat: the vane plane and its barbs fanning up
    if (u > 0.5) {
      const k = (u - 0.5) / 0.5;
      sline(ctx, L, [[cx - 92, cy + 8], [cx + 92, cy + 8]], { color: P.lineWhite, alpha: 0.6 * k, width: 1.4, amp: 0 });
      L.bracket(ctx, cx - 84, cy + 34, cx + 84, cy + 34, { style: 'square', offset: 0, cap: 7, alpha: 0.6 * k, width: 1.2 });
    } else {
      // growth ring guide between pulp and sheath
      L.guideCircle(ctx, cx, cy, 64, { alpha: 0.2 * (1 - u), width: 1, dash: [2, 4] });
    }
    // radial guide: where the rachis forms
    L.arcAnnotation(ctx, cx, cy, 100, -Math.PI / 2 - 0.4, -Math.PI / 2 + 0.4, { color: P.lineWhite, width: 1.5, alpha: 0.6 * (1 - u), endTicks: 6 });
    ctx.restore();
  }

  // sheath inset: the tip of P7 in close-up, splitting and flaking
  function drawSheathInset(ctx, L, g, S, p, t, bi) {
    const P = L.pal;
    const N = SHE;
    const f = (t - B_SPLIT) / FR;
    const hot = f >= 0 && f < 8 ? 1 - f / 8 : 0;
    nodeFrame(ctx, L, N, p, bi, sd('sheN'), hot);
    if (p <= 0) return;
    clipNode(ctx, N, N.r - 10);
    ctx.globalAlpha *= p;
    const cx = N.x, cy = N.y;
    const split = clamp((t - B_SPLIT) / (12 * FR) + 1 / 12);
    const open = S.prim[P7].open;
    // the peel line runs down the tube as the sheath flakes
    const peel = cy - 34 + split * 16 + open * 50;
    const hw = 12;
    // tube walls below the peel line
    const bot = cy + 60;
    sline(ctx, L, [[cx - hw, bot], [cx - hw, peel]], { color: P.lineWhite, alpha: 0.85, width: 1.8, seed: sd('tw1'), bi, amp: 0.3 });
    sline(ctx, L, [[cx + hw, bot], [cx + hw, peel]], { color: P.lineWhite, alpha: 0.85, width: 1.8, seed: sd('tw2'), bi, amp: 0.3 });
    const rings = [];
    for (let y = bot - 6; y > peel + 4; y -= 7) rings.push([cx - hw, y, cx + hw, y + 2]);
    segs(ctx, rings, P.lavender, 0.5, 1, bi, sd('tr2'), 0.3);
    // rolled vane inside the tube: a spiral line
    sline(ctx, L, [[cx - 3, bot], [cx - 3, peel + 2]], { alpha: 0.5, width: 1, amp: 0, dash: [3, 3] });
    // intact: a pointed cap
    if (t < B_SPLIT) {
      sline(ctx, L, [[cx - hw, peel], [cx, peel - 20], [cx + hw, peel]], { color: P.lineWhite, alpha: 0.85, width: 1.8, amp: 0 });
    } else {
      // peeled halves curling outward
      for (const side of [-1, 1]) {
        const c = [];
        const curl = 0.4 + split * 0.9 + open * 0.8;
        for (let k = 0; k <= 10; k++) {
          const a = (k / 10) * curl;
          c.push([cx + side * (hw + Math.sin(a) * 14 + k * 0.8), peel - Math.cos(a) * 14 * (k / 10) - k * 1.4]);
        }
        sline(ctx, L, c, { color: P.lineWhite, alpha: 0.8 * (1 - open * 0.5), width: 1.6, seed: sd('curl', side), bi, amp: 0.3 });
      }
      // barbs brushing out of the split, fanning wider as the vane opens
      const fan = [];
      const spread = 0.25 + split * 0.35 + open * 0.6;
      for (let k = -5; k <= 5; k++) {
        const a = -Math.PI / 2 + (k / 5) * spread;
        const l = 30 + split * 8 + open * 14 - Math.abs(k) * 2;
        fan.push([cx, peel + 4, cx + Math.cos(a) * l, peel + 4 + Math.sin(a) * l]);
      }
      segs(ctx, fan, P.lavender, 0.85, 1.2, bi, sd('fan'), 0.4);
      // flakes drifting off
      const fr = L.rng(sd('insetFlakes'));
      const fl = [];
      for (let k = 0; k < 10; k++) {
        const born = B_SPLIT + fr() * 0.6;
        const side = fr() < 0.5 ? -1 : 1;
        const v = 30 + fr() * 50;
        const age = t - born;
        if (age < 0 || age > 0.6) {
          fr(); fr();
          continue;
        }
        const y0 = peel - fr() * 10;
        const x = cx + side * (hw + 6 + v * age);
        const y = y0 - 10 * age + 60 * age * age + fr() * 4;
        fl.push([x - 4, y - 2, x + 4, y + 2]);
      }
      segs(ctx, fl, P.lavender, 0.7, 1.4, bi, sd('ifl'), 0.3);
      // the magenta crack line at the split, within 8 frames
      if (hot > 0) sline(ctx, L, [[cx, peel - 18], [cx - 2, peel - 4], [cx + 1, peel + 16]], { color: P.magenta, alpha: hot, width: 3, amp: 0 });
    }
    // measurement: tube width bracket
    L.bracket(ctx, cx - hw, cy + 40, cx + hw, cy + 40, { style: 'square', offset: 0, cap: 6, alpha: 0.6, width: 1 });
    ctx.restore();
  }

  // vane inset: the rolled vane in section, unrolling into a flat vane in plan
  function drawVaneInset(ctx, L, g, S, p, t, bi) {
    const P = L.pal;
    const N = VAN;
    nodeFrame(ctx, L, N, p, bi, sd('vanN'), 0);
    if (p <= 0) return;
    clipNode(ctx, N, N.r - 10);
    ctx.globalAlpha *= p;
    const cx = N.x, cy = N.y;
    const u = S.flat;
    // the spiral (rolled vane seen end on) morphing into the rachis line across the inset
    const n = 60;
    const spiral = [];
    const a0 = Math.atan2(-1, 1);
    const lineA = [cx - 38, cy + 30], lineB = [cx + 38, cy - 30];
    for (let i = 0; i <= n; i++) {
      const s = i / n;
      const ang = s * 2.4 * TAU;
      const r = 4 + s * 34;
      const sp = [cx + Math.cos(ang + a0) * r, cy + Math.sin(ang + a0) * r];
      const ln = lerp2(lineA, lineB, s);
      // unroll from the outside in: the outer end of the spiral straightens first
      const k = clamp(u * 1.6 - (1 - s) * 0.6);
      spiral.push(lerp2(sp, ln, L.ease.inOutCubic(k)));
    }
    sline(ctx, L, spiral, { color: P.lineWhite, alpha: 0.85, width: 1.6, seed: sd('spiral'), bi, amp: 0.3 });
    // barb ticks riding the spiral while rolled
    if (u < 0.9) {
      const tk = [];
      for (let i = 4; i < n; i += 3) {
        const a = spiral[i], b = spiral[Math.min(n, i + 1)];
        const dx = b[0] - a[0], dy = b[1] - a[1];
        const dl = Math.hypot(dx, dy) || 1;
        tk.push([a[0], a[1], a[0] - (dy / dl) * 5, a[1] + (dx / dl) * 5]);
      }
      segs(ctx, tk, P.lavender, 0.6 * (1 - u), 1, bi, sd('stk'), 0.2);
    }
    // flat vane in plan: barbs off the rachis at an angle, barbules as short ticks, growing out after the unroll
    const grow = clamp((u - 0.45) / 0.55);
    if (grow > 0) {
      const barbs = [], barbules = [];
      const dx = (lineB[0] - lineA[0]) / 76, dy = (lineB[1] - lineA[1]) / 76; // unit along the rachis
      const nx = -dy, ny = dx;
      for (let k = 0; k < 16; k++) {
        const s = (k + 0.5) / 16;
        const q = lerp2(lineA, lineB, s);
        const on = clamp(grow * 1.4 - s * 0.4);
        if (on <= 0) continue;
        for (const side of [-1, 1]) {
          const len = (side > 0 ? 34 : 20) * on;
          // barbs sweep toward the tip at about 45 degrees
          const bx = q[0] + (dx * 0.7 + nx * side * 0.7) * len, by = q[1] + (dy * 0.7 + ny * side * 0.7) * len;
          barbs.push([q[0], q[1], bx, by]);
          for (let j = 1; j <= 3; j++) {
            const m = lerp2(q, [bx, by], j / 4);
            barbules.push([m[0], m[1], m[0] + dx * 4, m[1] + dy * 4]);
          }
        }
      }
      segs(ctx, barbs, P.lavender, 0.75, 1.1, bi, sd('vb'), 0.3);
      segs(ctx, barbules, P.lavender, 0.4, 1, bi, sd('vbl'), 0.2);
      // keratin: once flat, a pale dead-feather tone
      L.stipple(ctx, L.ellipsePts(cx, cy, 44, 44, 32), { spacing: 6, r: [0.5, 1], color: P.paleBlue, alpha: 0.35 * grow, seed: sd('ker'), boil: bi });
    }
    ctx.restore();
  }

  function drawNetwork(ctx, L, g, S, t, bi) {
    const P = L.pal;
    const p = S.insets;
    // planned routes, dotted, from frame 0
    for (const c of [g.conCut, g.conShe, g.conVan]) sline(ctx, L, c, { alpha: 0.22, width: 1.2, amp: 0, dash: [1.5, 6] });
    if (p <= 0) return;
    const list = [[g.conCut, 0], [g.conShe, 1], [g.conVan, 2]];
    for (const [c, i] of list) {
      const part = partial(c, p);
      sline(ctx, L, part, { alpha: 0.7, width: 1.6, seed: sd('con', i), bi, amp: 0.5 });
      sline(ctx, L, part.map((q) => [q[0] + 4, q[1] + 3]), { alpha: 0.16, width: 1, seed: sd('con2', i), bi, amp: 0.5 });
      const tip = part[part.length - 1];
      if (p < 1) L.glowDot(ctx, tip[0], tip[1], 3.8, { rays: 4, rayLen: 3, glow: 5, intensity: 1, seed: sd('cdot', i), boil: bi });
      const o = c[0];
      sline(ctx, L, circlePts(o[0], o[1], 6, 16), { closed: true, color: P.lineWhite, alpha: 0.6, width: 1.2, amp: 0 });
      // signal dots travelling the wire once it has arrived (on twos)
      if (p >= 1) {
        const tq = L.onTwos(t);
        const dl = [];
        for (let k = 0; k < 3; k++) {
          const u = ((tq - B_SPLIT) * 1.25 + k / 3 + i * 0.17) % 1;
          const q = c[clamp(Math.floor(u * (c.length - 1)), 0, c.length - 1)];
          dl.push([q[0], q[1], 2.4]);
        }
        dots(ctx, dl, P.lineWhite, 0.8);
      }
    }
  }

  // ===========================================================================
  // CANONICAL cycleRing — copied verbatim from 02-egg-blueprint.js. Never edit a copy.
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

  // =====================================================================================
  // the state at time t
  // =====================================================================================

  // ripple order: out from P7 both ways
  const RIPPLE = [6, 8, 5, 9, 4, 10, 3, 2, 1];

  function stateAt(t, tq) {
    const hit = (a, frames, e, lead = 1) => (t < a ? 0 : (e || ((u) => u))(clamp((t - a) / (frames * FR) + lead / frames)));
    const hitQ = (a, frames, lead = 1) => (tq < a - 1e-6 ? 0 : clamp((tq - a) / (frames * FR) + lead / frames));
    const S = { prim: {}, rippleOn: {} };
    S.hi = t < B_CORE ? 0 : [0.6, 1][Math.min(1, Math.floor((t - B_CORE) * 12 + 1e-6))];
    // everything but P7 dims to 40 % while P7 is the focus (full strength on the match frames)
    S.dim = 1 - 0.6 * S.hi;
    S.climb = t < B_CORE ? 0 : clamp((t - B_CORE) / (6 * FR) + 1 / 6, 0, 1.2);
    S.insets = hit(B_SPLIT, 6, FILM.lib.ease.outExpo);
    S.flat = hit(B_UNROLL, 6, FILM.lib.ease.outExpo);
    const unroll = hitQ(B_UNROLL, 6, 2);
    S.blood = 1 - clamp((t - B_UNROLL) / (8 * FR) + 1 / 8);
    const split = hit(B_SPLIT, 6);
    for (let k = 1; k <= 10; k++) S.prim[k] = { open: 0, hi: 0, split: 0, blood: 0, alpha: 1 };
    S.prim[P7] = { open: unroll, hi: S.hi, split, blood: S.hi > 0 ? S.blood : 0, alpha: 1 };
    for (let i = 0; i < RIPPLE.length; i++) {
      const k = RIPPLE[i];
      const on = B_RIPPLE + i * 0.3 * FR;
      S.rippleOn[k] = on;
      S.prim[k].open = hitQ(on, 2, 1);
      // each one brightens for 4 frames as it opens (lavender, never above P7), so the ripple reads
      if (t >= on - 1e-6 && t < on + 4 * FR) S.prim[k].ping = 1 - (t - on) / (4 * FR);
    }
    return S;
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib;
      const t = clamp(tIn, 0, info.dur);
      const tq = L.onTwos(t);
      const bi = L.boil(info.T);
      const g = geo(L);
      const S = stateAt(t, tq);

      // 1-2 plate and construction
      drawBackdrop(ctx, L, g, t, bi);
      // 3 ground and rock
      drawGround(ctx, L, g, bi);
      drawRock(ctx, L, g, bi);
      // 4 far wing
      ctx.save();
      ctx.globalAlpha = S.dim;
      drawFarWing(ctx, L, g.far, bi);
      // 5 tail, legs, body, head
      drawTailLegs(ctx, L, g, bi);
      drawBody(ctx, L, g, bi);
      drawHead(ctx, L, g, bi);
      ctx.restore();
      // 6 near wing with its pin feathers
      drawNearWing(ctx, L, g, g.near, S, t, tq, bi);
      // 7 P7 marks, flakes and the split
      drawP7Marks(ctx, L, g, S, t, tq, bi);
      drawFlakes(ctx, L, g, S, t, bi);
      drawSplit(ctx, L, g, S, t, bi);
      // 8 network and node insets
      drawNetwork(ctx, L, g, S, t, bi);
      drawCutaway(ctx, L, g, S, S.insets, t, bi);
      drawSheathInset(ctx, L, g, S, S.insets, t, bi);
      drawVaneInset(ctx, L, g, S, S.insets, t, bi);
      // 9 cycle ring: the flight arc, first half (10 lights the rest)
      cycleRing(ctx, L, 2, 0.5 * (t / info.dur), bi);
    },
  });
})();
