// Fixture plate for grade.threshold. A tonal night-and-snow drawing: a moon, two hatched hills, a
// stippled egg and a ramp of pal greys, so the cut at mid grey reads on fills, lines and dots.
// Three timeline grades: a fade in from the duotone to threshold 0.5, threshold 1, then a cut to threshold 1
// under an ink-on-paper duotone.
function drawThresholdPlate(ctx, t, info) {
  const L = info.lib;
  const P = L.pal;
  L.paper(ctx, { seed: 31 });
  ctx.fillStyle = P.nightSky;
  ctx.fillRect(90, 160, 900, 700);
  L.glowDot(ctx, 760, 330, 64, { color: P.glow, core: P.white, additive: false, glow: 3 });
  ctx.save();
  ctx.beginPath();
  ctx.rect(90, 160, 900, 700);
  ctx.clip();
  const far = [[90, 700], [260, 600], [470, 650], [700, 560], [990, 640], [990, 860], [90, 860]];
  L.inkPath(ctx, L.smoothPts(far, true, 6), { closed: true, fill: P.dusk, width: 2.6, seed: 32 });
  const near = [[90, 780], [330, 700], [600, 760], [860, 690], [990, 730], [990, 860], [90, 860]];
  const nearPts = L.smoothPts(near, true, 6);
  L.inkPath(ctx, nearPts, { closed: true, fill: P.white, width: 3, seed: 33 });
  L.hatch(ctx, nearPts, { angle: -0.6, spacing: 10, width: 1.5, seed: 34, alpha: 0.8, density: (x, y) => L.smoothstep(740, 860, y) });
  ctx.restore();
  L.inkPath(ctx, L.rectPts(90, 160, 900, 700, 24), { closed: true, width: 3, seed: 35, boil: false });
  const egg = L.ellipsePts(540, 1140, 160, 215, 64);
  L.inkPath(ctx, egg, { closed: true, fill: P.tan, width: 4, seed: 36 });
  L.stipple(ctx, egg, { spacing: 6, r: [0.8, 2.2], seed: 37, density: (x, y) => L.smoothstep(-60, 200, (x - 540) * 0.7 + (y - 1140) * 0.6) });
  const ramp = ['white', 'paper', 'paperShade', 'paperDeep', 'tan', 'inkFaint', 'inkSoft', 'ink'];
  for (let i = 0; i < ramp.length; i++) {
    ctx.fillStyle = P[ramp[i]];
    ctx.fillRect(90 + i * 112.5, 1410, 112.5, 100);
  }
  L.inkPath(ctx, L.rectPts(90, 1410, 900, 100, 20), { closed: true, width: 3, seed: 38, boil: false });
}

for (const id of ['fx-threshold-soft', 'fx-threshold', 'fx-threshold-ink']) {
  FILM.scene({ id, draw: drawThresholdPlate });
}
