// Fixture scene: blueprint turntable. A double helix with rungs and a crystal; back edges dashed.
const Lib = FILM.lib;

function ringMesh(y, radius, n) {
  const pts = [[0, y, 0]];
  const edges = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Lib.TAU;
    pts.push([Math.cos(a) * radius, y, Math.sin(a) * radius]);
    edges.push([1 + i, 1 + ((i + 1) % n)]);
  }
  edges.push([0, 1]);
  return Lib.mesh3d.fromPoints(pts, edges);
}

function crystalMesh() {
  const n = 6;
  const verts = [[0, 1.28, 0]];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Lib.TAU - 0.26;
    verts.push([Math.cos(a) * 0.86, -0.02, Math.sin(a) * 0.86]);
  }
  verts.push([0, -1.18, 0]);
  const edges = [];
  const apex = n + 1;
  for (let i = 0; i < n; i++) {
    const a = 1 + i;
    const b = 1 + ((i + 1) % n);
    edges.push([0, a], [a, b], [a, apex]);
  }
  return Lib.mesh3d.fromPoints(verts, edges);
}

const HELIX_STEPS = 40;
const HELIX = Lib.mesh3d.helix(2.5, HELIX_STEPS, 1, 2.75, { strands: 2, rungs: 4 });
const STRANDS = { verts: HELIX.verts, edges: HELIX.edges.slice(0, 2 * HELIX_STEPS) };
const RUNGS = { verts: HELIX.verts, edges: HELIX.edges.slice(2 * HELIX_STEPS) };
const PLINTH = ringMesh(-1.72, 1.08, 48);
const CRYSTAL = crystalMesh();
const GEM_RING = ringMesh(-1.42, 1.02, 40);

FILM.scene({
  id: 'fx-wire3d',
  draw(ctx, t, info) {
    const L = info.lib;
    const P = L.pal;
    L.blueprint(ctx, { seed: 11, center: [540, 860], circles: 3, diagonals: 4 });

    // One full turn across the shot, already off-axis on frame 0 so the mesh is not a flat sine.
    const yaw = 0.62 + (t / info.dur) * L.TAU;
    const tilt = 0.5;
    const helixView = {
      at: [540, 720],
      scale: 236,
      rot: [tilt, yaw, 0],
      persp: 6.2,
      depthFade: 0.62,
      hidden: 'dash',
    };
    const gemView = {
      at: [540, 1540],
      scale: 158,
      rot: [0.42, yaw + 0.9, 0],
      persp: 5.4,
      depthFade: 0.66,
      hidden: 'dash',
    };

    L.wire3d(ctx, PLINTH, Object.assign({}, helixView, { color: P.paleBlue, width: 1.7, depthFade: 0.4, hidden: 'none' }));
    L.wire3d(ctx, STRANDS, Object.assign({}, helixView, { color: P.lavender, width: 3.8 }));
    L.wire3d(ctx, RUNGS, Object.assign({}, helixView, { color: P.lineWhite, width: 2.5 }));

    L.wire3d(ctx, GEM_RING, Object.assign({}, gemView, { color: P.paleBlue, width: 1.6, depthFade: 0.35, hidden: 'none' }));
    L.wire3d(ctx, CRYSTAL, Object.assign({}, gemView, { color: P.lavender, width: 3.2 }));
    L.wire3d(ctx, CRYSTAL, Object.assign({}, gemView, { color: P.lineWhite, width: 0, nodes: 5, hidden: 'none' }));

    L.text(ctx, 'turntable', 72, 156, { size: 40, color: P.lavender, tracking: 1.5 });
    L.text(ctx, 'double helix', 72, 214, { size: 26, color: P.paleBlue, italic: true });
    L.text(ctx, 'crystal', 72, 1288, { size: 26, color: P.paleBlue, italic: true });
  },
});
