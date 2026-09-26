// Fixture plate for the blob theme: a melting blob creature with a line-icon head, a pair of
// blobs that merge and split on the beat, and a band of isolines over a noise field (a relief).
function drawBlobPlate(ctx, t, info) {
  const L = info.lib;
  const P = L.pal;
  ctx.fillStyle = P.annBlue;
  ctx.fillRect(0, 0, info.W, info.H);
  const u = L.clamp(t / info.dur);

  // relief: contour rings of a noise field
  const relief = (x, y) => L.fbm2(x * 0.004, y * 0.004 + 3, 5);
  const bands = L.isolines(relief, [60, 1560, 960, 300], [-0.3, -0.15, 0, 0.15, 0.3], { cell: 10 });
  bands.forEach((lines, k) => {
    ctx.beginPath();
    for (const l of lines) L.tracePath(ctx, l.pts, l.closed);
    ctx.strokeStyle = P.white;
    ctx.globalAlpha = 0.35 + 0.15 * k;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
  });

  // a pair that merges and splits once a beat
  const s = 0.5 - 0.5 * Math.cos(L.beat(info.T).frac * Math.PI * 2);
  L.blob(ctx, [[260 - 70 * s, 420, 70], [260 + 70 * s, 420, 60]], { fill: P.white, stroke: P.ink, width: 3, warp: 6, phase: L.boil(info.T) * 0.3 });

  // the melting creature: body, two drips that lengthen, stubby arms
  const cx = 600, cy = 900;
  const drip = 80 + 260 * u;
  const body = [
    [cx, cy, 150], [cx, cy + 120, 120],
    [cx - 70, cy + 120 + drip * 0.5, 44], [cx - 64, cy + 120 + drip, 34],
    [cx + 80, cy + 130 + drip * 0.4, 40], [cx + 88, cy + 130 + drip * 0.8, 30],
    [cx - 180, cy + 40, 36], [cx + 175, cy + 30, 34],
  ];
  L.blob(ctx, body, { fill: P.white, stroke: P.ink, width: 4, marble: 3, marbleColor: P.annBlue, warp: 14, phase: info.T * 0.4 });
  const head = [
    { circle: [0, 0, 0.5], fill: true },
    { eye: [-0.2, -0.08, 0.14], pupil: 'dot' },
    { eye: [0.2, -0.08, 0.14], pupil: 'dot' },
    { line: [-0.26, 0.2, 0.26, 0.2] },
    { teeth: [-0.22, 0.2, 0.22, 0.2, 4, 0.09] },
  ];
  ctx.save();
  ctx.fillStyle = P.ink;
  ctx.beginPath();
  ctx.arc(cx, cy - 170, 128, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  L.lineIcon(ctx, head, cx, cy - 170, 250, { bg: P.ink, color: P.white, width: 0.03, shut: L.blinkAt(info.frame, L.hash('melter')) });
}

FILM.scene({ id: 'fx-blob', draw: drawBlobPlate });
