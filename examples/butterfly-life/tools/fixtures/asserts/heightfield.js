// lib.heightfield, lib.heightMesh, lib.heightPoint: one surface in three modes that agree.
// Loaded only by check.cjs --fixtures. No Math.random / Date.

function hfPaint(w, h, draw) {
  const canvas = FILM.makeCanvas(w, h);
  const ctx = canvas.getContext('2d');
  draw(ctx);
  return canvas;
}

function hfPixel(canvas, x, y) {
  const d = canvas.getContext('2d', { willReadFrequently: true }).getImageData(x, y, 1, 1).data;
  return [d[0], d[1], d[2], d[3]];
}

const hfDome = (u, v) => 1 - Math.hypot(u - 0.5, v - 0.5) * 1.6;

FILM.assert('fill: a flat field is one ramp colour, inside the box only', () => {
  const L = FILM.lib;
  const spec = ['ink', 'sun'];
  const c = hfPaint(80, 60, (ctx) => {
    L.heightfield(ctx, () => 0.5, { box: [10, 10, 40, 30], range: [0, 1], ramp: spec, shade: 0.8 });
  });
  const want = L.rampRGB(spec, 0.5);
  for (const [x, y] of [[12, 12], [30, 25], [47, 37]]) {
    const p = hfPixel(c, x, y);
    FILM.expect.near(p.slice(0, 3), want, 2);
    FILM.expect.eq(p[3], 255);
  }
  const outside = FILM.pixels(c).count((r, g, b, a, x, y) => a > 0 && (x < 10 || y < 10 || x >= 50 || y >= 40));
  FILM.expect.eq(outside, 0);
});

FILM.assert('range and steps: heights clamp to the ends, steps make flat bands', () => {
  const L = FILM.lib;
  const spec = ['night', 'white'];
  const ramp = (u) => u; // a slope from 0 at the left to 1 at the right
  const c = hfPaint(200, 20, (ctx) => {
    L.heightfield(ctx, ramp, { box: [0, 0, 200, 20], range: [0.25, 0.75], ramp: spec, shade: 0, cell: 1, res: 200, steps: 4 });
  });
  FILM.expect.near(hfPixel(c, 10, 10).slice(0, 3), L.rampRGB(spec, 0), 1);
  FILM.expect.near(hfPixel(c, 190, 10).slice(0, 3), L.rampRGB(spec, 1), 1);
  // four bands: the middle of each is the band's own colour (0, 1/3, 2/3, 1)
  const mids = [0.25 + 0.5 * 0.125, 0.25 + 0.5 * 0.375, 0.25 + 0.5 * 0.625, 0.25 + 0.5 * 0.875];
  mids.forEach((u, k) => FILM.expect.near(hfPixel(c, Math.floor(u * 200), 10).slice(0, 3), L.rampRGB(spec, k / 3), 1));
});

FILM.assert('the mesh from straight above lands on the map', () => {
  const L = FILM.lib;
  const box = [60, 80, 300, 240];
  const top = { mode: 'mesh', box, rot: [Math.PI / 2, 0, 0], persp: 0, range: [0, 1] };
  for (const [u, v] of [[0, 0], [1, 1], [0.3, 0.7], [0.5, 0.5], [0.9, 0.2]]) {
    const map = L.heightPoint(hfDome, u, v, { box, range: [0, 1] });
    const mesh = L.heightPoint(hfDome, u, v, top);
    FILM.expect.near(mesh.slice(0, 2), map.slice(0, 2), 1e-6);
    FILM.expect.near(map.slice(0, 2), [box[0] + u * box[2], box[1] + v * box[3]], 1e-9);
  }
  // and its filled quads carry the map's colours (flat per quad against bilinear: a small tolerance)
  const spec = ['night', 'sun']; // smooth: a hard stop (terrain's coast) would split a flat quad
  const a = hfPaint(420, 400, (ctx) => L.heightfield(ctx, hfDome, { box, range: [0, 1], ramp: spec, shade: 0, res: 40 }));
  const b = hfPaint(420, 400, (ctx) => L.heightfield(ctx, hfDome, Object.assign({ ramp: spec, shade: 0, res: 40, lines: null }, top)));
  for (const [x, y] of [[120, 140], [210, 200], [300, 270], [90, 300]]) {
    FILM.expect.near(hfPixel(b, x, y).slice(0, 3), hfPixel(a, x, y).slice(0, 3), 14);
  }
});

FILM.assert('heightPoint on the mesh is project3d of the same vertex', () => {
  const L = FILM.lib;
  const box = [100, 400, 800, 600];
  const o = { mode: 'mesh', box, range: [0, 1], rot: [0.9, 0.4, 0.05], persp: 1800, lift: 150 };
  const u = 0.35, v = 0.6;
  const p = L.heightPoint(hfDome, u, v, o);
  const q = L.project3d([(u - 0.5) * 800, hfDome(u, v) * 150, (v - 0.5) * 600], { at: [500, 700], rot: o.rot, persp: 1800 });
  FILM.expect.near(p, q, 1e-9);
});

