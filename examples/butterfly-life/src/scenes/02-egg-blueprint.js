// 02 egg-blueprint : "A spark, an egg" (schematic, global T 1.5 to 4.0)
//
// Layers, back to front:
//   1 navyDeep, then the blueprint plate fading in on T 2.0
//   2 guide geometry: circles r 470 / 640 at (540, 900) turning 6 degrees, corner diagonals, construction lines
//   3 measurement: height bracket x 880, width bracket y 1330, left tick scale x 60 (pop on 16ths)
//   4 leaf cross-section y 246 to 520: cuticle, palisade, spongy mesophyll with three vein bundles, lower epidermis, trichomes
//   4b below the safe area: shell-layer section (chorion, wax layer, vitelline membrane), r 300 guide arc on the micropyle
//   5 the G1 egg: shade crescent (stipple + contour hatching), yolk spheres, 18 keeled ridges, 34 rows of rungs,
//     micropyle rosette of cells, double outline, glue fillets
//   6 nuclei dividing 1, 2, 4, 8, then gliding to the wall
//   7 the curled larva condensing out of the yolk on 03's spine, 03's dark head oval 260 x 204 at (540, 1140)
//   8 spark, magenta events, magnified insets, cycle glyph and division counter on plates
(function () {
  'use strict';

  const ID = 'egg-blueprint';
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

  // ---------------------------------------------------------------------------
  // Larva path: the nine spine points of 03's grey curl, so the C lands on the same pixels at the cut
  // ---------------------------------------------------------------------------

  const CURL = [[540, 1120], [430, 1060], [372, 900], [398, 725], [500, 630], [628, 646], [700, 765], [690, 905], [622, 985]];
  // the head is 03's dark oval (03-egg-hatch.js drawInsideShadow), so it holds its size and place across the match cut
  const HEAD = [540, 1140];
  const HEAD_RX = 130, HEAD_RY = 102;
  const HEAD_ROT = 0; // mouthparts straight down at the micropyle
  const HEAD_S = HEAD_RX / 60; // the capsule's features were drawn for a 60 px radius
  const MICRO = [540, 1262];
  const inHead = (x, y, pad = 0) => {
    const hx = (x - HEAD[0]) * Math.cos(HEAD_ROT) + (y - HEAD[1]) * Math.sin(HEAD_ROT);
    const hy = -(x - HEAD[0]) * Math.sin(HEAD_ROT) + (y - HEAD[1]) * Math.cos(HEAD_ROT);
    return (hx / (HEAD_RX + pad)) ** 2 + (hy / (HEAD_RY + pad)) ** 2 < 1;
  };

  // ---------------------------------------------------------------------------
  // Geometry, built once (a pure function of constants)
  // ---------------------------------------------------------------------------

  let GEO = null;
  function geo(L) {
    if (GEO) return GEO;
    const g = {};
    const S0 = L.hash(ID) & 0xffff;
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

    // ---- larva: 03's nine-point curl, its front end (540, 1120) tucked under the head oval ----
    const spine = L.smoothPts(CURL, false, 5);
    const N = spine.length;
    const sc = cumLen(spine);
    const sLen = sc[N - 1];
    // the 13 segments start where the body leaves the capsule, so T1 sits right behind the head
    let iExit = 0;
    while (iExit < N - 1 && inHead(spine[iExit][0], spine[iExit][1])) iExit++;
    const s0 = Math.max(0, sc[iExit] - 8);
    const tang = spine.map((p, i) => {
      const a = spine[Math.max(0, i - 1)], b = spine[Math.min(N - 1, i + 1)];
      const tx = b[0] - a[0], ty = b[1] - a[1];
      const tl = Math.hypot(tx, ty) || 1;
      return [tx / tl, ty / tl];
    });
    const mi = N >> 1;
    const vs = -tang[mi][1] * (540 - spine[mi][0]) + tang[mi][0] * (880 - spine[mi][1]) > 0 ? 1 : -1;
    // [ventral nx, ny, tangent tx, ty]: the ventral side is the inside of the curl
    const nrm = tang.map(([tx, ty]) => [-ty * vs, tx * vs, tx, ty]);
    // a wider tangent window for the marks drawn across the body, so ticks stay square through the neck bend
    const nrmW = spine.map((p, i) => {
      const a = spine[Math.max(0, i - 7)], b = spine[Math.min(N - 1, i + 7)];
      const tx = b[0] - a[0], ty = b[1] - a[1];
      const tl = Math.hypot(tx, ty) || 1;
      return [(-ty / tl) * vs, (tx / tl) * vs, tx / tl, ty / tl];
    });
    const width = (s) => {
      const w = 62 * (1 - 0.5 * Math.pow(s / sLen, 2)); // 03's band width
      const f = clamp((s - s0) / (sLen - s0)) * 13;
      return w * (0.93 + 0.07 * Math.sin(Math.PI * (f - Math.floor(f))));
    };
    const at = (s) => {
      let i = 0;
      while (i < N - 2 && sc[i + 1] < s) i++;
      const u = clamp((s - sc[i]) / (sc[i + 1] - sc[i] || 1));
      return { p: [lerp(spine[i][0], spine[i + 1][0], u), lerp(spine[i][1], spine[i + 1][1], u)], n: nrmW[i] };
    };
    const inner = [], outer = [];
    for (let i = 0; i < N; i++) {
      const w = width(sc[i]);
      inner.push([spine[i][0] + nrm[i][0] * w, spine[i][1] + nrm[i][1] * w]);
      outer.push([spine[i][0] - nrm[i][0] * w, spine[i][1] - nrm[i][1] * w]);
    }
    const wt = width(sLen), nt = nrm[N - 1], pt = spine[N - 1];
    const cap = [];
    for (let i = 1; i < 10; i++) {
      const a = (i / 10) * Math.PI;
      const c = Math.cos(a), sn = Math.sin(a);
      cap.push([pt[0] + nt[0] * wt * c + nt[2] * wt * sn, pt[1] + nt[1] * wt * c + nt[3] * wt * sn]);
    }
    const lv = { spine, sc, sLen, s0, N, at, width, nrm, inner, outer, cap, poly: inner.concat(cap, outer.slice().reverse()) };
    lv.ticks = [];
    for (let i = 0; i < 13; i++) {
      const s = s0 + ((sLen - s0) * i) / 13 + 4;
      const q = at(s);
      lv.ticks.push({ s, p: q.p, n: q.n, w: width(s) });
    }
    // contour hatching across the body on the side turned away from the light
    lv.hatch = [];
    for (let s = s0 + 8, i = 0; s < sLen - 10; s += 7, i++) {
      const q = at(s);
      const d = q.n[0] * 0.6 + q.n[1] * 0.8;
      if (Math.abs(d) < 0.18) continue;
      const sg = d > 0 ? 1 : -1;
      const w = width(s);
      const a0 = 0.18 + 0.12 * L.h3(i, 3, S0 + 44), a1 = 0.84 - 0.1 * L.h3(i, 4, S0 + 44);
      const p0 = [q.p[0] + sg * q.n[0] * w * a0, q.p[1] + sg * q.n[1] * w * a0];
      const p1 = [q.p[0] + sg * q.n[0] * w * a1, q.p[1] + sg * q.n[1] * w * a1];
      const cm = [(p0[0] + p1[0]) / 2 - q.n[2] * 4, (p0[1] + p1[1]) / 2 - q.n[3] * 4];
      lv.hatch.push({ s, p0, cm, p1 });
    }
    g.larva = lv;

    // yolk: 96 packed yolk spheres, dots concentrated inside them through a noise mask
    const inEgg = (x, y, pad) => y - pad > 536 && y + pad < 1240 && Math.abs(x - 540) + pad < hw(y) - 12 && Math.abs(x - 540) + pad * 0.7 < hw(y + pad * 0.7) - 12;
    const rsph = L.rng(L.hash(ID, 'yolk-sph'));
    g.spheres = [];
    let guard = 0;
    while (g.spheres.length < 96 && guard++ < 20000) {
      const r = rsph.range(8, 22);
      const x = rsph.range(262, 818), y = rsph.range(540, 1240);
      if (!inEgg(x, y, r)) continue;
      if (Math.hypot(x - 540, y - 860) < 64 + r) continue;
      if (g.spheres.some((s) => Math.hypot(s.x - x, s.y - y) < s.r + r + 2)) continue;
      g.spheres.push({ x, y, r, seed: S0 + 500 + g.spheres.length });
    }
    const inSphere = (x, y) => {
      for (const s of g.spheres) if ((x - s.x) * (x - s.x) + (y - s.y) * (y - s.y) < s.r * s.r) return true;
      return false;
    };
    const r = L.rng(L.hash(ID, 'yolk'));
    const mseed = L.hash(ID, 'yolk-mask') & 0xffff;
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
    const targets = [];
    guard = 0;
    const lb = L.bounds(lv.poly);
    while (targets.length < dots.length && guard++ < 80000) {
      const x = r.range(lb.x, lb.x + lb.w), y = r.range(lb.y, lb.y + lb.h);
      if (inHead(x, y, 2)) continue;
      if (L.polyContains(lv.poly, x, y)) targets.push([x, y, Math.atan2(y - 880, x - 540)]);
    }
    // pair by angle round the egg centre so the stipple flows toward the wall instead of crossing
    const ds = dots.filter((d) => !d.stay).sort((u, v) => u.ang - v.ang);
    const ts = targets.slice(0, ds.length).sort((u, v) => u[2] - v[2]);
    ds.forEach((d, i) => {
      const tg = ts[i % ts.length];
      d.tx = tg[0];
      d.ty = tg[1];
    });
    dots.forEach((d) => {
      if (d.stay) {
        d.tx = d.x;
        d.ty = d.y;
      }
    });
    g.dots = dots;

    // eight nuclei: a ring just inside the shell wall, then each onto the nearest place along the larva
    g.ring = [];
    g.nucS = [];
    g.nucSkip = [];
    for (let i = 0; i < 8; i++) {
      const a = (-67.5 + 45 * i) * DEG;
      let rr = 0;
      while (rr < 500 && L.polyContains(g.poly, 540 + Math.cos(a) * rr, 880 + Math.sin(a) * rr)) rr += 2;
      const rp = [540 + Math.cos(a) * (rr - 66), 880 + Math.sin(a) * (rr - 66)];
      g.ring.push(rp);
      let best = s0 + 40, bd = 1e9;
      for (let q = 0; q < N; q++) {
        if (sc[q] < s0 + 40 || sc[q] > sLen - 26) continue;
        const d = Math.hypot(spine[q][0] - rp[0], spine[q][1] - rp[1]);
        if (d < bd) {
          bd = d;
          best = sc[q];
        }
      }
      g.nucS.push(best);
      // a slot whose place on the spine is under the head oval has nowhere to show, so it is not drawn once the body condenses
      const q = at(best);
      g.nucSkip.push(inHead(q.p[0], q.p[1]));
    }
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

  function seg(t, a, frames, e) {
    const u = clamp((t - a) / (frames * FR));
    if (u <= 1e-5) return 0; // eases such as outBack return about 1e-16 at 0, which would draw a speck
    return e ? e(u) : u;
  }

  // ---------------------------------------------------------------------------
  // Micropyle rosette: a pinpoint, an inner hexagon, 6 bowed radial walls, a scalloped outer wall
  // ---------------------------------------------------------------------------

  // o.fillA: alternate cell fill alpha, o.wallW: radial wall width, o.inner: a closing inner wall 4 px inside each cell
  function drawRosette(ctx, L, P, R, alpha, lw, bi, seed, o = {}) {
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
    const scal = new Path2D();
    const fills = new Path2D();
    const inner = new Path2D();
    const qpt = (a, c, b, u) => {
      const v = 1 - u;
      return [v * v * a[0] + 2 * v * u * c[0] + u * u * b[0], v * v * a[1] + 2 * v * u * c[1] + u * u * b[1]];
    };
    for (let i = 0; i < 6; i++) {
      const j = (i + 1) % 6;
      walls.moveTo(hex[i][0], hex[i][1]);
      walls.quadraticCurveTo(wallC[i][0], wallC[i][1], outer[i][0], outer[i][1]);
      scal.moveTo(outer[i][0], outer[i][1]);
      scal.quadraticCurveTo(scC[i][0], scC[i][1], outer[j][0], outer[j][1]);
      if (i % 2 === 0) {
        fills.moveTo(hex[i][0], hex[i][1]);
        fills.quadraticCurveTo(wallC[i][0], wallC[i][1], outer[i][0], outer[i][1]);
        fills.quadraticCurveTo(scC[i][0], scC[i][1], outer[j][0], outer[j][1]);
        fills.quadraticCurveTo(wallC[j][0], wallC[j][1], hex[j][0], hex[j][1]);
        fills.closePath();
      }
      if (o.inner) {
        // the cell's own boundary, sampled, then offset 4 px inward and closed
        const cell = [];
        for (let q = 0; q < 8; q++) cell.push(qpt(hex[i], wallC[i], outer[i], q / 8));
        for (let q = 0; q < 10; q++) cell.push(qpt(outer[i], scC[i], outer[j], q / 10));
        for (let q = 0; q < 8; q++) cell.push(qpt(outer[j], wallC[j], hex[j], q / 8));
        cell.push(hex[j]);
        let area = 0;
        for (let q = 0; q < cell.length; q++) {
          const a = cell[q], b = cell[(q + 1) % cell.length];
          area += a[0] * b[1] - b[0] * a[1];
        }
        const sg = area > 0 ? 1 : -1;
        const n = cell.length;
        const ins = [];
        for (let q = 0; q < n; q++) {
          const a = cell[(q + n - 1) % n], b = cell[(q + 1) % n];
          const tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1;
          ins.push([cell[q][0] - (ty / tl) * 4 * sg, cell[q][1] + (tx / tl) * 4 * sg]);
        }
        // keep only the part of the inner wall that stays clear of the pinpoint end of the cell
        const kept = ins.filter((p) => Math.hypot(p[0], p[1]) > rh + 3);
        blob(inner, kept.length > 4 ? kept : ins);
      }
    }
    const hp = new Path2D();
    addPoly(hp, hex, true);
    ctx.save();
    ctx.fillStyle = P.lavender;
    ctx.globalAlpha *= o.fillA != null ? o.fillA : 0.12;
    ctx.fill(fills);
    ctx.restore();
    ctx.save();
    ctx.fillStyle = P.navyDeep;
    ctx.globalAlpha *= 0.55 * Math.min(1, alpha);
    ctx.fill(hp);
    ctx.restore();
    if (o.inner) stroke(ctx, inner, P.lavender, 0.4, 1);
    stroke(ctx, walls, P.lineWhite, alpha, o.wallW != null ? o.wallW : lw);
    stroke(ctx, scal, P.lineWhite, alpha, lw);
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
    const re = L.rng(L.hash(ID, 'upper-epi'));
    for (let x = re.range(0, 20); x < 1090; x += re.range(18, 30)) {
      uw.moveTo(x, 251);
      uw.lineTo(x + re.range(-1, 1), 257);
    }
    stroke(ctx, uw, lav, 0.32, 1);

    // palisade: tall rounded cells 16 to 20 px wide, chloroplasts along their walls
    const rp = L.rng(L.hash(ID, 'palisade'));
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
      L.hexLattice(ctx, (c) => c.arc(bx, by - br * 0.28, br * 0.5, 0, TAU), { bounds: [bx - br, by - br, br * 2, br * 1.3], r: 4.6, alpha: 0.32, seed: sd + 1 });
      const xv = new Path2D();
      for (let i = 0; i < 3; i++) {
        const vx = bx + (i - 1) * br * 0.34, vy = by - br * 0.22 + (i === 1 ? -4 : 2), vr = i === 1 ? 4.6 : 3.4;
        xv.moveTo(vx + vr, vy);
        xv.arc(vx, vy, vr, 0, TAU);
      }
      stroke(ctx, xv, P.lineWhite, 0.5, 1.1);
      L.stipple(ctx, (c) => c.arc(bx, by + br * 0.18, br * 0.52, 0.05, Math.PI - 0.05), { bounds: [bx - br, by, br * 2, br], spacing: 3.6, r: [1.0, 1.2], color: lav, alpha: 0.45, seed: sd + 2 });
    });

    // lower epidermis band y 480 to 520
    const band = new Path2D();
    wob(L, band, [[-10, 480], [540, 480], [1090, 480]], SEED + 5, 0.7, bi, false);
    stroke(ctx, band, lav, 0.6, 1.5);
    const band2 = new Path2D();
    wob(L, band2, [[-10, 520], [540, 520], [1090, 520]], SEED + 6, 0.5, bi, false);
    stroke(ctx, band2, lav, 0.8, 2);
    // epidermal cells 24 px wide
    const rc = L.rng(L.hash(ID, 'cells'));
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
    stroke(ctx, ch, lav, 0.35, 1.5);
    const ci = new Path2D();
    wob(L, ci, arcPts(924, false), SEED + 601, 0.4, bi, false);
    stroke(ctx, ci, lav, 0.28, 1);
    const wx = new Path2D();
    wob(L, wx, arcPts(912, false), SEED + 602, 0.3, bi, false);
    stroke(ctx, wx, lav, 0.24, 1, [5, 4]);
    const vm = new Path2D();
    wob(L, vm, arcPts(899, false), SEED + 603, 0.3, bi, false);
    stroke(ctx, vm, lav, 0.2, 1);
    // three aeropyle canals through the chorion, each a pair of walls 4 px apart
    const aer = new Path2D();
    for (const f of [-0.3, 0, 0.3]) {
      if (Math.abs(f) > fmax) continue;
      const sx = Math.sin(f), cy0 = Math.cos(f);
      for (const o of [-2, 2]) {
        aer.moveTo(cx + sx * 922 + cy0 * o, cy - cy0 * 922 + sx * o);
        aer.lineTo(cx + sx * 946 + cy0 * o, cy - cy0 * 946 + sx * o);
      }
    }
    stroke(ctx, aer, lav, 0.3, 1);
    // radial pores through the chorion
    const pores = new Path2D();
    let i = 0;
    for (let f = -fmax; f <= fmax; f += 0.0062, i++) {
      const j = (L.h3(i, 1, SEED + 604) - 0.5) * 0.002;
      pores.moveTo(cx + Math.sin(f + j) * 926, cy - Math.cos(f + j) * 926);
      pores.lineTo(cx + Math.sin(f + j) * 938, cy - Math.cos(f + j) * 938);
    }
    stroke(ctx, pores, lav, 0.24, 1);
    // yolk below the membrane
    L.stipple(ctx, (c) => {
      c.arc(cx, cy, 896, -Math.PI / 2 - fmax, -Math.PI / 2 + fmax);
      c.arc(cx, cy, 858, -Math.PI / 2 + fmax, -Math.PI / 2 - fmax, true);
      c.closePath();
    }, { bounds: [60, 1640, 960, 240], spacing: 7, r: [1.0, 1.6], color: lav, alpha: 0.26, density: 0.5, seed: SEED + 605 });
    if (k >= 1) {
      // bracket across the three layers and a tick scale along the chorion
      const f = 0.4;
      const p0 = [cx + Math.sin(f) * 899, cy - Math.cos(f) * 899], p1 = [cx + Math.sin(f) * 948, cy - Math.cos(f) * 948];
      L.bracket(ctx, p0[0], p0[1], p1[0], p1[1], { alpha: 0.24, cap: 10, width: 1.2, offset: -26 });
      L.ticks(ctx, cx, cy, { r: 956, n: 41, len: 6, major: 5, majorLen: 13, start: -Math.PI / 2 - 0.3, span: 0.6, color: lav, alpha: 0.2, width: 1 });
    }
  }

  // ---------------------------------------------------------------------------
  // Head capsule: 03's dark oval, 260 x 204 at (540, 1140), mouthparts straight down at the micropyle
  // ---------------------------------------------------------------------------

  // one layer of broken hatch lines across the oval (local frame), jittered on the boil
  function headHatch(path, L, deg, spacing, bi, seed) {
    const a = deg * DEG;
    const dx = Math.cos(a), dy = -Math.sin(a); // rising to the right on screen
    const nx = -dy, ny = dx;
    const R = Math.hypot(HEAD_RX, HEAD_RY) + 8;
    for (let i = 0, o = -R; o <= R; o += spacing, i++) {
      const oj = o + (L.h3(i, bi, seed) - 0.5) * 1.6;
      const aj = (L.h3(i, 3, seed + 1) - 0.5) * 5 * DEG;
      const ex = Math.cos(a + aj), ey = -Math.sin(a + aj);
      let u = -R - 20 * L.h3(i, 4, seed + 2);
      for (let piece = 0; u < R && piece < 8; piece++) {
        const len = 34 + 70 * L.h3(i, piece, seed + 3);
        const u1 = Math.min(R, u + len);
        path.moveTo(nx * oj + ex * u, ny * oj + ey * u);
        path.lineTo(nx * oj + ex * u1, ny * oj + ey * u1);
        u = u1 + 3 + 6 * L.h3(i, piece + 11, seed + 4);
      }
    }
  }

  function drawHead(ctx, L, P, k, bi, SEED, shell) {
    if (k <= 0) return;
    const lav = P.lavender, white = P.lineWhite;
    const S = HEAD_S;
    ctx.save();
    // the embryo lies inside the shell: nothing of the head crosses the inner wall
    ctx.beginPath();
    L.tracePath(ctx, shell, true);
    ctx.clip();
    ctx.translate(HEAD[0], HEAD[1]);
    ctx.rotate(HEAD_ROT);
    ctx.scale(k, k);
    // the micropyle in the capsule's own frame
    const mcx = (MICRO[1] - HEAD[1]) * Math.sin(HEAD_ROT), mcy = (MICRO[1] - HEAD[1]) * Math.cos(HEAD_ROT);
    const oval = (c) => c.ellipse(0, 0, HEAD_RX, HEAD_RY, 0, 0, TAU);
    // the dark head showing through the shell
    ctx.save();
    ctx.beginPath();
    oval(ctx);
    ctx.fillStyle = P.navyDeep;
    ctx.globalAlpha *= 0.9;
    ctx.fill();
    ctx.restore();
    // 03's cross-hatch in blueprint language: 45 and 105 degree layers, 7 px apart, building toward the mouth
    ctx.save();
    ctx.beginPath();
    oval(ctx);
    ctx.clip();
    const hh = new Path2D();
    headHatch(hh, L, 45, 7, bi, SEED + 52);
    headHatch(hh, L, 105, 7, bi, SEED + 53);
    const hg = ctx.createLinearGradient(0, 1040 - HEAD[1], 0, 1220 - HEAD[1]);
    hg.addColorStop(0, L.rgba(lav, 0.18));
    hg.addColorStop(1, L.rgba(lav, 0.32));
    ctx.strokeStyle = hg;
    ctx.lineWidth = 1;
    ctx.lineCap = 'butt';
    ctx.stroke(hh);
    ctx.restore();
    // cervical collar: two arcs along the top of the oval near y 1040, where the body tucks under it
    const col = new Path2D();
    col.ellipse(0, 0, HEAD_RX - 6, HEAD_RY - 4, 0, 1.18 * Math.PI, 1.82 * Math.PI);
    stroke(ctx, col, lav, 0.6, 1.5);
    const col2 = new Path2D();
    col2.ellipse(0, 0, HEAD_RX + 4, HEAD_RY + 2, 0, 1.22 * Math.PI, 1.78 * Math.PI);
    stroke(ctx, col2, lav, 0.35, 1);
    const hp = new Path2D();
    wob(L, hp, L.ellipsePts(0, 0, HEAD_RX, HEAD_RY, 96), SEED + 50, 0.6, bi, true);
    stroke(ctx, hp, white, 0.95, 2.5);
    // frons: the inverted-Y suture, turned a little toward the viewer's right (three-quarter view)
    const fr = new Path2D();
    fr.moveTo(7 * S, -46 * S);
    fr.quadraticCurveTo(10 * S, -26 * S, 9 * S, -5 * S);
    fr.quadraticCurveTo(-1 * S, 12 * S, -9 * S, 31 * S);
    fr.moveTo(9 * S, -5 * S);
    fr.quadraticCurveTo(19 * S, 11 * S, 28 * S, 28 * S);
    stroke(ctx, fr, white, 0.7, 1.5);
    // adfrontal lines just outside the arms
    const af = new Path2D();
    af.moveTo(3 * S, -2 * S);
    af.quadraticCurveTo(-8 * S, 14 * S, -16 * S, 30 * S);
    af.moveTo(15 * S, -2 * S);
    af.quadraticCurveTo(26 * S, 12 * S, 35 * S, 26 * S);
    stroke(ctx, af, lav, 0.35, 1);
    // mandibles: two wedges pointing at the micropyle, their tips just inside the rim (the mouthparts lift MOUTH px
    // so they read on the dark oval instead of over the rosette)
    const MOUTH = 24;
    const md = new Path2D();
    for (const [bx0, by0, sg] of [[-3, 41, -1], [19, 39, 1]]) {
      const bx = bx0 * S, by = by0 * S - MOUTH;
      const tx = mcx - bx, ty = mcy - by;
      const tl = Math.hypot(tx, ty);
      const ux = tx / tl, uy = ty / tl;
      const px = -uy, py = ux;
      md.moveTo(bx + px * 4.5 * S, by + py * 4.5 * S);
      md.lineTo(bx + ux * 14 * S, by + uy * 14 * S);
      md.lineTo(bx + ux * 9 * S + px * sg * 1.2 * S, by + uy * 9 * S + py * sg * 1.2 * S);
      md.lineTo(bx + ux * 7 * S - px * 3 * S, by + uy * 7 * S - py * 3 * S);
      md.lineTo(bx - px * 4.5 * S, by - py * 4.5 * S);
      md.closePath();
    }
    ctx.save();
    ctx.fillStyle = lav;
    ctx.globalAlpha *= 0.22;
    ctx.fill(md);
    ctx.restore();
    stroke(ctx, md, lav, 0.9, 1.3);
    // antennae: short two-jointed stubs, the far one foreshortened
    const an = new Path2D();
    an.moveTo(-24 * S, 36 * S - MOUTH);
    an.lineTo(-31 * S, 43 * S - MOUTH);
    an.lineTo(-30 * S, 51 * S - MOUTH);
    an.moveTo(39 * S, 32 * S - MOUTH);
    an.lineTo(43 * S, 38 * S - MOUTH);
    stroke(ctx, an, lav, 0.75, 1.4);
    // stemmata: six simple eyes on a C-arc on the near side, low on the front, opening toward the mouth
    const st = new Path2D();
    for (let i = 0; i < 6; i++) {
      const a = (100 + i * 36) * DEG;
      const x = -30 * S + Math.cos(a) * 12 * S, y = 16 * S + Math.sin(a) * 12 * S;
      st.moveTo(x + 5, y);
      st.arc(x, y, 5, 0, TAU);
    }
    ctx.save();
    ctx.fillStyle = white;
    ctx.globalAlpha *= 0.95;
    ctx.fill(st);
    ctx.restore();
    // lit edge, upper left
    const le = new Path2D();
    le.ellipse(-6 * S, -5 * S, 50 * S, 38 * S, 0, Math.PI * 1.08, Math.PI * 1.5);
    stroke(ctx, le, white, 0.3, 2);
    ctx.restore();
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
      const SEED = L.hash(ID) & 0xffff;

      const lav = P.lavender, white = P.lineWhite, mag = P.magenta;

      // beats (shot-local seconds)
      const B_BUILD = 0.5; // T 2.0
      const B_LATTICE = 1.0; // T 2.5
      const B_DIV2 = 1.5; // T 3.0
      const B_DIV4 = 1.75; // T 3.25
      const B_DIV8 = 2.0; // T 3.5
      const B_GLIDE = B_DIV8 + 2 * FR; // T 3.583
      const B_LARVA = 2.25; // T 3.75
      const B_BIRTH = B_BUILD + 6 * FR; // T 2.25

      // drawing index on twos since a (0 on the beat frame and the frame after)
      const drawing = (a) => Math.floor((t - a) * 12 + 1e-6);
      // hit(a, frames, ease, lead): progress that is already visible on the beat frame itself
      const hit = (a, frames, e, lead = 1) => {
        if (t < a) return 0;
        const u = clamp((t - a) / (frames * FR) + lead / frames);
        return e ? e(u) : u;
      };
      // a character pop on twos: three drawings, the middle one overshoots
      const popTwos = (a) => (t < a ? 0 : [0.72, 1.08, 1][Math.min(2, drawing(a))]);

      // ---- 1 base -----------------------------------------------------------
      ctx.fillStyle = P.navyDeep;
      ctx.fillRect(0, 0, 1080, 1920);
      const aBg = hit(B_BUILD, 6);
      if (aBg > 0) {
        ctx.save();
        ctx.globalAlpha = aBg;
        L.blueprint(ctx, { center: [540, 900], circles: 0, diagonals: 0, seed: 205 });
        ctx.restore();
      }

      // ---- 2 guide geometry --------------------------------------------------
      if (aBg > 0) {
        ctx.save();
        ctx.globalAlpha = aBg;
        const rot = 6 * DEG * (t / dur);
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
        // registration crosses where the r 470 circle meets the axis
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
        ctx.fillStyle = lav;
        ctx.globalAlpha = aBg * 0.55;
        ctx.fill(sec);
        ctx.globalAlpha = aBg;
        ctx.restore();
      }

      // ---- 3 measurement (pops on 16ths) --------------------------------------
      const pop = (a) => hit(a, 3, E.outBack);
      const kH = pop(B_LATTICE), kW = pop(B_LATTICE + 0.125), kS = pop(B_LATTICE + 0.25), kX = pop(B_LATTICE + 0.375);
      if (kH > 0) {
        L.bracket(ctx, 880, 520, 880, 1280, { p: clamp(kH), alpha: 0.6, cap: 16 });
        L.ticks(ctx, 880, 520, { length: 760, angle: Math.PI / 2, n: 9, len: 12 * kH, side: 1, baseline: false, alpha: 0.6, width: 1.5, color: lav });
      }
      if (kW > 0) {
        L.bracket(ctx, 255, 1330, 825, 1330, { p: clamp(kW), alpha: 0.6, cap: 16 });
        L.ticks(ctx, 255, 1330, { length: 570, angle: 0, n: 6, len: 10 * kW, side: -1, baseline: false, alpha: 0.55, width: 1.5, color: lav });
      }
      if (kS > 0) {
        L.ticks(ctx, 60, 120, { length: 1680, angle: Math.PI / 2, n: 42, len: 10 * kS, major: 5, majorLen: 22 * kS, side: -1, alpha: 0.5, width: 1.5, p: clamp(kS * 1.2) });
      }
      if (kX > 0) {
        L.bracket(ctx, 1040, 250, 1040, 520, { p: clamp(kX), alpha: 0.5, cap: 12, width: 1.2 });
        const lt = new Path2D();
        for (const y of [258, 330, 480]) {
          lt.moveTo(1040, y);
          lt.lineTo(1040 - 9 * clamp(kX), y);
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
        stroke(ctx, ext, lav, 0.26 * clamp(kX), 1, [4, 6]);
      }
      // shell-layer section and the r 300 guide arc on the micropyle, drawn on with the lattice
      const kSec = hit(B_LATTICE + 0.25, 6, E.outExpo, 0.5);
      if (kSec > 0) {
        drawShellSection(ctx, L, P, bi, SEED, kSec);
        ctx.save();
        ctx.beginPath();
        ctx.arc(MICRO[0], MICRO[1], 300, 90 * DEG - 80 * DEG * kSec, 90 * DEG + 80 * DEG * kSec);
        ctx.strokeStyle = lav;
        ctx.globalAlpha = 0.16;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([6, 8]);
        ctx.stroke();
        ctx.restore();
      }

      // ---- 4 leaf cross-section -----------------------------------------------------
      const kLeaf = hit(B_BUILD, 6, E.outExpo, 0.5);
      if (kLeaf > 0) drawLeaf(ctx, L, P, bi, SEED, kLeaf * 1100 - 10);

      // ---- 5 the egg ---------------------------------------------------------------
      const kOut = hit(B_BUILD, 6, E.outExpo, 0.5);
      const kIn = seg(t, B_BUILD + FR, 6, E.outExpo);
      const kRidge = hit(B_LATTICE, 4, E.outCubic, 0.6);
      const kRib = hit(B_LATTICE + FR, 4, E.outCubic, 0.6);
      // the yolk condenses into the larva in two drawings on twos, landing on T 3.917
      const kCond = t < B_LARVA ? 0 : [0.45, 0.8, 1][Math.min(2, drawing(B_LARVA))];

      const kFill = seg(t, B_BUILD + 4 * FR, 4, E.inOutSine);
      if (kFill > 0) {
        // calm the grid inside the shell
        ctx.save();
        ctx.beginPath();
        L.tracePath(ctx, g.poly, true);
        ctx.fillStyle = P.navy;
        ctx.globalAlpha = 0.5 * kFill;
        ctx.fill();
        // soft inner light round the nucleus home, falling off toward the shaded lower right
        ctx.clip();
        ctx.globalCompositeOperation = 'lighter';
        const gl = ctx.createRadialGradient(480, 780, 20, 530, 860, 430);
        gl.addColorStop(0, L.rgba(lav, 0.11));
        gl.addColorStop(0.55, L.rgba(lav, 0.04));
        gl.addColorStop(1, L.rgba(lav, 0));
        ctx.globalAlpha = kFill;
        ctx.fillStyle = gl;
        ctx.fillRect(250, 520, 580, 760);
        ctx.restore();
      }

      // shade crescent: stipple and contour hatching on the lower right, a pale rim light on the upper left
      if (kRidge > 0) {
        const yS = 520 + 780 * kRidge;
        ctx.save();
        ctx.beginPath();
        L.tracePath(ctx, g.innerPoly, true);
        ctx.clip();
        // the form turns away from the light: five navyDeep bands from the terminator, darkest at the right wall
        ctx.beginPath();
        ctx.rect(0, 0, 1080, Math.min(1280, yS));
        ctx.clip();
        ctx.fillStyle = P.navyDeep;
        for (const uB of [0.1, 0.3, 0.5, 0.7, 0.9]) {
          ctx.beginPath();
          let x = 0;
          for (let y = 548; y <= 1258; y += 6) {
            const tx = termX(y), ex = 540 + hw(y);
            x = tx + (ex - tx) * uB;
            if (y === 548) ctx.moveTo(x, 540);
            ctx.lineTo(x, y);
          }
          ctx.lineTo(x, 1290);
          ctx.lineTo(900, 1290);
          ctx.lineTo(900, 540);
          ctx.closePath();
          ctx.globalAlpha = 0.09;
          ctx.fill();
        }
        // the lit side: a faint lavender lift toward the upper left
        ctx.globalCompositeOperation = 'lighter';
        const lw = ctx.createRadialGradient(430, 700, 0, 430, 700, 240);
        lw.addColorStop(0, L.rgba(lav, 0.07));
        lw.addColorStop(1, L.rgba(lav, 0));
        ctx.globalAlpha = 1;
        ctx.fillStyle = lw;
        ctx.fillRect(190, 460, 480, 480);
        ctx.restore();
        L.stipple(ctx, g.innerPoly, {
          spacing: 7.5,
          r: [1.0, 2.2],
          color: lav,
          alpha: 0.3,
          seed: SEED + 30,
          density: (x, y) => (y > yS ? 0 : 0.88 * shadeU(x, y)),
        });
        const hp = new Path2D();
        for (let y = 548, row = 0; y <= 1258 && y <= yS; y += 6, row++) {
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
              const p = surf(th, y + (L.h3(row, piece, SEED + 402 + bi) - 0.5) * 0.9);
              pts.push(p);
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
        const rim = new Path2D();
        wob(L, rim, g.rim.filter((p) => p[1] <= yS), SEED + 31, 0.5, bi, false);
        stroke(ctx, rim, white, 0.3, 1.4);
      }

      // yolk spheres and stipple (dots on their way into the larva are drawn over its body, further down)
      const pl = new Path2D();
      if (kRidge > 0) {
        const front = (t - B_LATTICE) / (6 * FR) + 0.12;
        const sphA = 1 - kCond;
        if (sphA > 0) {
          // yolk granules: a navyLight body, an outline, and a lit quarter on the upper left
          const sp = new Path2D(), spHi = new Path2D();
          for (const s of g.spheres) {
            if (front < clamp((s.y - 520) / 760) * 0.78 + 0.1) continue;
            wob(L, sp, L.ellipsePts(s.x, s.y, s.r, s.r, Math.max(14, Math.round(s.r * 1.4))), s.seed, 0.4, bi, true);
            const rh = s.r - 2;
            spHi.moveTo(s.x - rh, s.y);
            spHi.arc(s.x, s.y, rh, Math.PI, 1.5 * Math.PI);
          }
          ctx.save();
          ctx.fillStyle = P.navyLight;
          ctx.globalAlpha = 0.35 * sphA;
          ctx.fill(sp);
          ctx.restore();
          stroke(ctx, sp, lav, 0.24 * sphA, 1);
          stroke(ctx, spHi, white, 0.2 * sphA, 1);
        }
        const pa = [new Path2D(), new Path2D(), new Path2D()];
        for (let i = 0; i < g.dots.length; i++) {
          const d = g.dots[i];
          if (front < d.delay) continue;
          const jx = (L.h3(i, bi, 31) - 0.5) * 0.7, jy = (L.h3(bi, i, 37) - 0.5) * 0.7;
          let x = d.x, y = d.y;
          if (kCond > 0 && !d.stay) {
            x = lerp(d.x, d.tx, kCond);
            y = lerp(d.y, d.ty, kCond);
          }
          const target = kCond > 0 && !d.stay ? pl : pa[d.a < 0.18 ? 0 : d.a < 0.24 ? 1 : 2];
          target.moveTo(x + jx + d.r, y + jy);
          target.arc(x + jx, y + jy, d.r, 0, TAU);
        }
        ctx.save();
        ctx.fillStyle = lav;
        const fade = 1 - 0.45 * kCond;
        ctx.globalAlpha = 0.14 * fade;
        ctx.fill(pa[0]);
        ctx.globalAlpha = 0.2 * fade;
        ctx.fill(pa[1]);
        ctx.globalAlpha = 0.28 * fade;
        ctx.fill(pa[2]);
        ctx.restore();
      }

      // cross-ribs: rungs between the keels, then light catching the rungs in the lit quadrant
      if (kRib > 0) {
        const yF = 520 + 770 * kRib;
        const rb = new Map();
        for (let i = 0; i < g.rungs.length; i++) {
          const r = g.rungs[i];
          if (r.y > yF) continue;
          const p = bucket(rb, r.a);
          const jx = (L.h3(i, bi, SEED + 301) - 0.5) * 0.7, jy = (L.h3(bi, i, SEED + 302) - 0.5) * 0.7;
          p.moveTo(r.p0[0], r.p0[1]);
          p.quadraticCurveTo(r.c[0] + jx, r.c[1] + jy, r.p2[0], r.p2[1]);
        }
        strokeBuckets(ctx, rb, lav, 0.9);
        const lp = new Path2D();
        for (const pts of g.lit) if (pts[1][1] <= yF) addPoly(lp, pts, false);
        stroke(ctx, lp, lav, 0.25, 1);
        const nodeP = new Path2D();
        for (let i = 0; i < g.nodes.length; i++) {
          const n = g.nodes[i];
          if (n[1] > yF) continue;
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
      if (kRidge > 0) {
        const yF = 520 + 770 * kRidge;
        const crest = new Map(), hi = new Map();
        const shadow = new Path2D();
        for (let k = 0; k < g.ridges.length; k++) {
          const R = g.ridges[k];
          let n = 0;
          while (n < R.pts.length && R.pts[n][1] <= yF) n++;
          if (n < 2) continue;
          const W = wobPts(L, n === R.pts.length ? R.pts : R.pts.slice(0, n), SEED + 100 + k, 0.55, bi);
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
        if (kRidge < 1) {
          // scan line at the sweep front
          const sh = hw(Math.min(yF, 1279));
          const sl = new Path2D();
          sl.moveTo(540 - sh - 30, yF);
          sl.lineTo(540 + sh + 30, yF);
          stroke(ctx, sl, white, 0.55 * (1 - kRidge), 1.5);
        }
      }

      // construction: the section ring at the widest point, front half dashed, back half dotted
      if (kSec > 0) {
        const front = new Path2D(), back = new Path2D();
        const span = 90 * kSec;
        for (let d = -span, i = 0; d <= span + 1e-9; d += 3, i++) {
          const f = surf(d * DEG, 790);
          const h = hw(790), c = TILT * h * Math.cos(d * DEG);
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
        if (kSec >= 1) {
          const et = new Path2D();
          for (const sg of [-1, 1]) {
            et.moveTo(540 + sg * 285, 780);
            et.lineTo(540 + sg * 285, 800);
          }
          et.moveTo(532, 790 - TILT * 285);
          et.lineTo(548, 790 - TILT * 285);
          stroke(ctx, et, lav, 0.5, 1.2);
        }
      }

      // ---- 7 larva -----------------------------------------------------------------
      if (kCond > 0) {
        const lv = g.larva;
        const done = kCond >= 1;
        const nS = done ? lv.N : Math.max(2, Math.round(kCond * (lv.N - 1)) + 1);
        const sCut = lv.sc[nS - 1];
        const inS = lv.inner.slice(0, nS), outS = lv.outer.slice(0, nS);
        // a growing stub ends in a round cap, not a square cut
        let capS = [];
        if (!done) {
          const wt = lv.width(sCut), nt = lv.nrm[nS - 1], pt = lv.spine[nS - 1];
          for (let i = 1; i < 10; i++) {
            const a = (i / 10) * Math.PI;
            const c = Math.cos(a), sn = Math.sin(a);
            capS.push([pt[0] + nt[0] * wt * c + nt[2] * wt * sn, pt[1] + nt[1] * wt * c + nt[3] * wt * sn]);
          }
        }
        const fillPoly = done ? lv.poly : inS.concat(capS, outS.slice().reverse());
        const fillP = new Path2D();
        wob(L, fillP, fillPoly, SEED + 40, 0.6, bi, true);
        const lineP = new Path2D();
        if (done) wob(L, lineP, lv.poly, SEED + 40, 0.6, bi, true);
        else wob(L, lineP, inS.concat(capS, outS.slice().reverse()), SEED + 40, 0.6, bi, false);
        const kf = Math.sqrt(kCond);
        // the leading 40 px of a growing stub is half as dense, so the front end feathers
        let bodyP = fillP, featherK = 1;
        if (!done) {
          let iF = nS - 1;
          while (iF > 0 && lv.sc[iF] > sCut - 40) iF--;
          bodyP = new Path2D();
          if (iF > 0) wob(L, bodyP, lv.inner.slice(0, iF + 1).concat(lv.outer.slice(0, iF + 1).reverse()), SEED + 40, 0.6, bi, true);
          featherK = 0.5;
        }
        ctx.save();
        // the body is solid in front of the shell lattice, then the condensed stipple sits on it
        for (const [col, a] of [[P.navy, 0.86 * kf], [P.navyLight, 0.3 * kf]]) {
          ctx.fillStyle = col;
          const aF = a * featherK;
          ctx.globalAlpha = aF;
          ctx.fill(fillP);
          if (bodyP !== fillP) {
            // top the settled part up to the full alpha: 1 - (1 - aF)(1 - x) = a
            ctx.globalAlpha = (a - aF) / (1 - aF);
            ctx.fill(bodyP);
          }
        }
        ctx.restore();
        // contour hatching on the shadow side of the body
        const ch = new Path2D();
        for (const h of lv.hatch) {
          if (h.s > sCut) break;
          ch.moveTo(h.p0[0], h.p0[1]);
          ch.quadraticCurveTo(h.cm[0], h.cm[1], h.p1[0], h.p1[1]);
        }
        stroke(ctx, ch, lav, 0.2 * kf, 1);
        ctx.save();
        ctx.fillStyle = lav;
        ctx.globalAlpha = lerp(0.3, 0.55, kCond);
        ctx.fill(pl);
        ctx.restore();
        stroke(ctx, lineP, lav, 0.7, 1.5);
        // spiracles on T1 and A1 to A8
        const segL = (lv.sLen - lv.s0) / 13;
        const spi = new Path2D();
        for (const i of [0, 3, 4, 5, 6, 7, 8, 9, 10]) {
          const s = lv.ticks[i].s + segL / 2;
          if (s > sCut) continue;
          const q = lv.at(s);
          const w = lv.width(s) * 0.42;
          const x = q.p[0] - q.n[0] * w, y = q.p[1] - q.n[1] * w;
          spi.moveTo(x + 4.4, y);
          spi.ellipse(x, y, 4.4, 2.5, Math.atan2(q.n[3], q.n[2]), 0, TAU);
        }
        stroke(ctx, spi, white, 0.75 * kf, 1.1);
        const tk = new Path2D();
        const legs = new Path2D();
        for (let i = 0; i < lv.ticks.length; i++) {
          const q = lv.ticks[i];
          if (q.s > sCut) break;
          const w = q.w * 0.88;
          tk.moveTo(q.p[0] + q.n[0] * w, q.p[1] + q.n[1] * w);
          tk.quadraticCurveTo(q.p[0] + q.n[2] * 5, q.p[1] + q.n[3] * 5, q.p[0] - q.n[0] * w, q.p[1] - q.n[1] * w);
          const ms = q.s + segL / 2;
          if (ms > sCut) continue;
          const mid = lv.at(ms);
          const wm = lv.width(ms);
          const bx = mid.p[0] + mid.n[0] * wm, by = mid.p[1] + mid.n[1] * wm;
          if (i < 3) {
            // true legs on T1 to T3: short and jointed
            legs.moveTo(bx, by);
            legs.lineTo(bx + mid.n[0] * 9 + mid.n[2] * 3, by + mid.n[1] * 9 + mid.n[3] * 3);
            legs.lineTo(bx + mid.n[0] * 15 - mid.n[2] * 2, by + mid.n[1] * 15 - mid.n[3] * 2);
          } else if ((i >= 5 && i <= 8) || i === 12) {
            // prolegs on A3 to A6 and A10
            legs.moveTo(bx + mid.n[2] * 7, by + mid.n[3] * 7);
            legs.quadraticCurveTo(bx + mid.n[0] * 13, by + mid.n[1] * 13, bx - mid.n[2] * 7, by - mid.n[3] * 7);
          }
          if (i === 1 || i === 10) {
            // filament bumps on T2 and A8, dorsal
            const ox = mid.p[0] - mid.n[0] * wm, oy = mid.p[1] - mid.n[1] * wm;
            legs.moveTo(ox + mid.n[2] * 5, oy + mid.n[3] * 5);
            legs.quadraticCurveTo(ox - mid.n[0] * 9, oy - mid.n[1] * 9, ox - mid.n[2] * 5, oy - mid.n[3] * 5);
          }
        }
        stroke(ctx, tk, white, 0.55 * kf, 1.4);
        stroke(ctx, legs, lav, 0.75 * kf, 1.4);
        // dorsal line
        const dpts = [];
        for (let s = lv.s0; s < Math.min(sCut, lv.sLen - 10); s += 10) {
          const q = lv.at(s);
          const w = lv.width(s) * 0.45;
          dpts.push([q.p[0] - q.n[0] * w, q.p[1] - q.n[1] * w]);
        }
        const dl = new Path2D();
        wob(L, dl, dpts, SEED + 41, 0.5, bi, false);
        stroke(ctx, dl, white, 0.22 * kf, 1, [6, 7]);
        // head capsule grows with the body
        drawHead(ctx, L, P, done ? 1 : [0.55, 1.05][Math.min(1, drawing(B_LARVA))], bi, SEED, g.innerPoly);
      }

      // micropyle rosette at the tip, clipped to the shell
      const kRos = hit(B_BUILD, 3, E.outBack);
      if (kRos > 0) {
        const flash = t > B_BUILD && t < B_BUILD + 8 * FR ? 1 - Math.abs(t - (B_BUILD + 3 * FR)) / (5 * FR) : 0;
        ctx.save();
        ctx.beginPath();
        L.tracePath(ctx, g.poly, true);
        ctx.clip();
        ctx.translate(MICRO[0], MICRO[1]);
        drawRosette(ctx, L, P, 26 * kRos, 0.8 + 0.2 * flash, 1.4, bi, SEED + 9);
        ctx.restore();
        if (flash > 0) L.glowDot(ctx, MICRO[0], MICRO[1], 10, { rays: 0, intensity: flash, seed: SEED + 10 });
      }

      // double outline, base down both sides to the tip
      if (kOut > 0) {
        const po = new Path2D();
        wob(L, po, slicePts(g.outL, g.cumOut, kOut), SEED + 1, 0.6, bi, false);
        wob(L, po, slicePts(g.outR, g.cumOut, kOut), SEED + 2, 0.6, bi, false);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        stroke(ctx, po, lav, 0.05, 16);
        stroke(ctx, po, lav, 0.08, 7);
        ctx.restore();
        stroke(ctx, po, lav, 0.85, 2.5);
      }
      if (kIn > 0) {
        const pi = new Path2D();
        wob(L, pi, slicePts(g.inL, g.cumIn, kIn), SEED + 11, 0.5, bi, false);
        wob(L, pi, slicePts(g.inR, g.cumIn, kIn), SEED + 12, 0.5, bi, false);
        if (kIn >= 1) {
          pi.moveTo(g.inL[0][0], 529);
          pi.lineTo(g.inR[0][0], 529);
        }
        stroke(ctx, pi, lav, 0.5, 1.5);
      }

      // glue: a small meniscus where the base meets the leaf
      if (kIn > 0.6) {
        const ga = clamp((kIn - 0.6) / 0.4);
        const gp = new Path2D();
        const gl = new Path2D();
        for (const sgn of [-1, 1]) {
          const cx = 540 + sgn * 180, dy = 552, dx = 540 + sgn * hw(dy);
          const ax = cx + sgn * 44;
          gp.moveTo(cx, 521);
          gp.lineTo(ax, 521);
          gp.quadraticCurveTo(cx + sgn * 8, 526, dx, dy);
          gp.closePath();
          gl.moveTo(ax, 522);
          gl.quadraticCurveTo(cx + sgn * 8, 527, dx + sgn * 1, dy);
        }
        ctx.save();
        ctx.globalAlpha = ga;
        L.stipple(ctx, gp, { bounds: [300, 518, 480, 40], spacing: 3.8, r: [1.0, 1.3], color: lav, alpha: 0.5, seed: SEED + 33 });
        stroke(ctx, gl, lav, 0.5, 1);
        ctx.restore();
      }

      // ---- 6 nuclei -------------------------------------------------------------------
      const nuclei = []; // [x, y, scale, interleave parity]
      const home = [540, 860];
      if (t >= B_BIRTH) {
        if (t < B_DIV2) {
          const stretch = clamp((tw - (B_DIV2 - 4 * FR)) / (4 * FR)) * 9;
          if (stretch > 0) nuclei.push([540, 860 - stretch, 0.9, 0], [540, 860 + stretch, 0.9, 1]);
          else nuclei.push([540, 860, 1, 0]);
        } else if (t < B_DIV4) {
          const k = popTwos(B_DIV2);
          nuclei.push([540, lerp(860, 830, k), 1, 0], [540, lerp(860, 890, k), 1, 1]);
        } else if (t < B_DIV8) {
          const k = popTwos(B_DIV4);
          nuclei.push([lerp(540, 510, k), 830, 0.95, 0], [lerp(540, 570, k), 830, 0.95, 1], [lerp(540, 570, k), 890, 0.95, 0], [lerp(540, 510, k), 890, 0.95, 1]);
        } else {
          // parents UR, LR, LL, UL split sideways: each daughter pops onto a radius-64 circle at its ring slot's angle
          // (the parent's angle plus or minus 22.5 degrees), then glides straight out to that slot, a radial expansion
          const PAR = [[570, 830, 0, 1], [570, 890, 3, 2], [510, 890, 4, 5], [510, 830, 7, 6]];
          const kp = popTwos(B_DIV8);
          const kg = t < B_GLIDE ? 0 : E.outCubic(clamp((tw - B_GLIDE) / (6 * FR) + 1 / 6));
          for (let pi = 0; pi < 4; pi++) {
            const [px, py, so, si] = PAR[pi];
            for (const [sg, slot] of [[1, so], [-1, si]]) {
              if (kCond > 0 && g.nucSkip[slot]) continue;
              const a = (-67.5 + 45 * slot) * DEG;
              const cx = lerp(px, home[0] + Math.cos(a) * 64, kp), cy = lerp(py, home[1] + Math.sin(a) * 64, kp);
              const rg = g.ring[slot];
              let x = lerp(cx, rg[0], kg), y = lerp(cy, rg[1], kg);
              let s = 0.8;
              if (kCond > 0) {
                const q = g.larva.at(g.nucS[slot]);
                x = lerp(x, q.p[0], kCond);
                y = lerp(y, q.p[1], kCond);
                s = lerp(0.62, 0.45, kCond);
              }
              nuclei.push([x, y, s, (pi + (sg > 0 ? 0 : 1)) % 2]);
            }
          }
        }
      }
      if (nuclei.length) {
        const born = E.outBack(clamp((tw - B_BIRTH + FR) / (3 * FR)));
        const ringStage = nuclei.length >= 8;
        for (let i = 0; i < nuclei.length; i++) {
          const [x, y, s0, par] = nuclei[i];
          const s = s0 * born;
          if (s <= 0) continue;
          let dmin = 1e9;
          for (let j = 0; j < nuclei.length; j++) if (j !== i) dmin = Math.min(dmin, Math.hypot(nuclei[j][0] - x, nuclei[j][1] - y));
          const crowded = dmin < 70;
          const core = (ringStage ? 8 : 10) * s;
          L.glowDot(ctx, x, y, core, {
            rays: 0,
            glow: lerp(ringStage && crowded ? 3.4 : 4.5, 1.5, kCond),
            intensity: lerp(1.3, 0.45, kCond),
            seed: SEED + 60 + i,
            twinkle: 0.12 * (1 - kCond),
          });
          ctx.save();
          ctx.beginPath();
          ctx.arc(x, y, (crowded ? 16 : 21) * s, 0, TAU);
          ctx.strokeStyle = lav;
          ctx.globalAlpha = 0.45 * (1 - kCond);
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();
          const ta = 0.7 * (1 - kCond);
          if (ta > 0) {
            L.ticks(ctx, x, y, {
              r: (crowded ? 20 : 27) * s,
              n: crowded ? 8 : 12,
              len: (crowded ? 9 : 14) * s,
              majorLen: (crowded ? 14 : 22) * s,
              major: 2,
              rot: (bi % 4) * 7.5 * DEG + (crowded ? par * 22.5 * DEG : 0),
              alpha: ta,
              color: white,
              width: 1.5,
            });
          }
        }
        // spindle between fresh daughters
        const sp = new Path2D();
        let spA = 0;
        if (t >= B_DIV2 && t < B_DIV4) {
          spA = 1 - seg(t, B_DIV2, 6);
          sp.moveTo(nuclei[0][0], nuclei[0][1]);
          sp.lineTo(nuclei[1][0], nuclei[1][1]);
        } else if (t >= B_DIV4 && t < B_DIV8) {
          spA = 1 - seg(t, B_DIV4, 6);
          sp.moveTo(nuclei[0][0], nuclei[0][1]);
          sp.lineTo(nuclei[3][0], nuclei[3][1]);
          sp.moveTo(nuclei[1][0], nuclei[1][1]);
          sp.lineTo(nuclei[2][0], nuclei[2][1]);
        } else if (t >= B_DIV8 && t < B_GLIDE + 2 * FR) {
          spA = 1 - seg(t, B_DIV8, 4);
          for (let i = 0; i < 8; i += 2) {
            sp.moveTo(nuclei[i][0], nuclei[i][1]);
            sp.lineTo(nuclei[i + 1][0], nuclei[i + 1][1]);
          }
        }
        if (spA > 0) stroke(ctx, sp, white, 0.5 * spA, 1.2, [3, 4]);
      }

      // ---- 8 magenta events -----------------------------------------------------------
      // fertilisation: the spark threads the micropyle on the beat and rises to the nucleus home
      const kSpark = t < B_BUILD ? 0 : [0.22, 0.68, 1][Math.min(2, drawing(B_BUILD))];
      const sparkY = lerp(1340, home[1], kSpark);
      if (t >= B_BUILD && t < B_BUILD + 10 * FR) {
        const fade = 1 - seg(t, B_BUILD + 4 * FR, 6);
        const tail = drawing(B_BUILD) === 0 ? 1 : 0.2;
        const tr = new Path2D();
        tr.moveTo(540, 1340);
        tr.lineTo(540, sparkY);
        ctx.save();
        const gr = ctx.createLinearGradient(540, 1340, 540, sparkY - 1);
        gr.addColorStop(0, L.rgba(mag, tail));
        gr.addColorStop(1, L.rgba(mag, 1));
        ctx.strokeStyle = gr;
        ctx.globalAlpha = fade;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke(tr);
        ctx.restore();
      }
      const ring = (x, y, a, frames, r0, r1, w) => {
        if (t < a || t >= a + frames * FR) return;
        const u = (t - a) / (frames * FR);
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, lerp(r0, r1, E.outExpo(u + 0.5 / frames)), 0, TAU);
        ctx.strokeStyle = mag;
        ctx.globalAlpha = 1 - u * u;
        ctx.lineWidth = w;
        ctx.stroke();
        ctx.restore();
      };
      ring(540, 860, B_DIV2, 4, 20, 70, 3);
      ring(540, 860, B_DIV4, 4, 30, 90, 3);
      if (t >= B_DIV8 && t < B_DIV8 + 4 * FR) {
        for (const n of nuclei) ring(n[0], n[1], B_DIV8, 4, 6, 16, 2);
      }
      // hatch signal: 8 magenta lines from the tip
      if (t >= B_LARVA && t < B_LARVA + 4 * FR) {
        const u = (t - B_LARVA) / (4 * FR);
        const hr = L.rng(L.hash(ID, 'hatch'));
        const hp = new Path2D();
        for (let i = 0; i < 8; i++) {
          const a = lerp(8, 172, i / 7) * DEG + hr.range(-5, 5) * DEG;
          const len = hr.range(40, 160);
          const r0 = 34 + 10 * u;
          const r1 = r0 + len * E.outExpo(clamp((u + 0.25) * 2.5));
          hp.moveTo(540 + Math.cos(a) * r0, 1280 + Math.sin(a) * r0);
          hp.lineTo(540 + Math.cos(a) * r1, 1280 + Math.sin(a) * r1);
        }
        ctx.save();
        ctx.strokeStyle = mag;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 1 - u * u;
        ctx.stroke(hp);
        ctx.restore();
      }

      // the spark itself
      if (t < B_BUILD + 8 * FR) {
        const lf = Math.floor(t * 24 + 1e-6);
        const flare = [0.32, 0.7, 1.12][lf] || 1;
        const twk = bi % 2 ? 0.9 : 1.06;
        const r = 11.8 * flare * twk;
        // glassy ping rings round the spark on the cut
        if (t < B_BUILD) {
          for (let k = 0; k < 2; k++) {
            const u = clamp((t - k * 3 * FR) / 0.5);
            if (u <= 0) continue;
            ctx.save();
            ctx.beginPath();
            ctx.arc(540, 1340, 16 + (k ? 170 : 300) * E.outExpo(u), 0, TAU);
            ctx.strokeStyle = lav;
            ctx.globalAlpha = (k ? 0.14 : 0.24) * (1 - u) * (1 - u);
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();
          }
        }
        L.glowDot(ctx, 540, sparkY, r, { rays: 8, rayLen: 3.4, rot: (bi % 2) * 22.5 * DEG, seed: SEED + 70, glow: 5, intensity: 1 - seg(t, B_BIRTH, 2) * 0.8 });
      }

      // ---- network nodes: magnified micropyle (left) and shell lattice (right) -------------------
      const nodeGlyph = (cx, cy, k, sx, sy, sr, seed, content) => {
        if (k <= 0) return;
        const kk = clamp(k);
        const dx = cx - sx, dy = cy - sy, dl = Math.hypot(dx, dy);
        const ux = dx / dl, uy = dy / dl;
        const ax = sx + ux * sr, ay = sy + uy * sr;
        const bx = cx - ux * 62, by = cy - uy * 62;
        const mx = (ax + bx) / 2 + uy * 46, my = (ay + by) / 2 - ux * 46;
        const lead = [];
        for (let i = 0; i <= 24; i++) {
          const u = (i / 24) * kk, v = 1 - u;
          lead.push([v * v * ax + 2 * v * u * mx + u * u * bx, v * v * ay + 2 * v * u * my + u * u * by]);
        }
        const lp = new Path2D();
        wob(L, lp, lead, seed, 0.5, bi, false);
        stroke(ctx, lp, lav, 0.5, 1.2);
        ctx.save();
        ctx.beginPath();
        ctx.arc(sx, sy, sr * Math.min(1, k), 0, TAU);
        ctx.strokeStyle = lav;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.restore();
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(k, k);
        ctx.beginPath();
        ctx.arc(0, 0, 58, 0, TAU);
        ctx.fillStyle = P.navyLight;
        ctx.globalAlpha = 0.94;
        ctx.fill();
        ctx.globalAlpha = 1;
        const rp = new Path2D();
        wob(L, rp, L.ellipsePts(0, 0, 58, 58, 64), seed + 1, 0.4, bi, true);
        stroke(ctx, rp, lav, 0.85, 2);
        const rp2 = new Path2D();
        rp2.arc(0, 0, 51, 0, TAU);
        stroke(ctx, rp2, lav, 0.35, 1);
        L.ticks(ctx, 0, 0, { r: 60, n: 36, len: 5, major: 9, majorLen: 10, color: lav, alpha: 0.4, width: 1, rot: t * 0.4 });
        ctx.beginPath();
        ctx.arc(0, 0, 50, 0, TAU);
        ctx.clip();
        content();
        ctx.restore();
      };

      nodeGlyph(175, 1440, hit(B_BUILD, 3, E.outBack), MICRO[0], MICRO[1], 36, SEED + 90, () => {
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
        drawRosette(ctx, L, P, 31, 0.9, 1.5, bi, SEED + 91, { fillA: 0.3, wallW: 1.1, inner: true });
        // the spark threading the canal, seen magnified
        if (t >= B_BUILD && t < B_BUILD + 10 * FR) {
          const fade = 1 - seg(t, B_BUILD + 4 * FR, 6);
          const yy = clamp(sparkY - MICRO[1], -70, 70);
          const tr = new Path2D();
          tr.moveTo(0, 56);
          tr.lineTo(0, yy);
          stroke(ctx, tr, mag, fade, 2.5);
          if (yy > -52) L.glowDot(ctx, 0, yy, 6, { rays: 8, seed: SEED + 92, glow: 4 });
        }
      });

      const wy = 1040, wx = 540 + hw(wy);
      const kLat = hit(B_LATTICE + 0.375, 3, E.outBack);
      if (kLat > 0 && kSec >= 0.7) {
        // the lattice inset also names the layer it magnifies: a lead down to the chorion in the shell section
        const kk = clamp(kLat);
        const f = 0.34;
        const ex = 540 + Math.sin(f) * 940, ey = 2600 - Math.cos(f) * 940;
        const lead = [];
        for (let i = 0; i <= 20; i++) {
          const u = (i / 20) * kk, v = 1 - u;
          lead.push([v * v * 872 + 2 * v * u * 912 + u * u * ex, v * v * 1498 + 2 * v * u * 1606 + u * u * (ey - 12)]);
        }
        const lp = new Path2D();
        wob(L, lp, lead, SEED + 98, 0.5, bi, false);
        stroke(ctx, lp, lav, 0.5, 1.2);
        if (kk >= 1) {
          const er = new Path2D();
          er.arc(ex, ey, 12, 0, TAU);
          stroke(ctx, er, lav, 0.5, 1.2, [4, 4]);
        }
      }
      nodeGlyph(872, 1440, kLat, wx - 6, wy, 24, SEED + 95, () => {
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
        ctx.globalAlpha = 0.6;
        ctx.fill(pits);
        ctx.globalAlpha = 1;
      });

      // ---- glyphs, each on a plate over the leaf ---------------------------------------------
      if (aBg > 0) {
        ctx.save();
        ctx.globalAlpha = aBg;
        const round = new Path2D();
        round.arc(900, 300, 68, 0, TAU);
        const plate = new Path2D();
        plate.moveTo(206, 238);
        plate.arcTo(214, 238, 214, 246, 8);
        plate.arcTo(214, 370, 206, 370, 8);
        plate.arcTo(94, 370, 94, 362, 8);
        plate.arcTo(94, 238, 102, 238, 8);
        plate.closePath();
        ctx.fillStyle = P.navyLight;
        ctx.globalAlpha = aBg * 0.6;
        ctx.fill(plate);
        // the cycle glyph's plate is near-opaque, so the palisade cells never show through its arcs
        ctx.fillStyle = P.navy;
        ctx.globalAlpha = aBg * 0.92;
        ctx.fill(round);
        ctx.fillStyle = P.navyLight;
        ctx.globalAlpha = aBg * 0.4;
        ctx.fill(round);
        ctx.globalAlpha = aBg;
        plate.addPath(round);
        stroke(ctx, plate, lav, 0.25, 1);
        // cycle glyph, egg arc lit
        const cx = 900, cy = 300;
        for (let q = 0; q < 4; q++) {
          const a0 = (-90 + q * 90 + 6) * DEG, a1 = (-90 + (q + 1) * 90 - 6) * DEG;
          ctx.beginPath();
          ctx.arc(cx, cy, 44, a0, a1);
          ctx.strokeStyle = q === 0 ? white : lav;
          ctx.globalAlpha = aBg * (q === 0 ? 0.95 : 0.25);
          ctx.lineWidth = q === 0 ? 3 : 2;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
        // four radial gap ticks between the stages, so the four-part split reads at phone size
        const gt = new Path2D();
        for (let q = 0; q < 4; q++) {
          const a = (-90 + q * 90) * DEG;
          gt.moveTo(cx + Math.cos(a) * 40, cy + Math.sin(a) * 40);
          gt.lineTo(cx + Math.cos(a) * 48, cy + Math.sin(a) * 48);
        }
        ctx.globalAlpha = aBg;
        stroke(ctx, gt, lav, 0.5, 1.2);
        L.ticks(ctx, cx, cy, { r: 52, n: 48, len: 4, major: 12, majorLen: 9, color: lav, alpha: 0.3, width: 1 });
        L.glowDot(ctx, cx + Math.cos(-45 * DEG) * 44, cy + Math.sin(-45 * DEG) * 44, 3.5, { rays: 4, seed: SEED + 80, glow: 5 });
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, TAU);
        ctx.fillStyle = lav;
        ctx.globalAlpha = aBg * 0.5;
        ctx.fill();
        // division counter: columns of 1, 2, 4 and 8 cells light as the nuclei divide
        const lit = [B_BIRTH, B_DIV2, B_DIV4, B_DIV8];
        for (let c = 0; c < 4; c++) {
          const n = 1 << c;
          const k = hit(lit[c], 3, E.outBack);
          for (let j = 0; j < n; j++) {
            const x = 112 + c * 22, y = 352 - (j + 1) * 12;
            ctx.globalAlpha = aBg * 0.3;
            ctx.strokeStyle = lav;
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, 10, 9);
            if (k > 0) {
              ctx.globalAlpha = Math.min(1, k) * 0.9;
              ctx.fillStyle = white;
              const sz = 10 * Math.min(1.15, k);
              ctx.fillRect(x + 5 - sz / 2, y + 4.5 - (sz * 0.9) / 2, sz, sz * 0.9);
            }
          }
        }
        ctx.globalAlpha = aBg * 0.5;
        ctx.beginPath();
        ctx.moveTo(104, 356);
        ctx.lineTo(196, 356);
        ctx.strokeStyle = lav;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }
    },
  });
})();
