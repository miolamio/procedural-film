// Check 8. Voronoi cells: containment, convexity, a tiling of the clip, the square case, cache.
// Loaded only by check.cjs --fixtures. No Math.random / Date.
(function () {
  const L = FILM.lib;

  function area(poly) {
    let a = 0;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      a += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
    }
    return a * 0.5;
  }

  function contains(poly, x, y, eps) {
    const e = eps == null ? 1e-6 : eps;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const cr = (poly[i][0] - poly[j][0]) * (y - poly[j][1]) - (poly[i][1] - poly[j][1]) * (x - poly[j][0]);
      if (cr < -e) return false;
    }
    return poly.length >= 3;
  }

  function convex(poly) {
    let sign = 0;
    const n = poly.length;
    for (let i = 0; i < n; i++) {
      const a = poly[i], b = poly[(i + 1) % n], c = poly[(i + 2) % n];
      const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
      if (Math.abs(cr) <= 1e-6) continue;
      const s = cr > 0 ? 1 : -1;
      if (sign && s !== sign) return false;
      sign = s;
    }
    return n >= 3;
  }

  function bbox(poly) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i];
      if (p[0] < x0) x0 = p[0];
      if (p[1] < y0) y0 = p[1];
      if (p[0] > x1) x1 = p[0];
      if (p[1] > y1) y1 = p[1];
    }
    return [x0, y0, x1, y1];
  }

  FILM.assert('each voronoi cell contains its site and is convex', () => {
    const clip = [40, 80, 500, 360];
    const rnd = L.rng(21);
    const sites = [];
    for (let i = 0; i < 24; i++) sites.push([40 + rnd() * 500, 80 + rnd() * 360]);
    for (const relax of [0, 2]) {
      const cells = L.voronoi(sites, clip, { relax });
      FILM.expect.eq(cells.length, sites.length);
      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        FILM.expect.true(cell.poly.length >= 3, `relax ${relax} cell ${i} is empty`);
        FILM.expect.true(convex(cell.poly), `relax ${relax} cell ${i} is not convex`);
        FILM.expect.true(contains(cell.poly, cell.site[0], cell.site[1], 1e-3), `relax ${relax} cell ${i} misses its site`);
      }
    }
  });

  FILM.assert('cell areas tile the clip and do not overlap', () => {
    const x = 40, y = 80, w = 500, h = 360;
    const rnd = L.rng(21);
    const sites = [];
    for (let i = 0; i < 24; i++) sites.push([x + rnd() * w, y + rnd() * h]);
    const clipArea = w * h;
    for (const relax of [0, 1]) {
      const cells = L.voronoi(sites, [x, y, w, h], { relax });
      let sum = 0;
      for (let i = 0; i < cells.length; i++) sum += Math.abs(area(cells[i].poly));
      const err = Math.abs(sum - clipArea) / clipArea;
      FILM.expect.true(err <= 0.005, `relax ${relax} area error ${(err * 100).toFixed(3)}% (${sum} vs ${clipArea})`);
      const sample = L.rng(2000 + relax);
      let bad = 0;
      for (let k = 0; k < 2000; k++) {
        const px = x + sample() * w;
        const py = y + sample() * h;
        let n = 0;
        for (let i = 0; i < cells.length; i++) {
          if (contains(cells[i].poly, px, py, 1e-6)) n++;
        }
        if (n !== 1) bad++;
      }
      FILM.expect.eq(bad, 0);
    }
  });

  FILM.assert('four corner sites of a square are four equal squares', () => {
    const sites = [[0, 0], [100, 0], [100, 100], [0, 100]];
    const cells = L.voronoi(sites, [0, 0, 100, 100]);
    const want = [[0, 0, 50, 50], [50, 0, 100, 50], [50, 50, 100, 100], [0, 50, 50, 100]];
    FILM.expect.eq(cells.length, 4);
    for (let i = 0; i < 4; i++) {
      FILM.expect.near(bbox(cells[i].poly), want[i], 1e-4);
      FILM.expect.near(Math.abs(area(cells[i].poly)), 2500, 1e-3);
      FILM.expect.true(contains(cells[i].poly, sites[i][0], sites[i][1], 1e-4), `corner ${i} is outside its square`);
      FILM.expect.true(convex(cells[i].poly), `corner ${i} is not convex`);
    }
  });

  FILM.assert('voronoi is deterministic and cached', () => {
    const clip = [[10, 20], [310, 15], [320, 250], [20, 260]];
    const sites = [[40, 50], [200, 60], [80, 180], [250, 200], [160, 140]];
    const a = L.voronoi(sites, clip, { relax: 1 });
    const b = L.voronoi(sites.map((p) => [p[0], p[1]]), clip.map((p) => [p[0], p[1]]), { relax: 1 });
    FILM.expect.true(a === b, 'equal inputs should return the cached diagram');
    FILM.expect.eq(a.length, sites.length);
    for (let i = 0; i < a.length; i++) {
      FILM.expect.near(a[i].site, b[i].site, 0);
      FILM.expect.near(a[i].poly, b[i].poly, 0);
      FILM.expect.true(convex(a[i].poly), `cached cell ${i} is not convex`);
    }
    const c = L.voronoi(sites, clip, { relax: 0 });
    FILM.expect.true(c !== a, 'relax is part of the cache key');
    const d = L.voronoi(sites.map((p) => [p[0], p[1]]), [[10, 20], [310, 15], [320, 250], [20, 260]], { relax: 0 });
    FILM.expect.true(d === c, 'relax 0 should hit the cache on a second call');
  });
})();
