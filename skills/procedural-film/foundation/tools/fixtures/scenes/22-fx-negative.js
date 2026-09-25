// Fixture plate for the negative theme's primitives: a constellation drawing on, a glowFigure,
// a lineIcon that blinks on lib.blinkAt. Drawn twice: as is, and under grade { invert: 1 } (plate B).
function drawNegativePlate(ctx, t, info) {
  const L = info.lib;
  const P = L.pal;
  const bg = P.navyDeep;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, info.W, info.H);

  // constellation: seeded nodes, edges drawing on one after another over the shot
  const rng = L.rng(L.hash('fx-negative', 3));
  const nodes = [];
  for (let i = 0; i < 14; i++) nodes.push([160 + rng() * 760, 260 + rng() * 420]);
  const edges = [[0, 3], [3, 7], [7, 2], [2, 9], [9, 12], [12, 5], [5, 1], [1, 8], [8, 11], [11, 4], [4, 13], [13, 6], [6, 10]];
  const reveal = (info.T - 42) / 2; // one clock across both shots, so the cut keeps every edge
  edges.forEach(([a, b], i) => {
    const k = L.clamp(reveal * edges.length - i);
    if (!(k > 0)) return;
    const A = nodes[a], B = nodes[b];
    L.glow(ctx, [A, [A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k]], { width: 1.2, radius: 4, strength: 0.18, alpha: 0.7 });
  });
  nodes.forEach(([x, y], i) => L.glowDot(ctx, x, y, 2 + (i % 3), { rays: 0, glow: 5, color: P.lineWhite, seed: i }));

  // glowFigure: a hooded pod with two stubby legs and one long arm across the body
  const pod = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const r = 1 + 0.18 * Math.max(0, -Math.sin(a)) ** 3;
    pod.push([330 + Math.cos(a) * 150 * r, 1080 + Math.sin(a) * 230 * (a > Math.PI ? 1.15 : 1)]);
  }
  L.glowFigure(ctx, [
    pod,
    { pts: [[280, 1300], [270, 1400]], closed: false },
    { pts: [[380, 1300], [392, 1400]], closed: false },
    { pts: [[210, 1150], [330, 1030], [450, 990]], closed: false },
  ], { bg, seed: 7 });

  // lineIcon: a square-headed critter with an antenna, lens eyes and a toothed mouth
  const critter = [
    { arc: [0.1, -0.62, 0.12, Math.PI, Math.PI * 2] },
    { line: [0.22, -0.62, 0.05, -0.42] },
    { path: [[-0.46, -0.42], [0.46, -0.42], [0.5, 0.36], [-0.5, 0.36]], closed: true, fill: true },
    { eye: [-0.2, -0.12, 0.16] },
    { eye: [0.22, -0.12, 0.16] },
    { line: [-0.3, 0.16, 0.3, 0.16] },
    { teeth: [-0.24, 0.16, 0.24, 0.16, 3, 0.1] },
  ];
  L.lineIcon(ctx, critter, 760, 1180, 300, { bg, shut: L.blinkAt(info.frame, L.hash('critter')) });
}

for (const id of ['fx-negative', 'fx-negative-inv']) {
  FILM.scene({ id, draw: drawNegativePlate });
}
