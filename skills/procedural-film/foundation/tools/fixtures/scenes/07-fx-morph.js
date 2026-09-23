// Fixture scene: the egg silhouette morphs into the leaf and back. Ink outline, hatch inside.
FILM.scene({
  id: 'fx-morph',
  draw(ctx, t, info) {
    const L = info.lib;
    const P = L.pal;
    L.paper(ctx, { seed: 3 });

    // Same frame centre, native size: the egg already sits there; the leaf comes up to meet it.
    const place = (pts) => {
      const b = L.bounds(pts);
      const dx = 540 - (b.x + b.w / 2);
      const dy = 960 - (b.y + b.h / 2);
      const out = new Array(pts.length);
      for (let i = 0; i < pts.length; i++) out[i] = [pts[i][0] + dx, pts[i][1] + dy];
      return out;
    };
    const egg = place(L.geo('egg').outline());
    const leaf = place(L.geo('leaf').outline());
    const u = t <= info.dur * 0.5 ? (t / info.dur) * 2 : (1 - t / info.dur) * 2;
    const pts = L.morph(egg, leaf, u);

    ctx.beginPath();
    L.tracePath(ctx, pts, true);
    ctx.fillStyle = P.white;
    ctx.fill();
    L.hatch(ctx, pts, { angle: -0.55, spacing: 8, width: 1.25, seed: 18, alpha: 0.9, color: P.ink });
    L.inkPath(ctx, pts, { closed: true, smooth: false, width: 3.2, seed: 17, double: true });
  },
});
