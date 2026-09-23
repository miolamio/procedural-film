// Check 8. Poisson-disk scatter, divergence-free flow, and order-independent advection.
// Loaded only by check.cjs --fixtures. No Math.random / Date.
FILM.assert('scatter stays inside, keeps the radius, and returns the cached array', () => {
  const w = 480;
  const h = 360;
  const r = 16;
  const rect = [[0, 0], [w, 0], [w, h], [0, h]];
  const opts = { r: r, seed: 3, max: 8000 };
  const a = FILM.lib.scatter(rect, opts);
  const b = FILM.lib.scatter(rect, opts);
  FILM.expect.true(a === b, 'a second call should return the same array');
  FILM.expect.true(a.length > 50, 'scatter produced ' + a.length + ' points');
  const limit = r * (1 - 1e-6);
  for (let i = 0; i < a.length; i++) {
    const p = a[i];
    FILM.expect.true(FILM.lib.polyContains(rect, p.x, p.y), 'point outside the clip at ' + p.x + ',' + p.y);
    for (let j = i + 1; j < a.length; j++) {
      const q = a[j];
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      if (d < limit) FILM.expect.true(false, 'points ' + i + ' and ' + j + ' are ' + d + ' apart, under ' + r);
    }
  }
});

FILM.assert('scatter reaches 60% of the hexagonal packing of a rectangle', () => {
  const w = 480;
  const h = 360;
  const r = 16;
  const rect = [[0, 0], [w, 0], [w, h], [0, h]];
  const pts = FILM.lib.scatter(rect, { r: r, seed: 3, max: 8000 });
  const nTheory = (w * h) / ((Math.sqrt(3) / 2) * r * r);
  FILM.expect.true(pts.length >= 0.6 * nTheory, pts.length + ' points is under 60% of ' + nTheory.toFixed(1));
});

FILM.assert('scatter density widens the local exclusion radius', () => {
  const w = 400;
  const h = 300;
  const r = 20;
  const rect = [[0, 0], [w, 0], [w, h], [0, h]];
  const wide = FILM.lib.scatter(rect, { r: r, seed: 8, max: 8000, density: function () { return 0.25; } });
  const again = FILM.lib.scatter(rect, { r: r, seed: 8, max: 8000, density: function () { return 0.25; } });
  FILM.expect.true(wide === again, 'a density that agrees on the 8x8 grid should share the cache');
  const need = (r / Math.sqrt(0.25)) * (1 - 1e-6);
  let min = Infinity;
  for (let i = 0; i < wide.length; i++) {
    for (let j = i + 1; j < wide.length; j++) {
      const d = Math.hypot(wide[i].x - wide[j].x, wide[i].y - wide[j].y);
      if (d < min) min = d;
    }
  }
  FILM.expect.true(min >= need, 'min distance ' + min + ' is under the widened radius ' + (r / Math.sqrt(0.25)));
});

FILM.assert('scatter accepts a path function and keeps every point inside it', () => {
  const bounds = [120, 240, 360, 280];
  const clip = function (ctx) { ctx.rect(bounds[0], bounds[1], bounds[2], bounds[3]); };
  const pts = FILM.lib.scatter(clip, { r: 22, seed: 4, max: 2000, bounds: bounds });
  FILM.expect.true(pts.length > 15, 'function clip produced ' + pts.length);
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const inside = p.x >= bounds[0] && p.x < bounds[0] + bounds[2] && p.y >= bounds[1] && p.y < bounds[1] + bounds[3];
    FILM.expect.true(inside, 'point outside the function clip at ' + p.x + ',' + p.y);
  }
});

FILM.assert('flow is divergence-free on a 10 by 10 grid', () => {
  const opts = { seed: 5, scale: 180, speed: 48, curl: true };
  const T = 1.7;
  const eps = 0.5;
  let worst = 0;
  for (let j = 0; j < 10; j++) {
    for (let i = 0; i < 10; i++) {
      const x = 80 + i * 90;
      const y = 120 + j * 140;
      const vx1 = FILM.lib.flow(x + eps, y, T, opts).x;
      const vx0 = FILM.lib.flow(x - eps, y, T, opts).x;
      const vy1 = FILM.lib.flow(x, y + eps, T, opts).y;
      const vy0 = FILM.lib.flow(x, y - eps, T, opts).y;
      const div = (vx1 - vx0) / (2 * eps) + (vy1 - vy0) / (2 * eps);
      if (Math.abs(div) > worst) worst = Math.abs(div);
    }
  }
  FILM.expect.true(worst < 1e-3, 'max |div| ' + worst);
});

FILM.assert('advect(p0, T) does not depend on the order of T', () => {
  const p0 = { x: 240, y: 480 };
  const opts = { seed: 9, scale: 260, speed: 36, curl: true };
  const steps = 10;
  const orderA = [0.25, 1, 0.5, 1.75];
  const orderB = [1.75, 0.5, 1, 0.25];
  const A = orderA.map(function (T) { return FILM.lib.advect(p0, T, opts, steps); });
  const B = orderB.map(function (T) { return FILM.lib.advect(p0, T, opts, steps); });
  for (let i = 0; i < orderA.length; i++) {
    const back = orderB.indexOf(orderA[i]);
    FILM.expect.near(A[i].x, B[back].x, 0);
    FILM.expect.near(A[i].y, B[back].y, 0);
  }
  const again = FILM.lib.advect(p0, 1, opts, steps);
  FILM.expect.near(again.x, A[1].x, 0);
  FILM.expect.near(again.y, A[1].y, 0);
  const fromArray = FILM.lib.advect([p0.x, p0.y], 1, opts, steps);
  FILM.expect.near(fromArray.x, A[1].x, 0);
  FILM.expect.near(fromArray.y, A[1].y, 0);
});
