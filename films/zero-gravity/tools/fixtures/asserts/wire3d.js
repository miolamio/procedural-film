// Check 8: lib.mesh3d, lib.wire3d, lib.project3d.
// Mesh space is right-handed, Y up, Z toward the viewer. Canvas Y grows downward,
// so with persp 0 a mesh point (x, y) lands at (at[0] + scale*x, at[1] - scale*y).
// box() is the cube (±1, ±1, ±1). At rot 0 the eight corners share four screen points.

FILM.assert('ortho cube corners land on the projected pixels', () => {
  const L = FILM.lib;
  const P = L.pal;
  const at = [100, 100];
  const scale = 40;
  const opts = { at, scale, rot: [0, 0, 0], persp: 0 };
  // (x, y) -> (100 + 40*x, 100 - 40*y). +Y is up, so it is the smaller canvas y.
  const expected = [[60, 60], [140, 60], [140, 140], [60, 140]];
  const up = L.project3d([0, 1, 0], opts);
  const down = L.project3d([0, -1, 0], opts);
  FILM.expect.true(up[1] < down[1], `mesh +Y should be above −Y, got ${up[1]} and ${down[1]}`);
  FILM.expect.near(L.project3d([1, 1, 1], opts), [140, 60, 1], 1e-6);
  FILM.expect.near(L.project3d([-1, -1, -1], opts), [60, 140, -1], 1e-6);

  const cube = L.mesh3d.box();
  FILM.expect.eq(cube.verts.length, 8);
  FILM.expect.eq(cube.edges.length, 12);

  const c = FILM.makeCanvas(200, 200);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = P.navy;
  ctx.fillRect(0, 0, 200, 200);
  L.wire3d(ctx, cube, {
    at, scale, rot: [0, 0, 0], persp: 0,
    color: P.lineWhite, width: 0, nodes: 6,
  });
  const d = ctx.getImageData(0, 0, 200, 200).data;
  const acc = expected.map(() => ({ w: 0, x: 0, y: 0 }));
  for (let y = 0; y < 200; y++) {
    for (let x = 0; x < 200; x++) {
      const i = (y * 200 + x) * 4;
      const bright = d[i] + d[i + 1] + d[i + 2];
      if (bright < 400) continue;
      let best = 0;
      let bestD = 1e9;
      for (let k = 0; k < expected.length; k++) {
        const dx = x - expected[k][0];
        const dy = y - expected[k][1];
        const dist = dx * dx + dy * dy;
        if (dist < bestD) {
          bestD = dist;
          best = k;
        }
      }
      if (bestD > 18 * 18) continue;
      const w = bright;
      acc[best].w += w;
      acc[best].x += w * (x + 0.5);
      acc[best].y += w * (y + 0.5);
    }
  }
  for (let k = 0; k < expected.length; k++) {
    FILM.expect.true(acc[k].w > 0, `no pixels near ${expected[k][0]}, ${expected[k][1]}`);
    const cx = acc[k].x / acc[k].w;
    const cy = acc[k].y / acc[k].w;
    FILM.expect.near(cx, expected[k][0], 0.5);
    FILM.expect.near(cy, expected[k][1], 0.5);
  }
});

FILM.assert('a full turn matches the unrotated frame', () => {
  const L = FILM.lib;
  const P = L.pal;
  const mesh = L.mesh3d.box();
  const paint = (rot) => {
    const c = FILM.makeCanvas(160, 160);
    const ctx = c.getContext('2d');
    ctx.fillStyle = P.navy;
    ctx.fillRect(0, 0, 160, 160);
    L.wire3d(ctx, mesh, {
      at: [80, 80], scale: 34, rot, persp: 4.5, depthFade: 0.55,
      hidden: 'dash', color: P.lavender, width: 2, nodes: 2.5,
    });
    return FILM.pixels(c).hash();
  };
  const TAU = L.TAU;
  const base = paint([0, 0, 0]);
  FILM.expect.eq(paint([TAU, 0, 0]), base);
  FILM.expect.eq(paint([0, TAU, 0]), base);
  FILM.expect.eq(paint([0, 0, TAU]), base);
  FILM.expect.eq(paint([TAU, TAU, TAU]), base);
  FILM.expect.eq(paint([0.35 + TAU, -0.8 + TAU, 1.1 + TAU * 2]), paint([0.35, -0.8, 1.1]));
});

FILM.assert('perspective shrinks the far face of the cube', () => {
  const L = FILM.lib;
  const opts = { at: [120, 120], scale: 40, rot: [0, 0, 0], persp: 5 };
  const span = (z, o) => {
    const a = L.project3d([-1, -1, z], o);
    const b = L.project3d([1, 1, z], o);
    return Math.hypot(a[0] - b[0], a[1] - b[1]);
  };
  const near = span(1, opts);
  const far = span(-1, opts);
  FILM.expect.true(near > far, `near face ${near}px should exceed far face ${far}px`);
  const ortho = { at: opts.at, scale: opts.scale, rot: [0, 0, 0], persp: 0 };
  FILM.expect.near(span(1, ortho), span(-1, ortho), 1e-6);
});

FILM.assert('wire3d strokes each mesh edge once', () => {
  const L = FILM.lib;
  const P = L.pal;
  const mesh = L.mesh3d.box();
  const c = FILM.makeCanvas(140, 140);
  const ctx = c.getContext('2d');
  let strokes = 0;
  const orig = ctx.stroke;
  ctx.stroke = function () {
    strokes += 1;
    return orig.apply(this, arguments);
  };
  const n = L.wire3d(ctx, mesh, {
    at: [70, 70], scale: 28, rot: [0.4, 0.7, 0.15], persp: 4,
    depthFade: 0.4, hidden: 'dash', color: P.lavender, width: 2, nodes: 3,
  });
  FILM.expect.eq(n, mesh.edges.length);
  FILM.expect.eq(strokes, mesh.edges.length);
});
