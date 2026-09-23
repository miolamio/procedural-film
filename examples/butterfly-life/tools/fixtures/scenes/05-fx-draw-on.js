// Fixture scene: inkPath reveal. Closed form and spiral draw on over 1s with a nib; a double dash runs a line.
// Shot fx-draw-on, global T 8..10. Layers: paper, closed form, spiral, running dash.
FILM.scene({
  id: 'fx-draw-on',
  draw(ctx, t, info) {
    const L = info.lib, P = L.pal;
    t = L.clamp(t, 0, info.dur);
    L.paper(ctx, { seed: 5 });
    L.text(ctx, 'draw on', 72, 118, { size: 36, color: P.inkSoft, tracking: 1.2 });

    // Frame 0 is already a touch of ink. The pen finishes the form and the spiral at 1s.
    const pen = (t0, t1) => {
      if (t <= t0) return 0.05;
      if (t >= t1) return 1;
      return 0.05 + 0.95 * L.ease.inOutCubic((t - t0) / (t1 - t0));
    };
    const nib = (r, blot, color) => ({ r: r, blot: blot, color: color });

    const form = [[540, 280], [740, 400], [810, 600], [680, 820], [540, 910], [380, 800], [280, 580], [360, 380]];
    L.inkPath(ctx, form, {
      closed: true, width: 7, seed: 21, double: true,
      reveal: pen(0, 1), nib: nib(20, 34, P.ink),
    });

    const spiral = [];
    const turns = 2.6, n = 88, cx = 540, cy = 1200;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const a = -0.6 + u * turns * L.TAU;
      const rad = 22 + u * 188;
      spiral.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * 0.92]);
    }
    L.inkPath(ctx, spiral, {
      width: 5.2, seed: 22, color: P.tealDeep,
      double: { offset: 7, alpha: 0.5, width: 0.42, from: 0, to: 1 },
      reveal: pen(0, 1), nib: nib(16, 28, P.tealDeep),
    });

    const trail = [[110, 1560], [300, 1475], [520, 1590], [760, 1485], [980, 1570]];
    const travel = L.seg(t, 0, 2, 'inOutSine');
    const wide = 0.24;
    const from = 0.03 + travel * 0.55;
    const to = from + wide;
    L.inkPath(ctx, trail, {
      width: 6.5, seed: 23, color: P.orange,
      double: { offset: 8, alpha: 0.55, width: 0.4, from: 0, to: 1 },
      reveal: [from, to], nib: nib(18, 30, P.orange),
    });
  },
});
