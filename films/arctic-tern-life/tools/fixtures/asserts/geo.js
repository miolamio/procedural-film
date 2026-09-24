// Check 8 starter. Invariants of lib.geo on the fixture tables, plus the pixels helper the other
// assert files use. Loaded only by check.cjs --fixtures, after the engine. No Math.random / Date.
FILM.assert('profile hw matches the table at every node', () => {
  const g = FILM.lib.geo('egg');
  const raw = FILM.GEO.egg;
  for (let i = 0; i < raw.ys.length; i++) FILM.expect.near(g.hw(raw.ys[i]), raw.hs[i], 1e-6);
});

FILM.assert('profile hw stays monotone between nodes', () => {
  const g = FILM.lib.geo('egg');
  const raw = FILM.GEO.egg;
  for (let i = 0; i < raw.ys.length - 1; i++) {
    const y0 = raw.ys[i];
    const y1 = raw.ys[i + 1];
    const up = raw.hs[i + 1] >= raw.hs[i];
    let prev = g.hw(y0);
    for (let s = 1; s <= 8; s++) {
      const h = g.hw(y0 + ((y1 - y0) * s) / 8);
      if (up) FILM.expect.true(h + 1e-4 >= prev, `egg hw fell between y ${y0} and ${y1}: ${prev} -> ${h}`);
      else FILM.expect.true(h <= prev + 1e-4, `egg hw rose between y ${y0} and ${y1}: ${prev} -> ${h}`);
      prev = h;
    }
  }
});

FILM.assert('profile outline is a closed loop', () => {
  const p = FILM.lib.geo('egg').outline();
  FILM.expect.true(p.length >= 4, 'outline too short');
  FILM.expect.near(p[0], p[p.length - 1], 1e-6);
});

FILM.assert('sampled outline returns to its start', () => {
  const p = FILM.lib.geo('leaf').outline();
  const a = p[0];
  const b = p[p.length - 1];
  const gap = Math.hypot(a[0] - b[0], a[1] - b[1]);
  FILM.expect.true(gap < 16, `leaf outline gap is ${gap}px`);
});

FILM.assert('a horizontal profile is linear half-heights about cy', () => {
  const g = FILM.lib.geo('eggSide');
  const raw = FILM.GEO.eggSide;
  FILM.expect.eq(g.axis, 'x');
  for (let i = 0; i < raw.xs.length; i++) FILM.expect.near(g.hw(raw.xs[i]), raw.hs[i], 1e-6);
  const mid = 180 + (260 - 180) * 0.5;
  FILM.expect.near(g.hw(mid), 36 + (48 - 36) * 0.5, 1e-6);
  FILM.expect.near(g.y(260, -1), 280 - 48, 1e-6);
  FILM.expect.near(g.y(260, 1), 280 + 48, 1e-6);
  const p = g.outline(4);
  FILM.expect.near(p[0], p[p.length - 1], 1e-6);
});

FILM.assert('outline parts trace the outer union, and at() scales about a point', () => {
  const g = FILM.lib.geo('pair');
  const loop = g.outline(4);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < loop.length; i++) {
    const p = loop[i];
    if (p[0] < minX) minX = p[0];
    if (p[1] < minY) minY = p[1];
    if (p[0] > maxX) maxX = p[0];
    if (p[1] > maxY) maxY = p[1];
  }
  FILM.expect.near(minX, 620, 2);
  FILM.expect.near(maxX, 960, 2);
  FILM.expect.near(minY, 200, 2);
  FILM.expect.near(maxY, 340, 2);
  const far = g.at(2, [620, 200]).outline(4);
  let hit = false;
  for (let i = 0; i < far.length; i++) {
    if (Math.hypot(far[i][0] - 1300, far[i][1] - 480) < 4) hit = true;
  }
  FILM.expect.true(hit, 'zoomed union missed the corner at (1300, 480)');
});

FILM.assert('pt returns a named anchor and throws on an unknown name', () => {
  const g = FILM.lib.geo('sun');
  FILM.expect.near(g.pt('centre'), [860, 360], 0);
  FILM.expect.throws(() => g.pt('no-such-point'));
});

FILM.assert('pixels hash is stable for the same drawing', () => {
  const paint = () => {
    const c = FILM.makeCanvas(8, 8);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#123456';
    ctx.fillRect(0, 0, 8, 8);
    ctx.fillStyle = '#abcdef';
    ctx.fillRect(2, 2, 3, 3);
    return FILM.pixels(c);
  };
  const a = paint();
  const b = paint();
  FILM.expect.eq(a.hash(), b.hash());
  FILM.expect.true(a.count((r) => r === 0x12) > a.count((r) => r === 0xab), 'the background covers more than the inset');
});
