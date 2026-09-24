// 17 egg-loop : "Back to the egg" (schematic, global T 30.5 to 32.0)
//
// Shot 02's egg-blueprint composition on the same pixels, fully built on frame 0, closing the loop.
// The geometry, leaf, lattice, yolk and shell-section code is ported from 02 and seeded with 02's id
// ('egg-blueprint'), so this plate matches 02's built state. If 02's drawing changes, re-port it here.
//
// Layers, back to front (frame px):
//   1 navy blueprint plate: grid, centre (540, 900)
//   2 guide geometry: circles r 470 / 640 at (540, 900), 6 degrees turned (02's end) then +3 on the last beat,
//     corner diagonals, dashed axis x 540, construction lines, registration crosses
//   3 measurement: height bracket x 880 (y 520 to 1280), width bracket y 1330 (x 255 to 825), tick scale x 60,
//     leaf bracket x 1040; below the safe area the shell-layer section and the r 300 arc on the micropyle
//   4 leaf cross-section y 246 to 520: cuticle, palisade, spongy mesophyll, three vein bundles, lower epidermis, trichomes
//   5 the G1 egg: shade crescent, yolk spheres and stipple parting round the nucleus, rungs, 18 keeled ridges,
//     section ring, micropyle rosette (clipped to the shell), double outline, glue
//   6 the nucleus at (540, 860) with its 44 px halo: glass ping rings on the cut, pulse on T 31.0, division on T 31.5
//   7 network nodes at y 1440: magnified micropyle (left) and shell lattice (right), receding as the wordmark enters
//   8 glyph plates: cycle glyph (900, 300) resets to the egg arc on T 31.0 and a lead draws to the egg; division counter
//   9 wordmark 'monarch' centred on x 540, baseline y 1470, fading in on T 31.0
(function () {
  'use strict';

  const ID = 'egg-loop';
  const REF = 'egg-blueprint'; // shot 02: composition seeds shared so the plate matches
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const FR = 1 / 24;

  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const sstep = (a, b, x) => {
    const u = clamp((x - a) / (b - a));
    return u * u * (3 - 2 * u);
  };

  // ---------------------------------------------------------------------------
  // G1 egg profile (docs/storyboard.md, Shared geometry G1)
  // ---------------------------------------------------------------------------

  // Body half-width is FILM.GEO G1. The last 20 px stays a local elliptical cap
  // (half-width 60 at y 1260, vertical at 1280). The shared spline ends in a point.
  const CAP_B = 70;
  const CAP_YC = 1280 - CAP_B;
  const CAP_A = Math.sqrt((60 * 1.25 * CAP_B * CAP_B) / (CAP_B - 20));

  function hw(y) {
    if (y <= 520) return 180;
    if (y >= 1280) return 0;
    if (y > 1260) {
      const u = (y - CAP_YC) / CAP_B;
      return CAP_A * Math.sqrt(Math.max(0, 1 - u * u));
    }
    return FILM.lib.geo('G1').hw(y);
  }

  // one side of the silhouette, base to tip (sign -1 left, +1 right)
  function sidePts(sign, step) {
    const out = [];
    for (let y = 520; y < 1260 - 1e-6; y += step) out.push([540 + sign * hw(y), y]);
    const f0 = Math.asin(50 / 70);
    const n = 20;
    for (let i = 0; i <= n; i++) {
      const f = f0 + ((Math.PI / 2 - f0) * i) / n;
      out.push([540 + sign * CAP_A * Math.cos(f), CAP_YC + CAP_B * Math.sin(f)]);
    }
    return out;
  }

  function insetPts(pts, sign, d) {
    const out = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1];
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl;
      ty /= tl;
      const nx = sign < 0 ? ty : -ty, ny = sign < 0 ? -tx : tx;
      out.push([pts[i][0] + nx * d, pts[i][1] + ny * d]);
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

  // the egg surface seen slightly from below: rings bow upward in the middle
  const TILT = 0.055;
  function surf(theta, y) {
    const h = hw(y);
    const c = TILT * sstep(520, 700, y);
    return [540 + h * Math.sin(theta), y - c * h * Math.cos(theta)];
  }

  // ---------------------------------------------------------------------------
  // Shade crescent: light from the upper left, the terminator runs (560, 560) to (470, 1250)
  // ---------------------------------------------------------------------------

  const TERM = (() => {
    const samp = [];
    for (let i = 0; i <= 400; i++) {
      const u = i / 400, v = 1 - u;
      samp.push([v * v * 560 + 2 * v * u * 700 + u * u * 470, v * v * 560 + 2 * v * u * 880 + u * u * 1250]);
    }
    const xs = new Float64Array(781);
    let j = 0;
    for (let y = 500; y <= 1280; y++) {
      if (y <= 560) {
        xs[y - 500] = 560 - (560 - y) * 0.4375;
        continue;
      }
      if (y >= 1250) {
        xs[y - 500] = 470;
        continue;
      }
      while (j < samp.length - 2 && samp[j + 1][1] < y) j++;
      const a = samp[j], b = samp[j + 1];
      xs[y - 500] = lerp(a[0], b[0], clamp((y - a[1]) / (b[1] - a[1] || 1)));
    }
    return xs;
  })();
  const termX = (y) => TERM[Math.max(0, Math.min(780, Math.round(y) - 500))];
  // 0 on the terminator, 1 on the right silhouette
  function shadeU(x, y) {
    const tx = termX(y), ex = 540 + hw(y);
    return clamp((x - tx) / Math.max(1, ex - tx));
  }

  const MICRO = [540, 1262];

  // ---------------------------------------------------------------------------
  // Geometry, built once (a pure function of constants)
  // ---------------------------------------------------------------------------

  let GEO = null;
  function geo(L) {
    if (GEO) return GEO;
    const g = {};
    const S0 = L.hash(REF) & 0xffff;
    g.outL = sidePts(-1, 3);
    g.outR = sidePts(1, 3);
    g.cumOut = cumLen(g.outL);
    const cutTop = (pts) => {
      const o = pts.filter((p) => p[1] >= 529);
      o.unshift([o[0][0], 529]);
      return o;
    };
    g.inL = cutTop(insetPts(g.outL, -1, 9));
    g.inR = cutTop(insetPts(g.outR, 1, 9));
    g.cumIn = cumLen(g.inL);
    g.poly = sidePts(-1, 10).concat(sidePts(1, 10).reverse());
    g.innerPoly = insetPts(sidePts(-1, 10), -1, 9).filter((p) => p[1] >= 529)
      .concat(insetPts(sidePts(1, 10), 1, 9).filter((p) => p[1] >= 529).reverse());

    // 18 keeled ridges: per-point crest alpha from the light and the shade crescent
    g.ridges = [];
    for (let k = 0; k < 18; k++) {
      const th = (-85 + 10 * k) * DEG;
      const pts = [], crestA = [];
      for (let y = 520; y <= 1256; y += 6) {
        const p = surf(th, y);
        if (Math.hypot(p[0] - MICRO[0], p[1] - MICRO[1]) < 30) break;
        pts.push(p);
        const lit = clamp(0.5 - 0.5 * Math.sin(th) - 0.45 * ((y - 520) / 760 - 0.45));
        const sh = sstep(0, 0.45, shadeU(p[0], p[1]));
        const edge = Math.abs(th) > 70 * DEG ? 0.72 : 1;
        crestA.push(Math.round((0.4 + 0.3 * lit) * (1 - 0.35 * sh) * edge * 50) / 50);
      }
      const hiA = th <= 0 ? 0.35 : th < 40 * DEG ? 0.35 * (1 - th / (40 * DEG)) : 0;
      g.ridges.push({ th, pts, crestA, hiA: Math.round(hiA * 50) / 50, hiN: Math.round(pts.length * 0.4) });
    }

    // 34 rows of cross-ribs as short rungs between neighbouring ridges, sagging toward the tip
    g.ribY = [];
    for (let j = 0; j < 34; j++) g.ribY.push(520 + 716 * (1 - Math.pow(1 - (j + 1) / 35, 1.3)));
    const rungY = (j, k) => g.ribY[j] + (L.h3(j, k, S0 + 7) - 0.5) * 3;
    const rungAt = (r, u) => {
      const v = 1 - u;
      return [v * v * r.p0[0] + 2 * v * u * r.c[0] + u * u * r.p2[0], v * v * r.p0[1] + 2 * v * u * r.c[1] + u * u * r.p2[1]];
    };
    g.rungs = [];
    g.lit = [];
    g.nodes = [];
    for (let j = 0; j < 34; j++) {
      for (let k = 0; k < 17; k++) {
        const ta = (-85 + 10 * k) * DEG, tb = ta + 10 * DEG, tm = ta + 5 * DEG;
        const yy = rungY(j, k);
        const pm = surf(tm, yy);
        if (Math.hypot(pm[0] - MICRO[0], pm[1] - MICRO[1]) < 32) continue;
        if (L.h3(j, k, S0 + 71) < 0.035) continue; // a few broken rungs
        let p0 = surf(ta, yy), p2 = surf(tb, yy);
        const dx = p2[0] - p0[0], dy = p2[1] - p0[1], dl = Math.hypot(dx, dy);
        if (dl < 5) continue;
        const gap = Math.min(2, dl * 0.2);
        p0 = [p0[0] + (dx / dl) * gap, p0[1] + (dy / dl) * gap];
        p2 = [p2[0] - (dx / dl) * gap, p2[1] - (dy / dl) * gap];
        const c = [2 * pm[0] - (p0[0] + p2[0]) / 2, 2 * pm[1] - (p0[1] + p2[1]) / 2 + 3];
        const edge = sstep(55 * DEG, 70 * DEG, Math.abs(tm));
        const sh = sstep(0, 0.45, shadeU(pm[0], pm[1]));
        const a = lerp(0.24, 0.09, edge) * (1 - 0.35 * sh);
        const rung = { y: yy, p0, c, p2, a: Math.round(a * 100) / 100, j, k };
        g.rungs.push(rung);
        // light catching the rungs: an inner-edge highlight on the top and left wall of lit cells
        if (j < 33 && tm < -8 * DEG) {
          const q = sstep(0.05, 0.8, -Math.sin(tm)) * (1 - sstep(660, 900, yy));
          if (q > 0 && L.h3(k, j, S0 + 13) < 0.8 * q) {
            const y1 = rungY(j + 1, k);
            const bl = surf(ta, y1 - 3), tl = surf(ta, yy + 2.2);
            const pts = [[bl[0] + 2.6, bl[1]], [tl[0] + 2.6, tl[1]]];
            for (const u of [0.3, 0.6, 0.86]) {
              const p = rungAt(rung, u);
              pts.push([p[0], p[1] + 2.2]);
            }
            g.lit.push(pts);
          }
        }
      }
      for (let k = 0; k < 18; k++) {
        const th = (-85 + 10 * k) * DEG;
        if (Math.abs(th) > 65 * DEG) continue;
        const n = surf(th, g.ribY[j]);
        if (Math.hypot(n[0] - MICRO[0], n[1] - MICRO[1]) > 34) g.nodes.push(n);
      }
    }
    g.rim = insetPts(g.outL, -1, 17).filter((p) => p[1] > 590 && p[1] < 1110);

    // yolk: 50 yolk spheres, dots concentrated inside them through a noise mask
    const inEgg = (x, y, pad) => y - pad > 536 && y + pad < 1240 && Math.abs(x - 540) + pad < hw(y) - 12 && Math.abs(x - 540) + pad * 0.7 < hw(y + pad * 0.7) - 12;
    const rsph = L.rng(L.hash(REF, 'yolk-sph'));
    g.spheres = [];
    let guard = 0;
    while (g.spheres.length < 50 && guard++ < 8000) {
      const r = rsph.range(10, 24);
      const x = rsph.range(262, 818), y = rsph.range(540, 1240);
      if (!inEgg(x, y, r)) continue;
      if (Math.hypot(x - 540, y - 860) < 64 + r) continue;
      if (g.spheres.some((s) => Math.hypot(s.x - x, s.y - y) < s.r + r + 3)) continue;
      g.spheres.push({ x, y, r, seed: S0 + 500 + g.spheres.length });
    }
    const inSphere = (x, y) => {
      for (const s of g.spheres) if ((x - s.x) * (x - s.x) + (y - s.y) * (y - s.y) < s.r * s.r) return true;
      return false;
    };
    const r = L.rng(L.hash(REF, 'yolk'));
    const mseed = L.hash(REF, 'yolk-mask') & 0xffff;
    const dots = [];
    guard = 0;
    while (dots.length < 1150 && guard++ < 60000) {
      const x = r.range(262, 818), y = r.range(534, 1262);
      if (!L.polyContains(g.innerPoly, x, y)) continue;
      if (!L.polyContains(g.innerPoly, x - 10, y) || !L.polyContains(g.innerPoly, x + 10, y) || !L.polyContains(g.innerPoly, x, y + 10)) continue;
      const inS = inSphere(x, y);
      const m = L.noise2(x * 0.011, y * 0.011, mseed);
      const pAcc = inS ? 0.9 : 0.04 + 0.26 * sstep(0.05, 0.6, m);
      if (r() > pAcc) continue;
      dots.push({
        x, y,
        r: inS ? r.range(1.0, 1.9) : r.range(1.0, 2.2),
        a: r.range(0.12, 0.3),
        delay: clamp((y - 520) / 760) * 0.78 + r() * 0.22,
        ang: Math.atan2(y - 880, x - 540),
        stay: r() < 0.14,
      });
    }
    g.dots = dots;
    GEO = g;
    return g;
  }

  // ---------------------------------------------------------------------------
  // Line helpers
  // ---------------------------------------------------------------------------

  // polyline with a small boiling wobble along its normal
  function wobPts(L, pts, seed, amp, bi) {
    const n = pts.length;
    const out = new Array(n);
    let s = 0;
    const sd = (seed + bi * 7919) | 0;
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      if (i > 0) s += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
      const a = pts[i > 0 ? i - 1 : 0], b = pts[i < n - 1 ? i + 1 : n - 1];
      const tx = b[0] - a[0], ty = b[1] - a[1];
      const tl = Math.hypot(tx, ty) || 1;
      const d = amp * L.noise1(s * 0.018, sd);
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

  // paths grouped by alpha, so one stroke call per tone
  function bucket(map, a) {
    let p = map.get(a);
    if (!p) {
      p = new Path2D();
      map.set(a, p);
    }
    return p;
  }
  function strokeBuckets(ctx, map, color, width, mul = 1, cap) {
    for (const [a, p] of map) {
      const aa = cap != null ? Math.min(cap, a * mul) : a * mul;
      if (aa > 0.004) stroke(ctx, p, color, aa, width);
    }
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

  function seg(t, a, frames, e) {
    const u = clamp((t - a) / (frames * FR));
    if (u <= 1e-5) return 0; // eases such as outBack return about 1e-16 at 0, which would draw a speck
    return e ? e(u) : u;
  }

  // ---------------------------------------------------------------------------
  // Micropyle rosette: a pinpoint, an inner hexagon, 6 bowed radial walls, a scalloped outer wall
  // ---------------------------------------------------------------------------

  function drawRosette(ctx, L, P, R, alpha, lw, bi, seed) {
    const rh = (R * 8) / 26;
    const hex = [], outer = [], wallC = [], scC = [];
    for (let i = 0; i < 6; i++) {
      const a = (i * 60 - 90) * DEG;
      hex.push([Math.cos(a) * rh, Math.sin(a) * rh]);
      const ao = a + 13 * DEG;
      const o = [Math.cos(ao) * R, Math.sin(ao) * R];
      outer.push(o);
      const mx = (hex[i][0] + o[0]) / 2, my = (hex[i][1] + o[1]) / 2;
      const ex = o[0] - hex[i][0], ey = o[1] - hex[i][1], el = Math.hypot(ex, ey) || 1;
      const jb = (L.h3(i, bi, seed) - 0.5) * 0.08 * R;
      wallC.push([mx - (ey / el) * (0.13 * R + jb), my + (ex / el) * (0.13 * R + jb)]);
    }
    for (let i = 0; i < 6; i++) {
      const am = (i * 60 - 90 + 43) * DEG;
      const jb = (L.h3(i + 9, bi, seed) - 0.5) * 0.06;
      scC.push([Math.cos(am) * R * (1.3 + jb), Math.sin(am) * R * (1.3 + jb)]);
    }
    const walls = new Path2D();
    const fills = new Path2D();
    for (let i = 0; i < 6; i++) {
      const j = (i + 1) % 6;
      walls.moveTo(hex[i][0], hex[i][1]);
      walls.quadraticCurveTo(wallC[i][0], wallC[i][1], outer[i][0], outer[i][1]);
      walls.quadraticCurveTo(scC[i][0], scC[i][1], outer[j][0], outer[j][1]);
      if (i % 2 === 0) {
        fills.moveTo(hex[i][0], hex[i][1]);
        fills.quadraticCurveTo(wallC[i][0], wallC[i][1], outer[i][0], outer[i][1]);
        fills.quadraticCurveTo(scC[i][0], scC[i][1], outer[j][0], outer[j][1]);
        fills.quadraticCurveTo(wallC[j][0], wallC[j][1], hex[j][0], hex[j][1]);
        fills.closePath();
      }
    }
    const hp = new Path2D();
    addPoly(hp, hex, true);
    ctx.save();
    ctx.fillStyle = P.lavender;
    ctx.globalAlpha *= 0.12;
    ctx.fill(fills);
    ctx.restore();
    ctx.save();
    ctx.fillStyle = P.navyDeep;
    ctx.globalAlpha *= 0.55 * Math.min(1, alpha);
    ctx.fill(hp);
    ctx.restore();
    stroke(ctx, walls, P.lineWhite, alpha, lw);
    stroke(ctx, hp, P.lineWhite, alpha, lw);
    ctx.save();
    ctx.fillStyle = P.lineWhite;
    ctx.globalAlpha *= Math.min(1, alpha);
    ctx.beginPath();
    ctx.arc(0, 0, (2.6 * R) / 26, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Leaf cross-section, y 246 to 520
  // ---------------------------------------------------------------------------

  const BUNDLES = [[240, 400, 32], [560, 380, 36], [772, 424, 34]];

  function drawLeaf(ctx, L, P, bi, SEED, xr) {
    const lav = P.lavender;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 236, xr, 340);
    ctx.clip();
    const inBundle = (x, y, pad) => BUNDLES.some((b) => Math.hypot(x - b[0], y - b[1]) < b[2] + pad);

    // cuticle: a 4 px band of fine ticks over the upper epidermis
    const cut = new Path2D();
    for (let x = 1, i = 0; x < 1082; x += 3, i++) {
      const l = 2.6 + 1.4 * L.h3(i, 11, SEED);
      const lean = (L.h3(i, bi, SEED + 12) - 0.5) * 0.9;
      cut.moveTo(x, 249.5);
      cut.lineTo(x + lean, 249.5 - l);
    }
    stroke(ctx, cut, lav, 0.3, 0.8);
    const ue = new Path2D();
    wob(L, ue, [[-10, 250], [270, 250], [540, 250], [810, 250], [1090, 250]], SEED + 13, 0.5, bi, false);
    stroke(ctx, ue, lav, 0.6, 1.5);
    const ue2 = new Path2D();
    wob(L, ue2, [[-10, 258], [540, 258], [1090, 258]], SEED + 14, 0.4, bi, false);
    stroke(ctx, ue2, lav, 0.32, 1);
    // upper epidermal cell walls
    const uw = new Path2D();
    const re = L.rng(L.hash(REF, 'upper-epi'));
    for (let x = re.range(0, 20); x < 1090; x += re.range(18, 30)) {
      uw.moveTo(x, 251);
      uw.lineTo(x + re.range(-1, 1), 257);
    }
    stroke(ctx, uw, lav, 0.32, 1);

    // palisade: tall rounded cells 16 to 20 px wide, chloroplasts along their walls
    const rp = L.rng(L.hash(REF, 'palisade'));
    const pal = new Path2D();
    const chl = new Path2D();
    const vac = new Path2D();
    let x = rp.range(-6, 6);
    let ci = 0;
    while (x < 1090) {
      const w = rp.range(16, 20);
      const top = 261 + rp.range(0, 3.5), bot = 329 - rp.range(0, 5);
      const cx = x + w / 2 + (L.h3(ci, bi, SEED + 15) - 0.5) * 0.6;
      const rr = w / 2 - 1.3;
      pal.moveTo(cx - rr, top + rr);
      pal.arc(cx, top + rr, rr, Math.PI, 0);
      pal.lineTo(cx + rr, bot - rr);
      pal.arc(cx, bot - rr, rr, 0, Math.PI);
      pal.closePath();
      for (const side of [-1, 1]) {
        for (let yy = top + rr * 0.6 + rp.range(0, 3); yy < bot - rr * 0.6; yy += rp.range(5.5, 8)) {
          const px = cx + side * (rr - 2.4);
          chl.moveTo(px + 1.1, yy);
          chl.ellipse(px, yy, 1.1, 2.1, 0, 0, TAU);
        }
      }
      if (rp() < 0.5) {
        const ny = rp.range(top + 18, bot - 18);
        vac.moveTo(cx + 2.4, ny);
        vac.arc(cx, ny, 2.4, 0, TAU);
      }
      x += w;
      ci++;
    }
    stroke(ctx, pal, lav, 0.3, 1);
    ctx.save();
    ctx.fillStyle = P.schemGreen;
    ctx.globalAlpha = 0.42;
    ctx.fill(chl);
    ctx.fillStyle = lav;
    ctx.globalAlpha = 0.22;
    ctx.fill(vac);
    ctx.restore();

    // spongy mesophyll: lobed cells joined by short arms into a loose network, with air spaces between
    const spg = [new Path2D(), new Path2D()];
    const chs = new Path2D();
    const grid = [];
    for (let row = 0; row < 7; row++) {
      grid.push([]);
      const cy0 = 345 + row * 20.5;
      for (let col = 0; col < 51; col++) {
        const h1 = L.h3(row, col, SEED + 4), h2 = L.h3(col, row, SEED + 5), h3v = L.h3(row + 9, col, SEED + 6);
        const cx = col * 22 + (row & 1 ? 11 : 0) + (h2 - 0.5) * 8;
        const cy = cy0 + (h3v - 0.5) * 6;
        const keep = h1 >= 0.26 && !inBundle(cx, cy, 12);
        const jb = (L.h3(row * 97 + col, bi, 3) - 0.5) * 0.7;
        const c = { keep, x: cx + jb, y: cy, rx: 7.8 + h2 * 3, ry: 6.4 + h3v * 2.6, h1, h2, h3v, grp: h2 < 0.5 ? 0 : 1 };
        grid[row].push(c);
        if (!keep) continue;
        const pts = [];
        for (let q = 0; q < 9; q++) {
          const a = (q / 9) * TAU + h1 * 2;
          const m = 0.82 + 0.3 * L.h3(row * 131 + col, q, SEED + 8);
          pts.push([c.x + Math.cos(a) * c.rx * m, c.y + Math.sin(a) * c.ry * m]);
        }
        blob(spg[c.grp], pts);
        if (h1 > 0.55) {
          const a0 = h3v * TAU;
          const nq = 3 + ((h2 * 3) | 0);
          for (let q = 0; q < nq; q++) {
            const a = a0 + q * 0.62;
            const ex = c.x + Math.cos(a) * (c.rx - 2.2), ey = c.y + Math.sin(a) * (c.ry - 2.2);
            chs.moveTo(ex + 1.2, ey);
            chs.ellipse(ex, ey, 1.9, 1.1, a + Math.PI / 2, 0, TAU);
          }
        }
      }
    }
    const rOf = (c, a) => (c.rx * c.ry) / Math.hypot(c.ry * Math.cos(a), c.rx * Math.sin(a));
    const arm = (A, B, hsh) => {
      if (!A || !B || !A.keep || !B.keep || hsh > 0.58) return;
      const dx = B.x - A.x, dy = B.y - A.y, dl = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx);
      const s0 = rOf(A, a) * 0.86, s1 = dl - rOf(B, a + Math.PI) * 0.86;
      if (s1 - s0 < 2) return;
      const ux = dx / dl, uy = dy / dl, w = 3 + hsh * 1.4;
      const p = spg[A.grp];
      for (const sg of [-1, 1]) {
        p.moveTo(A.x + ux * s0 - uy * w * sg, A.y + uy * s0 + ux * w * sg);
        p.lineTo(A.x + ux * s1 - uy * w * sg * 0.8, A.y + uy * s1 + ux * w * sg * 0.8);
      }
    };
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 51; col++) {
        const c = grid[row][col];
        arm(c, grid[row][col + 1], L.h3(row, col, SEED + 16));
        if (row < 6) {
          const dcol = row & 1 ? 1 : 0;
          arm(c, grid[row + 1][col - 1 + dcol], L.h3(row, col, SEED + 17));
          arm(c, grid[row + 1][col + dcol], L.h3(row, col, SEED + 18));
        }
      }
    }
    stroke(ctx, spg[0], lav, 0.28, 1);
    stroke(ctx, spg[1], lav, 0.21, 1);
    ctx.save();
    ctx.fillStyle = P.schemGreen;
    ctx.globalAlpha = 0.34;
    ctx.fill(chs);
    ctx.restore();

    // vein bundles in section: sheath cells, xylem above, phloem stipple below
    BUNDLES.forEach(([bx, by, br], bi2) => {
      const sd = SEED + 20 + bi2 * 10;
      ctx.save();
      ctx.beginPath();
      ctx.arc(bx, by, br + 3, 0, TAU);
      ctx.fillStyle = P.navy;
      ctx.fill();
      ctx.restore();
      const sheath = new Path2D();
      const ns = Math.round((TAU * (br - 4)) / 12);
      for (let i = 0; i < ns; i++) {
        const a = (i / ns) * TAU + bi2;
        const sx = bx + Math.cos(a) * (br - 4), sy = by + Math.sin(a) * (br - 4);
        sheath.moveTo(sx + Math.cos(a) * 4.6, sy + Math.sin(a) * 4.6);
        sheath.ellipse(sx, sy, 4.6, 6.2, a, 0, TAU);
      }
      stroke(ctx, sheath, lav, 0.34, 1);
      const vb = new Path2D();
      wob(L, vb, L.ellipsePts(bx, by, br, br - 1.5, 44), sd, 0.5, bi, true);
      stroke(ctx, vb, lav, 0.55, 1.3);
      const xv = new Path2D();
      const vessels = [
        [bx, by - 0.34 * br, 4.8],
        [bx - 0.22 * br, by - 0.18 * br, 3.8],
        [bx + 0.22 * br, by - 0.18 * br, 3.8],
        [bx - 0.4 * br, by - 0.02 * br, 2.8],
        [bx + 0.4 * br, by - 0.02 * br, 2.8],
      ];
      for (const [vx, vy, vr] of vessels) {
        xv.moveTo(vx + vr, vy);
        xv.arc(vx, vy, vr, 0, TAU);
      }
      stroke(ctx, xv, P.lineWhite, 0.5, 1.1);
      const phloem = (c) => {
        c.arc(bx, by, 0.8 * br, 0, Math.PI, true);
        c.closePath();
      };
      L.hexLattice(ctx, phloem, { bounds: [bx - br, by + 2, br * 2, 0.8 * br], r: 3.2, alpha: 0.3, seed: sd + 1 });
      L.stipple(ctx, phloem, { bounds: [bx - br, by + 2, br * 2, 0.8 * br], spacing: 3.4, r: [1.0, 1.2], color: lav, alpha: 0.45, seed: sd + 2 });
    });

    // lower epidermis band y 480 to 520
    const band = new Path2D();
    wob(L, band, [[-10, 480], [540, 480], [1090, 480]], SEED + 5, 0.7, bi, false);
    stroke(ctx, band, lav, 0.6, 1.5);
    const band2 = new Path2D();
    wob(L, band2, [[-10, 520], [540, 520], [1090, 520]], SEED + 6, 0.5, bi, false);
    stroke(ctx, band2, lav, 0.8, 2);
    // epidermal cells 24 px wide
    const rc = L.rng(L.hash(REF, 'cells'));
    const cells = new Path2D();
    const nuc = new Path2D();
    let ex = rc.range(0, 24);
    while (ex < 1090) {
      const tilt = rc.range(-2.5, 2.5);
      const jb = (L.h3(ex | 0, bi, 77) - 0.5) * 0.8;
      cells.moveTo(ex + tilt + jb, 483);
      cells.lineTo(ex - tilt + jb, 517);
      const w = rc.range(20, 28);
      if (rc() < 0.55) {
        const nx = ex + w * rc.range(0.35, 0.65), ny = rc.range(492, 508), nr = rc.range(2, 3.2);
        nuc.moveTo(nx + nr, ny);
        nuc.arc(nx, ny, nr, 0, TAU);
      }
      ex += w;
    }
    stroke(ctx, cells, lav, 0.38, 1);
    ctx.save();
    ctx.fillStyle = lav;
    ctx.globalAlpha = 0.35;
    ctx.fill(nuc);
    ctx.restore();
    // stomata: paired guard cells in the lower epidermis
    for (const sx of [150, 930]) {
      const st = new Path2D();
      st.ellipse(sx - 7, 500, 6, 13, 0, 0, TAU);
      st.moveTo(sx + 13, 500);
      st.ellipse(sx + 7, 500, 6, 13, 0, 0, TAU);
      ctx.fillStyle = P.navy;
      ctx.fill(st);
      stroke(ctx, st, lav, 0.6, 1.2);
    }
    // trichomes hanging below every 18 px, none where the egg is glued
    const hairs = new Path2D();
    for (let k = 0; k < 61; k++) {
      const hx = 9 + 18 * k;
      if (hx > 342 && hx < 738) continue;
      const len = 8 + 6 * L.h3(k, 3, SEED);
      const lean = (L.h3(k, 5, SEED) - 0.5) * 6 + (L.h3(k, bi, SEED + 9) - 0.5) * 0.8;
      hairs.moveTo(hx, 522);
      hairs.quadraticCurveTo(hx + lean * 0.3, 522 + len * 0.6, hx + lean, 522 + len);
    }
    stroke(ctx, hairs, lav, 0.55, 1.2);
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Shell-layer section below the safe area (decorative): chorion with keels, wax layer, vitelline membrane
  // ---------------------------------------------------------------------------

  function drawShellSection(ctx, L, P, bi, SEED, k) {
    if (k <= 0) return;
    const lav = P.lavender;
    const cx = 540, cy = 2600;
    const fmax = 0.5 * k;
    const arcPts = (R, bump) => {
      const out = [];
      for (let f = -fmax; f <= fmax + 1e-9; f += 0.0025) {
        let rr = R;
        if (bump) {
          const ph = (f / 0.036) + 0.5;
          const fr = ph - Math.floor(ph);
          rr += 8 * Math.pow(Math.max(0, 1 - Math.abs(fr - 0.5) * 3.2), 1.6);
        }
        out.push([cx + Math.sin(f) * rr, cy - Math.cos(f) * rr]);
      }
      return out;
    };
    const ch = new Path2D();
    wob(L, ch, arcPts(940, true), SEED + 600, 0.4, bi, false);
    stroke(ctx, ch, lav, 0.25, 1.5);
    const ci = new Path2D();
    wob(L, ci, arcPts(924, false), SEED + 601, 0.4, bi, false);
    stroke(ctx, ci, lav, 0.2, 1);
    const wx = new Path2D();
    wob(L, wx, arcPts(912, false), SEED + 602, 0.3, bi, false);
    stroke(ctx, wx, lav, 0.18, 1, [5, 4]);
    const vm = new Path2D();
    wob(L, vm, arcPts(899, false), SEED + 603, 0.3, bi, false);
    stroke(ctx, vm, lav, 0.15, 1);
    // radial pores through the chorion
    const pores = new Path2D();
    let i = 0;
    for (let f = -fmax; f <= fmax; f += 0.0062, i++) {
      const j = (L.h3(i, 1, SEED + 604) - 0.5) * 0.002;
      pores.moveTo(cx + Math.sin(f + j) * 926, cy - Math.cos(f + j) * 926);
      pores.lineTo(cx + Math.sin(f + j) * 938, cy - Math.cos(f + j) * 938);
    }
    stroke(ctx, pores, lav, 0.14, 1);
    // yolk below the membrane
    L.stipple(ctx, (c) => {
      c.arc(cx, cy, 896, -Math.PI / 2 - fmax, -Math.PI / 2 + fmax);
      c.arc(cx, cy, 858, -Math.PI / 2 + fmax, -Math.PI / 2 - fmax, true);
      c.closePath();
    }, { bounds: [60, 1640, 960, 240], spacing: 7, r: [1.0, 1.6], color: lav, alpha: 0.16, density: 0.5, seed: SEED + 605 });
    if (k >= 1) {
      // bracket across the three layers and a tick scale along the chorion
      const f = 0.4;
      const p0 = [cx + Math.sin(f) * 899, cy - Math.cos(f) * 899], p1 = [cx + Math.sin(f) * 948, cy - Math.cos(f) * 948];
      L.bracket(ctx, p0[0], p0[1], p1[0], p1[1], { alpha: 0.24, cap: 10, width: 1.2, offset: -26 });
      L.ticks(ctx, cx, cy, { r: 956, n: 41, len: 6, major: 5, majorLen: 13, start: -Math.PI / 2 - 0.3, span: 0.6, color: lav, alpha: 0.2, width: 1 });
    }
  }

  // ---------------------------------------------------------------------------
  // Scene
  // ---------------------------------------------------------------------------

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib, P = L.pal, E = L.ease;
      const dur = info.dur;
      // snap near-frame times onto the frame grid (plus a hair) so beat comparisons never miss by one ulp
      let t = clamp(tIn, 0, dur);
      const tFrame = Math.round(t * 24) / 24;
      if (Math.abs(t - tFrame) < 1e-4) t = tFrame + 1e-7;
      const tw = L.onTwos(t);
      const bi = L.boil(L.T);
      const g = geo(L);
      const SEED = L.hash(REF) & 0xffff; // 02's composition seeds: plate, leaf, lattice and yolk land on 02's pixels
      const OWN = L.hash(ID) & 0xffff; // this shot's own events

      const lav = P.lavender, white = P.lineWhite, mag = P.magenta, glowC = P.glow;

      // beats (shot-local seconds)
      const B_PULSE = 0.5; // T 31.0
      const B_DIV = 1.0; // T 31.5

      // drawing index on twos since a (0 on the beat frame and the frame after)
      const drawing = (a) => Math.floor((t - a) * 12 + 1e-6);
      // progress already visible on the beat frame itself
      const hit = (a, frames, e, lead = 1) => {
        if (t < a) return 0;
        const u = clamp((t - a) / (frames * FR) + lead / frames);
        return e ? e(u) : u;
      };
      const popTwos = (a) => (t < a ? 0 : [0.72, 1.08, 1][Math.min(2, drawing(a))]);

      // ---- 1 base -----------------------------------------------------------------
      ctx.fillStyle = P.navyDeep;
      ctx.fillRect(0, 0, 1080, 1920);
      L.blueprint(ctx, { center: [540, 900], circles: 0, diagonals: 0, seed: 205 });

      // ---- 2 guide geometry: 02's end state (6 degrees turned), then 3 more on the last beat --------------
      {
        const rot = (6 + 3 * E.inOutSine(clamp((t - B_DIV) / 0.5))) * DEG;
        ctx.save();
        ctx.translate(540, 900);
        ctx.rotate(rot);
        L.guideCircle(ctx, 0, 0, 470, { alpha: 0.14, width: 1.5 });
        L.ticks(ctx, 0, 0, { r: 470, n: 120, len: 6, major: 10, majorLen: 15, inward: true, color: lav, alpha: 0.22, width: 1 });
        L.guideCircle(ctx, 0, 0, 640, { alpha: 0.08, width: 1.5 });
        L.guideCircle(ctx, 0, 0, 652, { alpha: 0.1, width: 1, dash: [2, 9] });
        for (let k = 0; k < 4; k++) {
          const a = k * 90 * DEG + 18 * DEG;
          L.arcAnnotation(ctx, 0, 0, 486, a, a + 34 * DEG, { color: lav, alpha: 0.2, width: 1.2, endTicks: 10 });
        }
        ctx.restore();
        const diag = new Path2D();
        diag.moveTo(0, 0);
        diag.lineTo(1080, 1920);
        diag.moveTo(1080, 0);
        diag.lineTo(0, 1920);
        stroke(ctx, diag, lav, 0.12, 1);
        const cons = new Path2D();
        cons.moveTo(540, 530);
        cons.lineTo(540, 1600);
        stroke(ctx, cons, lav, 0.16, 1, [10, 8]);
        const cons2 = new Path2D();
        cons2.moveTo(196, 790);
        cons2.lineTo(250, 790);
        cons2.moveTo(830, 790);
        cons2.lineTo(904, 790);
        cons2.moveTo(470, 860);
        cons2.lineTo(610, 860);
        stroke(ctx, cons2, lav, 0.12, 1, [3, 6]);
        const reg = new Path2D();
        for (const [x, y] of [[540, 1370], [70, 900], [1010, 900]]) {
          reg.moveTo(x - 9, y);
          reg.lineTo(x + 9, y);
          reg.moveTo(x, y - 9);
          reg.lineTo(x, y + 9);
        }
        stroke(ctx, reg, lav, 0.4, 1.2);
        const sec = new Path2D();
        for (const sgn of [1, -1]) {
          const x0 = sgn > 0 ? 10 : 1070;
          sec.moveTo(x0, 492);
          sec.lineTo(x0 + sgn * 16, 500);
          sec.lineTo(x0, 508);
          sec.closePath();
        }
        ctx.save();
        ctx.fillStyle = lav;
        ctx.globalAlpha = 0.55;
        ctx.fill(sec);
        ctx.restore();
      }

      // ---- 3 measurement ------------------------------------------------------------------
      L.bracket(ctx, 880, 520, 880, 1280, { alpha: 0.6, cap: 16 });
      L.ticks(ctx, 880, 520, { length: 760, angle: Math.PI / 2, n: 9, len: 12, side: 1, baseline: false, alpha: 0.6, width: 1.5, color: lav });
      L.bracket(ctx, 255, 1330, 825, 1330, { alpha: 0.6, cap: 16 });
      L.ticks(ctx, 255, 1330, { length: 570, angle: 0, n: 6, len: 10, side: -1, baseline: false, alpha: 0.55, width: 1.5, color: lav });
      L.ticks(ctx, 60, 120, { length: 1680, angle: Math.PI / 2, n: 42, len: 10, major: 5, majorLen: 22, side: -1, alpha: 0.5, width: 1.5 });
      {
        L.bracket(ctx, 1040, 250, 1040, 520, { alpha: 0.5, cap: 12, width: 1.2 });
        const lt = new Path2D();
        for (const y of [258, 330, 480]) {
          lt.moveTo(1040, y);
          lt.lineTo(1031, y);
        }
        stroke(ctx, lt, lav, 0.5, 1.2);
        const ext = new Path2D();
        ext.moveTo(728, 520);
        ext.lineTo(896, 520);
        ext.moveTo(552, 1280);
        ext.lineTo(896, 1280);
        ext.moveTo(255, 800);
        ext.lineTo(255, 1346);
        ext.moveTo(825, 800);
        ext.lineTo(825, 1346);
        stroke(ctx, ext, lav, 0.26, 1, [4, 6]);
      }
      // shell-layer section below the safe area and the r 300 guide arc on the micropyle
      drawShellSection(ctx, L, P, bi, SEED, 1);
      ctx.save();
      ctx.beginPath();
      ctx.arc(MICRO[0], MICRO[1], 300, 10 * DEG, 170 * DEG);
      ctx.strokeStyle = lav;
      ctx.globalAlpha = 0.16;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([6, 8]);
      ctx.stroke();
      ctx.restore();

      // ---- 4 leaf cross-section ------------------------------------------------------------------
      drawLeaf(ctx, L, P, bi, SEED, 1090);

      // ---- 5 the egg -------------------------------------------------------------------------------
      {
        // calm the grid inside the shell, soft inner light round the nucleus home
        ctx.save();
        ctx.beginPath();
        L.tracePath(ctx, g.poly, true);
        ctx.fillStyle = P.navy;
        ctx.globalAlpha = 0.5;
        ctx.fill();
        ctx.clip();
        ctx.globalCompositeOperation = 'lighter';
        const gl = ctx.createRadialGradient(480, 780, 20, 530, 860, 430);
        gl.addColorStop(0, L.rgba(lav, 0.11));
        gl.addColorStop(0.55, L.rgba(lav, 0.04));
        gl.addColorStop(1, L.rgba(lav, 0));
        ctx.globalAlpha = 1;
        ctx.fillStyle = gl;
        ctx.fillRect(250, 520, 580, 760);
        ctx.restore();
      }

      // shade crescent: stipple and contour hatching on the lower right, a pale rim light on the upper left
      {
        L.stipple(ctx, g.innerPoly, {
          spacing: 7.5,
          r: [1.0, 2.2],
          color: lav,
          alpha: 0.4,
          seed: SEED + 30,
          density: (x, y) => 0.88 * shadeU(x, y),
        });
        const hp = new Path2D();
        for (let y = 548, row = 0; y <= 1258; y += 6, row++) {
          const h = hw(y);
          const tx = termX(y), ex = 540 + h;
          if (ex - tx < 12) continue;
          if (L.h3(row, 9, SEED + 400) < 0.08) continue;
          let u = 0.1 + 0.32 * L.h3(row, 1, SEED + 400);
          const uEnd = 0.965 - 0.04 * L.h3(row, 2, SEED + 400);
          let piece = 0;
          while (u < uEnd - 0.04 && piece < 4) {
            const u1 = Math.min(uEnd, u + 0.2 + 0.5 * L.h3(row, piece + 7, SEED + 401));
            const pts = [];
            for (let q = 0; q <= 5; q++) {
              const x = tx + (ex - tx) * lerp(u, u1, q / 5);
              const th = Math.asin(clamp((x - 540) / Math.max(1, h), -1, 1));
              pts.push(surf(th, y + (L.h3(row, piece, SEED + 402 + bi) - 0.5) * 0.9));
            }
            addPoly(hp, pts, false);
            u = u1 + 0.03 + 0.07 * L.h3(row, piece + 20, SEED + 403);
            piece++;
          }
        }
        ctx.save();
        ctx.beginPath();
        L.tracePath(ctx, g.innerPoly, true);
        ctx.clip();
        stroke(ctx, hp, lav, 0.18, 1);
        ctx.restore();
        // a 45 degree hatch over the deepest part of the crescent: the blueprint echo of 16's cross-hatched side at the cut
        L.hatch(ctx, g.innerPoly, {
          angle: -Math.PI / 4,
          spacing: 6,
          width: 1.2,
          color: lav,
          alpha: 0.26,
          length: [14, 46],
          gap: [2, 6],
          inset: 2,
          overshoot: 0,
          clip: true,
          seed: OWN + 400,
          density: (x, y) => sstep(0.22, 0.6, shadeU(x, y)) * sstep(600, 680, y) * (1 - sstep(1120, 1190, y)),
        });
        const rim = new Path2D();
        wob(L, rim, g.rim, SEED + 31, 0.5, bi, false);
        stroke(ctx, rim, white, 0.3, 1.4);
      }

      // nucleus positions are needed early: the yolk clears round each one (its cytoplasm island).
      // Before T 31.5 one nucleus, stretching over the last 4 frames on twos; then two daughters pop apart on twos.
      const nuclei = [];
      if (t < B_DIV) {
        const stretch = clamp((tw - (B_DIV - 4 * FR)) / (4 * FR)) * 9;
        if (stretch > 0) nuclei.push([540, 860 - stretch, 0.9], [540, 860 + stretch, 0.9]);
        else nuclei.push([540, 860, 1]);
      } else {
        const k = popTwos(B_DIV);
        nuclei.push([540, lerp(860, 830, k), 1], [540, lerp(860, 890, k), 1]);
      }
      // pulse on T 31.0: halo 1.0 to 1.4 and back over 6 frames, held on twos
      const pulseK = t >= B_PULSE && t < B_PULSE + 6 * FR ? [1.4, 1.24, 1.08][Math.min(2, drawing(B_PULSE))] : 1;
      const ISLAND = 50 * (1 + (pulseK - 1) * 0.45);
      const nd = (x, y) => {
        let m = 1e9;
        for (let i = 0; i < nuclei.length; i++) {
          const dd = Math.hypot(x - nuclei[i][0], (y - nuclei[i][1]) * (nuclei.length > 1 ? 1.08 : 1));
          if (dd < m) m = dd;
        }
        return m;
      };

      // yolk spheres and stipple, as in 02 before the larva condenses; the yolk parts round the nucleus
      {
        const sp = new Path2D();
        for (const s of g.spheres) {
          if (nd(s.x, s.y) < ISLAND + s.r * 0.35) continue;
          wob(L, sp, L.ellipsePts(s.x, s.y, s.r, s.r, Math.max(14, Math.round(s.r * 1.4))), s.seed, 0.4, bi, true);
        }
        stroke(ctx, sp, lav, 0.2, 1);
        const pa = [new Path2D(), new Path2D(), new Path2D()];
        for (let i = 0; i < g.dots.length; i++) {
          const d = g.dots[i];
          if (nd(d.x, d.y) < ISLAND + 6 * (L.h3(i, 7, OWN) - 0.5)) continue;
          const jx = (L.h3(i, bi, 31) - 0.5) * 0.7, jy = (L.h3(bi, i, 37) - 0.5) * 0.7;
          const target = pa[d.a < 0.18 ? 0 : d.a < 0.24 ? 1 : 2];
          target.moveTo(d.x + jx + d.r, d.y + jy);
          target.arc(d.x + jx, d.y + jy, d.r, 0, TAU);
        }
        ctx.save();
        ctx.fillStyle = lav;
        ctx.globalAlpha = 0.14;
        ctx.fill(pa[0]);
        ctx.globalAlpha = 0.2;
        ctx.fill(pa[1]);
        ctx.globalAlpha = 0.28;
        ctx.fill(pa[2]);
        ctx.restore();
      }

      // cytoplasm island: clear cytoplasm lit faintly from the nucleus, a fine stipple rim where the yolk packs against it
      {
        const yMin = Math.min(...nuclei.map((n) => n[1])), yMax = Math.max(...nuclei.map((n) => n[1]));
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const n of nuclei) {
          const gr = ctx.createRadialGradient(n[0], n[1], 0, n[0], n[1], ISLAND + 8);
          gr.addColorStop(0, L.rgba(lav, 0.07));
          gr.addColorStop(0.7, L.rgba(lav, 0.035));
          gr.addColorStop(1, L.rgba(lav, 0));
          ctx.fillStyle = gr;
          ctx.fillRect(n[0] - ISLAND - 8, n[1] - ISLAND - 8, 2 * (ISLAND + 8), 2 * (ISLAND + 8));
        }
        ctx.restore();
        L.stipple(ctx, null, {
          bounds: [540 - ISLAND - 24, yMin - ISLAND - 24, 2 * (ISLAND + 24), yMax - yMin + 2 * (ISLAND + 24)],
          spacing: 3.1,
          r: [0.55, 1.15],
          color: lav,
          alpha: 0.62,
          seed: OWN + 40,
          density: (x, y) => {
            const d = nd(x, y);
            return sstep(ISLAND - 5, ISLAND + 1, d) * (1 - sstep(ISLAND + 3, ISLAND + 17, d)) * 0.8 + (d < ISLAND - 8 ? 0.05 : 0);
          },
        });
      }

      // cross-ribs: rungs between the keels, then light catching the rungs in the lit quadrant
      {
        const rb = new Map();
        for (let i = 0; i < g.rungs.length; i++) {
          const r = g.rungs[i];
          const p = bucket(rb, r.a);
          const jx = (L.h3(i, bi, SEED + 301) - 0.5) * 0.7, jy = (L.h3(bi, i, SEED + 302) - 0.5) * 0.7;
          p.moveTo(r.p0[0], r.p0[1]);
          p.quadraticCurveTo(r.c[0] + jx, r.c[1] + jy, r.p2[0], r.p2[1]);
        }
        strokeBuckets(ctx, rb, lav, 1.3, 1.8, 0.45);
        const lp = new Path2D();
        for (const pts of g.lit) addPoly(lp, pts, false);
        stroke(ctx, lp, lav, 0.38, 1);
        const nodeP = new Path2D();
        for (const n of g.nodes) {
          nodeP.moveTo(n[0] + 1.2, n[1]);
          nodeP.arc(n[0], n[1], 1.2, 0, TAU);
        }
        ctx.save();
        ctx.fillStyle = lav;
        ctx.globalAlpha = 0.34;
        ctx.fill(nodeP);
        ctx.restore();
      }

      // ridges as keels: shadow line, crest, highlight on the lit upper part
      {
        const crest = new Map(), hi = new Map();
        const shadow = new Path2D();
        for (let k = 0; k < g.ridges.length; k++) {
          const R = g.ridges[k];
          const n = R.pts.length;
          if (n < 2) continue;
          const W = wobPts(L, R.pts, SEED + 100 + k, 0.55, bi);
          for (let i0 = 0; i0 < n - 1; i0 += 4) {
            const i1 = Math.min(n - 1, i0 + 4);
            addPoly(bucket(crest, R.crestA[(i0 + i1) >> 1]), W.slice(i0, i1 + 1), false);
          }
          addPoly(shadow, W.slice(2), false, 3 * Math.max(0.4, Math.cos(R.th)), 0.5);
          if (R.hiA > 0) {
            const nMain = Math.min(n, Math.round(R.hiN * 0.7) + 1), nAll = Math.min(n, R.hiN + 1);
            addPoly(bucket(hi, R.hiA), W.slice(1, nMain), false, -2, 0);
            if (nAll > nMain) addPoly(bucket(hi, Math.round(R.hiA * 25) / 50), W.slice(nMain - 1, nAll), false, -2, 0);
          }
        }
        stroke(ctx, shadow, P.navyDeep, 0.6, 1);
        strokeBuckets(ctx, crest, lav, 1.8);
        strokeBuckets(ctx, hi, white, 1);
      }

      // construction: the section ring at the widest point, front half dashed, back half dotted
      {
        const front = new Path2D(), back = new Path2D();
        for (let d = -90, i = 0; d <= 90 + 1e-9; d += 3, i++) {
          const f = surf(d * DEG, 790);
          const c = TILT * hw(790) * Math.cos(d * DEG);
          if (i === 0) {
            front.moveTo(f[0], f[1]);
            back.moveTo(f[0], 790 + c);
          } else {
            front.lineTo(f[0], f[1]);
            back.lineTo(f[0], 790 + c);
          }
        }
        stroke(ctx, front, lav, 0.5, 1.2, [9, 6]);
        stroke(ctx, back, lav, 0.26, 1, [2, 5]);
        const et = new Path2D();
        for (const sg of [-1, 1]) {
          et.moveTo(540 + sg * 285, 780);
          et.lineTo(540 + sg * 285, 800);
        }
        et.moveTo(532, 790 - TILT * 285);
        et.lineTo(548, 790 - TILT * 285);
        stroke(ctx, et, lav, 0.5, 1.2);
      }

      // micropyle rosette: cells at the apex, clipped to the shell and kept below the nucleus in brightness
      {
        ctx.save();
        ctx.beginPath();
        L.tracePath(ctx, g.poly, true);
        ctx.clip();
        ctx.translate(MICRO[0], MICRO[1]);
        drawRosette(ctx, L, P, 26, 0.6, 1.2, bi, SEED + 9);
        ctx.restore();
        ctx.save();
        ctx.fillStyle = white;
        ctx.beginPath();
        ctx.arc(MICRO[0], MICRO[1], 2.6, 0, TAU);
        ctx.fill();
        ctx.restore();
      }

      // double outline
      {
        const po = new Path2D();
        wob(L, po, g.outL, SEED + 1, 0.6, bi, false);
        wob(L, po, g.outR, SEED + 2, 0.6, bi, false);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        stroke(ctx, po, lav, 0.05, 16);
        stroke(ctx, po, lav, 0.08, 7);
        ctx.restore();
        stroke(ctx, po, lav, 0.85, 2.5);
        const pi = new Path2D();
        wob(L, pi, g.inL, SEED + 11, 0.5, bi, false);
        wob(L, pi, g.inR, SEED + 12, 0.5, bi, false);
        pi.moveTo(g.inL[0][0], 529);
        pi.lineTo(g.inR[0][0], 529);
        stroke(ctx, pi, lav, 0.5, 1.5);
      }

      // glue: a small meniscus where the base meets the leaf
      {
        const gp = new Path2D();
        const glp = new Path2D();
        for (const sgn of [-1, 1]) {
          const cx = 540 + sgn * 180, dy = 552, dx = 540 + sgn * hw(dy);
          const ax = cx + sgn * 44;
          gp.moveTo(cx, 521);
          gp.lineTo(ax, 521);
          gp.quadraticCurveTo(cx + sgn * 8, 526, dx, dy);
          gp.closePath();
          glp.moveTo(ax, 522);
          glp.quadraticCurveTo(cx + sgn * 8, 527, dx + sgn * 1, dy);
        }
        L.stipple(ctx, gp, { bounds: [300, 518, 480, 40], spacing: 3.8, r: [1.0, 1.3], color: lav, alpha: 0.5, seed: SEED + 33 });
        stroke(ctx, glp, lav, 0.5, 1);
      }

      // ---- 6 nucleus -------------------------------------------------------------------------------
      // glass ping on the cut: two rings leave the nucleus
      for (let k = 0; k < 2; k++) {
        const u = clamp((t - k * 3 * FR + FR) / 0.5);
        if (u <= 0 || u >= 1) continue;
        ctx.save();
        ctx.beginPath();
        ctx.arc(540, 860, 30 + (k ? 170 : 300) * E.outExpo(u), 0, TAU);
        ctx.strokeStyle = k ? lav : white;
        ctx.globalAlpha = (k ? 0.26 : 0.42) * (1 - u) * (1 - u);
        ctx.lineWidth = k ? 1.5 : 2;
        ctx.stroke();
        ctx.restore();
      }

      // ping brightens the nucleus on the cut
      const pingI = 1 + 0.35 * (1 - clamp(t / (6 * FR)));
      const split = nuclei.length > 1 ? Math.abs(nuclei[1][1] - nuclei[0][1]) : 0;
      for (let i = 0; i < nuclei.length; i++) {
        const [x, y, s] = nuclei[i];
        const H = pulseK;
        L.glowDot(ctx, x, y, 10 * s, { rays: 0, glow: 4.5 * H, seed: OWN + 60 + i, twinkle: 0.12, intensity: 1.3 * pingI * H });
        // the art bible's 40 px halo: an additive bloom that swells with H on the pulse
        {
          const hr = 44 * H;
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const hg = ctx.createRadialGradient(x, y, 0, x, y, hr);
          hg.addColorStop(0, L.rgba(glowC, 0.42));
          hg.addColorStop(0.35, L.rgba(glowC, 0.16));
          hg.addColorStop(0.7, L.rgba(glowC, 0.05));
          hg.addColorStop(1, L.rgba(glowC, 0));
          ctx.fillStyle = hg;
          ctx.fillRect(x - hr, y - hr, 2 * hr, 2 * hr);
          ctx.restore();
        }
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, 21 * s * H, 0, TAU);
        ctx.strokeStyle = H > 1 ? white : lav;
        ctx.globalAlpha = H > 1 ? 0.6 : 0.45;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
        // 12 radial ticks; once two nuclei sit close, the ticks facing the sibling fold away so the pair stays legible
        const face = nuclei.length > 1 ? (i === 0 ? Math.PI / 2 : -Math.PI / 2) : 0;
        const gap = nuclei.length > 1 ? clamp((104 - split) / 40) : 0;
        const tp = new Path2D(), tpm = new Path2D();
        const rot = (bi % 4) * 7.5 * DEG + i;
        for (let q = 0; q < 12; q++) {
          const a = rot + (q / 12) * TAU;
          const facing = Math.cos(a - face);
          let len = (q % 2 === 0 ? 22 : 14) * s;
          if (gap > 0 && facing > 0.2) len *= 1 - gap * clamp((facing - 0.2) / 0.5);
          if (len < 2) continue;
          const r0 = 27 * s * H;
          const tgt = q % 2 === 0 ? tpm : tp;
          tgt.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
          tgt.lineTo(x + Math.cos(a) * (r0 + len), y + Math.sin(a) * (r0 + len));
        }
        stroke(ctx, tp, white, 0.7, 1.5);
        stroke(ctx, tpm, white, 0.7, 2);
      }
      // nucleus bell ripple on the pulse: white ping, then a lavender follow-up 2 frames later
      for (let k = 0; k < 2; k++) {
        const t0 = B_PULSE + k * 2 * FR;
        if (t < t0 || t >= t0 + 10 * FR) continue;
        const u = (t - t0 + FR) / (10 * FR);
        ctx.save();
        ctx.beginPath();
        ctx.arc(540, 860, lerp(34, k ? 110 : 150, E.outExpo(u)), 0, TAU);
        ctx.strokeStyle = k ? lav : white;
        ctx.globalAlpha = (k ? 0.35 : 0.7) * (1 - u) * (1 - u);
        ctx.lineWidth = k ? 1.5 : 2;
        ctx.stroke();
        ctx.restore();
      }
      // spindle between fresh daughters: the dashed axis from 02 plus a fan of fibres bowing out between the poles
      if (t >= B_DIV && t < B_DIV + 6 * FR) {
        const spA = 1 - clamp((t - B_DIV) / (6 * FR));
        const [x0, y0] = nuclei[0], [x1, y1] = nuclei[1];
        const sp = new Path2D();
        sp.moveTo(x0, y0);
        sp.lineTo(x1, y1);
        stroke(ctx, sp, white, 0.5 * spA, 1.2, [3, 4]);
        const fib = new Path2D();
        const ym = (y0 + y1) / 2;
        for (let k = -3; k <= 3; k++) {
          if (k === 0) continue;
          const bulge = k * 6.5 + (L.h3(k + 9, bi, OWN) - 0.5) * 1.6;
          fib.moveTo(x0 + k * 0.8, y0 + 10);
          fib.quadraticCurveTo(x0 + bulge * 2, ym, x1 + k * 0.8, y1 - 10);
        }
        stroke(ctx, fib, lav, 0.42 * spA, 1);
        // the metaphase plate a moment ago: a short row of chromatid dots parting at the midline
        const cd = new Path2D();
        const part = (y1 - y0) * 0.18;
        for (let k = -3; k <= 3; k++) {
          const xx = 540 + k * 7;
          for (const sg of [-1, 1]) {
            const yy = ym + sg * (2.5 + part) + (L.h3(k, sg + 3, OWN + 5) - 0.5) * 2;
            cd.moveTo(xx + 1.6, yy);
            cd.arc(xx, yy, 1.6, 0, TAU);
          }
        }
        ctx.save();
        ctx.fillStyle = white;
        ctx.globalAlpha = 0.75 * spA;
        ctx.fill(cd);
        ctx.restore();
      }
      // magenta ring flash between the daughters, as in 02
      if (t >= B_DIV && t < B_DIV + 4 * FR) {
        const u = (t - B_DIV) / (4 * FR);
        ctx.save();
        ctx.beginPath();
        ctx.arc(540, 860, lerp(20, 70, E.outExpo(u + 0.5 / 4)), 0, TAU);
        ctx.strokeStyle = mag;
        ctx.globalAlpha = 1 - u * u;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      }

      // ---- 7 network nodes: magnified micropyle (left) and shell lattice (right), as in 02 -------------
      const nodeGlyph = (cx, cy, sx, sy, sr, seed, content) => {
        const dx = cx - sx, dy = cy - sy, dl = Math.hypot(dx, dy);
        const ux = dx / dl, uy = dy / dl;
        const ax = sx + ux * sr, ay = sy + uy * sr;
        const bx = cx - ux * 62, by = cy - uy * 62;
        const mx = (ax + bx) / 2 + uy * 46, my = (ay + by) / 2 - ux * 46;
        const lead = [];
        for (let i = 0; i <= 24; i++) {
          const u = i / 24, v = 1 - u;
          lead.push([v * v * ax + 2 * v * u * mx + u * u * bx, v * v * ay + 2 * v * u * my + u * u * by]);
        }
        const lp = new Path2D();
        wob(L, lp, lead, seed, 0.5, bi, false);
        stroke(ctx, lp, lav, 0.5, 1.2);
        ctx.save();
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, TAU);
        ctx.strokeStyle = lav;
        ctx.globalAlpha *= 0.5;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.restore();
        ctx.save();
        const nodeA = ctx.globalAlpha;
        ctx.translate(cx, cy);
        ctx.beginPath();
        ctx.arc(0, 0, 58, 0, TAU);
        ctx.fillStyle = P.navyLight;
        ctx.globalAlpha = nodeA * 0.94;
        ctx.fill();
        ctx.globalAlpha = nodeA;
        const rp = new Path2D();
        wob(L, rp, L.ellipsePts(0, 0, 58, 58, 64), seed + 1, 0.4, bi, true);
        stroke(ctx, rp, lav, 0.85, 2);
        const rp2 = new Path2D();
        rp2.arc(0, 0, 51, 0, TAU);
        stroke(ctx, rp2, lav, 0.35, 1);
        L.ticks(ctx, 0, 0, { r: 60, n: 36, len: 5, major: 9, majorLen: 10, color: lav, alpha: 0.4, width: 1, rot: (info.T - 1.5) * 0.4 });
        ctx.beginPath();
        ctx.arc(0, 0, 50, 0, TAU);
        ctx.clip();
        content(nodeA);
        ctx.restore();
      };

      // the nodes recede while the wordmark enters, so the sign-off reads as one word, not icon, word, icon
      const kWord = hit(B_PULSE, 6);
      const kNode = lerp(1, 0.35, kWord);
      ctx.save();
      ctx.globalAlpha = kNode;
      nodeGlyph(175, 1440, MICRO[0], MICRO[1], 36, SEED + 90, () => {
        // shell cells ringing the rosette
        const cp = new Path2D();
        for (let i = 0; i < 12; i++) {
          const a = (i * 30 + 15) * DEG + (L.h3(i, 1, SEED) - 0.5) * 0.12;
          cp.moveTo(Math.cos(a) * 38, Math.sin(a) * 38);
          cp.lineTo(Math.cos(a) * 52, Math.sin(a) * 52);
          const a2 = i * 30 * DEG + (L.h3(i, 2, SEED) - 0.5) * 0.1;
          cp.moveTo(Math.cos(a2) * 45, Math.sin(a2) * 45);
          cp.lineTo(Math.cos(a2) * 52, Math.sin(a2) * 52);
        }
        cp.moveTo(38, 0);
        cp.arc(0, 0, 38, 0, TAU);
        cp.moveTo(45, 0);
        cp.arc(0, 0, 45, 0, TAU);
        stroke(ctx, cp, lav, 0.38, 1);
        drawRosette(ctx, L, P, 31, 0.9, 1.5, bi, SEED + 91);
      });

      const wy = 1040, wx = 540 + hw(wy);
      nodeGlyph(872, 1440, wx - 6, wy, 24, SEED + 95, (nodeA) => {
        // shell lattice close up: keels with their shadow and highlight, sagging rungs between them, aeropyles
        ctx.rotate(-0.12);
        L.stipple(ctx, null, {
          bounds: [-60, -60, 120, 120],
          spacing: 5.5,
          r: [1.0, 1.5],
          color: lav,
          alpha: 0.4,
          seed: SEED + 96,
          density: (x, y) => sstep(-10, 50, x * 0.8 + y * 0.5),
        });
        const rung = new Path2D();
        for (let xx = -76, ci = 0; xx <= 60; xx += 22, ci++) {
          for (let yy = -66, ri = 0; yy <= 66; yy += 13, ri++) {
            const jy = (L.h3(ci, ri, SEED + 97) - 0.5) * 4;
            rung.moveTo(xx + 4, yy + jy);
            rung.quadraticCurveTo(xx + 11, yy + jy + 3, xx + 18, yy + jy);
          }
        }
        stroke(ctx, rung, lav, 0.4, 1);
        const keel = new Path2D(), keelSh = new Path2D(), keelHi = new Path2D();
        for (let xx = -54; xx <= 60; xx += 22) {
          keelSh.moveTo(xx + 3.5, -60);
          keelSh.lineTo(xx + 3.5, 60);
          keel.moveTo(xx, -60);
          keel.lineTo(xx, 60);
          keelHi.moveTo(xx - 2.5, -60);
          keelHi.lineTo(xx - 2.5, 12);
        }
        stroke(ctx, keelSh, P.navyDeep, 0.8, 2);
        stroke(ctx, keel, lav, 0.8, 3);
        stroke(ctx, keelHi, white, 0.5, 1);
        const pits = new Path2D();
        for (let xx = -54; xx <= 60; xx += 22) {
          for (let yy = -60; yy <= 60; yy += 26) {
            pits.moveTo(xx + 1.8, yy);
            pits.arc(xx, yy, 1.8, 0, TAU);
          }
        }
        ctx.fillStyle = white;
        ctx.globalAlpha = nodeA * 0.6;
        ctx.fill(pits);
        ctx.globalAlpha = nodeA;
      });
      ctx.restore();

      // ---- 8 glyphs on their plates: cycle glyph (reset on T 31.0), network lead, division counter ----------
      {
        const cx = 900, cy = 300;
        const kReset = hit(B_PULSE, 4, E.outCubic);
        const flash = t >= B_PULSE && t < B_PULSE + 6 * FR ? 1 - (t - B_PULSE) / (6 * FR) : 0;
        const gPlate = new Path2D();
        gPlate.arc(900, 300, 68, 0, TAU);
        ctx.save();
        ctx.fillStyle = P.navyLight;
        ctx.globalAlpha = 0.95;
        ctx.fill(gPlate);
        ctx.restore();
        stroke(ctx, gPlate, lav, 0.25, 1);
        const cPlate = new Path2D();
        cPlate.arc(154, 305, 64, 0, TAU);
        ctx.save();
        ctx.fillStyle = P.navyLight;
        ctx.globalAlpha = 0.6;
        ctx.fill(cPlate);
        ctx.restore();
        stroke(ctx, cPlate, lav, 0.25, 1);

        ctx.save();
        for (let q = 0; q < 4; q++) {
          const a0 = (-90 + q * 90 + 6) * DEG, a1 = (-90 + (q + 1) * 90 - 6) * DEG;
          ctx.beginPath();
          ctx.arc(cx, cy, 44, a0, a1);
          ctx.lineCap = 'round';
          if (q === 0) {
            ctx.strokeStyle = white;
            ctx.globalAlpha = 0.95;
            ctx.lineWidth = 3 + 2 * flash;
            ctx.stroke();
          } else {
            ctx.strokeStyle = P.navy;
            ctx.globalAlpha = 1;
            ctx.lineWidth = 5;
            ctx.stroke();
            ctx.strokeStyle = lav;
            ctx.globalAlpha = 0.25;
            ctx.lineWidth = 2.5;
            ctx.stroke();
            if (kReset < 1) {
              ctx.strokeStyle = white;
              ctx.globalAlpha = 0.95 * (1 - kReset);
              ctx.lineWidth = lerp(3, 2, kReset);
              ctx.stroke();
            }
          }
        }
        ctx.globalAlpha = 1;
        L.ticks(ctx, cx, cy, { r: 52, n: 48, len: 4, major: 12, majorLen: 9, color: lav, alpha: 0.3, width: 1 });
        // position marker: at the top after a full lap, steps on to the egg arc on the reset
        const mA = (-90 + 45 * E.outExpo(hit(B_PULSE, 6))) * DEG;
        L.glowDot(ctx, cx + Math.cos(mA) * 44, cy + Math.sin(mA) * 44, 3.5, { rays: 4, seed: OWN + 80, glow: 5 });
        // reset ring
        if (t >= B_PULSE && t < B_PULSE + 8 * FR) {
          const u = (t - B_PULSE + FR) / (8 * FR);
          ctx.beginPath();
          ctx.arc(cx, cy, lerp(46, 78, E.outExpo(u)), 0, TAU);
          ctx.strokeStyle = white;
          ctx.globalAlpha = 0.6 * (1 - u) * (1 - u);
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        ctx.restore();

        // network lead on the reset: from the egg arc down to this egg's glued base, so the stage names the subject
        const kLead = hit(B_PULSE, 6, E.outExpo);
        if (kLead > 0) {
          const x0 = cx + Math.cos(-45 * DEG) * 44, y0 = cy + Math.sin(-45 * DEG) * 44;
          const qx = 700, qy = 300, x1 = 640, y1 = 530;
          const N = 48, n = Math.max(1, Math.ceil(N * kLead - 1e-6));
          const pts = [];
          for (let i = 0; i <= n; i++) {
            const u = Math.min(kLead, i / N), v = 1 - u;
            pts.push([v * v * x0 + 2 * v * u * qx + u * u * x1, v * v * y0 + 2 * v * u * qy + u * u * y1]);
          }
          const lp = new Path2D();
          wob(L, lp, pts, OWN + 500, 0.6, bi, false);
          // a navy knockout under the lead keeps it legible over the leaf cells
          stroke(ctx, lp, P.navy, 0.6, 6);
          stroke(ctx, lp, lav, 0.5, 1.6);
          const tip = pts[pts.length - 1];
          ctx.save();
          ctx.fillStyle = white;
          ctx.beginPath();
          ctx.arc(tip[0], tip[1], 3, 0, TAU);
          ctx.fill();
          ctx.restore();
        }

        // division counter: binary lineage tree, same 1 / 2 / 4 / 8 lighting as the old columns
        const kDiv = hit(B_DIV, 3, E.outBack);
        const tree = [
          [[154, 356]],
          [[134, 322], [174, 322]],
          [[124, 288], [144, 288], [164, 288], [184, 288]],
          Array.from({ length: 8 }, (_, i) => [117 + i * 10.6, 254]),
        ];
        const treeK = (c) => (c === 0 ? 1 : c === 1 ? (t < B_DIV ? 1 - kReset : kDiv) : 1 - kReset);
        const br = new Path2D();
        for (let c = 0; c < 3; c++) {
          for (let i = 0; i < tree[c].length; i++) {
            for (let s = 0; s < 2; s++) {
              wob(L, br, [tree[c][i], tree[c + 1][i * 2 + s]], OWN + 600 + c * 20 + i * 2 + s, 0.5, bi, false);
            }
          }
        }
        stroke(ctx, br, lav, 0.35, 1);
        ctx.save();
        for (let c = 0; c < 4; c++) {
          const k = treeK(c);
          for (const [x, y] of tree[c]) {
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, TAU);
            if (k > 0.01) {
              ctx.globalAlpha = Math.min(1, k);
              ctx.fillStyle = white;
              ctx.fill();
            } else {
              ctx.globalAlpha = 0.3;
              ctx.strokeStyle = lav;
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }
        }
        ctx.restore();
      }

      // ---- 9 wordmark ----------------------------------------------------------------------------
      if (kWord > 0) {
        // letter-spacing adds a trailing gap after the last letter, so shift right by half of it to centre the ink
        L.text(ctx, 'monarch', 540 + 0.06 * 44, 1470, { size: 44, weight: 300, tracking: '0.12em', color: lav, alpha: 0.85 * kWord, align: 'center' });
      }
    },
  });
})();
