// Fixture scene: leaf veins grown inside geo leaf, and a root system growing down. Both trees are cached.
FILM.scene({
  id: 'fx-branch',
  draw(ctx, t, info) {
    const L = info.lib, P = L.pal;
    L.paper(ctx, { seed: 4 });

    // soil bed, then roots from a taproot just under the surface
    const soil = [[140, 196], [940, 196], [1040, 1004], [40, 1004]];
    L.inkPath(ctx, soil, { closed: true, smooth: false, fill: P.paperShade, width: 2.6, seed: 8, color: P.inkSoft });
    const pot = [[210, 246], [870, 246], [970, 968], [110, 968]];
    const roots = L.branch({
      seed: 44,
      root: [[540, 278], [536, 360], [528, 448]],
      clip: pot,
      attractors: 130,
      step: 16,
      killDist: 23,
      influence: 88,
      maxNodes: 170,
    });
    const rootReveal = L.clamp(0.36 + 0.64 * L.seg(t, 0.12, 1.9, 'outCubic'));
    L.drawBranch(ctx, roots, { width: 1.85, reveal: rootReveal, color: P.ink, seed: 44 });

    // geo leaf, petiole at the narrow left end; the trunk is the centreline, already inside the blade
    const leaf = L.geo('leaf').outline();
    L.inkPath(ctx, leaf, { closed: true, smooth: false, fill: P.sage, width: 3.2, seed: 31, color: P.ink });
    L.hatch(ctx, leaf, { angle: -0.5, spacing: 10, width: 1.05, seed: 32, alpha: 0.38, color: P.inkSoft, inset: 8 });
    L.inkLine(ctx, 92, 1528, 176, 1476, { width: 4.4, seed: 19, color: P.ink, taper: [10, 2] });
    const veins = L.branch({
      seed: 21,
      root: [[175.5, 1476.3], [212.2, 1460.4], [248.9, 1444.5], [322.3, 1412.8]],
      clip: leaf,
      attractors: 170,
      step: 17,
      killDist: 24,
      influence: 108,
      maxNodes: 230,
    });
    const veinReveal = L.clamp(0.5 + 0.5 * L.seg(t, 0, 1.7, 'outCubic'));
    L.drawBranch(ctx, veins, { width: 1.7, reveal: veinReveal, color: P.ink, seed: 21 });

    L.text(ctx, 'roots', 80, 148, { size: 34, color: P.inkSoft, tracking: 0.6 });
    L.text(ctx, 'leaf veins', 80, 1024, { size: 34, color: P.inkSoft, tracking: 0.6 });
  },
});
