// Fixture scene: the plate that bleeds in through an ink mask. Fully drawn at local t = 0.
// The blot mask is drawn by core, not by this scene.
FILM.scene({
  id: 'fx-inkwash',
  draw(ctx, t, info) {
    const L = info.lib;
    const P = L.pal;
    L.stripes(ctx, {
      colors: [P.paper, P.paperShade, P.duskRose, P.rose],
      width: 116,
      angle: 0.92,
      seed: 4,
      wobble: 1.5,
    });

    ctx.save();
    ctx.fillStyle = P.ink;
    for (let i = 0; i < 18; i++) {
      const x = 110 + (i % 6) * 150;
      const y = 280 + Math.floor(i / 6) * 140;
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, L.TAU);
      ctx.fill();
    }
    ctx.restore();

    L.inkPath(ctx, [[70, 180], [1010, 180], [1010, 1500], [70, 1500]], {
      closed: true, color: P.ink, width: 3.2, seed: 2, wobble: 0.5,
    });
    L.inkPath(ctx, [[100, 210], [980, 210], [980, 1470], [100, 1470]], {
      closed: true, color: P.inkSoft, width: 1.5, seed: 3, wobble: 0.35,
    });

    const cx = 540;
    const cy = 820;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * L.TAU - 0.35;
      const pts = [];
      for (let k = 0; k <= 8; k++) {
        const u = k / 8;
        const r = 64 + Math.sin(u * Math.PI) * 200;
        const ang = a + (u - 0.5) * 0.5;
        pts.push([cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * 1.2]);
      }
      L.inkPath(ctx, pts, {
        color: P.ink,
        width: 7,
        seed: 10 + i,
        fill: i % 2 ? P.rose : P.ink,
        wobble: 1.1,
      });
    }
    L.inkCircle(ctx, cx, cy, 48, { fill: P.ochre, color: P.ink, width: 4, seed: 8 });
    L.inkPath(ctx, [[540, 880], [500, 1160], [560, 1420]], { color: P.leaf, width: 12, seed: 12 });
    L.inkPath(ctx, [[500, 1160], [390, 1100], [430, 1220]], { color: P.leaf, width: 6, seed: 13, fill: P.sage });
    L.inkPath(ctx, [[560, 1280], [690, 1240], [640, 1360]], { color: P.leaf, width: 6, seed: 14, fill: P.sage });
    L.text(ctx, 'ink', 120, 280, { size: 48, color: P.ink });
  },
});
