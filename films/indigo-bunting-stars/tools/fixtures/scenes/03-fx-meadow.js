// Fixture scene: illustrated meadow. Exercises geo (outline, polyline, points), stripes, inkPath fills, hatch, crossHatch, onTwos, arcAnnotation.
FILM.scene({
  id: 'fx-meadow',
  draw(ctx, t, info) {
    const L = info.lib, P = L.pal;
    L.stripes(ctx, { offset: L.onTwos(t) * 30 });
    const leaf = L.geo('leaf').outline(); // sampled outline from fixtures/geo.js: drawn as it stands
    L.inkPath(ctx, leaf, { closed: true, smooth: false, fill: P.sage, width: 3.2, seed: 31, double: true });
    L.hatch(ctx, leaf, { angle: -0.4, spacing: 7, seed: 32, density: (x, y) => L.smoothstep(1150, 1560, y) });
    L.inkPath(ctx, L.geo('stem').pts, { width: 2.2, seed: 33 });
    const crawl = L.onTwos(t) / info.dur;
    const hx = 330 + crawl * 330, hy = 1370 - crawl * 150;
    for (let i = 5; i >= 0; i--) {
      const x = hx - i * 34, y = hy + i * 16 + Math.sin(L.onTwos(t) * 9 + i) * 6;
      L.inkCircle(ctx, x, y, 26 - i * 1.5, { fill: P.white, width: 2.4, seed: 40 + i });
      L.crossHatch(ctx, L.ellipsePts(x + 6, y + 8, 18 - i, 12, 24), { spacing: 4.5, width: 0.9, alpha: 0.6, seed: 50 + i, tone: 0.35 });
    }
    L.arcAnnotation(ctx, 540, 900, 380, -2.6, -0.4, { color: P.annBlue, p: L.seg(t, 0, 1.2, 'outCubic'), dash: [14, 10] });
    const [sx, sy] = L.geo('sun').pt('centre');
    L.glowDot(ctx, sx, sy, 60, { color: P.sun, core: P.glow, additive: false, rays: 12, rayLen: 2.4, twinkle: 0.05 });
  },
});
