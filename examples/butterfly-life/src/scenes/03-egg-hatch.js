// 03 egg-hatch : "First meal: the eggshell". Illustrated, global T 4.0 to 5.5.
// Match cut from the blueprint egg (G1) to the inked ivory egg glued under a hairy milkweed leaf.
// The head shadow twitches, the tip cracks on the beat, the black-headed first instar hauls itself out
// while the camera pulls back to zoom 0.62, and it eats the shell in two scalloped bites.
// Deviation from storyboard 03 (flagged): the pull-back ends at zoom 0.62 centred (600, 960) and drifts to
// 0.60, not 0.45 to 0.43 centred (540, 820), and the second stem sits at world x 1160 with its leaf at y 2020,
// not x 1300 and y 2300, so the hatchling fills about half the frame width on a phone.
(function () {
  'use strict';
  const ID = 'egg-hatch';
  const TAU = Math.PI * 2;
  const END_ZOOM = 0.62; // the pull-back lands here on T 5.0
  const DRIFT_ZOOM = 0.6; // and drifts to here by T 5.5
  const END_CX = 600; // world centre x at the end of the pull-back (y stays 960)

  // ===========================================================================
  // G1 egg geometry (docs/storyboard.md, Shared geometry G1), exact numbers
  // ===========================================================================
  const AX = 540;
  const BASE_Y = 520;
  const TIP_Y = 1280;
  const TILT = 0.12; // rings seen slightly from below: front half bows down by hw * TILT
  const MICRO = [540, 1262, 26];
  const CRACK_Y = 1170;
  const HALF_Y = 900; // after the second bite the shell is eaten back to half its height

  // Body half-width is FILM.GEO G1. The last 20 px stays this shot's sqrt cap.
  function hw(y) {
    if (y <= BASE_Y) return FILM.lib.geo('G1').hw(BASE_Y);
    if (y >= TIP_Y) return 0;
    if (y > 1260) return 60 * Math.sqrt(Math.max(0, 1 - (y - 1260) / 20));
    return FILM.lib.geo('G1').hw(y);
  }
  // silhouette: right side down, left side up (closed)
  const EGG = (() => {
    const right = [];
    for (let y = BASE_Y; y < TIP_Y; y += y > 1200 ? 4 : 10) right.push([AX + hw(y), y]);
    const out = right.slice();
    out.push([AX, TIP_Y]);
    for (let i = right.length - 1; i >= 0; i--) out.push([2 * AX - right[i][0], right[i][1]]);
    return out;
  })();
  // a point on the ring at height y, angle th (0 right edge, PI/2 front centre, PI left edge)
  const ringPt = (y, th) => [AX + hw(y) * Math.cos(th), y + hw(y) * TILT * Math.sin(th)];

  // ===========================================================================
  // The larva's path (world px): inside the shell, out through the crack at its front-left,
  // a curl down and right round a 212 px circle, then back up to the shell's lower-right wall, the head's
  // final spot (760, 1050) facing the shell. The path from the head back to the crack is one
  // body length, so the tail ends clasped on the rim.
  // ===========================================================================
  const HEAD_END = [760, 1050];
  const LARVA_LEN = 1100;
  const BODY_W = 220;
  const TRACK = (() => {
    const ctrl = [[540, 700], [530, 880], [516, 1040], [501, 1176], [488, 1247], [499, 1318], [534, 1381], [587, 1429], [654, 1457], [726, 1460], [795, 1440], [853, 1397], [893, 1338], [911, 1268], [905, 1196], [875, 1131], [825, 1079], [HEAD_END[0], HEAD_END[1]]];
    // local Catmull-Rom so the module does not depend on lib at load time
    const pts = [];
    const n = ctrl.length;
    for (let i = 0; i < n - 1; i++) {
      const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(n - 1, i + 2)];
      const steps = Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 4);
      for (let k = 0; k < steps; k++) {
        const u = k / steps, u2 = u * u, u3 = u2 * u;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
        pts.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    pts.push(ctrl[n - 1].slice());
    const S = [0];
    for (let i = 1; i < pts.length; i++) S.push(S[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { pts, S, len: S[S.length - 1] };
  })();
  // arc length where the path leaves the shell through the crack (front-left of the rim)
  const S_CRACK = (() => {
    for (let i = 0; i < TRACK.pts.length; i++) if (TRACK.pts[i][1] >= CRACK_Y + 6) return TRACK.S[i];
    return 0;
  })();
  // position and unit tangent at arc length s (clamped)
  function trackAt(s) {
    const S = TRACK.S, P = TRACK.pts;
    if (s <= 0) {
      const d = [P[1][0] - P[0][0], P[1][1] - P[0][1]];
      const l = Math.hypot(d[0], d[1]) || 1;
      return { x: P[0][0] + (d[0] / l) * s, y: P[0][1] + (d[1] / l) * s, tx: d[0] / l, ty: d[1] / l };
    }
    if (s >= TRACK.len) {
      const k = P.length - 1;
      const d = [P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]];
      const l = Math.hypot(d[0], d[1]) || 1;
      return { x: P[k][0], y: P[k][1], tx: d[0] / l, ty: d[1] / l };
    }
    let lo = 0, hi = S.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (S[mid] <= s) lo = mid;
      else hi = mid;
    }
    const f = (s - S[lo]) / Math.max(1e-6, S[hi] - S[lo]);
    const a = P[lo], b = P[hi];
    const i0 = Math.max(0, lo - 3), i1 = Math.min(P.length - 1, hi + 3);
    const dx = P[i1][0] - P[i0][0], dy = P[i1][1] - P[i0][1];
    const l = Math.hypot(dx, dy) || 1;
    return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, tx: dx / l, ty: dy / l };
  }

  // ===========================================================================
  // Scaled drawing helpers. Positions live in world px; pen weights stay constant on screen
  // (width / zoom) and texture spacing switches between two levels of detail, on the crack hit frame.
  // ===========================================================================
  function kit(ctx, L, zoom) {
    const K = { ctx, L, zoom };
    K.w = 1 / zoom; // world px per screen px, for pen widths
    // level of detail for spacing, lengths and wobble: the switch lands on f108 to f109 with the crack,
    // the cap burst and the first big zoom step, so it hides inside the hit
    K.s = zoom > 0.999 ? 1 : 1 / END_ZOOM;
    K.ink = (pts, o = {}) =>
      L.inkPath(ctx, pts, Object.assign({}, o, {
        width: (o.width != null ? o.width : 3) * K.w,
        wobble: (o.wobble != null ? o.wobble : 2) * K.s,
        wobbleFreq: (o.wobbleFreq || 1 / 150) / K.s,
        tremble: (o.tremble != null ? o.tremble : 0.4) * K.s,
        boilAmp: (o.boilAmp != null ? o.boilAmp : 0.7) * K.s,
        step: (o.step || 2.5) * Math.min(K.s, 1.6),
        taper: o.taper != null ? (Array.isArray(o.taper) ? o.taper.map((v) => v * K.s) : o.taper * K.s) : undefined,
        rough: o.rough != null ? o.rough * K.w : undefined,
        double: o.double && typeof o.double === 'object' ? Object.assign({}, o.double, { offset: o.double.offset != null ? o.double.offset * K.w : undefined }) : o.double,
      }));
    K.hatch = (clip, o = {}) =>
      L.hatch(ctx, clip, Object.assign({}, o, {
        spacing: (o.spacing || 8) * K.s,
        width: (o.width != null ? o.width : 1.4) * K.w,
        length: (o.length || [16, 64]).map((v) => v * K.s),
        gap: (o.gap || [2, 7]).map((v) => v * K.s),
        inset: (o.inset != null ? o.inset : 6) * K.s,
        overshoot: (o.overshoot != null ? o.overshoot : 3) * K.s,
        bow: (o.bow != null ? o.bow : 0.7) * K.s,
        bend: (o.bend || 0) * K.s,
        boilAmp: (o.boilAmp != null ? o.boilAmp : 0.45) * K.s,
      }));
    K.cross = (clip, o = {}) =>
      L.crossHatch(ctx, clip, Object.assign({}, o, {
        spacing: (o.spacing || 8) * K.s,
        crossSpacing: o.crossSpacing ? o.crossSpacing * K.s : undefined,
        width: (o.width != null ? o.width : 1.4) * K.w,
        length: (o.length || [16, 64]).map((v) => v * K.s),
        gap: (o.gap || [2, 7]).map((v) => v * K.s),
        inset: (o.inset != null ? o.inset : 6) * K.s,
        overshoot: (o.overshoot != null ? o.overshoot : 3) * K.s,
        bow: (o.bow != null ? o.bow : 0.7) * K.s,
        boilAmp: (o.boilAmp != null ? o.boilAmp : 0.45) * K.s,
      }));
    K.stipple = (clip, o = {}) =>
      L.stipple(ctx, clip, Object.assign({}, o, {
        spacing: (o.spacing || 7.5) * K.s,
        r: (o.r || [1.0, 2.2]).map((v) => v * K.w),
        boilAmp: (o.boilAmp != null ? o.boilAmp : 0.35) * K.s,
      }));
    return K;
  }

  // wobbly short strokes batched into one Path2D (for hundreds of tiny marks)
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

  function polyPath(pts) {
    const p = new Path2D();
    for (let i = 0; i < pts.length; i++) (i ? p.lineTo : p.moveTo).call(p, pts[i][0], pts[i][1]);
    p.closePath();
    return p;
  }

  // ===========================================================================
  // Leaf underside (world y above 520), seen edge-on and slightly from below
  // ===========================================================================
  const LEAF_X0 = -1000, LEAF_X1 = 2100, LEAF_Y0 = -1700;
  const MIDRIB = [[-1000, -1120], [-300, -960], [400, -800], [1100, -620], [2100, -380]];
  function midribY(x) {
    for (let i = 0; i < MIDRIB.length - 1; i++) {
      const a = MIDRIB[i], b = MIDRIB[i + 1];
      if (x <= b[0] || i === MIDRIB.length - 2) return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]);
    }
    return MIDRIB[0][1];
  }
  // pinnate side veins leave the midrib and arch toward the leaf tip (+x)
  const VEINS = (() => {
    const out = [];
    let k = 0;
    for (let bx = -1100; bx <= 2000; bx += 290, k++) {
      const by = midribY(bx);
      const j = ((k * 37) % 11) / 11 - 0.5;
      const down = [[bx, by], [bx + 170 + 30 * j, by + 420], [bx + 470 + 40 * j, by + 900], [bx + 900, by + 1250], [bx + 1420, by + 1470]];
      const up = [[bx + 60, by], [bx + 230 + 30 * j, by - 400], [bx + 520, by - 820], [bx + 950, by - 1150]];
      out.push({ pts: down, dir: 1, k }, { pts: up, dir: -1, k });
    }
    return out;
  })();

  // offset of a side vein from its base, by depth below (or above) the midrib
  const DOWN_G = [[0, 0], [420, 170], [900, 470], [1250, 900], [1470, 1420]];
  const UP_G = [[0, 60], [400, 230], [820, 520], [1150, 950]];
  function veinOffset(G, depth) {
    for (let i = 0; i < G.length - 1; i++) {
      if (depth <= G[i + 1][0] || i === G.length - 2) return G[i][1] + ((G[i + 1][1] - G[i][1]) * (depth - G[i][0])) / (G[i + 1][0] - G[i][0]);
    }
    return 0;
  }
  // 0 right on a side vein, rising to 1 across the gap to the next one (toward -x)
  function veinPhase(x, y) {
    const below = y > midribY(x);
    const G = below ? DOWN_G : UP_G;
    let bx = x - veinOffset(G, Math.abs(y - midribY(x)));
    bx = x - veinOffset(G, Math.abs(y - midribY(bx)));
    const ph = (((bx + 1100) / 290) % 1 + 1) % 1;
    return ph;
  }

  function alongPoly(pts, f) {
    let tot = 0;
    for (let i = 1; i < pts.length; i++) tot += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    let want = tot * f;
    for (let i = 1; i < pts.length; i++) {
      const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (want <= l) return [pts[i - 1][0] + ((pts[i][0] - pts[i - 1][0]) * want) / l, pts[i - 1][1] + ((pts[i][1] - pts[i - 1][1]) * want) / l];
      want -= l;
    }
    return pts[pts.length - 1].slice();
  }
  // short arched cross-veins joining neighbouring side veins
  const CROSS = (() => {
    const out = [];
    for (let i = 0; i + 2 < VEINS.length; i++) {
      const a = VEINS[i], b = VEINS[i + 2];
      if (a.dir !== b.dir) continue;
      for (const f of [0.18, 0.34, 0.5, 0.66, 0.82]) {
        const h = ((i * 13 + f * 100) % 7) / 7;
        const p = alongPoly(a.pts, f + 0.04 * h);
        const q = alongPoly(b.pts, f - 0.06 + 0.05 * h);
        const m = [(p[0] + q[0]) / 2 + (q[1] - p[1]) * 0.12 * a.dir, (p[1] + q[1]) / 2 - (q[0] - p[0]) * 0.12 * a.dir];
        out.push([p, m, q]);
      }
    }
    return out;
  })();

  function visibleRect(cam) {
    return { x0: cam.x - 540 / cam.zoom, x1: cam.x + 540 / cam.zoom, y0: cam.y - 960 / cam.zoom, y1: cam.y + 960 / cam.zoom };
  }

  function drawLeaf(K, VR, seed) {
    const { ctx, L } = K;
    const P = L.pal;
    const x0 = Math.max(LEAF_X0, VR.x0 - 40), x1 = Math.min(LEAF_X1, VR.x1 + 40);
    const y0 = Math.max(LEAF_Y0, VR.y0 - 40), y1 = BASE_Y;
    if (y0 >= y1) return;
    const rect = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    ctx.fillStyle = P.milkweed;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);

    // two tone fields split by the midrib, hatched parallel to the side veins
    const step = 60;
    const rib = [];
    for (let x = x0 - step; x <= x1 + step; x += step) rib.push([x, midribY(x)]);
    const below = rib.concat([[x1 + step, y1], [x0 - step, y1]]);
    const above = rib.slice().reverse().concat([[x0 - step, y0 - 10], [x1 + step, y0 - 10]]);
    // tone: each raised side vein shades the blade just past it, darker toward the near edge.
    // Pulled back (K.s > 1) the ramp is stronger and reaches further up the blade, so the gaps between
    // side veins still model from light to dark at a third of the size.
    const far = K.s > 1;
    const leeK = far ? 0.6 : 0.42;
    const nearY0 = far ? -250 : 200;
    const tone = (x, y) => {
      const ph = veinPhase(x, y);
      const lee = y > midribY(x) ? L.smoothstep(0.55, 0.04, ph) : L.smoothstep(0.45, 0.96, ph);
      return 0.26 + 0.16 * L.noise2(x / 330, y / 330, seed + 3) + leeK * lee + 0.4 * L.smoothstep(nearY0, 515, y);
    };
    const main = far ? { spacing: 5, width: 1.8, alpha: 1, length: [8, 22] } : { spacing: 7, width: 1.6, alpha: 0.95 };
    K.hatch(below, Object.assign({ angle: 0.86, color: P.milkweedDeep, density: tone, seed: seed + 5, flow: 0.12 }, main));
    K.hatch(above, Object.assign({ angle: -0.8, color: P.milkweedDeep, density: tone, seed: seed + 6, flow: 0.12 }, main));
    // cross layer in the deepest pockets, and the dark curl toward the near edge
    K.hatch(rect, { angle: 1.83, spacing: 7, width: 1.3, color: P.milkweedDeep, alpha: 0.9, density: (x, y) => Math.max(L.smoothstep(300, 520, y) * 0.95, tone(x, y) - 0.62), seed: seed + 7 });
    if (far) K.hatch(rect, { angle: 1.83, spacing: 6, width: 1.5, color: P.milkweedDeep, alpha: 0.9, length: [8, 22], density: (x, y) => L.smoothstep(0.8, 1.15, tone(x, y)), seed: seed + 10 });
    K.hatch(rect, { angle: 0.86, spacing: 5, width: 1.2, color: P.ink, alpha: 0.45, density: (x, y) => L.smoothstep(400, 520, y) * 0.9, seed: seed + 8 });

    // reticulate vein net between the side veins
    L.hexLattice(ctx, rect, { r: 46, jitter: 15, width: 1.7 * K.w, color: P.milkweedPale, alpha: K.s > 1 ? 0.42 : 0.55, seed: seed + 9, boilAmp: 0.5 * K.s, clip: true });

    // side veins: raised on the underside, so a shade line below-right and a pale ridge on top
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, x1 - x0, y1 - y0);
    ctx.clip();
    for (const v of VEINS) {
      const b = L.bounds(v.pts);
      if (b.x > x1 || b.x + b.w < x0 || b.y > y1 || b.y + b.h < y0) continue;
      const sh = v.pts.map((p) => [p[0] + 6, p[1] + 7]);
      K.ink(sh, { width: 2.2, color: P.milkweedDeep, alpha: 0.95, seed: seed + 100 + v.k * 2 + (v.dir > 0 ? 0 : 1), taper: [4, 80] });
      K.ink(v.pts, { width: 17 * K.zoom, color: P.milkweedPale, alpha: 0.95, seed: seed + 200 + v.k * 2 + (v.dir > 0 ? 0 : 1), taper: [4, 160], wobble: 3 });
      K.ink(v.pts.map((p) => [p[0] + 9, p[1] + 10]), { width: 1.6, color: P.inkSoft, alpha: 0.7, seed: seed + 300 + v.k * 2 + (v.dir > 0 ? 0 : 1), taper: [10, 120] });
      K.ink(v.pts.map((p) => [p[0] - 4, p[1] - 4]), { width: 1.1, color: P.white, alpha: 0.55, seed: seed + 400 + v.k * 2 + (v.dir > 0 ? 0 : 1), taper: [20, 200] });
    }
    const cv = CROSS.filter((c) => Math.max(c[0][0], c[2][0]) > x0 - 50 && Math.min(c[0][0], c[2][0]) < x1 + 50 && Math.max(c[0][1], c[2][1]) > y0 - 50 && Math.min(c[0][1], c[2][1]) < y1);
    strokeBatch(ctx, cv.map((c) => [c[0][0] + 4, c[0][1] + 5, c[1][0] + 4, c[1][1] + 5, c[2][0] + 4, c[2][1] + 5]), 2 * K.w, P.inkSoft, 0.45);
    strokeBatch(ctx, cv.map((c) => [c[0][0], c[0][1], c[1][0], c[1][1], c[2][0], c[2][1]]), Math.max(6, 2.6 * K.w), P.milkweedPale, 0.85);
    // midrib: a broad raised rib with contour hatching on its shaded lower half
    const mr = [];
    for (let x = x0 - 80; x <= x1 + 80; x += 90) mr.push([x, midribY(x)]);
    if (mr.length > 1) {
      const band = mr.map((p) => [p[0], p[1] - 22]).concat(mr.slice().reverse().map((p) => [p[0], p[1] + 26]));
      ctx.fillStyle = P.milkweedPale;
      ctx.beginPath();
      L.tracePath(ctx, band, true);
      ctx.fill();
      const lower = mr.map((p) => [p[0], p[1] + 2]).concat(mr.slice().reverse().map((p) => [p[0], p[1] + 26]));
      K.hatch(lower, { angle: 1.75, spacing: 6, width: 1.2, color: P.milkweedDeep, alpha: 0.9, length: [8, 20], seed: seed + 11 });
      K.ink(mr.map((p) => [p[0], p[1] + 27]), { width: 2.4, color: P.inkSoft, alpha: 0.9, seed: seed + 12, taper: 0 });
      K.ink(mr.map((p) => [p[0], p[1] - 23]), { width: 1.6, color: P.milkweedDeep, alpha: 0.9, seed: seed + 13, taper: 0 });
      K.ink(mr.map((p) => [p[0], p[1] - 12]), { width: 1.2, color: P.white, alpha: 0.6, seed: seed + 14, taper: 0 });
    }
    ctx.restore();

    // downy hairs over the underside, fixed in world cells so they do not swim on the pull-back
    const cell = 34;
    const keep = K.s > 1 ? 0.3 : 0.75;
    const hairs = [];
    const dots = [];
    for (let gy = Math.floor(y0 / cell); gy * cell < y1 - 8; gy++) {
      for (let gx = Math.floor(x0 / cell); gx * cell < x1; gx++) {
        const a = L.h3(gx, gy, seed + 21);
        if (a > keep) continue;
        const x = gx * cell + L.h3(gy, gx, seed + 22) * cell;
        const y = gy * cell + L.h3(gx + 3, gy, seed + 23) * cell;
        if (y > y1 - 6 || y < y0) continue;
        const len = Math.max((7 + 9 * L.h3(gx, gy + 5, seed + 24)) * K.s, (8 + 5 * L.h3(gx, gy + 5, seed + 24)) * K.w);
        const ang = 1.25 + (L.h3(gx, gy, seed + 25) - 0.5) * 1.3;
        const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
        hairs.push([x, y, (x + ex) / 2 + 2 * K.s, (y + ey) / 2, ex, ey]);
        if (a < keep * 0.3) dots.push([x, y]);
      }
    }
    strokeBatch(ctx, hairs, 1.1 * K.w, P.white, 0.55);
    if (dots.length) {
      const p = new Path2D();
      const r = 1.6 * K.w;
      for (const d of dots) {
        p.moveTo(d[0] + r, d[1]);
        p.arc(d[0], d[1], r, 0, TAU);
      }
      ctx.fillStyle = P.white;
      ctx.globalAlpha = 0.5;
      ctx.fill(p);
      ctx.globalAlpha = 1;
    }

    // edge-on thickness of the blade and the near margin
    const et = 16;
    ctx.fillStyle = P.milkweedDeep;
    ctx.fillRect(x0, y1 - et, x1 - x0, et);
    K.hatch([[x0, y1 - et], [x1, y1 - et], [x1, y1], [x0, y1]], { angle: -0.9, spacing: 5, width: 1.1, color: P.ink, alpha: 0.5, length: [8, 16], seed: seed + 31 });
    K.ink([[x0, y1 - et], [x1, y1 - et]], { width: 1.2, color: P.milkweedPale, alpha: 0.8, seed: seed + 32, taper: 0, wobble: 1 });
    K.ink([[x0, y1], [x1, y1]], { width: 3, color: P.ink, seed: seed + 33, taper: 0, wobble: 1.2, double: { offset: 4, alpha: 0.4, width: 0.3, from: 0.05, to: 0.6 } });
  }

  // fringe of white trichome hairs hanging from the leaf margin (skipped where the egg is glued)
  function drawFringe(K, VR, seed) {
    const { ctx, L } = K;
    const P = L.pal;
    const x0 = Math.max(LEAF_X0, VR.x0 - 20), x1 = Math.min(LEAF_X1, VR.x1 + 20);
    const step = 8 * K.s;
    const hairs = [];
    const b = L.boil(L.T);
    for (let i = Math.floor(x0 / step); i * step < x1; i++) {
      const x = i * step + (L.h3(i, 3, seed) - 0.5) * step * 0.6;
      if (x > 330 && x < 750) continue;
      const len = Math.max((10 + 8 * L.h3(i, 5, seed)) * K.s, (8 + 6 * L.h3(i, 5, seed)) * K.w);
      const lean = (L.h3(i, 7, seed) - 0.5) * 0.7 + 0.1 + (L.h3(i, b, seed + 1) - 0.5) * 0.08;
      const ex = x + Math.sin(lean) * len, ey = BASE_Y + Math.cos(lean) * len;
      hairs.push([x, BASE_Y - 1, x + Math.sin(lean) * len * 0.3 + 1.5 * K.s, BASE_Y + len * 0.5, ex, ey]);
    }
    strokeBatch(ctx, hairs, 2.2 * K.w, P.inkSoft, 0.75);
    strokeBatch(ctx, hairs, 1.0 * K.w, P.white, 0.95);
  }

  // the second milkweed stem off to the right: a single hand-inked line bowed through its control points
  const STEM_X = 1160;
  const NODE_Y = 2020; // where its one leaf joins
  const STEM_CTRL = [[STEM_X, BASE_Y], [STEM_X + 14, 1010], [STEM_X - 14, 1500], [STEM_X + 2, NODE_Y], [STEM_X - 14, 2550], [STEM_X + 14, 3050]];
  const STEM_PTS = FILM.lib.smoothPts(STEM_CTRL, false, 10);
  function stemX(y) {
    const P = STEM_PTS;
    if (y <= P[0][1]) return P[0][0];
    for (let i = 1; i < P.length; i++) {
      if (P[i][1] >= y) return P[i - 1][0] + ((P[i][0] - P[i - 1][0]) * (y - P[i - 1][1])) / Math.max(1e-6, P[i][1] - P[i - 1][1]);
    }
    return P[P.length - 1][0];
  }
  const STEM_LEN = 3050 - BASE_Y;
  const NODE_U = (NODE_Y - BASE_Y) / STEM_LEN;
  // pen pressure along the stem: 2.5 to 4.5 px, swelling at the leaf node
  const stemPressure = (u) => 1 + 0.19 * Math.sin(u * TAU * 3.3 + 1.1) + 0.09 * Math.sin(u * TAU * 8.7 + 0.4) + 0.5 * Math.exp(-Math.pow((u - NODE_U) / 0.011, 2));

  // the second milkweed stem off to the right, one leaf, and the construction lines
  function drawScenery(K, VR, seed) {
    const { ctx, L } = K;
    const P = L.pal;
    if (VR.x1 > STEM_X - 50) {
      K.ink(STEM_CTRL, { width: 3.5, seed: seed + 1, taper: [4, 60], pressure: stemPressure, widthJitter: 0.06, wobble: 1.5 });
      // the node: a short ink tick each side where the petiole joins
      for (const s of [-1, 1]) {
        const x = stemX(NODE_Y) + s * 3 * K.w;
        K.ink([[x, NODE_Y - 4 * K.w], [x + s * 5 * K.w, NODE_Y + 2 * K.w], [x + s * 6.5 * K.w, NODE_Y + 7 * K.w]], { width: 2, seed: seed + 9 + s, taper: [1, 4], wobble: 0.2, tremble: 0.1 });
      }
      // fine irregular hairs on both sides of the stem, constant on screen
      const hairs = [];
      let y = 560 + 30 * L.h3(1, 2, seed);
      for (let i = 0; y < 3000; i++) {
        const side = L.h3(i, 3, seed) < 0.5 ? -1 : 1;
        const len = (8 + 6 * L.h3(i, 4, seed)) * K.w;
        const a = (0.4 + 0.55 * L.h3(i, 5, seed)) * side;
        const x = stemX(y) + side * 1.8 * K.w;
        const ex = x + Math.sin(a) * len, ey = y - Math.cos(a) * len * 0.9;
        hairs.push([x, y, x + Math.sin(a) * len * 0.3 + side * K.w, y - len * 0.55, ex, ey]);
        y += (7 + 30 * Math.pow(L.h3(i, 6, seed), 1.7)) * K.w;
      }
      strokeBatch(ctx, hairs, 1.2 * K.w, P.inkSoft, 0.8);

      // one milkweed leaf on a short petiole, reaching back toward the egg
      const B = [stemX(NODE_Y) - 28, NODE_Y - 4];
      const d = [-Math.cos(0.35), -Math.sin(0.35)];
      const n = [-d[1], d[0]];
      const LEN = 500, WID = 104;
      const wv = (u) => WID * Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(u, 0.85))), 0.72);
      const droop = (u) => -16 * Math.sin(Math.PI * u);
      const LP = (u, v) => [B[0] + d[0] * u * LEN + n[0] * (v + droop(u)), B[1] + d[1] * u * LEN + n[1] * (v + droop(u))];
      const upper = [], lower = [], rib = [];
      for (let i = 0; i <= 30; i++) {
        const u = i / 30;
        upper.push(LP(u, wv(u)));
        lower.push(LP(u, -wv(u)));
        rib.push(LP(u, 0));
      }
      const leaf = upper.concat(lower.slice().reverse());
      // petiole, and its short hatched cast shadow on the stem below
      const sh = [[stemX(NODE_Y + 4) - 16, NODE_Y + 8], [stemX(NODE_Y + 4) + 18, NODE_Y + 4], [stemX(NODE_Y + 100) + 12, NODE_Y + 96], [stemX(NODE_Y + 100) - 10, NODE_Y + 80]];
      K.hatch(sh, { angle: -Math.PI / 4, spacing: 3.2, width: 1.2, color: P.ink, alpha: 0.75, length: [6, 18], seed: seed + 6, inset: 1, overshoot: 1, clip: true });
      K.ink([[stemX(NODE_Y) + 1, NODE_Y + 1], [stemX(NODE_Y) - 14, NODE_Y - 4], B], { width: 3.2, seed: seed + 2, taper: [2, 4] });
      K.ink(leaf, { closed: true, width: 3, fill: P.milkweed, seed: seed + 3, double: { offset: 3, width: 0.5, alpha: 0.4 } });
      // tone: the lower half hatched parallel to its side veins, the lit upper half left flat
      const lowHalf = rib.concat(lower.slice().reverse());
      const veinAng = Math.atan2(d[1] * 80 - n[1] * 85, d[0] * 80 - n[0] * 85);
      K.hatch(lowHalf, { angle: veinAng, spacing: 6, width: 1.3, color: P.milkweedDeep, alpha: 0.9, length: [8, 22], seed: seed + 4, inset: 2, overshoot: 1, density: (x, yy) => 0.55 + 0.45 * L.smoothstep(0, 1, Math.abs((x - B[0]) * n[0] + (yy - B[1]) * n[1]) / WID) });
      K.hatch(lowHalf, { angle: veinAng + 1.05, spacing: 7, width: 1.1, color: P.milkweedDeep, alpha: 0.7, length: [6, 16], seed: seed + 7, inset: 2, overshoot: 1, density: (x, yy) => L.smoothstep(0.55, 0.95, Math.abs((x - B[0]) * n[0] + (yy - B[1]) * n[1] - droop(0.5)) / WID) });
      K.stipple(upper.concat(rib.slice().reverse()), { color: P.milkweedPale, alpha: 0.7, spacing: 7, density: 0.35, seed: seed + 8 });
      // five pairs of curved side veins and a pale midrib
      const veins = [];
      for (let i = 0; i < 5; i++) {
        const u0 = 0.14 + i * 0.15;
        for (const s of [-1, 1]) {
          const m = LP(u0, 0), c = LP(u0 + 0.06, s * wv(u0 + 0.06) * 0.5), e = LP(Math.min(0.98, u0 + 0.17), s * wv(Math.min(0.98, u0 + 0.17)) * 0.86);
          veins.push({ pts: [m, c, e], s, i });
        }
      }
      for (const v of veins) {
        K.ink(v.pts.map((p) => [p[0] + 2.5 * K.w, p[1] + 3 * K.w]), { width: 1.2, color: P.milkweedDeep, alpha: 0.9, seed: seed + 20 + v.i * 2 + (v.s > 0 ? 1 : 0), taper: [2, 30] });
        K.ink(v.pts, { width: 1.8, color: P.milkweedPale, alpha: 0.95, seed: seed + 40 + v.i * 2 + (v.s > 0 ? 1 : 0), taper: [2, 30] });
      }
      K.ink(rib.map((p) => [p[0] + 2 * K.w, p[1] + 3 * K.w]), { width: 1.4, color: P.milkweedDeep, alpha: 0.9, seed: seed + 60, taper: [4, 40] });
      K.ink(rib, { width: 2.6, color: P.milkweedPale, seed: seed + 5, taper: [6, 40] });
    }
    // construction: the egg axis carried on down, and a width line through the widest ring
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = P.inkFaint;
    ctx.lineWidth = 1.5 * K.w;
    ctx.beginPath();
    ctx.moveTo(AX, TIP_Y);
    ctx.lineTo(AX, 3000);
    ctx.moveTo(150, 790);
    ctx.lineTo(STEM_X, 790);
    ctx.moveTo(-600, BASE_Y + 1);
    ctx.lineTo(1800, BASE_Y + 1);
    for (const y of [790, 1170]) {
      const h = hw(y);
      ctx.moveTo(AX - h, y - 18 * K.s);
      ctx.lineTo(AX - h, y + 18 * K.s);
      ctx.moveTo(AX + h, y - 18 * K.s);
      ctx.lineTo(AX + h, y + 18 * K.s);
    }
    ctx.stroke();
    // tick scale down the axis, a long tick every 200 px
    ctx.beginPath();
    for (let y = TIP_Y + 40; y <= 3000; y += 40) {
      const long = (y - TIP_Y) % 200 === 0;
      const len = (long ? 26 : 11) * K.w;
      ctx.moveTo(AX, y);
      ctx.lineTo(AX + len, y);
    }
    ctx.stroke();
    ctx.setLineDash([6 * K.s, 8 * K.s]);
    ctx.beginPath();
    ctx.ellipse(AX, 790, 285, 285 * TILT, 0, 0, TAU);
    ctx.stroke();
    // construction round the hatchling, faded in on the pull-back: the circle its body curls on,
    // its cross lines, a long arc from the egg tip through the leaf base, and a level out to the stem
    const ca = L.smoothstep(0.86, 0.62, K.zoom);
    if (ca > 0) {
      ctx.globalAlpha = 0.3 * ca;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(700, 1250, 340, 0, TAU);
      ctx.moveTo(700 - 600, 1250);
      ctx.lineTo(700 + 600, 1250);
      ctx.moveTo(700, 1250 - 600);
      ctx.lineTo(700, 1250 + 600);
      ctx.moveTo(700 + 560 * Math.cos(-2.5), 1250 + 560 * Math.sin(-2.5));
      ctx.arc(700, 1250, 560, -2.5, 1.0);
      ctx.moveTo(540 + 946 * Math.cos(0.3), 1280 + 946 * Math.sin(0.3));
      ctx.arc(540, 1280, 946, 0.3, 1.7);
      ctx.moveTo(AX, NODE_Y);
      ctx.lineTo(STEM_X, NODE_Y);
      for (const x of [AX, STEM_X]) {
        ctx.moveTo(x - 22 * K.w, NODE_Y - 22 * K.w);
        ctx.lineTo(x + 22 * K.w, NODE_Y + 22 * K.w);
      }
      ctx.moveTo(AX, TIP_Y);
      ctx.lineTo(AX + (262 * 1720) / 845, 3000);
      ctx.stroke();
      // quadrant ticks on the curl circle
      ctx.beginPath();
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * TAU;
        const l = (k % 6 ? 10 : 22) * K.w;
        ctx.moveTo(700 + Math.cos(a) * 340, 1250 + Math.sin(a) * 340);
        ctx.lineTo(700 + Math.cos(a) * (340 + l), 1250 + Math.sin(a) * (340 + l));
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // ===========================================================================
  // Shell rim after the crack: a jagged ellipse seen slightly from below, minus bite scallops
  // ===========================================================================
  function makeRim(y, jag, seed, bites, tongue) {
    const rx = hw(y) + 2;
    const ry = hw(y) * TILT + 4;
    return { y, rx, ry, jag, seed, bites: bites || [], tongue: tongue || null };
  }
  function jagAt(R, x, k) {
    // sawtooth-ish crack: alternating teeth with seeded sizes
    const u = x / 17;
    const i = Math.floor(u);
    const f = u - i;
    const a = (FILM.lib.h3(i, k, R.seed) - 0.5) * 2;
    const b = (FILM.lib.h3(i + 1, k, R.seed) - 0.5) * 2;
    const tooth = (i & 1 ? f : 1 - f) * 0.9 + 0.1;
    return R.jag * (a + (b - a) * f) * 0.6 + R.jag * 0.55 * (tooth - 0.5);
  }
  function biteLift(R, x) {
    let lift = 0;
    for (const b of R.bites) {
      const u = (x - b.x) / b.r;
      if (u > -1 && u < 1) lift = Math.max(lift, b.depth * Math.sqrt(1 - u * u));
    }
    return lift;
  }
  // the rim's front edge without the tongue (the lower lip of the hollow)
  function rimFrontBase(R, x) {
    const u = (x - AX) / R.rx;
    const e = Math.abs(u) < 1 ? Math.sqrt(1 - u * u) : 0;
    return R.y + R.ry * e + jagAt(R, x, 1) - biteLift(R, x);
  }
  // with the tongue: a ragged strip of front wall left hanging down where the tail holds on
  function rimFront(R, x) {
    const base = rimFrontBase(R, x);
    const T = R.tongue;
    if (!T || x <= T.x0 || x >= T.x1) return base;
    // a tapering strip: sloped torn sides, a ragged tip
    let k;
    if (x < T.tip0) k = sm((x - T.x0) / (T.tip0 - T.x0));
    else if (x > T.tip1) k = sm((T.x1 - x) / (T.x1 - T.tip1));
    else k = 1;
    const y = base + (T.y - base) * Math.pow(k, 0.55) + jagAt(R, x * 1.9, 5) * 0.9 * k;
    return Math.max(base, y);
  }
  function rimBack(R, x) {
    const u = (x - AX) / R.rx;
    const e = Math.abs(u) < 1 ? Math.sqrt(1 - u * u) : 0;
    return R.y - R.ry * e + jagAt(R, x, 2) * 0.6;
  }
  function keepPoly(R) {
    const pts = [[120, 300], [960, 300]];
    for (let x = 960; x >= 120; x -= 3) pts.push([x, rimFront(R, x)]);
    return pts;
  }
  // the standing wall's torn right edge carried on up past the rim: the hollow shows only to its right
  function tornEdge(R) {
    const T = R.tongue;
    if (!T) return null;
    const a = [T.x1 - 22, rimFront(R, T.x1 - 22)];
    const b = [T.x1, rimFrontBase(R, T.x1)];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    const ux = dx / l, uy = dy / l; // pointing up the edge
    const up = (b[1] - (R.y - R.ry - 30)) / -uy;
    const top = [b[0] + ux * up, b[1] + uy * up];
    const low = [a[0] - ux * 400, a[1] - uy * 400];
    return {
      right: [low, top, [top[0] + 3000, top[1]], [low[0] + 3000, low[1]]],
      line: [b, [b[0] + ux * ((b[1] - rimBack(R, b[0])) / -uy), rimBack(R, b[0])]],
    };
  }
  const insideEgg = (x, y) => y >= BASE_Y && y <= TIP_Y && Math.abs(x - AX) <= hw(y);

  // ===========================================================================
  // The egg (pre-hatch and eaten shell)
  // ===========================================================================
  const RIDGE_TH = [];
  for (let i = 0; i < 18; i++) RIDGE_TH.push(((i + 0.5) / 18) * Math.PI);
  const RIB_Y = [];
  for (let k = 0; k < 34; k++) RIB_Y.push(BASE_Y + (TIP_Y - BASE_Y) * (1 - Math.pow(1 - (k + 1) / 35, 1.35)));

  // the curled larva seen through the shell: the nine-point spine shot 02 copies, so the C holds at the cut
  const CURL = [[540, 1120], [430, 1060], [372, 900], [398, 725], [500, 630], [628, 646], [700, 765], [690, 905], [622, 985]];
  const CURL_PIN = [540, 1175]; // after the crack the band's front end is pinned at the hole
  const LIGHT = [-0.7071, -0.7071];
  function arcSample(pts) {
    const S = [0];
    for (let i = 1; i < pts.length; i++) S.push(S[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return S;
  }
  const CURL_PRE = FILM.lib.smoothPts(CURL, false, 10);
  const CURL_POST = (() => {
    const pts = FILM.lib.smoothPts([CURL_PIN].concat(CURL), false, 8);
    return { pts, S: arcSample(pts) };
  })();

  // band polygons from a spine: the whole band, its shadow half (lower right), and ring chords
  function bandOf(spine, widthAt) {
    const n = spine.length;
    const left = [], right = [], nrm = [];
    for (let i = 0; i < n; i++) {
      const a = spine[Math.max(0, i - 1)], b = spine[Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1];
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl;
      ty /= tl;
      const w = widthAt(i / (n - 1));
      left.push([spine[i][0] - ty * w, spine[i][1] + tx * w]);
      right.push([spine[i][0] + ty * w, spine[i][1] - tx * w]);
      nrm.push([-ty, tx, w]);
    }
    // round tail cap
    const e = spine[n - 1], ne = nrm[n - 1];
    const cap = [];
    for (let k = 1; k < 8; k++) {
      const a = (k / 8) * Math.PI;
      cap.push([e[0] + ne[0] * ne[2] * Math.cos(a) + ne[1] * ne[2] * Math.sin(a), e[1] + ne[1] * ne[2] * Math.cos(a) - ne[0] * ne[2] * Math.sin(a)]);
    }
    const poly = left.concat(cap, right.slice().reverse());
    // shadow half: for each run of constant shade side, spine plus that side's edge
    const shade = [];
    let run = null, side = 0;
    for (let i = 0; i < n; i++) {
      const s = nrm[i][0] * LIGHT[0] + nrm[i][1] * LIGHT[1] > 0 ? -1 : 1;
      const edge = s > 0 ? left[i] : right[i];
      if (s !== side) {
        if (run && run.sp.length > 1) shade.push(run.sp.concat(run.ed.reverse()));
        run = { sp: i ? [spine[i - 1]] : [], ed: i ? [s > 0 ? left[i - 1] : right[i - 1]] : [] };
        side = s;
      }
      run.sp.push(spine[i]);
      run.ed.push(edge);
    }
    if (run && run.sp.length > 1) shade.push(run.sp.concat(run.ed.reverse()));
    return { poly, left, right, nrm, shade };
  }

  function drawCurlBand(K, spine, widthAt, seed) {
    const { ctx, L } = K;
    const P = L.pal;
    if (spine.length < 3) return;
    const B = bandOf(spine, widthAt);
    // the shell reads through as a pale veil: a light wash, then hatching builds the tone
    ctx.fillStyle = L.mix(P.egg, P.inkFaint, 0.28);
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    L.tracePath(ctx, B.poly, true);
    ctx.fill();
    ctx.globalAlpha = 1;
    K.hatch(B.poly, { angle: -Math.PI / 4, spacing: 8, width: 1.5, color: P.inkSoft, alpha: 0.55, length: [14, 40], seed: seed + 1, inset: 3, overshoot: 1 });
    if (B.shade.length) K.hatch(B.shade, { angle: -7 * Math.PI / 12, spacing: 7, width: 1.3, color: P.inkSoft, alpha: 0.55, length: [10, 30], seed: seed + 2, inset: 2, overshoot: 1 });
    // segment rings across the band
    const n = spine.length;
    const rings = [];
    const every = Math.max(2, Math.round(n / 14));
    for (let i = every; i < n - 2; i += every) {
      const l = B.left[i], r = B.right[i];
      const d = [spine[Math.min(n - 1, i + 1)][0] - spine[i][0], spine[Math.min(n - 1, i + 1)][1] - spine[i][1]];
      rings.push([l[0], l[1], (l[0] + r[0]) / 2 + d[0] * 1.4, (l[1] + r[1]) / 2 + d[1] * 1.4, r[0], r[1]]);
    }
    strokeBatch(ctx, rings, 1.8 * K.w, P.inkSoft, 0.7);
    // gut shadow down the middle, and the band's edge line
    K.ink(spine.filter((p, i) => i > 1 && i < n - 2), { width: 5, color: P.inkSoft, alpha: 0.3, seed: seed + 3, taper: [30, 60], wobble: 2 });
    K.ink(B.poly, { closed: true, width: 1.8, color: P.inkSoft, alpha: 0.85, seed: seed + 4, wobble: 1.5, taper: [8, 16] });
  }

  // before the crack: the full C and the dark head oval pushing toward the tip
  function drawInsideShadow(K, tw, push, seed) {
    const { ctx, L } = K;
    const P = L.pal;
    ctx.save();
    ctx.clip(polyPath(EGG));
    const ca = Math.cos(tw.rot), sa = Math.sin(tw.rot);
    const rotp = (p) => [540 + (p[0] - 540) * ca - (p[1] - 900) * sa + tw.dx * 0.4, 900 + (p[0] - 540) * sa + (p[1] - 900) * ca + tw.dy * 0.4];
    drawCurlBand(K, CURL_PRE.map(rotp), (u) => 62 * (1 - 0.5 * u * u), seed + 1);
    // the head: a 260 px oval built from cross-hatching, heaviest toward the chewing end
    const hx = 540 + tw.dx, hy = 1140 + tw.dy + push;
    const ha = tw.rot * 2.2;
    const head = L.ellipsePts(hx, hy, 130, 102, 48, ha);
    ctx.fillStyle = L.mix(P.egg, P.inkSoft, 0.35);
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    L.tracePath(ctx, head, true);
    ctx.fill();
    ctx.globalAlpha = 1;
    K.cross(head, { spacing: 5, crossSpacing: 7, layers: 3, tone: 1, width: 1.6, color: P.ink, alpha: 0.7, length: [10, 34], seed: seed + 5, inset: 2, overshoot: 1, density: (x, y) => 0.72 + 0.28 * L.smoothstep(hy - 40, hy + 70, y + (x - hx) * 0.3) });
    K.ink(head, { closed: true, width: 3, color: P.ink, alpha: 0.6, seed: seed + 6, wobble: 1.2, taper: [10, 20] });
    ctx.restore();
  }

  // during the haul-out: the part of the curl not yet out, front end pinned at the crack
  function drawRetreatingCurl(K, frac, seed) {
    const { ctx } = K;
    if (frac <= 0.02) return;
    const want = CURL_POST.S[CURL_POST.S.length - 1] * Math.min(1, frac);
    const spine = [];
    for (let i = 0; i < CURL_POST.pts.length && CURL_POST.S[i] <= want; i++) spine.push(CURL_POST.pts[i]);
    ctx.save();
    ctx.clip(polyPath(eggAboveRim(CRACK_RIM)));
    // wider than the pre-crack curl (62), so the body keeps its width as it passes the rim; the change hides in the hit
    drawCurlBand(K, spine, (u) => 100 * (1 - 0.5 * u * u) * Math.min(1, 0.55 + frac), seed + 1);
    ctx.restore();
  }

  function drawShell(K, st, seed) {
    const { ctx, L } = K;
    const P = L.pal;
    const R = st.rim;
    ctx.save();
    if (R) {
      ctx.beginPath();
      L.tracePath(ctx, keepPoly(R), true);
      ctx.clip();
    }
    // glue collar where the flat base meets the leaf
    for (const s of [-1, 1]) {
      const g = [[AX + s * 214, BASE_Y], [AX + s * 190, BASE_Y + 6], [AX + s * 183, BASE_Y + 26], [AX + s * 176, BASE_Y + 2]];
      ctx.fillStyle = P.white;
      ctx.beginPath();
      L.tracePath(ctx, g, true);
      ctx.fill();
      K.ink([[AX + s * 216, BASE_Y + 1], [AX + s * 194, BASE_Y + 7], [AX + s * 184, BASE_Y + 28]], { width: 1.8, color: P.inkSoft, seed: seed + 60 + s, taper: [2, 10] });
    }
    // body of the shell
    ctx.fillStyle = R ? L.mix(P.egg, P.white, 0.18) : P.egg;
    ctx.beginPath();
    L.tracePath(ctx, EGG, true);
    ctx.fill();
    if (st.shadow) drawInsideShadow(K, st.shadow.tw, st.shadow.push, seed + 70);
    if (st.retreat > 0) drawRetreatingCurl(K, st.retreat, seed + 90);

    // tone: shadow on the right third, under the leaf and toward the tip
    const dens = (x, y) => {
      const h = Math.max(1, hw(y));
      return L.smoothstep(0.2, 0.92, (x - AX) / h) * 0.95 + 0.3 * L.smoothstep(600, BASE_Y, y) + 0.3 * L.smoothstep(1060, 1280, y);
    };
    K.cross(EGG, { density: dens, tone: 0.85, layers: 3, spacing: 7, crossSpacing: 7, width: 1.4, color: P.inkSoft, alpha: 0.85, seed: seed + 1, length: [14, 40] });
    K.stipple(EGG, { color: P.inkSoft, alpha: 0.6, spacing: 9, density: (x, y) => dens(x, y) * 0.8 - 0.15, seed: seed + 2 });

    // 18 raised ridges, lit on their left edges
    const ribAlpha = K.s > 1 ? 0.32 : 0.42;
    for (let i = 0; i < 18; i++) {
      const th = RIDGE_TH[i];
      const pts = [];
      for (let y = BASE_Y + 4; y <= 1238; y += 22) pts.push(ringPt(y, th));
      pts.push(ringPt(1244, th));
      const lit = Math.cos(th) < 0.35;
      if (lit) K.ink(pts.map((p) => [p[0] - 3.4 * K.s, p[1]]), { width: 1.8, color: P.white, alpha: 0.95, seed: seed + 100 + i, taper: [30, 90] });
      K.ink(pts.map((p) => [p[0] + 3.4 * K.s, p[1] + 1]), { width: 1.3, color: P.ink, alpha: lit ? 0.22 : 0.5, seed: seed + 120 + i, taper: [30, 90] });
      K.ink(pts, { width: 1.8, color: P.inkSoft, alpha: 0.9, seed: seed + 140 + i, taper: [12, 50], wobble: 1.2 });
    }
    // 34 cross-ribs between the ridges, the ladder of small cells
    const bI = L.boil(L.T);
    const ribs = [];
    for (let k = 0; k < 34; k++) {
      const y = RIB_Y[k];
      if (y > 1236) continue;
      const ths = [0].concat(RIDGE_TH, [Math.PI]);
      for (let i = 0; i < ths.length - 1; i++) {
        if (L.h3(k, i, seed + 17) < 0.22) continue;
        const j0 = (L.h3(k, i, seed + bI) - 0.5) * 1.6 * K.s;
        const j1 = (L.h3(i, k, seed + bI + 3) - 0.5) * 1.6 * K.s;
        const a = ringPt(y + j0, ths[i] + 0.012), b = ringPt(y + j1, ths[i + 1] - 0.012);
        const m = ringPt(y, (ths[i] + ths[i + 1]) / 2);
        ribs.push([a[0], a[1], m[0] * 2 - (a[0] + b[0]) / 2, m[1] * 2 - (a[1] + b[1]) / 2 + 1.5, b[0], b[1]]);
      }
    }
    strokeBatch(ctx, ribs, 1.25 * K.w, P.inkSoft, ribAlpha);

    // micropyle rosette at the tip: 6 petal cells around a pinpoint
    if (!R) {
      const [mx, my, mr] = MICRO;
      const petals = [];
      for (let j = 0; j < 6; j++) {
        const a = (j / 6) * TAU + 0.3;
        petals.push(L.ellipsePts(mx + Math.cos(a) * mr * 0.55, my + Math.sin(a) * mr * 0.3, mr * 0.42, mr * 0.2, 14, a));
      }
      for (let j = 0; j < 6; j++) K.ink(petals[j], { closed: true, width: 1.3, color: P.inkSoft, alpha: 0.9, seed: seed + 160 + j, wobble: 0.4, taper: [2, 4] });
      ctx.fillStyle = P.ink;
      ctx.beginPath();
      ctx.arc(mx, my, 3 * K.w, 0, TAU);
      ctx.fill();
    }

    // gloss on the lit shoulder
    const gloss = [];
    for (let j = 0; j < 4; j++) {
      const y = 640 + j * 70;
      const x = AX - hw(y) * 0.72;
      gloss.push([x, y, x - 6, y + 26, x - 2, y + 50]);
    }
    strokeBatch(ctx, gloss, 3.4 * K.w, P.white, 0.9);

    // the open rim: the hollow inside, seen from below, drawn over the front wall's ridges so it reads as a hole.
    // Where a strip of front wall still hangs down (the tongue), the wall hides the hollow up to its torn edge.
    if (R) {
      const inner = [];
      for (let x = AX - R.rx; x <= AX + R.rx; x += 5) inner.push([x, rimBack(R, x)]);
      for (let x = AX + R.rx; x >= AX - R.rx; x -= 5) inner.push([x, Math.max(rimBack(R, x), rimFrontBase(R, x))]);
      const edge = tornEdge(R);
      ctx.save();
      if (edge) {
        ctx.beginPath();
        L.tracePath(ctx, edge.right, true);
        ctx.clip();
      }
      ctx.fillStyle = L.mix(P.paperDeep, P.inkSoft, 0.35);
      ctx.beginPath();
      L.tracePath(ctx, inner, true);
      ctx.fill();
      K.hatch(inner, { angle: -0.35, spacing: 5, width: 1.3, color: P.ink, alpha: 0.55, length: [10, 30], seed: seed + 80 });
      // the deep end under the far rim
      const deep = [];
      for (let x = AX - R.rx; x <= AX + R.rx; x += 5) deep.push([x, rimBack(R, x) - 2]);
      for (let x = AX + R.rx; x >= AX - R.rx; x -= 5) deep.push([x, Math.min(Math.max(rimBack(R, x), rimFrontBase(R, x)), rimBack(R, x) + R.ry * 0.7)]);
      K.hatch(deep, { angle: 1.2, spacing: 5, width: 1.3, color: P.ink, alpha: 0.5, length: [8, 20], seed: seed + 81 });
      // the inside of the far wall still shows its ribs, faintly
      const wall = [];
      for (let i = 2; i < 16; i += 2) {
        const x = AX + R.rx * Math.cos(RIDGE_TH[i]);
        const yb = rimBack(R, x);
        wall.push([x, yb + 3, x + (x - AX) * 0.05, yb + R.ry * 0.9]);
      }
      strokeBatch(ctx, wall, 1.3 * K.w, P.paperShade, 0.6);
      ctx.restore();
    }

    // the hatchling's chew crescent and the hairline crack before the tip pops
    if (st.chew > 0) {
      // a ragged black hole chewed through the tip, with a torn pale lip on its upper edge
      const cx = 546, cy = 1266;
      const r = 12 + 18 * st.chew;
      const hole = [];
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * TAU;
        const k = i & 1 ? 0.78 : 1;
        hole.push([cx + Math.cos(a) * r * k * 1.25, cy + Math.sin(a) * r * k * 0.8]);
      }
      ctx.save();
      ctx.clip(polyPath(EGG));
      K.ink(hole, { closed: true, width: 1.6, color: P.ink, fill: P.veinBlack, seed: seed + 175, wobble: 0.6, smooth: false, taper: [2, 2] });
      const lip = [];
      for (let i = 0; i <= 8; i++) {
        const a = Math.PI + 0.3 + (i / 8) * (Math.PI - 0.6);
        lip.push([cx + Math.cos(a) * (r * 1.25 + 4), cy + Math.sin(a) * (r * 0.8 + 4)]);
      }
      K.ink(lip, { width: 2.2, color: P.white, alpha: 0.9, seed: seed + 176, taper: [6, 6], wobble: 0.4 });
      ctx.restore();
    }
    if (st.hairline) {
      // a fracture, not a zigzag: seeded 7 to 22 px steps, 2 to 9 px offsets of alternating sign
      const h = hw(CRACK_Y);
      const ringY = (x) => {
        const u = (x - AX) / h;
        return CRACK_Y + h * TILT * Math.sqrt(Math.max(0, 1 - u * u));
      };
      const pts = [];
      let x = AX - h + 6;
      for (let i = 0; x <= AX + h - 6; i++) {
        const off = (2 + 7 * L.h3(i, 1, seed + 171)) * (i & 1 ? 1 : -1);
        pts.push([x, ringY(x) + off]);
        x += 7 + 15 * L.h3(i, 2, seed + 171);
      }
      pts.push([AX + h - 6, ringY(AX + h - 6) + 2]);
      K.ink(pts, { width: 2.1, color: P.ink, smooth: false, seed: seed + 170, taper: [14, 14], widthJitter: 0.1, pressure: (u) => 0.76 + 0.48 * (0.5 + 0.5 * Math.sin(u * 19.7 + 0.7)) * (0.6 + 0.4 * Math.sin(u * 7.1 + 2)) });
      // two short branch cracks
      for (const [bx, dir, len, k] of [[470, -1, 34, 0], [610, 1, 26, 1]]) {
        let j = 0;
        while (j < pts.length - 1 && pts[j + 1][0] < bx) j++;
        const a = pts[j];
        const b = [a[0] + dir * 0.35 * len - 4, a[1] + dir * 0.55 * len];
        const c = [a[0] + dir * 0.2 * len - 10 + 6 * L.h3(k, 3, seed + 171), a[1] + dir * len];
        K.ink([a, b, c], { width: 1.5, color: P.ink, smooth: false, seed: seed + 172 + k, taper: [2, 12], wobble: 0.4 });
      }
    }

    // hero outline
    K.ink(EGG, { closed: true, width: 5, color: P.ink, seed: seed + 3, double: { alpha: 0.4, width: 0.3 } });
    ctx.restore();

    // through a bitten notch in the front wall, the inside of the far wall shows, dark and ribbed
    if (R && R.bites.length) {
      const top = [], bot = [];
      let any = false;
      for (let x = AX - R.rx + 2; x <= AX + R.rx - 2; x += 4) {
        const f = rimFrontBase(R, x), b = rimBack(R, x);
        if (f < b - 1) any = true;
        top.push([x, Math.min(f, b)]);
        bot.push([x, b]);
      }
      if (any) {
        const notch = top.concat(bot.reverse());
        ctx.save();
        ctx.clip(polyPath(EGG));
        ctx.fillStyle = L.mix(P.paperDeep, P.inkSoft, 0.45);
        ctx.beginPath();
        L.tracePath(ctx, notch, true);
        ctx.fill();
        K.hatch(notch, { angle: -0.35, spacing: 5, width: 1.3, color: P.ink, alpha: 0.6, length: [10, 30], seed: seed + 85, inset: 1, overshoot: 1 });
        const ribs = [];
        for (let i = 1; i < 18; i += 1) {
          const x = AX + R.rx * Math.cos(RIDGE_TH[i]);
          const f = rimFrontBase(R, x), b = rimBack(R, x);
          if (f < b - 6) ribs.push([x, f + 2, x + (x - AX) * 0.03, b - 2]);
        }
        strokeBatch(ctx, ribs, 1.3 * K.w, P.paperShade, 0.55);
        ctx.restore();
      }
    }

    // the ragged rim, front edge heavy, far edge light
    if (R) {
      const runs = [];
      let cur = null;
      for (let x = 120; x <= 960; x += 4) {
        const y = rimFront(R, x);
        if (insideEgg(x, y)) {
          if (!cur) runs.push((cur = []));
          cur.push([x, y]);
        } else cur = null;
      }
      runs.forEach((run, i) => {
        if (run.length > 1) K.ink(run, { width: 3.4, color: P.ink, smooth: false, seed: seed + 180 + i, taper: [4, 4], wobble: 0.8 });
      });
      const edge = tornEdge(R);
      const back = [];
      for (let x = AX - R.rx + 4; x <= AX + R.rx - 4; x += 4) {
        const y = rimBack(R, x);
        // behind a standing wall the far rim is hidden: only right of the torn edge
        if (edge && x < edge.line[1][0] + (edge.line[0][0] - edge.line[1][0]) * ((y - edge.line[1][1]) / (edge.line[0][1] - edge.line[1][1]))) continue;
        if (y < rimFrontBase(R, x) - 2) back.push([x, y]);
      }
      if (back.length > 1) K.ink(back, { width: 1.8, color: P.inkSoft, smooth: false, seed: seed + 190, taper: [6, 6], wobble: 0.6 });
      if (edge) {
        // the broken wall's thickness: a pale cut face beside a heavy edge line
        const [p, q] = edge.line;
        K.ink([[p[0] - 5, p[1] + 4], [q[0] - 5, q[1] + 2]], { width: 4.5, color: L.mix(P.egg, P.white, 0.4), seed: seed + 192, taper: [4, 10], wobble: 0.4 });
        K.ink([p, q], { width: 3, color: P.ink, seed: seed + 191, taper: [2, 12], wobble: 0.5 });
      }
    }
  }

  // ===========================================================================
  // Debris: the tip cap and shell fragments (T 4.5), cream flecks at each bite
  // ===========================================================================
  const CRACK_RIM = makeRim(CRACK_Y, 16, 4501);
  const CAP = (() => {
    const R = CRACK_RIM;
    const right = EGG.filter((p) => p[0] >= AX && p[1] > R.y + R.ry * 0.3);
    const left = EGG.filter((p) => p[0] < AX && p[1] > R.y + R.ry * 0.3);
    const rim = [];
    for (let x = AX - R.rx + 8; x <= AX + R.rx - 8; x += 6) rim.push([x, rimFront(R, x)]);
    const poly = right.concat(left, rim);
    let cx = 0, cy = 0;
    for (const p of poly) {
      cx += p[0];
      cy += p[1];
    }
    return { poly, cx: cx / poly.length, cy: cy / poly.length };
  })();
  function shards(seed, count, origin, o) {
    const L = FILM.lib;
    const r = L.rng(seed);
    const out = [];
    for (let i = 0; i < count; i++) {
      const th = o.spread[0] + (o.spread[1] - o.spread[0]) * ((i + r()) / count);
      const sp = r.range(o.speed[0], o.speed[1]);
      const size = r.range(o.size[0], o.size[1]);
      const nv = r.int(4, 6);
      const verts = [];
      for (let k = 0; k < nv; k++) {
        const a = (k / nv) * TAU + r.range(-0.35, 0.35);
        const rad = size * (k & 1 ? r.range(0.35, 0.6) : r.range(0.8, 1.15));
        verts.push([Math.cos(a) * rad, Math.sin(a) * rad * r.range(0.6, 1)]);
      }
      out.push({
        x: origin[0] + Math.cos(th) * o.ring[0],
        y: origin[1] + Math.sin(th) * o.ring[1],
        vx: Math.cos(th) * sp,
        vy: Math.sin(th) * sp - o.lift,
        w: r.range(-9, 9),
        a0: r.range(0, TAU),
        size,
        verts,
        seed: seed * 7 + i,
      });
    }
    return out;
  }
  const FRAGS = shards(4502, 11, [AX, CRACK_Y + 10], { spread: [-0.35, Math.PI + 0.35], speed: [900, 1700], size: [16, 34], ring: [150, 24], lift: 300 });
  // bite flecks start on the bitten edge and fly outward, away from the head
  function edgeFlecks(seed, count, cx, cy, rx, ry, a0, a1, o) {
    const out = shards(seed, count, [cx, cy], { spread: [a0, a1], speed: o.speed, size: o.size, ring: [rx, ry], lift: o.lift });
    for (const f of out) {
      const ox = f.x - cx, oy = f.y - cy;
      const l = Math.hypot(ox, oy) || 1;
      const sp = Math.hypot(f.vx, f.vy + o.lift);
      let dx = ox / l + o.bias[0], dy = oy / l + o.bias[1];
      const dl = Math.hypot(dx, dy) || 1;
      f.vx = (dx / dl) * sp;
      f.vy = (dy / dl) * sp - o.lift;
    }
    return out;
  }
  const FLECKS1 = edgeFlecks(5002, 6, 648, 1178, 104, 112, 3.35, 5.3, { speed: [560, 900], size: [16, 26], lift: 260, bias: [-0.9, 0.2] });
  // the second bite takes the shell's right half, so its flecks leave the torn right side, away from the head
  const FLECKS2 = edgeFlecks(5252, 6, 660, 1010, 96, 118, 2.2, 4.3, { speed: [620, 980], size: [15, 24], lift: 160, bias: [-0.55, 0.5] });
  const GRAV = 2600;

  // the popped tip cap: it starts clear of the head capsule on the hit frame, then arcs away
  const CAP_START = [-300, -70, -0.7];
  function drawCap(K, tt, seed) {
    const { ctx, L } = K;
    const P = L.pal;
    if (tt < 0 || tt > 0.75) return;
    const x = CAP_START[0] - 1150 * tt, y = CAP_START[1] + 380 * tt + 0.5 * GRAV * tt * tt;
    const rot = CAP_START[2] - 6.5 * tt;
    ctx.save();
    ctx.translate(CAP.cx + x, CAP.cy + y);
    ctx.rotate(rot);
    ctx.translate(-CAP.cx, -CAP.cy);
    const poly = CAP.poly;
    ctx.fillStyle = P.egg;
    ctx.beginPath();
    L.tracePath(ctx, poly, true);
    ctx.fill();
    K.hatch(poly, { angle: -0.8, spacing: 6, width: 1.3, color: P.inkSoft, alpha: 0.8, density: (px) => L.smoothstep(AX - 20, AX + 120, px), seed: seed + 1, length: [10, 24] });
    const ridges = [];
    for (let i = 1; i < 18; i += 2) {
      const a = ringPt(CRACK_Y + 20, RIDGE_TH[i]);
      const b = ringPt(1250, RIDGE_TH[i]);
      ridges.push([a[0], a[1], b[0], b[1]]);
    }
    ctx.save();
    ctx.clip(polyPath(poly));
    strokeBatch(ctx, ridges, 1.6 * K.w, P.inkSoft, 0.85);
    ctx.restore();
    K.ink(poly, { closed: true, width: 3.2, seed: seed + 2, wobble: 1 });
    const [mx, my] = MICRO;
    ctx.fillStyle = P.ink;
    ctx.beginPath();
    ctx.arc(mx, my, 3 * K.w, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawShards(K, list, tt, life, fill, seed) {
    const { ctx, L } = K;
    const P = L.pal;
    if (tt < 0 || tt > life) return;
    const shrink = L.clamp((life - tt) / (life * 0.35));
    for (const s of list) {
      const x = s.x + s.vx * tt, y = s.y + s.vy * tt + 0.5 * GRAV * tt * tt;
      const a = s.a0 + s.w * tt;
      const ca = Math.cos(a), sa = Math.sin(a);
      const k = 0.35 + 0.65 * shrink;
      const pts = s.verts.map((v) => [x + (v[0] * ca - v[1] * sa) * k, y + (v[0] * sa + v[1] * ca) * k]);
      ctx.fillStyle = fill;
      ctx.beginPath();
      L.tracePath(ctx, pts, true);
      ctx.fill();
      // one ridge fragment across each shard, shaded underside
      const e = pts[0], f = pts[Math.floor(pts.length / 2)];
      strokeBatch(ctx, [[e[0] * 0.7 + f[0] * 0.3, e[1] * 0.7 + f[1] * 0.3, e[0] * 0.3 + f[0] * 0.7, e[1] * 0.3 + f[1] * 0.7]], 1.3 * K.w, P.inkSoft, 0.9);
      K.ink(pts, { closed: true, width: 2.2, seed: s.seed + seed, wobble: 0.5, taper: [2, 4], smooth: false });
    }
  }

  // ===========================================================================
  // First-instar larva: translucent grey-green, 13 segments, black head wider than the body
  // ===========================================================================
  const HEAD_BACK = 95; // neck sits this far behind the head centre along the path
  const BODY_SPAN = LARVA_LEN - 150; // neck to tail tip
  const BEND = 300; // a head offset bends this much of the front of the body with it
  // relative segment lengths T1 T2 T3 A1..A8 A9 A10
  const SEG_REL = [0.72, 0.78, 0.84, 1, 1, 1, 1, 1, 1, 1, 1, 0.92, 0.86];
  const SEG_U = (() => {
    const tot = SEG_REL.reduce((a, b) => a + b, 0);
    const u = [0];
    let acc = 0;
    for (const r of SEG_REL) u.push((acc += r) / tot);
    return u;
  })();
  const sm = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const CAP_U = (0.55 * BODY_W * 0.5) / BODY_SPAN;
  function bodyHalfWidth(u) {
    const W2 = BODY_W / 2;
    let f;
    if (u < SEG_U[3]) f = 0.7 + 0.3 * sm(u / SEG_U[3]); // T1 at 70 percent, full by A1
    else if (u < SEG_U[10]) f = 1;
    else if (u < SEG_U[11]) f = 1 - 0.3 * sm((u - SEG_U[10]) / (SEG_U[11] - SEG_U[10]));
    else f = 0.7 - 0.15 * sm((u - SEG_U[11]) / (SEG_U[12] - SEG_U[11])); // A9 to A10 at 55 percent
    if (u > 1 - CAP_U) f = 0.55 * Math.sqrt(Math.max(0, 1 - Math.pow((u - (1 - CAP_U)) / CAP_U, 2)));
    let w = W2 * f;
    // shallow grooves at the segment boundaries, 3 to 4 px deep
    for (let k = 1; k < 13; k++) {
      const d = ((u - SEG_U[k]) * BODY_SPAN) / 9;
      if (d > -3 && d < 3) w -= 3.5 * Math.exp(-d * d);
    }
    return Math.max(0, w);
  }

  function larvaFrame(pose) {
    const sNeck = pose.sHead - HEAD_BACK;
    const N = 132;
    const C = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const s = sNeck - u * BODY_SPAN;
      const q = trackAt(s);
      const d = u * BODY_SPAN;
      const k = d < BEND ? Math.pow(1 - d / BEND, 2) : 0;
      C.push({ u, s, x: q.x + pose.hdx * k, y: q.y + pose.hdy * k, qtx: q.tx, qty: q.ty });
    }
    for (let i = 0; i <= N; i++) {
      const a = C[Math.max(0, i - 2)], b = C[Math.min(N, i + 2)];
      let tx = a.x - b.x, ty = a.y - b.y; // toward the head
      const l = Math.hypot(tx, ty);
      if (l < 1e-3) {
        tx = C[i].qtx;
        ty = C[i].qty;
      } else {
        tx /= l;
        ty /= l;
      }
      const c = C[i];
      c.tx = tx;
      c.ty = ty;
      c.nx = -ty; // dorsal: the outer side of the loop
      c.ny = tx;
      c.w = bodyHalfWidth(c.u);
    }
    return C;
  }
  const at = (c, side, f) => [c.x + c.nx * c.w * f * side, c.y + c.ny * c.w * f * side];
  function sampleU(C, u) {
    const f = Math.max(0, Math.min(1, u)) * (C.length - 1);
    const i = Math.min(C.length - 2, Math.floor(f));
    const k = f - i;
    const a = C[i], b = C[i + 1];
    return { u, x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, tx: a.tx, ty: a.ty, nx: a.nx, ny: a.ny, w: bodyHalfWidth(u) };
  }
  const VEN = -1; // ventral side is the inner side of the loop
  const DOR = 1;

  // a true leg: a tiny black jointed hook, the claw curling back toward the tail
  function drawLegHook(K, base, dir, back, len, seed, far) {
    const { ctx, L } = K;
    const P = L.pal;
    const knee = [base[0] + dir[0] * len * 0.5 + back[0] * len * 0.08, base[1] + dir[1] * len * 0.5 + back[1] * len * 0.08];
    const foot = [knee[0] + dir[0] * len * 0.42 + back[0] * len * 0.12, knee[1] + dir[1] * len * 0.42 + back[1] * len * 0.12];
    const claw = [foot[0] + back[0] * len * 0.3 - dir[0] * len * 0.08, foot[1] + back[1] * len * 0.3 - dir[1] * len * 0.08];
    const col = far ? L.mix(P.veinBlack, P.inkSoft, 0.45) : P.veinBlack;
    const g = K.legK || 0; // pulled back: thicker pens so the legs still read on a phone
    K.ink([base, knee, foot], { width: (far ? 5.5 : 7) + (far ? 1.5 : 2) * g, color: col, seed, taper: [1, 6], wobble: 0.3, tremble: 0.2, smooth: false, minWidth: 0.45 });
    K.ink([foot, claw], { width: (far ? 3 : 3.6) + 1.2 * g, color: col, seed: seed + 1, taper: [0, 8], wobble: 0.2, tremble: 0.1, smooth: false });
  }

  // a proleg: a low pale pad bulging past the ventral edge, a dark arc of crochets on its sole
  function drawPad(K, c, seed, far) {
    const { ctx, L } = K;
    const P = L.pal;
    const vx = c.nx * VEN, vy = c.ny * VEN;
    const g = K.legK || 0; // pulled back: bigger pads
    const half = (far ? 17 : 22) + (far ? 6 : 8) * g;
    const out = (far ? 13 : 18) + (far ? 6 : 8) * g;
    const shift = far ? 14 : 0;
    const bx = c.x + vx * c.w * 0.86 + c.tx * shift, by = c.y + vy * c.w * 0.86 + c.ty * shift;
    const pad = [];
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * Math.PI;
      const along = Math.cos(a) * half;
      const across = Math.sin(a) * (c.w * 0.14 + out) * (1 - 0.18 * Math.pow(Math.cos(a), 4));
      pad.push([bx + c.tx * along + vx * across, by + c.ty * along + vy * across]);
    }
    ctx.fillStyle = far ? L.mix(P.larvaFirst, P.milkweedDeep, 0.38) : L.mix(P.larvaFirst, P.white, 0.28);
    ctx.beginPath();
    L.tracePath(ctx, pad, true);
    ctx.fill();
    // open side edges only, no closed outline
    K.ink(pad.slice(0, 4), { width: 1.4, color: P.inkSoft, alpha: 0.7, seed: seed + 1, taper: [2, 8], wobble: 0.2 });
    K.ink(pad.slice(9), { width: 1.4, color: P.inkSoft, alpha: 0.7, seed: seed + 2, taper: [8, 2], wobble: 0.2 });
    // the crochet arc across the sole, with tiny hooks
    const sole = pad.slice(3, 10).map((p) => [p[0] - vx * 2.5, p[1] - vy * 2.5]);
    K.ink(sole, { width: (far ? 2 : 2.6) + (far ? 0.7 : 0.9) * g, color: P.veinBlack, alpha: far ? 0.7 : 0.95, seed: seed + 3, taper: [3, 3], wobble: 0.2 });
    if (!far) {
      const hooks = [];
      const hl = 5 + 3 * g;
      for (let i = 1; i < sole.length - 1; i++) {
        const p = sole[i];
        hooks.push([p[0], p[1], p[0] + vx * hl - c.tx * 2, p[1] + vy * hl - c.ty * 2]);
      }
      strokeBatch(ctx, hooks, 1.3 * K.w, P.veinBlack, 0.85);
    }
  }

  function drawLarva(K, pose, seed) {
    const { ctx, L } = K;
    const P = L.pal;
    const C = larvaFrame(pose);
    const segC = (k) => sampleU(C, (SEG_U[k] + SEG_U[k + 1]) / 2);

    ctx.save();
    if (pose.rim) {
      ctx.beginPath();
      ctx.rect(-3000, -3000, 7000, 8000);
      ctx.rect(-3000, -3000, 7000, 3000 + BASE_Y);
      L.tracePath(ctx, wallAboveRim(pose.rim), true);
      ctx.clip('evenodd');
    }
    // far-side legs and prolegs peek out behind the body
    for (const k of [5, 6, 7, 8]) drawPad(K, segC(k), seed + 10 + k, true);
    for (let k = 0; k < 3; k++) {
      const c = segC(k);
      const v = [c.nx * VEN, c.ny * VEN];
      const b = at(c, VEN, 0.72);
      drawLegHook(K, [b[0] + c.tx * 12, b[1] + c.ty * 12], [v[0] * 0.72 + c.tx * 0.69, v[1] * 0.72 + c.ty * 0.69], [-c.tx, -c.ty], 26 + 22 * (K.legK || 0), seed + 30 + k, true);
    }

    // body: dorsal edge neck to tail, ventral edge back to the neck
    const dorsal = C.map((c) => at(c, DOR, 1));
    const ventral = C.map((c) => at(c, VEN, 1));
    const outline = dorsal.concat(ventral.reverse());
    ctx.fillStyle = P.larvaFirst;
    ctx.beginPath();
    L.tracePath(ctx, outline, true);
    ctx.fill();

    // translucency: the darker gut down the middle
    const gut = [];
    const gut2 = [];
    for (const c of C) {
      if (c.u < 0.05 || c.u > 0.9) continue;
      const wob = 0.08 * L.noise1(c.s / 60, seed + 3);
      gut.push(at(c, DOR, 0.3 + wob));
      gut2.push(at(c, VEN, 0.1 - wob));
    }
    const gutPoly = gut.concat(gut2.reverse());
    ctx.fillStyle = L.mix(P.milkweedDeep, P.larvaFirst, 0.45);
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    L.tracePath(ctx, gutPoly, true);
    ctx.fill();
    ctx.globalAlpha = 1;
    K.stipple(gutPoly, { color: P.milkweedDeep, alpha: 0.7, spacing: 7, density: 0.5, seed: seed + 4 });
    if (pose.ate > 0) K.stipple(gutPoly, { color: P.egg, alpha: 0.95, spacing: 14, density: 0.25 * pose.ate, r: [2, 3.4], seed: seed + 5 });

    // shade half: contour hatching across the body on the side away from the light
    const hatchSegs = [];
    const deepSegs = [];
    const stepS = 7 * K.s;
    const bI = L.boil(L.T);
    let acc = 0;
    for (let i = 1; i < C.length; i++) {
      const c = C[i];
      acc += Math.hypot(c.x - C[i - 1].x, c.y - C[i - 1].y);
      if (acc < stepS) continue;
      acc = 0;
      if (c.u > 0.975 || c.w < 8) continue;
      const shadeSide = c.nx * LIGHT[0] + c.ny * LIGHT[1] > 0 ? -1 : 1;
      const j = L.h3(i, bI, seed + 7);
      const f0 = 0.12 + 0.3 * j;
      const a = at(c, shadeSide, f0);
      const b = at(c, shadeSide, 0.95);
      const bow = 7 * K.s;
      hatchSegs.push([a[0], a[1], (a[0] + b[0]) / 2 - c.tx * bow, (a[1] + b[1]) / 2 - c.ty * bow, b[0], b[1]]);
      if (j < 0.55) {
        const d = at(c, shadeSide, 0.62 + 0.1 * j);
        deepSegs.push([d[0] + c.tx * 3, d[1] + c.ty * 3, b[0] + c.tx * 5, b[1] + c.ty * 5]);
      }
    }
    strokeBatch(ctx, hatchSegs, 1.4 * K.w, P.milkweedDeep, 0.85);
    strokeBatch(ctx, deepSegs, 1.2 * K.w, P.inkSoft, 0.55);
    // lit flank sheen: the shiny, translucent skin
    const sheen = [];
    for (const c of C) {
      if (c.u < 0.04 || c.u > 0.92) continue;
      const litSide = c.nx * LIGHT[0] + c.ny * LIGHT[1] > 0 ? 1 : -1;
      sheen.push(at(c, litSide, 0.64));
    }
    for (let i = 0; i + 6 < sheen.length; i += 9) K.ink(sheen.slice(i, i + 7), { width: 4.5, color: P.white, alpha: 0.85, seed: seed + 40 + i, taper: [8, 20], wobble: 0.6 });

    // 13 segment rings in inkSoft, and fine annulets on the abdomen
    const rings = [];
    for (let k = 1; k < 13; k++) {
      const c = sampleU(C, SEG_U[k]);
      const a = at(c, DOR, 0.94), b = at(c, VEN, 0.94);
      const m = [c.x + c.tx * c.w * 0.2, c.y + c.ty * c.w * 0.2];
      rings.push([a[0], a[1], 2 * m[0] - (a[0] + b[0]) / 2, 2 * m[1] - (a[1] + b[1]) / 2, b[0], b[1]]);
    }
    strokeBatch(ctx, rings, 1.8 * K.w, P.inkSoft, 0.9);
    const ann = [];
    for (let k = 3; k < 12; k++) {
      for (const fr of [0.34, 0.67]) {
        const c = sampleU(C, SEG_U[k] + (SEG_U[k + 1] - SEG_U[k]) * fr);
        const a = at(c, DOR, 0.9), b = at(c, DOR, 0.35);
        ann.push([a[0], a[1], (a[0] + b[0]) / 2 + c.tx * 6, (a[1] + b[1]) / 2 + c.ty * 6, b[0], b[1]]);
      }
    }
    strokeBatch(ctx, ann, 1.1 * K.w, P.inkSoft, 0.35);

    // spiracles on T1 and A1 to A8
    ctx.fillStyle = P.inkSoft;
    for (const k of [0, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const c = segC(k);
      const p = at(c, VEN, 0.3);
      ctx.beginPath();
      ctx.ellipse(p[0], p[1], 8, 5, Math.atan2(c.ty, c.tx), 0, TAU);
      ctx.fill();
    }
    // two dark triangular patches on the back just behind the head
    for (const [f0, f1, u0, u1] of [[0.86, 0.4, 0.075, 0.125], [0.24, -0.18, 0.08, 0.118]]) {
      const c0 = sampleU(C, u0), c1 = sampleU(C, u1), cm = sampleU(C, (u0 + u1) / 2);
      const tri = [at(c0, DOR, f0), at(cm, DOR, f0 - 0.06), at(c1, DOR, (f0 + f1) / 2), at(cm, DOR, f1 + 0.06), at(c0, DOR, f1)];
      K.ink(tri, { closed: true, width: 1.2, fill: L.mix(P.veinBlack, P.larvaFirst, 0.22), color: P.veinBlack, alpha: 0.9, seed: seed + 80 + u0 * 1000, wobble: 0.4, taper: [2, 4] });
    }

    // sparse long dark setae with dark bases
    const setae = [];
    const bases = [];
    for (let k = 0; k < 13; k++) {
      for (const [side, uf, f] of [[DOR, 0.4, 0.8], [VEN, 0.6, 0.75]]) {
        const u = SEG_U[k] + (SEG_U[k + 1] - SEG_U[k]) * uf;
        if (u > 0.97) continue;
        const c = sampleU(C, u);
        const b = at(c, side, f);
        const out = [c.nx * side, c.ny * side];
        // pulled back, the ventral setae shorten to 24 to 40 px so the legs stand clear of them
        const hv = L.h3(k, side + 5, seed + 9);
        const len = side === DOR ? 58 + 26 * hv : L.lerp(40 + 26 * hv, 24 + 16 * hv, K.legK || 0);
        const back = 0.35 + 0.3 * L.h3(k, side + 2, seed + 9);
        const d = [out[0] - c.tx * back, out[1] - c.ty * back];
        const dl = Math.hypot(d[0], d[1]);
        const base = at(c, side, 1);
        const e = [base[0] + (d[0] / dl) * len, base[1] + (d[1] / dl) * len];
        setae.push([base[0], base[1], (base[0] + e[0]) / 2 - c.tx * 8, (base[1] + e[1]) / 2 - c.ty * 8, e[0], e[1]]);
        bases.push(b);
      }
    }
    strokeBatch(ctx, setae, 1.7 * K.w, P.ink, 0.9);
    ctx.fillStyle = P.ink;
    for (const b of bases) {
      ctx.beginPath();
      ctx.arc(b[0], b[1], 4.2, 0, TAU);
      ctx.fill();
    }

    // hero outline
    K.ink(outline, { closed: true, width: 5, color: P.ink, seed: seed + 150, double: { alpha: 0.4, width: 0.3 } });

    // near-side prolegs (A3 to A6) and true legs (T1 to T3)
    for (const k of [5, 6, 7, 8]) drawPad(K, segC(k), seed + 110 + k, false);
    for (let k = 0; k < 3; k++) {
      const c = segC(k);
      const v = [c.nx * VEN, c.ny * VEN];
      const b = at(c, VEN, 0.9);
      drawLegHook(K, b, [v[0] * 0.72 + c.tx * 0.69, v[1] * 0.72 + c.ty * 0.69], [-c.tx, -c.ty], 32 + 16 * (K.legK || 0), seed + 130 + k, false);
    }
    ctx.restore();

    if (pose.anal && pose.rim) drawAnalClasp(K, C, pose.rim, seed + 170);
    drawHead(K, pose, seed + 200);
  }

  // A10's anal prolegs: two short dark hooked pads clasped over the rim's ink line, where the tail
  // disappears behind the lip
  function drawAnalClasp(K, C, R, seed) {
    const { L } = K;
    const P = L.pal;
    let lip = null;
    for (let i = C.length - 1; i > 0; i--) {
      const c = C[i];
      if (c.y > rimFront(R, c.x) + 1) {
        lip = c;
        break;
      }
    }
    if (!lip || lip.u < 0.8) return;
    const v = [lip.nx * VEN, lip.ny * VEN];
    for (const [f, far] of [[-0.05, true], [0.5, false]]) {
      const bx = lip.x + v[0] * lip.w * f, by = rimFront(R, lip.x + v[0] * lip.w * f) + 16;
      const len = far ? 34 : 40;
      const wd = far ? 9 : 11;
      // up over the lip, the tip curling onto the shell
      const spine = [[bx, by], [bx + 4, by - len * 0.55], [bx + 12, by - len * 0.9], [bx + 22, by - len * 0.78]];
      const edgeA = [], edgeB = [];
      for (let i = 0; i < spine.length; i++) {
        const k = 1 - (i / (spine.length - 1)) * 0.65;
        edgeA.push([spine[i][0] - wd * k, spine[i][1] + (i === 0 ? 4 : 0)]);
        edgeB.push([spine[i][0] + wd * k, spine[i][1] + (i === spine.length - 1 ? 3 : 0)]);
      }
      const pad = edgeA.concat(edgeB.reverse());
      K.ink(pad, { closed: true, width: 1.6, color: P.ink, fill: L.mix(P.veinBlack, P.larvaFirst, far ? 0.45 : 0.25), seed: seed + (far ? 1 : 2), wobble: 0.3, taper: [2, 4] });
      K.ink(spine.slice(1), { width: far ? 3 : 3.8, color: P.veinBlack, seed: seed + (far ? 3 : 4), taper: [2, 8], wobble: 0.2, tremble: 0.1 });
    }
  }

  // head frame: centre, forward unit vector (toward the mouth) and ventral unit vector
  function headFrame(pose) {
    const q = trackAt(pose.sHead);
    const hx = q.x + pose.hdx, hy = q.y + pose.hdy;
    const ang = Math.atan2(q.ty, q.tx) + pose.turn;
    const fx = Math.cos(ang), fy = Math.sin(ang);
    return { hx, hy, fx, fy, vx: fy, vy: -fx, ang };
  }

  function drawHead(K, pose, seed) {
    const { ctx, L } = K;
    const P = L.pal;
    const { hx, hy, fx, fy, vx, vy, ang } = headFrame(pose);
    const H = (a, b) => [hx + fx * a + vx * b, hy + fy * a + vy * b];
    // capsule: two rounded lobes split by a clear notch at the vertex (away from the mouth)
    const head = [];
    for (let i = 0; i < 96; i++) {
      const a = (i / 96) * TAU;
      const c = Math.cos(a), s = Math.sin(a);
      const da = a - Math.PI;
      const notch = 1 - 0.16 * Math.exp(-(da * da) / 0.05);
      const along = c * (c > 0 ? 136 : 132) * notch;
      const across = s * 150 * (1 - 0.07 * c) * (1 - 0.015 * Math.cos(2 * a));
      head.push(H(along, across));
    }
    const headPath = polyPath(head);
    // cervical membrane under the head
    const neck = [];
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * TAU;
      neck.push(H(-104 + Math.cos(a) * 44, Math.sin(a) * 96));
    }
    ctx.fillStyle = L.mix(P.larvaFirst, P.white, 0.2);
    ctx.beginPath();
    L.tracePath(ctx, neck, true);
    ctx.fill();

    ctx.fillStyle = P.veinBlack;
    ctx.fill(headPath);
    const bI = L.boil(L.T);
    const shadowAng = Math.atan2(-LIGHT[1], -LIGHT[0]);
    const litAng = Math.atan2(LIGHT[1], LIGHT[0]);
    // reflected light: one tapered arc just inside the shadow-side edge, broken by a few short strokes
    const refl = [];
    for (let i = 0; i <= 20; i++) {
      const a = shadowAng - 1.0 + (i / 20) * 2.0;
      refl.push([hx + Math.cos(a) * 124, hy + Math.sin(a) * 124]);
    }
    K.ink(refl, { width: 3.2, color: P.inkSoft, alpha: 0.8, seed: seed + 12, taper: [40, 40], wobble: 0.8 });
    const rimL = [];
    for (let i = 0; i < 5; i++) {
      const a = shadowAng - 0.8 + (i / 4) * 1.6 + (L.h3(i, bI, seed) - 0.5) * 0.08;
      const r = 106 - 4 * (i % 2);
      const a2 = a + 0.16 + 0.1 * L.h3(i, 2, seed);
      rimL.push([hx + Math.cos(a) * r, hy + Math.sin(a) * r, hx + Math.cos((a + a2) / 2) * (r + 2), hy + Math.sin((a + a2) / 2) * (r + 2), hx + Math.cos(a2) * r, hy + Math.sin(a2) * r]);
    }
    strokeBatch(ctx, rimL, 1.6 * K.w, P.inkSoft, 0.6);
    // contour hatching round each lobe, on the quarter facing away from the light, so each lobe reads as its own dome
    for (const lobe of [-1, 1]) {
      const lc = H(-8, lobe * 70);
      const half = new Path2D();
      const hp = [H(-400, 0), H(400, 0), H(400, lobe * 400), H(-400, lobe * 400)];
      hp.forEach((p, i) => (i ? half.lineTo(p[0], p[1]) : half.moveTo(p[0], p[1])));
      half.closePath();
      const arcs = new Path2D();
      for (let i = 0; i < 14; i++) {
        const r = 22 + i * 8 + (L.h3(i, bI + lobe, seed + 20) - 0.5) * 2.4;
        const a0 = shadowAng - Math.PI / 4 + (L.h3(i, lobe + 7, seed + 21) - 0.5) * 0.3;
        const a1 = shadowAng + Math.PI / 4 + (L.h3(i, lobe + 9, seed + 22) - 0.5) * 0.3;
        arcs.moveTo(lc[0] + Math.cos(a0) * r, lc[1] + Math.sin(a0) * r);
        arcs.arc(lc[0], lc[1], r, a0, a1);
      }
      ctx.save();
      ctx.clip(headPath);
      ctx.clip(half);
      ctx.lineCap = 'round';
      ctx.lineWidth = 1.6 * K.w;
      ctx.strokeStyle = P.inkSoft;
      ctx.globalAlpha = 0.7;
      ctx.stroke(arcs);
      ctx.restore();
    }
    // face lines as an inverted Y: the two arms down to the mouth, the epicranial suture back to the notch
    K.ink([H(122, -62), H(66, -30), H(20, 0)], { width: 2.4, color: P.inkSoft, alpha: 0.9, seed: seed + 3, taper: [6, 4], wobble: 0.3 });
    K.ink([H(122, 62), H(66, 30), H(20, 0)], { width: 2.4, color: P.inkSoft, alpha: 0.9, seed: seed + 4, taper: [6, 4], wobble: 0.3 });
    K.ink([H(20, 0), H(-50, 1), H(-108, 0)], { width: 1.8, color: P.inkSoft, alpha: 0.85, seed: seed + 2, taper: [2, 10], wobble: 0.3 });
    // the vertex groove: a 3 px ink cut from the notch toward the face, its far wall catching light
    const gs = Math.sign(vx * LIGHT[0] + vy * LIGHT[1]) || 1; // +1 when the +across side faces the light
    K.ink([H(-110, -gs * 5), H(-62, -gs * 4.5), H(-20, -gs * 3)], { width: 1.8, color: P.inkSoft, alpha: 0.9, seed: seed + 14, taper: [2, 16], wobble: 0.3 });
    K.ink([H(-112, 0), H(-66, 0.5), H(-20, 0)], { width: 3, color: P.ink, seed: seed + 13, taper: [2, 18], wobble: 0.3 });
    // the mouth side: a pale edge just inside the outline so it shows on a phone, labrum and mandibles over it
    K.ink([H(125, -35), H(131, -12), H(131, 12), H(125, 35)], { width: 8, color: L.mix(P.tan, P.bark, 0.3), seed: seed + 15, taper: [8, 8], wobble: 0.3 });
    const open = pose.jaw;
    K.ink([H(114, -18), H(128, -13), H(130, 0), H(128, 13), H(114, 18)], { closed: true, width: 1.5, color: P.inkSoft, fill: L.mix(P.veinBlack, P.bark, 0.55), seed: seed + 6, wobble: 0.2, taper: [1, 2], smooth: false });
    for (const s of [-1, 1]) {
      const root = H(104, s * 30);
      const tip = H(126 + 4 * open, s * (10 - 8 * open));
      const heel = H(120, s * (40 + 4 * open));
      K.ink([root, tip, heel], { closed: true, width: 1.5, color: P.inkSoft, fill: L.mix(P.veinBlack, P.bark, 0.35), seed: seed + 7 + s, wobble: 0.2, taper: [1, 2], smooth: false });
    }
    // antenna on the near side: a small pale socket and a short cone
    const ab = H(108, 96), ae = H(134, 112);
    K.ink(L.ellipsePts(ab[0], ab[1], 9, 7, 12, ang), { closed: true, width: 1.6, color: P.milkweedPale, alpha: 0.8, seed: seed + 9, wobble: 0.2, taper: [2, 2] });
    ctx.fillStyle = L.mix(P.milkweedPale, P.inkSoft, 0.25);
    ctx.beginPath();
    ctx.moveTo(ab[0] + fy * 6, ab[1] - fx * 6);
    ctx.lineTo(ae[0], ae[1]);
    ctx.lineTo(ab[0] - fy * 6, ab[1] + fx * 6);
    ctx.closePath();
    ctx.fill();
    // stemmata: six small eyes in a C beside the antenna socket, opening toward the mouth
    ctx.fillStyle = P.white;
    ctx.globalAlpha = 0.6;
    for (let i = 0; i < 6; i++) {
      const phi = Math.PI * 0.62 + (i / 5) * Math.PI * 0.95;
      const p = H(80 + Math.cos(phi) * 24, 96 + Math.sin(phi) * 22);
      ctx.beginPath();
      ctx.arc(p[0], p[1], i === 2 || i === 3 ? 5 : 4, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // a few fine head setae, 18 to 30 px past the outline
    const hs = [];
    for (let i = 0; i < 7; i++) {
      const a = -2.3 + (i / 6) * 4.6;
      const p = H(Math.cos(a) * 124, Math.sin(a) * 140);
      const q = H(Math.cos(a) * (136 + 18 + 12 * L.h3(i, 3, seed)), Math.sin(a) * (150 + 18 + 12 * L.h3(i, 4, seed)));
      hs.push([p[0], p[1], q[0], q[1]]);
    }
    strokeBatch(ctx, hs, 1.2 * K.w, P.ink, 0.85);
    // outline, then a white highlight crescent on the upper left of each lobe
    K.ink(head, { closed: true, width: 5, color: P.ink, seed: seed + 10, double: { alpha: 0.4, width: 0.3 } });
    for (const lobe of [-1, 1]) {
      const lc = H(-8, lobe * 70);
      const cres = [];
      for (let i = 0; i <= 10; i++) {
        const a = litAng - 0.5 + (i / 10) * 1.0;
        cres.push([lc[0] + Math.cos(a) * 60, lc[1] + Math.sin(a) * 60]);
      }
      K.ink(cres, { width: 6, color: P.white, alpha: 0.92, seed: seed + 16 + lobe, taper: [12, 12], wobble: 0.3, minWidth: 0.2 });
    }
  }

  // ===========================================================================
  // Timing
  // ===========================================================================
  const BITE1_C = [648, 1172]; // the first bite's centre
  const BITES1 = [{ x: 590, r: 48, depth: 104 }, { x: 648, r: 54, depth: 128 }, { x: 704, r: 48, depth: 110 }];
  // the second bite eats the right half back to y 900; every scallop sits on the side the head eats from
  const BITES2 = [{ x: 598, r: 60, depth: 48 }, { x: 690, r: 54, depth: 36 }, { x: 772, r: 44, depth: 26 }];
  // the left wall stands: from x 250 to 520 the rim stays at y 1194 (the egg clip gives the G1 left outline),
  // and from 520 to 610 a steep torn edge climbs to the y 900 rim
  const TONGUE = { x0: 250, tip0: 250, tip1: 520, x1: 610, y: 1194 };
  const CRACK_HOLE = [540, 1175];
  const RIM_BITE1 = makeRim(CRACK_Y, 16, 4501, BITES1);
  const RIM_BITE2 = makeRim(HALF_Y, 18, 5251, BITES2, TONGUE);
  const HAUL = [0, 0.24, 0.47, 0.68, 0.86, 1]; // haul-out progress per drawing on twos, T 4.5 to 4.917
  const DEG = Math.PI / 180;
  const TURN_REST = -20 * DEG;
  // drawings on twos from T 5.0: bite 1 (recoil with the chunk), chew, bite 2 (reach up), chew
  const BITE_POSES = [
    { hdx: 90, hdy: -20, turn: -36 * DEG, jaw: 1 },
    { hdx: 44, hdy: -10, turn: -30 * DEG, jaw: 0.2 },
    { hdx: 6, hdy: 0, turn: -22 * DEG, jaw: 0.65 },
    { hdx: 5, hdy: -14, turn: 30 * DEG, jaw: 1 },
    { hdx: 2, hdy: -10, turn: 22 * DEG, jaw: 0.2 },
    { hdx: 0, hdy: -12, turn: 27 * DEG, jaw: 0.6 },
    { hdx: 0, hdy: -10, turn: 24 * DEG, jaw: 0.2 },
  ];

  // the shell's front wall above the rim (with any tongue): the larva's hidden tail tucks behind it
  function wallAboveRim(R) {
    const pts = [];
    // with a standing left wall the left side runs on down the egg outline to the tongue's lower edge
    const yL = R.tongue ? R.tongue.y : R.y;
    const xL = AX - hw(yL) - 1;
    for (let x = Math.max(AX - R.rx, xL); x <= AX + R.rx; x += 4) pts.push([x, rimFront(R, x)]);
    for (let y = R.y; y >= BASE_Y; y -= 12) pts.push([AX + hw(y) + 1, y]);
    for (let y = BASE_Y; y < yL; y += 12) pts.push([AX - hw(y) - 1, y]);
    pts.push([xL, yL]);
    return pts;
  }
  function eggAboveRim(R) {
    const right = EGG.filter((p) => p[0] >= AX && p[1] < R.y);
    const left = EGG.filter((p) => p[0] < AX && p[1] < R.y);
    const back = [];
    for (let x = AX + R.rx; x >= AX - R.rx; x -= 6) back.push([x, rimBack(R, x)]);
    return right.concat(back, left);
  }

  function poseAt(tt) {
    if (tt < 0.5 - 1e-6) return null;
    const d = Math.floor((tt - 0.5) * 12 + 1e-6);
    const p = tt >= 1 - 1e-6 ? 1 : HAUL[Math.min(HAUL.length - 1, d)];
    const pose = { sHead: S_CRACK + 130 + (TRACK.len - S_CRACK - 130) * p, hdx: 0, hdy: 0, turn: 0, jaw: 0.3, ate: 0, rim: null, anal: p >= 1 };
    if (tt < 1 - 1e-6) {
      pose.jaw = d % 2 ? 0.6 : 0.1;
      if (p >= 1) pose.turn = TURN_REST;
      return pose;
    }
    const f = Math.min(BITE_POSES.length - 1, Math.round((tt - 1) * 12));
    Object.assign(pose, BITE_POSES[f], { ate: 1 });
    return pose;
  }
  // how much of the curl is still inside the shell (1 = all of it)
  function insideFrac(pose) {
    if (!pose) return 1;
    return 1 - Math.max(0, Math.min(1, (pose.sHead - HEAD_BACK - S_CRACK) / BODY_SPAN));
  }

  // ===========================================================================
  // Scene
  // ===========================================================================
  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib;
      const P = L.pal;
      const t = Math.max(0, Math.min(tIn, info.dur));
      const tt = L.onTwos(t);
      const seed = L.hash(ID) % 100000;

      // camera: locked on the match frame, outExpo pull-back on the beat, slow drift after
      const camAt = (tc) => {
        let z = 1, cx = 540;
        if (tc >= 0.5) {
          const e = L.seg(tc, 0.5, 1.0, 'outExpo');
          z = L.lerp(1, END_ZOOM, e);
          cx = L.lerp(540, END_CX, e);
        }
        if (tc >= 1.0) z = L.lerp(END_ZOOM, DRIFT_ZOOM, L.seg(tc, 1.0, 1.5, 'inOutSine'));
        return { x: cx, y: 960, zoom: z };
      };
      const cam = camAt(t);
      const zoom = cam.zoom;
      const VR = visibleRect(cam);

      // screen-space stripes, so the pull-back reads from the leaf and egg alone
      L.stripes(ctx, { colors: [P.stripeCream, P.stripeSage], width: 140, angle: -0.52, offset: 12 * t, seed: 303 });

      // shell state
      const d = Math.floor(tt * 12 + 1e-6);
      const st = { rim: null, shadow: null, retreat: 0, chew: 0, hairline: false };
      const pose = poseAt(tt);
      if (t < 0.5) {
        const live = t >= 1 / 12 - 1e-6;
        st.shadow = {
          tw: live ? { dx: (L.h3(d, 1, seed) - 0.5) * 16, dy: (L.h3(d, 2, seed) - 0.5) * 12, rot: (L.h3(d, 3, seed) - 0.5) * 0.07 } : { dx: 0, dy: 0, rot: 0 },
          push: 26 * L.seg(tt, 1 / 12, 5 / 12),
        };
        if (tt >= 0.25 - 1e-6) st.chew = tt >= 4 / 12 - 1e-6 ? 1 : 0.45;
        st.hairline = tt >= 5 / 12 - 1e-6;
      } else if (t < 1.0) {
        st.rim = CRACK_RIM;
        st.retreat = insideFrac(pose);
      } else if (t < 1.25) {
        st.rim = RIM_BITE1;
      } else {
        st.rim = RIM_BITE2;
      }

      if (pose) pose.rim = st.rim;
      L.camera(ctx, cam, () => {
        const K = kit(ctx, L, zoom);
        // leg and proleg size follows the pull-back, but on twos with the character
        K.legK = L.smoothstep(0.84, 0.66, camAt(tt).zoom);
        drawScenery(K, VR, seed + 1000);
        drawLeaf(K, VR, seed + 2000);
        drawFringe(K, VR, seed + 3000);
        drawShell(K, st, seed + 4000);
        drawShards(K, FRAGS, tt - 0.5 + 0.05, 0.75, P.egg, seed + 5100);
        // the cap goes behind the larva, so any overlap left sits behind the head
        drawCap(K, tt - 0.5 + 0.05, seed + 5000);
        if (pose) drawLarva(K, pose, seed + 6000);
        drawShards(K, FLECKS1, tt - 1.0, 0.42, L.mix(P.egg, P.white, 0.3), seed + 7000);
        drawShards(K, FLECKS2, tt - 1.25, 0.34, L.mix(P.egg, P.white, 0.3), seed + 7100);

        // overlays: constant screen weights, 24 fps
        const w = 1 / zoom;
        const FR = 1 / 24;
        // the attention ring: on the tip, then pinned to the hole once the cap is gone
        if (t >= 1 / 12 - 1e-6 && t < 0.5 - 1e-6) {
          L.guideCircle(ctx, MICRO[0], MICRO[1], 90, { color: P.annYellow, alpha: 1, width: 3 * w, p: L.seg(t, 1 / 12, 1 / 12 + 0.25, 'outExpo'), start: -Math.PI / 2 });
        }
        // f108 and f109 carry only the burst ticks and the fragments; the ring comes back on the hole from f110
        const RING_BACK = 0.5 + 2 * FR;
        if (t >= RING_BACK - 1e-6 && t < 1.0) {
          L.guideCircle(ctx, CRACK_HOLE[0], CRACK_HOLE[1], 90, { color: P.annYellow, alpha: 1, width: 3 * w, p: L.seg(t, RING_BACK - FR, RING_BACK + 3 * FR, 'outExpo'), start: -Math.PI / 2 });
        }
        // T 5.0: it pulses once, outward from the bite, and is gone within 6 frames
        if (t >= 1.0 && t < 1.0 + 6 * FR) {
          const e = L.seg(t, 1.0, 1.0 + 6 * FR, 'outExpo');
          L.guideCircle(ctx, BITE1_C[0], BITE1_C[1] - 20, 90 + 170 * e, { color: P.annYellow, alpha: 1 - L.seg(t, 1.0 + 1 * FR, 1.0 + 6 * FR), width: 3 * w });
        }
        // T 4.5: eight burst ticks on radial lines from the hole, over its lower 200 degrees
        if (t >= 0.5 && t < 0.5 + 5 * FR) {
          const e = L.seg(t, 0.5, 0.5 + 5 * FR, 'outExpo');
          L.ticks(ctx, CRACK_HOLE[0], CRACK_HOLE[1], { r: 320 + 40 * e, n: 8, len: 27 * w, color: P.annYellow, alpha: 1 - L.seg(t, 0.5 + 1 * FR, 0.5 + 5 * FR), width: 3 * w, start: -10 * DEG, span: 200 * DEG });
        }
        // the head's turn, drawn on over 6 frames from T 5.0
        if (t >= 1.0) {
          L.arcAnnotation(ctx, HEAD_END[0], HEAD_END[1], 250, 0.6, -1.25, { color: P.annBlue, width: 2 * w, p: L.seg(t, 1.0, 1.0 + 6 * FR, 'outExpo'), endTicks: 8 * w, arrow: 0, dot: 0 });
        }
      });
    },
  });
})();
