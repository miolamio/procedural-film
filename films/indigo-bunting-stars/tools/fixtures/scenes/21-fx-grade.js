// Fixture plate for the shot grade. One drawing, four timeline grades. Frame 0 is the egg.
function drawGradePlate(ctx, t, info) {
  const L = info.lib;
  const P = L.pal;
  L.paper(ctx, { seed: 11, vignette: 0 });
  const egg = L.geo('egg').outline(12);
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < egg.length; i++) {
    const p = egg[i];
    if (i) ctx.lineTo(p[0], p[1]);
    else ctx.moveTo(p[0], p[1]);
  }
  ctx.closePath();
  ctx.fillStyle = P.leaf;
  ctx.fill();
  ctx.beginPath();
  ctx.fillStyle = P.ochre;
  ctx.ellipse(540, 960, 78, 104, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  L.inkPath(ctx, [[540, 1370], [540, 1540]], { color: P.wood, width: 10, seed: 4, boil: false });
  L.inkPath(ctx, egg, { closed: true, color: P.ink, width: 5, seed: 3, boil: false });
}

for (const id of ['fx-grade-plain', 'fx-grade-warm', 'fx-grade-fade', 'fx-grade-vignette']) {
  FILM.scene({ id, draw: drawGradePlate });
}
