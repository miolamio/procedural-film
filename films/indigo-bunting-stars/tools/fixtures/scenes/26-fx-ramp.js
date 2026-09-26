// Fixture plate for lib.ramp: every named ramp as a strip (sampled by ramp above, the same stops as a
// CanvasGradient below, a marker sweeping 0..1), a crater read as a false-colour heat map that
// throbs on the beat, and a terrain relief whose sea rises over the shot.
const RAMP_GLOW = ['navyDeep', 'magenta', 'glow']; // an inline list of pal names is a ramp too

function drawRampPlate(ctx, t, info) {
  const L = info.lib;
  const P = L.pal;
  const u = L.clamp(t / info.dur);
  ctx.fillStyle = P.navyDeep;
  ctx.fillRect(0, 0, info.W, info.H);
  L.text(ctx, 'ramp · scales from lib.pal', 100, 150, { size: 38, color: P.lineWhite, tracking: 1 });

  // 1. strips: ramp() in 8 px columns, rampStops() as a gradient under it, stop ticks, a sweep
  const X0 = 100, SW = 880;
  const names = Object.keys(L.ramps).concat(['inline']);
  names.forEach((name, r) => {
    const spec = name === 'inline' ? RAMP_GLOW : name;
    const y = 210 + r * 108;
    for (let x = 0; x < SW; x += 8) {
      ctx.fillStyle = L.ramp(spec, (x + 4) / SW);
      ctx.fillRect(X0 + x, y, 8, 44);
    }
    const g = ctx.createLinearGradient(X0, 0, X0 + SW, 0);
    for (const [at, hex] of L.rampStops(spec)) g.addColorStop(at, hex);
    ctx.fillStyle = g;
    ctx.fillRect(X0, y + 48, SW, 12);
    ctx.fillStyle = P.lineWhite;
    for (const [at] of L.rampStops(spec)) ctx.fillRect(X0 + at * SW - 1, y + 62, 2, 10);
    const v = (u + r * 0.13) % 1;
    const mx = X0 + v * SW;
    ctx.beginPath();
    ctx.arc(mx, y + 22, 13, 0, Math.PI * 2);
    ctx.fillStyle = L.ramp(spec, v);
    ctx.fill();
    ctx.strokeStyle = P.lineWhite;
    ctx.lineWidth = 3;
    ctx.stroke();
    L.text(ctx, name, X0, y + 96, { size: 22, color: P.paleBlue });
  });

  // 2. crater: a hot throat and a cooler rim, noise on top, the heat breathing on the beat
  const beat = 0.5 - 0.5 * Math.cos(L.beat(info.T).frac * Math.PI * 2);
  const CX = 540, CY = 1050, CELL = 12;
  const heat = (x, y) => {
    const d = Math.hypot(x - CX, (y - CY) * 1.35) / 330;
    const throat = Math.exp(-d * d * 3.2) * (0.78 + 0.14 * beat);
    const rim = 0.32 * Math.exp(-((d - 0.95) ** 2) * 40);
    return throat + rim + 0.12 * L.fbm2(x * 0.012, y * 0.012 + info.T * 0.3, 7, 3);
  };
  ctx.save();
  ctx.beginPath();
  ctx.rect(X0, 790, SW, 520);
  ctx.rect(X0, 1380, SW, 420);
  ctx.clip();
  for (let y = 790; y < 1310; y += CELL) {
    for (let x = X0; x < X0 + SW; x += CELL) {
      ctx.fillStyle = L.ramp('heat', heat(x + CELL / 2, y + CELL / 2));
      ctx.fillRect(x, y, CELL, CELL);
    }
  }
  const rings = L.isolines(heat, [X0, 790, SW, 520], [0.35, 0.6], { cell: CELL });
  ctx.strokeStyle = P.lineWhite;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 1.5;
  for (const set of rings) {
    ctx.beginPath();
    for (const l of set) L.tracePath(ctx, l.pts, l.closed);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // 3. relief: height from noise through the terrain ramp; the sea rises over the shot
  const sea = 0.06 * u;
  for (let y = 1380; y < 1800; y += CELL) {
    for (let x = X0; x < X0 + SW; x += CELL) {
      const h = 0.5 + 0.95 * L.fbm2(x * 0.004, y * 0.004 + 2, 11, 4) - sea;
      ctx.fillStyle = L.ramp('terrain', h);
      ctx.fillRect(x, y, CELL, CELL);
    }
  }
  ctx.restore();
  ctx.strokeStyle = P.lineWhite;
  ctx.lineWidth = 2;
  ctx.strokeRect(X0, 790, SW, 520);
  ctx.strokeRect(X0, 1380, SW, 420);
  L.text(ctx, 'heat', X0 + 18, 826, { size: 24, color: P.lineWhite });
  L.text(ctx, 'terrain', X0 + 18, 1416, { size: 24, color: P.navyDeep });
}

FILM.scene({ id: 'fx-ramp', draw: drawRampPlate });
