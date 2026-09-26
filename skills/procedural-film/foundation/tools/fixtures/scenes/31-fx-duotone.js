// Fixture plate for grade.duotone. One tonal drawing, three timeline grades: bare, ink on pale blue,
// then a fade to night on sun at 0.7. The swatch row runs light to dark so the map reads as a ramp.
function drawDuotonePlate(ctx, t, info) {
  const L = info.lib;
  const P = L.pal;
  L.paper(ctx, { seed: 21 });
  L.stripes(ctx, { bounds: [90, 180, 900, 620], seed: 22 });
  L.glowDot(ctx, 780, 360, 70, { color: P.sun, core: P.glow, additive: false, rays: 14, rayLen: 2.2, rayWidth: 0.12, glow: 3 });
  const leaf = L.smoothPts([[150, 760], [300, 590], [560, 470], [840, 450], [960, 480], [820, 590], [560, 720], [300, 800]], true, 7);
  L.inkPath(ctx, leaf, { closed: true, fill: P.leaf, width: 3.4, seed: 23 });
  L.hatch(ctx, leaf, { angle: -1.05, spacing: 7, width: 1.2, seed: 24, alpha: 0.8 });
  const egg = L.ellipsePts(540, 1120, 170, 230, 64);
  L.inkPath(ctx, egg, { closed: true, fill: P.rose, width: 4, seed: 25 });
  L.stipple(ctx, egg, { spacing: 5, r: [0.6, 1.8], seed: 26, density: (x, y) => L.smoothstep(-60, 200, (x - 540) * 0.7 + (y - 1120) * 0.6) });
  const ramp = ['white', 'paper', 'paperShade', 'paperDeep', 'tan', 'inkFaint', 'inkSoft', 'ink'];
  for (let i = 0; i < ramp.length; i++) {
    ctx.fillStyle = P[ramp[i]];
    ctx.fillRect(90 + i * 112.5, 1400, 112.5, 110);
  }
  L.inkPath(ctx, L.rectPts(90, 1400, 900, 110, 20), { closed: true, width: 3, seed: 27, boil: false });
}

for (const id of ['fx-duotone-plain', 'fx-duotone', 'fx-duotone-dusk']) {
  FILM.scene({ id, draw: drawDuotonePlate });
}