FILM.assert('a grid and the function it samples give one surface', () => {
  const L = FILM.lib;
  const n = 9;
  const rows = [];
  const data = new Float32Array(n * n);
  for (let j = 0; j < n; j++) {
    const row = [];
    for (let i = 0; i < n; i++) {
      const h = hfDome(i / (n - 1), j / (n - 1));
      row.push(h);
      data[j * n + i] = h;
    }
    rows.push(row);
  }
  const box = [0, 0, 160, 160];
  const fromFn = L.heightfield(hfPaint(4, 4, () => {}).getContext('2d'), hfDome, { box, res: n - 1, fill: false, levels: 0 });
  const fromRows = L.heightfield(hfPaint(4, 4, () => {}).getContext('2d'), rows, { box, fill: false, levels: 0 });
  FILM.expect.eq([fromRows.nx, fromRows.ny], [n - 1, n - 1]);
  FILM.expect.near([fromRows.lo, fromRows.hi], [fromFn.lo, fromFn.hi], 1e-6);
  for (const [u, v] of [[0.5, 0.5], [0.25, 0.75], [1, 0]]) {
    FILM.expect.near(L.heightPoint(rows, u, v, { box })[2], L.heightPoint({ w: n, h: n, data }, u, v, { box })[2], 1e-6);
  }
});

FILM.assert('contour: a count spreads levels inside the range; a cone gives one ring per level', () => {
  const L = FILM.lib;
  const cone = (u, v) => 1 - 2 * Math.hypot(u - 0.5, v - 0.5);
  const c = hfPaint(200, 200, () => {});
  const r = L.heightfield(c.getContext('2d'), cone, { mode: 'contour', box: [0, 0, 200, 200], range: [0, 1], levels: 4 });
  FILM.expect.near(r.levels, [0.2, 0.4, 0.6, 0.8], 1e-12);
  FILM.expect.eq(r.drawn, 4);
  FILM.expect.true(FILM.pixels(c).count((rr, g, b, a) => a > 0) > 0, 'no contour pixels');
  const s = L.heightfield(c.getContext('2d'), cone, { mode: 'contour', box: [0, 0, 200, 200], levels: [0.5] });
  FILM.expect.eq(s.levels, [0.5]);
});

FILM.assert('mesh: every quad once, cut leaves the low ones out', () => {
  const L = FILM.lib;
  const box = [20, 20, 200, 200];
  const c = hfPaint(240, 240, () => {});
  const all = L.heightfield(c.getContext('2d'), hfDome, { mode: 'mesh', box, res: 10 });
  FILM.expect.eq(all.drawn, 100);
  const none = hfPaint(240, 240, (ctx) => L.heightfield(ctx, hfDome, { mode: 'mesh', box, res: 10, cut: 5 }));
  FILM.expect.eq(FILM.pixels(none).count((r, g, b, a) => a > 0), 0);
  const some = L.heightfield(c.getContext('2d'), hfDome, { mode: 'mesh', box, res: 10, range: [0, 1], cut: 0.5 });
  FILM.expect.true(some.drawn > 0 && some.drawn < 100, `cut kept ${some.drawn} of 100`);
});

FILM.assert('heightMesh is a grid mesh3d; the see-through wire goes through wire3d', () => {
  const L = FILM.lib;
  const m = L.heightMesh(hfDome, { box: [0, 0, 120, 60], res: 6 });
  FILM.expect.eq([m.verts.length, m.faces.length, m.edges.length], [7 * 4, 6 * 3, 2 * 6 * 3 + 6 + 3]);
  const rows = L.heightMesh(hfDome, { box: [0, 0, 120, 60], res: 6, lines: 'rows' });
  FILM.expect.eq(rows.edges.length, 6 * 4);
  const c = hfPaint(200, 200, () => {});
  const r = L.heightfield(c.getContext('2d'), hfDome, { mode: 'mesh', box: [20, 20, 160, 160], res: 6, fill: false });
  FILM.expect.eq(r.drawn, 2 * 6 * 6 + 6 + 6);
});

FILM.assert('deterministic, and key only caches the samples', () => {
  const L = FILM.lib;
  const field = (u, v) => L.fbm2(u * 4, v * 4, 3, 3);
  for (const mode of ['fill', 'contour', 'mesh']) {
    const o = { mode, box: [10, 10, 180, 140], res: 24, levels: 6 };
    const a = FILM.pixels(hfPaint(200, 160, (ctx) => L.heightfield(ctx, field, o))).hash();
    const b = FILM.pixels(hfPaint(200, 160, (ctx) => L.heightfield(ctx, field, o))).hash();
    const k1 = FILM.pixels(hfPaint(200, 160, (ctx) => L.heightfield(ctx, field, Object.assign({ key: 'assert-hf' }, o)))).hash();
    const k2 = FILM.pixels(hfPaint(200, 160, (ctx) => L.heightfield(ctx, field, Object.assign({ key: 'assert-hf' }, o)))).hash();
    FILM.expect.eq(b, a);
    FILM.expect.eq(k1, a);
    FILM.expect.eq(k2, a);
  }
});

FILM.assert('bad input throws TypeError', () => {
  const L = FILM.lib;
  const ctx = hfPaint(4, 4, () => {}).getContext('2d');
  FILM.expect.throws(() => L.heightfield(ctx, hfDome, { mode: 'relief' }), /mode/);
  FILM.expect.throws(() => L.heightfield(ctx, 42, {}), /field/);
  FILM.expect.throws(() => L.heightfield(ctx, [[1]], {}), /2 × 2/);
  FILM.expect.throws(() => L.heightfield(ctx, hfDome, { ramp: ['notAPalName', 'ink'] }), /pal/);
});
