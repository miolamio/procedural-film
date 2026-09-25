// Shards-theme invariants: faces3d, mesh3d.tunnel, the view shift. Loaded only by check.cjs --fixtures.

function shardCanvas(w, h) {
  const c = FILM.makeCanvas(w, h);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, w, h);
  return ctx;
}
function shardPx(ctx, x, y) {
  const d = ctx.getImageData(x, y, 1, 1).data;
  return [d[0], d[1], d[2]].join();
}

FILM.assert('faces3d paints far to near whatever the face order', () => {
  const L = FILM.lib;
  const quad = (z) => [[-1, -1, z], [1, -1, z], [1, 1, z], [-1, 1, z]];
  const verts = quad(0).concat(quad(-1));
  for (const faces of [[[0, 1, 2, 3], [4, 5, 6, 7]], [[4, 5, 6, 7], [0, 1, 2, 3]]]) {
    const ctx = shardCanvas(40, 40);
    L.faces3d(ctx, { verts, edges: [], faces }, { at: [20, 20], scale: 10, color: (i) => (faces[i][0] === 0 ? '#ff0000' : '#0000ff'), ambient: 1 });
    FILM.expect.eq(shardPx(ctx, 20, 20), '255,0,0', 'the near face is not on top');
  }
});

FILM.assert('faces3d drops faces closer to the camera than near', () => {
  const L = FILM.lib;
  const m = { verts: [[-1, -1, 1.95], [1, -1, 1.95], [1, 1, 1.95], [-1, 1, 1.95], [-1, -1, 0], [1, -1, 0], [1, 1, 0], [-1, 1, 0]], edges: [], faces: [[0, 1, 2, 3], [4, 5, 6, 7]] };
  FILM.expect.eq(L.faces3d(shardCanvas(40, 40), m, { at: [20, 20], scale: 5, persp: 2 }), 1);
});

FILM.assert('faces3d: a face turned to the light is brighter than one edge-on to it', () => {
  const L = FILM.lib;
  const face = (m) => {
    const ctx = shardCanvas(40, 40);
    L.faces3d(ctx, m, { at: [20, 20], scale: 10, color: '#ffffff', light: [0, 0, 1], ambient: 0.2 });
    return ctx.getImageData(20, 20, 1, 1).data[0];
  };
  const facing = face({ verts: [[-1, -1, 0], [1, -1, 0], [1, 1, 0], [-1, 1, 0]], edges: [], faces: [[0, 1, 2, 3]] });
  const tilted = face({ verts: [[-1, -1, -0.9], [1, -1, -0.9], [1, 1, 0.9], [-1, 1, 0.9]], edges: [], faces: [[0, 1, 2, 3]] });
  FILM.expect.eq(facing, 255);
  FILM.expect.true(tilted < facing - 40, `tilted face ${tilted} vs facing ${facing}`);
});

FILM.assert('shift 0 leaves wire3d unchanged, and shift moves the mesh before it turns', () => {
  const L = FILM.lib;
  const draw = (o) => {
    const ctx = shardCanvas(80, 80);
    L.wire3d(ctx, L.mesh3d.box(), Object.assign({ at: [40, 40], scale: 15, rot: [0.4, 0.7, 0] }, o));
    return FILM.pixels(ctx.canvas).hash();
  };
  FILM.expect.eq(draw({ shift: [0, 0, 0] }), draw({}));
  const p = L.project3d([0, 0, 0], { at: [0, 0], scale: 10, shift: [1, 0, 0], rot: [0, Math.PI / 2, 0] });
  FILM.expect.true(Math.abs(p[0]) < 1e-9 && Math.abs(p[2] + 1) < 1e-9, `shifted then turned point is ${p.join()}`);
});

FILM.assert('tunnel: seg × (rings − 1) faces, ringStep apart, and one ring step of travel loops', () => {
  const L = FILM.lib;
  const m = L.mesh3d.tunnel(6, 5, 1, 8);
  FILM.expect.eq(m.faces.length, 24);
  FILM.expect.eq(m.ringStep, 2);
  FILM.expect.eq(m.verts.length, 30);
  // ring k shifted by one step sits where ring k-1 was
  const a = L.project3d(m.verts[6 * 2 + 1], { persp: 3, scale: 100, shift: [0, 0, m.ringStep] });
  const b = L.project3d(m.verts[6 * 1 + 1], { persp: 3, scale: 100 });
  FILM.expect.true(Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6, 'a ring step of travel does not land on the next ring');
});
