// Fixture scene: the leaf plate a morph cut opens into. Fully drawn at local t = 0.
// The silhouette is drawn by core from FILM.GEO egg and leaf, not by this scene.
FILM.scene({
  id: 'fx-morphcut',
  draw(ctx, t, info) {
    const L = info.lib;
    const P = L.pal;
    L.stripes(ctx, {
      colors: [P.stripeSpring, P.stripeSage, P.sage, P.leaf],
      width: 146,
      angle: 0.38,
      seed: 27,
      wobble: 0.8,
    });
    ctx.save();
    ctx.strokeStyle = P.ink;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < 14; i++) {
      const x = 80 + i * 68;
      ctx.moveTo(x, 250);
      ctx.lineTo(x + 22, 640);
    }
    ctx.stroke();
    ctx.restore();
    L.inkPath(ctx, L.geo('egg').outline(), {
      closed: true, smooth: false, fill: P.ochre, color: P.ink, width: 4, seed: 6, wobble: 0.35,
    });
    L.inkPath(ctx, L.geo('leaf').outline(), {
      closed: true, smooth: false, fill: P.leaf, color: P.ink, width: 3.4, seed: 9, wobble: 0.25,
    });
    L.inkPath(ctx, L.geo('stem').pts, { width: 3.2, color: P.wood, seed: 11, smooth: false });
    L.text(ctx, 'leaf', 80, 240, { size: 46, color: P.ink });
  },
});
