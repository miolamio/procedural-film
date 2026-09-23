// Check 8: lib.resample and lib.morph. Closed contours, arc length, cyclic alignment.
// No Math.random / Date. Loaded only by check.cjs --fixtures.

function morphLen(pts, closed) {
  let L = 0;
  const n = pts.length;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    L += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return L;
}

function morphOpened(pts) {
  if (pts.length > 1 && Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) <= 1e-6) return pts.slice(0, -1);
  return pts;
}

function morphRadial(pts) {
  let cx = 0, cy = 0;
  for (let i = 0; i < pts.length; i++) {
    cx += pts[i][0];
    cy += pts[i][1];
  }
  cx /= pts.length;
  cy /= pts.length;
  let mean = 0;
  const r = new Array(pts.length);
  for (let i = 0; i < pts.length; i++) {
    r[i] = Math.hypot(pts[i][0] - cx, pts[i][1] - cy);
    mean += r[i];
  }
  mean /= pts.length;
  let max = 0;
  for (let i = 0; i < r.length; i++) {
    const d = Math.abs(r[i] - mean);
    if (d > max) max = d;
  }
  return max;
}

function morphSimple(pts) {
  const n = pts.length;
  const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const c = pts[j], d = pts[(j + 1) % n];
      const d1 = cross(a, b, c), d2 = cross(a, b, d), d3 = cross(c, d, a), d4 = cross(c, d, b);
      if (d1 * d2 < 0 && d3 * d4 < 0) return false;
    }
  }
  return true;
}

function morphReverse(pts) {
  const out = [pts[0]];
  for (let i = pts.length - 1; i >= 1; i--) out.push(pts[i]);
  return out;
}

FILM.assert('p=0 matches resample(a) and p=1 matches resample(b)', () => {
  const L = FILM.lib;
  const a = L.ellipsePts(400, 900, 110, 110, 160);
  const b = L.ellipsePts(400, 900, 240, 240, 160);
  FILM.expect.near(L.morph(a, b, 0), L.resample(a, 256, true), 1e-6);
  FILM.expect.near(L.morph(a, b, 1), L.resample(b, 256, true), 1e-6);
  FILM.expect.near(L.morph(a, b, 0, { ease: 'inOutCubic' }), L.resample(a, 256, true), 1e-6);
  FILM.expect.near(L.morph(a, b, 1, { ease: 'inOutCubic', n: 128 }), L.resample(b, 128, true), 1e-6);
  const egg = L.geo('egg').outline();
  const leaf = L.geo('leaf').outline();
  FILM.expect.near(L.morph(egg, leaf, 0), L.resample(egg, 256, true), 1e-6);
  FILM.expect.near(L.morph(egg, leaf, 1, { align: 'index' }), L.resample(leaf, 256, true), 1e-6);
  FILM.expect.near(L.morph(egg, leaf, 0, { align: 'index', n: 64 }), L.resample(egg, 64, true), 1e-6);
});

FILM.assert('morph keeps n points and resample keeps the perimeter', () => {
  const L = FILM.lib;
  const a = L.ellipsePts(0, 0, 80, 80, 96);
  const b = L.rectPts(-70, -50, 140, 100, 6);
  for (let i = 0; i <= 20; i++) {
    FILM.expect.eq(L.morph(a, b, i / 20).length, 256);
    FILM.expect.eq(L.morph(a, b, i / 20, { n: 48, ease: 'outCubic' }).length, 48);
  }
  const sq = [[0, 0], [100, 0], [100, 100], [0, 100]];
  const sqR = L.resample(sq, 8, true);
  FILM.expect.near(sqR, [[0, 0], [50, 0], [100, 0], [100, 50], [100, 100], [50, 100], [0, 100], [0, 50]], 1e-6);
  FILM.expect.near(morphLen(sqR, true), 400, 1e-6);
  const line = [[0, 0], [0, 100]];
  const lineR = L.resample(line, 5, false);
  FILM.expect.eq(lineR.length, 5);
  FILM.expect.near(lineR[0], [0, 0], 1e-9);
  FILM.expect.near(lineR[4], [0, 100], 1e-9);
  FILM.expect.near(morphLen(lineR, false), 100, 1e-6);
  for (const src of [L.geo('egg').outline(), L.geo('leaf').outline(), L.ellipsePts(20, 20, 150, 90, 80)]) {
    const closed = morphOpened(src);
    const base = morphLen(closed, true);
    const got = morphLen(L.resample(src, 256, true), true);
    const err = Math.abs(got - base) / base;
    FILM.expect.true(err <= 0.005, `perimeter drift ${(err * 100).toFixed(3)}% (base ${base.toFixed(2)}, got ${got.toFixed(2)})`);
  }
});

FILM.assert('a circle morphed into another circle stays a circle', () => {
  const L = FILM.lib;
  const a = L.ellipsePts(540, 960, 100, 100, 180);
  const b = L.ellipsePts(540, 960, 230, 230, 180);
  const rev = L.ellipsePts(540, 960, 230, 230, 180);
  const bRev = morphReverse(rev);
  for (let i = 0; i <= 20; i++) {
    const p = i / 20;
    const s1 = morphRadial(L.morph(a, b, p));
    const s2 = morphRadial(L.morph(a, bRev, p));
    FILM.expect.true(s1 < 1, `radial scatter ${s1.toFixed(3)}px at p=${p}`);
    FILM.expect.true(s2 < 1, `reversed radial scatter ${s2.toFixed(3)}px at p=${p}`);
  }
  const top = morphRadial(L.morph(a, bRev, 0.5, { align: 'top' }));
  FILM.expect.true(top < 1, `top-aligned radial scatter ${top.toFixed(3)}px`);
});

FILM.assert('morph of two convex shapes does not self-intersect', () => {
  const L = FILM.lib;
  const disk = L.ellipsePts(0, 0, 150, 150, 96);
  const box = L.rectPts(-120, -80, 240, 160, 8);
  for (let s = 0; s <= 20; s++) {
    const p = s / 20;
    const m = L.morph(disk, box, p, { n: 128 });
    FILM.expect.true(morphSimple(m), `self-intersection at p=${p}`);
  }
  FILM.expect.true(morphSimple(L.morph(disk, box, 0.5)), 'default-n morph self-intersects at p=0.5');
});

FILM.assert('morph is deterministic', () => {
  const L = FILM.lib;
  const egg = L.geo('egg').outline();
  const leaf = L.geo('leaf').outline();
  const opts = { n: 96, align: 'auto', ease: 'inOutCubic' };
  FILM.expect.near(L.morph(egg, leaf, 0.37, opts), L.morph(egg, leaf, 0.37, opts), 0);
  FILM.expect.near(L.morph(egg, leaf, 0.5), L.morph(egg, leaf, 0.5), 0);
});
