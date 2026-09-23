// Fixture scene: the geo leaf in a sage watercolour wash. Global T 22–24.
// Layers back to front: paper, wash with one bloom, hatch. Frame 0 is the finished drawing.
FILM.scene({
  id: 'fx-wash',
  draw(ctx, t, info) {
    const L = info.lib;
    const P = L.pal;
    const leaf = L.geo('leaf').outline();
    // 1. paper
    L.paper(ctx, { seed: 4 });
    // 2. wash. Boil shimmers between three cached plates; it is not a function of raw t.
    L.wash(ctx, leaf, {
      color: P.sage,
      alpha: 0.76,
      seed: 22,
      layers: 4,
      bleed: 8,
      edgeDarken: 0.66,
      granulation: 0.62,
      blooms: 1,
      dry: 0.18,
      boil: true,
    });
    // 3. hatch on top, heavier toward the base, lighter toward the tip
    L.hatch(ctx, leaf, {
      angle: -0.42,
      spacing: 9,
      width: 1.2,
      color: P.ink,
      alpha: 0.36,
      seed: 23,
      inset: 8,
      density: (x, y) => (0.34 + 0.66 * L.smoothstep(1160, 1560, y)) * (0.5 + 0.5 * L.smoothstep(960, 420, x)),
    });
  },
});
